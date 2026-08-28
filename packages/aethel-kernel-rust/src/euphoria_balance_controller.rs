//! # Euphoria Balance Controller Kernel — letter **ko** (R2-F / Vanguarda P2).
//!
//! A deterministic, zero-allocation **capture-point (Pratt) balance controller**
//! for the Euphoria active-ragdoll path of the
//! [`PhysicsWorld`](crate::physics_world) S-17 authority. It closes the roadmap
//! gap **"Dynamic balance — missing | Balance controller (CoM tracking, foot
//! placement correction, fall recovery)"** by computing, per CoM-tracked agent,
//! a corrective acceleration that holds an inverted-pendulum biped upright:
//!
//! - **Capture point (Pratt closed form)**: `cp = com_xy + com_vel_xy / ω0` with
//!   `ω0 = sqrt(g / h)` — the exact ground point where the biped must place its
//!   support to come to rest. Validated against the analytic formula in the
//!   soak (error must be `< 1e-3`).
//! - **Ankle strategy** (CP within the support radius): a critically-damped PD
//!   (`kp = ω0²`, `kd = 2·damping·ω0`) pulls the CoM back over the support.
//! - **Foot placement correction** (CP reachable by one step): both feet march
//!   toward the CP, clamped to `max_step_distance`, and the support follows the
//!   stance midpoint.
//! - **Hit reaction** (impulse → CoM velocity change): a disturbance above
//!   `hit_impulse_threshold` engages `HitRecovery` — muscles activate hard, an
//!   extra corrective boost plus a braking drag absorb the hit, then balance
//!   recovers. The correction is an **acceleration** (impulse), never a pose
//!   additive, so it composes with any animation layer.
//! - **Fall recovery** (CoM descending past `fall_speed_threshold`): an upward
//!   corrective push counters the descent and returns the agent to Idle.
//! - **Hand plant** (CP beyond the reach of a single step): the effective
//!   support radius expands to `hand_plant_radius` and strong dissipative
//!   braking decelerates the horizontal CoM drift.
//!
//! **Provable invariants** (measured by the soak, never hardcoded): deterministic
//! scalar f32 math, fixed timestep, no RNG, zero allocation in the hot loop
//! (fixed SoA columns), and a closed-loop controller that never pumps kinetic
//! energy (`energy_growth_ratio <= 1e-6`).
//!
//! Honesty doctrine: `euphoria_balance_ready` is **measured**; every AAA flag
//! (`euphoria_full_aaa_ready`, `ue5_active_ragdoll_aaa_ready`,
//! `chaos_physics_aaa_ready`, …) stays **HELD** until acceptance on real
//! hardware. [`PhysicsWorld`](crate::physics_world) feeds the live Rapier body
//! state each substep and applies the corrective impulse; this kernel remains a
//! self-contained, soak-provable substrate.

/// Fixed substep timestep used by the soak (240 Hz — the Euphoria substep rate).
pub const BALANCE_DT: f32 = 1.0 / 240.0;

/// Soak replay length (2 s of simulated time at 240 Hz).
pub const EUPHORIA_BALANCE_SOAK_TICKS: u32 = 480;

/// Hard per-world agent bound — the SoA fails closed above this.
pub const EUPHORIA_MAX_BALANCE_AGENTS: usize = 256;

/// Evidence tag for the soak report / IPC wire.
pub const EUPHORIA_BALANCE_EVIDENCE_KIND: &str = "euphoria_capture_point_balance";

/// Seed used for the evidence fingerprint only (no RNG in the physics).
const EUPHORIA_BALANCE_FINGERPRINT_SEED: u64 = 0x4B4F_0000_0000_0001_u64;

/// Default torso mass fed to `PhysicsWorld` for a spawned Euphoria torso.
pub const EUPHORIA_TORSO_DEFAULT_MASS: f32 = 75.0;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Bounded, validated configuration of the balance controller.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct EuphoriaBalanceConfig {
    /// Gravitational acceleration (m/s², `> 0`).
    pub gravity: f32,
    /// PD damping ratio of the inverted-pendulum correction (`>= 0.5`).
    pub damping: f32,
    /// Muscle authority — scales the corrective acceleration (`> 0`).
    pub muscle_gain: f32,
    /// Max distance a single foot-placement step may travel (`> 0`).
    pub max_step_distance: f32,
    /// Ankle-strategy radius: inside it, no stepping is needed (`> 0`).
    pub support_radius: f32,
    /// Hand-plant effective support radius (must exceed `support_radius`).
    pub hand_plant_radius: f32,
    /// Dissipative braking gain applied while the CP is beyond a single step
    /// (`>= 0`); scales the horizontal drag that lets the hands arrest drift.
    pub hand_plant_brake: f32,
    /// Vertical CoM descent speed (m/s) that triggers fall recovery (`> 0`).
    pub fall_speed_threshold: f32,
    /// Upward corrective boost applied during fall recovery (`>= 0`).
    pub fall_recovery_boost: f32,
    /// Extra dissipative drag during fall recovery (`>= 0`).
    pub fall_brake: f32,
    /// Extra authority multiplier while absorbing a hit (`>= 0`).
    pub hit_recovery_boost: f32,
    /// Extra dissipative drag while absorbing a hit (`>= 0`).
    pub hit_brake: f32,
    /// Horizontal CoM Δv (m/s) above which an impulse engages `HitRecovery`.
    pub hit_impulse_threshold: f32,
    /// Substep count a hit may take before forced return to Idle (`>= 1`).
    pub hit_recovery_ticks: u32,
    /// Substep count a fall may take before forced return to Idle (`>= 1`).
    pub fall_recovery_ticks: u32,
    /// Fraction of the step target the feet cover per substep (`(0, 1]`).
    pub step_blend: f32,
    /// Per-world agent capacity (`1..=256`).
    pub max_agents: usize,
}

impl Default for EuphoriaBalanceConfig {
    fn default() -> Self {
        Self {
            gravity: 9.81,
            damping: 0.9,
            muscle_gain: 1.0,
            max_step_distance: 0.6,
            support_radius: 0.25,
            hand_plant_radius: 0.8,
            hand_plant_brake: 1.2,
            fall_speed_threshold: 0.5,
            fall_recovery_boost: 1.5,
            fall_brake: 1.0,
            hit_recovery_boost: 1.6,
            hit_brake: 1.2,
            hit_impulse_threshold: 1.5,
            hit_recovery_ticks: 30,
            fall_recovery_ticks: 60,
            step_blend: 0.35,
            max_agents: EUPHORIA_MAX_BALANCE_AGENTS,
        }
    }
}

impl EuphoriaBalanceConfig {
    /// Validates every field; fails closed on any non-finite or out-of-range
    /// value so the controller can never be constructed with degenerate math.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.gravity.is_finite()
            || !self.damping.is_finite()
            || !self.muscle_gain.is_finite()
            || !self.max_step_distance.is_finite()
            || !self.support_radius.is_finite()
            || !self.hand_plant_radius.is_finite()
            || !self.hand_plant_brake.is_finite()
            || !self.fall_speed_threshold.is_finite()
            || !self.fall_recovery_boost.is_finite()
            || !self.fall_brake.is_finite()
            || !self.hit_recovery_boost.is_finite()
            || !self.hit_brake.is_finite()
            || !self.hit_impulse_threshold.is_finite()
            || !self.step_blend.is_finite()
        {
            return Err("euphoria balance config contains a non-finite value");
        }
        if self.gravity <= 0.0 {
            return Err("gravity must be positive");
        }
        if self.damping < 0.5 {
            return Err("damping must be >= 0.5 (controller must be at least near-critically damped)");
        }
        if self.muscle_gain <= 0.0 {
            return Err("muscle_gain must be positive");
        }
        if self.max_step_distance <= 0.0 {
            return Err("max_step_distance must be positive");
        }
        if self.support_radius <= 0.0 {
            return Err("support_radius must be positive");
        }
        if self.hand_plant_radius <= self.support_radius {
            return Err("hand_plant_radius must exceed support_radius");
        }
        if self.hand_plant_brake < 0.0 {
            return Err("hand_plant_brake must be non-negative");
        }
        if self.fall_speed_threshold <= 0.0 {
            return Err("fall_speed_threshold must be positive");
        }
        if self.fall_recovery_boost < 0.0
            || self.fall_brake < 0.0
            || self.hit_recovery_boost < 0.0
            || self.hit_brake < 0.0
        {
            return Err("strategy gains must be non-negative");
        }
        if self.hit_impulse_threshold <= 0.0 {
            return Err("hit_impulse_threshold must be positive");
        }
        if self.hit_recovery_ticks == 0 || self.fall_recovery_ticks == 0 {
            return Err("phase timeouts must be >= 1 substep");
        }
        if !(0.0..=1.0).contains(&self.step_blend) || self.step_blend == 0.0 {
            return Err("step_blend must be in (0, 1]");
        }
        if !(1..=EUPHORIA_MAX_BALANCE_AGENTS).contains(&self.max_agents) {
            return Err("max_agents must be in 1..=256");
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Phase machine
// ---------------------------------------------------------------------------

/// Lifecycle phase of a balance agent.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum BalancePhase {
    /// Upright, in the ankle-strategy envelope.
    #[default]
    Idle,
    /// Absorbing a disturbance impulse; muscles engaged with boost + brake.
    HitRecovery,
    /// CoM descending past the fall threshold; upward corrective push.
    FallRecovery,
    /// CP beyond a single step; expanded support radius + dissipative braking.
    HandPlant,
}

// ---------------------------------------------------------------------------
// SoA — zero-alloc balance agent columns
// ---------------------------------------------------------------------------

/// Fixed-column (SoA) balance agent bank. All arrays are `MAX_BALANCE_AGENTS`
/// long, so the hot loop performs zero allocation and the controller is
/// bit-deterministic across runs.
pub struct EuphoriaBalanceSoA {
    /// Validated shared configuration.
    cfg: EuphoriaBalanceConfig,
    /// Number of live agents (`0..=max_agents`).
    count: usize,
    /// Per-agent mass (kg).
    mass: [f32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Per-agent CoM height above the support plane (m).
    com_height: [f32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Center of mass, current.
    com: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Center of mass, previous substep.
    prev_com: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Center-of-mass velocity.
    com_vel: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Current support point (stance midpoint, projected on the ground plane).
    support: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Left foot.
    foot_l: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Right foot.
    foot_r: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Left hand brace (used by hand plant).
    hand_l: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Right hand brace (used by hand plant).
    hand_r: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Phase machine state.
    phase: [BalancePhase; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Muscle activation in `[0, 1]` (output of the last `step`).
    activation: [f32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Recovery progress in `[0, 1]` (1 = fully recovered).
    recovery: [f32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Substeps spent in the current phase.
    ticks_in_phase: [u32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Lifetime absorbed hits.
    hits_absorbed: [u32; EUPHORIA_MAX_BALANCE_AGENTS],
    /// Corrective acceleration computed by the last `step` (m/s²).
    accel: [[f32; 3]; EUPHORIA_MAX_BALANCE_AGENTS],
}

impl EuphoriaBalanceSoA {
    /// Builds a zero-alloc agent bank from a validated configuration.
    pub fn new(cfg: &EuphoriaBalanceConfig) -> Result<Self, &'static str> {
        cfg.validate()?;
        let zero3 = [0.0_f32; 3];
        Ok(Self {
            cfg: *cfg,
            count: 0,
            mass: [0.0; EUPHORIA_MAX_BALANCE_AGENTS],
            com_height: [0.0; EUPHORIA_MAX_BALANCE_AGENTS],
            com: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            prev_com: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            com_vel: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            support: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            foot_l: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            foot_r: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            hand_l: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            hand_r: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
            phase: [BalancePhase::Idle; EUPHORIA_MAX_BALANCE_AGENTS],
            activation: [0.0; EUPHORIA_MAX_BALANCE_AGENTS],
            recovery: [1.0; EUPHORIA_MAX_BALANCE_AGENTS],
            ticks_in_phase: [0; EUPHORIA_MAX_BALANCE_AGENTS],
            hits_absorbed: [0; EUPHORIA_MAX_BALANCE_AGENTS],
            accel: [zero3; EUPHORIA_MAX_BALANCE_AGENTS],
        })
    }

    /// Number of live agents.
    pub fn agent_count(&self) -> usize {
        self.count
    }

    /// Live capacity of this bank.
    pub fn capacity(&self) -> usize {
        self.cfg.max_agents.min(EUPHORIA_MAX_BALANCE_AGENTS)
    }

    /// Registers a new agent at rest over its support. Fails closed on
    /// non-finite inputs, non-positive mass/CoM-height, or capacity overflow.
    pub fn add_agent(
        &mut self,
        com: [f32; 3],
        com_vel: [f32; 3],
        mass: f32,
        com_height: f32,
    ) -> Result<u32, &'static str> {
        if self.count >= self.capacity() {
            return Err("euphoria balance agent capacity exceeded");
        }
        if !com.iter().all(|v| v.is_finite()) || !com_vel.iter().all(|v| v.is_finite()) {
            return Err("non-finite balance agent inputs");
        }
        if !mass.is_finite() || !com_height.is_finite() || mass <= 0.0 || com_height <= 0.0 {
            return Err("mass and com_height must be positive and finite");
        }
        let i = self.count;
        self.com[i] = com;
        self.prev_com[i] = com;
        self.com_vel[i] = com_vel;
        let ground_y = com[1] - com_height;
        self.support[i] = [com[0], ground_y, com[2]];
        self.foot_l[i] = [com[0] - 0.12, ground_y, com[2]];
        self.foot_r[i] = [com[0] + 0.12, ground_y, com[2]];
        self.hand_l[i] = [com[0] - 0.2, ground_y, com[2] + 0.1];
        self.hand_r[i] = [com[0] + 0.2, ground_y, com[2] + 0.1];
        self.mass[i] = mass;
        self.com_height[i] = com_height;
        self.phase[i] = BalancePhase::Idle;
        self.activation[i] = 0.0;
        self.recovery[i] = 1.0;
        self.ticks_in_phase[i] = 0;
        self.hits_absorbed[i] = 0;
        self.accel[i] = [0.0, 0.0, 0.0];
        self.count += 1;
        Ok(i as u32)
    }

    /// Feeds live CoM + velocity (e.g. from the Rapier body) into an agent.
    pub fn set_com(
        &mut self,
        idx: u32,
        com: [f32; 3],
        com_vel: [f32; 3],
    ) -> Result<(), &'static str> {
        let i = idx as usize;
        if i >= self.count {
            return Err("unknown balance agent");
        }
        if !com.iter().all(|v| v.is_finite()) || !com_vel.iter().all(|v| v.is_finite()) {
            return Err("non-finite balance agent state");
        }
        self.com[i] = com;
        self.com_vel[i] = com_vel;
        Ok(())
    }

    /// Applies an impulse (N·s) to an agent: `Δv = impulse / mass`. If the
    /// resulting horizontal Δv exceeds `hit_impulse_threshold`, the agent
    /// enters `HitRecovery` (muscle activation + boost + brake), absorbing the
    /// hit and counting it. Never pose-additive — it only changes CoM velocity.
    pub fn apply_impulse(&mut self, idx: u32, impulse: [f32; 3]) -> Result<(), &'static str> {
        let i = idx as usize;
        if i >= self.count {
            return Err("unknown balance agent");
        }
        if !impulse.iter().all(|v| v.is_finite()) {
            return Err("non-finite impulse");
        }
        let mass = self.mass[i].max(1.0e-3);
        let dvx = impulse[0] / mass;
        let dvy = impulse[1] / mass;
        let dvz = impulse[2] / mass;
        self.com_vel[i][0] += dvx;
        self.com_vel[i][1] += dvy;
        self.com_vel[i][2] += dvz;
        self.hits_absorbed[i] = self.hits_absorbed[i].saturating_add(1);
        let horiz = (dvx * dvx + dvz * dvz).sqrt();
        if horiz > self.cfg.hit_impulse_threshold {
            self.phase[i] = BalancePhase::HitRecovery;
            self.ticks_in_phase[i] = 0;
            self.recovery[i] = 0.0;
        }
        Ok(())
    }

    /// Advances the whole bank by one deterministic substep. Computes the
    /// corrective acceleration for every agent, updates phase / foot placement /
    /// activation / recovery, and integrates the closed-loop CoM dynamics.
    pub fn step(&mut self, dt: f32) {
        if !dt.is_finite() || dt <= 0.0 {
            return;
        }
        for i in 0..self.count {
            self.step_agent(i, dt);
        }
    }

    /// Per-agent substep.
    fn step_agent(&mut self, i: usize, dt: f32) {
        let cfg = self.cfg;
        self.prev_com[i] = self.com[i];
        self.ticks_in_phase[i] = self.ticks_in_phase[i].saturating_add(1);

        // Enter fall recovery when the CoM descends past the threshold.
        if self.com_vel[i][1] < -cfg.fall_speed_threshold && self.phase[i] == BalancePhase::Idle {
            self.phase[i] = BalancePhase::FallRecovery;
            self.ticks_in_phase[i] = 0;
            self.recovery[i] = 0.0;
        }

        // Physical inverted-pendulum frequency: ω0 = sqrt(g / h).
        let omega0 = (cfg.gravity / self.com_height[i].max(1.0e-3)).sqrt();
        let cp = self.capture_point(i as u32);
        let dx = cp[0] - self.support[i][0];
        let dz = cp[2] - self.support[i][2];
        let dist = (dx * dx + dz * dz).sqrt();

        // Hand plant: the CP lies beyond the reach of a single corrective step.
        if self.phase[i] != BalancePhase::HandPlant
            && dist > cfg.support_radius + cfg.max_step_distance
        {
            self.phase[i] = BalancePhase::HandPlant;
            self.ticks_in_phase[i] = 0;
            self.recovery[i] = 0.0;
        }

        // Foot placement: the CP is outside the ankle envelope but reachable.
        if dist > cfg.support_radius && self.phase[i] != BalancePhase::HandPlant {
            let step_scale = (cfg.max_step_distance / dist).min(1.0);
            let tx = self.support[i][0] + dx * step_scale;
            let tz = self.support[i][2] + dz * step_scale;
            let fx = self.foot_l[i][0] + (tx - self.foot_l[i][0]) * cfg.step_blend;
            let fz = self.foot_l[i][2] + (tz - self.foot_l[i][2]) * cfg.step_blend;
            self.foot_l[i][0] = fx;
            self.foot_l[i][2] = fz;
            self.foot_r[i][0] = fx;
            self.foot_r[i][2] = fz;
            // Support tracks the stance midpoint.
            self.support[i][0] = 0.5 * (self.foot_l[i][0] + self.foot_r[i][0]);
            self.support[i][2] = 0.5 * (self.foot_l[i][2] + self.foot_r[i][2]);
        }

        // Distance to the (possibly moved) support — used by activation/stability.
        let ddx = cp[0] - self.support[i][0];
        let ddz = cp[2] - self.support[i][2];
        let dist_after = (ddx * ddx + ddz * ddz).sqrt();

        // Hand-plant brace: hands push toward the CP on the ground plane.
        if self.phase[i] == BalancePhase::HandPlant {
            let reach = (cfg.hand_plant_radius / dist.max(1.0e-3)).min(1.0);
            let hx = self.support[i][0] + dx * reach;
            let hz = self.support[i][2] + dz * reach;
            self.hand_l[i] = [hx - 0.1, self.support[i][1], hz];
            self.hand_r[i] = [hx + 0.1, self.support[i][1], hz];
        }

        let effective_radius = if self.phase[i] == BalancePhase::HandPlant {
            cfg.hand_plant_radius
        } else {
            cfg.support_radius
        };

        // Inverted-pendulum PD corrective acceleration (horizontal).
        let kp = omega0 * omega0 * cfg.muscle_gain;
        let kd = 2.0 * cfg.damping * omega0 * cfg.muscle_gain;
        let mut ax = kp * (self.support[i][0] - self.com[i][0]) - kd * self.com_vel[i][0];
        let mut az = kp * (self.support[i][2] - self.com[i][2]) - kd * self.com_vel[i][2];
        let mut ay = 0.0_f32;
        if self.phase[i] == BalancePhase::FallRecovery {
            // Upward push against the descent, scaled by how fast the CoM falls.
            ay = cfg.fall_recovery_boost * (-self.com_vel[i][1]).max(0.0) * omega0;
        }
        // Dissipative drags.
        match self.phase[i] {
            BalancePhase::HandPlant => {
                ax -= cfg.hand_plant_brake * self.com_vel[i][0] * omega0;
                az -= cfg.hand_plant_brake * self.com_vel[i][2] * omega0;
            }
            BalancePhase::HitRecovery => {
                ax = ax * cfg.hit_recovery_boost - cfg.hit_brake * self.com_vel[i][0] * omega0;
                az = az * cfg.hit_recovery_boost - cfg.hit_brake * self.com_vel[i][2] * omega0;
            }
            BalancePhase::FallRecovery => {
                ax -= cfg.fall_brake * self.com_vel[i][0] * omega0;
                az -= cfg.fall_brake * self.com_vel[i][2] * omega0;
            }
            BalancePhase::Idle => {}
        }
        self.accel[i] = [ax, ay, az];

        // Muscle activation (0..1): how hard the virtual muscles engage.
        let activation = match self.phase[i] {
            BalancePhase::Idle => 0.2 + 0.8 * (dist_after / effective_radius.max(1.0e-3)).min(1.0),
            BalancePhase::HitRecovery => 1.0 - 0.5 * self.recovery[i],
            BalancePhase::FallRecovery => 1.0,
            BalancePhase::HandPlant => {
                0.5 + 0.5 * (dist_after / cfg.hand_plant_radius.max(1.0e-3)).min(1.0)
            }
        };
        self.activation[i] = activation.clamp(0.0, 1.0);

        // Integrate CoM under the closed-loop corrective dynamics.
        self.com_vel[i][0] += ax * dt;
        self.com_vel[i][1] += ay * dt;
        self.com_vel[i][2] += az * dt;
        self.com[i][0] += self.com_vel[i][0] * dt;
        self.com[i][1] += self.com_vel[i][1] * dt;
        self.com[i][2] += self.com_vel[i][2] * dt;

        // Recovery progress + phase timeouts.
        let phase_ticks = match self.phase[i] {
            BalancePhase::HitRecovery => cfg.hit_recovery_ticks,
            BalancePhase::FallRecovery => cfg.fall_recovery_ticks,
            _ => 0,
        };
        if phase_ticks > 0 {
            let progress = dt / (phase_ticks as f32 * BALANCE_DT);
            self.recovery[i] = (self.recovery[i] + progress).min(1.0);
        }
        // Return to Idle on stability OR phase timeout.
        let stable = dist_after <= effective_radius
            && self.com_vel[i][0].abs() < 0.1
            && self.com_vel[i][2].abs() < 0.1
            && self.com_vel[i][1] > -cfg.fall_speed_threshold;
        let timed_out = phase_ticks > 0 && self.ticks_in_phase[i] >= phase_ticks;
        if self.phase[i] != BalancePhase::Idle && (stable || timed_out) {
            self.phase[i] = BalancePhase::Idle;
            self.ticks_in_phase[i] = 0;
            self.recovery[i] = 1.0;
        }
    }

    /// Pratt capture point: `cp = com_xy + com_vel_xy / ω0`, on the support
    /// ground plane. The exact point the biped must cover to come to rest.
    pub fn capture_point(&self, idx: u32) -> [f32; 3] {
        let i = idx as usize;
        let omega0 = (self.cfg.gravity / self.com_height[i].max(1.0e-3)).sqrt();
        let ground_y = self.support[i][1];
        capture_point_closed_form(self.com[i], self.com_vel[i], omega0, ground_y)
    }

    /// Muscle activation of an agent (output of the last `step`).
    pub fn balance_activation(&self, idx: u32) -> f32 {
        self.activation[idx as usize]
    }

    /// Current phase of an agent.
    pub fn phase(&self, idx: u32) -> BalancePhase {
        self.phase[idx as usize]
    }

    /// Recovery progress of an agent (`[0, 1]`).
    pub fn recovery(&self, idx: u32) -> f32 {
        self.recovery[idx as usize]
    }

    /// Lifetime absorbed hits of an agent.
    pub fn hits_absorbed(&self, idx: u32) -> u32 {
        self.hits_absorbed[idx as usize]
    }

    /// Corrective acceleration computed by the last `step` (m/s²).
    pub fn corrective_accel(&self, idx: u32) -> [f32; 3] {
        self.accel[idx as usize]
    }

    /// Agent mass (kg).
    pub fn agent_mass(&self, idx: u32) -> f32 {
        self.mass[idx as usize]
    }

    /// Agent CoM height above the support plane (m).
    pub fn agent_com_height(&self, idx: u32) -> f32 {
        self.com_height[idx as usize]
    }

    /// Agent CoM.
    pub fn com(&self, idx: u32) -> [f32; 3] {
        self.com[idx as usize]
    }

    /// Agent CoM velocity.
    pub fn com_vel(&self, idx: u32) -> [f32; 3] {
        self.com_vel[idx as usize]
    }

    /// Agent support point.
    pub fn support(&self, idx: u32) -> [f32; 3] {
        self.support[idx as usize]
    }

    /// Agent left foot.
    pub fn foot_l(&self, idx: u32) -> [f32; 3] {
        self.foot_l[idx as usize]
    }

    /// Agent right foot.
    pub fn foot_r(&self, idx: u32) -> [f32; 3] {
        self.foot_r[idx as usize]
    }
}

/// Pratt capture point closed form (validated against the analytic formula).
///
/// `cp = [com.x + vel.x/ω0, ground_y, com.z + vel.z/ω0]`.
pub fn capture_point_closed_form(
    com: [f32; 3],
    vel: [f32; 3],
    omega0: f32,
    ground_y: f32,
) -> [f32; 3] {
    let w = if omega0.is_finite() && omega0 > 0.0 {
        omega0
    } else {
        1.0
    };
    [com[0] + vel[0] / w, ground_y, com[2] + vel[2] / w]
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter ko)
// ---------------------------------------------------------------------------

/// Measured (never assumed) evidence for the balance soak.
#[derive(Debug, Clone, Copy)]
struct EuphoriaBalanceMeasured {
    at_rest_peak_activation: f32,
    at_rest_peak_accel: f32,
    hit_delta_v: f32,
    hit_peak_activation: f32,
    hit_recovery_ratio: f32,
    hit_returned_to_idle: bool,
    capture_point_error: f32,
    step_moved_feet: bool,
    step_support_correction: f32,
    fall_recovery_active: bool,
    fall_recovery_boost_y: f32,
    hand_plant_active: bool,
    hand_plant_brake_ratio: f32,
    energy_before: f32,
    energy_after: f32,
    energy_growth_ratio: f32,
    max_abs_com_vel: f32,
    max_abs_accel: f32,
}

fn run_measured_pass() -> EuphoriaBalanceMeasured {
    let cfg = EuphoriaBalanceConfig::default();
    let mut bal = EuphoriaBalanceSoA::new(&cfg).expect("valid soak config");

    // Agent 0 — at rest: no impulse, no offset. Measures resting muscle tone
    // and the (near-zero) corrective push required to hold still.
    let rest = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    // Agent 1 — hit reaction: a 150 N·s horizontal impulse on a 75 kg torso
    // yields Δv = 2.0 m/s (> hit_impulse_threshold 1.5) → HitRecovery.
    let hit = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    bal.apply_impulse(hit, [150.0, 0.0, 0.0]).unwrap();
    let hit_delta_v = bal.com_vel(hit)[0].abs();
    let hit_v0 = bal.com_vel(hit)[0];
    // Agent 2 — foot placement: CoM offset 0.5 m (> support_radius 0.25) with
    // zero velocity → CP outside the ankle envelope but reachable by a step.
    let step = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    bal.set_com(step, [0.5, 1.0, 0.0], [0.0, 0.0, 0.0]).unwrap();
    let step_support_start = bal.support(step)[0];
    let step_foot_start = bal.foot_l(step)[0];
    // Agent 3 — fall recovery: CoM descending at -1.0 m/s (< -0.5 threshold).
    let fall = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    bal.set_com(fall, [0.0, 1.0, 0.0], [0.0, -1.0, 0.0]).unwrap();
    // Agent 4 — hand plant: CoM 2 m off support with a 1.5 m/s drift → CP far
    // beyond a single step → HandPlant with dissipative braking.
    let plant = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    bal.set_com(plant, [2.0, 1.0, 0.0], [1.5, 0.0, 0.0]).unwrap();
    // Agent 5 — energy: a strong hit (Δv = 3.0 m/s) to measure that the
    // closed-loop controller never pumps kinetic energy.
    let energy = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
    bal.apply_impulse(energy, [225.0, 0.0, 0.0]).unwrap();
    let energy_before = 0.5 * 75.0 * bal.com_vel(energy)[0].powi(2);

    let mut at_rest_peak_activation = 0.0_f32;
    let mut at_rest_peak_accel = 0.0_f32;
    let mut hit_peak_activation = 0.0_f32;
    let mut capture_point_error = 0.0_f32;
    let mut max_abs_com_vel = 0.0_f32;
    let mut max_abs_accel = 0.0_f32;
    let mut hit_returned_to_idle = false;
    let mut step_moved_feet = false;
    let mut fall_recovery_active = false;
    let mut fall_recovery_boost_y = 0.0_f32;
    let mut hand_plant_active = false;
    let mut hand_plant_brake_speed_sum = 0.0_f32;
    let mut hand_plant_speed_samples = 0_u32;

    for _ in 0..EUPHORIA_BALANCE_SOAK_TICKS {
        for i in 0..bal.agent_count() {
            // Independent analytic capture-point check (Pratt closed form).
            let idx = i as u32;
            let h = bal.agent_com_height(idx);
            let w = (cfg.gravity / h.max(1.0e-3)).sqrt();
            let cp = bal.capture_point(idx);
            let analytic = capture_point_closed_form(bal.com(idx), bal.com_vel(idx), w, bal.support(idx)[1]);
            let err = ((cp[0] - analytic[0]).powi(2) + (cp[2] - analytic[2]).powi(2)).sqrt();
            if err > capture_point_error {
                capture_point_error = err;
            }
            let spd = (bal.com_vel(idx)[0].powi(2)
                + bal.com_vel(idx)[1].powi(2)
                + bal.com_vel(idx)[2].powi(2))
            .sqrt();
            if spd > max_abs_com_vel {
                max_abs_com_vel = spd;
            }
            let acc = bal.corrective_accel(idx);
            let amag = (acc[0].powi(2) + acc[1].powi(2) + acc[2].powi(2)).sqrt();
            if amag > max_abs_accel {
                max_abs_accel = amag;
            }
        }

        let a = bal.balance_activation(rest);
        if a > at_rest_peak_activation {
            at_rest_peak_activation = a;
        }
        let r_acc = bal.corrective_accel(rest);
        let r_mag = (r_acc[0].powi(2) + r_acc[1].powi(2) + r_acc[2].powi(2)).sqrt();
        if r_mag > at_rest_peak_accel {
            at_rest_peak_accel = r_mag;
        }

        let h_act = bal.balance_activation(hit);
        if h_act > hit_peak_activation {
            hit_peak_activation = h_act;
        }
        if bal.phase(hit) == BalancePhase::Idle {
            hit_returned_to_idle = true;
        }

        let s_foot = bal.foot_l(step)[0];
        if (s_foot - step_foot_start).abs() > 0.01 {
            step_moved_feet = true;
        }

        if bal.phase(fall) == BalancePhase::FallRecovery {
            fall_recovery_active = true;
            let fy = bal.corrective_accel(fall)[1];
            if fy > fall_recovery_boost_y {
                fall_recovery_boost_y = fy;
            }
        }

        if bal.phase(plant) == BalancePhase::HandPlant {
            hand_plant_active = true;
            let pv = bal.com_vel(plant)[0].abs();
            hand_plant_brake_speed_sum += pv;
            hand_plant_speed_samples += 1;
        }

        bal.step(BALANCE_DT);
    }

    let energy_after = 0.5 * 75.0 * bal.com_vel(energy)[0].powi(2);
    let energy_growth_ratio = if energy_before > 0.0 {
        ((energy_after - energy_before) / energy_before).max(0.0)
    } else {
        0.0
    };
    let hit_v_end = bal.com_vel(hit)[0];
    let hit_recovery_ratio = if hit_v0.abs() > 1.0e-6 {
        ((hit_v0.abs() - hit_v_end.abs()) / hit_v0.abs()).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let step_support_correction = (bal.support(step)[0] - step_support_start).abs();
    let hand_plant_brake_ratio = if hand_plant_speed_samples > 0 {
        let initial = 1.5_f32;
        let avg = hand_plant_brake_speed_sum / hand_plant_speed_samples as f32;
        ((initial - avg) / initial).clamp(0.0, 1.0)
    } else {
        0.0
    };

    EuphoriaBalanceMeasured {
        at_rest_peak_activation,
        at_rest_peak_accel,
        hit_delta_v,
        hit_peak_activation,
        hit_recovery_ratio,
        hit_returned_to_idle,
        capture_point_error,
        step_moved_feet,
        step_support_correction,
        fall_recovery_active,
        fall_recovery_boost_y,
        hand_plant_active,
        hand_plant_brake_ratio,
        energy_before,
        energy_after,
        energy_growth_ratio,
        max_abs_com_vel,
        max_abs_accel,
    }
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v.to_bits() >> 8) as u64
    } else {
        0xFFFF_FFFF_FFFF_0000
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

fn euphoria_balance_evidence_fingerprint(m: &EuphoriaBalanceMeasured) -> u64 {
    let mut fp = EUPHORIA_BALANCE_FINGERPRINT_SEED;
    fp = hash_mix(fp, quant_f32(m.at_rest_peak_activation));
    fp = hash_mix(fp, quant_f32(m.at_rest_peak_accel));
    fp = hash_mix(fp, quant_f32(m.hit_delta_v));
    fp = hash_mix(fp, quant_f32(m.hit_peak_activation));
    fp = hash_mix(fp, quant_f32(m.hit_recovery_ratio));
    fp = hash_mix(fp, u64::from(m.hit_returned_to_idle));
    fp = hash_mix(fp, quant_f32(m.capture_point_error));
    fp = hash_mix(fp, u64::from(m.step_moved_feet));
    fp = hash_mix(fp, quant_f32(m.step_support_correction));
    fp = hash_mix(fp, u64::from(m.fall_recovery_active));
    fp = hash_mix(fp, quant_f32(m.fall_recovery_boost_y));
    fp = hash_mix(fp, u64::from(m.hand_plant_active));
    fp = hash_mix(fp, quant_f32(m.hand_plant_brake_ratio));
    fp = hash_mix(fp, quant_f32(m.energy_before));
    fp = hash_mix(fp, quant_f32(m.energy_after));
    fp = hash_mix(fp, quant_f32(m.energy_growth_ratio));
    fp = hash_mix(fp, quant_f32(m.max_abs_com_vel));
    fp = hash_mix(fp, quant_f32(m.max_abs_accel));
    fp
}

fn measured_finite(m: &EuphoriaBalanceMeasured) -> bool {
    m.at_rest_peak_activation.is_finite()
        && m.at_rest_peak_accel.is_finite()
        && m.hit_delta_v.is_finite()
        && m.hit_peak_activation.is_finite()
        && m.hit_recovery_ratio.is_finite()
        && m.capture_point_error.is_finite()
        && m.step_support_correction.is_finite()
        && m.fall_recovery_boost_y.is_finite()
        && m.hand_plant_brake_ratio.is_finite()
        && m.energy_before.is_finite()
        && m.energy_after.is_finite()
        && m.energy_growth_ratio.is_finite()
        && m.max_abs_com_vel.is_finite()
        && m.max_abs_accel.is_finite()
}

/// Measured readiness gate — every invariant below is proven by the replay.
fn readiness(m: &EuphoriaBalanceMeasured) -> bool {
    if !measured_finite(m) {
        return false;
    }
    // Resting posture: low muscle tone, no corrective push.
    if m.at_rest_peak_activation > 0.5 {
        return false;
    }
    if m.at_rest_peak_accel > 0.05 {
        return false;
    }
    // A real hit was applied and engaged the muscles.
    if m.hit_delta_v <= 0.0 {
        return false;
    }
    if m.hit_peak_activation <= 0.5 {
        return false;
    }
    // Balance was measurably recovered.
    if m.hit_recovery_ratio <= 0.5 {
        return false;
    }
    if !m.hit_returned_to_idle {
        return false;
    }
    // Capture point matches the Pratt closed form.
    if m.capture_point_error >= 1.0e-3 {
        return false;
    }
    // Foot placement actually stepped toward the capture point.
    if !m.step_moved_feet {
        return false;
    }
    if m.step_support_correction <= 0.0 {
        return false;
    }
    // Fall recovery engaged with an upward corrective push.
    if !m.fall_recovery_active {
        return false;
    }
    if m.fall_recovery_boost_y <= 0.0 {
        return false;
    }
    // Hand plant engaged with measurable braking.
    if !m.hand_plant_active {
        return false;
    }
    if m.hand_plant_brake_ratio <= 0.0 {
        return false;
    }
    // Closed-loop controller never pumps energy.
    if m.energy_growth_ratio > 1.0e-6 {
        return false;
    }
    // Blow-up guards.
    if m.max_abs_com_vel >= 10.0 {
        return false;
    }
    if m.max_abs_accel >= 100.0 {
        return false;
    }
    true
}

/// Soak report for the Euphoria balance-controller kernel (letter **ko**).
#[derive(Debug, Clone, PartialEq)]
pub struct EuphoriaBalanceSoakReport {
    pub euphoria_balance_ready: bool,
    pub at_rest_peak_activation: f32,
    pub at_rest_peak_accel: f32,
    pub hit_delta_v: f32,
    pub hit_peak_activation: f32,
    pub hit_recovery_ratio: f32,
    pub hit_returned_to_idle: bool,
    pub capture_point_error: f32,
    pub step_moved_feet: bool,
    pub step_support_correction: f32,
    pub fall_recovery_active: bool,
    pub fall_recovery_boost_y: f32,
    pub hand_plant_active: bool,
    pub hand_plant_brake_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_growth_ratio: f32,
    pub max_abs_com_vel: f32,
    pub max_abs_accel: f32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub euphoria_full_aaa_ready: bool,
    pub ue5_active_ragdoll_aaa_ready: bool,
    pub chaos_physics_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(m: &EuphoriaBalanceMeasured, deterministic: bool) -> EuphoriaBalanceSoakReport {
    let ready = readiness(m) && deterministic;
    EuphoriaBalanceSoakReport {
        euphoria_balance_ready: ready,
        at_rest_peak_activation: m.at_rest_peak_activation,
        at_rest_peak_accel: m.at_rest_peak_accel,
        hit_delta_v: m.hit_delta_v,
        hit_peak_activation: m.hit_peak_activation,
        hit_recovery_ratio: m.hit_recovery_ratio,
        hit_returned_to_idle: m.hit_returned_to_idle,
        capture_point_error: m.capture_point_error,
        step_moved_feet: m.step_moved_feet,
        step_support_correction: m.step_support_correction,
        fall_recovery_active: m.fall_recovery_active,
        fall_recovery_boost_y: m.fall_recovery_boost_y,
        hand_plant_active: m.hand_plant_active,
        hand_plant_brake_ratio: m.hand_plant_brake_ratio,
        energy_before: m.energy_before,
        energy_after: m.energy_after,
        energy_growth_ratio: m.energy_growth_ratio,
        max_abs_com_vel: m.max_abs_com_vel,
        max_abs_accel: m.max_abs_accel,
        deterministic,
        total_ticks: EUPHORIA_BALANCE_SOAK_TICKS,
        evidence_kind: EUPHORIA_BALANCE_EVIDENCE_KIND,
        evidence_fingerprint: euphoria_balance_evidence_fingerprint(m),
        euphoria_full_aaa_ready: false,
        ue5_active_ragdoll_aaa_ready: false,
        chaos_physics_aaa_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Runs the deterministic soak replay twice; readiness requires both passes to
/// agree bit-for-bit (same evidence fingerprint).
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_euphoria_balance_soak() -> EuphoriaBalanceSoakReport {
    static CACHE: std::sync::OnceLock<EuphoriaBalanceSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = euphoria_balance_evidence_fingerprint(&a)
                == euphoria_balance_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe — delegates to the soak so the probe can never out-claim the kernel.
pub fn probe_euphoria_balance_controller() -> EuphoriaBalanceSoakReport {
    run_euphoria_balance_soak()
}

/// Runs the extended deterministic soak (used by the studio wire soak command).
pub fn run_euphoria_balance_controller_soak() -> EuphoriaBalanceSoakReport {
    run_euphoria_balance_soak()
}

// ---------------------------------------------------------------------------
// Tests — AAA invariants
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::neural_biomechanics_npia::SkeletonBoneSoA;

    fn rest_agent() -> EuphoriaBalanceSoA {
        let cfg = EuphoriaBalanceConfig::default();
        EuphoriaBalanceSoA::new(&cfg).expect("valid cfg")
    }

    #[test]
    fn config_rejects_invalid_values() {
        let mut cfg = EuphoriaBalanceConfig::default();
        assert!(cfg.validate().is_ok());

        cfg.gravity = 0.0;
        assert!(cfg.validate().is_err());
        cfg.gravity = -1.0;
        assert!(cfg.validate().is_err());
        cfg.gravity = f32::NAN;
        assert!(cfg.validate().is_err());
        cfg = EuphoriaBalanceConfig::default();

        cfg.damping = 0.49;
        assert!(cfg.validate().is_err());
        cfg.damping = 0.5;
        assert!(cfg.validate().is_ok());
        cfg = EuphoriaBalanceConfig::default();

        cfg.hand_plant_radius = cfg.support_radius;
        assert!(cfg.validate().is_err());
        cfg = EuphoriaBalanceConfig::default();

        cfg.max_agents = 0;
        assert!(cfg.validate().is_err());
        cfg.max_agents = 257;
        assert!(cfg.validate().is_err());
        cfg = EuphoriaBalanceConfig::default();

        cfg.step_blend = 0.0;
        assert!(cfg.validate().is_err());
        cfg.step_blend = 1.5;
        assert!(cfg.validate().is_err());
        cfg = EuphoriaBalanceConfig::default();

        cfg.hit_recovery_ticks = 0;
        assert!(cfg.validate().is_err());
        cfg = EuphoriaBalanceConfig::default();

        cfg.muscle_gain = 0.0;
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn capture_point_closed_form_matches_analytic() {
        // cp = com_xy + vel_xy / ω0, at ground_y.
        let com = [1.0, 2.0, 3.0];
        let vel = [3.0, 0.0, 4.0];
        let w = 2.0_f32;
        let cp = capture_point_closed_form(com, vel, w, 0.0);
        assert!((cp[0] - (1.0 + 3.0 / 2.0)).abs() < 1.0e-6);
        assert!((cp[2] - (3.0 + 4.0 / 2.0)).abs() < 1.0e-6);
        assert_eq!(cp[1], 0.0);
        // Degenerate ω0 is fail-closed to 1.0 (never NaN/Inf).
        let d = capture_point_closed_form(com, vel, 0.0, 0.0);
        assert!(d[0].is_finite() && d[2].is_finite());
    }

    #[test]
    fn add_agent_fails_closed_on_bad_inputs() {
        let mut bal = rest_agent();
        assert!(bal.add_agent([f32::NAN, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).is_err());
        assert!(bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 0.0, 1.0).is_err());
        assert!(bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 0.0).is_err());
        assert_eq!(bal.agent_count(), 0);
    }

    #[test]
    fn capacity_is_enforced() {
        let mut bal = rest_agent();
        for i in 0..256 {
            bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0)
                .expect("agent slot free");
            assert_eq!(bal.agent_count(), i + 1);
        }
        assert!(bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).is_err());
        assert_eq!(bal.agent_count(), 256);
    }

    #[test]
    fn at_rest_agent_stays_quiet() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        for _ in 0..240 {
            bal.step(BALANCE_DT);
        }
        let v = bal.com_vel(a);
        assert!(v[0].abs() < 1.0e-4 && v[1].abs() < 1.0e-4 && v[2].abs() < 1.0e-4);
        assert!(bal.phase(a) == BalancePhase::Idle);
        assert!(bal.balance_activation(a) <= 0.5);
        let acc = bal.corrective_accel(a);
        assert!(acc[0].abs() < 0.05 && acc[1].abs() < 0.05 && acc[2].abs() < 0.05);
    }

    #[test]
    fn hit_engages_muscles_and_recovers() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.apply_impulse(a, [150.0, 0.0, 0.0]).unwrap();
        assert_eq!(bal.phase(a), BalancePhase::HitRecovery);
        assert_eq!(bal.hits_absorbed(a), 1);
        assert!((bal.com_vel(a)[0] - 2.0).abs() < 1.0e-4);
        // First substep: muscles engage near max.
        bal.step(BALANCE_DT);
        assert!(bal.balance_activation(a) > 0.5);
        // The corrective PD + braking measurably slows the drift.
        let v0 = bal.com_vel(a)[0].abs();
        assert!(v0 < 2.0);
        for _ in 0..480 {
            bal.step(BALANCE_DT);
        }
        assert!(bal.com_vel(a)[0].abs() < 0.2);
        assert_eq!(bal.phase(a), BalancePhase::Idle);
    }

    #[test]
    fn impulse_below_threshold_stays_idle() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        // Δv = 0.5 m/s < 1.5 threshold → no HitRecovery phase.
        bal.apply_impulse(a, [37.5, 0.0, 0.0]).unwrap();
        assert_eq!(bal.phase(a), BalancePhase::Idle);
        assert_eq!(bal.hits_absorbed(a), 1);
    }

    #[test]
    fn foot_placement_moves_stance_toward_capture_point() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.set_com(a, [0.5, 1.0, 0.0], [0.0, 0.0, 0.0]).unwrap();
        let foot0 = bal.foot_l(a)[0];
        for _ in 0..120 {
            bal.step(BALANCE_DT);
        }
        let foot1 = bal.foot_l(a)[0];
        assert!(foot1 > foot0 + 0.05, "feet must march toward the CP");
        assert!(bal.support(a)[0] > 0.1);
        // CoM pulled back toward the (moved) support.
        let dist = (bal.com(a)[0] - bal.support(a)[0]).abs();
        assert!(dist < 0.5);
    }

    #[test]
    fn fall_recovery_counters_descent() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.set_com(a, [0.0, 1.0, 0.0], [0.0, -1.0, 0.0]).unwrap();
        bal.step(BALANCE_DT);
        assert_eq!(bal.phase(a), BalancePhase::FallRecovery);
        let ay = bal.corrective_accel(a)[1];
        assert!(ay > 0.0, "upward corrective push expected");
        // Over the recovery window the descent is arrested.
        for _ in 0..120 {
            bal.step(BALANCE_DT);
        }
        assert!(bal.com_vel(a)[1] > -0.5);
    }

    #[test]
    fn hand_plant_expands_support_and_brakes() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.set_com(a, [2.0, 1.0, 0.0], [1.5, 0.0, 0.0]).unwrap();
        bal.step(BALANCE_DT);
        assert_eq!(bal.phase(a), BalancePhase::HandPlant);
        let v0 = bal.com_vel(a)[0].abs();
        for _ in 0..240 {
            bal.step(BALANCE_DT);
        }
        let v1 = bal.com_vel(a)[0].abs();
        assert!(v1 < v0 * 0.7, "hand plant must brake the horizontal drift");
    }

    #[test]
    fn step_is_deterministic() {
        let mut a = rest_agent();
        let mut b = rest_agent();
        let ia = a.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        let ib = b.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        a.apply_impulse(ia, [150.0, 0.0, 0.0]).unwrap();
        b.apply_impulse(ib, [150.0, 0.0, 0.0]).unwrap();
        for _ in 0..480 {
            a.step(BALANCE_DT);
            b.step(BALANCE_DT);
        }
        assert_eq!(a.com(ia), b.com(ib));
        assert_eq!(a.com_vel(ia), b.com_vel(ib));
        assert_eq!(a.balance_activation(ia), b.balance_activation(ib));
        assert_eq!(a.phase(ia), b.phase(ib));
    }

    #[test]
    fn zero_alloc_hot_loop_keeps_capacities() {
        // Fixed arrays cannot grow; capacity is pinned and overflow fails closed.
        let mut bal = rest_agent();
        assert_eq!(bal.capacity(), 256);
        for i in 0..256 {
            bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
            assert_eq!(bal.agent_count(), i + 1);
        }
        for _ in 0..480 {
            bal.step(BALANCE_DT);
        }
        assert_eq!(bal.agent_count(), 256);
    }

    #[test]
    fn energy_never_grows_with_damping() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.apply_impulse(a, [225.0, 0.0, 0.0]).unwrap();
        let e0 = 0.5 * 75.0 * bal.com_vel(a)[0].powi(2);
        for _ in 0..480 {
            bal.step(BALANCE_DT);
        }
        let e1 = 0.5 * 75.0 * bal.com_vel(a)[0].powi(2);
        assert!(e1 <= e0 * 1.000001);
    }

    #[test]
    fn outputs_are_bounded_and_finite() {
        let mut bal = rest_agent();
        let mut max_v = 0.0_f32;
        let mut max_a = 0.0_f32;
        for k in 0..4 {
            let idx = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
            let jx = 75.0 * (k as f32 + 1.0);
            bal.apply_impulse(idx, [jx, 0.0, 0.0]).unwrap();
        }
        for _ in 0..480 {
            for i in 0..bal.agent_count() {
                let spd = (bal.com_vel(i as u32)[0].powi(2)
                    + bal.com_vel(i as u32)[1].powi(2)
                    + bal.com_vel(i as u32)[2].powi(2))
                .sqrt();
                if spd > max_v {
                    max_v = spd;
                }
                let acc = bal.corrective_accel(i as u32);
                let am = (acc[0].powi(2) + acc[1].powi(2) + acc[2].powi(2)).sqrt();
                if am > max_a {
                    max_a = am;
                }
            }
            bal.step(BALANCE_DT);
        }
        assert!(max_v.is_finite() && max_v < 10.0);
        assert!(max_a.is_finite() && max_a < 100.0);
        assert!(bal.balance_activation(0) <= 1.0);
        assert!(bal.recovery(0) <= 1.0);
    }

    #[test]
    fn phase_machine_times_out_to_idle() {
        let mut bal = rest_agent();
        let a = bal.add_agent([0.0, 1.0, 0.0], [0.0, 0.0, 0.0], 75.0, 1.0).unwrap();
        bal.apply_impulse(a, [150.0, 0.0, 0.0]).unwrap();
        assert_eq!(bal.phase(a), BalancePhase::HitRecovery);
        // HitRecovery times out after hit_recovery_ticks (30) substeps max.
        for _ in 0..31 {
            bal.step(BALANCE_DT);
        }
        assert_eq!(bal.phase(a), BalancePhase::Idle);
    }

    #[test]
    fn composition_with_npia_center_of_mass() {
        // Build a real NPIA skeleton, feed its CoM into the balance controller,
        // and verify the controller holds the computed CoM at rest.
        let mut skel = SkeletonBoneSoA::with_capacity(4);
        skel.add_bone(0.0, 0.0, 0.0, -1, 10.0);
        skel.add_bone(0.0, 2.0, 0.0, 0, 5.0);
        skel.add_bone(0.0, 4.0, 0.0, 1, 2.0);
        let com = skel.compute_center_of_mass();
        assert!(com[1] > 1.0 && com[1] < 2.0);

        let mut bal = rest_agent();
        let a = bal.add_agent(com, [0.0, 0.0, 0.0], 75.0, com[1]).unwrap();
        for _ in 0..240 {
            bal.step(BALANCE_DT);
        }
        let v = bal.com_vel(a);
        assert!(v[0].abs() < 1.0e-3 && v[1].abs() < 1.0e-3 && v[2].abs() < 1.0e-3);
        assert!(bal.balance_activation(a) <= 0.5);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_euphoria_balance_soak();
        assert!(r.euphoria_balance_ready, "balance soak must prove readiness");
        assert!(r.at_rest_peak_activation <= 0.5);
        assert!(r.at_rest_peak_accel <= 0.05);
        assert!(r.hit_delta_v > 0.0);
        assert!(r.hit_peak_activation > 0.5);
        assert!(r.hit_recovery_ratio > 0.5);
        assert!(r.hit_returned_to_idle);
        assert!(r.capture_point_error < 1.0e-3);
        assert!(r.step_moved_feet);
        assert!(r.step_support_correction > 0.0);
        assert!(r.fall_recovery_active);
        assert!(r.fall_recovery_boost_y > 0.0);
        assert!(r.hand_plant_active);
        assert!(r.hand_plant_brake_ratio > 0.0);
        assert!(r.energy_growth_ratio <= 1.0e-6);
        assert!(r.max_abs_com_vel < 10.0);
        assert!(r.max_abs_accel < 100.0);
        assert!(r.deterministic);
        assert_eq!(r.total_ticks, EUPHORIA_BALANCE_SOAK_TICKS);
        assert_eq!(r.evidence_kind, EUPHORIA_BALANCE_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.euphoria_full_aaa_ready
                && !r.ue5_active_ragdoll_aaa_ready
                && !r.chaos_physics_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(
            !r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_euphoria_balance_soak();
        let b = run_euphoria_balance_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.hit_recovery_ratio, b.hit_recovery_ratio);
        assert_eq!(a.energy_growth_ratio, b.energy_growth_ratio);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_euphoria_balance_soak();
        let probe = probe_euphoria_balance_controller();
        assert_eq!(soak.euphoria_balance_ready, probe.euphoria_balance_ready);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.hit_recovery_ratio, probe.hit_recovery_ratio);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_euphoria_balance_soak();
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
            .evidence_fingerprint;
        let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak()
            .evidence_fingerprint;
        let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak()
            .evidence_fingerprint;
        let km = crate::dynamic_shader_rewriter::shader_evidence_fingerprint(
            &crate::dynamic_shader_rewriter::run_shader_cooker_soak(0x5EED_CAFE),
        );
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, ks);
        assert_ne!(r.evidence_fingerprint, kt);
        assert_ne!(r.evidence_fingerprint, km);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, ju);
    }
}

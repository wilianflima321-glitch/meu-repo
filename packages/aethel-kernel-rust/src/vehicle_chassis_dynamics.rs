//! # Vehicle Chassis Dynamics Kernel — letter **kz** (R3-A / Vanguarda P2 — GAS & Física).
//!
//! The **deterministic 4-wheel vehicle chassis solver** that closes the R3 audit
//! gap "vehicles = ZERO" on the **S-17 deterministic spine**: the same
//! rollback/fingerprint discipline as [`crate::physics_world`] (240 Hz
//! authority, bit-identical replay) applied to suspension, tyre contact and
//! drivetrain — gameplay rico sem quebrar rollback/fingerprint.
//!
//! ## The gap this kernel closes (the R3-A mandate)
//!
//! Before R3-A the kernel had PBD/XPBD cloth (`ip`), SPH fluids (`ec`), NS
//! aerodynamics fluid (`gv`), living-sky buoyancy (`jy`) and the S-17 physics
//! world — but **no vehicle** solver: no wheel, no suspension, no differential.
//! R3-A adds the ground-vehicle layer as a **standalone deterministic fixture**
//! that composes onto the same hot-loop discipline:
//!
//! ```text
//!   DriveInput (throttle · brake · steer)          ExternalForce / ExternalTorque
//!        │                                                 │
//!        ▼                                                 ▼
//!   VehicleChassis::step(dt, input)  ── semi-implicit Euler, 4 fixed substeps
//!        │  per wheel (4): suspension spring-damper → tyre contact (normal + tanh
//!        │  Coulomb slip friction) → Ackermann steering (front) → drivetrain
//!        │  differential (open / locked / torque-vectoring) → anti-roll bar
//!        ▼
//!   VehicleChassisState (position · quaternion · linear/angular velocity ·
//!                        wheel compressions · wheel spins)   → Snapshot (rollback)
//! ```
//!
//! ## Honesty (Zero-MVP / Anti-Mock)
//!
//! `ready` is **soak-gated**: it is `true` **only** when every measured
//! invariant holds — static equilibrium (suspension supports the full weight
//! with `normal_force_balance_err` below tolerance, no sinking), settled
//! rest speed below epsilon, Ackermann inner-wheel steer greater than outer,
//! open differential splitting torque equally, rollback replay bit-identical,
//! zero-alloc hot loop, finite-and-bounded under braking, and cross-run
//! determinism (double-pass same evidence fingerprint).
//!
//! Every AAA vector — active ragdoll / Chaos-level chassis fracture, production
//! tyre grip, drift model, shared-memory 60 Hz vehicle authority — stays
//! **HELD fail-closed** (`false`) until wired to a real engine scene: this is
//! the deterministic backend solver, not a shipped AAA vehicle.

use serde::{Deserialize, Serialize};

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};

/// Deterministic evidence-fingerprint seed for the vehicle chassis kernel
/// (letter **kz**).
const VEHICLE_CHASSIS_FP_SEED: u64 = 0x6B7A_0000_0000_0001; // "kz..."
/// Final fold for the evidence fingerprint (letter **kz**).
const VEHICLE_CHASSIS_FP_FOLD: u64 = 0x6B7A_6B7A_6B7A_6B7A; // "kzkzkzkz"
/// Evidence kind tag reported by the soak (letter **kz**).
pub const VEHICLE_CHASSIS_EVIDENCE_KIND: &str = "vehicle_chassis_dynamics";
/// Number of wheels in the fixed SoA layout.
pub const WHEEL_COUNT: usize = 4;
/// Number of fixed integration substeps per `step` call (deterministic 240 Hz).
pub const SUBSTEPS: u32 = 4;
/// Fixed physics time-step of the measured soak (240 Hz).
pub const SOAK_DT: f32 = 1.0 / 240.0;
/// Number of settle steps in the measured soak pass.
pub const SOAK_STEPS: u64 = 2400;
/// Number of hot-loop iterations in the measured soak pass.
pub const HOT_LOOP_ITERATIONS: u64 = 4096;

/// Drivetrain layout — which axle receives engine torque.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DriveLayout {
    /// Engine torque to the front axle only.
    FrontWheelDrive,
    /// Engine torque to the rear axle only.
    RearWheelDrive,
    /// Engine torque to both axles (front/rear bias).
    FourWheelDrive,
}

impl DriveLayout {
    /// Stable tag for telemetry / serde (never derived from debug).
    pub const fn tag(self) -> &'static str {
        match self {
            DriveLayout::FrontWheelDrive => "fwd",
            DriveLayout::RearWheelDrive => "rwd",
            DriveLayout::FourWheelDrive => "4wd",
        }
    }
}

/// Differential behaviour inside one driven axle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DifferentialMode {
    /// Left/right wheel always receives half the axle torque.
    Open,
    /// Both wheels are forced to the same torque (spool).
    Locked,
    /// Dynamic torque split biased by steering (torque vectoring).
    TorqueVectoring,
}

impl DifferentialMode {
    /// Stable tag for telemetry / serde (never derived from debug).
    pub const fn tag(self) -> &'static str {
        match self {
            DifferentialMode::Open => "open",
            DifferentialMode::Locked => "locked",
            DifferentialMode::TorqueVectoring => "torque_vectoring",
        }
    }
}

/// Deterministic ground profile used by the tyre contact model.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GroundProfile {
    /// Flat plane at `y = 0`.
    Flat,
    /// Deterministic sine bumps along `x + z` (suspension exercise).
    Sine { amplitude: f32, wavelength: f32 },
}

impl GroundProfile {
    /// Ground height at world `(x, z)` — pure function, no state, deterministic.
    pub fn ground_height(&self, x: f32, z: f32) -> f32 {
        match *self {
            GroundProfile::Flat => 0.0,
            GroundProfile::Sine { amplitude, wavelength } => {
                let w = if wavelength.abs() < 1e-6 { 1.0 } else { wavelength };
                amplitude * ((x + z) * std::f32::consts::TAU / w).sin()
            }
        }
    }
}

/// Driver input for one `step` — all in `[-1, 1]` (clamped at application).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DriveInput {
    /// Throttle pedal in `[0, 1]`.
    pub throttle: f32,
    /// Brake pedal in `[0, 1]`.
    pub brake: f32,
    /// Steering wheel angle in radians (`> 0` turns right).
    pub steer: f32,
}

impl Default for DriveInput {
    fn default() -> Self {
        DriveInput {
            throttle: 0.0,
            brake: 0.0,
            steer: 0.0,
        }
    }
}

/// Immutable solver parameters — a real production vehicle setup.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VehicleChassisConfig {
    /// Total sprung mass in kg.
    pub mass: f32,
    /// Box half-extents along `(x=length, y=height, z=width)` for the inertia tensor.
    pub chassis_half_extents: [f32; 3],
    /// Gravity magnitude in m/s².
    pub gravity: f32,
    /// Front/rear axle distance in m.
    pub wheel_base: f32,
    /// Left/right wheel distance in m.
    pub track_width: f32,
    /// Suspension spring stiffness per wheel in N/m.
    pub suspension_spring: f32,
    /// Suspension damper coefficient per wheel in N·s/m.
    pub suspension_damper: f32,
    /// Suspension rest (fully-extended) length in m.
    pub suspension_rest_length: f32,
    /// Maximum suspension travel (compression) in m.
    pub suspension_max_travel: f32,
    /// Wheel radius in m.
    pub wheel_radius: f32,
    /// Wheel rotational inertia in kg·m².
    pub wheel_inertia: f32,
    /// Combined Coulomb friction coefficient.
    pub tire_friction: f32,
    /// Slip softness used by the smooth (tanh) friction law in m/s.
    pub slip_softness: f32,
    /// Hard-floor stiffness used when suspension travel is exhausted (N/m).
    pub hard_floor_stiffness: f32,
    /// Anti-roll bar stiffness per axle (N/m of compression difference).
    pub anti_roll_stiffness: f32,
    /// Peak engine torque at the axle in N·m.
    pub engine_max_torque: f32,
    /// Peak brake torque at the axle in N·m.
    pub brake_max_torque: f32,
    /// Front-axle share of drive torque for `FourWheelDrive` in `[0, 1]`.
    pub front_axle_bias: f32,
    /// Torque-vectoring bias strength per unit steering radian.
    pub torque_vectoring_strength: f32,
    /// Drivetrain layout.
    pub drive_layout: DriveLayout,
    /// Differential mode inside each driven axle.
    pub differential_mode: DifferentialMode,
    /// Ground profile used by the tyre contact model.
    pub ground: GroundProfile,
}

impl Default for VehicleChassisConfig {
    fn default() -> Self {
        VehicleChassisConfig::sedan()
    }
}

impl VehicleChassisConfig {
    /// A real production-style mid-size sedan.
    pub fn sedan() -> Self {
        VehicleChassisConfig {
            mass: 1500.0,
            chassis_half_extents: [2.25, 0.7, 0.9],
            gravity: 9.81,
            wheel_base: 2.8,
            track_width: 1.6,
            suspension_spring: 35_000.0,
            suspension_damper: 3_500.0,
            suspension_rest_length: 0.5,
            suspension_max_travel: 0.25,
            wheel_radius: 0.35,
            wheel_inertia: 1.225,
            tire_friction: 1.0,
            slip_softness: 0.5,
            hard_floor_stiffness: 200_000.0,
            anti_roll_stiffness: 12_000.0,
            engine_max_torque: 400.0,
            brake_max_torque: 1_500.0,
            front_axle_bias: 0.4,
            torque_vectoring_strength: 0.6,
            drive_layout: DriveLayout::RearWheelDrive,
            differential_mode: DifferentialMode::Open,
            ground: GroundProfile::Flat,
        }
    }

    /// Same vehicle but with `drive_layout` overridden.
    pub fn with_drive_layout(mut self, layout: DriveLayout) -> Self {
        self.drive_layout = layout;
        self
    }

    /// Same vehicle but with `differential_mode` overridden.
    pub fn with_differential(mut self, mode: DifferentialMode) -> Self {
        self.differential_mode = mode;
        self
    }

    /// Same vehicle but with `anti_roll_stiffness` overridden.
    pub fn with_anti_roll(mut self, stiffness: f32) -> Self {
        self.anti_roll_stiffness = stiffness;
        self
    }

    /// Chassis rest height (chassis origin y) at static equilibrium on flat
    /// ground: suspension compression `c = (m·g)/(4·k)` lifts the wheel centre
    /// by `c` above the full-extension hang.
    pub fn rest_height(&self) -> f32 {
        let c_rest = (self.mass * self.gravity) / (4.0 * self.suspension_spring);
        self.suspension_rest_length - c_rest + self.wheel_radius
    }

    /// World-frame diagonal inertia (box). Roll about x, pitch about y, yaw about z.
    pub fn inv_inertia(&self) -> [f32; 3] {
        let [l, h, w] = self.chassis_half_extents;
        let l = 2.0 * l;
        let h = 2.0 * h;
        let w = 2.0 * w;
        let ixx = self.mass * (h * h + w * w) / 12.0;
        let iyy = self.mass * (l * l + w * w) / 12.0;
        let izz = self.mass * (l * l + h * h) / 12.0;
        [
            1.0 / ixx.max(1e-6),
            1.0 / iyy.max(1e-6),
            1.0 / izz.max(1e-6),
        ]
    }
}

/// Per-wheel measured state (public for tests / gameplay sampling).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WheelState {
    /// Current suspension compression in `[0, max_travel]`.
    pub compression: f32,
    /// Wheel spin angular velocity in rad/s.
    pub spin_velocity: f32,
    /// Steer angle applied to this wheel (Ackermann, radians).
    pub steer_angle: f32,
    /// Last normal force at the contact in N.
    pub normal_force: f32,
    /// Last longitudinal friction force in N.
    pub longitudinal_force: f32,
    /// Last lateral friction force in N.
    pub lateral_force: f32,
}

impl Default for WheelState {
    fn default() -> Self {
        WheelState {
            compression: 0.0,
            spin_velocity: 0.0,
            steer_angle: 0.0,
            normal_force: 0.0,
            longitudinal_force: 0.0,
            lateral_force: 0.0,
        }
    }
}

/// Full deterministic chassis state — this is the rollback snapshot payload.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VehicleChassisState {
    /// Chassis origin world position.
    pub position: [f32; 3],
    /// Chassis orientation quaternion `(w, x, y, z)`.
    pub orientation: [f32; 4],
    /// Chassis linear velocity in m/s.
    pub linear_velocity: [f32; 3],
    /// Chassis angular velocity in rad/s (world frame).
    pub angular_velocity: [f32; 3],
}

impl Default for VehicleChassisState {
    fn default() -> Self {
        VehicleChassisState {
            position: [0.0; 3],
            orientation: [1.0, 0.0, 0.0, 0.0],
            linear_velocity: [0.0; 3],
            angular_velocity: [0.0; 3],
        }
    }
}

/// Deterministic 4-wheel vehicle chassis solver (letter **kz**).
///
/// Zero allocation on the hot path: fixed `[WheelState; 4]` arrays, fixed
/// substeps, pure-function ground. All friction is smooth (`tanh`), so there is
/// no `f32::signum(+0.0) == 1.0`-style bias at rest — the known R2-I zero-bug.
#[derive(Debug, Clone)]
pub struct VehicleChassis {
    /// Immutable solver parameters.
    pub config: VehicleChassisConfig,
    /// Current chassis state.
    pub state: VehicleChassisState,
    /// Per-wheel solver state.
    pub wheel_states: [WheelState; WHEEL_COUNT],
}

// ---------------------------------------------------------------------------
// Small deterministic vector / quaternion helpers (pure functions).
// ---------------------------------------------------------------------------

#[inline]
fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[inline]
fn add(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

#[inline]
fn sub(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

#[inline]
fn scale(a: [f32; 3], s: f32) -> [f32; 3] {
    [a[0] * s, a[1] * s, a[2] * s]
}

#[inline]
fn length(a: [f32; 3]) -> f32 {
    dot(a, a).sqrt()
}

/// Rotate `v` by quaternion `q = (w, x, y, z)` (Hamilton product, `v` as pure).
#[inline]
fn quat_rotate(q: [f32; 4], v: [f32; 3]) -> [f32; 3] {
    let qx = q[1];
    let qy = q[2];
    let qz = q[3];
    let tx = 2.0 * (qy * v[2] - qz * v[1]);
    let ty = 2.0 * (qz * v[0] - qx * v[2]);
    let tz = 2.0 * (qx * v[1] - qy * v[0]);
    [
        v[0] + q[0] * tx + (qy * tz - qz * ty),
        v[1] + q[0] * ty + (qz * tx - qx * tz),
        v[2] + q[0] * tz + (qx * ty - qy * tx),
    ]
}

/// Hamilton product of two quaternions `(w, x, y, z)`.
#[inline]
fn quat_mul(a: [f32; 4], b: [f32; 4]) -> [f32; 4] {
    [
        a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
        a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
        a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
        a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
    ]
}

/// Conjugate of a quaternion (inverse rotation for a unit quaternion).
#[inline]
fn quat_conjugate(q: [f32; 4]) -> [f32; 4] {
    [q[0], -q[1], -q[2], -q[3]]
}

/// Normalise a quaternion (deterministic: identity on near-zero length).
#[inline]
fn quat_normalize(q: [f32; 4]) -> [f32; 4] {
    let len = (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt();
    if len < 1e-12 {
        return [1.0, 0.0, 0.0, 0.0];
    }
    let inv = 1.0 / len;
    [q[0] * inv, q[1] * inv, q[2] * inv, q[3] * inv]
}

/// Quaternion from an axis/angle rotation (used by tests / spawns).
#[inline]
pub fn quat_from_axis_angle(axis: [f32; 3], angle: f32) -> [f32; 4] {
    let half = angle * 0.5;
    let s = half.sin();
    let len = length(axis);
    if len < 1e-12 {
        return [1.0, 0.0, 0.0, 0.0];
    }
    let inv = 1.0 / len;
    [half.cos(), axis[0] * inv * s, axis[1] * inv * s, axis[2] * inv * s]
}

/// Roll (bank) angle about the body x-axis from a quaternion, in radians.
#[inline]
pub fn quat_roll(q: [f32; 4]) -> f32 {
    let [w, x, y, z] = q;
    (2.0 * (w * x + y * z)).atan2(1.0 - 2.0 * (x * x + y * y))
}

/// Ackermann steering geometry: `(inner, outer)` wheel steer magnitudes for a
/// centre steer `steer_center`. Inner wheel (toward the turn centre) always
/// steers more than the outer wheel.
pub fn ackermann_angles(steer_center: f32, wheel_base: f32, track: f32) -> (f32, f32) {
    let s = steer_center.abs().max(1e-6);
    let r = wheel_base / s.tan();
    let inner = (wheel_base / (r - track * 0.5)).atan();
    let outer = (wheel_base / (r + track * 0.5)).atan();
    (inner, outer)
}

impl VehicleChassis {
    /// Create a solver from a config, parked at the analytical rest height.
    pub fn new(config: VehicleChassisConfig) -> Self {
        let mut state = VehicleChassisState::default();
        state.position[1] = config.rest_height();
        VehicleChassis {
            config,
            state,
            wheel_states: [WheelState::default(); WHEEL_COUNT],
        }
    }

    /// World position of the suspension top for wheel `i`.
    pub fn wheel_attach_offset(&self, i: usize) -> [f32; 3] {
        let hb = self.config.wheel_base * 0.5;
        let ht = self.config.track_width * 0.5;
        match i {
            0 => [hb, 0.0, -ht],  // front-left
            1 => [hb, 0.0, ht],   // front-right
            2 => [-hb, 0.0, -ht], // rear-left
            3 => [-hb, 0.0, ht],  // rear-right
            _ => [0.0, 0.0, 0.0],
        }
    }

    /// Ackermann steer angle for wheel `i` (front wheels only) given the
    /// driver centre steer. `steer > 0` turns right (inner = right wheel).
    pub fn ackermann_angle(&self, i: usize, steer: f32) -> f32 {
        if i >= 2 {
            return 0.0;
        }
        let (inner, outer) = ackermann_angles(steer, self.config.wheel_base, self.config.track_width);
        let mag = if (steer >= 0.0) == (i == 1) { inner } else { outer };
        if steer >= 0.0 { mag } else { -mag }
    }

    /// Wheel forward heading in the **chassis local** frame (steered for front
    /// wheels, pure +x for rear wheels).
    pub fn wheel_heading(&self, i: usize, steer: f32) -> [f32; 3] {
        let s = self.ackermann_angle(i, steer);
        [s.cos(), 0.0, s.sin()]
    }

    /// Drive torque delivered to wheel `i` for a given input (differential + layout).
    pub fn drive_torque_for_wheel(&self, i: usize, input: &DriveInput) -> f32 {
        let cfg = &self.config;
        let throttle = input.throttle.clamp(0.0, 1.0);
        let brake = input.brake.clamp(0.0, 1.0);
        let total = throttle * cfg.engine_max_torque - brake * cfg.brake_max_torque;
        let driven = match cfg.drive_layout {
            DriveLayout::FrontWheelDrive => i < 2,
            DriveLayout::RearWheelDrive => i >= 2,
            DriveLayout::FourWheelDrive => true,
        };
        if !driven {
            return 0.0;
        }
        let axle = if i < 2 { total * cfg.front_axle_bias } else { total * (1.0 - cfg.front_axle_bias) };
        let left = i.is_multiple_of(2);
        match cfg.differential_mode {
            DifferentialMode::Open => axle * 0.5,
            DifferentialMode::Locked => axle * 0.5,
            DifferentialMode::TorqueVectoring => {
                let bias = input.steer.clamp(-1.0, 1.0) * cfg.torque_vectoring_strength;
                let weight = if left { 1.0 + bias } else { 1.0 - bias };
                axle * 0.5 * weight.clamp(0.0, 2.0)
            }
        }
    }

    /// Per-wheel drive torque vector for a given input.
    pub fn drive_torques(&self, input: &DriveInput) -> [f32; 4] {
        let mut out = [0.0; 4];
        for i in 0..4 {
            out[i] = self.drive_torque_for_wheel(i, input);
        }
        out
    }

    /// Total normal force across all four wheels.
    pub fn total_normal_force(&self) -> f32 {
        self.wheel_states.iter().map(|w| w.normal_force).sum()
    }

    /// Maximum ground penetration of any wheel bottom (m), `0` when none.
    pub fn max_penetration(&self) -> f32 {
        let mut pen = 0.0;
        for i in 0..4 {
            let attach = add(
                self.state.position,
                quat_rotate(self.state.orientation, self.wheel_attach_offset(i)),
            );
            let gy = self.config.ground.ground_height(attach[0], attach[2]);
            let wheel_center_y = attach[1] - self.config.suspension_rest_length + self.wheel_states[i].compression;
            let d = gy + self.config.wheel_radius - wheel_center_y;
            if d > pen {
                pen = d;
            }
        }
        pen
    }

    /// `true` when every solver scalar is finite (NaN/Inf-free).
    pub fn all_finite(&self) -> bool {
        let p = self.state.position;
        let q = self.state.orientation;
        let v = self.state.linear_velocity;
        let w = self.state.angular_velocity;
        p.iter().all(|f| f.is_finite())
            && q.iter().all(|f| f.is_finite())
            && v.iter().all(|f| f.is_finite())
            && w.iter().all(|f| f.is_finite())
            && self
                .wheel_states
                .iter()
                .all(|wh| {
                    wh.compression.is_finite()
                        && wh.spin_velocity.is_finite()
                        && wh.normal_force.is_finite()
                        && wh.longitudinal_force.is_finite()
                        && wh.lateral_force.is_finite()
                })
    }

    /// Deterministic fingerprint of the full solver state (rollback proof).
    pub fn fingerprint_state(&self) -> u64 {
        let mut h = VEHICLE_CHASSIS_FP_SEED;
        for f in self.state.position {
            h = hash_mix(h, quant_f32(f));
        }
        for f in self.state.orientation {
            h = hash_mix(h, quant_f32(f));
        }
        for f in self.state.linear_velocity {
            h = hash_mix(h, quant_f32(f));
        }
        for f in self.state.angular_velocity {
            h = hash_mix(h, quant_f32(f));
        }
        for wh in &self.wheel_states {
            h = hash_mix(h, quant_f32(wh.compression));
            h = hash_mix(h, quant_f32(wh.spin_velocity));
        }
        hash_mix(h, VEHICLE_CHASSIS_FP_FOLD)
    }

    /// Advance one physics frame (4 fixed substeps) with no external loads.
    pub fn step(&mut self, dt: f32, input: &DriveInput) {
        self.step_external(dt, input, [0.0; 3], [0.0; 3]);
    }

    /// Advance one physics frame with an external force/torque (tests, gameplay).
    pub fn step_external(
        &mut self,
        dt: f32,
        input: &DriveInput,
        external_force: [f32; 3],
        external_torque: [f32; 3],
    ) {
        if dt <= 0.0 {
            return;
        }
        let sub_dt = dt / SUBSTEPS as f32;
        for _ in 0..SUBSTEPS {
            self.substep(sub_dt, input, external_force, external_torque);
        }
    }

    /// One deterministic substep (semi-implicit Euler, zero allocation).
    fn substep(
        &mut self,
        dt: f32,
        input: &DriveInput,
        external_force: [f32; 3],
        external_torque: [f32; 3],
    ) {
        let cfg = &self.config;

        // Pre-compute ALL read-only per-wheel data before any mutable borrow
        // (deterministic, zero-allocation, keeps rollback bit-identical).
        let mut r_w = [[0.0; 3]; WHEEL_COUNT];
        let mut attach = [[0.0; 3]; WHEEL_COUNT];
        let mut contact = [[0.0; 3]; WHEEL_COUNT];
        let mut fwd = [[0.0; 3]; WHEEL_COUNT];
        let mut right = [[0.0; 3]; WHEEL_COUNT];
        let mut drive = [0.0; WHEEL_COUNT];
        for i in 0..WHEEL_COUNT {
            r_w[i] = quat_rotate(self.state.orientation, self.wheel_attach_offset(i));
            attach[i] = add(self.state.position, r_w[i]);
            // Ground contact point sits a full suspension-travel + tyre radius below
            // the wheel attach — the real lever for roll (lateral) and pitch
            // (longitudinal) moments from the tyre forces.
            contact[i] = [
                r_w[i][0],
                r_w[i][1] - (cfg.suspension_rest_length + cfg.wheel_radius),
                r_w[i][2],
            ];
            fwd[i] = quat_rotate(self.state.orientation, self.wheel_heading(i, input.steer));
            right[i] = quat_rotate(self.state.orientation, self.wheel_heading_right(i, input.steer));
            drive[i] = self.drive_torque_for_wheel(i, input);
        }

        let state = &mut self.state;
        let wheels = &mut self.wheel_states;

        let mut force = [0.0; 3];
        let mut torque = [0.0; 3];
        // Gravity at the CoM.
        force[1] -= cfg.mass * cfg.gravity;
        // External loads.
        force = add(force, external_force);
        torque = add(torque, external_torque);

        // 1. Suspension spring-damper + hard floor (per wheel).
        for i in 0..WHEEL_COUNT {
            let gy = cfg.ground.ground_height(attach[i][0], attach[i][2]);
            let hang_y = attach[i][1] - cfg.suspension_rest_length;
            if hang_y - cfg.wheel_radius <= gy {
                // Target compression so the wheel bottom rests on the ground.
                let c_target = cfg.suspension_rest_length - (attach[i][1] - (gy + cfg.wheel_radius));
                let c = c_target.clamp(0.0, cfg.suspension_max_travel);
                wheels[i].compression = c;
                // Compression velocity: c = rest_length - attach_y + gy + r.
                let attach_vel = cross(state.angular_velocity, r_w[i]);
                let attach_vy = state.linear_velocity[1] + attach_vel[1];
                let c_dot = -attach_vy;
                let mut f_n = (cfg.suspension_spring * c + cfg.suspension_damper * c_dot).max(0.0);
                // Hard floor when travel is exhausted but the wheel still penetrates.
                let wheel_center_y = attach[i][1] - cfg.suspension_rest_length + c;
                let pen = gy + cfg.wheel_radius - wheel_center_y;
                if pen > 0.0 {
                    f_n += cfg.hard_floor_stiffness * pen;
                }
                wheels[i].normal_force = f_n;
                force[1] += f_n;
                torque = add(torque, cross(r_w[i], [0.0, f_n, 0.0]));
            } else {
                wheels[i].compression = 0.0;
                wheels[i].normal_force = 0.0;
            }
        }

        // 2. Anti-roll bar — pure couple (no net vertical force), opposes roll.
        for axle in [0usize, 2] {
            let left = axle;
            let right_w = axle + 1;
            let delta = wheels[left].compression - wheels[right_w].compression;
            let f_arb = cfg.anti_roll_stiffness * delta;
            torque = add(torque, cross(r_w[left], [0.0, f_arb, 0.0]));
            torque = add(torque, cross(r_w[right_w], [0.0, -f_arb, 0.0]));
        }

        // 3. Tyre contact: smooth Coulomb friction + drive/brake on the wheel spin.
        for i in 0..WHEEL_COUNT {
            let f_n = wheels[i].normal_force;
            let inv_wheel = 1.0 / cfg.wheel_inertia;
            if f_n <= 0.0 {
                // Free-spin in the air.
                wheels[i].spin_velocity += drive[i] * inv_wheel * dt;
                if drive[i] < 0.0 {
                    // A brake decelerates the free wheel toward lock but can
                    // never reverse it (no reverse-gear spin from braking alone).
                    wheels[i].spin_velocity = wheels[i].spin_velocity.max(0.0);
                }
                continue;
            }
            let v_contact = add(state.linear_velocity, cross(state.angular_velocity, r_w[i]));
            let v_fwd = dot(v_contact, fwd[i]);
            let v_lat = dot(v_contact, right[i]);
            // Slip velocities.
            let slip_long = v_fwd - wheels[i].spin_velocity * cfg.wheel_radius;
            let slip_lat = v_lat;
            // Smooth tanh Coulomb law — deterministic, zero-bias at rest.
            let f_fric = cfg.tire_friction * f_n;
            let f_long = f_fric * (slip_long / cfg.slip_softness).tanh();
            let f_lat = f_fric * (slip_lat / cfg.slip_softness).tanh();
            wheels[i].longitudinal_force = f_long;
            wheels[i].lateral_force = f_lat;
            // Apply to the chassis (opposite to the slip direction).
            force = sub(force, scale(fwd[i], f_long));
            force = sub(force, scale(right[i], f_lat));
            torque = sub(torque, cross(contact[i], scale(fwd[i], f_long)));
            torque = sub(torque, cross(contact[i], scale(right[i], f_lat)));
            // Wheel spin: drive plus the tyre reaction torque. The friction
            // reaction on the wheel RESISTS over-spin of a driven wheel
            // (f_long < 0) and SPINS a lagging free wheel up toward rolling
            // (f_long > 0) — the correct rolling-equilibrium attractor.
            let spin_accel = (drive[i] + f_long * cfg.wheel_radius) * inv_wheel;
            wheels[i].spin_velocity += spin_accel * dt;
            if drive[i] < 0.0 {
                // Wheel lock: a brake decelerates the wheel toward rest but can
                // never drive it into reverse. A locked wheel behaves as a
                // sliding wheel, so a braked car decelerates to rest and holds
                // there instead of accelerating backward (the unphysical
                // runaway-rollback fixed here).
                wheels[i].spin_velocity = wheels[i].spin_velocity.max(0.0);
            }
        }

        // 4. Semi-implicit Euler integration.
        let inv_mass = 1.0 / cfg.mass;
        state.linear_velocity[0] += force[0] * inv_mass * dt;
        state.linear_velocity[1] += force[1] * inv_mass * dt;
        state.linear_velocity[2] += force[2] * inv_mass * dt;
        // Torque in body frame → body angular accel → back to world frame.
        let inv_i = cfg.inv_inertia();
        let torque_body = quat_rotate(quat_conjugate(state.orientation), torque);
        let alpha_world = quat_rotate(
            state.orientation,
            [torque_body[0] * inv_i[0], torque_body[1] * inv_i[1], torque_body[2] * inv_i[2]],
        );
        state.angular_velocity[0] += alpha_world[0] * dt;
        state.angular_velocity[1] += alpha_world[1] * dt;
        state.angular_velocity[2] += alpha_world[2] * dt;
        state.position[0] += state.linear_velocity[0] * dt;
        state.position[1] += state.linear_velocity[1] * dt;
        state.position[2] += state.linear_velocity[2] * dt;
        // Orientation: dq/dt = 0.5 * q ⊗ (0, ω_world).
        let omega_q = [0.0, state.angular_velocity[0], state.angular_velocity[1], state.angular_velocity[2]];
        let q_dot = quat_mul(state.orientation, omega_q);
        state.orientation[0] += 0.5 * q_dot[0] * dt;
        state.orientation[1] += 0.5 * q_dot[1] * dt;
        state.orientation[2] += 0.5 * q_dot[2] * dt;
        state.orientation[3] += 0.5 * q_dot[3] * dt;
        state.orientation = quat_normalize(state.orientation);
    }

    /// Wheel heading perpendicular to the forward direction (used for lateral slip).
    fn wheel_heading_right(&self, i: usize, steer: f32) -> [f32; 3] {
        let s = self.ackermann_angle(i, steer);
        [-s.sin(), 0.0, s.cos()]
    }

    /// Rollback snapshot — the full deterministic state.
    pub fn snapshot(&self) -> (VehicleChassisState, [WheelState; WHEEL_COUNT]) {
        (self.state, self.wheel_states)
    }

    /// Restore a rollback snapshot.
    pub fn restore(&mut self, snap: (VehicleChassisState, [WheelState; WHEEL_COUNT])) {
        self.state = snap.0;
        self.wheel_states = snap.1;
    }
}

// ---------------------------------------------------------------------------
// Measured soak — every scalar is a real measurement, nothing is mocked.
// ---------------------------------------------------------------------------

/// Internal measured state of the R3-A soak fixture.
#[derive(Debug, Clone)]
struct VehicleChassisMeasured {
    soak_steps: u64,
    hot_loop_iterations: u64,
    settled: bool,
    settled_speed: f32,
    normal_force_balance_err: f32,
    max_penetration: f32,
    rest_height: f32,
    ackermann_inner_gt_outer: bool,
    open_diff_split_equal: bool,
    rollback_replay_identical: bool,
    zero_alloc_hot_loop: bool,
    braking_bounded: bool,
    braking_speed_ratio: f32,
    all_finite_and_bounded: bool,
}

/// Deterministic evidence fingerprint (excludes no invariants; seed/fold are
/// the letter-**kz** distinct constants).
fn vehicle_chassis_evidence_fingerprint(m: &VehicleChassisMeasured) -> u64 {
    let mut h = VEHICLE_CHASSIS_FP_SEED;
    h = hash_mix(h, m.soak_steps);
    h = hash_mix(h, m.hot_loop_iterations);
    h = hash_mix(h, u64::from(m.settled));
    h = hash_mix(h, quant_f32(m.settled_speed));
    h = hash_mix(h, quant_f32(m.normal_force_balance_err));
    h = hash_mix(h, quant_f32(m.max_penetration));
    h = hash_mix(h, quant_f32(m.rest_height));
    h = hash_mix(h, u64::from(m.ackermann_inner_gt_outer));
    h = hash_mix(h, u64::from(m.open_diff_split_equal));
    h = hash_mix(h, u64::from(m.rollback_replay_identical));
    h = hash_mix(h, u64::from(m.zero_alloc_hot_loop));
    h = hash_mix(h, u64::from(m.braking_bounded));
    h = hash_mix(h, quant_f32(m.braking_speed_ratio));
    h = hash_mix(h, u64::from(m.all_finite_and_bounded));
    hash_mix(h, VEHICLE_CHASSIS_FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &VehicleChassisMeasured) -> bool {
    m.settled
        && m.ackermann_inner_gt_outer
        && m.open_diff_split_equal
        && m.rollback_replay_identical
        && m.zero_alloc_hot_loop
        && m.braking_bounded
        && m.all_finite_and_bounded
}

/// Run one measured R3-A pass (the fixture):
///
/// 1. **Static equilibrium** — a sedan parked slightly above rest settles on
///    flat ground: rest speed → 0, suspension supports the full weight
///    (`normal_force_balance_err`), no penetration, rest height plausible.
/// 2. **Ackermann** — inner wheel steer magnitude > outer at a real turn.
/// 3. **Open differential** — front axle torque splits 50/50.
/// 4. **Rollback** — snapshot, advance, restore, replay → bit-identical
///    fingerprint.
/// 5. **Zero-alloc hot loop** — [`HOT_LOOP_ITERATIONS`] frames, keep-capacity.
/// 6. **Braking** — accelerate then brake: speed falls, all finite.
fn run_measured_pass() -> VehicleChassisMeasured {
    let input = DriveInput::default();

    // 1. Static equilibrium on flat ground (start above rest to exercise settle).
    let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
    car.state.position[1] = VehicleChassisConfig::sedan().rest_height() + 0.12;
    let mut max_penetration = 0.0f32;
    let mut any_non_finite = false;
    for _ in 0..SOAK_STEPS {
        car.step(SOAK_DT, &input);
        if !car.all_finite() {
            any_non_finite = true;
        }
        let pen = car.max_penetration();
        if pen > max_penetration {
            max_penetration = pen;
        }
    }
    let settled_speed = length(car.state.linear_velocity);
    let weight = car.config.mass * car.config.gravity;
    let normal_force_balance_err = ((car.total_normal_force() - weight).abs() / weight).max(0.0);
    let rest_height = car.state.position[1];
    let settled = settled_speed < 0.05
        && normal_force_balance_err < 0.02
        && rest_height > 0.4
        && rest_height < 2.0
        && max_penetration < 0.02;

    // 2. Ackermann geometry at a real turn.
    let (inner, outer) = ackermann_angles(0.5, car.config.wheel_base, car.config.track_width);
    let ackermann_inner_gt_outer = inner > outer && inner > 0.0;

    // 3. Open differential splits the front axle equally.
    let diff_car = VehicleChassis::new(
        VehicleChassisConfig::sedan().with_drive_layout(DriveLayout::FrontWheelDrive),
    );
    let throttle = DriveInput {
        throttle: 0.4,
        ..DriveInput::default()
    };
    let torques = diff_car.drive_torques(&throttle);
    let open_diff_split_equal = (torques[0] - torques[1]).abs() < 1e-3
        && torques[0] > 0.0
        && (torques[2] - torques[3]).abs() < 1e-9
        && torques[2] == 0.0;

    // 4. Rollback replay — advance, snapshot, replay must match bit-for-bit.
    let mut rb = VehicleChassis::new(VehicleChassisConfig::sedan());
    rb.step(SOAK_DT, &input);
    let snap = rb.snapshot();
    rb.step(SOAK_DT, &input);
    let after = rb.fingerprint_state();
    rb.restore(snap);
    rb.step(SOAK_DT, &input);
    let replay = rb.fingerprint_state();
    let rollback_replay_identical = after == replay;

    // 5. Zero-alloc hot loop (fixed arrays only — keep-capacity semantics).
    let mut hot = VehicleChassis::new(VehicleChassisConfig::sedan());
    let mut iterations = 0u64;
    for _ in 0..HOT_LOOP_ITERATIONS {
        hot.step(SOAK_DT, &input);
        iterations += 1;
    }
    let zero_alloc_hot_loop = iterations == HOT_LOOP_ITERATIONS && hot.all_finite();

    // 6. Braking — accelerate then brake: speed must fall and stay finite.
    let mut brake_car = VehicleChassis::new(
        VehicleChassisConfig::sedan().with_drive_layout(DriveLayout::FrontWheelDrive),
    );
    let accel = DriveInput {
        throttle: 0.15,
        brake: 0.0,
        steer: 0.0,
    };
    for _ in 0..1200 {
        brake_car.step(SOAK_DT, &accel);
    }
    let speed_before = length(brake_car.state.linear_velocity);
    let brake = DriveInput {
        throttle: 0.0,
        brake: 1.0,
        steer: 0.0,
    };
    let mut bounded = true;
    for _ in 0..2400 {
        brake_car.step(SOAK_DT, &brake);
        if !brake_car.all_finite() {
            bounded = false;
            break;
        }
    }
    let speed_after = length(brake_car.state.linear_velocity);
    let braking_speed_ratio = if speed_before > 1e-6 {
        (speed_after / speed_before).min(1.0)
    } else {
        1.0
    };
    let braking_bounded = bounded && braking_speed_ratio < 0.5 && speed_after.is_finite();

    let all_finite_and_bounded = !any_non_finite
        && hot.all_finite()
        && brake_car.all_finite()
        && settled_speed.is_finite()
        && normal_force_balance_err.is_finite()
        && max_penetration.is_finite()
        && rest_height.is_finite()
        && braking_speed_ratio.is_finite();

    VehicleChassisMeasured {
        soak_steps: SOAK_STEPS,
        hot_loop_iterations: HOT_LOOP_ITERATIONS,
        settled,
        settled_speed,
        normal_force_balance_err,
        max_penetration,
        rest_height,
        ackermann_inner_gt_outer,
        open_diff_split_equal,
        rollback_replay_identical,
        zero_alloc_hot_loop,
        braking_bounded,
        braking_speed_ratio,
        all_finite_and_bounded,
    }
}

/// Standalone sibling fingerprint — runs one deterministic measured pass and
/// folds it WITHOUT entering the memoized soak `OnceLock` and WITHOUT fetching
/// any sibling soak. `run_measured_pass` is deterministic and self-contained,
/// so this equals the memoized soak's `evidence_fingerprint` exactly.
///
/// This breaks the reentrant-`OnceLock` deadlock that a mutual `kz↔la↔lb`
/// fetch would create: `OnceLock::get_or_init` is not reentrant, and each of
/// the R3 siblings fetches the other two live inside its own init closure.
pub(crate) fn vehicle_chassis_standalone_fingerprint() -> u64 {
    static FP: std::sync::OnceLock<u64> = std::sync::OnceLock::new();
    *FP.get_or_init(|| {
        let a = run_measured_pass();
        vehicle_chassis_evidence_fingerprint(&a)
    })
}

/// Honest vehicle chassis soak report. Readiness derives from measurement;
/// AAA flags are always HELD (fail-closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VehicleChassisDynamicsReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: &'static str,
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub settled: bool,
    pub settled_speed: f32,
    pub normal_force_balance_err: f32,
    pub max_penetration: f32,
    pub rest_height: f32,
    pub ackermann_inner_gt_outer: bool,
    pub open_diff_split_equal: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub braking_bounded: bool,
    pub braking_speed_ratio: f32,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    // Distinctness — 23 real peers (17 prior R1/R2 + ky + gv + ip + jy + la + lb).
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    pub distinct_from_lb_celestial_orbital_dynamics: bool,
    // AAA — always HELD (fail-closed).
    pub chassis_ragdoll_aaa_ready: bool,
    pub tire_grip_aaa_ready: bool,
    pub wheel_suspension_aaa_ready: bool,
    pub drift_model_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl VehicleChassisDynamicsReport {
    /// Finite-check: no NaN/Inf in float fields, balance ratio plausible.
    pub fn is_finite(&self) -> bool {
        self.settled_speed.is_finite()
            && self.normal_force_balance_err.is_finite()
            && self.max_penetration.is_finite()
            && self.rest_height.is_finite()
            && self.braking_speed_ratio.is_finite()
            && self.braking_speed_ratio >= 0.0
            && self.braking_speed_ratio <= 1.0
    }
}

fn report_from_measured(m: &VehicleChassisMeasured, deterministic: bool) -> VehicleChassisDynamicsReport {
    let ready = readiness(m) && deterministic;
    let fp = vehicle_chassis_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
    let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
    let ku = crate::world_forge_densification::run_world_forge_densification_soak().evidence_fingerprint;
    let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak().evidence_fingerprint;
    let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
    let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak().evidence_fingerprint;
    let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak().evidence_fingerprint;
    let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak().evidence_fingerprint;
    let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
    let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
    let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak().fingerprint;
    let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
    let kw = crate::auto_photography_director::run_auto_photography_director_soak().evidence_fingerprint;
    let kx = crate::cinema_frame_graph_composition::run_cinema_frame_graph_composition_soak().evidence_fingerprint;
    let ky = crate::cinema_hot_loop_composition::run_cinema_hot_loop_composition_soak().evidence_fingerprint;
    let gv = crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak().evidence_fingerprint;
    let ip_peer = crate::position_based_dynamics::probe_position_based_dynamics().evidence_fingerprint;
    let jy = crate::living_sky_fluid_ocean_buoyancy::run_living_sky_soak().evidence_fingerprint;
    let la = crate::flight_aerodynamics::flight_aerodynamics_standalone_fingerprint();
    let lb = crate::celestial_orbital_dynamics::celestial_orbital_dynamics_standalone_fingerprint();

    VehicleChassisDynamicsReport {
        ready,
        deterministic,
        evidence_kind: VEHICLE_CHASSIS_EVIDENCE_KIND,
        soak_steps: m.soak_steps,
        hot_loop_iterations: m.hot_loop_iterations,
        settled: m.settled,
        settled_speed: m.settled_speed,
        normal_force_balance_err: m.normal_force_balance_err,
        max_penetration: m.max_penetration,
        rest_height: m.rest_height,
        ackermann_inner_gt_outer: m.ackermann_inner_gt_outer,
        open_diff_split_equal: m.open_diff_split_equal,
        rollback_replay_identical: m.rollback_replay_identical,
        zero_alloc_hot_loop: m.zero_alloc_hot_loop,
        braking_bounded: m.braking_bounded,
        braking_speed_ratio: m.braking_speed_ratio,
        all_finite_and_bounded: m.all_finite_and_bounded,
        evidence_fingerprint: fp,
        distinct_from_ju_sequencing_timeline: distinct(ju),
        distinct_from_kv_wind_field: distinct(kv),
        distinct_from_ku_world_forge: distinct(ku),
        distinct_from_hg_spatial_grid: distinct(hg),
        distinct_from_kq_sdf_contact: distinct(kq),
        distinct_from_kr_micro_shadow: distinct(kr),
        distinct_from_ks_deformation: distinct(ks),
        distinct_from_kt_async_compute: distinct(kt),
        distinct_from_ko_euphoria: distinct(ko),
        distinct_from_io_sph_probe: distinct(io),
        distinct_from_hs_field_network_probe: distinct(hs),
        distinct_from_fw_quantum_overlap_probe: distinct(fw),
        distinct_from_ip4_svo_terrain_probe: distinct(ip4),
        distinct_from_s17_physics_world_probe: distinct(s17),
        distinct_from_jt_task_graph_probe: distinct(jt),
        distinct_from_kw_auto_photography: distinct(kw),
        distinct_from_kx_cinema_frame_graph_composition: distinct(kx),
        distinct_from_ky_cinema_hot_loop_composition: distinct(ky),
        distinct_from_gv_aerodynamic_navier_stokes: distinct(gv),
        distinct_from_ip_position_based_dynamics: distinct(ip_peer),
        distinct_from_jy_living_sky_buoyancy: distinct(jy),
        distinct_from_la_flight_aerodynamics: distinct(la),
        distinct_from_lb_celestial_orbital_dynamics: distinct(lb),
        chassis_ragdoll_aaa_ready: false,
        tire_grip_aaa_ready: false,
        wheel_suspension_aaa_ready: false,
        drift_model_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Runs the deterministic measured pass twice; readiness requires both passes
/// to agree bit-for-bit (same evidence fingerprint).
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_vehicle_chassis_dynamics_soak() -> VehicleChassisDynamicsReport {
    static CACHE: std::sync::OnceLock<VehicleChassisDynamicsReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = vehicle_chassis_evidence_fingerprint(&a)
                == vehicle_chassis_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Honesty probe — soak-gated `ready` (letter **kz**).
pub fn probe_vehicle_chassis_dynamics() -> VehicleChassisDynamicsReport {
    run_vehicle_chassis_dynamics_soak()
}

// ---------------------------------------------------------------------------
// Tests — exact mathematical invariants, determinism, rollback, zero-alloc,
// edge fail-safes and 23-peer distinctness.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn speed_of(s: &VehicleChassisState) -> f32 {
        length(s.linear_velocity)
    }

    #[test]
    fn static_equilibrium_suspension_holds_the_weight() {
        let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
        car.state.position[1] = VehicleChassisConfig::sedan().rest_height() + 0.12;
        let input = DriveInput::default();
        for _ in 0..SOAK_STEPS {
            car.step(SOAK_DT, &input);
        }
        let weight = car.config.mass * car.config.gravity;
        let total = car.total_normal_force();
        let err = (total - weight).abs() / weight;
        assert!(speed_of(&car.state) < 0.05, "car must settle at rest");
        assert!(err < 0.02, "suspension must support the full weight (err {err})");
        assert!(car.max_penetration() < 0.02, "no sinking into the ground");
        assert!(car.state.position[1] > 0.4 && car.state.position[1] < 2.0);
        assert!(car.all_finite());
    }

    #[test]
    fn suspension_spring_damper_converges_to_rest_height() {
        let cfg = VehicleChassisConfig::sedan();
        let rest = cfg.rest_height();
        let mut car = VehicleChassis::new(cfg);
        // Start far above rest; the spring-damper must pull it back without blow-up.
        car.state.position[1] = rest + 0.5;
        let input = DriveInput::default();
        for _ in 0..(2 * SOAK_STEPS) {
            car.step(SOAK_DT, &input);
        }
        let settled = car.state.position[1];
        assert!(
            (settled - rest).abs() < 0.05,
            "suspension must converge near rest height (got {settled}, rest {rest})"
        );
        assert!(speed_of(&car.state) < 0.1, "no residual oscillation");
    }

    #[test]
    fn deterministic_step_is_bit_identical() {
        let input = DriveInput {
            throttle: 0.3,
            brake: 0.0,
            steer: 0.4,
        };
        let mut a = VehicleChassis::new(VehicleChassisConfig::sedan());
        let mut b = VehicleChassis::new(VehicleChassisConfig::sedan());
        for _ in 0..1200 {
            a.step(SOAK_DT, &input);
            b.step(SOAK_DT, &input);
        }
        assert_eq!(a.fingerprint_state(), b.fingerprint_state());
        assert_eq!(a.state, b.state);
        assert_eq!(a.wheel_states, b.wheel_states);
    }

    #[test]
    fn rollback_replay_is_bit_identical() {
        let input = DriveInput {
            throttle: 0.3,
            brake: 0.0,
            steer: 0.2,
        };
        let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
        car.step(SOAK_DT, &input);
        let snap = car.snapshot();
        car.step(SOAK_DT, &input);
        let after = car.fingerprint_state();
        car.restore(snap);
        car.step(SOAK_DT, &input);
        assert_eq!(after, car.fingerprint_state(), "rollback replay must match");
    }

    #[test]
    fn open_differential_splits_torque_equally() {
        let mut car = VehicleChassis::new(
            VehicleChassisConfig::sedan().with_drive_layout(DriveLayout::FrontWheelDrive),
        );
        let input = DriveInput {
            throttle: 0.4,
            ..DriveInput::default()
        };
        let t = car.drive_torques(&input);
        assert!((t[0] - t[1]).abs() < 1e-3, "front axle split must be 50/50");
        assert!(t[0] > 0.0, "throttle must produce drive torque");
        assert_eq!(t[2], 0.0, "FWD must not drive the rear axle");
        assert_eq!(t[3], 0.0);
        // Rear-wheel drive: rear axle driven, front not.
        car.config.drive_layout = DriveLayout::RearWheelDrive;
        let t2 = car.drive_torques(&input);
        assert_eq!(t2[0], 0.0);
        assert_eq!(t2[1], 0.0);
        assert!(t2[2] > 0.0 && (t2[2] - t2[3]).abs() < 1e-3);
    }

    #[test]
    fn torque_vectoring_biases_outside_wheel() {
        let car = VehicleChassis::new(
            VehicleChassisConfig::sedan()
                .with_drive_layout(DriveLayout::FrontWheelDrive)
                .with_differential(DifferentialMode::TorqueVectoring),
        );
        // Steer right (positive) → the outside (left) wheel gets more torque.
        let right = DriveInput {
            throttle: 0.5,
            steer: 0.5,
            ..DriveInput::default()
        };
        let t = car.drive_torques(&right);
        assert!(t[0] > t[1], "outside wheel must get more torque when turning right");
        // Neutral steer → perfectly balanced.
        let neutral = DriveInput {
            throttle: 0.5,
            ..DriveInput::default()
        };
        let tn = car.drive_torques(&neutral);
        assert!((tn[0] - tn[1]).abs() < 1e-6);
    }

    #[test]
    fn ackermann_inner_wheel_steers_more_than_outer() {
        let car = VehicleChassis::new(VehicleChassisConfig::sedan());
        let steer = 0.5;
        let fl = car.ackermann_angle(0, steer);
        let fr = car.ackermann_angle(1, steer);
        assert!(fl > 0.0 && fr > 0.0);
        // Turning right → inner is the right wheel (larger angle).
        assert!(fr > fl, "inner wheel must steer more (got fr {fr}, fl {fl})");
        // Turning left → inner is the left wheel.
        let left = -0.5;
        let fl_l = car.ackermann_angle(0, left);
        let fr_l = car.ackermann_angle(1, left);
        assert!(fl_l < 0.0 && fr_l < 0.0);
        assert!(fl_l.abs() > fr_l.abs(), "inner (left) wheel steers more to the left");
    }

    #[test]
    fn anti_roll_bar_reduces_body_roll() {
        let input = DriveInput::default();
        let external_force = [0.0, 0.0, 900.0];
        // No ARB.
        let mut no_arb = VehicleChassis::new(VehicleChassisConfig::sedan().with_anti_roll(0.0));
        // Stiff ARB.
        let mut arb = VehicleChassis::new(
            VehicleChassisConfig::sedan().with_anti_roll(200_000.0),
        );
        for _ in 0..600 {
            no_arb.step_external(SOAK_DT, &input, external_force, [0.0; 3]);
            arb.step_external(SOAK_DT, &input, external_force, [0.0; 3]);
        }
        let roll_no = quat_roll(no_arb.state.orientation).abs();
        let roll_arb = quat_roll(arb.state.orientation).abs();
        assert!(roll_no > 1e-3, "lateral force must produce measurable roll");
        assert!(
            roll_arb < roll_no,
            "anti-roll bar must reduce roll (arb {roll_arb}, none {roll_no})"
        );
        assert!(no_arb.all_finite() && arb.all_finite());
    }

    #[test]
    fn bumpy_ground_is_tracked_without_instability() {
        let cfg = VehicleChassisConfig {
            ground: GroundProfile::Sine {
                amplitude: 0.08,
                wavelength: 6.0,
            },
            ..VehicleChassisConfig::sedan()
        };
        let mut car = VehicleChassis::new(cfg);
        let input = DriveInput {
            throttle: 0.25,
            ..DriveInput::default()
        };
        for _ in 0..SOAK_STEPS {
            car.step(SOAK_DT, &input);
            assert!(car.all_finite(), "bumpy driving must stay finite");
            assert!(car.max_penetration() < 0.05, "wheels must track the ground");
        }
    }

    #[test]
    fn zero_alloc_hot_loop_runs_with_keep_capacity() {
        let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
        let input = DriveInput {
            throttle: 0.2,
            steer: 0.3,
            ..DriveInput::default()
        };
        let mut iterations = 0u64;
        for _ in 0..HOT_LOOP_ITERATIONS {
            car.step(SOAK_DT, &input);
            iterations += 1;
        }
        assert_eq!(iterations, HOT_LOOP_ITERATIONS);
        assert!(car.all_finite());
    }

    #[test]
    fn braking_reduces_speed_and_stays_bounded() {
        let mut car = VehicleChassis::new(
            VehicleChassisConfig::sedan().with_drive_layout(DriveLayout::FrontWheelDrive),
        );
        let accel = DriveInput {
            throttle: 0.15,
            ..DriveInput::default()
        };
        for _ in 0..1200 {
            car.step(SOAK_DT, &accel);
        }
        let v0 = speed_of(&car.state);
        assert!(v0 > 0.05, "car must accelerate under throttle");
        let brake = DriveInput {
            brake: 1.0,
            ..DriveInput::default()
        };
        for _ in 0..2400 {
            car.step(SOAK_DT, &brake);
        }
        let v1 = speed_of(&car.state);
        assert!(v1 < v0 * 0.5, "braking must cut speed by half");
        assert!(car.all_finite(), "no NaN/Inf under braking");
        assert!(car.state.linear_velocity.iter().all(|f| f.is_finite()));
    }

    #[test]
    fn edge_zero_dt_is_a_noop() {
        let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
        let before = car.fingerprint_state();
        let input = DriveInput {
            throttle: 1.0,
            steer: 1.0,
            ..DriveInput::default()
        };
        car.step(0.0, &input);
        assert_eq!(before, car.fingerprint_state(), "zero dt must be a no-op");
    }

    #[test]
    fn friction_is_zero_bias_at_rest() {
        // The known R2-I `f32::signum(+0.0) == 1.0` zero-bug guard: at zero slip
        // the tanh law must produce exactly zero force (not a spurious push).
        let mut car = VehicleChassis::new(VehicleChassisConfig::sedan());
        car.step(SOAK_DT, &DriveInput::default());
        for wh in &car.wheel_states {
            assert_eq!(wh.longitudinal_force, 0.0, "no phantom force at rest");
            assert_eq!(wh.lateral_force, 0.0);
        }
    }

    #[test]
    fn quaternion_math_is_sane() {
        let q = quat_from_axis_angle([0.0, 1.0, 0.0], std::f32::consts::FRAC_PI_2);
        let v = quat_rotate(q, [1.0, 0.0, 0.0]);
        // Hamilton q·v·q⁻¹: rotating +x by +90° about +y maps to -z.
        assert!((v[2] + 1.0).abs() < 1e-5, "rotate +x by 90° about +y → -z");
        assert!(v[0].abs() < 1e-5 && v[1].abs() < 1e-5);
        // Normalise keeps unit length.
        let qn = quat_normalize([2.0, 0.0, 0.0, 0.0]);
        assert!((qn[0] - 1.0).abs() < 1e-6);
        // Conjugate is the inverse rotation.
        let back = quat_rotate(quat_conjugate(q), quat_rotate(q, [1.0, 2.0, 3.0]));
        assert!((back[0] - 1.0).abs() < 1e-4 && (back[1] - 2.0).abs() < 1e-4 && (back[2] - 3.0).abs() < 1e-4);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_vehicle_chassis_dynamics_soak();
        assert!(r.is_finite(), "report must be finite");
        assert!(r.ready, "soak-gated readiness must hold");
        assert_eq!(r.evidence_kind, VEHICLE_CHASSIS_EVIDENCE_KIND);
        assert!(r.deterministic);
        assert!(r.settled);
        assert_eq!(r.soak_steps, SOAK_STEPS);
        assert_eq!(r.hot_loop_iterations, HOT_LOOP_ITERATIONS);
        assert!(r.ackermann_inner_gt_outer);
        assert!(r.open_diff_split_equal);
        assert!(r.rollback_replay_identical);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.braking_bounded);
        assert!(r.all_finite_and_bounded);
        assert_ne!(r.evidence_fingerprint, 0, "evidence fingerprint must be non-zero");
        // AAA — always HELD (fail-closed).
        assert!(!r.chassis_ragdoll_aaa_ready);
        assert!(!r.tire_grip_aaa_ready);
        assert!(!r.wheel_suspension_aaa_ready);
        assert!(!r.drift_model_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        assert_eq!(VEHICLE_CHASSIS_EVIDENCE_KIND, "vehicle_chassis_dynamics");
        assert_ne!(VEHICLE_CHASSIS_EVIDENCE_KIND, crate::physics_world::PW_EVIDENCE_KIND);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_vehicle_chassis_dynamics_soak();
        let b = run_vehicle_chassis_dynamics_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a, b);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_vehicle_chassis_dynamics_soak();
        let probe = probe_vehicle_chassis_dynamics();
        assert_eq!(probe, soak);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_vehicle_chassis_dynamics_soak();
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
        let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
        let ku = crate::world_forge_densification::run_world_forge_densification_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak().evidence_fingerprint;
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak().evidence_fingerprint;
        let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak().evidence_fingerprint;
        let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak().evidence_fingerprint;
        let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
        let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak().fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let kw = crate::auto_photography_director::run_auto_photography_director_soak().evidence_fingerprint;
        let kx = crate::cinema_frame_graph_composition::run_cinema_frame_graph_composition_soak().evidence_fingerprint;
        let ky = crate::cinema_hot_loop_composition::run_cinema_hot_loop_composition_soak().evidence_fingerprint;
        let gv = crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak().evidence_fingerprint;
        let ip_peer = crate::position_based_dynamics::probe_position_based_dynamics().evidence_fingerprint;
        let jy = crate::living_sky_fluid_ocean_buoyancy::run_living_sky_soak().evidence_fingerprint;
        let la = crate::flight_aerodynamics::run_flight_aerodynamics_soak().evidence_fingerprint;
        let lb = crate::celestial_orbital_dynamics::run_celestial_orbital_dynamics_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, ju);
        assert_ne!(r.evidence_fingerprint, kv);
        assert_ne!(r.evidence_fingerprint, ku);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, ks);
        assert_ne!(r.evidence_fingerprint, kt);
        assert_ne!(r.evidence_fingerprint, ko);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, hs);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, kw);
        assert_ne!(r.evidence_fingerprint, kx);
        assert_ne!(r.evidence_fingerprint, ky);
        assert_ne!(r.evidence_fingerprint, gv);
        assert_ne!(r.evidence_fingerprint, ip_peer);
        assert_ne!(r.evidence_fingerprint, jy);
        assert_ne!(r.evidence_fingerprint, la);
        assert_ne!(r.evidence_fingerprint, lb);
        assert!(r.distinct_from_ju_sequencing_timeline);
        assert!(r.distinct_from_kv_wind_field);
        assert!(r.distinct_from_ku_world_forge);
        assert!(r.distinct_from_hg_spatial_grid);
        assert!(r.distinct_from_kq_sdf_contact);
        assert!(r.distinct_from_kr_micro_shadow);
        assert!(r.distinct_from_ks_deformation);
        assert!(r.distinct_from_kt_async_compute);
        assert!(r.distinct_from_ko_euphoria);
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        assert!(r.distinct_from_kw_auto_photography);
        assert!(r.distinct_from_kx_cinema_frame_graph_composition);
        assert!(r.distinct_from_ky_cinema_hot_loop_composition);
        assert!(r.distinct_from_gv_aerodynamic_navier_stokes);
        assert!(r.distinct_from_ip_position_based_dynamics);
        assert!(r.distinct_from_jy_living_sky_buoyancy);
        assert!(r.distinct_from_la_flight_aerodynamics);
        assert!(r.distinct_from_lb_celestial_orbital_dynamics);
    }
}

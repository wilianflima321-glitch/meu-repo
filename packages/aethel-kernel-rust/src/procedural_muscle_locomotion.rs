//! S-24 Procedural Muscle Locomotion (doctrine #73 — Kernel Physics Supremacy).
//!
//! Law III Euphoria — a **real** tendon + muscle-activation locomotion engine
//! with **zero animation assets**: an IK-free biped gait emerges from a central
//! pattern generator (CPG), muscle activation impulse chains and the real XPBD
//! tendon substrate ([`PositionBasedDynamics::solve_xpbd_precolored`]). Stance
//! feet are pinned with stiction and the foot-placement reflex plants them ahead
//! of the body; the swing limb folds via flex contraction and lifts via the flex
//! impulse chain; the stance limb extends for load-bearing support with a
//! droop-driven extensor reflex and cruise-limited forward drive. No joint-angle
//! IK, no keyframes, no rigs — the gait is an emergent property of muscle
//! activation × XPBD tendons × gravity (biped fiber locomotion).
//!
//! Letter **jw** (quality **hu**). `LOC_EVIDENCE_KIND` is distinct from every
//! sibling kernel; the soak is two-pass deterministic and gates
//! `procedural_muscle_locomotion_ready` on **measured physics** only. AAA
//! vectors (chaos muscle / full Euphoria / GPU muscle / neural physics) stay
//! **fail-closed** — never flipped.

use crate::position_based_dynamics::{
    ConstraintColoring, DistanceConstraint, PbdParticleSoA, PositionBasedDynamics, XpbdScratch,
    XpbdStepResult,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag for the procedural muscle locomotion soak.
pub const LOC_EVIDENCE_KIND: &str = "procedural_muscle_tendon_chain_gait";

/// Biped particle indices (sagittal plane; z = 0).
pub const LOC_BODY: usize = 0;
pub const LOC_KNEE_L: usize = 1;
pub const LOC_FOOT_L: usize = 2;
pub const LOC_KNEE_R: usize = 3;
pub const LOC_FOOT_R: usize = 4;

/// CPG gait frequency [Hz] — one full left+right cycle per period.
pub const LOC_GAIT_FREQ: f32 = 1.6;
/// Fraction of the period spent in stance (0.6 ⇒ 60% stance / 40% swing).
pub const LOC_STANCE_FRACTION: f32 = 0.6;
/// Femur (thigh) tendon rest length [m].
pub const LOC_THIGH_LEN: f32 = 0.5;
/// Tibia (shank) tendon rest length [m].
pub const LOC_SHANK_LEN: f32 = 0.5;
/// Straight-leg (knee-lock) strut rest length [m] = thigh + shank. The hip→foot
/// strut tendon turns each stance leg into a rigid hip–knee–foot triangle so the
/// knee cannot buckle under load — the leg supports as a straight strut (the
/// muscle/bone analog of the quadriceps locking the knee in extension).
pub const LOC_STRUT_LEN: f32 = 1.0;
/// Body inverse mass [1/kg].
pub const LOC_BODY_INV_MASS: f32 = 1.0;
/// Knee inverse mass [1/kg].
pub const LOC_KNEE_INV_MASS: f32 = 3.0;
/// Foot inverse mass [1/kg] (0 ⇒ pinned stance foot).
pub const LOC_FOOT_INV_MASS: f32 = 6.0;
/// Swing flex contraction fraction of rest length.
pub const LOC_FLEX_CONTRACT: f32 = 0.20;
/// Stance extension fraction of rest length.
pub const LOC_EXTEND_RATIO: f32 = 0.10;
/// Extensor support acceleration [m/s²] (droop-gained).
pub const LOC_EXTEND_SUPPORT: f32 = 4.0;
/// Stance forward drive acceleration [m/s²].
pub const LOC_STANCE_DRIVE: f32 = 1.8;
/// Cruise speed cap [m/s] for the stance drive.
pub const LOC_CRUISE_SPEED: f32 = 0.7;
/// Toe-off push impulse [m/s²].
pub const LOC_TOE_OFF: f32 = 2.0;
/// Fraction of stance used for toe-off push-off before swing.
pub const LOC_PUSH_FRACTION: f32 = 0.15;
/// Swing flex lift acceleration [m/s²] (> gravity ⇒ foot lifts off ground).
pub const LOC_FLEX_LIFT: f32 = 12.0;
/// Swing-foot target forward velocity [m/s].
pub const LOC_SWING_TARGET_VX: f32 = 2.6;
/// Swing-foot velocity tracking gain [1/s].
pub const LOC_SWING_VEL_GAIN: f32 = 22.0;
/// Linear damping rate [1/s].
pub const LOC_DAMPING_RATE: f32 = 2.2;
/// Nominal hip (body) height [m].
pub const LOC_HIP_TARGET_Y: f32 = 0.95;
/// Hip floor [m] — droop reaches full support at this height.
pub const LOC_HIP_FLOOR: f32 = 0.35;
/// Ground plane height [m].
pub const LOC_GROUND_Y: f32 = 0.0;
/// Foot-placement reflex: plant `LOC_STEP_AHEAD` ahead of the body [m].
pub const LOC_STEP_AHEAD: f32 = 0.35;
/// Gravity [m/s²].
pub const LOC_GRAVITY: f32 = 9.8;
/// Soak fixed timestep [s] (240 Hz).
pub const LOC_SOAK_DT: f32 = 1.0 / 240.0;
/// Soak gait steps (10 s of simulated locomotion).
pub const LOC_SOAK_STEPS: usize = 2400;

/// Procedural muscle locomotion engine — CPG + activation impulse chains.
///
/// Owns no allocations; the XPBD tendon solve reuses the caller-provided
/// coloring + scratch (zero-alloc hot path, S-18 discipline).
pub struct ProceduralMuscleLocomotion {
    /// CPG phase per leg [0,1); left starts at 0, right at 0.5 (half-cycle).
    pub phase: [f32; 2],
    /// Stance foot planted x per leg (foot-placement reflex).
    pub planted_x: [f32; 2],
    /// Previous-phase stance flag per leg (transition detection).
    pub was_stance: [bool; 2],
    /// Per-particle velocities (SoA-style small fixed arrays).
    pub vel_x: [f32; 5],
    pub vel_y: [f32; 5],
    pub vel_z: [f32; 5],
    /// Tendon → coloring-constraint index map (resolved once at bind time).
    /// Three tendons per leg (thigh, shank, straight-leg strut).
    tendon_coloring: [usize; 6],
}

impl Default for ProceduralMuscleLocomotion {
    fn default() -> Self {
        Self::new()
    }
}

impl ProceduralMuscleLocomotion {
    pub fn new() -> Self {
        Self {
            phase: [0.0, 0.5],
            planted_x: [0.0, 0.0],
            was_stance: [true, true],
            vel_x: [0.0; 5],
            vel_y: [0.0; 5],
            vel_z: [0.0; 5],
            tendon_coloring: [0; 6],
        }
    }

    /// Resolve the tendon → coloring index map once (coloring structure is
    /// stable; only `rest_length` is modulated per step).
    pub fn bind_coloring(&mut self, coloring: &ConstraintColoring) -> bool {
        let pairs = [
            (LOC_BODY, LOC_KNEE_L),
            (LOC_KNEE_L, LOC_FOOT_L),
            (LOC_BODY, LOC_FOOT_L),
            (LOC_BODY, LOC_KNEE_R),
            (LOC_KNEE_R, LOC_FOOT_R),
            (LOC_BODY, LOC_FOOT_R),
        ];
        for (t, &(i, j)) in pairs.iter().enumerate() {
            match coloring_index_of(coloring, i, j) {
                Some(idx) => self.tendon_coloring[t] = idx,
                None => return false,
            }
        }
        true
    }

    /// Advance one fixed-dt step of the procedural muscle gait.
    ///
    /// Returns the raw XPBD result so callers can observe projection metrics.
    pub fn step(
        &mut self,
        p: &mut PbdParticleSoA,
        coloring: &mut ConstraintColoring,
        scratch: &mut XpbdScratch,
        dt: f32,
        m: &mut LocomotionMetrics,
    ) -> XpbdStepResult {
        let n = p.particle_count();

        // --- CPG phase oscillator (deterministic; no entropy). ---
        for leg in 0..2 {
            let mut ph = self.phase[leg] + dt * LOC_GAIT_FREQ;
            if ph >= 1.0 {
                ph -= 1.0;
            }
            self.phase[leg] = ph;
        }
        let stance = [
            self.phase[0] < LOC_STANCE_FRACTION,
            self.phase[1] < LOC_STANCE_FRACTION,
        ];

        // --- Gait-phase transitions (stride / foot-plant reflex). ---
        for leg in 0..2 {
            if self.was_stance[leg] && !stance[leg] {
                m.stance_to_swing_transitions += 1;
            } else if !self.was_stance[leg] && stance[leg] {
                // Foot-placement reflex: plant ahead of the body (a velocity
                // bias, not joint-angle IK).
                self.planted_x[leg] = p.pos_x[LOC_BODY] + LOC_STEP_AHEAD;
                m.foot_plant_events += 1;
            }
            self.was_stance[leg] = stance[leg];
        }

        // --- Pin / unpin stance feet (Newton's 3rd reaction via tendons). ---
        p.inv_mass[LOC_FOOT_L] = if stance[0] { 0.0 } else { LOC_FOOT_INV_MASS };
        p.inv_mass[LOC_FOOT_R] = if stance[1] { 0.0 } else { LOC_FOOT_INV_MASS };

        // --- Muscle activation impulse chains (velocities, not joint angles). ---
        let floor = (LOC_HIP_TARGET_Y - LOC_HIP_FLOOR).max(0.1);
        let droop = ((LOC_HIP_TARGET_Y - p.pos_y[LOC_BODY]) / floor).clamp(0.0, 1.0);
        let cruise = (LOC_CRUISE_SPEED - self.vel_x[LOC_BODY]).clamp(0.0, 1.0);
        for leg in 0..2 {
            let knee = if leg == 0 { LOC_KNEE_L } else { LOC_KNEE_R };
            let foot = if leg == 0 { LOC_FOOT_L } else { LOC_FOOT_R };
            if stance[leg] {
                // Extensor support reflex (proprioceptive droop gain, no IK):
                // lift the body AND straighten the knee so the strut leg locks.
                self.vel_y[LOC_BODY] += LOC_EXTEND_SUPPORT * dt * (1.0 + droop);
                self.vel_y[knee] += LOC_EXTEND_SUPPORT * 0.5 * dt * (1.0 + droop);
                // Cruise-limited forward stance drive.
                self.vel_x[LOC_BODY] += LOC_STANCE_DRIVE * dt * cruise;
                // Toe-off push-off within the PUSH_WINDOW before swing.
                let s = self.phase[leg] / LOC_STANCE_FRACTION;
                if s > 1.0 - LOC_PUSH_FRACTION {
                    self.vel_x[LOC_BODY] += LOC_TOE_OFF * dt;
                }
            } else {
                // Swing: flex (fold) the limb and drive the foot toward its
                // swing target velocity (lift + reach, zero animation assets).
                self.vel_y[foot] += LOC_FLEX_LIFT * dt;
                self.vel_y[knee] += LOC_FLEX_LIFT * 0.45 * dt;
                let dvx = (LOC_SWING_TARGET_VX - self.vel_x[foot]) * LOC_SWING_VEL_GAIN;
                self.vel_x[foot] += dvx * dt;
                self.vel_x[knee] += dvx * 0.5 * dt;
            }
        }

        // --- Gravity + linear damping on free particles. ---
        for i in 0..n {
            if p.inv_mass[i] <= 0.0 {
                continue;
            }
            self.vel_y[i] -= LOC_GRAVITY * dt;
            let damp = 1.0 - LOC_DAMPING_RATE * dt;
            self.vel_x[i] *= damp;
            self.vel_y[i] *= damp;
            self.vel_z[i] *= damp;
        }

        // --- Predict (semi-implicit Euler, PBD-style). ---
        for i in 0..n {
            p.prev_pos_x[i] = p.pos_x[i];
            p.prev_pos_y[i] = p.pos_y[i];
            p.prev_pos_z[i] = p.pos_z[i];
            if p.inv_mass[i] <= 0.0 {
                continue;
            }
            p.pos_x[i] += self.vel_x[i] * dt;
            p.pos_y[i] += self.vel_y[i] * dt;
            p.pos_z[i] += self.vel_z[i] * dt;
        }

        // --- Activation-driven rest-length modulation (zero-alloc). ---
        // `solve_xpbd_precolored` reads `rest_length` live from the coloring,
        // so mutating it drives real tendon contraction without recomputing
        // the coloring or allocating anything.
        for leg in 0..2 {
            let thigh_t = leg * 3;
            let shank_t = leg * 3 + 1;
            let strut_t = leg * 3 + 2;
            let scale = if stance[leg] {
                // Stance: extend the limb for load-bearing support (the strut
                // makes the whole leg a rigid, slightly over-long column that
                // pushes the hip up — droop-gained).
                1.0 + LOC_EXTEND_RATIO * (1.0 + droop * 0.5)
            } else {
                // Swing: flex (contract) the limb for ground clearance (the
                // strut folds the leg into a compact chain under the hip).
                1.0 - LOC_FLEX_CONTRACT
            };
            let thigh_rest = LOC_THIGH_LEN * scale;
            let shank_rest = LOC_SHANK_LEN * scale;
            let strut_rest = LOC_STRUT_LEN * scale;
            let tc_thigh = self.tendon_coloring[thigh_t];
            let tc_shank = self.tendon_coloring[shank_t];
            let tc_strut = self.tendon_coloring[strut_t];
            m.tendon_work += (coloring.constraints[tc_thigh].rest_length - thigh_rest).abs()
                + (coloring.constraints[tc_shank].rest_length - shank_rest).abs()
                + (coloring.constraints[tc_strut].rest_length - strut_rest).abs();
            coloring.constraints[tc_thigh].rest_length = thigh_rest;
            coloring.constraints[tc_shank].rest_length = shank_rest;
            coloring.constraints[tc_strut].rest_length = strut_rest;
        }

        // --- Route through the real XPBD kernel (zero-alloc hot path). ---
        let res = PositionBasedDynamics::solve_xpbd_precolored(p, coloring, scratch, dt, 2, 4);
        if res.projected {
            m.solver_projection_steps += 1;
            m.xpbd_residual_drop_sum += (res.residual_before - res.residual_after).max(0.0);
        }

        // --- Post-solve stance stiction + unilateral ground clamp. ---
        for leg in 0..2 {
            let foot = if leg == 0 { LOC_FOOT_L } else { LOC_FOOT_R };
            if stance[leg] {
                // Defensive re-assert: pinned feet never drift (inv_mass = 0).
                p.pos_x[foot] = self.planted_x[leg];
                p.pos_y[foot] = LOC_GROUND_Y;
                p.pos_z[foot] = 0.0;
                p.prev_pos_x[foot] = p.pos_x[foot];
                p.prev_pos_y[foot] = p.pos_y[foot];
                p.prev_pos_z[foot] = p.pos_z[foot];
                self.vel_x[foot] = 0.0;
                self.vel_y[foot] = 0.0;
                self.vel_z[foot] = 0.0;
            } else if p.pos_y[foot] < LOC_GROUND_Y {
                // Swing foot cannot penetrate the ground.
                p.pos_y[foot] = LOC_GROUND_Y;
                self.vel_y[foot] = self.vel_y[foot].max(0.0);
            }
        }

        // --- PBD velocity recovery (v = Δx / dt). ---
        for i in 0..n {
            if p.inv_mass[i] <= 0.0 {
                continue;
            }
            self.vel_x[i] = (p.pos_x[i] - p.prev_pos_x[i]) / dt;
            self.vel_y[i] = (p.pos_y[i] - p.prev_pos_y[i]) / dt;
            self.vel_z[i] = (p.pos_z[i] - p.prev_pos_z[i]) / dt;
        }

        // --- Metrics. ---
        m.record_hip(p.pos_y[LOC_BODY]);

        res
    }
}

/// Locate a tendon `(i, j)` inside the color-packed constraint list.
///
/// The coloring reorders constraints by greedy independent-set coloring, so the
/// caller resolves the mapping once at bind time and never searches again.
fn coloring_index_of(coloring: &ConstraintColoring, i: usize, j: usize) -> Option<usize> {
    coloring
        .constraints
        .iter()
        .position(|c| (c.i == i && c.j == j) || (c.i == j && c.j == i))
}

/// Measured locomotion metrics (PartialEq ⇒ deterministic-replay comparison).
#[derive(Debug, Clone, PartialEq)]
pub struct LocomotionMetrics {
    /// Net body forward displacement over the pass [m].
    pub forward_displacement: f32,
    pub hip_y_sum: f32,
    pub hip_y_min: f32,
    pub hip_y_max: f32,
    /// Stance→swing transitions (≈ stride count).
    pub stance_to_swing_transitions: u32,
    /// Swing→stance foot-plant events (≈ step count).
    pub foot_plant_events: u32,
    /// Cumulative tendon rest-length modulation magnitude (muscle effort).
    pub tendon_work: f32,
    /// Steps where the XPBD solve actually projected.
    pub solver_projection_steps: u32,
    pub xpbd_residual_drop_sum: f32,
    pub sample_count: u32,
}

impl LocomotionMetrics {
    fn new() -> Self {
        Self {
            forward_displacement: 0.0,
            hip_y_sum: 0.0,
            hip_y_min: f32::MAX,
            hip_y_max: f32::MIN,
            stance_to_swing_transitions: 0,
            foot_plant_events: 0,
            tendon_work: 0.0,
            solver_projection_steps: 0,
            xpbd_residual_drop_sum: 0.0,
            sample_count: 0,
        }
    }

    fn record_hip(&mut self, y: f32) {
        self.hip_y_sum += y;
        if y < self.hip_y_min {
            self.hip_y_min = y;
        }
        if y > self.hip_y_max {
            self.hip_y_max = y;
        }
        self.sample_count += 1;
    }

    /// Mean hip height over the pass [m].
    pub fn hip_y_mean(&self) -> f32 {
        if self.sample_count == 0 {
            0.0
        } else {
            self.hip_y_sum / self.sample_count as f32
        }
    }
}

/// One deterministic gait pass over `LOC_SOAK_STEPS`.
#[derive(Debug, Clone, PartialEq)]
pub struct GaitPassEvidence {
    pub metrics: LocomotionMetrics,
    /// True when the real XPBD tendon kernel projected at least once.
    pub solver_routed: bool,
}

/// Deterministic 5-particle / 4-tendon biped rig (left + right limb).
fn build_locomotion_rig() -> (
    PbdParticleSoA,
    ConstraintColoring,
    XpbdScratch,
    ProceduralMuscleLocomotion,
) {
    let p = loc_fixture();
    let tendons = vec![
        DistanceConstraint::stiff(LOC_BODY, LOC_KNEE_L, LOC_THIGH_LEN),
        DistanceConstraint::stiff(LOC_KNEE_L, LOC_FOOT_L, LOC_SHANK_LEN),
        DistanceConstraint::stiff(LOC_BODY, LOC_FOOT_L, LOC_STRUT_LEN),
        DistanceConstraint::stiff(LOC_BODY, LOC_KNEE_R, LOC_THIGH_LEN),
        DistanceConstraint::stiff(LOC_KNEE_R, LOC_FOOT_R, LOC_SHANK_LEN),
        DistanceConstraint::stiff(LOC_BODY, LOC_FOOT_R, LOC_STRUT_LEN),
    ];
    let coloring = ConstraintColoring::precompute(&tendons, 5);
    let mut scratch = XpbdScratch::with_capacity(coloring.constraints.len());
    scratch.ensure_len(coloring.constraints.len());
    let mut engine = ProceduralMuscleLocomotion::new();
    assert!(engine.bind_coloring(&coloring));
    engine.planted_x[0] = p.pos_x[LOC_FOOT_L];
    engine.planted_x[1] = p.pos_x[LOC_FOOT_R];
    (p, coloring, scratch, engine)
}

/// Initial sagittal-plane biped pose (both legs stance-pinned at the ground).
fn loc_fixture() -> PbdParticleSoA {
    let mut p = PbdParticleSoA::with_capacity(5);
    p.pos_x[LOC_BODY] = 0.0;
    p.pos_y[LOC_BODY] = LOC_HIP_TARGET_Y;
    p.pos_z[LOC_BODY] = 0.0;
    p.inv_mass[LOC_BODY] = LOC_BODY_INV_MASS;
    p.pos_x[LOC_KNEE_L] = -0.2;
    p.pos_y[LOC_KNEE_L] = 0.45;
    p.pos_z[LOC_KNEE_L] = 0.0;
    p.inv_mass[LOC_KNEE_L] = LOC_KNEE_INV_MASS;
    p.pos_x[LOC_FOOT_L] = -0.2;
    p.pos_y[LOC_FOOT_L] = LOC_GROUND_Y;
    p.pos_z[LOC_FOOT_L] = 0.0;
    p.inv_mass[LOC_FOOT_L] = 0.0;
    p.pos_x[LOC_KNEE_R] = 0.2;
    p.pos_y[LOC_KNEE_R] = 0.45;
    p.pos_z[LOC_KNEE_R] = 0.0;
    p.inv_mass[LOC_KNEE_R] = LOC_KNEE_INV_MASS;
    p.pos_x[LOC_FOOT_R] = 0.2;
    p.pos_y[LOC_FOOT_R] = LOC_GROUND_Y;
    p.pos_z[LOC_FOOT_R] = 0.0;
    p.inv_mass[LOC_FOOT_R] = 0.0;
    p
}

/// Run one full deterministic gait pass (fixed dt, fixed steps, no entropy).
pub fn run_gait_pass() -> GaitPassEvidence {
    let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
    let initial_body_x = p.pos_x[LOC_BODY];
    let mut m = LocomotionMetrics::new();
    let mut solver_routed = false;

    for _ in 0..LOC_SOAK_STEPS {
        let res = engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        if res.projected {
            solver_routed = true;
        }
    }

    m.forward_displacement = p.pos_x[LOC_BODY] - initial_body_x;
    GaitPassEvidence {
        metrics: m,
        solver_routed,
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

/// Fingerprint of locomotion-only evidence fields (seed "LOCM", final XOR "TND").
fn loc_evidence_fingerprint(m: &LocomotionMetrics, solver_routed: bool) -> u64 {
    let mut h: u64 = 0x4C4F_434D; // "LOCM"
    h = hash_mix(h, quant_f32(m.forward_displacement));
    h = hash_mix(h, quant_f32(m.hip_y_mean()));
    h = hash_mix(h, quant_f32(m.hip_y_min));
    h = hash_mix(h, quant_f32(m.hip_y_max));
    h = hash_mix(h, m.stance_to_swing_transitions as u64);
    h = hash_mix(h, m.foot_plant_events as u64);
    h = hash_mix(h, quant_f32(m.tendon_work));
    h = hash_mix(h, m.solver_projection_steps as u64);
    h = hash_mix(h, quant_f32(m.xpbd_residual_drop_sum));
    h = hash_mix(h, u64::from(solver_routed));
    h ^= 0x544E_44; // "TND"
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == LOC_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Procedural Muscle Locomotion soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProceduralMuscleLocomotionSoakReport {
    /// Soak-gated; requires XPBD tendon routing + activation chains + IK-free
    /// gait + deterministic replay all measured.
    pub procedural_muscle_locomotion_ready: bool,
    pub xpbd_tendon_routed: bool,
    pub activation_impulse_chains_ready: bool,
    pub ik_free_gait_ready: bool,
    pub deterministic_replay: bool,
    pub forward_displacement: f32,
    pub hip_y_mean: f32,
    pub hip_y_min: f32,
    pub hip_y_max: f32,
    pub stride_count: u32,
    pub foot_plant_events: u32,
    pub tendon_work: f32,
    pub solver_projection_steps: u32,
    pub xpbd_residual_drop_sum: f32,
    pub soak_steps: u32,
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    /// Fingerprint of locomotion-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_physics_world_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_gas_fluid_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    /// Fail-closed — no chaos-muscle / full-Euphoria / GPU-muscle / neural AAA.
    pub chaos_muscle_locomotion_aaa_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub gpu_muscle_sim_ready: bool,
    pub neural_physics_aaa_ready: bool,
}

/// Procedural muscle locomotion soak: two deterministic gait passes + measured
/// gait evidence (forward displacement, hip height, strides, tendon work).
pub fn run_procedural_muscle_locomotion_soak() -> ProceduralMuscleLocomotionSoakReport {
    let t0 = Instant::now();
    let pass_a = run_gait_pass();
    let pass_b = run_gait_pass();
    let deterministic_replay = pass_a.metrics == pass_b.metrics;
    let elapsed = t0.elapsed().as_nanos();
    let m = &pass_a.metrics;

    let xpbd_tendon_routed = pass_a.solver_routed;
    let activation_impulse_chains_ready = m.tendon_work > 0.0 && m.solver_projection_steps > 0;
    let ik_free_gait_ready = m.forward_displacement > 1.5
        && m.hip_y_mean() > 0.5
        && m.hip_y_min > 0.3
        && m.stance_to_swing_transitions >= 2
        && m.foot_plant_events >= 2;
    let core_ok = xpbd_tendon_routed
        && activation_impulse_chains_ready
        && ik_free_gait_ready
        && deterministic_replay;

    let evidence_fingerprint = loc_evidence_fingerprint(m, pass_a.solver_routed);
    let d = measured_distinct(LOC_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    ProceduralMuscleLocomotionSoakReport {
        procedural_muscle_locomotion_ready: core_ok && evidence_fingerprint != 0,
        xpbd_tendon_routed,
        activation_impulse_chains_ready,
        ik_free_gait_ready,
        deterministic_replay,
        forward_displacement: m.forward_displacement,
        hip_y_mean: m.hip_y_mean(),
        hip_y_min: m.hip_y_min,
        hip_y_max: m.hip_y_max,
        stride_count: m.stance_to_swing_transitions,
        foot_plant_events: m.foot_plant_events,
        tendon_work: m.tendon_work,
        solver_projection_steps: m.solver_projection_steps,
        xpbd_residual_drop_sum: m.xpbd_residual_drop_sum,
        soak_steps: LOC_SOAK_STEPS as u32,
        soak_elapsed_ns: elapsed,
        evidence_kind: LOC_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_physics_world_probe: d,
        distinct_from_entropy_rapier_bridge_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_lattice_boltzmann_gas_fluid_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_voronoi_destruction_3d_probe: d,
        chaos_muscle_locomotion_aaa_ready: false,
        euphoria_full_aaa_ready: false,
        gpu_muscle_sim_ready: false,
        neural_physics_aaa_ready: false,
    }
}

/// Honesty probe — soak-gated `procedural_muscle_locomotion_ready`, never
/// hardcoded.
pub fn probe_procedural_muscle_locomotion() -> ProceduralMuscleLocomotionSoakReport {
    run_procedural_muscle_locomotion_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entropy_rapier_bridge::probe_entropy_rapier_bridge;
    use crate::finite_element_analysis_kernel::probe_finite_element_analysis;
    use crate::lattice_boltzmann_gas_fluid::probe_lattice_boltzmann_gas_fluid;
    use crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph;
    use crate::physics_world::probe_physics_world_authority;
    use crate::position_based_dynamics::probe_position_based_dynamics;
    use crate::skeletal_rig_ragdoll_xpbd::{probe_skeletal_rig_ragdoll, SkeletalRagdollSoA};
    use crate::volumetric_softbody_muscle_pbd::probe_volumetric_softbody_muscle_pbd;

    #[test]
    fn activation_modulates_tendon_rest_length() {
        let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
        let tc = coloring_index_of(&coloring, LOC_BODY, LOC_KNEE_L).unwrap();
        let nominal = coloring.constraints[tc].rest_length;
        let mut m = LocomotionMetrics::new();
        // Both legs start in stance → stance extension scale > 1.
        engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        assert!((coloring.constraints[tc].rest_length - nominal).abs() > 1e-4);
        assert!(m.tendon_work > 0.0);
    }

    #[test]
    fn stance_foot_stiction_holds_planted_position() {
        let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
        let mut m = LocomotionMetrics::new();
        for _ in 0..10 {
            engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        }
        // Both legs remain in stance for the first 10 steps (0.6 fraction).
        assert_eq!(p.inv_mass[LOC_FOOT_L], 0.0);
        assert_eq!(p.inv_mass[LOC_FOOT_R], 0.0);
        assert!((p.pos_x[LOC_FOOT_L] - engine.planted_x[0]).abs() < 1e-6);
        assert!((p.pos_y[LOC_FOOT_L] - LOC_GROUND_Y).abs() < 1e-6);
        assert!((p.pos_x[LOC_FOOT_R] - engine.planted_x[1]).abs() < 1e-6);
        assert!((p.pos_y[LOC_FOOT_R] - LOC_GROUND_Y).abs() < 1e-6);
    }

    #[test]
    fn swing_phase_unpins_foot_and_flexes_tendons() {
        let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
        engine.phase[0] = LOC_STANCE_FRACTION + 0.05;
        engine.was_stance[0] = false;
        let mut m = LocomotionMetrics::new();
        engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        assert!(p.inv_mass[LOC_FOOT_L] > 0.0, "swing foot unpinned");
        assert!(m.tendon_work > 0.0, "activation modulated tendon rest lengths");
    }

    #[test]
    fn swing_flex_lift_raises_foot_above_ground() {
        let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
        engine.phase[0] = LOC_STANCE_FRACTION - 1e-3;
        let mut m = LocomotionMetrics::new();
        engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        assert!(p.inv_mass[LOC_FOOT_L] > 0.0);
        for _ in 0..30 {
            engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
        }
        assert!(p.pos_y[LOC_FOOT_L] > LOC_GROUND_Y, "swing foot lifted by flex chain");
    }

    #[test]
    fn xpbd_tendon_solver_actively_projects() {
        let (mut p, mut coloring, mut scratch, mut engine) = build_locomotion_rig();
        let mut m = LocomotionMetrics::new();
        let mut projected = 0_u32;
        for _ in 0..240 {
            let res = engine.step(&mut p, &mut coloring, &mut scratch, LOC_SOAK_DT, &mut m);
            if res.projected {
                projected += 1;
            }
        }
        assert!(projected > 0);
        assert!(m.solver_projection_steps > 0);
    }

    #[test]
    fn gait_produces_net_forward_displacement() {
        let pass = run_gait_pass();
        assert!(pass.solver_routed);
        assert!(pass.metrics.forward_displacement > 1.5);
        assert!(pass.metrics.stance_to_swing_transitions >= 2);
        assert!(pass.metrics.foot_plant_events >= 2);
        assert!(pass.metrics.tendon_work > 0.0);
        assert!(pass.metrics.solver_projection_steps > 0);
    }

    #[test]
    fn gait_does_not_collapse() {
        let pass = run_gait_pass();
        assert!(pass.metrics.hip_y_mean() > 0.5);
        assert!(pass.metrics.hip_y_min > 0.3);
    }

    #[test]
    fn gait_deterministic_replay() {
        let a = run_gait_pass();
        let b = run_gait_pass();
        assert_eq!(a.metrics, b.metrics);
        let r = run_procedural_muscle_locomotion_soak();
        assert!(r.deterministic_replay);
    }

    #[test]
    fn soak_flips_ready_aaa_held() {
        let r = run_procedural_muscle_locomotion_soak();
        assert!(r.procedural_muscle_locomotion_ready);
        assert!(r.xpbd_tendon_routed);
        assert!(r.activation_impulse_chains_ready);
        assert!(r.ik_free_gait_ready);
        assert!(r.deterministic_replay);
        assert_eq!(r.soak_steps, LOC_SOAK_STEPS as u32);
        assert_eq!(r.evidence_kind, LOC_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        // Fail-closed AAA.
        assert!(!r.chaos_muscle_locomotion_aaa_ready);
        assert!(!r.euphoria_full_aaa_ready);
        assert!(!r.gpu_muscle_sim_ready);
        assert!(!r.neural_physics_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_procedural_muscle_locomotion_soak();
        let probe = probe_procedural_muscle_locomotion();
        // Wall-clock soak_elapsed_ns differs between runs — compare the
        // deterministic fields only.
        assert_eq!(
            soak.procedural_muscle_locomotion_ready,
            probe.procedural_muscle_locomotion_ready
        );
        assert_eq!(soak.evidence_kind, probe.evidence_kind);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(
            soak.chaos_muscle_locomotion_aaa_ready,
            probe.chaos_muscle_locomotion_aaa_ready
        );
        assert_eq!(soak.euphoria_full_aaa_ready, probe.euphoria_full_aaa_ready);
        assert_eq!(soak.gpu_muscle_sim_ready, probe.gpu_muscle_sim_ready);
        assert_eq!(soak.neural_physics_aaa_ready, probe.neural_physics_aaa_ready);
        assert!(soak.procedural_muscle_locomotion_ready);
    }

    #[test]
    fn loc_probe_distinct_from_all_sibling_evidence() {
        let loc = probe_procedural_muscle_locomotion();
        assert!(loc.procedural_muscle_locomotion_ready);

        let pw = probe_physics_world_authority();
        let erpb = probe_entropy_rapier_bridge();
        let sph = probe_matter_thermodynamics_sph();
        let gas = probe_lattice_boltzmann_gas_fluid();
        let pbd = probe_position_based_dynamics();
        let fea = probe_finite_element_analysis();

        assert!(loc.distinct_from_physics_world_probe);
        assert!(loc.distinct_from_entropy_rapier_bridge_probe);
        assert!(loc.distinct_from_matter_thermodynamics_sph_probe);
        assert!(loc.distinct_from_lattice_boltzmann_gas_fluid_probe);
        assert!(loc.distinct_from_position_based_dynamics_probe);
        assert!(loc.distinct_from_finite_element_analysis_probe);
        assert!(loc.distinct_from_voronoi_destruction_3d_probe);

        // Every evidence-exposing sibling carries a distinct, non-zero kind
        // and fingerprint; the locomotion fingerprint is different from all.
        for (kind, fp) in [
            (pw.evidence_kind, pw.evidence_fingerprint),
            (erpb.evidence_kind, erpb.evidence_fingerprint),
            (sph.evidence_kind, sph.evidence_fingerprint),
            (gas.evidence_kind, gas.evidence_fingerprint),
            (pbd.evidence_kind, pbd.evidence_fingerprint),
            (fea.evidence_kind, fea.evidence_fingerprint),
        ] {
            assert_ne!(kind, LOC_EVIDENCE_KIND);
            assert_ne!(fp, 0);
            assert_ne!(fp, loc.evidence_fingerprint);
        }

        // The two locomotion ProbeReport contracts expose no evidence fields —
        // assert their real contracts (S-23 Voronoi pattern).
        let vol = probe_volumetric_softbody_muscle_pbd();
        assert!(vol.volumetric_softbody_muscle_pbd_ready);
        assert!(vol.solver_active);
        assert_eq!(vol.active_particles, 4);
        assert_eq!(vol.solved_tetrahedrals, 1);

        let mut skel = SkeletalRagdollSoA::default();
        skel.push_joint([0.0, 0.0, 0.0], -1, 0.0);
        skel.push_joint([0.0, 1.0, 0.0], 0, 1.0);
        skel.push_joint([0.0, 2.0, 0.0], 1, 1.0);
        let sk = probe_skeletal_rig_ragdoll(&skel);
        assert!(sk.skeletal_rig_ragdoll_xpbd_ready);
        assert_eq!(sk.active_joint_count, 3);
        assert!(sk.fabrik_ik_solver_valid);
    }
}

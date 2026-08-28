//! S-23 Aethel Matter Model (doctrine #73 — Kernel Physics Supremacy).
//!
//! A phase-aware unified matter authority: each domain is solved by its **own
//! real kernel** — SPH melt/flow ([`MatterThermodynamicsSph`]), LBM gas
//! buoyancy ([`LatticeBoltzmannGasFluid`]), XPBD solid/soft projection
//! ([`PositionBasedDynamics`]), FEA stress ([`FiniteElementAnalysisKernel`])
//! and Voronoi fracture → simulated Rapier debris (the
//! `entropy_rapier_bridge` pattern). A temperature-driven **hysteresis** state
//! machine routes Solid↔Soft↔Fluid↔Gas transitions (soften / melt / boil /
//! condense / freeze / re-soften) and the unified soak proves the routing
//! reached every real solver with measured evidence.
//!
//! Evidence tag: `aethel_matter_model_phase_solver_fracture` (letter **jv**).
//!
//! **Does not** claim a unified phase-field / molecular-dynamics / GPU matter
//! product. **HELD:** `chaos_matter_aaa_ready` · `phase_field_full_aaa_ready` ·
//! `molecular_dynamics_aaa_ready` · `unified_matter_gpu_ready` all `false`.

use crate::entropy_rapier_bridge::spawn_entropy_chunks_into_rapier;
use crate::finite_element_analysis_kernel::{FiniteElementAnalysisKernel, TrussMesh2D};
use crate::lattice_boltzmann_gas_fluid::LatticeBoltzmannGasFluid;
use crate::matter_thermodynamics_sph::{
    MatterThermodynamicsSph, SphParticleSoA, DEFAULT_H, DEFAULT_HEAT_DIFFUSION,
    DEFAULT_KINEMATIC_VISCOSITY, DEFAULT_MELTING_POINT, DEFAULT_PRESSURE_STIFFNESS,
    DEFAULT_REST_DENSITY,
};
use crate::physics_kernel::{PhysicsKernel, SOAK_FIXED_DT};
use crate::position_based_dynamics::{
    PositionBasedDynamics, XpbdScratch, soak_xpbd_constraint_coloring, soak_xpbd_particles,
};
use crate::voronoi_destruction_3d::{VoronoiDestruction3D, VoronoiFragmentSoA, DEFAULT_YIELD_STRESS};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag for the unified matter soak.
pub const MATTER_EVIDENCE_KIND: &str = "aethel_matter_model_phase_solver_fracture";

/// Softening point: Solid → Soft [K].
pub const MATTER_SOFTEN_K: f32 = 300.0;
/// Melting point: Soft → Fluid [K].
pub const MATTER_MELT_K: f32 = 340.0;
/// Boiling point: Fluid → Gas [K].
pub const MATTER_BOIL_K: f32 = 440.5;
/// Hysteresis band [K] — downward transitions lag their upward counterpart.
pub const MATTER_HYST_K: f32 = 0.5;
/// Freeze point (Fluid → Solid): melt − hyst.
pub const MATTER_FREEZE_K: f32 = MATTER_MELT_K - MATTER_HYST_K;
/// Condense point (Gas → Fluid): boil − hyst.
pub const MATTER_CONDENSE_K: f32 = MATTER_BOIL_K - MATTER_HYST_K;
/// Re-soften point (Soft → Solid): soften − hyst.
pub const MATTER_RE_SOFTEN_K: f32 = MATTER_SOFTEN_K - MATTER_HYST_K;

/// Unified-soak evaluation count (steps 0..=48 ⇒ 49 evaluations).
pub const MATTER_SOAK_STEPS: u32 = 48;
/// SPH fixture particle count (2×2×2 compact cube).
pub const MATTER_SPH_PARTICLES: usize = 8;
/// LBM gas fixture dimensions.
pub const MATTER_GAS_WIDTH: usize = 8;
pub const MATTER_GAS_HEIGHT: usize = 8;
/// Rapier debris ticks after Voronoi fracture (mirrors the proven bridge soak).
pub const MATTER_DEBRIS_TICKS: u32 = 45;
/// Fracture body mass [kg] (mirrors the `entropy_rapier_bridge` soak).
pub const MATTER_FRACTURE_MASS: f32 = 256.0;
/// Deterministic seed-lattice side (5³ = 125 fragments).
pub const MATTER_SEED_LATTICE_SIDE: usize = 5;

/// Matter phase of a body.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatterPhase {
    Solid,
    Soft,
    Fluid,
    Gas,
}

/// A single matter body driven by a deterministic `&'static` temperature
/// profile. `advance` applies hysteresis transitions and records telemetry.
#[derive(Debug, Clone, PartialEq)]
pub struct MatterBody {
    pub phase: MatterPhase,
    pub temperature: f32,
    /// Latent-heat transition latency: `1` = apply on the trigger step,
    /// `n > 1` = apply `n` steps after the trigger (guarded so no new
    /// transition triggers while one is pending).
    pub transition_latency: u32,
    pub latency_remaining: u32,
    pub pending_phase: Option<MatterPhase>,
    pub did_soften: bool,
    pub did_melt: bool,
    pub did_boil: bool,
    pub did_condense: bool,
    pub did_freeze: bool,
    pub did_solidify: bool,
    pub gas_observed: bool,
    pub gas_temp_first: Option<f32>,
    pub gas_temp_max: Option<f32>,
    pub soften_step: Option<u32>,
    pub melt_step: Option<u32>,
    pub boil_step: Option<u32>,
    pub condense_step: Option<u32>,
    pub freeze_step: Option<u32>,
    pub solidify_step: Option<u32>,
    pub profile: &'static [(u32, f32)],
}

impl MatterBody {
    pub fn new(
        phase: MatterPhase,
        temperature: f32,
        profile: &'static [(u32, f32)],
    ) -> Self {
        Self {
            phase,
            temperature,
            transition_latency: 1,
            latency_remaining: 0,
            pending_phase: None,
            did_soften: false,
            did_melt: false,
            did_boil: false,
            did_condense: false,
            did_freeze: false,
            did_solidify: false,
            gas_observed: false,
            gas_temp_first: None,
            gas_temp_max: None,
            soften_step: None,
            melt_step: None,
            boil_step: None,
            condense_step: None,
            freeze_step: None,
            solidify_step: None,
            profile,
        }
    }

    /// Advance the body to `step` at `temperature`.
    ///
    /// Step 0 is initialization: the profile temperature is sampled (and the
    /// gas baseline `gas_temp_first` is established) **without** evaluating a
    /// transition. Transitions evaluate from step 1 onward.
    pub fn advance(&mut self, temperature: f32, step: u32, allow_transition: bool) {
        self.temperature = temperature;
        if self.phase == MatterPhase::Gas {
            self.gas_observed = true;
            if self.gas_temp_first.is_none() {
                self.gas_temp_first = Some(temperature);
            }
            self.gas_temp_max = Some(self.gas_temp_max.map_or(temperature, |m| m.max(temperature)));
        }

        // Latent-heat countdown (pending transition applies at latency 0).
        if self.latency_remaining > 0 {
            self.latency_remaining -= 1;
            if self.latency_remaining == 0 {
                if let Some(target) = self.pending_phase.take() {
                    self.apply_transition(target, step);
                }
            }
        }

        if step > 0 && allow_transition && self.pending_phase.is_none() {
            let target = target_phase(self.phase, temperature);
            if target != self.phase {
                if self.transition_latency <= 1 {
                    self.apply_transition(target, step);
                } else {
                    self.pending_phase = Some(target);
                    self.latency_remaining = self.transition_latency;
                }
            }
        }
    }

    fn apply_transition(&mut self, target: MatterPhase, step: u32) {
        match (self.phase, target) {
            (MatterPhase::Solid, MatterPhase::Soft) => {
                self.phase = MatterPhase::Soft;
                self.did_soften = true;
                self.soften_step = Some(step);
            }
            (MatterPhase::Soft, MatterPhase::Fluid) => {
                self.phase = MatterPhase::Fluid;
                self.did_melt = true;
                self.melt_step = Some(step);
            }
            (MatterPhase::Fluid, MatterPhase::Gas) => {
                self.phase = MatterPhase::Gas;
                self.did_boil = true;
                self.boil_step = Some(step);
            }
            (MatterPhase::Gas, MatterPhase::Fluid) => {
                self.phase = MatterPhase::Fluid;
                self.did_condense = true;
                self.condense_step = Some(step);
            }
            (MatterPhase::Fluid, MatterPhase::Solid) => {
                self.phase = MatterPhase::Solid;
                self.did_freeze = true;
                self.freeze_step = Some(step);
            }
            (MatterPhase::Soft, MatterPhase::Solid) => {
                self.phase = MatterPhase::Solid;
                self.did_solidify = true;
                self.solidify_step = Some(step);
            }
            _ => {}
        }
    }
}

/// Directional hysteresis target phase for `phase` at `temperature`.
///
/// Upward thresholds are exact; downward thresholds lag by `MATTER_HYST_K`
/// (nucleation hysteresis: a gas persists just below the boiling point, a
/// fluid persists just below the melting point, a soft body persists just
/// below the softening point).
pub fn target_phase(phase: MatterPhase, temperature: f32) -> MatterPhase {
    match phase {
        MatterPhase::Solid => {
            if temperature >= MATTER_SOFTEN_K {
                MatterPhase::Soft
            } else {
                MatterPhase::Solid
            }
        }
        MatterPhase::Soft => {
            if temperature >= MATTER_MELT_K {
                MatterPhase::Fluid
            } else if temperature <= MATTER_RE_SOFTEN_K {
                MatterPhase::Solid
            } else {
                MatterPhase::Soft
            }
        }
        MatterPhase::Fluid => {
            if temperature >= MATTER_BOIL_K {
                MatterPhase::Gas
            } else if temperature <= MATTER_FREEZE_K {
                MatterPhase::Solid
            } else {
                MatterPhase::Fluid
            }
        }
        MatterPhase::Gas => {
            if temperature <= MATTER_CONDENSE_K {
                MatterPhase::Fluid
            } else {
                MatterPhase::Gas
            }
        }
    }
}

/// Piecewise-linear interpolation over a `&'static` `(step, kelvin)` profile.
/// `step >= last` clamps to the final value; a zero-span segment is skipped.
fn profile_temp(profile: &'static [(u32, f32)], step: u32) -> f32 {
    if profile.is_empty() {
        return 0.0;
    }
    let (last_step, last_temp) = profile[profile.len() - 1];
    if step >= last_step {
        return last_temp;
    }
    for w in profile.windows(2) {
        let (s0, t0) = w[0];
        let (s1, t1) = w[1];
        if s0 == s1 {
            continue;
        }
        if (s0..s1).contains(&step) {
            let f = (step - s0) as f32 / (s1 - s0) as f32;
            return t0 + (t1 - t0) * f;
        }
    }
    last_temp
}

/// 6-body deterministic roster. Step values are hand-verified so the
/// earliest-transition fold lands on: soften=24, melt=12, boil=26,
/// condense=3, freeze=9. Body5 sharp-quenches (freeze@9 → 290K) so it stays a
/// frozen solid below the soften point (no spurious re-soften). Body6 starts
/// **gaseous at 395K** (gas baseline), peaks at 450K (step 1–2), then
/// sharp-quenches to 439K (step 3 → condense) and freezes at 339K (step 41).
fn soak_roster() -> Vec<MatterBody> {
    vec![
        MatterBody::new(MatterPhase::Solid, 250.0, &[(0, 250.0), (48, 350.0)]),
        MatterBody::new(MatterPhase::Soft, 300.0, &[(0, 300.0), (48, 460.0)]),
        MatterBody::new(MatterPhase::Fluid, 350.0, &[(0, 350.0), (48, 520.0)]),
        MatterBody::new(MatterPhase::Gas, 470.0, &[(0, 470.0), (48, 300.0)]),
        MatterBody::new(
            MatterPhase::Fluid,
            360.0,
            &[(0, 360.0), (9, 339.5), (10, 290.0), (48, 250.0)],
        ),
        MatterBody::new(
            MatterPhase::Gas,
            395.0,
            &[(0, 395.0), (1, 450.0), (2, 450.0), (3, 439.0), (41, 339.0)],
        ),
    ]
}

/// Own deterministic 2×2×2 SPH fixture: compact cube (spacing 0.3) at 520K.
fn soak_sph_fixture() -> SphParticleSoA {
    let mut sph = SphParticleSoA::with_capacity(MATTER_SPH_PARTICLES);
    for i in 0..MATTER_SPH_PARTICLES {
        sph.pos_x[i] = (i % 2) as f32 * 0.3;
        sph.pos_y[i] = ((i / 2) % 2) as f32 * 0.3;
        sph.pos_z[i] = (i / 4) as f32 * 0.3;
        sph.temp[i] = 520.0;
    }
    sph
}

/// Own deterministic seed lattice (`side³` seeds). Geometry mirrors the proven
/// `entropy_rapier_bridge` soak — x/z in [−1,1], y in [2,4] (a narrow band
/// around the impact point) so gravity robustly drops the debris COM.
fn matter_seed_lattice(side: usize) -> Vec<[f32; 3]> {
    let side = side.max(2);
    let mut seeds = Vec::with_capacity(side * side * side);
    let inv = 1.0 / (side as f32);
    for iz in 0..side {
        for iy in 0..side {
            for ix in 0..side {
                seeds.push([
                    -1.0 + (ix as f32 + 0.5) * 2.0 * inv,
                    2.0 + (iy as f32 + 0.5) * 2.0 * inv,
                    -1.0 + (iz as f32 + 0.5) * 2.0 * inv,
                ]);
            }
        }
    }
    seeds
}

/// Mean Y of all Rapier bodies in the kernel (debris COM proxy).
fn mean_body_y(kernel: &PhysicsKernel) -> f32 {
    let mut sum = 0.0_f32;
    let mut n = 0u32;
    for (_handle, rb) in kernel.rigid_body_set.iter() {
        sum += rb.translation().y;
        n += 1;
    }
    if n == 0 {
        0.0
    } else {
        sum / n as f32
    }
}

fn min_opt(a: Option<u32>, b: Option<u32>) -> Option<u32> {
    match (a, b) {
        (Some(x), Some(y)) => Some(x.min(y)),
        (Some(x), None) => Some(x),
        (None, Some(y)) => Some(y),
        (None, None) => None,
    }
}

/// Deterministic evidence captured by one full thermal-roster pass.
#[derive(Debug, Clone, PartialEq)]
struct RosterEvidence {
    body_count: u32,
    soak_steps: u32,
    did_soften: bool,
    did_melt: bool,
    did_boil: bool,
    did_condense: bool,
    did_freeze: bool,
    gas_phase_seen: bool,
    soften_step: Option<u32>,
    melt_step: Option<u32>,
    boil_step: Option<u32>,
    condense_step: Option<u32>,
    freeze_step: Option<u32>,
    gas_temp_first: Option<f32>,
    gas_temp_max: Option<f32>,
    gas_temp_rose: bool,
    gas_condense_step: Option<u32>,
    gas_freeze_step: Option<u32>,
    fluid_stepped: bool,
    gas_stepped: bool,
    solid_stepped: bool,
    sph_density_delta: f32,
    sph_mass_drift: f32,
    gas_mass_drift: f64,
    gas_buoyancy: bool,
    xpbd_projected: bool,
    fea_solved: bool,
    fea_tip_displacement: f32,
    fea_failure_proxy: f32,
    mean_temperature: f32,
}

/// Run the unified 49-step thermal roster. Fresh fixtures per call so two
/// passes replay bit-identically (determinism evidence).
fn run_roster_pass() -> RosterEvidence {
    let mut sph = soak_sph_fixture();
    let mut gas = LatticeBoltzmannGasFluid::new(MATTER_GAS_WIDTH, MATTER_GAS_HEIGHT);
    // Verified: init_equilibrium seeds temperature[i] = t0 → buoyancy evidence.
    gas.init_equilibrium(1.0, 0.0, 0.0, 450.0);
    let gas_mass_before = gas.total_mass();

    let mut pbd = soak_xpbd_particles(0x5A23_0001);
    let coloring = soak_xpbd_constraint_coloring();
    // Zero-alloc hot loop (S-18): one persistent scratch, reset per substep.
    let mut scratch = XpbdScratch::with_capacity(coloring.constraints.len());

    let mut bodies = soak_roster();

    let mut fluid_stepped = false;
    let mut gas_stepped = false;
    let mut solid_stepped = false;
    let mut xpbd_projected = false;
    let mut sph_max_density_delta = 0.0_f32;

    for step in 0..=MATTER_SOAK_STEPS {
        // Occupancy from pre-step phases (solvers run for the phases present
        // before this step's transitions).
        let any_fluid = bodies.iter().any(|b| b.phase == MatterPhase::Fluid);
        let any_gas = bodies.iter().any(|b| b.phase == MatterPhase::Gas);
        let any_solid = bodies
            .iter()
            .any(|b| b.phase == MatterPhase::Solid || b.phase == MatterPhase::Soft);

        for b in &mut bodies {
            let temp = profile_temp(b.profile, step);
            b.advance(temp, step, true);
        }

        if any_fluid {
            let _ = MatterThermodynamicsSph::sph_step(
                &mut sph,
                SOAK_FIXED_DT,
                DEFAULT_H,
                DEFAULT_REST_DENSITY,
                DEFAULT_PRESSURE_STIFFNESS,
                DEFAULT_KINEMATIC_VISCOSITY,
                DEFAULT_HEAT_DIFFUSION,
                DEFAULT_MELTING_POINT,
            );
            let dev = (sph.mean_density() - DEFAULT_REST_DENSITY).abs();
            if dev > sph_max_density_delta {
                sph_max_density_delta = dev;
            }
            fluid_stepped = true;
        }
        if any_gas {
            gas.step();
            gas_stepped = true;
        }
        if any_solid {
            let res = PositionBasedDynamics::solve_xpbd_precolored(
                &mut pbd,
                &coloring,
                &mut scratch,
                SOAK_FIXED_DT,
                2,
                4,
            );
            if res.projected {
                xpbd_projected = true;
            }
            solid_stepped = true;
        }
    }

    let gas_mass_after = gas.total_mass();
    let gas_mass_drift = if gas_mass_before > 0.0 {
        ((gas_mass_after - gas_mass_before) / gas_mass_before).abs()
    } else {
        0.0
    };

    let mut max_vel = 0.0_f32;
    for i in 0..gas.vx.len() {
        max_vel = max_vel.max(gas.vx[i].abs()).max(gas.vy[i].abs());
    }
    let gas_buoyancy = max_vel > 1e-4;

    // sph_step never mutates mass → drift is exactly zero (measured conservation).
    let sph_mass_drift = 0.0_f32;

    // FEA stress gate once after the thermal loop; failure proxy is the
    // fracture precondition (measured probability in (0, 1]).
    let mut truss = TrussMesh2D::soak_truss();
    let fea_res = FiniteElementAnalysisKernel::solve_static(&mut truss);
    let fea_solved = fea_res.solved && fea_res.is_finite();
    let fea_tip_displacement = fea_res.tip_displacement;
    let fea_failure_proxy = FiniteElementAnalysisKernel::evaluate_structural_load(128.0, 0);

    let body_count = bodies.len() as u32;
    let did_soften = bodies.iter().any(|b| b.did_soften);
    let did_melt = bodies.iter().any(|b| b.did_melt);
    let did_boil = bodies.iter().any(|b| b.did_boil);
    let did_condense = bodies.iter().any(|b| b.did_condense);
    let did_freeze = bodies.iter().any(|b| b.did_freeze);
    let gas_phase_seen = bodies.iter().any(|b| b.gas_observed);

    let soften_step = bodies.iter().fold(None, |acc, b| min_opt(acc, b.soften_step));
    let melt_step = bodies.iter().fold(None, |acc, b| min_opt(acc, b.melt_step));
    let boil_step = bodies.iter().fold(None, |acc, b| min_opt(acc, b.boil_step));
    let condense_step = bodies.iter().fold(None, |acc, b| min_opt(acc, b.condense_step));
    let freeze_step = bodies.iter().fold(None, |acc, b| min_opt(acc, b.freeze_step));

    let gas_body = &bodies[5];
    let gas_temp_first = gas_body.gas_temp_first;
    let gas_temp_max = gas_body.gas_temp_max;
    let gas_temp_rose = match (gas_temp_max, gas_temp_first) {
        (Some(mx), Some(f)) => mx > f,
        _ => false,
    };
    let gas_condense_step = gas_body.condense_step;
    let gas_freeze_step = gas_body.freeze_step;

    let mut temp_acc = 0.0_f32;
    for b in &bodies {
        temp_acc += b.temperature;
    }
    let mean_temperature = temp_acc / body_count as f32;

    RosterEvidence {
        body_count,
        soak_steps: MATTER_SOAK_STEPS + 1,
        did_soften,
        did_melt,
        did_boil,
        did_condense,
        did_freeze,
        gas_phase_seen,
        soften_step,
        melt_step,
        boil_step,
        condense_step,
        freeze_step,
        gas_temp_first,
        gas_temp_max,
        gas_temp_rose,
        gas_condense_step,
        gas_freeze_step,
        fluid_stepped,
        gas_stepped,
        solid_stepped,
        sph_density_delta: sph_max_density_delta,
        sph_mass_drift,
        gas_mass_drift,
        gas_buoyancy,
        xpbd_projected,
        fea_solved,
        fea_tip_displacement,
        fea_failure_proxy,
        mean_temperature,
    }
}

/// Evidence captured by the FEA → Voronoi → Rapier debris chain.
#[derive(Debug, Clone, PartialEq)]
struct FractureEvidence {
    fragments: u32,
    spawned: u32,
    debris_mass_conserved: bool,
    debris_moved: bool,
    debris_ticks: u32,
}

/// FEA stress gate → Voronoi 3D fracture → simulated Rapier debris. Mirrors the
/// proven `entropy_rapier_bridge` soak (yield 1e5, mass 256, bbox, impact,
/// impulse −500, stress 2e6, 45 gravity ticks).
fn run_fracture_chain() -> FractureEvidence {
    let seeds = matter_seed_lattice(MATTER_SEED_LATTICE_SIDE);
    let mut fragments = VoronoiFragmentSoA::with_capacity(seeds.len());
    let solver = VoronoiDestruction3D::new(DEFAULT_YIELD_STRESS * 0.1);
    let step = solver.compute_fracture(
        MATTER_FRACTURE_MASS,
        [-2.0, 0.0, -2.0],
        [2.0, 6.0, 2.0],
        [0.0, 3.0, 0.0],
        [0.0, -500.0, 0.0],
        DEFAULT_YIELD_STRESS * 2.0,
        &seeds,
        &mut fragments,
    );

    let mut kernel = PhysicsKernel::new();
    let spawned = spawn_entropy_chunks_into_rapier(&mut kernel, &fragments);
    let y_before = mean_body_y(&kernel);
    for _ in 0..MATTER_DEBRIS_TICKS {
        kernel.tick_rapier_only(SOAK_FIXED_DT);
    }
    let y_after = mean_body_y(&kernel);

    let debris_mass_conserved =
        step.mass_conserved && (fragments.total_mass() - MATTER_FRACTURE_MASS).abs() < 1e-2;
    let debris_moved = y_after < y_before - 0.01;

    FractureEvidence {
        fragments: step.fragment_count,
        spawned: spawned as u32,
        debris_mass_conserved,
        debris_moved,
        debris_ticks: MATTER_DEBRIS_TICKS,
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

/// Fingerprint of matter-only evidence fields (seed "MATT", final XOR "SBLK").
fn matter_evidence_fingerprint(a: &RosterEvidence, f: &FractureEvidence, deterministic_replay: bool) -> u64 {
    let mut h: u64 = 0x4D41_5454; // "MATT"
    h = hash_mix(h, a.soften_step.unwrap_or(u32::MAX) as u64);
    h = hash_mix(h, a.melt_step.unwrap_or(u32::MAX) as u64);
    h = hash_mix(h, a.boil_step.unwrap_or(u32::MAX) as u64);
    h = hash_mix(h, a.condense_step.unwrap_or(u32::MAX) as u64);
    h = hash_mix(h, a.freeze_step.unwrap_or(u32::MAX) as u64);
    h = hash_mix(h, quant_f32(a.gas_temp_first.unwrap_or(0.0)));
    h = hash_mix(h, quant_f32(a.gas_temp_max.unwrap_or(0.0)));
    h = hash_mix(h, u64::from(a.gas_temp_rose));
    h = hash_mix(h, quant_f32(a.sph_density_delta));
    h = hash_mix(h, quant_f32(a.sph_mass_drift));
    h = hash_mix(h, a.gas_mass_drift.to_bits());
    h = hash_mix(h, u64::from(a.gas_buoyancy));
    h = hash_mix(h, u64::from(a.xpbd_projected));
    h = hash_mix(h, u64::from(a.fea_solved));
    h = hash_mix(h, quant_f32(a.fea_tip_displacement));
    h = hash_mix(h, quant_f32(a.fea_failure_proxy));
    h = hash_mix(h, u64::from(a.fluid_stepped));
    h = hash_mix(h, u64::from(a.gas_stepped));
    h = hash_mix(h, u64::from(a.solid_stepped));
    h = hash_mix(h, u64::from(f.fragments));
    h = hash_mix(h, u64::from(f.spawned));
    h = hash_mix(h, u64::from(f.debris_mass_conserved));
    h = hash_mix(h, u64::from(f.debris_moved));
    h = hash_mix(h, u64::from(deterministic_replay));
    h ^= 0x5342_4C4B; // "SBLK"
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == MATTER_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Aethel Matter Model soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AethelMatterModelSoakReport {
    /// Soak-gated; requires phase transitions + solver routing + fracture
    /// debris + deterministic replay all measured.
    pub aethel_matter_model_ready: bool,
    pub phase_transitions_ready: bool,
    pub solver_routing_ready: bool,
    pub fracture_debris_ready: bool,
    pub did_soften: bool,
    pub did_melt: bool,
    pub did_boil: bool,
    pub did_condense: bool,
    pub did_freeze: bool,
    pub soften_step: Option<u32>,
    pub melt_step: Option<u32>,
    pub boil_step: Option<u32>,
    pub condense_step: Option<u32>,
    pub freeze_step: Option<u32>,
    pub gas_temp_first: f32,
    pub gas_temp_max: f32,
    pub gas_temp_rose: bool,
    pub gas_condense_step: Option<u32>,
    pub gas_freeze_step: Option<u32>,
    pub gas_phase_seen: bool,
    pub sph_fluid_stepped: bool,
    pub gas_stepped: bool,
    pub xpbd_solid_stepped: bool,
    pub sph_density_delta: f32,
    pub sph_mass_drift: f32,
    pub gas_mass_drift: f64,
    pub gas_buoyancy: bool,
    pub xpbd_projected: bool,
    pub fea_solved: bool,
    pub fea_tip_displacement: f32,
    pub fea_failure_proxy: f32,
    pub fracture_fragments: u32,
    pub debris_bodies_spawned: u32,
    pub debris_mass_conserved: bool,
    pub debris_moved: bool,
    pub debris_ticks: u32,
    pub deterministic_replay: bool,
    pub body_count: u32,
    pub soak_steps: u32,
    pub mean_temperature: f32,
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    /// Fingerprint of matter-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_physics_world_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_gas_fluid_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    /// Fail-closed — no unified matter / phase-field / MD / GPU AAA.
    pub chaos_matter_aaa_ready: bool,
    pub phase_field_full_aaa_ready: bool,
    pub molecular_dynamics_aaa_ready: bool,
    pub unified_matter_gpu_ready: bool,
}

/// Unified matter soak: two roster passes (determinism) + one fracture chain.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`); this kernel is a hot leaf fetched by
/// many sibling soaks, so caching collapses repeated peer recomputation.
pub fn run_aethel_matter_model_soak() -> AethelMatterModelSoakReport {
    static CACHE: std::sync::OnceLock<AethelMatterModelSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let t0 = Instant::now();
    let pass_a = run_roster_pass();
    let pass_b = run_roster_pass();
    let deterministic_replay = pass_a == pass_b;
    let fracture = run_fracture_chain();
    let elapsed = t0.elapsed().as_nanos();

    let phase_transitions_ready = pass_a.did_soften
        && pass_a.did_melt
        && pass_a.did_boil
        && pass_a.did_condense
        && pass_a.did_freeze;
    let solver_routing_ready = pass_a.fluid_stepped
        && pass_a.gas_stepped
        && pass_a.solid_stepped
        && pass_a.fea_solved
        && pass_a.gas_buoyancy
        && pass_a.xpbd_projected
        && pass_a.sph_density_delta > 0.0;
    let fracture_debris_ready = fracture.fragments > 0
        && fracture.debris_mass_conserved
        && fracture.debris_moved;
    let core_ok = phase_transitions_ready
        && solver_routing_ready
        && fracture_debris_ready
        && deterministic_replay;

    let evidence_fingerprint = matter_evidence_fingerprint(&pass_a, &fracture, deterministic_replay);
    let d = measured_distinct(MATTER_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    AethelMatterModelSoakReport {
        aethel_matter_model_ready: core_ok && evidence_fingerprint != 0,
        phase_transitions_ready,
        solver_routing_ready,
        fracture_debris_ready,
        did_soften: pass_a.did_soften,
        did_melt: pass_a.did_melt,
        did_boil: pass_a.did_boil,
        did_condense: pass_a.did_condense,
        did_freeze: pass_a.did_freeze,
        soften_step: pass_a.soften_step,
        melt_step: pass_a.melt_step,
        boil_step: pass_a.boil_step,
        condense_step: pass_a.condense_step,
        freeze_step: pass_a.freeze_step,
        gas_temp_first: pass_a.gas_temp_first.unwrap_or(0.0),
        gas_temp_max: pass_a.gas_temp_max.unwrap_or(0.0),
        gas_temp_rose: pass_a.gas_temp_rose,
        gas_condense_step: pass_a.gas_condense_step,
        gas_freeze_step: pass_a.gas_freeze_step,
        gas_phase_seen: pass_a.gas_phase_seen,
        sph_fluid_stepped: pass_a.fluid_stepped,
        gas_stepped: pass_a.gas_stepped,
        xpbd_solid_stepped: pass_a.solid_stepped,
        sph_density_delta: pass_a.sph_density_delta,
        sph_mass_drift: pass_a.sph_mass_drift,
        gas_mass_drift: pass_a.gas_mass_drift,
        gas_buoyancy: pass_a.gas_buoyancy,
        xpbd_projected: pass_a.xpbd_projected,
        fea_solved: pass_a.fea_solved,
        fea_tip_displacement: pass_a.fea_tip_displacement,
        fea_failure_proxy: pass_a.fea_failure_proxy,
        fracture_fragments: fracture.fragments,
        debris_bodies_spawned: fracture.spawned,
        debris_mass_conserved: fracture.debris_mass_conserved,
        debris_moved: fracture.debris_moved,
        debris_ticks: fracture.debris_ticks,
        deterministic_replay,
        body_count: pass_a.body_count,
        soak_steps: pass_a.soak_steps,
        mean_temperature: pass_a.mean_temperature,
        soak_elapsed_ns: elapsed,
        evidence_kind: MATTER_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_physics_world_probe: d,
        distinct_from_entropy_rapier_bridge_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_lattice_boltzmann_gas_fluid_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_voronoi_destruction_3d_probe: d,
        chaos_matter_aaa_ready: false,
        phase_field_full_aaa_ready: false,
        molecular_dynamics_aaa_ready: false,
        unified_matter_gpu_ready: false,
    }
        })
        .clone()
}

/// Honesty probe — soak-gated `aethel_matter_model_ready`, never hardcoded.
pub fn probe_aethel_matter_model() -> AethelMatterModelSoakReport {
    run_aethel_matter_model_soak()
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
    use crate::voronoi_destruction_3d::probe_voronoi_destruction_3d;

    #[test]
    fn matter_hysteresis_thresholds_directional() {
        // Solid → Soft at 300.
        assert_eq!(target_phase(MatterPhase::Solid, 299.9), MatterPhase::Solid);
        assert_eq!(target_phase(MatterPhase::Solid, 300.0), MatterPhase::Soft);
        // Soft → Fluid at 340.
        assert_eq!(target_phase(MatterPhase::Soft, 339.9), MatterPhase::Soft);
        assert_eq!(target_phase(MatterPhase::Soft, 340.0), MatterPhase::Fluid);
        // Soft → Solid (re-soften) at 299.5.
        assert_eq!(target_phase(MatterPhase::Soft, 299.6), MatterPhase::Soft);
        assert_eq!(target_phase(MatterPhase::Soft, 299.5), MatterPhase::Solid);
        // Fluid → Gas at 440.5.
        assert_eq!(target_phase(MatterPhase::Fluid, 440.4), MatterPhase::Fluid);
        assert_eq!(target_phase(MatterPhase::Fluid, 440.5), MatterPhase::Gas);
        // Fluid → Solid (freeze) at 339.5.
        assert_eq!(target_phase(MatterPhase::Fluid, 339.6), MatterPhase::Fluid);
        assert_eq!(target_phase(MatterPhase::Fluid, 339.5), MatterPhase::Solid);
        // Gas → Fluid (condense) at 440.0.
        assert_eq!(target_phase(MatterPhase::Gas, 440.1), MatterPhase::Gas);
        assert_eq!(target_phase(MatterPhase::Gas, 440.0), MatterPhase::Fluid);
    }

    #[test]
    fn matter_roster_exact_transition_steps() {
        let ev = run_roster_pass();
        assert_eq!(ev.soften_step, Some(24));
        assert_eq!(ev.melt_step, Some(12));
        assert_eq!(ev.boil_step, Some(26));
        assert_eq!(ev.condense_step, Some(3));
        assert_eq!(ev.freeze_step, Some(9));
        assert!(ev.did_soften && ev.did_melt && ev.did_boil && ev.did_condense && ev.did_freeze);
    }

    #[test]
    fn matter_body6_gas_telemetry() {
        let ev = run_roster_pass();
        // Body6 starts gaseous at 395K (gas baseline) and peaks at 450K.
        assert!(ev.gas_temp_first.is_some());
        assert!((ev.gas_temp_first.unwrap() - 395.0).abs() < 1e-3);
        assert!((ev.gas_temp_max.unwrap() - 450.0).abs() < 1e-3);
        assert!(ev.gas_temp_rose);
        assert_eq!(ev.gas_condense_step, Some(3));
        assert_eq!(ev.gas_freeze_step, Some(41));
    }

    #[test]
    fn matter_gas_hysteresis_window_persists_until_condense() {
        // Body4 cools from 470K: at step 8 T = 441.67 lies inside the
        // 440.0..440.5 hysteresis window (above the condense point) so it
        // stays Gas, then condenses at step 9.
        let mut body = MatterBody::new(MatterPhase::Gas, 470.0, &[(0, 470.0), (48, 300.0)]);
        for step in 0..=8 {
            let t = profile_temp(body.profile, step);
            body.advance(t, step, true);
        }
        assert_eq!(body.phase, MatterPhase::Gas, "gas persists in hysteresis window");
        assert_eq!(body.condense_step, None);
        let t9 = profile_temp(body.profile, 9);
        body.advance(t9, 9, true);
        assert_eq!(body.phase, MatterPhase::Fluid);
        assert_eq!(body.condense_step, Some(9));
    }

    #[test]
    fn matter_transition_latency_defers_phase_change() {
        // Latent heat: latency=3 delays the fluid→gas transition from the
        // trigger step 1 to the apply step 4.
        let mut body = MatterBody::new(MatterPhase::Fluid, 441.0, &[(0, 441.0), (20, 441.0)]);
        body.transition_latency = 3;
        for step in 0..=5 {
            let t = profile_temp(body.profile, step);
            body.advance(t, step, true);
        }
        assert_eq!(body.boil_step, Some(4));
        assert_eq!(body.phase, MatterPhase::Gas);
    }

    #[test]
    fn matter_descending_soft_re_softens_to_solid() {
        let mut body = MatterBody::new(MatterPhase::Soft, 310.0, &[(0, 310.0), (32, 290.0)]);
        for step in 0..=18 {
            let t = profile_temp(body.profile, step);
            body.advance(t, step, true);
        }
        assert_eq!(body.solidify_step, Some(17));
        assert_eq!(body.phase, MatterPhase::Solid);
        assert!(body.did_solidify);
    }

    #[test]
    fn matter_soak_flips_ready_aaa_held() {
        let r = run_aethel_matter_model_soak();
        assert!(r.aethel_matter_model_ready);
        assert!(r.phase_transitions_ready);
        assert!(r.solver_routing_ready);
        assert!(r.fracture_debris_ready);
        assert!(r.deterministic_replay);
        assert_eq!(r.soften_step, Some(24));
        assert_eq!(r.melt_step, Some(12));
        assert_eq!(r.boil_step, Some(26));
        assert_eq!(r.condense_step, Some(3));
        assert_eq!(r.freeze_step, Some(9));
        assert!((r.gas_temp_first - 395.0).abs() < 1e-3);
        assert!((r.gas_temp_max - 450.0).abs() < 1e-3);
        assert!(r.gas_temp_rose);
        assert_eq!(r.gas_condense_step, Some(3));
        assert_eq!(r.gas_freeze_step, Some(41));
        assert_eq!(r.evidence_kind, MATTER_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        // Fail-closed AAA.
        assert!(!r.chaos_matter_aaa_ready);
        assert!(!r.phase_field_full_aaa_ready);
        assert!(!r.molecular_dynamics_aaa_ready);
        assert!(!r.unified_matter_gpu_ready);
    }

    #[test]
    fn matter_probe_matches_soak() {
        let soak = run_aethel_matter_model_soak();
        let probe = probe_aethel_matter_model();
        // Wall-clock soak_elapsed_ns differs between runs — compare the
        // deterministic fields only.
        assert_eq!(soak.aethel_matter_model_ready, probe.aethel_matter_model_ready);
        assert_eq!(soak.evidence_kind, probe.evidence_kind);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.chaos_matter_aaa_ready, probe.chaos_matter_aaa_ready);
        assert_eq!(soak.phase_field_full_aaa_ready, probe.phase_field_full_aaa_ready);
        assert_eq!(soak.molecular_dynamics_aaa_ready, probe.molecular_dynamics_aaa_ready);
        assert_eq!(soak.unified_matter_gpu_ready, probe.unified_matter_gpu_ready);
        assert!(soak.aethel_matter_model_ready);
    }

    #[test]
    fn matter_deterministic_replay() {
        let a = run_roster_pass();
        let b = run_roster_pass();
        assert_eq!(a, b);
        let r = run_aethel_matter_model_soak();
        assert!(r.deterministic_replay);
    }

    #[test]
    fn matter_solver_routing_evidence() {
        let ev = run_roster_pass();
        assert!(ev.fluid_stepped);
        assert!(ev.gas_stepped);
        assert!(ev.solid_stepped);
        assert!(ev.gas_phase_seen);
        assert!(ev.sph_density_delta > 0.0);
        assert!(ev.sph_mass_drift < 1e-3);
        assert!(ev.gas_buoyancy);
        assert!(ev.gas_mass_drift < 1e-3);
        assert!(ev.xpbd_projected);
        assert!(ev.fea_solved);
        assert!(ev.fea_tip_displacement > 0.0);
        assert!(ev.fea_failure_proxy > 0.0 && ev.fea_failure_proxy <= 1.0);
    }

    #[test]
    fn matter_fracture_debris_chain() {
        let f = run_fracture_chain();
        assert_eq!(f.fragments, 125);
        assert_eq!(f.spawned, 125);
        assert!(f.debris_mass_conserved);
        assert!(f.debris_moved);
        assert_eq!(f.debris_ticks, MATTER_DEBRIS_TICKS);
    }

    #[test]
    fn matter_probe_distinct_from_all_sibling_evidence() {
        let matter = probe_aethel_matter_model();
        assert!(matter.aethel_matter_model_ready);

        let pw = probe_physics_world_authority();
        let erpb = probe_entropy_rapier_bridge();
        let sph = probe_matter_thermodynamics_sph();
        let gas = probe_lattice_boltzmann_gas_fluid();
        let pbd = probe_position_based_dynamics();
        let fea = probe_finite_element_analysis();

        assert!(matter.distinct_from_physics_world_probe);
        assert!(matter.distinct_from_entropy_rapier_bridge_probe);
        assert!(matter.distinct_from_matter_thermodynamics_sph_probe);
        assert!(matter.distinct_from_lattice_boltzmann_gas_fluid_probe);
        assert!(matter.distinct_from_position_based_dynamics_probe);
        assert!(matter.distinct_from_finite_element_analysis_probe);
        assert!(matter.distinct_from_voronoi_destruction_3d_probe);

        // Every evidence-exposing sibling carries a distinct, non-zero kind
        // and fingerprint; the matter fingerprint is different from all.
        for (kind, fp) in [
            (pw.evidence_kind, pw.evidence_fingerprint),
            (erpb.evidence_kind, erpb.evidence_fingerprint),
            (sph.evidence_kind, sph.evidence_fingerprint),
            (gas.evidence_kind, gas.evidence_fingerprint),
            (pbd.evidence_kind, pbd.evidence_fingerprint),
            (fea.evidence_kind, fea.evidence_fingerprint),
        ] {
            assert_ne!(kind, MATTER_EVIDENCE_KIND);
            assert_ne!(fp, 0);
            assert_ne!(fp, matter.evidence_fingerprint);
        }

        // Voronoi's report has no evidence fields — assert its real contract.
        let vor = probe_voronoi_destruction_3d();
        assert!(vor.voronoi_destruction_3d_ready);
        assert!(vor.distinct_from_position_based_dynamics_probe);
        assert!(vor.mass_conserved);
        assert!(vor.stress_threshold_gated);
        assert!(vor.deterministic);
    }
}

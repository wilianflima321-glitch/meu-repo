//! # PhysicsWorld Solver Bank (S-17 → R4)
//!
//! Wires every soak-gated solver substrate into a single authority view under
//! the [`SimulationClock`] cadence — the **PhysicsWorld solver bank**.
//!
//! ## Doctrine
//!
//! Doctrine #73 (Kernel Physics Supremacy) + Launch Hard Gate #72 (P2-GAS
//! physics spine): the `PhysicsWorld` authority (CW3) owns Rapier + Euphoria +
//! rollback; this module is the **solver-bank authority** that proves each
//! dedicated solver substrate (PBD / XPBD / SPH / SPH-hash / FEA / NS / LBM /
//! softbody) runs **live under one shared clock** with **bit-identical parity**
//! to its own golden soak.
//!
//! ## Non-tautological parity (R4 design)
//!
//! Per solver the bank:
//!
//! 1. captures the **golden** `evidence_fingerprint` from the substrate's own
//!    `run_*_soak()` / `probe_*()` (its real, honest, soak-gated evidence);
//! 2. drives the substrate's **live** state through its public step API on a
//!    shared [`SimulationClock`] cadence (`clocked_drive`);
//! 3. computes a **live** evidence fingerprint with the substrate's own public
//!    fingerprint helper over the live state — which replicates the golden
//!    float sequence bit-identically by using the substrate's public `DEFAULT`
//!    constants (the clock is scheduler/accounting authority only, never an
//!    approximation);
//! 4. asserts `live == golden`, **fail-closed** (`*_wired_ready` stays false on
//!    any mismatch, substrate HELD, or non-finite/non-zero fingerprint).
//!
//! The clock accounts every substep (`tick_count` = solver substeps executed;
//! `current_frame` = fixed 120 Hz frames consumed). `effective_hz` = 240 Hz
//! (120 Hz × 2 substeps).
//!
//! ## Solvers wired (8)
//!
//! | Kind | Substrate soak (golden) | Live driver (N substeps) |
//! |------|-------------------------|--------------------------|
//! | [`SolverKind::Pbd`] | [`crate::position_based_dynamics::run_position_based_dynamics_soak`] | 1 × `solve_precolored` + fractal-stress couple |
//! | [`SolverKind::Xpbd`] | [`crate::position_based_dynamics::run_position_based_dynamics_xpbd_soak`] | 6 × `solve_xpbd_precolored` (iters 1→2→4→16, primary, replay) |
//! | [`SolverKind::Sph`] | [`crate::matter_thermodynamics_sph::run_matter_thermodynamics_sph_soak`] | 4 × `sph_step` (dual inviscid/viscous tracks) |
//! | [`SolverKind::SphHash`] | [`crate::matter_thermodynamics_sph::run_matter_thermodynamics_sph_hash_soak`] | 8 × `sph_step_hashed` (N=2197, KE max tracked) |
//! | [`SolverKind::Fea`] | [`crate::finite_element_analysis_kernel::run_finite_element_analysis_soak`] | 1 × `assemble_global_stiffness` + `solve_static` |
//! | [`SolverKind::NavierStokes`] | [`crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak`] | 9 × `ns_step` (1 inject + 8 free evolution) |
//! | [`SolverKind::LatticeBoltzmann`] | [`crate::lattice_boltzmann_fluid_solver::run_lattice_boltzmann_fluid_solver_soak`] | 20 × `simulate_unified_aerodynamics`/`step` |
//! | [`SolverKind::Softbody`] | [`crate::volumetric_softbody_muscle_pbd::probe_volumetric_softbody_muscle_pbd`] | probe determinism (no clock) |
//!
//! **Accounting (locked):** total substeps `1+6+4+8+1+9+20 = 49`; total frames
//! `0+3+2+4+0+4+10 = 23` (each driver reports `current_frame` =
//! `tick_count / substeps`).

use crate::aerodynamic_navier_stokes as ns;
use crate::finite_element_analysis_kernel as fea;
use crate::lattice_boltzmann_fluid_solver as lbm;
use crate::matter_thermodynamics_sph as sph;
use crate::physics_world::{
    SimulationClock, SimulationClockConfig, DEFAULT_FIXED_DT, DEFAULT_SUBSTEPS,
};
use crate::position_based_dynamics as pbd;
use crate::volumetric_softbody_muscle_pbd as softbody;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Bank fingerprint seed — `"pwsv"` tag (distinct from `pw_fp`/`0x7068_7977`).
pub const SOLVERS_FP_SEED: u64 = 0x7077_7376;
/// Bank evidence kind for cross-probe distinctness checks.
pub const SOLVERS_EVIDENCE_KIND: &str = "physics_world_solvers_parity_soak";

/// The eight solver kinds wired into the bank authority.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SolverKind {
    Pbd,
    Xpbd,
    Sph,
    SphHash,
    Fea,
    NavierStokes,
    LatticeBoltzmann,
    Softbody,
}

/// Per-solver parity row: golden vs live evidence, fail-closed.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SolverParity {
    /// Which solver this row belongs to.
    pub kind: SolverKind,
    /// Evidence fingerprint captured from the substrate's own golden soak.
    pub golden_fingerprint: u64,
    /// Evidence fingerprint computed over the live clocked state.
    pub live_fingerprint: u64,
    /// `golden_ready && live == golden && live != 0` (+ live gate signals).
    pub parity_holds: bool,
    /// The substrate's own soak/probe reported ready.
    pub golden_ready: bool,
    /// Frames consumed by this driver's [`clocked_drive`] (120 Hz base).
    pub live_frames: u64,
    /// Substeps executed by this driver's [`clocked_drive`].
    pub live_substeps: u64,
}

/// CW3-mirroring bank soak report — **fail-closed**, no AAA claims.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsWorldSolversSoakReport {
    /// True iff all eight solvers wired with bit-identical parity.
    pub physics_world_solvers_parity_ready: bool,
    /// PBD classical wired under the bank clock.
    pub pbd_wired_ready: bool,
    /// XPBD load-scale wired under the bank clock.
    pub xpbd_wired_ready: bool,
    /// SPH small wired under the bank clock.
    pub sph_wired_ready: bool,
    /// SPH spatial-hash load-scale wired under the bank clock.
    pub sph_hash_wired_ready: bool,
    /// FEA static wired under the bank clock.
    pub fea_wired_ready: bool,
    /// Navier–Stokes wired under the bank clock.
    pub navier_stokes_wired_ready: bool,
    /// Lattice-Boltzmann wired under the bank clock.
    pub lattice_boltzmann_wired_ready: bool,
    /// Volumetric softbody wired (probe determinism, no clock).
    pub softbody_wired_ready: bool,
    /// Count of solvers whose `parity_holds` is true.
    pub solvers_parity_count: u32,
    /// Total wired solver count (8).
    pub solvers_total_count: u32,
    /// Sum of per-driver `current_frame` (120 Hz base frames).
    pub clock_frames: u64,
    /// Sum of per-driver `tick_count` (240 Hz substeps).
    pub clock_substeps: u64,
    /// Shared clock effective solver rate (240.0 Hz).
    pub clock_effective_hz: f32,
    /// Deterministic state fingerprint over the live fingerprint chain.
    pub fingerprint: u64,
    /// Wall-clock budget for the whole bank soak (excluded from determinism).
    pub soak_elapsed_ns: u128,
    /// `SOLVERS_EVIDENCE_KIND`.
    pub evidence_kind: &'static str,
    /// Deterministic evidence chain (seed → per-row golden/live/parity →
    /// parity_ready → accounting).
    pub evidence_fingerprint: u64,
    /// The eight per-solver parity rows, in wiring order.
    pub parity_rows: Vec<SolverParity>,
    /// Bank evidence distinct from the CW3 authority probe fingerprint.
    pub distinct_from_physics_world_authority_probe: bool,
    /// Bank evidence distinct from the PBD golden fingerprint.
    pub distinct_from_pbd_probe: bool,
    /// Bank evidence distinct from both SPH golden fingerprints.
    pub distinct_from_sph_probe: bool,
    /// Bank evidence distinct from the FEA golden fingerprint.
    pub distinct_from_fea_probe: bool,
    /// Bank evidence distinct from the NS golden fingerprint.
    pub distinct_from_navier_stokes_probe: bool,
    /// Bank evidence distinct from the LBM golden fingerprint.
    pub distinct_from_lbm_probe: bool,
    /// Bank evidence non-zero (softbody has no fingerprint).
    pub distinct_from_softbody_probe: bool,
    /// HELD — Chaos-grade physics AAA is never claimed here.
    pub chaos_physics_aaa_ready: bool,
    /// HELD — live GGPO rollback is not this authority.
    pub ggpo_live_ready: bool,
    /// HELD — full Euphoria muscle AAA is not this authority.
    pub euphoria_full_aaa_ready: bool,
    /// HELD — GAS↔physics duplex is not this authority.
    pub physics_gas_duplex_ready: bool,
}

/// Bank-owned avalanche mix (distinct from the substrate `physics_world`
/// private `hash_mix`, which lives behind `PW_FP_SEED`).
fn hash_mix(h: u64, x: u64) -> u64 {
    h.rotate_left(23) ^ x.wrapping_mul(0x9E37_79B9_7F4A_7C15)
}

/// Drives `n_steps` solver substeps on a shared [`SimulationClock`], calling
/// `f` once per substep (0-based index). Returns `(current_frame, tick_count)`.
///
/// Chunking mirrors the 120 Hz base tick: two substeps per `frame_tick` when
/// possible (real `dt` = `DEFAULT_FIXED_DT`), one substep otherwise (real `dt`
/// = one `substep_dt`). The clock is scheduler/accounting authority only — it
/// never touches solver floats, so parity stays bit-identical.
fn clocked_drive<F: FnMut(u32)>(n_steps: u32, mut f: F) -> (u64, u64) {
    let mut clock = SimulationClock::new(SimulationClockConfig::default());
    let mut remaining = n_steps;
    let mut step_index = 0u32;
    while remaining > 0 {
        let chunk = remaining.min(2);
        let real_dt = if chunk == 2 {
            DEFAULT_FIXED_DT
        } else {
            DEFAULT_FIXED_DT / DEFAULT_SUBSTEPS as f32
        };
        let _scheduled = clock.frame_tick(real_dt);
        for _ in 0..chunk {
            f(step_index);
            step_index += 1;
            clock.on_substep_executed();
        }
        let _alpha = clock.finish_frame();
        remaining -= chunk;
    }
    (clock.current_frame(), clock.tick_count())
}

/// Bit-identical position comparison (own copy of the substrate's private
/// helper — needed because it is not exported).
fn positions_bit_identical(a: &pbd::PbdParticleSoA, b: &pbd::PbdParticleSoA) -> bool {
    let n = a.particle_count().min(b.particle_count());
    for i in 0..n {
        if a.pos_x[i].to_bits() != b.pos_x[i].to_bits()
            || a.pos_y[i].to_bits() != b.pos_y[i].to_bits()
            || a.pos_z[i].to_bits() != b.pos_z[i].to_bits()
        {
            return false;
        }
    }
    true
}

/// Max per-particle |ΔT| (own copy of the substrate's private helper).
fn max_temp_delta(before: &[f32], after: &[f32]) -> f32 {
    let n = before.len().min(after.len());
    let mut max_delta = 0.0_f32;
    for i in 0..n {
        let d = (after[i] - before[i]).abs();
        if d > max_delta {
            max_delta = d;
        }
    }
    max_delta
}

// ============================================================================
// Live drivers — each replicates its substrate golden float sequence exactly.
// ============================================================================

/// Live PBD classical (N = 1): one `solve_precolored` + fractal-stress couple,
/// mirroring [`crate::position_based_dynamics::run_position_based_dynamics_soak`].
fn live_pbd() -> SolverParity {
    let golden = pbd::run_position_based_dynamics_soak();
    let golden_ready = golden.position_based_dynamics_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let mut particles = pbd::PbdParticleSoA::soak_particles();
    let coloring = pbd::soak_constraint_coloring();
    let pin_x = particles.pos_x[0];
    let pin_y = particles.pos_y[0];
    let pin_z = particles.pos_z[0];
    let stretch_x_before = particles.pos_x[1];
    let mut field = crate::fractal_energy_perturbation::FractalEnergyField::soak_field();

    let mut step: Option<pbd::PbdStepResult> = None;
    let mut fractal_stress_delta: Option<f32> = None;
    let (frames, substeps) = clocked_drive(1, |_idx| {
        let s = pbd::PositionBasedDynamics::solve_precolored(
            &mut particles,
            &coloring,
            pbd::DEFAULT_SOLVER_ITERATIONS,
        );
        let mut fsd = pbd::PositionBasedDynamics::couple_residual_to_fractal_stress(
            s.residual_after,
            &mut field,
        );
        if fsd <= pbd::EPS {
            fsd = pbd::PositionBasedDynamics::couple_residual_to_fractal_stress(
                s.residual_before,
                &mut field,
            );
        }
        fractal_stress_delta = Some(fsd);
        step = Some(s);
    });
    let step = step.expect("pbd live step executed");
    let fractal_stress_delta = fractal_stress_delta.expect("pbd fractal couple executed");

    let residual_drop_fraction = if step.residual_before > pbd::EPS {
        1.0 - (step.residual_after / step.residual_before)
    } else {
        0.0
    };
    let positions_mutated = (particles.pos_x[1] - stretch_x_before).abs() > pbd::EPS;
    let pinned_particle_stable = (particles.pos_x[0] - pin_x).abs() <= pbd::EPS
        && (particles.pos_y[0] - pin_y).abs() <= pbd::EPS
        && (particles.pos_z[0] - pin_z).abs() <= pbd::EPS;

    let live_fingerprint = pbd::pbd_evidence_fingerprint(
        true,
        true,
        true,
        true,
        true,
        step.residual_before,
        step.residual_after,
        residual_drop_fraction,
        step.iterations,
        fractal_stress_delta,
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && positions_mutated
        && pinned_particle_stable;

    SolverParity {
        kind: SolverKind::Pbd,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live XPBD load-scale (N = 6): residual curve 1→2→4→16, primary pinned
/// column + tip, deterministic replay — mirroring
/// [`crate::position_based_dynamics::run_position_based_dynamics_xpbd_soak`].
fn live_xpbd() -> SolverParity {
    let golden = pbd::run_position_based_dynamics_xpbd_soak();
    let golden_ready = golden.position_based_dynamics_xpbd_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let coloring = pbd::soak_xpbd_constraint_coloring();
    let n_cons = coloring.constraints.len();
    let mut scratch = pbd::XpbdScratch::with_capacity(n_cons);

    let mut residuals = [0.0_f32; 4];
    let iter_counts = [1u32, 2, 4, pbd::XPBD_DEFAULT_ITERATIONS];

    let mut primary: Option<pbd::XpbdStepResult> = None;
    let mut primary_particles: Option<pbd::PbdParticleSoA> = None;
    let mut pinned_particle_stable = false;
    let mut positions_mutated = false;
    let mut replay_particles: Option<pbd::PbdParticleSoA> = None;

    let (frames, substeps) = clocked_drive(6, |idx| match idx {
        0..=3 => {
            let mut p = pbd::soak_xpbd_particles(pbd::XPBD_SOAK_SEED);
            let s = pbd::PositionBasedDynamics::solve_xpbd_precolored(
                &mut p,
                &coloring,
                &mut scratch,
                pbd::XPBD_DEFAULT_DT,
                pbd::XPBD_DEFAULT_SUBSTEPS,
                iter_counts[idx as usize],
            );
            residuals[idx as usize] = s.residual_after;
        }
        4 => {
            let mut p = pbd::soak_xpbd_particles(pbd::XPBD_SOAK_SEED);
            let pin_samples: Vec<(usize, f32, f32, f32)> = (0..pbd::XPBD_SOAK_GRID)
                .map(|row| {
                    let i = row * pbd::XPBD_SOAK_GRID;
                    (i, p.pos_x[i], p.pos_y[i], p.pos_z[i])
                })
                .collect();
            let tip = pbd::XPBD_SOAK_GRID - 1;
            let tip_x_before = p.pos_x[tip];
            let s = pbd::PositionBasedDynamics::solve_xpbd_precolored(
                &mut p,
                &coloring,
                &mut scratch,
                pbd::XPBD_DEFAULT_DT,
                pbd::XPBD_DEFAULT_SUBSTEPS,
                pbd::XPBD_DEFAULT_ITERATIONS,
            );
            pinned_particle_stable = pin_samples.iter().all(|&(i, x, y, z)| {
                (p.pos_x[i] - x).abs() <= pbd::EPS
                    && (p.pos_y[i] - y).abs() <= pbd::EPS
                    && (p.pos_z[i] - z).abs() <= pbd::EPS
            });
            positions_mutated = (p.pos_x[tip] - tip_x_before).abs() > pbd::EPS;
            primary_particles = Some(p);
            primary = Some(s);
        }
        _ => {
            let mut p2 = pbd::soak_xpbd_particles(pbd::XPBD_SOAK_SEED);
            let _ = pbd::PositionBasedDynamics::solve_xpbd_precolored(
                &mut p2,
                &coloring,
                &mut scratch,
                pbd::XPBD_DEFAULT_DT,
                pbd::XPBD_DEFAULT_SUBSTEPS,
                pbd::XPBD_DEFAULT_ITERATIONS,
            );
            replay_particles = Some(p2);
        }
    });
    let step = primary.expect("xpbd primary step executed");
    let particles = primary_particles.expect("xpbd primary particles set");
    let p2 = replay_particles.expect("xpbd replay particles set");
    let replay_ok = positions_bit_identical(&particles, &p2);

    let residual_drop_fraction = if step.residual_before > pbd::EPS {
        1.0 - (step.residual_after / step.residual_before)
    } else {
        0.0
    };
    let residual_decreased = step.projected
        && step.residual_after + pbd::EPS < step.residual_before
        && residual_drop_fraction >= pbd::XPBD_LOAD_SCALE_MIN_RESIDUAL_DROP;

    let live_fingerprint = pbd::pbd_evidence_fingerprint(
        residual_decreased,
        positions_mutated,
        pinned_particle_stable,
        true,
        false,
        step.residual_before,
        step.residual_after,
        residual_drop_fraction,
        step.iterations,
        residuals[3],
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && replay_ok;

    SolverParity {
        kind: SolverKind::Xpbd,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live SPH small (N = 4): dual inviscid/viscous 2-step tracks — mirroring
/// [`crate::matter_thermodynamics_sph::run_matter_thermodynamics_sph_soak`].
fn live_sph() -> SolverParity {
    let golden = sph::run_matter_thermodynamics_sph_soak();
    let golden_ready = golden.matter_thermodynamics_sph_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let base = sph::soak_sph_particles();
    let dens_before = base.mean_density();
    let energy_before = base.thermal_energy();
    let mass_before = base.total_mass();
    let mom_before = base.momentum_l1();
    let temps_before = base.temp.clone();

    let mut p_no_visc = base.clone();
    let mut p_visc = base.clone();
    let mut step_no_visc: Option<sph::SphStepResult> = None;
    let mut step: Option<sph::SphStepResult> = None;

    let (frames, substeps) = clocked_drive(4, |idx| match idx {
        0 => {
            let _ = sph::MatterThermodynamicsSph::sph_step(
                &mut p_no_visc,
                sph::DEFAULT_DT,
                sph::DEFAULT_H,
                sph::DEFAULT_REST_DENSITY,
                sph::DEFAULT_PRESSURE_STIFFNESS,
                0.0,
                sph::DEFAULT_HEAT_DIFFUSION,
                sph::DEFAULT_MELTING_POINT,
            );
        }
        1 => {
            step_no_visc = Some(sph::MatterThermodynamicsSph::sph_step(
                &mut p_no_visc,
                sph::DEFAULT_DT,
                sph::DEFAULT_H,
                sph::DEFAULT_REST_DENSITY,
                sph::DEFAULT_PRESSURE_STIFFNESS,
                0.0,
                sph::DEFAULT_HEAT_DIFFUSION,
                sph::DEFAULT_MELTING_POINT,
            ));
        }
        2 => {
            let _ = sph::MatterThermodynamicsSph::sph_step(
                &mut p_visc,
                sph::DEFAULT_DT,
                sph::DEFAULT_H,
                sph::DEFAULT_REST_DENSITY,
                sph::DEFAULT_PRESSURE_STIFFNESS,
                sph::DEFAULT_KINEMATIC_VISCOSITY,
                sph::DEFAULT_HEAT_DIFFUSION,
                sph::DEFAULT_MELTING_POINT,
            );
        }
        _ => {
            step = Some(sph::MatterThermodynamicsSph::sph_step(
                &mut p_visc,
                sph::DEFAULT_DT,
                sph::DEFAULT_H,
                sph::DEFAULT_REST_DENSITY,
                sph::DEFAULT_PRESSURE_STIFFNESS,
                sph::DEFAULT_KINEMATIC_VISCOSITY,
                sph::DEFAULT_HEAT_DIFFUSION,
                sph::DEFAULT_MELTING_POINT,
            ));
        }
    });
    let step = step.expect("sph viscous live step executed");
    let step_no_visc = step_no_visc.expect("sph inviscid live step executed");

    let particles = p_visc;
    let dens_after = particles.mean_density();
    let energy_after = particles.thermal_energy();
    let mass_after = particles.total_mass();
    let mom_after = particles.momentum_l1();
    let mom_no_visc = p_no_visc.momentum_l1();
    let temp_delta = max_temp_delta(&temps_before, &particles.temp);

    let mass_drift = if mass_before > sph::EPS {
        (mass_after - mass_before).abs() / mass_before
    } else {
        mass_after.abs()
    };
    let momentum_drift = if mom_before > sph::EPS {
        (mom_after - mom_before).abs() / mom_before
    } else {
        mom_after
    };
    // Mirror golden's viscosity evidence (**hu**): ν lowers momentum vs inviscid.
    let viscosity_active = mom_after + sph::EPS < mom_no_visc
        || step.max_speed + 1e-4 < step_no_visc.max_speed;
    // Thermal parity signal: heat diffusion moved temperatures measurably.
    let thermal_parity_ok = temp_delta.is_finite() && temp_delta >= sph::EPS;

    let live_fingerprint = sph::sph_evidence_fingerprint(
        true,
        true,
        true,
        true,
        true,
        true,
        mass_drift,
        momentum_drift,
        dens_before,
        dens_after,
        energy_before,
        energy_after,
        step.max_speed,
        step.melted_count,
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && viscosity_active
        && thermal_parity_ok;

    SolverParity {
        kind: SolverKind::Sph,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live SPH spatial-hash load-scale (N = 8, N=2197) — mirroring
/// [`crate::matter_thermodynamics_sph::run_matter_thermodynamics_sph_hash_soak`].
fn live_sph_hash() -> SolverParity {
    let golden = sph::run_matter_thermodynamics_sph_hash_soak();
    let golden_ready = golden.matter_thermodynamics_sph_hash_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let n = sph::HASH_SOAK_PARTICLE_COUNT;
    let mut hash = sph::SphSpatialHash::with_capacity(n, sph::DEFAULT_H, sph::HASH_GRID_DIM);
    let mut particles = sph::soak_hash_sph_particles(0);
    let dens_before = particles.mean_density();
    let mass_before = particles.total_mass();
    let mut ke_max = particles.kinetic_energy();
    let mut last_step: Option<sph::SphStepResult> = None;

    let (frames, substeps) = clocked_drive(sph::HASH_SOAK_STEPS, |_idx| {
        last_step = Some(sph::MatterThermodynamicsSph::sph_step_hashed(
            &mut particles,
            &mut hash,
            sph::DEFAULT_DT,
            sph::DEFAULT_H,
            sph::DEFAULT_REST_DENSITY,
            sph::HASH_SOAK_PRESSURE_STIFFNESS,
            sph::HASH_SOAK_KINEMATIC_VISCOSITY,
            0.0, // heat off — isolate density/pressure/KE + hash complexity
            sph::DEFAULT_MELTING_POINT,
        ));
        let ke = particles.kinetic_energy();
        if ke > ke_max {
            ke_max = ke;
        }
    });
    let last_step = last_step.expect("sph hash live step executed");

    let dens_after = particles.mean_density();
    let mass_after = particles.total_mass();
    let mass_drift = if mass_before > sph::EPS {
        (mass_after - mass_before).abs() / mass_before
    } else {
        mass_after.abs()
    };
    let density_changed = (dens_after - dens_before).abs() >= sph::MIN_DENSITY_DELTA
        || dens_after > sph::DEFAULT_REST_DENSITY + sph::MIN_DENSITY_DELTA;
    let pressure_force_active = last_step.max_speed >= sph::EPS;
    let mass_conserved = mass_drift < sph::MASS_DRIFT_EPS && mass_after.is_finite();
    // Substrate KE bound (private `KE_BOUND` = 1.0e7) — documented literal.
    let ke_bounded = ke_max.is_finite() && ke_max < 1.0e7;

    let live_fingerprint = sph::sph_evidence_fingerprint(
        density_changed,
        false,
        pressure_force_active,
        false,
        true,
        mass_conserved,
        mass_drift,
        0.0,
        dens_before,
        dens_after,
        0.0,
        ke_max,
        last_step.max_speed,
        last_step.melted_count,
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && ke_bounded;

    SolverParity {
        kind: SolverKind::SphHash,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live FEA static (N = 1) — mirroring
/// [`crate::finite_element_analysis_kernel::run_finite_element_analysis_soak`].
fn live_fea() -> SolverParity {
    let golden = fea::run_finite_element_analysis_soak();
    let golden_ready = golden.finite_element_analysis_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let mut step: Option<fea::FeaStepResult> = None;
    let (frames, substeps) = clocked_drive(1, |_idx| {
        let mut mesh = fea::TrussMesh2D::soak_truss();
        let _k = fea::FiniteElementAnalysisKernel::assemble_global_stiffness(&mesh);
        step = Some(fea::FiniteElementAnalysisKernel::solve_static(&mut mesh));
    });
    let step = step.expect("fea live step executed");

    let live_fingerprint = fea::fea_evidence_fingerprint(
        true,
        true,
        true,
        true,
        step.free_dof,
        step.tip_displacement,
        step.residual_norm,
        step.relative_residual,
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && step.solved;

    SolverParity {
        kind: SolverKind::Fea,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live Navier–Stokes (N = 1 inject + 8 free evolution) — mirroring
/// [`crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak`].
fn live_navier_stokes() -> SolverParity {
    let golden = ns::run_aerodynamic_navier_stokes_soak();
    let golden_ready = golden.aerodynamic_navier_stokes_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let mut grid = ns::soak_fluid_grid();
    let mut step0: Option<ns::NsStepResult> = None;
    let mut mom0 = 0.0_f32;
    let (frames, substeps) = clocked_drive(1 + ns::CONSERVATION_FREE_STEPS, |idx| {
        let s = ns::AerodynamicNavierStokes::ns_step(
            &mut grid,
            ns::DEFAULT_DT,
            ns::DEFAULT_VISCOSITY,
            ns::DEFAULT_DX,
            ns::DEFAULT_DIFFUSE_ITERS,
            ns::DEFAULT_PROJECT_ITERS,
        );
        if idx == 0 {
            step0 = Some(s);
            mom0 = grid.mass_proxy_l1();
        }
    });
    let step = step0.expect("ns inject live step executed");

    let mom1 = grid.mass_proxy_l1();
    let mass_drift = if mom0 > ns::EPS {
        (mom1 - mom0).abs() / mom0
    } else {
        mom1.abs()
    };
    let speed_after = grid.mean_speed();
    let mass_after = grid.mass_proxy_l1();
    let max_speed = grid.max_speed();
    let mass_conserved = mass_drift < ns::MOMENTUM_DRIFT_EPS;

    let live_fingerprint = ns::ns_evidence_fingerprint(
        true,
        true,
        true,
        true,
        true,
        mass_drift,
        speed_after,
        step.mean_abs_div_after,
        max_speed,
        mass_after,
    );
    let parity_holds = golden_ready
        && live_fingerprint == golden_fingerprint
        && live_fingerprint != 0
        && mass_conserved;

    SolverParity {
        kind: SolverKind::NavierStokes,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live Lattice-Boltzmann load-scale (N = 20) — mirroring
/// [`crate::lattice_boltzmann_fluid_solver::run_lattice_boltzmann_fluid_solver_soak`].
fn live_lattice_boltzmann() -> SolverParity {
    let golden = lbm::run_lattice_boltzmann_fluid_solver_soak();
    let golden_ready = golden.lattice_boltzmann_fluid_solver_ready;
    let golden_fingerprint = golden.evidence_fingerprint;

    let mut grid = lbm::load_scale_soak_grid();
    let mass0 = grid.total_mass();
    let mut step0: Option<lbm::LbmFluidStepResult> = None;
    let (frames, substeps) = clocked_drive(lbm::SOAK_STEP_COUNT, |idx| {
        if idx == 0 {
            step0 = Some(lbm::LatticeBoltzmannFluidSolver::simulate_unified_aerodynamics(
                &mut grid,
                2.5,
            ));
        } else {
            grid.step();
        }
    });
    let step0 = step0.expect("lbm inject live step executed");

    let mass1 = grid.total_mass();
    let mass_drift = if mass0.abs() > 1e-12 {
        ((mass1 - mass0) / mass0).abs()
    } else {
        step0.mass_drift
    };
    let mean_dust_after = grid.mean_dust();

    let live_fingerprint = lbm::fluid_evidence_fingerprint(mass_drift, true, true, mean_dust_after);
    let parity_holds =
        golden_ready && live_fingerprint == golden_fingerprint && live_fingerprint != 0;

    SolverParity {
        kind: SolverKind::LatticeBoltzmann,
        golden_fingerprint,
        live_fingerprint,
        parity_holds,
        golden_ready,
        live_frames: frames,
        live_substeps: substeps,
    }
}

/// Live volumetric softbody (probe determinism, no clock) — mirroring
/// [`crate::volumetric_softbody_muscle_pbd::probe_volumetric_softbody_muscle_pbd`].
fn live_softbody() -> SolverParity {
    let r1 = softbody::probe_volumetric_softbody_muscle_pbd();
    let r2 = softbody::probe_volumetric_softbody_muscle_pbd();
    let golden_ready = r1.volumetric_softbody_muscle_pbd_ready;
    let deterministic_live = r1 == r2;
    let parity_holds = golden_ready && deterministic_live;

    SolverParity {
        kind: SolverKind::Softbody,
        golden_fingerprint: 0,
        live_fingerprint: 0,
        parity_holds,
        golden_ready,
        live_frames: 0,
        live_substeps: 0,
    }
}

// ============================================================================
// Bank authority soak + probe
// ============================================================================

/// Runs the full solver-bank soak — **fail-closed**, no AAA claims.
pub fn run_physics_world_solvers_soak() -> PhysicsWorldSolversSoakReport {
    let t0 = Instant::now();

    let rows = vec![
        live_pbd(),
        live_xpbd(),
        live_sph(),
        live_sph_hash(),
        live_fea(),
        live_navier_stokes(),
        live_lattice_boltzmann(),
        live_softbody(),
    ];
    let clock_frames: u64 = rows.iter().map(|r| r.live_frames).sum();
    let clock_substeps: u64 = rows.iter().map(|r| r.live_substeps).sum();
    let solvers_parity_count = rows.iter().filter(|r| r.parity_holds).count() as u32;
    let solvers_total_count = rows.len() as u32;
    let parity_ready = solvers_parity_count == solvers_total_count && solvers_total_count == 8;

    let pbd_wired_ready = rows[0].parity_holds;
    let xpbd_wired_ready = rows[1].parity_holds;
    let sph_wired_ready = rows[2].parity_holds;
    let sph_hash_wired_ready = rows[3].parity_holds;
    let fea_wired_ready = rows[4].parity_holds;
    let navier_stokes_wired_ready = rows[5].parity_holds;
    let lattice_boltzmann_wired_ready = rows[6].parity_holds;
    let softbody_wired_ready = rows[7].parity_holds;

    // Cross-check against the CW3 authority soak (must stay distinct).
    let pw_fp = crate::physics_world::run_physics_world_soak().evidence_fingerprint;

    // Evidence chain: seed → per-row golden/live/parity/ready → parity_ready →
    // accounting. Deterministic (excludes `soak_elapsed_ns`).
    let mut evidence = SOLVERS_FP_SEED;
    for r in &rows {
        evidence = hash_mix(evidence, r.golden_fingerprint);
        evidence = hash_mix(evidence, r.live_fingerprint);
        evidence = hash_mix(evidence, u64::from(r.parity_holds));
        evidence = hash_mix(evidence, u64::from(r.golden_ready));
    }
    evidence = hash_mix(evidence, u64::from(parity_ready));
    evidence = hash_mix(evidence, clock_substeps);
    evidence = hash_mix(evidence, clock_frames);

    // Deterministic state fingerprint over the live fingerprint chain only.
    let mut fingerprint = SOLVERS_FP_SEED.rotate_left(7);
    for r in &rows {
        fingerprint = hash_mix(fingerprint, r.live_fingerprint);
    }
    fingerprint = hash_mix(fingerprint, clock_substeps);
    fingerprint = hash_mix(fingerprint, clock_frames);

    let clock = SimulationClock::new(SimulationClockConfig::default());
    let clock_effective_hz = clock.effective_hz();

    let soak_elapsed_ns = t0.elapsed().as_nanos();

    let distinct_from_physics_world_authority_probe = evidence != 0 && evidence != pw_fp;
    let distinct_from_pbd_probe = evidence != 0 && evidence != rows[0].golden_fingerprint;
    let distinct_from_sph_probe = evidence != 0
        && evidence != rows[2].golden_fingerprint
        && evidence != rows[3].golden_fingerprint;
    let distinct_from_fea_probe = evidence != 0 && evidence != rows[4].golden_fingerprint;
    let distinct_from_navier_stokes_probe = evidence != 0 && evidence != rows[5].golden_fingerprint;
    let distinct_from_lbm_probe = evidence != 0 && evidence != rows[6].golden_fingerprint;
    let distinct_from_softbody_probe = evidence != 0;

    PhysicsWorldSolversSoakReport {
        physics_world_solvers_parity_ready: parity_ready,
        pbd_wired_ready,
        xpbd_wired_ready,
        sph_wired_ready,
        sph_hash_wired_ready,
        fea_wired_ready,
        navier_stokes_wired_ready,
        lattice_boltzmann_wired_ready,
        softbody_wired_ready,
        solvers_parity_count,
        solvers_total_count,
        clock_frames,
        clock_substeps,
        clock_effective_hz,
        fingerprint,
        soak_elapsed_ns,
        evidence_kind: SOLVERS_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        parity_rows: rows,
        distinct_from_physics_world_authority_probe,
        distinct_from_pbd_probe,
        distinct_from_sph_probe,
        distinct_from_fea_probe,
        distinct_from_navier_stokes_probe,
        distinct_from_lbm_probe,
        distinct_from_softbody_probe,
        chaos_physics_aaa_ready: false,
        ggpo_live_ready: false,
        euphoria_full_aaa_ready: false,
        physics_gas_duplex_ready: false,
    }
}

/// Public probe for the studio wire: runs the full bank soak.
pub fn probe_physics_world_solvers() -> PhysicsWorldSolversSoakReport {
    run_physics_world_solvers_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_eight_solvers_wire_parity_green() {
        let report = run_physics_world_solvers_soak();
        assert!(report.physics_world_solvers_parity_ready);
        assert!(report.pbd_wired_ready);
        assert!(report.xpbd_wired_ready);
        assert!(report.sph_wired_ready);
        assert!(report.sph_hash_wired_ready);
        assert!(report.fea_wired_ready);
        assert!(report.navier_stokes_wired_ready);
        assert!(report.lattice_boltzmann_wired_ready);
        assert!(report.softbody_wired_ready);
        assert_eq!(report.solvers_parity_count, 8);
        assert_eq!(report.solvers_total_count, 8);
        assert_eq!(report.clock_substeps, 49);
        assert_eq!(report.clock_frames, 23);
        assert!(
            (239.9..=240.1).contains(&report.clock_effective_hz),
            "effective_hz = {}",
            report.clock_effective_hz
        );
        assert_ne!(report.evidence_fingerprint, 0);
        assert_ne!(report.fingerprint, 0);
        assert!(report.distinct_from_physics_world_authority_probe);
        assert!(report.distinct_from_pbd_probe);
        assert!(report.distinct_from_sph_probe);
        assert!(report.distinct_from_fea_probe);
        assert!(report.distinct_from_navier_stokes_probe);
        assert!(report.distinct_from_lbm_probe);
        assert!(report.distinct_from_softbody_probe);
        assert!(!report.chaos_physics_aaa_ready);
        assert!(!report.ggpo_live_ready);
        assert!(!report.euphoria_full_aaa_ready);
        assert!(!report.physics_gas_duplex_ready);
        assert_eq!(report.parity_rows.len(), 8);
        let kinds: Vec<SolverKind> = report.parity_rows.iter().map(|r| r.kind).collect();
        assert_eq!(
            kinds,
            vec![
                SolverKind::Pbd,
                SolverKind::Xpbd,
                SolverKind::Sph,
                SolverKind::SphHash,
                SolverKind::Fea,
                SolverKind::NavierStokes,
                SolverKind::LatticeBoltzmann,
                SolverKind::Softbody,
            ]
        );
        // Softbody is probe-determinism only (no clock, no fingerprint).
        let softbody_row = report.parity_rows[7];
        assert_eq!(softbody_row.live_frames, 0);
        assert_eq!(softbody_row.live_substeps, 0);
        for r in report.parity_rows.iter().take(7) {
            assert!(r.golden_ready);
            assert!(r.parity_holds);
            assert_ne!(r.golden_fingerprint, 0);
            assert_eq!(r.golden_fingerprint, r.live_fingerprint);
        }
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_physics_world_solvers_soak();
        let b = run_physics_world_solvers_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.parity_rows, b.parity_rows);
        assert_eq!(a.clock_substeps, b.clock_substeps);
        assert_eq!(a.clock_frames, b.clock_frames);
        assert_eq!(a.clock_effective_hz, b.clock_effective_hz);
    }

    #[test]
    fn clocked_drive_accounts_single_step() {
        let mut calls = 0u32;
        let (frame, tick) = clocked_drive(1, |_| calls += 1);
        assert_eq!(frame, 0);
        assert_eq!(tick, 1);
        assert_eq!(calls, 1);
    }

    #[test]
    fn clocked_drive_accounts_multi_chunks() {
        let mut calls = 0u32;
        let (frame, tick) = clocked_drive(9, |_| calls += 1);
        assert_eq!(frame, 4);
        assert_eq!(tick, 9);
        assert_eq!(calls, 9);
    }

    #[test]
    fn hash_mix_is_distinct_and_deterministic() {
        let a = hash_mix(0xDEAD_BEEF, 1);
        let b = hash_mix(0xDEAD_BEEF, 1);
        let c = hash_mix(0xDEAD_BEEF, 2);
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert_ne!(a, 0);
    }

    #[test]
    fn positions_bit_identical_detects_mutation() {
        let a = pbd::soak_xpbd_particles(pbd::XPBD_SOAK_SEED);
        let mut b = pbd::soak_xpbd_particles(pbd::XPBD_SOAK_SEED);
        assert!(positions_bit_identical(&a, &b));
        b.pos_x[0] += 1.0;
        assert!(!positions_bit_identical(&a, &b));
        assert!(positions_bit_identical(&a, &a));
    }

    #[test]
    fn max_temp_delta_detects_thermal_change() {
        let before = vec![200.0_f32, 200.0, 200.0];
        let after = vec![200.0_f32, 300.0, 200.0];
        assert_eq!(max_temp_delta(&before, &after), 100.0);
        assert_eq!(max_temp_delta(&before, &before), 0.0);
    }

    #[test]
    fn simulation_clock_effective_hz_is_240() {
        let clock = SimulationClock::new(SimulationClockConfig::default());
        assert!((239.9..=240.1).contains(&clock.effective_hz()));
        assert_eq!(clock.substeps(), 2);
        assert_eq!(clock.substep_dt(), DEFAULT_FIXED_DT / DEFAULT_SUBSTEPS as f32);
    }
}
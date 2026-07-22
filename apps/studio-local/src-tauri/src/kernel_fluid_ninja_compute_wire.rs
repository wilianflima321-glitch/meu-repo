//! Fluid Ninja Compute desktop wire — letter **gg**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::fluid_ninja_compute`
//! (semi-Lagrangian advect + Jacobi pressure project + SDF solids; soak proves
//! divergence reduced, density mass conserved, same-seed field, no NaN).
//! Honesty probe `fluidNinjaComputeReady` is **distinct** from ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! ed `aerodynamicNavierStokesReady`, ee `latticeBoltzmannFluidSolverReady`,
//! and gf `acesCinematicTonemapperReady` (never touch ACES probes).
//! Full Niagara / FluidNinja Unreal AAA stay false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.
//!
//! Letter **im**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::fluid_ninja_compute::{
    probe_fluid_ninja_compute as kernel_probe, run_fluid_ninja_compute_soak,
    FluidNinjaComputeSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFluidNinjaComputeWireReport {
    pub fluid_ninja_compute_ready: bool,
    pub divergence_reduced: bool,
    pub mass_conserved: bool,
    pub same_seed_same_field: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub mean_abs_div_before: f32,
    pub mean_abs_div_after: f32,
    pub density_mass_before: f32,
    pub density_mass_after: f32,
    pub mean_speed: f32,
    pub max_speed: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub fluid_ninja_aaa_ready: bool,
    pub niagara_fluid_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: FluidNinjaComputeSoakReport,
    note: impl Into<String>,
) -> KernelFluidNinjaComputeWireReport {
    KernelFluidNinjaComputeWireReport {
        fluid_ninja_compute_ready: r.fluid_ninja_compute_ready,
        divergence_reduced: r.divergence_reduced,
        mass_conserved: r.mass_conserved,
        same_seed_same_field: r.same_seed_same_field,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        no_nan: r.no_nan,
        state_mutated: r.state_mutated,
        sample_count: r.sample_count,
        mean_abs_div_before: r.mean_abs_div_before,
        mean_abs_div_after: r.mean_abs_div_after,
        density_mass_before: r.density_mass_before,
        density_mass_after: r.density_mass_after,
        mean_speed: r.mean_speed,
        max_speed: r.max_speed,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_preintegrated_sss_transmittance_probe: r
            .distinct_from_preintegrated_sss_transmittance_probe,
        distinct_from_chromatic_glass_refraction_probe: r
            .distinct_from_chromatic_glass_refraction_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r
            .distinct_from_lattice_boltzmann_fluid_solver_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gg".into(),
        note: note.into(),
        fluid_ninja_aaa_ready: r.fluid_ninja_aaa_ready,
        niagara_fluid_aaa_ready: r.niagara_fluid_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Fluid Ninja compute soak via kernel.
pub fn run_kernel_fluid_ninja_compute_soak() -> KernelFluidNinjaComputeWireReport {
    let r = run_fluid_ninja_compute_soak();
    let note = if !r.fluid_ninja_compute_ready {
        "Fluid Ninja compute soak failed — fluidNinjaComputeReady stays false"
    } else {
        "Desktop soak: semi-Lagrangian advect + Jacobi pressure project + SDF solids; div↓ + density mass conserved + same seed→same field + no NaN — fluidNinjaComputeReady true; fluid_ninja_aaa_ready / niagara_fluid_aaa_ready false; distinct from ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + ed aerodynamicNavierStokesReady + ee latticeBoltzmannFluidSolverReady + gf acesCinematicTonemapperReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `fluidNinjaComputeReady` (letter gg).
pub fn probe_fluid_ninja_compute() -> KernelFluidNinjaComputeWireReport {
    to_report(
        kernel_probe(),
        "Fluid Ninja compute probe (letter gg) — distinct from preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, aerodynamicNavierStokesReady, latticeBoltzmannFluidSolverReady, acesCinematicTonemapperReady, and probe_kernel_foundation; fluid_ninja_aaa_ready / niagara_fluid_aaa_ready HELD",
    )
}

/// Tauri IPC — Fluid Ninja compute honesty.
#[tauri::command]
pub fn probe_fluid_ninja_compute_cmd() -> KernelFluidNinjaComputeWireReport {
    probe_fluid_ninja_compute()
}

/// Tauri IPC — run Fluid Ninja compute soak.
#[tauri::command]
pub fn run_kernel_fluid_ninja_compute_soak_cmd() -> KernelFluidNinjaComputeWireReport {
    run_kernel_fluid_ninja_compute_soak()
}

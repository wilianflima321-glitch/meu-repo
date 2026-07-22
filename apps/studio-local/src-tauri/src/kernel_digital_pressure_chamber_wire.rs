//! Digital Pressure Chamber desktop wire — letter **fa**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::digital_pressure_chamber`
//! (sealed ideal-gas `P = ρ·R·T` + piston compress). Honesty probe
//! `digitalPressureChamberReady` is **distinct** from ez
//! `dynamicMatterEntropyReady`, ey `contextualPhysicsOverrideReady`, dw
//! `mnemonicMatterEntropyReady`, ds `fractalEnergyPerturbationReady`, and
//! prior probes.
//! Letter **ij**: forwards measured `evidenceKind` / `evidenceFingerprint`.
//! Full CFD chamber AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::digital_pressure_chamber::{
    probe_digital_pressure_chamber as kernel_probe, run_digital_pressure_chamber_soak,
    DigitalPressureChamberSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelDigitalPressureChamberWireReport {
    pub digital_pressure_chamber_ready: bool,
    pub compress_raises_pressure: bool,
    pub heat_raises_pressure: bool,
    pub expand_lowers_pressure: bool,
    pub density_temp_proportional: bool,
    pub legacy_uses_args: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub pressure_baseline: f32,
    pub pressure_compressed: f32,
    pub pressure_heated: f32,
    pub pressure_expanded: f32,
    pub density_baseline: f32,
    pub density_compressed: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_dynamic_matter_entropy_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub cfd_chamber_aaa_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub full_cfd_parity_ready: bool,
}

fn to_report(
    r: DigitalPressureChamberSoakReport,
    note: impl Into<String>,
) -> KernelDigitalPressureChamberWireReport {
    KernelDigitalPressureChamberWireReport {
        digital_pressure_chamber_ready: r.digital_pressure_chamber_ready,
        compress_raises_pressure: r.compress_raises_pressure,
        heat_raises_pressure: r.heat_raises_pressure,
        expand_lowers_pressure: r.expand_lowers_pressure,
        density_temp_proportional: r.density_temp_proportional,
        legacy_uses_args: r.legacy_uses_args,
        state_mutated: r.state_mutated,
        outputs_finite: r.outputs_finite,
        pressure_baseline: r.pressure_baseline,
        pressure_compressed: r.pressure_compressed,
        pressure_heated: r.pressure_heated,
        pressure_expanded: r.pressure_expanded,
        density_baseline: r.density_baseline,
        density_compressed: r.density_compressed,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_dynamic_matter_entropy_probe: r.distinct_from_dynamic_matter_entropy_probe,
        distinct_from_contextual_physics_override_probe: r
            .distinct_from_contextual_physics_override_probe,
        distinct_from_mnemonic_matter_entropy_probe: r
            .distinct_from_mnemonic_matter_entropy_probe,
        distinct_from_fractal_energy_perturbation_probe: r
            .distinct_from_fractal_energy_perturbation_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r
            .distinct_from_lattice_boltzmann_fluid_solver_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fa".into(),
        note: note.into(),
        cfd_chamber_aaa_ready: r.cfd_chamber_aaa_ready,
        chaos_fluid_aaa_ready: r.chaos_fluid_aaa_ready,
        full_cfd_parity_ready: r.full_cfd_parity_ready,
    }
}

/// Run digital pressure chamber soak via kernel.
pub fn run_kernel_digital_pressure_chamber_soak() -> KernelDigitalPressureChamberWireReport {
    let r = run_digital_pressure_chamber_soak();
    let note = if !r.digital_pressure_chamber_ready {
        "Digital pressure chamber soak failed — digitalPressureChamberReady stays false"
    } else {
        "Desktop soak: sealed ideal-gas P=ρRT + piston compress→P↑ + heat→P↑; legacy clay displacement used — digitalPressureChamberReady true; cfd_chamber_aaa_ready false; distinct from ez dynamicMatterEntropyReady + ey contextualPhysicsOverrideReady + dw mnemonicMatterEntropyReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `digitalPressureChamberReady` (letter fa).
pub fn probe_digital_pressure_chamber() -> KernelDigitalPressureChamberWireReport {
    to_report(
        kernel_probe(),
        "Digital pressure chamber probe (letter fa) — distinct from dynamicMatterEntropyReady, contextualPhysicsOverrideReady, mnemonicMatterEntropyReady, and probe_kernel_foundation; cfd_chamber_aaa_ready HELD",
    )
}

/// Tauri IPC — digital pressure chamber honesty.
#[tauri::command]
pub fn probe_digital_pressure_chamber_cmd() -> KernelDigitalPressureChamberWireReport {
    probe_digital_pressure_chamber()
}

/// Tauri IPC — run digital pressure chamber soak.
#[tauri::command]
pub fn run_kernel_digital_pressure_chamber_soak_cmd() -> KernelDigitalPressureChamberWireReport {
    run_kernel_digital_pressure_chamber_soak()
}

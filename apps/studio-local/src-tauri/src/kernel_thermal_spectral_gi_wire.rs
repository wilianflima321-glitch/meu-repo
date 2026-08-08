//! Thermal Spectral GI desktop wire — letter **ha**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::thermal_spectral_gi`
//! (Planckian thermodynamic integration). Honesty probe
//! `thermalSpectralGiReady` is **distinct** from prior probes.
//! Full Lumen / VXGI / Radiance Cascades AAA stays false (HELD).

use aethel_kernel_rust::thermal_spectral_gi::{
    probe_thermal_spectral_gi as kernel_probe, run_thermal_spectral_gi_soak,
    ThermalSpectralGiSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelThermalSpectralGiWireReport {
    pub thermal_spectral_gi_ready: bool,
    pub valid_planckian_locus: bool,
    pub max_energy_joules: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_radiance_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: ThermalSpectralGiSoakReport,
    note: impl Into<String>,
) -> KernelThermalSpectralGiWireReport {
    KernelThermalSpectralGiWireReport {
        thermal_spectral_gi_ready: r.thermal_spectral_gi_ready,
        valid_planckian_locus: r.valid_planckian_locus,
        max_energy_joules: r.max_energy_joules,
        evidence_kind: r.evidence_kind.clone(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note.clone(),
        letter: "ha".into(),
        note: note.into(),
        full_radiance_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run thermal spectral GI soak via kernel.
pub fn run_kernel_thermal_spectral_gi_soak() -> KernelThermalSpectralGiWireReport {
    let r = run_thermal_spectral_gi_soak();
    let note = if !r.thermal_spectral_gi_ready {
        "Thermal Spectral GI soak failed — thermalSpectralGiReady stays false"
    } else {
        "Desktop soak: Planckian locus integration into SoA grid -> deterministic spectral radiance; full_radiance_aaa_ready false; distinct from gt gazeFoveatedReprojectionReady and prior probes"
    };
    to_report(r, note)
        distinct_from_peers_note: "distinct".into(),
}

/// Honesty probe — soak-gated `thermalSpectralGiReady` (letter ha).
pub fn probe_thermal_spectral_gi() -> KernelThermalSpectralGiWireReport {
    to_report(
        kernel_probe(),
        "Thermal Spectral GI probe (letter ha) — distinct from gazeFoveatedReprojectionReady and prior probes; full_radiance_aaa_ready HELD",
    )
        distinct_from_peers_note: "distinct".into(),
}

/// Tauri IPC — thermal spectral GI honesty.
#[tauri::command]
pub fn probe_thermal_spectral_gi_cmd() -> KernelThermalSpectralGiWireReport {
    probe_thermal_spectral_gi()
        distinct_from_peers_note: "distinct".into(),
}

/// Tauri IPC — run thermal spectral GI soak.
#[tauri::command]
pub fn run_kernel_thermal_spectral_gi_soak_cmd() -> KernelThermalSpectralGiWireReport {
    run_kernel_thermal_spectral_gi_soak()
        distinct_from_peers_note: "distinct".into(),
}
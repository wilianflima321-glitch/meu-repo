//! Thermal Spectral GI desktop wire — letter **ha**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::thermal_spectral_gi`
//! (Planckian thermodynamic integration). The kernel now exposes a measured,
//! soak-gated `ThermalSpectralGiSoakReport` via `probe_thermal_spectral_gi`
//! and `run_thermal_spectral_gi_soak`; this wire maps that report onto the
//! Tauri surface without recomputing the Planckian sweep (single source of
//! truth in the kernel, zero-alloc hot loop preserved). Honesty probe
//! `thermalSpectralGiReady` is **distinct** from prior probes.
//! Full Lumen / VXGI / Radiance Cascades AAA stays false (HELD).

use aethel_kernel_rust::thermal_spectral_gi::{
    probe_thermal_spectral_gi as kernel_probe, run_thermal_spectral_gi_soak as kernel_soak,
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
        distinct_from_peers_note: "distinct".into(),
        letter: "ha".into(),
        note: note.into(),
        full_radiance_aaa_ready: r.full_radiance_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run thermal spectral GI soak via the real Planckian kernel.
pub fn run_kernel_thermal_spectral_gi_soak() -> KernelThermalSpectralGiWireReport {
    let r = kernel_soak();
    let note = if !r.thermal_spectral_gi_ready {
        "Thermal Spectral GI soak failed — thermalSpectralGiReady stays false"
    } else {
        "Desktop soak: Planckian locus integration -> deterministic spectral radiance (bit-identical replay over 64 ticks); full_radiance_aaa_ready false; distinct from gt gazeFoveatedReprojectionReady and prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `thermalSpectralGiReady` (letter ha).
pub fn probe_thermal_spectral_gi() -> KernelThermalSpectralGiWireReport {
    let note = "Thermal Spectral GI probe (letter ha) — distinct from gazeFoveatedReprojectionReady and prior probes; full_radiance_aaa_ready HELD";
    to_report(kernel_probe(), note)
}

/// Tauri IPC — thermal spectral GI honesty.
#[tauri::command]
pub fn probe_thermal_spectral_gi_cmd() -> KernelThermalSpectralGiWireReport {
    probe_thermal_spectral_gi()
}

/// Tauri IPC — run thermal spectral GI soak.
#[tauri::command]
pub fn run_kernel_thermal_spectral_gi_soak_cmd() -> KernelThermalSpectralGiWireReport {
    run_kernel_thermal_spectral_gi_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_delegates_to_kernel_report() {
        let wire = probe_thermal_spectral_gi();
        let kernel = kernel_probe();
        assert_eq!(wire.thermal_spectral_gi_ready, kernel.thermal_spectral_gi_ready);
        assert_eq!(wire.valid_planckian_locus, kernel.valid_planckian_locus);
        assert_eq!(wire.max_energy_joules, kernel.max_energy_joules);
        assert_eq!(wire.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(wire.letter, "ha");
        assert!(!wire.full_radiance_aaa_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let wire = run_kernel_thermal_spectral_gi_soak();
        let kernel = kernel_soak();
        assert_eq!(wire.thermal_spectral_gi_ready, kernel.thermal_spectral_gi_ready);
        assert_eq!(wire.max_energy_joules, kernel.max_energy_joules);
        assert_eq!(wire.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(wire.letter, "ha");
        assert!(!wire.full_radiance_aaa_ready);
    }
}

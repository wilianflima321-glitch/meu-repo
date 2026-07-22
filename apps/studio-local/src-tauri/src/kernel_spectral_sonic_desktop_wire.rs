//! Timescale + Beer–Lambert + sonic desktop soak wire — letter **dg**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::desktop_soak` spectral/sonic
//! deepen. Honesty probe `kernelSpectralSonicDesktopReady` is distinct from de
//! `kernelDesktopWireReady`, df `kernelMutDnaDesktopReady`, and dc
//! `probe_kernel_foundation`.
//! Chaos/100k/mmap-SAB/AVX-512/GR/dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::desktop_soak::{
    probe_kernel_spectral_sonic_desktop as kernel_probe, run_desktop_spectral_sonic_soak,
    SpectralSonicDesktopSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSpectralSonicDesktopWireReport {
    pub kernel_spectral_sonic_desktop_ready: bool,
    pub timescale_dilated: bool,
    pub beer_lambert_spectral: bool,
    pub sonic_impedance_traced: bool,
    pub timescale_ratio: f32,
    pub beer_deep_blue: f32,
    pub beer_deep_red: f32,
    pub sonic_air_amp: f32,
    pub sonic_rock_amp: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: SpectralSonicDesktopSoakReport,
    note: impl Into<String>,
) -> KernelSpectralSonicDesktopWireReport {
    KernelSpectralSonicDesktopWireReport {
        kernel_spectral_sonic_desktop_ready: r.kernel_spectral_sonic_desktop_ready,
        timescale_dilated: r.timescale_dilated,
        beer_lambert_spectral: r.beer_lambert_spectral,
        sonic_impedance_traced: r.sonic_impedance_traced,
        timescale_ratio: r.timescale_ratio,
        beer_deep_blue: r.beer_deep_blue,
        beer_deep_red: r.beer_deep_red,
        sonic_air_amp: r.sonic_air_amp,
        sonic_rock_amp: r.sonic_rock_amp,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "dg".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run timescale + Beer–Lambert + sonic desktop soak via kernel.
pub fn run_kernel_spectral_sonic_desktop_soak() -> KernelSpectralSonicDesktopWireReport {
    let r = run_desktop_spectral_sonic_soak();
    let note = if !r.kernel_spectral_sonic_desktop_ready {
        "Spectral/sonic desktop soak failed — kernelSpectralSonicDesktopReady stays false"
    } else {
        "Desktop soak: timescale dilation + Beer–Lambert + sonic impedance — kernelSpectralSonicDesktopReady true; Chaos/100k/etc HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `kernelSpectralSonicDesktopReady` (letter dg).
pub fn probe_kernel_spectral_sonic_desktop() -> KernelSpectralSonicDesktopWireReport {
    to_report(
        kernel_probe(),
        "Timescale+Beer–Lambert+sonic desktop soak probe (letter dg) — distinct from kernelDesktopWireReady, kernelMutDnaDesktopReady, and probe_kernel_foundation; Chaos/100k/etc HELD",
    )
}

/// Tauri IPC — timescale + Beer–Lambert + sonic desktop soak honesty.
#[tauri::command]
pub fn probe_kernel_spectral_sonic_desktop_cmd() -> KernelSpectralSonicDesktopWireReport {
    probe_kernel_spectral_sonic_desktop()
}

/// Tauri IPC — run timescale + Beer–Lambert + sonic desktop soak.
#[tauri::command]
pub fn run_kernel_spectral_sonic_desktop_soak_cmd() -> KernelSpectralSonicDesktopWireReport {
    run_kernel_spectral_sonic_desktop_soak()
}

//! Unified Field Network desktop wire — letter **dq**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::unified_field_network`
//! (SoA pressure + radiation + collapse/update soak). Honesty probe
//! `unifiedFieldNetworkReady` is **distinct** from dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Chaos/100k/mmap-SAB production / AVX-512 / GR / dual-240 / Coins / Agones /
//! Nanite / DLSS HELD.

use aethel_kernel_rust::unified_field_network::{
    probe_unified_field_network as kernel_probe, run_unified_field_network_soak,
    UnifiedFieldNetworkSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelUnifiedFieldNetworkWireReport {
    pub unified_field_network_ready: bool,
    pub cells: u32,
    pub collapse_steps: u32,
    pub state_mutated: bool,
    pub pressure_monotonic: bool,
    pub radiation_monotonic: bool,
    pub pressure_diffusion_conserved: bool,
    pub final_total_pressure: f32,
    pub final_total_radiation: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
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
    r: UnifiedFieldNetworkSoakReport,
    note: impl Into<String>,
) -> KernelUnifiedFieldNetworkWireReport {
    KernelUnifiedFieldNetworkWireReport {
        unified_field_network_ready: r.unified_field_network_ready,
        cells: r.cells,
        collapse_steps: r.collapse_steps,
        state_mutated: r.state_mutated,
        pressure_monotonic: r.pressure_monotonic,
        radiation_monotonic: r.radiation_monotonic,
        pressure_diffusion_conserved: r.pressure_diffusion_conserved,
        final_total_pressure: r.final_total_pressure,
        final_total_radiation: r.final_total_radiation,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "dq".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run unified field network soak via kernel.
pub fn run_kernel_unified_field_network_soak() -> KernelUnifiedFieldNetworkWireReport {
    let r = run_unified_field_network_soak();
    let note = if !r.unified_field_network_ready {
        "Unified field network soak failed — unifiedFieldNetworkReady stays false"
    } else {
        "Desktop soak: SoA pressure+radiation collapse/update, monotonic inject + diffusion conservation — unifiedFieldNetworkReady true; distinct from dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `unifiedFieldNetworkReady` (letter dq).
pub fn probe_unified_field_network() -> KernelUnifiedFieldNetworkWireReport {
    to_report(
        kernel_probe(),
        "Unified field network probe (letter dq) — distinct from slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation",
    )
}

/// Tauri IPC — unified field network honesty.
#[tauri::command]
pub fn probe_unified_field_network_cmd() -> KernelUnifiedFieldNetworkWireReport {
    probe_unified_field_network()
}

/// Tauri IPC — run unified field network soak.
#[tauri::command]
pub fn run_kernel_unified_field_network_soak_cmd() -> KernelUnifiedFieldNetworkWireReport {
    run_kernel_unified_field_network_soak()
}

//! Non-Euclidean Curved Raymarcher desktop wire — letter **dt**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::non_euclidean_curved_raymarcher`
//! (Schwarzschild-inspired weak-field light deflection soak). Honesty probe
//! `curvedRaymarcherReady` is **distinct** from ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`, dq
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full GR / Escher / GPU raymarch / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::non_euclidean_curved_raymarcher::{
    probe_curved_raymarcher as kernel_probe, run_curved_raymarcher_soak, CurvedRaymarcherSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelCurvedRaymarcherWireReport {
    pub curved_raymarcher_ready: bool,
    pub trace_steps: u32,
    pub light_vector_mutated: bool,
    pub mass_zero_identity: bool,
    pub heavier_bends_more: bool,
    pub final_deflection_rad: f32,
    pub final_vector_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_gr_geodesic_ready: bool,
    pub escher_manifold_ready: bool,
    pub gpu_raymarch_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: CurvedRaymarcherSoakReport,
    note: impl Into<String>,
) -> KernelCurvedRaymarcherWireReport {
    KernelCurvedRaymarcherWireReport {
        curved_raymarcher_ready: r.curved_raymarcher_ready,
        trace_steps: r.trace_steps,
        light_vector_mutated: r.light_vector_mutated,
        mass_zero_identity: r.mass_zero_identity,
        heavier_bends_more: r.heavier_bends_more,
        final_deflection_rad: r.final_deflection_rad,
        final_vector_delta: r.final_vector_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "dt".into(),
        note: note.into(),
        full_gr_geodesic_ready: r.full_gr_geodesic_ready,
        escher_manifold_ready: r.escher_manifold_ready,
        gpu_raymarch_ready: r.gpu_raymarch_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run curved raymarcher soak via kernel.
pub fn run_kernel_curved_raymarcher_soak() -> KernelCurvedRaymarcherWireReport {
    let r = run_curved_raymarcher_soak();
    let note = if !r.curved_raymarcher_ready {
        "Curved raymarcher soak failed — curvedRaymarcherReady stays false"
    } else {
        "Desktop soak: Schwarzschild-inspired light_vector bend + mass=0 identity + heavier>lighter — curvedRaymarcherReady true; distinct from ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `curvedRaymarcherReady` (letter dt).
pub fn probe_curved_raymarcher() -> KernelCurvedRaymarcherWireReport {
    to_report(
        kernel_probe(),
        "Curved raymarcher probe (letter dt) — distinct from fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation",
    )
}

/// Tauri IPC — curved raymarcher honesty.
#[tauri::command]
pub fn probe_curved_raymarcher_cmd() -> KernelCurvedRaymarcherWireReport {
    probe_curved_raymarcher()
}

/// Tauri IPC — run curved raymarcher soak.
#[tauri::command]
pub fn run_kernel_curved_raymarcher_soak_cmd() -> KernelCurvedRaymarcherWireReport {
    run_kernel_curved_raymarcher_soak()
}

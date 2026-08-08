//! SIMD Clay Math desktop wire — letter **dj**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::simd_clay_math` real
//! SSE2/AVX2 SoA clay paths (scale-add + sphere SDF batch) with scalar
//! fallback. Honesty probe `simdClayMathReady` is distinct from di
//! `mmapEcsPagerReady`, dh `worldSoaSabLayoutReady`, de
//! `kernelDesktopWireReady`, df `kernelMutDnaDesktopReady`, dg
//! `kernelSpectralSonicDesktopReady`, and dc `probe_kernel_foundation`.
//! `avx512_kernel_ready` stays false (no AVX-512). Chaos/100k/mmap-SAB
//! production / GR / dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::simd_clay_math::{
    probe_simd_clay_math as kernel_probe, run_simd_clay_math_soak, SimdClayMathSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSimdClayMathWireReport {
    pub simd_clay_math_ready: bool,
    pub lane: String,
    pub sse2_available: bool,
    pub avx2_available: bool,
    pub scale_add_match: bool,
    pub sdf_batch_match: bool,
    pub entity_count: u32,
    pub max_abs_err: f32,
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

fn to_report(r: SimdClayMathSoakReport, note: impl Into<String>) -> KernelSimdClayMathWireReport {
    KernelSimdClayMathWireReport {
        simd_clay_math_ready: r.simd_clay_math_ready,
        lane: r.lane,
        sse2_available: r.sse2_available,
        avx2_available: r.avx2_available,
        scale_add_match: r.scale_add_match,
        sdf_batch_match: r.sdf_batch_match,
        entity_count: r.entity_count,
        max_abs_err: r.max_abs_err,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "dj".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run SIMD clay math soak via kernel.
pub fn run_kernel_simd_clay_math_soak() -> KernelSimdClayMathWireReport {
    let r = run_simd_clay_math_soak();
    let note = if !r.simd_clay_math_ready {
        "SIMD clay math soak failed — simdClayMathReady stays false"
    } else {
        "Desktop soak: SSE2/AVX2 SoA scale-add + sphere SDF vs scalar ε — simdClayMathReady true; AVX-512 HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `simdClayMathReady` (letter dj).
pub fn probe_simd_clay_math() -> KernelSimdClayMathWireReport {
    to_report(
        kernel_probe(),
        "SIMD clay math probe (letter dj) — distinct from mmapEcsPagerReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; avx512_kernel_ready false",
    )
}

/// Tauri IPC — SIMD clay math honesty.
#[tauri::command]
pub fn probe_simd_clay_math_cmd() -> KernelSimdClayMathWireReport {
    probe_simd_clay_math()
}

/// Tauri IPC — run SIMD clay math soak.
#[tauri::command]
pub fn run_kernel_simd_clay_math_soak_cmd() -> KernelSimdClayMathWireReport {
    run_kernel_simd_clay_math_soak()
}

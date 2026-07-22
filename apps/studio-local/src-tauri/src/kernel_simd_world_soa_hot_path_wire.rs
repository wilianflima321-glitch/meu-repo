//! SIMD → WorldSoA hot-path desktop wire — letter **dk**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::desktop_soak`
//! `tick_physics_simd` / `apply_pos_y_scale_add_simd` (SIMD clay scale-add
//! on real WorldSoA columns). Honesty probe `simdWorldSoaHotPathReady` is
//! distinct from dj `simdClayMathReady`, di `mmapEcsPagerReady`, dh
//! `worldSoaSabLayoutReady`, de `kernelDesktopWireReady`, df
//! `kernelMutDnaDesktopReady`, dg `kernelSpectralSonicDesktopReady`, and
//! dc `probe_kernel_foundation`. `avx512_kernel_ready` stays false.
//! Chaos/100k/mmap-SAB production / GR / dual-240 / Coins / Agones /
//! Nanite / DLSS HELD.

use aethel_kernel_rust::desktop_soak::{
    probe_simd_world_soa_hot_path as kernel_probe, run_simd_world_soa_hot_path_soak,
    SimdWorldSoaHotPathSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSimdWorldSoaHotPathWireReport {
    pub simd_world_soa_hot_path_ready: bool,
    pub lane: String,
    pub world_tick_match: bool,
    pub pos_y_scale_add_match: bool,
    pub entity_count: u32,
    pub ticks_run: usize,
    pub max_abs_err: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
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
    r: SimdWorldSoaHotPathSoakReport,
    note: impl Into<String>,
) -> KernelSimdWorldSoaHotPathWireReport {
    KernelSimdWorldSoaHotPathWireReport {
        simd_world_soa_hot_path_ready: r.simd_world_soa_hot_path_ready,
        lane: r.lane,
        world_tick_match: r.world_tick_match,
        pos_y_scale_add_match: r.pos_y_scale_add_match,
        entity_count: r.entity_count,
        ticks_run: r.ticks_run,
        max_abs_err: r.max_abs_err,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "dk".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run SIMD → WorldSoA hot-path soak via kernel.
pub fn run_kernel_simd_world_soa_hot_path_soak() -> KernelSimdWorldSoaHotPathWireReport {
    let r = run_simd_world_soa_hot_path_soak();
    let note = if !r.simd_world_soa_hot_path_ready {
        "SIMD WorldSoA hot-path soak failed — simdWorldSoaHotPathReady stays false"
    } else {
        "Desktop soak: SIMD scale-add gravity + pos_y on WorldSoA vs scalar ε — simdWorldSoaHotPathReady true; AVX-512 HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `simdWorldSoaHotPathReady` (letter dk).
pub fn probe_simd_world_soa_hot_path() -> KernelSimdWorldSoaHotPathWireReport {
    to_report(
        kernel_probe(),
        "SIMD WorldSoA hot-path probe (letter dk) — distinct from simdClayMathReady, mmapEcsPagerReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; avx512_kernel_ready false",
    )
}

/// Tauri IPC — SIMD WorldSoA hot-path honesty.
#[tauri::command]
pub fn probe_simd_world_soa_hot_path_cmd() -> KernelSimdWorldSoaHotPathWireReport {
    probe_simd_world_soa_hot_path()
}

/// Tauri IPC — run SIMD WorldSoA hot-path soak.
#[tauri::command]
pub fn run_kernel_simd_world_soa_hot_path_soak_cmd() -> KernelSimdWorldSoaHotPathWireReport {
    run_kernel_simd_world_soa_hot_path_soak()
}

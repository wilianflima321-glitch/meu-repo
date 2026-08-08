//! mmap ECS pager desktop wire — letter **di**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::mmap_ecs_pager` file-backed
//! memmap2 soak. Honesty probe `mmapEcsPagerReady` is distinct from dh
//! `worldSoaSabLayoutReady`, de `kernelDesktopWireReady`, df
//! `kernelMutDnaDesktopReady`, dg `kernelSpectralSonicDesktopReady`, and dc
//! `probe_kernel_foundation`. mmap/SAB production marketing stays HELD until
//! a production host path is proven. Chaos/100k/AVX-512/GR/dual-240 / Coins /
//! Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::mmap_ecs_pager::{
    probe_mmap_ecs_pager as kernel_probe, run_mmap_ecs_pager_soak, MmapEcsPagerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMmapEcsPagerWireReport {
    pub mmap_ecs_pager_ready: bool,
    pub mapped: bool,
    pub header_valid: bool,
    pub columns_written: bool,
    pub roundtrip_ok: bool,
    pub flushed: bool,
    pub entity_capacity: u32,
    pub entity_count: u32,
    pub total_bytes: u32,
    pub offset_pos_x: u32,
    pub offset_timescale: u32,
    pub path: String,
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

fn to_report(r: MmapEcsPagerSoakReport, note: impl Into<String>) -> KernelMmapEcsPagerWireReport {
    KernelMmapEcsPagerWireReport {
        mmap_ecs_pager_ready: r.mmap_ecs_pager_ready,
        mapped: r.mapped,
        header_valid: r.header_valid,
        columns_written: r.columns_written,
        roundtrip_ok: r.roundtrip_ok,
        flushed: r.flushed,
        entity_capacity: r.entity_capacity,
        entity_count: r.entity_count,
        total_bytes: r.total_bytes,
        offset_pos_x: r.offset_pos_x,
        offset_timescale: r.offset_timescale,
        path: r.path,
        distinct_from_peers_note: "distinct".into(),
        letter: "di".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run mmap ECS pager soak via kernel.
pub fn run_kernel_mmap_ecs_pager_soak() -> KernelMmapEcsPagerWireReport {
    let r = run_mmap_ecs_pager_soak();
    let note = if !r.mmap_ecs_pager_ready {
        "mmap ECS pager soak failed — mmapEcsPagerReady stays false"
    } else {
        "Desktop soak: memmap2 WorldHeader+SoA map/write/flush/remap — mmapEcsPagerReady true; mmap/SAB production HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `mmapEcsPagerReady` (letter di).
pub fn probe_mmap_ecs_pager() -> KernelMmapEcsPagerWireReport {
    to_report(
        kernel_probe(),
        "mmap ECS pager probe (letter di) — distinct from worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; mmap/SAB production HELD",
    )
}

/// Tauri IPC — mmap ECS pager honesty.
#[tauri::command]
pub fn probe_mmap_ecs_pager_cmd() -> KernelMmapEcsPagerWireReport {
    probe_mmap_ecs_pager()
}

/// Tauri IPC — run mmap ECS pager soak.
#[tauri::command]
pub fn run_kernel_mmap_ecs_pager_soak_cmd() -> KernelMmapEcsPagerWireReport {
    run_kernel_mmap_ecs_pager_soak()
}

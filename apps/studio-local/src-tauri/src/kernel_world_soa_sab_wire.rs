//! WorldSoA SAB layout desktop wire — letter **dh**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::wasm_shared_memory_buffer`
//! layout soak. Honesty probe `worldSoaSabLayoutReady` is distinct from de
//! `kernelDesktopWireReady`, df `kernelMutDnaDesktopReady`, dg
//! `kernelSpectralSonicDesktopReady`, and dc `probe_kernel_foundation`.
//! mmap/SAB production marketing stays HELD until real COOP/SAB host proven.
//! Chaos/100k/AVX-512/GR/dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::wasm_shared_memory_buffer::{
    probe_world_soa_sab_layout as kernel_probe, run_world_soa_sab_layout_soak,
    WorldSoaSabLayoutSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWorldSoaSabWireReport {
    pub world_soa_sab_layout_ready: bool,
    pub header_valid: bool,
    pub buffer_allocated: bool,
    pub columns_written: bool,
    pub roundtrip_ok: bool,
    pub entity_capacity: u32,
    pub entity_count: u32,
    pub total_bytes: u32,
    pub offset_pos_x: u32,
    pub offset_timescale: u32,
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
    r: WorldSoaSabLayoutSoakReport,
    note: impl Into<String>,
) -> KernelWorldSoaSabWireReport {
    KernelWorldSoaSabWireReport {
        world_soa_sab_layout_ready: r.world_soa_sab_layout_ready,
        header_valid: r.header_valid,
        buffer_allocated: r.buffer_allocated,
        columns_written: r.columns_written,
        roundtrip_ok: r.roundtrip_ok,
        entity_capacity: r.entity_capacity,
        entity_count: r.entity_count,
        total_bytes: r.total_bytes,
        offset_pos_x: r.offset_pos_x,
        offset_timescale: r.offset_timescale,
        distinct_from_peers_note: "distinct".into(),
        letter: "dh".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run WorldSoA SAB layout soak via kernel.
pub fn run_kernel_world_soa_sab_layout_soak() -> KernelWorldSoaSabWireReport {
    let r = run_world_soa_sab_layout_soak();
    let note = if !r.world_soa_sab_layout_ready {
        "WorldSoA SAB layout soak failed — worldSoaSabLayoutReady stays false"
    } else {
        "Desktop soak: WorldHeader + SoA column allocate/write/readback — worldSoaSabLayoutReady true; mmap/SAB production HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `worldSoaSabLayoutReady` (letter dh).
pub fn probe_world_soa_sab_layout() -> KernelWorldSoaSabWireReport {
    to_report(
        kernel_probe(),
        "WorldSoA SAB layout probe (letter dh) — distinct from kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; mmap/SAB production HELD",
    )
}

/// Tauri IPC — WorldSoA SAB layout honesty.
#[tauri::command]
pub fn probe_world_soa_sab_layout_cmd() -> KernelWorldSoaSabWireReport {
    probe_world_soa_sab_layout()
}

/// Tauri IPC — run WorldSoA SAB layout soak.
#[tauri::command]
pub fn run_kernel_world_soa_sab_layout_soak_cmd() -> KernelWorldSoaSabWireReport {
    run_kernel_world_soa_sab_layout_soak()
}

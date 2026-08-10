//! Kernel foundation honesty desktop wire — letter **dc**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::kernel_honesty::probe_kernel_foundation`.
//! Exposes `kernelRustFoundationReady` evidence to agents/tools without UI chrome.
//! Chaos / 100k / mmap-SAB production / AVX-512 / GR / dual-240 parity stays HELD.

use aethel_kernel_rust::kernel_honesty::{
    probe_kernel_foundation as kernel_probe, KernelHonestyReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFoundationHonestyWireReport {
    pub world_soa_ready: bool,
    pub frame_arena_ready: bool,
    pub lbm_kernel_ready: bool,
    pub mut_dna_ready: bool,
    pub timescale_ready: bool,
    pub beer_lambert_ready: bool,
    pub sonic_impedance_ready: bool,
    /// True only when all foundation probes above pass (letter dc soak).
    pub kernel_rust_foundation_ready: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(r: KernelHonestyReport, note: impl Into<String>) -> KernelFoundationHonestyWireReport {
    KernelFoundationHonestyWireReport {
        world_soa_ready: r.world_soa_ready,
        frame_arena_ready: r.frame_arena_ready,
        lbm_kernel_ready: r.lbm_kernel_ready,
        mut_dna_ready: r.mut_dna_ready,
        timescale_ready: r.timescale_ready,
        beer_lambert_ready: r.beer_lambert_ready,
        sonic_impedance_ready: r.sonic_impedance_ready,
        kernel_rust_foundation_ready: r.foundation_closed(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        letter: "dc".into(),
        note: note.into(),
    }
}

/// Honesty probe — soak-gated foundation (letter dc).
pub fn probe_kernel_foundation_honesty() -> KernelFoundationHonestyWireReport {
    let r = kernel_probe();
    let note = if r.foundation_closed() {
        "Kernel Rust foundation soak passed — kernelRustFoundationReady true; Chaos/100k/mmap-SAB/AVX-512/GR/dual-240 HELD"
    } else {
        "Kernel Rust foundation soak failed — kernelRustFoundationReady stays false"
    };
    to_report(r, note)
}

/// Tauri IPC — kernel foundation honesty (agents/tools).
#[tauri::command]
pub fn probe_kernel_foundation_cmd() -> KernelFoundationHonestyWireReport {
    probe_kernel_foundation_honesty()
}

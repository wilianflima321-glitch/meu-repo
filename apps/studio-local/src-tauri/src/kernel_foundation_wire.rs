//! Kernel foundation desktop wire — letter **do** (closes dc IPC gap for web bridge).
//!
//! Thin studio-local IPC over `aethel_kernel_rust::kernel_honesty::probe_kernel_foundation`.
//! Soak gate `probeKernelFoundation` is **distinct** from de–dm desktop soak probes.
//! Chaos/100k/mmap-SAB/AVX-512/GR/dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::kernel_honesty::{probe_kernel_foundation as kernel_probe, KernelHonestyReport};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFoundationWireReport {
    /// Soak gate for web `kernelRustFoundationReady` — `foundation_closed()`.
    pub probe_kernel_foundation: bool,
    pub world_soa_ready: bool,
    pub frame_arena_ready: bool,
    pub lbm_kernel_ready: bool,
    pub mut_dna_ready: bool,
    pub timescale_ready: bool,
    pub beer_lambert_ready: bool,
    pub sonic_impedance_ready: bool,
    pub letter: String,
    pub note: String,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(r: KernelHonestyReport, note: impl Into<String>) -> KernelFoundationWireReport {
    KernelFoundationWireReport {
        probe_kernel_foundation: r.foundation_closed(),
        world_soa_ready: r.world_soa_ready,
        frame_arena_ready: r.frame_arena_ready,
        lbm_kernel_ready: r.lbm_kernel_ready,
        mut_dna_ready: r.mut_dna_ready,
        timescale_ready: r.timescale_ready,
        beer_lambert_ready: r.beer_lambert_ready,
        sonic_impedance_ready: r.sonic_impedance_ready,
        letter: "dc".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Honesty probe — soak-gated `probeKernelFoundation` (letter dc; IPC for letter do web bridge).
pub fn probe_kernel_foundation_wire() -> KernelFoundationWireReport {
    let r = kernel_probe();
    let note = if !r.foundation_closed() {
        "Kernel foundation soak failed — probeKernelFoundation stays false"
    } else {
        "Kernel foundation probe (letter dc) — WorldSoA+FrameArena+LBM+MutDNA+timescale/Beer–Lambert/sonic; Chaos/100k/etc HELD"
    };
    to_report(r, note)
}

/// Tauri IPC — kernel foundation honesty (dc surface for do web wire).
#[tauri::command]
pub fn probe_kernel_foundation_cmd() -> KernelFoundationWireReport {
    probe_kernel_foundation_wire()
}

/// Tauri IPC — alias soak run (same as probe; foundation has no separate runner).
#[tauri::command]
pub fn run_kernel_foundation_soak_cmd() -> KernelFoundationWireReport {
    probe_kernel_foundation_wire()
}

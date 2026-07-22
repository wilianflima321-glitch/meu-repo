//! MutDNA + FrameArena desktop soak wire — letter **df**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::desktop_soak` MutDNA/FrameArena
//! deepen. Honesty probe `kernelMutDnaDesktopReady` is distinct from de
//! `kernelDesktopWireReady` and dc `probe_kernel_foundation`.
//! Chaos/100k/mmap-SAB/AVX-512/GR/dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::desktop_soak::{
    probe_kernel_mut_dna_desktop as kernel_probe, run_desktop_mut_dna_frame_soak,
    MutDnaDesktopSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMutDnaDesktopWireReport {
    pub kernel_mut_dna_desktop_ready: bool,
    pub mut_dna_serialized: bool,
    pub mut_dna_replayed: bool,
    pub mut_dna_byte_len: usize,
    pub frame_arena_bumped: bool,
    pub frame_arena_bytes_used: usize,
    pub frame_arena_flushed: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_desktop_wire_probe: bool,
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

fn to_report(r: MutDnaDesktopSoakReport, note: impl Into<String>) -> KernelMutDnaDesktopWireReport {
    KernelMutDnaDesktopWireReport {
        kernel_mut_dna_desktop_ready: r.kernel_mut_dna_desktop_ready,
        mut_dna_serialized: r.mut_dna_serialized,
        mut_dna_replayed: r.mut_dna_replayed,
        mut_dna_byte_len: r.mut_dna_byte_len,
        frame_arena_bumped: r.frame_arena_bumped,
        frame_arena_bytes_used: r.frame_arena_bytes_used,
        frame_arena_flushed: r.frame_arena_flushed,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "df".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run MutDNA + FrameArena desktop soak via kernel.
pub fn run_kernel_mut_dna_desktop_soak() -> KernelMutDnaDesktopWireReport {
    let r = run_desktop_mut_dna_frame_soak();
    let note = if !r.kernel_mut_dna_desktop_ready {
        "MutDNA desktop soak failed — kernelMutDnaDesktopReady stays false"
    } else {
        "Desktop soak: MutEvent DNA serialize/replay + LinearFrameAllocator bump — kernelMutDnaDesktopReady true; Chaos/100k/etc HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `kernelMutDnaDesktopReady` (letter df).
pub fn probe_kernel_mut_dna_desktop() -> KernelMutDnaDesktopWireReport {
    to_report(
        kernel_probe(),
        "MutDNA+FrameArena desktop soak probe (letter df) — distinct from kernelDesktopWireReady and probe_kernel_foundation; Chaos/100k/etc HELD",
    )
}

/// Tauri IPC — MutDNA + FrameArena desktop soak honesty.
#[tauri::command]
pub fn probe_kernel_mut_dna_desktop_cmd() -> KernelMutDnaDesktopWireReport {
    probe_kernel_mut_dna_desktop()
}

/// Tauri IPC — run MutDNA + FrameArena desktop soak.
#[tauri::command]
pub fn run_kernel_mut_dna_desktop_soak_cmd() -> KernelMutDnaDesktopWireReport {
    run_kernel_mut_dna_desktop_soak()
}

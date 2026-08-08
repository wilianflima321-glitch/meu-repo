//! Shadow Kernel Time Reversal desktop wire — letter **du**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::shadow_kernel_time_reversal`
//! (WorldSoA volume ring buffer + negative-delta rewind soak). Honesty probe
//! `shadowTimeReversalReady` is **distinct** from dt `curvedRaymarcherReady`,
//! ds `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`,
//! dq `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Dual 240fps timelines marketing / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::shadow_kernel_time_reversal::{
    probe_shadow_time_reversal as kernel_probe, run_shadow_time_reversal_soak,
    ShadowTimeReversalSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelShadowTimeReversalWireReport {
    pub shadow_time_reversal_ready: bool,
    pub volume_id: u32,
    pub frames_recorded: u32,
    pub positions_advanced: bool,
    pub rewind_restored_positions: bool,
    pub positive_delta_identity: bool,
    pub ring_depth: u32,
    pub final_position_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: ShadowTimeReversalSoakReport,
    note: impl Into<String>,
) -> KernelShadowTimeReversalWireReport {
    KernelShadowTimeReversalWireReport {
        shadow_time_reversal_ready: r.shadow_time_reversal_ready,
        volume_id: r.volume_id,
        frames_recorded: r.frames_recorded,
        positions_advanced: r.positions_advanced,
        rewind_restored_positions: r.rewind_restored_positions,
        positive_delta_identity: r.positive_delta_identity,
        ring_depth: r.ring_depth,
        final_position_delta: r.final_position_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "du".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run shadow time-reversal soak via kernel.
pub fn run_kernel_shadow_time_reversal_soak() -> KernelShadowTimeReversalWireReport {
    let r = run_shadow_time_reversal_soak();
    let note = if !r.shadow_time_reversal_ready {
        "Shadow time-reversal soak failed — shadowTimeReversalReady stays false"
    } else {
        "Desktop soak: WorldSoA volume ring buffer + negative-delta rewind restores positions — shadowTimeReversalReady true; dual_timeline_240_ready false; distinct from dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `shadowTimeReversalReady` (letter du).
pub fn probe_shadow_time_reversal() -> KernelShadowTimeReversalWireReport {
    to_report(
        kernel_probe(),
        "Shadow time-reversal probe (letter du) — distinct from curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; dual_timeline_240_ready HELD",
    )
}

/// Tauri IPC — shadow time-reversal honesty.
#[tauri::command]
pub fn probe_shadow_time_reversal_cmd() -> KernelShadowTimeReversalWireReport {
    probe_shadow_time_reversal()
}

/// Tauri IPC — run shadow time-reversal soak.
#[tauri::command]
pub fn run_kernel_shadow_time_reversal_soak_cmd() -> KernelShadowTimeReversalWireReport {
    run_kernel_shadow_time_reversal_soak()
}

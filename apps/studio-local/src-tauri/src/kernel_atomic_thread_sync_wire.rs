//! Atomic thread sync desktop wire — letter **ff**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::atomic_thread_sync`
//! (AtomicUsize arrival barrier + epoch + wait-group + UI signal). Honesty
//! probe `atomicThreadSyncReady` is **distinct** from fe
//! `lockfreeRingBufferReady`, fd `sparseSeedInstancingReady`, fc
//! `universalLogarithmicScaleReady`, fb `geometricScaleConstraintsReady`,
//! fa `digitalPressureChamberReady`, and prior probes. Full rayon / DOTS
//! AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::atomic_thread_sync::{
    probe_atomic_thread_sync as kernel_probe, run_atomic_thread_sync_soak,
    AtomicThreadSyncSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAtomicThreadSyncWireReport {
    pub atomic_thread_sync_ready: bool,
    pub all_pass_after_last_arrival: bool,
    pub epoch_reusable: bool,
    pub wait_group_ok: bool,
    pub ui_signal_ok: bool,
    pub state_mutated: bool,
    pub parties: u32,
    pub rounds: u32,
    pub generations_advanced: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub rayon_dots_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: AtomicThreadSyncSoakReport,
    note: impl Into<String>,
) -> KernelAtomicThreadSyncWireReport {
    KernelAtomicThreadSyncWireReport {
        atomic_thread_sync_ready: r.atomic_thread_sync_ready,
        all_pass_after_last_arrival: r.all_pass_after_last_arrival,
        epoch_reusable: r.epoch_reusable,
        wait_group_ok: r.wait_group_ok,
        ui_signal_ok: r.ui_signal_ok,
        state_mutated: r.state_mutated,
        parties: r.parties,
        rounds: r.rounds,
        generations_advanced: r.generations_advanced,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "ff".into(),
        note: note.into(),
        rayon_dots_aaa_ready: r.rayon_dots_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run atomic thread sync soak via kernel.
pub fn run_kernel_atomic_thread_sync_soak() -> KernelAtomicThreadSyncWireReport {
    let r = run_atomic_thread_sync_soak();
    let note = if !r.atomic_thread_sync_ready {
        "Atomic thread sync soak failed — atomicThreadSyncReady stays false"
    } else {
        "Desktop soak: AtomicUsize arrival barrier + epoch reuse + wait-group + UI signal — atomicThreadSyncReady true; rayon_dots_aaa_ready false; distinct from fe lockfreeRingBufferReady + fd sparseSeedInstancingReady + fc universalLogarithmicScaleReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `atomicThreadSyncReady` (letter ff).
pub fn probe_atomic_thread_sync() -> KernelAtomicThreadSyncWireReport {
    to_report(
        kernel_probe(),
        "Atomic thread sync probe (letter ff) — distinct from lockfreeRingBufferReady, sparseSeedInstancingReady, universalLogarithmicScaleReady, and probe_kernel_foundation; rayon_dots_aaa_ready HELD",
    )
}

/// Tauri IPC — atomic thread sync honesty.
#[tauri::command]
pub fn probe_atomic_thread_sync_cmd() -> KernelAtomicThreadSyncWireReport {
    probe_atomic_thread_sync()
}

/// Tauri IPC — run atomic thread sync soak.
#[tauri::command]
pub fn run_kernel_atomic_thread_sync_soak_cmd() -> KernelAtomicThreadSyncWireReport {
    run_kernel_atomic_thread_sync_soak()
}

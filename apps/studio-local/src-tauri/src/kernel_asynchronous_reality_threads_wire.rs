//! Asynchronous reality threads desktop wire — letter **fm**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::asynchronous_reality_threads`
//! (std::thread dual lanes + mpsc tick jobs + ordered physics apply soak).
//! Honesty probe `asynchronousRealityThreadsReady` is **distinct** from fl
//! `cpuAffinityMicroWorkersReady`, ff `atomicThreadSyncReady`, fe
//! `lockfreeRingBufferReady`, and prior probes. Full async runtime AAA
//! (`async_runtime_aaa_ready`) stays false (HELD — no tokio). Coins / Agones /
//! Nanite / DLSS HELD.

use aethel_kernel_rust::asynchronous_reality_threads::{
    probe_asynchronous_reality_threads as kernel_probe, run_asynchronous_reality_threads_soak,
    AsynchronousRealityThreadsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAsynchronousRealityThreadsWireReport {
    pub asynchronous_reality_threads_ready: bool,
    pub ticks_applied_ok: bool,
    pub order_ok: bool,
    pub visual_completion_ok: bool,
    pub lanes_shutdown_ok: bool,
    pub state_mutated: bool,
    pub physics_ticks: u32,
    pub visual_ticks: u32,
    pub physics_applied: u32,
    pub physics_checksum: u64,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub async_runtime_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: AsynchronousRealityThreadsSoakReport,
    note: impl Into<String>,
) -> KernelAsynchronousRealityThreadsWireReport {
    KernelAsynchronousRealityThreadsWireReport {
        asynchronous_reality_threads_ready: r.asynchronous_reality_threads_ready,
        ticks_applied_ok: r.ticks_applied_ok,
        order_ok: r.order_ok,
        visual_completion_ok: r.visual_completion_ok,
        lanes_shutdown_ok: r.lanes_shutdown_ok,
        state_mutated: r.state_mutated,
        physics_ticks: r.physics_ticks,
        visual_ticks: r.visual_ticks,
        physics_applied: r.physics_applied,
        physics_checksum: r.physics_checksum,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fm".into(),
        note: note.into(),
        async_runtime_aaa_ready: r.async_runtime_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run asynchronous reality threads soak via kernel.
pub fn run_kernel_asynchronous_reality_threads_soak() -> KernelAsynchronousRealityThreadsWireReport {
    let r = run_asynchronous_reality_threads_soak();
    let note = if !r.asynchronous_reality_threads_ready {
        "Asynchronous reality threads soak failed — asynchronousRealityThreadsReady stays false"
    } else {
        "Desktop soak: std::thread physics+visual mpsc lanes + ordered physics apply N ticks — asynchronousRealityThreadsReady true; async_runtime_aaa_ready false; distinct from fl cpuAffinityMicroWorkersReady + ff atomicThreadSyncReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `asynchronousRealityThreadsReady` (letter fm).
pub fn probe_asynchronous_reality_threads() -> KernelAsynchronousRealityThreadsWireReport {
    to_report(
        kernel_probe(),
        "Asynchronous reality threads probe (letter fm) — distinct from cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; async_runtime_aaa_ready HELD",
    )
}

/// Tauri IPC — asynchronous reality threads honesty.
#[tauri::command]
pub fn probe_asynchronous_reality_threads_cmd() -> KernelAsynchronousRealityThreadsWireReport {
    probe_asynchronous_reality_threads()
}

/// Tauri IPC — run asynchronous reality threads soak.
#[tauri::command]
pub fn run_kernel_asynchronous_reality_threads_soak_cmd() -> KernelAsynchronousRealityThreadsWireReport
{
    run_kernel_asynchronous_reality_threads_soak()
}

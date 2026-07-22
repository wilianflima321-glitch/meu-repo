//! CPU affinity micro-workers desktop wire — letter **fl**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::cpu_affinity_micro_workers`
//! (std::thread micro-worker pool + job queue soak; best-effort OS affinity pin).
//! Honesty probe `cpuAffinityMicroWorkersReady` is **distinct** from ff
//! `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, fk
//! `binarySeedStreamerReady`, and prior probes. Verified OS affinity pin
//! (`cpuAffinityPinReady`) stays false when unverified (often HELD). Full
//! rayon/DOTS AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::cpu_affinity_micro_workers::{
    probe_cpu_affinity_micro_workers as kernel_probe, run_cpu_affinity_micro_workers_soak,
    CpuAffinityMicroWorkersSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelCpuAffinityMicroWorkersWireReport {
    pub cpu_affinity_micro_workers_ready: bool,
    pub cpu_affinity_pin_ready: bool,
    pub jobs_completed_ok: bool,
    pub result_sum_ok: bool,
    pub pool_shutdown_ok: bool,
    pub state_mutated: bool,
    pub workers: u32,
    pub jobs: u32,
    pub result_sum: u64,
    pub pin_attempted: u32,
    pub pin_os_ok: u32,
    pub pin_verified: u32,
    pub fingerprint: u64,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_binary_seed_streamer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub rayon_dots_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: CpuAffinityMicroWorkersSoakReport,
    note: impl Into<String>,
) -> KernelCpuAffinityMicroWorkersWireReport {
    KernelCpuAffinityMicroWorkersWireReport {
        cpu_affinity_micro_workers_ready: r.cpu_affinity_micro_workers_ready,
        cpu_affinity_pin_ready: r.cpu_affinity_pin_ready,
        jobs_completed_ok: r.jobs_completed_ok,
        result_sum_ok: r.result_sum_ok,
        pool_shutdown_ok: r.pool_shutdown_ok,
        state_mutated: r.state_mutated,
        workers: r.workers,
        jobs: r.jobs,
        result_sum: r.result_sum,
        pin_attempted: r.pin_attempted,
        pin_os_ok: r.pin_os_ok,
        pin_verified: r.pin_verified,
        fingerprint: r.fingerprint,
        distinct_from_atomic_thread_sync_probe: r.distinct_from_atomic_thread_sync_probe,
        distinct_from_lockfree_ring_buffer_probe: r.distinct_from_lockfree_ring_buffer_probe,
        distinct_from_binary_seed_streamer_probe: r.distinct_from_binary_seed_streamer_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fl".into(),
        note: note.into(),
        rayon_dots_aaa_ready: r.rayon_dots_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run CPU affinity micro-workers soak via kernel.
pub fn run_kernel_cpu_affinity_micro_workers_soak() -> KernelCpuAffinityMicroWorkersWireReport {
    let r = run_cpu_affinity_micro_workers_soak();
    let note = if !r.cpu_affinity_micro_workers_ready {
        "CPU affinity micro-workers soak failed — cpuAffinityMicroWorkersReady stays false"
    } else if r.cpu_affinity_pin_ready {
        "Desktop soak: std::thread micro-worker pool + job queue N jobs sum — cpuAffinityMicroWorkersReady true; cpuAffinityPinReady verified; rayon_dots_aaa_ready false; distinct from ff atomicThreadSyncReady + prior probes"
    } else {
        "Desktop soak: std::thread micro-worker pool + job queue N jobs sum — cpuAffinityMicroWorkersReady true; cpuAffinityPinReady false (best-effort pin HELD/unverified); rayon_dots_aaa_ready false; distinct from ff atomicThreadSyncReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `cpuAffinityMicroWorkersReady` (letter fl).
pub fn probe_cpu_affinity_micro_workers() -> KernelCpuAffinityMicroWorkersWireReport {
    to_report(
        kernel_probe(),
        "CPU affinity micro-workers probe (letter fl) — distinct from atomicThreadSyncReady, lockfreeRingBufferReady, binarySeedStreamerReady, and probe_kernel_foundation; cpuAffinityPinReady HELD unless verified; rayon_dots_aaa_ready HELD",
    )
}

/// Tauri IPC — CPU affinity micro-workers honesty.
#[tauri::command]
pub fn probe_cpu_affinity_micro_workers_cmd() -> KernelCpuAffinityMicroWorkersWireReport {
    probe_cpu_affinity_micro_workers()
}

/// Tauri IPC — run CPU affinity micro-workers soak.
#[tauri::command]
pub fn run_kernel_cpu_affinity_micro_workers_soak_cmd() -> KernelCpuAffinityMicroWorkersWireReport {
    run_kernel_cpu_affinity_micro_workers_soak()
}

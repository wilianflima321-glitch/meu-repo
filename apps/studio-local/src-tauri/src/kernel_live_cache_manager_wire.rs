//! Live cache manager desktop wire — letter **fo**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::live_cache_manager`
//! (fixed-capacity LRU get/put/evict; capacity eviction + hit-after-put soak).
//! Honesty probe `liveCacheManagerReady` is **distinct** from fn
//! `thermalSchedulerReady`, fm `asynchronousRealityThreadsReady`,
//! fl `cpuAffinityMicroWorkersReady`, ff `atomicThreadSyncReady`,
//! fe `lockfreeRingBufferReady`, and prior probes.
//! Full CDN / asset-cache AAA (`cdn_asset_cache_aaa_ready`) stays false (HELD).
//! Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::live_cache_manager::{
    probe_live_cache_manager as kernel_probe, run_live_cache_manager_soak, LiveCacheManagerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLiveCacheManagerWireReport {
    pub live_cache_manager_ready: bool,
    pub capacity: usize,
    pub fill_count: usize,
    pub evictions: u64,
    pub hits: u64,
    pub misses: u64,
    pub capacity_eviction_ok: bool,
    pub hit_after_put_ok: bool,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub distinct_from_thermal_scheduler_probe: bool,
    pub distinct_from_asynchronous_reality_threads_probe: bool,
    pub distinct_from_cpu_affinity_micro_workers_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub cdn_asset_cache_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: LiveCacheManagerSoakReport,
    note: impl Into<String>,
) -> KernelLiveCacheManagerWireReport {
    KernelLiveCacheManagerWireReport {
        live_cache_manager_ready: r.live_cache_manager_ready,
        capacity: r.capacity,
        fill_count: r.fill_count,
        evictions: r.evictions,
        hits: r.hits,
        misses: r.misses,
        capacity_eviction_ok: r.capacity_eviction_ok,
        hit_after_put_ok: r.hit_after_put_ok,
        state_mutated: r.state_mutated,
        fingerprint: r.fingerprint,
        distinct_from_thermal_scheduler_probe: r.distinct_from_thermal_scheduler_probe,
        distinct_from_asynchronous_reality_threads_probe: r
            .distinct_from_asynchronous_reality_threads_probe,
        distinct_from_cpu_affinity_micro_workers_probe: r
            .distinct_from_cpu_affinity_micro_workers_probe,
        distinct_from_atomic_thread_sync_probe: r.distinct_from_atomic_thread_sync_probe,
        distinct_from_lockfree_ring_buffer_probe: r.distinct_from_lockfree_ring_buffer_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fo".into(),
        note: note.into(),
        cdn_asset_cache_aaa_ready: r.cdn_asset_cache_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run live cache manager soak via kernel.
pub fn run_kernel_live_cache_manager_soak() -> KernelLiveCacheManagerWireReport {
    let r = run_live_cache_manager_soak();
    let note = if !r.live_cache_manager_ready {
        "Live cache manager soak failed — liveCacheManagerReady stays false"
    } else {
        "Desktop soak: fixed-cap LRU get/put/evict; capacity eviction + hit after put — liveCacheManagerReady true; cdn_asset_cache_aaa_ready false; distinct from fn thermalSchedulerReady + fm asynchronousRealityThreadsReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `liveCacheManagerReady` (letter fo).
pub fn probe_live_cache_manager() -> KernelLiveCacheManagerWireReport {
    to_report(
        kernel_probe(),
        "Live cache manager probe (letter fo) — distinct from thermalSchedulerReady, asynchronousRealityThreadsReady, cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; cdn_asset_cache_aaa_ready HELD",
    )
}

/// Tauri IPC — live cache manager honesty.
#[tauri::command]
pub fn probe_live_cache_manager_cmd() -> KernelLiveCacheManagerWireReport {
    probe_live_cache_manager()
}

/// Tauri IPC — run live cache manager soak.
#[tauri::command]
pub fn run_kernel_live_cache_manager_soak_cmd() -> KernelLiveCacheManagerWireReport {
    run_kernel_live_cache_manager_soak()
}

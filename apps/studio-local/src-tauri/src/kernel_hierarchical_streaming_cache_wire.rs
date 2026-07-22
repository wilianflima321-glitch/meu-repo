//! Hierarchical streaming cache desktop wire — letter **fp**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hierarchical_streaming_cache`
//! (L1 hot fo LRU + L2 cold; promote/demote; L2 fill + L1 hit-after-promote soak).
//! Honesty probe `hierarchicalStreamingCacheReady` is **distinct** from fo
//! `liveCacheManagerReady`, fn `thermalSchedulerReady`,
//! fm `asynchronousRealityThreadsReady`, fl `cpuAffinityMicroWorkersReady`,
//! ff `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, and prior probes.
//! Full VT / Nanite streaming AAA (`vt_nanite_streaming_aaa_ready`) stays false (HELD).
//! Coins / Agones / Nanite / DLSS HELD.
//!
//! Letter **il**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::hierarchical_streaming_cache::{
    probe_hierarchical_streaming_cache as kernel_probe,
    run_hierarchical_streaming_cache_soak, HierarchicalStreamingCacheSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHierarchicalStreamingCacheWireReport {
    pub hierarchical_streaming_cache_ready: bool,
    pub l1_capacity: usize,
    pub l2_capacity: usize,
    pub l2_fill_count: usize,
    pub l1_hits: u64,
    pub l2_hits: u64,
    pub promotes: u64,
    pub demotes: u64,
    pub l2_fill_ok: bool,
    pub l1_hit_after_promote_ok: bool,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_live_cache_manager_probe: bool,
    pub distinct_from_thermal_scheduler_probe: bool,
    pub distinct_from_asynchronous_reality_threads_probe: bool,
    pub distinct_from_cpu_affinity_micro_workers_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub vt_nanite_streaming_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: HierarchicalStreamingCacheSoakReport,
    note: impl Into<String>,
) -> KernelHierarchicalStreamingCacheWireReport {
    KernelHierarchicalStreamingCacheWireReport {
        hierarchical_streaming_cache_ready: r.hierarchical_streaming_cache_ready,
        l1_capacity: r.l1_capacity,
        l2_capacity: r.l2_capacity,
        l2_fill_count: r.l2_fill_count,
        l1_hits: r.l1_hits,
        l2_hits: r.l2_hits,
        promotes: r.promotes,
        demotes: r.demotes,
        l2_fill_ok: r.l2_fill_ok,
        l1_hit_after_promote_ok: r.l1_hit_after_promote_ok,
        state_mutated: r.state_mutated,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_live_cache_manager_probe: r.distinct_from_live_cache_manager_probe,
        distinct_from_thermal_scheduler_probe: r.distinct_from_thermal_scheduler_probe,
        distinct_from_asynchronous_reality_threads_probe: r
            .distinct_from_asynchronous_reality_threads_probe,
        distinct_from_cpu_affinity_micro_workers_probe: r
            .distinct_from_cpu_affinity_micro_workers_probe,
        distinct_from_atomic_thread_sync_probe: r.distinct_from_atomic_thread_sync_probe,
        distinct_from_lockfree_ring_buffer_probe: r.distinct_from_lockfree_ring_buffer_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fp".into(),
        note: note.into(),
        vt_nanite_streaming_aaa_ready: r.vt_nanite_streaming_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run hierarchical streaming cache soak via kernel.
pub fn run_kernel_hierarchical_streaming_cache_soak() -> KernelHierarchicalStreamingCacheWireReport {
    let r = run_hierarchical_streaming_cache_soak();
    let note = if !r.hierarchical_streaming_cache_ready {
        "Hierarchical streaming cache soak failed — hierarchicalStreamingCacheReady stays false"
    } else {
        "Desktop soak: L1 hot fo LRU + L2 cold promote/demote; L2 fill + L1 hit after promote — hierarchicalStreamingCacheReady true; vt_nanite_streaming_aaa_ready false; distinct from fo liveCacheManagerReady + fn thermalSchedulerReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hierarchicalStreamingCacheReady` (letter fp).
pub fn probe_hierarchical_streaming_cache() -> KernelHierarchicalStreamingCacheWireReport {
    to_report(
        kernel_probe(),
        "Hierarchical streaming cache probe (letter fp) — distinct from liveCacheManagerReady, thermalSchedulerReady, asynchronousRealityThreadsReady, cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; vt_nanite_streaming_aaa_ready HELD",
    )
}

/// Tauri IPC — hierarchical streaming cache honesty.
#[tauri::command]
pub fn probe_hierarchical_streaming_cache_cmd() -> KernelHierarchicalStreamingCacheWireReport {
    probe_hierarchical_streaming_cache()
}

/// Tauri IPC — run hierarchical streaming cache soak.
#[tauri::command]
pub fn run_kernel_hierarchical_streaming_cache_soak_cmd() -> KernelHierarchicalStreamingCacheWireReport {
    run_kernel_hierarchical_streaming_cache_soak()
}

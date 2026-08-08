//! Metabolic memory desktop wire — letter **fq**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::metabolic_memory`
//! (working-set / generational arena; tick ages; reclaim cold under budget).
//! Honesty probe `metabolicMemoryReady` is **distinct** from fo
//! `liveCacheManagerReady`, fp `hierarchicalStreamingCacheReady`,
//! fn `thermalSchedulerReady`, fm `asynchronousRealityThreadsReady`,
//! fl `cpuAffinityMicroWorkersReady`, ff `atomicThreadSyncReady`,
//! fe `lockfreeRingBufferReady`, and prior probes.
//! Full OS VMM AAA (`os_vmm_aaa_ready`) stays false (HELD).
//! Coins / Agones / Nanite / DLSS HELD.
//!
//! Letter **ik**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::metabolic_memory::{
    probe_metabolic_memory as kernel_probe, run_metabolic_memory_soak, MetabolicMemorySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMetabolicMemoryWireReport {
    pub metabolic_memory_ready: bool,
    pub budget_bytes: usize,
    pub page_size: usize,
    pub fill_pages: usize,
    pub cold_age: u32,
    pub used_before_reclaim: usize,
    pub used_after_reclaim: usize,
    pub reclaim_count: u64,
    pub bytes_reclaimed: u64,
    pub over_budget_before: bool,
    pub under_budget_after: bool,
    pub realloc_after_reclaim_ok: bool,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub os_vmm_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: MetabolicMemorySoakReport,
    note: impl Into<String>,
) -> KernelMetabolicMemoryWireReport {
    KernelMetabolicMemoryWireReport {
        metabolic_memory_ready: r.metabolic_memory_ready,
        budget_bytes: r.budget_bytes,
        page_size: r.page_size,
        fill_pages: r.fill_pages,
        cold_age: r.cold_age,
        used_before_reclaim: r.used_before_reclaim,
        used_after_reclaim: r.used_after_reclaim,
        reclaim_count: r.reclaim_count,
        bytes_reclaimed: r.bytes_reclaimed,
        over_budget_before: r.over_budget_before,
        under_budget_after: r.under_budget_after,
        realloc_after_reclaim_ok: r.realloc_after_reclaim_ok,
        state_mutated: r.state_mutated,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fq".into(),
        note: note.into(),
        os_vmm_aaa_ready: r.os_vmm_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run metabolic memory soak via kernel.
pub fn run_kernel_metabolic_memory_soak() -> KernelMetabolicMemoryWireReport {
    let r = run_metabolic_memory_soak();
    let note = if !r.metabolic_memory_ready {
        "Metabolic memory soak failed — metabolicMemoryReady stays false"
    } else {
        "Desktop soak: generational arena tick ages + reclaim cold under budget; reclaim frees capacity + realloc ok — metabolicMemoryReady true; os_vmm_aaa_ready false; distinct from fp hierarchicalStreamingCacheReady + fo liveCacheManagerReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `metabolicMemoryReady` (letter fq).
pub fn probe_metabolic_memory() -> KernelMetabolicMemoryWireReport {
    to_report(
        kernel_probe(),
        "Metabolic memory probe (letter fq) — distinct from hierarchicalStreamingCacheReady, liveCacheManagerReady, thermalSchedulerReady, asynchronousRealityThreadsReady, cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; os_vmm_aaa_ready HELD",
    )
}

/// Tauri IPC — metabolic memory honesty.
#[tauri::command]
pub fn probe_metabolic_memory_cmd() -> KernelMetabolicMemoryWireReport {
    probe_metabolic_memory()
}

/// Tauri IPC — run metabolic memory soak.
#[tauri::command]
pub fn run_kernel_metabolic_memory_soak_cmd() -> KernelMetabolicMemoryWireReport {
    run_kernel_metabolic_memory_soak()
}

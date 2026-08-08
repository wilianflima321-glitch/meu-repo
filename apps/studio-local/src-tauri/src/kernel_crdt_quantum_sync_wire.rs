//! CRDT quantum sync desktop wire — letter **fg**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::crdt_quantum_sync`
//! (LWW-Register + G-Counter + OR-Set merge; concurrent replica soak).
//! Honesty probe `crdtQuantumSyncReady` is **distinct** from ff
//! `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, fd
//! `sparseSeedInstancingReady`, fc `universalLogarithmicScaleReady`,
//! fb `geometricScaleConstraintsReady`, fa `digitalPressureChamberReady`,
//! and prior probes. Full Yjs / Automerge AAA / Coins / Agones / Nanite /
//! DLSS HELD.
//!
//! Letter **il**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::crdt_quantum_sync::{
    probe_crdt_quantum_sync as kernel_probe, run_crdt_quantum_sync_soak, CrdtQuantumSyncSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelCrdtQuantumSyncWireReport {
    pub crdt_quantum_sync_ready: bool,
    pub lww_converged: bool,
    pub g_counter_converged: bool,
    pub or_set_converged: bool,
    pub merge_commutative: bool,
    pub merge_associative: bool,
    pub concurrent_replicas_converged: bool,
    pub state_mutated: bool,
    pub replicas: u32,
    pub counter_total: u64,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub yjs_automerge_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: CrdtQuantumSyncSoakReport,
    note: impl Into<String>,
) -> KernelCrdtQuantumSyncWireReport {
    KernelCrdtQuantumSyncWireReport {
        crdt_quantum_sync_ready: r.crdt_quantum_sync_ready,
        lww_converged: r.lww_converged,
        g_counter_converged: r.g_counter_converged,
        or_set_converged: r.or_set_converged,
        merge_commutative: r.merge_commutative,
        merge_associative: r.merge_associative,
        concurrent_replicas_converged: r.concurrent_replicas_converged,
        state_mutated: r.state_mutated,
        replicas: r.replicas,
        counter_total: r.counter_total,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fg".into(),
        note: note.into(),
        yjs_automerge_aaa_ready: r.yjs_automerge_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run CRDT quantum sync soak via kernel.
pub fn run_kernel_crdt_quantum_sync_soak() -> KernelCrdtQuantumSyncWireReport {
    let r = run_crdt_quantum_sync_soak();
    let note = if !r.crdt_quantum_sync_ready {
        "CRDT quantum sync soak failed — crdtQuantumSyncReady stays false"
    } else {
        "Desktop soak: LWW + G-Counter + OR-Set concurrent merge converge — crdtQuantumSyncReady true; yjs_automerge_aaa_ready false; distinct from ff atomicThreadSyncReady + fe lockfreeRingBufferReady + fd sparseSeedInstancingReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `crdtQuantumSyncReady` (letter fg).
pub fn probe_crdt_quantum_sync() -> KernelCrdtQuantumSyncWireReport {
    to_report(
        kernel_probe(),
        "CRDT quantum sync probe (letter fg) — distinct from atomicThreadSyncReady, lockfreeRingBufferReady, sparseSeedInstancingReady, and probe_kernel_foundation; yjs_automerge_aaa_ready HELD",
    )
}

/// Tauri IPC — CRDT quantum sync honesty.
#[tauri::command]
pub fn probe_crdt_quantum_sync_cmd() -> KernelCrdtQuantumSyncWireReport {
    probe_crdt_quantum_sync()
}

/// Tauri IPC — run CRDT quantum sync soak.
#[tauri::command]
pub fn run_kernel_crdt_quantum_sync_soak_cmd() -> KernelCrdtQuantumSyncWireReport {
    run_kernel_crdt_quantum_sync_soak()
}

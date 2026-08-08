//! Delta seed synchronization desktop wire — letter **fh**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::delta_seed_synchronization`
//! (base seed + ordered MutEvent deltas; peer converge soak).
//! Honesty probe `deltaSeedSynchronizationReady` is **distinct** from fg
//! `crdtQuantumSyncReady`, ff `atomicThreadSyncReady`, fe
//! `lockfreeRingBufferReady`, fd `sparseSeedInstancingReady`, fc
//! `universalLogarithmicScaleReady`, fb `geometricScaleConstraintsReady`,
//! fa `digitalPressureChamberReady`, and prior probes. Full Yjs / netcode
//! AAA / Coins / Agones / Nanite / DLSS HELD.
//!
//! Letter **ik**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::delta_seed_synchronization::{
    probe_delta_seed_synchronization as kernel_probe, run_delta_seed_synchronization_soak,
    DeltaSeedSynchronizationSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelDeltaSeedSynchronizationWireReport {
    pub delta_seed_synchronization_ready: bool,
    pub peers_converged: bool,
    pub ordered_apply_deterministic: bool,
    pub pack_roundtrip: bool,
    pub incremental_sync_converged: bool,
    pub state_mutated: bool,
    pub base_seed: u64,
    pub delta_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub yjs_netcode_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: DeltaSeedSynchronizationSoakReport,
    note: impl Into<String>,
) -> KernelDeltaSeedSynchronizationWireReport {
    KernelDeltaSeedSynchronizationWireReport {
        delta_seed_synchronization_ready: r.delta_seed_synchronization_ready,
        peers_converged: r.peers_converged,
        ordered_apply_deterministic: r.ordered_apply_deterministic,
        pack_roundtrip: r.pack_roundtrip,
        incremental_sync_converged: r.incremental_sync_converged,
        state_mutated: r.state_mutated,
        base_seed: r.base_seed,
        delta_count: r.delta_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fh".into(),
        note: note.into(),
        yjs_netcode_aaa_ready: r.yjs_netcode_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run delta seed synchronization soak via kernel.
pub fn run_kernel_delta_seed_synchronization_soak() -> KernelDeltaSeedSynchronizationWireReport {
    let r = run_delta_seed_synchronization_soak();
    let note = if !r.delta_seed_synchronization_ready {
        "Delta seed synchronization soak failed — deltaSeedSynchronizationReady stays false"
    } else {
        "Desktop soak: base seed + ordered MutEvent deltas peer converge — deltaSeedSynchronizationReady true; yjs_netcode_aaa_ready false; distinct from fg crdtQuantumSyncReady + ff atomicThreadSyncReady + fe lockfreeRingBufferReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `deltaSeedSynchronizationReady` (letter fh).
pub fn probe_delta_seed_synchronization() -> KernelDeltaSeedSynchronizationWireReport {
    to_report(
        kernel_probe(),
        "Delta seed synchronization probe (letter fh) — distinct from crdtQuantumSyncReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; yjs_netcode_aaa_ready HELD",
    )
}

/// Tauri IPC — delta seed synchronization honesty.
#[tauri::command]
pub fn probe_delta_seed_synchronization_cmd() -> KernelDeltaSeedSynchronizationWireReport {
    probe_delta_seed_synchronization()
}

/// Tauri IPC — run delta seed synchronization soak.
#[tauri::command]
pub fn run_kernel_delta_seed_synchronization_soak_cmd() -> KernelDeltaSeedSynchronizationWireReport {
    run_kernel_delta_seed_synchronization_soak()
}

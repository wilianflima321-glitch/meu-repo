//! State sync protocol desktop wire — letter **fi**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::state_sync_protocol`
//! (snapshot hash + sequence + apply/ack + delta frames; peer catch-up soak).
//! Honesty probe `stateSyncProtocolReady` is **distinct** from fh
//! `deltaSeedSynchronizationReady`, fg `crdtQuantumSyncReady`, ff
//! `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, fd
//! `sparseSeedInstancingReady`, fc `universalLogarithmicScaleReady`, fb
//! `geometricScaleConstraintsReady`, fa `digitalPressureChamberReady`, and
//! prior probes. Full Yjs / netcode AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::state_sync_protocol::{
    probe_state_sync_protocol as kernel_probe, run_state_sync_protocol_soak,
    StateSyncProtocolSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelStateSyncProtocolWireReport {
    pub state_sync_protocol_ready: bool,
    pub peer_caught_up: bool,
    pub snapshot_apply_acked: bool,
    pub deltas_apply_acked: bool,
    pub hashes_match: bool,
    pub ack_accepted_by_authority: bool,
    pub frame_roundtrip: bool,
    pub state_mutated: bool,
    pub snapshot_sequence: u64,
    pub final_sequence: u64,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_crdt_quantum_sync_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_sparse_seed_instancing_probe: bool,
    pub distinct_from_universal_logarithmic_scale_probe: bool,
    pub distinct_from_geometric_scale_constraints_probe: bool,
    pub distinct_from_digital_pressure_chamber_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub yjs_netcode_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: StateSyncProtocolSoakReport,
    note: impl Into<String>,
) -> KernelStateSyncProtocolWireReport {
    KernelStateSyncProtocolWireReport {
        state_sync_protocol_ready: r.state_sync_protocol_ready,
        peer_caught_up: r.peer_caught_up,
        snapshot_apply_acked: r.snapshot_apply_acked,
        deltas_apply_acked: r.deltas_apply_acked,
        hashes_match: r.hashes_match,
        ack_accepted_by_authority: r.ack_accepted_by_authority,
        frame_roundtrip: r.frame_roundtrip,
        state_mutated: r.state_mutated,
        snapshot_sequence: r.snapshot_sequence,
        final_sequence: r.final_sequence,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_delta_seed_synchronization_probe: r
            .distinct_from_delta_seed_synchronization_probe,
        distinct_from_crdt_quantum_sync_probe: r.distinct_from_crdt_quantum_sync_probe,
        distinct_from_atomic_thread_sync_probe: r.distinct_from_atomic_thread_sync_probe,
        distinct_from_lockfree_ring_buffer_probe: r.distinct_from_lockfree_ring_buffer_probe,
        distinct_from_sparse_seed_instancing_probe: r.distinct_from_sparse_seed_instancing_probe,
        distinct_from_universal_logarithmic_scale_probe: r
            .distinct_from_universal_logarithmic_scale_probe,
        distinct_from_geometric_scale_constraints_probe: r
            .distinct_from_geometric_scale_constraints_probe,
        distinct_from_digital_pressure_chamber_probe: r
            .distinct_from_digital_pressure_chamber_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fi".into(),
        note: note.into(),
        yjs_netcode_aaa_ready: r.yjs_netcode_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run state sync protocol soak via kernel.
pub fn run_kernel_state_sync_protocol_soak() -> KernelStateSyncProtocolWireReport {
    let r = run_state_sync_protocol_soak();
    let note = if !r.state_sync_protocol_ready {
        "State sync protocol soak failed — stateSyncProtocolReady stays false"
    } else {
        "Desktop soak: snapshot+deltas peer catch-up + apply/ack — stateSyncProtocolReady true; yjs_netcode_aaa_ready false; distinct from fh deltaSeedSynchronizationReady + fg crdtQuantumSyncReady + ff atomicThreadSyncReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `stateSyncProtocolReady` (letter fi).
pub fn probe_state_sync_protocol() -> KernelStateSyncProtocolWireReport {
    to_report(
        kernel_probe(),
        "State sync protocol probe (letter fi) — distinct from deltaSeedSynchronizationReady, crdtQuantumSyncReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; yjs_netcode_aaa_ready HELD",
    )
}

/// Tauri IPC — state sync protocol honesty.
#[tauri::command]
pub fn probe_state_sync_protocol_cmd() -> KernelStateSyncProtocolWireReport {
    probe_state_sync_protocol()
}

/// Tauri IPC — run state sync protocol soak.
#[tauri::command]
pub fn run_kernel_state_sync_protocol_soak_cmd() -> KernelStateSyncProtocolWireReport {
    run_kernel_state_sync_protocol_soak()
}

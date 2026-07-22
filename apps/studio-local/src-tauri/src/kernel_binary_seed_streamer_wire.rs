//! Binary seed streamer desktop wire — letter **fk**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::binary_seed_streamer`
//! (fixed-size chunked seed+payload stream with seq/CRC + fh DeltaSeedLog
//! compose roundtrip soak).
//! Honesty probe `binarySeedStreamerReady` is **distinct** from fj
//! `bitstreamRealitySyncReady`, fi `stateSyncProtocolReady`, fh
//! `deltaSeedSynchronizationReady`, fg `crdtQuantumSyncReady`, ff
//! `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, and prior probes.
//! Full QUIC / network AAA / Coins / Agones / Nanite / DLSS HELD.
//!
//! Letter **in**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::binary_seed_streamer::{
    probe_binary_seed_streamer as kernel_probe, run_binary_seed_streamer_soak,
    BinarySeedStreamerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelBinarySeedStreamerWireReport {
    pub binary_seed_streamer_ready: bool,
    pub chunk_roundtrip: bool,
    pub out_of_order_reassemble: bool,
    pub delta_seed_compose: bool,
    pub fail_closed_corrupt_crc: bool,
    pub state_mutated: bool,
    pub chunk_count: u32,
    pub payload_len: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_bitstream_reality_sync_probe: bool,
    pub distinct_from_state_sync_protocol_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_crdt_quantum_sync_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub quic_network_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: BinarySeedStreamerSoakReport,
    note: impl Into<String>,
) -> KernelBinarySeedStreamerWireReport {
    KernelBinarySeedStreamerWireReport {
        binary_seed_streamer_ready: r.binary_seed_streamer_ready,
        chunk_roundtrip: r.chunk_roundtrip,
        out_of_order_reassemble: r.out_of_order_reassemble,
        delta_seed_compose: r.delta_seed_compose,
        fail_closed_corrupt_crc: r.fail_closed_corrupt_crc,
        state_mutated: r.state_mutated,
        chunk_count: r.chunk_count,
        payload_len: r.payload_len,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_bitstream_reality_sync_probe: r.distinct_from_bitstream_reality_sync_probe,
        distinct_from_state_sync_protocol_probe: r.distinct_from_state_sync_protocol_probe,
        distinct_from_delta_seed_synchronization_probe: r
            .distinct_from_delta_seed_synchronization_probe,
        distinct_from_crdt_quantum_sync_probe: r.distinct_from_crdt_quantum_sync_probe,
        distinct_from_atomic_thread_sync_probe: r.distinct_from_atomic_thread_sync_probe,
        distinct_from_lockfree_ring_buffer_probe: r.distinct_from_lockfree_ring_buffer_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fk".into(),
        note: note.into(),
        quic_network_aaa_ready: r.quic_network_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run binary seed streamer soak via kernel.
pub fn run_kernel_binary_seed_streamer_soak() -> KernelBinarySeedStreamerWireReport {
    let r = run_binary_seed_streamer_soak();
    let note = if !r.binary_seed_streamer_ready {
        "Binary seed streamer soak failed — binarySeedStreamerReady stays false"
    } else {
        "Desktop soak: fixed-size chunked seed+payload seq/CRC + fh DeltaSeedLog compose roundtrip — binarySeedStreamerReady true; quic_network_aaa_ready false; distinct from fj bitstreamRealitySyncReady + fi stateSyncProtocolReady + fh deltaSeedSynchronizationReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `binarySeedStreamerReady` (letter fk).
pub fn probe_binary_seed_streamer() -> KernelBinarySeedStreamerWireReport {
    to_report(
        kernel_probe(),
        "Binary seed streamer probe (letter fk) — distinct from bitstreamRealitySyncReady, stateSyncProtocolReady, deltaSeedSynchronizationReady, crdtQuantumSyncReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; quic_network_aaa_ready HELD",
    )
}

/// Tauri IPC — binary seed streamer honesty.
#[tauri::command]
pub fn probe_binary_seed_streamer_cmd() -> KernelBinarySeedStreamerWireReport {
    probe_binary_seed_streamer()
}

/// Tauri IPC — run binary seed streamer soak.
#[tauri::command]
pub fn run_kernel_binary_seed_streamer_soak_cmd() -> KernelBinarySeedStreamerWireReport {
    run_kernel_binary_seed_streamer_soak()
}

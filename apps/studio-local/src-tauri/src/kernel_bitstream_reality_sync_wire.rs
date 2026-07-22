//! Bitstream reality sync desktop wire — letter **fj**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::bitstream_reality_sync`
//! (bit writer/reader u32/f32 + SyncFrame bit pack roundtrip soak).
//! Honesty probe `bitstreamRealitySyncReady` is **distinct** from fi
//! `stateSyncProtocolReady`, fh `deltaSeedSynchronizationReady`, fg
//! `crdtQuantumSyncReady`, ff `atomicThreadSyncReady`, fe
//! `lockfreeRingBufferReady`, fd `sparseSeedInstancingReady`, fc
//! `universalLogarithmicScaleReady`, fb `geometricScaleConstraintsReady`,
//! fa `digitalPressureChamberReady`, and prior probes.
//! Full netcode compression AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::bitstream_reality_sync::{
    probe_bitstream_reality_sync as kernel_probe, run_bitstream_reality_sync_soak,
    BitstreamRealitySyncSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelBitstreamRealitySyncWireReport {
    pub bitstream_reality_sync_ready: bool,
    pub field_roundtrip: bool,
    pub bit_writer_reader_ok: bool,
    pub sync_frame_roundtrip: bool,
    pub unaligned_bits_ok: bool,
    pub fail_closed_corrupt: bool,
    pub state_mutated: bool,
    pub packed_len: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_state_sync_protocol_probe: bool,
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
    pub netcode_compression_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: BitstreamRealitySyncSoakReport,
    note: impl Into<String>,
) -> KernelBitstreamRealitySyncWireReport {
    KernelBitstreamRealitySyncWireReport {
        bitstream_reality_sync_ready: r.bitstream_reality_sync_ready,
        field_roundtrip: r.field_roundtrip,
        bit_writer_reader_ok: r.bit_writer_reader_ok,
        sync_frame_roundtrip: r.sync_frame_roundtrip,
        unaligned_bits_ok: r.unaligned_bits_ok,
        fail_closed_corrupt: r.fail_closed_corrupt,
        state_mutated: r.state_mutated,
        packed_len: r.packed_len,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_state_sync_protocol_probe: r.distinct_from_state_sync_protocol_probe,
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
        letter: "fj".into(),
        note: note.into(),
        netcode_compression_aaa_ready: r.netcode_compression_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run bitstream reality sync soak via kernel.
pub fn run_kernel_bitstream_reality_sync_soak() -> KernelBitstreamRealitySyncWireReport {
    let r = run_bitstream_reality_sync_soak();
    let note = if !r.bitstream_reality_sync_ready {
        "Bitstream reality sync soak failed — bitstreamRealitySyncReady stays false"
    } else {
        "Desktop soak: bit writer/reader u32/f32 + SyncFrame bit pack roundtrip — bitstreamRealitySyncReady true; netcode_compression_aaa_ready false; distinct from fi stateSyncProtocolReady + fh deltaSeedSynchronizationReady + fg crdtQuantumSyncReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `bitstreamRealitySyncReady` (letter fj).
pub fn probe_bitstream_reality_sync() -> KernelBitstreamRealitySyncWireReport {
    to_report(
        kernel_probe(),
        "Bitstream reality sync probe (letter fj) — distinct from stateSyncProtocolReady, deltaSeedSynchronizationReady, crdtQuantumSyncReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; netcode_compression_aaa_ready HELD",
    )
}

/// Tauri IPC — bitstream reality sync honesty.
#[tauri::command]
pub fn probe_bitstream_reality_sync_cmd() -> KernelBitstreamRealitySyncWireReport {
    probe_bitstream_reality_sync()
}

/// Tauri IPC — run bitstream reality sync soak.
#[tauri::command]
pub fn run_kernel_bitstream_reality_sync_soak_cmd() -> KernelBitstreamRealitySyncWireReport {
    run_kernel_bitstream_reality_sync_soak()
}

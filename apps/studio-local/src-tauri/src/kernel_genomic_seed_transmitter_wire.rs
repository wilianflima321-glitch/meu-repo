//! Genomic Seed Transmitter desktop wire — letter **fu**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::genomic_seed_transmitter`
//! (pack `(id,seed,tag)` → fk chunks → unpack → ft library insert; soak
//! transmit→receive→insert). Honesty probe `genomicSeedTransmitterReady` is
//! **distinct** from ft `genomicSeedLibraryReady`, fk `binarySeedStreamerReady`,
//! fh `deltaSeedSynchronizationReady`, and prior. Full network DNA AAA
//! (`network_dna_aaa_ready`) stays false (HELD). Coins / Agones / Nanite /
//! DLSS / Quic HELD.

use aethel_kernel_rust::genomic_seed_transmitter::{
    probe_genomic_seed_transmitter as kernel_probe, run_genomic_seed_transmitter_soak,
    GenomicSeedTransmitterSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGenomicSeedTransmitterWireReport {
    pub genomic_seed_transmitter_ready: bool,
    pub transmit_receive_roundtrip: bool,
    pub library_insert_ok: bool,
    pub out_of_order_chunks: bool,
    pub corrupt_fail_closed: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub chunk_count: u32,
    pub entry_count: u32,
    pub fingerprint: u64,
    pub distinct_from_genomic_seed_library_probe: bool,
    pub distinct_from_binary_seed_streamer_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub network_dna_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: GenomicSeedTransmitterSoakReport,
    note: impl Into<String>,
) -> KernelGenomicSeedTransmitterWireReport {
    KernelGenomicSeedTransmitterWireReport {
        genomic_seed_transmitter_ready: r.genomic_seed_transmitter_ready,
        transmit_receive_roundtrip: r.transmit_receive_roundtrip,
        library_insert_ok: r.library_insert_ok,
        out_of_order_chunks: r.out_of_order_chunks,
        corrupt_fail_closed: r.corrupt_fail_closed,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        chunk_count: r.chunk_count,
        entry_count: r.entry_count,
        fingerprint: r.fingerprint,
        distinct_from_genomic_seed_library_probe: r.distinct_from_genomic_seed_library_probe,
        distinct_from_binary_seed_streamer_probe: r.distinct_from_binary_seed_streamer_probe,
        distinct_from_delta_seed_synchronization_probe: r
            .distinct_from_delta_seed_synchronization_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fu".into(),
        note: note.into(),
        network_dna_aaa_ready: r.network_dna_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run genomic seed transmitter soak via kernel.
pub fn run_kernel_genomic_seed_transmitter_soak() -> KernelGenomicSeedTransmitterWireReport {
    let r = run_genomic_seed_transmitter_soak();
    let note = if !r.genomic_seed_transmitter_ready {
        "Genomic seed transmitter soak failed — genomicSeedTransmitterReady stays false"
    } else {
        "Desktop soak: pack (id,seed,tag) → fk chunks → unpack → ft library insert; roundtrip + out-of-order + corrupt fail-closed — genomicSeedTransmitterReady true; network_dna_aaa_ready false; distinct from ft genomicSeedLibraryReady + fk binarySeedStreamerReady + fh deltaSeedSynchronizationReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `genomicSeedTransmitterReady` (letter fu).
pub fn probe_genomic_seed_transmitter() -> KernelGenomicSeedTransmitterWireReport {
    to_report(
        kernel_probe(),
        "Genomic seed transmitter probe (letter fu) — distinct from genomicSeedLibraryReady, binarySeedStreamerReady, deltaSeedSynchronizationReady, and probe_kernel_foundation; network_dna_aaa_ready HELD",
    )
}

/// Tauri IPC — genomic seed transmitter honesty.
#[tauri::command]
pub fn probe_genomic_seed_transmitter_cmd() -> KernelGenomicSeedTransmitterWireReport {
    probe_genomic_seed_transmitter()
}

/// Tauri IPC — run genomic seed transmitter soak.
#[tauri::command]
pub fn run_kernel_genomic_seed_transmitter_soak_cmd() -> KernelGenomicSeedTransmitterWireReport {
    run_kernel_genomic_seed_transmitter_soak()
}

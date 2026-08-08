//! Genomic Seed Library desktop wire — letter **ft**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::genomic_seed_library`
//! (real seed registry: insert/lookup/hash by id; soak roundtrip +
//! collision-free). Honesty probe `genomicSeedLibraryReady` is **distinct**
//! from fs `reversibleQuantumUndoReady`, fh `deltaSeedSynchronizationReady`,
//! fd `sparseSeedInstancingReady`, and prior. Full asset DNA AAA
//! (`asset_dna_aaa_ready`) stays false (HELD). Coins / Agones / Nanite /
//! DLSS / Quic HELD.

use aethel_kernel_rust::genomic_seed_library::{
    probe_genomic_seed_library as kernel_probe, run_genomic_seed_library_soak,
    GenomicSeedLibrarySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGenomicSeedLibraryWireReport {
    pub genomic_seed_library_ready: bool,
    pub roundtrip_ok: bool,
    pub collision_free_ids: bool,
    pub miss_fail_closed: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub entry_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub asset_dna_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: GenomicSeedLibrarySoakReport,
    note: impl Into<String>,
) -> KernelGenomicSeedLibraryWireReport {
    KernelGenomicSeedLibraryWireReport {
        genomic_seed_library_ready: r.genomic_seed_library_ready,
        roundtrip_ok: r.roundtrip_ok,
        collision_free_ids: r.collision_free_ids,
        miss_fail_closed: r.miss_fail_closed,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        entry_count: r.entry_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "ft".into(),
        note: note.into(),
        asset_dna_aaa_ready: r.asset_dna_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run genomic seed library soak via kernel.
pub fn run_kernel_genomic_seed_library_soak() -> KernelGenomicSeedLibraryWireReport {
    let r = run_genomic_seed_library_soak();
    let note = if !r.genomic_seed_library_ready {
        "Genomic seed library soak failed — genomicSeedLibraryReady stays false"
    } else {
        "Desktop soak: insert/lookup/hash by id; roundtrip + collision-free ids + miss fail-closed — genomicSeedLibraryReady true; asset_dna_aaa_ready false; distinct from fs reversibleQuantumUndoReady + fh deltaSeedSynchronizationReady + fd sparseSeedInstancingReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `genomicSeedLibraryReady` (letter ft).
pub fn probe_genomic_seed_library() -> KernelGenomicSeedLibraryWireReport {
    to_report(
        kernel_probe(),
        "Genomic seed library probe (letter ft) — distinct from reversibleQuantumUndoReady, deltaSeedSynchronizationReady, sparseSeedInstancingReady, binarySeedStreamerReady, and probe_kernel_foundation; asset_dna_aaa_ready HELD",
    )
}

/// Tauri IPC — genomic seed library honesty.
#[tauri::command]
pub fn probe_genomic_seed_library_cmd() -> KernelGenomicSeedLibraryWireReport {
    probe_genomic_seed_library()
}

/// Tauri IPC — run genomic seed library soak.
#[tauri::command]
pub fn run_kernel_genomic_seed_library_soak_cmd() -> KernelGenomicSeedLibraryWireReport {
    run_kernel_genomic_seed_library_soak()
}

//! Reversible quantum undo desktop wire — letter **fs**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::reversible_quantum_undo`
//! (WorldSoA snapshot / inverse MutEvent undo stack; soak apply→undo).
//! Honesty probe `reversibleQuantumUndoReady` is **distinct** from fr
//! `ghostStatePredictorReady`, fh `deltaSeedSynchronizationReady`, du
//! `shadowTimeReversalReady`, and prior. Full editor undo AAA
//! (`editor_undo_aaa_ready`) stays false (HELD; web Yjs undo exists).
//! Coins / Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::reversible_quantum_undo::{
    probe_reversible_quantum_undo as kernel_probe, run_reversible_quantum_undo_soak,
    ReversibleQuantumUndoSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelReversibleQuantumUndoWireReport {
    pub reversible_quantum_undo_ready: bool,
    pub apply_mutated_state: bool,
    pub snapshot_undo_restored: bool,
    pub inverse_mut_undo_restored: bool,
    pub empty_undo_fail_closed: bool,
    pub outputs_finite: bool,
    pub entity_count: u32,
    pub undo_frames_restored: u32,
    pub original_fingerprint: u64,
    pub restored_fingerprint: u64,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub editor_undo_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: ReversibleQuantumUndoSoakReport,
    note: impl Into<String>,
) -> KernelReversibleQuantumUndoWireReport {
    KernelReversibleQuantumUndoWireReport {
        reversible_quantum_undo_ready: r.reversible_quantum_undo_ready,
        apply_mutated_state: r.apply_mutated_state,
        snapshot_undo_restored: r.snapshot_undo_restored,
        inverse_mut_undo_restored: r.inverse_mut_undo_restored,
        empty_undo_fail_closed: r.empty_undo_fail_closed,
        outputs_finite: r.outputs_finite,
        entity_count: r.entity_count,
        undo_frames_restored: r.undo_frames_restored,
        original_fingerprint: r.original_fingerprint,
        restored_fingerprint: r.restored_fingerprint,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fs".into(),
        note: note.into(),
        editor_undo_aaa_ready: r.editor_undo_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run reversible quantum undo soak via kernel.
pub fn run_kernel_reversible_quantum_undo_soak() -> KernelReversibleQuantumUndoWireReport {
    let r = run_reversible_quantum_undo_soak();
    let note = if !r.reversible_quantum_undo_ready {
        "Reversible quantum undo soak failed — reversibleQuantumUndoReady stays false"
    } else {
        "Desktop soak: WorldSoA snapshot + inverse MutEvent undo stack; apply→undo restores original fingerprint; empty undo fail-closed — reversibleQuantumUndoReady true; editor_undo_aaa_ready false; distinct from fr ghostStatePredictorReady + fh deltaSeedSynchronizationReady + du shadowTimeReversalReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `reversibleQuantumUndoReady` (letter fs).
pub fn probe_reversible_quantum_undo() -> KernelReversibleQuantumUndoWireReport {
    to_report(
        kernel_probe(),
        "Reversible quantum undo probe (letter fs) — distinct from ghostStatePredictorReady, deltaSeedSynchronizationReady, shadowTimeReversalReady, stateSyncProtocolReady, metabolicMemoryReady, and probe_kernel_foundation; editor_undo_aaa_ready HELD",
    )
}

/// Tauri IPC — reversible quantum undo honesty.
#[tauri::command]
pub fn probe_reversible_quantum_undo_cmd() -> KernelReversibleQuantumUndoWireReport {
    probe_reversible_quantum_undo()
}

/// Tauri IPC — run reversible quantum undo soak.
#[tauri::command]
pub fn run_kernel_reversible_quantum_undo_soak_cmd() -> KernelReversibleQuantumUndoWireReport {
    run_kernel_reversible_quantum_undo_soak()
}

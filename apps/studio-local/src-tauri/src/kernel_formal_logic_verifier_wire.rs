//! Formal Logic Verifier desktop wire — letter **fv**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::formal_logic_verifier`
//! (propositional MutEvent / SceneGraph predicates: no NaN, scale bounds,
//! seed non-zero; soak valid accept / invalid fail-closed). Honesty probe
//! `formalLogicVerifierReady` is **distinct** from fu
//! `genomicSeedTransmitterReady`, ft `genomicSeedLibraryReady`, fh
//! `deltaSeedSynchronizationReady`, fb `geometricScaleConstraintsReady`, and
//! prior. Full theorem-prover AAA (`theorem_prover_aaa_ready`) stays false
//! (HELD). Coins / Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::formal_logic_verifier::{
    probe_formal_logic_verifier as kernel_probe, run_formal_logic_verifier_soak,
    FormalLogicVerifierSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFormalLogicVerifierWireReport {
    pub formal_logic_verifier_ready: bool,
    pub valid_accepted: bool,
    pub invalid_nan_rejected: bool,
    pub invalid_seed_rejected: bool,
    pub invalid_scale_rejected: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub events_checked: u32,
    pub scales_checked: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub theorem_prover_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: FormalLogicVerifierSoakReport,
    note: impl Into<String>,
) -> KernelFormalLogicVerifierWireReport {
    KernelFormalLogicVerifierWireReport {
        formal_logic_verifier_ready: r.formal_logic_verifier_ready,
        valid_accepted: r.valid_accepted,
        invalid_nan_rejected: r.invalid_nan_rejected,
        invalid_seed_rejected: r.invalid_seed_rejected,
        invalid_scale_rejected: r.invalid_scale_rejected,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        events_checked: r.events_checked,
        scales_checked: r.scales_checked,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fv".into(),
        note: note.into(),
        theorem_prover_aaa_ready: r.theorem_prover_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run formal logic verifier soak via kernel.
pub fn run_kernel_formal_logic_verifier_soak() -> KernelFormalLogicVerifierWireReport {
    let r = run_formal_logic_verifier_soak();
    let note = if !r.formal_logic_verifier_ready {
        "Formal logic verifier soak failed — formalLogicVerifierReady stays false"
    } else {
        "Desktop soak: MutEvent/SceneGraph predicates no-NaN + scale bounds + seed non-zero; valid accept + invalid fail-closed — formalLogicVerifierReady true; theorem_prover_aaa_ready false; distinct from fu genomicSeedTransmitterReady + ft genomicSeedLibraryReady + fh deltaSeedSynchronizationReady + fb geometricScaleConstraintsReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `formalLogicVerifierReady` (letter fv).
pub fn probe_formal_logic_verifier() -> KernelFormalLogicVerifierWireReport {
    to_report(
        kernel_probe(),
        "Formal logic verifier probe (letter fv) — distinct from genomicSeedTransmitterReady, genomicSeedLibraryReady, deltaSeedSynchronizationReady, geometricScaleConstraintsReady, and probe_kernel_foundation; theorem_prover_aaa_ready HELD",
    )
}

/// Tauri IPC — formal logic verifier honesty.
#[tauri::command]
pub fn probe_formal_logic_verifier_cmd() -> KernelFormalLogicVerifierWireReport {
    probe_formal_logic_verifier()
}

/// Tauri IPC — run formal logic verifier soak.
#[tauri::command]
pub fn run_kernel_formal_logic_verifier_soak_cmd() -> KernelFormalLogicVerifierWireReport {
    run_kernel_formal_logic_verifier_soak()
}

//! Quantum Overlap desktop wire — letter **fw**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::quantum_overlap`
//! (AABB–AABB + sphere–sphere SoA/pair overlap; soak intersect true /
//! disjoint false). Honesty probe `quantumOverlapReady` is **distinct**
//! from fv `formalLogicVerifierReady`, fu `genomicSeedTransmitterReady`,
//! ft `genomicSeedLibraryReady`, fh `deltaSeedSynchronizationReady`, ey
//! `contextualPhysicsOverrideReady`, and prior. Full broadphase AAA
//! (`broadphase_aaa_ready`) stays false (HELD). Coins / Agones / Nanite /
//! DLSS / Quic HELD.

use aethel_kernel_rust::quantum_overlap::{
    probe_quantum_overlap as kernel_probe, run_quantum_overlap_soak, QuantumOverlapSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelQuantumOverlapWireReport {
    pub quantum_overlap_ready: bool,
    pub aabb_intersect_true: bool,
    pub aabb_disjoint_false: bool,
    pub sphere_intersect_true: bool,
    pub sphere_disjoint_false: bool,
    pub soa_pairs_correct: bool,
    pub touching_counts: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub aabb_pairs_found: u32,
    pub sphere_pairs_found: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub broadphase_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: QuantumOverlapSoakReport,
    note: impl Into<String>,
) -> KernelQuantumOverlapWireReport {
    KernelQuantumOverlapWireReport {
        quantum_overlap_ready: r.quantum_overlap_ready,
        aabb_intersect_true: r.aabb_intersect_true,
        aabb_disjoint_false: r.aabb_disjoint_false,
        sphere_intersect_true: r.sphere_intersect_true,
        sphere_disjoint_false: r.sphere_disjoint_false,
        soa_pairs_correct: r.soa_pairs_correct,
        touching_counts: r.touching_counts,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        aabb_pairs_found: r.aabb_pairs_found,
        sphere_pairs_found: r.sphere_pairs_found,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fw".into(),
        note: note.into(),
        broadphase_aaa_ready: r.broadphase_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run quantum overlap soak via kernel.
pub fn run_kernel_quantum_overlap_soak() -> KernelQuantumOverlapWireReport {
    let r = run_quantum_overlap_soak();
    let note = if !r.quantum_overlap_ready {
        "Quantum overlap soak failed — quantumOverlapReady stays false"
    } else {
        "Desktop soak: AABB–AABB + sphere–sphere SoA/pair overlap; intersect true / disjoint false — quantumOverlapReady true; broadphase_aaa_ready false; distinct from fv formalLogicVerifierReady + fu genomicSeedTransmitterReady + ft genomicSeedLibraryReady + fh deltaSeedSynchronizationReady + ey contextualPhysicsOverrideReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `quantumOverlapReady` (letter fw).
pub fn probe_quantum_overlap() -> KernelQuantumOverlapWireReport {
    to_report(
        kernel_probe(),
        "Quantum overlap probe (letter fw) — distinct from formalLogicVerifierReady, genomicSeedTransmitterReady, genomicSeedLibraryReady, deltaSeedSynchronizationReady, contextualPhysicsOverrideReady, and probe_kernel_foundation; broadphase_aaa_ready HELD",
    )
}

/// Tauri IPC — quantum overlap honesty.
#[tauri::command]
pub fn probe_quantum_overlap_cmd() -> KernelQuantumOverlapWireReport {
    probe_quantum_overlap()
}

/// Tauri IPC — run quantum overlap soak.
#[tauri::command]
pub fn run_kernel_quantum_overlap_soak_cmd() -> KernelQuantumOverlapWireReport {
    run_kernel_quantum_overlap_soak()
}

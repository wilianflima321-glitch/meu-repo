//! Ghost state predictor desktop wire — letter **fr**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::ghost_state_predictor`
//! (WorldSoA dead-reckon `p' = p + v·dt·timescale`; soak vs er integrate).
//! Honesty probe `ghostStatePredictorReady` is **distinct** from er
//! `velocityBufferEcsReady`, fq `metabolicMemoryReady`, fp
//! `hierarchicalStreamingCacheReady`, fo `liveCacheManagerReady`, and prior.
//! Full netcode prediction AAA (`netcode_prediction_aaa_ready`) stays false
//! (HELD). Coins / Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::ghost_state_predictor::{
    probe_ghost_state_predictor as kernel_probe, run_ghost_state_predictor_soak,
    GhostStatePredictorSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGhostStatePredictorWireReport {
    pub ghost_state_predictor_ready: bool,
    pub predicted_matches_integrated: bool,
    pub entities_moved: bool,
    pub static_near_zero: bool,
    pub inactive_held: bool,
    pub world_unmutated_by_predict: bool,
    pub outputs_finite: bool,
    pub entity_count: u32,
    pub active_predicted: u32,
    pub moving_mean_abs: f32,
    pub static_mean_abs: f32,
    pub predict_match_err: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub netcode_prediction_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: GhostStatePredictorSoakReport,
    note: impl Into<String>,
) -> KernelGhostStatePredictorWireReport {
    KernelGhostStatePredictorWireReport {
        ghost_state_predictor_ready: r.ghost_state_predictor_ready,
        predicted_matches_integrated: r.predicted_matches_integrated,
        entities_moved: r.entities_moved,
        static_near_zero: r.static_near_zero,
        inactive_held: r.inactive_held,
        world_unmutated_by_predict: r.world_unmutated_by_predict,
        outputs_finite: r.outputs_finite,
        entity_count: r.entity_count,
        active_predicted: r.active_predicted,
        moving_mean_abs: r.moving_mean_abs,
        static_mean_abs: r.static_mean_abs,
        predict_match_err: r.predict_match_err,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fr".into(),
        note: note.into(),
        netcode_prediction_aaa_ready: r.netcode_prediction_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run ghost state predictor soak via kernel.
pub fn run_kernel_ghost_state_predictor_soak() -> KernelGhostStatePredictorWireReport {
    let r = run_ghost_state_predictor_soak();
    let note = if !r.ghost_state_predictor_ready {
        "Ghost state predictor soak failed — ghostStatePredictorReady stays false"
    } else {
        "Desktop soak: WorldSoA dead-reckon p'=p+v·dt·timescale; predicted ≈ er integrate; static→near-zero; inactive held; predict does not mutate world — ghostStatePredictorReady true; netcode_prediction_aaa_ready false; distinct from er velocityBufferEcsReady + fq metabolicMemoryReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `ghostStatePredictorReady` (letter fr).
pub fn probe_ghost_state_predictor() -> KernelGhostStatePredictorWireReport {
    to_report(
        kernel_probe(),
        "Ghost state predictor probe (letter fr) — distinct from velocityBufferEcsReady, metabolicMemoryReady, hierarchicalStreamingCacheReady, liveCacheManagerReady, thermalSchedulerReady, asynchronousRealityThreadsReady, cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; netcode_prediction_aaa_ready HELD",
    )
}

/// Tauri IPC — ghost state predictor honesty.
#[tauri::command]
pub fn probe_ghost_state_predictor_cmd() -> KernelGhostStatePredictorWireReport {
    probe_ghost_state_predictor()
}

/// Tauri IPC — run ghost state predictor soak.
#[tauri::command]
pub fn run_kernel_ghost_state_predictor_soak_cmd() -> KernelGhostStatePredictorWireReport {
    run_kernel_ghost_state_predictor_soak()
}

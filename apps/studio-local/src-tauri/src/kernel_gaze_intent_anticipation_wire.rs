//! R4 — Gaze & Intent Anticipation desktop wire (letter **lh**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::gaze_intent_anticipation`]
//! — a antecipação de foco com look-ahead ≤ 300 ms (perseguição sustentada),
//! classificação de intenção (fixação/antecipação/sacádica) com fail-closed em
//! sacádicas e amostras inválidas, hint de foco/focal UI em [0,1], colapso
//! contextual de UI com hesitação e composição do substrato gt — expondo o soak
//! **fail-closed** na superfície IPC desktop. A wire espelha o report completo
//! do substrato e adiciona `wire_on_surface` (self-check do registro ACL). Feed
//! honesto do R4 — nunca afirma prontidão gaze-anticipation / intent /
//! focal-hint / ui-collapse (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::gaze_intent_anticipation::{
    run_gaze_intent_anticipation_soak, GazeIntentAnticipationReport,
};
use serde::{Deserialize, Serialize};

/// Wire report da Gaze & Intent Anticipation — espelho camelCase do
/// `GazeIntentAnticipationReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGazeIntentAnticipationWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub lookahead_bounded: bool,
    pub static_gaze_identity: bool,
    pub velocity_advances_focal_point: bool,
    pub saccade_classified_not_fixation: bool,
    pub saccade_fail_closed: bool,
    pub fail_closed_on_invalid: bool,
    pub prediction_finite: bool,
    pub prediction_bounded: bool,
    pub focal_hint_in_unit: bool,
    pub ui_collapse_in_unit: bool,
    pub deterministic_replay: bool,
    pub substrate_ready: bool,
    pub fovea_mean: f32,
    pub periph_mean: f32,
    pub fovea_dominates_periph: bool,
    pub temporal_blend_uses_motion: bool,
    pub future_x: f32,
    pub future_y: f32,
    pub lookahead_ms: f32,
    pub phase_index: u32,
    pub phase_tag: String,
    pub focal_hint: f32,
    pub ui_collapse_hint: f32,
    pub confidence: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub gaze_anticipation_aaa_ready: bool,
    pub intent_classification_aaa_ready: bool,
    pub focal_hint_aaa_ready: bool,
    pub ui_collapse_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: GazeIntentAnticipationReport,
    wire_on_surface: bool,
) -> KernelGazeIntentAnticipationWireReport {
    KernelGazeIntentAnticipationWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        lookahead_bounded: r.lookahead_bounded,
        static_gaze_identity: r.static_gaze_identity,
        velocity_advances_focal_point: r.velocity_advances_focal_point,
        saccade_classified_not_fixation: r.saccade_classified_not_fixation,
        saccade_fail_closed: r.saccade_fail_closed,
        fail_closed_on_invalid: r.fail_closed_on_invalid,
        prediction_finite: r.prediction_finite,
        prediction_bounded: r.prediction_bounded,
        focal_hint_in_unit: r.focal_hint_in_unit,
        ui_collapse_in_unit: r.ui_collapse_in_unit,
        deterministic_replay: r.deterministic_replay,
        substrate_ready: r.substrate_ready,
        fovea_mean: r.fovea_mean,
        periph_mean: r.periph_mean,
        fovea_dominates_periph: r.fovea_dominates_periph,
        temporal_blend_uses_motion: r.temporal_blend_uses_motion,
        future_x: r.future_x,
        future_y: r.future_y,
        lookahead_ms: r.lookahead_ms,
        phase_index: r.phase_index,
        phase_tag: r.phase_tag.to_string(),
        focal_hint: r.focal_hint,
        ui_collapse_hint: r.ui_collapse_hint,
        confidence: r.confidence,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 29 reachable peers".into(),
        letter: "lh".into(),
        note: "Gaze look-ahead <=300ms sustained pursuit, intent classification fixation/anticipation/saccade fail-closed, focal + ui-collapse hints in [0,1], gt substrate".into(),
        gaze_anticipation_aaa_ready: r.gaze_anticipation_aaa_ready,
        intent_classification_aaa_ready: r.intent_classification_aaa_ready,
        focal_hint_aaa_ready: r.focal_hint_aaa_ready,
        ui_collapse_aaa_ready: r.ui_collapse_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Gaze & Intent Anticipation (letter lh).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_gaze_intent_anticipation_wire() -> KernelGazeIntentAnticipationWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_gaze_intent_anticipation_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_gaze_intent_anticipation_soak_cmd")
                .is_some();
    to_report(run_gaze_intent_anticipation_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Gaze & Intent Anticipation probe.
#[tauri::command]
pub fn probe_gaze_intent_anticipation_cmd() -> KernelGazeIntentAnticipationWireReport {
    probe_gaze_intent_anticipation_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGazeIntentAnticipationSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub lookahead_bounded: bool,
    pub static_gaze_identity: bool,
    pub velocity_advances_focal_point: bool,
    pub saccade_fail_closed: bool,
    pub fail_closed_on_invalid: bool,
    pub prediction_finite: bool,
    pub deterministic_replay: bool,
    pub substrate_ready: bool,
    pub fovea_dominates_periph: bool,
    pub lookahead_ms: f32,
    pub phase_index: u32,
    pub phase_tag: String,
    pub focal_hint: f32,
    pub ui_collapse_hint: f32,
    pub confidence: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub gaze_anticipation_aaa_ready: bool,
    pub intent_classification_aaa_ready: bool,
    pub focal_hint_aaa_ready: bool,
    pub ui_collapse_aaa_ready: bool,
}

fn soak_to_wire(r: GazeIntentAnticipationReport) -> KernelGazeIntentAnticipationSoakWireReport {
    KernelGazeIntentAnticipationSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        lookahead_bounded: r.lookahead_bounded,
        static_gaze_identity: r.static_gaze_identity,
        velocity_advances_focal_point: r.velocity_advances_focal_point,
        saccade_fail_closed: r.saccade_fail_closed,
        fail_closed_on_invalid: r.fail_closed_on_invalid,
        prediction_finite: r.prediction_finite,
        deterministic_replay: r.deterministic_replay,
        substrate_ready: r.substrate_ready,
        fovea_dominates_periph: r.fovea_dominates_periph,
        lookahead_ms: r.lookahead_ms,
        phase_index: r.phase_index,
        phase_tag: r.phase_tag.to_string(),
        focal_hint: r.focal_hint,
        ui_collapse_hint: r.ui_collapse_hint,
        confidence: r.confidence,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        gaze_anticipation_aaa_ready: r.gaze_anticipation_aaa_ready,
        intent_classification_aaa_ready: r.intent_classification_aaa_ready,
        focal_hint_aaa_ready: r.focal_hint_aaa_ready,
        ui_collapse_aaa_ready: r.ui_collapse_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay da Gaze & Intent Anticipation (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_gaze_intent_anticipation_soak_cmd(
) -> KernelGazeIntentAnticipationSoakWireReport {
    soak_to_wire(run_gaze_intent_anticipation_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_gaze_anticipation_honestly() {
        let r = probe_gaze_intent_anticipation_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(r.lookahead_bounded);
        assert!(r.static_gaze_identity);
        assert!(r.velocity_advances_focal_point);
        assert!(r.saccade_classified_not_fixation);
        assert!(r.saccade_fail_closed);
        assert!(r.fail_closed_on_invalid);
        assert!(r.prediction_finite);
        assert!(r.prediction_bounded);
        assert!(r.focal_hint_in_unit);
        assert!(r.ui_collapse_in_unit);
        assert!(r.deterministic_replay);
        assert!(r.substrate_ready);
        assert!(r.fovea_dominates_periph);
        assert!(r.temporal_blend_uses_motion);
        assert!(r.fovea_mean.is_finite() && r.periph_mean.is_finite());
        assert!(r.future_x.is_finite() && r.future_y.is_finite());
        assert!(r.lookahead_ms.is_finite() && r.lookahead_ms <= 300.0);
        assert!(r.focal_hint.is_finite() && r.ui_collapse_hint.is_finite() && r.confidence.is_finite());
        assert!(r.zero_alloc_hot_loop);
        assert!(r.measured_pass_micros.is_finite());
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "lh");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_gaze_intent_anticipation_wire();
        assert!(
            !r.gaze_anticipation_aaa_ready,
            "honest wire must never claim gaze anticipation AAA readiness"
        );
        assert!(
            !r.intent_classification_aaa_ready,
            "honest wire must never claim intent classification AAA readiness"
        );
        assert!(
            !r.focal_hint_aaa_ready,
            "honest wire must never claim focal hint AAA readiness"
        );
        assert!(
            !r.ui_collapse_aaa_ready,
            "honest wire must never claim ui collapse AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::gaze_intent_anticipation::run_gaze_intent_anticipation_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert!(
            w.lookahead_bounded
                && w.static_gaze_identity
                && w.velocity_advances_focal_point
                && w.saccade_fail_closed
                && w.fail_closed_on_invalid
        );
        assert!(w.substrate_ready && w.fovea_dominates_periph && w.zero_alloc_hot_loop);
        assert!(w.lookahead_ms <= 300.0);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.gaze_anticipation_aaa_ready
                && !w.intent_classification_aaa_ready
                && !w.focal_hint_aaa_ready
                && !w.ui_collapse_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_gaze_intent_anticipation_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

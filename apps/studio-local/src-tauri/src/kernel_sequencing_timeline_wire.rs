//! R1.5 — Non-Linear Timeline Sequencing parity (S-3 Sequencing tool backend,
//! letter **ju**).
//!
//! Espelha a autoridade do kernel
//! [`aethel_kernel_rust::sequencing_timeline`] — o avaliador determinístico de
//! timeline não-linear (tracks, keyframes, interpolação Step / Linear /
//! Catmull-Rom uniforme) com **validação fail-closed** (keyframes
//! desordenados/duplicados/NaN e tempos não-finitos rejeitados), clamp fora do
//! intervalo autorado, e **composição real** através do
//! [`aethel_kernel_rust::in_engine_compositor_zero_loss`]
//! `InEngineCompositorZeroLoss::process_timeline_compositor_frame` (export
//! zero-loss ProRes 4444 / EXR 16-bit float / spectral stream). Replay
//! determinístico de todos os 241 frames autorados (4 s × 60 fps) com spot-checks
//! closed-form (midpoint linear = 15.0, step hold = 0.1→0.8, midpoint Catmull-Rom
//! = 30.8125). A wire espelha o report completo do substrato e adiciona
//! `wire_on_surface` (self-check do registro ACL). Distinção medida vs os pares
//! reais: io ([`aethel_kernel_rust::matter_thermodynamics_sph`]
//! `sph_evidence_fingerprint`), hs ([`aethel_kernel_rust::unified_field_network`]
//! `evidence_fingerprint`), fw ([`aethel_kernel_rust::quantum_overlap`]
//! `fingerprint`), ip4 ([`aethel_kernel_rust::svo_terrain_world_partition`]
//! `fingerprint`), s17 ([`aethel_kernel_rust::physics_world`]
//! `evidence_fingerprint`) e jt ([`aethel_kernel_rust::task_graph_scheduler`]
//! `evidence_fingerprint`). Feed honesto do S-register S-3 — **nunca** afirma
//! prontidão Sequencer / After Effects / Nuke AAA (flags HELD no kernel,
//! espelhadas aqui).

use aethel_kernel_rust::sequencing_timeline::{
    probe_sequencing_timeline, run_sequencing_timeline_soak, SequencingTimelineSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Non-Linear Timeline Sequencing — espelho camelCase do
/// `SequencingTimelineSoakReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSequencingTimelineWireReport {
    pub sequencing_timeline_ready: bool,
    pub replay_deterministic: bool,
    pub linear_interpolation_ok: bool,
    pub step_hold_ok: bool,
    pub cubic_tangent_ok: bool,
    pub validation_fail_closed_ok: bool,
    pub range_clamp_ok: bool,
    pub composition_ok: bool,
    pub camera_roll_at_frame30: f32,
    pub light_intensity_at_frame84: f32,
    pub lens_focus_at_frame90: f32,
    pub frame0_sample_count: u32,
    pub frame120_sample_count: u32,
    pub track_count: u32,
    pub soaked_frames: u32,
    pub soak_elapsed_ns: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    // Distinctness — measured against real peer probes, never hard-coded true.
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    /// Fail-closed — never claim Sequencer / After Effects / Nuke AAA.
    pub sequencer_aaa_ready: bool,
    pub after_effects_aaa_ready: bool,
    pub nuke_aaa_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: SequencingTimelineSoakReport,
    wire_on_surface: bool,
) -> KernelSequencingTimelineWireReport {
    KernelSequencingTimelineWireReport {
        sequencing_timeline_ready: r.sequencing_timeline_ready,
        replay_deterministic: r.replay_deterministic,
        linear_interpolation_ok: r.linear_interpolation_ok,
        step_hold_ok: r.step_hold_ok,
        cubic_tangent_ok: r.cubic_tangent_ok,
        validation_fail_closed_ok: r.validation_fail_closed_ok,
        range_clamp_ok: r.range_clamp_ok,
        composition_ok: r.composition_ok,
        camera_roll_at_frame30: r.camera_roll_at_frame30,
        light_intensity_at_frame84: r.light_intensity_at_frame84,
        lens_focus_at_frame90: r.lens_focus_at_frame90,
        frame0_sample_count: r.frame0_sample_count,
        frame120_sample_count: r.frame120_sample_count,
        track_count: r.track_count,
        soaked_frames: r.soaked_frames,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        sequencer_aaa_ready: r.sequencer_aaa_ready,
        after_effects_aaa_ready: r.after_effects_aaa_ready,
        nuke_aaa_ready: r.nuke_aaa_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R1.5 Non-Linear Timeline Sequencing (letter ju).
///
/// Roda o soak determinístico do kernel (replay de 241 frames, interpolação
/// closed-form, fail-closed, clamp, composição real zero-loss) e reporta a
/// paridade completa. A wire também se auto-verifica: `wire_on_surface` é `true`
/// apenas quando os dois comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de
/// runtime.
pub fn probe_sequencing_timeline_wire() -> KernelSequencingTimelineWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_sequencing_timeline_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_sequencing_timeline_soak_cmd").is_some();
    to_report(probe_sequencing_timeline(), wire_on_surface)
}

/// Tauri IPC — R1.5 Non-Linear Timeline Sequencing probe.
#[tauri::command]
pub fn probe_sequencing_timeline_cmd() -> KernelSequencingTimelineWireReport {
    probe_sequencing_timeline_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSequencingTimelineSoakWireReport {
    pub sequencing_timeline_ready: bool,
    pub replay_deterministic: bool,
    pub linear_interpolation_ok: bool,
    pub step_hold_ok: bool,
    pub cubic_tangent_ok: bool,
    pub validation_fail_closed_ok: bool,
    pub range_clamp_ok: bool,
    pub composition_ok: bool,
    pub camera_roll_at_frame30: f32,
    pub light_intensity_at_frame84: f32,
    pub lens_focus_at_frame90: f32,
    pub frame0_sample_count: u32,
    pub frame120_sample_count: u32,
    pub track_count: u32,
    pub soaked_frames: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub sequencer_aaa_ready: bool,
    pub after_effects_aaa_ready: bool,
    pub nuke_aaa_ready: bool,
}

fn soak_to_wire(r: SequencingTimelineSoakReport) -> KernelSequencingTimelineSoakWireReport {
    KernelSequencingTimelineSoakWireReport {
        sequencing_timeline_ready: r.sequencing_timeline_ready,
        replay_deterministic: r.replay_deterministic,
        linear_interpolation_ok: r.linear_interpolation_ok,
        step_hold_ok: r.step_hold_ok,
        cubic_tangent_ok: r.cubic_tangent_ok,
        validation_fail_closed_ok: r.validation_fail_closed_ok,
        range_clamp_ok: r.range_clamp_ok,
        composition_ok: r.composition_ok,
        camera_roll_at_frame30: r.camera_roll_at_frame30,
        light_intensity_at_frame84: r.light_intensity_at_frame84,
        lens_focus_at_frame90: r.lens_focus_at_frame90,
        frame0_sample_count: r.frame0_sample_count,
        frame120_sample_count: r.frame120_sample_count,
        track_count: r.track_count,
        soaked_frames: r.soaked_frames,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        sequencer_aaa_ready: r.sequencer_aaa_ready,
        after_effects_aaa_ready: r.after_effects_aaa_ready,
        nuke_aaa_ready: r.nuke_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Non-Linear Timeline Sequencing (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_sequencing_timeline_soak_cmd() -> KernelSequencingTimelineSoakWireReport {
    soak_to_wire(run_sequencing_timeline_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_sequencing_timeline_honestly() {
        let r = probe_sequencing_timeline_wire();
        // Soak determinístico green: replay, interpolação closed-form, fail-closed,
        // clamp e composição zero-loss real.
        assert!(r.sequencing_timeline_ready);
        assert!(r.replay_deterministic);
        assert!(r.linear_interpolation_ok);
        assert!(r.step_hold_ok);
        assert!(r.cubic_tangent_ok);
        assert!(r.validation_fail_closed_ok);
        assert!(r.range_clamp_ok);
        assert!(r.composition_ok);
        // Cena determinística de 3 tracks / 241 frames: amostras completas em
        // frame 0 e 120, valores closed-form exatos.
        assert_eq!(r.frame0_sample_count, 3);
        assert_eq!(r.frame120_sample_count, 3);
        assert_eq!(r.track_count, 3);
        assert_eq!(r.soaked_frames, 241);
        assert!((r.camera_roll_at_frame30 - 15.0).abs() < 1e-3);
        assert!((r.light_intensity_at_frame84 - 0.1).abs() < 1e-3);
        assert!((r.lens_focus_at_frame90 - 30.8125).abs() < 1e-3);
        assert_eq!(r.evidence_kind, "non_linear_timeline_deterministic_evaluator");
        assert_ne!(r.evidence_fingerprint, 0);
        // Distinção medida vs os 6 peers reais (nunca hard-coded).
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        // Auto-referencial: a própria wire R1.5 está registrada na superfície.
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_sequencing_timeline_wire();
        assert!(
            !r.sequencer_aaa_ready,
            "honest wire must never claim Sequencer AAA readiness"
        );
        assert!(
            !r.after_effects_aaa_ready,
            "honest wire must never claim After Effects AAA readiness"
        );
        assert!(
            !r.nuke_aaa_ready,
            "honest wire must never claim Nuke AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::sequencing_timeline::run_sequencing_timeline_soak(),
        );
        assert!(w.sequencing_timeline_ready);
        assert!(w.replay_deterministic);
        assert!(w.linear_interpolation_ok);
        assert!(w.step_hold_ok);
        assert!(w.cubic_tangent_ok);
        assert!(w.validation_fail_closed_ok);
        assert!(w.range_clamp_ok);
        assert!(w.composition_ok);
        assert_eq!(w.frame0_sample_count, 3);
        assert_eq!(w.frame120_sample_count, 3);
        assert_eq!(w.track_count, 3);
        assert_eq!(w.soaked_frames, 241);
        assert!((w.camera_roll_at_frame30 - 15.0).abs() < 1e-3);
        assert!((w.light_intensity_at_frame84 - 0.1).abs() < 1e-3);
        assert!((w.lens_focus_at_frame90 - 30.8125).abs() < 1e-3);
        assert_eq!(w.evidence_kind, "non_linear_timeline_deterministic_evaluator");
        assert!(
            !w.sequencer_aaa_ready && !w.after_effects_aaa_ready && !w.nuke_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo dos campos determinísticos: o fingerprint estrutural do
        // probe espelha o do soak (mesma timeline de 3 tracks, mesmo replay de
        // 241 frames, mesmo XOR-fold). `evidence_fingerprint` do kernel não
        // mistura `soak_elapsed_ns`, então é run-invariant — ainda assim
        // comparamos os campos determinísticos e afirmamos o fingerprint
        // não-zero em ambos.
        let probe = probe_sequencing_timeline_wire();
        assert_eq!(probe.frame0_sample_count, w.frame0_sample_count);
        assert_eq!(probe.frame120_sample_count, w.frame120_sample_count);
        assert_eq!(probe.track_count, w.track_count);
        assert_eq!(probe.soaked_frames, w.soaked_frames);
        assert_eq!(probe.evidence_kind, w.evidence_kind);
        assert!((probe.camera_roll_at_frame30 - w.camera_roll_at_frame30).abs() < 1e-6);
        assert!((probe.light_intensity_at_frame84 - w.light_intensity_at_frame84).abs() < 1e-6);
        assert!((probe.lens_focus_at_frame90 - w.lens_focus_at_frame90).abs() < 1e-6);
        assert!(probe.replay_deterministic && w.replay_deterministic);
        assert!(probe.composition_ok && w.composition_ok);
        assert_ne!(probe.evidence_fingerprint, 0);
        assert_ne!(w.evidence_fingerprint, 0);
    }
}

//! R4 — Narrative Tension Clock desktop wire (letter **li**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::narrative_tension_clock`]
//! — o relógio de tensão narrativa (oscilador de 10 s, phase machine
//! calmaria→antecipação→clímax→resolução, impulsos com decaimento exponencial,
//! acoplamento CTI/sonho limitado, fail-closed em dt/impulso inválidos) —
//! expondo o soak **fail-closed** na superfície IPC desktop. A wire espelha o
//! report completo do substrato e adiciona `wire_on_surface` (self-check do
//! registro ACL). Feed honesto do R4 — nunca afirma prontidão narrative-clock /
//! tension-phase-machine / tension-impulse / tension-coupling (flags HELD no
//! kernel, espelhadas aqui).

use aethel_kernel_rust::narrative_tension_clock::{
    run_narrative_tension_clock_soak, NarrativeTensionClockReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Narrative Tension Clock — espelho camelCase do
/// `NarrativeTensionClockReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNarrativeTensionClockWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub oscillator_period: bool,
    pub phase_sequence_cyclic: bool,
    pub tension_bounded: bool,
    pub tension_peaks_at_climax: bool,
    pub tension_min_in_calm: bool,
    pub impulse_elevates_tension: bool,
    pub impulse_decays_over_time: bool,
    pub cti_impulse_bounded: bool,
    pub dream_impulse_bounded: bool,
    pub fail_closed_invalid_dt: bool,
    pub fail_closed_invalid_impulse: bool,
    pub deterministic_replay: bool,
    pub clock_finite: bool,
    pub phase_index: u32,
    pub phase_tag: String,
    pub representative_tension: f32,
    pub representative_base: f32,
    pub representative_impulse: f32,
    pub impulse_count: u32,
    pub peak_tension: f32,
    pub hot_loop_peak_tension: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub narrative_clock_aaa_ready: bool,
    pub tension_phase_machine_aaa_ready: bool,
    pub tension_impulse_aaa_ready: bool,
    pub tension_coupling_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: NarrativeTensionClockReport,
    wire_on_surface: bool,
) -> KernelNarrativeTensionClockWireReport {
    KernelNarrativeTensionClockWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        oscillator_period: r.oscillator_period,
        phase_sequence_cyclic: r.phase_sequence_cyclic,
        tension_bounded: r.tension_bounded,
        tension_peaks_at_climax: r.tension_peaks_at_climax,
        tension_min_in_calm: r.tension_min_in_calm,
        impulse_elevates_tension: r.impulse_elevates_tension,
        impulse_decays_over_time: r.impulse_decays_over_time,
        cti_impulse_bounded: r.cti_impulse_bounded,
        dream_impulse_bounded: r.dream_impulse_bounded,
        fail_closed_invalid_dt: r.fail_closed_invalid_dt,
        fail_closed_invalid_impulse: r.fail_closed_invalid_impulse,
        deterministic_replay: r.deterministic_replay,
        clock_finite: r.clock_finite,
        phase_index: r.phase_index,
        phase_tag: r.phase_tag.to_string(),
        representative_tension: r.representative_tension,
        representative_base: r.representative_base,
        representative_impulse: r.representative_impulse,
        impulse_count: r.impulse_count,
        peak_tension: r.peak_tension,
        hot_loop_peak_tension: r.hot_loop_peak_tension,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 30 reachable peers".into(),
        letter: "li".into(),
        note: "Narrative tension clock 10s oscillator, calm->anticipation->climax->resolution phase machine, exponential impulse decay, bounded CTI/dream coupling".into(),
        narrative_clock_aaa_ready: r.narrative_clock_aaa_ready,
        tension_phase_machine_aaa_ready: r.tension_phase_machine_aaa_ready,
        tension_impulse_aaa_ready: r.tension_impulse_aaa_ready,
        tension_coupling_aaa_ready: r.tension_coupling_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Narrative Tension Clock (letter li).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_narrative_tension_clock_wire() -> KernelNarrativeTensionClockWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_narrative_tension_clock_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_narrative_tension_clock_soak_cmd").is_some();
    to_report(run_narrative_tension_clock_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Narrative Tension Clock probe.
#[tauri::command]
pub fn probe_narrative_tension_clock_cmd() -> KernelNarrativeTensionClockWireReport {
    probe_narrative_tension_clock_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNarrativeTensionClockSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub oscillator_period: bool,
    pub phase_sequence_cyclic: bool,
    pub tension_bounded: bool,
    pub tension_peaks_at_climax: bool,
    pub tension_min_in_calm: bool,
    pub impulse_elevates_tension: bool,
    pub impulse_decays_over_time: bool,
    pub cti_impulse_bounded: bool,
    pub dream_impulse_bounded: bool,
    pub fail_closed_invalid_dt: bool,
    pub fail_closed_invalid_impulse: bool,
    pub deterministic_replay: bool,
    pub clock_finite: bool,
    pub phase_index: u32,
    pub phase_tag: String,
    pub representative_tension: f32,
    pub impulse_count: u32,
    pub peak_tension: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub narrative_clock_aaa_ready: bool,
    pub tension_phase_machine_aaa_ready: bool,
    pub tension_impulse_aaa_ready: bool,
    pub tension_coupling_aaa_ready: bool,
}

fn soak_to_wire(r: NarrativeTensionClockReport) -> KernelNarrativeTensionClockSoakWireReport {
    KernelNarrativeTensionClockSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        oscillator_period: r.oscillator_period,
        phase_sequence_cyclic: r.phase_sequence_cyclic,
        tension_bounded: r.tension_bounded,
        tension_peaks_at_climax: r.tension_peaks_at_climax,
        tension_min_in_calm: r.tension_min_in_calm,
        impulse_elevates_tension: r.impulse_elevates_tension,
        impulse_decays_over_time: r.impulse_decays_over_time,
        cti_impulse_bounded: r.cti_impulse_bounded,
        dream_impulse_bounded: r.dream_impulse_bounded,
        fail_closed_invalid_dt: r.fail_closed_invalid_dt,
        fail_closed_invalid_impulse: r.fail_closed_invalid_impulse,
        deterministic_replay: r.deterministic_replay,
        clock_finite: r.clock_finite,
        phase_index: r.phase_index,
        phase_tag: r.phase_tag.to_string(),
        representative_tension: r.representative_tension,
        impulse_count: r.impulse_count,
        peak_tension: r.peak_tension,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        narrative_clock_aaa_ready: r.narrative_clock_aaa_ready,
        tension_phase_machine_aaa_ready: r.tension_phase_machine_aaa_ready,
        tension_impulse_aaa_ready: r.tension_impulse_aaa_ready,
        tension_coupling_aaa_ready: r.tension_coupling_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Narrative Tension Clock (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_narrative_tension_clock_soak_cmd() -> KernelNarrativeTensionClockSoakWireReport {
    soak_to_wire(run_narrative_tension_clock_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_narrative_clock_honestly() {
        let r = probe_narrative_tension_clock_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(r.oscillator_period);
        assert!(r.phase_sequence_cyclic);
        assert!(r.tension_bounded);
        assert!(r.tension_peaks_at_climax);
        assert!(r.tension_min_in_calm);
        assert!(r.impulse_elevates_tension);
        assert!(r.impulse_decays_over_time);
        assert!(r.cti_impulse_bounded);
        assert!(r.dream_impulse_bounded);
        assert!(r.fail_closed_invalid_dt);
        assert!(r.fail_closed_invalid_impulse);
        assert!(r.deterministic_replay);
        assert!(r.clock_finite);
        assert!(!r.phase_tag.is_empty());
        assert!(r.representative_tension.is_finite());
        assert!(r.representative_base.is_finite() && r.representative_impulse.is_finite());
        assert!(r.peak_tension.is_finite() && r.hot_loop_peak_tension.is_finite());
        assert!(r.measured_pass_micros.is_finite());
        assert!(r.zero_alloc_hot_loop);
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "li");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_narrative_tension_clock_wire();
        assert!(
            !r.narrative_clock_aaa_ready,
            "honest wire must never claim narrative clock AAA readiness"
        );
        assert!(
            !r.tension_phase_machine_aaa_ready,
            "honest wire must never claim tension phase machine AAA readiness"
        );
        assert!(
            !r.tension_impulse_aaa_ready,
            "honest wire must never claim tension impulse AAA readiness"
        );
        assert!(
            !r.tension_coupling_aaa_ready,
            "honest wire must never claim tension coupling AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::narrative_tension_clock::run_narrative_tension_clock_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert!(
            w.oscillator_period
                && w.phase_sequence_cyclic
                && w.tension_bounded
                && w.tension_peaks_at_climax
                && w.tension_min_in_calm
        );
        assert!(w.impulse_elevates_tension && w.impulse_decays_over_time);
        assert!(w.fail_closed_invalid_dt && w.fail_closed_invalid_impulse);
        assert!(w.clock_finite && w.zero_alloc_hot_loop);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.narrative_clock_aaa_ready
                && !w.tension_phase_machine_aaa_ready
                && !w.tension_impulse_aaa_ready
                && !w.tension_coupling_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_narrative_tension_clock_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

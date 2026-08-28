//! R4 — Synesthetic Resonance Matrix desktop wire (letter **lg**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::synesthetic_resonance_matrix`]
//! — a matriz 3×3 de ressonância cross-modal (audio/light/matter × 3 bandas de
//! frequência), envelope temporal determinístico com decaimento ao piso,
//! acoplamento off-diagonal positivo e composição dx/jy/jv — expondo o soak
//! **fail-closed** na superfície IPC desktop. A wire espelha o report completo
//! do substrato e adiciona `wire_on_surface` (self-check do registro ACL). Feed
//! honesto do R4 — nunca afirma prontidão matrix-resonance / cross-modal-metal /
//! live-chromesthesia (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::synesthetic_resonance_matrix::{
    run_synesthetic_resonance_matrix_soak, SynestheticResonanceMatrixReport,
};
use serde::{Deserialize, Serialize};

/// Wire report da Synesthetic Resonance Matrix — espelho camelCase do
/// `SynestheticResonanceMatrixReport` do kernel mais o self-check
/// `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSynestheticResonanceMatrixWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub channels_finite: bool,
    pub all_gains_in_unit: bool,
    pub diagonal_positive: bool,
    pub audio_to_light_low_dominant: bool,
    pub matter_to_audio_low_dominant: bool,
    pub light_to_matter_mid_dominant: bool,
    pub off_diagonal_coupling_positive: bool,
    pub envelope_decays_to_floor: bool,
    pub deterministic_replay: bool,
    pub audio_energy: f32,
    pub light_energy: f32,
    pub matter_energy: f32,
    pub peak_resonance: f32,
    pub envelope_steps: u32,
    pub matrix_cells: u32,
    pub band_count: u32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub matrix_resonance_aaa_ready: bool,
    pub cross_modal_metal_aaa_ready: bool,
    pub live_chromesthesia_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: SynestheticResonanceMatrixReport,
    wire_on_surface: bool,
) -> KernelSynestheticResonanceMatrixWireReport {
    KernelSynestheticResonanceMatrixWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        channels_finite: r.channels_finite,
        all_gains_in_unit: r.all_gains_in_unit,
        diagonal_positive: r.diagonal_positive,
        audio_to_light_low_dominant: r.audio_to_light_low_dominant,
        matter_to_audio_low_dominant: r.matter_to_audio_low_dominant,
        light_to_matter_mid_dominant: r.light_to_matter_mid_dominant,
        off_diagonal_coupling_positive: r.off_diagonal_coupling_positive,
        envelope_decays_to_floor: r.envelope_decays_to_floor,
        deterministic_replay: r.deterministic_replay,
        audio_energy: r.audio_energy,
        light_energy: r.light_energy,
        matter_energy: r.matter_energy,
        peak_resonance: r.peak_resonance,
        envelope_steps: r.envelope_steps,
        matrix_cells: r.matrix_cells,
        band_count: r.band_count,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 28 reachable peers".into(),
        letter: "lg".into(),
        note: "3x3 cross-modal resonance matrix (audio/light/matter x 3 bands), deterministic envelope decay to floor, dx/jy/jv composition".into(),
        matrix_resonance_aaa_ready: r.matrix_resonance_aaa_ready,
        cross_modal_metal_aaa_ready: r.cross_modal_metal_aaa_ready,
        live_chromesthesia_aaa_ready: r.live_chromesthesia_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Synesthetic Resonance Matrix (letter lg).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_synesthetic_resonance_matrix_wire() -> KernelSynestheticResonanceMatrixWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_synesthetic_resonance_matrix_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_synesthetic_resonance_matrix_soak_cmd")
                .is_some();
    to_report(run_synesthetic_resonance_matrix_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Synesthetic Resonance Matrix probe.
#[tauri::command]
pub fn probe_synesthetic_resonance_matrix_cmd() -> KernelSynestheticResonanceMatrixWireReport {
    probe_synesthetic_resonance_matrix_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSynestheticResonanceMatrixSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub channels_finite: bool,
    pub all_gains_in_unit: bool,
    pub diagonal_positive: bool,
    pub off_diagonal_coupling_positive: bool,
    pub envelope_decays_to_floor: bool,
    pub deterministic_replay: bool,
    pub audio_energy: f32,
    pub light_energy: f32,
    pub matter_energy: f32,
    pub peak_resonance: f32,
    pub envelope_steps: u32,
    pub matrix_cells: u32,
    pub band_count: u32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub matrix_resonance_aaa_ready: bool,
    pub cross_modal_metal_aaa_ready: bool,
    pub live_chromesthesia_aaa_ready: bool,
}

fn soak_to_wire(r: SynestheticResonanceMatrixReport) -> KernelSynestheticResonanceMatrixSoakWireReport {
    KernelSynestheticResonanceMatrixSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        channels_finite: r.channels_finite,
        all_gains_in_unit: r.all_gains_in_unit,
        diagonal_positive: r.diagonal_positive,
        off_diagonal_coupling_positive: r.off_diagonal_coupling_positive,
        envelope_decays_to_floor: r.envelope_decays_to_floor,
        deterministic_replay: r.deterministic_replay,
        audio_energy: r.audio_energy,
        light_energy: r.light_energy,
        matter_energy: r.matter_energy,
        peak_resonance: r.peak_resonance,
        envelope_steps: r.envelope_steps,
        matrix_cells: r.matrix_cells,
        band_count: r.band_count,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        matrix_resonance_aaa_ready: r.matrix_resonance_aaa_ready,
        cross_modal_metal_aaa_ready: r.cross_modal_metal_aaa_ready,
        live_chromesthesia_aaa_ready: r.live_chromesthesia_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay da Synesthetic Resonance Matrix
/// (mesma evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_synesthetic_resonance_matrix_soak_cmd(
) -> KernelSynestheticResonanceMatrixSoakWireReport {
    soak_to_wire(run_synesthetic_resonance_matrix_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_synesthetic_matrix_honestly() {
        let r = probe_synesthetic_resonance_matrix_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(r.channels_finite);
        assert!(r.all_gains_in_unit);
        assert!(r.diagonal_positive);
        assert!(r.audio_to_light_low_dominant);
        assert!(r.matter_to_audio_low_dominant);
        assert!(r.light_to_matter_mid_dominant);
        assert!(r.off_diagonal_coupling_positive);
        assert!(r.envelope_decays_to_floor);
        assert!(r.deterministic_replay);
        assert!(r.audio_energy.is_finite() && r.light_energy.is_finite() && r.matter_energy.is_finite());
        assert!(r.peak_resonance.is_finite() && r.measured_pass_micros.is_finite());
        assert_eq!(r.matrix_cells, 9);
        assert_eq!(r.band_count, 3);
        assert!(r.zero_alloc_hot_loop);
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "lg");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_synesthetic_resonance_matrix_wire();
        assert!(
            !r.matrix_resonance_aaa_ready,
            "honest wire must never claim matrix resonance AAA readiness"
        );
        assert!(
            !r.cross_modal_metal_aaa_ready,
            "honest wire must never claim cross-modal metal AAA readiness"
        );
        assert!(
            !r.live_chromesthesia_aaa_ready,
            "honest wire must never claim live chromesthesia AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::synesthetic_resonance_matrix::run_synesthetic_resonance_matrix_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert!(w.channels_finite && w.all_gains_in_unit && w.diagonal_positive);
        assert!(w.envelope_decays_to_floor && w.deterministic_replay && w.zero_alloc_hot_loop);
        assert_eq!(w.matrix_cells, 9);
        assert_eq!(w.band_count, 3);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.matrix_resonance_aaa_ready
                && !w.cross_modal_metal_aaa_ready
                && !w.live_chromesthesia_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_synesthetic_resonance_matrix_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

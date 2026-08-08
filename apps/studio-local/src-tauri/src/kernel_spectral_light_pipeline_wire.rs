//! Spectral Light Pipeline desktop wire — letter **go**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::spectral_light_pipeline`
//! (multi-band SPD → CIE XYZ → linear sRGB + Beer–Lambert flesh; soak proves
//! red R>B, blue B>R, absorption darkens, thicker flesh lowers T, same-seed).
//! Honesty probe `spectralLightPipelineReady` is **distinct** from gj
//! `spectralDispersionCausticsReady`, gd `chromaticGlassRefractionReady`,
//! ge `preintegratedSssTransmittanceReady`, gm `radianceCascadesGiReady`,
//! gf `acesCinematicTonemapperReady`, and prior (never touch those probes).
//! Full spectral path-tracer AAA stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::spectral_light_pipeline::{
    probe_spectral_light_pipeline as kernel_probe, run_spectral_light_pipeline_soak,
    SpectralLightPipelineSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSpectralLightPipelineWireReport {
    pub spectral_light_pipeline_ready: bool,
    pub red_illuminant_r_exceeds_b: bool,
    pub blue_illuminant_b_exceeds_r: bool,
    pub absorption_darkens: bool,
    pub flesh_thicker_lowers_t: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub non_negative: bool,
    pub state_mutated: bool,
    pub red_r: f32,
    pub red_b: f32,
    pub blue_r: f32,
    pub blue_b: f32,
    pub white_energy: f32,
    pub absorbed_energy: f32,
    pub flesh_thin_t: f32,
    pub flesh_thick_t: f32,
    pub sample_count: u32,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub spectral_path_tracer_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: SpectralLightPipelineSoakReport,
    note: impl Into<String>,
) -> KernelSpectralLightPipelineWireReport {
    KernelSpectralLightPipelineWireReport {
        spectral_light_pipeline_ready: r.spectral_light_pipeline_ready,
        red_illuminant_r_exceeds_b: r.red_illuminant_r_exceeds_b,
        blue_illuminant_b_exceeds_r: r.blue_illuminant_b_exceeds_r,
        absorption_darkens: r.absorption_darkens,
        flesh_thicker_lowers_t: r.flesh_thicker_lowers_t,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        non_negative: r.non_negative,
        state_mutated: r.state_mutated,
        red_r: r.red_r,
        red_b: r.red_b,
        blue_r: r.blue_r,
        blue_b: r.blue_b,
        white_energy: r.white_energy,
        absorbed_energy: r.absorbed_energy,
        flesh_thin_t: r.flesh_thin_t,
        flesh_thick_t: r.flesh_thick_t,
        sample_count: r.sample_count,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "go".into(),
        note: note.into(),
        spectral_path_tracer_aaa_ready: r.spectral_path_tracer_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Spectral Light Pipeline soak via kernel.
pub fn run_kernel_spectral_light_pipeline_soak() -> KernelSpectralLightPipelineWireReport {
    let r = run_spectral_light_pipeline_soak();
    let note = if !r.spectral_light_pipeline_ready {
        "Spectral Light Pipeline soak failed — spectralLightPipelineReady stays false"
    } else {
        "Desktop soak: multi-band SPD→CIE XYZ→linear sRGB + Beer–Lambert flesh; red R>B + blue B>R + absorption darkens + thicker flesh lowers T + same seed→same — spectralLightPipelineReady true; spectral_path_tracer_aaa_ready false; distinct from gj spectralDispersionCausticsReady + gd chromaticGlassRefractionReady + ge preintegratedSssTransmittanceReady + gm radianceCascadesGiReady + gf acesCinematicTonemapperReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `spectralLightPipelineReady` (letter go).
pub fn probe_spectral_light_pipeline() -> KernelSpectralLightPipelineWireReport {
    to_report(
        kernel_probe(),
        "Spectral Light Pipeline probe (letter go) — distinct from spectralDispersionCausticsReady, chromaticGlassRefractionReady, preintegratedSssTransmittanceReady, radianceCascadesGiReady, acesCinematicTonemapperReady, and probe_kernel_foundation; spectral_path_tracer_aaa_ready HELD",
    )
}

/// Tauri IPC — Spectral Light Pipeline honesty.
#[tauri::command]
pub fn probe_spectral_light_pipeline_cmd() -> KernelSpectralLightPipelineWireReport {
    probe_spectral_light_pipeline()
}

/// Tauri IPC — run Spectral Light Pipeline soak.
#[tauri::command]
pub fn run_kernel_spectral_light_pipeline_soak_cmd() -> KernelSpectralLightPipelineWireReport {
    run_kernel_spectral_light_pipeline_soak()
}
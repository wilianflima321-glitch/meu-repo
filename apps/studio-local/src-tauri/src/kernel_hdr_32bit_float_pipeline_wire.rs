//! HDR 32-bit float pipeline desktop wire — letter **gr**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hdr_32bit_float_pipeline`
//! (linear scene-referred RGB → exposure/nits scale → optional Kelvin
//! white-balance lite → handoff-ready f32 buffer; soak proves values stay
//! f32 finite + higher exposure raises luminance + same seed→same). Honesty
//! probe `hdr32bitFloatPipelineReady` is **distinct** from gf
//! `acesCinematicTonemapperReady` and go `spectralLightPipelineReady`
//! (never touch those probes). Full HDR10 / Dolby Vision / UE HDR AAA stays
//! false (HELD). Pairs with gf ACES; does not claim full ACES 1.3.
//! Coins / Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::hdr_32bit_float_pipeline::{
    probe_hdr_32bit_float_pipeline as kernel_probe, run_hdr_32bit_float_pipeline_soak,
    Hdr32BitFloatPipelineSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHdr32BitFloatPipelineWireReport {
    pub hdr_32bit_float_pipeline_ready: bool,
    pub outputs_finite: bool,
    pub higher_exposure_raises_luminance: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub handoff_buffer_ok: bool,
    pub kelvin_wb_mutates_chromaticity: bool,
    pub legacy_uses_args: bool,
    pub state_mutated: bool,
    pub lum_low_exposure: f32,
    pub lum_high_exposure: f32,
    pub sample_r: f32,
    pub sample_g: f32,
    pub sample_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_hdr10_ready: bool,
    pub dolby_vision_ready: bool,
    pub ue_hdr_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: Hdr32BitFloatPipelineSoakReport,
    note: impl Into<String>,
) -> KernelHdr32BitFloatPipelineWireReport {
    KernelHdr32BitFloatPipelineWireReport {
        hdr_32bit_float_pipeline_ready: r.hdr_32bit_float_pipeline_ready,
        outputs_finite: r.outputs_finite,
        higher_exposure_raises_luminance: r.higher_exposure_raises_luminance,
        same_seed_same_output: r.same_seed_same_output,
        deterministic: r.deterministic,
        handoff_buffer_ok: r.handoff_buffer_ok,
        kelvin_wb_mutates_chromaticity: r.kelvin_wb_mutates_chromaticity,
        legacy_uses_args: r.legacy_uses_args,
        state_mutated: r.state_mutated,
        lum_low_exposure: r.lum_low_exposure,
        lum_high_exposure: r.lum_high_exposure,
        sample_r: r.sample_r,
        sample_g: r.sample_g,
        sample_b: r.sample_b,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gr".into(),
        note: note.into(),
        full_hdr10_ready: r.full_hdr10_ready,
        dolby_vision_ready: r.dolby_vision_ready,
        ue_hdr_aaa_ready: r.ue_hdr_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run HDR 32-bit float pipeline soak via kernel.
pub fn run_kernel_hdr_32bit_float_pipeline_soak() -> KernelHdr32BitFloatPipelineWireReport {
    let r = run_hdr_32bit_float_pipeline_soak();
    let note = if !r.hdr_32bit_float_pipeline_ready {
        "HDR 32-bit float pipeline soak failed — hdr32bitFloatPipelineReady stays false"
    } else {
        "Desktop soak: linear scene-referred RGB → exposure/nits → Kelvin WB lite → f32 handoff; finite + higher exposure→higher lum + same seed→same — hdr32bitFloatPipelineReady true; full_hdr10 / dolby_vision / ue_hdr_aaa false; distinct from gf acesCinematicTonemapperReady + go spectralLightPipelineReady + prior; pairs with gf ACES (not full ACES 1.3)"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hdr32bitFloatPipelineReady` (letter gr).
pub fn probe_hdr_32bit_float_pipeline() -> KernelHdr32BitFloatPipelineWireReport {
    to_report(
        kernel_probe(),
        "HDR 32-bit float pipeline probe (letter gr) — distinct from acesCinematicTonemapperReady, spectralLightPipelineReady, and probe_kernel_foundation; full_hdr10 / dolby_vision / ue_hdr_aaa HELD",
    )
}

/// Tauri IPC — HDR 32-bit float pipeline honesty.
#[tauri::command]
pub fn probe_hdr_32bit_float_pipeline_cmd() -> KernelHdr32BitFloatPipelineWireReport {
    probe_hdr_32bit_float_pipeline()
}

/// Tauri IPC — run HDR 32-bit float pipeline soak.
#[tauri::command]
pub fn run_kernel_hdr_32bit_float_pipeline_soak_cmd() -> KernelHdr32BitFloatPipelineWireReport {
    run_kernel_hdr_32bit_float_pipeline_soak()
}

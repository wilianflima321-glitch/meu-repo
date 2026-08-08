//! Strain-Aware Texturing desktop wire — letter **gs**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::strain_aware_texturing`
//! (curvature + UV-jacobian stretch → albedo whitening; soak proves higher
//! strain → whiter/brighter albedo + stretch increases whitening + same
//! seed → same + values ≥ 0). Honesty probe `strainAwareTexturingReady` is
//! **distinct** from gq `usdImporterBridgeReady`, gp `mslWgslCompilerReady`,
//! go `spectralLightPipelineReady`, gn `alexaCinematicOpticsReady`, gm
//! `radianceCascadesGiReady`, and prior (never touch those probes). Full
//! cloth/skin strain AAA stays false (HELD). Coins / Agones / Nanite / DLSS /
//! Quic HELD.

use aethel_kernel_rust::strain_aware_texturing::{
    probe_strain_aware_texturing as kernel_probe, run_strain_aware_texturing_soak,
    StrainAwareTexturingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelStrainAwareTexturingWireReport {
    pub strain_aware_texturing_ready: bool,
    pub higher_strain_whiter: bool,
    pub stretch_increases_whitening: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub non_negative: bool,
    pub state_mutated: bool,
    pub low_brightness: f32,
    pub high_brightness: f32,
    pub rest_whitening: f32,
    pub stretch_whitening: f32,
    pub sample_count: u32,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub cloth_skin_strain_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: StrainAwareTexturingSoakReport,
    note: impl Into<String>,
) -> KernelStrainAwareTexturingWireReport {
    KernelStrainAwareTexturingWireReport {
        strain_aware_texturing_ready: r.strain_aware_texturing_ready,
        higher_strain_whiter: r.higher_strain_whiter,
        stretch_increases_whitening: r.stretch_increases_whitening,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        non_negative: r.non_negative,
        state_mutated: r.state_mutated,
        low_brightness: r.low_brightness,
        high_brightness: r.high_brightness,
        rest_whitening: r.rest_whitening,
        stretch_whitening: r.stretch_whitening,
        sample_count: r.sample_count,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gs".into(),
        note: note.into(),
        cloth_skin_strain_aaa_ready: r.cloth_skin_strain_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Strain-Aware Texturing soak via kernel.
pub fn run_kernel_strain_aware_texturing_soak() -> KernelStrainAwareTexturingWireReport {
    let r = run_strain_aware_texturing_soak();
    let note = if !r.strain_aware_texturing_ready {
        "Strain-Aware Texturing soak failed — strainAwareTexturingReady stays false"
    } else {
        "Desktop soak: curvature + UV-jacobian stretch → albedo whitening; higher strain→whiter/brighter + stretch increases whitening + same seed→same + values≥0 — strainAwareTexturingReady true; cloth_skin_strain_aaa_ready false; distinct from gq usdImporterBridgeReady + gp mslWgslCompilerReady + go spectralLightPipelineReady + gn alexaCinematicOpticsReady + gm radianceCascadesGiReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `strainAwareTexturingReady` (letter gs).
pub fn probe_strain_aware_texturing() -> KernelStrainAwareTexturingWireReport {
    to_report(
        kernel_probe(),
        "Strain-Aware Texturing probe (letter gs) — distinct from usdImporterBridgeReady, mslWgslCompilerReady, spectralLightPipelineReady, alexaCinematicOpticsReady, radianceCascadesGiReady, and probe_kernel_foundation; cloth_skin_strain_aaa_ready HELD",
    )
}

/// Tauri IPC — Strain-Aware Texturing honesty.
#[tauri::command]
pub fn probe_strain_aware_texturing_cmd() -> KernelStrainAwareTexturingWireReport {
    probe_strain_aware_texturing()
}

/// Tauri IPC — run Strain-Aware Texturing soak.
#[tauri::command]
pub fn run_kernel_strain_aware_texturing_soak_cmd() -> KernelStrainAwareTexturingWireReport {
    run_kernel_strain_aware_texturing_soak()
}
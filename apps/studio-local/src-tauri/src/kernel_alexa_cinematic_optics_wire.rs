//! Alexa Cinematic Optics desktop wire — letter **gn**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::alexa_cinematic_optics`
//! (CMOS-lite ISO gain + anamorphic UV + halation + film grain + Bayer demosaic;
//! soak proves higher ISO→more grain, anamorphic≠spherical, spectrum used,
//! same input→same output, no NaN).
//! Honesty probe `alexaCinematicOpticsReady` is **distinct** from gf
//! `acesCinematicTonemapperReady`, gm `radianceCascadesGiReady`, gl
//! `atmosphericSpineParticlesReady`, gk `hybridClusterShadingVsvmReady`,
//! and prior.
//! Full ARRI Alexa / Panavision AAA stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::alexa_cinematic_optics::{
    probe_alexa_cinematic_optics as kernel_probe, run_alexa_cinematic_optics_soak,
    AlexaCinematicOpticsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAlexaCinematicOpticsWireReport {
    pub alexa_cinematic_optics_ready: bool,
    pub higher_iso_more_grain: bool,
    pub anamorphic_changes_aspect: bool,
    pub spectrum_used: bool,
    pub same_input_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub state_mutated: bool,
    pub mean_luminance: f32,
    pub grain_rms_iso800: f32,
    pub grain_rms_iso3200: f32,
    pub halation_energy: f32,
    pub anamorphic_aspect: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub arri_alexa_aaa_ready: bool,
    pub panavision_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: AlexaCinematicOpticsSoakReport,
    note: impl Into<String>,
) -> KernelAlexaCinematicOpticsWireReport {
    KernelAlexaCinematicOpticsWireReport {
        alexa_cinematic_optics_ready: r.alexa_cinematic_optics_ready,
        higher_iso_more_grain: r.higher_iso_more_grain,
        anamorphic_changes_aspect: r.anamorphic_changes_aspect,
        spectrum_used: r.spectrum_used,
        same_input_same_output: r.same_input_same_output,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        in_unit_interval: r.in_unit_interval,
        state_mutated: r.state_mutated,
        mean_luminance: r.mean_luminance,
        grain_rms_iso800: r.grain_rms_iso800,
        grain_rms_iso3200: r.grain_rms_iso3200,
        halation_energy: r.halation_energy,
        anamorphic_aspect: r.anamorphic_aspect,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gn".into(),
        note: note.into(),
        arri_alexa_aaa_ready: r.arri_alexa_aaa_ready,
        panavision_aaa_ready: r.panavision_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Alexa cinematic optics soak via kernel.
pub fn run_kernel_alexa_cinematic_optics_soak() -> KernelAlexaCinematicOpticsWireReport {
    let r = run_alexa_cinematic_optics_soak();
    let note = if !r.alexa_cinematic_optics_ready {
        "Alexa cinematic optics soak failed — alexaCinematicOpticsReady stays false"
    } else {
        "Desktop soak: CMOS-lite ISO gain + anamorphic UV + halation + film grain + Bayer demosaic; higher ISO→more grain; anamorphic≠spherical; spectrum used; same input→same output; no NaN — alexaCinematicOpticsReady true; arri_alexa_aaa_ready / panavision_aaa_ready false; distinct from gf acesCinematicTonemapperReady + gm radianceCascadesGiReady + gl atmosphericSpineParticlesReady + gk hybridClusterShadingVsvmReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `alexaCinematicOpticsReady` (letter gn).
pub fn probe_alexa_cinematic_optics() -> KernelAlexaCinematicOpticsWireReport {
    to_report(
        kernel_probe(),
        "Alexa cinematic optics probe (letter gn) — distinct from acesCinematicTonemapperReady, radianceCascadesGiReady, atmosphericSpineParticlesReady, hybridClusterShadingVsvmReady, and probe_kernel_foundation; arri_alexa_aaa_ready / panavision_aaa_ready HELD",
    )
}

/// Tauri IPC — Alexa cinematic optics honesty.
#[tauri::command]
pub fn probe_alexa_cinematic_optics_cmd() -> KernelAlexaCinematicOpticsWireReport {
    probe_alexa_cinematic_optics()
}

/// Tauri IPC — run Alexa cinematic optics soak.
#[tauri::command]
pub fn run_kernel_alexa_cinematic_optics_soak_cmd() -> KernelAlexaCinematicOpticsWireReport {
    run_kernel_alexa_cinematic_optics_soak()
}

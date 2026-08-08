//! Gaze-Foveated Reprojection desktop wire — letter **gt**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::gaze_foveated_reprojection`
//! (eccentricity → quality-weight map + temporal reprojection-lite; soak
//! proves fovea > periphery + gaze shift mutates + same seed → same).
//! Honesty probe `gazeFoveatedReprojectionReady` is **distinct** from gs
//! `strainAwareTexturingReady`, gp `mslWgslCompilerReady`, gr
//! `hdr32bitFloatPipelineReady`, gi `infiniteAntiAliasingReady`, and prior
//! (never touch those probes). Full VR foveated AAA stays false (HELD).
//! DLSS / Nanite / Coins / Agones / Quic HELD.

use aethel_kernel_rust::gaze_foveated_reprojection::{
    probe_gaze_foveated_reprojection as kernel_probe, run_gaze_foveated_reprojection_soak,
    GazeFoveatedReprojectionSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGazeFoveatedReprojectionWireReport {
    pub gaze_foveated_reprojection_ready: bool,
    pub fovea_higher_than_periph: bool,
    pub gaze_shift_mutates_map: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub state_mutated: bool,
    pub temporal_blend_uses_motion: bool,
    pub fovea_mean: f32,
    pub periph_mean: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub vr_foveated_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: GazeFoveatedReprojectionSoakReport,
    note: impl Into<String>,
) -> KernelGazeFoveatedReprojectionWireReport {
    KernelGazeFoveatedReprojectionWireReport {
        gaze_foveated_reprojection_ready: r.gaze_foveated_reprojection_ready,
        fovea_higher_than_periph: r.fovea_higher_than_periph,
        gaze_shift_mutates_map: r.gaze_shift_mutates_map,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        in_unit_interval: r.in_unit_interval,
        state_mutated: r.state_mutated,
        temporal_blend_uses_motion: r.temporal_blend_uses_motion,
        fovea_mean: r.fovea_mean,
        periph_mean: r.periph_mean,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gt".into(),
        note: note.into(),
        vr_foveated_aaa_ready: r.vr_foveated_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Gaze-Foveated Reprojection soak via kernel.
pub fn run_kernel_gaze_foveated_reprojection_soak() -> KernelGazeFoveatedReprojectionWireReport {
    let r = run_gaze_foveated_reprojection_soak();
    let note = if !r.gaze_foveated_reprojection_ready {
        "Gaze-Foveated Reprojection soak failed — gazeFoveatedReprojectionReady stays false"
    } else {
        "Desktop soak: eccentricity → quality-weight map + temporal reprojection-lite; fovea>periph + gaze shift mutates + motion raises history blend + same seed→same — gazeFoveatedReprojectionReady true; vr_foveated_aaa_ready false; dlss_ready false; distinct from gs strainAwareTexturingReady + gp mslWgslCompilerReady + gr hdr32bitFloatPipelineReady + gi infiniteAntiAliasingReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `gazeFoveatedReprojectionReady` (letter gt).
pub fn probe_gaze_foveated_reprojection() -> KernelGazeFoveatedReprojectionWireReport {
    to_report(
        kernel_probe(),
        "Gaze-Foveated Reprojection probe (letter gt) — distinct from strainAwareTexturingReady, mslWgslCompilerReady, hdr32bitFloatPipelineReady, infiniteAntiAliasingReady, and probe_kernel_foundation; vr_foveated_aaa_ready HELD; dlss_ready HELD",
    )
}

/// Tauri IPC — Gaze-Foveated Reprojection honesty.
#[tauri::command]
pub fn probe_gaze_foveated_reprojection_cmd() -> KernelGazeFoveatedReprojectionWireReport {
    probe_gaze_foveated_reprojection()
}

/// Tauri IPC — run Gaze-Foveated Reprojection soak.
#[tauri::command]
pub fn run_kernel_gaze_foveated_reprojection_soak_cmd() -> KernelGazeFoveatedReprojectionWireReport {
    run_kernel_gaze_foveated_reprojection_soak()
}

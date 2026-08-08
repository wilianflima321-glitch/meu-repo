//! SDF Audio Raymarching desktop wire — letter **ex**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_audio_raymarching`
//! (listener→source SDF sphere-trace occlusion; optional em grid + ew couple).
//! Honesty probe `sdfAudioRaymarchingReady` is **distinct** from ew
//! `volumetricExtinctionMediumReady`, ef `acousticRaytracingEchoReady`, ei
//! `acousticReverbGeometryReady`, and prior probes.
//! Full MetaSounds/HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::sdf_audio_raymarching::{
    probe_sdf_audio_raymarching as kernel_probe, run_sdf_audio_raymarching_soak,
    SdfAudioRaymarchingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfAudioRaymarchingWireReport {
    pub sdf_audio_raymarching_ready: bool,
    pub clear_path_identity: bool,
    pub blocked_attenuates_vs_clear: bool,
    pub em_grid_couple_works: bool,
    pub ew_extinction_couple_works: bool,
    pub legacy_uses_args: bool,
    pub outputs_finite: bool,
    pub clear_transmission: f32,
    pub blocked_transmission: f32,
    pub blocked_solid_path: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub metasounds_hrtf_aaa_ready: bool,
    pub lumen_vdb_volumetric_aaa_ready: bool,
}

fn to_report(
    r: SdfAudioRaymarchingSoakReport,
    note: impl Into<String>,
) -> KernelSdfAudioRaymarchingWireReport {
    KernelSdfAudioRaymarchingWireReport {
        sdf_audio_raymarching_ready: r.sdf_audio_raymarching_ready,
        clear_path_identity: r.clear_path_identity,
        blocked_attenuates_vs_clear: r.blocked_attenuates_vs_clear,
        em_grid_couple_works: r.em_grid_couple_works,
        ew_extinction_couple_works: r.ew_extinction_couple_works,
        legacy_uses_args: r.legacy_uses_args,
        outputs_finite: r.outputs_finite,
        clear_transmission: r.clear_transmission,
        blocked_transmission: r.blocked_transmission,
        blocked_solid_path: r.blocked_solid_path,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "ex".into(),
        note: note.into(),
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        lumen_vdb_volumetric_aaa_ready: r.lumen_vdb_volumetric_aaa_ready,
    }
}

/// Run SDF audio raymarching soak via kernel.
pub fn run_kernel_sdf_audio_raymarching_soak() -> KernelSdfAudioRaymarchingWireReport {
    let r = run_sdf_audio_raymarching_soak();
    let note = if !r.sdf_audio_raymarching_ready {
        "SDF audio raymarching soak failed — sdfAudioRaymarchingReady stays false"
    } else {
        "Desktop soak: listener→source SDF sphere-trace; clear identity; blocked attenuates; em grid + ew extinction couple — sdfAudioRaymarchingReady true; metasounds_hrtf_aaa_ready false; distinct from ew volumetricExtinctionMediumReady + ef acousticRaytracingEchoReady + ei acousticReverbGeometryReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfAudioRaymarchingReady` (letter ex).
pub fn probe_sdf_audio_raymarching() -> KernelSdfAudioRaymarchingWireReport {
    to_report(
        kernel_probe(),
        "SDF audio raymarching probe (letter ex) — distinct from volumetricExtinctionMediumReady, acousticRaytracingEchoReady, acousticReverbGeometryReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready HELD",
    )
}

/// Tauri IPC — SDF audio raymarching honesty.
#[tauri::command]
pub fn probe_sdf_audio_raymarching_cmd() -> KernelSdfAudioRaymarchingWireReport {
    probe_sdf_audio_raymarching()
}

/// Tauri IPC — run SDF audio raymarching soak.
#[tauri::command]
pub fn run_kernel_sdf_audio_raymarching_soak_cmd() -> KernelSdfAudioRaymarchingWireReport {
    run_kernel_sdf_audio_raymarching_soak()
}

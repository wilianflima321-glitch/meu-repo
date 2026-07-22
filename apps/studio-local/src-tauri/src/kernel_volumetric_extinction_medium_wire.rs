//! Volumetric Extinction Medium desktop wire — letter **ew**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::volumetric_extinction_medium`
//! (Beer–Lambert path optical depth through density medium; optional eu couple).
//! Honesty probe `volumetricExtinctionMediumReady` is **distinct** from ev
//! `microDisplacementNoiseReady`, eu `internalVoxelDensityReady`, et
//! `svoDepthLodReady`, and prior probes (including dc uniform Beer–Lambert).
//! Full Lumen/VDB volumetric AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::volumetric_extinction_medium::{
    probe_volumetric_extinction_medium as kernel_probe, run_volumetric_extinction_medium_soak,
    VolumetricExtinctionMediumSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelVolumetricExtinctionMediumWireReport {
    pub volumetric_extinction_medium_ready: bool,
    pub vacuum_identity: bool,
    pub longer_path_more_extinction: bool,
    pub denser_more_extinction: bool,
    pub spectral_red_darker_than_blue: bool,
    pub eu_density_couple_works: bool,
    pub audio_damps_with_depth: bool,
    pub distinct_from_dc_uniform_beer_lambert: bool,
    pub outputs_finite: bool,
    pub tau_short: f32,
    pub tau_long: f32,
    pub tau_low_density: f32,
    pub tau_high_density: f32,
    pub tr_long_r: f32,
    pub tr_long_b: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_micro_displacement_noise_probe: bool,
    pub distinct_from_internal_voxel_density_probe: bool,
    pub distinct_from_svo_depth_lod_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub lumen_vdb_volumetric_aaa_ready: bool,
    pub nanite_micro_displacement_aaa_ready: bool,
    pub volumetric_meat_aaa_ready: bool,
}

fn to_report(
    r: VolumetricExtinctionMediumSoakReport,
    note: impl Into<String>,
) -> KernelVolumetricExtinctionMediumWireReport {
    KernelVolumetricExtinctionMediumWireReport {
        volumetric_extinction_medium_ready: r.volumetric_extinction_medium_ready,
        vacuum_identity: r.vacuum_identity,
        longer_path_more_extinction: r.longer_path_more_extinction,
        denser_more_extinction: r.denser_more_extinction,
        spectral_red_darker_than_blue: r.spectral_red_darker_than_blue,
        eu_density_couple_works: r.eu_density_couple_works,
        audio_damps_with_depth: r.audio_damps_with_depth,
        distinct_from_dc_uniform_beer_lambert: r.distinct_from_dc_uniform_beer_lambert,
        outputs_finite: r.outputs_finite,
        tau_short: r.tau_short,
        tau_long: r.tau_long,
        tau_low_density: r.tau_low_density,
        tau_high_density: r.tau_high_density,
        tr_long_r: r.tr_long_r,
        tr_long_b: r.tr_long_b,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_micro_displacement_noise_probe: r
            .distinct_from_micro_displacement_noise_probe,
        distinct_from_internal_voxel_density_probe: r.distinct_from_internal_voxel_density_probe,
        distinct_from_svo_depth_lod_probe: r.distinct_from_svo_depth_lod_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "ew".into(),
        note: note.into(),
        lumen_vdb_volumetric_aaa_ready: r.lumen_vdb_volumetric_aaa_ready,
        nanite_micro_displacement_aaa_ready: r.nanite_micro_displacement_aaa_ready,
        volumetric_meat_aaa_ready: r.volumetric_meat_aaa_ready,
    }
}

/// Run volumetric extinction medium soak via kernel.
pub fn run_kernel_volumetric_extinction_medium_soak() -> KernelVolumetricExtinctionMediumWireReport {
    let r = run_volumetric_extinction_medium_soak();
    let note = if !r.volumetric_extinction_medium_ready {
        "Volumetric extinction medium soak failed — volumetricExtinctionMediumReady stays false"
    } else {
        "Desktop soak: Beer–Lambert path τ=∫σρ ds; vacuum identity; longer/denser → more extinction; spectral R<B; eu density couple; audio damp — volumetricExtinctionMediumReady true; lumen_vdb_volumetric_aaa_ready false; distinct from ev microDisplacementNoiseReady + eu internalVoxelDensityReady + dc uniform Beer–Lambert + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `volumetricExtinctionMediumReady` (letter ew).
pub fn probe_volumetric_extinction_medium() -> KernelVolumetricExtinctionMediumWireReport {
    to_report(
        kernel_probe(),
        "Volumetric extinction medium probe (letter ew) — distinct from microDisplacementNoiseReady, internalVoxelDensityReady, svoDepthLodReady, dc beer_lambert_ready, and probe_kernel_foundation; lumen_vdb_volumetric_aaa_ready HELD",
    )
}

/// Tauri IPC — volumetric extinction medium honesty.
#[tauri::command]
pub fn probe_volumetric_extinction_medium_cmd() -> KernelVolumetricExtinctionMediumWireReport {
    probe_volumetric_extinction_medium()
}

/// Tauri IPC — run volumetric extinction medium soak.
#[tauri::command]
pub fn run_kernel_volumetric_extinction_medium_soak_cmd() -> KernelVolumetricExtinctionMediumWireReport
{
    run_kernel_volumetric_extinction_medium_soak()
}

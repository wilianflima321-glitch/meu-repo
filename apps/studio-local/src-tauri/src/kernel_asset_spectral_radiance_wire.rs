//! Asset Spectral Radiance desktop wire — letter **lk**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::asset_spectral_radiance`
//! (the unified final-display color authority): `ac` PRE-WB direct
//! (diffuse+specular+Planckian emissive) × `gm` radiance-cascades GI (seeded
//! 2D probe grid with one SDF occluder) × `gr` HDR display white balance at
//! `display_kelvin` × `gf` ACES to LDR. The soak proves warm/cool PRE-WB
//! chromaticity, red albedo keeps red dominance under warm AND cool, GI lit
//! exceeds dark, ray-marched SDF occlusion is monotonic and shadows the probe,
//! display white balance is an independent control that mutates the final LDR,
//! ACES compresses HDR luminance, gamut is contained, outputs stay finite,
//! same-seed replay is deterministic, non-finite input fails closed, and the
//! composite evidence fingerprint is distinct from all five real peers
//! (ac / gm / go / gf / gr).
//!
//! **Ray-tracing limitations are owned honestly (no overclaim vs Unreal Lumen):**
//! the cascade GI here is a CPU 2D probe grid — NOT per-pixel hardware ray
//! tracing; there is no RT reflection, no RT shadow penumbra, no multi-bounce
//! RT GI, no RT denoiser, no screen-space RT, and exactly ONE SDF occluder.
//! The GPU acceleration structure (`bindless_rt_native_compute`), skylight /
//! sun-disc / IBL GI, and real-time hardware RT bounce are all HELD (false).
//! The `assetSpectralRadianceReady` probe is **distinct** from
//! `assetColorAppearanceReady` (ac), `radianceCascadesGiReady` (gm),
//! `spectralLightPipelineReady` (go), `acesCinematicTonemapperReady` (gf) and
//! `hdr32BitFloatPipelineReady` (gr) — never touch those probes.
//! Full hardware RT / Lumen / Unreal asset-color AAA stays false
//! (HELD: `hardware_rt_ready` · `lumen_radiance_cascades_aaa_ready` ·
//! `unreal_asset_color_parity_ready` · `rt_gi_bounce_ready`).
//!
//! Compiled-only wire (WireStatus::Wire — P2g disconnection, S-11 debt): not
//! reachable from `tauri::generate_handler!`; compiled so the surface stays
//! honest and the bijection between the desktop crate and the kernel crate is
//! preserved.

use aethel_kernel_rust::asset_spectral_radiance::{
    probe_asset_spectral_radiance as kernel_probe, run_asset_spectral_radiance_soak,
    AssetSpectralRadianceSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAssetSpectralRadianceWireReport {
    pub asset_spectral_radiance_ready: bool,
    pub spectral_chromaticity: bool,
    pub albedo_tint_preserved: bool,
    pub gi_lit_exceeds_dark: bool,
    pub gi_energy_bounded: bool,
    pub occlusion_transmittance_monotonic: bool,
    pub occlusion_shadows_probe: bool,
    pub kelvin_wb_mutation: bool,
    pub aces_hdr_to_ldr_compression: bool,
    pub gamut_contained: bool,
    pub outputs_finite: bool,
    pub deterministic_replay: bool,
    pub fail_closed: bool,
    pub warm_direct_rb_ratio: f32,
    pub cool_direct_rb_ratio: f32,
    pub gi_lit_energy: f32,
    pub gi_dark_energy: f32,
    pub deep_transmittance: f32,
    pub graze_transmittance: f32,
    pub far_transmittance: f32,
    pub emissive_hdr_luminance: f32,
    pub emissive_ldr_luminance: f32,
    pub wb_warm_ldr_rb: f32,
    pub wb_cool_ldr_rb: f32,
    pub wb_warm_hdr_rb: f32,
    pub wb_cool_hdr_rb: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub hardware_rt_ready: bool,
    pub lumen_radiance_cascades_aaa_ready: bool,
    pub unreal_asset_color_parity_ready: bool,
    pub rt_gi_bounce_ready: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(
    r: AssetSpectralRadianceSoakReport,
    note: impl Into<String>,
) -> KernelAssetSpectralRadianceWireReport {
    KernelAssetSpectralRadianceWireReport {
        asset_spectral_radiance_ready: r.asset_spectral_radiance_ready,
        spectral_chromaticity: r.spectral_chromaticity,
        albedo_tint_preserved: r.albedo_tint_preserved,
        gi_lit_exceeds_dark: r.gi_lit_exceeds_dark,
        gi_energy_bounded: r.gi_energy_bounded,
        occlusion_transmittance_monotonic: r.occlusion_transmittance_monotonic,
        occlusion_shadows_probe: r.occlusion_shadows_probe,
        kelvin_wb_mutation: r.kelvin_wb_mutation,
        aces_hdr_to_ldr_compression: r.aces_hdr_to_ldr_compression,
        gamut_contained: r.gamut_contained,
        outputs_finite: r.outputs_finite,
        deterministic_replay: r.deterministic_replay,
        fail_closed: r.fail_closed,
        warm_direct_rb_ratio: r.warm_direct_rb_ratio,
        cool_direct_rb_ratio: r.cool_direct_rb_ratio,
        gi_lit_energy: r.gi_lit_energy,
        gi_dark_energy: r.gi_dark_energy,
        deep_transmittance: r.deep_transmittance,
        graze_transmittance: r.graze_transmittance,
        far_transmittance: r.far_transmittance,
        emissive_hdr_luminance: r.emissive_hdr_luminance,
        emissive_ldr_luminance: r.emissive_ldr_luminance,
        wb_warm_ldr_rb: r.wb_warm_ldr_rb,
        wb_cool_ldr_rb: r.wb_cool_ldr_rb,
        wb_warm_hdr_rb: r.wb_warm_hdr_rb,
        wb_cool_hdr_rb: r.wb_cool_hdr_rb,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_asset_color_appearance_probe: r.distinct_from_asset_color_appearance_probe,
        distinct_from_radiance_cascades_gi_probe: r.distinct_from_radiance_cascades_gi_probe,
        distinct_from_spectral_light_pipeline_probe: r.distinct_from_spectral_light_pipeline_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe: r
            .distinct_from_hdr_32bit_float_pipeline_probe,
        hardware_rt_ready: r.hardware_rt_ready,
        lumen_radiance_cascades_aaa_ready: r.lumen_radiance_cascades_aaa_ready,
        unreal_asset_color_parity_ready: r.unreal_asset_color_parity_ready,
        rt_gi_bounce_ready: r.rt_gi_bounce_ready,
        letter: "lk".into(),
        note: note.into(),
    }
}

/// Run Asset Spectral Radiance soak via kernel.
pub fn run_kernel_asset_spectral_radiance_soak() -> KernelAssetSpectralRadianceWireReport {
    let r = run_asset_spectral_radiance_soak();
    let note = if !r.asset_spectral_radiance_ready {
        "Asset Spectral Radiance soak failed — assetSpectralRadianceReady stays false"
    } else {
        "Desktop soak: ac PRE-WB direct × gm radiance-cascades GI × gr display WB × gf ACES — warm/cool PRE-WB chromaticity + red albedo keeps red dominance + GI lit>dark + SDF occlusion monotonic/shadowed + display-WB mutates final LDR (HDR + LDR margins) + ACES HDR→LDR compression + gamut contained + finite + deterministic + fail-closed — assetSpectralRadianceReady true; hardware_rt_ready / lumen_radiance_cascades_aaa_ready / unreal_asset_color_parity_ready / rt_gi_bounce_ready false; distinct from ac assetColorAppearanceReady + gm radianceCascadesGiReady + go spectralLightPipelineReady + gf acesCinematicTonemapperReady + gr hdr32BitFloatPipelineReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `assetSpectralRadianceReady` (letter lk).
pub fn probe_asset_spectral_radiance() -> KernelAssetSpectralRadianceWireReport {
    to_report(
        kernel_probe(),
        "Asset Spectral Radiance probe (letter lk) — unified final-display color authority (ac direct × gm GI × gr display WB × gf ACES); distinct from assetColorAppearanceReady, radianceCascadesGiReady, spectralLightPipelineReady, acesCinematicTonemapperReady, hdr32BitFloatPipelineReady, and probe_kernel_foundation; hardware_rt_ready / lumen_radiance_cascades_aaa_ready HELD (CPU 2D probe-grid cascade, NOT per-pixel hardware RT)",
    )
}

/// Tauri IPC — Asset Spectral Radiance honesty.
#[tauri::command]
pub fn probe_asset_spectral_radiance_cmd() -> KernelAssetSpectralRadianceWireReport {
    probe_asset_spectral_radiance()
}

/// Tauri IPC — run Asset Spectral Radiance soak.
#[tauri::command]
pub fn run_kernel_asset_spectral_radiance_soak_cmd() -> KernelAssetSpectralRadianceWireReport {
    run_kernel_asset_spectral_radiance_soak()
}

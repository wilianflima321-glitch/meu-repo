//! Asset Color Appearance desktop wire — letter **ac**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::asset_color_appearance`
//! (composed spectral→PBR→WB→Planckian→ACES chain: `go` spectral diffuse ×
//! `brdf` GGX specular × `gr` white-balance/exposure × `ha` emissive × `gf`
//! display-referred ACES). The soak proves neutral-WB identity at the neutral
//! kelvin, warm illuminant raises R over cool, metallic/roughness shift the
//! specular energy, emission adds HDR energy, a red asset keeps red dominance
//! under warm and cool illuminants (WB preserves albedo tint), same-seed
//! replay is deterministic, and the composite evidence fingerprint is distinct
//! from all five real peers (go / brdf / gr / ha / gf).
//! Honesty probe `assetColorAppearanceReady` is **distinct** from
//! `spectralLightPipelineReady` (go), the anisotropic/thermal peers and
//! `acesCinematicTonemapperReady` (gf) — never touch those probes.
//! Full real-time ray-traced / Lumen / Unreal asset-color AAA stays false
//! (HELD: `asset_color_rt_aaa_ready` · `unreal_asset_color_parity_ready` ·
//! `rt_gi_bounce_ready`). Coins / Agones / Nanite / DLSS / Quic HELD.
//!
//! Compiled-only wire (WireStatus::Wire — P2g disconnection, S-11 debt): not
//! reachable from `tauri::generate_handler!`; compiled so the surface stays
//! honest and the bijection between the desktop crate and the kernel crate is
//! preserved.

use aethel_kernel_rust::asset_color_appearance::{
    probe_asset_color_appearance as kernel_probe, run_asset_color_appearance_soak,
    AssetColorAppearanceSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAssetColorAppearanceWireReport {
    pub asset_color_appearance_ready: bool,
    pub neutral_kelvin_identity: bool,
    pub warm_cool_chromaticity: bool,
    pub metallic_raises_specular: bool,
    pub roughness_lowers_specular: bool,
    pub emission_adds_energy: bool,
    pub red_dominant_display: bool,
    pub wb_preserves_albedo_tint: bool,
    pub gamut_contained: bool,
    pub outputs_finite: bool,
    pub deterministic_replay: bool,
    pub neutral_ldr_max_min: f32,
    pub warm_diffuse_rb_ratio: f32,
    pub cool_diffuse_rb_ratio: f32,
    pub specular_dielectric: f32,
    pub specular_metallic: f32,
    pub specular_smooth: f32,
    pub specular_rough: f32,
    pub emissive_luminance_hdr: f32,
    pub neutral_luminance_hdr: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_anisotropic_neural_microfacets_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub distinct_from_thermal_spectral_gi_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub asset_color_rt_aaa_ready: bool,
    pub unreal_asset_color_parity_ready: bool,
    pub rt_gi_bounce_ready: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(
    r: AssetColorAppearanceSoakReport,
    note: impl Into<String>,
) -> KernelAssetColorAppearanceWireReport {
    KernelAssetColorAppearanceWireReport {
        asset_color_appearance_ready: r.asset_color_appearance_ready,
        neutral_kelvin_identity: r.neutral_kelvin_identity,
        warm_cool_chromaticity: r.warm_cool_chromaticity,
        metallic_raises_specular: r.metallic_raises_specular,
        roughness_lowers_specular: r.roughness_lowers_specular,
        emission_adds_energy: r.emission_adds_energy,
        red_dominant_display: r.red_dominant_display,
        wb_preserves_albedo_tint: r.wb_preserves_albedo_tint,
        gamut_contained: r.gamut_contained,
        outputs_finite: r.outputs_finite,
        deterministic_replay: r.deterministic_replay,
        neutral_ldr_max_min: r.neutral_ldr_max_min,
        warm_diffuse_rb_ratio: r.warm_diffuse_rb_ratio,
        cool_diffuse_rb_ratio: r.cool_diffuse_rb_ratio,
        specular_dielectric: r.specular_dielectric,
        specular_metallic: r.specular_metallic,
        specular_smooth: r.specular_smooth,
        specular_rough: r.specular_rough,
        emissive_luminance_hdr: r.emissive_luminance_hdr,
        neutral_luminance_hdr: r.neutral_luminance_hdr,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_spectral_light_pipeline_probe: r.distinct_from_spectral_light_pipeline_probe,
        distinct_from_anisotropic_neural_microfacets_probe: r
            .distinct_from_anisotropic_neural_microfacets_probe,
        distinct_from_hdr_32bit_float_pipeline_probe: r
            .distinct_from_hdr_32bit_float_pipeline_probe,
        distinct_from_thermal_spectral_gi_probe: r.distinct_from_thermal_spectral_gi_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        asset_color_rt_aaa_ready: r.asset_color_rt_aaa_ready,
        unreal_asset_color_parity_ready: r.unreal_asset_color_parity_ready,
        rt_gi_bounce_ready: r.rt_gi_bounce_ready,
        letter: "ac".into(),
        note: note.into(),
    }
}

/// Run Asset Color Appearance soak via kernel.
pub fn run_kernel_asset_color_appearance_soak() -> KernelAssetColorAppearanceWireReport {
    let r = run_asset_color_appearance_soak();
    let note = if !r.asset_color_appearance_ready {
        "Asset Color Appearance soak failed — assetColorAppearanceReady stays false"
    } else {
        "Desktop soak: spectral diffuse × GGX specular × WB/exposure × Planckian emission × ACES display — neutral-WB identity + warm R over cool + metallic/roughness specular shift + emission HDR + red asset keeps red dominance (WB preserves tint) + same-seed deterministic — assetColorAppearanceReady true; asset_color_rt_aaa_ready / unreal_asset_color_parity_ready / rt_gi_bounce_ready false; distinct from go spectralLightPipelineReady + brdf anisotropic + gr hdr + ha thermal + gf acesCinematicTonemapperReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `assetColorAppearanceReady` (letter ac).
pub fn probe_asset_color_appearance() -> KernelAssetColorAppearanceWireReport {
    to_report(
        kernel_probe(),
        "Asset Color Appearance probe (letter ac) — composed spectral→PBR→WB→Planckian→ACES; distinct from spectralLightPipelineReady, acesCinematicTonemapperReady, and probe_kernel_foundation; asset_color_rt_aaa_ready HELD",
    )
}

/// Tauri IPC — Asset Color Appearance honesty.
#[tauri::command]
pub fn probe_asset_color_appearance_cmd() -> KernelAssetColorAppearanceWireReport {
    probe_asset_color_appearance()
}

/// Tauri IPC — run Asset Color Appearance soak.
#[tauri::command]
pub fn run_kernel_asset_color_appearance_soak_cmd() -> KernelAssetColorAppearanceWireReport {
    run_kernel_asset_color_appearance_soak()
}
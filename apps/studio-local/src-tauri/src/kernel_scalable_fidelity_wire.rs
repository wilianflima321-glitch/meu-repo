//! Scalable Fidelity Blueprint desktop wire — letter **sf**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::scalable_fidelity` — the
//! Law XV §1 feature-gating fidelity blueprint. It answers the Founder's
//! question **"como a iluminação funciona para quem NÃO tem ray tracing /
//! hardware fraco?"** deterministically and GPU-free: a Capability Score
//! 0–100 maps to exactly four tiers — `webgl2` (0–19, ForwardPBR + baked
//! lightmaps only), `integrated` (20–44, ForwardPBR + baked LM + simple
//! shadow + FSR), `discrete` (45–74, deferred + SSGI + light probes + SSR,
//! NEVER ray traced) and `enthusiast` (75–100, the ONLY ray-traced tier with
//! denoiser + VSM + bindless).
//!
//! **What the blueprint proves (soak-gated):** band boundaries are exact at
//! 19/20, 44/45, 74/75; the webgl2 floor is minimal but rich + stable; the
//! feature ladder is monotonic (never loses a feature as CapScore rises);
//! VRAM estimate is strictly monotonic; every resolved quantity is finite;
//! same input → same fingerprint; CapScore 0 fails closed to the webgl2
//! floor; and Doctrine #73 — every tier ships rich + stable, none below.
//!
//! **Ray-tracing limitations are owned honestly (no overclaim vs Unreal
//! Lumen):** `enthusiast` is the ONLY ray-traced tier, and even that tier's
//! AAA flags are HELD (false) — `hardware_rt_ready`,
//! `lumen_radiance_cascades_aaa_ready`, `unreal_fidelity_parity_ready` and
//! `rt_gi_bounce_ready` all stay false. This kernel is the deterministic,
//! GPU-free feature-gating AUTHORITY; the actual GPU paths live in
//! `gpu_soak_scale` / `wgpu_renderer` (CapScore + soak budgets) and are
//! gated by the same bands. The `scalableFidelityReady` probe is **distinct**
//! from `assetColorAppearanceReady` (ac), `radianceCascadesGiReady` (gm),
//! `spectralLightPipelineReady` (go), `acesCinematicTonemapperReady` (gf),
//! `hdr32BitFloatPipelineReady` (gr) and `assetSpectralRadianceReady` (lk) —
//! never touch those probes.
//!
//! Compiled-only wire (WireStatus::Wire — P2g disconnection, S-11 debt): not
//! reachable from `tauri::generate_handler!`; compiled so the surface stays
//! honest and the bijection between the desktop crate and the kernel crate is
//! preserved.

use aethel_kernel_rust::scalable_fidelity::{
    probe_scalable_fidelity as kernel_probe, run_fidelity_soak, FidelitySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelScalableFidelityWireReport {
    pub scalable_fidelity_ready: bool,
    pub band_boundaries_exact: bool,
    pub webgl2_floor_minimal: bool,
    pub integrated_baked_lm_fsr: bool,
    pub discrete_ssgi_no_rt: bool,
    pub enthusiast_rt_gated: bool,
    pub graphs_match_spec: bool,
    pub feature_monotonic: bool,
    pub vram_budget_monotonic: bool,
    pub outputs_finite: bool,
    pub deterministic_replay: bool,
    pub fail_closed_zero_score: bool,
    pub all_tiers_rich_and_stable: bool,
    pub aaa_held_honest: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub distinct_from_asset_spectral_radiance_probe: bool,
    pub tier_webgl2: String,
    pub tier_integrated: String,
    pub tier_discrete: String,
    pub tier_enthusiast: String,
    pub render_scale_webgl2: f32,
    pub render_scale_integrated: f32,
    pub render_scale_discrete: f32,
    pub render_scale_enthusiast: f32,
    pub sample_count_webgl2: u32,
    pub sample_count_integrated: u32,
    pub sample_count_discrete: u32,
    pub sample_count_enthusiast: u32,
    pub vram_webgl2: u64,
    pub vram_integrated: u64,
    pub vram_discrete: u64,
    pub vram_enthusiast: u64,
    pub hardware_rt_ready: bool,
    pub lumen_radiance_cascades_aaa_ready: bool,
    pub unreal_fidelity_parity_ready: bool,
    pub rt_gi_bounce_ready: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(
    r: FidelitySoakReport,
    note: impl Into<String>,
) -> KernelScalableFidelityWireReport {
    KernelScalableFidelityWireReport {
        scalable_fidelity_ready: r.scalable_fidelity_ready,
        band_boundaries_exact: r.band_boundaries_exact,
        webgl2_floor_minimal: r.webgl2_floor_minimal,
        integrated_baked_lm_fsr: r.integrated_baked_lm_fsr,
        discrete_ssgi_no_rt: r.discrete_ssgi_no_rt,
        enthusiast_rt_gated: r.enthusiast_rt_gated,
        graphs_match_spec: r.graphs_match_spec,
        feature_monotonic: r.feature_monotonic,
        vram_budget_monotonic: r.vram_budget_monotonic,
        outputs_finite: r.outputs_finite,
        deterministic_replay: r.deterministic_replay,
        fail_closed_zero_score: r.fail_closed_zero_score,
        all_tiers_rich_and_stable: r.all_tiers_rich_and_stable,
        aaa_held_honest: r.aaa_held_honest,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_asset_color_appearance_probe: r.distinct_from_asset_color_appearance_probe,
        distinct_from_radiance_cascades_gi_probe: r.distinct_from_radiance_cascades_gi_probe,
        distinct_from_spectral_light_pipeline_probe: r.distinct_from_spectral_light_pipeline_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r.distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe: r.distinct_from_hdr_32bit_float_pipeline_probe,
        distinct_from_asset_spectral_radiance_probe: r.distinct_from_asset_spectral_radiance_probe,
        tier_webgl2: r.tier_webgl2.to_string(),
        tier_integrated: r.tier_integrated.to_string(),
        tier_discrete: r.tier_discrete.to_string(),
        tier_enthusiast: r.tier_enthusiast.to_string(),
        render_scale_webgl2: r.render_scale_webgl2,
        render_scale_integrated: r.render_scale_integrated,
        render_scale_discrete: r.render_scale_discrete,
        render_scale_enthusiast: r.render_scale_enthusiast,
        sample_count_webgl2: r.sample_count_webgl2,
        sample_count_integrated: r.sample_count_integrated,
        sample_count_discrete: r.sample_count_discrete,
        sample_count_enthusiast: r.sample_count_enthusiast,
        vram_webgl2: r.vram_webgl2,
        vram_integrated: r.vram_integrated,
        vram_discrete: r.vram_discrete,
        vram_enthusiast: r.vram_enthusiast,
        hardware_rt_ready: r.hardware_rt_ready,
        lumen_radiance_cascades_aaa_ready: r.lumen_radiance_cascades_aaa_ready,
        unreal_fidelity_parity_ready: r.unreal_fidelity_parity_ready,
        rt_gi_bounce_ready: r.rt_gi_bounce_ready,
        letter: "sf".into(),
        note: note.into(),
    }
}

/// Run Scalable Fidelity soak via kernel.
pub fn run_kernel_scalable_fidelity_soak() -> KernelScalableFidelityWireReport {
    let r = run_fidelity_soak();
    let note = if !r.scalable_fidelity_ready {
        "Scalable Fidelity soak failed — scalableFidelityReady stays false"
    } else {
        "Desktop soak (Law XV §1 blueprint, letter sf): CapScore 0–100 → webgl2 (ForwardPBR+bakedLM only) / integrated (bakedLM+simpleShadow+FSR) / discrete (SSGI+probes+SSR, never RT) / enthusiast (ONLY ray-traced tier); band boundaries exact at 19/20/44/45/74/75; feature ladder monotonic; VRAM monotonic; finite; deterministic; fail-closed zero→webgl2; all tiers rich+stable (Doctrine #73); hardware_rt_ready / lumen_radiance_cascades_aaa_ready / unreal_fidelity_parity_ready / rt_gi_bounce_ready false; distinct from ac assetColorAppearanceReady + gm radianceCascadesGiReady + go spectralLightPipelineReady + gf acesCinematicTonemapperReady + gr hdr32BitFloatPipelineReady + lk assetSpectralRadianceReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `scalableFidelityReady` (letter sf).
pub fn probe_scalable_fidelity() -> KernelScalableFidelityWireReport {
    to_report(
        kernel_probe(),
        "Scalable Fidelity Blueprint probe (letter sf) — deterministic, GPU-free Law XV §1 feature-gating authority for 'how lighting works WITHOUT ray tracing / on weak hardware': 4 tiers, exact render graphs, monotonic feature ladder, tier-aware VRAM budget, FSR on integrated/discrete/enthusiast, baked lightmaps on integrated/webgl2, SSGI+probes on discrete, RT gated to enthusiast only with AAA flags HELD; distinct from assetColorAppearanceReady, radianceCascadesGiReady, spectralLightPipelineReady, acesCinematicTonemapperReady, hdr32BitFloatPipelineReady, assetSpectralRadianceReady, and probe_kernel_foundation; hardware_rt_ready / lumen_radiance_cascades_aaa_ready HELD",
    )
}

/// Tauri IPC — Scalable Fidelity honesty.
#[tauri::command]
pub fn probe_scalable_fidelity_cmd() -> KernelScalableFidelityWireReport {
    probe_scalable_fidelity()
}

/// Tauri IPC — run Scalable Fidelity soak.
#[tauri::command]
pub fn run_kernel_scalable_fidelity_soak_cmd() -> KernelScalableFidelityWireReport {
    run_kernel_scalable_fidelity_soak()
}

//! Skin-Tension Wrinkle Map desktop wire — letter **kd**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::skin_wrinkle_map`
//! (AV/Render supremacy audit claim 1 sub-surface — rhytides): it **extends
//! the real** [`strain_aware_texturing`] (gs) substrate — the genuine gs
//! combined strain (curvature strain + UV-jacobian stretch strain) and albedo
//! whitening drive the wrinkle map. Crease curvature + real gs tension ->
//! wrinkle density (smoothstep fold band) + tension-deepened strength, gated
//! by a per-region wrinkle mask (forehead / crow's-feet / cheek / lip; masked
//! regions stay smooth and un-occluded), and each fold groove occludes
//! ambient light (`occlusion = density·strength·AO_DEPTH_MAX`, `ao =
//! 1 − occlusion`). Honesty probe `skinWrinkleMapReady` is **distinct** from
//! gs `strainAwareTexturingReady` and from ej `fmAdditiveSynthesisReady`, jx
//! `metasoundsDspReady`, ka `acousticRaytracingSolverReady`, kb
//! `soundPhysicsDuplexReady`, kc `facialPerformanceReady`, ex
//! `sdfAudioRaymarchingReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, gw/gv fluid probes, and ew
//! `volumetricExtinctionMediumReady`. Full MetaHuman-class wrinkle AAA and
//! full ray-traced skin AO AAA HELD (fail-closed `false`).

use aethel_kernel_rust::skin_wrinkle_map::{
    probe_skin_wrinkle_map as kernel_probe, run_skin_wrinkle_map_soak,
    SkinWrinkleMapSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSkinWrinkleMapWireReport {
    pub skin_wrinkle_map_ready: bool,
    pub higher_tension_more_wrinkles: bool,
    pub region_mask_respected: bool,
    pub occlusion_darkens_grooves: bool,
    pub substrate_strain_real: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_range: bool,
    pub density_high: f32,
    pub density_low: f32,
    pub strength_high: f32,
    pub strength_low: f32,
    pub intensity_high: f32,
    pub intensity_low: f32,
    pub occlusion_high: f32,
    pub occlusion_low: f32,
    pub ao_high: f32,
    pub ao_low: f32,
    pub masked_density: f32,
    pub masked_strength: f32,
    pub masked_occlusion: f32,
    pub masked_ao: f32,
    pub substrate_strain_high: f32,
    pub substrate_strain_low: f32,
    pub substrate_whitening_high: f32,
    pub substrate_whitening_low: f32,
    pub sample_count: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    pub wrinkle_aaa_ready: bool,
    pub ao_aaa_ready: bool,
    pub linear_plan_only: bool,
}

fn to_report(
    r: SkinWrinkleMapSoakReport,
    note: impl Into<String>,
) -> KernelSkinWrinkleMapWireReport {
    KernelSkinWrinkleMapWireReport {
        skin_wrinkle_map_ready: r.skin_wrinkle_map_ready,
        higher_tension_more_wrinkles: r.higher_tension_more_wrinkles,
        region_mask_respected: r.region_mask_respected,
        occlusion_darkens_grooves: r.occlusion_darkens_grooves,
        substrate_strain_real: r.substrate_strain_real,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        in_unit_range: r.in_unit_range,
        density_high: r.density_high,
        density_low: r.density_low,
        strength_high: r.strength_high,
        strength_low: r.strength_low,
        intensity_high: r.intensity_high,
        intensity_low: r.intensity_low,
        occlusion_high: r.occlusion_high,
        occlusion_low: r.occlusion_low,
        ao_high: r.ao_high,
        ao_low: r.ao_low,
        masked_density: r.masked_density,
        masked_strength: r.masked_strength,
        masked_occlusion: r.masked_occlusion,
        masked_ao: r.masked_ao,
        substrate_strain_high: r.substrate_strain_high,
        substrate_strain_low: r.substrate_strain_low,
        substrate_whitening_high: r.substrate_whitening_high,
        substrate_whitening_low: r.substrate_whitening_low,
        sample_count: r.sample_count,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        letter: r.letter,
        note: note.into(),
        wrinkle_aaa_ready: r.wrinkle_aaa_ready,
        ao_aaa_ready: r.ao_aaa_ready,
        linear_plan_only: r.linear_plan_only,
    }
}

/// Run skin-tension wrinkle-map soak via kernel.
pub fn run_kernel_skin_wrinkle_map_soak() -> KernelSkinWrinkleMapWireReport {
    let r = run_skin_wrinkle_map_soak();
    let note = if !r.skin_wrinkle_map_ready {
        "Skin-wrinkle-map soak failed — skinWrinkleMapReady stays false"
    } else {
        "Desktop soak on the real gs substrate: crease curvature + real StrainAwareTexturing combined strain (curvature strain + UV-jacobian stretch strain) -> wrinkle density (smoothstep fold band) + tension-deepened strength, gated by a per-region mask (forehead/crow's-feet/cheek/lip; masked regions stay smooth) -> groove ambient occlusion (density*strength*AO_DEPTH_MAX, ao = 1 - occlusion) — skinWrinkleMapReady true, soak-gated on 9 invariants (higher_tension_more_wrinkles, region_mask_respected, occlusion_darkens_grooves, substrate_strain_real, same_seed_same_results, deterministic, outputs_finite, in_unit_range); wrinkle_aaa_ready / ao_aaa_ready false (HELD); fingerprint seed kd_skin distinct from gs strainAwareTexturingReady + ej fmAdditiveSynthesisReady, jx metasoundsDspReady, ka acousticRaytracingSolverReady, kb soundPhysicsDuplexReady, kc facialPerformanceReady, ex sdfAudioRaymarchingReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, gw/gv fluid, and ew volumetricExtinctionMediumReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `skinWrinkleMapReady` (letter kd).
pub fn probe_skin_wrinkle_map() -> KernelSkinWrinkleMapWireReport {
    to_report(
        kernel_probe(),
        "Skin-tension wrinkle-map probe (letter kd) — distinct from gs strainAwareTexturingReady, fmAdditiveSynthesisReady, metasoundsDspReady, acousticRaytracingSolverReady, soundPhysicsDuplexReady, facialPerformanceReady, sdfAudioRaymarchingReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, latticeBoltzmann fluid / aerodynamic Navier-Stokes probes, and volumetricExtinctionMediumReady; wrinkle_aaa_ready / ao_aaa_ready HELD",
    )
}

/// Tauri IPC — skin-tension wrinkle-map honesty.
#[tauri::command]
pub fn probe_skin_wrinkle_map_cmd() -> KernelSkinWrinkleMapWireReport {
    probe_skin_wrinkle_map()
}

/// Tauri IPC — run skin-tension wrinkle-map soak.
#[tauri::command]
pub fn run_kernel_skin_wrinkle_map_soak_cmd() -> KernelSkinWrinkleMapWireReport {
    run_kernel_skin_wrinkle_map_soak()
}

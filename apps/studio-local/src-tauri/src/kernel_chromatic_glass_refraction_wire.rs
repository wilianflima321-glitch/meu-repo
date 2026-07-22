//! Chromatic Glass Refraction desktop wire — letter **gd**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::chromatic_glass_refraction`
//! (Snell's-law refract + Cauchy λ-dependent η; soak proves RGB diverge vs
//! mono, same-seed dirs, unit vectors, TIR→reflect).
//! Honesty probe `chromaticGlassRefractionReady` is **distinct** from gc
//! `dynamicPhysicsDslReady`, gb `atmosphericScatteringGodraysReady`, ga
//! `voxelConeRadiosityReady`, and prior.
//! Full spectral path-tracer / UE glass AAA stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::chromatic_glass_refraction::{
    probe_chromatic_glass_refraction as kernel_probe, run_chromatic_glass_refraction_soak,
    ChromaticGlassRefractionSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelChromaticGlassRefractionWireReport {
    pub chromatic_glass_refraction_ready: bool,
    pub rgb_diverge_vs_mono: bool,
    pub same_seed_same_dirs: bool,
    pub deterministic: bool,
    pub directions_unit: bool,
    pub outputs_finite: bool,
    pub tir_fail_closed: bool,
    pub state_mutated: bool,
    pub angular_spread_rgb: f32,
    pub angular_spread_mono: f32,
    pub ior_r: f32,
    pub ior_g: f32,
    pub ior_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_dynamic_physics_dsl_probe: bool,
    pub distinct_from_atmospheric_scattering_godrays_probe: bool,
    pub distinct_from_voxel_cone_radiosity_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub spectral_path_tracer_aaa_ready: bool,
    pub ue_glass_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: ChromaticGlassRefractionSoakReport,
    note: impl Into<String>,
) -> KernelChromaticGlassRefractionWireReport {
    KernelChromaticGlassRefractionWireReport {
        chromatic_glass_refraction_ready: r.chromatic_glass_refraction_ready,
        rgb_diverge_vs_mono: r.rgb_diverge_vs_mono,
        same_seed_same_dirs: r.same_seed_same_dirs,
        deterministic: r.deterministic,
        directions_unit: r.directions_unit,
        outputs_finite: r.outputs_finite,
        tir_fail_closed: r.tir_fail_closed,
        state_mutated: r.state_mutated,
        angular_spread_rgb: r.angular_spread_rgb,
        angular_spread_mono: r.angular_spread_mono,
        ior_r: r.ior_r,
        ior_g: r.ior_g,
        ior_b: r.ior_b,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_dynamic_physics_dsl_probe: r.distinct_from_dynamic_physics_dsl_probe,
        distinct_from_atmospheric_scattering_godrays_probe: r
            .distinct_from_atmospheric_scattering_godrays_probe,
        distinct_from_voxel_cone_radiosity_probe: r.distinct_from_voxel_cone_radiosity_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gd".into(),
        note: note.into(),
        spectral_path_tracer_aaa_ready: r.spectral_path_tracer_aaa_ready,
        ue_glass_aaa_ready: r.ue_glass_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run chromatic glass refraction soak via kernel.
pub fn run_kernel_chromatic_glass_refraction_soak() -> KernelChromaticGlassRefractionWireReport {
    let r = run_chromatic_glass_refraction_soak();
    let note = if !r.chromatic_glass_refraction_ready {
        "Chromatic glass refraction soak failed — chromaticGlassRefractionReady stays false"
    } else {
        "Desktop soak: Snell refract(I,N,η) + Cauchy η(λ); RGB diverge vs mono; same seed→same dirs; unit vectors; TIR→reflect — chromaticGlassRefractionReady true; spectral_path_tracer_aaa_ready / ue_glass_aaa_ready false; distinct from gc dynamicPhysicsDslReady + gb atmosphericScatteringGodraysReady + ga voxelConeRadiosityReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `chromaticGlassRefractionReady` (letter gd).
pub fn probe_chromatic_glass_refraction() -> KernelChromaticGlassRefractionWireReport {
    to_report(
        kernel_probe(),
        "Chromatic glass refraction probe (letter gd) — distinct from dynamicPhysicsDslReady, atmosphericScatteringGodraysReady, voxelConeRadiosityReady, and probe_kernel_foundation; spectral_path_tracer_aaa_ready / ue_glass_aaa_ready HELD",
    )
}

/// Tauri IPC — chromatic glass refraction honesty.
#[tauri::command]
pub fn probe_chromatic_glass_refraction_cmd() -> KernelChromaticGlassRefractionWireReport {
    probe_chromatic_glass_refraction()
}

/// Tauri IPC — run chromatic glass refraction soak.
#[tauri::command]
pub fn run_kernel_chromatic_glass_refraction_soak_cmd() -> KernelChromaticGlassRefractionWireReport {
    run_kernel_chromatic_glass_refraction_soak()
}

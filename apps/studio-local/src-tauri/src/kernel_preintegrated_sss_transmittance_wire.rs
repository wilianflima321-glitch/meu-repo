//! Preintegrated SSS Transmittance desktop wire — letter **ge**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::preintegrated_sss_transmittance`
//! (wrap lighting × multi-Gaussian diffusion profile; soak proves thicker→lower T,
//! same-seed RGB, values≥0).
//! Honesty probe `preintegratedSssTransmittanceReady` is **distinct** from gd
//! `chromaticGlassRefractionReady`, gc `dynamicPhysicsDslReady`, gb
//! `atmosphericScatteringGodraysReady`, and prior.
//! Full skin SSS / Unreal SubsurfaceProfile AAA stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::preintegrated_sss_transmittance::{
    probe_preintegrated_sss_transmittance as kernel_probe,
    run_preintegrated_sss_transmittance_soak, PreintegratedSssTransmittanceSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelPreintegratedSssTransmittanceWireReport {
    pub preintegrated_sss_transmittance_ready: bool,
    pub thickness_monotonic_decay: bool,
    pub same_seed_same_rgb: bool,
    pub deterministic: bool,
    pub values_non_negative: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub thin_luminance: f32,
    pub thick_luminance: f32,
    pub sample_r: f32,
    pub sample_g: f32,
    pub sample_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_dynamic_physics_dsl_probe: bool,
    pub distinct_from_atmospheric_scattering_godrays_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub full_skin_sss_aaa_ready: bool,
    pub ue_subsurface_profile_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: PreintegratedSssTransmittanceSoakReport,
    note: impl Into<String>,
) -> KernelPreintegratedSssTransmittanceWireReport {
    KernelPreintegratedSssTransmittanceWireReport {
        preintegrated_sss_transmittance_ready: r.preintegrated_sss_transmittance_ready,
        thickness_monotonic_decay: r.thickness_monotonic_decay,
        same_seed_same_rgb: r.same_seed_same_rgb,
        deterministic: r.deterministic,
        values_non_negative: r.values_non_negative,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        thin_luminance: r.thin_luminance,
        thick_luminance: r.thick_luminance,
        sample_r: r.sample_r,
        sample_g: r.sample_g,
        sample_b: r.sample_b,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_chromatic_glass_refraction_probe: r
            .distinct_from_chromatic_glass_refraction_probe,
        distinct_from_dynamic_physics_dsl_probe: r.distinct_from_dynamic_physics_dsl_probe,
        distinct_from_atmospheric_scattering_godrays_probe: r
            .distinct_from_atmospheric_scattering_godrays_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "ge".into(),
        note: note.into(),
        full_skin_sss_aaa_ready: r.full_skin_sss_aaa_ready,
        ue_subsurface_profile_aaa_ready: r.ue_subsurface_profile_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run preintegrated SSS transmittance soak via kernel.
pub fn run_kernel_preintegrated_sss_transmittance_soak()
-> KernelPreintegratedSssTransmittanceWireReport {
    let r = run_preintegrated_sss_transmittance_soak();
    let note = if !r.preintegrated_sss_transmittance_ready {
        "Preintegrated SSS transmittance soak failed — preintegratedSssTransmittanceReady stays false"
    } else {
        "Desktop soak: wrap×Gaussian-sum diffusion T(thickness,N·L); thicker→lower T; same seed→same RGB; values≥0 — preintegratedSssTransmittanceReady true; full_skin_sss_aaa_ready / ue_subsurface_profile_aaa_ready false; distinct from gd chromaticGlassRefractionReady + gc dynamicPhysicsDslReady + gb atmosphericScatteringGodraysReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `preintegratedSssTransmittanceReady` (letter ge).
pub fn probe_preintegrated_sss_transmittance() -> KernelPreintegratedSssTransmittanceWireReport {
    to_report(
        kernel_probe(),
        "Preintegrated SSS transmittance probe (letter ge) — distinct from chromaticGlassRefractionReady, dynamicPhysicsDslReady, atmosphericScatteringGodraysReady, and probe_kernel_foundation; full_skin_sss_aaa_ready / ue_subsurface_profile_aaa_ready HELD",
    )
}

/// Tauri IPC — preintegrated SSS transmittance honesty.
#[tauri::command]
pub fn probe_preintegrated_sss_transmittance_cmd() -> KernelPreintegratedSssTransmittanceWireReport {
    probe_preintegrated_sss_transmittance()
}

/// Tauri IPC — run preintegrated SSS transmittance soak.
#[tauri::command]
pub fn run_kernel_preintegrated_sss_transmittance_soak_cmd()
-> KernelPreintegratedSssTransmittanceWireReport {
    run_kernel_preintegrated_sss_transmittance_soak()
}

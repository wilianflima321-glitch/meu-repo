//! ACES Cinematic Tonemapper desktop wire — letter **gf**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::aces_cinematic_tonemapper`
//! (Stephen Hill ACES-fitted HDR→LDR; soak proves high-lum compress, mid-grey
//! stable, same input→same output, no NaN).
//! Honesty probe `acesCinematicTonemapperReady` is **distinct** from ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! gc `dynamicPhysicsDslReady`, and prior.
//! Full ACES 1.3 studio / Unreal ACES AAA stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::aces_cinematic_tonemapper::{
    probe_aces_cinematic_tonemapper as kernel_probe, run_aces_cinematic_tonemapper_soak,
    AcesCinematicTonemapperSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAcesCinematicTonemapperWireReport {
    pub aces_cinematic_tonemapper_ready: bool,
    pub high_luminance_compressed: bool,
    pub mid_grey_stable: bool,
    pub same_input_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub state_mutated: bool,
    pub mid_grey_ldr: f32,
    pub high_lum_ldr: f32,
    pub sample_r: f32,
    pub sample_g: f32,
    pub sample_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_aces_13_studio_ready: bool,
    pub ue_aces_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: AcesCinematicTonemapperSoakReport,
    note: impl Into<String>,
) -> KernelAcesCinematicTonemapperWireReport {
    KernelAcesCinematicTonemapperWireReport {
        aces_cinematic_tonemapper_ready: r.aces_cinematic_tonemapper_ready,
        high_luminance_compressed: r.high_luminance_compressed,
        mid_grey_stable: r.mid_grey_stable,
        same_input_same_output: r.same_input_same_output,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        in_unit_interval: r.in_unit_interval,
        state_mutated: r.state_mutated,
        mid_grey_ldr: r.mid_grey_ldr,
        high_lum_ldr: r.high_lum_ldr,
        sample_r: r.sample_r,
        sample_g: r.sample_g,
        sample_b: r.sample_b,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gf".into(),
        note: note.into(),
        full_aces_13_studio_ready: r.full_aces_13_studio_ready,
        ue_aces_aaa_ready: r.ue_aces_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run ACES cinematic tonemapper soak via kernel.
pub fn run_kernel_aces_cinematic_tonemapper_soak() -> KernelAcesCinematicTonemapperWireReport {
    let r = run_aces_cinematic_tonemapper_soak();
    let note = if !r.aces_cinematic_tonemapper_ready {
        "ACES cinematic tonemapper soak failed — acesCinematicTonemapperReady stays false"
    } else {
        "Desktop soak: Stephen Hill ACES-fitted HDR→LDR; high-lum compress∈[0,1]; mid-grey stable; same input→same output; no NaN — acesCinematicTonemapperReady true; full_aces_13_studio_ready / ue_aces_aaa_ready false; distinct from ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + gc dynamicPhysicsDslReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `acesCinematicTonemapperReady` (letter gf).
pub fn probe_aces_cinematic_tonemapper() -> KernelAcesCinematicTonemapperWireReport {
    to_report(
        kernel_probe(),
        "ACES cinematic tonemapper probe (letter gf) — distinct from preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, dynamicPhysicsDslReady, and probe_kernel_foundation; full_aces_13_studio_ready / ue_aces_aaa_ready HELD",
    )
}

/// Tauri IPC — ACES cinematic tonemapper honesty.
#[tauri::command]
pub fn probe_aces_cinematic_tonemapper_cmd() -> KernelAcesCinematicTonemapperWireReport {
    probe_aces_cinematic_tonemapper()
}

/// Tauri IPC — run ACES cinematic tonemapper soak.
#[tauri::command]
pub fn run_kernel_aces_cinematic_tonemapper_soak_cmd() -> KernelAcesCinematicTonemapperWireReport {
    run_kernel_aces_cinematic_tonemapper_soak()
}

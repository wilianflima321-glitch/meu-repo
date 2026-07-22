//! Infinite Anti-Aliasing desktop wire — letter **gi**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::infinite_anti_aliasing`
//! (exponential history blend + 3×3 neighborhood clamp on a tiny high-contrast
//! edge buffer; soak proves edge variance ↓ vs raw, same seed→same, [0,1], no NaN).
//! Honesty probe `infiniteAntiAliasingReady` is **distinct** from gh
//! `wgslSurfaceNoiseReady`, gf `acesCinematicTonemapperReady`, gg
//! `fluidNinjaComputeReady`, and prior.
//! Full DLSS / TAAU / Unreal TSR AAA stay false (HELD). Coins / Agones /
//! Nanite / Quic HELD. Do **not** invent DLSS.

use aethel_kernel_rust::infinite_anti_aliasing::{
    probe_infinite_anti_aliasing as kernel_probe, run_infinite_anti_aliasing_soak,
    InfiniteAntiAliasingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelInfiniteAntiAliasingWireReport {
    pub infinite_anti_aliasing_ready: bool,
    pub edge_variance_reduced: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub raw_edge_variance: f32,
    pub aa_edge_variance: f32,
    pub variance_reduction_ratio: f32,
    pub mean_edge_gradient_raw: f32,
    pub mean_edge_gradient_aa: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_wgsl_surface_noise_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub full_dlss_ready: bool,
    pub taau_ue_tsr_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: InfiniteAntiAliasingSoakReport,
    note: impl Into<String>,
) -> KernelInfiniteAntiAliasingWireReport {
    KernelInfiniteAntiAliasingWireReport {
        infinite_anti_aliasing_ready: r.infinite_anti_aliasing_ready,
        edge_variance_reduced: r.edge_variance_reduced,
        same_seed_same_output: r.same_seed_same_output,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        in_unit_interval: r.in_unit_interval,
        no_nan: r.no_nan,
        state_mutated: r.state_mutated,
        raw_edge_variance: r.raw_edge_variance,
        aa_edge_variance: r.aa_edge_variance,
        variance_reduction_ratio: r.variance_reduction_ratio,
        mean_edge_gradient_raw: r.mean_edge_gradient_raw,
        mean_edge_gradient_aa: r.mean_edge_gradient_aa,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_fluid_ninja_compute_probe: r.distinct_from_fluid_ninja_compute_probe,
        distinct_from_wgsl_surface_noise_probe: r.distinct_from_wgsl_surface_noise_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gi".into(),
        note: note.into(),
        full_dlss_ready: r.full_dlss_ready,
        taau_ue_tsr_aaa_ready: r.taau_ue_tsr_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Infinite Anti-Aliasing soak via kernel.
pub fn run_kernel_infinite_anti_aliasing_soak() -> KernelInfiniteAntiAliasingWireReport {
    let r = run_infinite_anti_aliasing_soak();
    let note = if !r.infinite_anti_aliasing_ready {
        "Infinite anti-aliasing soak failed — infiniteAntiAliasingReady stays false"
    } else {
        "Desktop soak: exponential history blend + 3×3 neighborhood clamp; high-contrast edge variance↓ vs raw + same seed→same + values∈[0,1] + no NaN — infiniteAntiAliasingReady true; full_dlss_ready / taau_ue_tsr_aaa_ready false; distinct from gh wgslSurfaceNoiseReady + gf acesCinematicTonemapperReady + gg fluidNinjaComputeReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `infiniteAntiAliasingReady` (letter gi).
pub fn probe_infinite_anti_aliasing() -> KernelInfiniteAntiAliasingWireReport {
    to_report(
        kernel_probe(),
        "Infinite anti-aliasing probe (letter gi) — distinct from wgslSurfaceNoiseReady, acesCinematicTonemapperReady, fluidNinjaComputeReady, and probe_kernel_foundation; full_dlss_ready / taau_ue_tsr_aaa_ready HELD",
    )
}

/// Tauri IPC — Infinite Anti-Aliasing honesty.
#[tauri::command]
pub fn probe_infinite_anti_aliasing_cmd() -> KernelInfiniteAntiAliasingWireReport {
    probe_infinite_anti_aliasing()
}

/// Tauri IPC — run Infinite Anti-Aliasing soak.
#[tauri::command]
pub fn run_kernel_infinite_anti_aliasing_soak_cmd() -> KernelInfiniteAntiAliasingWireReport {
    run_kernel_infinite_anti_aliasing_soak()
}

//! MSL → WGSL compiler desktop wire — letter **gp**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::msl_wgsl_compiler`
//! (Physical Intent / tiny IR → real WGSL string emit; soak proves same
//! IR→same WGSL, invalid IR fail-closed, output contains `@fragment` /
//! `fn main`).
//! Honesty probe `mslWgslCompilerReady` is **distinct** from gh
//! `wgslSurfaceNoiseKernelReady`, gf `acesCinematicTonemapperReady`, go
//! `spectralLightPipelineReady`, gn `alexaCinematicOpticsReady`, and prior
//! (never touch those probes). Full Metal/SPIR-V production compiler AAA
//! stays false (HELD). Coins / Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::msl_wgsl_compiler::{
    probe_msl_wgsl_compiler as kernel_probe, run_msl_wgsl_compiler_soak, MslWgslCompilerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMslWgslCompilerWireReport {
    pub msl_wgsl_compiler_ready: bool,
    pub same_ir_same_wgsl: bool,
    pub invalid_ir_fail_closed: bool,
    pub contains_fragment_attr: bool,
    pub contains_fn_main: bool,
    pub deterministic: bool,
    pub state_mutated: bool,
    pub wgsl_len: u32,
    pub fingerprint: u64,
    pub distinct_from_wgsl_surface_noise_kernel_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_alexa_cinematic_optics_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub full_metal_spirv_compiler_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: MslWgslCompilerSoakReport,
    note: impl Into<String>,
) -> KernelMslWgslCompilerWireReport {
    KernelMslWgslCompilerWireReport {
        msl_wgsl_compiler_ready: r.msl_wgsl_compiler_ready,
        same_ir_same_wgsl: r.same_ir_same_wgsl,
        invalid_ir_fail_closed: r.invalid_ir_fail_closed,
        contains_fragment_attr: r.contains_fragment_attr,
        contains_fn_main: r.contains_fn_main,
        deterministic: r.deterministic,
        state_mutated: r.state_mutated,
        wgsl_len: r.wgsl_len,
        fingerprint: r.fingerprint,
        distinct_from_wgsl_surface_noise_kernel_probe: r
            .distinct_from_wgsl_surface_noise_kernel_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_spectral_light_pipeline_probe: r.distinct_from_spectral_light_pipeline_probe,
        distinct_from_alexa_cinematic_optics_probe: r.distinct_from_alexa_cinematic_optics_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gp".into(),
        note: note.into(),
        full_metal_spirv_compiler_aaa_ready: r.full_metal_spirv_compiler_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run MSL→WGSL compiler soak via kernel.
pub fn run_kernel_msl_wgsl_compiler_soak() -> KernelMslWgslCompilerWireReport {
    let r = run_msl_wgsl_compiler_soak();
    let note = if !r.msl_wgsl_compiler_ready {
        "MSL→WGSL compiler soak failed — mslWgslCompilerReady stays false"
    } else {
        "Desktop soak: Physical Intent/tiny IR → real WGSL string emit; same IR→same WGSL + invalid IR fail-closed + @fragment/fn main tokens — mslWgslCompilerReady true; full_metal_spirv_compiler_aaa_ready false; GPU device submit HELD; distinct from gh wgslSurfaceNoiseKernelReady + gf acesCinematicTonemapperReady + go spectralLightPipelineReady + gn alexaCinematicOpticsReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `mslWgslCompilerReady` (letter gp).
pub fn probe_msl_wgsl_compiler() -> KernelMslWgslCompilerWireReport {
    to_report(
        kernel_probe(),
        "MSL→WGSL compiler probe (letter gp) — distinct from wgslSurfaceNoiseKernelReady, acesCinematicTonemapperReady, spectralLightPipelineReady, alexaCinematicOpticsReady, and probe_kernel_foundation; full_metal_spirv_compiler_aaa_ready HELD",
    )
}

/// Tauri IPC — MSL→WGSL compiler honesty.
#[tauri::command]
pub fn probe_msl_wgsl_compiler_cmd() -> KernelMslWgslCompilerWireReport {
    probe_msl_wgsl_compiler()
}

/// Tauri IPC — run MSL→WGSL compiler soak.
#[tauri::command]
pub fn run_kernel_msl_wgsl_compiler_soak_cmd() -> KernelMslWgslCompilerWireReport {
    run_kernel_msl_wgsl_compiler_soak()
}

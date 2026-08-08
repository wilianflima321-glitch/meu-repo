//! WGSL Surface Noise Kernel desktop wire — letter **gh**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::wgsl_surface_noise_kernel`
//! (seeded value/gradient/simplex-lite surface displacement factor; soak proves
//! same seed+uv→same value, different seeds diverge, range bounded, continuity
//! vs white noise).
//! Honesty probe `wgslSurfaceNoiseKernelReady` is **distinct** from gf
//! `acesCinematicTonemapperReady`, gg `fluidNinjaComputeReady`, ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! ev `microDisplacementNoiseReady`, and prior.
//! Full WGSL runtime GPU dispatch AAA stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.
//!
//! Letter **in**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::wgsl_surface_noise_kernel::{
    probe_wgsl_surface_noise_kernel as kernel_probe, run_wgsl_surface_noise_kernel_soak,
    WgslSurfaceNoiseKernelSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWgslSurfaceNoiseKernelWireReport {
    pub wgsl_surface_noise_kernel_ready: bool,
    pub same_seed_same_uv: bool,
    pub different_seeds_diverge: bool,
    pub range_bounded: bool,
    pub continuous_vs_white: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub mean_abs_delta_noise: f32,
    pub mean_abs_delta_white: f32,
    pub sample_value: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub wgsl_gpu_dispatch_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: WgslSurfaceNoiseKernelSoakReport,
    note: impl Into<String>,
) -> KernelWgslSurfaceNoiseKernelWireReport {
    KernelWgslSurfaceNoiseKernelWireReport {
        wgsl_surface_noise_kernel_ready: r.wgsl_surface_noise_kernel_ready,
        same_seed_same_uv: r.same_seed_same_uv,
        different_seeds_diverge: r.different_seeds_diverge,
        range_bounded: r.range_bounded,
        continuous_vs_white: r.continuous_vs_white,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        sample_count: r.sample_count,
        mean_abs_delta_noise: r.mean_abs_delta_noise,
        mean_abs_delta_white: r.mean_abs_delta_white,
        sample_value: r.sample_value,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gh".into(),
        note: note.into(),
        wgsl_gpu_dispatch_aaa_ready: r.wgsl_gpu_dispatch_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run WGSL surface noise kernel soak via kernel.
pub fn run_kernel_wgsl_surface_noise_kernel_soak() -> KernelWgslSurfaceNoiseKernelWireReport {
    let r = run_wgsl_surface_noise_kernel_soak();
    let note = if !r.wgsl_surface_noise_kernel_ready {
        "WGSL surface noise kernel soak failed — wgslSurfaceNoiseKernelReady stays false"
    } else {
        "Desktop soak: seeded value/gradient/simplex-lite displacement factor; same seed+uv→same; seeds diverge; range∈[-1,1]; continuity≪white — wgslSurfaceNoiseKernelReady true; wgsl_gpu_dispatch_aaa_ready false; distinct from gf acesCinematicTonemapperReady + gg fluidNinjaComputeReady + ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + ev microDisplacementNoiseReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `wgslSurfaceNoiseKernelReady` (letter gh).
pub fn probe_wgsl_surface_noise_kernel() -> KernelWgslSurfaceNoiseKernelWireReport {
    to_report(
        kernel_probe(),
        "WGSL surface noise kernel probe (letter gh) — distinct from acesCinematicTonemapperReady, fluidNinjaComputeReady, preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, microDisplacementNoiseReady, and probe_kernel_foundation; wgsl_gpu_dispatch_aaa_ready HELD",
    )
}

/// Tauri IPC — WGSL surface noise kernel honesty.
#[tauri::command]
pub fn probe_wgsl_surface_noise_kernel_cmd() -> KernelWgslSurfaceNoiseKernelWireReport {
    probe_wgsl_surface_noise_kernel()
}

/// Tauri IPC — run WGSL surface noise kernel soak.
#[tauri::command]
pub fn run_kernel_wgsl_surface_noise_kernel_soak_cmd() -> KernelWgslSurfaceNoiseKernelWireReport {
    run_kernel_wgsl_surface_noise_kernel_soak()
}

//! Four-Dimensional Time SDF desktop wire — letter **dv**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::four_dimensional_time_sdf`
//! (W-axis sphere↔box morph soak). Honesty probe `fourDimensionalTimeSdfReady`
//! is **distinct** from du `shadowTimeReversalReady`, dt `curvedRaymarcherReady`,
//! ds `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`,
//! dq `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full 4D continuum / Unreal 4D parity / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::four_dimensional_time_sdf::{
    probe_four_dimensional_time_sdf as kernel_probe, run_four_dimensional_time_sdf_soak,
    FourDimensionalTimeSdfSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFourDimensionalTimeSdfWireReport {
    pub four_dimensional_time_sdf_ready: bool,
    pub w_changes_distance: bool,
    pub morph_endpoints_match_primitives: bool,
    pub mid_w_between_endpoints: bool,
    pub non_finite_fail_closed: bool,
    pub distance_at_w0: f32,
    pub distance_at_w1: f32,
    pub distance_at_w_mid: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub four_dimensional_continuum_ready: bool,
    pub unreal_4d_parity_ready: bool,
}

fn to_report(
    r: FourDimensionalTimeSdfSoakReport,
    note: impl Into<String>,
) -> KernelFourDimensionalTimeSdfWireReport {
    KernelFourDimensionalTimeSdfWireReport {
        four_dimensional_time_sdf_ready: r.four_dimensional_time_sdf_ready,
        w_changes_distance: r.w_changes_distance,
        morph_endpoints_match_primitives: r.morph_endpoints_match_primitives,
        mid_w_between_endpoints: r.mid_w_between_endpoints,
        non_finite_fail_closed: r.non_finite_fail_closed,
        distance_at_w0: r.distance_at_w0,
        distance_at_w1: r.distance_at_w1,
        distance_at_w_mid: r.distance_at_w_mid,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "dv".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        four_dimensional_continuum_ready: r.four_dimensional_continuum_ready,
        unreal_4d_parity_ready: r.unreal_4d_parity_ready,
    }
}

/// Run four-dimensional time SDF soak via kernel.
pub fn run_kernel_four_dimensional_time_sdf_soak() -> KernelFourDimensionalTimeSdfWireReport {
    let r = run_four_dimensional_time_sdf_soak();
    let note = if !r.four_dimensional_time_sdf_ready {
        "Four-dimensional time SDF soak failed — fourDimensionalTimeSdfReady stays false"
    } else {
        "Desktop soak: W-axis sphere↔box morph — same XYZ different W changes distance; endpoints match primitives — fourDimensionalTimeSdfReady true; four_dimensional_continuum_ready false; unreal_4d_parity_ready false; distinct from du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `fourDimensionalTimeSdfReady` (letter dv).
pub fn probe_four_dimensional_time_sdf() -> KernelFourDimensionalTimeSdfWireReport {
    to_report(
        kernel_probe(),
        "Four-dimensional time SDF probe (letter dv) — distinct from shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; four_dimensional_continuum_ready / unreal_4d_parity_ready HELD",
    )
}

/// Tauri IPC — four-dimensional time SDF honesty.
#[tauri::command]
pub fn probe_four_dimensional_time_sdf_cmd() -> KernelFourDimensionalTimeSdfWireReport {
    probe_four_dimensional_time_sdf()
}

/// Tauri IPC — run four-dimensional time SDF soak.
#[tauri::command]
pub fn run_kernel_four_dimensional_time_sdf_soak_cmd() -> KernelFourDimensionalTimeSdfWireReport {
    run_kernel_four_dimensional_time_sdf_soak()
}

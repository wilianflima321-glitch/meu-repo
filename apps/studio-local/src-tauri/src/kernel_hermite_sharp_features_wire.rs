//! Hermite Sharp Features desktop wire — letter **el**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hermite_sharp_features`
//! (dihedral crease detect + feature-aware snap soak). Honesty probe
//! `hermiteSharpFeaturesReady` is **distinct** from ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes.
//! Full Instant Meshes / commercial remesh / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::hermite_sharp_features::{
    probe_hermite_sharp_features as kernel_probe, run_hermite_sharp_features_soak,
    HermiteSharpFeaturesSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHermiteSharpFeaturesWireReport {
    pub hermite_sharp_features_ready: bool,
    pub crease_edges_marked: bool,
    pub sharp_differs_from_smooth: bool,
    pub smooth_scene_low_crease: bool,
    pub outputs_finite: bool,
    pub max_crease_count: u32,
    pub max_sharp_smooth_delta: f32,
    pub max_dihedral_rad: f32,
    pub sample_count: u32,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub instant_meshes_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: HermiteSharpFeaturesSoakReport,
    note: impl Into<String>,
) -> KernelHermiteSharpFeaturesWireReport {
    KernelHermiteSharpFeaturesWireReport {
        hermite_sharp_features_ready: r.hermite_sharp_features_ready,
        crease_edges_marked: r.crease_edges_marked,
        sharp_differs_from_smooth: r.sharp_differs_from_smooth,
        smooth_scene_low_crease: r.smooth_scene_low_crease,
        outputs_finite: r.outputs_finite,
        max_crease_count: r.max_crease_count,
        max_sharp_smooth_delta: r.max_sharp_smooth_delta,
        max_dihedral_rad: r.max_dihedral_rad,
        sample_count: r.sample_count,
        distinct_from_peers_note: "distinct".into(),
        letter: "el".into(),
        note: note.into(),
        instant_meshes_parity_ready: r.instant_meshes_parity_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run Hermite sharp features soak via kernel.
pub fn run_kernel_hermite_sharp_features_soak() -> KernelHermiteSharpFeaturesWireReport {
    let r = run_hermite_sharp_features_soak();
    let note = if !r.hermite_sharp_features_ready {
        "Hermite sharp features soak failed — hermiteSharpFeaturesReady stays false"
    } else {
        "Desktop soak: Hermite dihedral crease mark + feature-aware snap; sharp crease differs from smooth blend — hermiteSharpFeaturesReady true; instant_meshes_parity_ready false; distinct from ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hermiteSharpFeaturesReady` (letter el).
pub fn probe_hermite_sharp_features() -> KernelHermiteSharpFeaturesWireReport {
    to_report(
        kernel_probe(),
        "Hermite sharp features probe (letter el) — distinct from hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; instant_meshes_parity_ready HELD",
    )
}

/// Tauri IPC — Hermite sharp features honesty.
#[tauri::command]
pub fn probe_hermite_sharp_features_cmd() -> KernelHermiteSharpFeaturesWireReport {
    probe_hermite_sharp_features()
}

/// Tauri IPC — run Hermite sharp features soak.
#[tauri::command]
pub fn run_kernel_hermite_sharp_features_soak_cmd() -> KernelHermiteSharpFeaturesWireReport {
    run_kernel_hermite_sharp_features_soak()
}

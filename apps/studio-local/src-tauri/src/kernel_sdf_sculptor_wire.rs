//! SDF Sculptor desktop wire — letter **em**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_sculptor`
//! (dense SDF grid + sphere/box softmin carve/add soak). Honesty probe
//! `sdfSculptorReady` is **distinct** from el `hermiteSharpFeaturesReady`,
//! ek `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes.
//! Full MagicaCSG / UE Geometry / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::sdf_sculptor::{
    probe_sdf_sculptor as kernel_probe, run_sdf_sculptor_soak, SdfSculptorSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfSculptorWireReport {
    pub sdf_sculptor_ready: bool,
    pub sphere_carve_changed: bool,
    pub sphere_add_changed: bool,
    pub box_carve_changed: bool,
    pub outputs_finite: bool,
    pub max_mean_abs_delta: f32,
    pub max_touched_voxels: u32,
    pub sample_count: u32,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(r: SdfSculptorSoakReport, note: impl Into<String>) -> KernelSdfSculptorWireReport {
    KernelSdfSculptorWireReport {
        sdf_sculptor_ready: r.sdf_sculptor_ready,
        sphere_carve_changed: r.sphere_carve_changed,
        sphere_add_changed: r.sphere_add_changed,
        box_carve_changed: r.box_carve_changed,
        outputs_finite: r.outputs_finite,
        max_mean_abs_delta: r.max_mean_abs_delta,
        max_touched_voxels: r.max_touched_voxels,
        sample_count: r.sample_count,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "em".into(),
        note: note.into(),
        magica_csg_parity_ready: r.magica_csg_parity_ready,
        ue_geometry_parity_ready: r.ue_geometry_parity_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run SDF sculptor soak via kernel.
pub fn run_kernel_sdf_sculptor_soak() -> KernelSdfSculptorWireReport {
    let r = run_sdf_sculptor_soak();
    let note = if !r.sdf_sculptor_ready {
        "SDF sculptor soak failed — sdfSculptorReady stays false"
    } else {
        "Desktop soak: dense SDF grid + sphere/box softmin carve/add; brush changes voxel SDF measurably — sdfSculptorReady true; magica_csg_parity_ready/ue_geometry_parity_ready false; distinct from el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfSculptorReady` (letter em).
pub fn probe_sdf_sculptor() -> KernelSdfSculptorWireReport {
    to_report(
        kernel_probe(),
        "SDF sculptor probe (letter em) — distinct from hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; magica_csg_parity_ready / ue_geometry_parity_ready HELD",
    )
}

/// Tauri IPC — SDF sculptor honesty.
#[tauri::command]
pub fn probe_sdf_sculptor_cmd() -> KernelSdfSculptorWireReport {
    probe_sdf_sculptor()
}

/// Tauri IPC — run SDF sculptor soak.
#[tauri::command]
pub fn run_kernel_sdf_sculptor_soak_cmd() -> KernelSdfSculptorWireReport {
    run_kernel_sdf_sculptor_soak()
}

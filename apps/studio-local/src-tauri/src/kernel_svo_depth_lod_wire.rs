//! SVO Depth LOD desktop wire — letter **et**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::svo_depth_lod`
//! (camera distance / screen-error → max SVO depth + es query couple).
//! Honesty probe `svoDepthLodReady` is **distinct** from es
//! `hybridGeometrySvoReady`, er `velocityBufferEcsReady`, eq
//! `sdfMotionVectorBufferReady`, ep `sdfOctreeHashingReady`, eo
//! `stochasticVirtualSdfReady`, en `sdfAdaptiveCascadesReady`, em
//! `sdfSculptorReady`, el `hermiteSharpFeaturesReady`, ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes.
//! Full Nanite/SVO HLOD AAA / MagicaCSG / Coins / Agones / DLSS HELD.

use aethel_kernel_rust::svo_depth_lod::{
    probe_svo_depth_lod as kernel_probe, run_svo_depth_lod_soak, SvoDepthLodSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSvoDepthLodWireReport {
    pub svo_depth_lod_ready: bool,
    pub near_deeper_than_far: bool,
    pub mid_between_near_far: bool,
    pub screen_error_near_deeper: bool,
    pub svo_query_respects_cap: bool,
    pub outputs_finite: bool,
    pub near_depth: u8,
    pub mid_depth: u8,
    pub far_depth: u8,
    pub near_error_depth: u8,
    pub far_error_depth: u8,
    pub near_query_depth: u8,
    pub far_query_depth: u8,
    pub near_occupied: bool,
    pub far_occupied: bool,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub nanite_svo_aaa_ready: bool,
    pub nanite_virtual_texture_aaa_ready: bool,
    pub nanite_clipmap_aaa_ready: bool,
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(r: SvoDepthLodSoakReport, note: impl Into<String>) -> KernelSvoDepthLodWireReport {
    KernelSvoDepthLodWireReport {
        svo_depth_lod_ready: r.svo_depth_lod_ready,
        near_deeper_than_far: r.near_deeper_than_far,
        mid_between_near_far: r.mid_between_near_far,
        screen_error_near_deeper: r.screen_error_near_deeper,
        svo_query_respects_cap: r.svo_query_respects_cap,
        outputs_finite: r.outputs_finite,
        near_depth: r.near_depth,
        mid_depth: r.mid_depth,
        far_depth: r.far_depth,
        near_error_depth: r.near_error_depth,
        far_error_depth: r.far_error_depth,
        near_query_depth: r.near_query_depth,
        far_query_depth: r.far_query_depth,
        near_occupied: r.near_occupied,
        far_occupied: r.far_occupied,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "et".into(),
        note: note.into(),
        nanite_svo_aaa_ready: r.nanite_svo_aaa_ready,
        nanite_virtual_texture_aaa_ready: r.nanite_virtual_texture_aaa_ready,
        nanite_clipmap_aaa_ready: r.nanite_clipmap_aaa_ready,
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

/// Run SVO depth LOD soak via kernel.
pub fn run_kernel_svo_depth_lod_soak() -> KernelSvoDepthLodWireReport {
    let r = run_svo_depth_lod_soak();
    let note = if !r.svo_depth_lod_ready {
        "SVO depth LOD soak failed — svoDepthLodReady stays false"
    } else {
        "Desktop soak: camera distance / screen-error → max SVO depth; near→deeper far→shallower; HybridGeometrySvo query respects depth cap — svoDepthLodReady true; nanite_svo_aaa_ready false; distinct from es hybridGeometrySvoReady, er velocityBufferEcsReady, eq sdfMotionVectorBufferReady, ep sdfOctreeHashingReady, eo stochasticVirtualSdfReady, en sdfAdaptiveCascadesReady, em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `svoDepthLodReady` (letter et).
pub fn probe_svo_depth_lod() -> KernelSvoDepthLodWireReport {
    to_report(
        kernel_probe(),
        "SVO depth LOD probe (letter et) — distinct from hybridGeometrySvoReady, velocityBufferEcsReady, sdfMotionVectorBufferReady, sdfOctreeHashingReady, stochasticVirtualSdfReady, sdfAdaptiveCascadesReady, sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; nanite_svo_aaa_ready HELD",
    )
}

/// Tauri IPC — SVO depth LOD honesty.
#[tauri::command]
pub fn probe_svo_depth_lod_cmd() -> KernelSvoDepthLodWireReport {
    probe_svo_depth_lod()
}

/// Tauri IPC — run SVO depth LOD soak.
#[tauri::command]
pub fn run_kernel_svo_depth_lod_soak_cmd() -> KernelSvoDepthLodWireReport {
    run_kernel_svo_depth_lod_soak()
}

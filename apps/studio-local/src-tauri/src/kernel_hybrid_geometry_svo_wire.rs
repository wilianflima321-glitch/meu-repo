//! Hybrid Geometry SVO desktop wire — letter **es**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hybrid_geometry_svo`
//! (sparse voxel octree insert + occupancy/LOD query soak). Honesty probe
//! `hybridGeometrySvoReady` is **distinct** from er `velocityBufferEcsReady`,
//! eq `sdfMotionVectorBufferReady`, ep `sdfOctreeHashingReady`, eo
//! `stochasticVirtualSdfReady`, en `sdfAdaptiveCascadesReady`, em
//! `sdfSculptorReady`, el `hermiteSharpFeaturesReady`, ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes.
//! Full Nanite/SVO AAA / MagicaCSG / Coins / Agones / DLSS HELD.

use aethel_kernel_rust::hybrid_geometry_svo::{
    probe_hybrid_geometry_svo as kernel_probe, run_hybrid_geometry_svo_soak,
    HybridGeometrySvoSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHybridGeometrySvoWireReport {
    pub hybrid_geometry_svo_ready: bool,
    pub insert_occupied: bool,
    pub query_hit: bool,
    pub query_miss_empty: bool,
    pub lod_query_finite: bool,
    pub outputs_finite: bool,
    pub occupied_leaf_count: u32,
    pub hit_depth: u8,
    pub miss_depth: u8,
    pub lod_depth: u8,
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

fn to_report(
    r: HybridGeometrySvoSoakReport,
    note: impl Into<String>,
) -> KernelHybridGeometrySvoWireReport {
    KernelHybridGeometrySvoWireReport {
        hybrid_geometry_svo_ready: r.hybrid_geometry_svo_ready,
        insert_occupied: r.insert_occupied,
        query_hit: r.query_hit,
        query_miss_empty: r.query_miss_empty,
        lod_query_finite: r.lod_query_finite,
        outputs_finite: r.outputs_finite,
        occupied_leaf_count: r.occupied_leaf_count,
        hit_depth: r.hit_depth,
        miss_depth: r.miss_depth,
        lod_depth: r.lod_depth,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "es".into(),
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

/// Run hybrid geometry SVO soak via kernel.
pub fn run_kernel_hybrid_geometry_svo_soak() -> KernelHybridGeometrySvoWireReport {
    let r = run_hybrid_geometry_svo_soak();
    let note = if !r.hybrid_geometry_svo_ready {
        "Hybrid geometry SVO soak failed — hybridGeometrySvoReady stays false"
    } else {
        "Desktop soak: sparse voxel octree insert occupied leaves; occupancy query hit; empty miss; LOD depth cap finite — hybridGeometrySvoReady true; nanite_svo_aaa_ready false; distinct from er velocityBufferEcsReady, eq sdfMotionVectorBufferReady, ep sdfOctreeHashingReady, eo stochasticVirtualSdfReady, en sdfAdaptiveCascadesReady, em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hybridGeometrySvoReady` (letter es).
pub fn probe_hybrid_geometry_svo() -> KernelHybridGeometrySvoWireReport {
    to_report(
        kernel_probe(),
        "Hybrid geometry SVO probe (letter es) — distinct from velocityBufferEcsReady, sdfMotionVectorBufferReady, sdfOctreeHashingReady, stochasticVirtualSdfReady, sdfAdaptiveCascadesReady, sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; nanite_svo_aaa_ready HELD",
    )
}

/// Tauri IPC — hybrid geometry SVO honesty.
#[tauri::command]
pub fn probe_hybrid_geometry_svo_cmd() -> KernelHybridGeometrySvoWireReport {
    probe_hybrid_geometry_svo()
}

/// Tauri IPC — run hybrid geometry SVO soak.
#[tauri::command]
pub fn run_kernel_hybrid_geometry_svo_soak_cmd() -> KernelHybridGeometrySvoWireReport {
    run_kernel_hybrid_geometry_svo_soak()
}

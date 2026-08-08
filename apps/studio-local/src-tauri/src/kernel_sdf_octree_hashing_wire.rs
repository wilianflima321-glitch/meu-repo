//! SDF Octree Hashing desktop wire — letter **ep**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_octree_hashing`
//! (sparse spatial hash of SDF bricks soak). Honesty probe
//! `sdfOctreeHashingReady` is **distinct** from eo `stochasticVirtualSdfReady`,
//! en `sdfAdaptiveCascadesReady`, em `sdfSculptorReady`, el
//! `hermiteSharpFeaturesReady`, ek `hermiteDualityGridReady`, ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`, ee–ea
//! fluid/PBD probes, dz–dq deepen probes, and dc–dm foundation probes.
//! Full Nanite/SVO AAA / MagicaCSG / Coins / Agones / DLSS HELD.

use aethel_kernel_rust::sdf_octree_hashing::{
    probe_sdf_octree_hashing as kernel_probe, run_sdf_octree_hashing_soak,
    SdfOctreeHashingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfOctreeHashingWireReport {
    pub sdf_octree_hashing_ready: bool,
    pub insert_occupied: bool,
    pub query_hit_near: bool,
    pub query_miss_far: bool,
    pub outputs_finite: bool,
    pub brick_count: u32,
    pub near_sdf: f32,
    pub near_micro: f32,
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
    r: SdfOctreeHashingSoakReport,
    note: impl Into<String>,
) -> KernelSdfOctreeHashingWireReport {
    KernelSdfOctreeHashingWireReport {
        sdf_octree_hashing_ready: r.sdf_octree_hashing_ready,
        insert_occupied: r.insert_occupied,
        query_hit_near: r.query_hit_near,
        query_miss_far: r.query_miss_far,
        outputs_finite: r.outputs_finite,
        brick_count: r.brick_count,
        near_sdf: r.near_sdf,
        near_micro: r.near_micro,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ep".into(),
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

/// Run SDF octree hashing soak via kernel.
pub fn run_kernel_sdf_octree_hashing_soak() -> KernelSdfOctreeHashingWireReport {
    let r = run_sdf_octree_hashing_soak();
    let note = if !r.sdf_octree_hashing_ready {
        "SDF octree hashing soak failed — sdfOctreeHashingReady stays false"
    } else {
        "Desktop soak: sparse spatial hash of SDF bricks; occupied near-surface insert+query hit; empty far cells miss — sdfOctreeHashingReady true; nanite_svo_aaa_ready false; distinct from eo stochasticVirtualSdfReady, en sdfAdaptiveCascadesReady, em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfOctreeHashingReady` (letter ep).
pub fn probe_sdf_octree_hashing() -> KernelSdfOctreeHashingWireReport {
    to_report(
        kernel_probe(),
        "SDF octree hashing probe (letter ep) — distinct from stochasticVirtualSdfReady, sdfAdaptiveCascadesReady, sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; nanite_svo_aaa_ready HELD",
    )
}

/// Tauri IPC — SDF octree hashing honesty.
#[tauri::command]
pub fn probe_sdf_octree_hashing_cmd() -> KernelSdfOctreeHashingWireReport {
    probe_sdf_octree_hashing()
}

/// Tauri IPC — run SDF octree hashing soak.
#[tauri::command]
pub fn run_kernel_sdf_octree_hashing_soak_cmd() -> KernelSdfOctreeHashingWireReport {
    run_kernel_sdf_octree_hashing_soak()
}

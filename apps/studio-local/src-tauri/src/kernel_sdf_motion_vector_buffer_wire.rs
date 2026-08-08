//! SDF Motion Vector Buffer desktop wire — letter **eq**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_motion_vector_buffer`
//! (dual-frame surface sample → 3D/2D motion vectors soak). Honesty probe
//! `sdfMotionVectorBufferReady` is **distinct** from ep `sdfOctreeHashingReady`,
//! eo `stochasticVirtualSdfReady`, en `sdfAdaptiveCascadesReady`, em
//! `sdfSculptorReady`, el `hermiteSharpFeaturesReady`, ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen probes,
//! and dc–dm foundation probes.
//! Full TAA/DLSS / Nanite / MagicaCSG / Coins / Agones HELD.

use aethel_kernel_rust::sdf_motion_vector_buffer::{
    probe_sdf_motion_vector_buffer as kernel_probe, run_sdf_motion_vector_buffer_soak,
    SdfMotionVectorBufferSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfMotionVectorBufferWireReport {
    pub sdf_motion_vector_buffer_ready: bool,
    pub static_near_zero: bool,
    pub translated_nonzero: bool,
    pub translated_coherent: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub static_mean_abs: f32,
    pub translated_mean_abs: f32,
    pub translated_coherence: f32,
    pub translated_err: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub taa_dlss_ready: bool,
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
    r: SdfMotionVectorBufferSoakReport,
    note: impl Into<String>,
) -> KernelSdfMotionVectorBufferWireReport {
    KernelSdfMotionVectorBufferWireReport {
        sdf_motion_vector_buffer_ready: r.sdf_motion_vector_buffer_ready,
        static_near_zero: r.static_near_zero,
        translated_nonzero: r.translated_nonzero,
        translated_coherent: r.translated_coherent,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        static_mean_abs: r.static_mean_abs,
        translated_mean_abs: r.translated_mean_abs,
        translated_coherence: r.translated_coherence,
        translated_err: r.translated_err,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "eq".into(),
        note: note.into(),
        taa_dlss_ready: r.taa_dlss_ready,
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

/// Run SDF motion vector buffer soak via kernel.
pub fn run_kernel_sdf_motion_vector_buffer_soak() -> KernelSdfMotionVectorBufferWireReport {
    let r = run_sdf_motion_vector_buffer_soak();
    let note = if !r.sdf_motion_vector_buffer_ready {
        "SDF motion vector buffer soak failed — sdfMotionVectorBufferReady stays false"
    } else {
        "Desktop soak: dual-frame SDF surface samples; static→near-zero MV; translated field→nonzero coherent MV matching offset — sdfMotionVectorBufferReady true; taa_dlss_ready false; distinct from ep sdfOctreeHashingReady, eo stochasticVirtualSdfReady, en sdfAdaptiveCascadesReady, em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfMotionVectorBufferReady` (letter eq).
pub fn probe_sdf_motion_vector_buffer() -> KernelSdfMotionVectorBufferWireReport {
    to_report(
        kernel_probe(),
        "SDF motion vector buffer probe (letter eq) — distinct from sdfOctreeHashingReady, stochasticVirtualSdfReady, sdfAdaptiveCascadesReady, sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; taa_dlss_ready HELD",
    )
}

/// Tauri IPC — SDF motion vector buffer honesty.
#[tauri::command]
pub fn probe_sdf_motion_vector_buffer_cmd() -> KernelSdfMotionVectorBufferWireReport {
    probe_sdf_motion_vector_buffer()
}

/// Tauri IPC — run SDF motion vector buffer soak.
#[tauri::command]
pub fn run_kernel_sdf_motion_vector_buffer_soak_cmd() -> KernelSdfMotionVectorBufferWireReport {
    run_kernel_sdf_motion_vector_buffer_soak()
}

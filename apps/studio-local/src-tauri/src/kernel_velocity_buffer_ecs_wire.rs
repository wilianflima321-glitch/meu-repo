//! Velocity Buffer ECS desktop wire — letter **er**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::velocity_buffer_ecs`
//! (SceneGraph vel SoA integrate → motion buffer soak). Honesty probe
//! `velocityBufferEcsReady` is **distinct** from eq `sdfMotionVectorBufferReady`,
//! ep `sdfOctreeHashingReady`, eo `stochasticVirtualSdfReady`, en
//! `sdfAdaptiveCascadesReady`, em `sdfSculptorReady`, el
//! `hermiteSharpFeaturesReady`, ek `hermiteDualityGridReady`, ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`, ee–ea
//! fluid/PBD probes, dz–dq deepen probes, and dc–dm foundation probes.
//! Full TAA/DLSS / Nanite / MagicaCSG / Coins / Agones HELD.

use aethel_kernel_rust::velocity_buffer_ecs::{
    probe_velocity_buffer_ecs as kernel_probe, run_velocity_buffer_ecs_soak,
    VelocityBufferEcsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelVelocityBufferEcsWireReport {
    pub velocity_buffer_ecs_ready: bool,
    pub entities_moved: bool,
    pub buffer_matches_delta: bool,
    pub static_near_zero: bool,
    pub inactive_unmoved: bool,
    pub outputs_finite: bool,
    pub entity_count: u32,
    pub active_integrated: u32,
    pub moving_mean_abs: f32,
    pub static_mean_abs: f32,
    pub buffer_match_err: f32,
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
    r: VelocityBufferEcsSoakReport,
    note: impl Into<String>,
) -> KernelVelocityBufferEcsWireReport {
    KernelVelocityBufferEcsWireReport {
        velocity_buffer_ecs_ready: r.velocity_buffer_ecs_ready,
        entities_moved: r.entities_moved,
        buffer_matches_delta: r.buffer_matches_delta,
        static_near_zero: r.static_near_zero,
        inactive_unmoved: r.inactive_unmoved,
        outputs_finite: r.outputs_finite,
        entity_count: r.entity_count,
        active_integrated: r.active_integrated,
        moving_mean_abs: r.moving_mean_abs,
        static_mean_abs: r.static_mean_abs,
        buffer_match_err: r.buffer_match_err,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "er".into(),
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

/// Run velocity buffer ECS soak via kernel.
pub fn run_kernel_velocity_buffer_ecs_soak() -> KernelVelocityBufferEcsWireReport {
    let r = run_velocity_buffer_ecs_soak();
    let note = if !r.velocity_buffer_ecs_ready {
        "Velocity buffer ECS soak failed — velocityBufferEcsReady stays false"
    } else {
        "Desktop soak: SceneGraph vel_x/y/z SoA; Euler integrate moves active entities; motion buffer matches Δpos; static→near-zero; inactive unmoved — velocityBufferEcsReady true; taa_dlss_ready false; distinct from eq sdfMotionVectorBufferReady, ep sdfOctreeHashingReady, eo stochasticVirtualSdfReady, en sdfAdaptiveCascadesReady, em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `velocityBufferEcsReady` (letter er).
pub fn probe_velocity_buffer_ecs() -> KernelVelocityBufferEcsWireReport {
    to_report(
        kernel_probe(),
        "Velocity buffer ECS probe (letter er) — distinct from sdfMotionVectorBufferReady, sdfOctreeHashingReady, stochasticVirtualSdfReady, sdfAdaptiveCascadesReady, sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; taa_dlss_ready HELD",
    )
}

/// Tauri IPC — velocity buffer ECS honesty.
#[tauri::command]
pub fn probe_velocity_buffer_ecs_cmd() -> KernelVelocityBufferEcsWireReport {
    probe_velocity_buffer_ecs()
}

/// Tauri IPC — run velocity buffer ECS soak.
#[tauri::command]
pub fn run_kernel_velocity_buffer_ecs_soak_cmd() -> KernelVelocityBufferEcsWireReport {
    run_kernel_velocity_buffer_ecs_soak()
}

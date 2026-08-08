//! Acoustic Reverb Geometry desktop wire — letter **ei**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::acoustic_reverb_geometry`
//! (Sabine/Eyring RT60 + early reflection soak). Honesty probe
//! `acousticReverbGeometryReady` is **distinct** from ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`,
//! ee–ea fluid/PBD probes, dz–dq deepen probes, and dc–dm foundation
//! probes (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`,
//! `mmapEcsPagerReady`, `simdWorldSoaHotPathReady`, `simdClayMathReady`,
//! `worldSoaSabLayoutReady`, `kernelDesktopWireReady`,
//! `kernelMutDnaDesktopReady`, `kernelSpectralSonicDesktopReady`,
//! `probe_kernel_foundation`).
//! Full MetaSounds / HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::acoustic_reverb_geometry::{
    probe_acoustic_reverb_geometry as kernel_probe, run_acoustic_reverb_geometry_soak,
    AcousticReverbGeometrySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAcousticReverbGeometryWireReport {
    pub acoustic_reverb_geometry_ready: bool,
    pub larger_room_longer_rt60: bool,
    pub higher_absorption_shorter_rt60: bool,
    pub early_delay_tracks_nearest_wall: bool,
    pub eyring_shorter_than_sabine: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub small_rt60_sabine_sec: f32,
    pub large_rt60_sabine_sec: f32,
    pub low_absorb_rt60_sec: f32,
    pub high_absorb_rt60_sec: f32,
    pub small_early_delay_sec: f32,
    pub large_early_delay_sec: f32,
    pub max_rt60_size_delta: f32,
    pub max_rt60_absorb_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub metasounds_hrtf_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: AcousticReverbGeometrySoakReport,
    note: impl Into<String>,
) -> KernelAcousticReverbGeometryWireReport {
    KernelAcousticReverbGeometryWireReport {
        acoustic_reverb_geometry_ready: r.acoustic_reverb_geometry_ready,
        larger_room_longer_rt60: r.larger_room_longer_rt60,
        higher_absorption_shorter_rt60: r.higher_absorption_shorter_rt60,
        early_delay_tracks_nearest_wall: r.early_delay_tracks_nearest_wall,
        eyring_shorter_than_sabine: r.eyring_shorter_than_sabine,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        small_rt60_sabine_sec: r.small_rt60_sabine_sec,
        large_rt60_sabine_sec: r.large_rt60_sabine_sec,
        low_absorb_rt60_sec: r.low_absorb_rt60_sec,
        high_absorb_rt60_sec: r.high_absorb_rt60_sec,
        small_early_delay_sec: r.small_early_delay_sec,
        large_early_delay_sec: r.large_early_delay_sec,
        max_rt60_size_delta: r.max_rt60_size_delta,
        max_rt60_absorb_delta: r.max_rt60_absorb_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "ei".into(),
        note: note.into(),
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run acoustic reverb geometry soak via kernel.
pub fn run_kernel_acoustic_reverb_geometry_soak() -> KernelAcousticReverbGeometryWireReport {
    let r = run_acoustic_reverb_geometry_soak();
    let note = if !r.acoustic_reverb_geometry_ready {
        "Acoustic reverb geometry soak failed — acousticReverbGeometryReady stays false"
    } else {
        "Desktop soak: Sabine/Eyring RT60 from box volume+absorption + early reflection delay; larger room / higher absorption change RT60 — acousticReverbGeometryReady true; metasounds_hrtf_aaa_ready false; distinct from ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `acousticReverbGeometryReady` (letter ei).
pub fn probe_acoustic_reverb_geometry() -> KernelAcousticReverbGeometryWireReport {
    to_report(
        kernel_probe(),
        "Acoustic reverb geometry probe (letter ei) — distinct from acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready HELD",
    )
}

/// Tauri IPC — acoustic reverb geometry honesty.
#[tauri::command]
pub fn probe_acoustic_reverb_geometry_cmd() -> KernelAcousticReverbGeometryWireReport {
    probe_acoustic_reverb_geometry()
}

/// Tauri IPC — run acoustic reverb geometry soak.
#[tauri::command]
pub fn run_kernel_acoustic_reverb_geometry_soak_cmd() -> KernelAcousticReverbGeometryWireReport {
    run_kernel_acoustic_reverb_geometry_soak()
}

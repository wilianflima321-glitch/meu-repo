//! Acoustic Raytracing Echo desktop wire — letter **ef**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::acoustic_raytracing_echo`
//! (specular/image-source echo delay+gain soak). Honesty probe
//! `acousticRaytracingEchoReady` is **distinct** from dc sonic impedance
//! `trace_acoustic_ray`, dg `kernelSpectralSonicDesktopReady`, dx
//! `synestheticSensoryRemapReady`, dz `atmosphericPhysicalDampingReady`, ee
//! `latticeBoltzmannFluidSolverReady`, ed `aerodynamicNavierStokesReady`, ec
//! `matterThermodynamicsSphReady`, eb `hybridEulerianLagrangianPbdReady`, ea
//! `positionBasedDynamicsReady`, and dc–dm foundation probes.
//! Full MetaSounds/HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::acoustic_raytracing_echo::{
    probe_acoustic_raytracing_echo as kernel_probe, run_acoustic_raytracing_echo_soak,
    AcousticRaytracingEchoSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAcousticRaytracingEchoWireReport {
    pub acoustic_raytracing_echo_ready: bool,
    pub walls_change_delay: bool,
    pub walls_change_gain: bool,
    pub vacuum_silent: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub near_delay_sec: f32,
    pub far_delay_sec: f32,
    pub high_reflect_gain: f32,
    pub low_reflect_gain: f32,
    pub vacuum_echo_gain: f32,
    pub max_delay_delta: f32,
    pub max_gain_delta: f32,
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
    r: AcousticRaytracingEchoSoakReport,
    note: impl Into<String>,
) -> KernelAcousticRaytracingEchoWireReport {
    KernelAcousticRaytracingEchoWireReport {
        acoustic_raytracing_echo_ready: r.acoustic_raytracing_echo_ready,
        walls_change_delay: r.walls_change_delay,
        walls_change_gain: r.walls_change_gain,
        vacuum_silent: r.vacuum_silent,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        near_delay_sec: r.near_delay_sec,
        far_delay_sec: r.far_delay_sec,
        high_reflect_gain: r.high_reflect_gain,
        low_reflect_gain: r.low_reflect_gain,
        vacuum_echo_gain: r.vacuum_echo_gain,
        max_delay_delta: r.max_delay_delta,
        max_gain_delta: r.max_gain_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ef".into(),
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

/// Run acoustic raytracing echo soak via kernel.
pub fn run_kernel_acoustic_raytracing_echo_soak() -> KernelAcousticRaytracingEchoWireReport {
    let r = run_acoustic_raytracing_echo_soak();
    let note = if !r.acoustic_raytracing_echo_ready {
        "Acoustic raytracing echo soak failed — acousticRaytracingEchoReady stays false"
    } else {
        "Desktop soak: specular/image-source echo delay+gain from wall distance/reflectivity; vacuum silent — acousticRaytracingEchoReady true; metasounds_hrtf_aaa_ready false; distinct from dc sonic impedance, dg kernelSpectralSonicDesktopReady, dx synestheticSensoryRemapReady, dz atmosphericPhysicalDampingReady, ee latticeBoltzmannFluidSolverReady, ed aerodynamicNavierStokesReady, ec matterThermodynamicsSphReady, eb hybridEulerianLagrangianPbdReady, ea positionBasedDynamicsReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `acousticRaytracingEchoReady` (letter ef).
pub fn probe_acoustic_raytracing_echo() -> KernelAcousticRaytracingEchoWireReport {
    to_report(
        kernel_probe(),
        "Acoustic raytracing echo probe (letter ef) — distinct from sonic impedance trace_acoustic_ray, kernelSpectralSonicDesktopReady, synestheticSensoryRemapReady, atmosphericPhysicalDampingReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, autonomousConflictGeneratorReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready HELD",
    )
}

/// Tauri IPC — acoustic raytracing echo honesty.
#[tauri::command]
pub fn probe_acoustic_raytracing_echo_cmd() -> KernelAcousticRaytracingEchoWireReport {
    probe_acoustic_raytracing_echo()
}

/// Tauri IPC — run acoustic raytracing echo soak.
#[tauri::command]
pub fn run_kernel_acoustic_raytracing_echo_soak_cmd() -> KernelAcousticRaytracingEchoWireReport {
    run_kernel_acoustic_raytracing_echo_soak()
}

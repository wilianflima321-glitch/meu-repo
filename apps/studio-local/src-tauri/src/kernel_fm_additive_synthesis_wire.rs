//! FM / Additive Synthesis desktop wire — letter **ej**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::fm_additive_synthesis`
//! (FM carrier + additive harmonic bank soak). Honesty probe
//! `fmAdditiveSynthesisReady` is **distinct** from ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`,
//! eh `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes (`slabAllocatorMmapReady`,
//! `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`,
//! `worldSoaSabLayoutReady`, `kernelDesktopWireReady`,
//! `kernelMutDnaDesktopReady`, `kernelSpectralSonicDesktopReady`,
//! `probe_kernel_foundation`).
//! Full MetaSounds / Suno / HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::fm_additive_synthesis::{
    probe_fm_additive_synthesis as kernel_probe, run_fm_additive_synthesis_soak,
    FmAdditiveSynthesisSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFmAdditiveSynthesisWireReport {
    pub fm_additive_synthesis_ready: bool,
    pub buffer_non_silence: bool,
    pub higher_force_higher_rms: bool,
    pub density_changes_carrier_and_peak: bool,
    pub moisture_rolls_off_brightness: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub soft_hit_rms: f32,
    pub hard_hit_rms: f32,
    pub soft_hit_peak: f32,
    pub hard_hit_peak: f32,
    pub low_density_carrier_hz: f32,
    pub high_density_carrier_hz: f32,
    pub low_density_peak: f32,
    pub high_density_peak: f32,
    pub dry_peak: f32,
    pub wet_peak: f32,
    pub max_rms_force_delta: f32,
    pub max_peak_density_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub metasounds_hrtf_aaa_ready: bool,
    pub suno_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: FmAdditiveSynthesisSoakReport,
    note: impl Into<String>,
) -> KernelFmAdditiveSynthesisWireReport {
    KernelFmAdditiveSynthesisWireReport {
        fm_additive_synthesis_ready: r.fm_additive_synthesis_ready,
        buffer_non_silence: r.buffer_non_silence,
        higher_force_higher_rms: r.higher_force_higher_rms,
        density_changes_carrier_and_peak: r.density_changes_carrier_and_peak,
        moisture_rolls_off_brightness: r.moisture_rolls_off_brightness,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        soft_hit_rms: r.soft_hit_rms,
        hard_hit_rms: r.hard_hit_rms,
        soft_hit_peak: r.soft_hit_peak,
        hard_hit_peak: r.hard_hit_peak,
        low_density_carrier_hz: r.low_density_carrier_hz,
        high_density_carrier_hz: r.high_density_carrier_hz,
        low_density_peak: r.low_density_peak,
        high_density_peak: r.high_density_peak,
        dry_peak: r.dry_peak,
        wet_peak: r.wet_peak,
        max_rms_force_delta: r.max_rms_force_delta,
        max_peak_density_delta: r.max_peak_density_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ej".into(),
        note: note.into(),
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        suno_aaa_ready: r.suno_aaa_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run FM / additive synthesis soak via kernel.
pub fn run_kernel_fm_additive_synthesis_soak() -> KernelFmAdditiveSynthesisWireReport {
    let r = run_fm_additive_synthesis_soak();
    let note = if !r.fm_additive_synthesis_ready {
        "FM/additive synthesis soak failed — fmAdditiveSynthesisReady stays false"
    } else {
        "Desktop soak: FM carrier + additive harmonic bank from collision density/force/moisture; force/density/moisture change RMS/peak — fmAdditiveSynthesisReady true; metasounds_hrtf_aaa_ready false; suno_aaa_ready false; distinct from ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `fmAdditiveSynthesisReady` (letter ej).
pub fn probe_fm_additive_synthesis() -> KernelFmAdditiveSynthesisWireReport {
    to_report(
        kernel_probe(),
        "FM/additive synthesis probe (letter ej) — distinct from acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready / suno_aaa_ready HELD",
    )
}

/// Tauri IPC — FM / additive synthesis honesty.
#[tauri::command]
pub fn probe_fm_additive_synthesis_cmd() -> KernelFmAdditiveSynthesisWireReport {
    probe_fm_additive_synthesis()
}

/// Tauri IPC — run FM / additive synthesis soak.
#[tauri::command]
pub fn run_kernel_fm_additive_synthesis_soak_cmd() -> KernelFmAdditiveSynthesisWireReport {
    run_kernel_fm_additive_synthesis_soak()
}

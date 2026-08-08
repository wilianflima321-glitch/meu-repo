//! Atmospheric Physical Damping desktop wire — letter **hl**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::atmospheric_physical_damping`
//! (viscosity friction + vacuum/water/air acoustic transmit soak). Honesty probe
//! `atmosphericPhysicalDampingReady` is **distinct** from dy
//! `autonomousConflictGeneratorReady`, dx `synestheticSensoryRemapReady`, dw
//! `mnemonicMatterEntropyReady`, dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`,
//! dq `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full UE atmosphere parity / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::atmospheric_physical_damping::{
    probe_atmospheric_physical_damping as kernel_probe, run_atmospheric_physical_damping_soak,
    AtmosphericPhysicalDampingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAtmosphericPhysicalDampingWireReport {
    pub atmospheric_physical_damping_ready: bool,
    pub fast_objects_slow_down_more_rapidly: bool,
    pub friction_damps_velocity: bool,
    pub water_damps_more_than_air: bool,
    pub vacuum_friction_identity: bool,
    pub vacuum_silences_acoustic: bool,
    pub water_speeds_acoustic: bool,
    pub water_pitch_down: bool,
    pub air_gain_unity: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub water_speed_drop: f32,
    pub air_speed_drop: f32,
    pub vacuum_gain: f32,
    pub air_gain: f32,
    pub water_speed_factor: f32,
    pub water_pitch_shift: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub unreal_gc_streaming_parity_ready: bool,
    pub metasounds_hrtf_aaa_ready: bool,
    pub adversary_ai_chaos_parity_ready: bool,
    pub ue_atmosphere_parity_ready: bool,
}

fn to_report(
    r: AtmosphericPhysicalDampingSoakReport,
    note: impl Into<String>,
) -> KernelAtmosphericPhysicalDampingWireReport {
    KernelAtmosphericPhysicalDampingWireReport {
        atmospheric_physical_damping_ready: r.atmospheric_physical_damping_ready,
        fast_objects_slow_down_more_rapidly: r.fast_objects_slow_down_more_rapidly,
        friction_damps_velocity: r.friction_damps_velocity,
        water_damps_more_than_air: r.water_damps_more_than_air,
        vacuum_friction_identity: r.vacuum_friction_identity,
        vacuum_silences_acoustic: r.vacuum_silences_acoustic,
        water_speeds_acoustic: r.water_speeds_acoustic,
        water_pitch_down: r.water_pitch_down,
        air_gain_unity: r.air_gain_unity,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        water_speed_drop: r.water_speed_drop,
        air_speed_drop: r.air_speed_drop,
        vacuum_gain: r.vacuum_gain,
        air_gain: r.air_gain,
        water_speed_factor: r.water_speed_factor,
        water_pitch_shift: r.water_pitch_shift,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "hl".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        unreal_gc_streaming_parity_ready: r.unreal_gc_streaming_parity_ready,
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        adversary_ai_chaos_parity_ready: r.adversary_ai_chaos_parity_ready,
        ue_atmosphere_parity_ready: r.ue_atmosphere_parity_ready,
    }
}

/// Run atmospheric physical damping soak via kernel.
pub fn run_kernel_atmospheric_physical_damping_soak()
-> KernelAtmosphericPhysicalDampingWireReport {
    let r = run_atmospheric_physical_damping_soak();
    let note = if !r.atmospheric_physical_damping_ready {
        "Atmospheric physical damping soak failed — atmosphericPhysicalDampingReady stays false"
    } else {
        "Desktop soak: viscosity damps velocity (water > air); vacuum silence + water 4× speed / pitch-down — atmosphericPhysicalDampingReady true; ue_atmosphere_parity_ready false; distinct from dy autonomousConflictGeneratorReady, dx synestheticSensoryRemapReady, dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `atmosphericPhysicalDampingReady` (letter hl).
pub fn probe_atmospheric_physical_damping() -> KernelAtmosphericPhysicalDampingWireReport {
    to_report(
        kernel_probe(),
        "Atmospheric physical damping probe (letter hl) — distinct from autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; ue_atmosphere_parity_ready HELD",
    )
}

/// Tauri IPC — atmospheric physical damping honesty.
#[tauri::command]
pub fn probe_atmospheric_physical_damping_cmd() -> KernelAtmosphericPhysicalDampingWireReport {
    probe_atmospheric_physical_damping()
}

/// Tauri IPC — run atmospheric physical damping soak.
#[tauri::command]
pub fn run_kernel_atmospheric_physical_damping_soak_cmd()
-> KernelAtmosphericPhysicalDampingWireReport {
    run_kernel_atmospheric_physical_damping_soak()
}

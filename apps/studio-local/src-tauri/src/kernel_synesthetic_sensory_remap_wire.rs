//! Synesthetic Sensory Remap desktop wire — letter **dx**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::synesthetic_sensory_remap`
//! (density→acoustic/radiation/tremor soak). Honesty probe
//! `synestheticSensoryRemapReady` is **distinct** from dw
//! `mnemonicMatterEntropyReady`, dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`,
//! dq `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full MetaSounds/HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::synesthetic_sensory_remap::{
    probe_synesthetic_sensory_remap as kernel_probe, run_synesthetic_sensory_remap_soak,
    SynestheticSensoryRemapSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSynestheticSensoryRemapWireReport {
    pub synesthetic_sensory_remap_ready: bool,
    pub density_changes_outputs: bool,
    pub vacuum_silences_acoustic: bool,
    pub vacuum_raises_radiation: bool,
    pub dense_muffles_high_freq: bool,
    pub dense_low_freq_tremor: bool,
    pub channels_finite: bool,
    pub sample_count: u32,
    pub vacuum_acoustic_gain: f32,
    pub vacuum_radiation_proxy: f32,
    pub air_acoustic_gain: f32,
    pub water_acoustic_gain_high_f: f32,
    pub water_tremor_low_f: f32,
    pub max_density_channel_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_four_dimensional_time_sdf_probe: bool,
    pub distinct_from_shadow_time_reversal_probe: bool,
    pub distinct_from_curved_raymarcher_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_autonomous_entropy_corrector_probe: bool,
    pub distinct_from_unified_field_network_probe: bool,
    pub distinct_from_slab_allocator_mmap_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
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
}

fn to_report(
    r: SynestheticSensoryRemapSoakReport,
    note: impl Into<String>,
) -> KernelSynestheticSensoryRemapWireReport {
    KernelSynestheticSensoryRemapWireReport {
        synesthetic_sensory_remap_ready: r.synesthetic_sensory_remap_ready,
        density_changes_outputs: r.density_changes_outputs,
        vacuum_silences_acoustic: r.vacuum_silences_acoustic,
        vacuum_raises_radiation: r.vacuum_raises_radiation,
        dense_muffles_high_freq: r.dense_muffles_high_freq,
        dense_low_freq_tremor: r.dense_low_freq_tremor,
        channels_finite: r.channels_finite,
        sample_count: r.sample_count,
        vacuum_acoustic_gain: r.vacuum_acoustic_gain,
        vacuum_radiation_proxy: r.vacuum_radiation_proxy,
        air_acoustic_gain: r.air_acoustic_gain,
        water_acoustic_gain_high_f: r.water_acoustic_gain_high_f,
        water_tremor_low_f: r.water_tremor_low_f,
        max_density_channel_delta: r.max_density_channel_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_mnemonic_matter_entropy_probe: r.distinct_from_mnemonic_matter_entropy_probe,
        distinct_from_four_dimensional_time_sdf_probe: r
            .distinct_from_four_dimensional_time_sdf_probe,
        distinct_from_shadow_time_reversal_probe: r.distinct_from_shadow_time_reversal_probe,
        distinct_from_curved_raymarcher_probe: r.distinct_from_curved_raymarcher_probe,
        distinct_from_fractal_energy_perturbation_probe: r
            .distinct_from_fractal_energy_perturbation_probe,
        distinct_from_autonomous_entropy_corrector_probe: r
            .distinct_from_autonomous_entropy_corrector_probe,
        distinct_from_unified_field_network_probe: r.distinct_from_unified_field_network_probe,
        distinct_from_slab_allocator_mmap_probe: r.distinct_from_slab_allocator_mmap_probe,
        distinct_from_baremetal_memory_manager_probe: r
            .distinct_from_baremetal_memory_manager_probe,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_simd_world_soa_hot_path_probe: r.distinct_from_simd_world_soa_hot_path_probe,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "dx".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        unreal_gc_streaming_parity_ready: r.unreal_gc_streaming_parity_ready,
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
    }
}

/// Run synesthetic sensory remap soak via kernel.
pub fn run_kernel_synesthetic_sensory_remap_soak() -> KernelSynestheticSensoryRemapWireReport {
    let r = run_synesthetic_sensory_remap_soak();
    let note = if !r.synesthetic_sensory_remap_ready {
        "Synesthetic sensory remap soak failed — synestheticSensoryRemapReady stays false"
    } else {
        "Desktop soak: density changes acoustic/radiation/tremor channels (vacuum silence→EM, dense muffle→tremor) — synestheticSensoryRemapReady true; metasounds_hrtf_aaa_ready false; distinct from dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `synestheticSensoryRemapReady` (letter dx).
pub fn probe_synesthetic_sensory_remap() -> KernelSynestheticSensoryRemapWireReport {
    to_report(
        kernel_probe(),
        "Synesthetic sensory remap probe (letter dx) — distinct from mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready HELD",
    )
}

/// Tauri IPC — synesthetic sensory remap honesty.
#[tauri::command]
pub fn probe_synesthetic_sensory_remap_cmd() -> KernelSynestheticSensoryRemapWireReport {
    probe_synesthetic_sensory_remap()
}

/// Tauri IPC — run synesthetic sensory remap soak.
#[tauri::command]
pub fn run_kernel_synesthetic_sensory_remap_soak_cmd() -> KernelSynestheticSensoryRemapWireReport {
    run_kernel_synesthetic_sensory_remap_soak()
}

//! Mnemonic Matter Entropy desktop wire — letter **dw**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::mnemonic_matter_entropy`
//! (off-screen coherence decay soak). Honesty probe `mnemonicMatterEntropyReady`
//! is **distinct** from dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`,
//! dq `unifiedFieldNetworkReady`, and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full Unreal GC/streaming parity / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::mnemonic_matter_entropy::{
    probe_mnemonic_matter_entropy as kernel_probe, run_mnemonic_matter_entropy_soak,
    MnemonicMatterEntropySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMnemonicMatterEntropyWireReport {
    pub mnemonic_matter_entropy_ready: bool,
    pub offscreen_coherence_decayed: bool,
    pub active_slower_or_skip: bool,
    pub offscreen_drop_gt_active: bool,
    pub state_mutated: bool,
    pub entities: u32,
    pub soak_frames: u32,
    pub mean_coherence_offscreen_final: f32,
    pub mean_coherence_onscreen_final: f32,
    pub offscreen_drop: f32,
    pub onscreen_drop: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
}

fn to_report(
    r: MnemonicMatterEntropySoakReport,
    note: impl Into<String>,
) -> KernelMnemonicMatterEntropyWireReport {
    KernelMnemonicMatterEntropyWireReport {
        mnemonic_matter_entropy_ready: r.mnemonic_matter_entropy_ready,
        offscreen_coherence_decayed: r.offscreen_coherence_decayed,
        active_slower_or_skip: r.active_slower_or_skip,
        offscreen_drop_gt_active: r.offscreen_drop_gt_active,
        state_mutated: r.state_mutated,
        entities: r.entities,
        soak_frames: r.soak_frames,
        mean_coherence_offscreen_final: r.mean_coherence_offscreen_final,
        mean_coherence_onscreen_final: r.mean_coherence_onscreen_final,
        offscreen_drop: r.offscreen_drop,
        onscreen_drop: r.onscreen_drop,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
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
        letter: "dw".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        unreal_gc_streaming_parity_ready: r.unreal_gc_streaming_parity_ready,
    }
}

/// Run mnemonic matter entropy soak via kernel.
pub fn run_kernel_mnemonic_matter_entropy_soak() -> KernelMnemonicMatterEntropyWireReport {
    let r = run_mnemonic_matter_entropy_soak();
    let note = if !r.mnemonic_matter_entropy_ready {
        "Mnemonic matter entropy soak failed — mnemonicMatterEntropyReady stays false"
    } else {
        "Desktop soak: off-screen coherence exponential decay > on-screen slower decay — mnemonicMatterEntropyReady true; unreal_gc_streaming_parity_ready false; distinct from dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `mnemonicMatterEntropyReady` (letter dw).
pub fn probe_mnemonic_matter_entropy() -> KernelMnemonicMatterEntropyWireReport {
    to_report(
        kernel_probe(),
        "Mnemonic matter entropy probe (letter dw) — distinct from fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; unreal_gc_streaming_parity_ready HELD",
    )
}

/// Tauri IPC — mnemonic matter entropy honesty.
#[tauri::command]
pub fn probe_mnemonic_matter_entropy_cmd() -> KernelMnemonicMatterEntropyWireReport {
    probe_mnemonic_matter_entropy()
}

/// Tauri IPC — run mnemonic matter entropy soak.
#[tauri::command]
pub fn run_kernel_mnemonic_matter_entropy_soak_cmd() -> KernelMnemonicMatterEntropyWireReport {
    run_kernel_mnemonic_matter_entropy_soak()
}

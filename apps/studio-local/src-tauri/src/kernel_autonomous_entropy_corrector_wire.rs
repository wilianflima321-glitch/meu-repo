//! Autonomous Entropy Corrector desktop wire — letter **dr**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::autonomous_entropy_corrector`
//! (HDR budget nits clamp + dust inject soak). Honesty probe
//! `autonomousEntropyCorrectorReady` is **distinct** from dq
//! `unifiedFieldNetworkReady` and dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Unreal/ACES full tonemapper / Chaos / 100k / mmap-SAB production / AVX-512 /
//! GR / dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::autonomous_entropy_corrector::{
    probe_autonomous_entropy_corrector as kernel_probe, run_autonomous_entropy_corrector_soak,
    AutonomousEntropyCorrectorSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAutonomousEntropyCorrectorWireReport {
    pub autonomous_entropy_corrector_ready: bool,
    pub balance_steps: u32,
    pub nits_mutated_down: bool,
    pub dust_mutated_up: bool,
    pub within_budget_after: bool,
    pub within_budget_identity: bool,
    pub final_nits: f64,
    pub final_dust: f64,
    pub hdr_budget_nits: f64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
    pub unreal_aces_tonemapper_ready: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: AutonomousEntropyCorrectorSoakReport,
    note: impl Into<String>,
) -> KernelAutonomousEntropyCorrectorWireReport {
    KernelAutonomousEntropyCorrectorWireReport {
        autonomous_entropy_corrector_ready: r.autonomous_entropy_corrector_ready,
        balance_steps: r.balance_steps,
        nits_mutated_down: r.nits_mutated_down,
        dust_mutated_up: r.dust_mutated_up,
        within_budget_after: r.within_budget_after,
        within_budget_identity: r.within_budget_identity,
        final_nits: r.final_nits,
        final_dust: r.final_dust,
        hdr_budget_nits: r.hdr_budget_nits,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
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
        letter: "dr".into(),
        note: note.into(),
        unreal_aces_tonemapper_ready: r.unreal_aces_tonemapper_ready,
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run autonomous entropy corrector soak via kernel.
pub fn run_kernel_autonomous_entropy_corrector_soak() -> KernelAutonomousEntropyCorrectorWireReport {
    let r = run_autonomous_entropy_corrector_soak();
    let note = if !r.autonomous_entropy_corrector_ready {
        "Autonomous entropy corrector soak failed — autonomousEntropyCorrectorReady stays false"
    } else {
        "Desktop soak: over-budget nits reduced + dust raised (Beer–Lambert), within-budget identity — autonomousEntropyCorrectorReady true; distinct from dq unifiedFieldNetworkReady and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `autonomousEntropyCorrectorReady` (letter dr).
pub fn probe_autonomous_entropy_corrector() -> KernelAutonomousEntropyCorrectorWireReport {
    to_report(
        kernel_probe(),
        "Autonomous entropy corrector probe (letter dr) — distinct from unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation",
    )
}

/// Tauri IPC — autonomous entropy corrector honesty.
#[tauri::command]
pub fn probe_autonomous_entropy_corrector_cmd() -> KernelAutonomousEntropyCorrectorWireReport {
    probe_autonomous_entropy_corrector()
}

/// Tauri IPC — run autonomous entropy corrector soak.
#[tauri::command]
pub fn run_kernel_autonomous_entropy_corrector_soak_cmd() -> KernelAutonomousEntropyCorrectorWireReport
{
    run_kernel_autonomous_entropy_corrector_soak()
}

//! BareMetalMemoryManager desktop wire — letter **dl**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::baremetal_memory_manager`
//! (LinearFrameAllocator-backed entity slot + frame burst). Honesty probe
//! `baremetalMemoryManagerReady` is **distinct** from dc FrameArena
//! (`frame_arena_ready` / `probe_kernel_foundation`), dk
//! `simdWorldSoaHotPathReady`, dj `simdClayMathReady`, di `mmapEcsPagerReady`,
//! dh `worldSoaSabLayoutReady`, de `kernelDesktopWireReady`, df
//! `kernelMutDnaDesktopReady`, and dg `kernelSpectralSonicDesktopReady`.
//! Chaos/100k/mmap-SAB production / AVX-512 / GR / dual-240 / Coins / Agones /
//! Nanite / DLSS HELD.

use aethel_kernel_rust::baremetal_memory_manager::{
    probe_baremetal_memory_manager as kernel_probe, run_baremetal_memory_manager_soak,
    BareMetalMemoryManagerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelBaremetalMemoryManagerWireReport {
    pub baremetal_memory_manager_ready: bool,
    pub arena_created: bool,
    pub entity_slots_allocated: u32,
    pub entity_bytes_used: usize,
    pub frame_burst_ok: bool,
    pub frame_burst_bytes_used: usize,
    pub oom_fail_closed: bool,
    pub flushed: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_frame_arena_foundation_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: BareMetalMemoryManagerSoakReport,
    note: impl Into<String>,
) -> KernelBaremetalMemoryManagerWireReport {
    KernelBaremetalMemoryManagerWireReport {
        baremetal_memory_manager_ready: r.baremetal_memory_manager_ready,
        arena_created: r.arena_created,
        entity_slots_allocated: r.entity_slots_allocated,
        entity_bytes_used: r.entity_bytes_used,
        frame_burst_ok: r.frame_burst_ok,
        frame_burst_bytes_used: r.frame_burst_bytes_used,
        oom_fail_closed: r.oom_fail_closed,
        flushed: r.flushed,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_frame_arena_foundation_probe: r.distinct_from_frame_arena_foundation_probe,
        distinct_from_simd_world_soa_hot_path_probe: r.distinct_from_simd_world_soa_hot_path_probe,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "dl".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run BareMetalMemoryManager soak via kernel.
pub fn run_kernel_baremetal_memory_manager_soak() -> KernelBaremetalMemoryManagerWireReport {
    let r = run_baremetal_memory_manager_soak();
    let note = if !r.baremetal_memory_manager_ready {
        "BareMetalMemoryManager soak failed — baremetalMemoryManagerReady stays false"
    } else {
        "Desktop soak: entity-slot + frame-burst via LinearFrameAllocator, OOM fail-closed + flush — baremetalMemoryManagerReady true; distinct from dc FrameArena and dk SIMD WorldSoA"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `baremetalMemoryManagerReady` (letter dl).
pub fn probe_baremetal_memory_manager() -> KernelBaremetalMemoryManagerWireReport {
    to_report(
        kernel_probe(),
        "BareMetalMemoryManager probe (letter dl) — distinct from frame_arena_ready / probe_kernel_foundation, simdWorldSoaHotPathReady, simdClayMathReady, mmapEcsPagerReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, and kernelSpectralSonicDesktopReady",
    )
}

/// Tauri IPC — BareMetalMemoryManager honesty.
#[tauri::command]
pub fn probe_baremetal_memory_manager_cmd() -> KernelBaremetalMemoryManagerWireReport {
    probe_baremetal_memory_manager()
}

/// Tauri IPC — run BareMetalMemoryManager soak.
#[tauri::command]
pub fn run_kernel_baremetal_memory_manager_soak_cmd() -> KernelBaremetalMemoryManagerWireReport {
    run_kernel_baremetal_memory_manager_soak()
}

//! Slab allocator mmap desktop wire — letter **dm**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::slab_allocator_mmap`
//! (memmap2 fixed-size slab + O(1) free-list indices). Honesty probe
//! `slabAllocatorMmapReady` is **distinct** from di `mmapEcsPagerReady`,
//! dl `baremetalMemoryManagerReady`, dc FrameArena / `probe_kernel_foundation`,
//! dk `simdWorldSoaHotPathReady`, dj `simdClayMathReady`, dh
//! `worldSoaSabLayoutReady`, de `kernelDesktopWireReady`, df
//! `kernelMutDnaDesktopReady`, and dg `kernelSpectralSonicDesktopReady`.
//! Chaos/100k/mmap-SAB production / AVX-512 / GR / dual-240 / Coins / Agones /
//! Nanite / DLSS HELD.

use aethel_kernel_rust::slab_allocator_mmap::{
    probe_slab_allocator_mmap as kernel_probe, run_slab_allocator_mmap_soak,
    SlabAllocatorMmapSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSlabAllocatorMmapWireReport {
    pub slab_allocator_mmap_ready: bool,
    pub map_created: bool,
    pub slots_allocated: u32,
    pub slots_freed: u32,
    pub write_readback_ok: bool,
    pub full_fail_closed: bool,
    pub free_reuse_ok: bool,
    pub header_ok: bool,
    pub flushed: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_frame_arena_foundation_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
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
    r: SlabAllocatorMmapSoakReport,
    note: impl Into<String>,
) -> KernelSlabAllocatorMmapWireReport {
    KernelSlabAllocatorMmapWireReport {
        slab_allocator_mmap_ready: r.slab_allocator_mmap_ready,
        map_created: r.map_created,
        slots_allocated: r.slots_allocated,
        slots_freed: r.slots_freed,
        write_readback_ok: r.write_readback_ok,
        full_fail_closed: r.full_fail_closed,
        free_reuse_ok: r.free_reuse_ok,
        header_ok: r.header_ok,
        flushed: r.flushed,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_baremetal_memory_manager_probe: r
            .distinct_from_baremetal_memory_manager_probe,
        distinct_from_frame_arena_foundation_probe: r.distinct_from_frame_arena_foundation_probe,
        distinct_from_simd_world_soa_hot_path_probe: r.distinct_from_simd_world_soa_hot_path_probe,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "dm".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run slab allocator mmap soak via kernel.
pub fn run_kernel_slab_allocator_mmap_soak() -> KernelSlabAllocatorMmapWireReport {
    let r = run_slab_allocator_mmap_soak();
    let note = if !r.slab_allocator_mmap_ready {
        "Slab allocator mmap soak failed — slabAllocatorMmapReady stays false"
    } else {
        "Desktop soak: memmap2 fixed-size slab + O(1) free-list alloc/free, full fail-closed + flush — slabAllocatorMmapReady true; distinct from di mmap ECS pager and dl BareMetalMemoryManager"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `slabAllocatorMmapReady` (letter dm).
pub fn probe_slab_allocator_mmap() -> KernelSlabAllocatorMmapWireReport {
    to_report(
        kernel_probe(),
        "Slab allocator mmap probe (letter dm) — distinct from mmapEcsPagerReady, baremetalMemoryManagerReady, frame_arena_ready / probe_kernel_foundation, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, and kernelSpectralSonicDesktopReady",
    )
}

/// Tauri IPC — slab allocator mmap honesty.
#[tauri::command]
pub fn probe_slab_allocator_mmap_cmd() -> KernelSlabAllocatorMmapWireReport {
    probe_slab_allocator_mmap()
}

/// Tauri IPC — run slab allocator mmap soak.
#[tauri::command]
pub fn run_kernel_slab_allocator_mmap_soak_cmd() -> KernelSlabAllocatorMmapWireReport {
    run_kernel_slab_allocator_mmap_soak()
}

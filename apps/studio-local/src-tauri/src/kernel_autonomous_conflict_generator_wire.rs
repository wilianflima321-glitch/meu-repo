//! Autonomous Conflict Generator desktop wire — letter **hm**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::autonomous_conflict_generator`
//! (high stress → SoA vortex events; low stress identity). Honesty probe
//! `autonomousConflictGeneratorReady` is **distinct** from dx
//! `synestheticSensoryRemapReady`, dw `mnemonicMatterEntropyReady`, dv
//! `fourDimensionalTimeSdfReady`, du `shadowTimeReversalReady`, dt
//! `curvedRaymarcherReady`, ds `fractalEnergyPerturbationReady`, dr
//! `autonomousEntropyCorrectorReady`, dq `unifiedFieldNetworkReady`, and
//! dc–dm foundation probes
//! (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`, `mmapEcsPagerReady`,
//! `simdWorldSoaHotPathReady`, `simdClayMathReady`, `worldSoaSabLayoutReady`,
//! `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Full adversary AI / Chaos parity / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::autonomous_conflict_generator::{
    probe_autonomous_conflict_generator as kernel_probe, run_autonomous_conflict_generator_soak,
    AutonomousConflictGeneratorSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAutonomousConflictGeneratorWireReport {
    pub autonomous_conflict_generator_ready: bool,
    pub high_stress_spawns_events: bool,
    pub low_stress_is_identity: bool,
    pub events_measurable: bool,
    pub velocity_field_perturbed: bool,
    pub high_spawn_count: u32,
    pub low_spawn_count: u32,
    pub final_active_events: u32,
    pub final_vorticity: f32,
    pub velocity_field_delta: f32,
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
}

fn to_report(
    r: AutonomousConflictGeneratorSoakReport,
    note: impl Into<String>,
) -> KernelAutonomousConflictGeneratorWireReport {
    KernelAutonomousConflictGeneratorWireReport {
        autonomous_conflict_generator_ready: r.autonomous_conflict_generator_ready,
        high_stress_spawns_events: r.high_stress_spawns_events,
        low_stress_is_identity: r.low_stress_is_identity,
        events_measurable: r.events_measurable,
        velocity_field_perturbed: r.velocity_field_perturbed,
        high_spawn_count: r.high_spawn_count,
        low_spawn_count: r.low_spawn_count,
        final_active_events: r.final_active_events,
        final_vorticity: r.final_vorticity,
        velocity_field_delta: r.velocity_field_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "hm".into(),
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
    }
}

/// Run autonomous conflict generator soak via kernel.
pub fn run_kernel_autonomous_conflict_generator_soak() -> KernelAutonomousConflictGeneratorWireReport
{
    let r = run_autonomous_conflict_generator_soak();
    let note = if !r.autonomous_conflict_generator_ready {
        "Autonomous conflict generator soak failed — autonomousConflictGeneratorReady stays false"
    } else {
        "Desktop soak: high tensor stress spawns SoA vortex events; low stress identity; velocity field perturbed — autonomousConflictGeneratorReady true; adversary_ai_chaos_parity_ready false; distinct from dx synestheticSensoryRemapReady, dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `autonomousConflictGeneratorReady` (letter hm).
pub fn probe_autonomous_conflict_generator() -> KernelAutonomousConflictGeneratorWireReport {
    to_report(
        kernel_probe(),
        "Autonomous conflict generator probe (letter hm) — distinct from synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; adversary_ai_chaos_parity_ready HELD",
    )
}

/// Tauri IPC — autonomous conflict generator honesty.
#[tauri::command]
pub fn probe_autonomous_conflict_generator_cmd() -> KernelAutonomousConflictGeneratorWireReport {
    probe_autonomous_conflict_generator()
}

/// Tauri IPC — run autonomous conflict generator soak.
#[tauri::command]
pub fn run_kernel_autonomous_conflict_generator_soak_cmd()
-> KernelAutonomousConflictGeneratorWireReport {
    run_kernel_autonomous_conflict_generator_soak()
}

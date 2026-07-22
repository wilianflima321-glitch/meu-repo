//! Position-Based Dynamics desktop wire — letter **hj** / XPBD deepen **ip**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::position_based_dynamics`
//! (SoA distance projection + XPBD compliance/Δλ + fixed substep soak).
//! Honesty probes `positionBasedDynamicsReady` +
//! `positionBasedDynamicsXpbdReady` (**ip**; distinct from hj ready).
//! Full Chaos / XPBD cloth AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::position_based_dynamics::{
    probe_position_based_dynamics as kernel_probe, run_position_based_dynamics_soak,
    run_position_based_dynamics_xpbd_soak, PositionBasedDynamicsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelPositionBasedDynamicsWireReport {
    pub position_based_dynamics_ready: bool,
    pub position_based_dynamics_xpbd_ready: bool,
    pub residual_decreased: bool,
    pub positions_mutated: bool,
    pub pinned_particle_stable: bool,
    pub unconstrained_particle_stable: bool,
    pub fractal_stress_coupled: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub residual_before: f32,
    pub residual_after: f32,
    pub residual_drop_fraction: f32,
    pub iterations: u32,
    pub fractal_stress_delta: f32,
    pub xpbd_particle_count: u32,
    pub xpbd_constraint_count: u32,
    pub xpbd_substeps: u32,
    pub residual_iters_1: f32,
    pub residual_iters_2: f32,
    pub residual_iters_4: f32,
    pub residual_iters_8: f32,
    pub residual_decreases_with_iterations: bool,
    pub deterministic_replay: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
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
    pub xpbd_cloth_aaa_ready: bool,
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
    r: PositionBasedDynamicsSoakReport,
    note: impl Into<String>,
) -> KernelPositionBasedDynamicsWireReport {
    KernelPositionBasedDynamicsWireReport {
        position_based_dynamics_ready: r.position_based_dynamics_ready,
        position_based_dynamics_xpbd_ready: r.position_based_dynamics_xpbd_ready,
        residual_decreased: r.residual_decreased,
        positions_mutated: r.positions_mutated,
        pinned_particle_stable: r.pinned_particle_stable,
        unconstrained_particle_stable: r.unconstrained_particle_stable,
        fractal_stress_coupled: r.fractal_stress_coupled,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        residual_before: r.residual_before,
        residual_after: r.residual_after,
        residual_drop_fraction: r.residual_drop_fraction,
        iterations: r.iterations,
        fractal_stress_delta: r.fractal_stress_delta,
        xpbd_particle_count: r.xpbd_particle_count,
        xpbd_constraint_count: r.xpbd_constraint_count,
        xpbd_substeps: r.xpbd_substeps,
        residual_iters_1: r.residual_iters_1,
        residual_iters_2: r.residual_iters_2,
        residual_iters_4: r.residual_iters_4,
        residual_iters_8: r.residual_iters_8,
        residual_decreases_with_iterations: r.residual_decreases_with_iterations,
        deterministic_replay: r.deterministic_replay,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_atmospheric_physical_damping_probe: r
            .distinct_from_atmospheric_physical_damping_probe,
        distinct_from_autonomous_conflict_generator_probe: r
            .distinct_from_autonomous_conflict_generator_probe,
        distinct_from_synesthetic_sensory_remap_probe: r
            .distinct_from_synesthetic_sensory_remap_probe,
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
        letter: "ip".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
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

/// Merge XPBD deepen fields into classical soak (desktop soak cmd).
fn merge_xpbd_fields(
    mut r: PositionBasedDynamicsSoakReport,
    x: PositionBasedDynamicsSoakReport,
) -> PositionBasedDynamicsSoakReport {
    r.position_based_dynamics_xpbd_ready = x.position_based_dynamics_xpbd_ready;
    r.xpbd_particle_count = x.xpbd_particle_count;
    r.xpbd_constraint_count = x.xpbd_constraint_count;
    r.xpbd_substeps = x.xpbd_substeps;
    r.residual_iters_1 = x.residual_iters_1;
    r.residual_iters_2 = x.residual_iters_2;
    r.residual_iters_4 = x.residual_iters_4;
    r.residual_iters_8 = x.residual_iters_8;
    r.residual_decreases_with_iterations = x.residual_decreases_with_iterations;
    r.deterministic_replay = x.deterministic_replay;
    r
}

/// Run position-based dynamics soak via kernel — classical + XPBD deepen.
pub fn run_kernel_position_based_dynamics_soak() -> KernelPositionBasedDynamicsWireReport {
    let r = merge_xpbd_fields(
        run_position_based_dynamics_soak(),
        run_position_based_dynamics_xpbd_soak(),
    );
    let note = if !r.position_based_dynamics_ready {
        "Position-based dynamics soak failed — positionBasedDynamicsReady stays false"
    } else if !r.position_based_dynamics_xpbd_ready {
        "Desktop soak: classical PBD ready; letter ip XPBD+substep deepen FAILED (residual curve/pin/replay/N≥64) — positionBasedDynamicsXpbdReady false; chaos/cloth AAA HELD"
    } else {
        "Desktop soak: SoA distance projection + letter ip XPBD compliance/Δλ + fixed substeps (N≥64, residual↓ with iters, pin stable, same-seed bit-identical) — positionBasedDynamicsReady + positionBasedDynamicsXpbdReady true; chaos_pbd_parity_ready / xpbd_cloth_aaa_ready false"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `positionBasedDynamicsReady` + XPBD deepen **ip**.
pub fn probe_position_based_dynamics() -> KernelPositionBasedDynamicsWireReport {
    to_report(
        kernel_probe(),
        "Position-based dynamics probe (letter ip deepen / hj base) — positionBasedDynamicsReady + positionBasedDynamicsXpbdReady (N≥64, residual curve, pin stable, replay); chaos_pbd_parity_ready / xpbd_cloth_aaa_ready HELD",
    )
}

/// Tauri IPC — position-based dynamics honesty.
#[tauri::command]
pub fn probe_position_based_dynamics_cmd() -> KernelPositionBasedDynamicsWireReport {
    probe_position_based_dynamics()
}

/// Tauri IPC — run position-based dynamics soak.
#[tauri::command]
pub fn run_kernel_position_based_dynamics_soak_cmd() -> KernelPositionBasedDynamicsWireReport {
    run_kernel_position_based_dynamics_soak()
}

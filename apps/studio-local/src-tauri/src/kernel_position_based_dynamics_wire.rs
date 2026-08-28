//! Position-Based Dynamics desktop wire — letter **hj** / XPBD deepen **ip**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::position_based_dynamics`
//! (SoA distance projection + XPBD compliance/Δλ + fixed substep soak + N≥2048
//! cloth-grid substrate). Honesty probes `positionBasedDynamicsReady`,
//! `positionBasedDynamicsXpbdReady` (**ip**) and `xpbdClothAaaReady` — the
//! cloth flag is REAL on the CPU substrate (flat-sheet drop, pin stability,
//! strain-decrease-with-iterations, bit-identical replay). Full Chaos / GPU
//! execution / Coins / Agones / Nanite / DLSS remain HELD.

use aethel_kernel_rust::position_based_dynamics::{
    probe_position_based_dynamics as kernel_probe, PositionBasedDynamicsSoakReport,
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
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub cloth_particle_count: u32,
    pub cloth_constraint_count: u32,
    pub cloth_structural_constraints: u32,
    pub cloth_shear_constraints: u32,
    pub cloth_bending_constraints: u32,
    pub cloth_max_strain_error: f32,
    pub cloth_collision_non_penetrating: bool,
    pub cloth_ground_contacts: u32,
    pub cloth_pin_stable: bool,
    pub cloth_deterministic_replay: bool,
    pub cloth_strain_decreases_with_iterations: bool,
    pub cloth_frames: u32,
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
        distinct_from_peers_note: "distinct".into(),
        letter: "ip".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
        cloth_particle_count: r.cloth_particle_count,
        cloth_constraint_count: r.cloth_constraint_count,
        cloth_structural_constraints: r.cloth_structural_constraints,
        cloth_shear_constraints: r.cloth_shear_constraints,
        cloth_bending_constraints: r.cloth_bending_constraints,
        cloth_max_strain_error: r.cloth_max_strain_error,
        cloth_collision_non_penetrating: r.cloth_collision_non_penetrating,
        cloth_ground_contacts: r.cloth_ground_contacts,
        cloth_pin_stable: r.cloth_pin_stable,
        cloth_deterministic_replay: r.cloth_deterministic_replay,
        cloth_strain_decreases_with_iterations: r.cloth_strain_decreases_with_iterations,
        cloth_frames: r.cloth_frames,
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

/// Run position-based dynamics soak via kernel — classical + XPBD + cloth AAA
/// (the kernel probe is the single honest 3-way merge surface).
pub fn run_kernel_position_based_dynamics_soak() -> KernelPositionBasedDynamicsWireReport {
    let r = kernel_probe();
    let note = if !r.position_based_dynamics_ready {
        "Position-based dynamics soak failed — positionBasedDynamicsReady stays false"
    } else if !r.position_based_dynamics_xpbd_ready {
        "Desktop soak: classical PBD ready; letter ip/CW2 XPBD+substep deepen FAILED (residual curve/pin/replay/N≥2048) — positionBasedDynamicsXpbdReady false; chaos HELD"
    } else if !r.xpbd_cloth_aaa_ready {
        "Desktop soak: SoA distance projection + letter ip/CW2 XPBD compliance/Δλ + fixed substeps (N≥2048, residual↓ with iters, pin stable, same-seed bit-identical) — positionBasedDynamicsReady + positionBasedDynamicsXpbdReady true; cloth AAA substrate FAILED; chaos_pbd_parity_ready false"
    } else {
        "Desktop soak: SoA distance projection + letter ip/CW2 XPBD compliance/Δλ (N≥2048) + cloth-grid AAA substrate (N=2304, structural/shear/bending, flat-sheet drop non-penetrating, top-row pin stable, strain↓ with iterations, same-seed bit-identical replay) — positionBasedDynamicsReady + positionBasedDynamicsXpbdReady + xpbdClothAaaReady true; chaos_pbd_parity_ready (GPU) HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated readiness + XPBD deepen **ip**/CW2 + cloth AAA.
pub fn probe_position_based_dynamics() -> KernelPositionBasedDynamicsWireReport {
    to_report(
        kernel_probe(),
        "Position-based dynamics probe (letter ip/CW2 deepen / hj base / cloth AAA) — positionBasedDynamicsReady + positionBasedDynamicsXpbdReady (N≥2048, residual curve, pin stable, replay) + xpbdClothAaaReady (N=2304 cloth grid substrate); chaos_pbd_parity_ready (GPU execution) HELD",
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

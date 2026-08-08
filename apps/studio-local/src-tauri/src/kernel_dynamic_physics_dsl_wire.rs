//! Dynamic Physics DSL desktop wire — letter **gc**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::dynamic_physics_dsl`
//! (parse tiny force/constraint programs + SoA eval; soak proves scripted
//! force changes velocity vs no-op, same program→same result, invalid
//! fail-closed, distance projects).
//! Honesty probe `dynamicPhysicsDslReady` is **distinct** from gb
//! `atmosphericScatteringGodraysReady`, ga `voxelConeRadiosityReady`, fz
//! `symmetricVectorAlgebraReady`, fy `recursiveFractalEnhancementReady`, fx
//! `blueNoiseDitheringReady`, fw `quantumOverlapReady`, ey
//! `contextualPhysicsOverrideReady`, and prior.
//! Full Chaos/Mass Unreal physics DSL AAA stays false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.
//!
//! Letter **ik**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::dynamic_physics_dsl::{
    probe_dynamic_physics_dsl as kernel_probe, run_dynamic_physics_dsl_soak,
    DynamicPhysicsDslSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicPhysicsDslWireReport {
    pub dynamic_physics_dsl_ready: bool,
    pub force_changes_velocity: bool,
    pub noop_leaves_velocity: bool,
    pub same_program_same_result: bool,
    pub deterministic: bool,
    pub invalid_program_fail_closed: bool,
    pub distance_constraint_projects: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub vel_with_force_y: f32,
    pub vel_noop_y: f32,
    pub distance_residual_before: f32,
    pub distance_residual_after: f32,
    pub stmt_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_mass_physics_dsl_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: DynamicPhysicsDslSoakReport,
    note: impl Into<String>,
) -> KernelDynamicPhysicsDslWireReport {
    KernelDynamicPhysicsDslWireReport {
        dynamic_physics_dsl_ready: r.dynamic_physics_dsl_ready,
        force_changes_velocity: r.force_changes_velocity,
        noop_leaves_velocity: r.noop_leaves_velocity,
        same_program_same_result: r.same_program_same_result,
        deterministic: r.deterministic,
        invalid_program_fail_closed: r.invalid_program_fail_closed,
        distance_constraint_projects: r.distance_constraint_projects,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        vel_with_force_y: r.vel_with_force_y,
        vel_noop_y: r.vel_noop_y,
        distance_residual_before: r.distance_residual_before,
        distance_residual_after: r.distance_residual_after,
        stmt_count: r.stmt_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gc".into(),
        note: note.into(),
        chaos_mass_physics_dsl_aaa_ready: r.chaos_mass_physics_dsl_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run dynamic physics DSL soak via kernel.
pub fn run_kernel_dynamic_physics_dsl_soak() -> KernelDynamicPhysicsDslWireReport {
    let r = run_dynamic_physics_dsl_soak();
    let note = if !r.dynamic_physics_dsl_ready {
        "Dynamic physics DSL soak failed — dynamicPhysicsDslReady stays false"
    } else {
        "Desktop soak: apply_force+integrate changes velocity vs no-op; same program→same; invalid fail-closed; distance projects — dynamicPhysicsDslReady true; chaos_mass_physics_dsl_aaa_ready false; distinct from gb atmosphericScatteringGodraysReady + ga voxelConeRadiosityReady + fz symmetricVectorAlgebraReady + fy recursiveFractalEnhancementReady + fx blueNoiseDitheringReady + fw quantumOverlapReady + ey contextualPhysicsOverrideReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `dynamicPhysicsDslReady` (letter gc).
pub fn probe_dynamic_physics_dsl() -> KernelDynamicPhysicsDslWireReport {
    to_report(
        kernel_probe(),
        "Dynamic physics DSL probe (letter gc) — distinct from atmosphericScatteringGodraysReady, voxelConeRadiosityReady, symmetricVectorAlgebraReady, recursiveFractalEnhancementReady, blueNoiseDitheringReady, quantumOverlapReady, contextualPhysicsOverrideReady, and probe_kernel_foundation; chaos_mass_physics_dsl_aaa_ready HELD",
    )
}

/// Tauri IPC — dynamic physics DSL honesty.
#[tauri::command]
pub fn probe_dynamic_physics_dsl_cmd() -> KernelDynamicPhysicsDslWireReport {
    probe_dynamic_physics_dsl()
}

/// Tauri IPC — run dynamic physics DSL soak.
#[tauri::command]
pub fn run_kernel_dynamic_physics_dsl_soak_cmd() -> KernelDynamicPhysicsDslWireReport {
    run_kernel_dynamic_physics_dsl_soak()
}

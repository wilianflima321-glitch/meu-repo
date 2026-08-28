//! R10 — Procedural Muscle Locomotion parity wire (S-24, letter jw).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::procedural_muscle_locomotion`]
//! — gaita bipedal IK-free emergente de oscilador de fase CPG + cadeias de
//! impulso de ativação muscular + substrato XPBD de tendões reais (5
//! partículas / 6 tendões, rest-length modulada por ativação, stiction de
//! stance e lift de swing) — expondo o soak **fail-closed** na superfície IPC
//! desktop. A wire espelha o report completo do substrato e adiciona
//! `wire_on_surface` (self-check do registro ACL). Feed honesto do S-register
//! S-24 — nunca afirma prontidão chaos-muscle / Euphoria full / GPU-muscle /
//! neural physics (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::procedural_muscle_locomotion::{
    probe_procedural_muscle_locomotion, run_procedural_muscle_locomotion_soak,
    ProceduralMuscleLocomotionSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Procedural Muscle Locomotion — espelho camelCase do
/// `ProceduralMuscleLocomotionSoakReport` do kernel mais o self-check
/// `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelProceduralMuscleLocomotionWireReport {
    pub procedural_muscle_locomotion_ready: bool,
    pub xpbd_tendon_routed: bool,
    pub activation_impulse_chains_ready: bool,
    pub ik_free_gait_ready: bool,
    pub deterministic_replay: bool,
    pub forward_displacement: f32,
    pub hip_y_mean: f32,
    pub hip_y_min: f32,
    pub hip_y_max: f32,
    pub stride_count: u32,
    pub foot_plant_events: u32,
    pub tendon_work: f32,
    pub solver_projection_steps: u32,
    pub xpbd_residual_drop_sum: f32,
    pub soak_steps: u32,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_physics_world_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_gas_fluid_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    pub chaos_muscle_locomotion_aaa_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub gpu_muscle_sim_ready: bool,
    pub neural_physics_aaa_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: ProceduralMuscleLocomotionSoakReport,
    wire_on_surface: bool,
) -> KernelProceduralMuscleLocomotionWireReport {
    KernelProceduralMuscleLocomotionWireReport {
        procedural_muscle_locomotion_ready: r.procedural_muscle_locomotion_ready,
        xpbd_tendon_routed: r.xpbd_tendon_routed,
        activation_impulse_chains_ready: r.activation_impulse_chains_ready,
        ik_free_gait_ready: r.ik_free_gait_ready,
        deterministic_replay: r.deterministic_replay,
        forward_displacement: r.forward_displacement,
        hip_y_mean: r.hip_y_mean,
        hip_y_min: r.hip_y_min,
        hip_y_max: r.hip_y_max,
        stride_count: r.stride_count,
        foot_plant_events: r.foot_plant_events,
        tendon_work: r.tendon_work,
        solver_projection_steps: r.solver_projection_steps,
        xpbd_residual_drop_sum: r.xpbd_residual_drop_sum,
        soak_steps: r.soak_steps,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_physics_world_probe: r.distinct_from_physics_world_probe,
        distinct_from_entropy_rapier_bridge_probe: r.distinct_from_entropy_rapier_bridge_probe,
        distinct_from_matter_thermodynamics_sph_probe: r.distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_lattice_boltzmann_gas_fluid_probe: r
            .distinct_from_lattice_boltzmann_gas_fluid_probe,
        distinct_from_position_based_dynamics_probe: r
            .distinct_from_position_based_dynamics_probe,
        distinct_from_finite_element_analysis_probe: r.distinct_from_finite_element_analysis_probe,
        distinct_from_voronoi_destruction_3d_probe: r.distinct_from_voronoi_destruction_3d_probe,
        chaos_muscle_locomotion_aaa_ready: r.chaos_muscle_locomotion_aaa_ready,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        gpu_muscle_sim_ready: r.gpu_muscle_sim_ready,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R10 Procedural Muscle Locomotion (letter jw).
///
/// Roda o soak unificado do kernel (duas passadas determinísticas de gaita +
/// cadeias de ativação + XPBD de tendões) e reporta a paridade completa. A
/// wire também se auto-verifica: `wire_on_surface` é `true` apenas quando os
/// dois comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_procedural_muscle_locomotion_wire() -> KernelProceduralMuscleLocomotionWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_procedural_muscle_locomotion_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_procedural_muscle_locomotion_soak_cmd")
                .is_some();
    to_report(probe_procedural_muscle_locomotion(), wire_on_surface)
}

/// Tauri IPC — R10 Procedural Muscle Locomotion probe.
#[tauri::command]
pub fn probe_procedural_muscle_locomotion_cmd() -> KernelProceduralMuscleLocomotionWireReport {
    probe_procedural_muscle_locomotion_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelProceduralMuscleLocomotionSoakWireReport {
    pub procedural_muscle_locomotion_ready: bool,
    pub xpbd_tendon_routed: bool,
    pub activation_impulse_chains_ready: bool,
    pub ik_free_gait_ready: bool,
    pub deterministic_replay: bool,
    pub forward_displacement: f32,
    pub hip_y_mean: f32,
    pub stride_count: u32,
    pub foot_plant_events: u32,
    pub tendon_work: f32,
    pub soak_steps: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub chaos_muscle_locomotion_aaa_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub gpu_muscle_sim_ready: bool,
    pub neural_physics_aaa_ready: bool,
}

fn soak_to_wire(
    r: ProceduralMuscleLocomotionSoakReport,
) -> KernelProceduralMuscleLocomotionSoakWireReport {
    KernelProceduralMuscleLocomotionSoakWireReport {
        procedural_muscle_locomotion_ready: r.procedural_muscle_locomotion_ready,
        xpbd_tendon_routed: r.xpbd_tendon_routed,
        activation_impulse_chains_ready: r.activation_impulse_chains_ready,
        ik_free_gait_ready: r.ik_free_gait_ready,
        deterministic_replay: r.deterministic_replay,
        forward_displacement: r.forward_displacement,
        hip_y_mean: r.hip_y_mean,
        stride_count: r.stride_count,
        foot_plant_events: r.foot_plant_events,
        tendon_work: r.tendon_work,
        soak_steps: r.soak_steps,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        chaos_muscle_locomotion_aaa_ready: r.chaos_muscle_locomotion_aaa_ready,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        gpu_muscle_sim_ready: r.gpu_muscle_sim_ready,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Procedural Muscle Locomotion (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_procedural_muscle_locomotion_soak_cmd(
) -> KernelProceduralMuscleLocomotionSoakWireReport {
    soak_to_wire(run_procedural_muscle_locomotion_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_locomotion_honestly() {
        let r = probe_procedural_muscle_locomotion_wire();
        // Soak unificado green: tendões XPBD + ativação + gaita IK-free.
        assert!(r.procedural_muscle_locomotion_ready);
        assert!(r.xpbd_tendon_routed);
        assert!(r.activation_impulse_chains_ready);
        assert!(r.ik_free_gait_ready);
        assert!(r.deterministic_replay);
        // Accounting do soak: 2400 steps @ 1/240 s = 10 s, strides/foot-plants ≥ 2.
        assert_eq!(r.soak_steps, 2400);
        assert!(r.stride_count >= 2);
        assert!(r.foot_plant_events >= 2);
        assert!(r.forward_displacement > 1.5);
        assert!(r.hip_y_mean > 0.5);
        assert!(r.hip_y_min > 0.3);
        assert!(r.tendon_work > 0.0);
        assert!(r.solver_projection_steps > 0);
        assert_eq!(r.evidence_kind, "procedural_muscle_tendon_chain_gait");
        assert_ne!(r.evidence_fingerprint, 0);
        // Auto-referencial: a própria wire R10 está registrada na superfície.
        assert!(r.wire_on_surface);
        // Evidência distinta das sondas dos substratos (anti-tautologia).
        assert!(r.distinct_from_physics_world_probe);
        assert!(r.distinct_from_entropy_rapier_bridge_probe);
        assert!(r.distinct_from_matter_thermodynamics_sph_probe);
        assert!(r.distinct_from_lattice_boltzmann_gas_fluid_probe);
        assert!(r.distinct_from_position_based_dynamics_probe);
        assert!(r.distinct_from_finite_element_analysis_probe);
        assert!(r.distinct_from_voronoi_destruction_3d_probe);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_procedural_muscle_locomotion_wire();
        assert!(
            !r.chaos_muscle_locomotion_aaa_ready,
            "honest wire must never claim chaos-muscle AAA readiness"
        );
        assert!(
            !r.euphoria_full_aaa_ready,
            "honest wire must never claim full-Euphoria AAA readiness"
        );
        assert!(
            !r.gpu_muscle_sim_ready,
            "honest wire must never claim GPU muscle-sim readiness"
        );
        assert!(
            !r.neural_physics_aaa_ready,
            "honest wire must never claim neural physics AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::procedural_muscle_locomotion::run_procedural_muscle_locomotion_soak(),
        );
        assert!(w.procedural_muscle_locomotion_ready);
        assert!(w.xpbd_tendon_routed);
        assert!(w.activation_impulse_chains_ready);
        assert!(w.ik_free_gait_ready);
        assert!(w.deterministic_replay);
        assert_eq!(w.soak_steps, 2400);
        assert_eq!(w.evidence_kind, "procedural_muscle_tendon_chain_gait");
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.chaos_muscle_locomotion_aaa_ready
                && !w.euphoria_full_aaa_ready
                && !w.gpu_muscle_sim_ready
                && !w.neural_physics_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_procedural_muscle_locomotion_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

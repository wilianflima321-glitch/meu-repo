//! R11 — Neural-Physics Co-Sim + SDF Collision parity wire (S-26, letter jz).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::neural_physics_co_sim`]
//! — co-simulação neural local determinística (rede neural de contato treinada
//! por SGD sobre dados de professor + consulta de colisão por SDF estocástico
//! virtual + rastreamento de fase de ativação muscular + escalonamento por Law
//! XV) — expondo o soak **fail-closed** na superfície IPC desktop. A wire
//! espelha o report completo do substrato e adiciona `wire_on_surface`
//! (self-check do registro ACL). Feed honesto do S-register S-26 — a wire
//! afirma **apenas** a prontidão local ownada
//! (`neural_physics_aaa_ready` = TRUE, soak-gated); online deep-net / GPU
//! neural / neural-terrain / full-rig permanecem HELD (flags FALSE
//! espelhadas do kernel).

use aethel_kernel_rust::neural_physics_co_sim::{
    probe_neural_physics_co_sim, run_neural_physics_co_sim_soak, NeuralPhysicsCoSimSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Neural-Physics Co-Sim — espelho camelCase do
/// `NeuralPhysicsCoSimSoakReport` do kernel mais o self-check
/// `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNeuralPhysicsCoSimWireReport {
    pub neural_physics_co_sim_ready: bool,
    pub loss_reduced: bool,
    pub trained_improves_prediction: bool,
    pub sdf_contact_detected: bool,
    pub sdf_normal_outward: bool,
    pub muscle_activation_tracks_phase: bool,
    pub capability_tier_scales: bool,
    pub impulses_bounded: bool,
    pub fail_closed_non_finite: bool,
    pub deterministic_replay: bool,
    pub hidden_units: usize,
    pub sdf_strata: usize,
    pub loss_before: f32,
    pub loss_after: f32,
    pub trained_val_mae: f32,
    pub untrained_val_mae: f32,
    pub activation_mae: f32,
    pub sdf_penetration: f32,
    pub sdf_surface_err: f32,
    pub sdf_mae_vs_analytic: f32,
    pub max_jn: f32,
    pub max_jt: f32,
    pub impulse_applications: u64,
    pub fail_closed_hits: u64,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_procedural_muscle_locomotion_probe: bool,
    pub distinct_from_living_sky_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_stochastic_virtual_sdf_probe: bool,
    pub distinct_from_sdf_sculptor_probe: bool,
    /// S-26-owned measured vector — deterministic local co-sim ready (soak-gated).
    pub neural_physics_aaa_ready: bool,
    /// Fail-closed — no online deep-net / GPU neural / neural terrain / full rig.
    pub trained_online_deep_net_ready: bool,
    pub gpu_neural_physics_ready: bool,
    pub neural_terrain_ready: bool,
    pub full_neural_rig_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: NeuralPhysicsCoSimSoakReport,
    wire_on_surface: bool,
) -> KernelNeuralPhysicsCoSimWireReport {
    KernelNeuralPhysicsCoSimWireReport {
        neural_physics_co_sim_ready: r.neural_physics_co_sim_ready,
        loss_reduced: r.loss_reduced,
        trained_improves_prediction: r.trained_improves_prediction,
        sdf_contact_detected: r.sdf_contact_detected,
        sdf_normal_outward: r.sdf_normal_outward,
        muscle_activation_tracks_phase: r.muscle_activation_tracks_phase,
        capability_tier_scales: r.capability_tier_scales,
        impulses_bounded: r.impulses_bounded,
        fail_closed_non_finite: r.fail_closed_non_finite,
        deterministic_replay: r.deterministic_replay,
        hidden_units: r.hidden_units,
        sdf_strata: r.sdf_strata,
        loss_before: r.loss_before,
        loss_after: r.loss_after,
        trained_val_mae: r.trained_val_mae,
        untrained_val_mae: r.untrained_val_mae,
        activation_mae: r.activation_mae,
        sdf_penetration: r.sdf_penetration,
        sdf_surface_err: r.sdf_surface_err,
        sdf_mae_vs_analytic: r.sdf_mae_vs_analytic,
        max_jn: r.max_jn,
        max_jt: r.max_jt,
        impulse_applications: r.impulse_applications,
        fail_closed_hits: r.fail_closed_hits,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_procedural_muscle_locomotion_probe: r
            .distinct_from_procedural_muscle_locomotion_probe,
        distinct_from_living_sky_probe: r.distinct_from_living_sky_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r
            .distinct_from_lattice_boltzmann_fluid_solver_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_stochastic_virtual_sdf_probe: r.distinct_from_stochastic_virtual_sdf_probe,
        distinct_from_sdf_sculptor_probe: r.distinct_from_sdf_sculptor_probe,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
        trained_online_deep_net_ready: r.trained_online_deep_net_ready,
        gpu_neural_physics_ready: r.gpu_neural_physics_ready,
        neural_terrain_ready: r.neural_terrain_ready,
        full_neural_rig_ready: r.full_neural_rig_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R11 Neural-Physics Co-Sim (letter jz).
///
/// Roda o soak unificado do kernel (passadas trained/untrained/replay + SDF
/// collision + muscle phase) e reporta a paridade completa. A wire também se
/// auto-verifica: `wire_on_surface` é `true` apenas quando os dois comandos
/// (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_neural_physics_co_sim_wire() -> KernelNeuralPhysicsCoSimWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_neural_physics_co_sim_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_neural_physics_co_sim_soak_cmd").is_some();
    to_report(probe_neural_physics_co_sim(), wire_on_surface)
}

/// Tauri IPC — R11 Neural-Physics Co-Sim probe.
#[tauri::command]
pub fn probe_neural_physics_co_sim_cmd() -> KernelNeuralPhysicsCoSimWireReport {
    probe_neural_physics_co_sim_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNeuralPhysicsCoSimSoakWireReport {
    pub neural_physics_co_sim_ready: bool,
    pub loss_reduced: bool,
    pub trained_improves_prediction: bool,
    pub sdf_contact_detected: bool,
    pub sdf_normal_outward: bool,
    pub muscle_activation_tracks_phase: bool,
    pub capability_tier_scales: bool,
    pub impulses_bounded: bool,
    pub fail_closed_non_finite: bool,
    pub deterministic_replay: bool,
    pub hidden_units: usize,
    pub sdf_strata: usize,
    pub loss_before: f32,
    pub loss_after: f32,
    pub trained_val_mae: f32,
    pub untrained_val_mae: f32,
    pub sdf_penetration: f32,
    pub impulse_applications: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    /// S-26-owned measured vector — deterministic local co-sim ready (soak-gated).
    pub neural_physics_aaa_ready: bool,
    /// Fail-closed — no online deep-net / GPU neural / neural terrain / full rig.
    pub trained_online_deep_net_ready: bool,
    pub gpu_neural_physics_ready: bool,
    pub neural_terrain_ready: bool,
    pub full_neural_rig_ready: bool,
}

fn soak_to_wire(r: NeuralPhysicsCoSimSoakReport) -> KernelNeuralPhysicsCoSimSoakWireReport {
    KernelNeuralPhysicsCoSimSoakWireReport {
        neural_physics_co_sim_ready: r.neural_physics_co_sim_ready,
        loss_reduced: r.loss_reduced,
        trained_improves_prediction: r.trained_improves_prediction,
        sdf_contact_detected: r.sdf_contact_detected,
        sdf_normal_outward: r.sdf_normal_outward,
        muscle_activation_tracks_phase: r.muscle_activation_tracks_phase,
        capability_tier_scales: r.capability_tier_scales,
        impulses_bounded: r.impulses_bounded,
        fail_closed_non_finite: r.fail_closed_non_finite,
        deterministic_replay: r.deterministic_replay,
        hidden_units: r.hidden_units,
        sdf_strata: r.sdf_strata,
        loss_before: r.loss_before,
        loss_after: r.loss_after,
        trained_val_mae: r.trained_val_mae,
        untrained_val_mae: r.untrained_val_mae,
        sdf_penetration: r.sdf_penetration,
        impulse_applications: r.impulse_applications,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
        trained_online_deep_net_ready: r.trained_online_deep_net_ready,
        gpu_neural_physics_ready: r.gpu_neural_physics_ready,
        neural_terrain_ready: r.neural_terrain_ready,
        full_neural_rig_ready: r.full_neural_rig_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Neural-Physics Co-Sim (mesma
/// evidência medida do kernel; flags além do vetor local ownado sempre HELD,
/// nunca afirmadas).
#[tauri::command]
pub fn run_kernel_neural_physics_co_sim_soak_cmd() -> KernelNeuralPhysicsCoSimSoakWireReport {
    soak_to_wire(run_neural_physics_co_sim_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_neural_co_sim_honestly() {
        let r = probe_neural_physics_co_sim_wire();
        // Soak unificado green: co-sim local determinística.
        assert!(r.neural_physics_co_sim_ready);
        assert!(r.loss_reduced);
        assert!(r.trained_improves_prediction);
        assert!(r.sdf_contact_detected);
        assert!(r.sdf_normal_outward);
        assert!(r.muscle_activation_tracks_phase);
        assert!(r.capability_tier_scales);
        assert!(r.impulses_bounded);
        assert!(r.fail_closed_non_finite);
        assert!(r.deterministic_replay);
        // Fixture roda com capability score 70 → Law XV tier High → 32 hidden /
        // 10 strata (veja run_fixture no kernel: NeuralPhysicsCoSim::new(SOAK_SEED, 70)).
        assert_eq!(r.hidden_units, 32);
        assert_eq!(r.sdf_strata, 10);
        assert!(r.loss_after < r.loss_before, "loss {} -> {}", r.loss_before, r.loss_after);
        assert!(r.trained_val_mae < r.untrained_val_mae);
        assert!(r.sdf_penetration > 0.0);
        assert!(r.impulse_applications > 0);
        assert_eq!(r.evidence_kind, "neural_physics_contact_muscle_sdf");
        assert_ne!(r.evidence_fingerprint, 0);
        // Auto-referencial: a própria wire R11 está registrada na superfície.
        assert!(r.wire_on_surface);
        // Evidência distinta das sondas dos substratos irmãos (anti-tautologia).
        assert!(r.distinct_from_procedural_muscle_locomotion_probe);
        assert!(r.distinct_from_living_sky_probe);
        assert!(r.distinct_from_matter_thermodynamics_sph_probe);
        assert!(r.distinct_from_lattice_boltzmann_fluid_solver_probe);
        assert!(r.distinct_from_aerodynamic_navier_stokes_probe);
        assert!(r.distinct_from_stochastic_virtual_sdf_probe);
        assert!(r.distinct_from_sdf_sculptor_probe);
    }

    #[test]
    fn wire_probe_claims_only_local_aaa_readiness() {
        let r = probe_neural_physics_co_sim_wire();
        // S-26 owns um vetor local determinístico — neural_physics_aaa_ready é
        // TRUE (soak-gated) e espelhado honestamente pela wire.
        assert!(
            r.neural_physics_aaa_ready,
            "S-26 owns the local deterministic co-sim vector: aaa_ready must be true"
        );
        // Mas a wire nunca afirma vetores além do escopo local ownado.
        assert!(
            !r.trained_online_deep_net_ready,
            "honest wire must never claim online deep-net readiness"
        );
        assert!(
            !r.gpu_neural_physics_ready,
            "honest wire must never claim GPU neural-physics readiness"
        );
        assert!(
            !r.neural_terrain_ready,
            "honest wire must never claim neural-terrain readiness"
        );
        assert!(
            !r.full_neural_rig_ready,
            "honest wire must never claim full-neural-rig readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::neural_physics_co_sim::run_neural_physics_co_sim_soak(),
        );
        assert!(w.neural_physics_co_sim_ready);
        assert!(w.loss_reduced);
        assert!(w.trained_improves_prediction);
        assert!(w.sdf_contact_detected);
        assert!(w.sdf_normal_outward);
        assert!(w.muscle_activation_tracks_phase);
        assert!(w.capability_tier_scales);
        assert!(w.impulses_bounded);
        assert!(w.fail_closed_non_finite);
        assert!(w.deterministic_replay);
        assert_eq!(w.hidden_units, 32);
        assert_eq!(w.sdf_strata, 10);
        assert_eq!(w.evidence_kind, "neural_physics_contact_muscle_sdf");
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            w.neural_physics_aaa_ready
                && !w.trained_online_deep_net_ready
                && !w.gpu_neural_physics_ready
                && !w.neural_terrain_ready
                && !w.full_neural_rig_ready,
            "wire soak must only claim the S-26-owned local vector"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_neural_physics_co_sim_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

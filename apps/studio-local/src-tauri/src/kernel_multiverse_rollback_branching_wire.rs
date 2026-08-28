//! R4 — Multiverse Rollback Branching desktop wire (letter **lf**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::multiverse_rollback_branching`]
//! — a simulação de múltiplos ramos a partir de um checkpoint físico
//! compartilhado (CTI como política de seleção, budget fail-closed, rollback +
//! re-sim bit-idêntico, divergência entre ramos, authority G21) — expondo o
//! soak **fail-closed** na superfície IPC desktop. A wire espelha o report
//! completo do substrato e adiciona `wire_on_surface` (self-check do registro
//! ACL). Feed honesto do R4 — nunca afirma prontidão rollback/selection/CTI/
//! re-sim (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::multiverse_rollback_branching::{
    run_multiverse_rollback_branching_soak, MultiverseRollbackBranchingReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Multiverse Rollback Branching — espelho camelCase do
/// `MultiverseRollbackBranchingReport` do kernel mais o self-check
/// `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMultiverseRollbackBranchingWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub branch_count: u32,
    pub simulated_branches: u32,
    pub parent_fingerprint: u64,
    pub selected_branch: u32,
    pub selected_cti: f32,
    pub cti_max: f32,
    pub cti_min: f32,
    pub budget_cut: bool,
    pub cost_estimate: u64,
    pub budget_micros: f32,
    pub cost_budget_units: u64,
    pub parent_checkpoint_shared: bool,
    pub rollback_re_sim_identical: bool,
    pub divergence_detected: bool,
    pub distinct_branch_fingerprints: u32,
    pub all_outputs_finite: bool,
    pub cti_orders_aggressive_over_cautious: bool,
    pub budget_respected: bool,
    pub parent_rollback_reproduces: bool,
    pub g21_rollback_authority_green: bool,
    pub g21_fingerprint: u64,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub multiverse_rollback_aaa_ready: bool,
    pub multiverse_selection_aaa_ready: bool,
    pub multiverse_cti_aaa_ready: bool,
    pub multiverse_re_sim_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: MultiverseRollbackBranchingReport,
    wire_on_surface: bool,
) -> KernelMultiverseRollbackBranchingWireReport {
    KernelMultiverseRollbackBranchingWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        branch_count: r.branch_count,
        simulated_branches: r.simulated_branches,
        parent_fingerprint: r.parent_fingerprint,
        selected_branch: r.selected_branch,
        selected_cti: r.selected_cti,
        cti_max: r.cti_max,
        cti_min: r.cti_min,
        budget_cut: r.budget_cut,
        cost_estimate: r.cost_estimate,
        budget_micros: r.budget_micros,
        cost_budget_units: r.cost_budget_units,
        parent_checkpoint_shared: r.parent_checkpoint_shared,
        rollback_re_sim_identical: r.rollback_re_sim_identical,
        divergence_detected: r.divergence_detected,
        distinct_branch_fingerprints: r.distinct_branch_fingerprints,
        all_outputs_finite: r.all_outputs_finite,
        cti_orders_aggressive_over_cautious: r.cti_orders_aggressive_over_cautious,
        budget_respected: r.budget_respected,
        parent_rollback_reproduces: r.parent_rollback_reproduces,
        g21_rollback_authority_green: r.g21_rollback_authority_green,
        g21_fingerprint: r.g21_fingerprint,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 27 reachable peers".into(),
        letter: "lf".into(),
        note: "Multiverse branching from shared physics checkpoint, CTI policy selection, budget fail-closed, rollback re-sim bit-identical, G21 authority".into(),
        multiverse_rollback_aaa_ready: r.multiverse_rollback_aaa_ready,
        multiverse_selection_aaa_ready: r.multiverse_selection_aaa_ready,
        multiverse_cti_aaa_ready: r.multiverse_cti_aaa_ready,
        multiverse_re_sim_aaa_ready: r.multiverse_re_sim_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Multiverse Rollback Branching (letter lf).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_multiverse_rollback_branching_wire() -> KernelMultiverseRollbackBranchingWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_multiverse_rollback_branching_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_multiverse_rollback_branching_soak_cmd")
                .is_some();
    to_report(run_multiverse_rollback_branching_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Multiverse Rollback Branching probe.
#[tauri::command]
pub fn probe_multiverse_rollback_branching_cmd() -> KernelMultiverseRollbackBranchingWireReport {
    probe_multiverse_rollback_branching_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMultiverseRollbackBranchingSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub branch_count: u32,
    pub simulated_branches: u32,
    pub selected_branch: u32,
    pub selected_cti: f32,
    pub budget_cut: bool,
    pub parent_checkpoint_shared: bool,
    pub rollback_re_sim_identical: bool,
    pub divergence_detected: bool,
    pub budget_respected: bool,
    pub parent_rollback_reproduces: bool,
    pub g21_rollback_authority_green: bool,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub multiverse_rollback_aaa_ready: bool,
    pub multiverse_selection_aaa_ready: bool,
    pub multiverse_cti_aaa_ready: bool,
    pub multiverse_re_sim_aaa_ready: bool,
}

fn soak_to_wire(r: MultiverseRollbackBranchingReport) -> KernelMultiverseRollbackBranchingSoakWireReport {
    KernelMultiverseRollbackBranchingSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        branch_count: r.branch_count,
        simulated_branches: r.simulated_branches,
        selected_branch: r.selected_branch,
        selected_cti: r.selected_cti,
        budget_cut: r.budget_cut,
        parent_checkpoint_shared: r.parent_checkpoint_shared,
        rollback_re_sim_identical: r.rollback_re_sim_identical,
        divergence_detected: r.divergence_detected,
        budget_respected: r.budget_respected,
        parent_rollback_reproduces: r.parent_rollback_reproduces,
        g21_rollback_authority_green: r.g21_rollback_authority_green,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        multiverse_rollback_aaa_ready: r.multiverse_rollback_aaa_ready,
        multiverse_selection_aaa_ready: r.multiverse_selection_aaa_ready,
        multiverse_cti_aaa_ready: r.multiverse_cti_aaa_ready,
        multiverse_re_sim_aaa_ready: r.multiverse_re_sim_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Multiverse Rollback Branching
/// (mesma evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_multiverse_rollback_branching_soak_cmd(
) -> KernelMultiverseRollbackBranchingSoakWireReport {
    soak_to_wire(run_multiverse_rollback_branching_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_multiverse_rollback_honestly() {
        let r = probe_multiverse_rollback_branching_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert_eq!(r.branch_count, 4);
        assert_eq!(r.simulated_branches, 4);
        assert_ne!(r.parent_fingerprint, 0);
        assert!(r.selected_branch < r.branch_count);
        assert!(r.selected_cti.is_finite() && r.cti_max.is_finite() && r.cti_min.is_finite());
        assert!(r.budget_micros.is_finite() && r.measured_pass_micros.is_finite());
        assert!(r.parent_checkpoint_shared);
        assert!(r.rollback_re_sim_identical);
        assert!(r.divergence_detected);
        assert!(r.all_outputs_finite);
        assert!(r.cti_orders_aggressive_over_cautious);
        assert!(r.budget_respected);
        assert!(r.parent_rollback_reproduces);
        assert!(r.g21_rollback_authority_green);
        assert_ne!(r.g21_fingerprint, 0);
        assert!(r.zero_alloc_hot_loop);
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "lf");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_multiverse_rollback_branching_wire();
        assert!(
            !r.multiverse_rollback_aaa_ready,
            "honest wire must never claim multiverse rollback AAA readiness"
        );
        assert!(
            !r.multiverse_selection_aaa_ready,
            "honest wire must never claim multiverse selection AAA readiness"
        );
        assert!(
            !r.multiverse_cti_aaa_ready,
            "honest wire must never claim multiverse CTI AAA readiness"
        );
        assert!(
            !r.multiverse_re_sim_aaa_ready,
            "honest wire must never claim multiverse re-sim AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::multiverse_rollback_branching::run_multiverse_rollback_branching_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert_eq!(w.branch_count, 4);
        assert!(w.parent_checkpoint_shared && w.rollback_re_sim_identical && w.budget_respected);
        assert!(w.g21_rollback_authority_green && w.zero_alloc_hot_loop);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.multiverse_rollback_aaa_ready
                && !w.multiverse_selection_aaa_ready
                && !w.multiverse_cti_aaa_ready
                && !w.multiverse_re_sim_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_multiverse_rollback_branching_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

//! R1.3 — Task Graph Dependency System parity (S-3 Sequencing backend substrate,
//! letter **jt**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::task_graph_scheduler`]
//! — o DAG de dependências de sistemas de jogo: topo-sort Kahn determinístico
//! (tie-break por id ascendente), wavefronts paralelos de longest-path
//! (`level_count` / `max_parallel_width` exatos em um DAG em camadas conhecido),
//! detecção de ciclo **fail-closed** devolvendo a amostra concreta do ciclo,
//! dedup de arestas invariante à ordem de inserção e hot loop **zero-alloc**
//! (rayon `par_iter` + XOR-fold de hashes puros por nó) com fingerprint
//! bit-idêntico entre execução paralela e sequencial. A wire espelha o report
//! completo do substrato e adiciona `wire_on_surface` (self-check do registro
//! ACL). Feed honesto do S-register S-03/S-11 — **nunca** afirma prontidão
//! DOTS / Unreal TaskGraph / AAA (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::task_graph_scheduler::{
    probe_task_graph_scheduler, run_task_graph_soak, TaskGraphSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Task Graph Dependency System — espelho camelCase do
/// `TaskGraphSoakReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelTaskGraphSchedulerWireReport {
    pub task_graph_scheduler_ready: bool,
    pub topo_sort_ok: bool,
    pub cycle_detection_ok: bool,
    pub levels_computed: bool,
    pub parallel_execution_ok: bool,
    pub deterministic_across_build_orders: bool,
    pub same_input_same_fingerprint: bool,
    pub parallel_matches_sequential: bool,
    pub outputs_finite: bool,
    pub node_count: usize,
    pub edge_count: usize,
    pub level_count: usize,
    pub max_parallel_width: usize,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    /// Fail-closed — never claim DOTS / Unreal TaskGraph AAA.
    pub dots_aaa_ready: bool,
    pub unreal_taskgraph_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(r: TaskGraphSoakReport, wire_on_surface: bool) -> KernelTaskGraphSchedulerWireReport {
    KernelTaskGraphSchedulerWireReport {
        task_graph_scheduler_ready: r.task_graph_scheduler_ready,
        topo_sort_ok: r.topo_sort_ok,
        cycle_detection_ok: r.cycle_detection_ok,
        levels_computed: r.levels_computed,
        parallel_execution_ok: r.parallel_execution_ok,
        deterministic_across_build_orders: r.deterministic_across_build_orders,
        same_input_same_fingerprint: r.same_input_same_fingerprint,
        parallel_matches_sequential: r.parallel_matches_sequential,
        outputs_finite: r.outputs_finite,
        node_count: r.node_count,
        edge_count: r.edge_count,
        level_count: r.level_count,
        max_parallel_width: r.max_parallel_width,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        dots_aaa_ready: r.dots_aaa_ready,
        unreal_taskgraph_aaa_ready: r.unreal_taskgraph_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R1.3 Task Graph Dependency System (letter jt).
///
/// Roda o soak determinístico do kernel (topo-sort + wavefronts + ciclo
/// fail-closed + determinismo de fingerprint paralelo×sequencial) e reporta a
/// paridade completa. A wire também se auto-verifica: `wire_on_surface` é
/// `true` apenas quando os dois comandos (probe + soak) estão no
/// `IPC_ACL_REGISTRY` de runtime.
pub fn probe_task_graph_scheduler_wire() -> KernelTaskGraphSchedulerWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_task_graph_scheduler_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_task_graph_scheduler_soak_cmd").is_some();
    to_report(probe_task_graph_scheduler(), wire_on_surface)
}

/// Tauri IPC — R1.3 Task Graph Dependency System probe.
#[tauri::command]
pub fn probe_task_graph_scheduler_cmd() -> KernelTaskGraphSchedulerWireReport {
    probe_task_graph_scheduler_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelTaskGraphSchedulerSoakWireReport {
    pub task_graph_scheduler_ready: bool,
    pub topo_sort_ok: bool,
    pub cycle_detection_ok: bool,
    pub levels_computed: bool,
    pub parallel_matches_sequential: bool,
    pub deterministic_across_build_orders: bool,
    pub outputs_finite: bool,
    pub node_count: usize,
    pub edge_count: usize,
    pub level_count: usize,
    pub max_parallel_width: usize,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub dots_aaa_ready: bool,
    pub unreal_taskgraph_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn soak_to_wire(r: TaskGraphSoakReport) -> KernelTaskGraphSchedulerSoakWireReport {
    KernelTaskGraphSchedulerSoakWireReport {
        task_graph_scheduler_ready: r.task_graph_scheduler_ready,
        topo_sort_ok: r.topo_sort_ok,
        cycle_detection_ok: r.cycle_detection_ok,
        levels_computed: r.levels_computed,
        parallel_matches_sequential: r.parallel_matches_sequential,
        deterministic_across_build_orders: r.deterministic_across_build_orders,
        outputs_finite: r.outputs_finite,
        node_count: r.node_count,
        edge_count: r.edge_count,
        level_count: r.level_count,
        max_parallel_width: r.max_parallel_width,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        dots_aaa_ready: r.dots_aaa_ready,
        unreal_taskgraph_aaa_ready: r.unreal_taskgraph_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Task Graph Dependency System (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_task_graph_scheduler_soak_cmd() -> KernelTaskGraphSchedulerSoakWireReport {
    soak_to_wire(run_task_graph_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_task_graph_honestly() {
        let r = probe_task_graph_scheduler_wire();
        // Soak determinístico green: topo-sort + wavefronts + ciclo fail-closed.
        assert!(r.task_graph_scheduler_ready);
        assert!(r.topo_sort_ok);
        assert!(r.cycle_detection_ok);
        assert!(r.levels_computed);
        assert!(r.parallel_execution_ok);
        assert!(r.deterministic_across_build_orders);
        assert!(r.same_input_same_fingerprint);
        assert!(r.parallel_matches_sequential);
        assert!(r.outputs_finite);
        // DAG em camadas conhecido: 5 wavefronts × 8 sistemas = 40 nós.
        assert_eq!(r.node_count, 40);
        assert_eq!(r.level_count, 5);
        assert_eq!(r.max_parallel_width, 8);
        assert!(r.edge_count > 0);
        assert_eq!(r.evidence_kind, "deterministic_dag_wavefront_xor_fold");
        assert_ne!(r.evidence_fingerprint, 0);
        // Auto-referencial: a própria wire R1.3 está registrada na superfície.
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_task_graph_scheduler_wire();
        assert!(
            !r.dots_aaa_ready,
            "honest wire must never claim DOTS AAA readiness"
        );
        assert!(
            !r.unreal_taskgraph_aaa_ready,
            "honest wire must never claim Unreal TaskGraph AAA readiness"
        );
        assert!(!r.coins_ready, "honest wire must never claim Coins readiness");
        assert!(!r.agones_ready, "honest wire must never claim Agones readiness");
        assert!(!r.nanite_ready, "honest wire must never claim Nanite readiness");
        assert!(!r.dlss_ready, "honest wire must never claim DLSS readiness");
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(aethel_kernel_rust::task_graph_scheduler::run_task_graph_soak());
        assert!(w.task_graph_scheduler_ready);
        assert!(w.topo_sort_ok);
        assert!(w.cycle_detection_ok);
        assert!(w.levels_computed);
        assert!(w.parallel_matches_sequential);
        assert!(w.deterministic_across_build_orders);
        assert_eq!(w.node_count, 40);
        assert_eq!(w.level_count, 5);
        assert_eq!(w.max_parallel_width, 8);
        assert_eq!(w.evidence_kind, "deterministic_dag_wavefront_xor_fold");
        assert!(
            !w.dots_aaa_ready
                && !w.unreal_taskgraph_aaa_ready
                && !w.coins_ready
                && !w.agones_ready
                && !w.nanite_ready
                && !w.dlss_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo dos campos determinísticos: o fingerprint estrutural do
        // probe espelha o do soak (mesmo DAG em camadas, mesmo XOR-fold).
        //
        // Nota: `evidence_fingerprint` do kernel mistura `soak_elapsed_ns`
        // (wall-clock, linha ~707 do substrate), então é run-variant — como no
        // `probe_matches_soak` de fiber_job_system, comparamos os campos
        // determinísticos e afirmamos o fingerprint não-zero em ambos.
        let probe = probe_task_graph_scheduler_wire();
        assert_eq!(probe.node_count, w.node_count);
        assert_eq!(probe.edge_count, w.edge_count);
        assert_eq!(probe.level_count, w.level_count);
        assert_eq!(probe.max_parallel_width, w.max_parallel_width);
        assert_eq!(probe.evidence_kind, w.evidence_kind);
        assert!(probe.parallel_matches_sequential && w.parallel_matches_sequential);
        assert!(probe.deterministic_across_build_orders && w.deterministic_across_build_orders);
        assert_ne!(probe.evidence_fingerprint, 0);
        assert_ne!(w.evidence_fingerprint, 0);
    }
}

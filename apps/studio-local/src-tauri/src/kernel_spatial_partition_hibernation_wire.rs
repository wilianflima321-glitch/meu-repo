//! R1.4 — Spatial Partition + Cell Hibernation Broadphase parity (S-11/S-15
//! backend substrate, letter **hg**).
//!
//! Espelha a autoridade do kernel
//! [`aethel_kernel_rust::spatial_partition_hibernation`] — o grid 3D uniforme
//! determinístico (spatial hash de open-addressing, célula única por body via
//! centro de AABB, probing linear, cap de bodies por célula) com **hibernação de
//! células**: bodies lentos acumulam `sleep_frames` e dormem após o limiar;
//! uma célula dorme quando todos os ocupantes dormem; `wake-on-demand` reativa
//! um body e sua célula, `wake-on-contact` reacende o parceiro lento no mesmo
//! slot (contador real `wake_on_contact_wakes`), e impulso acima do limiar
//! mantém o body acordado. O broadphase emite pares **apenas das células
//! acordadas** — bit-idêntico ao brute-force de cell-sharing em frame 0,
//! colapsando para `{(2,3)}` em frame 30 (6 corpos dormindo, 1 célula acordada)
//! e reexpandindo para `{(0,1),(2,3)}` após `wake_body(0)`. Hot loop
//! **zero-alloc** (todos os buffers pré-alocados em `new`, capacidade invariante
//! em 31 frames). A wire espelha o report completo do substrato e adiciona
//! `wire_on_surface` (self-check do registro ACL). Distinção medida vs os pares
//! de broadphase reais: io ([`aethel_kernel_rust::matter_thermodynamics_sph`]
//! `sph_evidence_fingerprint`), hs ([`aethel_kernel_rust::unified_field_network`]
//! `evidence_fingerprint`), fw ([`aethel_kernel_rust::quantum_overlap`]
//! `fingerprint`), ip4 ([`aethel_kernel_rust::svo_terrain_world_partition`]
//! `fingerprint`) e s17 ([`aethel_kernel_rust::physics_world`]
//! `evidence_fingerprint`) e jt ([`aethel_kernel_rust::task_graph_scheduler`]
//! `evidence_fingerprint`). Feed honesto do S-register S-11/S-15 — **nunca**
//! afirma prontidão Chaos / PhysX Sleeping / GPU broadphase AAA (flags HELD no
//! kernel, espelhadas aqui).

use aethel_kernel_rust::spatial_partition_hibernation::{
    probe_spatial_partition_hibernation, run_spatial_partition_hibernation_soak,
    SpatialPartitionHibernationSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Spatial Partition + Cell Hibernation Broadphase — espelho
/// camelCase do `SpatialPartitionHibernationSoakReport` do kernel mais o
/// self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSpatialPartitionHibernationWireReport {
    pub spatial_partition_hibernation_ready: bool,
    pub pairs_match_brute_force: bool,
    pub hibernation_deterministic: bool,
    pub cell_hibernation_ok: bool,
    pub wake_on_contact_ok: bool,
    pub wake_on_demand_ok: bool,
    pub zero_alloc_hot_loop_ok: bool,
    pub frame0_pair_count: u32,
    pub frame30_pair_count: u32,
    pub after_wake_pair_count: u32,
    pub sleeping_bodies_at_frame30: u32,
    pub awake_cells_at_frame30: u32,
    pub frame0_pairs: Vec<(u32, u32)>,
    pub frame30_pairs: Vec<(u32, u32)>,
    pub after_wake_pairs: Vec<(u32, u32)>,
    pub grid_hash_collisions: u64,
    pub wake_on_contact_wakes: u64,
    pub soak_frames: u32,
    pub soak_elapsed_ns: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    // Distinctness — measured against real peer probes, never hard-coded true.
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    /// Fail-closed — never claim Chaos / PhysX Sleeping / GPU broadphase AAA.
    pub chaos_broadphase_aaa_ready: bool,
    pub physx_sleeping_aaa_ready: bool,
    pub gpu_broadphase_aaa_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: SpatialPartitionHibernationSoakReport,
    wire_on_surface: bool,
) -> KernelSpatialPartitionHibernationWireReport {
    KernelSpatialPartitionHibernationWireReport {
        spatial_partition_hibernation_ready: r.spatial_partition_hibernation_ready,
        pairs_match_brute_force: r.pairs_match_brute_force,
        hibernation_deterministic: r.hibernation_deterministic,
        cell_hibernation_ok: r.cell_hibernation_ok,
        wake_on_contact_ok: r.wake_on_contact_ok,
        wake_on_demand_ok: r.wake_on_demand_ok,
        zero_alloc_hot_loop_ok: r.zero_alloc_hot_loop_ok,
        frame0_pair_count: r.frame0_pair_count,
        frame30_pair_count: r.frame30_pair_count,
        after_wake_pair_count: r.after_wake_pair_count,
        sleeping_bodies_at_frame30: r.sleeping_bodies_at_frame30,
        awake_cells_at_frame30: r.awake_cells_at_frame30,
        frame0_pairs: r.frame0_pairs,
        frame30_pairs: r.frame30_pairs,
        after_wake_pairs: r.after_wake_pairs,
        grid_hash_collisions: r.grid_hash_collisions,
        wake_on_contact_wakes: r.wake_on_contact_wakes,
        soak_frames: r.soak_frames,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        chaos_broadphase_aaa_ready: r.chaos_broadphase_aaa_ready,
        physx_sleeping_aaa_ready: r.physx_sleeping_aaa_ready,
        gpu_broadphase_aaa_ready: r.gpu_broadphase_aaa_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R1.4 Spatial Partition + Cell Hibernation Broadphase (letter
/// hg).
///
/// Roda o soak determinístico do kernel (paridade exata vs brute-force em frame
/// 0, hibernação de células bit-determinística até frame 30, wake-on-contact com
/// contador real, wake-on-demand, zero-alloc) e reporta a paridade completa. A
/// wire também se auto-verifica: `wire_on_surface` é `true` apenas quando os
/// dois comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_spatial_partition_hibernation_wire() -> KernelSpatialPartitionHibernationWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_spatial_partition_hibernation_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_spatial_partition_hibernation_soak_cmd")
                .is_some();
    to_report(probe_spatial_partition_hibernation(), wire_on_surface)
}

/// Tauri IPC — R1.4 Spatial Partition + Cell Hibernation Broadphase probe.
#[tauri::command]
pub fn probe_spatial_partition_hibernation_cmd() -> KernelSpatialPartitionHibernationWireReport {
    probe_spatial_partition_hibernation_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSpatialPartitionHibernationSoakWireReport {
    pub spatial_partition_hibernation_ready: bool,
    pub pairs_match_brute_force: bool,
    pub hibernation_deterministic: bool,
    pub cell_hibernation_ok: bool,
    pub wake_on_contact_ok: bool,
    pub wake_on_demand_ok: bool,
    pub zero_alloc_hot_loop_ok: bool,
    pub frame0_pair_count: u32,
    pub frame30_pair_count: u32,
    pub after_wake_pair_count: u32,
    pub sleeping_bodies_at_frame30: u32,
    pub awake_cells_at_frame30: u32,
    pub frame0_pairs: Vec<(u32, u32)>,
    pub frame30_pairs: Vec<(u32, u32)>,
    pub after_wake_pairs: Vec<(u32, u32)>,
    pub grid_hash_collisions: u64,
    pub wake_on_contact_wakes: u64,
    pub soak_frames: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub chaos_broadphase_aaa_ready: bool,
    pub physx_sleeping_aaa_ready: bool,
    pub gpu_broadphase_aaa_ready: bool,
}

fn soak_to_wire(
    r: SpatialPartitionHibernationSoakReport,
) -> KernelSpatialPartitionHibernationSoakWireReport {
    KernelSpatialPartitionHibernationSoakWireReport {
        spatial_partition_hibernation_ready: r.spatial_partition_hibernation_ready,
        pairs_match_brute_force: r.pairs_match_brute_force,
        hibernation_deterministic: r.hibernation_deterministic,
        cell_hibernation_ok: r.cell_hibernation_ok,
        wake_on_contact_ok: r.wake_on_contact_ok,
        wake_on_demand_ok: r.wake_on_demand_ok,
        zero_alloc_hot_loop_ok: r.zero_alloc_hot_loop_ok,
        frame0_pair_count: r.frame0_pair_count,
        frame30_pair_count: r.frame30_pair_count,
        after_wake_pair_count: r.after_wake_pair_count,
        sleeping_bodies_at_frame30: r.sleeping_bodies_at_frame30,
        awake_cells_at_frame30: r.awake_cells_at_frame30,
        frame0_pairs: r.frame0_pairs,
        frame30_pairs: r.frame30_pairs,
        after_wake_pairs: r.after_wake_pairs,
        grid_hash_collisions: r.grid_hash_collisions,
        wake_on_contact_wakes: r.wake_on_contact_wakes,
        soak_frames: r.soak_frames,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        chaos_broadphase_aaa_ready: r.chaos_broadphase_aaa_ready,
        physx_sleeping_aaa_ready: r.physx_sleeping_aaa_ready,
        gpu_broadphase_aaa_ready: r.gpu_broadphase_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Spatial Partition + Cell Hibernation
/// Broadphase (mesma evidência medida do kernel; flags AAA sempre HELD, nunca
/// afirmadas).
#[tauri::command]
pub fn run_kernel_spatial_partition_hibernation_soak_cmd(
) -> KernelSpatialPartitionHibernationSoakWireReport {
    soak_to_wire(run_spatial_partition_hibernation_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_spatial_partition_hibernation_honestly() {
        let r = probe_spatial_partition_hibernation_wire();
        // Soak determinístico green: paridade exata vs brute-force, hibernação
        // de células bit-determinística, wake-on-contact e wake-on-demand.
        assert!(r.spatial_partition_hibernation_ready);
        assert!(r.pairs_match_brute_force);
        assert!(r.hibernation_deterministic);
        assert!(r.cell_hibernation_ok);
        assert!(r.wake_on_contact_ok);
        assert!(r.wake_on_demand_ok);
        assert!(r.zero_alloc_hot_loop_ok);
        // Cena determinística de 8 corpos em 4 células:
        // frame 0 = 4 pares, frame 30 = 1 par (6 dormindo / 1 célula acordada),
        // pós wake_body(0) = 2 pares.
        assert_eq!(r.frame0_pair_count, 4);
        assert_eq!(r.frame30_pair_count, 1);
        assert_eq!(r.after_wake_pair_count, 2);
        assert_eq!(r.sleeping_bodies_at_frame30, 6);
        assert_eq!(r.awake_cells_at_frame30, 1);
        assert_eq!(r.frame0_pairs, vec![(0, 1), (2, 3), (4, 5), (6, 7)]);
        assert_eq!(r.frame30_pairs, vec![(2, 3)]);
        assert_eq!(r.after_wake_pairs, vec![(0, 1), (2, 3)]);
        // Wake-on-contact provado por contador real (b3 reacendido no frame 29).
        assert!(r.wake_on_contact_wakes >= 1);
        assert_eq!(r.soak_frames, 31);
        assert_eq!(
            r.evidence_kind,
            "uniform_grid_cell_hibernation_broadphase"
        );
        assert_ne!(r.evidence_fingerprint, 0);
        // Distinção medida vs os 6 peers reais (nunca hard-coded).
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        // Auto-referencial: a própria wire R1.4 está registrada na superfície.
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_spatial_partition_hibernation_wire();
        assert!(
            !r.chaos_broadphase_aaa_ready,
            "honest wire must never claim Chaos broadphase AAA readiness"
        );
        assert!(
            !r.physx_sleeping_aaa_ready,
            "honest wire must never claim PhysX Sleeping AAA readiness"
        );
        assert!(
            !r.gpu_broadphase_aaa_ready,
            "honest wire must never claim GPU broadphase AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(aethel_kernel_rust::spatial_partition_hibernation::run_spatial_partition_hibernation_soak());
        assert!(w.spatial_partition_hibernation_ready);
        assert!(w.pairs_match_brute_force);
        assert!(w.hibernation_deterministic);
        assert!(w.cell_hibernation_ok);
        assert!(w.wake_on_contact_ok);
        assert!(w.wake_on_demand_ok);
        assert!(w.zero_alloc_hot_loop_ok);
        assert_eq!(w.frame0_pair_count, 4);
        assert_eq!(w.frame30_pair_count, 1);
        assert_eq!(w.after_wake_pair_count, 2);
        assert_eq!(w.sleeping_bodies_at_frame30, 6);
        assert_eq!(w.awake_cells_at_frame30, 1);
        assert_eq!(w.frame0_pairs, vec![(0, 1), (2, 3), (4, 5), (6, 7)]);
        assert_eq!(w.frame30_pairs, vec![(2, 3)]);
        assert_eq!(w.after_wake_pairs, vec![(0, 1), (2, 3)]);
        assert!(w.wake_on_contact_wakes >= 1);
        assert_eq!(w.soak_frames, 31);
        assert_eq!(
            w.evidence_kind,
            "uniform_grid_cell_hibernation_broadphase"
        );
        assert!(
            !w.chaos_broadphase_aaa_ready
                && !w.physx_sleeping_aaa_ready
                && !w.gpu_broadphase_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo dos campos determinísticos: o fingerprint estrutural do
        // probe espelha o do soak (mesma cena de 8 corpos, mesmo replay de 31
        // frames, mesmo XOR-fold).
        //
        // Nota: `evidence_fingerprint` do kernel não mistura `soak_elapsed_ns`
        // (a linha ~731 do substrato grava o wall-clock apenas no report), então
        // é run-invariant — ainda assim comparamos os campos determinísticos e
        // afirmamos o fingerprint não-zero em ambos.
        let probe = probe_spatial_partition_hibernation_wire();
        assert_eq!(probe.frame0_pairs, w.frame0_pairs);
        assert_eq!(probe.frame30_pairs, w.frame30_pairs);
        assert_eq!(probe.after_wake_pairs, w.after_wake_pairs);
        assert_eq!(probe.sleeping_bodies_at_frame30, w.sleeping_bodies_at_frame30);
        assert_eq!(probe.awake_cells_at_frame30, w.awake_cells_at_frame30);
        assert_eq!(probe.wake_on_contact_wakes, w.wake_on_contact_wakes);
        assert_eq!(probe.grid_hash_collisions, w.grid_hash_collisions);
        assert_eq!(probe.evidence_kind, w.evidence_kind);
        assert!(probe.pairs_match_brute_force && w.pairs_match_brute_force);
        assert!(probe.cell_hibernation_ok && w.cell_hibernation_ok);
        assert!(probe.wake_on_contact_ok && w.wake_on_contact_ok);
        assert!(probe.wake_on_demand_ok && w.wake_on_demand_ok);
        assert_ne!(probe.evidence_fingerprint, 0);
        assert_ne!(w.evidence_fingerprint, 0);
    }
}

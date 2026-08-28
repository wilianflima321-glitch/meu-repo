//! R2-K — Cinema hot-loop composition parity wire (Vanguarda P1/P3, letter ky).
//!
//! Expõe o substrate [`aethel_kernel_rust::cinema_hot_loop_composition`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico do render-graph wgpu desktop no hot loop nativo.
//! `wire_on_surface` é um self-check real: `true` somente quando ambos os comandos
//! desta wire existem no `IPC_ACL_REGISTRY` (`probe_cinema_hot_loop_composition_cmd`
//! + `run_kernel_cinema_hot_loop_composition_soak_cmd`). A wire compõe sobre os
//! substrates reais com **zero edits**: R2-E `dynamic_shader_rewriter` (PSO Vault
//! km — pré-cozinha determinística de 5 keys de composição cinema
//! DepthToCoc→LensDof→AcesTonemap→Composite + 1 pass culled `Unused` no
//! ShaderCooker), R2-J `cinema_frame_graph_composition` (kx — `ComposeCinemaFrameGraph::compose`
//! com Trava Lei XVI via `CreativeFusionTransaction`) e o hot loop 4096×4 com
//! **zero PSO misses** (`vault_miss_count == 0`, `vault_hit_rate() == 1.0`).
//! **VERIFY:** o cook nunca falha, todos os slots compilam (all_slots_compiled),
//! o vault está ordenado (vault_sorted), backbuffer é alcançado e o replay é
//! determinístico (mesmo evidence fingerprint em passes duplos). Flags AAA
//! (`gpu_pso_prewarm` / `pso_stutter_free` / `async_compile` / `disk_pipeline_cache` /
//! `cinema_frame_graph` / `depth_of_field` / `prores_export`) sempre HELD — esta
//! wire prova o hot loop determinístico e fail-closed, não um shipment render AAA.

use aethel_kernel_rust::cinema_hot_loop_composition::{
    probe_cinema_hot_loop_composition, run_cinema_hot_loop_composition_soak,
    CinemaHotLoopCompositionReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCinemaHotLoopCompositionWireReport {
    pub cinema_hot_loop_composition_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    // Hot-loop PSO vault (edge R2-E → R2-K, letter km).
    pub composition_stage_count: u32,
    pub reachable_pipeline_count: usize,
    pub vault_used: usize,
    pub vault_capacity: usize,
    pub hot_loop_iterations: u64,
    pub vault_hit_count: u64,
    pub vault_miss_count: u64,
    pub vault_hit_rate: f32,
    pub cook_complete: bool,
    pub cook_failed: bool,
    pub cook_progress_pct: u32,
    pub probe_all_resident: bool,
    pub all_slots_compiled: bool,
    pub vault_sorted: bool,
    // Cinema composition (edge R2-J → R2-K, letter kx).
    pub composition_ok: bool,
    pub live_pass_count: u32,
    pub executed_pass_count: u32,
    pub backbuffer_reached: bool,
    pub depth_resource_alive: bool,
    pub zero_loss_master: bool,
    pub replay_deterministic: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub gpu_pso_prewarm_ready: bool,
    pub pso_stutter_free_guarantee: bool,
    pub async_compile_engine: bool,
    pub disk_pipeline_cache: bool,
    pub cinema_frame_graph_aaa_ready: bool,
    pub depth_of_field_aaa_ready: bool,
    pub prores_export_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: CinemaHotLoopCompositionReport,
    wire_on_surface: bool,
) -> KernelCinemaHotLoopCompositionWireReport {
    KernelCinemaHotLoopCompositionWireReport {
        cinema_hot_loop_composition_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        composition_stage_count: r.composition_stage_count,
        reachable_pipeline_count: r.reachable_pipeline_count,
        vault_used: r.vault_used,
        vault_capacity: r.vault_capacity,
        hot_loop_iterations: r.hot_loop_iterations,
        vault_hit_count: r.vault_hit_count,
        vault_miss_count: r.vault_miss_count,
        vault_hit_rate: r.vault_hit_rate,
        cook_complete: r.cook_complete,
        cook_failed: r.cook_failed,
        cook_progress_pct: r.cook_progress_pct,
        probe_all_resident: r.probe_all_resident,
        all_slots_compiled: r.all_slots_compiled,
        vault_sorted: r.vault_sorted,
        composition_ok: r.composition_ok,
        live_pass_count: r.live_pass_count,
        executed_pass_count: r.executed_pass_count,
        backbuffer_reached: r.backbuffer_reached,
        depth_resource_alive: r.depth_resource_alive,
        zero_loss_master: r.zero_loss_master,
        replay_deterministic: r.replay_deterministic,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite_and_bounded: r.all_finite_and_bounded,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_ju_sequencing_timeline: r.distinct_from_ju_sequencing_timeline,
        distinct_from_kv_wind_field: r.distinct_from_kv_wind_field,
        distinct_from_ku_world_forge: r.distinct_from_ku_world_forge,
        distinct_from_hg_spatial_grid: r.distinct_from_hg_spatial_grid,
        distinct_from_kq_sdf_contact: r.distinct_from_kq_sdf_contact,
        distinct_from_kr_micro_shadow: r.distinct_from_kr_micro_shadow,
        distinct_from_ks_deformation: r.distinct_from_ks_deformation,
        distinct_from_kt_async_compute: r.distinct_from_kt_async_compute,
        distinct_from_ko_euphoria: r.distinct_from_ko_euphoria,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        distinct_from_kw_auto_photography: r.distinct_from_kw_auto_photography,
        distinct_from_kx_cinema_frame_graph_composition: r
            .distinct_from_kx_cinema_frame_graph_composition,
        gpu_pso_prewarm_ready: r.gpu_pso_prewarm_ready,
        pso_stutter_free_guarantee: r.pso_stutter_free_guarantee,
        async_compile_engine: r.async_compile_engine,
        disk_pipeline_cache: r.disk_pipeline_cache,
        cinema_frame_graph_aaa_ready: r.cinema_frame_graph_aaa_ready,
        depth_of_field_aaa_ready: r.depth_of_field_aaa_ready,
        prores_export_aaa_ready: r.prores_export_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_cinema_hot_loop_composition_wire() -> KernelCinemaHotLoopCompositionWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_cinema_hot_loop_composition_cmd")
        .is_some()
        && crate::ipc_surface::acl_for("run_kernel_cinema_hot_loop_composition_soak_cmd").is_some();
    to_report(probe_cinema_hot_loop_composition(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_cinema_hot_loop_composition_cmd() -> KernelCinemaHotLoopCompositionWireReport {
    probe_cinema_hot_loop_composition_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCinemaHotLoopCompositionSoakWireReport {
    pub cinema_hot_loop_composition_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    // Hot-loop PSO vault (edge R2-E → R2-K, letter km).
    pub composition_stage_count: u32,
    pub reachable_pipeline_count: usize,
    pub vault_used: usize,
    pub vault_capacity: usize,
    pub hot_loop_iterations: u64,
    pub vault_hit_count: u64,
    pub vault_miss_count: u64,
    pub vault_hit_rate: f32,
    pub cook_complete: bool,
    pub cook_failed: bool,
    pub cook_progress_pct: u32,
    pub probe_all_resident: bool,
    pub all_slots_compiled: bool,
    pub vault_sorted: bool,
    // Cinema composition (edge R2-J → R2-K, letter kx).
    pub composition_ok: bool,
    pub live_pass_count: u32,
    pub executed_pass_count: u32,
    pub backbuffer_reached: bool,
    pub depth_resource_alive: bool,
    pub zero_loss_master: bool,
    pub replay_deterministic: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub gpu_pso_prewarm_ready: bool,
    pub pso_stutter_free_guarantee: bool,
    pub async_compile_engine: bool,
    pub disk_pipeline_cache: bool,
    pub cinema_frame_graph_aaa_ready: bool,
    pub depth_of_field_aaa_ready: bool,
    pub prores_export_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: CinemaHotLoopCompositionReport) -> KernelCinemaHotLoopCompositionSoakWireReport {
    KernelCinemaHotLoopCompositionSoakWireReport {
        cinema_hot_loop_composition_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        composition_stage_count: r.composition_stage_count,
        reachable_pipeline_count: r.reachable_pipeline_count,
        vault_used: r.vault_used,
        vault_capacity: r.vault_capacity,
        hot_loop_iterations: r.hot_loop_iterations,
        vault_hit_count: r.vault_hit_count,
        vault_miss_count: r.vault_miss_count,
        vault_hit_rate: r.vault_hit_rate,
        cook_complete: r.cook_complete,
        cook_failed: r.cook_failed,
        cook_progress_pct: r.cook_progress_pct,
        probe_all_resident: r.probe_all_resident,
        all_slots_compiled: r.all_slots_compiled,
        vault_sorted: r.vault_sorted,
        composition_ok: r.composition_ok,
        live_pass_count: r.live_pass_count,
        executed_pass_count: r.executed_pass_count,
        backbuffer_reached: r.backbuffer_reached,
        depth_resource_alive: r.depth_resource_alive,
        zero_loss_master: r.zero_loss_master,
        replay_deterministic: r.replay_deterministic,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite_and_bounded: r.all_finite_and_bounded,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_ju_sequencing_timeline: r.distinct_from_ju_sequencing_timeline,
        distinct_from_kv_wind_field: r.distinct_from_kv_wind_field,
        distinct_from_ku_world_forge: r.distinct_from_ku_world_forge,
        distinct_from_hg_spatial_grid: r.distinct_from_hg_spatial_grid,
        distinct_from_kq_sdf_contact: r.distinct_from_kq_sdf_contact,
        distinct_from_kr_micro_shadow: r.distinct_from_kr_micro_shadow,
        distinct_from_ks_deformation: r.distinct_from_ks_deformation,
        distinct_from_kt_async_compute: r.distinct_from_kt_async_compute,
        distinct_from_ko_euphoria: r.distinct_from_ko_euphoria,
        distinct_from_io_sph_probe: r.distinct_from_io_sph_probe,
        distinct_from_hs_field_network_probe: r.distinct_from_hs_field_network_probe,
        distinct_from_fw_quantum_overlap_probe: r.distinct_from_fw_quantum_overlap_probe,
        distinct_from_ip4_svo_terrain_probe: r.distinct_from_ip4_svo_terrain_probe,
        distinct_from_s17_physics_world_probe: r.distinct_from_s17_physics_world_probe,
        distinct_from_jt_task_graph_probe: r.distinct_from_jt_task_graph_probe,
        distinct_from_kw_auto_photography: r.distinct_from_kw_auto_photography,
        distinct_from_kx_cinema_frame_graph_composition: r
            .distinct_from_kx_cinema_frame_graph_composition,
        gpu_pso_prewarm_ready: r.gpu_pso_prewarm_ready,
        pso_stutter_free_guarantee: r.pso_stutter_free_guarantee,
        async_compile_engine: r.async_compile_engine,
        disk_pipeline_cache: r.disk_pipeline_cache,
        cinema_frame_graph_aaa_ready: r.cinema_frame_graph_aaa_ready,
        depth_of_field_aaa_ready: r.depth_of_field_aaa_ready,
        prores_export_aaa_ready: r.prores_export_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (hot-loop cinema composition replay
/// bit-idêntico — VERIFY: cook completo sem falha, 5 keys pré-cozinhadas no PSO
/// Vault do R2-E, hot loop 4096×4 com zero PSO misses, backbuffer alcançado,
/// replay determinístico no evidence fingerprint; Trava Lei XVI: transação
/// aberta → mutações; após commit → rejeição).
#[tauri::command]
pub fn run_kernel_cinema_hot_loop_composition_soak_cmd() -> KernelCinemaHotLoopCompositionSoakWireReport {
    soak_to_wire(run_cinema_hot_loop_composition_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_cinema_hot_loop_composition_honestly() {
        let r = probe_cinema_hot_loop_composition_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.cinema_hot_loop_composition_ready,
            probe_cinema_hot_loop_composition().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_cinema_hot_loop_composition().evidence_fingerprint
        );
        assert_eq!(
            r.hot_loop_iterations,
            probe_cinema_hot_loop_composition().hot_loop_iterations
        );
        assert_eq!(
            r.vault_miss_count,
            probe_cinema_hot_loop_composition().vault_miss_count
        );
        assert_eq!(
            r.composition_stage_count,
            probe_cinema_hot_loop_composition().composition_stage_count
        );
        assert_eq!(
            r.live_pass_count,
            probe_cinema_hot_loop_composition().live_pass_count
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_cinema_hot_loop_composition_wire();
        assert!(
            !r.gpu_pso_prewarm_ready
                && !r.pso_stutter_free_guarantee
                && !r.async_compile_engine
                && !r.disk_pipeline_cache,
            "PSO hot-loop AAA flags must stay HELD"
        );
        assert!(
            !r.cinema_frame_graph_aaa_ready
                && !r.depth_of_field_aaa_ready
                && !r.prores_export_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_cinema_hot_loop_composition_soak());
        let kernel = run_cinema_hot_loop_composition_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.cinema_hot_loop_composition_ready,
            kernel.ready
        );
        assert_eq!(soak.hot_loop_iterations, kernel.hot_loop_iterations);
        assert_eq!(soak.vault_miss_count, kernel.vault_miss_count);
        assert_eq!(soak.live_pass_count, kernel.live_pass_count);
        assert_eq!(soak.executed_pass_count, kernel.executed_pass_count);
        assert!(soak.cook_complete && !soak.cook_failed);
        assert!(soak.probe_all_resident && soak.all_slots_compiled && soak.vault_sorted);
        assert!(soak.backbuffer_reached);
        assert!(soak.distinct_from_kx_cinema_frame_graph_composition);
        assert!(soak.distinct_from_kw_auto_photography);
        assert!(soak.distinct_from_ju_sequencing_timeline);
        assert!(
            !soak.gpu_pso_prewarm_ready
                && !soak.pso_stutter_free_guarantee
                && !soak.async_compile_engine
                && !soak.disk_pipeline_cache,
            "soak wire report keeps PSO AAA flags HELD"
        );
        assert!(
            !soak.cinema_frame_graph_aaa_ready
                && !soak.depth_of_field_aaa_ready
                && !soak.prores_export_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

//! R2-J — Cinema Frame-Graph Depth Composition parity wire (Vanguarda P4/P1, letter kx).
//!
//! Expõe o substrate [`aethel_kernel_rust::cinema_frame_graph_composition`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico da composição lente/cinema dentro do `WgpuFramegraph`.
//! `wire_on_surface` é um self-check real: `true` somente quando ambos os comandos
//! desta wire existem no `IPC_ACL_REGISTRY` (`probe_cinema_frame_graph_composition_cmd`
//! + `run_kernel_cinema_frame_graph_composition_soak_cmd`). A wire compõe sobre os
//! substrates reais com **zero edits**: R2-I `auto_photography_director` (shot
//! colocado → distância focal), `wgpu_framegraph` (passes Depth→CoC→LensDof→
//! AcesTonemap→Composite + 1 pass não-usada), `aces_cinematic_tonemapper` (lens
//! buffer ACES real + fit RRT/ODT em HIGH_LUM) e `sequencing_timeline` +
//! `in_engine_compositor_zero_loss` (`compose_cinema_frame` — master zero-loss).
//! **VERIFY DEPTH:** o recurso de profundidade sobrevive ao culling do compile, o
//! CoC é finito/limitado/zero-no-focal/monotônico em |depth−focal|, e a profundidade
//! medida da composição casa com os passes vivos (executed==live==4). Carrega a
//! **Trava Lei XVI** (reusa a `CreativeFusionTransaction` do R2-I: `compose` exige
//! transação aberta; mutações após commit rejeitadas). Flags AAA
//! (`cinema_frame_graph` / `depth_of_field` / `prores_export`) sempre HELD — esta
//! wire prova a composição determinística e fail-closed, não um shipment render AAA.

use aethel_kernel_rust::cinema_frame_graph_composition::{
    probe_cinema_frame_graph_composition, run_cinema_frame_graph_composition_soak,
    CinemaFrameGraphCompositionSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCinemaFrameGraphCompositionWireReport {
    pub cinema_frame_graph_composition_ready: bool,
    pub focal_distance_m: f32,
    pub composition_ok: bool,
    pub depth_resource_alive: bool,
    pub unused_pass_culled: bool,
    pub composition_depth_matches_live_passes: bool,
    pub coc_all_finite: bool,
    pub coc_all_bounded: bool,
    pub coc_zero_at_focal: bool,
    pub coc_monotonic_in_abs_depth_focal: bool,
    pub lens_soft_factor_finite: bool,
    pub tonemap_high_lum_compressed: bool,
    pub pass_math_ok: bool,
    pub zero_loss_master: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite_and_bounded: bool,
    pub replay_deterministic: bool,
    pub live_pass_count: u32,
    pub executed_pass_count: u32,
    pub transient_vram_bytes: u64,
    pub coc_at_focal: f32,
    pub coc_at_near: f32,
    pub coc_at_far: f32,
    pub pass_depth_coc_max: f32,
    pub pass_lens_soft: f32,
    pub pass_aces_ldr: f32,
    pub deterministic: bool,
    pub evidence_kind: String,
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
    pub cinema_frame_graph_aaa_ready: bool,
    pub depth_of_field_aaa_ready: bool,
    pub prores_export_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: CinemaFrameGraphCompositionSoakReport,
    wire_on_surface: bool,
) -> KernelCinemaFrameGraphCompositionWireReport {
    KernelCinemaFrameGraphCompositionWireReport {
        cinema_frame_graph_composition_ready: r.ready,
        focal_distance_m: r.focal_distance_m,
        composition_ok: r.composition_ok,
        depth_resource_alive: r.depth_resource_alive,
        unused_pass_culled: r.unused_pass_culled,
        composition_depth_matches_live_passes: r.composition_depth_matches_live_passes,
        coc_all_finite: r.coc_all_finite,
        coc_all_bounded: r.coc_all_bounded,
        coc_zero_at_focal: r.coc_zero_at_focal,
        coc_monotonic_in_abs_depth_focal: r.coc_monotonic_in_abs_depth_focal,
        lens_soft_factor_finite: r.lens_soft_factor_finite,
        tonemap_high_lum_compressed: r.tonemap_high_lum_compressed,
        pass_math_ok: r.pass_math_ok,
        zero_loss_master: r.zero_loss_master,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite_and_bounded: r.all_finite_and_bounded,
        replay_deterministic: r.replay_deterministic,
        live_pass_count: r.live_pass_count,
        executed_pass_count: r.executed_pass_count,
        transient_vram_bytes: r.transient_vram_bytes,
        coc_at_focal: r.coc_at_focal,
        coc_at_near: r.coc_at_near,
        coc_at_far: r.coc_at_far,
        pass_depth_coc_max: r.pass_depth_coc_max,
        pass_lens_soft: r.pass_lens_soft,
        pass_aces_ldr: r.pass_aces_ldr,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
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
pub fn probe_cinema_frame_graph_composition_wire() -> KernelCinemaFrameGraphCompositionWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_cinema_frame_graph_composition_cmd")
        .is_some()
        && crate::ipc_surface::acl_for("run_kernel_cinema_frame_graph_composition_soak_cmd")
            .is_some();
    to_report(probe_cinema_frame_graph_composition(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_cinema_frame_graph_composition_cmd() -> KernelCinemaFrameGraphCompositionWireReport {
    probe_cinema_frame_graph_composition_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCinemaFrameGraphCompositionSoakWireReport {
    pub cinema_frame_graph_composition_ready: bool,
    pub focal_distance_m: f32,
    pub composition_ok: bool,
    pub depth_resource_alive: bool,
    pub unused_pass_culled: bool,
    pub composition_depth_matches_live_passes: bool,
    pub coc_all_finite: bool,
    pub coc_all_bounded: bool,
    pub coc_zero_at_focal: bool,
    pub coc_monotonic_in_abs_depth_focal: bool,
    pub lens_soft_factor_finite: bool,
    pub tonemap_high_lum_compressed: bool,
    pub pass_math_ok: bool,
    pub zero_loss_master: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite_and_bounded: bool,
    pub replay_deterministic: bool,
    pub live_pass_count: u32,
    pub executed_pass_count: u32,
    pub transient_vram_bytes: u64,
    pub coc_at_focal: f32,
    pub coc_at_near: f32,
    pub coc_at_far: f32,
    pub pass_depth_coc_max: f32,
    pub pass_lens_soft: f32,
    pub pass_aces_ldr: f32,
    pub deterministic: bool,
    pub evidence_kind: String,
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
    pub cinema_frame_graph_aaa_ready: bool,
    pub depth_of_field_aaa_ready: bool,
    pub prores_export_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(
    r: CinemaFrameGraphCompositionSoakReport,
) -> KernelCinemaFrameGraphCompositionSoakWireReport {
    KernelCinemaFrameGraphCompositionSoakWireReport {
        cinema_frame_graph_composition_ready: r.ready,
        focal_distance_m: r.focal_distance_m,
        composition_ok: r.composition_ok,
        depth_resource_alive: r.depth_resource_alive,
        unused_pass_culled: r.unused_pass_culled,
        composition_depth_matches_live_passes: r.composition_depth_matches_live_passes,
        coc_all_finite: r.coc_all_finite,
        coc_all_bounded: r.coc_all_bounded,
        coc_zero_at_focal: r.coc_zero_at_focal,
        coc_monotonic_in_abs_depth_focal: r.coc_monotonic_in_abs_depth_focal,
        lens_soft_factor_finite: r.lens_soft_factor_finite,
        tonemap_high_lum_compressed: r.tonemap_high_lum_compressed,
        pass_math_ok: r.pass_math_ok,
        zero_loss_master: r.zero_loss_master,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite_and_bounded: r.all_finite_and_bounded,
        replay_deterministic: r.replay_deterministic,
        live_pass_count: r.live_pass_count,
        executed_pass_count: r.executed_pass_count,
        transient_vram_bytes: r.transient_vram_bytes,
        coc_at_focal: r.coc_at_focal,
        coc_at_near: r.coc_at_near,
        coc_at_far: r.coc_at_far,
        pass_depth_coc_max: r.pass_depth_coc_max,
        pass_lens_soft: r.pass_lens_soft,
        pass_aces_ldr: r.pass_aces_ldr,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
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
        cinema_frame_graph_aaa_ready: r.cinema_frame_graph_aaa_ready,
        depth_of_field_aaa_ready: r.depth_of_field_aaa_ready,
        prores_export_aaa_ready: r.prores_export_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (cinema frame-graph composition replay
/// bit-idêntico — VERIFY DEPTH exercido: profundidade viva pós-culling, CoC
/// finito/limitado/zero-no-focal/monotônico, executed==live==4, pass não-usada
/// culled; Trava Lei XVI: transação aberta → mutações; após commit → rejeição).
#[tauri::command]
pub fn run_kernel_cinema_frame_graph_composition_soak_cmd(
) -> KernelCinemaFrameGraphCompositionSoakWireReport {
    soak_to_wire(run_cinema_frame_graph_composition_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_cinema_frame_graph_composition_honestly() {
        let r = probe_cinema_frame_graph_composition_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.cinema_frame_graph_composition_ready,
            probe_cinema_frame_graph_composition().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_cinema_frame_graph_composition().evidence_fingerprint
        );
        assert_eq!(
            r.focal_distance_m,
            probe_cinema_frame_graph_composition().focal_distance_m
        );
        assert_eq!(
            r.live_pass_count,
            probe_cinema_frame_graph_composition().live_pass_count
        );
        assert_eq!(
            r.executed_pass_count,
            probe_cinema_frame_graph_composition().executed_pass_count
        );
        assert_eq!(
            r.depth_resource_alive,
            probe_cinema_frame_graph_composition().depth_resource_alive
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_cinema_frame_graph_composition_wire();
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
        let soak = soak_to_wire(run_cinema_frame_graph_composition_soak());
        let kernel = run_cinema_frame_graph_composition_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.cinema_frame_graph_composition_ready,
            kernel.ready
        );
        assert_eq!(soak.focal_distance_m, kernel.focal_distance_m);
        assert_eq!(soak.live_pass_count, kernel.live_pass_count);
        assert_eq!(soak.executed_pass_count, kernel.executed_pass_count);
        assert!(soak.depth_resource_alive);
        assert!(soak.unused_pass_culled);
        assert!(soak.distinct_from_kw_auto_photography);
        assert!(soak.distinct_from_ju_sequencing_timeline);
        assert!(
            !soak.cinema_frame_graph_aaa_ready
                && !soak.depth_of_field_aaa_ready
                && !soak.prores_export_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

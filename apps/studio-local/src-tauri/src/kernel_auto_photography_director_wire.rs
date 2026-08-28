//! R2-I — Auto Photography Director parity wire (Vanguarda P4, letter kw).
//!
//! Expõe o substrate [`aethel_kernel_rust::auto_photography_director`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico do diretor de cinematografia. `wire_on_surface` é um
//! self-check real: `true` somente quando ambos os comandos desta wire existem
//! no `IPC_ACL_REGISTRY` (`probe_auto_photography_director_cmd` +
//! `run_kernel_auto_photography_director_soak_cmd`). A wire compõe sobre o R1.5
//! `sequencing_timeline` (`compose_cinema_frame` — edge R2-I→ju) e carrega a
//! **Trava Lei XVI**: toda mutação do `RuleBook` e todo `direct`/`configure`/
//! `set_rule` exigem `CreativeFusionTransaction` aberta (begin/commit/rollback
//! fail-closed, espelho Rust da Trava web). Flags AAA
//! (`auto_photography` / `cinematography_ai` / `virtual_production`) sempre
//! HELD — esta wire prova o rule engine determinístico e fail-closed, não um
//! shipment de direção de câmera AAA.

use aethel_kernel_rust::auto_photography_director::{
    probe_auto_photography_director, run_auto_photography_director_soak,
    AutoPhotographyDirectorSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelAutoPhotographyDirectorWireReport {
    pub auto_photography_director_ready: bool,
    pub rule_of_thirds_placed_x: f32,
    pub headroom: f32,
    pub camera_height: f32,
    pub focal_length_mm: f32,
    pub lead_room: f32,
    pub compliant_shot_ok: bool,
    pub rule180_refusal_ok: bool,
    pub composition_ok: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite: bool,
    pub replay_deterministic: bool,
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
    pub auto_photography_aaa_ready: bool,
    pub cinematography_ai_aaa_ready: bool,
    pub virtual_production_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: AutoPhotographyDirectorSoakReport,
    wire_on_surface: bool,
) -> KernelAutoPhotographyDirectorWireReport {
    KernelAutoPhotographyDirectorWireReport {
        auto_photography_director_ready: r.ready,
        rule_of_thirds_placed_x: r.rule_of_thirds_placed_x,
        headroom: r.headroom,
        camera_height: r.camera_height,
        focal_length_mm: r.focal_length_mm,
        lead_room: r.lead_room,
        compliant_shot_ok: r.compliant_shot_ok,
        rule180_refusal_ok: r.rule180_refusal_ok,
        composition_ok: r.composition_ok,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite: r.all_finite,
        replay_deterministic: r.replay_deterministic,
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
        auto_photography_aaa_ready: r.auto_photography_aaa_ready,
        cinematography_ai_aaa_ready: r.cinematography_ai_aaa_ready,
        virtual_production_aaa_ready: r.virtual_production_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_auto_photography_director_wire() -> KernelAutoPhotographyDirectorWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_auto_photography_director_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_auto_photography_director_soak_cmd").is_some();
    to_report(probe_auto_photography_director(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_auto_photography_director_cmd() -> KernelAutoPhotographyDirectorWireReport {
    probe_auto_photography_director_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelAutoPhotographyDirectorSoakWireReport {
    pub auto_photography_director_ready: bool,
    pub rule_of_thirds_placed_x: f32,
    pub headroom: f32,
    pub camera_height: f32,
    pub focal_length_mm: f32,
    pub lead_room: f32,
    pub compliant_shot_ok: bool,
    pub rule180_refusal_ok: bool,
    pub composition_ok: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite: bool,
    pub replay_deterministic: bool,
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
    pub auto_photography_aaa_ready: bool,
    pub cinematography_ai_aaa_ready: bool,
    pub virtual_production_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: AutoPhotographyDirectorSoakReport) -> KernelAutoPhotographyDirectorSoakWireReport {
    KernelAutoPhotographyDirectorSoakWireReport {
        auto_photography_director_ready: r.ready,
        rule_of_thirds_placed_x: r.rule_of_thirds_placed_x,
        headroom: r.headroom,
        camera_height: r.camera_height,
        focal_length_mm: r.focal_length_mm,
        lead_room: r.lead_room,
        compliant_shot_ok: r.compliant_shot_ok,
        rule180_refusal_ok: r.rule180_refusal_ok,
        composition_ok: r.composition_ok,
        tx_gate_fail_closed_ok: r.tx_gate_fail_closed_ok,
        all_finite: r.all_finite,
        replay_deterministic: r.replay_deterministic,
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
        auto_photography_aaa_ready: r.auto_photography_aaa_ready,
        cinematography_ai_aaa_ready: r.cinematography_ai_aaa_ready,
        virtual_production_aaa_ready: r.virtual_production_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (auto-photography director replay
/// bit-idêntico — Trava Lei XVI exercida: transação aberta → mutações; após
/// commit/rollback → rejeição fail-closed).
#[tauri::command]
pub fn run_kernel_auto_photography_director_soak_cmd() -> KernelAutoPhotographyDirectorSoakWireReport {
    soak_to_wire(run_auto_photography_director_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_auto_photography_director_honestly() {
        let r = probe_auto_photography_director_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.auto_photography_director_ready,
            probe_auto_photography_director().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_auto_photography_director().evidence_fingerprint
        );
        assert_eq!(
            r.rule_of_thirds_placed_x,
            probe_auto_photography_director().rule_of_thirds_placed_x
        );
        assert_eq!(r.headroom, probe_auto_photography_director().headroom);
        assert_eq!(r.focal_length_mm, probe_auto_photography_director().focal_length_mm);
        assert_eq!(r.lead_room, probe_auto_photography_director().lead_room);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_auto_photography_director_wire();
        assert!(
            !r.auto_photography_aaa_ready
                && !r.cinematography_ai_aaa_ready
                && !r.virtual_production_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_auto_photography_director_soak());
        let kernel = run_auto_photography_director_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(soak.auto_photography_director_ready, kernel.ready);
        assert_eq!(soak.rule_of_thirds_placed_x, kernel.rule_of_thirds_placed_x);
        assert_eq!(soak.camera_height, kernel.camera_height);
        assert_eq!(soak.lead_room, kernel.lead_room);
        assert!(soak.distinct_from_ju_sequencing_timeline);
        assert!(soak.distinct_from_kv_wind_field);
        assert!(
            !soak.auto_photography_aaa_ready
                && !soak.cinematography_ai_aaa_ready
                && !soak.virtual_production_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

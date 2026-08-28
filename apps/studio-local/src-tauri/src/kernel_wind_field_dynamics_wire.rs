//! R2-H — Wind Field Dynamics parity wire (Vanguarda P2, letter kv).
//!
//! Expõe o substrate [`aethel_kernel_rust::wind_field_dynamics`] na superfície
//! IPC do Studio Local — probe honesto (medido, nunca hardcoded) + soak
//! determinístico do wind field. `wire_on_surface` é um self-check real: `true`
//! somente quando ambos os comandos desta wire existem no `IPC_ACL_REGISTRY`
//! (`probe_wind_field_dynamics_cmd` + `run_kernel_wind_field_dynamics_soak_cmd`).
//! A wire compõe sobre o substrate R2-G (`world_forge_densification`) como
//! autoridade de bend da vegetação/grama (edge R2-G→R2-H, consome `BendPayload`
//! rest-state), mais advecção escalar semi-Lagrangiana CFL-guarded e envelope de
//! vento HRTF-ready (parameter producer). Flags AAA (`wind_simulation` /
//! `gust_wave` / `advection` / `audio_hrir` / `wind_audio`) sempre HELD — esta
//! wire prova a dinâmica de vento determinística e fail-closed, não um shipment
//! de weather/HRTF GPU.

use aethel_kernel_rust::wind_field_dynamics::{
    probe_wind_field_dynamics, run_wind_field_dynamics_soak, WindFieldDynamicsSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelWindFieldDynamicsWireReport {
    pub wind_field_dynamics_ready: bool,
    pub mean_wind_speed: f32,
    pub min_wind_speed: f32,
    pub max_wind_speed: f32,
    pub gust_variation: f32,
    pub wind_always_finite: bool,
    pub wind_bounded_by_max: bool,
    pub grass_bend_amount: f32,
    pub rock_bend_amount: f32,
    pub bend_angle_within_limit: bool,
    pub bend_axis_unit_or_zero: bool,
    pub advection_drift: f32,
    pub advection_bounded: bool,
    pub advection_finite: bool,
    pub advection_max_ok: bool,
    pub audio_high_rises_with_speed: bool,
    pub audio_azimuth_bounded: bool,
    pub audio_gust_bounded: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_ku_world_forge_densification: bool,
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
    pub wind_simulation_aaa_ready: bool,
    pub gust_wave_aaa_ready: bool,
    pub advection_aaa_ready: bool,
    pub audio_hrir_aaa_ready: bool,
    pub wind_audio_aaa_ready: bool,
    pub chaos_aaa_ready: bool,
    pub live_weather_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: WindFieldDynamicsSoakReport,
    wire_on_surface: bool,
) -> KernelWindFieldDynamicsWireReport {
    KernelWindFieldDynamicsWireReport {
        wind_field_dynamics_ready: r.ready,
        mean_wind_speed: r.mean_wind_speed,
        min_wind_speed: r.min_wind_speed,
        max_wind_speed: r.max_wind_speed,
        gust_variation: r.gust_variation,
        wind_always_finite: r.wind_always_finite,
        wind_bounded_by_max: r.wind_bounded_by_max,
        grass_bend_amount: r.grass_bend_amount,
        rock_bend_amount: r.rock_bend_amount,
        bend_angle_within_limit: r.bend_angle_within_limit,
        bend_axis_unit_or_zero: r.bend_axis_unit_or_zero,
        advection_drift: r.advection_drift,
        advection_bounded: r.advection_bounded,
        advection_finite: r.advection_finite,
        advection_max_ok: r.advection_max_ok,
        audio_high_rises_with_speed: r.audio_high_rises_with_speed,
        audio_azimuth_bounded: r.audio_azimuth_bounded,
        audio_gust_bounded: r.audio_gust_bounded,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_ku_world_forge_densification: r.distinct_from_ku_world_forge_densification,
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
        wind_simulation_aaa_ready: r.wind_simulation_aaa_ready,
        gust_wave_aaa_ready: r.gust_wave_aaa_ready,
        advection_aaa_ready: r.advection_aaa_ready,
        audio_hrir_aaa_ready: r.audio_hrir_aaa_ready,
        wind_audio_aaa_ready: r.wind_audio_aaa_ready,
        chaos_aaa_ready: r.chaos_aaa_ready,
        live_weather_aaa_ready: r.live_weather_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_wind_field_dynamics_wire() -> KernelWindFieldDynamicsWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_wind_field_dynamics_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_wind_field_dynamics_soak_cmd").is_some();
    to_report(probe_wind_field_dynamics(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_wind_field_dynamics_cmd() -> KernelWindFieldDynamicsWireReport {
    probe_wind_field_dynamics_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelWindFieldDynamicsSoakWireReport {
    pub wind_field_dynamics_ready: bool,
    pub mean_wind_speed: f32,
    pub min_wind_speed: f32,
    pub max_wind_speed: f32,
    pub gust_variation: f32,
    pub wind_always_finite: bool,
    pub wind_bounded_by_max: bool,
    pub grass_bend_amount: f32,
    pub rock_bend_amount: f32,
    pub bend_angle_within_limit: bool,
    pub bend_axis_unit_or_zero: bool,
    pub advection_drift: f32,
    pub advection_bounded: bool,
    pub advection_finite: bool,
    pub advection_max_ok: bool,
    pub audio_high_rises_with_speed: bool,
    pub audio_azimuth_bounded: bool,
    pub audio_gust_bounded: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_ku_world_forge_densification: bool,
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
    pub wind_simulation_aaa_ready: bool,
    pub gust_wave_aaa_ready: bool,
    pub advection_aaa_ready: bool,
    pub audio_hrir_aaa_ready: bool,
    pub wind_audio_aaa_ready: bool,
    pub chaos_aaa_ready: bool,
    pub live_weather_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: WindFieldDynamicsSoakReport) -> KernelWindFieldDynamicsSoakWireReport {
    KernelWindFieldDynamicsSoakWireReport {
        wind_field_dynamics_ready: r.ready,
        mean_wind_speed: r.mean_wind_speed,
        min_wind_speed: r.min_wind_speed,
        max_wind_speed: r.max_wind_speed,
        gust_variation: r.gust_variation,
        wind_always_finite: r.wind_always_finite,
        wind_bounded_by_max: r.wind_bounded_by_max,
        grass_bend_amount: r.grass_bend_amount,
        rock_bend_amount: r.rock_bend_amount,
        bend_angle_within_limit: r.bend_angle_within_limit,
        bend_axis_unit_or_zero: r.bend_axis_unit_or_zero,
        advection_drift: r.advection_drift,
        advection_bounded: r.advection_bounded,
        advection_finite: r.advection_finite,
        advection_max_ok: r.advection_max_ok,
        audio_high_rises_with_speed: r.audio_high_rises_with_speed,
        audio_azimuth_bounded: r.audio_azimuth_bounded,
        audio_gust_bounded: r.audio_gust_bounded,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_ku_world_forge_densification: r.distinct_from_ku_world_forge_densification,
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
        wind_simulation_aaa_ready: r.wind_simulation_aaa_ready,
        gust_wave_aaa_ready: r.gust_wave_aaa_ready,
        advection_aaa_ready: r.advection_aaa_ready,
        audio_hrir_aaa_ready: r.audio_hrir_aaa_ready,
        wind_audio_aaa_ready: r.wind_audio_aaa_ready,
        chaos_aaa_ready: r.chaos_aaa_ready,
        live_weather_aaa_ready: r.live_weather_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (wind field replay bit-idêntico).
#[tauri::command]
pub fn run_kernel_wind_field_dynamics_soak_cmd() -> KernelWindFieldDynamicsSoakWireReport {
    soak_to_wire(run_wind_field_dynamics_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_wind_field_dynamics_honestly() {
        let r = probe_wind_field_dynamics_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.wind_field_dynamics_ready,
            probe_wind_field_dynamics().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_wind_field_dynamics().evidence_fingerprint
        );
        assert_eq!(r.mean_wind_speed, probe_wind_field_dynamics().mean_wind_speed);
        assert_eq!(r.grass_bend_amount, probe_wind_field_dynamics().grass_bend_amount);
        assert_eq!(r.advection_drift, probe_wind_field_dynamics().advection_drift);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_wind_field_dynamics_wire();
        assert!(
            !r.wind_simulation_aaa_ready
                && !r.gust_wave_aaa_ready
                && !r.advection_aaa_ready
                && !r.audio_hrir_aaa_ready
                && !r.wind_audio_aaa_ready
                && !r.chaos_aaa_ready
                && !r.live_weather_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_wind_field_dynamics_soak());
        let kernel = run_wind_field_dynamics_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(soak.wind_field_dynamics_ready, kernel.ready);
        assert_eq!(soak.mean_wind_speed, kernel.mean_wind_speed);
        assert_eq!(soak.grass_bend_amount, kernel.grass_bend_amount);
        assert_eq!(soak.advection_drift, kernel.advection_drift);
        assert!(soak.distinct_from_ku_world_forge_densification);
        assert!(soak.distinct_from_hg_spatial_grid);
        assert!(
            !soak.wind_simulation_aaa_ready && !soak.wind_audio_aaa_ready && !soak.audio_hrir_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

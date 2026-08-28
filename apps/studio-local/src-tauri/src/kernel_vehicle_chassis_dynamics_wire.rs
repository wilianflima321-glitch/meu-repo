//! R3-A — Vehicle chassis dynamics parity wire (Vanguarda P2 — GAS & Física, letter kz).
//!
//! Expõe o substrate [`aethel_kernel_rust::vehicle_chassis_dynamics`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico do chassis veicular no spine S-17 (rollback/fingerprint
//! compatível). `wire_on_surface` é um self-check real: `true` somente quando
//! ambos os comandos desta wire existem no `IPC_ACL_REGISTRY`
//! (`probe_vehicle_chassis_dynamics_cmd` +
//! `run_kernel_vehicle_chassis_dynamics_soak_cmd`). A wire compõe sobre o
//! substrate real com **zero edits**: suspensão spring-damper + anti-roll bar,
//! diferencial aberto/torque-vectoring, Ackermann inner/outer, frenagem
//! limitada, terreno irregular rastreado, hot loop zero-alloc keep-capacity e
//! rollback replay bit-idêntico.
//! **VERIFY:** o soak é determinístico (mesmo evidence fingerprint em passes
//! duplos), a suspensão estática segura o peso, o Ackermann interno esterça
//! mais que o externo, o diferencial aberto divide o torque igualmente e a
//! frenagem reduz a velocidade dentro dos limites. Flags AAA
//! (`chassis_ragdoll` / `tire_grip` / `wheel_suspension` / `drift_model`)
//! sempre HELD — esta wire prova o chassis determinístico e fail-closed no
//! spine S-17, não um shipment de veículo AAA.

use aethel_kernel_rust::vehicle_chassis_dynamics::{
    probe_vehicle_chassis_dynamics, run_vehicle_chassis_dynamics_soak,
    VehicleChassisDynamicsReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelVehicleChassisDynamicsWireReport {
    pub vehicle_chassis_dynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    // Chassis vehicle (R3-A, letter kz).
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub settled: bool,
    pub settled_speed: f32,
    pub normal_force_balance_err: f32,
    pub max_penetration: f32,
    pub rest_height: f32,
    pub ackermann_inner_gt_outer: bool,
    pub open_diff_split_equal: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub braking_bounded: bool,
    pub braking_speed_ratio: f32,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    // Distinctness — 21 real peers (17 prior R1/R2 + ky + gv + ip + jy).
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
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    // AAA — always HELD (fail-closed).
    pub chassis_ragdoll_aaa_ready: bool,
    pub tire_grip_aaa_ready: bool,
    pub wheel_suspension_aaa_ready: bool,
    pub drift_model_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: VehicleChassisDynamicsReport,
    wire_on_surface: bool,
) -> KernelVehicleChassisDynamicsWireReport {
    KernelVehicleChassisDynamicsWireReport {
        vehicle_chassis_dynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        settled: r.settled,
        settled_speed: r.settled_speed,
        normal_force_balance_err: r.normal_force_balance_err,
        max_penetration: r.max_penetration,
        rest_height: r.rest_height,
        ackermann_inner_gt_outer: r.ackermann_inner_gt_outer,
        open_diff_split_equal: r.open_diff_split_equal,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        braking_bounded: r.braking_bounded,
        braking_speed_ratio: r.braking_speed_ratio,
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
        distinct_from_ky_cinema_hot_loop_composition: r.distinct_from_ky_cinema_hot_loop_composition,
        distinct_from_gv_aerodynamic_navier_stokes: r.distinct_from_gv_aerodynamic_navier_stokes,
        distinct_from_ip_position_based_dynamics: r.distinct_from_ip_position_based_dynamics,
        distinct_from_jy_living_sky_buoyancy: r.distinct_from_jy_living_sky_buoyancy,
        chassis_ragdoll_aaa_ready: r.chassis_ragdoll_aaa_ready,
        tire_grip_aaa_ready: r.tire_grip_aaa_ready,
        wheel_suspension_aaa_ready: r.wheel_suspension_aaa_ready,
        drift_model_aaa_ready: r.drift_model_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_vehicle_chassis_dynamics_wire() -> KernelVehicleChassisDynamicsWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_vehicle_chassis_dynamics_cmd")
        .is_some()
        && crate::ipc_surface::acl_for("run_kernel_vehicle_chassis_dynamics_soak_cmd").is_some();
    to_report(probe_vehicle_chassis_dynamics(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_vehicle_chassis_dynamics_cmd() -> KernelVehicleChassisDynamicsWireReport {
    probe_vehicle_chassis_dynamics_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelVehicleChassisDynamicsSoakWireReport {
    pub vehicle_chassis_dynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub settled: bool,
    pub settled_speed: f32,
    pub normal_force_balance_err: f32,
    pub max_penetration: f32,
    pub rest_height: f32,
    pub ackermann_inner_gt_outer: bool,
    pub open_diff_split_equal: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub braking_bounded: bool,
    pub braking_speed_ratio: f32,
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
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    pub chassis_ragdoll_aaa_ready: bool,
    pub tire_grip_aaa_ready: bool,
    pub wheel_suspension_aaa_ready: bool,
    pub drift_model_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: VehicleChassisDynamicsReport) -> KernelVehicleChassisDynamicsSoakWireReport {
    KernelVehicleChassisDynamicsSoakWireReport {
        vehicle_chassis_dynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        settled: r.settled,
        settled_speed: r.settled_speed,
        normal_force_balance_err: r.normal_force_balance_err,
        max_penetration: r.max_penetration,
        rest_height: r.rest_height,
        ackermann_inner_gt_outer: r.ackermann_inner_gt_outer,
        open_diff_split_equal: r.open_diff_split_equal,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        braking_bounded: r.braking_bounded,
        braking_speed_ratio: r.braking_speed_ratio,
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
        distinct_from_ky_cinema_hot_loop_composition: r.distinct_from_ky_cinema_hot_loop_composition,
        distinct_from_gv_aerodynamic_navier_stokes: r.distinct_from_gv_aerodynamic_navier_stokes,
        distinct_from_ip_position_based_dynamics: r.distinct_from_ip_position_based_dynamics,
        distinct_from_jy_living_sky_buoyancy: r.distinct_from_jy_living_sky_buoyancy,
        chassis_ragdoll_aaa_ready: r.chassis_ragdoll_aaa_ready,
        tire_grip_aaa_ready: r.tire_grip_aaa_ready,
        wheel_suspension_aaa_ready: r.wheel_suspension_aaa_ready,
        drift_model_aaa_ready: r.drift_model_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (chassis vehicle replay bit-idêntico —
/// VERIFY: suspensão estática segura o peso, Ackermann inner > outer, diferencial
/// aberto divide igual, frenagem bounded, hot loop zero-alloc keep-capacity,
/// rollback replay determinístico no evidence fingerprint; flags AAA sempre HELD).
#[tauri::command]
pub fn run_kernel_vehicle_chassis_dynamics_soak_cmd() -> KernelVehicleChassisDynamicsSoakWireReport {
    soak_to_wire(run_vehicle_chassis_dynamics_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_vehicle_chassis_dynamics_honestly() {
        let r = probe_vehicle_chassis_dynamics_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.vehicle_chassis_dynamics_ready,
            probe_vehicle_chassis_dynamics().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_vehicle_chassis_dynamics().evidence_fingerprint
        );
        assert_eq!(
            r.hot_loop_iterations,
            probe_vehicle_chassis_dynamics().hot_loop_iterations
        );
        assert_eq!(
            r.normal_force_balance_err,
            probe_vehicle_chassis_dynamics().normal_force_balance_err
        );
        assert_eq!(
            r.max_penetration,
            probe_vehicle_chassis_dynamics().max_penetration
        );
        assert_eq!(r.settled, probe_vehicle_chassis_dynamics().settled);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_vehicle_chassis_dynamics_wire();
        assert!(
            !r.chassis_ragdoll_aaa_ready
                && !r.tire_grip_aaa_ready
                && !r.wheel_suspension_aaa_ready
                && !r.drift_model_aaa_ready,
            "chassis AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_vehicle_chassis_dynamics_soak());
        let kernel = run_vehicle_chassis_dynamics_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.vehicle_chassis_dynamics_ready,
            kernel.ready
        );
        assert_eq!(soak.hot_loop_iterations, kernel.hot_loop_iterations);
        assert_eq!(soak.normal_force_balance_err, kernel.normal_force_balance_err);
        assert_eq!(soak.max_penetration, kernel.max_penetration);
        assert_eq!(soak.rest_height, kernel.rest_height);
        assert!(soak.settled);
        assert!(soak.ackermann_inner_gt_outer);
        assert!(soak.open_diff_split_equal);
        assert!(soak.rollback_replay_identical);
        assert!(soak.braking_bounded);
        assert!(soak.all_finite_and_bounded);
        assert!(soak.distinct_from_kx_cinema_frame_graph_composition);
        assert!(soak.distinct_from_ky_cinema_hot_loop_composition);
        assert!(soak.distinct_from_jy_living_sky_buoyancy);
        assert!(
            !soak.chassis_ragdoll_aaa_ready
                && !soak.tire_grip_aaa_ready
                && !soak.wheel_suspension_aaa_ready
                && !soak.drift_model_aaa_ready,
            "soak wire report keeps chassis AAA flags HELD"
        );
    }
}

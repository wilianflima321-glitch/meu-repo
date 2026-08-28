//! R3-C — Celestial orbital dynamics parity wire (Vanguarda P2 — GAS & Física, letter lb).
//!
//! Expõe o substrate [`aethel_kernel_rust::celestial_orbital_dynamics`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico da dinâmica orbital/celeste configurável (BodyTable de
//! corpos, Kepler universal variable) no spine S-17 (rollback/fingerprint
//! compatível). `wire_on_surface` é um self-check real: `true` somente quando
//! ambos os comandos desta wire existem no `IPC_ACL_REGISTRY`
//! (`probe_celestial_orbital_dynamics_cmd` +
//! `run_kernel_celestial_orbital_dynamics_soak_cmd`). A wire compõe sobre o
//! substrate real com **zero edits**: propagação universal-variable (Kepler),
//! elementos ↔ estado (round-trip lossless), detecção de esfera de influência
//! (patched conic), microgravidade sem thrust mantém velocidade, impulso RCS
//! aplica delta-v exato, velocidade de escape positiva/hiperbólica e hot loop
//! zero-alloc keep-capacity com rollback replay bit-idêntico.
//! **VERIFY:** o soak é determinístico (mesmo evidence fingerprint em passes
//! duplos), órbita circular retorna após um período, vis-viva é conservada,
//! elementos↔estado fazem round-trip lossless e o RCS aplica delta-v exato.
//! Flags AAA (`rcs` / `orbital_maneuver` / `n_body` / `atmosphere_drag`)
//! sempre HELD — esta wire prova a dinâmica orbital determinística e
//! fail-closed no spine S-17, não um shipment de espaço AAA.

use aethel_kernel_rust::celestial_orbital_dynamics::{
    probe_celestial_orbital_dynamics, run_celestial_orbital_dynamics_soak,
    CelestialOrbitalDynamicsReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCelestialOrbitalDynamicsWireReport {
    pub celestial_orbital_dynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    // Celestial orbital dynamics (R3-C, letter lb).
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub kepler_zero_eccentricity: bool,
    pub kepler_elliptical_residual: f32,
    pub circular_period_return_err: f32,
    pub vis_viva_max_rel_err: f32,
    pub elements_state_round_trip: bool,
    pub soi_switch_swaps_primary: bool,
    pub microgravity_constant_velocity: bool,
    pub rcs_impulse_exact_delta_v: bool,
    pub escape_positive_energy: bool,
    pub deterministic_step: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    // Distinctness — 23 real peers (21 prior R1/R2/R3-A + kz + la).
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
    pub distinct_from_kz_vehicle_chassis_dynamics: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    // AAA — always HELD (fail-closed).
    pub rcs_aaa_ready: bool,
    pub orbital_maneuver_aaa_ready: bool,
    pub n_body_aaa_ready: bool,
    pub atmosphere_drag_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: CelestialOrbitalDynamicsReport,
    wire_on_surface: bool,
) -> KernelCelestialOrbitalDynamicsWireReport {
    KernelCelestialOrbitalDynamicsWireReport {
        celestial_orbital_dynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        kepler_zero_eccentricity: r.kepler_zero_eccentricity,
        kepler_elliptical_residual: r.kepler_elliptical_residual,
        circular_period_return_err: r.circular_period_return_err,
        vis_viva_max_rel_err: r.vis_viva_max_rel_err,
        elements_state_round_trip: r.elements_state_round_trip,
        soi_switch_swaps_primary: r.soi_switch_swaps_primary,
        microgravity_constant_velocity: r.microgravity_constant_velocity,
        rcs_impulse_exact_delta_v: r.rcs_impulse_exact_delta_v,
        escape_positive_energy: r.escape_positive_energy,
        deterministic_step: r.deterministic_step,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
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
        distinct_from_kz_vehicle_chassis_dynamics: r.distinct_from_kz_vehicle_chassis_dynamics,
        distinct_from_la_flight_aerodynamics: r.distinct_from_la_flight_aerodynamics,
        rcs_aaa_ready: r.rcs_aaa_ready,
        orbital_maneuver_aaa_ready: r.orbital_maneuver_aaa_ready,
        n_body_aaa_ready: r.n_body_aaa_ready,
        atmosphere_drag_aaa_ready: r.atmosphere_drag_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_celestial_orbital_dynamics_wire() -> KernelCelestialOrbitalDynamicsWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_celestial_orbital_dynamics_cmd")
        .is_some()
        && crate::ipc_surface::acl_for("run_kernel_celestial_orbital_dynamics_soak_cmd").is_some();
    to_report(probe_celestial_orbital_dynamics(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_celestial_orbital_dynamics_cmd() -> KernelCelestialOrbitalDynamicsWireReport {
    probe_celestial_orbital_dynamics_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelCelestialOrbitalDynamicsSoakWireReport {
    pub celestial_orbital_dynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub kepler_zero_eccentricity: bool,
    pub kepler_elliptical_residual: f32,
    pub circular_period_return_err: f32,
    pub vis_viva_max_rel_err: f32,
    pub elements_state_round_trip: bool,
    pub soi_switch_swaps_primary: bool,
    pub microgravity_constant_velocity: bool,
    pub rcs_impulse_exact_delta_v: bool,
    pub escape_positive_energy: bool,
    pub deterministic_step: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
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
    pub distinct_from_kz_vehicle_chassis_dynamics: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    pub rcs_aaa_ready: bool,
    pub orbital_maneuver_aaa_ready: bool,
    pub n_body_aaa_ready: bool,
    pub atmosphere_drag_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: CelestialOrbitalDynamicsReport) -> KernelCelestialOrbitalDynamicsSoakWireReport {
    KernelCelestialOrbitalDynamicsSoakWireReport {
        celestial_orbital_dynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        kepler_zero_eccentricity: r.kepler_zero_eccentricity,
        kepler_elliptical_residual: r.kepler_elliptical_residual,
        circular_period_return_err: r.circular_period_return_err,
        vis_viva_max_rel_err: r.vis_viva_max_rel_err,
        elements_state_round_trip: r.elements_state_round_trip,
        soi_switch_swaps_primary: r.soi_switch_swaps_primary,
        microgravity_constant_velocity: r.microgravity_constant_velocity,
        rcs_impulse_exact_delta_v: r.rcs_impulse_exact_delta_v,
        escape_positive_energy: r.escape_positive_energy,
        deterministic_step: r.deterministic_step,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
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
        distinct_from_kz_vehicle_chassis_dynamics: r.distinct_from_kz_vehicle_chassis_dynamics,
        distinct_from_la_flight_aerodynamics: r.distinct_from_la_flight_aerodynamics,
        rcs_aaa_ready: r.rcs_aaa_ready,
        orbital_maneuver_aaa_ready: r.orbital_maneuver_aaa_ready,
        n_body_aaa_ready: r.n_body_aaa_ready,
        atmosphere_drag_aaa_ready: r.atmosphere_drag_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (celestial orbital dynamics replay
/// bit-idêntico — VERIFY: Kepler zero-eccentricity, órbita circular retorna após
/// um período, vis-viva conservada, elementos↔estado round-trip lossless, SOI
/// switch, microgravidade sem thrust mantém velocidade, RCS delta-v exato,
/// escape positivo/hiperbólico, hot loop zero-alloc keep-capacity, rollback
/// replay determinístico no evidence fingerprint; flags AAA sempre HELD).
#[tauri::command]
pub fn run_kernel_celestial_orbital_dynamics_soak_cmd() -> KernelCelestialOrbitalDynamicsSoakWireReport {
    soak_to_wire(run_celestial_orbital_dynamics_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_celestial_orbital_dynamics_honestly() {
        let r = probe_celestial_orbital_dynamics_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.celestial_orbital_dynamics_ready,
            probe_celestial_orbital_dynamics().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_celestial_orbital_dynamics().evidence_fingerprint
        );
        assert_eq!(
            r.hot_loop_iterations,
            probe_celestial_orbital_dynamics().hot_loop_iterations
        );
        assert_eq!(
            r.kepler_elliptical_residual,
            probe_celestial_orbital_dynamics().kepler_elliptical_residual
        );
        assert_eq!(
            r.circular_period_return_err,
            probe_celestial_orbital_dynamics().circular_period_return_err
        );
        assert_eq!(
            r.vis_viva_max_rel_err,
            probe_celestial_orbital_dynamics().vis_viva_max_rel_err
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_celestial_orbital_dynamics_wire();
        assert!(
            !r.rcs_aaa_ready
                && !r.orbital_maneuver_aaa_ready
                && !r.n_body_aaa_ready
                && !r.atmosphere_drag_aaa_ready,
            "orbital AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_celestial_orbital_dynamics_soak());
        let kernel = run_celestial_orbital_dynamics_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(soak.celestial_orbital_dynamics_ready, kernel.ready);
        assert_eq!(soak.hot_loop_iterations, kernel.hot_loop_iterations);
        assert_eq!(soak.kepler_elliptical_residual, kernel.kepler_elliptical_residual);
        assert_eq!(soak.circular_period_return_err, kernel.circular_period_return_err);
        assert!(soak.kepler_zero_eccentricity);
        assert!(soak.elements_state_round_trip);
        assert!(soak.soi_switch_swaps_primary);
        assert!(soak.microgravity_constant_velocity);
        assert!(soak.rcs_impulse_exact_delta_v);
        assert!(soak.escape_positive_energy);
        assert!(soak.rollback_replay_identical);
        assert!(soak.all_finite_and_bounded);
        assert!(soak.distinct_from_kx_cinema_frame_graph_composition);
        assert!(soak.distinct_from_kz_vehicle_chassis_dynamics);
        assert!(soak.distinct_from_la_flight_aerodynamics);
        assert!(
            !soak.rcs_aaa_ready
                && !soak.orbital_maneuver_aaa_ready
                && !soak.n_body_aaa_ready
                && !soak.atmosphere_drag_aaa_ready,
            "soak wire report keeps orbital AAA flags HELD"
        );
    }
}

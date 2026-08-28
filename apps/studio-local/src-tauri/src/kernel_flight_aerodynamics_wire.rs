//! R3-B — Flight aerodynamics parity wire (Vanguarda P2 — GAS & Física, letter la).
//!
//! Expõe o substrate [`aethel_kernel_rust::flight_aerodynamics`] na superfície
//! IPC do Studio Local — probe honesto (medido, nunca hardcoded) + soak
//! determinístico da aerodinâmica configurável (AerofoilConfig / AircraftConfig)
//! no spine S-17 (rollback/fingerprint compatível). `wire_on_surface` é um
//! self-check real: `true` somente quando ambos os comandos desta wire existem
//! no `IPC_ACL_REGISTRY` (`probe_flight_aerodynamics_cmd` +
//! `run_kernel_flight_aerodynamics_soak_cmd`). A wire compõe sobre o substrate
//! real com **zero edits**: lift/drag polar parabólico, stall peak-and-falloff,
//! ISA atmosphere, trim angle-of-attack, momentos de controle de superfície
//! (elevador/aileron/leme), acoplamento de vento (tailwind/headwind) e hot loop
//! zero-alloc keep-capacity com rollback replay bit-idêntico.
//! **VERIFY:** o soak é determinístico (mesmo evidence fingerprint em passes
//! duplos), o lift no trim equilibra o peso, o dynamic pressure é monotônico
//! com a velocidade, o stall pica e cai, e o drag polar casa a fórmula
//! parabólica. Flags AAA (`aerobatics` / `propwash` / `control_authority` /
//! `stall_spin`) sempre HELD — esta wire prova a aerodinâmica determinística e
//! fail-closed no spine S-17, não um shipment de voo AAA.

use aethel_kernel_rust::flight_aerodynamics::{
    probe_flight_aerodynamics, run_flight_aerodynamics_soak, FlightAerodynamicsReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelFlightAerodynamicsWireReport {
    pub flight_aerodynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    // Flight aerodynamics (R3-B, letter la).
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub trim_lift_balance_err: f32,
    pub q_monotonic_with_speed: bool,
    pub stall_peak_and_falloff: bool,
    pub drag_polar_matches: bool,
    pub elevator_sign_correct: bool,
    pub deterministic_step: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub tailwind_reduces_q: bool,
    pub headwind_increases_q: bool,
    pub evidence_fingerprint: u64,
    // Distinctness — 22 real peers (21 prior R1/R2/R3-A + kz).
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
    // AAA — always HELD (fail-closed).
    pub aerobatics_aaa_ready: bool,
    pub propwash_aaa_ready: bool,
    pub control_authority_aaa_ready: bool,
    pub stall_spin_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: FlightAerodynamicsReport,
    wire_on_surface: bool,
) -> KernelFlightAerodynamicsWireReport {
    KernelFlightAerodynamicsWireReport {
        flight_aerodynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        trim_lift_balance_err: r.trim_lift_balance_err,
        q_monotonic_with_speed: r.q_monotonic_with_speed,
        stall_peak_and_falloff: r.stall_peak_and_falloff,
        drag_polar_matches: r.drag_polar_matches,
        elevator_sign_correct: r.elevator_sign_correct,
        deterministic_step: r.deterministic_step,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        all_finite_and_bounded: r.all_finite_and_bounded,
        tailwind_reduces_q: r.tailwind_reduces_q,
        headwind_increases_q: r.headwind_increases_q,
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
        aerobatics_aaa_ready: r.aerobatics_aaa_ready,
        propwash_aaa_ready: r.propwash_aaa_ready,
        control_authority_aaa_ready: r.control_authority_aaa_ready,
        stall_spin_aaa_ready: r.stall_spin_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_flight_aerodynamics_wire() -> KernelFlightAerodynamicsWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_flight_aerodynamics_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_flight_aerodynamics_soak_cmd").is_some();
    to_report(probe_flight_aerodynamics(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_flight_aerodynamics_cmd() -> KernelFlightAerodynamicsWireReport {
    probe_flight_aerodynamics_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelFlightAerodynamicsSoakWireReport {
    pub flight_aerodynamics_ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub trim_lift_balance_err: f32,
    pub q_monotonic_with_speed: bool,
    pub stall_peak_and_falloff: bool,
    pub drag_polar_matches: bool,
    pub elevator_sign_correct: bool,
    pub deterministic_step: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub tailwind_reduces_q: bool,
    pub headwind_increases_q: bool,
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
    pub aerobatics_aaa_ready: bool,
    pub propwash_aaa_ready: bool,
    pub control_authority_aaa_ready: bool,
    pub stall_spin_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: FlightAerodynamicsReport) -> KernelFlightAerodynamicsSoakWireReport {
    KernelFlightAerodynamicsSoakWireReport {
        flight_aerodynamics_ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        soak_steps: r.soak_steps,
        hot_loop_iterations: r.hot_loop_iterations,
        trim_lift_balance_err: r.trim_lift_balance_err,
        q_monotonic_with_speed: r.q_monotonic_with_speed,
        stall_peak_and_falloff: r.stall_peak_and_falloff,
        drag_polar_matches: r.drag_polar_matches,
        elevator_sign_correct: r.elevator_sign_correct,
        deterministic_step: r.deterministic_step,
        rollback_replay_identical: r.rollback_replay_identical,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        all_finite_and_bounded: r.all_finite_and_bounded,
        tailwind_reduces_q: r.tailwind_reduces_q,
        headwind_increases_q: r.headwind_increases_q,
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
        aerobatics_aaa_ready: r.aerobatics_aaa_ready,
        propwash_aaa_ready: r.propwash_aaa_ready,
        control_authority_aaa_ready: r.control_authority_aaa_ready,
        stall_spin_aaa_ready: r.stall_spin_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (flight aerodynamics replay bit-idêntico —
/// VERIFY: trim equilibra o peso, q monotônico com velocidade, stall pica e cai,
/// drag polar parabólico, momentos de controle com sinais corretos, acoplamento de
/// vento correto, hot loop zero-alloc keep-capacity, rollback replay determinístico
/// no evidence fingerprint; flags AAA sempre HELD).
#[tauri::command]
pub fn run_kernel_flight_aerodynamics_soak_cmd() -> KernelFlightAerodynamicsSoakWireReport {
    soak_to_wire(run_flight_aerodynamics_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_flight_aerodynamics_honestly() {
        let r = probe_flight_aerodynamics_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.flight_aerodynamics_ready,
            probe_flight_aerodynamics().ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_flight_aerodynamics().evidence_fingerprint
        );
        assert_eq!(
            r.hot_loop_iterations,
            probe_flight_aerodynamics().hot_loop_iterations
        );
        assert_eq!(
            r.trim_lift_balance_err,
            probe_flight_aerodynamics().trim_lift_balance_err
        );
        assert_eq!(
            r.tailwind_reduces_q,
            probe_flight_aerodynamics().tailwind_reduces_q
        );
        assert_eq!(
            r.headwind_increases_q,
            probe_flight_aerodynamics().headwind_increases_q
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_flight_aerodynamics_wire();
        assert!(
            !r.aerobatics_aaa_ready
                && !r.propwash_aaa_ready
                && !r.control_authority_aaa_ready
                && !r.stall_spin_aaa_ready,
            "flight AAA flags must stay HELD"
        );
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_flight_aerodynamics_soak());
        let kernel = run_flight_aerodynamics_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(soak.flight_aerodynamics_ready, kernel.ready);
        assert_eq!(soak.hot_loop_iterations, kernel.hot_loop_iterations);
        assert_eq!(soak.trim_lift_balance_err, kernel.trim_lift_balance_err);
        assert!(soak.q_monotonic_with_speed);
        assert!(soak.stall_peak_and_falloff);
        assert!(soak.drag_polar_matches);
        assert!(soak.elevator_sign_correct);
        assert!(soak.rollback_replay_identical);
        assert!(soak.tailwind_reduces_q);
        assert!(soak.headwind_increases_q);
        assert!(soak.all_finite_and_bounded);
        assert!(soak.distinct_from_kx_cinema_frame_graph_composition);
        assert!(soak.distinct_from_kz_vehicle_chassis_dynamics);
        assert!(soak.distinct_from_gv_aerodynamic_navier_stokes);
        assert!(
            !soak.aerobatics_aaa_ready
                && !soak.propwash_aaa_ready
                && !soak.control_authority_aaa_ready
                && !soak.stall_spin_aaa_ready,
            "soak wire report keeps flight AAA flags HELD"
        );
    }
}

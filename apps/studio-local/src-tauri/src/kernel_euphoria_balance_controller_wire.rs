//! R2-F — Euphoria Balance Controller parity wire (Vanguarda P2, letter ko).
//!
//! Expõe o substrate [`aethel_kernel_rust::euphoria_balance_controller`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico de `EUPHORIA_BALANCE_SOAK_TICKS`. `wire_on_surface` é um
//! self-check real: `true` somente quando ambos os comandos desta wire existem
//! no `IPC_ACL_REGISTRY` (`probe_euphoria_balance_controller_cmd` +
//! `run_kernel_euphoria_balance_controller_soak_cmd`). Flags
//! `euphoria_full_aaa_ready` / `ue5_active_ragdoll_aaa_ready` /
//! `chaos_physics_aaa_ready` / `nanite_ready` / `dlss_ready` sempre HELD — esta
//! wire prova a matemática do capture-point (Pratt) + hand-plant + fall
//! recovery com massa 1:1 (75 kg) no hot loop 240 Hz, não um shipment
//! Unreal/Chaos.

use aethel_kernel_rust::euphoria_balance_controller::{
    probe_euphoria_balance_controller, run_euphoria_balance_controller_soak,
    EuphoriaBalanceSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelEuphoriaBalanceControllerWireReport {
    pub euphoria_balance_ready: bool,
    pub at_rest_peak_activation: f32,
    pub at_rest_peak_accel: f32,
    pub hit_delta_v: f32,
    pub hit_peak_activation: f32,
    pub hit_recovery_ratio: f32,
    pub hit_returned_to_idle: bool,
    pub capture_point_error: f32,
    pub step_moved_feet: bool,
    pub step_support_correction: f32,
    pub fall_recovery_active: bool,
    pub fall_recovery_boost_y: f32,
    pub hand_plant_active: bool,
    pub hand_plant_brake_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_growth_ratio: f32,
    pub max_abs_com_vel: f32,
    pub max_abs_accel: f32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub euphoria_full_aaa_ready: bool,
    pub ue5_active_ragdoll_aaa_ready: bool,
    pub chaos_physics_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: EuphoriaBalanceSoakReport,
    wire_on_surface: bool,
) -> KernelEuphoriaBalanceControllerWireReport {
    KernelEuphoriaBalanceControllerWireReport {
        euphoria_balance_ready: r.euphoria_balance_ready,
        at_rest_peak_activation: r.at_rest_peak_activation,
        at_rest_peak_accel: r.at_rest_peak_accel,
        hit_delta_v: r.hit_delta_v,
        hit_peak_activation: r.hit_peak_activation,
        hit_recovery_ratio: r.hit_recovery_ratio,
        hit_returned_to_idle: r.hit_returned_to_idle,
        capture_point_error: r.capture_point_error,
        step_moved_feet: r.step_moved_feet,
        step_support_correction: r.step_support_correction,
        fall_recovery_active: r.fall_recovery_active,
        fall_recovery_boost_y: r.fall_recovery_boost_y,
        hand_plant_active: r.hand_plant_active,
        hand_plant_brake_ratio: r.hand_plant_brake_ratio,
        energy_before: r.energy_before,
        energy_after: r.energy_after,
        energy_growth_ratio: r.energy_growth_ratio,
        max_abs_com_vel: r.max_abs_com_vel,
        max_abs_accel: r.max_abs_accel,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        ue5_active_ragdoll_aaa_ready: r.ue5_active_ragdoll_aaa_ready,
        chaos_physics_aaa_ready: r.chaos_physics_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_euphoria_balance_controller_wire() -> KernelEuphoriaBalanceControllerWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_euphoria_balance_controller_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_euphoria_balance_controller_soak_cmd")
                .is_some();
    to_report(probe_euphoria_balance_controller(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_euphoria_balance_controller_cmd() -> KernelEuphoriaBalanceControllerWireReport {
    probe_euphoria_balance_controller_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelEuphoriaBalanceControllerSoakWireReport {
    pub euphoria_balance_ready: bool,
    pub at_rest_peak_activation: f32,
    pub at_rest_peak_accel: f32,
    pub hit_delta_v: f32,
    pub hit_peak_activation: f32,
    pub hit_recovery_ratio: f32,
    pub hit_returned_to_idle: bool,
    pub capture_point_error: f32,
    pub step_moved_feet: bool,
    pub step_support_correction: f32,
    pub fall_recovery_active: bool,
    pub fall_recovery_boost_y: f32,
    pub hand_plant_active: bool,
    pub hand_plant_brake_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_growth_ratio: f32,
    pub max_abs_com_vel: f32,
    pub max_abs_accel: f32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub euphoria_full_aaa_ready: bool,
    pub ue5_active_ragdoll_aaa_ready: bool,
    pub chaos_physics_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: EuphoriaBalanceSoakReport) -> KernelEuphoriaBalanceControllerSoakWireReport {
    KernelEuphoriaBalanceControllerSoakWireReport {
        euphoria_balance_ready: r.euphoria_balance_ready,
        at_rest_peak_activation: r.at_rest_peak_activation,
        at_rest_peak_accel: r.at_rest_peak_accel,
        hit_delta_v: r.hit_delta_v,
        hit_peak_activation: r.hit_peak_activation,
        hit_recovery_ratio: r.hit_recovery_ratio,
        hit_returned_to_idle: r.hit_returned_to_idle,
        capture_point_error: r.capture_point_error,
        step_moved_feet: r.step_moved_feet,
        step_support_correction: r.step_support_correction,
        fall_recovery_active: r.fall_recovery_active,
        fall_recovery_boost_y: r.fall_recovery_boost_y,
        hand_plant_active: r.hand_plant_active,
        hand_plant_brake_ratio: r.hand_plant_brake_ratio,
        energy_before: r.energy_before,
        energy_after: r.energy_after,
        energy_growth_ratio: r.energy_growth_ratio,
        max_abs_com_vel: r.max_abs_com_vel,
        max_abs_accel: r.max_abs_accel,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        ue5_active_ragdoll_aaa_ready: r.ue5_active_ragdoll_aaa_ready,
        chaos_physics_aaa_ready: r.chaos_physics_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico.
#[tauri::command]
pub fn run_kernel_euphoria_balance_controller_soak_cmd() -> KernelEuphoriaBalanceControllerSoakWireReport {
    soak_to_wire(run_euphoria_balance_controller_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_euphoria_balance_controller_honestly() {
        let r = probe_euphoria_balance_controller_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.euphoria_balance_ready,
            probe_euphoria_balance_controller().euphoria_balance_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_euphoria_balance_controller().evidence_fingerprint
        );
        assert_eq!(
            r.hit_delta_v,
            probe_euphoria_balance_controller().hit_delta_v
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_euphoria_balance_controller_wire();
        assert!(
            !r.euphoria_full_aaa_ready
                && !r.ue5_active_ragdoll_aaa_ready
                && !r.chaos_physics_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_euphoria_balance_controller_soak());
        let kernel = run_euphoria_balance_controller_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(soak.euphoria_balance_ready, kernel.euphoria_balance_ready);
        assert_eq!(soak.hit_recovery_ratio, kernel.hit_recovery_ratio);
        assert_eq!(soak.capture_point_error, kernel.capture_point_error);
        assert_eq!(soak.total_ticks, kernel.total_ticks);
        assert!(
            !soak.euphoria_full_aaa_ready
                && !soak.ue5_active_ragdoll_aaa_ready
                && !soak.chaos_physics_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

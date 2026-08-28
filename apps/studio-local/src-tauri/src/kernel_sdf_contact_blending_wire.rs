//! R2-A — SDF Contact Blending parity wire (Vanguarda P1, letter kq).
//!
//! Expõe o substrate [`aethel_kernel_rust::sdf_contact_blending`] na superfície
//! IPC do Studio Local — probe honesto (medido, nunca hardcoded) + soak
//! determinístico de 64 ticks. `wire_on_surface` é um self-check real: `true`
//! somente quando ambos os comandos desta wire existem no `IPC_ACL_REGISTRY`
//! (`probe_sdf_contact_blending_cmd` + `run_kernel_sdf_contact_blending_soak_cmd`).
//! Flags `sdf_contact_blending_aaa_ready` / `ue5_contact_shadow_aaa_ready` /
//! `nanite_ready` / `dlss_ready` sempre HELD — esta wire prova a matemática de
//! contato SDF, não um shipment Unreal/GPU.

use aethel_kernel_rust::sdf_contact_blending::{
    probe_sdf_contact_blending, run_sdf_contact_blending_soak, SdfContactBlendingSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfContactBlendingWireReport {
    pub sdf_contact_blending_ready: bool,
    pub sphere_dist: f32,
    pub box_dist: f32,
    pub plane_dist: f32,
    pub blended_dist: f32,
    pub plain_min_dist: f32,
    pub contact_factor_near: f32,
    pub contact_factor_far: f32,
    pub shadow_free_space: f32,
    pub shadow_occluded: f32,
    pub nearest_primitive: u32,
    pub contact_map_mean: f32,
    pub contact_map_max: f32,
    pub contact_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub sdf_contact_blending_aaa_ready: bool,
    pub ue5_contact_shadow_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(r: SdfContactBlendingSoakReport, wire_on_surface: bool) -> KernelSdfContactBlendingWireReport {
    KernelSdfContactBlendingWireReport {
        sdf_contact_blending_ready: r.sdf_contact_blending_ready,
        sphere_dist: r.sphere_dist,
        box_dist: r.box_dist,
        plane_dist: r.plane_dist,
        blended_dist: r.blended_dist,
        plain_min_dist: r.plain_min_dist,
        contact_factor_near: r.contact_factor_near,
        contact_factor_far: r.contact_factor_far,
        shadow_free_space: r.shadow_free_space,
        shadow_occluded: r.shadow_occluded,
        nearest_primitive: r.nearest_primitive,
        contact_map_mean: r.contact_map_mean,
        contact_map_max: r.contact_map_max,
        contact_cells_measured: r.contact_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        sdf_contact_blending_aaa_ready: r.sdf_contact_blending_aaa_ready,
        ue5_contact_shadow_aaa_ready: r.ue5_contact_shadow_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_sdf_contact_blending_wire() -> KernelSdfContactBlendingWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_sdf_contact_blending_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_sdf_contact_blending_soak_cmd").is_some();
    to_report(probe_sdf_contact_blending(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_sdf_contact_blending_cmd() -> KernelSdfContactBlendingWireReport {
    probe_sdf_contact_blending_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfContactBlendingSoakWireReport {
    pub sdf_contact_blending_ready: bool,
    pub sphere_dist: f32,
    pub box_dist: f32,
    pub plane_dist: f32,
    pub blended_dist: f32,
    pub plain_min_dist: f32,
    pub contact_factor_near: f32,
    pub contact_factor_far: f32,
    pub shadow_free_space: f32,
    pub shadow_occluded: f32,
    pub nearest_primitive: u32,
    pub contact_map_mean: f32,
    pub contact_map_max: f32,
    pub contact_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub sdf_contact_blending_aaa_ready: bool,
    pub ue5_contact_shadow_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: SdfContactBlendingSoakReport) -> KernelSdfContactBlendingSoakWireReport {
    KernelSdfContactBlendingSoakWireReport {
        sdf_contact_blending_ready: r.sdf_contact_blending_ready,
        sphere_dist: r.sphere_dist,
        box_dist: r.box_dist,
        plane_dist: r.plane_dist,
        blended_dist: r.blended_dist,
        plain_min_dist: r.plain_min_dist,
        contact_factor_near: r.contact_factor_near,
        contact_factor_far: r.contact_factor_far,
        shadow_free_space: r.shadow_free_space,
        shadow_occluded: r.shadow_occluded,
        nearest_primitive: r.nearest_primitive,
        contact_map_mean: r.contact_map_mean,
        contact_map_max: r.contact_map_max,
        contact_cells_measured: r.contact_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        sdf_contact_blending_aaa_ready: r.sdf_contact_blending_aaa_ready,
        ue5_contact_shadow_aaa_ready: r.ue5_contact_shadow_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (64 ticks).
#[tauri::command]
pub fn run_kernel_sdf_contact_blending_soak_cmd() -> KernelSdfContactBlendingSoakWireReport {
    soak_to_wire(run_sdf_contact_blending_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_sdf_contact_blending_honestly() {
        let r = probe_sdf_contact_blending_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.sdf_contact_blending_ready,
            probe_sdf_contact_blending().sdf_contact_blending_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_sdf_contact_blending().evidence_fingerprint
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_sdf_contact_blending_wire();
        assert!(
            !r.sdf_contact_blending_aaa_ready && !r.ue5_contact_shadow_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_sdf_contact_blending_soak());
        let kernel = run_sdf_contact_blending_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.sdf_contact_blending_ready,
            kernel.sdf_contact_blending_ready
        );
        assert_eq!(soak.shadow_occluded, kernel.shadow_occluded);
        assert_eq!(soak.contact_cells_measured, kernel.contact_cells_measured);
        assert!(
            !soak.sdf_contact_blending_aaa_ready && !soak.ue5_contact_shadow_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

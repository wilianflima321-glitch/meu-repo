//! R2-B — Micro-shadows & Bent Normals parity wire (Vanguarda P1, letter kr).
//!
//! Expõe o substrate [`aethel_kernel_rust::micro_shadow_bent_normals`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico de 64 ticks. `wire_on_surface` é um self-check real:
//! `true` somente quando ambos os comandos desta wire existem no
//! `IPC_ACL_REGISTRY` (`probe_micro_shadow_bent_normals_cmd` +
//! `run_kernel_micro_shadow_bent_normals_soak_cmd`). Flags
//! `micro_shadow_aaa_ready` / `ue5_rt_shadows_aaa_ready` / `nanite_ready` /
//! `dlss_ready` sempre HELD — esta wire prova a matemática de oclusão
//! micro-shadow + bent normals, não um shipment Unreal/GPU.

use aethel_kernel_rust::micro_shadow_bent_normals::{
    probe_micro_shadow_bent_normals, run_micro_shadow_bent_normals_soak,
    MicroShadowBentNormalsSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicroShadowBentNormalsWireReport {
    pub micro_shadow_bent_normals_ready: bool,
    pub ray_sphere_closed_form_t: f32,
    pub free_space_visibility: f32,
    pub free_space_bend_dot_n: f32,
    pub occluded_visibility: f32,
    pub bent_divergence_dot_n: f32,
    pub bent_tilt_x: f32,
    pub micro_shadow_free: f32,
    pub micro_shadow_occluded: f32,
    pub micro_shadow_backfacing: f32,
    pub grid_mean_bend_angle: f32,
    pub grid_mean_visibility: f32,
    pub grid_cells_occluded: u32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub micro_shadow_aaa_ready: bool,
    pub ue5_rt_shadows_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: MicroShadowBentNormalsSoakReport,
    wire_on_surface: bool,
) -> KernelMicroShadowBentNormalsWireReport {
    KernelMicroShadowBentNormalsWireReport {
        micro_shadow_bent_normals_ready: r.micro_shadow_bent_normals_ready,
        ray_sphere_closed_form_t: r.ray_sphere_closed_form_t,
        free_space_visibility: r.free_space_visibility,
        free_space_bend_dot_n: r.free_space_bend_dot_n,
        occluded_visibility: r.occluded_visibility,
        bent_divergence_dot_n: r.bent_divergence_dot_n,
        bent_tilt_x: r.bent_tilt_x,
        micro_shadow_free: r.micro_shadow_free,
        micro_shadow_occluded: r.micro_shadow_occluded,
        micro_shadow_backfacing: r.micro_shadow_backfacing,
        grid_mean_bend_angle: r.grid_mean_bend_angle,
        grid_mean_visibility: r.grid_mean_visibility,
        grid_cells_occluded: r.grid_cells_occluded,
        grid_cells_measured: r.grid_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        micro_shadow_aaa_ready: r.micro_shadow_aaa_ready,
        ue5_rt_shadows_aaa_ready: r.ue5_rt_shadows_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_micro_shadow_bent_normals_wire() -> KernelMicroShadowBentNormalsWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_micro_shadow_bent_normals_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_micro_shadow_bent_normals_soak_cmd")
                .is_some();
    to_report(probe_micro_shadow_bent_normals(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_micro_shadow_bent_normals_cmd() -> KernelMicroShadowBentNormalsWireReport {
    probe_micro_shadow_bent_normals_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicroShadowBentNormalsSoakWireReport {
    pub micro_shadow_bent_normals_ready: bool,
    pub ray_sphere_closed_form_t: f32,
    pub free_space_visibility: f32,
    pub free_space_bend_dot_n: f32,
    pub occluded_visibility: f32,
    pub bent_divergence_dot_n: f32,
    pub bent_tilt_x: f32,
    pub micro_shadow_free: f32,
    pub micro_shadow_occluded: f32,
    pub micro_shadow_backfacing: f32,
    pub grid_mean_bend_angle: f32,
    pub grid_mean_visibility: f32,
    pub grid_cells_occluded: u32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub micro_shadow_aaa_ready: bool,
    pub ue5_rt_shadows_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: MicroShadowBentNormalsSoakReport) -> KernelMicroShadowBentNormalsSoakWireReport {
    KernelMicroShadowBentNormalsSoakWireReport {
        micro_shadow_bent_normals_ready: r.micro_shadow_bent_normals_ready,
        ray_sphere_closed_form_t: r.ray_sphere_closed_form_t,
        free_space_visibility: r.free_space_visibility,
        free_space_bend_dot_n: r.free_space_bend_dot_n,
        occluded_visibility: r.occluded_visibility,
        bent_divergence_dot_n: r.bent_divergence_dot_n,
        bent_tilt_x: r.bent_tilt_x,
        micro_shadow_free: r.micro_shadow_free,
        micro_shadow_occluded: r.micro_shadow_occluded,
        micro_shadow_backfacing: r.micro_shadow_backfacing,
        grid_mean_bend_angle: r.grid_mean_bend_angle,
        grid_mean_visibility: r.grid_mean_visibility,
        grid_cells_occluded: r.grid_cells_occluded,
        grid_cells_measured: r.grid_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        micro_shadow_aaa_ready: r.micro_shadow_aaa_ready,
        ue5_rt_shadows_aaa_ready: r.ue5_rt_shadows_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (64 ticks).
#[tauri::command]
pub fn run_kernel_micro_shadow_bent_normals_soak_cmd() -> KernelMicroShadowBentNormalsSoakWireReport {
    soak_to_wire(run_micro_shadow_bent_normals_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_micro_shadow_bent_normals_honestly() {
        let r = probe_micro_shadow_bent_normals_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.micro_shadow_bent_normals_ready,
            probe_micro_shadow_bent_normals().micro_shadow_bent_normals_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_micro_shadow_bent_normals().evidence_fingerprint
        );
        assert_eq!(
            r.grid_cells_measured,
            probe_micro_shadow_bent_normals().grid_cells_measured
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_micro_shadow_bent_normals_wire();
        assert!(
            !r.micro_shadow_aaa_ready && !r.ue5_rt_shadows_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_micro_shadow_bent_normals_soak());
        let kernel = run_micro_shadow_bent_normals_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.micro_shadow_bent_normals_ready,
            kernel.micro_shadow_bent_normals_ready
        );
        assert_eq!(soak.occluded_visibility, kernel.occluded_visibility);
        assert_eq!(soak.bent_tilt_x, kernel.bent_tilt_x);
        assert_eq!(soak.grid_cells_measured, kernel.grid_cells_measured);
        assert!(
            !soak.micro_shadow_aaa_ready && !soak.ue5_rt_shadows_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

//! R2-C — Dynamic Surface Deformation parity wire (Vanguarda P2, letter ks).
//!
//! Expõe o substrate [`aethel_kernel_rust::dynamic_surface_deformation`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico de 480 ticks (4 s a 120 Hz). `wire_on_surface` é um
//! self-check real: `true` somente quando ambos os comandos desta wire existem
//! no `IPC_ACL_REGISTRY` (`probe_dynamic_surface_deformation_cmd` +
//! `run_kernel_dynamic_surface_deformation_soak_cmd`). Flags
//! `dynamic_surface_aaa_ready` / `ue5_chaos_softbody_aaa_ready` /
//! `world_shatter_aaa_ready` / `nanite_ready` / `dlss_ready` sempre HELD — esta
//! wire prova a matemática LoG volume-conservante de deformação de superfície,
//! não um shipment Unreal/Chaos.

use aethel_kernel_rust::dynamic_surface_deformation::{
    probe_dynamic_surface_deformation, run_dynamic_surface_deformation_soak,
    DynamicSurfaceDeformationSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicSurfaceDeformationWireReport {
    pub dynamic_surface_deformation_ready: bool,
    pub ricker_volume_integral: f32,
    pub impact_volume_drift: f32,
    pub peak_dent_depth: f32,
    pub rim_bulge_height: f32,
    pub permanent_dent_depth: f32,
    pub permanent_fraction: f32,
    pub elastic_recovery_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_dissipation_ratio: f32,
    pub max_abs_displacement: f32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub dynamic_surface_aaa_ready: bool,
    pub ue5_chaos_softbody_aaa_ready: bool,
    pub world_shatter_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: DynamicSurfaceDeformationSoakReport,
    wire_on_surface: bool,
) -> KernelDynamicSurfaceDeformationWireReport {
    KernelDynamicSurfaceDeformationWireReport {
        dynamic_surface_deformation_ready: r.dynamic_surface_deformation_ready,
        ricker_volume_integral: r.ricker_volume_integral,
        impact_volume_drift: r.impact_volume_drift,
        peak_dent_depth: r.peak_dent_depth,
        rim_bulge_height: r.rim_bulge_height,
        permanent_dent_depth: r.permanent_dent_depth,
        permanent_fraction: r.permanent_fraction,
        elastic_recovery_ratio: r.elastic_recovery_ratio,
        energy_before: r.energy_before,
        energy_after: r.energy_after,
        energy_dissipation_ratio: r.energy_dissipation_ratio,
        max_abs_displacement: r.max_abs_displacement,
        grid_cells_measured: r.grid_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        dynamic_surface_aaa_ready: r.dynamic_surface_aaa_ready,
        ue5_chaos_softbody_aaa_ready: r.ue5_chaos_softbody_aaa_ready,
        world_shatter_aaa_ready: r.world_shatter_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_dynamic_surface_deformation_wire() -> KernelDynamicSurfaceDeformationWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_dynamic_surface_deformation_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_dynamic_surface_deformation_soak_cmd")
                .is_some();
    to_report(probe_dynamic_surface_deformation(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_dynamic_surface_deformation_cmd() -> KernelDynamicSurfaceDeformationWireReport {
    probe_dynamic_surface_deformation_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicSurfaceDeformationSoakWireReport {
    pub dynamic_surface_deformation_ready: bool,
    pub ricker_volume_integral: f32,
    pub impact_volume_drift: f32,
    pub peak_dent_depth: f32,
    pub rim_bulge_height: f32,
    pub permanent_dent_depth: f32,
    pub permanent_fraction: f32,
    pub elastic_recovery_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_dissipation_ratio: f32,
    pub max_abs_displacement: f32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub dynamic_surface_aaa_ready: bool,
    pub ue5_chaos_softbody_aaa_ready: bool,
    pub world_shatter_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(
    r: DynamicSurfaceDeformationSoakReport,
) -> KernelDynamicSurfaceDeformationSoakWireReport {
    KernelDynamicSurfaceDeformationSoakWireReport {
        dynamic_surface_deformation_ready: r.dynamic_surface_deformation_ready,
        ricker_volume_integral: r.ricker_volume_integral,
        impact_volume_drift: r.impact_volume_drift,
        peak_dent_depth: r.peak_dent_depth,
        rim_bulge_height: r.rim_bulge_height,
        permanent_dent_depth: r.permanent_dent_depth,
        permanent_fraction: r.permanent_fraction,
        elastic_recovery_ratio: r.elastic_recovery_ratio,
        energy_before: r.energy_before,
        energy_after: r.energy_after,
        energy_dissipation_ratio: r.energy_dissipation_ratio,
        max_abs_displacement: r.max_abs_displacement,
        grid_cells_measured: r.grid_cells_measured,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        dynamic_surface_aaa_ready: r.dynamic_surface_aaa_ready,
        ue5_chaos_softbody_aaa_ready: r.ue5_chaos_softbody_aaa_ready,
        world_shatter_aaa_ready: r.world_shatter_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (480 ticks).
#[tauri::command]
pub fn run_kernel_dynamic_surface_deformation_soak_cmd(
) -> KernelDynamicSurfaceDeformationSoakWireReport {
    soak_to_wire(run_dynamic_surface_deformation_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_dynamic_surface_deformation_honestly() {
        let r = probe_dynamic_surface_deformation_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.dynamic_surface_deformation_ready,
            probe_dynamic_surface_deformation().dynamic_surface_deformation_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_dynamic_surface_deformation().evidence_fingerprint
        );
        assert_eq!(
            r.grid_cells_measured,
            probe_dynamic_surface_deformation().grid_cells_measured
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_dynamic_surface_deformation_wire();
        assert!(
            !r.dynamic_surface_aaa_ready
                && !r.ue5_chaos_softbody_aaa_ready
                && !r.world_shatter_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_dynamic_surface_deformation_soak());
        let kernel = run_dynamic_surface_deformation_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.dynamic_surface_deformation_ready,
            kernel.dynamic_surface_deformation_ready
        );
        assert_eq!(soak.peak_dent_depth, kernel.peak_dent_depth);
        assert_eq!(soak.rim_bulge_height, kernel.rim_bulge_height);
        assert_eq!(soak.grid_cells_measured, kernel.grid_cells_measured);
        assert!(
            !soak.dynamic_surface_aaa_ready
                && !soak.ue5_chaos_softbody_aaa_ready
                && !soak.world_shatter_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

//! R2-G — World Forge Densification parity wire (Vanguarda P3/P1, letter ku).
//!
//! Expõe o substrate [`aethel_kernel_rust::world_forge_densification`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico do densification sweep de World Forge. `wire_on_surface`
//! é um self-check real: `true` somente quando ambos os comandos desta wire
//! existem no `IPC_ACL_REGISTRY` (`probe_world_forge_densification_cmd` +
//! `run_kernel_world_forge_densification_soak_cmd`). A wire compõe sobre o grid
//! R1.4 (`spatial_partition_hibernation`) como autoridade de densificação, com
//! paridade de broadphase, edge de contato SDF (R2-A) e payload de rest para o
//! wind field (R2-H). Flags AAA (`nanite_density` / `pcg_gpu` / `world_forge`)
//! sempre HELD — esta wire prova a densificação determinística e fail-closed,
//! não um shipment de PCG GPU/Nanite.

use aethel_kernel_rust::world_forge_densification::{
    probe_world_forge_densification, run_world_forge_densification_soak,
    WorldForgeDensificationSoakReport,
};
use serde::Serialize;

/// Reporte da wire — espelha o soak do kernel em camelCase + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelWorldForgeDensificationWireReport {
    pub world_forge_densification_ready: bool,
    pub instance_count: u32,
    pub occupied_cells: u32,
    pub peak_cell_density: u32,
    pub unique_kinds: u32,
    pub kind_histogram_grass: u32,
    pub kind_histogram_bush: u32,
    pub kind_histogram_tree: u32,
    pub kind_histogram_rock: u32,
    pub grid_parity: bool,
    pub pairs_match_brute_force: bool,
    pub sdf_contact_inside: f32,
    pub sdf_contact_far: f32,
    pub sdf_dist_finite: bool,
    pub bend_payload_bounded: bool,
    pub capacity_invariant: bool,
    pub cell_mapping_ok: bool,
    pub placement_fingerprint: u64,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
    pub nanite_density_aaa_ready: bool,
    pub pcg_gpu_aaa_ready: bool,
    pub world_forge_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: WorldForgeDensificationSoakReport,
    wire_on_surface: bool,
) -> KernelWorldForgeDensificationWireReport {
    KernelWorldForgeDensificationWireReport {
        world_forge_densification_ready: r.world_forge_densification_ready,
        instance_count: r.instance_count,
        occupied_cells: r.occupied_cells,
        peak_cell_density: r.peak_cell_density,
        unique_kinds: r.unique_kinds,
        kind_histogram_grass: r.kind_histogram_grass,
        kind_histogram_bush: r.kind_histogram_bush,
        kind_histogram_tree: r.kind_histogram_tree,
        kind_histogram_rock: r.kind_histogram_rock,
        grid_parity: r.grid_parity,
        pairs_match_brute_force: r.pairs_match_brute_force,
        sdf_contact_inside: r.sdf_contact_inside,
        sdf_contact_far: r.sdf_contact_far,
        sdf_dist_finite: r.sdf_dist_finite,
        bend_payload_bounded: r.bend_payload_bounded,
        capacity_invariant: r.capacity_invariant,
        cell_mapping_ok: r.cell_mapping_ok,
        placement_fingerprint: r.placement_fingerprint,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
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
        nanite_density_aaa_ready: r.nanite_density_aaa_ready,
        pcg_gpu_aaa_ready: r.pcg_gpu_aaa_ready,
        world_forge_aaa_ready: r.world_forge_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_world_forge_densification_wire() -> KernelWorldForgeDensificationWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_world_forge_densification_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_world_forge_densification_soak_cmd").is_some();
    to_report(probe_world_forge_densification(), wire_on_surface)
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_world_forge_densification_cmd() -> KernelWorldForgeDensificationWireReport {
    probe_world_forge_densification_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelWorldForgeDensificationSoakWireReport {
    pub world_forge_densification_ready: bool,
    pub instance_count: u32,
    pub occupied_cells: u32,
    pub peak_cell_density: u32,
    pub unique_kinds: u32,
    pub kind_histogram_grass: u32,
    pub kind_histogram_bush: u32,
    pub kind_histogram_tree: u32,
    pub kind_histogram_rock: u32,
    pub grid_parity: bool,
    pub pairs_match_brute_force: bool,
    pub sdf_contact_inside: f32,
    pub sdf_contact_far: f32,
    pub sdf_dist_finite: bool,
    pub bend_payload_bounded: bool,
    pub capacity_invariant: bool,
    pub cell_mapping_ok: bool,
    pub placement_fingerprint: u64,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
    pub nanite_density_aaa_ready: bool,
    pub pcg_gpu_aaa_ready: bool,
    pub world_forge_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(
    r: WorldForgeDensificationSoakReport,
) -> KernelWorldForgeDensificationSoakWireReport {
    KernelWorldForgeDensificationSoakWireReport {
        world_forge_densification_ready: r.world_forge_densification_ready,
        instance_count: r.instance_count,
        occupied_cells: r.occupied_cells,
        peak_cell_density: r.peak_cell_density,
        unique_kinds: r.unique_kinds,
        kind_histogram_grass: r.kind_histogram_grass,
        kind_histogram_bush: r.kind_histogram_bush,
        kind_histogram_tree: r.kind_histogram_tree,
        kind_histogram_rock: r.kind_histogram_rock,
        grid_parity: r.grid_parity,
        pairs_match_brute_force: r.pairs_match_brute_force,
        sdf_contact_inside: r.sdf_contact_inside,
        sdf_contact_far: r.sdf_contact_far,
        sdf_dist_finite: r.sdf_dist_finite,
        bend_payload_bounded: r.bend_payload_bounded,
        capacity_invariant: r.capacity_invariant,
        cell_mapping_ok: r.cell_mapping_ok,
        placement_fingerprint: r.placement_fingerprint,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
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
        nanite_density_aaa_ready: r.nanite_density_aaa_ready,
        pcg_gpu_aaa_ready: r.pcg_gpu_aaa_ready,
        world_forge_aaa_ready: r.world_forge_aaa_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
    }
}

/// Comando Tauri do soak determinístico (densification replay bit-idêntico).
#[tauri::command]
pub fn run_kernel_world_forge_densification_soak_cmd(
) -> KernelWorldForgeDensificationSoakWireReport {
    soak_to_wire(run_world_forge_densification_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_world_forge_densification_honestly() {
        let r = probe_world_forge_densification_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.world_forge_densification_ready,
            probe_world_forge_densification().world_forge_densification_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            probe_world_forge_densification().evidence_fingerprint
        );
        assert_eq!(
            r.instance_count,
            probe_world_forge_densification().instance_count
        );
        assert_eq!(r.unique_kinds, probe_world_forge_densification().unique_kinds);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_world_forge_densification_wire();
        assert!(
            !r.nanite_density_aaa_ready && !r.pcg_gpu_aaa_ready && !r.world_forge_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_world_forge_densification_soak());
        let kernel = run_world_forge_densification_soak();
        assert_eq!(soak.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(
            soak.world_forge_densification_ready,
            kernel.world_forge_densification_ready
        );
        assert_eq!(soak.instance_count, kernel.instance_count);
        assert_eq!(soak.occupied_cells, kernel.occupied_cells);
        assert_eq!(soak.sdf_contact_inside, kernel.sdf_contact_inside);
        assert!(soak.distinct_from_hg_spatial_grid);
        assert!(
            !soak.nanite_density_aaa_ready && !soak.pcg_gpu_aaa_ready && !soak.world_forge_aaa_ready,
            "soak wire report keeps AAA flags HELD"
        );
    }
}

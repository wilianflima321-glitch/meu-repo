//! Internal Voxel Density desktop wire — letter **eu**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::internal_voxel_density`
//! (depth-below-surface → layered density + material DNA + vein noise).
//! Honesty probe `internalVoxelDensityReady` is **distinct** from et
//! `svoDepthLodReady` and prior geometry/fluid/foundation probes.
//! Full volumetric meat AAA / MagicaCSG / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::internal_voxel_density::{
    probe_internal_voxel_density as kernel_probe, run_internal_voxel_density_soak,
    InternalVoxelDensitySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelInternalVoxelDensityWireReport {
    pub internal_voxel_density_ready: bool,
    pub outside_empty: bool,
    pub inside_nonzero: bool,
    pub deep_denser_than_shallow_rock: bool,
    pub materials_distinct: bool,
    pub vein_deterministic: bool,
    pub outputs_finite: bool,
    pub outside_density: f32,
    pub shallow_rock_density: f32,
    pub deep_rock_density: f32,
    pub metal_core_density: f32,
    pub wood_core_density: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub volumetric_meat_aaa_ready: bool,
    pub magica_csg_parity_ready: bool,
    pub nanite_svo_aaa_ready: bool,
}

fn to_report(
    r: InternalVoxelDensitySoakReport,
    note: impl Into<String>,
) -> KernelInternalVoxelDensityWireReport {
    KernelInternalVoxelDensityWireReport {
        internal_voxel_density_ready: r.internal_voxel_density_ready,
        outside_empty: r.outside_empty,
        inside_nonzero: r.inside_nonzero,
        deep_denser_than_shallow_rock: r.deep_denser_than_shallow_rock,
        materials_distinct: r.materials_distinct,
        vein_deterministic: r.vein_deterministic,
        outputs_finite: r.outputs_finite,
        outside_density: r.outside_density,
        shallow_rock_density: r.shallow_rock_density,
        deep_rock_density: r.deep_rock_density,
        metal_core_density: r.metal_core_density,
        wood_core_density: r.wood_core_density,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "eu".into(),
        note: note.into(),
        volumetric_meat_aaa_ready: r.volumetric_meat_aaa_ready,
        magica_csg_parity_ready: r.magica_csg_parity_ready,
        nanite_svo_aaa_ready: r.nanite_svo_aaa_ready,
    }
}

/// Run internal voxel density soak via kernel.
pub fn run_kernel_internal_voxel_density_soak() -> KernelInternalVoxelDensityWireReport {
    let r = run_internal_voxel_density_soak();
    let note = if !r.internal_voxel_density_ready {
        "Internal voxel density soak failed — internalVoxelDensityReady stays false"
    } else {
        "Desktop soak: depth-below-surface → crust/mantle/core density + material DNA + vein noise; outside empty; deep rock denser; materials distinct — internalVoxelDensityReady true; volumetric_meat_aaa_ready false; distinct from et svoDepthLodReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `internalVoxelDensityReady` (letter eu).
pub fn probe_internal_voxel_density() -> KernelInternalVoxelDensityWireReport {
    to_report(
        kernel_probe(),
        "Internal voxel density probe (letter eu) — distinct from svoDepthLodReady, hybridGeometrySvoReady, sdfSculptorReady, and probe_kernel_foundation; volumetric_meat_aaa_ready HELD",
    )
}

/// Tauri IPC — internal voxel density honesty.
#[tauri::command]
pub fn probe_internal_voxel_density_cmd() -> KernelInternalVoxelDensityWireReport {
    probe_internal_voxel_density()
}

/// Tauri IPC — run internal voxel density soak.
#[tauri::command]
pub fn run_kernel_internal_voxel_density_soak_cmd() -> KernelInternalVoxelDensityWireReport {
    run_kernel_internal_voxel_density_soak()
}

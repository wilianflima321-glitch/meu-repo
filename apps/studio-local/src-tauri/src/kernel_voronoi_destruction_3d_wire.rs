//! Voronoi 3D Destruction desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::voronoi_destruction_3d`.
//! Exposes honesty probe for CW2 N≥2048 Voronoi fracture integration to TypeScript.

use aethel_kernel_rust::voronoi_destruction_3d::{
    probe_voronoi_destruction_3d as kernel_probe, VoronoiDestruction3DProbeReport
};

/// Honesty probe — soak-gated readiness.
pub fn probe_voronoi_destruction_3d() -> VoronoiDestruction3DProbeReport {
    kernel_probe()
}

/// Tauri IPC — voronoi destruction honesty.
#[tauri::command]
pub fn probe_voronoi_destruction_3d_cmd() -> VoronoiDestruction3DProbeReport {
    probe_voronoi_destruction_3d()
}

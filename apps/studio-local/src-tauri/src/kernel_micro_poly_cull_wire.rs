//! Micro-Poly GPU Culling desktop wire — letter **gz** (P1/Onda G Micro-Poly Foundation).
//!
//! Thin studio-local IPC over `aethel_kernel_rust::gpu_culling_compute`.
//! Exposes honesty probe for Compute Shader Frustum Culling integration to TypeScript.

use aethel_kernel_rust::gpu_culling_compute::{
    probe_gpu_culling_compute as kernel_probe, GpuCullingComputeSoakReport
};

/// Honesty probe — soak-gated readiness.
pub fn probe_micro_poly_cull() -> GpuCullingComputeSoakReport {
    kernel_probe()
}

/// Tauri IPC — micro-poly culling honesty.
#[tauri::command]
pub fn probe_micro_poly_cull_cmd() -> GpuCullingComputeSoakReport {
    probe_micro_poly_cull()
}

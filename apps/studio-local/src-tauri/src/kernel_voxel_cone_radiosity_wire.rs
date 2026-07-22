//! Voxel Cone Radiosity desktop wire — letter **ga**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::voxel_cone_radiosity`
//! (seeded fixed-res radiance/occupancy grid + cone march; soak proves
//! occluded cone lower irradiance than open + same-seed + energy ≥ 0).
//! Honesty probe `voxelConeRadiosityReady` is **distinct** from fz
//! `symmetricVectorAlgebraReady`, fy `recursiveFractalEnhancementReady`,
//! fx `blueNoiseDitheringReady`, fw `quantumOverlapReady`, and prior.
//! Full Lumen/VXGI AAA (`lumen_vxgi_aaa_ready`) stays false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::voxel_cone_radiosity::{
    probe_voxel_cone_radiosity as kernel_probe, run_voxel_cone_radiosity_soak,
    VoxelConeRadiositySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelVoxelConeRadiosityWireReport {
    pub voxel_cone_radiosity_ready: bool,
    pub occluded_lower_than_open: bool,
    pub energy_non_negative: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub open_energy: f32,
    pub occluded_energy: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_symmetric_vector_algebra_probe: bool,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub lumen_vxgi_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: VoxelConeRadiositySoakReport,
    note: impl Into<String>,
) -> KernelVoxelConeRadiosityWireReport {
    KernelVoxelConeRadiosityWireReport {
        voxel_cone_radiosity_ready: r.voxel_cone_radiosity_ready,
        occluded_lower_than_open: r.occluded_lower_than_open,
        energy_non_negative: r.energy_non_negative,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        open_energy: r.open_energy,
        occluded_energy: r.occluded_energy,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_symmetric_vector_algebra_probe: r.distinct_from_symmetric_vector_algebra_probe,
        distinct_from_recursive_fractal_enhancement_probe: r
            .distinct_from_recursive_fractal_enhancement_probe,
        distinct_from_blue_noise_dithering_probe: r.distinct_from_blue_noise_dithering_probe,
        distinct_from_quantum_overlap_probe: r.distinct_from_quantum_overlap_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "ga".into(),
        note: note.into(),
        lumen_vxgi_aaa_ready: r.lumen_vxgi_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run voxel cone radiosity soak via kernel.
pub fn run_kernel_voxel_cone_radiosity_soak() -> KernelVoxelConeRadiosityWireReport {
    let r = run_voxel_cone_radiosity_soak();
    let note = if !r.voxel_cone_radiosity_ready {
        "Voxel cone radiosity soak failed — voxelConeRadiosityReady stays false"
    } else {
        "Desktop soak: seeded radiance/occupancy grid + cone march; occluded < open irradiance; same seed→same; energy≥0 — voxelConeRadiosityReady true; lumen_vxgi_aaa_ready false; distinct from fz symmetricVectorAlgebraReady + fy recursiveFractalEnhancementReady + fx blueNoiseDitheringReady + fw quantumOverlapReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `voxelConeRadiosityReady` (letter ga).
pub fn probe_voxel_cone_radiosity() -> KernelVoxelConeRadiosityWireReport {
    to_report(
        kernel_probe(),
        "Voxel cone radiosity probe (letter ga) — distinct from symmetricVectorAlgebraReady, recursiveFractalEnhancementReady, blueNoiseDitheringReady, quantumOverlapReady, and probe_kernel_foundation; lumen_vxgi_aaa_ready HELD",
    )
}

/// Tauri IPC — voxel cone radiosity honesty.
#[tauri::command]
pub fn probe_voxel_cone_radiosity_cmd() -> KernelVoxelConeRadiosityWireReport {
    probe_voxel_cone_radiosity()
}

/// Tauri IPC — run voxel cone radiosity soak.
#[tauri::command]
pub fn run_kernel_voxel_cone_radiosity_soak_cmd() -> KernelVoxelConeRadiosityWireReport {
    run_kernel_voxel_cone_radiosity_soak()
}

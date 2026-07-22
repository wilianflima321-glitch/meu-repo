//! Radiance Cascades GI desktop wire — letter **gm**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::radiance_cascades_gi`
//! (multi-res probe cascades + coarse→fine merge; soak proves lit > dark,
//! merge energy ≥ 0 / monotonic, same-seed).
//! Honesty probe `radianceCascadesGiReady` is **distinct** from ga
//! `voxelConeRadiosityReady`, gk `hybridClusterShadingVsvmReady`, neural GI
//! stubs, and prior (never touch those probes).
//! Full Lumen / radiance-cascades AAA stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::radiance_cascades_gi::{
    probe_radiance_cascades_gi as kernel_probe, run_radiance_cascades_gi_soak,
    RadianceCascadesGiSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelRadianceCascadesGiWireReport {
    pub radiance_cascades_gi_ready: bool,
    pub lit_exceeds_dark: bool,
    pub cascade_merge_energy_non_negative: bool,
    pub cascade_merge_monotonic: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub lit_energy: f32,
    pub dark_energy: f32,
    pub fine_energy_before_merge: f32,
    pub fine_energy_after_merge: f32,
    pub cascade_levels: u32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_voxel_cone_radiosity_probe: bool,
    pub distinct_from_hybrid_cluster_shading_vsvm_probe: bool,
    pub distinct_from_neural_gi_stub_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub lumen_radiance_cascades_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: RadianceCascadesGiSoakReport,
    note: impl Into<String>,
) -> KernelRadianceCascadesGiWireReport {
    KernelRadianceCascadesGiWireReport {
        radiance_cascades_gi_ready: r.radiance_cascades_gi_ready,
        lit_exceeds_dark: r.lit_exceeds_dark,
        cascade_merge_energy_non_negative: r.cascade_merge_energy_non_negative,
        cascade_merge_monotonic: r.cascade_merge_monotonic,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        lit_energy: r.lit_energy,
        dark_energy: r.dark_energy,
        fine_energy_before_merge: r.fine_energy_before_merge,
        fine_energy_after_merge: r.fine_energy_after_merge,
        cascade_levels: r.cascade_levels,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_voxel_cone_radiosity_probe: r.distinct_from_voxel_cone_radiosity_probe,
        distinct_from_hybrid_cluster_shading_vsvm_probe: r
            .distinct_from_hybrid_cluster_shading_vsvm_probe,
        distinct_from_neural_gi_stub_probe: r.distinct_from_neural_gi_stub_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gm".into(),
        note: note.into(),
        lumen_radiance_cascades_aaa_ready: r.lumen_radiance_cascades_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Radiance Cascades GI soak via kernel.
pub fn run_kernel_radiance_cascades_gi_soak() -> KernelRadianceCascadesGiWireReport {
    let r = run_radiance_cascades_gi_soak();
    let note = if !r.radiance_cascades_gi_ready {
        "Radiance Cascades GI soak failed — radianceCascadesGiReady stays false"
    } else {
        "Desktop soak: multi-res probe cascades + coarse→fine merge; lit>dark + merge energy≥0/monotonic + same seed→same — radianceCascadesGiReady true; lumen_radiance_cascades_aaa_ready false; distinct from ga voxelConeRadiosityReady + gk hybridClusterShadingVsvmReady + neural GI stubs + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `radianceCascadesGiReady` (letter gm).
pub fn probe_radiance_cascades_gi() -> KernelRadianceCascadesGiWireReport {
    to_report(
        kernel_probe(),
        "Radiance Cascades GI probe (letter gm) — distinct from voxelConeRadiosityReady, hybridClusterShadingVsvmReady, neuralGiIrradianceReady, and probe_kernel_foundation; lumen_radiance_cascades_aaa_ready HELD",
    )
}

/// Tauri IPC — Radiance Cascades GI honesty.
#[tauri::command]
pub fn probe_radiance_cascades_gi_cmd() -> KernelRadianceCascadesGiWireReport {
    probe_radiance_cascades_gi()
}

/// Tauri IPC — run Radiance Cascades GI soak.
#[tauri::command]
pub fn run_kernel_radiance_cascades_gi_soak_cmd() -> KernelRadianceCascadesGiWireReport {
    run_kernel_radiance_cascades_gi_soak()
}

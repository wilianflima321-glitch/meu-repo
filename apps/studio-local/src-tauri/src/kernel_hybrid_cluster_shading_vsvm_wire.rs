//! Hybrid Cluster Shading VSVM desktop wire — letter **gk**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hybrid_cluster_shading_vsvm`
//! (tile/depth cluster partition + point-light assignment + Lambert/Blinn
//! fixture shade; soak proves lit > unlit, non-empty cluster lists, light
//! localization, same-seed, no NaN).
//! Honesty probe `hybridClusterShadingVsvmReady` is **distinct** from gg
//! `fluidNinjaComputeReady`, gf `acesCinematicTonemapperReady`, ge
//! `preintegratedSssTransmittanceReady`, and gd `chromaticGlassRefractionReady`
//! (never touch those probes).
//! Full Forward+ / UE clustered deferred AAA stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::hybrid_cluster_shading_vsvm::{
    probe_hybrid_cluster_shading_vsvm as kernel_probe, run_hybrid_cluster_shading_vsvm_soak,
    HybridClusterShadingVsvmSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHybridClusterShadingVsvmWireReport {
    pub hybrid_cluster_shading_vsvm_ready: bool,
    pub lit_exceeds_unlit: bool,
    pub cluster_lists_non_empty: bool,
    pub lights_localized: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub non_empty_clusters: u32,
    pub lit_luminance: f32,
    pub unlit_luminance: f32,
    pub mean_fixture_luminance: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_forward_plus_ready: bool,
    pub ue_clustered_deferred_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: HybridClusterShadingVsvmSoakReport,
    note: impl Into<String>,
) -> KernelHybridClusterShadingVsvmWireReport {
    KernelHybridClusterShadingVsvmWireReport {
        hybrid_cluster_shading_vsvm_ready: r.hybrid_cluster_shading_vsvm_ready,
        lit_exceeds_unlit: r.lit_exceeds_unlit,
        cluster_lists_non_empty: r.cluster_lists_non_empty,
        lights_localized: r.lights_localized,
        same_seed_same_output: r.same_seed_same_output,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        no_nan: r.no_nan,
        state_mutated: r.state_mutated,
        non_empty_clusters: r.non_empty_clusters,
        lit_luminance: r.lit_luminance,
        unlit_luminance: r.unlit_luminance,
        mean_fixture_luminance: r.mean_fixture_luminance,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gk".into(),
        note: note.into(),
        full_forward_plus_ready: r.full_forward_plus_ready,
        ue_clustered_deferred_aaa_ready: r.ue_clustered_deferred_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Hybrid Cluster Shading VSVM soak via kernel.
pub fn run_kernel_hybrid_cluster_shading_vsvm_soak() -> KernelHybridClusterShadingVsvmWireReport {
    let r = run_hybrid_cluster_shading_vsvm_soak();
    let note = if !r.hybrid_cluster_shading_vsvm_ready {
        "Hybrid Cluster Shading VSVM soak failed — hybridClusterShadingVsvmReady stays false"
    } else {
        "Desktop soak: tile/depth cluster partition + point-light assignment + Lambert/Blinn fixture; lit>unlit + non-empty cluster lists + lights localized + same seed→same + no NaN — hybridClusterShadingVsvmReady true; full_forward_plus_ready / ue_clustered_deferred_aaa_ready false; distinct from gg fluidNinjaComputeReady + gf acesCinematicTonemapperReady + ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hybridClusterShadingVsvmReady` (letter gk).
pub fn probe_hybrid_cluster_shading_vsvm() -> KernelHybridClusterShadingVsvmWireReport {
    to_report(
        kernel_probe(),
        "Hybrid Cluster Shading VSVM probe (letter gk) — distinct from fluidNinjaComputeReady, acesCinematicTonemapperReady, preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, and probe_kernel_foundation; full_forward_plus_ready / ue_clustered_deferred_aaa_ready HELD",
    )
}

/// Tauri IPC — Hybrid Cluster Shading VSVM honesty.
#[tauri::command]
pub fn probe_hybrid_cluster_shading_vsvm_cmd() -> KernelHybridClusterShadingVsvmWireReport {
    probe_hybrid_cluster_shading_vsvm()
}

/// Tauri IPC — run Hybrid Cluster Shading VSVM soak.
#[tauri::command]
pub fn run_kernel_hybrid_cluster_shading_vsvm_soak_cmd() -> KernelHybridClusterShadingVsvmWireReport {
    run_kernel_hybrid_cluster_shading_vsvm_soak()
}

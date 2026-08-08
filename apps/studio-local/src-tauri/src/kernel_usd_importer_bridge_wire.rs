//! USD Importer Bridge desktop wire — letter **gq**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::usd_importer_bridge`
//! (ASCII USDA subset `#usda` + `def Xform` + `float3` attrs → scene nodes;
//! soak proves fixture → N nodes/transforms + same bytes → same fingerprint +
//! invalid fail-closed). Honesty probe `usdImporterBridgeReady` is **distinct**
//! from go `spectralLightPipelineReady`, gn `alexaCinematicOpticsReady`, gm
//! `radianceCascadesGiReady`, gl `atmosphericSpineParticlesReady`, and prior
//! (never touch those probes). Full OpenUSD / Pixar Hydra AAA stays false
//! (HELD). Coins / Agones / Nanite / DLSS / Quic HELD. No capsule-as-character.

use aethel_kernel_rust::usd_importer_bridge::{
    probe_usd_importer_bridge as kernel_probe, run_usd_importer_bridge_soak,
    UsdImporterBridgeSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelUsdImporterBridgeWireReport {
    pub usd_importer_bridge_ready: bool,
    pub fixture_parsed: bool,
    pub node_count_ok: bool,
    pub transforms_present: bool,
    pub invalid_fail_closed: bool,
    pub same_bytes_same_fingerprint: bool,
    pub deterministic: bool,
    pub legacy_uses_payload: bool,
    pub state_mutated: bool,
    pub node_count: u32,
    pub transform_attr_count: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub open_usd_aaa_ready: bool,
    pub pixar_hydra_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: UsdImporterBridgeSoakReport,
    note: impl Into<String>,
) -> KernelUsdImporterBridgeWireReport {
    KernelUsdImporterBridgeWireReport {
        usd_importer_bridge_ready: r.usd_importer_bridge_ready,
        fixture_parsed: r.fixture_parsed,
        node_count_ok: r.node_count_ok,
        transforms_present: r.transforms_present,
        invalid_fail_closed: r.invalid_fail_closed,
        same_bytes_same_fingerprint: r.same_bytes_same_fingerprint,
        deterministic: r.deterministic,
        legacy_uses_payload: r.legacy_uses_payload,
        state_mutated: r.state_mutated,
        node_count: r.node_count,
        transform_attr_count: r.transform_attr_count,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gq".into(),
        note: note.into(),
        open_usd_aaa_ready: r.open_usd_aaa_ready,
        pixar_hydra_aaa_ready: r.pixar_hydra_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run USD Importer Bridge soak via kernel.
pub fn run_kernel_usd_importer_bridge_soak() -> KernelUsdImporterBridgeWireReport {
    let r = run_usd_importer_bridge_soak();
    let note = if !r.usd_importer_bridge_ready {
        "USD Importer Bridge soak failed — usdImporterBridgeReady stays false"
    } else {
        "Desktop soak: ASCII USDA lite #usda + def Xform + float3 attrs → scene nodes; fixture N nodes/transforms + same bytes→same fingerprint + invalid fail-closed — usdImporterBridgeReady true; open_usd_aaa_ready / pixar_hydra_aaa_ready false; distinct from go spectralLightPipelineReady + gn alexaCinematicOpticsReady + gm radianceCascadesGiReady + gl atmosphericSpineParticlesReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `usdImporterBridgeReady` (letter gq).
pub fn probe_usd_importer_bridge() -> KernelUsdImporterBridgeWireReport {
    to_report(
        kernel_probe(),
        "USD Importer Bridge probe (letter gq) — distinct from spectralLightPipelineReady, alexaCinematicOpticsReady, radianceCascadesGiReady, atmosphericSpineParticlesReady, and probe_kernel_foundation; open_usd_aaa_ready / pixar_hydra_aaa_ready HELD",
    )
}

/// Tauri IPC — USD Importer Bridge honesty.
#[tauri::command]
pub fn probe_usd_importer_bridge_cmd() -> KernelUsdImporterBridgeWireReport {
    probe_usd_importer_bridge()
}

/// Tauri IPC — run USD Importer Bridge soak.
#[tauri::command]
pub fn run_kernel_usd_importer_bridge_soak_cmd() -> KernelUsdImporterBridgeWireReport {
    run_kernel_usd_importer_bridge_soak()
}

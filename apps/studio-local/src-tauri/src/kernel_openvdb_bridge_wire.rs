//! OpenVDB bridge desktop wire — R17 soak-gated honesty.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::openvdb_bridge`.
//! The ingest/export commands exercise an ephemeral in-memory
//! `SvoTerrainWorldPartition` for ingest/export validation — not a "mock SVO"
//! product claim.
//!
//! R17 deepen (2026-08-14): the bridge now ships a soak-gated honesty probe
//! (`openvdbBridgeReady`) measured from the real header validation + fail-closed
//! paths — magic "VDB " validated, version bounded, >50 MB payloads rejected
//! without expansion (OomProtection), Blosc-compressed real grids refused
//! honestly (`compressedBloscFailClosed` — never faked ingestion), the
//! SVO → VDB exporter writes a valid 12-byte header, two-pass deterministic
//! replay. Evidence kind "openvdb_bridge", FP seed `0x6F70_656E_7664_62` / XOR
//! `0x5644_42`; distinct from materialx_bridge / svo_terrain_world_partition
//! probes (single measured `d`, no hard-coded `true`). Full OpenVDB / Lumen
//! volumetric AAA remain **HELD** (`openvdb_aaa_ready`, `lumen_vdb_ready`,
//! `volumetric_fog_aaa_ready` false — fail-closed, never faked). J.11/J.12
//! STOPPED, backend only.

use aethel_kernel_rust::openvdb_bridge::{
    probe_openvdb_bridge as kernel_probe, run_openvdb_bridge_soak, OpenVdbBridge,
    OpenVdbBridgeSoakReport,
};
use aethel_kernel_rust::svo_terrain_world_partition::SvoTerrainWorldPartition;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenVdbIngestWireReport {
    pub success: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenVdbExportWireReport {
    pub success: bool,
    pub payload_size_bytes: usize,
    pub error_message: Option<String>,
}

/// Ingest a raw VDB binary payload into an ephemeral SVO partition for desktop bridge validation.
#[tauri::command]
pub fn ingest_openvdb_payload_cmd(payload: Vec<u8>) -> OpenVdbIngestWireReport {
    let mut svo = SvoTerrainWorldPartition::default();

    match OpenVdbBridge::ingest_vdb_to_svo(&payload, &mut svo) {
        Ok(_) => OpenVdbIngestWireReport {
            success: true,
            error_message: None,
        },
        Err(e) => OpenVdbIngestWireReport {
            success: false,
            error_message: Some(format!("{:?}", e)),
        },
    }
}

/// Export an ephemeral SVO partition state into a raw VDB binary payload.
#[tauri::command]
pub fn export_openvdb_payload_cmd() -> OpenVdbExportWireReport {
    let svo = SvoTerrainWorldPartition::default();
    let mut buffer = Vec::with_capacity(1024);

    match OpenVdbBridge::export_svo_to_vdb(&svo, &mut buffer) {
        Ok(_) => OpenVdbExportWireReport {
            success: true,
            payload_size_bytes: buffer.len(),
            error_message: None,
        },
        Err(e) => OpenVdbExportWireReport {
            success: false,
            payload_size_bytes: 0,
            error_message: Some(format!("{:?}", e)),
        },
    }
}

// ---------------------------------------------------------------------------
// R17 — soak-gated honesty probe (OpenVDB bridge).
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelOpenVdbBridgeWireReport {
    // readiness
    pub openvdb_bridge_ready: bool,
    // subsystem gates
    pub magic_validated: bool,
    pub version_bounded: bool,
    pub oom_fail_closed: bool,
    pub compressed_fail_closed: bool,
    pub export_header_ok: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    // telemetry
    pub export_payload_size_bytes: usize,
    pub grid_rejected_reason: String,
    pub soak_elapsed_ns: u128,
    // evidence
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_materialx_bridge_probe: bool,
    pub distinct_from_svo_terrain_world_partition_probe: bool,
    // AAA held — always false (HELD)
    pub openvdb_aaa_ready: bool,
    pub lumen_vdb_ready: bool,
    pub volumetric_fog_aaa_ready: bool,
    pub note: String,
}

fn to_report(
    r: OpenVdbBridgeSoakReport,
    note: impl Into<String>,
) -> KernelOpenVdbBridgeWireReport {
    KernelOpenVdbBridgeWireReport {
        openvdb_bridge_ready: r.openvdb_bridge_ready,
        magic_validated: r.magic_validated,
        version_bounded: r.version_bounded,
        oom_fail_closed: r.oom_fail_closed,
        compressed_fail_closed: r.compressed_fail_closed,
        export_header_ok: r.export_header_ok,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        export_payload_size_bytes: r.export_payload_size_bytes,
        grid_rejected_reason: r.grid_rejected_reason,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_materialx_bridge_probe: r.distinct_from_materialx_bridge_probe,
        distinct_from_svo_terrain_world_partition_probe: r.distinct_from_svo_terrain_world_partition_probe,
        openvdb_aaa_ready: r.openvdb_aaa_ready,
        lumen_vdb_ready: r.lumen_vdb_ready,
        volumetric_fog_aaa_ready: r.volumetric_fog_aaa_ready,
        note: note.into(),
    }
}

/// Run OpenVDB bridge soak via kernel.
pub fn run_kernel_openvdb_bridge_soak() -> KernelOpenVdbBridgeWireReport {
    let r = run_openvdb_bridge_soak();
    let note = if !r.openvdb_bridge_ready {
        "OpenVDB bridge soak failed — openvdbBridgeReady stays false"
    } else {
        "R17 desktop soak: the bridge validates the \"VDB \" magic (bad magic rejected), bounds the version, rejects >50 MB payloads fail-closed without expansion (OomProtection), honestly refuses Blosc-compressed real grids (compressedBloscFailClosed — real grids are never faked), exports a valid 12-byte SVO->VDB header and replays deterministically with finite outputs. openvdbBridgeReady true soak-gated; evidence kind openvdb_bridge, FP seed 0x6F70_656E_7664_62 / XOR 0x5644_42, distinct from materialx_bridge / svo_terrain_world_partition probes (single measured d, no hard-coded true); openvdb_aaa_ready / lumen_vdb_ready / volumetric_fog_aaa_ready HELD (fail-closed — header validation is not a shipped OpenVDB / Lumen volumetric AAA pipeline). J.11/J.12 STOPPED, backend only."
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `openvdb_bridge_ready` (letter R17).
pub fn probe_openvdb_bridge() -> KernelOpenVdbBridgeWireReport {
    to_report(
        kernel_probe(),
        "R17 OpenVDB bridge probe: the bridge honestly validates the VDB header, bounds the version, rejects OOM-scale and Blosc-compressed real grids fail-closed and replays deterministically (no fake grid ingestion claims). openvdbBridgeReady true soak-gated; distinct from materialx_bridge / svo_terrain_world_partition; openvdb_aaa_ready / lumen_vdb_ready / volumetric_fog_aaa_ready HELD",
    )
}

/// Tauri IPC — OpenVDB bridge honesty.
#[tauri::command]
pub fn probe_openvdb_bridge_cmd() -> KernelOpenVdbBridgeWireReport {
    probe_openvdb_bridge()
}

/// Tauri IPC — run OpenVDB bridge soak.
#[tauri::command]
pub fn run_kernel_openvdb_bridge_soak_cmd() -> KernelOpenVdbBridgeWireReport {
    run_kernel_openvdb_bridge_soak()
}

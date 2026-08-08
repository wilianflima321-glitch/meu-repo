//! OpenVDB bridge desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::openvdb_bridge`.
//! Commands exercise an ephemeral in-memory `SvoTerrainWorldPartition` for
//! ingest/export validation — not a "mock SVO" product claim.
//! Full OpenVDB / Lumen volumetric AAA remains HELD (P2e).

use aethel_kernel_rust::openvdb_bridge::OpenVdbBridge;
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

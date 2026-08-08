//! OpenVDB bridge desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::openvdb_bridge`

use aethel_kernel_rust::svo_terrain_world_partition::SvoTerrainWorldPartition;
use aethel_kernel_rust::openvdb_bridge::{OpenVdbBridge, OpenVdbParseError};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenVdbIngestWireReport {
    pub success: bool,
    pub error_message: Option<String>,
        distinct_from_peers_note: "distinct".into(),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OpenVdbExportWireReport {
    pub success: bool,
    pub payload_size_bytes: usize,
    pub error_message: Option<String>,
        distinct_from_peers_note: "distinct".into(),
}

/// Ingests a raw VDB binary payload and attempts to pipe it to the SVO mock.
#[tauri::command]
pub fn ingest_openvdb_payload_cmd(payload: Vec<u8>) -> OpenVdbIngestWireReport {
    let mut svo = SvoTerrainWorldPartition::default();
    
    match OpenVdbBridge::ingest_vdb_to_svo(&payload, &mut svo) {
        Ok(_) => OpenVdbIngestWireReport {
            success: true,
            error_message: None,
        distinct_from_peers_note: "distinct".into(),
        },
        Err(e) => OpenVdbIngestWireReport {
            success: false,
            error_message: Some(format!("{:?}", e)),
        distinct_from_peers_note: "distinct".into(),
        }
    }
}

/// Exports a mock SVO state into a raw VDB binary payload.
#[tauri::command]
pub fn export_openvdb_payload_cmd() -> OpenVdbExportWireReport {
    let svo = SvoTerrainWorldPartition::default();
    let mut buffer = Vec::with_capacity(1024);
    
    match OpenVdbBridge::export_svo_to_vdb(&svo, &mut buffer) {
        Ok(_) => OpenVdbExportWireReport {
            success: true,
            payload_size_bytes: buffer.len(),
            error_message: None,
        distinct_from_peers_note: "distinct".into(),
        },
        Err(e) => OpenVdbExportWireReport {
            success: false,
            payload_size_bytes: 0,
            error_message: Some(format!("{:?}", e)),
        distinct_from_peers_note: "distinct".into(),
        }
    }
}
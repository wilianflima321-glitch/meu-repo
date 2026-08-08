//! MaterialX bridge desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::materialx_bridge`.
//! Commands exercise an ephemeral in-memory `SceneGraph` for parse/export
//! validation (desktop soak probe) — not a "mock SceneGraph" product claim.
//! Full MaterialX AAA / Substance parity remains HELD (P2e).

use aethel_kernel_rust::ecs_core::SceneGraph;
use aethel_kernel_rust::materialx_bridge::MaterialXBridge;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaterialXIngestWireReport {
    pub success: bool,
    pub entity_id: usize,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MaterialXExportWireReport {
    pub success: bool,
    pub payload: Option<String>,
    pub error_message: Option<String>,
}

/// Ingest a raw MTLX XML payload into an ephemeral SceneGraph for desktop bridge validation.
#[tauri::command]
pub fn ingest_materialx_payload_cmd(payload: String) -> MaterialXIngestWireReport {
    let mut ecs = SceneGraph::new();
    ecs.add_entity(0.0, 0.0, 0.0);

    match MaterialXBridge::ingest_mtlx_to_ecs(&payload, &mut ecs, 0) {
        Ok(_) => MaterialXIngestWireReport {
            success: true,
            entity_id: 0,
            error_message: None,
        },
        Err(e) => MaterialXIngestWireReport {
            success: false,
            entity_id: 0,
            error_message: Some(format!("{:?}", e)),
        },
    }
}

/// Export PBR fields from an ephemeral probe entity to an MTLX string.
#[tauri::command]
pub fn export_materialx_payload_cmd() -> MaterialXExportWireReport {
    let mut ecs = SceneGraph::new();
    ecs.add_entity(0.0, 0.0, 0.0);
    ecs.roughness_x[0] = 0.25;
    ecs.metallic[0] = 0.8;
    ecs.emission_r[0] = 1.0;

    let mut buffer = String::with_capacity(1024);
    match MaterialXBridge::export_ecs_to_mtlx(&ecs, 0, &mut buffer) {
        Ok(_) => MaterialXExportWireReport {
            success: true,
            payload: Some(buffer),
            error_message: None,
        },
        Err(e) => MaterialXExportWireReport {
            success: false,
            payload: None,
            error_message: Some(format!("{:?}", e)),
        },
    }
}

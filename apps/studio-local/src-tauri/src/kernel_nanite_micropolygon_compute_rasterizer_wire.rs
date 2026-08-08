//! Nanite Micro-Polygon Compute Rasterizer desktop wire — letter **ip5**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::nanite_micropolygon_compute_rasterizer`

use aethel_kernel_rust::nanite_micropolygon_compute_rasterizer::{
    probe_nanite_micropolygon_compute_rasterizer as kernel_probe,
    run_nanite_micropolygon_compute_rasterizer_soak as kernel_soak,
    NaniteMicropolygonComputeRasterizerProbeReport,
    NaniteMicropolygonComputeRasterizerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNaniteMicropolygonComputeRasterizerProbeWireReport {
    pub nanite_micropolygon_compute_rasterizer_ready: bool,
    pub frustum_culling_active: bool,
    pub sw_rasterization_active: bool,
    pub visible_clusters: u32,
    pub culled_clusters: u32,
    pub deterministic: bool,
    pub letter: String,
    pub note: String,
    pub nanite_micropolygon_compute_rasterizer_ue5_parity_ready: bool,
        distinct_from_peers_note: "distinct".into(),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelNaniteMicropolygonComputeRasterizerSoakWireReport {
    pub nanite_micropolygon_compute_rasterizer_ready: bool,
    pub deterministic: bool,
    pub sw_rasterized_triangles_total: u32,
    pub culled_clusters_total: u32,
    pub total_ticks: u32,
    pub letter: String,
    pub note: String,
    pub nanite_micropolygon_compute_rasterizer_ue5_parity_ready: bool,
        distinct_from_peers_note: "distinct".into(),
}

fn probe_to_wire(
    r: NaniteMicropolygonComputeRasterizerProbeReport,
) -> KernelNaniteMicropolygonComputeRasterizerProbeWireReport {
    let note = if r.nanite_micropolygon_compute_rasterizer_ready {
        "Probe: Nanite cluster frustum culling and software micro-polygon rasterization successful. UE5 parity stays false (HELD)."
    } else {
        "Probe failed — naniteMicropolygonComputeRasterizerReady stays false."
    };
    KernelNaniteMicropolygonComputeRasterizerProbeWireReport {
        nanite_micropolygon_compute_rasterizer_ready: r.nanite_micropolygon_compute_rasterizer_ready,
        frustum_culling_active: r.frustum_culling_active,
        sw_rasterization_active: r.sw_rasterization_active,
        visible_clusters: r.visible_clusters,
        culled_clusters: r.culled_clusters,
        deterministic: r.deterministic,
        letter: "ip5".into(),
        note: note.into(),
        nanite_micropolygon_compute_rasterizer_ue5_parity_ready: false,
        distinct_from_peers_note: "distinct".into(),
    }
}

fn soak_to_wire(
    r: NaniteMicropolygonComputeRasterizerSoakReport,
) -> KernelNaniteMicropolygonComputeRasterizerSoakWireReport {
    let note = if r.nanite_micropolygon_compute_rasterizer_ready {
        "Soak: Processed batched cluster instances across multiple ticks with verified software edge rasterization scaling and zero alloc."
    } else {
        "Soak failed — one or more streaming invariants did not hold."
    };
    KernelNaniteMicropolygonComputeRasterizerSoakWireReport {
        nanite_micropolygon_compute_rasterizer_ready: r.nanite_micropolygon_compute_rasterizer_ready,
        deterministic: r.deterministic,
        sw_rasterized_triangles_total: r.sw_rasterized_triangles_total,
        culled_clusters_total: r.culled_clusters_total,
        total_ticks: r.total_ticks,
        letter: "ip5".into(),
        note: note.into(),
        nanite_micropolygon_compute_rasterizer_ue5_parity_ready: false,
        distinct_from_peers_note: "distinct".into(),
    }
}

/// Honesty probe — Tauri IPC.
#[tauri::command]
pub fn probe_nanite_micropolygon_compute_rasterizer_cmd() -> KernelNaniteMicropolygonComputeRasterizerProbeWireReport {
    probe_to_wire(kernel_probe())
        distinct_from_peers_note: "distinct".into(),
}

/// Soak — Tauri IPC.
#[tauri::command]
pub fn run_kernel_nanite_micropolygon_compute_rasterizer_soak_cmd(
) -> KernelNaniteMicropolygonComputeRasterizerSoakWireReport {
    soak_to_wire(kernel_soak())
        distinct_from_peers_note: "distinct".into(),
}

use std::sync::Mutex;
use aethel_kernel_rust::nanite_micropolygon_compute_rasterizer::{
    NaniteMicropolygonComputeRasterizer, TileDepthBuffer, GeometryCluster, ViewFrustum, NaniteRasterizerStepResult, ClusterBoundingSphere, MicroTriangle, MicroVertex
};
use aethel_kernel_rust::ecs_core::SceneGraph;

pub struct NaniteMicropolygonComputeRasterizerState {
    pub engine: NaniteMicropolygonComputeRasterizer,
    pub tile_buffer: TileDepthBuffer,
    pub ecs: SceneGraph,
    pub clusters: Vec<GeometryCluster>,
}

impl Default for NaniteMicropolygonComputeRasterizerState {
    fn default() -> Self {
        let sample_tri = MicroTriangle {
            v0: MicroVertex { position: [1.0, 1.0, 0.5], normal: [0.0, 0.0, 1.0], uv: [0.0, 0.0] },
            v1: MicroVertex { position: [4.0, 1.0, 0.5], normal: [0.0, 0.0, 1.0], uv: [1.0, 0.0] },
            v2: MicroVertex { position: [1.0, 4.0, 0.5], normal: [0.0, 0.0, 1.0], uv: [0.0, 1.0] },
        };
        let mut clusters = Vec::with_capacity(256);
        for i in 0..256 {
            clusters.push(GeometryCluster {
                cluster_id: i,
                bounds: ClusterBoundingSphere { center: [0.0, 0.0, 0.0], radius: 2.0 },
                cone_axis: [0.0, 0.0, -1.0],
                cone_cutoff: 0.9,
                triangles: vec![sample_tri],
            });
        }
        Self {
            engine: NaniteMicropolygonComputeRasterizer::default(),
            tile_buffer: TileDepthBuffer::default(),
            ecs: SceneGraph::new(),
            clusters,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontendCameraView {
    pub view_dir: [f32; 3],
    pub frustum_planes: [[f32; 4]; 6],
    pub positions: Vec<[f32; 3]>, // Entities positions to inject into SceneGraph
}

/// Tick cmd (Onda G) — wires UI directly to Kernel SceneGraph & Nanite Rasterizer.
#[tauri::command]
pub fn nanite_micropolygon_compute_rasterizer_tick_cmd(
    state_mutex: tauri::State<'_, Mutex<NaniteMicropolygonComputeRasterizerState>>,
    camera: FrontendCameraView,
) -> NaniteRasterizerStepResult {
    let mut guard = state_mutex.lock().unwrap();
    let state = &mut *guard;
    
    // 1. Reset Entities in local SceneGraph
    state.ecs.len = 0; // O(1) clear
    for pos in camera.positions {
        state.ecs.add_entity(pos[0], pos[1], pos[2]);
    }
    
    let frustum = ViewFrustum { planes: camera.frustum_planes };
    
    // 2. Consume from SceneGraph (update bounds & cull/rasterize)
    state.engine.process_scene_graph_clusters(
        &state.ecs,
        &mut state.clusters,
        &frustum,
        camera.view_dir,
        &mut state.tile_buffer,
    )
}
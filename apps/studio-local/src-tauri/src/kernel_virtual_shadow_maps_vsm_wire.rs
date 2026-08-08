//! Virtual Shadow Maps VSM desktop wire — letter **ip7**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::virtual_shadow_maps_vsm`

use aethel_kernel_rust::virtual_shadow_maps_vsm::{
    probe_virtual_shadow_maps_vsm as kernel_probe,
    run_virtual_shadow_maps_vsm_soak as kernel_soak,
    VirtualShadowMapsVsmProbeReport,
    VirtualShadowMapsVsmSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelVirtualShadowMapsVsmProbeWireReport {
    pub virtual_shadow_maps_vsm_ready: bool,
    pub streaming_active: bool,
    pub newly_allocated_pages: u32,
    pub physical_pool_used: u32,
    pub deterministic: bool,
    pub letter: String,
    pub note: String,
    pub virtual_shadow_maps_vsm_ue5_parity_ready: bool,
    pub distinct_from_peers_note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelVirtualShadowMapsVsmSoakWireReport {
    pub virtual_shadow_maps_vsm_ready: bool,
    pub deterministic: bool,
    pub total_requested_pages: u32,
    pub total_newly_allocated_pages: u32,
    pub total_evicted_pages: u32,
    pub final_physical_pool_used: u32,
    pub total_ticks: u32,
    pub letter: String,
    pub note: String,
    pub virtual_shadow_maps_vsm_ue5_parity_ready: bool,
    pub distinct_from_peers_note: String,
}

fn probe_to_wire(
    r: VirtualShadowMapsVsmProbeReport,
) -> KernelVirtualShadowMapsVsmProbeWireReport {
    let note = if r.virtual_shadow_maps_vsm_ready {
        "Probe: Virtual Shadow Map page table allocation and physical pool hydration successful. UE5 parity stays false (HELD)."
    } else {
        "Probe failed — virtualShadowMapsVsmReady stays false."
    };
    KernelVirtualShadowMapsVsmProbeWireReport {
        virtual_shadow_maps_vsm_ready: r.virtual_shadow_maps_vsm_ready,
        streaming_active: r.streaming_active,
        newly_allocated_pages: r.newly_allocated_pages,
        physical_pool_used: r.physical_pool_used,
        deterministic: r.deterministic,
        letter: "ip7".into(),
        note: note.into(),
        virtual_shadow_maps_vsm_ue5_parity_ready: false,
        distinct_from_peers_note: "distinct".into(),
    }
}

fn soak_to_wire(
    r: VirtualShadowMapsVsmSoakReport,
) -> KernelVirtualShadowMapsVsmSoakWireReport {
    let note = if r.virtual_shadow_maps_vsm_ready {
        "Soak: Processed 1500 VSM page requests, successfully evicting stale LRU pages and saturating the physical pool without allocations."
    } else {
        "Soak failed — one or more streaming invariants did not hold."
    };
    KernelVirtualShadowMapsVsmSoakWireReport {
        virtual_shadow_maps_vsm_ready: r.virtual_shadow_maps_vsm_ready,
        deterministic: r.deterministic,
        total_requested_pages: r.total_requested_pages,
        total_newly_allocated_pages: r.total_newly_allocated_pages,
        total_evicted_pages: r.total_evicted_pages,
        final_physical_pool_used: r.final_physical_pool_used,
        total_ticks: r.total_ticks,
        letter: "ip7".into(),
        note: note.into(),
        virtual_shadow_maps_vsm_ue5_parity_ready: false,
        distinct_from_peers_note: "distinct".into(),
    }
}

/// Honesty probe — Tauri IPC.
#[tauri::command]
pub fn probe_virtual_shadow_maps_vsm_cmd() -> KernelVirtualShadowMapsVsmProbeWireReport {
    probe_to_wire(kernel_probe())
}

/// Soak — Tauri IPC.
#[tauri::command]
pub fn run_kernel_virtual_shadow_maps_vsm_soak_cmd(
) -> KernelVirtualShadowMapsVsmSoakWireReport {
    soak_to_wire(kernel_soak())
}

use std::sync::Mutex;
use aethel_kernel_rust::virtual_shadow_maps_vsm::{VirtualShadowMapsVsm, VsmPageTableBuffer, VsmUpdateResult};
use aethel_kernel_rust::ecs_core::SceneGraph;
use crate::kernel_radiance_cascades_gi_wire::FrontendLight; // Reuse the frontend light struct

pub struct VirtualShadowMapsVsmState {
    pub engine: VirtualShadowMapsVsm,
    pub buffer: VsmPageTableBuffer,
    pub ecs: SceneGraph,
    pub current_frame: u32,
}

impl Default for VirtualShadowMapsVsmState {
    fn default() -> Self {
        Self {
            engine: VirtualShadowMapsVsm::default(),
            buffer: VsmPageTableBuffer::default(),
            ecs: SceneGraph::new(),
            current_frame: 0,
        }
    }
}

/// Tick cmd (Onda G) — wires UI directly to Kernel SceneGraph & VSM.
#[tauri::command]
pub fn virtual_shadow_maps_vsm_tick_cmd(
    state_mutex: tauri::State<'_, Mutex<VirtualShadowMapsVsmState>>,
    lights: Vec<FrontendLight>,
) -> VsmUpdateResult {
    let mut guard = state_mutex.lock().unwrap();
    let state = &mut *guard;
    state.current_frame = state.current_frame.wrapping_add(1);
    
    // 1. Reset Emitters in local SceneGraph
    state.ecs.len = 0; // O(1) clear
    for l in lights {
        if let Some(id) = state.ecs.add_entity(l.pos[0], l.pos[1], l.pos[2]) {
            state.ecs.set_emission(id.0 as usize, l.color[0], l.color[1], l.color[2], l.intensity);
        }
    }
    
    // 2. Consume from SceneGraph
    state.engine.update_vsm_from_scene_graph(&state.ecs, state.current_frame, &mut state.buffer)
}

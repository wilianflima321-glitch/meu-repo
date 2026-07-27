//! SVO Terrain World Partition desktop wire — letter **ip4**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::svo_terrain_world_partition`
//! (distance-based LOD streaming for infinite SVO terrains; camera-driven
//! hydrate/evict of a zero-alloc chunk ring buffer, now measured by real
//! chunk identity churn — see the kernel-side fix in the same round).
//!
//! Unlike the static probe/soak-only pattern used by most sibling `kernel_*_wire`
//! modules (a fresh kernel + fixed camera fixture recomputed from scratch on
//! every call), this wire additionally exposes a **stateful, per-frame**
//! command — `world_partition_stream_tick_cmd` — backed by a Tauri-managed
//! `Mutex<WorldPartitionStreamState>` that persists across calls. A live
//! viewport is meant to call this once per frame with the *real* camera
//! position; hydrate/evict counters then reflect genuine camera movement
//! across ticks instead of a synthetic one-shot snapshot. This is the piece
//! that actually plugs the kernel math into a running loop rather than
//! leaving it callable only as an isolated honesty probe.
//!
//! Honest scope: the native Rust/Tauri desktop renderer does not yet call
//! `world_partition_stream_tick_cmd` from a real per-frame render loop this
//! round (no GPU-driven visual culling/streaming of the resulting chunk set
//! is wired into `wgpu_renderer.rs` yet) — the *IPC command + persistent
//! streaming state* is real and camera-driven end to end, but the frontend
//! viewport caller and the GPU-side chunk mesh streaming remain **HELD**.
//! `svoTerrainWorldPartitionUe5ParityReady` stays **false**: no HLOD, no
//! Nanite-equivalent, no 50km² proven world, no no-loading-screen marketing
//! claim. This desktop Rust path is distinct from — and does not replace —
//! the already-shipped TypeScript `lib/world-streaming/partition-streaming.ts`
//! used by the web/R3F viewport (letters cg/ck); that TS path remains the
//! actual shipped web product surface. This wire is native-desktop-only.

use aethel_kernel_rust::svo_terrain_world_partition::{
    probe_svo_terrain_world_partition as kernel_probe,
    run_svo_terrain_world_partition_soak as kernel_soak, SvoChunkStreamBuffer,
    SvoTerrainWorldPartition, SvoTerrainWorldPartitionProbeReport,
    SvoTerrainWorldPartitionSoakReport,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Live per-session streaming state: one kernel + one ring buffer, mutated
/// in place on every real tick call (never recreated per call) — this is
/// what makes hydrate/evict counters mean something across frames instead
/// of always describing the same synthetic fixture.
#[derive(Default)]
pub struct WorldPartitionStreamState {
    kernel: SvoTerrainWorldPartition,
    buffer: SvoChunkStreamBuffer,
    total_ticks: u64,
    total_pages_hydrated: u64,
    total_pages_evicted: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSvoTerrainWorldPartitionProbeWireReport {
    pub svo_terrain_world_partition_ready: bool,
    pub stream_updated: bool,
    pub lod0_chunks_active: u32,
    pub total_chunks_active: u32,
    pub deterministic: bool,
    pub letter: String,
    pub note: String,
    pub svo_terrain_world_partition_ue5_parity_ready: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSvoTerrainWorldPartitionSoakWireReport {
    pub svo_terrain_world_partition_ready: bool,
    pub deterministic: bool,
    pub same_seed_same_results: bool,
    pub hydrated_on_approach: bool,
    pub evicted_on_retreat: bool,
    pub settled_when_stationary: bool,
    pub lod_transitions_monotonic: bool,
    pub nan_camera_rejected: bool,
    pub total_ticks: u32,
    pub fingerprint: u64,
    pub letter: String,
    pub note: String,
    pub svo_terrain_world_partition_ue5_parity_ready: bool,
}

/// Live per-frame tick result — reflects real state mutated across calls.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorldPartitionStreamTickReport {
    pub streaming_active: bool,
    pub active_chunks: u32,
    pub lod0_chunks: u32,
    pub pages_hydrated_this_tick: u32,
    pub pages_evicted_this_tick: u32,
    pub total_ticks: u64,
    pub total_pages_hydrated: u64,
    pub total_pages_evicted: u64,
    pub camera_pos: [f32; 3],
    pub letter: String,
    pub svo_terrain_world_partition_ue5_parity_ready: bool,
}

fn probe_to_wire(
    r: SvoTerrainWorldPartitionProbeReport,
) -> KernelSvoTerrainWorldPartitionProbeWireReport {
    let note = if r.svo_terrain_world_partition_ready {
        "Probe: 256-chunk distance-based LOD streaming ring around a fixed camera fixture — active + lod0 present + deterministic. UE5 World Partition/HLOD/Nanite streaming parity stays false (HELD)."
    } else {
        "Probe failed — svoTerrainWorldPartitionReady stays false."
    };
    KernelSvoTerrainWorldPartitionProbeWireReport {
        svo_terrain_world_partition_ready: r.svo_terrain_world_partition_ready,
        stream_updated: r.stream_updated,
        lod0_chunks_active: r.lod0_chunks_active,
        total_chunks_active: r.total_chunks_active,
        deterministic: r.deterministic,
        letter: "ip4".into(),
        note: note.into(),
        svo_terrain_world_partition_ue5_parity_ready: false,
    }
}

fn soak_to_wire(
    r: SvoTerrainWorldPartitionSoakReport,
) -> KernelSvoTerrainWorldPartitionSoakWireReport {
    let note = if r.svo_terrain_world_partition_ready {
        "Soak: stationary camera twice -> zero churn; long camera jump -> real identity-based hydrate+evict (fixed this round — was previously measured off the `active` flag at a fixed slot, which stayed ~constant regardless of camera movement); stationary again -> settles to zero churn; independent same-seed kernel replays tick 1 exactly; LOD bands monotonic by distance; NaN camera rejected without panic. UE5 parity stays false (HELD)."
    } else {
        "Soak failed — one or more streaming invariants did not hold."
    };
    KernelSvoTerrainWorldPartitionSoakWireReport {
        svo_terrain_world_partition_ready: r.svo_terrain_world_partition_ready,
        deterministic: r.deterministic,
        same_seed_same_results: r.same_seed_same_results,
        hydrated_on_approach: r.hydrated_on_approach,
        evicted_on_retreat: r.evicted_on_retreat,
        settled_when_stationary: r.settled_when_stationary,
        lod_transitions_monotonic: r.lod_transitions_monotonic,
        nan_camera_rejected: r.nan_camera_rejected,
        total_ticks: r.total_ticks,
        fingerprint: r.fingerprint,
        letter: "ip4".into(),
        note: note.into(),
        svo_terrain_world_partition_ue5_parity_ready: false,
    }
}

/// Honesty probe — Tauri IPC.
#[tauri::command]
pub fn probe_svo_terrain_world_partition_cmd() -> KernelSvoTerrainWorldPartitionProbeWireReport {
    probe_to_wire(kernel_probe())
}

/// Soak — Tauri IPC.
#[tauri::command]
pub fn run_kernel_svo_terrain_world_partition_soak_cmd(
) -> KernelSvoTerrainWorldPartitionSoakWireReport {
    soak_to_wire(kernel_soak())
}

/// Live per-frame streaming tick. The viewport is expected to call this
/// once per frame (or once per meaningful camera-move threshold) with the
/// real camera position; state persists in `WorldPartitionStreamState`
/// (Tauri-managed), so hydrate/evict counts reflect genuine movement across
/// calls instead of a synthetic fixture recomputed from scratch each time.
#[tauri::command]
pub fn world_partition_stream_tick_cmd(
    camera_pos: [f32; 3],
    state: State<'_, Mutex<WorldPartitionStreamState>>,
) -> Result<WorldPartitionStreamTickReport, String> {
    let mut s = state
        .lock()
        .map_err(|_| "World Partition stream state lock is poisoned.".to_string())?;

    let WorldPartitionStreamState { kernel, buffer, .. } = &mut *s;
    let result = kernel.update_stream(camera_pos, buffer);

    s.total_ticks += 1;
    s.total_pages_hydrated += result.pages_hydrated as u64;
    s.total_pages_evicted += result.pages_evicted as u64;

    Ok(WorldPartitionStreamTickReport {
        streaming_active: result.streaming_active,
        active_chunks: result.active_chunks,
        lod0_chunks: result.lod0_chunks,
        pages_hydrated_this_tick: result.pages_hydrated,
        pages_evicted_this_tick: result.pages_evicted,
        total_ticks: s.total_ticks,
        total_pages_hydrated: s.total_pages_hydrated,
        total_pages_evicted: s.total_pages_evicted,
        camera_pos,
        letter: "ip4".into(),
        svo_terrain_world_partition_ue5_parity_ready: false,
    })
}

/// Resets the live streaming session (e.g. on project/scene reload) so a
/// fresh camera pose does not get diffed against a stale prior session.
#[tauri::command]
pub fn world_partition_stream_reset_cmd(
    state: State<'_, Mutex<WorldPartitionStreamState>>,
) -> Result<(), String> {
    let mut s = state
        .lock()
        .map_err(|_| "World Partition stream state lock is poisoned.".to_string())?;
    *s = WorldPartitionStreamState::default();
    Ok(())
}

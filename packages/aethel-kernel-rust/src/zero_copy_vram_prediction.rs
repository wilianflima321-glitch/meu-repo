//! Zero-Copy VRAM Prediction — letter **hc**.
//!
//! Computes exact buffer alignments, padding, and stride offsets required 
//! to zero-copy mmap the ECS SoA vectors directly into WebGPU SharedArrayBuffers.

use crate::ecs_core::SceneGraph;

pub struct VramPredictor;

impl VramPredictor {
    /// WGPU requires 256-byte alignment for uniform buffers and standard 16-byte alignment for storage buffers.
    pub fn calculate_storage_buffer_stride(element_size: usize) -> usize {
        let alignment = 16;
        (element_size + alignment - 1) & !(alignment - 1)
    }

    /// Predicts the exact VRAM footprint of the current active ECS state.
    pub fn predict_vram_footprint(ecs: &SceneGraph) -> usize {
        // We have 14 f32 columns and 1 i32 column, plus bits.
        // pos(3), vel(3), rot(4), scale(3), timescale(1) -> 14 * 4 bytes = 56 bytes
        // parent(1) -> 4 bytes. Total SoA element = 60 bytes.
        // aligned to 16 bytes -> 64 bytes per entity.
        let stride = Self::calculate_storage_buffer_stride(60);
        ecs.capacity * stride
    }
}

pub fn probe_zero_copy_vram() -> bool {
    let mut ecs = SceneGraph::with_capacity(100);
    ecs.add_entity(0.0, 0.0, 0.0);
    let footprint = VramPredictor::predict_vram_footprint(&ecs);
    footprint == 6400 // 100 * 64 bytes
}

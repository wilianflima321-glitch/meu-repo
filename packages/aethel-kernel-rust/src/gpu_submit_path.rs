//! Zero-allocation GPU Submit Path (Not String) — O(1) Data-Oriented Command Generation.
//!
//! Replaces legacy string-based entity/material lookups with 64-bit integer handles.
//! The hot loop generates WebGPU indirect draw commands directly from WorldSoA arrays.

use crate::ecs_core::EntityId;

/// Opaque 64-bit Handle for GPU resources (replaces Strings)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct GpuHandle(pub u64);

/// Represents a single indirect draw command for WebGPU/WGPU.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DrawIndirectArgs {
    pub vertex_count: u32,
    pub instance_count: u32,
    pub first_vertex: u32,
    pub first_instance: u32,
}

/// A zero-allocation pipeline mapping entities to draw commands.
pub struct GpuSubmitPipeline {
    /// Mapping of active entities to their mesh/material GPU handles
    pub entity_handles: Vec<GpuHandle>,
    /// Accumulated indirect draw arguments for the current frame
    pub draw_commands: Vec<DrawIndirectArgs>,
}

impl Default for GpuSubmitPipeline {
    fn default() -> Self {
        Self::with_capacity(100_000)
    }
}

impl GpuSubmitPipeline {
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            entity_handles: vec![GpuHandle(0); capacity],
            draw_commands: Vec::with_capacity(capacity),
        }
    }

    /// O(1) submission mapping. Zero string allocations.
    pub fn submit_entity(&mut self, entity: EntityId, handle: GpuHandle, vertices: u32) {
        let idx = entity.0 as usize;
        if idx < self.entity_handles.len() {
            self.entity_handles[idx] = handle;
            self.draw_commands.push(DrawIndirectArgs {
                vertex_count: vertices,
                instance_count: 1, // Will be instanced later via culling
                first_vertex: 0,
                first_instance: idx as u32,
            });
        }
    }

    pub fn clear_commands(&mut self) {
        self.draw_commands.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_alloc_gpu_submit_path() {
        let mut pipeline = GpuSubmitPipeline::with_capacity(100);
        
        let entity = EntityId(42);
        let mesh_handle = GpuHandle(0x1234567890ABCDEF);
        
        pipeline.submit_entity(entity, mesh_handle, 300);
        
        assert_eq!(pipeline.draw_commands.len(), 1);
        assert_eq!(pipeline.entity_handles[42], mesh_handle);
        assert_eq!(pipeline.draw_commands[0].first_instance, 42);
        assert_eq!(pipeline.draw_commands[0].vertex_count, 300);
    }
}

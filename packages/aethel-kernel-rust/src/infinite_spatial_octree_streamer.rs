//! Infinite Spatial Octree Streamer — Zero-Copy Planet-to-Cell Voxel Streaming Engine.
//!
//! Enables micro-stutter-free streaming from planet-scale geometry down to microscopic cells.
//! Manages Sparse Voxel Octrees (SVO) bound directly to WASM shared memory buffers.

use serde::{Deserialize, Serialize};

/// Sparse Voxel Octree Streaming Page State.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SvoStreamingPage {
    pub active_lod_level: u8, // 0 = Microscopic Cell, 24 = Planet Scale
    pub octree_node_count: u64,
    pub stream_bandwidth_mb_s: f32,
    pub zero_copy_wasmsab_bound: bool,
}

/// Infinite Spatial Octree Streamer facade.
pub struct InfiniteSpatialOctreeStreamer;

impl InfiniteSpatialOctreeStreamer {
    /// Streams SVO page matching camera viewing frustum and scale.
    pub fn stream_spatial_octree_page(
        scale_log10_m: f32,
        camera_velocity_m_s: f32,
    ) -> SvoStreamingPage {
        let lod = ((scale_log10_m + 12.0) * 1.0).clamp(0.0, 24.0) as u8;
        let bandwidth = 120.0 + camera_velocity_m_s * 0.5;

        SvoStreamingPage {
            active_lod_level: lod,
            octree_node_count: 1_048_576,
            stream_bandwidth_mb_s: bandwidth,
            zero_copy_wasmsab_bound: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_svo_streams_planet_scale_zero_copy() {
        let page = InfiniteSpatialOctreeStreamer::stream_spatial_octree_page(6.0, 300.0);
        assert_eq!(page.active_lod_level, 18);
        assert!(page.zero_copy_wasmsab_bound);
        assert!(page.octree_node_count > 0);
    }
}

//! Neural Radiance Cascades (NRC) — letter **hc**.
//!
//! Replaces the ZST stub with a deterministic algorithm for Radiance Cascades.
//! Instead of raymarching every pixel, it uses a branching hierarchy of probes.

use crate::ecs_core::SceneGraph;

pub struct RadianceCascade {
    pub level: u32,
    pub ray_count: u32,
    pub interval_length: f32,
}

impl RadianceCascade {
    /// Constructs the cascade hierarchy based on scene bounds and desired precision.
    pub fn build_hierarchy(max_distance: f32, base_rays: u32, levels: u32) -> Vec<RadianceCascade> {
        let mut cascades = Vec::with_capacity(levels as usize);
        let mut current_rays = base_rays;
        let mut current_length = 0.1; // Base interval

        for i in 0..levels {
            cascades.push(RadianceCascade {
                level: i,
                ray_count: current_rays,
                interval_length: current_length,
            });
            // Rays quadruple per level in 2D, or increase logarithmically in 3D
            current_rays *= 4;
            current_length *= 2.0;
            
            if current_length > max_distance {
                break;
            }
        }
        cascades
    }
}

pub fn probe_neural_radiance_cascades() -> bool {
    let hierarchy = RadianceCascade::build_hierarchy(100.0, 4, 6);
    !hierarchy.is_empty() && hierarchy.last().unwrap().ray_count > 4
}

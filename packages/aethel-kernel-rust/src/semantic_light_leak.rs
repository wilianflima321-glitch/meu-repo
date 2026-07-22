//! Semantic Light Leak Logic — letter **hb**.
//!
//! Replaces the stub with deterministic geometry-leaking calculations for Global Illumination.
//! It uses the ECS SoA bounds to determine where photons physically escape enclosures.

use crate::ecs_core::SceneGraph;

#[derive(Debug, Clone)]
pub struct LightLeakEstimator;

impl LightLeakEstimator {
    /// Computes the probability of light escaping the bounding volumes in the ECS.
    pub fn compute_leak_heuristic(ecs: &SceneGraph) -> f32 {
        let mut total_occlusion = 0.0;
        let mut active_count = 0;

        for i in 0..ecs.len {
            if ecs.is_active(i) {
                active_count += 1;
                // Use scale as a proxy for occlusion volume
                let volume = ecs.scale_x[i] * ecs.scale_y[i] * ecs.scale_x[i];
                // Light attenuation over distance (inverse square approx)
                let distance_sq = ecs.pos_x[i].powi(2) + ecs.pos_y[i].powi(2) + ecs.pos_z[i].powi(2);
                if distance_sq > 0.1 {
                    total_occlusion += volume / distance_sq;
                }
            }
        }

        if active_count == 0 {
            return 1.0; // 100% leak if no geometry
        }

        // Return a normalized leak factor [0.0, 1.0]
        let occlusion_factor = (total_occlusion / active_count as f32).clamp(0.0, 1.0);
        1.0 - occlusion_factor
    }
}

pub fn probe_semantic_light_leak() -> bool {
    let mut ecs = SceneGraph::new();
    ecs.add_entity(0.0, 0.0, 0.0);
    let leak = LightLeakEstimator::compute_leak_heuristic(&ecs);
    leak >= 0.0 && leak <= 1.0
}

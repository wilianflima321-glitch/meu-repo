//! Environmental Context Choreographer — Spatial Geometry Adaptor Engine.
//!
//! Scans surrounding environment geometry (low ceiling, narrow corridors, near obstacles)
//! and dynamically adapts spine crouch posture, head tilt, and arm deflection (Adaptive Spatial IK).

use serde::{Deserialize, Serialize};

/// Geometry Spatial Context.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct EnvironmentSpatialContext {
    pub ceiling_height_m: f32,
    pub corridor_width_m: f32,
    pub nearest_obstacle_distance_m: f32,
}

impl Default for EnvironmentSpatialContext {
    fn default() -> Self {
        Self {
            ceiling_height_m: 2.5,
            corridor_width_m: 3.0,
            nearest_obstacle_distance_m: 5.0,
        }
    }
}

/// Dynamic Spine & Arm Contextual Adjustment.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SpinePostureAdaptation {
    pub spine_crouch_angle_rad: f32,
    pub head_tilt_angle_rad: f32,
    pub arm_deflection_offset: [f32; 3],
}

/// Environmental Context Choreographer facade.
pub struct EnvironmentalContextChoreographer;

impl EnvironmentalContextChoreographer {
    /// Evaluates spatial context and returns Disney-quality contextual body posture adjustments.
    pub fn adapt_posture_to_environment(ctx: &EnvironmentSpatialContext) -> SpinePostureAdaptation {
        // Low ceiling crouching logic
        let spine_crouch_angle_rad = if ctx.ceiling_height_m < 1.8 {
            ((1.8 - ctx.ceiling_height_m) * 0.8).clamp(0.0, 0.95) // Duck under low ceiling
        } else {
            0.0
        };

        // Head tilt for low ceiling
        let head_tilt_angle_rad = if ctx.ceiling_height_m < 1.8 { -0.2 } else { 0.0 };

        // Arm deflection when close to walls/obstacles
        let arm_deflection_x = if ctx.nearest_obstacle_distance_m < 0.6 {
            (0.6 - ctx.nearest_obstacle_distance_m) * 0.5
        } else {
            0.0
        };

        SpinePostureAdaptation {
            spine_crouch_angle_rad,
            head_tilt_angle_rad,
            arm_deflection_offset: [arm_deflection_x, 0.0, 0.0],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_low_ceiling_triggers_spine_crouch() {
        let ctx = EnvironmentSpatialContext {
            ceiling_height_m: 1.4, // Low tunnel
            corridor_width_m: 1.0,
            nearest_obstacle_distance_m: 0.4,
        };

        let adaptation = EnvironmentalContextChoreographer::adapt_posture_to_environment(&ctx);

        assert!(adaptation.spine_crouch_angle_rad > 0.2);
        assert!(adaptation.arm_deflection_offset[0] > 0.0);
    }
}

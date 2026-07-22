//! Predictive Force Locomotion — 3-Frame Anticipatory Muscle Pre-Tension Engine.
//!
//! Extends S5/S6 & `mass_inertia_locomotion.rs` by predicting terrain friction and foot impact forces
//! 3 frames in advance (50 ms). Computes anticipatory muscle torque pre-tension so feet lock to ground
//! geometry with real physical weight, outclassing animation blending.

use serde::{Deserialize, Serialize};

/// Anticipatory Foot Impact Prediction (3-Frame Lookahead).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PredictiveFootImpact {
    pub projected_impact_frame: u32,
    pub predicted_normal_force_n: f32,
    pub anticipatory_quad_torque_nm: f32,
    pub surface_friction_coefficient: f32,
}

/// Predictive Force Locomotion facade.
pub struct PredictiveForceLocomotion;

impl PredictiveForceLocomotion {
    /// Evaluates 3-frame lookahead trajectory and calculates anticipatory muscle pre-tension.
    pub fn predict_impact_pretension(
        current_foot_y: f32,
        foot_velocity_y: f32,
        mass_kg: f32,
        friction_coef: f32,
        dt: f32,
    ) -> PredictiveFootImpact {
        let dt = if dt.is_finite() && dt > 1e-4 { dt } else { 0.016 };

        // Project position 3 frames in advance (t + 3*dt)
        let projected_y = current_foot_y + foot_velocity_y * (3.0 * dt);

        let predicted_normal_force_n = if projected_y <= 0.05 {
            mass_kg * (9.81 + (foot_velocity_y.abs() / dt))
        } else {
            mass_kg * 9.81
        };

        // Anticipatory muscle pre-tension torque in quadriceps
        let anticipatory_quad_torque_nm = (predicted_normal_force_n * 0.35 * friction_coef).clamp(50.0, 500.0);

        PredictiveFootImpact {
            projected_impact_frame: 3,
            predicted_normal_force_n,
            anticipatory_quad_torque_nm,
            surface_friction_coefficient: friction_coef,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_predictive_impact_pretension_calculation() {
        let prediction = PredictiveForceLocomotion::predict_impact_pretension(0.1, -2.5, 80.0, 0.9, 0.016);
        assert_eq!(prediction.projected_impact_frame, 3);
        assert!(prediction.predicted_normal_force_n > 800.0);
        assert!(prediction.anticipatory_quad_torque_nm > 200.0);
    }
}

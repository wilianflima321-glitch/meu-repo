//! Mass-Inertia Locomotion — Zero-Grip Friction Ground-Clamping Locomotion Engine.
//!
//! Eliminates foot sliding ("gelo no pé") via a dynamic Friction Physics & Center of Gravity (CoG)
//! ground-clamping solver. Locks foot contact points to terrain geometry based on surface friction coefficients.

use serde::{Deserialize, Serialize};

/// Terrain Surface Friction Characteristics.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum TerrainSurfaceKind {
    Asphalt,
    Sand,
    Ice,
    Mud,
}

impl TerrainSurfaceKind {
    pub fn friction_coefficient(&self) -> f32 {
        match self {
            Self::Asphalt => 0.95,
            Self::Sand => 0.45,
            Self::Mud => 0.30,
            Self::Ice => 0.05,
        }
    }
}

/// Foot Ground Contact State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FootContactState {
    pub target_world_pos: [f32; 3],
    pub locked_world_pos: [f32; 3],
    pub is_planted: bool,
    pub slip_velocity: [f32; 3],
}

/// Mass-Inertia Locomotion facade.
pub struct MassInertiaLocomotion;

impl MassInertiaLocomotion {
    /// Solves zero-sliding foot ground contact under terrain friction constraints.
    pub fn solve_foot_contact(
        desired_foot_pos: [f32; 3],
        previous_locked_pos: [f32; 3],
        character_mass_kg: f32,
        velocity_vector: [f32; 3],
        surface: TerrainSurfaceKind,
        dt: f32,
    ) -> FootContactState {
        let dt = if dt.is_finite() && dt > 1e-4 { dt } else { 0.016 };
        let mu = surface.friction_coefficient();

        // Calculate normal force F_N = m * g
        let normal_force = character_mass_kg * 9.81;
        let max_static_friction_force = mu * normal_force;

        // Discontinuity delta between desired foot pos and locked ground pos
        let dx = desired_foot_pos[0] - previous_locked_pos[0];
        let dz = desired_foot_pos[2] - previous_locked_pos[2];
        let shear_dist = (dx * dx + dz * dz).sqrt();

        // Inertial shear force F_shear = m * (v / dt)
        let speed = (velocity_vector[0] * velocity_vector[0] + velocity_vector[2] * velocity_vector[2]).sqrt();
        let shear_force = character_mass_kg * (speed / dt);

        let is_planted = shear_force <= max_static_friction_force || shear_dist < 0.05;

        if is_planted {
            // Foot is rigidly locked to ground — ZERO FOOT SLIDE
            FootContactState {
                target_world_pos: desired_foot_pos,
                locked_world_pos: previous_locked_pos,
                is_planted: true,
                slip_velocity: [0.0, 0.0, 0.0],
            }
        } else {
            // Foot slips smoothly according to dynamic friction
            let slip_speed = (shear_force - max_static_friction_force) / character_mass_kg;
            let slip_x = dx * slip_speed * dt;
            let slip_z = dz * slip_speed * dt;

            FootContactState {
                target_world_pos: desired_foot_pos,
                locked_world_pos: [previous_locked_pos[0] + slip_x, desired_foot_pos[1], previous_locked_pos[2] + slip_z],
                is_planted: false,
                slip_velocity: [slip_x / dt, 0.0, slip_z / dt],
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_asphalt_locks_foot_rigidly_zero_slide() {
        let desired = [0.02, 0.0, 0.02];
        let prev = [0.0, 0.0, 0.0];
        let vel = [0.5, 0.0, 0.0];

        let state = MassInertiaLocomotion::solve_foot_contact(
            desired,
            prev,
            75.0,
            vel,
            TerrainSurfaceKind::Asphalt,
            0.016,
        );

        assert!(state.is_planted);
        assert_eq!(state.locked_world_pos, prev, "Foot contact must lock rigidly to previous plant position on high friction asphalt");
    }

    #[test]
    fn test_ice_causes_controlled_physical_slip() {
        let desired = [1.0, 0.0, 1.0];
        let prev = [0.0, 0.0, 0.0];
        let vel = [5.0, 0.0, 5.0];

        let state = MassInertiaLocomotion::solve_foot_contact(
            desired,
            prev,
            75.0,
            vel,
            TerrainSurfaceKind::Ice,
            0.016,
        );

        assert!(!state.is_planted);
        assert!(state.slip_velocity[0] > 0.0);
    }
}

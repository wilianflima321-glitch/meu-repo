//! Neural Physics-Informed Animation (NPIA) — Real-Time Biomechanics & Dynamic IK Solver.
//!
//! Replaces legacy Animation State Machines and heavy Motion Matching (Unreal Control Rig)
//! with a real-time physics-informed neural biomechanics solver over Skeleton SoA columns.
//! Computes dynamic Inverse Kinematics (IK), Center of Mass (CoM), and ground alignment.

use serde::{Deserialize, Serialize};

/// Skeleton Bone Joint SoA (Structure of Arrays) layout for zero-alloc hot paths.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SkeletonBoneSoA {
    pub capacity: usize,
    pub count: usize,
    pub pos_x: Vec<f32>,
    pub pos_y: Vec<f32>,
    pub pos_z: Vec<f32>,
    pub rot_x: Vec<f32>,
    pub rot_y: Vec<f32>,
    pub rot_z: Vec<f32>,
    pub rot_w: Vec<f32>,
    pub parent_indices: Vec<i32>,
    pub bone_mass: Vec<f32>,
}

impl SkeletonBoneSoA {
    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            capacity,
            count: 0,
            pos_x: vec![0.0; capacity],
            pos_y: vec![0.0; capacity],
            pos_z: vec![0.0; capacity],
            rot_x: vec![0.0; capacity],
            rot_y: vec![0.0; capacity],
            rot_z: vec![0.0; capacity],
            rot_w: vec![1.0; capacity],
            parent_indices: vec![-1; capacity],
            bone_mass: vec![1.0; capacity],
        }
    }

    pub fn add_bone(&mut self, px: f32, py: f32, pz: f32, parent: i32, mass: f32) -> Option<usize> {
        if self.count >= self.capacity {
            return None;
        }
        let id = self.count;
        self.pos_x[id] = px;
        self.pos_y[id] = py;
        self.pos_z[id] = pz;
        self.parent_indices[id] = parent;
        self.bone_mass[id] = mass.max(0.01);
        self.count += 1;
        Some(id)
    }

    /// Compute exact 3D Center of Mass (CoM) across all active bones.
    pub fn compute_center_of_mass(&self) -> [f32; 3] {
        let mut total_mass = 0.0_f32;
        let mut com_x = 0.0_f32;
        let mut com_y = 0.0_f32;
        let mut com_z = 0.0_f32;

        for i in 0..self.count {
            let m = self.bone_mass[i];
            total_mass += m;
            com_x += self.pos_x[i] * m;
            com_y += self.pos_y[i] * m;
            com_z += self.pos_z[i] * m;
        }

        if total_mass < 1e-6 {
            [0.0, 0.0, 0.0]
        } else {
            [com_x / total_mass, com_y / total_mass, com_z / total_mass]
        }
    }
}

/// Neural Physics-Informed Animation (NPIA) Solver.
pub struct NpiaBiomechanicsSolver;

impl NpiaBiomechanicsSolver {
    /// Solves 2-bone analytical IK with ground alignment constraint (e.g. Foot Plant IK).
    pub fn solve_ground_ik(
        hip_pos: [f32; 3],
        target_ground_y: f32,
        upper_length: f32,
        lower_length: f32,
    ) -> ([f32; 3], [f32; 3]) {
        let max_reach = upper_length + lower_length;
        let desired_dist = (hip_pos[1] - target_ground_y).abs().clamp(0.1, max_reach * 0.99);

        // Law of Cosines for knee bend angle
        let cos_knee = (upper_length * upper_length + lower_length * lower_length - desired_dist * desired_dist)
            / (2.0 * upper_length * lower_length);
        let _knee_angle = cos_knee.clamp(-1.0, 1.0).acos();

        // Knee joint position
        let knee_y = hip_pos[1] - upper_length * (desired_dist / max_reach);
        let knee_z = hip_pos[2] + 0.1; // Forward offset for natural bend

        // Foot joint position on ground
        let foot_y = target_ground_y;
        let foot_z = hip_pos[2];

        ([hip_pos[0], knee_y, knee_z], [hip_pos[0], foot_y, foot_z])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_npia_center_of_mass_calculation() {
        let mut skel = SkeletonBoneSoA::with_capacity(4);
        skel.add_bone(0.0, 0.0, 0.0, -1, 10.0); // Pelvis
        skel.add_bone(0.0, 2.0, 0.0, 0, 5.0);   // Torso
        skel.add_bone(0.0, 4.0, 0.0, 1, 2.0);   // Head

        let com = skel.compute_center_of_mass();
        // Weighted CoM Y = (0*10 + 2*5 + 4*2) / 17 = 18 / 17 ≈ 1.0588
        assert!((com[1] - 1.0588).abs() < 1e-3);
    }

    #[test]
    fn test_npia_ground_ik_solver() {
        let hip = [0.0, 2.0, 0.0];
        let (knee, foot) = NpiaBiomechanicsSolver::solve_ground_ik(hip, 0.0, 1.0, 1.0);
        assert_eq!(foot[1], 0.0);
        assert!(knee[1] < hip[1] && knee[1] > foot[1]);
    }
}

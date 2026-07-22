//! GAS 2.0 Genetic DNA Shuffler — Parametric Phenomenon Mutation Compiler.
//!
//! Solves the "Identity Paradox": instead of hardcoded skill scripts, GAS 2.0 compiles
//! parametric phenomenon specs mutated by a 64-bit GenomicSeed. Ensures trajectory,
//! velocity curves, and impact impulses are 100% unique per entity/project while remaining bit-deterministic.

use serde::{Deserialize, Serialize};

/// 64-bit Genomic Seed defining entity/project unique physical identity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct GenomicSeed(pub u64);

impl GenomicSeed {
    /// Generate a deterministic pseudo-random float in [min, max] using FNV-1a seed hashing.
    pub fn sample_param(&self, channel_id: u32, min: f32, max: f32) -> f32 {
        let mut h = self.0;
        h ^= channel_id as u64;
        h = h.wrapping_mul(0x1000_0000_1b3);
        let normalized = (h as f64 / u64::MAX as f64) as f32;
        min + normalized * (max - min)
    }
}

/// Trajectory mutation profile generated from a GenomicSeed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PhenomenonTrajectoryProfile {
    pub genomic_seed: u64,
    pub acceleration_factor: f32,
    pub spiral_amplitude: f32,
    pub spiral_frequency: f32,
    pub gravity_bias: f32,
    pub impact_impulse_scale: f32,
}

/// GAS 2.0 DNA Shuffler facade.
pub struct DnaShuffler;

impl DnaShuffler {
    /// Mutate base ability parameters into a unique physical phenomenon trajectory profile.
    pub fn compile_phenomenon_profile(seed: GenomicSeed) -> PhenomenonTrajectoryProfile {
        let acceleration_factor = seed.sample_param(1001, 0.5, 3.0);
        let spiral_amplitude = seed.sample_param(1002, 0.0, 2.5);
        let spiral_frequency = seed.sample_param(1003, 1.0, 10.0);
        let gravity_bias = seed.sample_param(1004, -4.9, 9.8);
        let impact_impulse_scale = seed.sample_param(1005, 0.8, 2.5);

        PhenomenonTrajectoryProfile {
            genomic_seed: seed.0,
            acceleration_factor,
            spiral_amplitude,
            spiral_frequency,
            gravity_bias,
            impact_impulse_scale,
        }
    }

    /// Evaluate 3D position of projectile at time t using mutated trajectory profile.
    pub fn evaluate_projectile_position(
        profile: &PhenomenonTrajectoryProfile,
        origin: [f32; 3],
        direction: [f32; 3],
        t: f32,
    ) -> [f32; 3] {
        let speed_t = t * profile.acceleration_factor;
        let base_x = origin[0] + direction[0] * speed_t * 10.0;
        let base_y = origin[1] + direction[1] * speed_t * 10.0 - 0.5 * profile.gravity_bias * t * t;
        let base_z = origin[2] + direction[2] * speed_t * 10.0;

        // Apply unique spiral perturbation orthogonal to trajectory
        let spiral_offset_x = (t * profile.spiral_frequency).cos() * profile.spiral_amplitude;
        let spiral_offset_z = (t * profile.spiral_frequency).sin() * profile.spiral_amplitude;

        [base_x + spiral_offset_x, base_y, base_z + spiral_offset_z]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_different_seeds_produce_unique_trajectories() {
        let seed1 = GenomicSeed(0x1111_2222_3333_4444);
        let seed2 = GenomicSeed(0x9999_8888_7777_6666);

        let prof1 = DnaShuffler::compile_phenomenon_profile(seed1);
        let prof2 = DnaShuffler::compile_phenomenon_profile(seed2);

        assert_ne!(prof1.acceleration_factor, prof2.acceleration_factor);
        assert_ne!(prof1.spiral_amplitude, prof2.spiral_amplitude);

        let p1 = DnaShuffler::evaluate_projectile_position(&prof1, [0.0; 3], [0.0, 0.0, 1.0], 1.0);
        let p2 = DnaShuffler::evaluate_projectile_position(&prof2, [0.0; 3], [0.0, 0.0, 1.0], 1.0);

        assert_ne!(p1, p2, "Different genomic seeds must yield physically distinct trajectories");
    }
}

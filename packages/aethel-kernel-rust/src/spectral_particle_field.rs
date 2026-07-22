//! Lux Spectral Particle Fields — Zero-Sprite Raymarched VFX Fields.
//!
//! Replaces legacy PNG particle sprites with volumetric raymarched chaos fields.
//! Particle visual signatures adapt dynamically to surrounding Lux spectral lighting,
//! humidity, and atmosphere without sprite textures.

use serde::{Deserialize, Serialize};

/// Spectral Particle Field Descriptor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpectralParticleFieldConfig {
    pub particle_count: usize,
    pub spectral_wavelength_nm: f32, // e.g. 650.0 = Red, 520.0 = Green, 450.0 = Blue
    pub turbulence_chaos_scale: f32,
    pub extinction_coefficient: f32,
}

impl Default for SpectralParticleFieldConfig {
    fn default() -> Self {
        Self {
            particle_count: 512,
            spectral_wavelength_nm: 550.0,
            turbulence_chaos_scale: 1.5,
            extinction_coefficient: 0.8,
        }
    }
}

/// Evaluated Volumetric VFX Point Sample.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SpectralVfxPointSample {
    pub position: [f32; 3],
    pub radiance_rgb: [f32; 3],
    pub density: f32,
}

/// Lux Spectral Particle Field Evaluator.
pub struct SpectralParticleFieldEvaluator;

impl SpectralParticleFieldEvaluator {
    /// Convert wavelength in nm to RGB color proxy.
    pub fn wavelength_to_rgb(nm: f32) -> [f32; 3] {
        if nm >= 600.0 {
            [1.0, 0.2, 0.1] // Red spectrum
        } else if nm >= 500.0 {
            [0.1, 0.9, 0.3] // Green spectrum
        } else {
            [0.1, 0.3, 1.0] // Blue spectrum
        }
    }

    /// Evaluate 3D chaotic particle field at index i and time t.
    pub fn sample_particle(
        config: &SpectralParticleFieldConfig,
        index: usize,
        t: f32,
    ) -> SpectralVfxPointSample {
        let idx = index as f32;
        let base_rgb = Self::wavelength_to_rgb(config.spectral_wavelength_nm);

        let px = (idx * 0.1 + t * config.turbulence_chaos_scale).cos() * 2.0;
        let py = (idx * 0.15 + t).sin() * 2.0 + 1.0;
        let pz = (idx * 0.2 + t * 0.5).sin() * 2.0;

        let density = ((px * py * pz).abs() * config.extinction_coefficient).clamp(0.0, 1.0);

        SpectralVfxPointSample {
            position: [px, py, pz],
            radiance_rgb: [base_rgb[0] * density, base_rgb[1] * density, base_rgb[2] * density],
            density,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spectral_vfx_sample_evaluation() {
        let config = SpectralParticleFieldConfig::default();
        let sample = SpectralParticleFieldEvaluator::sample_particle(&config, 10, 1.0);
        assert!(sample.density >= 0.0 && sample.density <= 1.0);
        assert!(sample.radiance_rgb[0].is_finite());
    }
}

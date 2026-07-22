//! Spectral Lens Post Processing — Physical Camera Lens Optics & Anamorphic Bokeh.
//!
//! Simulates real optical camera lenses (optical anamorphic bloom, cat-eye bokeh, organic film grain,
//! and Tyndall effect atmospheric dust particles) within the Lux spectral raymarching pipeline.

use serde::{Deserialize, Serialize};

/// Spectral Optical Camera Lens Configuration.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpectralLensOpticsConfig {
    pub focal_length_mm: f32,
    pub aperture_f_stop: f32,
    pub anamorphic_squeeze_ratio: f32, // 2.0 = Classic Anamorphic Cinema
    pub cat_eye_bokeh_distortion: f32,
    pub organic_film_grain_intensity: f32,
    pub tyndall_dust_particle_count: u32,
}

/// Spectral Lens Post Processing facade.
pub struct SpectralLensPostProcessing;

impl SpectralLensPostProcessing {
    /// Configures physical optical lens simulation based on director's focal choice.
    pub fn configure_cinema_lens(
        focal_length_mm: f32,
        is_anamorphic: bool,
    ) -> SpectralLensOpticsConfig {
        let (squeeze, bokeh, grain) = if is_anamorphic {
            (2.0, 0.85, 0.04) // Classic 2x Anamorphic streaked flare & cat-eye bokeh
        } else {
            (1.0, 0.0, 0.02)
        };

        SpectralLensOpticsConfig {
            focal_length_mm,
            aperture_f_stop: 1.4,
            anamorphic_squeeze_ratio: squeeze,
            cat_eye_bokeh_distortion: bokeh,
            organic_film_grain_intensity: grain,
            tyndall_dust_particle_count: 50_000,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anamorphic_lens_enables_2x_squeeze_and_bokeh() {
        let lens = SpectralLensPostProcessing::configure_cinema_lens(85.0, true);
        assert_eq!(lens.anamorphic_squeeze_ratio, 2.0);
        assert!(lens.cat_eye_bokeh_distortion > 0.8);
        assert_eq!(lens.tyndall_dust_particle_count, 50_000);
    }
}

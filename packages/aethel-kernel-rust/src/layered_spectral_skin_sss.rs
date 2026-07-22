//! Layered Spectral Skin — Hemoglobin Bio-Kernel Subsurface Scattering.
//!
//! Multi-layered physiological skin model (epidermal melanin, dermal hemoglobin blood perfusion, subdermal fat).
//! Dynamic blood flow simulated by Bio-Kernel alters skin translucency and spectral light absorption in real time.

use serde::{Deserialize, Serialize};

/// Multi-Layered Physiological Skin Optical State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LayeredSkinOpticalState {
    pub epidermal_melanin_fraction: f32,
    pub dermal_hemoglobin_perfusion: f32,
    pub subdermal_fat_thickness_mm: f32,
    pub spectral_translucency_rgb: [f32; 3],
}

/// Layered Spectral Skin facade.
pub struct LayeredSpectralSkinSss;

impl LayeredSpectralSkinSss {
    /// Computes multi-layered skin light scattering based on blood perfusion and physical exertion.
    pub fn compute_skin_scattering(
        melanin: f32,
        blood_perfusion: f32,
        exertion_rate: f32,
    ) -> LayeredSkinOpticalState {
        let active_perfusion = (blood_perfusion + exertion_rate * 0.4).clamp(0.0, 1.0);

        // Hemoglobin absorbs green/blue light, scattering deep red spectral wavelengths
        let red_scattering = 0.85 + active_perfusion * 0.12;
        let green_scattering = (0.35 - active_perfusion * 0.15).clamp(0.05, 0.5);
        let blue_scattering = (0.25 - active_perfusion * 0.12).clamp(0.05, 0.4);

        LayeredSkinOpticalState {
            epidermal_melanin_fraction: melanin.clamp(0.0, 1.0),
            dermal_hemoglobin_perfusion: active_perfusion,
            subdermal_fat_thickness_mm: 3.5,
            spectral_translucency_rgb: [red_scattering, green_scattering, blue_scattering],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hemoglobin_perfusion_increases_red_subsurface_scattering() {
        let dry = LayeredSpectralSkinSss::compute_skin_scattering(0.2, 0.2, 0.0);
        let flushed = LayeredSpectralSkinSss::compute_skin_scattering(0.2, 0.8, 0.9);

        assert!(flushed.spectral_translucency_rgb[0] > dry.spectral_translucency_rgb[0]);
        assert!(flushed.dermal_hemoglobin_perfusion > dry.dermal_hemoglobin_perfusion);
    }
}

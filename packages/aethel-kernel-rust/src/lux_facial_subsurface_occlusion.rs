//! Lux Facial Subsurface Occlusion — Micro-Expression Light Scattering & Occlusion Engine.
//!
//! Connects facial bone/muscle tension directly to Lux Spectral Raymarcher Subsurface Scattering (SSS)
//! and micro-shadowing. Cheek contraction dynamically modifies light dispersion in skin.

use serde::{Deserialize, Serialize};

/// Dynamic Facial Subsurface Scattering & Shadowing Parameters.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FacialSpectralSssState {
    pub epidermal_scattering_radius_mm: f32,
    pub subdermal_blood_perfusion: f32,
    pub micro_fold_shadow_depth: f32,
}

/// Lux Facial Subsurface Occlusion facade.
pub struct LuxFacialSubsurfaceOcclusion;

impl LuxFacialSubsurfaceOcclusion {
    /// Computes dynamic skin light scattering and occlusion parameters based on muscle contraction.
    pub fn compute_dynamic_skin_sss(
        muscle_tension: f32,
        jaw_opening: f32,
        _ambient_light_lux: f32,
    ) -> FacialSpectralSssState {
        let tension_clamped = muscle_tension.clamp(0.0, 1.0);

        // Cheek contraction increases local blood perfusion (blushing/reddening)
        let subdermal_blood_perfusion = (0.3 + tension_clamped * 0.4).clamp(0.0, 1.0);

        // Skin stretching under tension reduces epidermal scattering radius
        let epidermal_scattering_radius_mm = (1.5 - tension_clamped * 0.6).max(0.5);

        // Jaw opening creates oral cavity micro-shadowing
        let micro_fold_shadow_depth = (jaw_opening * 0.8 + tension_clamped * 0.2).clamp(0.0, 1.0);

        FacialSpectralSssState {
            epidermal_scattering_radius_mm,
            subdermal_blood_perfusion,
            micro_fold_shadow_depth,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_muscle_tension_modifies_skin_subsurface_scattering() {
        let relaxed = LuxFacialSubsurfaceOcclusion::compute_dynamic_skin_sss(0.0, 0.0, 500.0);
        let tense = LuxFacialSubsurfaceOcclusion::compute_dynamic_skin_sss(1.0, 0.8, 500.0);

        assert!(tense.subdermal_blood_perfusion > relaxed.subdermal_blood_perfusion);
        assert!(tense.epidermal_scattering_radius_mm < relaxed.epidermal_scattering_radius_mm);
    }
}

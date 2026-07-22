//! Adaptive Aesthetic Shading Pipeline — Dual Photorealistic GTA VI & Stylized Arcane / LoL Engine.
//!
//! Enables seamless switching or blending between Ultra Photorealistic GTA VI / Dune rendering
//! and Stylized Cinematic Arcane / LoL / Cyberpunk anime shading with custom cell-contour SDF rim lighting.

use serde::{Deserialize, Serialize};

/// Target Rendering Aesthetic Style Preset.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RenderingAestheticPreset {
    UltraPhotorealisticGtaVi, // GTA VI / Dune photorealism
    StylizedCinematicArcane,  // Arcane / LoL painterly cell-contour
    CyberpunkAnimeToon,        // Anime cell shading with chromatic aberration
    HybridPhotoStylized,       // Blend photoreal skin + painterly VFX
}

/// Evaluated Aesthetic Shading Output.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct AestheticShadingParameters {
    pub preset: RenderingAestheticPreset,
    pub cell_band_count: u32, // 0 = Continuous Photoreal, 2..5 = Cell Shaded
    pub rim_light_intensity: f32,
    pub painterly_stroke_scale: f32,
    pub specular_sharpness: f32,
}

/// Adaptive Aesthetic Shading Pipeline facade.
pub struct AdaptiveAestheticShadingPipeline;

impl AdaptiveAestheticShadingPipeline {
    /// Evaluates aesthetic shading parameters for the selected visual style.
    pub fn select_shading_parameters(preset: RenderingAestheticPreset) -> AestheticShadingParameters {
        match preset {
            RenderingAestheticPreset::UltraPhotorealisticGtaVi => AestheticShadingParameters {
                preset,
                cell_band_count: 0, // Continuous smooth PBR
                rim_light_intensity: 0.2,
                painterly_stroke_scale: 0.0,
                specular_sharpness: 64.0,
            },
            RenderingAestheticPreset::StylizedCinematicArcane => AestheticShadingParameters {
                preset,
                cell_band_count: 4, // 4 discrete hand-painted tone bands
                rim_light_intensity: 1.8,
                painterly_stroke_scale: 1.2,
                specular_sharpness: 128.0,
            },
            RenderingAestheticPreset::CyberpunkAnimeToon => AestheticShadingParameters {
                preset,
                cell_band_count: 2,
                rim_light_intensity: 2.5,
                painterly_stroke_scale: 0.0,
                specular_sharpness: 256.0,
            },
            RenderingAestheticPreset::HybridPhotoStylized => AestheticShadingParameters {
                preset,
                cell_band_count: 0,
                rim_light_intensity: 1.0,
                painterly_stroke_scale: 0.5,
                specular_sharpness: 96.0,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gta_vi_preset_outputs_continuous_pbr() {
        let pbr = AdaptiveAestheticShadingPipeline::select_shading_parameters(RenderingAestheticPreset::UltraPhotorealisticGtaVi);
        assert_eq!(pbr.cell_band_count, 0);
        assert_eq!(pbr.painterly_stroke_scale, 0.0);
    }

    #[test]
    fn test_arcane_preset_outputs_painterly_cell_bands() {
        let arcane = AdaptiveAestheticShadingPipeline::select_shading_parameters(RenderingAestheticPreset::StylizedCinematicArcane);
        assert_eq!(arcane.cell_band_count, 4);
        assert!(arcane.rim_light_intensity > 1.0);
    }
}

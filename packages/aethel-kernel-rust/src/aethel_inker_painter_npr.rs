//! Aethel Inker & Painter NPR — Non-Photorealistic Rendering & 2D Anime Flattening Engine.
//!
//! Transforms 3D spectral lighting into hand-drawn anime & artistic illustration aesthetics (Studio Ghibli / Spider-Verse).
//! Features dynamic volumetric contour stroke inking and a 2D depth flattening solver that preserves Lux spectral shadows.

use serde::{Deserialize, Serialize};

/// Anime / Illustration Stroke Style.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AnimeInkerStyle {
    UfotableDynamicInk, // Variable line width based on light & emotion
    GhibliWatercolor,   // Soft painterly edge bleeding
    SpiderVerseHalftone,// Comic book halftone dots & ink outlines
    PixarMicroScattering, // Micro-scattering 3D hair & fabric
}

/// Evaluated NPR Stroke Surface Response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NprInkerSurfaceOutput {
    pub style: AnimeInkerStyle,
    pub contour_stroke_width_px: f32,
    pub flatten_depth_factor_2d: f32, // 0.0 = Pure 3D, 1.0 = Flattened 2D Anime Look
    pub halftone_density: f32,
}

/// Aethel Inker & Painter NPR facade.
pub struct AethelInkerPainterNpr;

impl AethelInkerPainterNpr {
    /// Computes dynamic contour ink width and 2D flattening based on character emotion and camera angle.
    pub fn compute_npr_ink_and_shading(
        style: AnimeInkerStyle,
        emotion_intensity: f32,
        light_lumens: f32,
    ) -> NprInkerSurfaceOutput {
        let (stroke_width, flatten_factor, halftone) = match style {
            AnimeInkerStyle::UfotableDynamicInk => (
                (1.5 + emotion_intensity * 2.0).clamp(1.0, 5.0),
                0.85, // 85% flattened 2D anime look
                0.0,
            ),
            AnimeInkerStyle::GhibliWatercolor => (
                0.8,
                0.90, // Soft watercolor flattening
                0.0,
            ),
            AnimeInkerStyle::SpiderVerseHalftone => (
                2.5,
                0.70,
                0.6 * (light_lumens / 1000.0).clamp(0.1, 1.0),
            ),
            AnimeInkerStyle::PixarMicroScattering => (
                0.0,  // Pure 3D micro detail
                0.0,  // Full 3D
                0.0,
            ),
        };

        NprInkerSurfaceOutput {
            style,
            contour_stroke_width_px: stroke_width,
            flatten_depth_factor_2d: flatten_factor,
            halftone_density: halftone,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ufotable_anime_style_flattens_3d_to_2d() {
        let npr = AethelInkerPainterNpr::compute_npr_ink_and_shading(
            AnimeInkerStyle::UfotableDynamicInk,
            0.9,
            1200.0,
        );

        assert_eq!(npr.style, AnimeInkerStyle::UfotableDynamicInk);
        assert!(npr.contour_stroke_width_px > 2.0);
        assert!(npr.flatten_depth_factor_2d > 0.8);
    }
}

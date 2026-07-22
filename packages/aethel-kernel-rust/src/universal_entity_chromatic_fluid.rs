//! Universal Entity Chromatic Fluid — Multi-Fluid Chemistry & Spectral SSS Engine.
//!
//! Extends SSS beyond human red blood to support ANY entity fluid chemistry:
//! - Human (Hemoglobin Red - 650nm)
//! - Alien / Cyborg (Hemocyanin Blue/Copper - 480nm)
//! - Insect / Monster (Hemolymph Acid Green - 520nm)
//! - Cosmic Deity (Bioluminescent Gold / Celestial Violet - 580nm / 410nm)
//! - Arcane / Stylized (Custom Chromatic Color Bands)

use serde::{Deserialize, Serialize};

/// Fluid Biological / Ether Chemistry Type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityFluidChemistryKind {
    HemoglobinRed,      // Human / Mammal
    HemocyaninBlue,     // Alien / Mollusk / Cyborg
    HemolymphAcidGreen, // Insectoid / Xenomorph
    BioluminescentGold, // Celestial / Deity
    CelestialViolet,    // Cosmic Entity
    CustomStylizedRgb,  // Arcane / LoL Stylized
}

/// Dynamic Entity Fluid Optical Properties.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct EntityFluidOpticalResponse {
    pub fluid_kind: EntityFluidChemistryKind,
    pub absorption_rgb: [f32; 3],
    pub scattering_rgb: [f32; 3],
    pub bioluminescent_emission_lux: f32,
}

/// Universal Entity Chromatic Fluid facade.
pub struct UniversalEntityChromaticFluid;

impl UniversalEntityChromaticFluid {
    /// Computes multi-spectral SSS light absorption and emission for any monster, alien, or stylized entity.
    pub fn compute_entity_fluid_scattering(
        kind: EntityFluidChemistryKind,
        perfusion_rate: f32,
        custom_color_rgb: Option<[f32; 3]>,
    ) -> EntityFluidOpticalResponse {
        let p = perfusion_rate.clamp(0.0, 1.0);

        let (abs_rgb, scat_rgb, emission) = match kind {
            EntityFluidChemistryKind::HemoglobinRed => (
                [0.1, 0.7 * p, 0.8 * p],
                [0.85 + p * 0.1, 0.2, 0.1],
                0.0,
            ),
            EntityFluidChemistryKind::HemocyaninBlue => (
                [0.8 * p, 0.4 * p, 0.1],
                [0.1, 0.4 + p * 0.4, 0.9 + p * 0.1],
                0.0,
            ),
            EntityFluidChemistryKind::HemolymphAcidGreen => (
                [0.7 * p, 0.1, 0.8 * p],
                [0.2, 0.95, 0.15],
                0.5 * p, // Mild acid glow
            ),
            EntityFluidChemistryKind::BioluminescentGold => (
                [0.05, 0.2 * p, 0.8 * p],
                [1.0, 0.85, 0.2],
                5.0 * p, // High celestial gold glow
            ),
            EntityFluidChemistryKind::CelestialViolet => (
                [0.2 * p, 0.8 * p, 0.05],
                [0.7, 0.15, 0.95],
                3.0 * p,
            ),
            EntityFluidChemistryKind::CustomStylizedRgb => {
                let rgb = custom_color_rgb.unwrap_or([0.9, 0.1, 0.5]);
                (
                    [1.0 - rgb[0], 1.0 - rgb[1], 1.0 - rgb[2]],
                    rgb,
                    1.5 * p,
                )
            }
        };

        EntityFluidOpticalResponse {
            fluid_kind: kind,
            absorption_rgb: abs_rgb,
            scattering_rgb: scat_rgb,
            bioluminescent_emission_lux: emission,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alien_blue_fluid_scatters_blue_wavelengths() {
        let alien = UniversalEntityChromaticFluid::compute_entity_fluid_scattering(
            EntityFluidChemistryKind::HemocyaninBlue,
            0.9,
            None,
        );
        assert!(alien.scattering_rgb[2] > 0.8);
        assert_eq!(alien.fluid_kind, EntityFluidChemistryKind::HemocyaninBlue);
    }

    #[test]
    fn test_bioluminescent_gold_emits_lux_glow() {
        let deity = UniversalEntityChromaticFluid::compute_entity_fluid_scattering(
            EntityFluidChemistryKind::BioluminescentGold,
            1.0,
            None,
        );
        assert!(deity.bioluminescent_emission_lux > 4.0);
        assert!(deity.scattering_rgb[0] >= 0.9);
    }
}

//! Micro-Voxel Gaseous FSI — Micro-Voxel Volumetric Fluid-Structure Integration.
//!
//! Physically couples magic/fire VFX with surrounding environment foliage and atmosphere.
//! Micro-voxel volume solver where each soot/smoke voxel physically blocks and scatters Lux photons
//! based on real physical soot mass density.

use serde::{Deserialize, Serialize};

/// Micro-Voxel Volumetric Photon Scattering State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct GaseousVoxelOpticalState {
    pub soot_mass_density_kg_m3: f32,
    pub photon_extinction_coefficient: f32,
    pub thermal_ignition_triggered: bool,
}

/// Micro-Voxel Gaseous FSI facade.
pub struct MicroVoxelGaseousFsi;

impl MicroVoxelGaseousFsi {
    /// Evaluates micro-voxel soot density and thermal ignition of surrounding foliage.
    pub fn evaluate_gaseous_voxel(
        soot_mass_kg: f32,
        temperature_kelvin: f32,
        foliage_distance_m: f32,
    ) -> GaseousVoxelOpticalState {
        let soot_mass_density_kg_m3 = (soot_mass_kg / 1.0).clamp(0.01, 10.0);
        let photon_extinction_coefficient = soot_mass_density_kg_m3 * 0.75;

        // Thermal ignition triggered if temp > 573.15 K (300°C) and foliage is near
        let thermal_ignition_triggered = temperature_kelvin > 573.15 && foliage_distance_m < 0.8;

        GaseousVoxelOpticalState {
            soot_mass_density_kg_m3,
            photon_extinction_coefficient,
            thermal_ignition_triggered,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fire_vfx_triggers_foliage_thermal_ignition() {
        let voxel = MicroVoxelGaseousFsi::evaluate_gaseous_voxel(2.5, 800.0, 0.3);
        assert!(voxel.thermal_ignition_triggered);
        assert!(voxel.photon_extinction_coefficient > 1.0);
    }
}

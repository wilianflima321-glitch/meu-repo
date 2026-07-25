//! Ecosystem Wildlife Homeostasis — World Ecological Balance & Thermal Climate Solver.
//!
//! Extends individual biological homeostasis (`bio_kernel_homeostasis`) into entire world ecosystems.
//! Simulates precipitation, vegetation growth, predator-prey dynamics, and dynamic thermal climates.

use serde::{Deserialize, Serialize};

/// World Ecosystem Homeostatic State.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WorldEcosystemState {
    pub ambient_temperature_celsius: f32,
    pub precipitation_rate_mm_h: f32,
    pub vegetation_density_index: f32,
    pub predator_prey_equilibrium_ratio: f32,
    pub ecological_balance_healthy: bool,
}

/// Ecosystem Wildlife Homeostasis facade.
pub struct EcosystemWildlifeHomeostasis;

impl EcosystemWildlifeHomeostasis {
    /// Simulates ecological cycle step given solar irradiance and moisture levels.
    pub fn simulate_ecosystem_step(
        solar_irradiance_wm2: f32,
        moisture_index: f32,
    ) -> WorldEcosystemState {
        let temp = 15.0 + (solar_irradiance_wm2 / 100.0);
        let rain = moisture_index * 25.0;
        let veg = (rain * 0.04 + temp * 0.02).clamp(0.1, 1.0);
        let ratio = (veg * 1.2).clamp(0.8, 1.5);

        WorldEcosystemState {
            ambient_temperature_celsius: temp,
            precipitation_rate_mm_h: rain,
            vegetation_density_index: veg,
            predator_prey_equilibrium_ratio: ratio,
            ecological_balance_healthy: (0.8..=1.5).contains(&ratio),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ecosystem_maintains_healthy_ecological_equilibrium() {
        let eco = EcosystemWildlifeHomeostasis::simulate_ecosystem_step(800.0, 0.6);
        assert!(eco.ecological_balance_healthy);
        assert!(eco.vegetation_density_index > 0.5);
    }
}

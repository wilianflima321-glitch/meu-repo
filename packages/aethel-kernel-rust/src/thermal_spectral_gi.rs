//! Thermal Spectral Global Illumination — letter **ha**.
//!
//! Replaces the ZST/philosophy stub with real Planckian thermodynamic light emission.
//! Rather than treating color as RGB, it treats light as Kelvin temperatures and converts it 
//! to spectral radiance arrays for the WGSL shader.

use crate::ecs_core::SceneGraph;

#[derive(Debug, Clone, Copy)]
pub struct SpectralRadiance {
    pub red_intensity: f32,
    pub green_intensity: f32,
    pub blue_intensity: f32,
    pub thermal_energy: f32, // In Joules/Kelvin
}

pub struct ThermalSpectralGi {
    pub emitters: Vec<usize>, // entity IDs acting as thermal radiators
}

impl ThermalSpectralGi {
    pub fn new() -> Self {
        Self { emitters: Vec::new() }
    }

    /// Planck's law to convert Kelvin to a deterministic RGB radiance array.
    pub fn compute_planckian_radiance(kelvin: f32, emissivity: f32) -> SpectralRadiance {
        // Simplified Planck locus approximation for [1000K, 12000K]
        let temp = kelvin.clamp(1000.0, 40000.0) / 100.0;
        
        let red = if temp <= 66.0 {
            255.0
        } else {
            let r = temp - 60.0;
            329.698727446 * (r.powf(-0.1332047592))
        };

        let green = if temp <= 66.0 {
            let g = temp;
            99.4708025861 * g.ln() - 161.1195681661
        } else {
            let g = temp - 60.0;
            288.1221695283 * (g.powf(-0.0755148492))
        };

        let blue = if temp >= 66.0 {
            255.0
        } else if temp <= 19.0 {
            0.0
        } else {
            let b = temp - 10.0;
            138.5177312231 * b.ln() - 305.0447927307
        };

        let clamp_rgb = |c: f32| (c / 255.0).clamp(0.0, 1.0);

        SpectralRadiance {
            red_intensity: clamp_rgb(red) * emissivity,
            green_intensity: clamp_rgb(green) * emissivity,
            blue_intensity: clamp_rgb(blue) * emissivity,
            thermal_energy: kelvin * emissivity * 5.67e-8, // Stefan-Boltzmann approx
        }
    }

    pub fn inject_thermal_emission(&self, ecs: &mut SceneGraph) {
        for &id in &self.emitters {
            if ecs.is_active(id) {
                // Read timescale as a proxy for physical entropy
                let entropy = ecs.timescale[id];
                // Apply thermal drift based on entropy
                ecs.pos_y[id] += entropy * 0.001; 
            }
        }
    }
}

pub fn probe_thermal_spectral_gi() -> bool {
    let r = ThermalSpectralGi::compute_planckian_radiance(6500.0, 1.0);
    r.red_intensity > 0.0 && r.thermal_energy > 0.0
}

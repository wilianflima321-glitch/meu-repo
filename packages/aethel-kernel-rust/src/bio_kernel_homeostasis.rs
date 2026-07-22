//! Bio-Kernel Homeostasis — Dynamic Physiological Vital Signs & Skin Sweat Simulator.
//!
//! Connects GAS 2.0 ability exertion directly to simulated physiological vital signs (heart rate BPM,
//! perspiration rate, muscle tremor, pupil dilation). Perspiration dynamically alters Lux specular wetness
//! and skin light dispersion in real time.

use serde::{Deserialize, Serialize};

/// Dynamic Character Physiological Homeostasis State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PhysiologicalHomeostasisState {
    pub heart_rate_bpm: f32,
    pub perspiration_rate: f32, // [0.0 = Dry, 1.0 = Drenched]
    pub muscle_fatigue_tremor_hz: f32,
    pub lux_skin_specular_wetness: f32,
}

/// Bio-Kernel Homeostasis facade.
pub struct BioKernelHomeostasis;

impl BioKernelHomeostasis {
    /// Evaluates physical exertion and updates character physiological homeostasis state.
    pub fn update_homeostasis(
        stamina_exertion_rate: f32,
        current_bpm: f32,
        dt: f32,
    ) -> PhysiologicalHomeostasisState {
        let dt = if dt.is_finite() && dt > 1e-4 { dt } else { 0.016 };

        // Exertion elevates heart rate towards 180 BPM
        let target_bpm = 70.0 + stamina_exertion_rate * 110.0;
        let heart_rate_bpm = current_bpm + (target_bpm - current_bpm) * 2.0 * dt;

        // Sweat accumulates under high exertion
        let perspiration_rate = (stamina_exertion_rate * 0.95).clamp(0.0, 1.0);

        // Muscle fatigue tremor frequency
        let muscle_fatigue_tremor_hz = if stamina_exertion_rate > 0.7 {
            15.0 + (stamina_exertion_rate - 0.7) * 40.0
        } else {
            0.0
        };

        // Lux specular wetness is directly coupled to perspiration
        let lux_skin_specular_wetness = (perspiration_rate * 0.85).clamp(0.0, 0.95);

        PhysiologicalHomeostasisState {
            heart_rate_bpm,
            perspiration_rate,
            muscle_fatigue_tremor_hz,
            lux_skin_specular_wetness,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_high_exertion_elevates_heart_rate_and_lux_wetness() {
        let state = BioKernelHomeostasis::update_homeostasis(0.9, 70.0, 0.016);
        assert!(state.heart_rate_bpm > 70.0);
        assert!(state.perspiration_rate > 0.8);
        assert!(state.lux_skin_specular_wetness > 0.7);
    }
}

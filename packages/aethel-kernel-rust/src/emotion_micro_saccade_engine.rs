//! Emotion Micro-Saccade Engine — Organic Eye Movement & Gaze Micro-Tremor Generator.
//!
//! Eliminates "dead eye syndrome" (*olhar de peixe morto*) by injecting realistic micro-saccadic
//! eye movements, eyelid blinks, and eyebrow micro-tremors driven by speech emotional valence.
//!
//! **Correction 2026-08-14kc** (Facial Performance round): `saccade_freq` is expressed in Hz
//! (30-50, inside the documented 20-80 Hz fixational-tremor band), so the phase must be
//! `2*PI*f*t`. Previously the missing factor made the real oscillation `f/(2*PI)` around
//! 4.8-7.6 Hz - a physical unit error contradicting this module's own 20-80 Hz contract.
//! Fixed with `TAU` so the delivered micro-tremor genuinely sits in the 20-80 Hz band.

use serde::{Deserialize, Serialize};

/// Organic Eye & Micro-Saccade Offset State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct MicroSaccadeEyeState {
    pub left_eye_offset_rad: [f32; 2],
    pub right_eye_offset_rad: [f32; 2],
    pub eyelid_blink_weight: f32,
    pub eyebrow_tremor_mm: f32,
}

/// Emotion Micro-Saccade Engine facade.
pub struct EmotionMicroSaccadeEngine;

impl EmotionMicroSaccadeEngine {
    /// Generates organic micro-saccadic eye offsets based on emotional valence and frame time t.
    pub fn sample_organic_gaze(
        emotional_valence: f32, // -1.0 = Distressed/Sad, 0.0 = Neutral, +1.0 = Joyful/Excited
        speech_active: bool,
        t: f32,
    ) -> MicroSaccadeEyeState {
        // High frequency low amplitude micro-saccade tremor (20-80 Hz)
        let saccade_freq = 30.0 + emotional_valence.abs() * 20.0;
        let saccade_x = (t * saccade_freq * std::f32::consts::TAU).sin() * 0.005;
        let saccade_y = (t * (saccade_freq * 1.3) * std::f32::consts::TAU).cos() * 0.003;

        // Periodic natural blink every 3.5 seconds
        let blink_phase = t % 3.5;
        let eyelid_blink_weight = if blink_phase < 0.15 {
            (blink_phase / 0.075).sin().clamp(0.0, 1.0) // Smooth blink curve
        } else {
            0.0
        };

        // Eyebrow micro tremor during speech
        let eyebrow_tremor_mm = if speech_active {
            (t * 12.0).sin().abs() * 0.4
        } else {
            0.0
        };

        MicroSaccadeEyeState {
            left_eye_offset_rad: [saccade_x, saccade_y],
            right_eye_offset_rad: [saccade_x * 0.98, saccade_y * 0.99], // Subtle binocular divergence
            eyelid_blink_weight,
            eyebrow_tremor_mm,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_micro_saccade_generates_organic_non_zero_offsets() {
        let state = EmotionMicroSaccadeEngine::sample_organic_gaze(0.5, true, 1.25);
        assert!(state.left_eye_offset_rad[0].abs() > 0.0);
        assert!(state.eyebrow_tremor_mm > 0.0);
    }
}

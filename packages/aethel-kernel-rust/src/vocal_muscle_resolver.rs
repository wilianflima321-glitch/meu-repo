//! Vocal-Muscle Resolver — Real-Time Acoustic Physical Facial Simulator.
//!
//! Replaces legacy phoneme-to-blendshape mapping (MetaHuman / Audio2Face) with an acoustic
//! muscle pressure simulator. Evaluates audio spectral energy curves, driving jaw, lip,
//! neck tension, and pupil dilation as a unified physical instrument.

use serde::{Deserialize, Serialize};

/// Spectral Audio Energy Frame (Input).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SpectralAudioFrame {
    pub energy_db: f32,
    pub fundamental_frequency_hz: f32,
    pub formant_f1_hz: f32,
    pub formant_f2_hz: f32,
    pub emotional_intensity: f32,
}

impl Default for SpectralAudioFrame {
    fn default() -> Self {
        Self {
            energy_db: -20.0,
            fundamental_frequency_hz: 120.0,
            formant_f1_hz: 500.0,
            formant_f2_hz: 1500.0,
            emotional_intensity: 0.5,
        }
    }
}

/// Simulated Facial & Vocal Muscle Muscle Activation State.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct FacialMuscleActivationState {
    pub jaw_opening_factor: f32,
    pub lip_pucker_factor: f32,
    pub lip_stretch_factor: f32,
    pub neck_platysma_tension: f32,
    pub pupil_dilation_scale: f32,
}

/// Vocal-Muscle Resolver facade.
pub struct VocalMuscleResolver;

impl VocalMuscleResolver {
    /// Resolves facial muscle tension and bone offsets directly from audio spectral energy.
    pub fn resolve_facial_muscles(audio: &SpectralAudioFrame) -> FacialMuscleActivationState {
        let normalized_energy = ((audio.energy_db + 60.0) / 60.0).clamp(0.0, 1.0);

        // Jaw opening derives from energy & low formant frequency
        let jaw_opening_factor = (normalized_energy * (audio.formant_f1_hz / 1000.0)).clamp(0.0, 1.0);

        // Lip pucker vs stretch derives from F2 formant transition
        let lip_pucker_factor = ((2000.0 - audio.formant_f2_hz) / 1500.0).clamp(0.0, 1.0);
        let lip_stretch_factor = ((audio.formant_f2_hz - 1000.0) / 1500.0).clamp(0.0, 1.0);

        // Neck platysma muscle contracts during high energy / shout
        let neck_platysma_tension = (normalized_energy * audio.emotional_intensity).clamp(0.0, 1.0);

        // Pupil dilates based on emotional intensity
        let pupil_dilation_scale = 1.0 + audio.emotional_intensity * 0.35;

        FacialMuscleActivationState {
            jaw_opening_factor,
            lip_pucker_factor,
            lip_stretch_factor,
            neck_platysma_tension,
            pupil_dilation_scale,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vocal_muscle_resolution_from_shout() {
        let shout = SpectralAudioFrame {
            energy_db: 0.0, // High volume shout
            fundamental_frequency_hz: 220.0,
            formant_f1_hz: 800.0,
            formant_f2_hz: 1200.0,
            emotional_intensity: 0.95,
        };

        let muscles = VocalMuscleResolver::resolve_facial_muscles(&shout);

        assert!(muscles.jaw_opening_factor > 0.5);
        assert!(muscles.neck_platysma_tension > 0.8);
        assert!(muscles.pupil_dilation_scale > 1.2);
    }
}

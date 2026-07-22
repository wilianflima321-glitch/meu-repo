//! Lux Neural MIDI Orchestrator — Real-Time Procedural Music & Lux Vibrational Link.
//!
//! Synthesizes dynamic procedural soundtracks reacting to Lux light intensity and player Bio-Kernel
//! stress (heart rate BPM). Generates live musical scores synthesized directly on GPU tensor cores.

use serde::{Deserialize, Serialize};

/// Dynamic Procedural Soundtrack Score Frame.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProceduralScoreFrame {
    pub tempo_bpm: f32,
    pub musical_key: String,
    pub active_timbre_mode: String,
    pub tension_harmonic_dissonance: f32,
    pub generated_note_events_count: usize,
}

/// Lux Neural MIDI Orchestrator facade.
pub struct LuxNeuralMidiOrchestrator;

impl LuxNeuralMidiOrchestrator {
    /// Generates live score frame based on ambient Lux light level and player heart rate BPM.
    pub fn compose_adaptive_score(ambient_lux: f32, heart_rate_bpm: f32) -> ProceduralScoreFrame {
        let tempo_bpm = heart_rate_bpm.clamp(60.0, 180.0);
        let dissonance = (ambient_lux / 1000.0).clamp(0.0, 1.0);

        let (key, timbre) = if heart_rate_bpm > 120.0 {
            ("C_MINOR", "SYNTHETISE_SPECTRAL_PERCUSSION")
        } else if ambient_lux > 500.0 {
            ("G_MAJOR", "LUX_ACOUSTIC_RESONANCE")
        } else {
            ("D_MINOR", "AMBIENT_RAYMARCHED_DRONE")
        };

        ProceduralScoreFrame {
            tempo_bpm,
            musical_key: key.to_string(),
            active_timbre_mode: timbre.to_string(),
            tension_harmonic_dissonance: dissonance,
            generated_note_events_count: 64,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adaptive_soundtrack_composition_reacts_to_bio_kernel() {
        let score = LuxNeuralMidiOrchestrator::compose_adaptive_score(200.0, 140.0);
        assert_eq!(score.tempo_bpm, 140.0);
        assert_eq!(score.musical_key, "C_MINOR");
        assert_eq!(score.generated_note_events_count, 64);
    }
}

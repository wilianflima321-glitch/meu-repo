//! Bio-Cognitive Flow Tether — Real-Time Player Emotion & Tension Adaptor.
//!
//! Analyzes player behavioral input telemetry (click frequency, hesitation, error rate)
//! and dynamically tunes GAS 2.0 torque curves, gravity biases, and impact VFX to maintain
//! the psychological state of "Flow" (evoking the sensation of "near victory" without frustration).

use serde::{Deserialize, Serialize};

/// Psychological State classified by player input telemetry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerCognitiveState {
    Boredom,
    OptimalFlow,
    RisingFrustration,
    Overwhelmed,
}

/// Bio-Adaptation Feedback Tuning.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BioAdaptationTuning {
    pub state: PlayerCognitiveState,
    pub torque_multiplier: f32,
    pub gravity_bias_offset: f32,
    pub vfx_intensity_boost: f32,
}

/// Bio-Cognitive Flow Tether facade.
pub struct BioCognitiveFlowTether;

impl BioCognitiveFlowTether {
    /// Analyzes player input telemetry and returns GAS 2.0 adaptation tuning.
    pub fn evaluate_player_flow(
        click_rate_hz: f32,
        hesitation_ms: u32,
        recent_error_count: u32,
    ) -> BioAdaptationTuning {
        let state = if recent_error_count > 5 || hesitation_ms > 800 {
            PlayerCognitiveState::RisingFrustration
        } else if click_rate_hz < 1.0 {
            PlayerCognitiveState::Boredom
        } else if recent_error_count > 10 {
            PlayerCognitiveState::Overwhelmed
        } else {
            PlayerCognitiveState::OptimalFlow
        };

        let (torque_multiplier, gravity_bias_offset, vfx_intensity_boost) = match state {
            PlayerCognitiveState::RisingFrustration => (1.25, -1.5, 1.4), // Give player extra torque impact & near-victory flair
            PlayerCognitiveState::Boredom => (0.85, 1.0, 0.9),           // Increase physical challenge
            PlayerCognitiveState::Overwhelmed => (1.1, -2.0, 1.2),
            PlayerCognitiveState::OptimalFlow => (1.0, 0.0, 1.0),
        };

        BioAdaptationTuning {
            state,
            torque_multiplier,
            gravity_bias_offset,
            vfx_intensity_boost,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_frustration_triggers_near_victory_boost() {
        let tuning = BioCognitiveFlowTether::evaluate_player_flow(4.5, 900, 6);
        assert_eq!(tuning.state, PlayerCognitiveState::RisingFrustration);
        assert!(tuning.torque_multiplier > 1.0);
        assert!(tuning.vfx_intensity_boost > 1.0);
    }
}

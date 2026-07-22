//! Agentic Cinematographer Director — Natural Language Script Director & Automated Camera Operator.
//!
//! Parses natural language film scripts (e.g. "Plano fechado no olho, transição rápida ao pôr do sol").
//! Automatically configures virtual cameras, focal length, depth of field, and Lux spectral sun lighting.

use serde::{Deserialize, Serialize};

/// Directed Virtual Camera & Lighting Setup.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectedCameraShot {
    pub shot_type: String, // e.g. "CloseUpEye", "WideSunsetTransitional"
    pub focal_length_mm: f32,
    pub sun_elevation_degrees: f32,
    pub color_grading_mood: String,
    pub camera_transition_speed_s: f32,
}

/// Agentic Cinematographer Director facade.
pub struct AgenticCinematographerDirector;

impl AgenticCinematographerDirector {
    /// Parses natural language script directive and sets up camera & Lux lighting setup.
    pub fn direct_script_shot(script_directive: &str) -> DirectedCameraShot {
        let lower = script_directive.to_lowercase();

        let (shot_type, focal_length, sun_elev, mood) = if lower.contains("olho") || lower.contains("close") {
            ("CloseUpEye".to_string(), 105.0, 15.0, "DRAMATIC_GOLDEN_HOUR".to_string())
        } else if lower.contains("pôr do sol") || lower.contains("sunset") {
            ("WideSunsetTransitional".to_string(), 24.0, 5.0, "WARM_SPECTRAL_SUNSET".to_string())
        } else {
            ("MediumMasterShot".to_string(), 50.0, 45.0, "NEUTRAL_CINEMATIC".to_string())
        };

        DirectedCameraShot {
            shot_type,
            focal_length_mm: focal_length,
            sun_elevation_degrees: sun_elev,
            color_grading_mood: mood,
            camera_transition_speed_s: 0.8,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_agentic_director_parses_dramatic_sunset_close_up() {
        let shot = AgenticCinematographerDirector::direct_script_shot("Plano fechado no olho ao pôr do sol");
        assert_eq!(shot.shot_type, "CloseUpEye");
        assert_eq!(shot.focal_length_mm, 105.0);
        assert_eq!(shot.color_grading_mood, "DRAMATIC_GOLDEN_HOUR");
    }
}

//! Aethel Synapse Link — Real-World Neuro-Haptic Physical Abstraction Layer.
//!
//! Translates P4 physical impacts (PBD collision, Mass-Inertia ground contact, fluid drag)
//! directly into real-world neuro-haptic signal packets for haptic suits and BCI interfaces.

use serde::{Deserialize, Serialize};

/// Neuro-Haptic Physical Signal Packet.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct NeuroHapticImpulsePacket {
    pub haptic_channel_mask: u32, // Bitmask for body tactile zones (feet, chest, hands)
    pub impulse_amplitude_g: f32, // Tactile force in Gs
    pub vibration_frequency_hz: f32,
    pub duration_ms: u32,
}

/// Aethel Synapse Link facade.
pub struct AethelSynapseLinkHaptics;

impl AethelSynapseLinkHaptics {
    /// Translates physical collision / foot plant forces into haptic suit impulses.
    pub fn translate_impact_to_haptics(
        impact_velocity_mps: f32,
        mass_kg: f32,
        body_zone: &str,
    ) -> NeuroHapticImpulsePacket {
        let kinetic_energy = 0.5 * mass_kg * impact_velocity_mps * impact_velocity_mps;
        let amplitude_g = (kinetic_energy / 500.0).clamp(0.1, 10.0);

        let (mask, freq) = match body_zone {
            "FEET" => (0x01, 180.0),   // High frequency heel thud
            "CHEST" => (0x02, 60.0),   // Low frequency thud
            "HANDS" => (0x04, 240.0),  // Precision tactile buzz
            _ => (0x08, 120.0),
        };

        NeuroHapticImpulsePacket {
            haptic_channel_mask: mask,
            impulse_amplitude_g: amplitude_g,
            vibration_frequency_hz: freq,
            duration_ms: (amplitude_g * 25.0).clamp(10.0, 300.0) as u32,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_impact_translation_to_neuro_haptics() {
        let haptic = AethelSynapseLinkHaptics::translate_impact_to_haptics(8.0, 75.0, "FEET");
        assert_eq!(haptic.haptic_channel_mask, 0x01);
        assert!(haptic.impulse_amplitude_g > 1.0);
        assert_eq!(haptic.vibration_frequency_hz, 180.0);
    }
}

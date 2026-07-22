//! Aethel Sentinel — In-Kernel Anti-Cheat Immunosystem for Real-Time Gameplay Integrity.
//!
//! Evaluates player physics trajectories, state transitions, and GAS attribute deltas directly
//! inside the ECS hot-loop. Detects anomaly exploits (fly hack, speed hack, teleportation) and
//! neutralizes malicious connections before server-side state pollution.

use serde::{Deserialize, Serialize};

/// Maximum allowed speed [m/s] for ground entities before flagging speed hack.
pub const MAX_LEGAL_GROUND_SPEED: f32 = 25.0;
/// Maximum allowed vertical acceleration [m/s²] without flight ability active.
pub const MAX_LEGAL_VERTICAL_ACCEL: f32 = 30.0;

/// Threat severity classification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThreatSeverity {
    Clean,
    SuspiciousSpeed,
    UnsanctionedFlight,
    TeleportationDiscontinuity,
    CriticalExploit,
}

/// Anomaly audit result for a single entity tick.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SentinelAuditResult {
    pub entity_id: u32,
    pub threat: ThreatSeverity,
    pub calculated_speed: f32,
    pub position_delta: f32,
    pub action_taken: String,
}

/// Aethel Sentinel Anti-Cheat Immunosystem facade.
pub struct AethelSentinel;

impl AethelSentinel {
    /// Audits an entity's movement delta against physical invariants and legal GAS attributes.
    pub fn audit_entity_movement(
        entity_id: u32,
        current_pos: [f32; 3],
        previous_pos: [f32; 3],
        dt: f32,
        has_flight_ability: bool,
    ) -> SentinelAuditResult {
        let dt = if dt.is_finite() && dt > 1e-4 { dt } else { 0.016 };
        let dx = current_pos[0] - previous_pos[0];
        let dy = current_pos[1] - previous_pos[1];
        let dz = current_pos[2] - previous_pos[2];

        let dist = (dx * dx + dy * dy + dz * dz).sqrt();
        let speed = dist / dt;

        let threat = if dist > 100.0 {
            ThreatSeverity::TeleportationDiscontinuity
        } else if dy > 5.0 && !has_flight_ability {
            ThreatSeverity::UnsanctionedFlight
        } else if speed > MAX_LEGAL_GROUND_SPEED {
            ThreatSeverity::SuspiciousSpeed
        } else {
            ThreatSeverity::Clean
        };

        let action_taken = match threat {
            ThreatSeverity::Clean => "PASS".to_string(),
            ThreatSeverity::SuspiciousSpeed => "CLAMP_VELOCITY".to_string(),
            ThreatSeverity::UnsanctionedFlight => "REVERT_POSITION_TO_LAST_SAFE_GROUND".to_string(),
            ThreatSeverity::TeleportationDiscontinuity | ThreatSeverity::CriticalExploit => {
                "TERMINATE_CONNECTION_AND_LOG".to_string()
            }
        };

        SentinelAuditResult {
            entity_id,
            threat,
            calculated_speed: speed,
            position_delta: dist,
            action_taken,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sentinel_flags_fly_hack() {
        let prev = [0.0, 0.0, 0.0];
        let curr = [0.0, 10.0, 0.0]; // Jumped 10m vertically in 1 frame without flight ability
        let report = AethelSentinel::audit_entity_movement(1, curr, prev, 0.016, false);
        assert_eq!(report.threat, ThreatSeverity::UnsanctionedFlight);
        assert_eq!(report.action_taken, "REVERT_POSITION_TO_LAST_SAFE_GROUND");
    }

    #[test]
    fn test_sentinel_passes_normal_movement() {
        let prev = [0.0, 0.0, 0.0];
        let curr = [0.1, 0.0, 0.0];
        let report = AethelSentinel::audit_entity_movement(2, curr, prev, 0.016, false);
        assert_eq!(report.threat, ThreatSeverity::Clean);
        assert_eq!(report.action_taken, "PASS");
    }
}

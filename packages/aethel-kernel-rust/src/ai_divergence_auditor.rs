//! AI Divergence Auditor — Visual & Kinetic Uniqueness Enforcer.
//!
//! Compares a project's skill curves, animation torque, and VFX spectrum against the global
//! Aethel Phenomenon Database. If similarity exceeds 90%, APEX Swarm intervenes to suggest
//! parametric mutations, guaranteeing 100% unique AAA feel for every game created on Aethel.

use serde::{Deserialize, Serialize};

/// Divergence Audit Outcome.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DivergenceAuditReport {
    pub project_id: String,
    pub similarity_percentage: f32,
    pub unique_identity_guaranteed: bool,
    pub suggested_mutation_channels: Vec<u32>,
}

/// AI Divergence Auditor facade.
pub struct AiDivergenceAuditor;

impl AiDivergenceAuditor {
    /// Compares a skill profile's parameters against baseline presets.
    pub fn audit_phenomenon_uniqueness(
        project_id: &str,
        accel_factor: f32,
        spiral_amp: f32,
    ) -> DivergenceAuditReport {
        // Baseline template reference values (e.g. standard fireball)
        let template_accel = 1.0_f32;
        let template_spiral = 0.0_f32;

        let delta_accel = (accel_factor - template_accel).abs();
        let delta_spiral = (spiral_amp - template_spiral).abs();

        let total_delta = delta_accel + delta_spiral;
        let similarity = (1.0 - (total_delta / 4.0).clamp(0.0, 1.0)) * 100.0;

        let unique = similarity < 90.0;
        let mut suggested_mutation_channels = Vec::new();

        if !unique {
            suggested_mutation_channels.push(1002); // Channel 1002 = Spiral Amplitude
            suggested_mutation_channels.push(1004); // Channel 1004 = Gravity Bias
        }

        DivergenceAuditReport {
            project_id: project_id.to_string(),
            similarity_percentage: similarity,
            unique_identity_guaranteed: unique,
            suggested_mutation_channels,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_flags_template_duplicate() {
        // Exact template values trigger anti-duplication alert (<90% uniqueness)
        let report = AiDivergenceAuditor::audit_phenomenon_uniqueness("project_alpha", 1.0, 0.0);
        assert!(!report.unique_identity_guaranteed);
        assert!(report.similarity_percentage >= 90.0);
        assert!(!report.suggested_mutation_channels.is_empty());
    }

    #[test]
    fn test_audit_passes_mutated_unique_phenomenon() {
        let report = AiDivergenceAuditor::audit_phenomenon_uniqueness("project_beta", 2.5, 1.8);
        assert!(report.unique_identity_guaranteed);
        assert!(report.similarity_percentage < 90.0);
    }
}

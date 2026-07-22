//! Law Mutation Engine — sovereign physics zones over Dynamic Physics DSL (**gc**).
//!
//! Zones bind a center/radius to compiled DSL opcodes. Entity tick applies
//! opcodes when inside the zone (fail-closed skip on invalid rule strings).

use crate::dynamic_physics_dsl::{DynamicPhysicsDsl, DslOpcode};

pub struct PhysicsZone {
    pub center: [f32; 3],
    pub radius: f32,
    pub custom_laws: Vec<DslOpcode>,
}

pub struct LawMutationEngine {
    pub active_zones: Vec<PhysicsZone>,
}

impl LawMutationEngine {
    pub fn new() -> Self {
        Self {
            active_zones: Vec::new(),
        }
    }

    /// Declare a zone from a DSL one-liner (uses real `parse_ai_rule`).
    /// Invalid / empty rules are fail-closed (no zone pushed).
    pub fn declare_sovereign_zone(&mut self, center: [f32; 3], radius: f32, rule_string: &str) {
        if !radius.is_finite() || radius <= 0.0 {
            return;
        }
        if let Some(opcode) = DynamicPhysicsDsl::parse_ai_rule(rule_string) {
            self.active_zones.push(PhysicsZone {
                center,
                radius,
                custom_laws: vec![opcode],
            });
        }
    }

    /// Hot-loop: if entity is inside a zone, apply DSL opcodes and return true
    /// so the caller can skip default gravity.
    #[inline(always)]
    pub fn mutate_entity_state(&self, pos: &mut [f32; 3], vel: &mut [f32; 3]) -> bool {
        let mut is_mutated = false;

        for zone in &self.active_zones {
            let dx = pos[0] - zone.center[0];
            let dy = pos[1] - zone.center[1];
            let dz = pos[2] - zone.center[2];
            let dist_sq = dx * dx + dy * dy + dz * dz;

            if dist_sq <= zone.radius * zone.radius {
                for rule in &zone.custom_laws {
                    DynamicPhysicsDsl::apply_opcode(rule, pos, vel);
                }
                is_mutated = true;
            }
        }

        is_mutated
    }
}

impl Default for LawMutationEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn invalid_rule_no_zone() {
        let mut eng = LawMutationEngine::new();
        eng.declare_sovereign_zone([0.0, 0.0, 0.0], 1.0, "not_valid");
        assert!(eng.active_zones.is_empty());
    }

    #[test]
    fn invert_gravity_inside_zone() {
        let mut eng = LawMutationEngine::new();
        eng.declare_sovereign_zone([0.0, 0.0, 0.0], 2.0, "invert_gravity");
        let mut pos = [0.5, 0.0, 0.0];
        let mut vel = [0.0, 0.0, 0.0];
        assert!(eng.mutate_entity_state(&mut pos, &mut vel));
        assert!((vel[1] - 19.6).abs() < 1e-5);
    }

    #[test]
    fn outside_zone_untouched() {
        let mut eng = LawMutationEngine::new();
        eng.declare_sovereign_zone([0.0, 0.0, 0.0], 1.0, "invert_gravity");
        let mut pos = [10.0, 0.0, 0.0];
        let mut vel = [0.0, 1.0, 0.0];
        assert!(!eng.mutate_entity_state(&mut pos, &mut vel));
        assert!((vel[1] - 1.0).abs() < 1e-6);
    }
}

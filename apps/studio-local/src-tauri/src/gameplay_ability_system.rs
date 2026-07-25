//! OMNI-PLAN — Data-Oriented Gameplay Ability System (GAS) Re-Export.
//! Modularized under `src/gas/` for clean maintainability (V36 Audit).

#[path = "gas/mod.rs"]
pub mod gas;
pub use gas::*;

#[cfg(test)]
mod tests {
    use super::*;

    fn make_world() -> GasWorld {
        let mut world = GasWorld::new(&CORE_ATTRIBUTE_NAMES);
        world.attributes.set_bounds(
            "Health",
            AttributeBounds {
                min: Some(0.0),
                max: Some(100.0),
            },
        );
        world
    }

    #[test]
    fn tag_registry_expands_ancestors_on_registration() {
        let mut registry = GameplayTagRegistry::new();
        let stun_id = registry.register("State.Debuff.Stun");
        let ancestors = registry.ancestors_of(stun_id);

        assert_eq!(registry.get_name(stun_id), "State.Debuff.Stun");
        assert_eq!(ancestors.len(), 3);
        assert_eq!(registry.get_name(ancestors[0]), "State");
        assert_eq!(registry.get_name(ancestors[1]), "State.Debuff");
        assert_eq!(registry.get_name(ancestors[2]), "State.Debuff.Stun");
    }

    #[test]
    fn hierarchical_tag_query_matches_descendant_tags() {
        let mut world = make_world();
        let player = world.create_entity(&[]);

        world.add_tag(player, "State.Debuff.Stun");

        assert!(world.has_tag(player, "State.Debuff.Stun"));
        assert!(world.has_tag(player, "State.Debuff"));
        assert!(world.has_tag(player, "State"));
        assert!(!world.has_tag(player, "State.Buff"));
    }

    #[test]
    fn instant_effect_mutates_base_value_directly() {
        let mut world = make_world();
        let player = world.create_entity(&[("Health", 50.0)]);

        let heal = GameplayEffectDefinition {
            id: "Heal".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Instant,
            duration_seconds: None,
            period_seconds: None,
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: 20.0,
            }],
            granted_tags: vec![],
            required_tags: vec![],
            blocked_tags: vec![],
            application_cue_tag: Some("Cue.Heal.Sparkle".to_string()),
            removal_cue_tag: None,
            periodic_cue_tag: None,
        };

        assert!(world.apply_gameplay_effect(player, heal, None));
        assert_eq!(world.current_value(player, "Health"), 70.0);

        let cues = world.drain_cue_queue();
        assert_eq!(cues.len(), 1);
        assert_eq!(cues[0].cue_tag, "Cue.Heal.Sparkle");
        assert_eq!(cues[0].event_type, GameplayCueEventType::Applied);
    }

    #[test]
    fn instant_effect_respects_attribute_bounds() {
        let mut world = make_world();
        let player = world.create_entity(&[("Health", 90.0)]);

        let overheal = GameplayEffectDefinition {
            id: "Overheal".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Instant,
            duration_seconds: None,
            period_seconds: None,
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: 50.0,
            }],
            granted_tags: vec![],
            required_tags: vec![],
            blocked_tags: vec![],
            application_cue_tag: None,
            removal_cue_tag: None,
            periodic_cue_tag: None,
        };

        world.apply_gameplay_effect(player, overheal, None);
        assert_eq!(world.current_value(player, "Health"), 100.0);
    }

    #[test]
    fn damage_over_time_ticks_down_and_expires_cleanly() {
        let mut world = make_world();
        let player = world.create_entity(&[("Health", 100.0)]);

        let burn = GameplayEffectDefinition {
            id: "Burn".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Duration,
            duration_seconds: Some(3.0),
            period_seconds: Some(1.0),
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: -5.0,
            }],
            granted_tags: vec!["State.Debuff.Burn".to_string()],
            required_tags: vec![],
            blocked_tags: vec![],
            application_cue_tag: Some("Cue.Fire.Ignite".to_string()),
            removal_cue_tag: Some("Cue.Fire.Extinguish".to_string()),
            periodic_cue_tag: Some("Cue.Fire.Tick".to_string()),
        };

        assert!(world.apply_gameplay_effect(player, burn, None));
        assert!(world.has_tag(player, "State.Debuff.Burn"));

        world.tick(1.0);
        assert_eq!(world.current_value(player, "Health"), 95.0);
        world.tick(1.0);
        assert_eq!(world.current_value(player, "Health"), 90.0);
        world.tick(1.0);
        assert_eq!(world.current_value(player, "Health"), 85.0);

        assert!(!world.has_tag(player, "State.Debuff.Burn"));
        assert_eq!(world.effects.active_count(), 0);

        world.tick(1.0);
        assert_eq!(world.current_value(player, "Health"), 85.0);

        let cues = world.drain_cue_queue();
        assert!(cues.iter().any(|c| c.cue_tag == "Cue.Fire.Ignite" && c.event_type == GameplayCueEventType::Applied));
        assert!(cues.iter().filter(|c| c.cue_tag == "Cue.Fire.Tick").count() == 3);
        assert!(cues.iter().any(|c| c.cue_tag == "Cue.Fire.Extinguish" && c.event_type == GameplayCueEventType::Removed));
    }

    #[test]
    fn standing_buff_layers_on_top_of_base_and_reverts_on_expiry() {
        let mut world = make_world();
        let player = world.create_entity(&[("MovementSpeed", 10.0)]);

        let haste = GameplayEffectDefinition {
            id: "Haste".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Duration,
            duration_seconds: Some(2.0),
            period_seconds: None,
            modifiers: vec![GameplayEffectModifier {
                attribute: "MovementSpeed".to_string(),
                operation: AttributeModifierOp::Multiply,
                magnitude: 1.5,
            }],
            granted_tags: vec!["State.Buff.Haste".to_string()],
            required_tags: vec![],
            blocked_tags: vec![],
            application_cue_tag: None,
            removal_cue_tag: None,
            periodic_cue_tag: None,
        };

        world.apply_gameplay_effect(player, haste, None);
        assert_eq!(world.current_value(player, "MovementSpeed"), 15.0);
        assert_eq!(world.attributes.base_value(player, world.attributes.attribute_index("MovementSpeed").unwrap()), 10.0);

        world.tick(2.5);
        assert_eq!(world.current_value(player, "MovementSpeed"), 10.0);
        assert!(!world.has_tag(player, "State.Buff.Haste"));
    }

    #[test]
    fn blocked_tags_reject_effect_application() {
        let mut world = make_world();
        let player = world.create_entity(&[("Health", 100.0)]);
        world.add_tag(player, "State.Debuff.FireImmune");

        let burn = GameplayEffectDefinition {
            id: "Burn".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Instant,
            duration_seconds: None,
            period_seconds: None,
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: -5.0,
            }],
            granted_tags: vec![],
            required_tags: vec![],
            blocked_tags: vec!["State.Debuff.FireImmune".to_string()],
            application_cue_tag: None,
            removal_cue_tag: None,
            periodic_cue_tag: None,
        };

        assert!(!world.apply_gameplay_effect(player, burn, None));
        assert_eq!(world.current_value(player, "Health"), 100.0);
    }

    #[test]
    fn batch_tick_scales_across_thousands_of_independent_effects() {
        let mut world = make_world();

        for _ in 0..5_000 {
            let entity = world.create_entity(&[("Health", 100.0)]);
            let poison = GameplayEffectDefinition {
                id: "Poison".to_string(),
                duration_policy: GameplayEffectDurationPolicy::Duration,
                duration_seconds: Some(10.0),
                period_seconds: Some(1.0),
                modifiers: vec![GameplayEffectModifier {
                    attribute: "Health".to_string(),
                    operation: AttributeModifierOp::Add,
                    magnitude: -1.0,
                }],
                granted_tags: vec![],
                required_tags: vec![],
                blocked_tags: vec![],
                application_cue_tag: None,
                removal_cue_tag: None,
                periodic_cue_tag: None,
            };
            world.apply_gameplay_effect(entity, poison, None);
        }

        assert_eq!(world.effects.active_count(), 5_000);
        world.tick(1.0);
        assert_eq!(world.current_value(0, "Health"), 99.0);
        assert_eq!(world.current_value(4_999, "Health"), 99.0);
    }
}

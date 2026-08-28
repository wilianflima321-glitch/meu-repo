//! GAS interrupt rules — outcome-based interrupt table (GF-GAS-002 / GF-NET-001
//! substrate, doctrine #72 P2). letter **gi**.
//!
//! Layering contract: `InterruptTable::try_interrupt` is read-only against the
//! world — it returns an `InterruptOutcome` and the caller (`GasSimState` in
//! `rollback.rs`) applies the effect removals and ability interrupts. This keeps
//! the interrupt table free of world mutation and trivially deterministic.

use super::abilities::AbilitySystemComponent;
use super::attributes::Entity;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InterruptTrigger {
    /// Entity took damage this tick.
    OnDamaged,
    /// A tag was just added to the entity.
    OnTagAdded(String),
    /// Another ability channel started on the entity.
    OnChannelUsed(Entity),
    /// A gameplay state transition occurred.
    OnStateChanged(String),
}

#[derive(Clone, Debug)]
pub struct InterruptRule {
    pub id: String,
    pub trigger: InterruptTrigger,
    /// `Some(id)` = only that ability; `None` = every active channel on entity.
    pub target_ability_id: Option<u32>,
    /// Effect ids to remove from the entity when this rule fires.
    pub removes_effect_ids: Vec<String>,
    pub cue_tag: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct InterruptOutcome {
    pub interrupted_ability_ids: Vec<u32>,
    pub effects_to_remove: Vec<String>,
    pub cue_tag: Option<String>,
}

#[derive(Clone, Default)]
pub struct InterruptTable {
    rules: Vec<InterruptRule>,
}

impl InterruptTable {
    pub fn new() -> Self {
        Self { rules: Vec::new() }
    }

    pub fn register(&mut self, rule: InterruptRule) {
        self.rules.push(rule);
    }

    pub fn rule_count(&self) -> usize {
        self.rules.len()
    }

    /// Evaluate every matching rule against the entity's active channels.
    /// Returns `None` (fail-closed) when no rule actually has a live target and
    /// no effect removal — i.e. a pure no-op must never be reported as fired.
    pub fn try_interrupt(
        &self,
        entity: Entity,
        trigger: &InterruptTrigger,
        abilities: &AbilitySystemComponent,
    ) -> Option<InterruptOutcome> {
        let mut outcome = InterruptOutcome::default();
        for rule in &self.rules {
            if rule.trigger != *trigger {
                continue;
            }
            let affected: Vec<u32> = match rule.target_ability_id {
                Some(id) => {
                    if abilities.is_active(entity, id) {
                        vec![id]
                    } else {
                        Vec::new()
                    }
                }
                None => abilities.active_ability_ids(entity),
            };
            if affected.is_empty() && rule.removes_effect_ids.is_empty() {
                continue;
            }
            for id in affected {
                if !outcome.interrupted_ability_ids.contains(&id) {
                    outcome.interrupted_ability_ids.push(id);
                }
            }
            for eff in &rule.removes_effect_ids {
                if !outcome.effects_to_remove.contains(eff) {
                    outcome.effects_to_remove.push(eff.clone());
                }
            }
            if outcome.cue_tag.is_none() {
                outcome.cue_tag = rule.cue_tag.clone();
            }
        }
        if outcome.interrupted_ability_ids.is_empty() && outcome.effects_to_remove.is_empty() {
            return None;
        }
        Some(outcome)
    }
}

#[cfg(test)]
mod tests {
    use super::super::abilities::{ActivationResult, GameplayAbility};
    use super::super::tags::{GameplayTagRegistry, TagSetTable};
    use super::*;

    fn active_heal_component() -> AbilitySystemComponent {
        let mut asc = AbilitySystemComponent::new();
        let mut heal = GameplayAbility::new(2, "HealChannel");
        heal.priority = 30;
        asc.register_ability(heal);
        let mut strike = GameplayAbility::new(1, "MeleeStrike");
        strike.priority = 10;
        strike.cooldown_ms = 200.0;
        strike.duration_ms = Some(100.0);
        asc.register_ability(strike);
        asc
    }

    fn damage_table() -> InterruptTable {
        let mut table = InterruptTable::new();
        table.register(InterruptRule {
            id: "dmg_interrupt".to_string(),
            trigger: InterruptTrigger::OnDamaged,
            target_ability_id: None,
            removes_effect_ids: vec!["Buff.IronSkin".to_string()],
            cue_tag: Some("Cue.Ability.Interrupted".to_string()),
        });
        table
    }

    #[test]
    fn damage_trigger_interrupts_active_channel() {
        let mut asc = active_heal_component();
        let table = damage_table();
        let registry = GameplayTagRegistry::new();
        let tags = TagSetTable::new();
        let e: Entity = 0;
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        let outcome = table
            .try_interrupt(e, &InterruptTrigger::OnDamaged, &asc)
            .expect("interrupt fired");
        assert_eq!(outcome.interrupted_ability_ids, vec![2]);
        assert_eq!(outcome.effects_to_remove, vec!["Buff.IronSkin".to_string()]);
        assert_eq!(outcome.cue_tag.as_deref(), Some("Cue.Ability.Interrupted"));
    }

    #[test]
    fn no_active_target_fails_closed() {
        let asc = AbilitySystemComponent::new();
        // A pure target-interrupt rule (no passive effect removal): with no
        // live channel and nothing to remove, `try_interrupt` must report None
        // (fail-closed). `damage_table()` intentionally also removes
        // Buff.IronSkin, which legitimately fires even without a live target.
        let mut table = InterruptTable::new();
        table.register(InterruptRule {
            id: "pure_interrupt".to_string(),
            trigger: InterruptTrigger::OnDamaged,
            target_ability_id: None,
            removes_effect_ids: Vec::new(),
            cue_tag: None,
        });
        assert!(table
            .try_interrupt(0, &InterruptTrigger::OnDamaged, &asc)
            .is_none());
    }

    #[test]
    fn targeted_rule_ignores_other_channels() {
        let mut asc = active_heal_component();
        let registry = GameplayTagRegistry::new();
        let tags = TagSetTable::new();
        let e: Entity = 0;
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        let mut table = InterruptTable::new();
        table.register(InterruptRule {
            id: "target_strike".to_string(),
            trigger: InterruptTrigger::OnDamaged,
            target_ability_id: Some(1),
            removes_effect_ids: Vec::new(),
            cue_tag: None,
        });
        // Strike (1) is not active; heal (2) is not the target -> no-op.
        assert!(table
            .try_interrupt(e, &InterruptTrigger::OnDamaged, &asc)
            .is_none());
    }

    #[test]
    fn untargeted_rule_interrupts_all_channels_sorted() {
        let mut asc = active_heal_component();
        let table = damage_table();
        let registry = GameplayTagRegistry::new();
        let tags = TagSetTable::new();
        let e: Entity = 0;
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        let outcome = table
            .try_interrupt(e, &InterruptTrigger::OnDamaged, &asc)
            .expect("interrupt fired");
        assert_eq!(outcome.interrupted_ability_ids, vec![1, 2]);
    }

    #[test]
    fn damage_interrupt_applies_ability_interrupt() {
        let mut asc = active_heal_component();
        let table = damage_table();
        let registry = GameplayTagRegistry::new();
        let tags = TagSetTable::new();
        let e: Entity = 0;
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        let outcome = table
            .try_interrupt(e, &InterruptTrigger::OnDamaged, &asc)
            .expect("interrupt fired");
        for id in &outcome.interrupted_ability_ids {
            assert!(asc.interrupt(e, *id, &mut cues));
        }
        assert!(!asc.is_active(e, 2));
        assert_eq!(asc.channel_count(), 0);
    }
}

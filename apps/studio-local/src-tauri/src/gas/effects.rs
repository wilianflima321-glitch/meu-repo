//! GameplayEffect definitions, cue scaffold, and GameplayEffectPool for GAS.

use std::collections::HashMap;
use rayon::prelude::*;

use super::attributes::{AttributeModifierOp, AttributeTable, Entity};
use super::tags::{GameplayTagRegistry, TagSetTable};

#[derive(Clone, Debug)]
pub struct GameplayEffectModifier {
    pub attribute: String,
    pub operation: AttributeModifierOp,
    pub magnitude: f32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameplayEffectDurationPolicy {
    Instant,
    Duration,
    Infinite,
}

#[derive(Clone, Debug)]
pub struct GameplayEffectDefinition {
    pub id: String,
    pub duration_policy: GameplayEffectDurationPolicy,
    pub duration_seconds: Option<f32>,
    pub period_seconds: Option<f32>,
    pub modifiers: Vec<GameplayEffectModifier>,
    pub granted_tags: Vec<String>,
    pub required_tags: Vec<String>,
    pub blocked_tags: Vec<String>,
    pub application_cue_tag: Option<String>,
    pub removal_cue_tag: Option<String>,
    pub periodic_cue_tag: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameplayCueEventType {
    Applied,
    Removed,
    Periodic,
}

#[derive(Clone, Debug)]
pub struct GameplayCueEvent {
    pub cue_tag: String,
    pub event_type: GameplayCueEventType,
    pub target: Entity,
    pub source: Option<Entity>,
    pub effect_id: String,
}

pub struct GameplayEffectPool {
    entity: Vec<Entity>,
    source: Vec<Option<Entity>>,
    remaining_ms: Vec<f64>,
    next_period_ms: Vec<f64>,
    alive: Vec<bool>,
    definitions: Vec<Option<GameplayEffectDefinition>>,
    free_indices: Vec<usize>,
    entity_to_standing_rows: HashMap<Entity, Vec<usize>>,
}

impl GameplayEffectPool {
    pub fn new() -> Self {
        Self {
            entity: Vec::new(),
            source: Vec::new(),
            remaining_ms: Vec::new(),
            next_period_ms: Vec::new(),
            alive: Vec::new(),
            definitions: Vec::new(),
            free_indices: Vec::new(),
            entity_to_standing_rows: HashMap::new(),
        }
    }

    pub fn active_count(&self) -> usize {
        self.alive.iter().filter(|&&is_alive| is_alive).count()
    }

    fn allocate_row(&mut self) -> usize {
        if let Some(index) = self.free_indices.pop() {
            return index;
        }
        let index = self.entity.len();
        self.entity.push(0);
        self.source.push(None);
        self.remaining_ms.push(0.0);
        self.next_period_ms.push(f64::INFINITY);
        self.alive.push(false);
        self.definitions.push(None);
        index
    }

    fn apply_modifier_pulse(&self, attributes: &mut AttributeTable, entity: Entity, modifier: &GameplayEffectModifier) {
        if let Some(index) = attributes.attribute_index(&modifier.attribute) {
            match modifier.operation {
                AttributeModifierOp::Add => attributes.add_to_base(entity, index, modifier.magnitude),
                AttributeModifierOp::Multiply => attributes.multiply_base(entity, index, modifier.magnitude),
                AttributeModifierOp::Override => attributes.override_base(entity, index, modifier.magnitude),
            }
        }
    }

    fn recompute_attribute(&self, attributes: &mut AttributeTable, entity: Entity, attribute: &str) {
        let attribute_index = match attributes.attribute_index(attribute) {
            Some(index) => index,
            None => return,
        };

        let mut additive = 0.0f32;
        let mut multiplicative = 1.0f32;
        let mut override_value: Option<f32> = None;

        if let Some(rows) = self.entity_to_standing_rows.get(&entity) {
            for &row in rows {
                if !self.alive[row] {
                    continue;
                }
                if let Some(definition) = &self.definitions[row] {
                    for modifier in &definition.modifiers {
                        if modifier.attribute != attribute {
                            continue;
                        }
                        match modifier.operation {
                            AttributeModifierOp::Add => additive += modifier.magnitude,
                            AttributeModifierOp::Multiply => multiplicative *= modifier.magnitude,
                            AttributeModifierOp::Override => override_value = Some(modifier.magnitude),
                        }
                    }
                }
            }
        }

        let base = attributes.base_value(entity, attribute_index);
        let value = override_value.unwrap_or((base + additive) * multiplicative);
        attributes.set_current(entity, attribute_index, value);
    }

    fn recompute_affected_attributes(&self, attributes: &mut AttributeTable, entity: Entity, modifiers: &[GameplayEffectModifier]) {
        let mut seen: Vec<&str> = Vec::new();
        for modifier in modifiers {
            let attribute = modifier.attribute.as_str();
            if seen.contains(&attribute) {
                continue;
            }
            seen.push(attribute);
            self.recompute_attribute(attributes, entity, attribute);
        }
    }

    fn push_cue(
        cue_queue: &mut Vec<GameplayCueEvent>,
        cue_tag: &Option<String>,
        event_type: GameplayCueEventType,
        target: Entity,
        source: Option<Entity>,
        effect_id: &str,
    ) {
        if let Some(tag) = cue_tag {
            cue_queue.push(GameplayCueEvent {
                cue_tag: tag.clone(),
                event_type,
                target,
                source,
                effect_id: effect_id.to_string(),
            });
        }
    }

    #[allow(clippy::too_many_arguments)]
    pub fn apply(
        &mut self,
        attributes: &mut AttributeTable,
        tags: &mut TagSetTable,
        tag_registry: &mut GameplayTagRegistry,
        cue_queue: &mut Vec<GameplayCueEvent>,
        target: Entity,
        definition: GameplayEffectDefinition,
        source: Option<Entity>,
    ) -> bool {
        if !definition.required_tags.is_empty() {
            let required: Vec<&str> = definition.required_tags.iter().map(String::as_str).collect();
            if !tags.has_all(target, &required, tag_registry) {
                return false;
            }
        }
        if !definition.blocked_tags.is_empty() {
            let blocked: Vec<&str> = definition.blocked_tags.iter().map(String::as_str).collect();
            if tags.has_any(target, &blocked, tag_registry) {
                return false;
            }
        }

        if definition.duration_policy == GameplayEffectDurationPolicy::Instant {
            for modifier in &definition.modifiers {
                self.apply_modifier_pulse(attributes, target, modifier);
                self.recompute_attribute(attributes, target, &modifier.attribute);
            }
            for tag in &definition.granted_tags {
                tags.add_tag(target, tag, tag_registry);
            }
            Self::push_cue(cue_queue, &definition.application_cue_tag, GameplayCueEventType::Applied, target, source, &definition.id);
            return true;
        }

        let row = self.allocate_row();
        self.entity[row] = target;
        self.source[row] = source;
        self.remaining_ms[row] = definition.duration_seconds.unwrap_or(0.0) as f64 * 1000.0;
        self.next_period_ms[row] = definition
            .period_seconds
            .map(|period| period as f64 * 1000.0)
            .unwrap_or(f64::INFINITY);
        self.alive[row] = true;

        let is_periodic = definition.period_seconds.is_some();
        let granted_tags = definition.granted_tags.clone();
        let modifiers_for_recompute = definition.modifiers.clone();
        let application_cue_tag = definition.application_cue_tag.clone();
        let effect_id = definition.id.clone();
        self.definitions[row] = Some(definition);

        if !is_periodic {
            self.entity_to_standing_rows.entry(target).or_insert_with(Vec::new).push(row);
            self.recompute_affected_attributes(attributes, target, &modifiers_for_recompute);
        }

        for tag in &granted_tags {
            tags.add_tag(target, tag, tag_registry);
        }

        Self::push_cue(cue_queue, &application_cue_tag, GameplayCueEventType::Applied, target, source, &effect_id);
        true
    }

    fn expire_row(
        &mut self,
        attributes: &mut AttributeTable,
        tags: &mut TagSetTable,
        tag_registry: &GameplayTagRegistry,
        cue_queue: &mut Vec<GameplayCueEvent>,
        row: usize,
    ) {
        let entity = self.entity[row];
        let source = self.source[row];
        let definition = match self.definitions[row].take() {
            Some(definition) => definition,
            None => return,
        };
        self.alive[row] = false;
        self.free_indices.push(row);

        if let Some(rows) = self.entity_to_standing_rows.get_mut(&entity) {
            rows.retain(|&r| r != row);
            if rows.is_empty() {
                self.entity_to_standing_rows.remove(&entity);
            }
        }

        for tag in &definition.granted_tags {
            tags.remove_tag(entity, tag, tag_registry);
        }

        if definition.period_seconds.is_none() {
            self.recompute_affected_attributes(attributes, entity, &definition.modifiers);
        }

        Self::push_cue(cue_queue, &definition.removal_cue_tag, GameplayCueEventType::Removed, entity, source, &definition.id);
    }

    pub fn remove(
        &mut self,
        attributes: &mut AttributeTable,
        tags: &mut TagSetTable,
        tag_registry: &GameplayTagRegistry,
        cue_queue: &mut Vec<GameplayCueEvent>,
        target: Entity,
        effect_id: &str,
    ) -> bool {
        for row in 0..self.entity.len() {
            if !self.alive[row] || self.entity[row] != target {
                continue;
            }
            let matches = self.definitions[row].as_ref().map(|d| d.id == effect_id).unwrap_or(false);
            if matches {
                self.expire_row(attributes, tags, tag_registry, cue_queue, row);
                return true;
            }
        }
        false
    }

    pub fn tick(
        &mut self,
        attributes: &mut AttributeTable,
        tags: &mut TagSetTable,
        tag_registry: &mut GameplayTagRegistry,
        cue_queue: &mut Vec<GameplayCueEvent>,
        dt_seconds: f32,
    ) {
        let dt_ms = dt_seconds as f64 * 1000.0;
        if dt_ms <= 0.0 {
            return;
        }

        let alive = &self.alive;
        let definitions = &self.definitions;

        self.remaining_ms
            .par_iter_mut()
            .zip(self.next_period_ms.par_iter_mut())
            .enumerate()
            .for_each(|(row, (remaining, next_period))| {
                if !alive[row] {
                    return;
                }
                if let Some(definition) = &definitions[row] {
                    if definition.duration_policy == GameplayEffectDurationPolicy::Duration {
                        *remaining -= dt_ms;
                    }
                    if definition.period_seconds.is_some() {
                        *next_period -= dt_ms;
                    }
                }
            });

        for row in 0..self.entity.len() {
            if !self.alive[row] {
                continue;
            }

            let period_seconds = self.definitions[row].as_ref().and_then(|d| d.period_seconds);
            if let Some(period_seconds) = period_seconds {
                if self.next_period_ms[row] <= 0.0 {
                    self.next_period_ms[row] += period_seconds as f64 * 1000.0;
                    let entity = self.entity[row];
                    let source = self.source[row];
                    let modifiers = self.definitions[row].as_ref().map(|d| d.modifiers.clone()).unwrap_or_default();
                    let periodic_cue_tag = self.definitions[row].as_ref().and_then(|d| d.periodic_cue_tag.clone());
                    let effect_id = self.definitions[row].as_ref().map(|d| d.id.clone()).unwrap_or_default();

                    for modifier in &modifiers {
                        self.apply_modifier_pulse(attributes, entity, modifier);
                        self.recompute_attribute(attributes, entity, &modifier.attribute);
                    }
                    Self::push_cue(cue_queue, &periodic_cue_tag, GameplayCueEventType::Periodic, entity, source, &effect_id);
                }
            }

            let is_duration_expired = self.definitions[row]
                .as_ref()
                .map(|d| d.duration_policy == GameplayEffectDurationPolicy::Duration && self.remaining_ms[row] <= 0.0)
                .unwrap_or(false);
            if is_duration_expired {
                self.expire_row(attributes, tags, tag_registry, cue_queue, row);
            }
        }
    }
}

impl Default for GameplayEffectPool {
    fn default() -> Self {
        Self::new()
    }
}

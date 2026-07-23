//! GasWorld orchestrator facade for GAS.

use super::attributes::{AttributeTable, Entity};
use super::effects::{GameplayCueEvent, GameplayEffectDefinition, GameplayEffectPool};
use super::tags::{GameplayTagRegistry, TagSetTable};

pub struct GasWorld {
    next_entity: Entity,
    pub attributes: AttributeTable,
    pub tag_registry: GameplayTagRegistry,
    pub tags: TagSetTable,
    pub effects: GameplayEffectPool,
    pub cue_queue: Vec<GameplayCueEvent>,
}

impl GasWorld {
    pub fn new(attribute_names: &[&str]) -> Self {
        Self {
            next_entity: 0,
            attributes: AttributeTable::new(attribute_names),
            tag_registry: GameplayTagRegistry::new(),
            tags: TagSetTable::new(),
            effects: GameplayEffectPool::new(),
            cue_queue: Vec::new(),
        }
    }

    pub fn create_entity(&mut self, initial_values: &[(&str, f32)]) -> Entity {
        let entity = self.next_entity;
        self.next_entity += 1;
        self.attributes.init_entity(entity, initial_values);
        entity
    }

    pub fn add_tag(&mut self, entity: Entity, tag: &str) {
        self.tags.add_tag(entity, tag, &mut self.tag_registry);
    }

    pub fn has_tag(&self, entity: Entity, tag: &str) -> bool {
        self.tags.has_tag(entity, tag, &self.tag_registry)
    }

    pub fn apply_gameplay_effect(&mut self, target: Entity, definition: GameplayEffectDefinition, source: Option<Entity>) -> bool {
        self.effects.apply(
            &mut self.attributes,
            &mut self.tags,
            &mut self.tag_registry,
            &mut self.cue_queue,
            target,
            definition,
            source,
        )
    }

    pub fn remove_gameplay_effect(&mut self, target: Entity, effect_id: &str) -> bool {
        self.effects.remove(
            &mut self.attributes,
            &mut self.tags,
            &self.tag_registry,
            &mut self.cue_queue,
            target,
            effect_id,
        )
    }

    pub fn tick(&mut self, dt_seconds: f32) {
        self.effects.tick(
            &mut self.attributes,
            &mut self.tags,
            &mut self.tag_registry,
            &mut self.cue_queue,
            dt_seconds,
        );
    }

    pub fn current_value(&self, entity: Entity, attribute: &str) -> f32 {
        match self.attributes.attribute_index(attribute) {
            Some(index) => self.attributes.current_value(entity, index),
            None => 0.0,
        }
    }

    pub fn drain_cue_queue(&mut self) -> Vec<GameplayCueEvent> {
        std::mem::take(&mut self.cue_queue)
    }
}

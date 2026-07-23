//! AttributeSet SoA storage for Data-Oriented Gameplay Ability System (GAS).

use std::collections::HashMap;

pub type Entity = u32;
pub type AttributeId = usize;

pub const CORE_ATTRIBUTE_NAMES: [&str; 4] = ["Health", "Mana", "Stamina", "MovementSpeed"];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AttributeModifierOp {
    Add,
    Multiply,
    Override,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct AttributeBounds {
    pub min: Option<f32>,
    pub max: Option<f32>,
}

/// Flat `Vec<f32>`-backed attribute storage.
pub struct AttributeTable {
    attribute_count: usize,
    name_to_index: HashMap<String, AttributeId>,
    bounds: Vec<AttributeBounds>,
    base: Vec<f32>,
    current: Vec<f32>,
}

impl AttributeTable {
    pub fn new(attribute_names: &[&str]) -> Self {
        let mut name_to_index = HashMap::new();
        for (index, name) in attribute_names.iter().enumerate() {
            name_to_index.insert((*name).to_string(), index);
        }
        let attribute_count = attribute_names.len();
        Self {
            attribute_count,
            name_to_index,
            bounds: vec![AttributeBounds::default(); attribute_count],
            base: Vec::new(),
            current: Vec::new(),
        }
    }

    pub fn attribute_index(&self, attribute: &str) -> Option<AttributeId> {
        self.name_to_index.get(attribute).copied()
    }

    pub fn set_bounds(&mut self, attribute: &str, bounds: AttributeBounds) {
        if let Some(&index) = self.name_to_index.get(attribute) {
            self.bounds[index] = bounds;
        }
    }

    fn ensure_capacity(&mut self, entity: Entity) {
        let required = (entity as usize + 1) * self.attribute_count;
        if self.base.len() < required {
            self.base.resize(required, 0.0);
            self.current.resize(required, 0.0);
        }
    }

    fn slot(&self, entity: Entity, attribute: AttributeId) -> usize {
        entity as usize * self.attribute_count + attribute
    }

    fn clamp(&self, attribute: AttributeId, value: f32) -> f32 {
        let bounds = self.bounds[attribute];
        let mut result = value;
        if let Some(min) = bounds.min {
            result = result.max(min);
        }
        if let Some(max) = bounds.max {
            result = result.min(max);
        }
        result
    }

    pub fn init_entity(&mut self, entity: Entity, initial_values: &[(&str, f32)]) {
        self.ensure_capacity(entity);
        for &(name, value) in initial_values {
            if let Some(index) = self.attribute_index(name) {
                let clamped = self.clamp(index, value);
                let slot = self.slot(entity, index);
                self.base[slot] = clamped;
                self.current[slot] = clamped;
            }
        }
    }

    pub fn base_value(&self, entity: Entity, attribute: AttributeId) -> f32 {
        self.base.get(self.slot(entity, attribute)).copied().unwrap_or(0.0)
    }

    pub fn current_value(&self, entity: Entity, attribute: AttributeId) -> f32 {
        self.current.get(self.slot(entity, attribute)).copied().unwrap_or(0.0)
    }

    pub fn add_to_base(&mut self, entity: Entity, attribute: AttributeId, delta: f32) {
        self.ensure_capacity(entity);
        let slot = self.slot(entity, attribute);
        self.base[slot] = self.clamp(attribute, self.base[slot] + delta);
    }

    pub fn multiply_base(&mut self, entity: Entity, attribute: AttributeId, factor: f32) {
        self.ensure_capacity(entity);
        let slot = self.slot(entity, attribute);
        self.base[slot] = self.clamp(attribute, self.base[slot] * factor);
    }

    pub fn override_base(&mut self, entity: Entity, attribute: AttributeId, value: f32) {
        self.ensure_capacity(entity);
        let slot = self.slot(entity, attribute);
        self.base[slot] = self.clamp(attribute, value);
    }

    pub fn set_current(&mut self, entity: Entity, attribute: AttributeId, value: f32) {
        self.ensure_capacity(entity);
        let slot = self.slot(entity, attribute);
        self.current[slot] = self.clamp(attribute, value);
    }
}

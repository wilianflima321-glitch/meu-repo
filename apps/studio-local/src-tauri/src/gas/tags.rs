//! GameplayTag interning and RoaringBitmap tag sets for GAS.
//! Completely removes the previous 128-tag limit.

use std::collections::HashMap;
use roaring::RoaringBitmap;

pub use super::attributes::Entity;
pub type TagId = u32;

pub struct GameplayTagRegistry {
    name_to_id: HashMap<String, TagId>,
    id_to_name: Vec<String>,
    ancestors_of: Vec<Vec<TagId>>,
}

impl GameplayTagRegistry {
    pub fn new() -> Self {
        Self {
            name_to_id: HashMap::new(),
            id_to_name: Vec::new(),
            ancestors_of: Vec::new(),
        }
    }

    pub fn register(&mut self, name: &str) -> TagId {
        if let Some(&id) = self.name_to_id.get(name) {
            return id;
        }

        let mut ancestors: Vec<TagId> = Vec::new();
        let mut prefix = String::new();
        for segment in name.split('.') {
            if prefix.is_empty() {
                prefix.push_str(segment);
            } else {
                prefix.push('.');
                prefix.push_str(segment);
            }

            if !self.name_to_id.contains_key(&prefix) {
                let id = self.id_to_name.len() as TagId;
                self.name_to_id.insert(prefix.clone(), id);
                self.id_to_name.push(prefix.clone());
                let mut own_ancestors = ancestors.clone();
                own_ancestors.push(id);
                self.ancestors_of.push(own_ancestors);
            }

            ancestors.push(*self.name_to_id.get(&prefix).expect("prefix was just registered above"));
        }

        *self.name_to_id.get(name).expect("full tag name was registered by the loop above")
    }

    pub fn get_id(&self, name: &str) -> Option<TagId> {
        self.name_to_id.get(name).copied()
    }

    pub fn get_name(&self, id: TagId) -> &str {
        self.id_to_name.get(id as usize).map(|s| s.as_str()).unwrap_or("")
    }

    pub fn ancestors_of(&self, id: TagId) -> &[TagId] {
        self.ancestors_of.get(id as usize).map(|v| v.as_slice()).unwrap_or(&[])
    }
}

impl Default for GameplayTagRegistry {
    fn default() -> Self {
        Self::new()
    }
}

pub struct TagSetTable {
    bitmaps: HashMap<Entity, RoaringBitmap>,
    explicit_tags: HashMap<Entity, Vec<TagId>>,
}

impl TagSetTable {
    pub fn new() -> Self {
        Self {
            bitmaps: HashMap::new(),
            explicit_tags: HashMap::new(),
        }
    }

    fn recompute(&mut self, entity: Entity, registry: &GameplayTagRegistry) {
        let mut bitmap = RoaringBitmap::new();
        if let Some(explicit) = self.explicit_tags.get(&entity) {
            for &tag_id in explicit {
                for &ancestor_id in registry.ancestors_of(tag_id) {
                    bitmap.insert(ancestor_id);
                }
            }
        }
        self.bitmaps.insert(entity, bitmap);
    }

    pub fn add_tag(&mut self, entity: Entity, tag_name: &str, registry: &mut GameplayTagRegistry) {
        let id = registry.register(tag_name);
        let entry = self.explicit_tags.entry(entity).or_default();
        if !entry.contains(&id) {
            entry.push(id);
        }
        self.recompute(entity, registry);
    }

    pub fn remove_tag(&mut self, entity: Entity, tag_name: &str, registry: &GameplayTagRegistry) {
        if let Some(id) = registry.get_id(tag_name) {
            if let Some(entry) = self.explicit_tags.get_mut(&entity) {
                entry.retain(|&existing| existing != id);
            }
            self.recompute(entity, registry);
        }
    }

    pub fn has_tag(&self, entity: Entity, tag_name: &str, registry: &GameplayTagRegistry) -> bool {
        let id = match registry.get_id(tag_name) {
            Some(id) => id,
            None => return false,
        };
        self.bitmaps
            .get(&entity)
            .map(|b| b.contains(id))
            .unwrap_or(false)
    }

    pub fn has_any(&self, entity: Entity, tag_names: &[&str], registry: &GameplayTagRegistry) -> bool {
        tag_names.iter().any(|name| self.has_tag(entity, name, registry))
    }

    pub fn has_all(&self, entity: Entity, tag_names: &[&str], registry: &GameplayTagRegistry) -> bool {
        tag_names.iter().all(|name| self.has_tag(entity, name, registry))
    }
}

impl Default for TagSetTable {
    fn default() -> Self {
        Self::new()
    }
}

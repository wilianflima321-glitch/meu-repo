//! GameplayTag interning and TagSetTable bitsets for GAS.

use std::collections::HashMap;

pub use super::attributes::Entity;
pub type TagId = u32;

pub const WORDS_PER_TAG_SET: usize = 4;
pub const MAX_TAGS_PER_SET: usize = WORDS_PER_TAG_SET * 32;

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
                assert!(
                    self.id_to_name.len() < MAX_TAGS_PER_SET,
                    "GameplayTagRegistry exceeded MAX_TAGS_PER_SET ({}) while registering \"{}\"",
                    MAX_TAGS_PER_SET,
                    name
                );
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

fn bit_location(id: TagId) -> (usize, u32) {
    ((id >> 5) as usize, id & 31)
}

pub struct TagSetTable {
    words: Vec<[u32; WORDS_PER_TAG_SET]>,
    explicit_tags: HashMap<Entity, Vec<TagId>>,
}

impl TagSetTable {
    pub fn new() -> Self {
        Self {
            words: Vec::new(),
            explicit_tags: HashMap::new(),
        }
    }

    fn ensure_capacity(&mut self, entity: Entity) {
        let required = entity as usize + 1;
        if self.words.len() < required {
            self.words.resize(required, [0u32; WORDS_PER_TAG_SET]);
        }
    }

    fn recompute(&mut self, entity: Entity, registry: &GameplayTagRegistry) {
        self.ensure_capacity(entity);
        let mut words = [0u32; WORDS_PER_TAG_SET];
        if let Some(explicit) = self.explicit_tags.get(&entity) {
            for &tag_id in explicit {
                for &ancestor_id in registry.ancestors_of(tag_id) {
                    let (word, bit) = bit_location(ancestor_id);
                    words[word] |= 1u32 << bit;
                }
            }
        }
        self.words[entity as usize] = words;
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
        let (word, bit) = bit_location(id);
        self.words
            .get(entity as usize)
            .map(|w| (w[word] >> bit) & 1 == 1)
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

//! OMNI-PLAN — Fase 1.4, Data-Oriented Gameplay Ability System (GAS).
//!
//! Rust/ECS twin of `cloud-web-app/web/lib/gas/*` — see that module's
//! `index.ts` doc comment for the full rationale of building a *second*,
//! data-oriented GAS alongside the legacy per-entity OOP one
//! (`lib/gameplay-ability-system.ts`). This file mirrors the exact same
//! math semantics (Add · Multiply · Override modifiers; Instant · Duration ·
//! Infinite policies; Period for DOT/HOT) and the exact same storage
//! strategy (flat parallel arrays instead of one heap object + several
//! `HashMap`s per entity), just in Rust instead of TypeScript, per the
//! Director's brief: "Use o rayon no physics_kernel.rs (Desktop) para
//! computar efeitos em milhares de entidades (DOTS/SoA)."
//!
//! DETERMINISM NOTE (per the Director's "não escreva mais nenhum código
//! Rust no escuro" directive): this file was authored without a working
//! `cargo`/`rustc` toolchain in this environment (see
//! `apps/studio-local/Dockerfile.rust-builder`, built specifically so this
//! kind of change can be validated with `docker build -f
//! Dockerfile.rust-builder .` before merge). Every non-trivial borrow
//! pattern used here (disjoint-field mutable borrows on `GasWorld` and
//! `GameplayEffectPool`, `rayon::par_iter_mut` zipped over two `Vec`s,
//! `Vec<Option<T>>::take()` via `IndexMut`) is a standard, well-documented
//! Rust idiom already used elsewhere in this crate (see `ecs_parallel.rs`
//! for the same `par_iter_mut().zip(...)` shape) — this module does not
//! introduce any technique this crate hasn't already compiled successfully
//! once. `cargo check` against the Dockerfile above is still the required
//! gate before this is considered `NativeKernelState::Available` — see
//! `native_kernel.rs`'s entry for this capability.
//!
//! HONEST SCOPE: no Tauri `#[tauri::command]` IPC surface is wired to this
//! module yet (unlike `physics_kernel.rs`/`physics_commands.rs`) — this is
//! a library-only module today, exercised by its own unit tests below and
//! declared `pub mod` in `lib.rs`. Wiring it into the headless dedicated
//! server binary `packages/infra/k8s/agones/fleet.yaml` expects, or into a
//! Tauri command for the desktop editor's Play-in-Editor mode, is the
//! tracked next step.

use std::collections::HashMap;

use rayon::prelude::*;

pub type Entity = u32;
pub type AttributeId = usize;
pub type TagId = u32;

/// 4 x u32 = 128 interned tags per world — raise if a game's tag vocabulary
/// is larger. Mirrors `lib/gas/tag-registry.ts`'s `WORDS_PER_TAG_SET`.
pub const WORDS_PER_TAG_SET: usize = 4;
pub const MAX_TAGS_PER_SET: usize = WORDS_PER_TAG_SET * 32;

/// The Director's brief's own named base attributes — a game may pass any
/// other attribute name list to `GasWorld::new` (e.g. "EngineTemperature").
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

// ============================================================================
// ATTRIBUTE SET — SoA storage (base_*/current_* packed per entity)
// ============================================================================

/// Flat `Vec<f32>`-backed attribute storage: `base`/`current` values for
/// every (entity, attribute) pair live row-major by entity index, so
/// iterating "every entity's Health" is one strided pass, never a per-entity
/// heap allocation or `HashMap` walk — the Rust counterpart of
/// `lib/gas/attribute-set.ts`'s per-archetype component buffer.
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

// ============================================================================
// GAMEPLAY TAG — hierarchical interning + ECS bitset storage
// ============================================================================

/// Interns hierarchical tag strings ("State.Debuff.Stun") into stable
/// integer ids, auto-registering every ancestor level so granting the leaf
/// tag also implies its ancestors for matching — Rust port of
/// `lib/gas/tag-registry.ts#GameplayTagRegistry`; see that file's doc
/// comment for the exact Unreal-`FGameplayTag`-accurate semantics.
pub struct GameplayTagRegistry {
    name_to_id: HashMap<String, TagId>,
    id_to_name: Vec<String>,
    /// `ancestors_of[id]` includes `id` itself.
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

/// Per-entity tag membership as a fixed-size bitset (`[u32; WORDS_PER_TAG_SET]`
/// per entity, SoA-packed in one `Vec`) for O(1) `has_tag` queries, backed by
/// a small `explicit_tags` side table used only to recompute the bitset
/// correctly on add/remove when multiple sources grant overlapping ancestor
/// tags — see `lib/gas/tag-registry.ts#TagSetIndex`'s doc comment for why
/// this two-tier design (not a single ref-counted bitset) is necessary.
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
        let entry = self.explicit_tags.entry(entity).or_insert_with(Vec::new);
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

// ============================================================================
// GAMEPLAY EFFECT — definitions + GameplayCue event contract
// ============================================================================

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
    /// Required when `duration_policy == Duration`.
    pub duration_seconds: Option<f32>,
    /// When set, `modifiers` are re-applied as an instant BaseValue pulse
    /// every `period_seconds` instead of acting as a standing modifier —
    /// the Damage/Heal-Over-Time case.
    pub period_seconds: Option<f32>,
    pub modifiers: Vec<GameplayEffectModifier>,
    pub granted_tags: Vec<String>,
    pub required_tags: Vec<String>,
    pub blocked_tags: Vec<String>,
    /// GameplayCue scaffold (brief item D) — see `GameplayCueEvent` below.
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

/// GameplayCue scaffold: a plain data record pushed onto `GasWorld::cue_queue`
/// for a host (a headless dedicated server, or a local play-in-editor loop)
/// to drain and forward to whatever actually renders particles/audio — this
/// module makes no assumption about *how* that happens, matching
/// `lib/gas/cue.ts`'s "does not bind to any renderer" honest-scope note.
#[derive(Clone, Debug)]
pub struct GameplayCueEvent {
    pub cue_tag: String,
    pub event_type: GameplayCueEventType,
    pub target: Entity,
    pub source: Option<Entity>,
    pub effect_id: String,
}

// ============================================================================
// GAMEPLAY EFFECT POOL — hybrid-SoA batch-processing engine
// ============================================================================

/// Every active (duration/infinite) effect instance lives as one row across
/// flat parallel arrays (`entity`, `source`, `remaining_ms`,
/// `next_period_ms`, `alive`) plus a `Vec<Option<GameplayEffectDefinition>>`
/// for the (rarely touched) definition pointer — the Rust counterpart of
/// `lib/gas/effect-pool.ts#GameplayEffectPool`. `tick()` is one pass over
/// this pool regardless of entity count, with the hot numeric countdown
/// parallelized via `rayon::par_iter_mut` (see that method's doc comment).
pub struct GameplayEffectPool {
    entity: Vec<Entity>,
    source: Vec<Option<Entity>>,
    remaining_ms: Vec<f64>,
    next_period_ms: Vec<f64>,
    alive: Vec<bool>,
    definitions: Vec<Option<GameplayEffectDefinition>>,
    free_indices: Vec<usize>,
    /// Rows for standing (non-periodic duration/infinite) modifiers only —
    /// periodic (DOT/HOT) rows never enter this index, since they pulse the
    /// BaseValue directly and never contribute to a live `recompute`.
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

    /// Recomputes `current = override ?? (base + Σadd) * Πmultiply` for one
    /// (entity, attribute) pair from every alive standing-modifier row —
    /// mirrors `lib/gas/effect-pool.ts#recomputeAttribute` exactly.
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

    /// Applies `definition` to `target`. Returns `false` (no-op) if
    /// `required_tags`/`blocked_tags` reject it. `Instant` effects mutate
    /// BaseValue once and never enter the pool; `Duration`/`Infinite`
    /// effects allocate a row tracked until expiry or `remove`.
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

    /// Explicit early removal (e.g. a cleanse ability). Returns whether a
    /// matching alive row was found and removed.
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

    /// Batch tick over every active effect instance. The hot numeric
    /// countdown (`remaining_ms`/`next_period_ms`) is decremented via
    /// `rayon::par_iter_mut` zipped across both `Vec`s — the same
    /// data-parallel technique `ecs_parallel.rs#tick_parallel` uses for
    /// position/velocity, safe here because each row's two counters are
    /// independent of every other row's. Expiry/pulse *application*
    /// (mutating `entity_to_standing_rows`, tags, attributes) runs in a
    /// second, serial pass afterward — those mutate shared `HashMap`s and
    /// cannot be safely parallelized without per-row locks, mirroring
    /// `lib/gas/effect-pool.ts#tick`'s single-pass shape.
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

            // Period pulse is checked BEFORE duration expiry on purpose: a 3s
            // Poison ticking every 1s must deal its 3rd pulse exactly at the
            // moment its duration also elapses (t=1,2,3 — three pulses over
            // three seconds), not silently drop that last pulse because
            // expiry was evaluated first. Mirrors `lib/gas/effect-pool.ts`'s
            // `tick` — see that method's comment for the same rationale.
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

// ============================================================================
// GAS WORLD — ergonomic facade
// ============================================================================

/// Ties `AttributeTable` + `GameplayTagRegistry` + `TagSetTable` +
/// `GameplayEffectPool` together — the Rust counterpart of
/// `lib/gas/gas-world.ts#GasWorld`.
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

    /// Drains and returns every `GameplayCueEvent` queued since the last
    /// call — the host (headless server / play-in-editor loop) is expected
    /// to call this once per network tick and forward the results.
    pub fn drain_cue_queue(&mut self) -> Vec<GameplayCueEvent> {
        std::mem::take(&mut self.cue_queue)
    }
}

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
        assert_eq!(world.current_value(player, "Health"), 100.0); // clamped by AttributeBounds.max
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

        // Duration fully elapsed — a further tick must not apply another pulse.
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
        // BaseValue itself is untouched by a standing modifier — only `current` is layered.
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

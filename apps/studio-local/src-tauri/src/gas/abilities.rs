//! GAS Ability System Component — Structure-of-Arrays ability rows plus the
//! tag/cooldown/channel gate matrix (GF-GAS-002 substrate, doctrine #72 P2).
//! letter **ga**.
//!
//! Design constraints (Kernel Supremacy / Zero-MVP):
//! - No JSON, no generic serde reflection, no dynamic allocation in the hot
//!   tick beyond row bookkeeping on transition events.
//! - `golden_state_machine_hash()` is a fully deterministic replay hash over
//!   catalog + alive rows + telemetry counters — identical command streams
//!   MUST reproduce identical hashes (GF-GAS-002 / GF-NET-001 contract).

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::attributes::Entity;
use super::effects::{GameplayCueEvent, GameplayCueEventType};
use super::tags::{GameplayTagRegistry, TagSetTable};

pub type AbilityId = u32;

const GOLDEN_HASH_SEED: u64 = 0x6A09_E667_F3BC_C909;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AbilityState {
    Inactive,
    Activating,
    Active,
    Cooldown,
    Cancelled,
    Completed,
}

impl AbilityState {
    pub const fn state_tag(self) -> u8 {
        match self {
            AbilityState::Inactive => 0,
            AbilityState::Activating => 1,
            AbilityState::Active => 2,
            AbilityState::Cooldown => 3,
            AbilityState::Cancelled => 4,
            AbilityState::Completed => 5,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GameplayAbility {
    pub id: AbilityId,
    pub name: String,
    pub activation_tags_required: Vec<String>,
    pub activation_tags_blocked: Vec<String>,
    /// When true, a successful activation cancels all lower-priority channels
    /// currently active on the same entity before granting the channel.
    pub cancel_on_activation: bool,
    pub priority: u32,
    pub cooldown_ms: f64,
    /// `None` = channel ability that runs until cancelled/interrupted.
    pub duration_ms: Option<f64>,
    pub activation_cue: Option<String>,
    pub cancellation_cue: Option<String>,
}

impl GameplayAbility {
    pub fn new(id: AbilityId, name: &str) -> Self {
        Self {
            id,
            name: name.to_string(),
            activation_tags_required: Vec::new(),
            activation_tags_blocked: Vec::new(),
            cancel_on_activation: false,
            priority: 0,
            cooldown_ms: 0.0,
            duration_ms: None,
            activation_cue: None,
            cancellation_cue: None,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActivationResult {
    Success,
    MissingRequiredTag,
    BlockedByTag,
    AlreadyActive,
    OnCooldown,
    ChannelBusy,
    UnknownAbility,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum DeactivateReason {
    Cancelled,
    CancelledByActivation,
    Interrupted,
    Completed,
}

/// Structure-of-Arrays ability rows. One row per (entity, ability_id); a row
/// lives through Active -> Cooldown -> freed, or is deactivated early.
#[derive(Clone)]
pub struct AbilitySystemComponent {
    entity: Vec<Entity>,
    ability_id: Vec<AbilityId>,
    state: Vec<AbilityState>,
    remaining_cooldown_ms: Vec<f64>,
    remaining_active_ms: Vec<f64>,
    alive: Vec<bool>,
    free_indices: Vec<usize>,
    entity_to_rows: HashMap<Entity, Vec<usize>>,
    catalog: Vec<Option<GameplayAbility>>,
    activate_count: u64,
    cancel_count: u64,
    interrupt_count: u64,
    complete_count: u64,
    reject_count: u64,
}

impl Default for AbilitySystemComponent {
    fn default() -> Self {
        Self::new()
    }
}

impl AbilitySystemComponent {
    pub fn new() -> Self {
        Self {
            entity: Vec::new(),
            ability_id: Vec::new(),
            state: Vec::new(),
            remaining_cooldown_ms: Vec::new(),
            remaining_active_ms: Vec::new(),
            alive: Vec::new(),
            free_indices: Vec::new(),
            entity_to_rows: HashMap::new(),
            catalog: Vec::new(),
            activate_count: 0,
            cancel_count: 0,
            interrupt_count: 0,
            complete_count: 0,
            reject_count: 0,
        }
    }

    pub fn register_ability(&mut self, ability: GameplayAbility) {
        let id = ability.id;
        while self.catalog.len() <= id as usize {
            self.catalog.push(None);
        }
        self.catalog[id as usize] = Some(ability);
    }

    fn allocate_row(&mut self) -> usize {
        if let Some(index) = self.free_indices.pop() {
            return index;
        }
        let index = self.entity.len();
        self.entity.push(0);
        self.ability_id.push(0);
        self.state.push(AbilityState::Inactive);
        self.remaining_cooldown_ms.push(0.0);
        self.remaining_active_ms.push(0.0);
        self.alive.push(false);
        index
    }

    fn find_row(&self, entity: Entity, ability_id: AbilityId) -> Option<usize> {
        self.entity_to_rows.get(&entity).and_then(|rows| {
            rows.iter()
                .copied()
                .find(|&r| self.alive[r] && self.ability_id[r] == ability_id)
        })
    }

    pub fn is_active(&self, entity: Entity, ability_id: AbilityId) -> bool {
        match self.find_row(entity, ability_id) {
            Some(row) => matches!(
                self.state[row],
                AbilityState::Active | AbilityState::Activating
            ),
            None => false,
        }
    }

    /// Active (or activating) ability ids on an entity, sorted ascending.
    pub fn active_ability_ids(&self, entity: Entity) -> Vec<u32> {
        let mut ids: Vec<u32> = self
            .entity_to_rows
            .get(&entity)
            .map(|rows| {
                rows.iter()
                    .copied()
                    .filter(|&r| {
                        self.alive[r]
                            && matches!(
                                self.state[r],
                                AbilityState::Active | AbilityState::Activating
                            )
                    })
                    .map(|r| self.ability_id[r])
                    .collect()
            })
            .unwrap_or_default();
        ids.sort_unstable();
        ids.dedup();
        ids
    }

    /// Deterministic cooldown snapshot for an entity: `(ability_id,
    /// remaining_ms)` ascending by ability_id. Only live rows still in
    /// `Cooldown` state are reported — active rows (no cooldown running) and
    /// rows whose cooldown already expired (returned to the free pool) never
    /// appear. Exposed for S6.0 replication (deterministic GAS-delta packing);
    /// the ordering guarantees two identical worlds produce byte-identical
    /// replication deltas.
    pub fn cooldown_snapshot(&self, entity: Entity) -> Vec<(u32, f64)> {
        let mut out: Vec<(u32, f64)> = self
            .entity_to_rows
            .get(&entity)
            .map(|rows| {
                rows.iter()
                    .copied()
                    .filter(|&r| {
                        self.alive[r]
                            && self.state[r] == AbilityState::Cooldown
                            && self.remaining_cooldown_ms[r] > 0.0
                    })
                    .map(|r| (self.ability_id[r], self.remaining_cooldown_ms[r]))
                    .collect()
            })
            .unwrap_or_default();
        out.sort_unstable_by_key(|a| a.0);
        out
    }

    fn has_conflicting_channel(&self, entity: Entity, priority: u32) -> bool {
        if let Some(rows) = self.entity_to_rows.get(&entity) {
            for &row in rows {
                if !self.alive[row] {
                    continue;
                }
                if !matches!(
                    self.state[row],
                    AbilityState::Active | AbilityState::Activating
                ) {
                    continue;
                }
                let def_priority = self
                    .catalog
                    .get(self.ability_id[row] as usize)
                    .and_then(|d| d.as_ref())
                    .map(|d| d.priority)
                    .unwrap_or(0);
                if def_priority >= priority {
                    return true;
                }
            }
        }
        false
    }

    fn cancel_lower_priority_channels(
        &mut self,
        entity: Entity,
        priority: u32,
        cue_queue: &mut Vec<GameplayCueEvent>,
    ) {
        let rows: Vec<usize> = self
            .entity_to_rows
            .get(&entity)
            .cloned()
            .unwrap_or_default();
        for row in rows {
            if !self.alive[row] {
                continue;
            }
            if !matches!(
                self.state[row],
                AbilityState::Active | AbilityState::Activating
            ) {
                continue;
            }
            let def_priority = self
                .catalog
                .get(self.ability_id[row] as usize)
                .and_then(|d| d.as_ref())
                .map(|d| d.priority)
                .unwrap_or(0);
            if def_priority < priority {
                self.deactivate_row(row, DeactivateReason::CancelledByActivation, cue_queue);
            }
        }
    }

    /// Full gate matrix activation. Fail-closed: every rejection is counted and
    /// returns a distinct `ActivationResult` (GF-GAS-002 gate coverage).
    pub fn activate(
        &mut self,
        entity: Entity,
        ability_id: AbilityId,
        tags: &TagSetTable,
        registry: &GameplayTagRegistry,
        cue_queue: &mut Vec<GameplayCueEvent>,
    ) -> ActivationResult {
        let definition = match self.catalog.get(ability_id as usize).and_then(|d| d.as_ref()) {
            Some(def) => def.clone(),
            None => {
                self.reject_count += 1;
                return ActivationResult::UnknownAbility;
            }
        };

        if !definition.activation_tags_required.is_empty() {
            let required: Vec<&str> = definition
                .activation_tags_required
                .iter()
                .map(String::as_str)
                .collect();
            if !tags.has_all(entity, &required, registry) {
                self.reject_count += 1;
                return ActivationResult::MissingRequiredTag;
            }
        }
        if !definition.activation_tags_blocked.is_empty() {
            let blocked: Vec<&str> = definition
                .activation_tags_blocked
                .iter()
                .map(String::as_str)
                .collect();
            if tags.has_any(entity, &blocked, registry) {
                self.reject_count += 1;
                return ActivationResult::BlockedByTag;
            }
        }

        if let Some(row) = self.find_row(entity, ability_id) {
            self.reject_count += 1;
            return match self.state[row] {
                AbilityState::Cooldown => ActivationResult::OnCooldown,
                _ => ActivationResult::AlreadyActive,
            };
        }

        // cancel_on_activation contract (GF-GAS-002): a successful activation
        // cancels every lower-priority channel on the entity BEFORE the channel
        // is granted. Equal/higher-priority channels are never cancelled here;
        // they are an ordering conflict and reject fail-closed as ChannelBusy.
        if definition.cancel_on_activation {
            self.cancel_lower_priority_channels(entity, definition.priority, cue_queue);
        }
        if self.has_conflicting_channel(entity, definition.priority) {
            self.reject_count += 1;
            return ActivationResult::ChannelBusy;
        }

        let row = self.allocate_row();
        self.entity[row] = entity;
        self.ability_id[row] = ability_id;
        self.state[row] = AbilityState::Active;
        self.remaining_cooldown_ms[row] = 0.0;
        self.remaining_active_ms[row] = definition.duration_ms.unwrap_or(f64::INFINITY);
        self.alive[row] = true;
        self.entity_to_rows.entry(entity).or_default().push(row);
        self.activate_count += 1;

        if let Some(cue) = &definition.activation_cue {
            cue_queue.push(GameplayCueEvent {
                cue_tag: cue.clone(),
                event_type: GameplayCueEventType::Applied,
                target: entity,
                source: None,
                effect_id: ability_id.to_string(),
            });
        }
        ActivationResult::Success
    }

    /// Fixed-tick advance. Deterministic: iterates row indices in ascending
    /// order; every transition is driven purely by (state, remaining_ms).
    pub fn tick(&mut self, dt_seconds: f32, cue_queue: &mut Vec<GameplayCueEvent>) {
        if dt_seconds <= 0.0 {
            return;
        }
        let dt_ms = dt_seconds as f64 * 1000.0;
        let rows: Vec<usize> = (0..self.entity.len()).filter(|&r| self.alive[r]).collect();

        for &row in &rows {
            if self.state[row] == AbilityState::Cooldown {
                self.remaining_cooldown_ms[row] -= dt_ms;
            }
        }

        for &row in &rows {
            if self.state[row] != AbilityState::Active {
                continue;
            }
            let ability_id = self.ability_id[row];
            let duration_ms = self
                .catalog
                .get(ability_id as usize)
                .and_then(|d| d.as_ref())
                .and_then(|d| d.duration_ms);
            if duration_ms.is_some() {
                self.remaining_active_ms[row] -= dt_ms;
                if self.remaining_active_ms[row] <= 0.0 {
                    let cooldown_ms = self
                        .catalog
                        .get(ability_id as usize)
                        .and_then(|d| d.as_ref())
                        .map(|d| d.cooldown_ms)
                        .unwrap_or(0.0);
                    if cooldown_ms > 0.0 {
                        self.state[row] = AbilityState::Cooldown;
                        self.remaining_cooldown_ms[row] = cooldown_ms;
                        self.remaining_active_ms[row] = 0.0;
                    } else {
                        self.deactivate_row(row, DeactivateReason::Completed, cue_queue);
                    }
                }
            }
        }

        let expiring: Vec<usize> = rows
            .iter()
            .copied()
            .filter(|&r| self.state[r] == AbilityState::Cooldown && self.remaining_cooldown_ms[r] <= 0.0)
            .collect();
        for row in expiring {
            self.free_cooldown_row(row);
        }
    }

    fn deactivate_row(
        &mut self,
        row: usize,
        reason: DeactivateReason,
        cue_queue: &mut Vec<GameplayCueEvent>,
    ) -> bool {
        if row >= self.entity.len() || !self.alive[row] {
            return false;
        }
        let entity = self.entity[row];
        let ability_id = self.ability_id[row];
        let cancellation_cue = self
            .catalog
            .get(ability_id as usize)
            .and_then(|d| d.as_ref())
            .and_then(|d| d.cancellation_cue.clone());

        self.alive[row] = false;
        self.state[row] = match reason {
            DeactivateReason::Cancelled
            | DeactivateReason::CancelledByActivation
            | DeactivateReason::Interrupted => AbilityState::Cancelled,
            DeactivateReason::Completed => AbilityState::Completed,
        };
        self.remaining_cooldown_ms[row] = 0.0;
        self.remaining_active_ms[row] = 0.0;
        self.free_indices.push(row);
        if let Some(rows) = self.entity_to_rows.get_mut(&entity) {
            rows.retain(|&r| r != row);
            if rows.is_empty() {
                self.entity_to_rows.remove(&entity);
            }
        }
        match reason {
            DeactivateReason::Cancelled | DeactivateReason::CancelledByActivation => {
                self.cancel_count += 1
            }
            DeactivateReason::Interrupted => self.interrupt_count += 1,
            DeactivateReason::Completed => self.complete_count += 1,
        }
        if let Some(cue) = cancellation_cue {
            cue_queue.push(GameplayCueEvent {
                cue_tag: cue,
                event_type: GameplayCueEventType::Removed,
                target: entity,
                source: None,
                effect_id: ability_id.to_string(),
            });
        }
        true
    }

    fn free_cooldown_row(&mut self, row: usize) {
        if row >= self.entity.len() || !self.alive[row] {
            return;
        }
        let entity = self.entity[row];
        self.alive[row] = false;
        self.state[row] = AbilityState::Inactive;
        self.remaining_cooldown_ms[row] = 0.0;
        self.free_indices.push(row);
        if let Some(rows) = self.entity_to_rows.get_mut(&entity) {
            rows.retain(|&r| r != row);
            if rows.is_empty() {
                self.entity_to_rows.remove(&entity);
            }
        }
    }

    pub fn cancel(
        &mut self,
        entity: Entity,
        ability_id: AbilityId,
        cue_queue: &mut Vec<GameplayCueEvent>,
    ) -> bool {
        if let Some(row) = self.find_row(entity, ability_id) {
            if matches!(
                self.state[row],
                AbilityState::Active | AbilityState::Activating
            ) {
                return self.deactivate_row(row, DeactivateReason::Cancelled, cue_queue);
            }
        }
        false
    }

    pub fn interrupt(
        &mut self,
        entity: Entity,
        ability_id: AbilityId,
        cue_queue: &mut Vec<GameplayCueEvent>,
    ) -> bool {
        if let Some(row) = self.find_row(entity, ability_id) {
            if matches!(
                self.state[row],
                AbilityState::Active | AbilityState::Activating
            ) {
                return self.deactivate_row(row, DeactivateReason::Interrupted, cue_queue);
            }
        }
        false
    }

    /// Interrupt every active channel on the entity. Returns the count.
    pub fn interrupt_all(&mut self, entity: Entity, cue_queue: &mut Vec<GameplayCueEvent>) -> usize {
        let ids = self.active_ability_ids(entity);
        let mut count = 0;
        for id in ids {
            if self.interrupt(entity, id, cue_queue) {
                count += 1;
            }
        }
        count
    }

    /// Total alive rows (active + cooldown).
    pub fn row_count(&self) -> usize {
        (0..self.entity.len()).filter(|&r| self.alive[r]).count()
    }

    /// Alive rows currently granting a channel.
    pub fn channel_count(&self) -> usize {
        (0..self.entity.len())
            .filter(|&r| {
                self.alive[r]
                    && matches!(
                        self.state[r],
                        AbilityState::Active | AbilityState::Activating
                    )
            })
            .count()
    }

    pub fn telemetry(&self) -> (u64, u64, u64, u64, u64) {
        (
            self.activate_count,
            self.cancel_count,
            self.interrupt_count,
            self.complete_count,
            self.reject_count,
        )
    }

    /// Fully deterministic golden state-machine hash (GF-GAS-002).
    pub fn golden_state_machine_hash(&self) -> u64 {
        let mut h: u64 = GOLDEN_HASH_SEED;
        for (idx, def) in self.catalog.iter().enumerate() {
            let Some(def) = def else {
                continue;
            };
            h = hash_mix(h, idx as u64);
            h = hash_mix(h, def.priority as u64);
            h = hash_mix(h, def.cancel_on_activation as u64);
            h = hash_mix(h, quant_f32(def.cooldown_ms as f32));
            h = hash_mix(h, quant_f32(def.duration_ms.map(|v| v as f32).unwrap_or(f32::INFINITY)));
            h = hash_mix(h, def.activation_tags_required.len() as u64);
            h = hash_mix(h, def.activation_tags_blocked.len() as u64);
        }
        let mut rows: Vec<(Entity, AbilityId, usize)> = (0..self.entity.len())
            .filter(|&r| self.alive[r])
            .map(|r| (self.entity[r], self.ability_id[r], r))
            .collect();
        rows.sort_unstable();
        for (e, aid, r) in rows {
            h = hash_mix(h, e as u64);
            h = hash_mix(h, aid as u64);
            h = hash_mix(h, self.state[r].state_tag() as u64);
            h = hash_mix(h, quant_f32(self.remaining_cooldown_ms[r] as f32));
            h = hash_mix(h, quant_f32(self.remaining_active_ms[r] as f32));
        }
        h = hash_mix(h, self.activate_count);
        h = hash_mix(h, self.cancel_count);
        h = hash_mix(h, self.interrupt_count);
        h = hash_mix(h, self.complete_count);
        h = hash_mix(h, self.reject_count);
        h
    }
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15).wrapping_add(v);
    h ^= h >> 29;
    h.wrapping_mul(0xBF58_476D_1CE4_E5B9) ^ (h >> 32)
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v as f64 * 1000.0).round() as u64
    } else if v > 0.0 {
        u64::MAX
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::super::attributes::{AttributeTable, CORE_ATTRIBUTE_NAMES};
    use super::*;

    fn make_component() -> AbilitySystemComponent {
        let mut asc = AbilitySystemComponent::new();
        let mut strike = GameplayAbility::new(1, "MeleeStrike");
        strike.activation_tags_required = vec!["Equipped.Weapon".to_string()];
        strike.priority = 10;
        strike.cooldown_ms = 250.0;
        strike.duration_ms = Some(200.0);
        strike.activation_cue = Some("Cue.Ability.MeleeStrike".to_string());
        strike.cancellation_cue = Some("Cue.Ability.Cancelled".to_string());
        asc.register_ability(strike);

        let mut heal = GameplayAbility::new(2, "HealChannel");
        heal.priority = 30;
        heal.cancellation_cue = Some("Cue.Ability.HealChannel.End".to_string());
        asc.register_ability(heal);

        let mut dash = GameplayAbility::new(3, "Dash");
        dash.priority = 20;
        dash.cancel_on_activation = true;
        dash.cooldown_ms = 500.0;
        dash.duration_ms = Some(100.0);
        asc.register_ability(dash);
        asc
    }

    fn make_world() -> (AttributeTable, GameplayTagRegistry, TagSetTable, Entity) {
        let mut attributes = AttributeTable::new(&CORE_ATTRIBUTE_NAMES);
        let registry = GameplayTagRegistry::new();
        let tags = TagSetTable::new();
        let entity: Entity = 0;
        attributes.init_entity(entity, &[("Health", 100.0)]);
        (attributes, registry, tags, entity)
    }

    #[test]
    fn activation_success_sets_active() {
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert!(asc.is_active(e, 1));
        assert_eq!(asc.channel_count(), 1);
        assert_eq!(cues.len(), 1);
    }

    #[test]
    fn tag_gates_reject_missing_and_blocked() {
        let (_a, mut registry, mut tags, e) = make_world();
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::MissingRequiredTag
        );

        let mut fire = GameplayAbility::new(4, "FireNova");
        fire.activation_tags_blocked = vec!["State.Stunned".to_string()];
        asc.register_ability(fire);
        tags.add_tag(e, "State.Stunned", &mut registry);
        assert_eq!(
            asc.activate(e, 4, &tags, &registry, &mut cues),
            ActivationResult::BlockedByTag
        );
        assert_eq!(asc.channel_count(), 0);
    }

    #[test]
    fn cooldown_blocks_reactivation_until_expiry() {
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        asc.tick(0.25, &mut cues); // duration 200ms expired -> cooldown 250ms
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::OnCooldown
        );
        asc.tick(0.3, &mut cues); // cooldown expires
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
    }

    #[test]
    fn channel_contention_lower_priority_busy() {
        // MeleeStrike (id 1) requires the Equipped.Weapon tag; grant it so the
        // channel-preemption gate is reached — tag gates fire BEFORE channel
        // gates in `activate` (a missing tag would reject first).
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        // strike priority 10 < heal priority 30 -> busy
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::ChannelBusy
        );
    }

    #[test]
    fn cancel_on_activation_cancels_lower_priority() {
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 1, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        // dash (priority 20, cancel_on_activation) cancels strike (priority 10)
        assert_eq!(
            asc.activate(e, 3, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert!(!asc.is_active(e, 1));
        assert!(asc.is_active(e, 3));
        assert_eq!(asc.channel_count(), 1);
        // strike's cancellation cue ("Cue.Ability.Cancelled", effect_id "1") must be emitted.
        assert!(cues.iter().any(|c| c.effect_id == "1"
            && c.event_type == GameplayCueEventType::Removed
            && c.cue_tag == "Cue.Ability.Cancelled"));
    }

    #[test]
    fn cancel_on_activation_never_cancels_equal_or_higher_priority() {
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        // heal (priority 30) active; dash (priority 20, cancel_on_activation)
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert_eq!(
            asc.activate(e, 3, &tags, &registry, &mut cues),
            ActivationResult::ChannelBusy
        );
        assert!(asc.is_active(e, 2));
        assert!(!asc.is_active(e, 3));
    }

    #[test]
    fn cancel_returns_row_to_free_pool() {
        let (_a, registry, tags, e) = make_world();
        let mut asc = make_component();
        let mut cues = Vec::new();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert!(asc.cancel(e, 2, &mut cues));
        assert!(!asc.is_active(e, 2));
        // reuse: re-activate must not grow the row buffer
        let rows_before = asc.entity.len();
        assert_eq!(
            asc.activate(e, 2, &tags, &registry, &mut cues),
            ActivationResult::Success
        );
        assert_eq!(asc.entity.len(), rows_before);
    }

    fn scripted_hash() -> u64 {
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        asc.activate(e, 1, &tags, &registry, &mut cues);
        asc.tick(0.25, &mut cues);
        asc.activate(e, 2, &tags, &registry, &mut cues);
        asc.tick(0.1, &mut cues);
        asc.cancel(e, 2, &mut cues);
        asc.golden_state_machine_hash()
    }

    #[test]
    fn golden_state_machine_hash_deterministic_replay() {
        assert_eq!(scripted_hash(), scripted_hash());
    }

    #[test]
    fn golden_hash_differs_on_divergent_command() {
        let base = scripted_hash();
        let (_a, mut registry, mut tags, e) = make_world();
        tags.add_tag(e, "Equipped.Weapon", &mut registry);
        let mut asc = make_component();
        let mut cues = Vec::new();
        asc.activate(e, 1, &tags, &registry, &mut cues);
        asc.tick(0.25, &mut cues);
        asc.activate(e, 2, &tags, &registry, &mut cues);
        asc.tick(0.1, &mut cues);
        asc.interrupt(e, 2, &mut cues); // divergent: interrupt instead of cancel
        assert_ne!(asc.golden_state_machine_hash(), base);
    }
}

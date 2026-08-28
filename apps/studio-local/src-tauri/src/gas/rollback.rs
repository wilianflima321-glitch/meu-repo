//! GAS deterministic rollback-prediction substrate (GF-NET-001, doctrine #72
//! P2). letter **gr**.
//!
//! Contracts (Zero-MVP / Law XI):
//! - Commands are fixed 24-byte binary records — NO JSON, NO generic serde
//!   reflection in the tick path.
//! - `fingerprint_gas_world` + `AbilitySystemComponent::golden_state_machine_hash`
//!   are fully deterministic: identical command streams MUST reproduce identical
//!   fingerprints frame-by-frame across N clients.
//! - `GAS_ROLLBACK_AAA_READY` stays `false` until the GF-NET-001 soak proves
//!   N-player identical state after rollback on product-shaped load.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::abilities::{AbilitySystemComponent, ActivationResult};
use super::effects::{GameplayCueEvent, GameplayCueEventType, GameplayEffectDefinition};
use super::interrupts::{InterruptTable, InterruptTrigger};
use super::world::GasWorld;

pub const GAS_ROLLBACK_AAA_READY: bool = false;
pub const GAS_ROLLBACK_JOURNAL_CAP: usize = 256;
pub const GAS_COMMAND_BYTES: usize = 24;
pub const GAS_ROLLBACK_FIXED_DT: f32 = 1.0 / 60.0;

// ---------------------------------------------------------------------------
// Binary command records
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum GasCommand {
    ApplyEffect {
        target: u32,
        source: u32, // u32::MAX = no source
        catalog_id: u32,
    },
    RemoveEffect {
        target: u32,
        catalog_id: u32,
        _reserved: u32,
    },
    ActivateAbility {
        entity: u32,
        ability_id: u32,
        _reserved: u32,
    },
    CancelAbility {
        entity: u32,
        ability_id: u32,
        _reserved: u32,
    },
    Damage {
        target: u32,
        source: u32,
        amount_q16: u32,
    },
    TagAdd {
        entity: u32,
        tag_id: u32,
        _reserved: u32,
    },
    TagRemove {
        entity: u32,
        tag_id: u32,
        _reserved: u32,
    },
}

impl GasCommand {
    pub const fn tag(self) -> u8 {
        match self {
            GasCommand::ApplyEffect { .. } => 0x01,
            GasCommand::RemoveEffect { .. } => 0x02,
            GasCommand::ActivateAbility { .. } => 0x03,
            GasCommand::CancelAbility { .. } => 0x04,
            GasCommand::Damage { .. } => 0x05,
            GasCommand::TagAdd { .. } => 0x06,
            GasCommand::TagRemove { .. } => 0x07,
        }
    }

    /// Encode into a fixed 24-byte record. Bounds-checked, fail-closed.
    pub fn encode_into(&self, out: &mut [u8]) -> Result<usize, &'static str> {
        if out.len() < GAS_COMMAND_BYTES {
            return Err("gas_command_buffer_too_small");
        }
        out[0] = self.tag();
        let (a, b, c) = match *self {
            GasCommand::ApplyEffect { target, source, catalog_id } => (target, source, catalog_id),
            GasCommand::RemoveEffect { target, catalog_id, _reserved } => (target, catalog_id, _reserved),
            GasCommand::ActivateAbility { entity, ability_id, _reserved } => (entity, ability_id, _reserved),
            GasCommand::CancelAbility { entity, ability_id, _reserved } => (entity, ability_id, _reserved),
            GasCommand::Damage { target, source, amount_q16 } => (target, source, amount_q16),
            GasCommand::TagAdd { entity, tag_id, _reserved } => (entity, tag_id, _reserved),
            GasCommand::TagRemove { entity, tag_id, _reserved } => (entity, tag_id, _reserved),
        };
        out[1..5].copy_from_slice(&a.to_le_bytes());
        out[5..9].copy_from_slice(&b.to_le_bytes());
        out[9..13].copy_from_slice(&c.to_le_bytes());
        for byte in out[13..GAS_COMMAND_BYTES].iter_mut() {
            *byte = 0;
        }
        Ok(GAS_COMMAND_BYTES)
    }

    /// Decode a fixed 24-byte record. Reserved bytes MUST be zero (fail-closed).
    pub fn decode(bytes: &[u8]) -> Result<Self, &'static str> {
        if bytes.len() < GAS_COMMAND_BYTES {
            return Err("gas_command_buffer_too_small");
        }
        if bytes[13..GAS_COMMAND_BYTES].iter().any(|&b| b != 0) {
            return Err("gas_command_reserved_bytes_nonzero");
        }
        let a = u32::from_le_bytes([bytes[1], bytes[2], bytes[3], bytes[4]]);
        let b = u32::from_le_bytes([bytes[5], bytes[6], bytes[7], bytes[8]]);
        let c = u32::from_le_bytes([bytes[9], bytes[10], bytes[11], bytes[12]]);
        Ok(match bytes[0] {
            0x01 => GasCommand::ApplyEffect { target: a, source: b, catalog_id: c },
            0x02 => GasCommand::RemoveEffect { target: a, catalog_id: b, _reserved: c },
            0x03 => GasCommand::ActivateAbility { entity: a, ability_id: b, _reserved: c },
            0x04 => GasCommand::CancelAbility { entity: a, ability_id: b, _reserved: c },
            0x05 => GasCommand::Damage { target: a, source: b, amount_q16: c },
            0x06 => GasCommand::TagAdd { entity: a, tag_id: b, _reserved: c },
            0x07 => GasCommand::TagRemove { entity: a, tag_id: b, _reserved: c },
            _ => return Err("gas_command_unknown_tag"),
        })
    }
}

// ---------------------------------------------------------------------------
// Effect catalog (u32 <-> definition, registration order deterministic)
// ---------------------------------------------------------------------------

#[derive(Clone, Default)]
pub struct EffectCatalog {
    by_id: Vec<Option<GameplayEffectDefinition>>,
    id_to_catalog: HashMap<String, u32>,
}

impl EffectCatalog {
    pub fn new() -> Self {
        Self {
            by_id: Vec::new(),
            id_to_catalog: HashMap::new(),
        }
    }

    pub fn register(&mut self, definition: GameplayEffectDefinition) -> u32 {
        if let Some(&catalog_id) = self.id_to_catalog.get(&definition.id) {
            return catalog_id;
        }
        let catalog_id = self.by_id.len() as u32;
        self.by_id.push(Some(definition.clone()));
        self.id_to_catalog.insert(definition.id.clone(), catalog_id);
        catalog_id
    }

    pub fn get(&self, catalog_id: u32) -> Option<&GameplayEffectDefinition> {
        self.by_id.get(catalog_id as usize).and_then(|d| d.as_ref())
    }

    pub fn len(&self) -> usize {
        self.by_id.len()
    }

    pub fn is_empty(&self) -> bool {
        self.by_id.is_empty()
    }
}

// ---------------------------------------------------------------------------
// Command log
// ---------------------------------------------------------------------------

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CommandEntry {
    pub frame_id: u64,
    pub seq: u64,
    pub command: GasCommand,
}

#[derive(Clone, Default)]
pub struct GasCommandLog {
    entries: Vec<CommandEntry>,
    next_seq: u64,
}

impl GasCommandLog {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
            next_seq: 0,
        }
    }

    pub fn record(&mut self, frame_id: u64, command: GasCommand) {
        let seq = self.next_seq;
        self.next_seq += 1;
        self.entries.push(CommandEntry {
            frame_id,
            seq,
            command,
        });
    }

    /// Commands for a frame in log order (stable insertion sequence).
    pub fn commands_for_frame(&self, frame_id: u64) -> Vec<GasCommand> {
        self.entries
            .iter()
            .filter(|e| e.frame_id == frame_id)
            .map(|e| e.command)
            .collect()
    }

    /// Remove a single command from a frame — used for divergent-input
    /// correction before a resim. Returns whether it was found.
    pub fn remove_command(&mut self, frame_id: u64, command: &GasCommand) -> bool {
        if let Some(pos) = self
            .entries
            .iter()
            .position(|e| e.frame_id == frame_id && &e.command == command)
        {
            self.entries.remove(pos);
            true
        } else {
            false
        }
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn fingerprint(&self) -> u64 {
        let mut h: u64 = 0xCBF2_9CE4_8422_2325;
        for e in &self.entries {
            h = hash_mix(h, e.frame_id);
            h = hash_mix(h, e.seq);
            h = hash_mix(h, e.command.tag() as u64);
            let mut buf = [0u8; GAS_COMMAND_BYTES];
            let _ = e.command.encode_into(&mut buf);
            for byte in buf {
                h = hash_mix(h, byte as u64);
            }
        }
        h
    }
}

// ---------------------------------------------------------------------------
// Fingerprinting
// ---------------------------------------------------------------------------

const FINGERPRINT_SEED: u64 = 0x9E37_79B9_7F4A_7C15;

pub fn fingerprint_gas_world(world: &GasWorld) -> u64 {
    let mut h: u64 = FINGERPRINT_SEED;
    let entity_count = world.entity_count();
    let attribute_count = world.attributes.attribute_count();
    h = hash_mix(h, entity_count as u64);
    h = hash_mix(h, attribute_count as u64);
    if attribute_count > 0 {
        for entity in 0..entity_count {
            h = hash_mix(h, entity as u64);
            for attr in 0..attribute_count {
                let base = world.attributes.base_value(entity, attr);
                let current = world.attributes.current_value(entity, attr);
                h = hash_mix(h, quant_f32(base));
                h = hash_mix(h, quant_f32(current));
            }
        }
    }
    for entity in world.tags.tagged_entities() {
        h = hash_mix(h, entity as u64);
        for tag_id in world.tags.explicit_tag_ids(entity) {
            h = hash_mix(h, tag_id as u64);
        }
    }
    for row in 0..world.effects.stored_row_count() {
        if let Some((entity, definition, remaining_ms, row)) = world.effects.effect_at(row) {
            h = hash_mix(h, row as u64);
            h = hash_mix(h, entity as u64);
            h = hash_mix(h, definition.id.len() as u64);
            for byte in definition.id.bytes() {
                h = hash_mix(h, byte as u64);
            }
            h = hash_mix(h, quant_f32(remaining_ms as f32));
            h = hash_mix(h, definition.modifiers.len() as u64);
        }
    }
    h
}

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct GasSnapshot {
    pub world: GasWorld,
    pub abilities: AbilitySystemComponent,
    pub interrupts: InterruptTable,
}

impl GasSnapshot {
    pub fn fingerprint(&self) -> u64 {
        let mut h = fingerprint_gas_world(&self.world);
        h = hash_mix(h, self.abilities.golden_state_machine_hash());
        h
    }
}

pub struct GasSimState {
    pub world: GasWorld,
    pub abilities: AbilitySystemComponent,
    pub interrupts: InterruptTable,
    /// Cue events produced by the most recent fixed tick, drained by the
    /// driver when publishing the binary frame (avoids mid-borrow drain).
    pub last_cues: Vec<GameplayCueEvent>,
}

impl GasSimState {
    pub fn new(attribute_names: &[&str]) -> Self {
        Self {
            world: GasWorld::new(attribute_names),
            abilities: AbilitySystemComponent::new(),
            interrupts: InterruptTable::new(),
            last_cues: Vec::new(),
        }
    }

    pub fn fingerprint(&self) -> u64 {
        let mut h = fingerprint_gas_world(&self.world);
        h = hash_mix(h, self.abilities.golden_state_machine_hash());
        h
    }
}

pub struct GasCheckpoint {
    pub frame_id: u64,
    pub snapshot: GasSnapshot,
    pub fingerprint: u64,
}

/// Deterministic rollback-prediction world. Commands are recorded per frame and
/// replayed from the log; snapshots are captured after every fixed tick.
pub struct GasRollbackWorld {
    pub state: GasSimState,
    pub log: GasCommandLog,
    pub catalog: EffectCatalog,
    journal: Vec<Option<GasCheckpoint>>,
    current_frame: u64,
    fixed_dt: f32,
}

impl GasRollbackWorld {
    pub fn new(attribute_names: &[&str]) -> Self {
        Self {
            state: GasSimState::new(attribute_names),
            log: GasCommandLog::new(),
            catalog: EffectCatalog::new(),
            journal: (0..GAS_ROLLBACK_JOURNAL_CAP).map(|_| None).collect(),
            current_frame: 0,
            fixed_dt: GAS_ROLLBACK_FIXED_DT,
        }
    }

    pub fn current_frame(&self) -> u64 {
        self.current_frame
    }

    pub fn fixed_dt(&self) -> f32 {
        self.fixed_dt
    }

    pub fn register_effect(&mut self, definition: GameplayEffectDefinition) -> u32 {
        self.catalog.register(definition)
    }

    pub fn record_command(&mut self, frame_id: u64, command: GasCommand) {
        self.log.record(frame_id, command);
    }

    pub fn checkpoint(&self, frame_id: u64) -> Option<&GasCheckpoint> {
        let slot = frame_id as usize % GAS_ROLLBACK_JOURNAL_CAP;
        self.journal
            .get(slot)
            .and_then(|c| c.as_ref())
            .filter(|c| c.frame_id == frame_id)
    }

    /// Execute one fixed tick: apply the current frame's commands, advance
    /// world + abilities, drain cues, capture a checkpoint, and return the
    /// completed frame id.
    pub fn tick_fixed(&mut self) -> u64 {
        let commands = self.log.commands_for_frame(self.current_frame);
        for command in commands {
            self.apply_command(&command);
        }
        self.state.world.tick(self.fixed_dt);
        self.state
            .abilities
            .tick(self.fixed_dt, &mut self.state.last_cues);
        self.state
            .last_cues
            .append(&mut self.state.world.drain_cue_queue());

        let completed = self.current_frame;
        let snapshot = GasSnapshot {
            world: self.state.world.clone(),
            abilities: self.state.abilities.clone(),
            interrupts: self.state.interrupts.clone(),
        };
        let fingerprint = snapshot.fingerprint();
        let slot = completed as usize % GAS_ROLLBACK_JOURNAL_CAP;
        self.journal[slot] = Some(GasCheckpoint {
            frame_id: completed,
            snapshot,
            fingerprint,
        });
        self.current_frame += 1;
        completed
    }

    /// Replay forward from the current frame up to `max` inclusive.
    pub fn resim_to(&mut self, max: u64) -> u64 {
        let mut last = 0;
        while self.current_frame <= max {
            last = self.tick_fixed();
        }
        last
    }

    /// Restore the exact state as of end of frame `target`, dropping any
    /// journal entries beyond it. `current_frame` becomes `target + 1`.
    pub fn rollback_to(&mut self, target: u64) -> bool {
        let slot = target as usize % GAS_ROLLBACK_JOURNAL_CAP;
        let checkpoint = match self.journal.get(slot).and_then(|c| c.as_ref()) {
            Some(c) if c.frame_id == target => c,
            _ => return false,
        };
        self.state.world = checkpoint.snapshot.world.clone();
        self.state.abilities = checkpoint.snapshot.abilities.clone();
        self.state.interrupts = checkpoint.snapshot.interrupts.clone();
        self.state.last_cues.clear();
        for entry in self.journal.iter_mut() {
            if let Some(cp) = entry {
                if cp.frame_id > target {
                    *entry = None;
                }
            }
        }
        self.current_frame = target + 1;
        true
    }

    /// Apply a single command to the live state (no logging; logging is done by
    /// the caller through `record_command`). Returns success (fail-closed).
    pub fn apply_command(&mut self, command: &GasCommand) -> bool {
        match *command {
            GasCommand::ApplyEffect {
                target,
                source,
                catalog_id,
            } => {
                let definition = match self.catalog.get(catalog_id) {
                    Some(def) => def.clone(),
                    None => return false,
                };
                let source = if source == u32::MAX { None } else { Some(source) };
                self.state
                    .world
                    .apply_gameplay_effect(target, definition, source)
            }
            GasCommand::RemoveEffect {
                target,
                catalog_id,
                ..
            } => {
                let definition = match self.catalog.get(catalog_id) {
                    Some(def) => def,
                    None => return false,
                };
                self.state
                    .world
                    .remove_gameplay_effect(target, &definition.id)
            }
            GasCommand::ActivateAbility {
                entity,
                ability_id,
                ..
            } => {
                let mut cues = Vec::new();
                let result = self.state.abilities.activate(
                    entity,
                    ability_id,
                    &self.state.world.tags,
                    &self.state.world.tag_registry,
                    &mut cues,
                );
                self.state.last_cues.append(&mut cues);
                result == ActivationResult::Success
            }
            GasCommand::CancelAbility {
                entity,
                ability_id,
                ..
            } => {
                let mut cues = Vec::new();
                let ok = self
                    .state
                    .abilities
                    .cancel(entity, ability_id, &mut cues);
                self.state.last_cues.append(&mut cues);
                ok
            }
            GasCommand::Damage {
                target,
                source,
                amount_q16,
            } => {
                let amount = q16_to_f32(amount_q16);
                if let Some(health_index) = self.state.world.attributes.attribute_index("Health") {
                    self.state
                        .world
                        .attributes
                        .add_to_base(target, health_index, -amount);
                    // `add_to_base` mutates only `base`; recompute `current`
                    // (base + standing modifiers) so the published binary
                    // frame reflects the damage immediately.
                    self.state.world.effects.recompute_attribute_for(
                        &mut self.state.world.attributes,
                        target,
                        "Health",
                    );
                }
                let outcome = self.state.interrupts.try_interrupt(
                    target,
                    &InterruptTrigger::OnDamaged,
                    &self.state.abilities,
                );
                if let Some(outcome) = outcome {
                    let mut cues = Vec::new();
                    for id in outcome.interrupted_ability_ids {
                        self.state.abilities.interrupt(target, id, &mut cues);
                    }
                    for effect_id in outcome.effects_to_remove {
                        self.state.world.remove_gameplay_effect(target, &effect_id);
                    }
                    if let Some(cue) = outcome.cue_tag {
                        cues.push(GameplayCueEvent {
                            cue_tag: cue,
                            event_type: GameplayCueEventType::Applied,
                            target,
                            source: if source == u32::MAX { None } else { Some(source) },
                            effect_id: "Damage".to_string(),
                        });
                    }
                    self.state.last_cues.append(&mut cues);
                }
                true
            }
            GasCommand::TagAdd { entity, tag_id, .. } => {
                let name = self.state.world.tag_registry.get_name(tag_id).to_string();
                if name.is_empty() {
                    return false;
                }
                self.state.world.add_tag(entity, &name);
                true
            }
            GasCommand::TagRemove { entity, tag_id, .. } => {
                let name = self.state.world.tag_registry.get_name(tag_id).to_string();
                if name.is_empty() {
                    return false;
                }
                self.state.world.tags.remove_tag(entity, &name, &self.state.world.tag_registry);
                true
            }
        }
    }
}

pub fn f32_to_q16(v: f32) -> u32 {
    (v.clamp(0.0, 65535.0) * 65536.0).round() as u32
}

pub fn q16_to_f32(v: u32) -> f32 {
    v as f32 / 65536.0
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
    use super::super::abilities::GameplayAbility;
    use super::super::attributes::AttributeModifierOp;
    use super::super::effects::{GameplayEffectDurationPolicy, GameplayEffectModifier};
    use super::super::interrupts::InterruptRule;
    use super::*;

    fn power_buff() -> GameplayEffectDefinition {
        GameplayEffectDefinition {
            id: "Buff.Power".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Duration,
            duration_seconds: Some(2.0),
            period_seconds: None,
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: 10.0,
            }],
            granted_tags: Vec::new(),
            required_tags: Vec::new(),
            blocked_tags: Vec::new(),
            application_cue_tag: Some("Cue.Buff.Power".to_string()),
            removal_cue_tag: None,
            periodic_cue_tag: None,
        }
    }

    fn seed_commands(world: &mut GasRollbackWorld) {
        let buff_id = world.register_effect(power_buff());
        world.state.world.create_entity(&[("Health", 100.0)]);
        world.state.world.create_entity(&[("Health", 80.0)]);
        let mut strike = GameplayAbility::new(1, "MeleeStrike");
        strike.priority = 10;
        strike.cooldown_ms = 250.0;
        strike.duration_ms = Some(200.0);
        world.state.abilities.register_ability(strike);
        world.state.interrupts.register(InterruptRule {
            id: "dmg_interrupt".to_string(),
            trigger: InterruptTrigger::OnDamaged,
            target_ability_id: None,
            removes_effect_ids: Vec::new(),
            cue_tag: Some("Cue.Ability.Interrupted".to_string()),
        });
        world.record_command(
            0,
            GasCommand::ApplyEffect {
                target: 0,
                source: u32::MAX,
                catalog_id: buff_id,
            },
        );
        world.record_command(
            0,
            GasCommand::ActivateAbility {
                entity: 0,
                ability_id: 1,
                _reserved: 0,
            },
        );
        world.record_command(
            1,
            GasCommand::Damage {
                target: 0,
                source: u32::MAX,
                amount_q16: f32_to_q16(5.0),
            },
        );
        world.record_command(
            1,
            GasCommand::CancelAbility {
                entity: 0,
                ability_id: 1,
                _reserved: 0,
            },
        );
    }

    fn run_scripted_world() -> GasRollbackWorld {
        let mut world = GasRollbackWorld::new(&["Health", "Mana"]);
        seed_commands(&mut world);
        world
    }

    #[test]
    fn gas_command_encode_decode_roundtrip() {
        let commands = vec![
            GasCommand::ApplyEffect { target: 1, source: 2, catalog_id: 3 },
            GasCommand::RemoveEffect { target: 1, catalog_id: 4, _reserved: 0 },
            GasCommand::ActivateAbility { entity: 5, ability_id: 6, _reserved: 0 },
            GasCommand::CancelAbility { entity: 5, ability_id: 6, _reserved: 0 },
            GasCommand::Damage { target: 7, source: 8, amount_q16: 12345 },
            GasCommand::TagAdd { entity: 9, tag_id: 10, _reserved: 0 },
            GasCommand::TagRemove { entity: 9, tag_id: 10, _reserved: 0 },
        ];
        let mut buf = [0u8; GAS_COMMAND_BYTES];
        for cmd in &commands {
            let n = cmd.encode_into(&mut buf).expect("encode");
            assert_eq!(n, GAS_COMMAND_BYTES);
            let decoded = GasCommand::decode(&buf).expect("decode");
            assert_eq!(&decoded, cmd);
        }
    }

    #[test]
    fn gas_command_rejects_nonzero_reserved() {
        let mut buf = [0u8; GAS_COMMAND_BYTES];
        GasCommand::ApplyEffect { target: 0, source: 0, catalog_id: 0 }
            .encode_into(&mut buf)
            .unwrap();
        buf[13] = 1;
        assert!(GasCommand::decode(&buf).is_err());
    }

    #[test]
    fn gas_command_rejects_unknown_tag() {
        let mut buf = [0u8; GAS_COMMAND_BYTES];
        buf[0] = 0xFF;
        assert!(GasCommand::decode(&buf).is_err());
    }

    #[test]
    fn effect_catalog_register_dedups() {
        let mut catalog = EffectCatalog::new();
        let def = power_buff();
        let id1 = catalog.register(def.clone());
        let id2 = catalog.register(def);
        assert_eq!(id1, id2);
        assert_eq!(catalog.len(), 1);
    }

    #[test]
    fn command_log_records_and_removes() {
        let mut log = GasCommandLog::new();
        log.record(0, GasCommand::Damage { target: 0, source: 1, amount_q16: 5 });
        log.record(0, GasCommand::Damage { target: 0, source: 1, amount_q16: 6 });
        log.record(1, GasCommand::Damage { target: 0, source: 1, amount_q16: 7 });
        assert_eq!(log.commands_for_frame(0).len(), 2);
        assert_eq!(log.commands_for_frame(1).len(), 1);
        let cmd = GasCommand::Damage { target: 0, source: 1, amount_q16: 6 };
        assert!(log.remove_command(0, &cmd));
        assert_eq!(log.commands_for_frame(0).len(), 1);
        assert!(!log.remove_command(0, &cmd));
    }

    #[test]
    fn fingerprint_changes_after_tick() {
        let mut world = run_scripted_world();
        let f0 = world.state.fingerprint();
        world.tick_fixed();
        let f1 = world.state.fingerprint();
        assert_ne!(f0, f1);
        assert_eq!(world.current_frame(), 1);
    }

    #[test]
    fn rollback_restores_fingerprint() {
        let mut world = run_scripted_world();
        world.tick_fixed();
        let fp_frame0 = world.checkpoint(0).expect("checkpoint 0").fingerprint;
        world.tick_fixed();
        world.tick_fixed();
        assert_ne!(world.state.fingerprint(), fp_frame0);
        assert!(world.rollback_to(0));
        assert_eq!(world.state.fingerprint(), fp_frame0);
        assert_eq!(world.current_frame(), 1);
    }

    #[test]
    fn deterministic_replay_same_fingerprints() {
        let mut a = run_scripted_world();
        let mut b = run_scripted_world();
        for _ in 0..8 {
            a.tick_fixed();
            b.tick_fixed();
            assert_eq!(a.state.fingerprint(), b.state.fingerprint());
            assert_eq!(
                a.checkpoint(0).map(|c| c.fingerprint),
                b.checkpoint(0).map(|c| c.fingerprint)
            );
        }
    }

    #[test]
    fn rollback_converges_after_divergent_input() {
        let mut a = run_scripted_world();
        let mut b = run_scripted_world();
        for _ in 0..3 {
            a.tick_fixed();
            b.tick_fixed();
        }
        assert_eq!(a.state.fingerprint(), b.state.fingerprint());

        // Client A takes a divergent hit on frame 3.
        let divergent = GasCommand::Damage {
            target: 0,
            source: u32::MAX,
            amount_q16: f32_to_q16(3.0),
        };
        a.record_command(3, divergent);
        a.tick_fixed();
        b.tick_fixed();
        assert_ne!(a.state.fingerprint(), b.state.fingerprint());

        // Rollback A to before frame 3, drop the divergent input, resim.
        assert!(a.rollback_to(2));
        assert!(a.log.remove_command(3, &divergent));
        a.resim_to(3);
        assert_eq!(a.state.fingerprint(), b.state.fingerprint());
        assert_eq!(a.current_frame(), b.current_frame());
    }

    #[test]
    fn rollback_ready_flag_fails_closed() {
        const { assert!(!GAS_ROLLBACK_AAA_READY); }
    }
}

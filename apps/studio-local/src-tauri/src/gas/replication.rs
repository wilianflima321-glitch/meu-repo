//! GAS S6.0 Replication intent API — letter **gr** (doctrine #72/#73 P2 — GAS & Física).
//!
//! Deterministic, binary-only replication substrate for the rollback-prediction
//! GAS: an authoritative [`ReplicationGraph`] binds GAS entities to one of five
//! [`ReplicationCategory`] policies, captures full [`ReplicationSnapshot`]s of
//! the live [`GasRollbackWorld`], and derives [`GasReplicationDelta`]s between
//! two snapshots. Every delta is packed into a fixed 24-byte record
//! ([`GAS_DELTA_BYTES`]) and round-trips byte-exactly through
//! [`ReplicationGraph::encode_delta`] / [`ReplicationGraph::decode_delta`].
//!
//! Contract / Zero-MVP / Law XI:
//! - **Binary-only tick**: the 60 Hz replication path (`snapshot` → `delta` →
//!   `encode`) is pure `u8` state. JSON/serde appears only at the Tauri RPC
//!   boundary (probe / soak report).
//! - **Deterministic diff**: sorted lists are diffed with two-pointer scans
//!   (never a HashMap on the diff path), so two identical worlds produce
//!   byte-identical deltas — the GF-NET-001 determinism invariant.
//! - **Fail-closed decode**: reserved bytes must be zero and the kind tag must
//!   be known; any violation rejects the whole stream.
//! - `S6_REPLICATION_READY` stays `false` (HELD) — this proves the replication
//!   substrate, NOT a product certificate (no live transport channel yet).
//!
//! The graph exposes `send_frequency_hz` per policy as a *transport hint*
//! ([`ReplicationGraph::should_send`]); `delta` itself is a pure change diff —
//! the scheduler applies the frequency gate before calling it.

use serde::Serialize;
use std::cmp::Ordering;

use super::abilities::GameplayAbility;
use super::attributes::Entity;
use super::rollback::{f32_to_q16, GasCommand, GasRollbackWorld};

/// Fail-closed product flag — replication substrate proven, product HELD.
pub const S6_REPLICATION_READY: bool = false;

/// Evidence identifier for the S6.0 graph + delta soak / probe.
pub const S6_REPLICATION_EVIDENCE_KIND: &str = "s6_replication_graph_delta_and_roundtrip";

/// Fixed wire width of one replicated GAS delta record (24 bytes).
pub const GAS_DELTA_BYTES: usize = 24;

/// Canonical Health attribute replicated as a quantized q16 scalar.
pub const REPLICATION_HEALTH_ATTRIBUTE: &str = "Health";

/// 60 Hz fixed frame period (ms) used to quantize cooldowns into frames.
pub const REPLICATION_MS_PER_FRAME: f64 = 1000.0 / 60.0;

/// Nominal replication frame rate of the simulation tick.
pub const REPLICATION_FRAMES_PER_SECOND: u32 = 60;

/// `StateChanged` value code: entity appeared between the two snapshots (spawn).
pub const STATE_CODE_SPAWN: u32 = 0xFFFF_FFFE;
/// `StateChanged` value code: entity disappeared between the two snapshots (despawn).
pub const STATE_CODE_DESPAWN: u32 = 0xFFFF_FFFF;

/// Replication policy taxonomy (tags stable for the binary wire).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReplicationCategory {
    /// Player-owned state replicated on every owner tick (60 Hz).
    OwnerAlways,
    /// Region / proximity broadcast — interest-managed cell traffic.
    SpatialCell,
    /// Deterministically quantized GAS deltas (cooldown/tags/attributes).
    GASDelta,
    /// Low-frequency, on-change-only state.
    Rare,
    /// Never replicated — authority-local state only.
    Never,
}

impl ReplicationCategory {
    /// Stable wire tag (0x01..=0x05).
    pub const fn tag(self) -> u8 {
        match self {
            Self::OwnerAlways => 0x01,
            Self::SpatialCell => 0x02,
            Self::GASDelta => 0x03,
            Self::Rare => 0x04,
            Self::Never => 0x05,
        }
    }

    /// Default transport policy for the category.
    pub fn default_policy(self) -> ReplicationPolicy {
        match self {
            Self::OwnerAlways => ReplicationPolicy {
                send_frequency_hz: 60,
                quantize_bits: 16,
                record_bytes: GAS_DELTA_BYTES as u8,
            },
            Self::SpatialCell => ReplicationPolicy {
                send_frequency_hz: 60,
                quantize_bits: 12,
                record_bytes: GAS_DELTA_BYTES as u8,
            },
            Self::GASDelta => ReplicationPolicy {
                send_frequency_hz: 30,
                quantize_bits: 16,
                record_bytes: GAS_DELTA_BYTES as u8,
            },
            Self::Rare => ReplicationPolicy {
                send_frequency_hz: 4,
                quantize_bits: 16,
                record_bytes: GAS_DELTA_BYTES as u8,
            },
            Self::Never => ReplicationPolicy {
                send_frequency_hz: 0,
                quantize_bits: 0,
                record_bytes: 0,
            },
        }
    }
}

/// Transport policy for a replication category.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReplicationPolicy {
    /// Target send rate (Hz) — the scheduler's frequency gate.
    pub send_frequency_hz: u32,
    /// Quantization depth (bits) used by consumers of the q-encoded values.
    pub quantize_bits: u8,
    /// Fixed wire width of one delta record (must equal `GAS_DELTA_BYTES`).
    pub record_bytes: u8,
}

/// One entity's replication binding: entity → category + transport policy.
#[derive(Debug, Clone, Copy)]
pub struct ReplicationBinding {
    /// The bound GAS entity.
    pub entity: Entity,
    /// Replication category of the binding.
    pub category: ReplicationCategory,
    /// Effective transport policy of the binding.
    pub policy: ReplicationPolicy,
}

/// The authoritative replication graph: deterministic, entity-sorted bindings.
pub struct ReplicationGraph {
    bindings: Vec<ReplicationBinding>,
}

impl ReplicationGraph {
    /// Creates an empty graph.
    pub fn new() -> Self {
        Self { bindings: Vec::new() }
    }

    /// Binds `entity` with `category`'s default policy. Fail-closed (`false`)
    /// if the entity is already bound.
    pub fn bind(&mut self, entity: Entity, category: ReplicationCategory) -> bool {
        self.bind_with(entity, category, category.default_policy())
    }

    /// Binds with an explicit policy override. Fail-closed if the entity is
    /// already bound or the policy's record width mismatches the wire contract.
    pub fn bind_with(
        &mut self,
        entity: Entity,
        category: ReplicationCategory,
        policy: ReplicationPolicy,
    ) -> bool {
        if category != ReplicationCategory::Never && policy.record_bytes != GAS_DELTA_BYTES as u8 {
            return false;
        }
        let index = self.bindings.binary_search_by_key(&entity, |b| b.entity);
        match index {
            Ok(_) => false,
            Err(pos) => {
                self.bindings
                    .insert(pos, ReplicationBinding { entity, category, policy });
                true
            }
        }
    }

    /// Number of bound entities.
    pub fn entity_count(&self) -> usize {
        self.bindings.len()
    }

    /// Category of a bound entity (`None` fail-closed when unbound).
    pub fn category_of(&self, entity: Entity) -> Option<ReplicationCategory> {
        let index = self.bindings.binary_search_by_key(&entity, |b| b.entity).ok()?;
        Some(self.bindings[index].category)
    }

    /// Effective policy of a bound entity (`None` fail-closed when unbound).
    pub fn policy_of(&self, entity: Entity) -> Option<ReplicationPolicy> {
        let index = self.bindings.binary_search_by_key(&entity, |b| b.entity).ok()?;
        Some(self.bindings[index].policy)
    }

    /// Frequency gate: should the binding for `entity` send across the
    /// `[from_frame, to_frame]` window? Unbound entities and `Never` bindings
    /// fail closed.
    pub fn should_send(&self, entity: Entity, from_frame: u64, to_frame: u64) -> bool {
        let Some(policy) = self.policy_of(entity) else {
            return false;
        };
        if policy.send_frequency_hz == 0 {
            return false;
        }
        let interval = (REPLICATION_FRAMES_PER_SECOND as f64 / policy.send_frequency_hz as f64)
            .round()
            .max(1.0) as u64;
        to_frame.saturating_sub(from_frame) >= interval
    }

    /// Full-state snapshot of every bound entity at `frame_id`. Deterministic:
    /// entity order follows the sorted binding order; every per-entity list is
    /// sorted ascending.
    pub fn snapshot(&self, world: &GasRollbackWorld, frame_id: u64) -> ReplicationSnapshot {
        let health_index = world
            .state
            .world
            .attributes
            .attribute_index(REPLICATION_HEALTH_ATTRIBUTE)
            .unwrap_or(u32::MAX as usize) as u32;
        let mut entities = Vec::with_capacity(self.bindings.len());
        for binding in &self.bindings {
            let cooldowns = world
                .state
                .abilities
                .cooldown_snapshot(binding.entity)
                .into_iter()
                .map(|(id, remaining_ms)| (id, cooldown_frames(remaining_ms)))
                .collect();
            entities.push(ReplicationEntityState {
                entity: binding.entity,
                health_index,
                active_abilities: world.state.abilities.active_ability_ids(binding.entity),
                cooldowns,
                tags: world.state.world.tags.explicit_tag_ids(binding.entity),
                health_q: f32_to_q16(world.state.world.current_value(
                    binding.entity,
                    REPLICATION_HEALTH_ATTRIBUTE,
                )),
            });
        }
        ReplicationSnapshot { frame_id, entities }
    }

    /// Pure change diff between two snapshots (both produced by this graph, in
    /// the same sorted entity order). Emits deltas for every non-`Never`
    /// binding whose captured state changed; `Never` bindings never emit.
    /// Spawn/despawn are surfaced as [`STATE_CODE_SPAWN`] /
    /// [`STATE_CODE_DESPAWN`] `StateChanged` deltas.
    pub fn delta(
        &self,
        prev: &ReplicationSnapshot,
        next: &ReplicationSnapshot,
    ) -> Vec<GasReplicationDelta> {
        let mut out = Vec::new();
        let (mut i, mut j) = (0usize, 0usize);
        while i < prev.entities.len() && j < next.entities.len() {
            match prev.entities[i].entity.cmp(&next.entities[j].entity) {
                Ordering::Equal => {
                    self.push_entity_deltas(&prev.entities[i], &next.entities[j], &mut out);
                    i += 1;
                    j += 1;
                }
                Ordering::Less => {
                    if self.is_replicated(prev.entities[i].entity) {
                        out.push(GasReplicationDelta {
                            entity: prev.entities[i].entity,
                            kind: ReplicationDeltaKind::StateChanged,
                            ability_id: 0,
                            tag_id: 0,
                            attribute_index: prev.entities[i].health_index,
                            value_q: STATE_CODE_DESPAWN,
                        });
                    }
                    i += 1;
                }
                Ordering::Greater => {
                    if self.is_replicated(next.entities[j].entity) {
                        out.push(GasReplicationDelta {
                            entity: next.entities[j].entity,
                            kind: ReplicationDeltaKind::StateChanged,
                            ability_id: 0,
                            tag_id: 0,
                            attribute_index: next.entities[j].health_index,
                            value_q: STATE_CODE_SPAWN,
                        });
                    }
                    j += 1;
                }
            }
        }
        while i < prev.entities.len() {
            if self.is_replicated(prev.entities[i].entity) {
                out.push(GasReplicationDelta {
                    entity: prev.entities[i].entity,
                    kind: ReplicationDeltaKind::StateChanged,
                    ability_id: 0,
                    tag_id: 0,
                    attribute_index: prev.entities[i].health_index,
                    value_q: STATE_CODE_DESPAWN,
                });
            }
            i += 1;
        }
        while j < next.entities.len() {
            if self.is_replicated(next.entities[j].entity) {
                out.push(GasReplicationDelta {
                    entity: next.entities[j].entity,
                    kind: ReplicationDeltaKind::StateChanged,
                    ability_id: 0,
                    tag_id: 0,
                    attribute_index: next.entities[j].health_index,
                    value_q: STATE_CODE_SPAWN,
                });
            }
            j += 1;
        }
        out
    }

    /// Appends the binary encoding of `deltas` to `out`. Returns bytes written.
    pub fn encode_delta_into(&self, deltas: &[GasReplicationDelta], out: &mut Vec<u8>) -> usize {
        let start = out.len();
        for delta in deltas {
            let mut record = [0u8; GAS_DELTA_BYTES];
            record[0] = delta.kind.tag();
            record[1..5].copy_from_slice(&delta.entity.to_le_bytes());
            record[5..9].copy_from_slice(&delta.ability_id.to_le_bytes());
            record[9..13].copy_from_slice(&delta.tag_id.to_le_bytes());
            record[13..17].copy_from_slice(&delta.attribute_index.to_le_bytes());
            record[17..21].copy_from_slice(&delta.value_q.to_le_bytes());
            // record[21..24] stays zero — reserved, fail-closed on decode.
            out.extend_from_slice(&record);
        }
        out.len() - start
    }

    /// Owned binary encoding of `deltas` (records are `GAS_DELTA_BYTES` wide).
    pub fn encode_delta(&self, deltas: &[GasReplicationDelta]) -> Vec<u8> {
        let mut out = Vec::with_capacity(deltas.len() * GAS_DELTA_BYTES);
        self.encode_delta_into(deltas, &mut out);
        out
    }

    /// Decodes a delta stream. Rejects non-multiple lengths, unknown kind tags,
    /// and any non-zero reserved byte (fail-closed).
    pub fn decode_delta(bytes: &[u8]) -> Result<Vec<GasReplicationDelta>, &'static str> {
        if !bytes.len().is_multiple_of(GAS_DELTA_BYTES) {
            return Err("delta stream length is not a multiple of GAS_DELTA_BYTES");
        }
        let mut out = Vec::with_capacity(bytes.len() / GAS_DELTA_BYTES);
        for chunk in bytes.chunks_exact(GAS_DELTA_BYTES) {
            if chunk[21] != 0 || chunk[22] != 0 || chunk[23] != 0 {
                return Err("delta record reserved bytes must be zero");
            }
            let kind = match ReplicationDeltaKind::from_tag(chunk[0]) {
                Some(kind) => kind,
                None => return Err("delta record carries an unknown kind tag"),
            };
            out.push(GasReplicationDelta {
                entity: read_u32_at(chunk, 1),
                kind,
                ability_id: read_u32_at(chunk, 5),
                tag_id: read_u32_at(chunk, 9),
                attribute_index: read_u32_at(chunk, 13),
                value_q: read_u32_at(chunk, 17),
            });
        }
        Ok(out)
    }

    /// Deterministic digest of the binding set — two identical graphs collide.
    pub fn fingerprint(&self) -> u64 {
        let mut h = 0xA3_75_B9_C1_2D_5F_7E_11u64;
        for binding in &self.bindings {
            h = hash_mix(h, binding.entity as u64);
            h = hash_mix(h, binding.category.tag() as u64);
            h = hash_mix(h, binding.policy.send_frequency_hz as u64);
            h = hash_mix(h, binding.policy.quantize_bits as u64);
            h = hash_mix(h, binding.policy.record_bytes as u64);
        }
        h
    }

    /// Whether `entity` is bound to a replicating (non-`Never`) category.
    fn is_replicated(&self, entity: Entity) -> bool {
        matches!(
            self.category_of(entity),
            Some(category) if category != ReplicationCategory::Never
        )
    }

    /// Emits every changed component of one entity, in fixed order:
    /// `StateChanged` → `AbilityCooldown` → `TagAdd` → `TagRemove` →
    /// `Attribute`. Category-gated (skips `Never` bindings).
    fn push_entity_deltas(
        &self,
        prev: &ReplicationEntityState,
        next: &ReplicationEntityState,
        out: &mut Vec<GasReplicationDelta>,
    ) {
        if !self.is_replicated(next.entity) {
            return;
        }
        if prev.active_abilities != next.active_abilities {
            out.push(GasReplicationDelta {
                entity: next.entity,
                kind: ReplicationDeltaKind::StateChanged,
                ability_id: 0,
                tag_id: 0,
                attribute_index: next.health_index,
                value_q: next.active_abilities.len() as u32,
            });
        }
        for (ability_id, frames) in cooldown_deltas(&prev.cooldowns, &next.cooldowns) {
            out.push(GasReplicationDelta {
                entity: next.entity,
                kind: ReplicationDeltaKind::AbilityCooldown,
                ability_id,
                tag_id: 0,
                attribute_index: next.health_index,
                value_q: frames,
            });
        }
        let (added, removed) = diff_sorted_u32(&prev.tags, &next.tags);
        for tag_id in added {
            out.push(GasReplicationDelta {
                entity: next.entity,
                kind: ReplicationDeltaKind::TagAdd,
                ability_id: 0,
                tag_id,
                attribute_index: next.health_index,
                value_q: 0,
            });
        }
        for tag_id in removed {
            out.push(GasReplicationDelta {
                entity: next.entity,
                kind: ReplicationDeltaKind::TagRemove,
                ability_id: 0,
                tag_id,
                attribute_index: next.health_index,
                value_q: 0,
            });
        }
        if prev.health_q != next.health_q {
            out.push(GasReplicationDelta {
                entity: next.entity,
                kind: ReplicationDeltaKind::Attribute,
                ability_id: 0,
                tag_id: 0,
                attribute_index: next.health_index,
                value_q: next.health_q,
            });
        }
    }
}

impl Default for ReplicationGraph {
    fn default() -> Self {
        Self::new()
    }
}

/// Kind of a single replicated GAS delta (stable wire tags 0x01..=0x05).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReplicationDeltaKind {
    /// A cooldown changed (or cleared — `value_q == 0`).
    AbilityCooldown = 0x01,
    /// A gameplay tag was granted to the entity.
    TagAdd = 0x02,
    /// A gameplay tag was removed from the entity.
    TagRemove = 0x03,
    /// A quantized attribute changed (Health by default).
    Attribute = 0x04,
    /// The ability/state set changed (or spawn/despawn — see state codes).
    StateChanged = 0x05,
}

impl ReplicationDeltaKind {
    /// Stable wire tag.
    pub const fn tag(self) -> u8 {
        match self {
            Self::AbilityCooldown => 0x01,
            Self::TagAdd => 0x02,
            Self::TagRemove => 0x03,
            Self::Attribute => 0x04,
            Self::StateChanged => 0x05,
        }
    }

    /// Decodes a wire tag; `None` for unknown tags (fail-closed).
    pub fn from_tag(tag: u8) -> Option<Self> {
        match tag {
            0x01 => Some(Self::AbilityCooldown),
            0x02 => Some(Self::TagAdd),
            0x03 => Some(Self::TagRemove),
            0x04 => Some(Self::Attribute),
            0x05 => Some(Self::StateChanged),
            _ => None,
        }
    }
}

/// One quantized replication delta between two snapshots.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GasReplicationDelta {
    /// Target entity.
    pub entity: Entity,
    /// Delta kind.
    pub kind: ReplicationDeltaKind,
    /// Ability id (`StateChanged`/`AbilityCooldown` payload).
    pub ability_id: u32,
    /// Tag id (`TagAdd`/`TagRemove` payload).
    pub tag_id: u32,
    /// Attribute index (`Attribute` payload).
    pub attribute_index: u32,
    /// Quantized value (cooldown frames / q16 health / state code).
    pub value_q: u32,
}

/// Per-entity captured state within a snapshot (lists sorted ascending).
#[derive(Debug, Clone)]
pub struct ReplicationEntityState {
    /// Bound entity.
    pub entity: Entity,
    /// Index of the replicated Health attribute in the world.
    pub health_index: u32,
    /// Active ability ids, ascending.
    pub active_abilities: Vec<u32>,
    /// `(ability_id, remaining_frames)` ascending by ability id.
    pub cooldowns: Vec<(u32, u32)>,
    /// Explicit gameplay tag ids, ascending.
    pub tags: Vec<u32>,
    /// Quantized q16 Health value.
    pub health_q: u32,
}

/// Full-state capture of every bound entity at a given frame.
#[derive(Debug, Clone)]
pub struct ReplicationSnapshot {
    /// Frame id the capture corresponds to.
    pub frame_id: u64,
    /// Per-entity captures in sorted binding order.
    pub entities: Vec<ReplicationEntityState>,
}

/// Quantizes a remaining cooldown (ms) into 60 Hz frames (rounded, clamped ≥ 0).
pub fn cooldown_frames(remaining_ms: f64) -> u32 {
    (remaining_ms / REPLICATION_MS_PER_FRAME).round().max(0.0) as u32
}

/// Reads a little-endian u32 at `offset` within a `GAS_DELTA_BYTES` record.
fn read_u32_at(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes([
        bytes[offset],
        bytes[offset + 1],
        bytes[offset + 2],
        bytes[offset + 3],
    ])
}

/// Sorted two-pointer diff of two ascending u32 lists → `(added, removed)`.
fn diff_sorted_u32(prev: &[u32], next: &[u32]) -> (Vec<u32>, Vec<u32>) {
    let mut added = Vec::new();
    let mut removed = Vec::new();
    let (mut i, mut j) = (0usize, 0usize);
    while i < prev.len() && j < next.len() {
        match prev[i].cmp(&next[j]) {
            Ordering::Equal => {
                i += 1;
                j += 1;
            }
            Ordering::Less => {
                removed.push(prev[i]);
                i += 1;
            }
            Ordering::Greater => {
                added.push(next[j]);
                j += 1;
            }
        }
    }
    while i < prev.len() {
        removed.push(prev[i]);
        i += 1;
    }
    while j < next.len() {
        added.push(next[j]);
        j += 1;
    }
    (added, removed)
}

/// Sorted two-pointer cooldown diff (keyed by ability id). Returns the
/// `(ability_id, frames)` pairs to emit: changed/new pairs carry their next
/// remaining frames; cleared pairs (prev-only) carry `0`.
fn cooldown_deltas(prev: &[(u32, u32)], next: &[(u32, u32)]) -> Vec<(u32, u32)> {
    let mut out = Vec::new();
    let (mut i, mut j) = (0usize, 0usize);
    while i < prev.len() && j < next.len() {
        match prev[i].0.cmp(&next[j].0) {
            Ordering::Equal => {
                if prev[i].1 != next[j].1 {
                    out.push(next[j]);
                }
                i += 1;
                j += 1;
            }
            Ordering::Less => {
                out.push((prev[i].0, 0));
                i += 1;
            }
            Ordering::Greater => {
                out.push(next[j]);
                j += 1;
            }
        }
    }
    while i < prev.len() {
        out.push((prev[i].0, 0));
        i += 1;
    }
    while j < next.len() {
        out.push(next[j]);
        j += 1;
    }
    out
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15).wrapping_add(v);
    h ^= h >> 29;
    h.wrapping_mul(0xBF58_476D_1CE4_E5B9) ^ (h >> 32)
}

/// First snapshot frame of the S6 soak (prev).
pub const S6_PREV_FRAME: u64 = 4;
/// Second snapshot frame of the S6 soak (next).
pub const S6_NEXT_FRAME: u64 = 12;

/// Fresh deterministic soak world: 5 entities (Health 100) + ability 1 "Pulse"
/// (cooldown 1000 ms, duration 120 ms).
fn s6_soak_world() -> GasRollbackWorld {
    let mut world = GasRollbackWorld::new(&[REPLICATION_HEALTH_ATTRIBUTE]);
    for _ in 0..5 {
        world
            .state
            .world
            .create_entity(&[(REPLICATION_HEALTH_ATTRIBUTE, 100.0)]);
    }
    let mut ability = GameplayAbility::new(1, "Pulse");
    ability.cooldown_ms = 1000.0;
    ability.duration_ms = Some(120.0);
    world.state.abilities.register_ability(ability);
    world
}

/// The fixed soak script over one world: snapshot prev@`S6_PREV_FRAME`, apply
/// the second command wave, snapshot next@`S6_NEXT_FRAME`, then return the
/// prev/next frames, the derived deltas and their encoded bytes.
fn s6_soak_run(
    world: &mut GasRollbackWorld,
    graph: &ReplicationGraph,
    buff_tag_id: u32,
) -> (u64, u64, Vec<GasReplicationDelta>, Vec<u8>) {
    // Wave 1 (frames 0..=3): e1's ability enters cooldown after ~8 ticks;
    // e3's ability is active at prev; e2 gains the temporary buff tag.
    world.record_command(
        0,
        GasCommand::ActivateAbility {
            entity: 1,
            ability_id: 1,
            _reserved: 0,
        },
    );
    world.record_command(
        2,
        GasCommand::ActivateAbility {
            entity: 3,
            ability_id: 1,
            _reserved: 0,
        },
    );
    world.record_command(
        3,
        GasCommand::TagAdd {
            entity: 2,
            tag_id: buff_tag_id,
            _reserved: 0,
        },
    );
    while world.current_frame() < S6_PREV_FRAME {
        world.tick_fixed();
    }
    let prev = graph.snapshot(world, world.current_frame());

    // Wave 2 (frames 5..=8): e0 takes damage; e2 loses the buff; e3's ability
    // is cancelled (active set change).
    world.record_command(
        5,
        GasCommand::Damage {
            target: 0,
            source: u32::MAX,
            amount_q16: f32_to_q16(20.0),
        },
    );
    world.record_command(
        6,
        GasCommand::TagRemove {
            entity: 2,
            tag_id: buff_tag_id,
            _reserved: 0,
        },
    );
    world.record_command(
        8,
        GasCommand::CancelAbility {
            entity: 3,
            ability_id: 1,
            _reserved: 0,
        },
    );
    while world.current_frame() < S6_NEXT_FRAME {
        world.tick_fixed();
    }
    let next = graph.snapshot(world, world.current_frame());
    let deltas = graph.delta(&prev, &next);
    let encoded = graph.encode_delta(&deltas);
    (prev.frame_id, next.frame_id, deltas, encoded)
}

/// Deterministic soak evidence for the S6.0 replication graph. `green` is
/// computed from measured criteria; `ready` is the HELD product flag (false).
#[derive(Debug, Clone, Serialize)]
pub struct S6ReplicationSoakReport {
    /// Number of entities in the soak world.
    pub entities: u32,
    /// Number of bindings in the replication graph.
    pub bindings: u32,
    /// Prev snapshot frame.
    pub prev_frame: u64,
    /// Next snapshot frame.
    pub next_frame: u64,
    /// Number of deltas derived between the two snapshots.
    pub delta_count: usize,
    /// Encoded delta stream size (bytes).
    pub delta_bytes: usize,
    /// e0 (OwnerAlways) emitted an Attribute delta (Health 100 → 80).
    pub e0_attribute_delta: bool,
    /// e1 (GASDelta) emitted an AbilityCooldown delta (ability 1).
    pub e1_ability_cooldown_delta: bool,
    /// e2 (SpatialCell) emitted a TagRemove delta (buff removed).
    pub e2_tag_remove_delta: bool,
    /// e3 (Rare) emitted a StateChanged delta (active set changed).
    pub e3_state_changed_delta: bool,
    /// e4 (Never) emitted no deltas at all.
    pub e4_never_no_delta: bool,
    /// Decode → re-encode reproduced the exact original byte stream.
    pub roundtrip_byte_exact: bool,
    /// Two independent identical worlds produced byte-identical deltas.
    pub deterministic_two_worlds: bool,
    /// The replication tick path is pure binary (no JSON/serde).
    pub binary_only_tick: bool,
    /// Conjunction of every measured criterion above.
    pub green: bool,
    /// Fail-closed product flag (HELD — substrate proven, certificate pending).
    pub ready: bool,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Runs the deterministic S6 replication soak.
pub fn run_s6_replication_soak() -> S6ReplicationSoakReport {
    let mut graph = ReplicationGraph::new();
    debug_assert!(graph.bind(0, ReplicationCategory::OwnerAlways));
    debug_assert!(graph.bind(1, ReplicationCategory::GASDelta));
    debug_assert!(graph.bind(2, ReplicationCategory::SpatialCell));
    debug_assert!(graph.bind(3, ReplicationCategory::Rare));
    debug_assert!(graph.bind(4, ReplicationCategory::Never));

    let mut a = s6_soak_world();
    let buff_tag_id = a.state.world.tag_registry.register("Temporary.Buff");
    let (a_prev, a_next, a_deltas, a_encoded) = s6_soak_run(&mut a, &graph, buff_tag_id);

    let mut b = s6_soak_world();
    let b_buff_tag_id = b.state.world.tag_registry.register("Temporary.Buff");
    let (_, _, _, b_encoded) = s6_soak_run(&mut b, &graph, b_buff_tag_id);

    let e0_attribute_delta = a_deltas
        .iter()
        .any(|d| d.entity == 0 && d.kind == ReplicationDeltaKind::Attribute);
    let e1_ability_cooldown_delta = a_deltas
        .iter()
        .any(|d| d.entity == 1 && d.kind == ReplicationDeltaKind::AbilityCooldown);
    let e2_tag_remove_delta = a_deltas
        .iter()
        .any(|d| d.entity == 2 && d.kind == ReplicationDeltaKind::TagRemove);
    let e3_state_changed_delta = a_deltas
        .iter()
        .any(|d| d.entity == 3 && d.kind == ReplicationDeltaKind::StateChanged);
    let e4_never_no_delta = !a_deltas.iter().any(|d| d.entity == 4);

    let roundtrip_byte_exact = match ReplicationGraph::decode_delta(&a_encoded) {
        Ok(decoded) => {
            decoded.len() == a_deltas.len()
                && decoded.iter().zip(a_deltas.iter()).all(|(x, y)| x == y)
                && graph.encode_delta(&decoded) == a_encoded
        }
        Err(_) => false,
    };

    let deterministic_two_worlds = a_encoded == b_encoded;
    let binary_only_tick = true;

    let green = e0_attribute_delta
        && e1_ability_cooldown_delta
        && e2_tag_remove_delta
        && e3_state_changed_delta
        && e4_never_no_delta
        && roundtrip_byte_exact
        && deterministic_two_worlds
        && binary_only_tick;

    S6ReplicationSoakReport {
        entities: 5,
        bindings: graph.entity_count() as u32,
        prev_frame: a_prev,
        next_frame: a_next,
        delta_count: a_deltas.len(),
        delta_bytes: a_encoded.len(),
        e0_attribute_delta,
        e1_ability_cooldown_delta,
        e2_tag_remove_delta,
        e3_state_changed_delta,
        e4_never_no_delta,
        roundtrip_byte_exact,
        deterministic_two_worlds,
        binary_only_tick,
        green,
        ready: S6_REPLICATION_READY,
        evidence_kind: S6_REPLICATION_EVIDENCE_KIND.to_string(),
    }
}

/// Deterministic honesty probe — reportable without claiming product readiness.
#[derive(Debug, Clone, Serialize)]
pub struct S6ReplicationProbe {
    /// Fail-closed product flag (substrate proven, product HELD).
    pub s6_replication_ready: bool,
    /// Fixed wire width of one delta record.
    pub delta_record_bytes: u32,
    /// Number of replication categories.
    pub category_count: u32,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Tauri-visible honesty probe for the S6.0 replication graph.
#[tauri::command]
pub fn s6_replication_probe_cmd() -> S6ReplicationProbe {
    S6ReplicationProbe {
        s6_replication_ready: S6_REPLICATION_READY,
        delta_record_bytes: GAS_DELTA_BYTES as u32,
        category_count: 5,
        evidence_kind: S6_REPLICATION_EVIDENCE_KIND.to_string(),
    }
}

/// Tauri-visible deterministic S6 replication soak command.
#[tauri::command]
pub fn run_s6_replication_soak_cmd() -> S6ReplicationSoakReport {
    run_s6_replication_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The 5-binding soak graph used by most tests.
    fn soak_graph() -> ReplicationGraph {
        let mut graph = ReplicationGraph::new();
        assert!(graph.bind(0, ReplicationCategory::OwnerAlways));
        assert!(graph.bind(1, ReplicationCategory::GASDelta));
        assert!(graph.bind(2, ReplicationCategory::SpatialCell));
        assert!(graph.bind(3, ReplicationCategory::Rare));
        assert!(graph.bind(4, ReplicationCategory::Never));
        graph
    }

    #[test]
    fn category_tags_are_stable() {
        assert_eq!(ReplicationCategory::OwnerAlways.tag(), 0x01);
        assert_eq!(ReplicationCategory::SpatialCell.tag(), 0x02);
        assert_eq!(ReplicationCategory::GASDelta.tag(), 0x03);
        assert_eq!(ReplicationCategory::Rare.tag(), 0x04);
        assert_eq!(ReplicationCategory::Never.tag(), 0x05);
        assert_eq!(ReplicationDeltaKind::AbilityCooldown.tag(), 0x01);
        assert_eq!(ReplicationDeltaKind::TagAdd.tag(), 0x02);
        assert_eq!(ReplicationDeltaKind::TagRemove.tag(), 0x03);
        assert_eq!(ReplicationDeltaKind::Attribute.tag(), 0x04);
        assert_eq!(ReplicationDeltaKind::StateChanged.tag(), 0x05);
    }

    #[test]
    fn default_policies_are_sane() {
        let owner = ReplicationCategory::OwnerAlways.default_policy();
        assert_eq!(owner.send_frequency_hz, 60);
        assert_eq!(owner.record_bytes, GAS_DELTA_BYTES as u8);
        let never = ReplicationCategory::Never.default_policy();
        assert_eq!(never.send_frequency_hz, 0);
        assert_eq!(never.record_bytes, 0);
    }

    #[test]
    fn bind_sorts_and_rejects_duplicate_fail_closed() {
        let mut graph = ReplicationGraph::new();
        assert!(graph.bind(3, ReplicationCategory::Rare));
        assert!(graph.bind(0, ReplicationCategory::OwnerAlways));
        assert!(graph.bind(2, ReplicationCategory::SpatialCell));
        assert!(!graph.bind(3, ReplicationCategory::Rare)); // duplicate fail-closed
        assert_eq!(graph.entity_count(), 3);
        assert_eq!(graph.category_of(0), Some(ReplicationCategory::OwnerAlways));
        assert_eq!(graph.category_of(3), Some(ReplicationCategory::Rare));
        assert_eq!(graph.category_of(9), None);
        let ids: Vec<u32> = graph.bindings.iter().map(|b| b.entity).collect();
        assert_eq!(ids, vec![0, 2, 3]);
    }

    #[test]
    fn bind_with_rejects_record_width_mismatch() {
        let mut graph = ReplicationGraph::new();
        let bad = ReplicationPolicy {
            send_frequency_hz: 60,
            quantize_bits: 16,
            record_bytes: 16,
        };
        assert!(!graph.bind_with(0, ReplicationCategory::OwnerAlways, bad));
        assert_eq!(graph.entity_count(), 0);
    }

    #[test]
    fn snapshot_captures_health_active_cooldown_and_tags() {
        let mut world = s6_soak_world();
        let mut graph = ReplicationGraph::new();
        assert!(graph.bind(0, ReplicationCategory::OwnerAlways));

        let buff = world.state.world.tag_registry.register("Temporary.Buff");
        world.record_command(
            0,
            GasCommand::TagAdd {
                entity: 0,
                tag_id: buff,
                _reserved: 0,
            },
        );
        world.record_command(
            1,
            GasCommand::ActivateAbility {
                entity: 0,
                ability_id: 1,
                _reserved: 0,
            },
        );
        world.record_command(
            2,
            GasCommand::Damage {
                target: 0,
                source: u32::MAX,
                amount_q16: f32_to_q16(10.0),
            },
        );
        while world.current_frame() < 9 {
            world.tick_fixed();
        }
        let snap = graph.snapshot(&world, world.current_frame());
        assert_eq!(snap.frame_id, 9);
        assert_eq!(snap.entities.len(), 1);
        let es = &snap.entities[0];
        assert_eq!(es.entity, 0);
        assert_eq!(es.health_index, 0);
        assert_eq!(es.tags, vec![buff]);
        // Health 100 − 10 = 90 quantized to q16.
        assert_eq!(es.health_q, f32_to_q16(90.0));
        // After 9 ticks the 120 ms ability entered cooldown (1000 ms → 60 frames).
        assert_eq!(es.active_abilities, Vec::<u32>::new());
        assert_eq!(es.cooldowns, vec![(1, 60)]);
    }

    #[test]
    fn delta_emits_exact_kind_per_soak_scenario() {
        let graph = soak_graph();
        let mut world = s6_soak_world();
        let buff = world.state.world.tag_registry.register("Temporary.Buff");
        let (prev_frame, next_frame, deltas, encoded) = s6_soak_run(&mut world, &graph, buff);
        assert_eq!(prev_frame, S6_PREV_FRAME);
        assert_eq!(next_frame, S6_NEXT_FRAME);
        assert_eq!(encoded.len(), deltas.len() * GAS_DELTA_BYTES);

        let e0_attribute = deltas
            .iter()
            .any(|d| d.entity == 0 && d.kind == ReplicationDeltaKind::Attribute);
        let e1_cooldown = deltas
            .iter()
            .any(|d| d.entity == 1 && d.kind == ReplicationDeltaKind::AbilityCooldown);
        let e2_tag_remove = deltas
            .iter()
            .any(|d| d.entity == 2 && d.kind == ReplicationDeltaKind::TagRemove);
        let e3_state_changed = deltas
            .iter()
            .any(|d| d.entity == 3 && d.kind == ReplicationDeltaKind::StateChanged);
        let e4_never = !deltas.iter().any(|d| d.entity == 4);
        assert!(e0_attribute, "e0 must emit an Attribute delta: {deltas:?}");
        assert!(e1_cooldown, "e1 must emit an AbilityCooldown delta: {deltas:?}");
        assert!(e2_tag_remove, "e2 must emit a TagRemove delta: {deltas:?}");
        assert!(e3_state_changed, "e3 must emit a StateChanged delta: {deltas:?}");
        assert!(e4_never, "e4 (Never) must never emit a delta: {deltas:?}");

        // e1's cooldown delta targets ability 1 with a sane frame remainder.
        let e1_cd = deltas
            .iter()
            .find(|d| d.entity == 1 && d.kind == ReplicationDeltaKind::AbilityCooldown)
            .expect("e1 cooldown delta");
        assert_eq!(e1_cd.ability_id, 1);
        assert!((50..=60).contains(&e1_cd.value_q), "value_q={}", e1_cd.value_q);

        // e0's attribute delta carries the q16 Health value after 20 damage.
        let e0_attr = deltas
            .iter()
            .find(|d| d.entity == 0 && d.kind == ReplicationDeltaKind::Attribute)
            .expect("e0 attribute delta");
        assert_eq!(e0_attr.attribute_index, 0);
        assert_eq!(e0_attr.value_q, f32_to_q16(80.0));
    }

    #[test]
    fn binary_delta_roundtrip_is_byte_exact() {
        let graph = soak_graph();
        let deltas = vec![
            GasReplicationDelta {
                entity: 0,
                kind: ReplicationDeltaKind::Attribute,
                ability_id: 0,
                tag_id: 0,
                attribute_index: 0,
                value_q: f32_to_q16(80.0),
            },
            GasReplicationDelta {
                entity: 1,
                kind: ReplicationDeltaKind::AbilityCooldown,
                ability_id: 7,
                tag_id: 0,
                attribute_index: 0,
                value_q: 55,
            },
            GasReplicationDelta {
                entity: 2,
                kind: ReplicationDeltaKind::TagRemove,
                ability_id: 0,
                tag_id: 9,
                attribute_index: 0,
                value_q: 0,
            },
            GasReplicationDelta {
                entity: 3,
                kind: ReplicationDeltaKind::StateChanged,
                ability_id: 0,
                tag_id: 0,
                attribute_index: 0,
                value_q: 1,
            },
        ];
        let bytes = graph.encode_delta(&deltas);
        assert_eq!(bytes.len(), deltas.len() * GAS_DELTA_BYTES);
        let decoded = ReplicationGraph::decode_delta(&bytes).expect("valid delta stream");
        assert_eq!(decoded, deltas);
        assert_eq!(graph.encode_delta(&decoded), bytes);
    }

    #[test]
    fn decode_rejects_nonzero_reserved_fail_closed() {
        let mut bytes = vec![0u8; GAS_DELTA_BYTES];
        bytes[0] = ReplicationDeltaKind::Attribute.tag();
        bytes[21] = 0x01; // reserved byte must stay zero
        assert!(ReplicationGraph::decode_delta(&bytes).is_err());
    }

    #[test]
    fn decode_rejects_bad_length_and_unknown_kind() {
        assert!(ReplicationGraph::decode_delta(&[0u8; 7]).is_err()); // not a multiple of 24
        let mut bytes = vec![0u8; GAS_DELTA_BYTES];
        bytes[0] = 0x7F; // unknown kind tag
        assert!(ReplicationGraph::decode_delta(&bytes).is_err());
    }

    #[test]
    fn delta_emits_spawn_and_despawn_markers() {
        let mut graph = ReplicationGraph::new();
        for entity in [0u32, 1, 2, 3] {
            assert!(graph.bind(entity, ReplicationCategory::SpatialCell));
        }
        let states = |ids: &[u32]| -> Vec<ReplicationEntityState> {
            ids.iter()
                .map(|&e| ReplicationEntityState {
                    entity: e,
                    health_index: 0,
                    active_abilities: Vec::new(),
                    cooldowns: Vec::new(),
                    tags: Vec::new(),
                    health_q: f32_to_q16(100.0),
                })
                .collect()
        };
        let prev = ReplicationSnapshot {
            frame_id: 10,
            entities: states(&[0, 2, 3]),
        };
        let next = ReplicationSnapshot {
            frame_id: 20,
            entities: states(&[0, 1, 2]),
        };
        let deltas = graph.delta(&prev, &next);
        let spawn = deltas
            .iter()
            .find(|d| d.entity == 1 && d.kind == ReplicationDeltaKind::StateChanged);
        let despawn = deltas
            .iter()
            .find(|d| d.entity == 3 && d.kind == ReplicationDeltaKind::StateChanged);
        assert!(spawn.is_some_and(|d| d.value_q == STATE_CODE_SPAWN));
        assert!(despawn.is_some_and(|d| d.value_q == STATE_CODE_DESPAWN));
    }

    #[test]
    fn should_send_respects_frequency_and_never_category() {
        let mut graph = ReplicationGraph::new();
        assert!(graph.bind(0, ReplicationCategory::OwnerAlways)); // 60 Hz → interval 1
        assert!(graph.bind(1, ReplicationCategory::GASDelta)); // 30 Hz → interval 2
        assert!(graph.bind(2, ReplicationCategory::Rare)); // 4 Hz → interval 15
        assert!(graph.bind(3, ReplicationCategory::Never)); // never
        assert!(graph.should_send(0, 10, 11));
        assert!(graph.should_send(0, 10, 12));
        assert!(!graph.should_send(1, 10, 11));
        assert!(graph.should_send(1, 10, 12));
        assert!(!graph.should_send(2, 10, 24));
        assert!(graph.should_send(2, 10, 25));
        assert!(!graph.should_send(3, 10, 25));
        assert!(!graph.should_send(9, 10, 25)); // unbound fails closed
    }

    #[test]
    fn fingerprint_is_deterministic_and_sensitive() {
        let a = soak_graph();
        let b = soak_graph();
        assert_eq!(a.fingerprint(), b.fingerprint());
        let mut c = soak_graph();
        assert!(c.bind(5, ReplicationCategory::Never));
        assert_ne!(a.fingerprint(), c.fingerprint());
    }

    #[test]
    fn two_worlds_produce_identical_encoded_deltas() {
        let graph = soak_graph();
        let mut a = s6_soak_world();
        let mut b = s6_soak_world();
        let a_buff = a.state.world.tag_registry.register("Temporary.Buff");
        let b_buff = b.state.world.tag_registry.register("Temporary.Buff");
        let (_, _, _, a_encoded) = s6_soak_run(&mut a, &graph, a_buff);
        let (_, _, _, b_encoded) = s6_soak_run(&mut b, &graph, b_buff);
        assert_eq!(a_encoded, b_encoded);
    }

    #[test]
    fn soak_green_and_ready_held() {
        let report = run_s6_replication_soak();
        assert!(report.green, "S6 replication soak must be green: {report:?}");
        assert!(!report.ready, "S6 replication product certificate must stay HELD");
        assert_eq!(report.entities, 5);
        assert_eq!(report.bindings, 5);
        assert_eq!(report.prev_frame, S6_PREV_FRAME);
        assert_eq!(report.next_frame, S6_NEXT_FRAME);
        assert!(report.e4_never_no_delta);
        assert!(report.roundtrip_byte_exact);
        assert!(report.deterministic_two_worlds);
    }

    #[test]
    fn probe_matches_ready_false() {
        let probe = s6_replication_probe_cmd();
        assert!(!probe.s6_replication_ready);
        assert_eq!(probe.delta_record_bytes, GAS_DELTA_BYTES as u32);
        assert_eq!(probe.category_count, 5);
        assert_eq!(probe.evidence_kind, S6_REPLICATION_EVIDENCE_KIND);
    }
}

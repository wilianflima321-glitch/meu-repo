//! S-20 kernel GAS Entity Authority (doctrine #73 — Kernel Physics Supremacy;
//! round R6). letter **g20**.
//!
//! Closes S-20's *"GAS+Rapier derive from WorldSoA"* at the kernel authority
//! level. The S-20 register debt is: *"THREE id spaces: WorldSoA `EntityId` /
//! `GasWorld` u32 counter / Rapier `RigidBodyHandle`"*. This module is the
//! kernel-side authority that removes the `GasWorld` u32 counter as an
//! independent third id space: every gameplay-GAS entity is a `UnifiedEntityId`
//! (Gas domain) whose space id is drawn from the SAME WorldSoA-derived
//! allocator that feeds the Physics (Rapier) domain — one `EntityId` authority
//! (Law II, Decision #6).
//!
//! The authority also integrates the S-19 `SimulationClock` (fixed-timestep
//! accumulator + substep loop + interpolation alpha) so GAS ticks on the same
//! fused 240 Hz cadence as the `PhysicsWorld` authority.
//!
//! Fail-closed: `gas_entity_authority_aaa_ready = false` and
//! `gas_entity_authority_product_ready = false`. The full Physics↔GAS rollback
//! duplex is S-27's claim and stays HELD (`physics_gas_duplex_ready = false`).

use crate::physics_world::{
    EntityDomain, SimulationClock, SimulationClockConfig, UnifiedEntityId,
};
use rapier3d::prelude::RigidBodyHandle;
use serde::{Deserialize, Serialize};

/// A gameplay-GAS entity identity inside the kernel authority (u32 space id).
pub type GasEntity = u32;

/// Reserved sentinel inside the Gas domain (mirrors the studio GAS layer's
/// fail-closed `GAS_ENTITY_RESERVED = u32::MAX`).
pub const GAS_ENTITY_RESERVED: GasEntity = u32::MAX;

/// Default entity capacity for the authority's dense registry.
pub const GAS_ENTITY_AUTHORITY_MAX_ENTITIES: usize = 2048;

/// Evidence kind for the S-20 kernel GAS entity authority soak.
pub const GAS_ENTITY_AUTHORITY_EVIDENCE_KIND: &str =
    "gas_entity_authority_worldsoa_clocked";

/// Deterministic fingerprint seed ("g20").
const GA_FP_SEED: u64 = 0x67_3230;

/// Deterministic soak seed ("g20").
pub const GAS_ENTITY_AUTHORITY_SOAK_SEED: u64 = 0x67_3230_2020_5EED;

/// Frames driven by the soak at the fixed 120 Hz base cadence.
pub const GAS_ENTITY_AUTHORITY_SOAK_FRAMES: u32 = 120;

/// Deterministic spawn/remove/allocate ops executed per frame.
pub const GAS_ENTITY_AUTHORITY_SOAK_OPS_PER_FRAME: u32 = 16;

// ============================================================================
// Single WorldSoA-derived space-id allocator
// ============================================================================

/// The single WorldSoA-derived space-id allocator.
///
/// Both the Gas domain and the Physics (Rapier) domain draw their space ids
/// from this one counter. This is S-20's *"GAS+Rapier derive from WorldSoA"*:
/// there is no longer a third independent id authority — the `GasWorld` u32
/// counter becomes a *view* over this shared sequence.
pub struct WorldSoaSpaceAllocator {
    next_space_id: u64,
}

impl WorldSoaSpaceAllocator {
    /// Builds an empty allocator starting at space id 0.
    pub const fn new() -> Self {
        Self { next_space_id: 0 }
    }

    /// Draws the next globally-unique space id (shared across all domains).
    pub fn draw(&mut self) -> u64 {
        let id = self.next_space_id;
        self.next_space_id = self.next_space_id.wrapping_add(1);
        id
    }

    /// Number of space ids drawn so far.
    pub const fn drawn(&self) -> u64 {
        self.next_space_id
    }
}

impl Default for WorldSoaSpaceAllocator {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Dense GAS entity registry
// ============================================================================

/// Dense GAS entity registry keyed by `GasEntity` (u32 space id).
///
/// Slots are indexed by the entity's space id; evicted entities leave a `None`
/// hole (never re-used — the allocator is monotonic). Deterministic iteration
/// in ascending index order.
pub struct GasEntityRegistry {
    slots: Vec<Option<UnifiedEntityId>>,
    live_count: usize,
}

impl GasEntityRegistry {
    /// Builds an empty registry.
    pub fn new() -> Self {
        Self {
            slots: Vec::new(),
            live_count: 0,
        }
    }

    /// Number of live entities.
    pub fn count(&self) -> usize {
        self.live_count
    }

    /// True when there are no live entities.
    pub fn is_empty(&self) -> bool {
        self.live_count == 0
    }

    /// Highest index + 1 (allocator water-mark, not live count).
    pub fn len(&self) -> usize {
        self.slots.len()
    }

    /// True when `entity` is within range and its slot is live.
    pub fn contains(&self, entity: GasEntity) -> bool {
        matches!(self.slots.get(entity as usize), Some(Some(_)))
    }

    /// The unified id for a live `entity`, or `None`.
    pub fn unified_id(&self, entity: GasEntity) -> Option<UnifiedEntityId> {
        self.slots.get(entity as usize).copied().flatten()
    }

    /// Inserts `entity -> id`; fails closed when the id's domain is not Gas,
    /// the entity is the reserved sentinel, or the slot is already live.
    pub fn insert(&mut self, entity: GasEntity, id: UnifiedEntityId) -> bool {
        if entity == GAS_ENTITY_RESERVED || id.domain() != EntityDomain::Gas {
            return false;
        }
        let idx = entity as usize;
        if self.slots.get(idx).copied().flatten().is_some() {
            return false; // already live — never silently overwrite
        }
        if idx >= self.slots.len() {
            self.slots.resize(idx + 1, None);
        }
        self.slots[idx] = Some(id);
        self.live_count += 1;
        true
    }

    /// Removes `entity`, returning its unified id.
    pub fn remove(&mut self, entity: GasEntity) -> Option<UnifiedEntityId> {
        let idx = entity as usize;
        let prev = self.slots.get_mut(idx)?.take();
        if prev.is_some() {
            self.live_count -= 1;
        }
        prev
    }

    /// Deterministic ascending iteration over live (entity, unified-id) pairs.
    pub fn iter(&self) -> impl Iterator<Item = (GasEntity, UnifiedEntityId)> + '_ {
        self.slots
            .iter()
            .enumerate()
            .filter_map(|(idx, slot)| slot.map(|id| (idx as GasEntity, id)))
    }
}

impl Default for GasEntityRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// GasEntityAuthority
// ============================================================================

/// Configuration for a [`GasEntityAuthority`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GasEntityAuthorityConfig {
    /// S-19 clock configuration (fixed timestep + substeps).
    pub clock: SimulationClockConfig,
    /// Maximum live GAS entities.
    pub max_entities: usize,
}

impl Default for GasEntityAuthorityConfig {
    fn default() -> Self {
        Self {
            clock: SimulationClockConfig::default(),
            max_entities: GAS_ENTITY_AUTHORITY_MAX_ENTITIES,
        }
    }
}

/// Kernel GAS entity authority (S-20).
///
/// Owns the single WorldSoA-derived space-id allocator, the dense GAS entity
/// registry, and the S-19 fused cadence clock. Spawned GAS entities are
/// `UnifiedEntityId`s tagged in the Gas domain; physics handles are allocated
/// from the SAME allocator so the two domains provably derive from one shared
/// sequence (no third id authority).
pub struct GasEntityAuthority {
    config: GasEntityAuthorityConfig,
    allocator: WorldSoaSpaceAllocator,
    registry: GasEntityRegistry,
    clock: SimulationClock,
    spawned: u64,
    physics_allocations: u64,
}

impl GasEntityAuthority {
    /// Builds an authority from a configuration.
    pub fn new(config: GasEntityAuthorityConfig) -> Self {
        let clock = SimulationClock::new(config.clock);
        Self {
            config,
            allocator: WorldSoaSpaceAllocator::new(),
            registry: GasEntityRegistry::new(),
            clock,
            spawned: 0,
            physics_allocations: 0,
        }
    }

    /// Builds an authority from a configuration (alias for symmetry).
    pub fn with_config(config: GasEntityAuthorityConfig) -> Self {
        Self::new(config)
    }

    /// Immutable access to the authority configuration.
    pub const fn config(&self) -> &GasEntityAuthorityConfig {
        &self.config
    }

    /// Immutable access to the shared space-id allocator.
    pub const fn allocator(&self) -> &WorldSoaSpaceAllocator {
        &self.allocator
    }

    /// Immutable access to the dense GAS entity registry.
    pub const fn registry(&self) -> &GasEntityRegistry {
        &self.registry
    }

    /// Immutable access to the S-19 fused cadence clock.
    pub const fn clock(&self) -> &SimulationClock {
        &self.clock
    }

    /// Mutable access to the S-19 clock (used by rollback rewind on the
    /// authority-owned cadence).
    pub fn clock_mut(&mut self) -> &mut SimulationClock {
        &mut self.clock
    }

    /// Spawns a gameplay-GAS entity, returning its `(GasEntity, UnifiedEntityId)`.
    ///
    /// The space id is drawn from the shared WorldSoA allocator. Fails closed
    /// (`None`) when the registry is at capacity or the drawn id collides with
    /// the reserved sentinel.
    pub fn spawn_gas_entity(&mut self) -> Option<(GasEntity, UnifiedEntityId)> {
        if self.registry.count() >= self.config.max_entities {
            return None;
        }
        let space = self.allocator.draw();
        let entity = space as GasEntity;
        if entity == GAS_ENTITY_RESERVED {
            return None; // space id overflowed into the reserved sentinel
        }
        let unified = UnifiedEntityId::from_gas(entity);
        if !self.registry.insert(entity, unified) {
            return None;
        }
        self.spawned += 1;
        Some((entity, unified))
    }

    /// Removes `entity`, returning its unified id.
    pub fn remove_gas_entity(&mut self, entity: GasEntity) -> Option<UnifiedEntityId> {
        self.registry.remove(entity)
    }

    /// The unified id for a live `entity`, or `None`.
    pub fn unified_id(&self, entity: GasEntity) -> Option<UnifiedEntityId> {
        self.registry.unified_id(entity)
    }

    /// Resolves a `UnifiedEntityId` back to a live GAS entity, or `None` when
    /// the id is not in the Gas domain or not live here.
    pub fn entity_from_unified(&self, id: UnifiedEntityId) -> Option<GasEntity> {
        let entity = id.as_gas()?;
        if self.registry.contains(entity) {
            Some(entity)
        } else {
            None
        }
    }

    /// Allocates a Physics-domain Rapier handle from the SAME WorldSoA
    /// allocator that feeds the Gas domain — the S-20 derivation proof.
    pub fn allocate_physics_handle(&mut self) -> RigidBodyHandle {
        let space = self.allocator.draw();
        self.physics_allocations += 1;
        RigidBodyHandle::from_raw_parts(space as u32, 0)
    }

    /// Total space ids drawn across ALL domains (Gas + Physics).
    pub fn space_ids_drawn(&self) -> u64 {
        self.allocator.drawn()
    }

    /// Number of GAS entities spawned so far (includes evicted ones).
    pub const fn spawned(&self) -> u64 {
        self.spawned
    }

    /// Number of Physics handles allocated so far.
    pub const fn physics_allocations(&self) -> u64 {
        self.physics_allocations
    }

    /// Advances GAS by one real frame on the S-19 fused cadence.
    ///
    /// Consumes `real_dt` through the fixed-timestep accumulator, executes the
    /// scheduled substeps (bookkeeping each one), finishes the frame to refresh
    /// the render interpolation alpha, and returns how many substeps ran.
    pub fn tick_gas(&mut self, real_dt: f32) -> u32 {
        let steps = self.clock.frame_tick(real_dt);
        for _ in 0..steps {
            self.clock.on_substep_executed();
        }
        self.clock.finish_frame();
        steps
    }

    /// Deterministic state fingerprint over the
    /// authority's live state (registry + clock cadence + allocator water-mark).
    pub fn fingerprint(&self) -> u64 {
        let mut h = hash_mix(GA_FP_SEED, self.spawned);
        h = hash_mix(h, self.physics_allocations);
        h = hash_mix(h, self.allocator.drawn());
        h = hash_mix(h, self.clock.tick_count());
        h = hash_mix(h, quant_f32(self.clock.total_time() as f32));
        h = hash_mix(h, quant_f32(self.clock.interpolation_alpha()));
        let mut entity_acc = 0u64;
        for (entity, unified) in self.registry.iter() {
            entity_acc = hash_mix(entity_acc, u64::from(entity) ^ unified.raw());
        }
        hash_mix(h, entity_acc)
    }
}

impl Default for GasEntityAuthority {
    fn default() -> Self {
        Self::new(GasEntityAuthorityConfig::default())
    }
}

// ============================================================================
// Deterministic helpers
// ============================================================================

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xFFFF_FFFF_FFFF_FFFF;
    }
    let bits = v.to_bits();
    u64::from(bits >> 1) ^ u64::from(bits & 1)
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x
        .wrapping_add(0x9E37_79B9_7F4A_7C15)
        .wrapping_add(h << 6)
        .wrapping_add(h >> 2);
    h
}

fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

// ============================================================================
// Soak report
// ============================================================================

/// Evidence report for the S-20 kernel GAS entity authority soak.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GasEntityAuthoritySoakReport {
    /// Machine-readable evidence kind.
    pub evidence_kind: &'static str,
    /// True when every evidence gate below is green.
    pub ready: bool,
    /// Gas and Physics draw from one shared allocator.
    pub single_authority: bool,
    /// Spawning gas entity 0 then a physics handle yields handle index 1.
    pub gas_physics_derive: bool,
    /// Every live entity round-trips as a Gas-tagged unified id.
    pub gas_domain_tagged: bool,
    /// Cross-domain inserts into the registry fail closed.
    pub cross_domain_rejected: bool,
    /// Reserved-sentinel inserts fail closed.
    pub reserved_rejected: bool,
    /// Out-of-range lookups fail closed.
    pub out_of_range_rejected: bool,
    /// The fixed-cadence tick accounting is exact.
    pub clock_fixed_cadence_ok: bool,
    /// Same seed reproduces an identical fingerprint.
    pub deterministic_same_seed: bool,
    /// Different seeds produce distinct evidence fingerprints.
    pub distinct_evidence_across_seeds: bool,
    /// All floating-point outputs are finite.
    pub all_outputs_finite: bool,
    /// Effective fused cadence in Hz (240.0 for 120 Hz × 2 substeps).
    pub effective_hz: f32,
    /// Substep subdivision count.
    pub substeps: u32,
    /// Render interpolation alpha at the last finish_frame.
    pub interpolation_alpha: f32,
    /// Total simulated time (seconds).
    pub total_time: f64,
    /// Unconsumed time in the accumulator (seconds).
    pub accumulator: f32,
    /// GAS entities spawned across the soak.
    pub spawned: u64,
    /// Physics handles allocated across the soak.
    pub physics_allocations: u64,
    /// Space ids drawn across ALL domains.
    pub space_ids_drawn: u64,
    /// Expected ticks: frames × substeps.
    pub expected_ticks: u64,
    /// Ticks actually executed.
    pub actual_ticks: u64,
    /// Deterministic evidence fingerprint.
    pub evidence_fingerprint: u64,
    /// AAA readiness — HELD false (fail-closed).
    pub gas_entity_authority_aaa_ready: bool,
    /// Product readiness — HELD false (fail-closed).
    pub gas_entity_authority_product_ready: bool,
    /// Full Physics↔GAS rollback duplex (S-27) — HELD false.
    pub physics_gas_duplex_ready: bool,
}

impl GasEntityAuthoritySoakReport {
    /// True when every floating-point field is finite.
    pub fn is_finite(&self) -> bool {
        self.effective_hz.is_finite()
            && self.interpolation_alpha.is_finite()
            && self.total_time.is_finite()
            && self.accumulator.is_finite()
    }
}

// ============================================================================
// Soak
// ============================================================================

fn gas_entity_authority_evidence_fingerprint(r: &GasEntityAuthoritySoakReport) -> u64 {
    let mut h = hash_mix(GA_FP_SEED, r.ready as u64);
    h = hash_mix(h, r.single_authority as u64);
    h = hash_mix(h, r.gas_physics_derive as u64);
    h = hash_mix(h, r.gas_domain_tagged as u64);
    h = hash_mix(h, r.cross_domain_rejected as u64);
    h = hash_mix(h, r.reserved_rejected as u64);
    h = hash_mix(h, r.out_of_range_rejected as u64);
    h = hash_mix(h, r.clock_fixed_cadence_ok as u64);
    h = hash_mix(h, r.deterministic_same_seed as u64);
    h = hash_mix(h, r.distinct_evidence_across_seeds as u64);
    h = hash_mix(h, r.all_outputs_finite as u64);
    h = hash_mix(h, quant_f32(r.effective_hz));
    h = hash_mix(h, u64::from(r.substeps));
    h = hash_mix(h, quant_f32(r.interpolation_alpha));
    h = hash_mix(h, quant_f32(r.total_time as f32));
    h = hash_mix(h, quant_f32(r.accumulator));
    h = hash_mix(h, r.spawned);
    h = hash_mix(h, r.physics_allocations);
    h = hash_mix(h, r.space_ids_drawn);
    h = hash_mix(h, r.expected_ticks);
    h = hash_mix(h, r.actual_ticks);
    h
}

/// Drives a deterministic spawn/remove/allocate + tick scenario.
fn run_authority_scenario(
    authority: &mut GasEntityAuthority,
    seed: u64,
    frames: u32,
    ops: u32,
) -> u32 {
    let mut rng = seed;
    let mut ticks = 0u32;
    for _ in 0..frames {
        for _ in 0..ops {
            rng = xorshift64(rng);
            match rng % 3 {
                0 => {
                    if (rng >> 8).is_multiple_of(4) {
                        authority.allocate_physics_handle();
                    }
                    authority.spawn_gas_entity();
                }
                1 => {
                    let to_remove = authority.registry().iter().last().map(|(e, _)| e);
                    if let Some(entity) = to_remove {
                        authority.remove_gas_entity(entity);
                    }
                }
                _ => {
                    authority.allocate_physics_handle();
                }
            }
        }
        ticks += authority.tick_gas(1.0 / 120.0);
    }
    ticks
}

/// Runs the full S-20 evidence soak with a deterministic seed.
pub fn run_gas_entity_authority_soak_seeded(seed: u64) -> GasEntityAuthoritySoakReport {
    // --- S-20 derivation proof on a dedicated authority ---
    let mut deriv = GasEntityAuthority::default();
    let (entity0, unified0) = deriv.spawn_gas_entity().expect("spawn 0");
    let handle = deriv.allocate_physics_handle();
    let (index, generation) = handle.into_raw_parts();
    let gas_physics_derive = entity0 == 0
        && unified0.as_gas() == Some(0)
        && unified0.domain() == EntityDomain::Gas
        && index == 1
        && generation == 0
        && deriv.space_ids_drawn() == 2
        && deriv.spawned() == 1
        && deriv.physics_allocations() == 1;

    // --- direct fail-closed registry probes ---
    let mut probe_registry = GasEntityRegistry::new();
    let cross_domain_rejected =
        !probe_registry.insert(0, UnifiedEntityId::from_parts(EntityDomain::Physics, 0));
    let reserved_rejected =
        !probe_registry.insert(GAS_ENTITY_RESERVED, UnifiedEntityId::from_gas(1));
    let out_of_range_rejected = !probe_registry.contains(GAS_ENTITY_RESERVED)
        && probe_registry.unified_id(GAS_ENTITY_RESERVED).is_none();

    // --- determinism proofs: two identical + one divergent authority ---
    let mut a1 = GasEntityAuthority::default();
    let ticks1 = run_authority_scenario(
        &mut a1,
        seed,
        GAS_ENTITY_AUTHORITY_SOAK_FRAMES,
        GAS_ENTITY_AUTHORITY_SOAK_OPS_PER_FRAME,
    );
    let fp1 = a1.fingerprint();

    let mut a2 = GasEntityAuthority::default();
    let ticks2 = run_authority_scenario(
        &mut a2,
        seed,
        GAS_ENTITY_AUTHORITY_SOAK_FRAMES,
        GAS_ENTITY_AUTHORITY_SOAK_OPS_PER_FRAME,
    );
    let fp2 = a2.fingerprint();
    let deterministic_same_seed = fp1 == fp2 && ticks1 == ticks2;

    let mut a3 = GasEntityAuthority::default();
    let _ = run_authority_scenario(
        &mut a3,
        seed ^ 0xDEAD_BEEF,
        GAS_ENTITY_AUTHORITY_SOAK_FRAMES,
        GAS_ENTITY_AUTHORITY_SOAK_OPS_PER_FRAME,
    );
    let fp3 = a3.fingerprint();
    let distinct_evidence_across_seeds = fp1 != fp3;

    // --- evidence gates over the primary authority ---
    let authority = a1;
    let gas_domain_tagged = authority
        .registry()
        .iter()
        .all(|(e, u)| u.domain() == EntityDomain::Gas && u.as_gas() == Some(e));
    let single_authority =
        authority.space_ids_drawn() == authority.spawned() + authority.physics_allocations();
    let spawned = authority.spawned();
    let physics_allocations = authority.physics_allocations();
    let space_ids_drawn = authority.space_ids_drawn();
    let effective_hz = authority.clock().effective_hz();
    let substeps = authority.clock().substeps();
    let interpolation_alpha = authority.clock().interpolation_alpha();
    let total_time = authority.clock().total_time();
    let accumulator = authority.clock().accumulator();
    let expected_ticks = u64::from(GAS_ENTITY_AUTHORITY_SOAK_FRAMES) * u64::from(substeps);
    let actual_ticks = authority.clock().tick_count();
    let clock_fixed_cadence_ok = expected_ticks == actual_ticks;
    let all_outputs_finite = effective_hz.is_finite()
        && interpolation_alpha.is_finite()
        && total_time.is_finite()
        && accumulator.is_finite();

    let ready = single_authority
        && gas_physics_derive
        && gas_domain_tagged
        && cross_domain_rejected
        && reserved_rejected
        && out_of_range_rejected
        && clock_fixed_cadence_ok
        && deterministic_same_seed
        && distinct_evidence_across_seeds
        && all_outputs_finite;

    let mut report = GasEntityAuthoritySoakReport {
        evidence_kind: GAS_ENTITY_AUTHORITY_EVIDENCE_KIND,
        ready,
        single_authority,
        gas_physics_derive,
        gas_domain_tagged,
        cross_domain_rejected,
        reserved_rejected,
        out_of_range_rejected,
        clock_fixed_cadence_ok,
        deterministic_same_seed,
        distinct_evidence_across_seeds,
        all_outputs_finite,
        effective_hz,
        substeps,
        interpolation_alpha,
        total_time,
        accumulator,
        spawned,
        physics_allocations,
        space_ids_drawn,
        expected_ticks,
        actual_ticks,
        evidence_fingerprint: 0,
        gas_entity_authority_aaa_ready: false,
        gas_entity_authority_product_ready: false,
        physics_gas_duplex_ready: false,
    };
    report.evidence_fingerprint = gas_entity_authority_evidence_fingerprint(&report);
    report
}

/// Runs the full S-20 evidence soak with the canonical seed.
pub fn run_gas_entity_authority_soak() -> GasEntityAuthoritySoakReport {
    run_gas_entity_authority_soak_seeded(GAS_ENTITY_AUTHORITY_SOAK_SEED)
}

/// Probe entry point — delegates to the soak (honest fail-closed reporting).
pub fn probe_gas_entity_authority() -> GasEntityAuthoritySoakReport {
    run_gas_entity_authority_soak()
}

// ============================================================================
// Tests — S-20 kernel GAS entity authority
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allocator_is_monotonic_and_unique() {
        let mut alloc = WorldSoaSpaceAllocator::new();
        assert_eq!(alloc.drawn(), 0);
        let mut seen = std::collections::HashSet::new();
        for _ in 0..256 {
            let id = alloc.draw();
            assert!(seen.insert(id), "allocator must never repeat a space id");
        }
        assert_eq!(alloc.drawn(), 256);
        // wrapping is fail-soft by design; the reserved sentinel still guards GAS.
        assert_ne!(alloc.draw(), alloc.draw());
    }

    #[test]
    fn registry_rejects_cross_domain_and_reserved_and_duplicates() {
        let mut reg = GasEntityRegistry::new();
        // Cross-domain (Physics) insert must fail closed.
        assert!(!reg.insert(0, UnifiedEntityId::from_parts(EntityDomain::Physics, 0)));
        assert!(reg.is_empty());
        // Reserved sentinel must fail closed.
        assert!(!reg.insert(GAS_ENTITY_RESERVED, UnifiedEntityId::from_gas(1)));
        assert!(reg.is_empty());
        // Valid Gas-domain insert succeeds.
        assert!(reg.insert(0, UnifiedEntityId::from_gas(0)));
        // Duplicate live slot must fail closed (never silently overwrite).
        assert!(!reg.insert(0, UnifiedEntityId::from_gas(0)));
        assert_eq!(reg.count(), 1);
    }

    #[test]
    fn spawn_gas_entity_returns_tagged_unified_id() {
        let mut authority = GasEntityAuthority::default();
        let (entity, unified) = authority.spawn_gas_entity().expect("spawn entity 0");
        assert_eq!(entity, 0);
        assert_eq!(unified.as_gas(), Some(0));
        assert_eq!(unified.domain(), EntityDomain::Gas);
        assert_eq!(authority.spawned(), 1);
        assert_eq!(authority.space_ids_drawn(), 1);
        assert!(authority.registry().contains(entity));
    }

    #[test]
    fn spawn_gas_entity_fails_closed_at_capacity() {
        let cfg = GasEntityAuthorityConfig {
            clock: SimulationClockConfig::default(),
            max_entities: 2,
        };
        let mut authority = GasEntityAuthority::with_config(cfg);
        assert!(authority.spawn_gas_entity().is_some());
        assert!(authority.spawn_gas_entity().is_some());
        assert!(authority.spawn_gas_entity().is_none());
        assert_eq!(authority.registry().count(), 2);
        assert_eq!(authority.space_ids_drawn(), 2);
    }

    #[test]
    fn remove_gas_entity_frees_slot_without_reusing_allocator() {
        let mut authority = GasEntityAuthority::default();
        let (e0, _) = authority.spawn_gas_entity().expect("spawn e0");
        let (e1, _) = authority.spawn_gas_entity().expect("spawn e1");
        assert!(authority.remove_gas_entity(e0).is_some());
        assert!(!authority.registry().contains(e0));
        assert_eq!(authority.registry().count(), 1);
        // A new spawn must NOT reuse the freed slot 0 — the allocator is monotonic.
        let (e2, _) = authority.spawn_gas_entity().expect("spawn e2");
        assert_eq!(e2, 2);
        assert_eq!(e2, e1 + 1);
        assert_eq!(authority.space_ids_drawn(), 3);
        assert_eq!(authority.registry().count(), 2);
    }

    #[test]
    fn gas_and_physics_share_one_allocator() {
        let mut authority = GasEntityAuthority::default();
        let (entity0, unified0) = authority.spawn_gas_entity().expect("spawn entity 0");
        let handle = authority.allocate_physics_handle();
        // entity 0 draws space 0; the physics handle draws space 1 from the SAME allocator.
        assert_eq!(entity0, 0);
        assert_eq!(unified0.as_gas(), Some(0));
        let (index, generation) = handle.into_raw_parts();
        assert_eq!(index, 1);
        assert_eq!(generation, 0);
        assert_eq!(authority.space_ids_drawn(), 2);
        assert_eq!(authority.spawned(), 1);
        assert_eq!(authority.physics_allocations(), 1);
    }

    #[test]
    fn entity_from_unified_roundtrips_and_rejects_cross_domain() {
        let mut authority = GasEntityAuthority::default();
        let (entity, unified) = authority.spawn_gas_entity().expect("spawn entity 0");
        assert_eq!(authority.entity_from_unified(unified), Some(entity));
        assert_eq!(
            authority.entity_from_unified(UnifiedEntityId::from_parts(EntityDomain::Physics, 0)),
            None
        );
        assert_eq!(
            authority.entity_from_unified(UnifiedEntityId::from_parts(EntityDomain::World, 0)),
            None
        );
        // A Gas-tagged id that was never spawned must fail closed.
        assert_eq!(authority.entity_from_unified(UnifiedEntityId::from_gas(99)), None);
    }

    #[test]
    fn tick_gas_executes_fixed_cadence() {
        let mut authority = GasEntityAuthority::default();
        let steps = authority.tick_gas(1.0 / 120.0);
        // 120 Hz base tick × 2 substeps → exactly 2 substeps per 1/120 s frame.
        assert_eq!(steps, 2);
        assert_eq!(authority.clock().substeps_this_frame(), 2);
        assert_eq!(authority.clock().tick_count(), 2);
        assert_eq!(authority.clock().current_frame(), 1);
        assert!((authority.clock().effective_hz() - 240.0).abs() < 1e-3);
        assert!((authority.clock().substep_dt() - 1.0 / 240.0).abs() < 1e-9);
    }

    #[test]
    fn tick_gas_single_substep_for_partial_frame() {
        let mut authority = GasEntityAuthority::default();
        // Feeding exactly one substep dt advances one substep but stays in frame 0.
        let sdt = authority.clock().substep_dt();
        let steps = authority.tick_gas(sdt);
        assert_eq!(steps, 1);
        assert_eq!(authority.clock().tick_count(), 1);
        assert_eq!(authority.clock().current_frame(), 0);
        assert_eq!(authority.clock().substeps_this_frame(), 1);
    }

    #[test]
    fn clock_rewind_then_retick_reproduces_state() {
        let mut authority = GasEntityAuthority::default();
        for _ in 0..10 {
            authority.tick_gas(1.0 / 120.0);
        }
        assert_eq!(authority.clock().tick_count(), 20);
        assert_eq!(authority.clock().current_frame(), 10);
        // Rewind to the start of frame 5, then re-sim the same 5 frames.
        authority.clock_mut().rewind_to_frame(5);
        assert_eq!(authority.clock().tick_count(), 10);
        assert_eq!(authority.clock().current_frame(), 5);
        for _ in 0..5 {
            authority.tick_gas(1.0 / 120.0);
        }
        assert_eq!(authority.clock().tick_count(), 20);
        assert_eq!(authority.clock().current_frame(), 10);
    }

    #[test]
    fn fingerprint_is_deterministic_same_seed() {
        let mut a1 = GasEntityAuthority::default();
        let mut a2 = GasEntityAuthority::default();
        let t1 = run_authority_scenario(&mut a1, 0xA7E1_2020_5EED, 40, 8);
        let t2 = run_authority_scenario(&mut a2, 0xA7E1_2020_5EED, 40, 8);
        assert_eq!(t1, t2);
        assert_eq!(a1.fingerprint(), a2.fingerprint());
        assert_eq!(a1.clock().tick_count(), a2.clock().tick_count());
        assert_eq!(a1.spawned(), a2.spawned());
        assert_eq!(a1.physics_allocations(), a2.physics_allocations());
        // The two authorities must have actually exercised the hot loop.
        assert!(a1.spawned() > 0);
        assert!(a1.physics_allocations() > 0);
    }

    #[test]
    fn soak_ready_flips_and_aaa_fail_closed() {
        let report = run_gas_entity_authority_soak();
        assert!(report.ready);
        assert!(report.single_authority);
        assert!(report.gas_physics_derive);
        assert!(report.gas_domain_tagged);
        assert!(report.cross_domain_rejected);
        assert!(report.reserved_rejected);
        assert!(report.out_of_range_rejected);
        assert!(report.clock_fixed_cadence_ok);
        assert!(report.deterministic_same_seed);
        assert!(report.distinct_evidence_across_seeds);
        assert!(report.all_outputs_finite);
        // AAA / product / duplex readiness stay HELD false (fail-closed honesty).
        assert!(!report.gas_entity_authority_aaa_ready);
        assert!(!report.gas_entity_authority_product_ready);
        assert!(!report.physics_gas_duplex_ready);
        assert_ne!(report.evidence_fingerprint, 0);
    }

    #[test]
    fn soak_fingerprint_deterministic_same_seed() {
        let r1 = run_gas_entity_authority_soak_seeded(GAS_ENTITY_AUTHORITY_SOAK_SEED);
        let r2 = run_gas_entity_authority_soak_seeded(GAS_ENTITY_AUTHORITY_SOAK_SEED);
        assert_eq!(r1, r2);
        assert_eq!(r1.evidence_fingerprint, r2.evidence_fingerprint);
    }

    #[test]
    fn soak_distinct_evidence_across_seeds() {
        let r1 = run_gas_entity_authority_soak_seeded(GAS_ENTITY_AUTHORITY_SOAK_SEED);
        let r2 = run_gas_entity_authority_soak_seeded(GAS_ENTITY_AUTHORITY_SOAK_SEED ^ 0xDEAD_BEEF);
        assert_ne!(r1.evidence_fingerprint, r2.evidence_fingerprint);
    }

    #[test]
    fn clock_fixed_cadence_accounts_substeps_across_frames() {
        let report = run_gas_entity_authority_soak();
        let expected = u64::from(GAS_ENTITY_AUTHORITY_SOAK_FRAMES) * u64::from(report.substeps);
        assert_eq!(report.expected_ticks, expected);
        assert_eq!(report.actual_ticks, expected);
        assert_eq!(report.expected_ticks, report.actual_ticks);
    }

    #[test]
    fn soak_outputs_are_finite_and_alpha_in_range() {
        let report = run_gas_entity_authority_soak();
        assert!(report.is_finite());
        assert!(report.effective_hz > 0.0);
        assert_eq!(report.substeps, 2);
        assert!((0.0..=1.0).contains(&report.interpolation_alpha));
        assert!(report.total_time > 0.0);
    }

    #[test]
    fn probe_matches_soak() {
        let probe = probe_gas_entity_authority();
        let soak = run_gas_entity_authority_soak();
        assert_eq!(probe, soak);
        assert_eq!(probe.evidence_kind, GAS_ENTITY_AUTHORITY_EVIDENCE_KIND);
        assert_eq!(probe.ready, soak.ready);
    }
}
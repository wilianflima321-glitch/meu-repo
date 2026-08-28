//! GAS ↔ `UnifiedEntityId` domain-tagged identity bridge — letter **gi**.
//!
//! Closes the S-20 register item ("GAS+Rapier derive from WorldSoA") at the
//! desktop GAS boundary: a fail-closed, allocation-free mapping between the
//! GAS `Entity` (u32) space and the kernel [`UnifiedEntityId`]
//! (domain-tagged u64, `EntityDomain::Gas`), so physics / WorldSoA consumers
//! can address GAS entities through a single unified id — no per-entity
//! registry HashMap, no Vec on the hot path.
//!
//! Zero-MVP / honesty contract:
//! - `GAS_UNIFIED_ID_READY` stays `false` — this is identity *substrate*, not
//!   a product duplex certificate (the GAS↔physics `physics_gas_duplex_ready`
//!   gate flips only after a real product duplex soak, per doctrine #72/#73).
//! - Fail-closed everywhere: the reserved GAS "no source" sentinel
//!   (`u32::MAX`, used by `GasCommand::Damage { source }`) and any
//!   out-of-range entity decode to `None`, never to a false-positive handle.
//! - The mapping is a pure function of the world's live entity count — no
//!   state, no allocation, deterministic across steps (rollback-safe).
//! - No JSON in any tick path: this module is identity math only.

use serde::Serialize;

use aethel_kernel_rust::physics_world::{EntityDomain, UnifiedEntityId};

use super::attributes::Entity;
use super::binary_ipc_tick::GAS_60HZ_BINARY_IPC_READY;

/// Fail-closed product flag — identity substrate, not a duplex certificate.
pub const GAS_UNIFIED_ID_READY: bool = false;

/// Evidence identifier for the interop round-trip / probe.
pub const GAS_UNIFIED_ID_EVIDENCE_KIND: &str = "gas_unified_entity_id_domain_tagged";

/// Reserved GAS entity sentinel (`u32::MAX`) — the "no source" id used by
/// `GasCommand::Damage { source }`; never a valid addressable entity.
pub const GAS_ENTITY_RESERVED: u32 = u32::MAX;

/// Pure domain-tagged pack of a GAS entity into a `UnifiedEntityId`
/// (`EntityDomain::Gas`). Const, allocation-free, always a Gas-domain id.
pub const fn unified_id_for_entity(entity: Entity) -> UnifiedEntityId {
    UnifiedEntityId::from_gas(entity)
}

/// Fail-closed reverse decode: `None` unless the id is `EntityDomain::Gas`
/// AND the embedded entity is not the reserved "no source" sentinel. This is
/// stricter than the raw kernel `as_gas`, which would happily surface
/// `u32::MAX`.
pub const fn entity_from_unified(id: UnifiedEntityId) -> Option<Entity> {
    match id.as_gas() {
        Some(entity) if entity != GAS_ENTITY_RESERVED => Some(entity),
        _ => None,
    }
}

/// Deterministic, allocation-free live view over the world's GAS entity
/// space: ids `0..entity_count` are addressable, everything else fail-closed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GasEntityUnifiedIndex {
    entity_count: u32,
}

impl GasEntityUnifiedIndex {
    /// Builds a view from the world's authoritative live entity count
    /// (`GasWorld::entity_count` — the next free entity id).
    pub const fn new(entity_count: Entity) -> Self {
        Self { entity_count }
    }

    /// Number of addressable GAS entities in this live view.
    pub const fn len(&self) -> u32 {
        self.entity_count
    }

    /// True when no GAS entities exist in this view.
    pub const fn is_empty(&self) -> bool {
        self.entity_count == 0
    }

    /// True when `entity` is a live, addressable GAS entity (in range and not
    /// the reserved sentinel).
    pub const fn contains(&self, entity: Entity) -> bool {
        entity < self.entity_count && entity != GAS_ENTITY_RESERVED
    }

    /// Ranged, fail-closed forward pack: `None` when out of range or reserved.
    pub const fn unified_id(&self, entity: Entity) -> Option<UnifiedEntityId> {
        if self.contains(entity) {
            Some(UnifiedEntityId::from_gas(entity))
        } else {
            None
        }
    }

    /// Ranged, fail-closed reverse decode: `None` unless Gas-domain, in range,
    /// and not the reserved sentinel.
    pub const fn entity_from_unified(&self, id: UnifiedEntityId) -> Option<Entity> {
        match entity_from_unified(id) {
            Some(e) if e < self.entity_count => Some(e),
            _ => None,
        }
    }

    /// Allocation-free enumeration of the live entity range as unified ids
    /// (the "derive from WorldSoA" surface for physics consumers).
    pub fn iter_unified(&self) -> impl Iterator<Item = UnifiedEntityId> {
        (0..self.entity_count).map(UnifiedEntityId::from_gas)
    }
}

/// Deterministic honesty probe for the identity bridge — reportable without
/// claiming product readiness.
#[derive(Debug, Clone, Serialize)]
pub struct GasUnifiedIdProbe {
    /// Fail-closed product flag (identity substrate, not a duplex certificate).
    pub gas_unified_id_ready: bool,
    /// Sibling binary-IPC readiness — context for the interop layer.
    pub gas_60hz_binary_ipc_ready: bool,
    /// Evidence identifier for the round-trip / probe.
    pub evidence_kind: String,
}

/// Tauri-visible honesty probe for the GAS ↔ unified-id bridge.
#[tauri::command]
pub fn gas_unified_id_probe_cmd() -> GasUnifiedIdProbe {
    GasUnifiedIdProbe {
        gas_unified_id_ready: GAS_UNIFIED_ID_READY,
        gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
        evidence_kind: GAS_UNIFIED_ID_EVIDENCE_KIND.to_string(),
    }
}

/// Deterministic round-trip evidence for the GAS ↔ unified-id bridge.
#[derive(Debug, Clone, Serialize)]
pub struct GasUnifiedIdRoundtripReport {
    /// Number of live GAS entities exercised in the pure decode sweep.
    pub entities_checked: u32,
    /// True when every in-range entity packed and decoded losslessly through
    /// both the pure decode and the ranged index.
    pub roundtrip_ok: bool,
    /// True when every cross-domain id (`Physics`, `World`) decoded to `None`.
    pub cross_domain_rejected: bool,
    /// True when the reserved "no source" sentinel decoded to `None`.
    pub reserved_rejected: bool,
    /// True when an out-of-range entity decoded to `None` under the ranged view.
    pub out_of_range_rejected: bool,
    /// Deterministic digest over all packed unified ids (raw u64) — stable
    /// domain-tag disambiguation evidence across runs and platforms.
    pub fingerprint: u64,
    /// Fail-closed product flag.
    pub gas_unified_id_ready: bool,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Runs the deterministic round-trip evidence sweep. Pure math: no allocation
/// beyond the report, no state mutation, no JSON in the tick path.
pub fn run_gas_unified_id_roundtrip() -> GasUnifiedIdRoundtripReport {
    const COUNT: u32 = 1024;
    let index = GasEntityUnifiedIndex::new(COUNT);

    let mut roundtrip_ok = true;
    let mut fingerprint: u64 = 0;
    for entity in 0..COUNT {
        // Pure forward pack + reverse decode must be lossless.
        let packed = unified_id_for_entity(entity);
        match entity_from_unified(packed) {
            Some(decoded) if decoded == entity => {}
            _ => roundtrip_ok = false,
        }
        // Ranged index must agree with the pure decode on the live range.
        match index.unified_id(entity).and_then(|id| index.entity_from_unified(id)) {
            Some(decoded) if decoded == entity => {}
            _ => roundtrip_ok = false,
        }
        fingerprint = fingerprint.wrapping_add(packed.raw());
    }

    // Cross-domain ids (same numeric space-id, other domain tags) must fail
    // closed under the strict GAS decode.
    let physics_id = UnifiedEntityId::from_parts(EntityDomain::Physics, 1);
    let world_id = UnifiedEntityId::from_parts(EntityDomain::World, 1);
    let cross_domain_rejected =
        entity_from_unified(physics_id).is_none() && entity_from_unified(world_id).is_none();

    // Reserved "no source" sentinel must fail closed.
    let reserved_rejected =
        entity_from_unified(UnifiedEntityId::from_gas(GAS_ENTITY_RESERVED)).is_none();

    // Out-of-range entity (== COUNT) is a valid Gas-domain id under the pure,
    // context-free decode, but must fail closed under the ranged live view —
    // the ranged index is the fail-closed authority over the entity space.
    let out_of_range_pure = entity_from_unified(UnifiedEntityId::from_gas(COUNT)).is_some();
    let out_of_range_indexed =
        index.entity_from_unified(UnifiedEntityId::from_gas(COUNT)).is_none();
    let out_of_range_rejected = out_of_range_pure && out_of_range_indexed;

    GasUnifiedIdRoundtripReport {
        entities_checked: COUNT,
        roundtrip_ok,
        cross_domain_rejected,
        reserved_rejected,
        out_of_range_rejected,
        fingerprint,
        gas_unified_id_ready: GAS_UNIFIED_ID_READY,
        evidence_kind: GAS_UNIFIED_ID_EVIDENCE_KIND.to_string(),
    }
}

/// Tauri-visible deterministic round-trip evidence command.
#[tauri::command]
pub fn run_gas_unified_id_roundtrip_cmd() -> GasUnifiedIdRoundtripReport {
    run_gas_unified_id_roundtrip()
}

#[cfg(test)]
mod tests {
    use super::*;
    use aethel_kernel_rust::physics_world::EntityDomain;

    #[test]
    fn live_range_roundtrips_losslessly() {
        const COUNT: u32 = 512;
        let index = GasEntityUnifiedIndex::new(COUNT);
        for entity in 0..COUNT {
            let packed = unified_id_for_entity(entity);
            assert_eq!(packed.domain(), EntityDomain::Gas);
            assert_eq!(entity_from_unified(packed), Some(entity));
            assert!(index.contains(entity));
            assert_eq!(index.entity_from_unified(packed), Some(entity));
        }
    }

    #[test]
    fn gas_domain_disambiguates_from_physics_and_world() {
        // Same numeric space-id under different domain tags must not collide.
        let gas = UnifiedEntityId::from_gas(1);
        let physics = UnifiedEntityId::from_parts(EntityDomain::Physics, 1);
        let world = UnifiedEntityId::from_parts(EntityDomain::World, 1);
        assert_ne!(gas.raw(), physics.raw());
        assert_ne!(gas.raw(), world.raw());
        assert_eq!(gas.domain(), EntityDomain::Gas);
        assert_eq!(entity_from_unified(physics), None);
        assert_eq!(entity_from_unified(world), None);
    }

    #[test]
    fn reserved_sentinel_fails_closed() {
        assert_eq!(
            entity_from_unified(UnifiedEntityId::from_gas(GAS_ENTITY_RESERVED)),
            None
        );
        let index = GasEntityUnifiedIndex::new(16);
        assert!(!index.contains(GAS_ENTITY_RESERVED));
        assert_eq!(index.unified_id(GAS_ENTITY_RESERVED), None);
    }

    #[test]
    fn out_of_range_fails_closed() {
        const COUNT: u32 = 64;
        let index = GasEntityUnifiedIndex::new(COUNT);
        assert!(!index.contains(COUNT));
        assert_eq!(index.unified_id(COUNT), None);
        // The pure decode accepts any Gas-domain id (COUNT is a valid u32), but
        // the ranged live view must fail closed on it.
        assert_eq!(
            entity_from_unified(UnifiedEntityId::from_gas(COUNT)),
            Some(COUNT)
        );
        assert_eq!(
            index.entity_from_unified(UnifiedEntityId::from_gas(COUNT)),
            None
        );
    }

    #[test]
    fn iter_unified_is_deterministic_and_domain_tagged() {
        const COUNT: u32 = 128;
        let index = GasEntityUnifiedIndex::new(COUNT);
        let first: Vec<UnifiedEntityId> = index.iter_unified().collect();
        let second: Vec<UnifiedEntityId> = index.iter_unified().collect();
        assert_eq!(first.len(), COUNT as usize);
        assert_eq!(first, second);
        for (i, id) in first.iter().enumerate() {
            assert_eq!(id.domain(), EntityDomain::Gas);
            assert_eq!(id.as_gas(), Some(i as u32));
        }
    }

    #[test]
    fn roundtrip_report_green_and_ready_held() {
        let report = run_gas_unified_id_roundtrip();
        assert!(report.roundtrip_ok);
        assert!(report.cross_domain_rejected);
        assert!(report.reserved_rejected);
        assert!(report.out_of_range_rejected);
        assert_eq!(report.entities_checked, 1024);
        assert!(!report.gas_unified_id_ready);
        assert_eq!(report.evidence_kind, GAS_UNIFIED_ID_EVIDENCE_KIND);
    }

    #[test]
    fn probe_matches_ready_false() {
        let probe = gas_unified_id_probe_cmd();
        assert!(!probe.gas_unified_id_ready);
        assert_eq!(probe.gas_60hz_binary_ipc_ready, GAS_60HZ_BINARY_IPC_READY);
        assert_eq!(probe.evidence_kind, GAS_UNIFIED_ID_EVIDENCE_KIND);
    }
}
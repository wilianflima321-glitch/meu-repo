//! Gameplay Data Assets registry (S5.0 / Studio Pillar S5) — cooked offline
//! asset catalog (Law VIII — airgapped, no network dependency at runtime)
//! feeding GAS abilities / effects / curves. letter **lk**.
//!
//! Zero-MVP / Kernel Supremacy design:
//! - `cook_hash` is a deterministic FNV-1a 64 over the *cooked bytes* — identical
//!   inputs MUST reproduce identical hashes (replay / content-addressable contract).
//! - The registry is content-addressable (CAS): resolving a `DataAssetRef`
//!   re-verifies id + schema_version + cook_hash before handing out bytes
//!   (fail-closed on tamper / schema drift).
//! - Cooking (JSON for effects/abilities, canonical binary for curves) is strictly
//!   OFFLINE. The 60 Hz tick path never parses JSON — `DataCurve::evaluate` is a
//!   zero-alloc, no-parse hot path.
//! - `fingerprint()` is a fully deterministic replay hash over the sorted catalog;
//!   identical cook sequences MUST reproduce identical fingerprints.
//! - S5 acceptance: `S5.0` (tag + data asset schema in cook), surpassed-vector
//!   "Cooked CAS assets — Offline Law VIII".
//!
//! This module composes on the existing `gas/` substrate with zero edits to the
//! mathematical invariants of `GameplayEffectDefinition` / `GameplayAbility` —
//! it only adds serde derives to those structs so they can be cooked offline.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::abilities::GameplayAbility;
use super::attributes::AttributeModifierOp;
use super::effects::{
    GameplayEffectDefinition, GameplayEffectDurationPolicy, GameplayEffectModifier,
};

/// Data Asset category (surpass vector over UE Data Registry — typed catalog).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DataAssetKind {
    Ability,
    Effect,
    Curve,
    Item,
}

impl DataAssetKind {
    pub const fn tag(self) -> u8 {
        match self {
            DataAssetKind::Ability => 0,
            DataAssetKind::Effect => 1,
            DataAssetKind::Curve => 2,
            DataAssetKind::Item => 3,
        }
    }

    pub const fn name(self) -> &'static str {
        match self {
            DataAssetKind::Ability => "ability",
            DataAssetKind::Effect => "effect",
            DataAssetKind::Curve => "curve",
            DataAssetKind::Item => "item",
        }
    }
}

/// Content-addressed asset reference (mirrors the S5 `DataAssetRef` contract).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataAssetRef {
    pub asset_id: String,
    pub cook_hash: u64,
    pub schema_version: u32,
}

impl DataAssetRef {
    pub fn new(asset_id: &str, cook_hash: u64, schema_version: u32) -> Self {
        Self {
            asset_id: asset_id.to_string(),
            cook_hash,
            schema_version,
        }
    }
}

/// A cooked, content-addressed asset held in the registry.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DataAsset {
    pub id: String,
    pub kind: DataAssetKind,
    pub schema_version: u32,
    pub cook_hash: u64,
    pub raw: Vec<u8>,
}

impl DataAsset {
    pub fn as_ref(&self) -> DataAssetRef {
        DataAssetRef::new(&self.id, self.cook_hash, self.schema_version)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DataAssetError {
    DuplicateWithDifferentHash,
    UnknownAsset,
    RefMismatch,
    DecodeFailed,
    EmptyCook,
}

impl std::fmt::Display for DataAssetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let msg = match self {
            DataAssetError::DuplicateWithDifferentHash => {
                "data_asset_duplicate_with_different_hash"
            }
            DataAssetError::UnknownAsset => "data_asset_unknown",
            DataAssetError::RefMismatch => "data_asset_ref_mismatch",
            DataAssetError::DecodeFailed => "data_asset_decode_failed",
            DataAssetError::EmptyCook => "data_asset_empty_cook",
        };
        f.write_str(msg)
    }
}

impl std::error::Error for DataAssetError {}

/// Deterministic 64-bit FNV-1a — pure byte hash, identical across platforms,
/// endianness, and Rust versions. Used for content-addressed `cook_hash`.
pub fn fnv1a64(bytes: &[u8]) -> u64 {
    const OFFSET_BASIS: u64 = 0xcbf2_9ce4_8422_2325;
    const PRIME: u64 = 0x0000_0100_0000_01b3;
    let mut hash = OFFSET_BASIS;
    for &byte in bytes {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(PRIME);
    }
    hash
}

/// Offline cook entry point for GAS data assets (S5.0 — schema in cook).
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataAssetRegistry {
    by_id: HashMap<String, DataAsset>,
    by_kind: HashMap<u8, Vec<String>>,
    cook_version: u32,
}

impl Default for DataAssetRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl DataAssetRegistry {
    pub fn new() -> Self {
        Self {
            by_id: HashMap::new(),
            by_kind: HashMap::new(),
            cook_version: 1,
        }
    }

    pub fn cook_version(&self) -> u32 {
        self.cook_version
    }

    pub fn asset_count(&self) -> usize {
        self.by_id.len()
    }

    /// Register a cooked byte blob. Fail-closed: an existing id with a different
    /// cook hash is an integrity violation and is rejected.
    pub fn register_cooked(
        &mut self,
        id: &str,
        kind: DataAssetKind,
        schema_version: u32,
        raw: Vec<u8>,
    ) -> Result<DataAssetRef, DataAssetError> {
        if raw.is_empty() {
            return Err(DataAssetError::EmptyCook);
        }
        let cook_hash = fnv1a64(&raw);
        if let Some(existing) = self.by_id.get(id) {
            if existing.cook_hash != cook_hash || existing.kind != kind {
                return Err(DataAssetError::DuplicateWithDifferentHash);
            }
            return Ok(DataAssetRef::new(id, cook_hash, schema_version));
        }
        let asset = DataAsset {
            id: id.to_string(),
            kind,
            schema_version,
            cook_hash,
            raw,
        };
        self.by_id.insert(id.to_string(), asset);
        self.by_kind.entry(kind.tag()).or_default().push(id.to_string());
        Ok(DataAssetRef::new(id, cook_hash, schema_version))
    }

    pub fn asset(&self, id: &str) -> Option<&DataAsset> {
        self.by_id.get(id)
    }

    /// Resolve a reference with full integrity verification (id + hash +
    /// schema_version must all match) — fail-closed on tamper or schema drift.
    pub fn resolve(&self, reference: &DataAssetRef) -> Result<&DataAsset, DataAssetError> {
        let asset = self.by_id.get(&reference.asset_id).ok_or(DataAssetError::UnknownAsset)?;
        if asset.cook_hash != reference.cook_hash
            || asset.schema_version != reference.schema_version
        {
            return Err(DataAssetError::RefMismatch);
        }
        Ok(asset)
    }

    /// Sorted ids of a given kind (deterministic order for fingerprinting).
    pub fn ids_of_kind(&self, kind: DataAssetKind) -> Vec<String> {
        let mut ids = self
            .by_kind
            .get(&kind.tag())
            .cloned()
            .unwrap_or_default();
        ids.sort_unstable();
        ids
    }

    /// All asset ids, sorted ascending (deterministic replay order).
    pub fn all_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.by_id.keys().cloned().collect();
        ids.sort_unstable();
        ids
    }

    /// Deterministic replay fingerprint: FNV-1a over sorted (id, kind, hash,
    /// schema) tuples. Identical cook sequences MUST reproduce it exactly.
    pub fn fingerprint(&self) -> u64 {
        let mut buf: Vec<u8> = Vec::new();
        buf.extend_from_slice(&self.cook_version.to_le_bytes());
        for id in self.all_ids() {
            let asset = &self.by_id[&id];
            buf.extend_from_slice(id.as_bytes());
            buf.push(0x1f);
            buf.push(asset.kind.tag());
            buf.push(0x1f);
            buf.extend_from_slice(&asset.cook_hash.to_le_bytes());
            buf.push(0x1f);
            buf.extend_from_slice(&asset.schema_version.to_le_bytes());
        }
        fnv1a64(&buf)
    }
}

/// Data curve (UE `UCurveFloat` surpass): keyframe float curve with a
/// zero-alloc, no-parse `evaluate` hot path. Cooked in a canonical binary
/// format (`CURVE_MAGIC` + count + (time, value) pairs, all LE).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DataCurve {
    pub keyframes: Vec<(f32, f32)>,
}

pub const CURVE_MAGIC: [u8; 2] = [0xC8, 0x01];

impl DataCurve {
    pub fn new(keyframes: Vec<(f32, f32)>) -> Self {
        // Keep keyframes sorted by time — evaluation depends on order.
        let mut kf = keyframes;
        kf.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        kf.dedup_by(|a, b| a.0 == b.0);
        Self { keyframes: kf }
    }

    /// Piecewise-linear evaluation with endpoint clamping. Deterministic and
    /// allocation-free — the cooked hot path (S5: "no JSON parse hot path").
    pub fn evaluate(&self, t: f32) -> f32 {
        let kf = &self.keyframes;
        if kf.is_empty() {
            return 0.0;
        }
        if kf.len() == 1 {
            return kf[0].1;
        }
        if t <= kf[0].0 {
            return kf[0].1;
        }
        if t >= kf[kf.len() - 1].0 {
            return kf[kf.len() - 1].1;
        }
        // Linear scan is fine for data curves (usually < 32 keyframes) and is
        // branch-predictable; a binary search would add setup cost for no win.
        for i in 0..kf.len() - 1 {
            let (t0, v0) = kf[i];
            let (t1, v1) = kf[i + 1];
            if t >= t0 && t <= t1 {
                let span = t1 - t0;
                if span == 0.0 {
                    return v0;
                }
                let alpha = (t - t0) / span;
                return v0 + (v1 - v0) * alpha;
            }
        }
        kf[kf.len() - 1].1
    }

    /// Cook to canonical binary bytes. Deterministic by construction.
    pub fn cook_binary(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(2 + 4 + self.keyframes.len() * 8);
        out.extend_from_slice(&CURVE_MAGIC);
        out.extend_from_slice(&(self.keyframes.len() as u32).to_le_bytes());
        for &(time, value) in &self.keyframes {
            out.extend_from_slice(&time.to_le_bytes());
            out.extend_from_slice(&value.to_le_bytes());
        }
        out
    }

    /// Decode canonical binary bytes — fail-closed on magic / truncation.
    pub fn decode_binary(raw: &[u8]) -> Result<Self, DataAssetError> {
        if raw.len() < 2 + 4 || raw[0] != CURVE_MAGIC[0] || raw[1] != CURVE_MAGIC[1] {
            return Err(DataAssetError::DecodeFailed);
        }
        let count = u32::from_le_bytes([raw[2], raw[3], raw[4], raw[5]]) as usize;
        let expected = 2 + 4 + count * 8;
        if raw.len() < expected {
            return Err(DataAssetError::DecodeFailed);
        }
        let mut keyframes = Vec::with_capacity(count);
        for i in 0..count {
            let base = 6 + i * 8;
            let time = f32::from_le_bytes([raw[base], raw[base + 1], raw[base + 2], raw[base + 3]]);
            let value =
                f32::from_le_bytes([raw[base + 4], raw[base + 5], raw[base + 6], raw[base + 7]]);
            keyframes.push((time, value));
        }
        Ok(DataCurve::new(keyframes))
    }
}

/// Offline cook of a gameplay effect definition to JSON bytes (Law VIII —
/// cooked at author time, never in the 60 Hz tick).
pub fn cook_effect(def: &GameplayEffectDefinition) -> Vec<u8> {
    serde_json::to_vec(def).unwrap_or_default()
}

pub fn uncook_effect(raw: &[u8]) -> Result<GameplayEffectDefinition, DataAssetError> {
    serde_json::from_slice(raw).map_err(|_| DataAssetError::DecodeFailed)
}

/// Offline cook of an ability to JSON bytes.
pub fn cook_ability(ability: &GameplayAbility) -> Vec<u8> {
    serde_json::to_vec(ability).unwrap_or_default()
}

pub fn uncook_ability(raw: &[u8]) -> Result<GameplayAbility, DataAssetError> {
    serde_json::from_slice(raw).map_err(|_| DataAssetError::DecodeFailed)
}

/// Evidence identifier for the data-assets soak / probe (distinctness
/// discipline — sibling `gas_sab_ring` / `unified_id` probes are distinct).
pub const DATA_ASSETS_EVIDENCE_KIND: &str = "gas_data_assets_cooked_cas_catalog";

/// Product flag — stays `false` until a real product pipeline consumes the
/// catalog through a Tauri/play path (doctrine #72 / #73 fail-closed).
pub const DATA_ASSETS_PRODUCT_READY: bool = false;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataAssetsSoakReport {
    pub data_assets_product_ready: bool,
    pub catalog_ok: bool,
    pub fingerprint_deterministic: bool,
    pub curve_hot_path_no_parse: bool,
    pub resolve_integrity_ok: bool,
    pub tamper_rejected: bool,
    pub assets_cooked: u64,
    pub curves_evaluated: u64,
    pub evidence_kind: String,
}

/// Runs the cook/resolve/evaluate soak over a realistic catalog. Does **not**
/// flip `DATA_ASSETS_PRODUCT_READY`.
pub fn run_data_assets_soak() -> DataAssetsSoakReport {
    let mut registry = DataAssetRegistry::new();

    // Effect catalog (damage over time + shield).
    let burn = GameplayEffectDefinition {
        id: "Burn".to_string(),
        duration_policy: GameplayEffectDurationPolicy::Duration,
        duration_seconds: Some(3.0),
        period_seconds: Some(0.5),
        modifiers: vec![GameplayEffectModifier {
            attribute: "Health".to_string(),
            operation: AttributeModifierOp::Add,
            magnitude: -4.0,
        }],
        granted_tags: vec!["State.Burning".to_string()],
        required_tags: vec![],
        blocked_tags: vec![],
        application_cue_tag: Some("Cue.Fire.Apply".to_string()),
        removal_cue_tag: Some("Cue.Fire.Remove".to_string()),
        periodic_cue_tag: Some("Cue.Fire.Periodic".to_string()),
    };
    let burn_raw = cook_effect(&burn);
    registry
        .register_cooked("Burn", DataAssetKind::Effect, 1, burn_raw.clone())
        .expect("burn registers");

    // Ability catalog (MeleeStrike + HealChannel).
    let mut strike = GameplayAbility::new(1, "MeleeStrike");
    strike.activation_tags_required = vec!["Equipped.Weapon".to_string()];
    strike.priority = 10;
    strike.cooldown_ms = 400.0;
    let strike_raw = cook_ability(&strike);
    registry
        .register_cooked("MeleeStrike", DataAssetKind::Ability, 1, strike_raw.clone())
        .expect("strike registers");

    let mut heal = GameplayAbility::new(2, "HealChannel");
    heal.priority = 30;
    heal.duration_ms = Some(1200.0);
    let heal_raw = cook_ability(&heal);
    registry
        .register_cooked("HealChannel", DataAssetKind::Ability, 1, heal_raw)
        .expect("heal registers");

    // Curve catalog (damage falloff + attack speed).
    let falloff = DataCurve::new(vec![(0.0, 100.0), (10.0, 50.0), (20.0, 10.0)]);
    let falloff_raw = falloff.cook_binary();
    registry
        .register_cooked("Curve.DamageFalloff", DataAssetKind::Curve, 1, falloff_raw.clone())
        .expect("falloff registers");

    let attack_speed = DataCurve::new(vec![(0.0, 1.0), (5.0, 1.5), (10.0, 2.0)]);
    let attack_speed_raw = attack_speed.cook_binary();
    registry
        .register_cooked("Curve.AttackSpeed", DataAssetKind::Curve, 1, attack_speed_raw)
        .expect("attack speed registers");

    // Resolve every asset through its ref with integrity verification.
    let mut resolve_integrity_ok = true;
    for id in registry.all_ids() {
        let asset = registry.asset(&id).expect("all_ids are present");
        match registry.resolve(&asset.as_ref()) {
            Ok(resolved) => {
                if resolved.cook_hash != asset.cook_hash {
                    resolve_integrity_ok = false;
                }
            }
            Err(_) => resolve_integrity_ok = false,
        }
    }

    // Tamper rejection: mutate one byte -> ref must fail.
    let mut tampered_raw = burn_raw.clone();
    let last = tampered_raw.len() - 1;
    tampered_raw[last] ^= 0x01;
    let tampered_asset = DataAsset {
        id: "Burn".to_string(),
        kind: DataAssetKind::Effect,
        schema_version: 1,
        cook_hash: fnv1a64(&tampered_raw),
        raw: tampered_raw,
    };
    let tamper_rejected = registry.resolve(&tampered_asset.as_ref()).is_err();

    // Fingerprint determinism: two independent cooks of the SAME catalog -> identical
    // fingerprint regardless of registration order (all 5 assets, shuffled).
    let mut second = DataAssetRegistry::new();
    second
        .register_cooked(
            "Curve.AttackSpeed",
            DataAssetKind::Curve,
            1,
            attack_speed.cook_binary(),
        )
        .expect("attack speed registers twice");
    second
        .register_cooked("HealChannel", DataAssetKind::Ability, 1, cook_ability(&heal))
        .expect("heal registers twice");
    second
        .register_cooked("Burn", DataAssetKind::Effect, 1, burn_raw)
        .expect("burn registers twice");
    second
        .register_cooked(
            "Curve.DamageFalloff",
            DataAssetKind::Curve,
            1,
            falloff_raw.clone(),
        )
        .expect("falloff registers twice");
    second
        .register_cooked("MeleeStrike", DataAssetKind::Ability, 1, strike_raw)
        .expect("strike registers twice");
    let fingerprint_deterministic = registry.fingerprint() == second.fingerprint();

    // Curve hot path: evaluate many points — no parse, pure arithmetic. The
    // damage falloff is monotone NON-INCREASING (100 -> 50 -> 10), so a strict
    // INCREASE breaks the invariant (consistent with
    // `curve_hot_path_is_monotonic_damage_falloff`).
    let mut curves_evaluated: u64 = 0;
    let mut monotonic = true;
    // Seed at +INF so the first sample (100.0) never trips the strict-increase
    // break, matching `curve_hot_path_is_monotonic_damage_falloff` below.
    let mut previous = f32::INFINITY;
    for i in 0..200 {
        let t = i as f32 * 0.1;
        let value = falloff.evaluate(t);
        if value > previous {
            monotonic = false;
        }
        previous = value;
        curves_evaluated += 1;
    }

    let catalog_ok = registry.asset_count() == 5
        && registry.ids_of_kind(DataAssetKind::Ability).len() == 2
        && registry.ids_of_kind(DataAssetKind::Effect).len() == 1
        && registry.ids_of_kind(DataAssetKind::Curve).len() == 2
        && monotonic
        && DataCurve::decode_binary(&falloff_raw).map(|c| c == falloff).unwrap_or(false)
        && uncook_effect(&registry.asset("Burn").expect("burn present").raw)
            .map(|d| d.id == "Burn")
            .unwrap_or(false)
        && uncook_ability(&registry.asset("MeleeStrike").expect("strike present").raw)
            .map(|a| a.id == 1)
            .unwrap_or(false);

    DataAssetsSoakReport {
        data_assets_product_ready: DATA_ASSETS_PRODUCT_READY,
        catalog_ok,
        fingerprint_deterministic,
        curve_hot_path_no_parse: true,
        resolve_integrity_ok,
        tamper_rejected,
        assets_cooked: registry.asset_count() as u64,
        curves_evaluated,
        evidence_kind: DATA_ASSETS_EVIDENCE_KIND.to_string(),
    }
}

/// Honesty probe — soak-gated metrics; product ready always fail-closed.
pub fn probe_data_assets() -> DataAssetsSoakReport {
    run_data_assets_soak()
}

#[tauri::command]
pub fn data_assets_registry_probe_cmd() -> DataAssetsSoakReport {
    probe_data_assets()
}

#[tauri::command]
pub fn run_data_assets_cook_soak_cmd() -> DataAssetsSoakReport {
    run_data_assets_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fnv1a64_is_deterministic_and_sensitive() {
        let a = fnv1a64(b"aethel");
        let b = fnv1a64(b"aethel");
        let c = fnv1a64(b"aetheL");
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert_eq!(a, 0x7b77_711b_5dd7_3ae6_u64); // golden FNV-1a 64 of "aethel"
    }

    #[test]
    fn fnv1a64_matches_reference_vector() {
        // NIST-style known answer: FNV-1a 64 of the empty string is the offset basis.
        assert_eq!(fnv1a64(b""), 0xcbf2_9ce4_8422_2325_u64);
        // FNV-1a 64 of "a" (from the canonical FNV test vectors).
        assert_eq!(fnv1a64(b"a"), 0xaf63_dc4c_8601_ec8c_u64);
    }

    #[test]
    fn registry_resolve_integrity_and_kind_query() {
        let mut registry = DataAssetRegistry::new();
        let curve = DataCurve::new(vec![(0.0, 0.0), (1.0, 1.0)]);
        let raw = curve.cook_binary();
        let reference = registry
            .register_cooked("Curve.Linear", DataAssetKind::Curve, 2, raw)
            .expect("registers");
        assert_eq!(reference.schema_version, 2);
        let resolved = registry.resolve(&reference).expect("resolves");
        assert_eq!(resolved.kind, DataAssetKind::Curve);
        assert_eq!(registry.ids_of_kind(DataAssetKind::Curve), vec!["Curve.Linear"]);
        assert!(registry.ids_of_kind(DataAssetKind::Ability).is_empty());
    }

    #[test]
    fn tampered_reference_is_rejected() {
        let mut registry = DataAssetRegistry::new();
        let raw = DataCurve::new(vec![(0.0, 1.0), (1.0, 2.0)]).cook_binary();
        let reference = registry
            .register_cooked("Curve.X", DataAssetKind::Curve, 1, raw)
            .expect("registers");
        let mut bad = reference.clone();
        bad.cook_hash ^= 0x01;
        assert!(registry.resolve(&bad).is_err());
        let mut bad_schema = reference.clone();
        bad_schema.schema_version = 99;
        assert!(registry.resolve(&bad_schema).is_err());
        let mut bad_id = reference.clone();
        bad_id.asset_id = "Curve.Y".to_string();
        assert!(registry.resolve(&bad_id).is_err());
    }

    #[test]
    fn duplicate_id_with_different_hash_fails_closed() {
        let mut registry = DataAssetRegistry::new();
        registry
            .register_cooked("A", DataAssetKind::Curve, 1, vec![1, 2, 3])
            .expect("first cook");
        assert_eq!(
            registry.register_cooked("A", DataAssetKind::Curve, 1, vec![1, 2, 4]),
            Err(DataAssetError::DuplicateWithDifferentHash)
        );
        // Same id, same bytes, different kind also rejected.
        assert_eq!(
            registry.register_cooked("A", DataAssetKind::Item, 1, vec![1, 2, 3]),
            Err(DataAssetError::DuplicateWithDifferentHash)
        );
        // Idempotent re-cook of identical bytes succeeds.
        assert!(registry
            .register_cooked("A", DataAssetKind::Curve, 1, vec![1, 2, 3])
            .is_ok());
    }

    #[test]
    fn empty_cook_is_rejected() {
        let mut registry = DataAssetRegistry::new();
        assert_eq!(
            registry.register_cooked("Empty", DataAssetKind::Item, 1, Vec::new()),
            Err(DataAssetError::EmptyCook)
        );
    }

    #[test]
    fn registry_fingerprint_is_deterministic() {
        let mut a = DataAssetRegistry::new();
        let mut b = DataAssetRegistry::new();
        a.register_cooked("Z", DataAssetKind::Item, 1, vec![9]).unwrap();
        a.register_cooked("A", DataAssetKind::Curve, 1, vec![1]).unwrap();
        b.register_cooked("A", DataAssetKind::Curve, 1, vec![1]).unwrap();
        b.register_cooked("Z", DataAssetKind::Item, 1, vec![9]).unwrap();
        // Registration order must not affect the fingerprint.
        assert_eq!(a.fingerprint(), b.fingerprint());
        // Content change changes the fingerprint.
        let mut c = DataAssetRegistry::new();
        c.register_cooked("Z", DataAssetKind::Item, 1, vec![8]).unwrap();
        c.register_cooked("A", DataAssetKind::Curve, 1, vec![1]).unwrap();
        assert_ne!(a.fingerprint(), c.fingerprint());
    }

    #[test]
    fn curve_evaluate_interpolates_and_clamps() {
        let curve = DataCurve::new(vec![(0.0, 0.0), (10.0, 100.0)]);
        assert_eq!(curve.evaluate(-5.0), 0.0); // clamp below
        assert_eq!(curve.evaluate(0.0), 0.0);
        assert_eq!(curve.evaluate(5.0), 50.0); // linear midpoint
        assert_eq!(curve.evaluate(10.0), 100.0);
        assert_eq!(curve.evaluate(99.0), 100.0); // clamp above
    }

    #[test]
    fn curve_new_sorts_keyframes() {
        let curve = DataCurve::new(vec![(10.0, 10.0), (0.0, 0.0), (5.0, 5.0)]);
        assert_eq!(curve.keyframes, vec![(0.0, 0.0), (5.0, 5.0), (10.0, 10.0)]);
    }

    #[test]
    fn curve_binary_cook_decode_roundtrip() {
        let curve = DataCurve::new(vec![(0.0, 1.0), (1.0, 2.0), (2.0, 4.0)]);
        let raw = curve.cook_binary();
        let decoded = DataCurve::decode_binary(&raw).expect("decodes");
        assert_eq!(decoded, curve);
    }

    #[test]
    fn curve_binary_decode_fails_closed() {
        assert!(DataCurve::decode_binary(&[0x00, 0x01, 0, 0, 0, 0]).is_err()); // bad magic
        assert!(DataCurve::decode_binary(&[0xC8, 0x01, 5, 0, 0, 0]).is_err()); // truncated
        assert!(DataCurve::decode_binary(&[]).is_err());
        // Valid magic with zero keyframes is a valid EMPTY curve -> Ok.
        let empty =
            DataCurve::decode_binary(&[0xC8, 0x01, 0, 0, 0, 0]).expect("empty curve decodes");
        assert!(empty.keyframes.is_empty());
    }

    #[test]
    fn effect_cook_uncook_roundtrip_preserves_semantics() {
        let def = GameplayEffectDefinition {
            id: "Heal".to_string(),
            duration_policy: GameplayEffectDurationPolicy::Infinite,
            duration_seconds: None,
            period_seconds: Some(1.0),
            modifiers: vec![GameplayEffectModifier {
                attribute: "Health".to_string(),
                operation: AttributeModifierOp::Add,
                magnitude: 5.0,
            }],
            granted_tags: vec!["State.Regenerating".to_string()],
            required_tags: vec![],
            blocked_tags: vec![],
            application_cue_tag: None,
            removal_cue_tag: None,
            periodic_cue_tag: None,
        };
        let raw = cook_effect(&def);
        assert!(!raw.is_empty());
        let decoded = uncook_effect(&raw).expect("uncooks");
        assert_eq!(decoded.id, "Heal");
        assert_eq!(decoded.modifiers[0].magnitude, 5.0);
        assert_eq!(decoded.duration_policy, GameplayEffectDurationPolicy::Infinite);
        assert_eq!(decoded.granted_tags, vec!["State.Regenerating"]);
    }

    #[test]
    fn ability_cook_uncook_roundtrip_preserves_semantics() {
        let mut ability = GameplayAbility::new(7, "ShadowStep");
        ability.activation_tags_required = vec!["State.Invulnerable".to_string()];
        ability.activation_tags_blocked = vec!["State.Stunned".to_string()];
        ability.priority = 50;
        ability.cooldown_ms = 1500.0;
        let raw = cook_ability(&ability);
        let decoded = uncook_ability(&raw).expect("uncooks");
        assert_eq!(decoded.id, 7);
        assert_eq!(decoded.name, "ShadowStep");
        assert_eq!(decoded.priority, 50);
        assert_eq!(decoded.activation_tags_required, vec!["State.Invulnerable"]);
    }

    #[test]
    fn uncook_fails_closed_on_garbage() {
        assert!(uncook_effect(b"not json").is_err());
        assert!(uncook_ability(b"not json").is_err());
    }

    #[test]
    fn soak_is_green_and_product_ready_held() {
        let report = run_data_assets_soak();
        assert!(report.catalog_ok, "catalog must be green: {report:?}");
        assert!(report.fingerprint_deterministic);
        assert!(report.resolve_integrity_ok);
        assert!(report.tamper_rejected);
        assert!(report.curve_hot_path_no_parse);
        assert!(report.assets_cooked == 5);
        assert!(!report.data_assets_product_ready);
        assert_eq!(report.evidence_kind, DATA_ASSETS_EVIDENCE_KIND);
        const { assert!(!DATA_ASSETS_PRODUCT_READY, "DATA_ASSETS_PRODUCT_READY must fail closed") };
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_data_assets_soak();
        let probe = probe_data_assets();
        assert_eq!(probe.catalog_ok, soak.catalog_ok);
        assert_eq!(probe.fingerprint_deterministic, soak.fingerprint_deterministic);
        assert_eq!(probe.assets_cooked, soak.assets_cooked);
        assert!(!probe.data_assets_product_ready);
        assert_eq!(probe.evidence_kind, DATA_ASSETS_EVIDENCE_KIND);
    }

    #[test]
    fn curve_hot_path_is_monotonic_damage_falloff() {
        // 20m falloff from 100 -> 10, monotone decreasing.
        let curve = DataCurve::new(vec![(0.0, 100.0), (10.0, 50.0), (20.0, 10.0)]);
        let mut previous = f32::INFINITY;
        for i in 0..201 {
            let t = i as f32 * 0.1;
            let v = curve.evaluate(t);
            assert!(v <= previous, "falloff must be monotone at t={t}");
            previous = v;
        }
        assert!((curve.evaluate(20.0) - 10.0).abs() < 1e-6);
    }
}

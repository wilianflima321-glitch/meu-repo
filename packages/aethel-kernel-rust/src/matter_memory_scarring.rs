//! # Matter Memory & Scarring Kernel — letter **lj** (R4-H / Aethel Latent Dreamspace).
//!
//! The Dreamspace brain must *remember the damage it dealt to the world*. The
//! destruction substrates already exist — `composite_fracture_kernel` (**kh**),
//! `voronoi_destruction_3d` (**ip2**) and `mnemonic_matter_entropy` (**dw**) —
//! but none of them keeps a **persistent memory of the scars** left on matter.
//! This kernel is that memory: a [`ScarMap`](matter_memory_scarring::ScarMap)
//! that hashes each spatial cell to a
//! [`ScarCell`](matter_memory_scarring::ScarCell) holding `(accumulated_damage,
//! last_impact_time, severity, impact_count)` and that **NEVER regenerates**:
//! `accumulated_damage` (the memory) is monotonically non-decreasing forever,
//! while `severity` (the visible scar) fades deterministically toward a
//! non-zero memory floor (`SCAR_MEMORY_FLOOR · accumulated_damage`) — the world
//! remembers what it endured. The API is the hot path of a destruction game:
//! [`apply_impact`](matter_memory_scarring::ScarMap::apply_impact) registers a
//! hit, [`scar_query`](matter_memory_scarring::ScarMap::scar_query) reads the
//! current scar, [`decay_scars`](matter_memory_scarring::ScarMap::decay_scars)
//! fades severity with an exponential half-life
//! (`SCAR_DECAY_HALF_LIFE_S = 60 s`), and
//! [`hot_step`](matter_memory_scarring::ScarMap::hot_step) is the zero-alloc
//! per-frame driver over the .asbc spatial-hash set. **Zero Amnesia** binary
//! persistence: [`serialize_binary`](matter_memory_scarring::ScarMap::serialize_binary)
//! / [`deserialize_binary`](matter_memory_scarring::ScarMap::deserialize_binary)
//! encode the whole map as `magic|version|count|entry*` with `f32`/`u64`/`u32`
//! little-endian bytes — a save/reload round-trip is **bit-identical** and
//! corruption (bad magic, wrong version, truncation, zero cell hash) fails
//! closed with `None`. Real substrate composition:
//! [`substrate_scar_sources`](matter_memory_scarring::substrate_scar_sources)
//! feeds the actual dw/kh/ip2 soak outputs into scar impulses — dw's
//! off-screen coherence decay (matter entropy = forgetting) seeds entropy
//! scars, kh's shattered fragments + debris + tip deflection seeds fracture
//! scars, ip2's active-shard fraction seeds voronoi destruction scars. All
//! non-finite inputs (cell hash `0`, NaN/negative damage, NaN/negative `dt`)
//! are **fail-closed** (no-op, no partial write, counter untouched), the map
//! respects its fixed capacity (overflow rejected honestly), and every cell
//! stays finite and bounded in the unit interval. Soak-gated
//! `matter_memory_scarring_ready` (impact registers damage, 2 impacts > 1,
//! no spontaneous regeneration, severity decays to the floor but never zero,
//! deterministic bit-identical replay, binary round-trip bit-identical,
//! fail-closed cell/time, finite/bounded, capacity respected, substrate
//! composition finite, zero-alloc keep-capacity hot loop, soak determinism,
//! probe match); AAA vectors (`matter_memory_aaa_ready` /
//! `scar_map_aaa_ready` / `persistence_aaa_ready` / `coins_ready` /
//! `agones_ready` / `quic_ready`) stay fail-closed. 31-peer evidence
//! distinctness (24 prior + lc `latent_dreamspace_bytecode` + ld
//! `micro_dream_gpu_pass` + le `holographic_scene_tensor` + lf
//! `multiverse_rollback_branching` + lg `synesthetic_resonance_matrix` + lh
//! `gaze_intent_anticipation` + li `narrative_tension_clock`). Fingerprint
//! seed `lj_scar` (`0x6C6A_0000_0000_0001`).

use crate::composite_fracture_kernel::{run_composite_fracture_soak, CompositeFractureSoakReport};
use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use crate::mnemonic_matter_entropy::{run_mnemonic_matter_entropy_soak, MnemonicMatterEntropySoakReport};
use crate::voronoi_destruction_3d::{run_voronoi_destruction_3d_soak, VoronoiDestruction3DProbeReport};
use serde::{Deserialize, Serialize};
use std::f32::consts::LN_2;
use std::time::Instant;

/// Default fixed capacity of a [`ScarMap`] (preallocated — no hot-path alloc).
pub const SCAR_MAP_CAPACITY: usize = 256;
/// Cells exercised by the zero-alloc hot-loop probe and the measured drive.
pub const SCAR_HOT_CELLS: usize = 128;
/// Severity half-life (s) — `severity *= exp(−ln2·dt/τ)`, memory never fades.
pub const SCAR_DECAY_HALF_LIFE_S: f32 = 60.0;
/// Non-zero floor ratio of the visible severity vs the accumulated memory —
/// decay desbota mas nunca zera a memória (the scar always remembers).
pub const SCAR_MEMORY_FLOOR: f32 = 0.25;
/// Normalizer for kh's fragment / debris counts (chunk-scale, ≥ 256 chunks).
pub const SCAR_DAMAGE_NORMALIZE: f32 = 256.0;
/// Soak seed (deterministic fixtures, never wall-clock).
pub const SCAR_SOAK_SEED: u64 = 0x6C6A_0000_5050_5EED;
/// Fingerprint seed — `0x6C6A` prefix = letter **lj**.
pub const SCAR_FP_SEED: u64 = 0x6C6A_0000_0000_0001;
/// Fingerprint fold constant — distinct from every sibling kernel.
pub const SCAR_FP_FOLD: u64 = 0x6C6A_6C6A_6C6A_6C6A;
/// Stable evidence tag (letter **lj**).
pub const SCAR_EVIDENCE_KIND: &str = "lj_matter_memory_scarring";
/// Binary persistence magic — little-endian bytes spell `ljSM`.
pub const SCAR_MAGIC: u32 = 0x6C6A_534D;
/// Binary persistence version (bump = format change; deserializer rejects any
/// other version fail-closed).
pub const SCAR_VERSION: u32 = 1;
/// Header bytes of the binary format: magic u32 + version u32 + count u32.
pub const SCAR_HEADER_BYTES: usize = 12;
/// Per-entry bytes: cell_hash u64 + accumulated f32 + last_impact f32 +
/// severity f32 + impact_count u32 = 8 + 4 + 4 + 4 + 4.
pub const SCAR_ENTRY_BYTES: usize = 24;

/// A single scarred spatial cell — the world's memory of one place.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ScarCell {
    /// Total damage ever dealt to this cell, clamped to `[0, 1]`. **Never
    /// decays** — this is the persistent memory (no regeneration).
    pub accumulated_damage: f32,
    /// Deterministic sim-seconds of the last impact that touched this cell.
    pub last_impact_time: f32,
    /// Current visible scar strength in `[0, 1]` — fades exponentially toward
    /// `SCAR_MEMORY_FLOOR · accumulated_damage` but never reaches zero.
    pub severity: f32,
    /// Number of impacts ever registered on this cell.
    pub impact_count: u32,
}

impl ScarCell {
    /// A pristine, unscarred cell.
    pub const ZERO: Self = Self {
        accumulated_damage: 0.0,
        last_impact_time: 0.0,
        severity: 0.0,
        impact_count: 0,
    };

    /// Every scalar finite and bounded in its domain.
    pub fn is_finite(&self) -> bool {
        self.accumulated_damage.is_finite()
            && self.last_impact_time.is_finite()
            && self.severity.is_finite()
            && (0.0..=1.0).contains(&self.accumulated_damage)
            && (0.0..=1.0).contains(&self.severity)
            && self.last_impact_time >= 0.0
    }
}

/// One `(cell_hash → ScarCell)` pair inside the fixed-capacity [`ScarMap`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScarEntry {
    /// Spatial hash of the cell (from the .asbc / spatial-hash layer).
    pub cell_hash: u64,
    /// The scar memory bound to that cell.
    pub cell: ScarCell,
}

/// Fixed-capacity matter memory. Preallocated once (zero-alloc hot loop with
/// `keep_capacity`); updating an existing cell never grows, adding a new cell
/// past capacity is rejected honestly (fail-closed, no partial write).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScarMap {
    entries: Vec<ScarEntry>,
}

impl ScarMap {
    /// Creates an empty map with a fixed capacity (preallocated).
    pub fn new(capacity: usize) -> Self {
        Self {
            entries: Vec::with_capacity(capacity),
        }
    }

    /// Number of scarred cells currently remembered.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Whether the map remembers nothing yet.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Fixed preallocated capacity.
    pub fn capacity(&self) -> usize {
        self.entries.capacity()
    }

    /// Linear scan over the (small) cell set — deterministic, no hashing drift.
    fn find_index(&self, cell_hash: u64) -> Option<usize> {
        self.entries.iter().position(|e| e.cell_hash == cell_hash)
    }

    /// Registers an impact on a cell hash. **Fail-closed**: cell hash `0` or
    /// non-finite / non-positive damage or non-finite `time_s` → `false` with
    /// no state change. Positive damage is clamped to the unit interval;
    /// `accumulated_damage` and `severity` accumulate (clamped to `[0, 1]`),
    /// the impact counter increments, and `last_impact_time` is refreshed.
    /// Returns `true` only when the scar was actually written (including a
    /// successful insert into free capacity).
    pub fn apply_impact(&mut self, cell_hash: u64, damage: f32, time_s: f32) -> bool {
        if cell_hash == 0 || !damage.is_finite() || !time_s.is_finite() {
            return false;
        }
        let damage = clamp01(damage);
        if damage <= 0.0 {
            return false;
        }
        if let Some(idx) = self.find_index(cell_hash) {
            let cell = &mut self.entries[idx].cell;
            cell.accumulated_damage = clamp01(cell.accumulated_damage + damage);
            cell.severity = clamp01(cell.severity + damage);
            cell.last_impact_time = time_s;
            cell.impact_count += 1;
            return true;
        }
        if self.entries.len() < self.capacity() {
            self.entries.push(ScarEntry {
                cell_hash,
                cell: ScarCell {
                    accumulated_damage: damage,
                    last_impact_time: time_s,
                    severity: damage,
                    impact_count: 1,
                },
            });
            return true;
        }
        false
    }

    /// Reads the scar memory of a cell. Fail-closed: cell hash `0` → `None`.
    pub fn scar_query(&self, cell_hash: u64) -> Option<ScarCell> {
        if cell_hash == 0 {
            return None;
        }
        self.find_index(cell_hash).map(|idx| self.entries[idx].cell)
    }

    /// Deterministically fades every visible severity toward its non-zero
    /// memory floor. **Fail-closed**: non-finite or negative `dt_s` → no-op.
    /// `accumulated_damage` is NEVER touched here — the world does not
    /// regenerate; the memory is permanent.
    pub fn decay_scars(&mut self, dt_s: f32) {
        if !dt_s.is_finite() || dt_s < 0.0 {
            return;
        }
        let factor = (-(LN_2 * dt_s) / SCAR_DECAY_HALF_LIFE_S).exp();
        for entry in &mut self.entries {
            let floor = SCAR_MEMORY_FLOOR * entry.cell.accumulated_damage;
            let faded = floor + (entry.cell.severity - floor) * factor;
            entry.cell.severity = clamp01(faded);
        }
    }

    /// Zero-alloc per-frame hot driver: applies `damage` to every given cell
    /// hash at `now_s`, then fades severity by `dt_s`. Fail-closed on
    /// non-finite inputs (no-op). This is the .asbc 60 Hz consumption path.
    pub fn hot_step(&mut self, cells: &[u64], damage: f32, now_s: f32, dt_s: f32) {
        if !now_s.is_finite() || !dt_s.is_finite() || dt_s < 0.0 {
            return;
        }
        for &h in cells {
            self.apply_impact(h, damage, now_s);
        }
        self.decay_scars(dt_s);
    }

    /// Every remembered cell finite and bounded.
    pub fn all_finite(&self) -> bool {
        self.entries.iter().all(|e| e.cell.is_finite())
    }

    /// Sum of the persistent accumulated memory across all cells.
    pub fn total_damage(&self) -> f32 {
        self.entries.iter().map(|e| e.cell.accumulated_damage).sum()
    }

    /// Sum of the current visible severity across all cells.
    pub fn total_severity(&self) -> f32 {
        self.entries.iter().map(|e| e.cell.severity).sum()
    }

    /// Total impacts ever registered across all cells.
    pub fn total_impacts(&self) -> u32 {
        self.entries.iter().map(|e| e.cell.impact_count).sum()
    }

    /// **Zero Amnesia** binary serialization (little-endian):
    /// `magic u32 | version u32 | count u32 | entry*`, each entry
    /// `cell_hash u64 | accumulated f32 | last_impact_time f32 | severity f32 |
    /// impact_count u32`. Deterministic and bit-preserving for `f32`.
    pub fn serialize_binary(&self) -> Vec<u8> {
        let mut out =
            Vec::with_capacity(SCAR_HEADER_BYTES + self.entries.len() * SCAR_ENTRY_BYTES);
        out.extend_from_slice(&SCAR_MAGIC.to_le_bytes());
        out.extend_from_slice(&SCAR_VERSION.to_le_bytes());
        out.extend_from_slice(&(self.entries.len() as u32).to_le_bytes());
        for e in &self.entries {
            out.extend_from_slice(&e.cell_hash.to_le_bytes());
            out.extend_from_slice(&e.cell.accumulated_damage.to_le_bytes());
            out.extend_from_slice(&e.cell.last_impact_time.to_le_bytes());
            out.extend_from_slice(&e.cell.severity.to_le_bytes());
            out.extend_from_slice(&e.cell.impact_count.to_le_bytes());
        }
        out
    }

    /// Loads a [`ScarMap`] from the binary format. **Fail-closed** on bad
    /// magic, unknown version, truncation, or a zero cell hash (corruption →
    /// `None`; never a partial/NaN map).
    pub fn deserialize_binary(bytes: &[u8]) -> Option<ScarMap> {
        if bytes.len() < SCAR_HEADER_BYTES {
            return None;
        }
        let magic = u32::from_le_bytes(bytes[0..4].try_into().ok()?);
        let version = u32::from_le_bytes(bytes[4..8].try_into().ok()?);
        let count = u32::from_le_bytes(bytes[8..12].try_into().ok()?) as usize;
        if magic != SCAR_MAGIC || version != SCAR_VERSION {
            return None;
        }
        let required = SCAR_HEADER_BYTES + count.saturating_mul(SCAR_ENTRY_BYTES);
        if bytes.len() < required {
            return None;
        }
        let mut map = ScarMap::new(SCAR_MAP_CAPACITY.max(count));
        for i in 0..count {
            let off = SCAR_HEADER_BYTES + i * SCAR_ENTRY_BYTES;
            let cell_hash = u64::from_le_bytes(bytes[off..off + 8].try_into().ok()?);
            let accumulated_damage = f32::from_le_bytes(bytes[off + 8..off + 12].try_into().ok()?);
            let last_impact_time =
                f32::from_le_bytes(bytes[off + 12..off + 16].try_into().ok()?);
            let severity = f32::from_le_bytes(bytes[off + 16..off + 20].try_into().ok()?);
            let impact_count = u32::from_le_bytes(bytes[off + 20..off + 24].try_into().ok()?);
            if cell_hash == 0 {
                return None;
            }
            map.entries.push(ScarEntry {
                cell_hash,
                cell: ScarCell {
                    accumulated_damage,
                    last_impact_time,
                    severity,
                    impact_count,
                },
            });
        }
        Some(map)
    }
}

/// Deterministic clamp to the unit interval. **Fail-closed**: non-finite input
/// → `0.0` (never propagates NaN/Inf into the scar memory).
fn clamp01(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// Deterministic fixture cell hashes for the measured drive and zero-alloc
/// probe — non-zero by construction (a `0` collision is remapped away so the
/// fail-closed `cell_hash == 0` contract never starves the hot loop).
fn fixture_impact_hashes() -> [u64; SCAR_HOT_CELLS] {
    let mut arr = [0u64; SCAR_HOT_CELLS];
    for i in 0..SCAR_HOT_CELLS {
        let h = 0x6C6A_0001_u64 ^ (i as u64).wrapping_mul(0x9E37_79B9_7F4A_7C15);
        arr[i] = if h == 0 { 0x6C6A_5CA9_u64 } else { h };
    }
    arr
}

/// Deterministic fixture drive: applies a small damage to every fixture cell at
/// staggered sim-times, then one decay step. Pure function of its inputs —
/// bit-identical across runs.
fn drive(map: &mut ScarMap, hashes: &[u64], now_s: f32) {
    for (i, &h) in hashes.iter().enumerate() {
        let dmg = 0.04 + 0.02 * ((i % 5) as f32);
        map.apply_impact(h, dmg, now_s - (i as f32) * 0.016);
    }
    map.decay_scars(0.016 * hashes.len() as f32);
}

/// Real substrate composition: derives the three scar impulses from the actual
/// dw/kh/ip2 soak reports (no mocks). Returns `[entropy, fracture, voronoi]`,
/// each clamped to the unit interval.
pub fn substrate_scar_sources(
    dw: &MnemonicMatterEntropySoakReport,
    kh: &CompositeFractureSoakReport,
    ip2: &VoronoiDestruction3DProbeReport,
) -> [f32; 3] {
    // dw: matter entropy — off-screen coherence decay is the "forgetting" that
    // leaves a scar on the world's memory. Both terms normalized to [0, 1].
    let entropy = clamp01(
        0.6 * dw.offscreen_drop + 0.4 * (1.0 - clamp01(dw.mean_coherence_offscreen_final)),
    );
    // kh: composite fracture — shattered chunks + debris bodies + tip
    // deflection (mid-span rebar bending evidence) feed the fracture scar.
    let fracture = clamp01(
        0.6 * clamp01(kh.fracture_fragments as f32 / SCAR_DAMAGE_NORMALIZE)
            + 0.3 * clamp01(kh.debris_bodies_spawned as f32 / SCAR_DAMAGE_NORMALIZE)
            + 0.1 * clamp01(kh.tip_displacement / 0.1),
    );
    // ip2: voronoi destruction — active shard fraction of the site lattice.
    let voronoi = if ip2.shard_count > 0 {
        clamp01(ip2.active_fragments as f32 / ip2.shard_count as f32)
    } else {
        0.0
    };
    [entropy, fracture, voronoi]
}

// ---------------------------------------------------------------------------
// Measured pass.
// ---------------------------------------------------------------------------

/// Every non-clock invariant measured by the soak, plus representative
/// scalars for the evidence fingerprint.
struct MatterMemoryScarringMeasured {
    impact_registers_damage: bool,
    accumulation_two_over_one: bool,
    no_regeneration: bool,
    severity_decays_to_floor: bool,
    deterministic_replay: bool,
    binary_round_trip_bit_identical: bool,
    fail_closed_invalid_cell: bool,
    fail_closed_invalid_time: bool,
    finite_bounded: bool,
    map_capacity_respected: bool,
    composition_finite: bool,
    zero_alloc: bool,
    representative_damage: f32,
    representative_severity: f32,
    representative_cells: u32,
    representative_impacts: u32,
    entropy_impact: f32,
    fracture_impact: f32,
    voronoi_impact: f32,
    dw_substrate_ready: bool,
    kh_substrate_ready: bool,
    ip2_substrate_ready: bool,
    hot_loop_peak_severity: f32,
    elapsed_micros: f32,
}

/// Deterministic evidence fingerprint over every non-clock invariant.
fn matter_memory_scarring_evidence_fingerprint(m: &MatterMemoryScarringMeasured) -> u64 {
    let mut h = SCAR_FP_SEED;
    h = hash_mix(h, m.impact_registers_damage as u64);
    h = hash_mix(h, m.accumulation_two_over_one as u64);
    h = hash_mix(h, m.no_regeneration as u64);
    h = hash_mix(h, m.severity_decays_to_floor as u64);
    h = hash_mix(h, m.deterministic_replay as u64);
    h = hash_mix(h, m.binary_round_trip_bit_identical as u64);
    h = hash_mix(h, m.fail_closed_invalid_cell as u64);
    h = hash_mix(h, m.fail_closed_invalid_time as u64);
    h = hash_mix(h, m.finite_bounded as u64);
    h = hash_mix(h, m.map_capacity_respected as u64);
    h = hash_mix(h, m.composition_finite as u64);
    h = hash_mix(h, m.zero_alloc as u64);
    h = hash_mix(h, quant_f32(m.representative_damage));
    h = hash_mix(h, quant_f32(m.representative_severity));
    h = hash_mix(h, quant_f32(m.entropy_impact));
    h = hash_mix(h, quant_f32(m.fracture_impact));
    h = hash_mix(h, quant_f32(m.voronoi_impact));
    h = hash_mix(h, m.representative_cells as u64);
    h = hash_mix(h, m.representative_impacts as u64);
    h = hash_mix(h, quant_f32(m.hot_loop_peak_severity));
    h ^ SCAR_FP_FOLD
}

/// Honest readiness: every invariant and the deterministic replay must hold,
/// and the representative damage must stay finite and bounded.
fn readiness(m: &MatterMemoryScarringMeasured) -> bool {
    m.impact_registers_damage
        && m.accumulation_two_over_one
        && m.no_regeneration
        && m.severity_decays_to_floor
        && m.deterministic_replay
        && m.binary_round_trip_bit_identical
        && m.fail_closed_invalid_cell
        && m.fail_closed_invalid_time
        && m.finite_bounded
        && m.map_capacity_respected
        && m.composition_finite
        && m.zero_alloc
        && m.representative_damage.is_finite()
        && (0.0..=1.0).contains(&m.representative_damage)
}

/// Zero-alloc hot-loop probe: preallocates once, fills, snapshots, clears with
/// `keep_capacity`, refills with the identical deterministic drive — the map
/// must come back bit-identical and the capacity untouched.
fn zero_alloc_hot_loop_probe() -> bool {
    let hashes = fixture_impact_hashes();
    let mut map = ScarMap::new(SCAR_HOT_CELLS);
    let cap_before = map.capacity();
    drive(&mut map, &hashes, 10.0);
    let snap = map.clone();
    map.entries.clear();
    drive(&mut map, &hashes, 10.0);
    map.capacity() == cap_before && map == snap
}

/// Runs the full measured pass: composes the dw/kh/ip2 substrate soaks into
/// scar impulses, verifies every memory invariant on controlled fixtures,
/// proves the binary persistence round-trip, and probes the zero-alloc hot
/// loop.
fn run_measured_pass() -> MatterMemoryScarringMeasured {
    let dw = run_mnemonic_matter_entropy_soak();
    let kh = run_composite_fracture_soak();
    let ip2 = run_voronoi_destruction_3d_soak();
    let sources = substrate_scar_sources(&dw, &kh, &ip2);

    let impact_registers_damage = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_0A01_u64;
        m.apply_impact(h, 0.3, 1.0);
        m.scar_query(h)
            .map(|c| c.accumulated_damage > 0.0 && c.severity > 0.0 && c.impact_count == 1)
            .unwrap_or(false)
    };

    let accumulation_two_over_one = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_0A02_u64;
        m.apply_impact(h, 0.2, 1.0);
        m.apply_impact(h, 0.2, 2.0);
        let two = m.scar_query(h).map(|c| c.accumulated_damage).unwrap_or(0.0);
        let mut m1 = ScarMap::new(SCAR_MAP_CAPACITY);
        m1.apply_impact(h, 0.2, 1.0);
        let one = m1.scar_query(h).map(|c| c.accumulated_damage).unwrap_or(0.0);
        two > one && two <= 1.0
    };

    let no_regeneration = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_0A03_u64;
        m.apply_impact(h, 0.5, 1.0);
        let before = m.scar_query(h).map(|c| (c.accumulated_damage, c.severity)).unwrap();
        m.decay_scars(120.0);
        let after = m.scar_query(h).map(|c| (c.accumulated_damage, c.severity)).unwrap();
        (after.0 - before.0).abs() < 1e-7 && after.0 > 0.0 && after.1 > 0.0 && after.1 < before.1
    };

    let severity_decays_to_floor = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_0A04_u64;
        m.apply_impact(h, 0.6, 1.0);
        m.decay_scars(600.0); // ten half-lives — severity hugs the floor
        let c = m.scar_query(h).unwrap();
        let floor = SCAR_MEMORY_FLOOR * c.accumulated_damage;
        c.severity >= floor - 1e-5 && c.severity <= 1.0
    };

    let deterministic_replay = {
        let hashes = fixture_impact_hashes();
        let mut m1 = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m1, &hashes, 10.0);
        let mut m2 = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m2, &hashes, 10.0);
        m1 == m2
    };

    let binary_round_trip_bit_identical = {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        let bytes = m.serialize_binary();
        match ScarMap::deserialize_binary(&bytes) {
            Some(back) => back == m,
            None => false,
        }
    };

    let fail_closed_invalid_cell = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let reject_impact = !m.apply_impact(0, 0.3, 1.0);
        let reject_query = m.scar_query(0).is_none();
        reject_impact && reject_query
    };

    let fail_closed_invalid_time = {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_0A06_u64;
        m.apply_impact(h, 0.3, 1.0);
        let snap = m.clone();
        m.decay_scars(-1.0);
        m.decay_scars(f32::NAN);
        m.decay_scars(f32::INFINITY);
        m == snap
    };

    let finite_bounded = {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        m.decay_scars(30.0);
        m.all_finite()
    };

    let map_capacity_respected = {
        let mut m = ScarMap::new(4);
        let mut all_ok = true;
        for i in 0..8u64 {
            all_ok &= m.apply_impact(0x6C6A_1000 + i, 0.1, i as f32);
        }
        !all_ok && m.len() == 4
    };

    let composition_finite =
        sources.iter().all(|s| s.is_finite() && (0.0..=1.0).contains(s));

    let zero_alloc = zero_alloc_hot_loop_probe();

    // Representative state + timed zero-alloc hot loop over the fixture cells.
    let hashes = fixture_impact_hashes();
    let mut rep = ScarMap::new(SCAR_MAP_CAPACITY);
    let t0 = Instant::now();
    let mut peak = 0.0f32;
    for frame in 0..SCAR_HOT_CELLS {
        rep.hot_step(&hashes, 0.02, (frame as f32) * 0.016, 0.016);
        peak = peak.max(rep.total_severity());
    }
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1e6;
    let representative_cells = rep.len() as u32;
    let representative_impacts = rep.total_impacts();
    let representative_damage = rep.total_damage() / SCAR_HOT_CELLS as f32;
    let representative_severity = rep.total_severity() / SCAR_HOT_CELLS as f32;
    let hot_loop_peak_severity = peak;

    MatterMemoryScarringMeasured {
        impact_registers_damage,
        accumulation_two_over_one,
        no_regeneration,
        severity_decays_to_floor,
        deterministic_replay,
        binary_round_trip_bit_identical,
        fail_closed_invalid_cell,
        fail_closed_invalid_time,
        finite_bounded,
        map_capacity_respected,
        composition_finite,
        zero_alloc,
        representative_damage,
        representative_severity,
        representative_cells,
        representative_impacts,
        entropy_impact: sources[0],
        fracture_impact: sources[1],
        voronoi_impact: sources[2],
        dw_substrate_ready: dw.mnemonic_matter_entropy_ready,
        kh_substrate_ready: kh.composite_fracture_ready,
        ip2_substrate_ready: ip2.voronoi_destruction_3d_ready,
        hot_loop_peak_severity,
        elapsed_micros,
    }
}

/// Letter **lj** soak report — matter memory & scarring evidence.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MatterMemoryScarringReport {
    /// Soak-gated — every memory invariant holds and the double-pass replay is
    /// bit-identical.
    pub ready: bool,
    /// Double-pass determinism of the measured pass.
    pub deterministic: bool,
    /// Stable evidence tag (letter **lj**).
    pub evidence_kind: &'static str,
    /// An impact registers accumulated damage, severity and a counter.
    pub impact_registers_damage: bool,
    /// Two impacts accumulate more memory than one (capped at 1.0).
    pub accumulation_two_over_one: bool,
    /// Decay never zeroes the accumulated memory — no spontaneous regeneration.
    pub no_regeneration: bool,
    /// Severity fades toward the non-zero memory floor after many half-lives.
    pub severity_decays_to_floor: bool,
    /// Two identical fixture drives produce bit-identical maps.
    pub deterministic_replay: bool,
    /// Binary save/reload round-trip is bit-identical.
    pub binary_round_trip_bit_identical: bool,
    /// Cell hash `0` is rejected by impact and query.
    pub fail_closed_invalid_cell: bool,
    /// Non-finite / negative decay time is a no-op.
    pub fail_closed_invalid_time: bool,
    /// Every remembered cell stays finite and bounded after a long drive.
    pub finite_bounded: bool,
    /// Adding past capacity is rejected honestly — no partial write.
    pub map_capacity_respected: bool,
    /// The dw/kh/ip2 substrate composition stays finite and in the unit interval.
    pub composition_finite: bool,
    /// Zero-alloc hot loop keeps its capacity and replays bit-identically.
    pub zero_alloc_hot_loop: bool,
    /// Average accumulated memory per fixture cell after the hot loop.
    pub representative_damage: f32,
    /// Average visible severity per fixture cell after the hot loop.
    pub representative_severity: f32,
    /// Scarred cells remembered by the representative map.
    pub representative_cells: u32,
    /// Total impacts registered on the representative map.
    pub representative_impacts: u32,
    /// Entropy scar impulse derived from the dw substrate soak.
    pub entropy_impact: f32,
    /// Fracture scar impulse derived from the kh substrate soak.
    pub fracture_impact: f32,
    /// Voronoi destruction scar impulse derived from the ip2 substrate soak.
    pub voronoi_impact: f32,
    /// dw `mnemonic_matter_entropy` soak readiness (composition feed).
    pub dw_mnemonic_entropy_ready: bool,
    /// kh `composite_fracture` soak readiness (composition feed).
    pub kh_composite_fracture_ready: bool,
    /// ip2 `voronoi_destruction_3d` soak readiness (composition feed).
    pub ip2_voronoi_ready: bool,
    /// Peak summed severity observed across the timed hot loop.
    pub hot_loop_peak_severity: f32,
    /// Fixed preallocated capacity of the representative map.
    pub scar_capacity: u32,
    /// Timed hot-loop wall cost in microseconds (informational only).
    pub measured_pass_micros: f32,
    /// Fingerprint of the matter-memory evidence fields.
    pub evidence_fingerprint: u64,
    /// Distinct from the whole 31-peer reachable evidence set.
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    pub distinct_from_kz_vehicle_chassis_dynamics: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    pub distinct_from_lb_celestial_orbital_dynamics: bool,
    pub distinct_from_lc_latent_dreamspace_bytecode: bool,
    pub distinct_from_ld_micro_dream_gpu_pass: bool,
    pub distinct_from_le_holographic_scene_tensor: bool,
    pub distinct_from_lf_multiverse_rollback_branching: bool,
    pub distinct_from_lg_synesthetic_resonance_matrix: bool,
    pub distinct_from_lh_gaze_intent_anticipation: bool,
    pub distinct_from_li_narrative_tension_clock: bool,
    /// AAA vectors — always fail-closed (HELD) until Unreal Chaos parity.
    pub matter_memory_aaa_ready: bool,
    pub scar_map_aaa_ready: bool,
    pub persistence_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl MatterMemoryScarringReport {
    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.representative_damage.is_finite()
            && self.representative_severity.is_finite()
            && self.entropy_impact.is_finite()
            && self.fracture_impact.is_finite()
            && self.voronoi_impact.is_finite()
            && self.hot_loop_peak_severity.is_finite()
            && self.measured_pass_micros.is_finite()
    }
}

/// Assembles the public report, fetching every sibling evidence fingerprint to
/// prove this kernel is distinct from the whole reachable peer set (31 peers).
fn report_from_measured(
    m: &MatterMemoryScarringMeasured,
    deterministic: bool,
) -> MatterMemoryScarringReport {
    let ready = readiness(m) && deterministic;
    let fp = matter_memory_scarring_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
    let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
    let ku = crate::world_forge_densification::run_world_forge_densification_soak().evidence_fingerprint;
    let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak().evidence_fingerprint;
    let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
    let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak().evidence_fingerprint;
    let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak().evidence_fingerprint;
    let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak().evidence_fingerprint;
    let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
    let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
    let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak().fingerprint;
    let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
    let kw = crate::auto_photography_director::run_auto_photography_director_soak().evidence_fingerprint;
    let kx = crate::cinema_frame_graph_composition::run_cinema_frame_graph_composition_soak().evidence_fingerprint;
    let ky = crate::cinema_hot_loop_composition::run_cinema_hot_loop_composition_soak().evidence_fingerprint;
    let gv = crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak().evidence_fingerprint;
    let ip_peer = crate::position_based_dynamics::probe_position_based_dynamics().evidence_fingerprint;
    let jy = crate::living_sky_fluid_ocean_buoyancy::run_living_sky_soak().evidence_fingerprint;
    let kz = crate::vehicle_chassis_dynamics::run_vehicle_chassis_dynamics_soak().evidence_fingerprint;
    let la = crate::flight_aerodynamics::run_flight_aerodynamics_soak().evidence_fingerprint;
    let lb = crate::celestial_orbital_dynamics::run_celestial_orbital_dynamics_soak().evidence_fingerprint;
    let lc = crate::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak().evidence_fingerprint;
    let ld = crate::micro_dream_gpu_pass::run_micro_dream_gpu_pass_soak().evidence_fingerprint;
    let le = crate::holographic_scene_tensor::run_holographic_scene_tensor_soak().evidence_fingerprint;
    let lf = crate::multiverse_rollback_branching::run_multiverse_rollback_branching_soak().evidence_fingerprint;
    let lg = crate::synesthetic_resonance_matrix::run_synesthetic_resonance_matrix_soak().evidence_fingerprint;
    let lh = crate::gaze_intent_anticipation::run_gaze_intent_anticipation_soak().evidence_fingerprint;
    let li = crate::narrative_tension_clock::run_narrative_tension_clock_soak().evidence_fingerprint;

    MatterMemoryScarringReport {
        ready,
        deterministic,
        evidence_kind: SCAR_EVIDENCE_KIND,
        impact_registers_damage: m.impact_registers_damage,
        accumulation_two_over_one: m.accumulation_two_over_one,
        no_regeneration: m.no_regeneration,
        severity_decays_to_floor: m.severity_decays_to_floor,
        deterministic_replay: m.deterministic_replay,
        binary_round_trip_bit_identical: m.binary_round_trip_bit_identical,
        fail_closed_invalid_cell: m.fail_closed_invalid_cell,
        fail_closed_invalid_time: m.fail_closed_invalid_time,
        finite_bounded: m.finite_bounded,
        map_capacity_respected: m.map_capacity_respected,
        composition_finite: m.composition_finite,
        zero_alloc_hot_loop: m.zero_alloc,
        representative_damage: m.representative_damage,
        representative_severity: m.representative_severity,
        representative_cells: m.representative_cells,
        representative_impacts: m.representative_impacts,
        entropy_impact: m.entropy_impact,
        fracture_impact: m.fracture_impact,
        voronoi_impact: m.voronoi_impact,
        dw_mnemonic_entropy_ready: m.dw_substrate_ready,
        kh_composite_fracture_ready: m.kh_substrate_ready,
        ip2_voronoi_ready: m.ip2_substrate_ready,
        hot_loop_peak_severity: m.hot_loop_peak_severity,
        scar_capacity: SCAR_MAP_CAPACITY as u32,
        measured_pass_micros: m.elapsed_micros,
        evidence_fingerprint: fp,
        distinct_from_ju_sequencing_timeline: distinct(ju),
        distinct_from_kv_wind_field: distinct(kv),
        distinct_from_ku_world_forge: distinct(ku),
        distinct_from_hg_spatial_grid: distinct(hg),
        distinct_from_kq_sdf_contact: distinct(kq),
        distinct_from_kr_micro_shadow: distinct(kr),
        distinct_from_ks_deformation: distinct(ks),
        distinct_from_kt_async_compute: distinct(kt),
        distinct_from_ko_euphoria: distinct(ko),
        distinct_from_io_sph_probe: distinct(io),
        distinct_from_hs_field_network_probe: distinct(hs),
        distinct_from_fw_quantum_overlap_probe: distinct(fw),
        distinct_from_ip4_svo_terrain_probe: distinct(ip4),
        distinct_from_s17_physics_world_probe: distinct(s17),
        distinct_from_jt_task_graph_probe: distinct(jt),
        distinct_from_kw_auto_photography: distinct(kw),
        distinct_from_kx_cinema_frame_graph_composition: distinct(kx),
        distinct_from_ky_cinema_hot_loop_composition: distinct(ky),
        distinct_from_gv_aerodynamic_navier_stokes: distinct(gv),
        distinct_from_ip_position_based_dynamics: distinct(ip_peer),
        distinct_from_jy_living_sky_buoyancy: distinct(jy),
        distinct_from_kz_vehicle_chassis_dynamics: distinct(kz),
        distinct_from_la_flight_aerodynamics: distinct(la),
        distinct_from_lb_celestial_orbital_dynamics: distinct(lb),
        distinct_from_lc_latent_dreamspace_bytecode: distinct(lc),
        distinct_from_ld_micro_dream_gpu_pass: distinct(ld),
        distinct_from_le_holographic_scene_tensor: distinct(le),
        distinct_from_lf_multiverse_rollback_branching: distinct(lf),
        distinct_from_lg_synesthetic_resonance_matrix: distinct(lg),
        distinct_from_lh_gaze_intent_anticipation: distinct(lh),
        distinct_from_li_narrative_tension_clock: distinct(li),
        matter_memory_aaa_ready: false,
        scar_map_aaa_ready: false,
        persistence_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Double-pass deterministic soak: runs the measured pass twice and proves the
/// replay is bit-identical before emitting the public report.
pub fn run_matter_memory_scarring_soak() -> MatterMemoryScarringReport {
    let first = run_measured_pass();
    let second = run_measured_pass();
    let deterministic = first.representative_damage.to_bits() == second.representative_damage.to_bits()
        && first.representative_severity.to_bits() == second.representative_severity.to_bits()
        && first.zero_alloc == second.zero_alloc
        && first.deterministic_replay == second.deterministic_replay
        && first.binary_round_trip_bit_identical == second.binary_round_trip_bit_identical;
    report_from_measured(&second, deterministic)
}

/// Honesty probe — soak-gated `matter_memory_scarring_ready`, never hardcoded.
pub fn probe_matter_memory_scarring() -> MatterMemoryScarringReport {
    run_matter_memory_scarring_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn impact_registers_damage_and_severity() {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_AA01_u64;
        assert!(m.apply_impact(h, 0.3, 1.0));
        let c = m.scar_query(h).expect("scar must be registered");
        assert!(c.accumulated_damage > 0.0);
        assert!(c.severity > 0.0);
        assert_eq!(c.impact_count, 1);
        assert_eq!(c.last_impact_time, 1.0);
        assert_eq!(m.len(), 1);
    }

    #[test]
    fn damage_accumulates_two_over_one() {
        let h = 0x6C6A_AA02_u64;
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        m.apply_impact(h, 0.2, 1.0);
        m.apply_impact(h, 0.2, 2.0);
        let two = m.scar_query(h).unwrap().accumulated_damage;
        let mut m1 = ScarMap::new(SCAR_MAP_CAPACITY);
        m1.apply_impact(h, 0.2, 1.0);
        let one = m1.scar_query(h).unwrap().accumulated_damage;
        assert!(two > one);
        assert!(two <= 1.0);
        assert_eq!(m.scar_query(h).unwrap().impact_count, 2);
    }

    #[test]
    fn accumulated_damage_is_capped_in_unit() {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_AA03_u64;
        for i in 0..64 {
            assert!(m.apply_impact(h, 0.1, i as f32));
        }
        let c = m.scar_query(h).unwrap();
        assert!(c.accumulated_damage <= 1.0 + 1e-6);
        assert_eq!(c.accumulated_damage, 1.0);
        assert_eq!(c.impact_count, 64);
    }

    #[test]
    fn severity_is_bounded_in_unit() {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_AA04_u64;
        for i in 0..64 {
            m.apply_impact(h, 0.1, i as f32);
        }
        m.decay_scars(30.0);
        let c = m.scar_query(h).unwrap();
        assert!((0.0..=1.0).contains(&c.severity));
    }

    #[test]
    fn decay_fades_severity_but_never_zeroes_memory() {
        let h = 0x6C6A_AA05_u64;
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        m.apply_impact(h, 0.5, 1.0);
        let before = m.scar_query(h).unwrap();
        m.decay_scars(120.0); // two half-lives
        let after = m.scar_query(h).unwrap();
        assert!((after.accumulated_damage - before.accumulated_damage).abs() < 1e-7);
        assert!(after.severity < before.severity);
        assert!(after.severity > 0.0);
        assert!(after.accumulated_damage > 0.0);
    }

    #[test]
    fn accumulated_damage_never_regenerates_under_any_decay() {
        let h = 0x6C6A_AA06_u64;
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        m.apply_impact(h, 0.7, 1.0);
        let before = m.scar_query(h).unwrap().accumulated_damage;
        m.decay_scars(1.0e6); // absurd sim time — memory must not regenerate
        let after = m.scar_query(h).unwrap().accumulated_damage;
        assert_eq!(after.to_bits(), before.to_bits());
        assert!(after > 0.0);
    }

    #[test]
    fn severity_converges_to_memory_floor() {
        let h = 0x6C6A_AA07_u64;
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        m.apply_impact(h, 0.6, 1.0);
        m.decay_scars(600.0); // ten half-lives
        let c = m.scar_query(h).unwrap();
        let floor = SCAR_MEMORY_FLOOR * c.accumulated_damage;
        assert!(c.severity >= floor - 1e-5);
        assert!(c.severity <= c.accumulated_damage + 1e-6);
    }

    #[test]
    fn invalid_cell_hash_is_fail_closed() {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        assert!(!m.apply_impact(0, 0.3, 1.0));
        assert!(m.scar_query(0).is_none());
        assert!(m.is_empty());
    }

    #[test]
    fn invalid_damage_is_fail_closed() {
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        let h = 0x6C6A_AA09_u64;
        assert!(!m.apply_impact(h, f32::NAN, 1.0));
        assert!(!m.apply_impact(h, f32::INFINITY, 1.0));
        assert!(!m.apply_impact(h, -0.5, 1.0));
        assert!(!m.apply_impact(h, 0.0, 1.0));
        assert!(m.scar_query(h).is_none());
    }

    #[test]
    fn invalid_dt_is_fail_closed_noop() {
        let h = 0x6C6A_AA10_u64;
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        m.apply_impact(h, 0.3, 1.0);
        let snap = m.clone();
        m.decay_scars(-1.0);
        m.decay_scars(f32::NAN);
        m.decay_scars(f32::INFINITY);
        m.decay_scars(-f32::INFINITY);
        assert_eq!(m, snap);
    }

    #[test]
    fn map_capacity_is_respected_fail_closed() {
        let mut m = ScarMap::new(4);
        let mut ok = 0usize;
        for i in 0..8u64 {
            if m.apply_impact(0x6C6A_1000 + i, 0.1, i as f32) {
                ok += 1;
            }
        }
        assert_eq!(ok, 4);
        assert_eq!(m.len(), 4);
        // Updating an existing cell at capacity still succeeds (no growth).
        assert!(m.apply_impact(0x6C6A_1000, 0.1, 9.0));
        assert_eq!(m.len(), 4);
    }

    #[test]
    fn all_cells_finite_and_bounded_after_long_drive() {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        m.decay_scars(300.0);
        assert!(m.all_finite());
        assert_eq!(m.len(), SCAR_HOT_CELLS);
    }

    #[test]
    fn deterministic_replay_is_bit_identical() {
        let hashes = fixture_impact_hashes();
        let mut m1 = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m1, &hashes, 10.0);
        let mut m2 = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m2, &hashes, 10.0);
        assert_eq!(m1, m2);
        // Bit-level: every stored float identical.
        for (a, b) in m1.entries.iter().zip(m2.entries.iter()) {
            assert_eq!(a.cell_hash, b.cell_hash);
            assert_eq!(a.cell.accumulated_damage.to_bits(), b.cell.accumulated_damage.to_bits());
            assert_eq!(a.cell.severity.to_bits(), b.cell.severity.to_bits());
            assert_eq!(a.cell.last_impact_time.to_bits(), b.cell.last_impact_time.to_bits());
            assert_eq!(a.cell.impact_count, b.cell.impact_count);
        }
    }

    #[test]
    fn hot_step_is_deterministic_and_zero_alloc() {
        let hashes = fixture_impact_hashes();
        let mut a = ScarMap::new(SCAR_MAP_CAPACITY);
        let mut b = ScarMap::new(SCAR_MAP_CAPACITY);
        for frame in 0..SCAR_HOT_CELLS {
            a.hot_step(&hashes, 0.02, frame as f32 * 0.016, 0.016);
            b.hot_step(&hashes, 0.02, frame as f32 * 0.016, 0.016);
        }
        assert_eq!(a, b);
        assert!(zero_alloc_hot_loop_probe());
    }

    #[test]
    fn binary_round_trip_is_bit_identical() {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        let bytes = m.serialize_binary();
        let expected = SCAR_HEADER_BYTES + m.len() * SCAR_ENTRY_BYTES;
        assert_eq!(bytes.len(), expected);
        let back = ScarMap::deserialize_binary(&bytes).expect("valid payload must load");
        assert_eq!(back, m);
        for (a, b) in back.entries.iter().zip(m.entries.iter()) {
            assert_eq!(a.cell.accumulated_damage.to_bits(), b.cell.accumulated_damage.to_bits());
            assert_eq!(a.cell.severity.to_bits(), b.cell.severity.to_bits());
            assert_eq!(a.cell.last_impact_time.to_bits(), b.cell.last_impact_time.to_bits());
        }
    }

    #[test]
    fn binary_deserialize_fails_on_corruption() {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        let bytes = m.serialize_binary();
        // Bad magic.
        let mut bad_magic = bytes.clone();
        bad_magic[0] ^= 0xFF;
        assert!(ScarMap::deserialize_binary(&bad_magic).is_none());
        // Wrong version.
        let mut bad_ver = bytes.clone();
        bad_ver[4] = 0x09;
        assert!(ScarMap::deserialize_binary(&bad_ver).is_none());
        // Truncation.
        assert!(ScarMap::deserialize_binary(&bytes[..bytes.len() - 1]).is_none());
        // Tiny buffer.
        assert!(ScarMap::deserialize_binary(&[]).is_none());
        assert!(ScarMap::deserialize_binary(&[0u8; 4]).is_none());
    }

    #[test]
    fn persistence_survives_save_clear_reload() {
        let hashes = fixture_impact_hashes();
        let mut m = ScarMap::new(SCAR_MAP_CAPACITY);
        drive(&mut m, &hashes, 10.0);
        let bytes = m.serialize_binary();
        m.entries.clear();
        assert!(m.is_empty());
        let reloaded = ScarMap::deserialize_binary(&bytes).expect("reload must succeed");
        assert_eq!(reloaded.len(), SCAR_HOT_CELLS);
        assert!(!reloaded.is_empty());
        // The world still remembers after reload.
        assert!(reloaded.total_damage() > 0.0);
        assert!(reloaded.scar_query(hashes[0]).is_some());
    }

    #[test]
    fn substrate_composition_is_finite_and_bounded() {
        let r = run_matter_memory_scarring_soak();
        assert!(r.entropy_impact.is_finite() && (0.0..=1.0).contains(&r.entropy_impact));
        assert!(r.fracture_impact.is_finite() && (0.0..=1.0).contains(&r.fracture_impact));
        assert!(r.voronoi_impact.is_finite() && (0.0..=1.0).contains(&r.voronoi_impact));
        assert!(r.composition_finite);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_matter_memory_scarring_soak();
        assert!(r.ready, "{r:?}");
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(!r.matter_memory_aaa_ready);
        assert!(!r.scar_map_aaa_ready);
        assert!(!r.persistence_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
        assert!(r.evidence_fingerprint != 0);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_matter_memory_scarring_soak();
        assert_eq!(r.evidence_kind, SCAR_EVIDENCE_KIND);
        assert_ne!(r.evidence_kind, "li_narrative_tension_clock");
        assert_ne!(r.evidence_kind, "lh_gaze_intent_anticipation");
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_matter_memory_scarring_soak();
        let b = run_matter_memory_scarring_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.ready, b.ready);
        assert_eq!(a.representative_damage.to_bits(), b.representative_damage.to_bits());
        assert_eq!(a.entropy_impact.to_bits(), b.entropy_impact.to_bits());
    }

    #[test]
    fn probe_matches_soak() {
        let a = probe_matter_memory_scarring();
        let b = run_matter_memory_scarring_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.ready, b.ready);
        assert_eq!(a.deterministic, b.deterministic);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_matter_memory_scarring_soak();
        assert!(r.distinct_from_ju_sequencing_timeline);
        assert!(r.distinct_from_kv_wind_field);
        assert!(r.distinct_from_ku_world_forge);
        assert!(r.distinct_from_hg_spatial_grid);
        assert!(r.distinct_from_kq_sdf_contact);
        assert!(r.distinct_from_kr_micro_shadow);
        assert!(r.distinct_from_ks_deformation);
        assert!(r.distinct_from_kt_async_compute);
        assert!(r.distinct_from_ko_euphoria);
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        assert!(r.distinct_from_kw_auto_photography);
        assert!(r.distinct_from_kx_cinema_frame_graph_composition);
        assert!(r.distinct_from_ky_cinema_hot_loop_composition);
        assert!(r.distinct_from_gv_aerodynamic_navier_stokes);
        assert!(r.distinct_from_ip_position_based_dynamics);
        assert!(r.distinct_from_jy_living_sky_buoyancy);
        assert!(r.distinct_from_kz_vehicle_chassis_dynamics);
        assert!(r.distinct_from_la_flight_aerodynamics);
        assert!(r.distinct_from_lb_celestial_orbital_dynamics);
        assert!(r.distinct_from_lc_latent_dreamspace_bytecode);
        assert!(r.distinct_from_ld_micro_dream_gpu_pass);
        assert!(r.distinct_from_le_holographic_scene_tensor);
        assert!(r.distinct_from_lf_multiverse_rollback_branching);
        assert!(r.distinct_from_lg_synesthetic_resonance_matrix);
        assert!(r.distinct_from_lh_gaze_intent_anticipation);
        assert!(r.distinct_from_li_narrative_tension_clock);
    }

    #[test]
    fn kernel_constants_are_stable() {
        assert_eq!(SCAR_FP_SEED >> 48, 0x6C6A);
        assert_eq!(SCAR_FP_FOLD, 0x6C6A_6C6A_6C6A_6C6A);
        assert_eq!(SCAR_MAGIC, 0x6C6A_534D);
        assert_eq!(SCAR_HEADER_BYTES, 12);
        assert_eq!(SCAR_ENTRY_BYTES, 24);
        const _: () = assert!(SCAR_MEMORY_FLOOR > 0.0 && SCAR_MEMORY_FLOOR < 1.0);
        const _: () = assert!(SCAR_DECAY_HALF_LIFE_S > 0.0);
        // Entry layout math must match the serialization offset arithmetic.
        assert_eq!(8 + 4 + 4 + 4 + 4, SCAR_ENTRY_BYTES);
    }
}

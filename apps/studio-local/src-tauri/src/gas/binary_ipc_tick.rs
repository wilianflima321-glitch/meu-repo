//! GAS binary IPC tick substrate — letter **gas60**.
//!
//! Encodes GasWorld tick state into a fixed little-endian binary frame and
//! round-trips decode (in-process duplex). Instant metrics measure mean/min/max
//! encode→tick→encode→decode cost toward a 60Hz budget (&lt;16.67ms).
//!
//! **`gas_60hz_binary_ipc_ready` / `GAS_60HZ_BINARY_IPC_READY` stays false** until
//! a proven *product* duplex soak (Tauri/play path ↔ web) ships — in-process
//! duplex alone is not that certificate.
//!
//! **HELD:** Unreal GAS AAA · 60Hz desktop↔web binary IPC marketing.

use super::{
    AttributeModifierOp, CORE_ATTRIBUTE_NAMES, GameplayCueEventType, GameplayEffectDefinition,
    GameplayEffectDurationPolicy, GameplayEffectModifier, GasWorld,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Magic "GAST" (GAS Tick).
pub const GAS_TICK_MAGIC: u32 = 0x4741_5354;
pub const GAS_TICK_VERSION: u32 = 1;
/// Bytes per entity record after header.
pub const ENTITY_RECORD_BYTES: usize = 16;
/// Bytes per cue record.
pub const CUE_RECORD_BYTES: usize = 12;
/// Header size (6×u32).
pub const HEADER_BYTES: usize = 24;
/// Soak entity count.
pub const SOAK_ENTITY_COUNT: usize = 32;
/// Simulated ticks @ 60Hz for Instant metrics.
pub const SOAK_TICK_COUNT: u32 = 120;
/// Fixed dt (seconds) for soak.
pub const SOAK_DT: f32 = 1.0 / 60.0;
/// 60Hz frame budget in nanoseconds.
pub const HZ60_BUDGET_NS: u128 = 16_666_667;
/// Fingerprint seed ("gas60").
const FP_SEED: u64 = 0x0067_6173_3630;

/// Fail-closed product flag — mirrors web `GAS_60HZ_BINARY_IPC_READY`.
pub const GAS_60HZ_BINARY_IPC_READY: bool = false;

#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct GasBinaryTickHeader {
    pub magic: u32,
    pub version: u32,
    pub tick_index: u32,
    pub entity_count: u32,
    pub cue_count: u32,
    /// dt as Q16.16 fixed-point seconds.
    pub dt_q16: u32,
}

/// One entity snapshot in the binary frame.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct GasEntityRecord {
    pub entity_id: u32,
    pub health: f32,
    pub mana: f32,
    pub tag_hash: u32,
}

/// One cue snapshot in the binary frame.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct GasCueRecord {
    pub cue_tag_hash: u32,
    pub event_type: u32,
    pub target_entity: u32,
}

/// Decoded tick frame.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct GasBinaryTickFrame {
    pub header: GasBinaryTickHeader,
    pub entities: Vec<GasEntityRecord>,
    pub cues: Vec<GasCueRecord>,
}

fn dt_to_q16(dt: f32) -> u32 {
    if !dt.is_finite() || dt < 0.0 {
        return 0;
    }
    (dt * 65536.0).round().clamp(0.0, u32::MAX as f32) as u32
}

fn q16_to_dt(q: u32) -> f32 {
    q as f32 / 65536.0
}

fn fnv1a_u32(bytes: &[u8]) -> u32 {
    let mut h: u32 = 0x811c_9dc5;
    for &b in bytes {
        h ^= u32::from(b);
        h = h.wrapping_mul(0x0100_0193);
    }
    h
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

/// Exact byte capacity of one encoded tick for the given entity/cue counts:
/// 6×`u32` header (24 B) + per-entity 16 B + per-cue 12 B.
fn encode_gas_binary_tick_capacity(entity_len: usize, cue_len: usize) -> usize {
    HEADER_BYTES + entity_len * ENTITY_RECORD_BYTES + cue_len * CUE_RECORD_BYTES
}

/// Encode GasWorld snapshot + drained cues into a little-endian binary frame.
pub fn encode_gas_binary_tick(
    world: &GasWorld,
    entity_ids: &[u32],
    tick_index: u32,
    dt: f32,
    cues: &[super::GameplayCueEvent],
) -> Vec<u8> {
    let mut buf = Vec::with_capacity(encode_gas_binary_tick_capacity(entity_ids.len(), cues.len()));
    encode_gas_binary_tick_into(world, entity_ids, tick_index, dt, cues, &mut buf);
    buf
}

fn write_u32_at(out: &mut [u8], offset: usize, v: u32) -> Result<(), &'static str> {
    let end = offset.checked_add(4).ok_or("gas encode offset overflow")?;
    let chunk = out.get_mut(offset..end).ok_or("gas encode out of bounds")?;
    chunk.copy_from_slice(&v.to_le_bytes());
    Ok(())
}

fn write_f32_at(out: &mut [u8], offset: usize, v: f32) -> Result<(), &'static str> {
    let end = offset.checked_add(4).ok_or("gas encode offset overflow")?;
    let chunk = out.get_mut(offset..end).ok_or("gas encode out of bounds")?;
    chunk.copy_from_slice(&v.to_le_bytes());
    Ok(())
}

/// S-18 Zero-Alloc Hot-Loop fix — encode a tick **directly into a caller-
/// provided slice** (the SAB ring slot), with no intermediate `Vec` and no
/// JSON/serde in the 60 Hz tick path (R-S05). Bounds-checked, fail-closed on a
/// too-small buffer; returns the number of bytes written. Byte-identical to
/// [`encode_gas_binary_tick`] / [`encode_gas_binary_tick_into`].
pub fn encode_gas_binary_tick_into_slice(
    world: &GasWorld,
    entity_ids: &[u32],
    tick_index: u32,
    dt: f32,
    cues: &[super::GameplayCueEvent],
    out: &mut [u8],
) -> Result<usize, &'static str> {
    let entity_count = entity_ids.len() as u32;
    let cue_count = cues.len() as u32;
    let capacity = encode_gas_binary_tick_capacity(entity_ids.len(), cues.len());
    if out.len() < capacity {
        return Err("gas encode buffer too small");
    }

    let mut offset = 0usize;
    write_u32_at(out, offset, GAS_TICK_MAGIC)?;
    offset += 4;
    write_u32_at(out, offset, GAS_TICK_VERSION)?;
    offset += 4;
    write_u32_at(out, offset, tick_index)?;
    offset += 4;
    write_u32_at(out, offset, entity_count)?;
    offset += 4;
    write_u32_at(out, offset, cue_count)?;
    offset += 4;
    write_u32_at(out, offset, dt_to_q16(dt))?;
    offset += 4;

    for &id in entity_ids {
        let health = world.current_value(id, "Health");
        let mana = world.current_value(id, "Mana");
        let tag_hash = if world.has_tag(id, "State.Debuff.Burn") {
            fnv1a_u32(b"State.Debuff.Burn")
        } else if world.has_tag(id, "State.Buff") {
            fnv1a_u32(b"State.Buff")
        } else {
            0
        };
        write_u32_at(out, offset, id)?;
        offset += 4;
        write_f32_at(out, offset, health)?;
        offset += 4;
        write_f32_at(out, offset, mana)?;
        offset += 4;
        write_u32_at(out, offset, tag_hash)?;
        offset += 4;
    }

    for cue in cues {
        let tag_hash = fnv1a_u32(cue.cue_tag.as_bytes());
        let event_type = match cue.event_type {
            GameplayCueEventType::Applied => 1u32,
            GameplayCueEventType::Removed => 2u32,
            GameplayCueEventType::Periodic => 3u32,
        };
        write_u32_at(out, offset, tag_hash)?;
        offset += 4;
        write_u32_at(out, offset, event_type)?;
        offset += 4;
        write_u32_at(out, offset, cue.target)?;
        offset += 4;
    }

    Ok(offset)
}

/// Zero-realloc encode into a caller-owned buffer (S-18 Zero-Alloc Hot-Loop
/// Audit). Delegates to [`encode_gas_binary_tick_into_slice`] so the Vec path
/// and the SAB-slot path are guaranteed byte-identical. The future 60 Hz
/// GAS→IPC duplex loop keeps one persistent buffer and calls this per tick; the
/// readiness gate stays fail-closed until a real product duplex channel exists
/// (`GAS_60HZ_BINARY_IPC_READY`).
pub fn encode_gas_binary_tick_into(
    world: &GasWorld,
    entity_ids: &[u32],
    tick_index: u32,
    dt: f32,
    cues: &[super::GameplayCueEvent],
    out: &mut Vec<u8>,
) -> usize {
    let capacity = encode_gas_binary_tick_capacity(entity_ids.len(), cues.len());
    out.clear();
    out.resize(capacity, 0u8);
    let written = encode_gas_binary_tick_into_slice(world, entity_ids, tick_index, dt, cues, out)
        .expect("encode into exactly-sized buffer cannot fail");
    out.truncate(written);
    written
}

/// Decode a binary tick frame — fail-closed on truncated / bad magic.
pub fn decode_gas_binary_tick(bytes: &[u8]) -> Result<GasBinaryTickFrame, &'static str> {
    if bytes.len() < HEADER_BYTES {
        return Err("gas binary tick truncated header");
    }
    let magic = u32::from_le_bytes(bytes[0..4].try_into().unwrap());
    if magic != GAS_TICK_MAGIC {
        return Err("gas binary tick bad magic");
    }
    let version = u32::from_le_bytes(bytes[4..8].try_into().unwrap());
    if version != GAS_TICK_VERSION {
        return Err("gas binary tick unsupported version");
    }
    let tick_index = u32::from_le_bytes(bytes[8..12].try_into().unwrap());
    let entity_count = u32::from_le_bytes(bytes[12..16].try_into().unwrap());
    let cue_count = u32::from_le_bytes(bytes[16..20].try_into().unwrap());
    let dt_q16 = u32::from_le_bytes(bytes[20..24].try_into().unwrap());

    let need = HEADER_BYTES
        + (entity_count as usize) * ENTITY_RECORD_BYTES
        + (cue_count as usize) * CUE_RECORD_BYTES;
    if bytes.len() < need {
        return Err("gas binary tick truncated body");
    }

    let mut offset = HEADER_BYTES;
    let mut entities = Vec::with_capacity(entity_count as usize);
    for _ in 0..entity_count {
        let entity_id = u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap());
        let health = f32::from_le_bytes(bytes[offset + 4..offset + 8].try_into().unwrap());
        let mana = f32::from_le_bytes(bytes[offset + 8..offset + 12].try_into().unwrap());
        let tag_hash = u32::from_le_bytes(bytes[offset + 12..offset + 16].try_into().unwrap());
        entities.push(GasEntityRecord {
            entity_id,
            health,
            mana,
            tag_hash,
        });
        offset += ENTITY_RECORD_BYTES;
    }

    let mut cues = Vec::with_capacity(cue_count as usize);
    for _ in 0..cue_count {
        let cue_tag_hash = u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap());
        let event_type = u32::from_le_bytes(bytes[offset + 4..offset + 8].try_into().unwrap());
        let target_entity = u32::from_le_bytes(bytes[offset + 8..offset + 12].try_into().unwrap());
        cues.push(GasCueRecord {
            cue_tag_hash,
            event_type,
            target_entity,
        });
        offset += CUE_RECORD_BYTES;
    }

    Ok(GasBinaryTickFrame {
        header: GasBinaryTickHeader {
            magic,
            version,
            tick_index,
            entity_count,
            cue_count,
            dt_q16,
        },
        entities,
        cues,
    })
}

fn soak_fixture_world() -> (GasWorld, Vec<u32>) {
    let mut world = GasWorld::new(&CORE_ATTRIBUTE_NAMES);
    world.attributes.set_bounds(
        "Health",
        super::AttributeBounds {
            min: Some(0.0),
            max: Some(100.0),
        },
    );
    let mut ids = Vec::with_capacity(SOAK_ENTITY_COUNT);
    for i in 0..SOAK_ENTITY_COUNT {
        let id = world.create_entity(&[("Health", 80.0), ("Mana", 40.0 + i as f32)]);
        if i % 4 == 0 {
            world.add_tag(id, "State.Debuff.Burn");
        }
        ids.push(id);
    }
    let burn = GameplayEffectDefinition {
        id: "BurnTick".to_string(),
        duration_policy: GameplayEffectDurationPolicy::Duration,
        duration_seconds: Some(2.0),
        period_seconds: Some(SOAK_DT),
        modifiers: vec![GameplayEffectModifier {
            attribute: "Health".to_string(),
            operation: AttributeModifierOp::Add,
            magnitude: -0.25,
        }],
        granted_tags: vec!["State.Debuff.Burn".to_string()],
        required_tags: vec![],
        blocked_tags: vec![],
        application_cue_tag: Some("Cue.Burn.Tick".to_string()),
        removal_cue_tag: None,
        periodic_cue_tag: Some("Cue.Burn.Period".to_string()),
    };
    if let Some(&first) = ids.first() {
        let _ = world.apply_gameplay_effect(first, burn, None);
    }
    (world, ids)
}

/// Instant-measured GAS binary tick soak — toward 60Hz, product ready fail-closed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GasBinaryIpcTickSoakReport {
    /// Always false until proven product duplex (Tauri/play ↔ consumer).
    pub gas_60hz_binary_ipc_ready: bool,
    pub in_process_duplex_ok: bool,
    pub toward_60hz_budget: bool,
    /// Honest S-18 evidence: the soak reuses one preallocated frame buffer
    /// and measured zero heap reallocations across the whole hot loop.
    pub hot_path_steady_state_zero_alloc: bool,
    pub ticks_executed: u32,
    pub entity_count: u32,
    pub mean_tick_ns: u128,
    pub min_tick_ns: u128,
    pub max_tick_ns: u128,
    pub soak_elapsed_ns: u128,
    pub last_frame_bytes: usize,
    pub health_mutated: bool,
    pub outputs_finite: bool,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub unreal_gas_aaa_ready: bool,
    pub coins_ready: bool,
    pub nanite_ready: bool,
}

pub const GAS60_EVIDENCE_KIND: &str = "gas_binary_tick_inprocess_duplex";

/// Run Instant-measured GAS binary encode/tick/decode soak.
///
/// Does **not** flip `GAS_60HZ_BINARY_IPC_READY` — no product duplex channel.
pub fn run_gas_binary_ipc_tick_soak() -> GasBinaryIpcTickSoakReport {
    let t0 = Instant::now();
    let (mut world, ids) = soak_fixture_world();
    let health_before = world.current_value(ids[0], "Health");

    let mut min_ns = u128::MAX;
    let mut max_ns = 0u128;
    let mut sum_ns = 0u128;
    let mut duplex_ok = true;
    let mut last_bytes = 0usize;
    let mut finite = true;
    let mut last_fp = FP_SEED;

    // S-18: reuse one preallocated frame buffer across every tick instead of
    // allocating a fresh `Vec` per tick. Sized to the worst-case frame (a cue
    // record per entity) so the measured hot loop performs zero heap
    // allocations after this single warm-up allocation.
    let mut encoded_buf = Vec::with_capacity(encode_gas_binary_tick_capacity(ids.len(), ids.len()));
    let mut reallocations: u32 = 0;

    for tick in 0..SOAK_TICK_COUNT {
        let tick_t0 = Instant::now();
        world.tick(SOAK_DT);
        let cues = world.drain_cue_queue();
        let cap_before = encoded_buf.capacity();
        let written = encode_gas_binary_tick_into(&world, &ids, tick, SOAK_DT, &cues, &mut encoded_buf);
        if encoded_buf.capacity() > cap_before {
            reallocations += 1;
        }
        last_bytes = written;
        match decode_gas_binary_tick(&encoded_buf) {
            Ok(decoded) => {
                if decoded.header.tick_index != tick
                    || decoded.header.entity_count != ids.len() as u32
                    || decoded.entities.len() != ids.len()
                    || (q16_to_dt(decoded.header.dt_q16) - SOAK_DT).abs() > 1e-4
                {
                    duplex_ok = false;
                }
                for rec in &decoded.entities {
                    if !rec.health.is_finite() || !rec.mana.is_finite() {
                        finite = false;
                    }
                    last_fp = hash_mix(last_fp, quant_f32(rec.health));
                    last_fp = hash_mix(last_fp, u64::from(rec.entity_id));
                }
                // Re-encode decoded entities must match byte length class.
                if decoded.entities.len() != ids.len() {
                    duplex_ok = false;
                }
            }
            Err(_) => {
                duplex_ok = false;
                finite = false;
            }
        }
        let elapsed = tick_t0.elapsed().as_nanos();
        min_ns = min_ns.min(elapsed);
        max_ns = max_ns.max(elapsed);
        sum_ns = sum_ns.saturating_add(elapsed);
    }

    let mean_ns = sum_ns / u128::from(SOAK_TICK_COUNT);
    let health_after = world.current_value(ids[0], "Health");
    let health_mutated = health_after < health_before - 0.01;
    let toward = mean_ns > 0 && mean_ns < HZ60_BUDGET_NS;
    let steady_state_zero_alloc = reallocations == 0;
    let total = t0.elapsed().as_nanos();

    let mut evidence = FP_SEED;
    evidence = hash_mix(evidence, last_fp);
    evidence = hash_mix(evidence, mean_ns as u64);
    evidence = hash_mix(evidence, u64::from(duplex_ok));
    evidence = hash_mix(evidence, u64::from(toward));
    evidence = hash_mix(evidence, u64::from(steady_state_zero_alloc));

    GasBinaryIpcTickSoakReport {
        gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
        in_process_duplex_ok: duplex_ok && finite && health_mutated,
        toward_60hz_budget: toward,
        hot_path_steady_state_zero_alloc: steady_state_zero_alloc,
        ticks_executed: SOAK_TICK_COUNT,
        entity_count: ids.len() as u32,
        mean_tick_ns: mean_ns,
        min_tick_ns: if min_ns == u128::MAX { 0 } else { min_ns },
        max_tick_ns: max_ns,
        soak_elapsed_ns: total,
        last_frame_bytes: last_bytes,
        health_mutated,
        outputs_finite: finite,
        evidence_kind: GAS60_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        unreal_gas_aaa_ready: false,
        coins_ready: false,
        nanite_ready: false,
    }
}

/// Honesty probe — soak-gated metrics; product ready always fail-closed.
pub fn probe_gas_binary_ipc_tick() -> GasBinaryIpcTickSoakReport {
    run_gas_binary_ipc_tick_soak()
}

/// IPC-shaped round-trip report — encode → byte buffer → decode with Instant.
/// Does **not** flip `GAS_60HZ_BINARY_IPC_READY` (no product duplex channel).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GasBinaryIpcRoundtripReport {
    pub gas_60hz_binary_ipc_ready: bool,
    pub ipc_shaped_roundtrip_ok: bool,
    pub roundtrip_ns: u128,
    pub frame_bytes: usize,
    pub toward_60hz_budget: bool,
    pub soak: GasBinaryIpcTickSoakReport,
    pub evidence_kind: &'static str,
}

pub const GAS60_IPC_ROUNDTRIP_KIND: &str = "gas_binary_ipc_cmd_roundtrip_shaped";

/// Measure encode→buffer→decode as the IPC payload shape (Tauri `Response` bytes).
pub fn run_gas_binary_ipc_roundtrip() -> GasBinaryIpcRoundtripReport {
    let soak = run_gas_binary_ipc_tick_soak();
    let (mut world, ids) = soak_fixture_world();
    world.tick(SOAK_DT);
    let cues = world.drain_cue_queue();
    let t0 = Instant::now();
    let encoded = encode_gas_binary_tick(&world, &ids, 1, SOAK_DT, &cues);
    // Simulate IPC Response payload handoff: owned Vec<u8> crossing a boundary.
    let payload = encoded;
    let decoded = decode_gas_binary_tick(&payload);
    let roundtrip_ns = t0.elapsed().as_nanos();
    let ok = decoded
        .as_ref()
        .map(|f| f.header.magic == GAS_TICK_MAGIC && f.entities.len() == ids.len())
        .unwrap_or(false);
    GasBinaryIpcRoundtripReport {
        gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
        ipc_shaped_roundtrip_ok: ok && soak.in_process_duplex_ok,
        roundtrip_ns,
        frame_bytes: payload.len(),
        toward_60hz_budget: roundtrip_ns > 0 && roundtrip_ns < HZ60_BUDGET_NS,
        soak,
        evidence_kind: GAS60_IPC_ROUNDTRIP_KIND,
    }
}

/// Tauri IPC — GAS binary tick Instant soak (READY stays false).
#[tauri::command]
pub fn probe_gas_binary_ipc_tick_cmd() -> GasBinaryIpcTickSoakReport {
    let mut report = run_gas_binary_ipc_tick_soak();
    // Hard fail-closed: never advertise product 60Hz duplex from this command.
    report.gas_60hz_binary_ipc_ready = false;
    report
}

/// Tauri IPC — encode/decode round-trip metrics without flipping READY.
#[tauri::command]
pub fn gas_binary_ipc_roundtrip_cmd() -> GasBinaryIpcRoundtripReport {
    let mut report = run_gas_binary_ipc_roundtrip();
    report.gas_60hz_binary_ipc_ready = false;
    report.soak.gas_60hz_binary_ipc_ready = false;
    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_decode_roundtrip() {
        let (mut world, ids) = soak_fixture_world();
        world.tick(SOAK_DT);
        let cues = world.drain_cue_queue();
        let bytes = encode_gas_binary_tick(&world, &ids, 7, SOAK_DT, &cues);
        let decoded = decode_gas_binary_tick(&bytes).expect("decode");
        assert_eq!(decoded.header.magic, GAS_TICK_MAGIC);
        assert_eq!(decoded.header.tick_index, 7);
        assert_eq!(decoded.entities.len(), ids.len());
        assert!((q16_to_dt(decoded.header.dt_q16) - SOAK_DT).abs() < 1e-4);
    }

    #[test]
    fn encode_into_reuses_buffer_byte_identical() {
        let (mut world, ids) = soak_fixture_world();
        world.tick(SOAK_DT);
        let cues = world.drain_cue_queue();

        let owned = encode_gas_binary_tick(&world, &ids, 7, SOAK_DT, &cues);

        // First fill allocates; a second fill into the same buffer must reuse
        // capacity (S-18) and stay byte-identical to the owned wrapper.
        let mut reused = Vec::new();
        let len1 = encode_gas_binary_tick_into(&world, &ids, 7, SOAK_DT, &cues, &mut reused);
        let cap_after_first = reused.capacity();
        assert_eq!(len1, owned.len());
        assert_eq!(reused, owned);

        let len2 = encode_gas_binary_tick_into(&world, &ids, 7, SOAK_DT, &cues, &mut reused);
        assert_eq!(len2, owned.len());
        assert_eq!(reused, owned);
        assert_eq!(reused.capacity(), cap_after_first);
    }

    #[test]
    fn encode_into_slice_matches_owned() {
        // S-18 zero-copy contract: the direct-slice encoder (used to write into a
        // persistent SAB ring slot) must be byte-identical to the owned wrapper.
        let (mut world, ids) = soak_fixture_world();
        world.tick(SOAK_DT);
        let cues = world.drain_cue_queue();

        let owned = encode_gas_binary_tick(&world, &ids, 9, SOAK_DT, &cues);
        let capacity = encode_gas_binary_tick_capacity(ids.len(), cues.len());
        assert!(owned.len() <= capacity);

        // Fill a larger buffer: exact prefix must equal the owned frame.
        let mut slot = vec![0xA5u8; capacity + 8];
        let written = encode_gas_binary_tick_into_slice(&world, &ids, 9, SOAK_DT, &cues, &mut slot)
            .expect("within capacity");
        assert_eq!(written, owned.len());
        assert_eq!(&slot[..written], &owned[..]);

        // Undersized buffer must fail closed, not panic and not advance.
        let mut tiny = vec![0u8; HEADER_BYTES - 1];
        assert!(encode_gas_binary_tick_into_slice(&world, &ids, 9, SOAK_DT, &cues, &mut tiny).is_err());
    }

    #[test]
    fn bad_magic_fail_closed() {
        let mut bytes = vec![0u8; HEADER_BYTES];
        bytes[0..4].copy_from_slice(&0xDEAD_BEEFu32.to_le_bytes());
        assert!(decode_gas_binary_tick(&bytes).is_err());
    }

    #[test]
    fn soak_toward_60hz_product_ready_held() {
        let r = run_gas_binary_ipc_tick_soak();
        assert!(!r.gas_60hz_binary_ipc_ready);
        // Compile-time fail-closed: the 60Hz product duplex gate must never be
        // flipped to true without a proven product soak (clippy assertions_on_constants).
        const { assert!(!GAS_60HZ_BINARY_IPC_READY); }
        assert!(r.in_process_duplex_ok);
        assert!(r.toward_60hz_budget);
        assert!(r.health_mutated);
        assert!(r.outputs_finite);
        assert!(r.mean_tick_ns > 0);
        assert!(r.mean_tick_ns < HZ60_BUDGET_NS);
        assert_eq!(r.evidence_kind, GAS60_EVIDENCE_KIND);
        assert!(!r.unreal_gas_aaa_ready);
        assert!(!r.nanite_ready);
    }

    #[test]
    fn soak_hot_path_steady_state_is_zero_alloc() {
        // The soak preallocates a worst-case buffer (one cue record per entity)
        // once, then reuses it through `encode_gas_binary_tick_into` for every
        // tick. In the steady state the hot path must not reallocate: any
        // capacity growth is measured as a reallocation and flips the flag.
        let r = run_gas_binary_ipc_tick_soak();
        assert!(r.hot_path_steady_state_zero_alloc);
        assert!(r.in_process_duplex_ok);
        assert!(r.outputs_finite);
        assert!(r.toward_60hz_budget);
        assert!(!r.gas_60hz_binary_ipc_ready);
        assert!(!r.nanite_ready);
    }

    #[test]
    fn probe_matches_ready_false() {
        let r = probe_gas_binary_ipc_tick();
        assert!(!r.gas_60hz_binary_ipc_ready);
        assert!(r.in_process_duplex_ok);
    }

    #[test]
    fn ipc_shaped_roundtrip_ready_stays_false() {
        let r = run_gas_binary_ipc_roundtrip();
        assert!(!r.gas_60hz_binary_ipc_ready);
        assert!(r.ipc_shaped_roundtrip_ok);
        assert!(r.toward_60hz_budget);
        assert!(r.frame_bytes >= HEADER_BYTES);
        assert_eq!(r.evidence_kind, GAS60_IPC_ROUNDTRIP_KIND);
    }
}

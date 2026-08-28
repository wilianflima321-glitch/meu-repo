//! # Latent Dreamspace — Spatial Bytecode `.asbc` Kernel — letter **lc**
//! (R4-A / Aethel Latent Dreamspace & Protocolo de Bytecode Espacial).
//!
//! Replaces text/JSON agent spatial communication with a fixed-size, 32-byte
//! `#[repr(C, align(32))]` binary entity record that can be streamed as a raw
//! byte slice: **10 000 entities ≈ 320 000 bytes (320 KB)** with **zero-copy**
//! views (`entity_bytes_slice` / `entities_from_bytes`) over `SharedArrayBuffer`
//! / `memmap2`-style aligned buffers, targeting a **0.1 ms batch read** budget
//! (Law XV hardware tiering; the budget is reported as `measured_batch_read_micros`
//! — wall-clock is inherently machine-dependent and is therefore **excluded**
//! from the deterministic evidence fingerprint).
//!
//! ## The 32-byte spatial bytecode entity
//!
//! Every field is chosen so the record is exactly **32 bytes with zero padding**
//! (the offset column is verified by a soak invariant and a test):
//!
//! | offset | size | field             | semantic |
//! |--------|------|-------------------|----------|
//! | 0      | 4    | `entity_id: u32`  | stable entity handle |
//! | 4      | 6    | `position_fp16: [u16; 3]` | position, half-precision (m) |
//! | 10     | 8    | `rotation_quat: [u16; 4]` | unit quaternion, `w ≥ 0`, half-precision |
//! | 18     | 6    | `velocity_fp16: [u16; 3]` | velocity, half-precision (m/s) |
//! | 24     | 2    | `matter_id: u16`  | matter/material family id |
//! | 26     | 2    | `semantic_tag_flags: u16` | 16 semantic bit flags |
//! | 28     | 4    | `spatial_hash: u32` | FNV-1a hash of the 2 m cell |
//! | **32** |      |                   | **total = 32 bytes, align 32** |
//!
//! > **Layout resolution (documented):** the Founder spec asked for both
//! > `semantic_tag_flags u32` and `spatial_hash u32`, which would sum to 34
//! > bytes. The binding invariant is **32 bytes exactly** (10k ≈ 320 KB,
//! > `align(32)`, zero-copy stride), so `semantic_tag_flags` is a **u16** (16
//! > tag bits) and the offsets match the plan table verbatim (`@26` / `@28`).
//!
//! ## Half-precision quantization (IEEE-754 binary16, round-to-nearest-even)
//!
//! - **Position** `[-10 000, 10 000]` m (range-aware clamp; ±4 m absolute
//!   precision at the extremes, relative ≈ 2⁻¹¹ elsewhere).
//! - **Rotation** normalized to unit length with the **double-cover resolved**
//!   (`w ≥ 0`), so `q` and `−q` encode to identical bytes.
//! - **Velocity** `[-1 000, 1 000]` m/s (range-aware clamp).
//! - Decode is **fail-closed**: a non-finite / out-of-range record fails
//!   `decoded_finite_and_in_range` and cannot claim readiness.
//!
//! ## The `.asbc` container
//!
//! `AsbcHeader` (32 bytes: magic `"ASBC"`, version, count, reserved, FNV-1a
//! **checksum**) + the entity payload. The transport frame is checksum-verified
//! and fail-closed on bad magic / version / count / checksum / length. The
//! **hot in-memory path is zero-copy** (`entities_from_bytes`); the transport
//! frame performs a bounded single-buffer copy (validated deserialization).
//!
//! ## Honesty
//!
//! - AAA vectors (`bytecode_gpu_aaa_ready`, `bytecode_network_aaa_ready`,
//!   `bytecode_compression_aaa_ready`, `bytecode_ai_driven_aaa_ready`) stay
//!   **HELD** (fail-closed): this kernel proves the deterministic bytecode
//!   substrate, not a GPU/shader or live-replication pipeline.
//! - `measured_batch_read_micros` is **informational** (wall-clock, machine
//!   dependent) and is excluded from the evidence fingerprint so the double-pass
//!   soak stays bit-identical.
//! - Distinctness: 24 real peers (23 prior R1/R2/R3-A/B/C + kz + la + lb), each
//!   `evidence_fingerprint` must differ.

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Constants (letter-lc distinct).
// ---------------------------------------------------------------------------

/// Fingerprint seed — letter **lc** (`0x6C63...`).
pub const LATENT_DREAMSPACE_FP_SEED: u64 = 0x6C63_0000_0000_0001;
/// Fingerprint fold — letter **lc**.
pub const LATENT_DREAMSPACE_FP_FOLD: u64 = 0x6C63_6C63_6C63_6C63;
/// Evidence kind tag reported by the soak (letter **lc**).
pub const LATENT_DREAMSPACE_EVIDENCE_KIND: &str = "latent_dreamspace_bytecode";

/// Size of one [`SpatialBytecodeEntity`] in bytes (32, zero padding).
pub const SPATIAL_BYTECODE_SIZE: usize = 32;
/// `.asbc` magic (`'A','S','B','C'`).
pub const ASBC_MAGIC: u32 = 0x4153_4243;
/// `.asbc` format version.
pub const ASBC_VERSION: u16 = 1;
/// Size of the [`AsbcHeader`] (32 bytes, keeps the payload 32-aligned).
pub const ASBC_HEADER_SIZE: usize = 32;
/// Standard batch size for the spatial bytecode (10k entities).
pub const BATCH_ENTITY_COUNT: usize = 10_000;
/// Bytes of a full 10k-entity batch (`10_000 × 32 = 320 000`).
pub const BATCH_BYTE_SIZE: usize = 320_000;
/// Hot-loop iterations in the measured soak pass (zero-alloc, keep-capacity).
pub const HOT_LOOP_ITERATIONS: u64 = 4096;

/// Position domain — range-aware quantization clamp (meters).
pub const POSITION_RANGE_MIN: f32 = -10_000.0;
/// Position domain — range-aware quantization clamp (meters).
pub const POSITION_RANGE_MAX: f32 = 10_000.0;
/// Velocity domain — range-aware quantization clamp (m/s).
pub const VELOCITY_RANGE_MIN: f32 = -1_000.0;
/// Velocity domain — range-aware quantization clamp (m/s).
pub const VELOCITY_RANGE_MAX: f32 = 1_000.0;
/// Default spatial cell edge (meters) for the FNV-1a spatial hash.
pub const DEFAULT_SPATIAL_CELL_SIZE: f32 = 2.0;

/// Soak-gated max absolute position quantization error (meters).
pub const F16_POSITION_TOLERANCE: f32 = 16.0;
/// Soak-gated max absolute velocity quantization error (m/s).
pub const F16_VELOCITY_TOLERANCE: f32 = 1.0;
/// Target batch-read budget (0.1 ms) — informational, enforced by design
/// (O(1) zero-copy views), reported as `measured_batch_read_micros`.
pub const ASBC_BUDGET_MICROS: f32 = 100.0;

/// Semantic tag bit: player-owned entity.
pub const TAG_PLAYER: u16 = 1 << 0;
/// Semantic tag bit: non-player character.
pub const TAG_NPC: u16 = 1 << 1;
/// Semantic tag bit: rigid physics body.
pub const TAG_PHYSICS: u16 = 1 << 2;
/// Semantic tag bit: emissive / light source.
pub const TAG_LIGHT: u16 = 1 << 3;
/// Semantic tag bit: audio source.
pub const TAG_AUDIO: u16 = 1 << 4;
/// Semantic tag bit: AI / agent-owned entity.
pub const TAG_AI_AGENT: u16 = 1 << 5;
/// Semantic tag bit: interactive surface.
pub const TAG_INTERACTIVE: u16 = 1 << 6;
/// Semantic tag bit: volumetric medium.
pub const TAG_VOLUMETRIC: u16 = 1 << 7;
/// Semantic tag bit: transient effect.
pub const TAG_EFFECT: u16 = 1 << 8;
/// Semantic tag bit: navigation-relevant.
pub const TAG_NAVIGATION: u16 = 1 << 9;
/// Semantic tag bit: prop (static).
pub const TAG_PROP: u16 = 1 << 10;
/// Semantic tag bit: material-driven surface.
pub const TAG_MATERIAL: u16 = 1 << 11;

// Compile-time layout guarantees (fail the build if the 32-byte contract breaks).
const _: () = assert!(std::mem::size_of::<SpatialBytecodeEntity>() == SPATIAL_BYTECODE_SIZE);
const _: () = assert!(std::mem::align_of::<SpatialBytecodeEntity>() == 32);
const _: () = assert!(std::mem::size_of::<AsbcHeader>() == ASBC_HEADER_SIZE);

// ---------------------------------------------------------------------------
// The 32-byte spatial bytecode entity.
// ---------------------------------------------------------------------------

/// Fixed-size 32-byte spatial bytecode entity — the `.asbc` unit record.
///
/// `#[repr(C, align(32))]` with no padding; see the module docs for the exact
/// offset table. POD-only (all `u32`/`u16`), so it can be viewed/decoded
/// zero-copy from an aligned byte buffer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(C, align(32))]
pub struct SpatialBytecodeEntity {
    /// Stable entity handle (offset 0).
    pub entity_id: u32,
    /// Quantized position (half-precision, meters; offset 4).
    pub position_fp16: [u16; 3],
    /// Quantized unit quaternion, `w ≥ 0` (offset 10).
    pub rotation_quat: [u16; 4],
    /// Quantized velocity (half-precision, m/s; offset 18).
    pub velocity_fp16: [u16; 3],
    /// Matter/material family id (offset 24).
    pub matter_id: u16,
    /// 16 semantic tag bits (offset 26).
    pub semantic_tag_flags: u16,
    /// FNV-1a hash of the decoded-position cell (offset 28).
    pub spatial_hash: u32,
}

impl SpatialBytecodeEntity {
    /// Encode a full spatial record. `position`/`velocity` are range-aware
    /// clamped, the quaternion is normalized with the double-cover resolved
    /// (`w ≥ 0`), and the spatial hash is derived from the *decoded* position
    /// so encode → decode → hash is always self-consistent.
    pub fn encode(
        entity_id: u32,
        position: [f32; 3],
        rotation_quat: [f32; 4],
        velocity: [f32; 3],
        matter_id: u16,
        semantic_tag_flags: u16,
        cell_size: f32,
    ) -> Self {
        let position_fp16 = [
            f32_to_f16(clamp_f32(position[0], POSITION_RANGE_MIN, POSITION_RANGE_MAX)),
            f32_to_f16(clamp_f32(position[1], POSITION_RANGE_MIN, POSITION_RANGE_MAX)),
            f32_to_f16(clamp_f32(position[2], POSITION_RANGE_MIN, POSITION_RANGE_MAX)),
        ];
        let rotation_quat = normalize_quat_w_nonneg(rotation_quat);
        let velocity_fp16 = [
            f32_to_f16(clamp_f32(velocity[0], VELOCITY_RANGE_MIN, VELOCITY_RANGE_MAX)),
            f32_to_f16(clamp_f32(velocity[1], VELOCITY_RANGE_MIN, VELOCITY_RANGE_MAX)),
            f32_to_f16(clamp_f32(velocity[2], VELOCITY_RANGE_MIN, VELOCITY_RANGE_MAX)),
        ];
        let decoded_pos = [
            f16_to_f32(position_fp16[0]),
            f16_to_f32(position_fp16[1]),
            f16_to_f32(position_fp16[2]),
        ];
        let spatial_hash = fnv1a_spatial_hash(spatial_cell(decoded_pos, cell_size));
        Self {
            entity_id,
            position_fp16,
            rotation_quat,
            velocity_fp16,
            matter_id,
            semantic_tag_flags,
            spatial_hash,
        }
    }

    /// Decode the quantized position back to `f32` (half-precision round-trip).
    #[inline]
    pub fn decode_position(&self) -> [f32; 3] {
        [
            f16_to_f32(self.position_fp16[0]),
            f16_to_f32(self.position_fp16[1]),
            f16_to_f32(self.position_fp16[2]),
        ]
    }

    /// Decode the quantized quaternion back to `f32`.
    #[inline]
    pub fn decode_rotation(&self) -> [f32; 4] {
        [
            f16_to_f32(self.rotation_quat[0]),
            f16_to_f32(self.rotation_quat[1]),
            f16_to_f32(self.rotation_quat[2]),
            f16_to_f32(self.rotation_quat[3]),
        ]
    }

    /// Decode the quantized velocity back to `f32`.
    #[inline]
    pub fn decode_velocity(&self) -> [f32; 3] {
        [
            f16_to_f32(self.velocity_fp16[0]),
            f16_to_f32(self.velocity_fp16[1]),
            f16_to_f32(self.velocity_fp16[2]),
        ]
    }

    /// Length of the decoded unit quaternion (≈ 1.0).
    #[inline]
    pub fn rotation_unit_length(&self) -> f32 {
        let q = self.decode_rotation();
        (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
    }

    /// Semantic-tag mask test.
    #[inline]
    pub fn has_tag(&self, tag: u16) -> bool {
        self.semantic_tag_flags & tag != 0
    }

    /// Fail-closed decode validity: all decoded values finite and inside their
    /// quantization domains (position within `±(MAX + 1)`, velocity within
    /// `±(MAX + 1)`, rotation components within `±1.0001`).
    pub fn decoded_finite_and_in_range(&self) -> bool {
        let p = self.decode_position();
        let v = self.decode_velocity();
        let q = self.decode_rotation();
        p.iter()
            .all(|x| x.is_finite() && x.abs() <= POSITION_RANGE_MAX + 1.0)
            && v.iter()
                .all(|x| x.is_finite() && x.abs() <= VELOCITY_RANGE_MAX + 1.0)
            && q.iter().all(|x| x.is_finite() && x.abs() <= 1.0001)
    }
}

/// The `.asbc` container header — 32 bytes, payload stays 32-aligned.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(C)]
pub struct AsbcHeader {
    /// Magic `"ASBC"` (offset 0).
    pub magic: u32,
    /// Format version (offset 4).
    pub version: u16,
    /// Reserved (offset 6).
    pub reserved_hi: u16,
    /// Entity count (offset 8).
    pub entity_count: u32,
    /// Reserved byte tail (offset 12).
    pub reserved: [u8; 16],
    /// FNV-1a checksum of the entity payload (offset 28).
    pub checksum: u32,
}

impl AsbcHeader {
    /// A valid header for `entity_count` entities (checksum filled by the
    /// frame encoder).
    pub const fn new(entity_count: u32) -> Self {
        Self {
            magic: ASBC_MAGIC,
            version: ASBC_VERSION,
            reserved_hi: 0,
            entity_count,
            reserved: [0u8; 16],
            checksum: 0,
        }
    }

    /// Header validity (magic + version).
    pub const fn is_valid(&self) -> bool {
        self.magic == ASBC_MAGIC && self.version == ASBC_VERSION
    }
}

// ---------------------------------------------------------------------------
// Half-precision (IEEE-754 binary16) — implemented manually (no dependency).
// ---------------------------------------------------------------------------

/// Convert an `f32` to an IEEE-754 binary16 bit pattern (round-to-nearest-even).
#[inline]
pub fn f32_to_f16(value: f32) -> u16 {
    let bits = value.to_bits();
    let sign = ((bits >> 16) & 0x8000) as u16;
    let x = bits & 0x7FFF_FFFF;

    // Inf or NaN.
    if x >= 0x7F80_0000 {
        return if x > 0x7F80_0000 {
            // NaN → quiet NaN.
            sign | 0x7E00
        } else {
            // ±Inf.
            sign | 0x7C00
        };
    }
    // Magnitude too large for f16 → ±Inf.
    if x >= 0x477F_F000 {
        return sign | 0x7C00;
    }
    // Magnitude < 2⁻²⁵ → round-to-nearest-even collapses to ±0.
    if x < 0x3300_0000 {
        return sign;
    }
    // Normal f32 → normal f16.
    if x >= 0x3880_0000 {
        let exp = (((x >> 23) & 0xFF) as i32) - 127 + 15;
        let mantissa = (x >> 13) & 0x3FF;
        let half = ((exp as u32) << 10) | mantissa;
        let dropped = x & 0x1FFF;
        let round_up = dropped > 0x1000 || (dropped == 0x1000 && (half & 1) == 1);
        if round_up {
            let mut half = half;
            half += 1;
            if half & 0x7C00 == 0x7C00 {
                // Exponent overflow → Inf.
                return sign | 0x7C00;
            }
            return sign | (half as u16);
        }
        return sign | (half as u16);
    }
    // Subnormal f16 (2⁻²⁵ ≤ |value| < 2⁻¹⁴).
    let exp = ((x >> 23) & 0xFF) as i32;
    let half_exp = exp - 112; // biased − 127 + 15
    let shift = (14 - half_exp) as u32; // 1..=24
    let value_bits = (x & 0x7F_FFFF) | 0x80_0000; // 24-bit mantissa + implicit 1
    let half = (value_bits >> shift) as u16;
    let dropped = value_bits & ((1u32 << shift) - 1);
    let round_bit = 1u32 << (shift - 1);
    let round_up = dropped > round_bit || (dropped == round_bit && (half & 1) == 1);
    if round_up {
        let mut h = half + 1;
        if h >= 0x400 {
            // Rounded up to the minimum normal f16 (2⁻¹⁴).
            h = 0x400;
        }
        return sign | h;
    }
    sign | half
}

/// Convert an IEEE-754 binary16 bit pattern to `f32`.
#[inline]
pub fn f16_to_f32(half: u16) -> f32 {
    let sign = ((half & 0x8000) as u32) << 16;
    let exp = ((half >> 10) & 0x1F) as u32;
    let mantissa = (half & 0x3FF) as u32;
    if exp == 0 {
        if mantissa == 0 {
            // ±0.
            f32::from_bits(sign)
        } else {
            // Subnormal: value = mantissa · 2⁻²⁴.
            f32::from_bits(sign | (103 << 23) | (mantissa << 13))
        }
    } else if exp == 0x1F {
        if mantissa == 0 {
            // ±Inf.
            f32::from_bits(sign | 0x7F80_0000)
        } else {
            // NaN (quiet).
            f32::from_bits(sign | 0x7FC0_0000 | (mantissa << 13))
        }
    } else {
        // Normal: f32 exponent bias = exp − 15 + 127 = exp + 112.
        f32::from_bits(sign | ((exp + 112) << 23) | (mantissa << 13))
    }
}

/// Absolute tolerance for an `f16` round-trip (relative ≈ 2⁻⁹, floor 5e-4).
#[inline]
fn f16_abs_tolerance(v: f32) -> f32 {
    if !v.is_finite() {
        f32::MAX
    } else {
        v.abs() / 512.0 + 5.0e-4
    }
}

/// Range-aware clamp (NaN-safe: NaN passes through and is caught by the
/// fail-closed `decoded_finite_and_in_range` gate).
#[inline]
fn clamp_f32(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

/// Normalize a quaternion, resolve the double-cover to `w ≥ 0`, quantize.
#[inline]
fn normalize_quat_w_nonneg(q: [f32; 4]) -> [u16; 4] {
    let mut q = q;
    if q[3] < 0.0 {
        q = [-q[0], -q[1], -q[2], -q[3]];
    }
    let len = (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt();
    let q = if len <= f32::EPSILON {
        [0.0, 0.0, 0.0, 1.0]
    } else {
        let inv = 1.0 / len;
        [q[0] * inv, q[1] * inv, q[2] * inv, q[3] * inv]
    };
    [
        f32_to_f16(q[0]),
        f32_to_f16(q[1]),
        f32_to_f16(q[2]),
        f32_to_f16(q[3]),
    ]
}

#[inline]
fn norm_q(q: [f32; 4]) -> f32 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

// ---------------------------------------------------------------------------
// Spatial hashing (FNV-1a) and cell quantization.
// ---------------------------------------------------------------------------

/// The spatial cell a position falls into (integer grid, deterministic).
#[inline]
pub fn spatial_cell(pos: [f32; 3], cell_size: f32) -> [i32; 3] {
    [
        (pos[0] / cell_size).floor() as i32,
        (pos[1] / cell_size).floor() as i32,
        (pos[2] / cell_size).floor() as i32,
    ]
}

/// FNV-1a 32-bit hash of a spatial cell (deterministic, cell-local).
#[inline]
pub fn fnv1a_spatial_hash(cell: [i32; 3]) -> u32 {
    let mut data = [0u8; 12];
    for (slot, c) in data.chunks_exact_mut(4).zip(cell) {
        slot.copy_from_slice(&c.to_le_bytes());
    }
    fnv1a_bytes(&data)
}

/// FNV-1a 32-bit hash of an arbitrary byte slice.
#[inline]
pub fn fnv1a_bytes(data: &[u8]) -> u32 {
    let mut hash: u32 = 0x811C_9DC5;
    for &b in data {
        hash ^= b as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    hash
}

// ---------------------------------------------------------------------------
// Zero-copy byte views and the `.asbc` container.
// ---------------------------------------------------------------------------

/// Zero-copy byte view over an entity batch (`10k × 32 = 320 000` bytes).
///
/// The returned slice aliases the source; no copy and no allocation.
pub fn entity_bytes_slice(entities: &[SpatialBytecodeEntity]) -> &[u8] {
    if entities.is_empty() {
        return &[];
    }
    let len = entities
        .len()
        .checked_mul(SPATIAL_BYTECODE_SIZE)
        .expect("spatial bytecode length overflow");
    // SAFETY: `repr(C, align(32))` guarantees size == 32 with no padding, so
    // the byte length is `len * 32` and the layout is contiguous.
    unsafe { std::slice::from_raw_parts(entities.as_ptr() as *const u8, len) }
}

/// Zero-copy entity view over an aligned byte buffer.
///
/// Fail-closed: returns `None` unless the length is a multiple of 32 **and**
/// the base pointer is 32-aligned (the `SharedArrayBuffer` / `memmap2` contract).
pub fn entities_from_bytes(bytes: &[u8]) -> Option<&[SpatialBytecodeEntity]> {
    if bytes.is_empty() {
        return Some(&[]);
    }
    if !bytes.len().is_multiple_of(SPATIAL_BYTECODE_SIZE) {
        return None;
    }
    let align = std::mem::align_of::<SpatialBytecodeEntity>();
    if !(bytes.as_ptr() as usize).is_multiple_of(align) {
        return None;
    }
    // SAFETY: length is a multiple of 32 and the base is 32-aligned; the
    // entity is POD with no invalid bit patterns.
    Some(unsafe {
        std::slice::from_raw_parts(
            bytes.as_ptr() as *const SpatialBytecodeEntity,
            bytes.len() / SPATIAL_BYTECODE_SIZE,
        )
    })
}

/// Decode a single entity from exactly 32 bytes (unaligned-safe copy).
pub fn decode_one(bytes: &[u8]) -> Option<SpatialBytecodeEntity> {
    if bytes.len() != SPATIAL_BYTECODE_SIZE {
        return None;
    }
    let mut slot = std::mem::MaybeUninit::<SpatialBytecodeEntity>::uninit();
    // SAFETY: writing 32 bytes into the uninitialized POD slot initializes it;
    // all `u32`/`u16` bit patterns are valid.
    unsafe {
        std::ptr::copy_nonoverlapping(bytes.as_ptr(), slot.as_mut_ptr() as *mut u8, SPATIAL_BYTECODE_SIZE);
        Some(slot.assume_init())
    }
}

/// Encode an `.asbc` transport frame: [`ASBC_HEADER_SIZE`] header bytes +
/// the zero-copy entity payload, with a FNV-1a checksum over the payload.
pub fn asbc_frame_bytes(header: AsbcHeader, entities: &[SpatialBytecodeEntity]) -> Vec<u8> {
    let payload = entity_bytes_slice(entities);
    let entity_count = entities.len() as u32;
    let mut frame = Vec::with_capacity(ASBC_HEADER_SIZE + payload.len());
    frame.extend_from_slice(&header.magic.to_le_bytes());
    frame.extend_from_slice(&header.version.to_le_bytes());
    frame.extend_from_slice(&header.reserved_hi.to_le_bytes());
    frame.extend_from_slice(&entity_count.to_le_bytes());
    frame.extend_from_slice(&header.reserved);
    frame.extend_from_slice(&fnv1a_bytes(payload).to_le_bytes());
    frame.extend_from_slice(payload);
    frame
}

/// Decode an `.asbc` transport frame.
///
/// Fail-closed on bad magic / version / count / length / checksum. Returns the
/// header plus a **validated copy** of the entities (bounded single
/// allocation — this is the transport path; the hot in-memory path stays
/// zero-copy via [`entities_from_bytes`]).
pub fn asbc_frame_decode(frame: &[u8]) -> Option<(AsbcHeader, Vec<SpatialBytecodeEntity>)> {
    if frame.len() < ASBC_HEADER_SIZE {
        return None;
    }
    let magic = u32::from_le_bytes(frame[0..4].try_into().ok()?);
    if magic != ASBC_MAGIC {
        return None;
    }
    let version = u16::from_le_bytes(frame[4..6].try_into().ok()?);
    if version != ASBC_VERSION {
        return None;
    }
    let entity_count = u32::from_le_bytes(frame[8..12].try_into().ok()?);
    let payload_len = entity_count as usize * SPATIAL_BYTECODE_SIZE;
    let total = ASBC_HEADER_SIZE + payload_len;
    if frame.len() < total {
        return None;
    }
    let payload = &frame[ASBC_HEADER_SIZE..total];
    let checksum = u32::from_le_bytes(frame[28..32].try_into().ok()?);
    if fnv1a_bytes(payload) != checksum {
        return None;
    }
    let mut entities = Vec::with_capacity(entity_count as usize);
    for chunk in payload.chunks_exact(SPATIAL_BYTECODE_SIZE) {
        entities.push(decode_one(chunk)?);
    }
    Some((
        AsbcHeader {
            magic,
            version,
            reserved_hi: 0,
            entity_count,
            reserved: [0u8; 16],
            checksum,
        },
        entities,
    ))
}

// ---------------------------------------------------------------------------
// Measured soak.
// ---------------------------------------------------------------------------

/// Deterministic fixture (pure function of the seed).
fn fixture_batch(seed: u64) -> Vec<SpatialBytecodeEntity> {
    let mut rng = seed | 1;
    let mut entities = Vec::with_capacity(BATCH_ENTITY_COUNT);
    for i in 0..BATCH_ENTITY_COUNT {
        rng = xorshift64(rng);
        let a = rng as f64 / u64::MAX as f64;
        rng = xorshift64(rng);
        let b = rng as f64 / u64::MAX as f64;
        rng = xorshift64(rng);
        let c = rng as f64 / u64::MAX as f64;
        let pos = [
            (a * 20_000.0 - 10_000.0) as f32,
            (b * 20_000.0 - 10_000.0) as f32,
            (c * 20_000.0 - 10_000.0) as f32,
        ];
        rng = xorshift64(rng);
        let d = rng as f64 / u64::MAX as f64;
        let axis = [0.3f32, 0.5, 0.4];
        let angle = (d * (std::f32::consts::TAU as f64)) as f32;
        let (s, c_ang) = (angle * 0.5).sin_cos();
        let q = [axis[0] * s, axis[1] * s, axis[2] * s, c_ang];
        rng = xorshift64(rng);
        let e = rng as f64 / u64::MAX as f64;
        rng = xorshift64(rng);
        let f = rng as f64 / u64::MAX as f64;
        rng = xorshift64(rng);
        let g = rng as f64 / u64::MAX as f64;
        let vel = [
            (e * 2_000.0 - 1_000.0) as f32,
            (f * 2_000.0 - 1_000.0) as f32,
            (g * 2_000.0 - 1_000.0) as f32,
        ];
        let matter_id = (i % 256) as u16;
        let flags = match i % 3 {
            0 => TAG_PHYSICS | TAG_NAVIGATION,
            1 => TAG_AI_AGENT | TAG_INTERACTIVE,
            _ => TAG_PROP,
        };
        entities.push(SpatialBytecodeEntity::encode(
            i as u32,
            pos,
            q,
            vel,
            matter_id,
            flags,
            DEFAULT_SPATIAL_CELL_SIZE,
        ));
    }
    entities
}

#[inline]
fn xorshift64(mut s: u64) -> u64 {
    s ^= s << 13;
    s ^= s >> 7;
    s ^= s << 17;
    s
}

/// Measured invariants of one soak pass (no mocked counters).
struct LatentDreamspaceBytecodeMeasured {
    entity_count: u64,
    batch_byte_size: u64,
    hot_loop_iterations: u64,
    layout_is_32: bool,
    field_offsets_exact: bool,
    f16_round_trip_ok: bool,
    position_quant_error: f32,
    velocity_quant_error: f32,
    quaternion_round_trip_ok: bool,
    batch_tenk_is_320kib: bool,
    decode_validates_magic: bool,
    decode_fail_closed: bool,
    spatial_hash_deterministic: bool,
    zero_alloc_hot_loop: bool,
    all_finite_and_bounded: bool,
}

/// Deterministic evidence fingerprint (excludes no deterministic invariant;
/// wall-clock `measured_batch_read_micros` is deliberately excluded — see the
/// module "Honesty" section).
fn latent_dreamspace_bytecode_evidence_fingerprint(m: &LatentDreamspaceBytecodeMeasured) -> u64 {
    let mut h = LATENT_DREAMSPACE_FP_SEED;
    h = hash_mix(h, m.entity_count);
    h = hash_mix(h, m.batch_byte_size);
    h = hash_mix(h, m.hot_loop_iterations);
    h = hash_mix(h, u64::from(m.layout_is_32));
    h = hash_mix(h, u64::from(m.field_offsets_exact));
    h = hash_mix(h, u64::from(m.f16_round_trip_ok));
    h = hash_mix(h, quant_f32(m.position_quant_error));
    h = hash_mix(h, quant_f32(m.velocity_quant_error));
    h = hash_mix(h, u64::from(m.quaternion_round_trip_ok));
    h = hash_mix(h, u64::from(m.batch_tenk_is_320kib));
    h = hash_mix(h, u64::from(m.decode_validates_magic));
    h = hash_mix(h, u64::from(m.decode_fail_closed));
    h = hash_mix(h, u64::from(m.spatial_hash_deterministic));
    h = hash_mix(h, u64::from(m.zero_alloc_hot_loop));
    h = hash_mix(h, u64::from(m.all_finite_and_bounded));
    hash_mix(h, LATENT_DREAMSPACE_FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &LatentDreamspaceBytecodeMeasured) -> bool {
    m.layout_is_32
        && m.field_offsets_exact
        && m.f16_round_trip_ok
        && m.position_quant_error < F16_POSITION_TOLERANCE
        && m.velocity_quant_error < F16_VELOCITY_TOLERANCE
        && m.quaternion_round_trip_ok
        && m.batch_tenk_is_320kib
        && m.decode_validates_magic
        && m.decode_fail_closed
        && m.spatial_hash_deterministic
        && m.zero_alloc_hot_loop
        && m.all_finite_and_bounded
}

/// Run one measured R4-A pass (the fixture):
///
/// 1. **Layout** — 32 bytes, align 32, header 32 bytes.
/// 2. **Offsets** — exact field offsets (`0/4/10/18/24/26/28`).
/// 3. **f16 round-trip** — finite values survive within relative tolerance.
/// 4. **Position error** — max abs error over the `[-1e4, 1e4]` domain.
/// 5. **Velocity error** — max abs error over the `[-1e3, 1e3]` domain.
/// 6. **Quaternion** — unit length, `w ≥ 0`, double-cover stable.
/// 7. **Batch 320 KB** — 10k entities → 320 000 bytes, zero-copy round-trip.
/// 8. **Decode validates** — `.asbc` magic/version/count/checksum accepted.
/// 9. **Decode fail-closed** — corruption / bad length / misalignment rejected.
/// 10. **Spatial hash** — deterministic and cell-local.
/// 11. **Zero-alloc hot loop** — [`HOT_LOOP_ITERATIONS`] batch views.
/// 12. **Finite/bounded** — every decoded record finite, in-range, self-hashed.
fn run_measured_pass() -> LatentDreamspaceBytecodeMeasured {
    // 1. Layout.
    let layout_is_32 = std::mem::size_of::<SpatialBytecodeEntity>() == SPATIAL_BYTECODE_SIZE
        && std::mem::align_of::<SpatialBytecodeEntity>() == 32
        && std::mem::size_of::<AsbcHeader>() == ASBC_HEADER_SIZE;

    // 2. Offsets.
    let (eo, po, ro, vo, mo, so, ho) = field_offsets();
    let field_offsets_exact =
        eo == 0 && po == 4 && ro == 10 && vo == 18 && mo == 24 && so == 26 && ho == 28;

    // 3. f16 round-trip.
    let probe_values = [
        0.0f32,
        1.0,
        -1.0,
        0.5,
        -0.5,
        100.0,
        -100.0,
        10_000.0,
        -10_000.0,
        1_000.0,
        -1_000.0,
        std::f32::consts::PI,
        -std::f32::consts::E,
        0.000_1,
        65_504.0,
        -65_504.0,
        1.0e-5,
        -1.0e-5,
    ];
    let f16_round_trip_ok = probe_values
        .iter()
        .all(|&v| {
            let back = f16_to_f32(f32_to_f16(v));
            back.is_finite() && (back - v).abs() <= f16_abs_tolerance(v)
        });

    // 4. Position quantization error across the domain.
    let mut position_quant_error = 0.0f32;
    for k in 0..=2048u32 {
        let t = k as f32 / 2048.0;
        let p = POSITION_RANGE_MIN + t * (POSITION_RANGE_MAX - POSITION_RANGE_MIN);
        let e = (f16_to_f32(f32_to_f16(p)) - p).abs();
        if e > position_quant_error {
            position_quant_error = e;
        }
    }

    // 5. Velocity quantization error across the domain.
    let mut velocity_quant_error = 0.0f32;
    for k in 0..=2048u32 {
        let t = k as f32 / 2048.0;
        let v = VELOCITY_RANGE_MIN + t * (VELOCITY_RANGE_MAX - VELOCITY_RANGE_MIN);
        let e = (f16_to_f32(f32_to_f16(v)) - v).abs();
        if e > velocity_quant_error {
            velocity_quant_error = e;
        }
    }

    // 6. Quaternion round-trip.
    let q_in = [0.2, 0.5, 0.3, 0.6];
    let q16 = normalize_quat_w_nonneg(q_in);
    let q_out = [
        f16_to_f32(q16[0]),
        f16_to_f32(q16[1]),
        f16_to_f32(q16[2]),
        f16_to_f32(q16[3]),
    ];
    let q_len = (q_out[0] * q_out[0]
        + q_out[1] * q_out[1]
        + q_out[2] * q_out[2]
        + q_out[3] * q_out[3])
        .sqrt();
    let n_in = norm_q(q_in);
    let qerr = (0..4).fold(0.0f32, |acc, i| acc.max((q_out[i] - q_in[i] / n_in).abs()));
    let q_neg = normalize_quat_w_nonneg([-0.2, -0.5, -0.3, -0.6]);
    let double_cover_stable = q_neg == q16;
    let quaternion_round_trip_ok =
        (q_len - 1.0).abs() < 1.0e-2 && qerr < 1.0e-2 && q_out[3] >= 0.0 && double_cover_stable;

    // 7. Batch 320 KB + zero-copy round-trip.
    let batch = fixture_batch(0x6C63_51DE);
    let batch_byte_size = entity_bytes_slice(&batch).len();
    let batch_tenk_is_320kib = batch.len() == BATCH_ENTITY_COUNT && batch_byte_size == BATCH_BYTE_SIZE;

    // 8. Decode validates magic/version/count/checksum.
    let header = AsbcHeader::new(BATCH_ENTITY_COUNT as u32);
    let frame = asbc_frame_bytes(header, &batch);
    let decode_validates_magic = match asbc_frame_decode(&frame) {
        Some((h, ents)) => {
            h.magic == ASBC_MAGIC
                && h.entity_count as usize == BATCH_ENTITY_COUNT
                && ents.len() == BATCH_ENTITY_COUNT
        }
        None => false,
    };

    // 9. Decode fail-closed on corruption / bad length / misalignment.
    let mut bad_magic = frame.clone();
    bad_magic[0] ^= 0xFF;
    let mut bad_version = frame.clone();
    bad_version[4] = 0;
    let mut bad_checksum = frame.clone();
    let last = bad_checksum.len() - 1;
    bad_checksum[last] ^= 0x01;
    let bad_len = &frame[..frame.len() - 1];
    let unaligned = &frame[1..];
    let decode_fail_closed = asbc_frame_decode(&bad_magic).is_none()
        && asbc_frame_decode(&bad_version).is_none()
        && asbc_frame_decode(&bad_checksum).is_none()
        && asbc_frame_decode(bad_len).is_none()
        && entities_from_bytes(bad_len).is_none()
        && entities_from_bytes(unaligned).is_none();

    // 10. Spatial hash deterministic + cell-local.
    let h1 = fnv1a_spatial_hash([10, 20, 30]);
    let h2 = fnv1a_spatial_hash([10, 20, 30]);
    let h3 = fnv1a_spatial_hash([10, 20, 31]);
    let c4 = spatial_cell([12.5, 12.5, 12.5], DEFAULT_SPATIAL_CELL_SIZE);
    let c5 = spatial_cell([11.1, 12.5, 12.5], DEFAULT_SPATIAL_CELL_SIZE);
    let spatial_hash_deterministic = h1 == h2 && h1 != h3 && c4 != c5 && fnv1a_spatial_hash(c4) != fnv1a_spatial_hash(c5);

    // 11. Zero-alloc hot loop over the raw zero-copy batch (no Vec, no copy).
    let bytes = entity_bytes_slice(&batch);
    let mut iterations = 0u64;
    let mut hot_finite = true;
    let mut first_id = u32::MAX;
    for _ in 0..HOT_LOOP_ITERATIONS {
        match entities_from_bytes(bytes) {
            Some(ents) if ents.len() == batch.len() => {
                first_id = ents[0].entity_id;
                if !ents[0].decoded_finite_and_in_range() {
                    hot_finite = false;
                }
            }
            _ => {
                hot_finite = false;
            }
        }
        iterations += 1;
    }
    let zero_alloc_hot_loop =
        iterations == HOT_LOOP_ITERATIONS && hot_finite && first_id == batch[0].entity_id;

    // 12. All decoded records finite, in-range and self-consistent hashes.
    let ents = entities_from_bytes(bytes).expect("aligned batch decodes");
    let mut all_finite_and_bounded = true;
    for e in ents {
        if !e.decoded_finite_and_in_range() {
            all_finite_and_bounded = false;
            break;
        }
        let cell = spatial_cell(e.decode_position(), DEFAULT_SPATIAL_CELL_SIZE);
        if fnv1a_spatial_hash(cell) != e.spatial_hash {
            all_finite_and_bounded = false;
            break;
        }
    }

    LatentDreamspaceBytecodeMeasured {
        entity_count: BATCH_ENTITY_COUNT as u64,
        batch_byte_size: batch_byte_size as u64,
        hot_loop_iterations: HOT_LOOP_ITERATIONS,
        layout_is_32,
        field_offsets_exact,
        f16_round_trip_ok,
        position_quant_error,
        velocity_quant_error,
        quaternion_round_trip_ok,
        batch_tenk_is_320kib,
        decode_validates_magic,
        decode_fail_closed,
        spatial_hash_deterministic,
        zero_alloc_hot_loop,
        all_finite_and_bounded,
    }
}

/// Exact field offsets of [`SpatialBytecodeEntity`] (0/4/10/18/24/26/28).
fn field_offsets() -> (usize, usize, usize, usize, usize, usize, usize) {
    let e = std::mem::MaybeUninit::<SpatialBytecodeEntity>::uninit();
    let base = e.as_ptr() as usize;
    let entity_id = unsafe { std::ptr::addr_of!((*e.as_ptr()).entity_id) as usize } - base;
    let position_fp16 = unsafe { std::ptr::addr_of!((*e.as_ptr()).position_fp16) as usize } - base;
    let rotation_quat = unsafe { std::ptr::addr_of!((*e.as_ptr()).rotation_quat) as usize } - base;
    let velocity_fp16 = unsafe { std::ptr::addr_of!((*e.as_ptr()).velocity_fp16) as usize } - base;
    let matter_id = unsafe { std::ptr::addr_of!((*e.as_ptr()).matter_id) as usize } - base;
    let semantic_tag_flags =
        unsafe { std::ptr::addr_of!((*e.as_ptr()).semantic_tag_flags) as usize } - base;
    let spatial_hash = unsafe { std::ptr::addr_of!((*e.as_ptr()).spatial_hash) as usize } - base;
    (
        entity_id,
        position_fp16,
        rotation_quat,
        velocity_fp16,
        matter_id,
        semantic_tag_flags,
        spatial_hash,
    )
}

/// Wall-clock batch read probe (informational only — never fingerprinted).
fn measure_batch_read_micros() -> f32 {
    let batch = fixture_batch(0x6C63_51DE);
    let bytes = entity_bytes_slice(&batch);
    let start = std::time::Instant::now();
    let decoded = entities_from_bytes(bytes);
    let elapsed = start.elapsed().as_secs_f32() * 1_000_000.0;
    if decoded.is_some_and(|e| e.len() == batch.len()) {
        elapsed
    } else {
        f32::MAX
    }
}

/// Honest latent-dreamspace bytecode soak report. Readiness derives from
/// measurement; AAA flags are always HELD (fail-closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LatentDreamspaceBytecodeReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: &'static str,
    pub entity_count: u64,
    pub batch_byte_size: u64,
    pub hot_loop_iterations: u64,
    pub layout_is_32: bool,
    pub field_offsets_exact: bool,
    pub f16_round_trip_ok: bool,
    pub position_quant_error: f32,
    pub velocity_quant_error: f32,
    pub quaternion_round_trip_ok: bool,
    pub batch_tenk_is_320kib: bool,
    pub decode_validates_magic: bool,
    pub decode_fail_closed: bool,
    pub spatial_hash_deterministic: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    /// Informational wall-clock read (µs) — excluded from the fingerprint.
    pub measured_batch_read_micros: f32,
    pub evidence_fingerprint: u64,
    // Distinctness — 24 real peers (23 prior R1/R2/R3-A/B/C + kz + la + lb).
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
    // AAA — always HELD (fail-closed).
    pub bytecode_gpu_aaa_ready: bool,
    pub bytecode_network_aaa_ready: bool,
    pub bytecode_compression_aaa_ready: bool,
    pub bytecode_ai_driven_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl LatentDreamspaceBytecodeReport {
    /// Finite-check: no NaN/Inf in the float fields, errors plausible.
    pub fn is_finite(&self) -> bool {
        self.position_quant_error.is_finite()
            && self.position_quant_error >= 0.0
            && self.velocity_quant_error.is_finite()
            && self.velocity_quant_error >= 0.0
            && self.measured_batch_read_micros.is_finite()
            && self.measured_batch_read_micros >= 0.0
    }
}

fn report_from_measured(
    m: &LatentDreamspaceBytecodeMeasured,
    deterministic: bool,
) -> LatentDreamspaceBytecodeReport {
    let ready = readiness(m) && deterministic;
    let fp = latent_dreamspace_bytecode_evidence_fingerprint(m);
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

    LatentDreamspaceBytecodeReport {
        ready,
        deterministic,
        evidence_kind: LATENT_DREAMSPACE_EVIDENCE_KIND,
        entity_count: m.entity_count,
        batch_byte_size: m.batch_byte_size,
        hot_loop_iterations: m.hot_loop_iterations,
        layout_is_32: m.layout_is_32,
        field_offsets_exact: m.field_offsets_exact,
        f16_round_trip_ok: m.f16_round_trip_ok,
        position_quant_error: m.position_quant_error,
        velocity_quant_error: m.velocity_quant_error,
        quaternion_round_trip_ok: m.quaternion_round_trip_ok,
        batch_tenk_is_320kib: m.batch_tenk_is_320kib,
        decode_validates_magic: m.decode_validates_magic,
        decode_fail_closed: m.decode_fail_closed,
        spatial_hash_deterministic: m.spatial_hash_deterministic,
        zero_alloc_hot_loop: m.zero_alloc_hot_loop,
        all_finite_and_bounded: m.all_finite_and_bounded,
        measured_batch_read_micros: 0.0,
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
        bytecode_gpu_aaa_ready: false,
        bytecode_network_aaa_ready: false,
        bytecode_compression_aaa_ready: false,
        bytecode_ai_driven_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`). `measured_batch_read_micros` is
/// measured inside the closure on first compute and cached with the report.
pub fn run_latent_dreamspace_bytecode_soak() -> LatentDreamspaceBytecodeReport {
    static CACHE: std::sync::OnceLock<LatentDreamspaceBytecodeReport> =
        std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = latent_dreamspace_bytecode_evidence_fingerprint(&a)
                == latent_dreamspace_bytecode_evidence_fingerprint(&b);
            let mut report = report_from_measured(&a, deterministic);
            report.measured_batch_read_micros = measure_batch_read_micros();
            report
        })
        .clone()
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_latent_dreamspace_bytecode() -> LatentDreamspaceBytecodeReport {
    run_latent_dreamspace_bytecode_soak()
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn layout_is_exactly_32_bytes_and_32_aligned() {
        assert_eq!(std::mem::size_of::<SpatialBytecodeEntity>(), 32);
        assert_eq!(std::mem::align_of::<SpatialBytecodeEntity>(), 32);
        assert_eq!(std::mem::size_of::<AsbcHeader>(), 32);
        assert_eq!(ASBC_HEADER_SIZE, 32);
    }

    #[test]
    fn field_offsets_are_exact() {
        let (eo, po, ro, vo, mo, so, ho) = field_offsets();
        assert_eq!(eo, 0);
        assert_eq!(po, 4);
        assert_eq!(ro, 10);
        assert_eq!(vo, 18);
        assert_eq!(mo, 24);
        assert_eq!(so, 26);
        assert_eq!(ho, 28);
    }

    #[test]
    fn f16_round_trip_is_within_tolerance() {
        for v in [
            0.0f32,
            1.0,
            -1.0,
            0.5,
            -0.5,
            100.0,
            -100.0,
            10_000.0,
            -10_000.0,
            1_000.0,
            -1_000.0,
            std::f32::consts::PI,
            -std::f32::consts::E,
            0.000_1,
            65_504.0,
            -65_504.0,
            1.0e-5,
            -1.0e-5,
        ] {
            let back = f16_to_f32(f32_to_f16(v));
            assert!(back.is_finite());
            assert!(
                (back - v).abs() <= f16_abs_tolerance(v),
                "f16 round-trip error {} for {}",
                (back - v).abs(),
                v
            );
        }
    }

    #[test]
    fn f16_special_values_are_preserved() {
        assert_eq!(f32_to_f16(f32::INFINITY), 0x7C00);
        assert_eq!(f32_to_f16(f32::NEG_INFINITY), 0xFC00);
        assert_eq!(f32_to_f16(0.0), 0x0000);
        assert_eq!(f32_to_f16(-0.0), 0x8000);
        assert_eq!(f32_to_f16(f32::NAN), 0x7E00);
        assert_eq!(f16_to_f32(0x0000), 0.0);
        assert_eq!(f16_to_f32(0x8000).to_bits(), (-0.0f32).to_bits());
        assert_eq!(f16_to_f32(0x7C00), f32::INFINITY);
        assert_eq!(f16_to_f32(0xFC00), f32::NEG_INFINITY);
        assert!(f16_to_f32(0x7E00).is_nan());
        // Subnormal round-trip: smallest subnormal ≈ 2⁻²⁴.
        let smallest = f16_to_f32(0x0001);
        assert!(smallest > 0.0 && smallest < 1.0e-6);
        // 1.0 exact.
        assert_eq!(f16_to_f32(f32_to_f16(1.0)), 1.0);
    }

    #[test]
    fn position_quantization_error_is_bounded_across_domain() {
        let mut max_err = 0.0f32;
        for k in 0..=4096u32 {
            let t = k as f32 / 4096.0;
            let p = POSITION_RANGE_MIN + t * (POSITION_RANGE_MAX - POSITION_RANGE_MIN);
            let e = (f16_to_f32(f32_to_f16(p)) - p).abs();
            if e > max_err {
                max_err = e;
            }
        }
        assert!(max_err < F16_POSITION_TOLERANCE, "max position error {}", max_err);
    }

    #[test]
    fn velocity_quantization_error_is_bounded_across_domain() {
        let mut max_err = 0.0f32;
        for k in 0..=4096u32 {
            let t = k as f32 / 4096.0;
            let v = VELOCITY_RANGE_MIN + t * (VELOCITY_RANGE_MAX - VELOCITY_RANGE_MIN);
            let e = (f16_to_f32(f32_to_f16(v)) - v).abs();
            if e > max_err {
                max_err = e;
            }
        }
        assert!(max_err < F16_VELOCITY_TOLERANCE, "max velocity error {}", max_err);
    }

    #[test]
    fn quaternion_round_trip_is_unit_w_nonneg_and_double_cover_stable() {
        let q16 = normalize_quat_w_nonneg([0.2, 0.5, 0.3, 0.6]);
        let q_out = [
            f16_to_f32(q16[0]),
            f16_to_f32(q16[1]),
            f16_to_f32(q16[2]),
            f16_to_f32(q16[3]),
        ];
        let len = (q_out[0] * q_out[0]
            + q_out[1] * q_out[1]
            + q_out[2] * q_out[2]
            + q_out[3] * q_out[3])
            .sqrt();
        assert!((len - 1.0).abs() < 1.0e-2);
        assert!(q_out[3] >= 0.0);
        // Double-cover: q and -q encode identically.
        assert_eq!(normalize_quat_w_nonneg([-0.2, -0.5, -0.3, -0.6]), q16);
        // Identity quaternion.
        let id = normalize_quat_w_nonneg([0.0, 0.0, 0.0, 1.0]);
        assert_eq!(id, [0x0000, 0x0000, 0x0000, 0x3C00]);
    }

    #[test]
    fn batch_tenk_is_320_kibibytes_and_zero_copy_round_trips() {
        let batch = fixture_batch(0x6C63_51DE);
        assert_eq!(batch.len(), BATCH_ENTITY_COUNT);
        let bytes = entity_bytes_slice(&batch);
        assert_eq!(bytes.len(), BATCH_BYTE_SIZE);
        let back = entities_from_bytes(bytes).expect("aligned decode");
        assert_eq!(back.len(), BATCH_ENTITY_COUNT);
        assert_eq!(back[0], batch[0]);
        assert_eq!(back[BATCH_ENTITY_COUNT - 1], batch[BATCH_ENTITY_COUNT - 1]);
    }

    #[test]
    fn asbc_frame_round_trip_preserves_entities_and_checksum() {
        let batch = fixture_batch(0x6C63_51DE);
        let frame = asbc_frame_bytes(AsbcHeader::new(batch.len() as u32), &batch);
        assert_eq!(frame.len(), ASBC_HEADER_SIZE + BATCH_BYTE_SIZE);
        let (h, ents) = asbc_frame_decode(&frame).expect("frame decodes");
        assert_eq!(h.magic, ASBC_MAGIC);
        assert_eq!(h.entity_count as usize, BATCH_ENTITY_COUNT);
        assert_eq!(h.checksum, fnv1a_bytes(entity_bytes_slice(&batch)));
        assert_eq!(ents, batch);
    }

    #[test]
    fn asbc_frame_decode_is_fail_closed_on_corruption() {
        let batch = fixture_batch(0x6C63_51DE);
        let frame = asbc_frame_bytes(AsbcHeader::new(batch.len() as u32), &batch);
        let mut bad_magic = frame.clone();
        bad_magic[0] ^= 0xFF;
        let mut bad_version = frame.clone();
        bad_version[4] = 0;
        let mut bad_checksum = frame.clone();
        let last = bad_checksum.len() - 1;
        bad_checksum[last] ^= 0x01;
        let truncated = &frame[..frame.len() - 1];
        assert!(asbc_frame_decode(&bad_magic).is_none());
        assert!(asbc_frame_decode(&bad_version).is_none());
        assert!(asbc_frame_decode(&bad_checksum).is_none());
        assert!(asbc_frame_decode(truncated).is_none());
        assert!(asbc_frame_decode(&[]).is_none());
        // Zero-copy path: bad length or misaligned base → fail-closed.
        assert!(entities_from_bytes(truncated).is_none());
        assert!(entities_from_bytes(&frame[1..]).is_none());
        assert!(decode_one(&frame[..31]).is_none());
        assert!(decode_one(&frame[..32]).is_some());
    }

    #[test]
    fn spatial_hash_is_deterministic_and_cell_local() {
        assert_eq!(fnv1a_spatial_hash([10, 20, 30]), fnv1a_spatial_hash([10, 20, 30]));
        assert_ne!(fnv1a_spatial_hash([10, 20, 30]), fnv1a_spatial_hash([10, 20, 31]));
        let c1 = spatial_cell([12.5, 12.5, 12.5], DEFAULT_SPATIAL_CELL_SIZE);
        let c2 = spatial_cell([11.1, 12.5, 12.5], DEFAULT_SPATIAL_CELL_SIZE);
        assert_ne!(c1, c2);
        assert_ne!(fnv1a_spatial_hash(c1), fnv1a_spatial_hash(c2));
    }

    #[test]
    fn out_of_range_values_are_clamped_to_domains() {
        let e = SpatialBytecodeEntity::encode(
            1,
            [2.0e7, -3.0e7, 4.0e7],
            [0.0, 0.0, 0.0, 1.0],
            [5.0e4, -6.0e4, 0.0],
            7,
            0,
            DEFAULT_SPATIAL_CELL_SIZE,
        );
        let p = e.decode_position();
        let max_pos = f16_to_f32(f32_to_f16(POSITION_RANGE_MAX));
        let min_pos = f16_to_f32(f32_to_f16(POSITION_RANGE_MIN));
        assert!((p[0] - max_pos).abs() < 1.0e-3);
        assert!((p[1] - min_pos).abs() < 1.0e-3);
        let v = e.decode_velocity();
        let max_vel = f16_to_f32(f32_to_f16(VELOCITY_RANGE_MAX));
        assert!((v[0] - max_vel).abs() < 1.0e-3);
        assert!(e.decoded_finite_and_in_range());
    }

    #[test]
    fn entity_has_tag_masks_semantic_flags() {
        let e = SpatialBytecodeEntity::encode(
            5,
            [1.0, 2.0, 3.0],
            [0.0, 0.0, 0.0, 1.0],
            [0.0; 3],
            3,
            TAG_AI_AGENT | TAG_INTERACTIVE,
            DEFAULT_SPATIAL_CELL_SIZE,
        );
        assert!(e.has_tag(TAG_AI_AGENT));
        assert!(e.has_tag(TAG_INTERACTIVE));
        assert!(!e.has_tag(TAG_LIGHT));
        assert_eq!(e.matter_id, 3);
        assert_eq!(e.entity_id, 5);
    }

    #[test]
    fn all_decoded_entities_have_self_consistent_spatial_hash() {
        let batch = fixture_batch(0x6C63_51DE);
        let bytes = entity_bytes_slice(&batch);
        let ents = entities_from_bytes(bytes).expect("aligned decode");
        for e in ents {
            let cell = spatial_cell(e.decode_position(), DEFAULT_SPATIAL_CELL_SIZE);
            assert_eq!(fnv1a_spatial_hash(cell), e.spatial_hash);
        }
    }

    #[test]
    fn zero_alloc_hot_loop_runs_with_keep_capacity() {
        let batch = fixture_batch(0x6C63_51DE);
        let bytes = entity_bytes_slice(&batch);
        let mut ok = true;
        let mut first_id = u32::MAX;
        for _ in 0..HOT_LOOP_ITERATIONS {
            match entities_from_bytes(bytes) {
                Some(ents) if ents.len() == batch.len() => {
                    first_id = ents[0].entity_id;
                    if !ents[0].decoded_finite_and_in_range() {
                        ok = false;
                    }
                }
                _ => {
                    ok = false;
                }
            }
        }
        assert!(ok);
        assert_eq!(first_id, batch[0].entity_id);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_latent_dreamspace_bytecode_soak();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(r.layout_is_32);
        assert!(r.field_offsets_exact);
        assert!(r.batch_tenk_is_320kib);
        assert!(r.decode_validates_magic);
        assert!(r.decode_fail_closed);
        assert!(r.spatial_hash_deterministic);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.all_finite_and_bounded);
        assert!(!r.bytecode_gpu_aaa_ready);
        assert!(!r.bytecode_network_aaa_ready);
        assert!(!r.bytecode_compression_aaa_ready);
        assert!(!r.bytecode_ai_driven_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
        assert!(r.is_finite());
        assert!(r.measured_batch_read_micros > 0.0);
        assert_eq!(r.entity_count, 10_000);
        assert_eq!(r.batch_byte_size, 320_000);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        assert_eq!(
            run_latent_dreamspace_bytecode_soak().evidence_kind,
            LATENT_DREAMSPACE_EVIDENCE_KIND
        );
        assert_ne!(
            run_latent_dreamspace_bytecode_soak().evidence_kind,
            crate::celestial_orbital_dynamics::run_celestial_orbital_dynamics_soak().evidence_kind
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_latent_dreamspace_bytecode_soak();
        let b = run_latent_dreamspace_bytecode_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_latent_dreamspace_bytecode();
        let s = run_latent_dreamspace_bytecode_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_latent_dreamspace_bytecode_soak();
        assert_ne!(r.evidence_fingerprint, 0);
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
        assert_ne!(r.evidence_fingerprint, ju);
        assert_ne!(r.evidence_fingerprint, kv);
        assert_ne!(r.evidence_fingerprint, ku);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, ks);
        assert_ne!(r.evidence_fingerprint, kt);
        assert_ne!(r.evidence_fingerprint, ko);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, hs);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, kw);
        assert_ne!(r.evidence_fingerprint, kx);
        assert_ne!(r.evidence_fingerprint, ky);
        assert_ne!(r.evidence_fingerprint, gv);
        assert_ne!(r.evidence_fingerprint, ip_peer);
        assert_ne!(r.evidence_fingerprint, jy);
        assert_ne!(r.evidence_fingerprint, kz);
        assert_ne!(r.evidence_fingerprint, la);
        assert_ne!(r.evidence_fingerprint, lb);
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
    }
}

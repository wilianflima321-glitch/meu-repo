//! # Wind Field Dynamics Kernel — letter **kv** (R2-H / Vanguarda P2).
//!
//! Deterministic wind authority for the World Forge: a cell-structured wind
//! field grid that (a) **bends the R2-G densified vegetation/grass geometry**,
//! (b) **advects a scalar field** with a semi-Lagrangian scheme, and (c)
//! produces an **HRTF-ready audio envelope** (a parameter producer only — the
//! spatial audio pipeline itself is HELD fail-closed).
//!
//! The kernel consumes the R2-G **rest state** exclusively through the public
//! `BendPayload` API (`world_forge_densification::bend_payload`) — zero edits
//! to that substrate, composed purely through its public types
//! (`BendPayload`, `DensificationConfig`, `DensificationField`, `KIND_*`).
//!
//! The kernel owns the *mathematical invariants* of AAA-grade wind:
//!
//! - **Determinism** — every grid node derives a splitmix64 PRNG state from
//!   `(seed, ix, iy, iz)`; the same seed always yields bit-identical wind
//!   samples, gust phase and maxima.
//! - **Boundedness** — `wind_at` clamps the 3D wind magnitude to a
//!   config-derived `max_speed`; bends never exceed the 60° limit; the audio
//!   envelope is always in `[0, 1]` per band with an azimuth in `[0, 360)`.
//! - **CFL-guarded advection** — a semi-Lagrangian back-trace with a
//!   double-buffered scalar field; `advance` fails closed if `dt` exceeds the
//!   CFL bound or is non-finite/non-positive.
//! - **Compliant bending** — bend amount is `compliance × speed_frac ×
//!   height_factor` where compliance `= BEND_STIFFNESS_KC / (stiffness +
//!   BEND_STIFFNESS_KC)`; grass (stiffness 1.0) bends, rock (stiffness 1e9)
//!   stays effectively rigid.
//!
//! ## Edges (composed through public APIs — no substrate modification)
//!
//! - **R2-H → R2-G (ku)** — `bend_from_payload` consumes each densified
//!   instance's `BendPayload`; the soak drives a real `DensificationField`
//!   and asserts every bent instance is finite, in `[0, 1]`, within the 60°
//!   bend limit and unit-axis. The wind field cannot claim to bend matter the
//!   densifier did not produce.
//! - **Advection** — semi-Lagrangian scalar advection; the soak asserts mass
//!   drift stays within `ADV_DRIFT_TOL` and outputs are finite/bounded.
//! - **Audio envelope** — per-listener wind speed → spectral band gains
//!   (low/mid/high) + azimuth; `hrtf_ready_parameter` exposes the parameters
//!   an HRTF renderer consumes, while `wind_audio_aaa_ready` and
//!   `audio_hrir_aaa_ready` are always HELD (fail-closed).
//!
//! Honesty pattern identical to R1.4/R2-A..G: a `run_*_soak()` deterministic
//! replay gates `wind_field_dynamics_ready` (never hard-coded), the evidence
//! fingerprint folds only measured invariants, every AAA flag is HELD
//! fail-closed, and `distinct_from_*` is measured against 13 real peer
//! fingerprints (ku/hg/kq/kr/ks/kt/ko + io/hs/fw/ip4/s17/jt).

use crate::world_forge_densification::{BendPayload, KIND_GRASS, KIND_ROCK};
use std::f32::consts::TAU;

/// Evidence kind tag for the wind field soak report.
pub const WIND_FIELD_DYNAMICS_EVIDENCE_KIND: &str =
    "wind-field-dynamics/r2g-bend-advection-hrtf-envelope";

/// Fingerprint fold seed — unique to this kernel (letter **kv** = 0x4B56).
const FP_SEED: u64 = 0x4B56_0000_0000_0006;

/// Final fold constant (ASCII `KV_WFIELD`), XORed at the end of the evidence
/// fingerprint so the kernel is distinguished from every peer by construction
/// *and* by measurement.
const FP_FOLD: u64 = 0x4B56_5F57_4649_454C;

/// Compliance stiffness constant of the bend model (world units).
const BEND_STIFFNESS_KC: f32 = 2.0;

/// Reference wind speed at which `speed_frac` saturates to 1.0 (m/s).
const BEND_REF_SPEED: f32 = 6.0;

/// Reference instance height at which `height_factor` saturates to 1.0 (m).
const BEND_REF_HEIGHT: f32 = 1.0;

/// Absolute bend limit (degrees) — bend_angle_deg never exceeds this.
const BEND_LIMIT_DEG: f32 = 60.0;

/// Horizontal-wind epsilon below which an instance is considered upright.
const BEND_EPS: f32 = 1e-4;

/// Advection mass-drift tolerance (fraction) gating readiness.
const ADV_DRIFT_TOL: f32 = 0.05;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Wind field configuration. All fields are validated by `validate()`.
#[derive(Debug, Clone, Copy)]
pub struct WindFieldConfig {
    /// Deterministic placement seed for node jitter and gust phase.
    pub seed: u64,
    /// World size of one wind grid cell (must be finite and `> 0`).
    pub cell_size: f32,
    /// Grid cells along the world X axis (must be `> 0`).
    pub grid_x: usize,
    /// Grid cells along the world Z axis (must be `> 0`).
    pub grid_z: usize,
    /// Vertical layers of the wind field (must be `> 0`).
    pub layers: usize,
    /// Base horizontal wind speed (m/s). Must be finite and `>= 0`.
    pub base_speed: f32,
    /// Base wind direction (radians, yaw around +Y). Must be finite.
    pub base_direction_rad: f32,
    /// Gust multiplier applied to the horizontal wind on top of the base.
    /// Must be finite and `>= 0`.
    pub gust_strength: f32,
    /// Gust period (seconds). Must be finite and `> 0`.
    pub gust_period_s: f32,
    /// Turbulence amplitude in `[0, 1]` (node jitter + vertical turbulence).
    pub turbulence: f32,
}

impl Default for WindFieldConfig {
    fn default() -> Self {
        Self {
            seed: 0x4B56_5749_4E44_464C,
            cell_size: 4.0,
            grid_x: 24,
            grid_z: 24,
            layers: 2,
            base_speed: 6.0,
            base_direction_rad: 0.0,
            gust_strength: 4.0,
            gust_period_s: 3.0,
            turbulence: 0.4,
        }
    }
}

impl WindFieldConfig {
    /// Fail-closed validation of every field.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.cell_size.is_finite() || self.cell_size <= 0.0 {
            return Err("cell_size must be finite and > 0");
        }
        if self.grid_x == 0 || self.grid_z == 0 || self.layers == 0 {
            return Err("grid dimensions must be > 0");
        }
        if !self.base_speed.is_finite() || self.base_speed < 0.0 {
            return Err("base_speed must be finite and >= 0");
        }
        if !self.base_direction_rad.is_finite() {
            return Err("base_direction_rad must be finite");
        }
        if !self.gust_strength.is_finite() || self.gust_strength < 0.0 {
            return Err("gust_strength must be finite and >= 0");
        }
        if !self.gust_period_s.is_finite() || self.gust_period_s <= 0.0 {
            return Err("gust_period_s must be finite and > 0");
        }
        if !self.turbulence.is_finite() || !(0.0..=1.0).contains(&self.turbulence) {
            return Err("turbulence must be in [0, 1]");
        }
        Ok(())
    }

    /// Number of nodes in the wind grid.
    pub fn cell_count(&self) -> usize {
        self.grid_x
            .saturating_mul(self.grid_z)
            .saturating_mul(self.layers)
    }
}

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/// Mix a hash chain (same shape as the R1.4/R2-A..G substrates).
fn hash_mix(mut h: u64, x: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15u64);
    h ^= h >> 29;
    h ^= x;
    h.wrapping_mul(0xBF58_476D_1CE4_E5B9u64)
}

/// Splitmix64 — deterministic scalar PRNG.
fn splitmix64(state: &mut u64) -> u64 {
    *state = state.wrapping_add(0x9E37_79B9_7F4A_7C15u64);
    let mut z = *state;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9u64);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EBu64);
    z ^ (z >> 31)
}

/// Unit-interval hash from a u64.
fn hash01(h: u64) -> f32 {
    (h as u32 as f32) / (u32::MAX as f32)
}

/// Canonical f32 quantization for fingerprints (NaN/inf fold to a sentinel).
fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        v.to_bits() as u64
    } else {
        0x7FF8_0000_0000_0001u64
    }
}

/// Linear interpolation.
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Map a continuous world coordinate to a clamped node pair `(i0, i1)` and the
/// interpolation weight `t`. Positions outside the grid clamp to the edge node.
fn grid_coord(pos: f32, cell_size: f32, dim: usize) -> (usize, usize, f32) {
    let f = pos / cell_size - 0.5;
    let i0 = f.floor().max(0.0) as usize;
    let i0 = i0.min(dim - 1);
    let i1 = (i0 + 1).min(dim - 1);
    let t = (f - i0 as f32).clamp(0.0, 1.0);
    (i0, i1, t)
}

/// Deterministic per-node PRNG state derived from `(seed, ix, iy, iz)`.
fn node_rng(seed: u64, ix: usize, iy: usize, iz: usize) -> u64 {
    let mut h = seed ^ 0x9E37_79B9_7F4A_7C15u64;
    h = hash_mix(h, ix as u64);
    h = hash_mix(h, iy as u64);
    h = hash_mix(h, iz as u64);
    let mut st = h;
    splitmix64(&mut st)
}

/// Deterministic gust phase from the seed (radians in `[0, TAU)`).
fn phase_from_seed(seed: u64) -> f32 {
    let mut st = seed ^ 0x243F_6A88_85A3_08D3u64;
    hash01(splitmix64(&mut st)) * TAU
}

/// Deterministic node wind sample: base speed + turbulence jitter, yaw jitter
/// and vertical turbulence.
fn node_wind(cfg: &WindFieldConfig, h: u64) -> [f32; 3] {
    let mut st = h;
    let speed_jitter = 1.0 + cfg.turbulence * (2.0 * hash01(splitmix64(&mut st)) - 1.0);
    let yaw_jitter = (2.0 * hash01(splitmix64(&mut st)) - 1.0) * cfg.turbulence * 0.6;
    let vert = cfg.turbulence * cfg.base_speed * (2.0 * hash01(splitmix64(&mut st)) - 1.0) * 0.2;
    let speed = (cfg.base_speed * speed_jitter).max(0.0);
    let yaw = cfg.base_direction_rad + yaw_jitter;
    [speed * yaw.cos(), vert, speed * yaw.sin()]
}

/// Deterministic upper bound on the wind magnitude: base × (1 + turbulence) ×
/// (1 + gust_strength) × 1.2. `wind_at` clamps to this.
fn compute_max_speed(cfg: &WindFieldConfig) -> f32 {
    cfg.base_speed * (1.0 + cfg.turbulence) * (1.0 + cfg.gust_strength) * 1.2
}

// ---------------------------------------------------------------------------
// Wind grid
// ---------------------------------------------------------------------------

/// A deterministic wind field sampled on a regular cell grid. Trilinear
/// interpolation yields a continuous, bounded 3D wind at any world position.
#[derive(Debug)]
pub struct WindGrid {
    cfg: WindFieldConfig,
    samples: Vec<[f32; 3]>,
    phase0: f32,
    max_speed: f32,
}

impl WindGrid {
    /// Validates `cfg` and fills the deterministic node samples.
    pub fn new(cfg: &WindFieldConfig) -> Result<Self, &'static str> {
        cfg.validate()?;
        let count = cfg.cell_count();
        let mut samples = vec![[0.0f32; 3]; count];
        for iy in 0..cfg.layers {
            for iz in 0..cfg.grid_z {
                for ix in 0..cfg.grid_x {
                    let idx = iy * (cfg.grid_x * cfg.grid_z) + iz * cfg.grid_x + ix;
                    let h = node_rng(cfg.seed, ix, iy, iz);
                    samples[idx] = node_wind(cfg, h);
                }
            }
        }
        let phase0 = phase_from_seed(cfg.seed);
        let max_speed = compute_max_speed(cfg);
        Ok(Self {
            cfg: *cfg,
            samples,
            phase0,
            max_speed,
        })
    }

    /// Flat index of node `(ix, iy, iz)` (row-major, iy outermost).
    fn node_index(&self, ix: usize, iy: usize, iz: usize) -> usize {
        iy * (self.cfg.grid_x * self.cfg.grid_z) + iz * self.cfg.grid_x + ix
    }

    /// Gust envelope in `[0, 1]` at time `t` — a two-frequency sinusoid sum
    /// (the dominant gust and a slower swell), always clamped.
    pub fn gust_envelope_at(&self, t: f32) -> f32 {
        let p = self.cfg.gust_period_s;
        let g1 = 0.5 + 0.5 * (TAU * t / p + self.phase0).sin();
        let g2 = 0.5 + 0.5 * (0.5 * TAU * t / p + self.phase0 * 1.7).sin();
        (0.5 * g1 + 0.5 * g2).clamp(0.0, 1.0)
    }

    /// Deterministic upper bound on the wind magnitude this grid can emit.
    pub fn max_speed(&self) -> f32 {
        self.max_speed
    }

    /// World size of one wind grid cell.
    pub fn cell_size(&self) -> f32 {
        self.cfg.cell_size
    }

    /// World-space center of node `(ix, iy, iz)`.
    pub fn world_pos(&self, ix: usize, iy: usize, iz: usize) -> [f32; 3] {
        [
            (ix as f32 + 0.5) * self.cfg.cell_size,
            (iy as f32 + 0.5) * self.cfg.cell_size,
            (iz as f32 + 0.5) * self.cfg.cell_size,
        ]
    }

    /// Wind at an arbitrary world position and time: trilinear interpolation
    /// over the 8 surrounding nodes, horizontal gust scaling and a hard
    /// magnitude clamp to `max_speed`.
    pub fn wind_at(&self, pos: [f32; 3], t: f32) -> [f32; 3] {
        let (ix0, ix1, tx) = grid_coord(pos[0], self.cfg.cell_size, self.cfg.grid_x);
        let (iy0, iy1, ty) = grid_coord(pos[1], self.cfg.cell_size, self.cfg.layers);
        let (iz0, iz1, tz) = grid_coord(pos[2], self.cfg.cell_size, self.cfg.grid_z);
        let mut v = [0.0f32; 3];
        for c in 0..3 {
            let c000 = self.samples[self.node_index(ix0, iy0, iz0)][c];
            let c100 = self.samples[self.node_index(ix1, iy0, iz0)][c];
            let c010 = self.samples[self.node_index(ix0, iy1, iz0)][c];
            let c110 = self.samples[self.node_index(ix1, iy1, iz0)][c];
            let c001 = self.samples[self.node_index(ix0, iy0, iz1)][c];
            let c101 = self.samples[self.node_index(ix1, iy0, iz1)][c];
            let c011 = self.samples[self.node_index(ix0, iy1, iz1)][c];
            let c111 = self.samples[self.node_index(ix1, iy1, iz1)][c];
            let c00 = lerp(c000, c100, tx);
            let c01 = lerp(c001, c101, tx);
            let c10 = lerp(c010, c110, tx);
            let c11 = lerp(c011, c111, tx);
            let c0 = lerp(c00, c10, ty);
            let c1 = lerp(c01, c11, ty);
            v[c] = lerp(c0, c1, tz);
        }
        let gust = self.gust_envelope_at(t);
        v[0] *= 1.0 + self.cfg.gust_strength * gust;
        v[2] *= 1.0 + self.cfg.gust_strength * gust;
        let mag = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
        if mag > self.max_speed {
            let s = self.max_speed / mag;
            v[0] *= s;
            v[1] *= s;
            v[2] *= s;
        }
        v
    }

    /// HRTF-ready wind audio envelope at the listener position: wind speed,
    /// spectral band gains (low/mid/high), azimuth (degrees, `[0, 360)`) and
    /// gust intensity. This is a *parameter producer* — the spatial audio
    /// pipeline itself is HELD fail-closed.
    pub fn audio_envelope(&self, listener_pos: [f32; 3], t: f32) -> WindAudioEnvelope {
        let wind = self.wind_at(listener_pos, t);
        let speed = (wind[0] * wind[0] + wind[1] * wind[1] + wind[2] * wind[2]).sqrt();
        let ref_speed = (self.cfg.base_speed * (1.0 + self.cfg.gust_strength)).max(1e-6);
        let s = (speed / ref_speed).clamp(0.0, 1.0);
        let low = 0.15 + 0.85 * s;
        let mid = 0.10 + 0.90 * s;
        let high = s * s;
        let azimuth_deg = (wind[2].atan2(wind[0])).to_degrees().rem_euclid(360.0);
        let gust_intensity = self.gust_envelope_at(t);
        WindAudioEnvelope {
            speed_m_s: speed,
            spectral_band_gains: [low, mid, high],
            azimuth_deg,
            gust_intensity,
            hrtf_ready_parameter: true,
        }
    }

    /// Bend of a single densified instance's rest payload at time `t`.
    ///
    /// `bend_amount = compliance × speed_frac × height_factor` with
    /// `compliance = BEND_STIFFNESS_KC / (stiffness + BEND_STIFFNESS_KC)`.
    /// Upright (zero bend) whenever the horizontal wind is below `BEND_EPS`.
    pub fn bend_from_payload(&self, payload: &BendPayload, t: f32) -> BendState {
        let wind = self.wind_at(payload.position, t);
        let hwind = (wind[0] * wind[0] + wind[2] * wind[2]).sqrt();
        if hwind < BEND_EPS {
            return BendState {
                bend_amount: 0.0,
                bend_angle_deg: 0.0,
                bend_axis_xz: [1.0, 0.0],
                effective_wind_speed_m_s: hwind,
            };
        }
        let speed_frac = (hwind / BEND_REF_SPEED).min(1.0);
        let compliance = BEND_STIFFNESS_KC / (payload.stiffness + BEND_STIFFNESS_KC);
        let height_factor = (payload.height / BEND_REF_HEIGHT).clamp(0.25, 1.0);
        let bend_amount = compliance * speed_frac * height_factor;
        let bend_angle_deg = bend_amount * BEND_LIMIT_DEG;
        BendState {
            bend_amount,
            bend_angle_deg,
            bend_axis_xz: [wind[0] / hwind, wind[2] / hwind],
            effective_wind_speed_m_s: hwind,
        }
    }

    /// Zero-alloc batch bend: clears `out`, grows only if needed, then pushes
    /// one `BendState` per payload. Capacity invariant is measured by tests.
    pub fn bend_into(&self, payloads: &[BendPayload], t: f32, out: &mut Vec<BendState>) {
        out.clear();
        if out.capacity() < payloads.len() {
            out.reserve(payloads.len() - out.capacity());
        }
        for p in payloads {
            out.push(self.bend_from_payload(p, t));
        }
    }
}

/// Result of bending a single densified instance.
#[derive(Debug, Clone, Copy)]
pub struct BendState {
    /// Normalized bend amount in `[0, 1]` (1.0 = fully leaning with the wind).
    pub bend_amount: f32,
    /// Bend angle in degrees, always `<= BEND_LIMIT_DEG`.
    pub bend_angle_deg: f32,
    /// Unit horizontal wind axis `[x, z]` the instance leans along.
    pub bend_axis_xz: [f32; 2],
    /// Horizontal wind speed at the instance position (m/s).
    pub effective_wind_speed_m_s: f32,
}

// ---------------------------------------------------------------------------
// Advection
// ---------------------------------------------------------------------------

/// Result of one semi-Lagrangian advection step.
#[derive(Debug, Clone, Copy)]
pub struct AdvectionStep {
    /// Total scalar mass before the step.
    pub total_before: f32,
    /// Total scalar mass after the step.
    pub total_after: f32,
    /// Relative mass drift `|after - before| / before`.
    pub drift: f32,
    /// Peak scalar density after the step.
    pub max_density: f32,
    /// True when every cell density is finite after the step.
    pub all_finite: bool,
}

/// A double-buffered scalar field advected semi-Lagrangianly by a `WindGrid`.
#[derive(Debug)]
pub struct AdvectionField {
    cfg: WindFieldConfig,
    density: Vec<f32>,
    scratch: Vec<f32>,
    total: f32,
    max_density: f32,
    all_finite: bool,
}

impl AdvectionField {
    /// Validates `cfg` and seeds a Gaussian scalar blob at the grid center
    /// (radius = `2 × cell_size`).
    pub fn new(cfg: WindFieldConfig) -> Result<Self, &'static str> {
        cfg.validate()?;
        let count = cfg.cell_count();
        let mut density = vec![0.0f32; count];
        let cx = cfg.grid_x / 2;
        let cy = cfg.layers / 2;
        let cz = cfg.grid_z / 2;
        let radius = (2.0 * cfg.cell_size).max(cfg.cell_size);
        let mut total = 0.0;
        for iy in 0..cfg.layers {
            for iz in 0..cfg.grid_z {
                for ix in 0..cfg.grid_x {
                    let dx = ix as f32 - cx as f32;
                    let dy = iy as f32 - cy as f32;
                    let dz = iz as f32 - cz as f32;
                    let d2 = dx * dx + dy * dy + dz * dz;
                    let v = (-d2 / (radius * radius)).exp();
                    let idx = iy * (cfg.grid_x * cfg.grid_z) + iz * cfg.grid_x + ix;
                    density[idx] = v;
                    total += v;
                }
            }
        }
        let max_density = density.iter().copied().fold(0.0f32, f32::max);
        let scratch = vec![0.0f32; count];
        Ok(Self {
            cfg,
            density,
            scratch,
            total,
            max_density,
            all_finite: true,
        })
    }

    /// Flat index of node `(ix, iy, iz)` (row-major, iy outermost).
    fn node_index(&self, ix: usize, iy: usize, iz: usize) -> usize {
        iy * (self.cfg.grid_x * self.cfg.grid_z) + iz * self.cfg.grid_x + ix
    }

    /// World-space center of node `(ix, iy, iz)`.
    pub fn world_pos(&self, ix: usize, iy: usize, iz: usize) -> [f32; 3] {
        [
            (ix as f32 + 0.5) * self.cfg.cell_size,
            (iy as f32 + 0.5) * self.cfg.cell_size,
            (iz as f32 + 0.5) * self.cfg.cell_size,
        ]
    }

    /// Trilinear scalar sample at an arbitrary world position (edge-clamped).
    pub fn sample_scalar(&self, pos: [f32; 3]) -> f32 {
        let (ix0, ix1, tx) = grid_coord(pos[0], self.cfg.cell_size, self.cfg.grid_x);
        let (iy0, iy1, ty) = grid_coord(pos[1], self.cfg.cell_size, self.cfg.layers);
        let (iz0, iz1, tz) = grid_coord(pos[2], self.cfg.cell_size, self.cfg.grid_z);
        let d000 = self.density[self.node_index(ix0, iy0, iz0)];
        let d100 = self.density[self.node_index(ix1, iy0, iz0)];
        let d010 = self.density[self.node_index(ix0, iy1, iz0)];
        let d110 = self.density[self.node_index(ix1, iy1, iz0)];
        let d001 = self.density[self.node_index(ix0, iy0, iz1)];
        let d101 = self.density[self.node_index(ix1, iy0, iz1)];
        let d011 = self.density[self.node_index(ix0, iy1, iz1)];
        let d111 = self.density[self.node_index(ix1, iy1, iz1)];
        let d00 = lerp(d000, d100, tx);
        let d01 = lerp(d001, d101, tx);
        let d10 = lerp(d010, d110, tx);
        let d11 = lerp(d011, d111, tx);
        let d0 = lerp(d00, d10, ty);
        let d1 = lerp(d01, d11, ty);
        lerp(d0, d1, tz)
    }

    /// One semi-Lagrangian advection step: for each node, back-trace the wind
    /// `prev = pos - v·dt`, sample the previous density there, double-buffer,
    /// then recompute total/max/finiteness.
    ///
    /// Fails closed if `dt` is non-finite, `<= 0`, or exceeds the CFL bound
    /// `cell_size × 0.5 / max_speed`.
    pub fn advance(
        &mut self,
        wind: &WindGrid,
        dt: f32,
        t: f32,
    ) -> Result<AdvectionStep, &'static str> {
        if !dt.is_finite() || dt <= 0.0 {
            return Err("advance requires a finite, positive dt");
        }
        let max_speed = wind.max_speed();
        let cfl = self.cfg.cell_size * 0.5 / max_speed.max(1e-6);
        if dt > cfl {
            return Err("advance dt exceeds the CFL bound for the wind field");
        }
        let total_before = self.total;
        for iy in 0..self.cfg.layers {
            for iz in 0..self.cfg.grid_z {
                for ix in 0..self.cfg.grid_x {
                    let idx = self.node_index(ix, iy, iz);
                    let pos = self.world_pos(ix, iy, iz);
                    let v = wind.wind_at(pos, t);
                    let prev = [pos[0] - v[0] * dt, pos[1] - v[1] * dt, pos[2] - v[2] * dt];
                    self.scratch[idx] = self.sample_scalar(prev);
                }
            }
        }
        std::mem::swap(&mut self.density, &mut self.scratch);
        let mut total = 0.0;
        let mut max_density = 0.0f32;
        let mut all_finite = true;
        for &v in self.density.iter() {
            if !v.is_finite() {
                all_finite = false;
            }
            total += v;
            max_density = max_density.max(v);
        }
        let drift = if total_before > 1e-12 {
            (total - total_before).abs() / total_before
        } else {
            0.0
        };
        self.total = total;
        self.max_density = max_density;
        self.all_finite = all_finite;
        Ok(AdvectionStep {
            total_before,
            total_after: total,
            drift,
            max_density,
            all_finite,
        })
    }

    /// Scalar density per node (row-major, iy outermost).
    pub fn density(&self) -> &[f32] {
        &self.density
    }

    /// Total scalar mass.
    pub fn total_density(&self) -> f32 {
        self.total
    }

    /// Peak scalar density.
    pub fn max_density(&self) -> f32 {
        self.max_density
    }

    /// True when every node density is finite.
    pub fn all_finite(&self) -> bool {
        self.all_finite
    }
}

// ---------------------------------------------------------------------------
// Audio envelope
// ---------------------------------------------------------------------------

/// HRTF-ready wind audio envelope — a *parameter producer* for a future
/// spatial audio pipeline (the pipeline itself is HELD fail-closed).
#[derive(Debug, Clone, Copy)]
pub struct WindAudioEnvelope {
    /// Wind speed at the listener (m/s).
    pub speed_m_s: f32,
    /// Spectral band gains `[low, mid, high]`, each in `[0, 1]`.
    pub spectral_band_gains: [f32; 3],
    /// Wind azimuth relative to world +X (degrees, `[0, 360)`).
    pub azimuth_deg: f32,
    /// Gust intensity in `[0, 1]`.
    pub gust_intensity: f32,
    /// True when the envelope exposes the parameters an HRTF renderer needs
    /// (azimuth + band gains). This is a parameter-readiness flag, NOT an AAA
    /// claim — `wind_audio_aaa_ready` stays HELD.
    pub hrtf_ready_parameter: bool,
}

// ---------------------------------------------------------------------------
// Soak — deterministic measurement, fingerprint and honest report
// ---------------------------------------------------------------------------

/// Measured invariants of one soak pass (fail-closed on construction error).
struct WindFieldMeasured {
    mean_wind_speed: f32,
    min_wind_speed: f32,
    max_wind_speed: f32,
    gust_variation: f32,
    wind_always_finite: bool,
    wind_bounded_by_max: bool,
    grass_bend_amount: f32,
    rock_bend_amount: f32,
    bend_angle_within_limit: bool,
    bend_axis_unit_or_zero: bool,
    advection_drift: f32,
    advection_bounded: bool,
    advection_finite: bool,
    advection_max_ok: bool,
    audio_high_at_max: f32,
    audio_high_at_min: f32,
    audio_high_rises_with_speed: bool,
    audio_azimuth_bounded: bool,
    audio_gust_bounded: bool,
}

impl WindFieldMeasured {
    fn fail_closed() -> Self {
        Self {
            mean_wind_speed: f32::NAN,
            min_wind_speed: f32::NAN,
            max_wind_speed: f32::NAN,
            gust_variation: f32::NAN,
            wind_always_finite: false,
            wind_bounded_by_max: false,
            grass_bend_amount: f32::NAN,
            rock_bend_amount: f32::NAN,
            bend_angle_within_limit: false,
            bend_axis_unit_or_zero: false,
            advection_drift: f32::NAN,
            advection_bounded: false,
            advection_finite: false,
            advection_max_ok: false,
            audio_high_at_max: f32::NAN,
            audio_high_at_min: f32::NAN,
            audio_high_rises_with_speed: false,
            audio_azimuth_bounded: false,
            audio_gust_bounded: false,
        }
    }
}

/// Compact deterministic soak config (small grid, fast replay).
fn soak_config() -> WindFieldConfig {
    WindFieldConfig {
        seed: 0x4B56_5749_4E44_464C,
        cell_size: 2.0,
        grid_x: 12,
        grid_z: 12,
        layers: 2,
        base_speed: 5.0,
        base_direction_rad: 0.0,
        gust_strength: 3.0,
        gust_period_s: 2.0,
        turbulence: 0.4,
    }
}

/// One measured soak pass over wind sampling, bending, advection and the audio
/// envelope. Any construction failure leaves every field fail-closed.
fn run_measured_pass() -> WindFieldMeasured {
    let mut m = WindFieldMeasured::fail_closed();
    let cfg = soak_config();
    let grid = match WindGrid::new(&cfg) {
        Ok(g) => g,
        Err(_) => return m,
    };
    let probe_pos = [
        grid.cell_size() * 5.0,
        grid.cell_size() * 0.5,
        grid.cell_size() * 5.0,
    ];

    // Wind statistics over 64 samples spanning 2 gust periods at an interior
    // point.
    let samples = 64;
    let span = 2.0 * cfg.gust_period_s;
    let mut sum = 0.0f32;
    let mut min = f32::MAX;
    let mut max = f32::MIN;
    let mut all_finite = true;
    let mut bounded = true;
    for i in 0..samples {
        let t = (i as f32 / samples as f32) * span;
        let v = grid.wind_at(probe_pos, t);
        let mag = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
        sum += mag;
        min = min.min(mag);
        max = max.max(mag);
        all_finite &= v.iter().all(|x| x.is_finite());
        bounded &= mag <= grid.max_speed() + 1e-3;
    }
    m.mean_wind_speed = sum / samples as f32;
    m.min_wind_speed = min;
    m.max_wind_speed = max;
    m.gust_variation = max - min;
    m.wind_always_finite = all_finite;
    m.wind_bounded_by_max = bounded;

    // Gust scan to find the peak/trough times for the audio envelope.
    let scan = 256;
    let mut t_max = 0.0f32;
    let mut t_min = 0.0f32;
    let mut e_max = -1.0f32;
    let mut e_min = f32::MAX;
    for i in 0..scan {
        let t = (i as f32 / scan as f32) * span;
        let e = grid.gust_envelope_at(t);
        if e > e_max {
            e_max = e;
            t_max = t;
        }
        if e < e_min {
            e_min = e;
            t_min = t;
        }
    }
    let env_max = grid.audio_envelope(probe_pos, t_max);
    let env_min = grid.audio_envelope(probe_pos, t_min);
    m.audio_high_at_max = env_max.spectral_band_gains[2];
    m.audio_high_at_min = env_min.spectral_band_gains[2];
    m.audio_high_rises_with_speed =
        env_max.speed_m_s >= env_min.speed_m_s - 1e-4
            && m.audio_high_at_max >= m.audio_high_at_min - 1e-4;
    m.audio_azimuth_bounded = env_max.azimuth_deg.is_finite() && (0.0..360.0).contains(&env_max.azimuth_deg);
    m.audio_gust_bounded = (0.0..=1.0).contains(&env_max.gust_intensity)
        && (0.0..=1.0).contains(&env_min.gust_intensity);

    // Bending: real grass (compliant) vs rock (rigid) rest payloads.
    let grass = BendPayload {
        position: probe_pos,
        height: 1.0,
        radius: 0.2,
        stiffness: 1.0,
        kind: KIND_GRASS,
    };
    let rock = BendPayload {
        position: probe_pos,
        height: 1.0,
        radius: 1.2,
        stiffness: 1.0e9,
        kind: KIND_ROCK,
    };
    let gb = grid.bend_from_payload(&grass, t_max);
    let rb = grid.bend_from_payload(&rock, t_max);
    m.grass_bend_amount = gb.bend_amount;
    m.rock_bend_amount = rb.bend_amount;
    m.bend_angle_within_limit = gb.bend_angle_deg >= 0.0
        && gb.bend_angle_deg <= BEND_LIMIT_DEG
        && rb.bend_angle_deg >= 0.0
        && rb.bend_angle_deg <= BEND_LIMIT_DEG;
    m.bend_axis_unit_or_zero = {
        let axis_ok = |a: [f32; 2]| {
            let n = (a[0] * a[0] + a[1] * a[1]).sqrt();
            (n - 1.0).abs() < 1e-3 || n < 1e-4
        };
        axis_ok(gb.bend_axis_xz) && axis_ok(rb.bend_axis_xz)
    };

    // Advection: one CFL-safe step from the same wind field.
    let mut adv = match AdvectionField::new(cfg) {
        Ok(a) => a,
        Err(_) => return m,
    };
    let adv_dt = 0.02f32;
    if let Ok(step) = adv.advance(&grid, adv_dt, t_max) {
        m.advection_drift = step.drift;
        m.advection_bounded = step.drift <= ADV_DRIFT_TOL;
        m.advection_finite = step.all_finite;
        m.advection_max_ok = step.max_density.is_finite() && step.max_density <= 1.0 + 1e-3;
    }
    m
}

/// Deterministic evidence fingerprint — folds only measured invariants.
fn wind_field_dynamics_evidence_fingerprint(m: &WindFieldMeasured) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, quant_f32(m.mean_wind_speed));
    h = hash_mix(h, quant_f32(m.min_wind_speed));
    h = hash_mix(h, quant_f32(m.max_wind_speed));
    h = hash_mix(h, quant_f32(m.gust_variation));
    h = hash_mix(h, m.wind_always_finite as u64);
    h = hash_mix(h, m.wind_bounded_by_max as u64);
    h = hash_mix(h, quant_f32(m.grass_bend_amount));
    h = hash_mix(h, quant_f32(m.rock_bend_amount));
    h = hash_mix(h, m.bend_angle_within_limit as u64);
    h = hash_mix(h, m.bend_axis_unit_or_zero as u64);
    h = hash_mix(h, quant_f32(m.advection_drift));
    h = hash_mix(h, m.advection_bounded as u64);
    h = hash_mix(h, m.advection_finite as u64);
    h = hash_mix(h, m.advection_max_ok as u64);
    h = hash_mix(h, quant_f32(m.audio_high_at_max));
    h = hash_mix(h, quant_f32(m.audio_high_at_min));
    h = hash_mix(h, m.audio_high_rises_with_speed as u64);
    h = hash_mix(h, m.audio_azimuth_bounded as u64);
    h = hash_mix(h, m.audio_gust_bounded as u64);
    hash_mix(h, FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &WindFieldMeasured) -> bool {
    m.wind_always_finite
        && m.wind_bounded_by_max
        && m.gust_variation > 0.0
        && m.grass_bend_amount > 0.0
        && m.rock_bend_amount < m.grass_bend_amount
        && m.bend_angle_within_limit
        && m.bend_axis_unit_or_zero
        && m.advection_bounded
        && m.advection_finite
        && m.advection_max_ok
        && m.audio_high_rises_with_speed
        && m.audio_azimuth_bounded
        && m.audio_gust_bounded
}

/// Honest wind field dynamics soak report. All readiness/AAA fields derive
/// from measurement; AAA flags are always HELD (fail-closed).
#[derive(Clone)]
pub struct WindFieldDynamicsSoakReport {
    pub deterministic: bool,
    pub mean_wind_speed: f32,
    pub min_wind_speed: f32,
    pub max_wind_speed: f32,
    pub gust_variation: f32,
    pub wind_always_finite: bool,
    pub wind_bounded_by_max: bool,
    pub grass_bend_amount: f32,
    pub rock_bend_amount: f32,
    pub bend_angle_within_limit: bool,
    pub bend_axis_unit_or_zero: bool,
    pub advection_drift: f32,
    pub advection_bounded: bool,
    pub advection_finite: bool,
    pub advection_max_ok: bool,
    pub audio_high_rises_with_speed: bool,
    pub audio_azimuth_bounded: bool,
    pub audio_gust_bounded: bool,
    pub evidence_fingerprint: u64,
    pub ready: bool,
    pub evidence_kind: &'static str,
    // Distinctness — measured against 13 real peer fingerprints.
    pub distinct_from_ku_world_forge_densification: bool,
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
    // AAA — always HELD (fail-closed).
    pub wind_simulation_aaa_ready: bool,
    pub gust_wave_aaa_ready: bool,
    pub advection_aaa_ready: bool,
    pub audio_hrir_aaa_ready: bool,
    pub wind_audio_aaa_ready: bool,
    pub chaos_aaa_ready: bool,
    pub live_weather_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(m: &WindFieldMeasured, deterministic: bool) -> WindFieldDynamicsSoakReport {
    let ready = readiness(m) && deterministic;
    let fp = wind_field_dynamics_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ku_fp = crate::world_forge_densification::run_world_forge_densification_soak()
        .evidence_fingerprint;
    let hg_fp = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
        .evidence_fingerprint;
    let kq_fp = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
    let kr_fp = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
        .evidence_fingerprint;
    let ks_fp = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak()
        .evidence_fingerprint;
    let kt_fp = crate::async_compute_scheduler::run_async_compute_scheduler_soak()
        .evidence_fingerprint;
    let ko_fp = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
    let io_fp = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
        .evidence_fingerprint;
    let hs_fp = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw_fp = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4_fp = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
        .fingerprint;
    let s17_fp = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt_fp = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;

    WindFieldDynamicsSoakReport {
        deterministic,
        mean_wind_speed: m.mean_wind_speed,
        min_wind_speed: m.min_wind_speed,
        max_wind_speed: m.max_wind_speed,
        gust_variation: m.gust_variation,
        wind_always_finite: m.wind_always_finite,
        wind_bounded_by_max: m.wind_bounded_by_max,
        grass_bend_amount: m.grass_bend_amount,
        rock_bend_amount: m.rock_bend_amount,
        bend_angle_within_limit: m.bend_angle_within_limit,
        bend_axis_unit_or_zero: m.bend_axis_unit_or_zero,
        advection_drift: m.advection_drift,
        advection_bounded: m.advection_bounded,
        advection_finite: m.advection_finite,
        advection_max_ok: m.advection_max_ok,
        audio_high_rises_with_speed: m.audio_high_rises_with_speed,
        audio_azimuth_bounded: m.audio_azimuth_bounded,
        audio_gust_bounded: m.audio_gust_bounded,
        evidence_fingerprint: fp,
        ready,
        evidence_kind: WIND_FIELD_DYNAMICS_EVIDENCE_KIND,
        distinct_from_ku_world_forge_densification: distinct(ku_fp),
        distinct_from_hg_spatial_grid: distinct(hg_fp),
        distinct_from_kq_sdf_contact: distinct(kq_fp),
        distinct_from_kr_micro_shadow: distinct(kr_fp),
        distinct_from_ks_deformation: distinct(ks_fp),
        distinct_from_kt_async_compute: distinct(kt_fp),
        distinct_from_ko_euphoria: distinct(ko_fp),
        distinct_from_io_sph_probe: distinct(io_fp),
        distinct_from_hs_field_network_probe: distinct(hs_fp),
        distinct_from_fw_quantum_overlap_probe: distinct(fw_fp),
        distinct_from_ip4_svo_terrain_probe: distinct(ip4_fp),
        distinct_from_s17_physics_world_probe: distinct(s17_fp),
        distinct_from_jt_task_graph_probe: distinct(jt_fp),
        wind_simulation_aaa_ready: false,
        gust_wave_aaa_ready: false,
        advection_aaa_ready: false,
        audio_hrir_aaa_ready: false,
        wind_audio_aaa_ready: false,
        chaos_aaa_ready: false,
        live_weather_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Runs the deterministic soak replay twice; readiness requires both passes to
/// agree bit-for-bit (same evidence fingerprint). `probe_*` delegates here so
/// the probe can never out-claim the kernel.
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_wind_field_dynamics_soak() -> WindFieldDynamicsSoakReport {
    static CACHE: std::sync::OnceLock<WindFieldDynamicsSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = wind_field_dynamics_evidence_fingerprint(&a)
                == wind_field_dynamics_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Honesty probe — soak-gated `ready` (letter **kv**).
pub fn probe_wind_field_dynamics() -> WindFieldDynamicsSoakReport {
    run_wind_field_dynamics_soak()
}

// ---------------------------------------------------------------------------
// Tests — exact mathematical invariants, determinism, edge cases.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::world_forge_densification::{
        DensificationConfig, DensificationField, KIND_BUSH,
    };

    #[test]
    fn config_rejects_invalid_values() {
        let mut c = WindFieldConfig::default();
        c.cell_size = 0.0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.cell_size = f32::NAN;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.grid_x = 0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.grid_z = 0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.layers = 0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.base_speed = -1.0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.base_speed = f32::INFINITY;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.gust_strength = -0.5;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.gust_period_s = 0.0;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.base_direction_rad = f32::NAN;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.turbulence = 1.5;
        assert!(c.validate().is_err());
        let mut c = WindFieldConfig::default();
        c.turbulence = -0.1;
        assert!(c.validate().is_err());
        assert!(WindFieldConfig::default().validate().is_ok());
    }

    #[test]
    fn wind_grid_fails_closed_on_invalid_config() {
        let mut c = WindFieldConfig::default();
        c.grid_x = 0;
        assert!(WindGrid::new(&c).is_err());
        let mut c = WindFieldConfig::default();
        c.gust_period_s = 0.0;
        assert!(WindGrid::new(&c).is_err());
    }

    #[test]
    fn wind_at_is_finite_and_bounded() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).expect("soak config is valid");
        let max = grid.max_speed();
        for t_step in 0..8 {
            let t = t_step as f32 * 0.25 * cfg.gust_period_s;
            for iz in 0..cfg.grid_z {
                for ix in 0..cfg.grid_x {
                    let pos = [
                        (ix as f32 + 0.5) * cfg.cell_size,
                        cfg.cell_size * 0.5,
                        (iz as f32 + 0.5) * cfg.cell_size,
                    ];
                    let v = grid.wind_at(pos, t);
                    assert!(v[0].is_finite() && v[1].is_finite() && v[2].is_finite());
                    let mag = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
                    assert!(
                        mag <= max + 1e-3,
                        "wind magnitude {mag} exceeded the max bound {max}"
                    );
                }
            }
        }
    }

    #[test]
    fn wind_at_continuous_within_cell() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let base = [4.5 * cfg.cell_size, cfg.cell_size * 0.5, 4.5 * cfg.cell_size];
        let eps = 0.01 * cfg.cell_size;
        let offset = [base[0] + eps, base[1], base[2] + eps];
        let t = cfg.gust_period_s * 0.5;
        let a = grid.wind_at(base, t);
        let b = grid.wind_at(offset, t);
        let d = (a[0] - b[0])
            .abs()
            .max((a[1] - b[1]).abs())
            .max((a[2] - b[2]).abs());
        assert!(
            d < 0.1 * grid.max_speed(),
            "wind jumped by {d} within a cell"
        );
    }

    #[test]
    fn gust_raises_speed_deterministically() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let pos = [cfg.cell_size * 5.0, cfg.cell_size * 0.5, cfg.cell_size * 5.0];
        let scan = 256;
        let span = 2.0 * cfg.gust_period_s;
        let mut t_max = 0.0f32;
        let mut t_min = 0.0f32;
        let mut e_max = -1.0f32;
        let mut e_min = f32::MAX;
        for i in 0..scan {
            let t = (i as f32 / scan as f32) * span;
            let e = grid.gust_envelope_at(t);
            if e > e_max {
                e_max = e;
                t_max = t;
            }
            if e < e_min {
                e_min = e;
                t_min = t;
            }
        }
        assert!(e_max > e_min, "gust envelope must not be constant");
        let hspeed = |t: f32| {
            let v = grid.wind_at(pos, t);
            (v[0] * v[0] + v[2] * v[2]).sqrt()
        };
        assert!(
            hspeed(t_max) > hspeed(t_min),
            "gust must raise horizontal wind speed"
        );
    }

    #[test]
    fn wind_grid_is_deterministic_across_builds() {
        let cfg = WindFieldConfig::default();
        let a = WindGrid::new(&cfg).unwrap();
        let b = WindGrid::new(&cfg).unwrap();
        assert_eq!(a.samples, b.samples);
        assert_eq!(a.max_speed(), b.max_speed());
        assert_eq!(a.phase0.to_bits(), b.phase0.to_bits());
        let pos = [2.0, 2.0, 2.0];
        let t = 1.25;
        assert_eq!(
            a.wind_at(pos, t).map(f32::to_bits),
            b.wind_at(pos, t).map(f32::to_bits)
        );
    }

    #[test]
    fn different_seed_changes_wind_field() {
        let mut a_cfg = WindFieldConfig::default();
        let mut b_cfg = WindFieldConfig::default();
        a_cfg.seed = 0x1111;
        b_cfg.seed = 0x2222;
        let a = WindGrid::new(&a_cfg).unwrap();
        let b = WindGrid::new(&b_cfg).unwrap();
        assert_ne!(a.samples, b.samples);
        assert_ne!(a.wind_at([4.0, 2.0, 4.0], 0.5), b.wind_at([4.0, 2.0, 4.0], 0.5));
    }

    #[test]
    fn bend_grass_soft_and_rock_rigid() {
        let cfg = WindFieldConfig::default();
        let grid = WindGrid::new(&cfg).unwrap();
        let t = cfg.gust_period_s * 0.75;
        let pos = [cfg.cell_size * 8.0, cfg.cell_size * 0.5, cfg.cell_size * 8.0];
        let grass = BendPayload {
            position: pos,
            height: 1.0,
            radius: 0.2,
            stiffness: 1.0,
            kind: KIND_GRASS,
        };
        let rock = BendPayload {
            position: pos,
            height: 1.0,
            radius: 1.2,
            stiffness: 1.0e9,
            kind: KIND_ROCK,
        };
        let g = grid.bend_from_payload(&grass, t);
        let r = grid.bend_from_payload(&rock, t);
        assert!(g.bend_amount > 0.1, "grass should bend, got {}", g.bend_amount);
        assert!(r.bend_amount < 0.01, "rock should stay rigid, got {}", r.bend_amount);
        assert!(g.bend_amount > r.bend_amount);
        assert!(g.bend_angle_deg > 0.0 && g.bend_angle_deg <= BEND_LIMIT_DEG);
    }

    #[test]
    fn bend_upright_in_still_wind() {
        let cfg = WindFieldConfig {
            base_speed: 0.0,
            ..WindFieldConfig::default()
        };
        let grid = WindGrid::new(&cfg).unwrap();
        let p = BendPayload {
            position: [2.0, 1.0, 2.0],
            height: 1.0,
            radius: 0.2,
            stiffness: 1.0,
            kind: KIND_GRASS,
        };
        let b = grid.bend_from_payload(&p, 1.0);
        assert_eq!(b.bend_amount, 0.0);
        assert_eq!(b.bend_angle_deg, 0.0);
        assert_eq!(b.effective_wind_speed_m_s, 0.0);
    }

    #[test]
    fn bend_axis_is_unit_or_zero() {
        let cfg = WindFieldConfig::default();
        let grid = WindGrid::new(&cfg).unwrap();
        let t = cfg.gust_period_s * 0.5;
        let p = BendPayload {
            position: [cfg.cell_size * 6.0, cfg.cell_size * 0.5, cfg.cell_size * 6.0],
            height: 1.0,
            radius: 0.2,
            stiffness: 1.0,
            kind: KIND_GRASS,
        };
        let b = grid.bend_from_payload(&p, t);
        let n = (b.bend_axis_xz[0] * b.bend_axis_xz[0] + b.bend_axis_xz[1] * b.bend_axis_xz[1])
            .sqrt();
        assert!((n - 1.0).abs() < 1e-3, "axis not unit: {n}");
        let still = WindFieldConfig {
            base_speed: 0.0,
            ..WindFieldConfig::default()
        };
        let sg = WindGrid::new(&still).unwrap();
        let sb = sg.bend_from_payload(&p, 1.0);
        let sn = (sb.bend_axis_xz[0] * sb.bend_axis_xz[0] + sb.bend_axis_xz[1] * sb.bend_axis_xz[1])
            .sqrt();
        assert!((sn - 1.0).abs() < 1e-3);
    }

    #[test]
    fn bend_into_zero_alloc_keeps_capacity() {
        let cfg = WindFieldConfig::default();
        let grid = WindGrid::new(&cfg).unwrap();
        let payloads = vec![
            BendPayload {
                position: [2.0, 1.0, 2.0],
                height: 1.0,
                radius: 0.2,
                stiffness: 1.0,
                kind: KIND_GRASS,
            },
            BendPayload {
                position: [4.0, 1.0, 4.0],
                height: 0.8,
                radius: 0.3,
                stiffness: 4.0,
                kind: KIND_BUSH,
            },
            BendPayload {
                position: [6.0, 1.0, 6.0],
                height: 1.2,
                radius: 1.2,
                stiffness: 1.0e9,
                kind: KIND_ROCK,
            },
        ];
        let mut out = Vec::with_capacity(10);
        let cap_before = out.capacity();
        grid.bend_into(&payloads, 1.0, &mut out);
        assert_eq!(out.len(), payloads.len());
        assert_eq!(out.capacity(), cap_before);
        let mut tight = Vec::with_capacity(1);
        grid.bend_into(&payloads, 1.0, &mut tight);
        assert!(tight.capacity() >= payloads.len());
        assert_eq!(tight.len(), payloads.len());
    }

    #[test]
    fn bend_payload_edge_consumes_real_r2g_densification() {
        let mut dc = DensificationConfig::default();
        dc.seed = 0x1234;
        let mut field = DensificationField::new(&dc).expect("default densification config is valid");
        field.build().expect("densification builds within capacity");
        assert!(field.instance_count() > 0, "densification must place instances");
        assert!(field.bend_payload_bounded());
        let cfg = WindFieldConfig::default();
        let grid = WindGrid::new(&cfg).unwrap();
        let t = cfg.gust_period_s * 0.5;
        let mut total_bend = 0.0f32;
        for i in 0..field.instance_count() {
            let payload = field.bend_payload(i).expect("instance i in range");
            let b = grid.bend_from_payload(&payload, t);
            assert!(b.bend_amount.is_finite());
            assert!((0.0..=1.0).contains(&b.bend_amount));
            assert!((0.0..=BEND_LIMIT_DEG).contains(&b.bend_angle_deg));
            assert!(b.effective_wind_speed_m_s.is_finite() && b.effective_wind_speed_m_s >= 0.0);
            let n = (b.bend_axis_xz[0] * b.bend_axis_xz[0] + b.bend_axis_xz[1] * b.bend_axis_xz[1])
                .sqrt();
            assert!((n - 1.0).abs() < 1e-3);
            total_bend += b.bend_amount;
        }
        assert!(
            total_bend > 0.0,
            "wind must bend the densified vegetation"
        );
    }

    #[test]
    fn advection_preserves_total_within_tolerance() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let mut field = AdvectionField::new(cfg).unwrap();
        let cfl = cfg.cell_size * 0.5 / grid.max_speed();
        let dt = 0.5 * cfl;
        let t = cfg.gust_period_s * 0.5;
        let before = field.total_density();
        let step = field.advance(&grid, dt, t).expect("dt within CFL");
        assert!(step.all_finite);
        assert!(
            step.drift <= ADV_DRIFT_TOL,
            "advection drift {} exceeds {}",
            step.drift,
            ADV_DRIFT_TOL
        );
        let after = field.total_density();
        let drift = (after - before).abs() / before;
        assert!(drift <= ADV_DRIFT_TOL);
    }

    #[test]
    fn advection_fails_closed_on_bad_dt() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let mut field = AdvectionField::new(cfg).unwrap();
        assert!(field.advance(&grid, f32::NAN, 0.0).is_err());
        assert!(field.advance(&grid, -0.1, 0.0).is_err());
        assert!(field.advance(&grid, 0.0, 0.0).is_err());
        assert!(field.advance(&grid, 10.0, 0.0).is_err());
    }

    #[test]
    fn advection_is_deterministic_across_runs() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let cfl = cfg.cell_size * 0.5 / grid.max_speed();
        let dt = 0.5 * cfl;
        let t = cfg.gust_period_s * 0.25;
        let mut a = AdvectionField::new(cfg).unwrap();
        let mut b = AdvectionField::new(cfg).unwrap();
        a.advance(&grid, dt, t).unwrap();
        b.advance(&grid, dt, t).unwrap();
        assert_eq!(a.density(), b.density());
        assert_eq!(a.total_density().to_bits(), b.total_density().to_bits());
    }

    #[test]
    fn audio_envelope_high_rises_with_speed() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let pos = [cfg.cell_size * 5.0, cfg.cell_size * 0.5, cfg.cell_size * 5.0];
        let scan = 256;
        let span = 2.0 * cfg.gust_period_s;
        let mut t_max = 0.0f32;
        let mut t_min = 0.0f32;
        let mut e_max = -1.0f32;
        let mut e_min = f32::MAX;
        for i in 0..scan {
            let t = (i as f32 / scan as f32) * span;
            let e = grid.gust_envelope_at(t);
            if e > e_max {
                e_max = e;
                t_max = t;
            }
            if e < e_min {
                e_min = e;
                t_min = t;
            }
        }
        let at_max = grid.audio_envelope(pos, t_max);
        let at_min = grid.audio_envelope(pos, t_min);
        assert!(at_max.speed_m_s > at_min.speed_m_s);
        assert!(
            at_max.spectral_band_gains[2] >= at_min.spectral_band_gains[2]
        );
        assert!(at_max.hrtf_ready_parameter);
    }

    #[test]
    fn audio_envelope_bounded_bands() {
        let cfg = soak_config();
        let grid = WindGrid::new(&cfg).unwrap();
        let pos = [cfg.cell_size * 4.0, cfg.cell_size * 0.5, cfg.cell_size * 4.0];
        for i in 0..16 {
            let t = i as f32 * 0.125 * cfg.gust_period_s;
            let e = grid.audio_envelope(pos, t);
            for band in e.spectral_band_gains {
                assert!((0.0..=1.0).contains(&band));
            }
            assert!((0.0..360.0).contains(&e.azimuth_deg));
            assert!((0.0..=1.0).contains(&e.gust_intensity));
            assert!(e.speed_m_s.is_finite() && e.speed_m_s >= 0.0);
            assert!(e.hrtf_ready_parameter);
        }
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_wind_field_dynamics_soak();
        assert!(r.ready, "wind field dynamics soak must gate ready");
        assert!(r.deterministic);
        assert_eq!(r.evidence_kind, WIND_FIELD_DYNAMICS_EVIDENCE_KIND);
        assert!(r.distinct_from_ku_world_forge_densification);
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
        // AAA is always HELD (fail-closed) — never claimed from a CPU soak.
        assert!(!r.wind_simulation_aaa_ready);
        assert!(!r.gust_wave_aaa_ready);
        assert!(!r.advection_aaa_ready);
        assert!(!r.audio_hrir_aaa_ready);
        assert!(!r.wind_audio_aaa_ready);
        assert!(!r.chaos_aaa_ready);
        assert!(!r.live_weather_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_wind_field_dynamics_soak();
        let b = run_wind_field_dynamics_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.ready, b.ready);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_wind_field_dynamics();
        let s = run_wind_field_dynamics_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
        assert!(!p.wind_audio_aaa_ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_wind_field_dynamics_soak();
        let ku = crate::world_forge_densification::run_world_forge_densification_soak()
            .evidence_fingerprint;
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
            .evidence_fingerprint;
        let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak()
            .evidence_fingerprint;
        let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak()
            .evidence_fingerprint;
        let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;

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
    }
}

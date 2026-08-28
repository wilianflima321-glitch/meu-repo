//! Acoustic Raytracing Solver — letter **ka**.
//!
//! Native Rust spatial-audio kernel that composes the acoustic primitives into a
//! full dynamic impulse-response pipeline (blueprint §6 "Acoustic Raytracing"):
//!
//! 1. **Per-band material absorption** — published octave-band coefficients
//!    (125/250/500/1k/2k/4k Hz) for Concrete / Glass / Wood / Carpet / Steel,
//!    exposed as [`BandTransmission`] with `t_k = (1 − α_k)^layers`.
//! 2. **Sonic raycast vs WorldSoA** — fixed-step sphere sweep against the live
//!    [`SceneGraph`] SoA columns (radius from geometric scale). Obstruction is
//!    modeled as occlusion × HF rolloff (`layers = occlusion · OCCLUSION_EXP`),
//!    the game-audio obstruction convention — honest, not a mass-wall TL claim.
//! 3. **Knife-edge diffraction** (Huygens) — re-radiates from the obstacle edge
//!    grazing the line of sight: `diff_gain = √(d_direct/d_diff) · 0.5`.
//! 4. **Dynamic IR swap** — [`AcousticRaytracingSolver::swap_impulse_response`]
//!    composes the [`RoomReverbEstimate`] RT60 tail + [`AcousticEchoTap`]
//!    specular taps + deterministic LCG noise with material one-pole coloration
//!    + edge diffraction into a bounded, bit-exact IR.
//! 5. **Voice virtualization** (Founder "Densidade Sonora (O Caos)") —
//!    [`budget_voice_virtualization`] renders only the nearest `K` emitters at
//!    full quality and tracks the rest as silent virtual voices — the Hollywood
//!    rule; the engine never renders what the ear cannot resolve, at parity with
//!    Wwise / FMOD actor-mixer voice limiting + obstruction.
//!
//! **Distinct** from ei `acousticReverbGeometryReady` (static room RT60 only),
//! ef `acousticRaytracingEchoReady` (single first-order specular tap), ex
//! `sdfAudioRaymarchingReady` (SDF-field occlusion), and jx
//! `metasoundsDspReady` (DSP graph VM). **Composes** ei + ef + dc — never
//! duplicates their physics.
//!
//! Honesty probe `acoustic_raytracing_solver_ready` / `acousticRaytracingSolverReady`.
//! Evidence: `evidence_kind` + deterministic `evidence_fingerprint` (seed
//! `0x6b61_736f_6c76`) measure distinct from all peers — no hard-coded
//! `distinct_from_*: true`.
//!
//! **HELD:** Full MetaSounds / HRTF AAA (`metasounds_aaa_ready: false`,
//! `hrtf_aaa_ready: false`) · AVX-512 kernel · neural upscaling · Wwise/FMOD
//! Studio binary parity — all false until proven on real hardware.

use serde::{Deserialize, Serialize};

use crate::acoustic_raytracing_echo::{AcousticEchoTap, AcousticRaytracingEcho};
use crate::acoustic_reverb_geometry::AcousticReverbGeometry;
use crate::ecs_core::SceneGraph;

/// Native kernel render rate [Hz] — matches the MetaSounds graph compiler.
pub const SAMPLE_RATE_HZ: f32 = 48_000.0;
/// Octave-band center frequencies [Hz] (125 Hz … 4 kHz).
pub const BAND_CENTERS_HZ: [f32; 6] = [125.0, 250.0, 500.0, 1_000.0, 2_000.0, 4_000.0];
/// Number of octave bands in the absorption tables.
pub const BAND_COUNT: usize = 6;
/// Fixed-step sonic ray sweep [m].
pub const RAY_STEP_M: f32 = 0.2;
/// Base radius [m] of a WorldSoA entity at unit scale (1 m diameter).
pub const SOA_ENTITY_RADIUS_M: f32 = 0.5;
/// Occlusion → effective wall layers multiplier (obstruction = HF rolloff).
pub const OCCLUSION_EXP: f32 = 4.0;
/// First tail sample (skips the direct-impulse edge).
pub const TAIL_START: usize = 8;
/// Deterministic reverb-tail amplitude (below unity so the direct path dominates).
pub const TAIL_GAIN: f32 = 0.2;
/// Numerical epsilon [m].
const EPS: f32 = 1e-5;

/// Published octave-band absorption coefficients α (125…4 kHz), material table.
const CONCRETE_ABSORPTION: [f32; BAND_COUNT] = [0.01, 0.01, 0.015, 0.02, 0.02, 0.025];
const GLASS_ABSORPTION: [f32; BAND_COUNT] = [0.35, 0.25, 0.18, 0.12, 0.07, 0.04];
const WOOD_ABSORPTION: [f32; BAND_COUNT] = [0.28, 0.22, 0.17, 0.09, 0.10, 0.11];
const CARPET_ABSORPTION: [f32; BAND_COUNT] = [0.02, 0.06, 0.14, 0.37, 0.60, 0.65];
const STEEL_ABSORPTION: [f32; BAND_COUNT] = [0.05, 0.10, 0.10, 0.04, 0.02, 0.02];

/// A surface material with a published octave-band absorption table.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AcousticMaterial {
    Concrete,
    Glass,
    Wood,
    Carpet,
    Steel,
}

impl AcousticMaterial {
    /// All supported materials, in table order.
    pub const ALL: [Self; 5] = [
        Self::Concrete,
        Self::Glass,
        Self::Wood,
        Self::Carpet,
        Self::Steel,
    ];

    /// Stable lowercase name (wire / diagnostics).
    pub fn name(self) -> &'static str {
        match self {
            Self::Concrete => "concrete",
            Self::Glass => "glass",
            Self::Wood => "wood",
            Self::Carpet => "carpet",
            Self::Steel => "steel",
        }
    }

    /// The octave-band absorption table (125…4 kHz).
    fn table(self) -> [f32; BAND_COUNT] {
        match self {
            Self::Concrete => CONCRETE_ABSORPTION,
            Self::Glass => GLASS_ABSORPTION,
            Self::Wood => WOOD_ABSORPTION,
            Self::Carpet => CARPET_ABSORPTION,
            Self::Steel => STEEL_ABSORPTION,
        }
    }

    /// Absorption coefficient α_k ∈ [0, 1] for octave band `band`.
    pub fn absorption(self, band: usize) -> f32 {
        let t = self.table();
        if band < BAND_COUNT {
            t[band]
        } else {
            t[BAND_COUNT - 1]
        }
    }
}

/// Per-band acoustic transmission through `layers` of a material:
/// `t_k = (1 − α_k)^layers`.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BandTransmission {
    /// Per-band transmission coefficients.
    pub bands: [f32; BAND_COUNT],
    /// Geometric mean across bands (single scalar for broadband mixing).
    pub broadband: f32,
    /// `t[4 kHz] / t[125 Hz]` clamped to [0, 1] — material brightness.
    pub lowpass_gain: f32,
}

impl BandTransmission {
    /// Identity: no material, no layers (full transmission).
    pub const FULL: Self = Self {
        bands: [1.0; BAND_COUNT],
        broadband: 1.0,
        lowpass_gain: 1.0,
    };

    /// Transmission through `layers` effective walls of `material`.
    pub fn through_material(material: AcousticMaterial, layers: f32) -> Self {
        let layers = layers.max(0.0);
        let mut bands = [1.0_f32; BAND_COUNT];
        for k in 0..BAND_COUNT {
            let alpha = material.absorption(k).clamp(0.0, 0.999);
            bands[k] = (1.0 - alpha).max(0.0).powf(layers);
        }
        let broadband = geometric_mean(&bands);
        let lowpass_gain = (bands[BAND_COUNT - 1] / bands[0].max(1e-6)).clamp(0.0, 1.0);
        Self {
            bands,
            broadband,
            lowpass_gain,
        }
    }
}

/// Geometric mean of the per-band transmission coefficients.
fn geometric_mean(bands: &[f32; BAND_COUNT]) -> f32 {
    let mut prod = 1.0_f32;
    for b in bands.iter() {
        prod *= b.max(1e-6);
    }
    prod.powf(1.0 / BAND_COUNT as f32)
}

// ---------------------------------------------------------------------------
// Geometry helpers (segment / distance — no external linear algebra dependency)
// ---------------------------------------------------------------------------

fn norm3(a: [f32; 3], b: [f32; 3]) -> f32 {
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    let dz = a[2] - b[2];
    (dx * dx + dy * dy + dz * dz).sqrt()
}

fn closest_point_on_segment(p: [f32; 3], a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    let abx = b[0] - a[0];
    let aby = b[1] - a[1];
    let abz = b[2] - a[2];
    let apx = p[0] - a[0];
    let apy = p[1] - a[1];
    let apz = p[2] - a[2];
    let ab2 = abx * abx + aby * aby + abz * abz;
    let t = if ab2 > EPS {
        ((apx * abx + apy * aby + apz * abz) / ab2).clamp(0.0, 1.0)
    } else {
        0.0
    };
    [a[0] + abx * t, a[1] + aby * t, a[2] + abz * t]
}

fn segment_distance_sq(p: [f32; 3], a: [f32; 3], b: [f32; 3]) -> f32 {
    let c = closest_point_on_segment(p, a, b);
    let dx = p[0] - c[0];
    let dy = p[1] - c[1];
    let dz = p[2] - c[2];
    dx * dx + dy * dy + dz * dz
}

// ---------------------------------------------------------------------------
// Sonic raycast vs WorldSoA
// ---------------------------------------------------------------------------

/// Result of a fixed-step sonic raycast against the live [`SceneGraph`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RaycastHit {
    /// Straight-line listener→source distance [m].
    pub direct_path_m: f32,
    /// Fraction of the path inside solid geometry, clamped to [0, 1].
    pub occlusion: f32,
    /// Number of times the ray entered a solid body (obstruction edges).
    pub crossings: u32,
    /// Effective wall layers = `occlusion · OCCLUSION_EXP`.
    pub layers: f32,
    /// True when the path is measurably obstructed.
    pub hit: bool,
    /// Per-band transmission after the occlusion layers.
    pub transmission: BandTransmission,
    /// Center of the most line-of-sight-central blocking entity [m].
    pub blocking_center: [f32; 3],
    /// Radius of that blocking entity [m].
    pub blocking_radius_m: f32,
}

impl RaycastHit {
    /// Fail-closed / clear-path identity.
    pub const CLEAR: Self = Self {
        direct_path_m: 0.0,
        occlusion: 0.0,
        crossings: 0,
        layers: 0.0,
        hit: false,
        transmission: BandTransmission::FULL,
        blocking_center: [0.0; 3],
        blocking_radius_m: 0.0,
    };

    /// All physical quantities are finite.
    pub fn is_finite(&self) -> bool {
        self.direct_path_m.is_finite()
            && self.occlusion.is_finite()
            && self.layers.is_finite()
            && self.blocking_radius_m.is_finite()
    }
}

/// Fixed-step sphere sweep of the listener→source ray against active WorldSoA
/// entities (radius from geometric scale). Obstruction = occlusion × HF
/// rolloff (`layers = occlusion · OCCLUSION_EXP`) — the game-audio convention.
pub fn sonic_raycast(
    listener: [f32; 3],
    source: [f32; 3],
    world: &SceneGraph,
    material: AcousticMaterial,
) -> RaycastHit {
    let dx = source[0] - listener[0];
    let dy = source[1] - listener[1];
    let dz = source[2] - listener[2];
    let direct_path_m = (dx * dx + dy * dy + dz * dz).sqrt();
    if !direct_path_m.is_finite() || direct_path_m <= EPS {
        return RaycastHit::CLEAR;
    }

    // Most line-of-sight-central blocking entity (smallest segment distance /
    // radius² ratio among all active entities).
    let mut best_ratio = f32::INFINITY;
    let mut blocking_center = [0.0_f32; 3];
    let mut blocking_radius = 0.0_f32;
    for i in 0..world.len {
        if !world.is_active(i) {
            continue;
        }
        let scale = world.scale_x[i].max(world.scale_y[i]).max(world.scale_z[i]).max(0.25);
        let r = SOA_ENTITY_RADIUS_M * scale;
        let seg_d2 = segment_distance_sq(
            [world.pos_x[i], world.pos_y[i], world.pos_z[i]],
            listener,
            source,
        );
        let ratio = seg_d2 / (r * r).max(EPS);
        if ratio < best_ratio {
            best_ratio = ratio;
            blocking_center = [world.pos_x[i], world.pos_y[i], world.pos_z[i]];
            blocking_radius = r;
        }
    }

    // Fixed-step sphere sweep for occlusion + crossings.
    let steps = ((direct_path_m / RAY_STEP_M).ceil() as usize).max(1);
    let step_len = direct_path_m / steps as f32;
    let mut solid_path = 0.0_f32;
    let mut crossings = 0_u32;
    let mut was_inside = false;
    for s in 0..=steps {
        let t = s as f32 * step_len / direct_path_m;
        let px = listener[0] + dx * t;
        let py = listener[1] + dy * t;
        let pz = listener[2] + dz * t;
        let mut inside = false;
        for i in 0..world.len {
            if !world.is_active(i) {
                continue;
            }
            let ex = world.pos_x[i] - px;
            let ey = world.pos_y[i] - py;
            let ez = world.pos_z[i] - pz;
            let scale = world.scale_x[i].max(world.scale_y[i]).max(world.scale_z[i]).max(0.25);
            let r = SOA_ENTITY_RADIUS_M * scale;
            let d2 = ex * ex + ey * ey + ez * ez;
            if d2 <= r * r {
                inside = true;
                break;
            }
        }
        if inside {
            solid_path += step_len;
            if !was_inside {
                crossings += 1;
            }
        }
        was_inside = inside;
    }

    let occlusion = (solid_path / direct_path_m).clamp(0.0, 1.0);
    let layers = occlusion * OCCLUSION_EXP;
    let hit = occlusion > 0.02 || crossings > 0;
    let transmission = BandTransmission::through_material(material, layers);
    RaycastHit {
        direct_path_m,
        occlusion,
        crossings,
        layers,
        hit,
        transmission,
        blocking_center,
        blocking_radius_m: blocking_radius,
    }
}

// ---------------------------------------------------------------------------
// Knife-edge diffraction (Huygens)
// ---------------------------------------------------------------------------

/// Result of a knife-edge (Huygens) diffraction computation.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DiffractionResult {
    /// True when the obstacle actually grazes the line of sight.
    pub diffracted: bool,
    /// `d_direct / d_diff` ∈ (0, 1] — path-length ratio.
    pub edge_ratio: f32,
    /// `√(d_direct/d_diff) · 0.5` — secondary-source amplitude.
    pub diff_gain: f32,
}

impl DiffractionResult {
    /// No diffraction (open line of sight).
    pub const NONE: Self = Self {
        diffracted: false,
        edge_ratio: 0.0,
        diff_gain: 0.0,
    };
}

/// Huygens knife-edge diffraction: when an obstacle surface grazes the line of
/// sight, the grazing edge re-radiates as a cylindrical secondary source with
/// `diff_gain = √(d_direct / d_diff) · 0.5` (~6 dB shadow-boundary loss).
pub fn knife_edge(
    listener: [f32; 3],
    source: [f32; 3],
    obstacle_center: [f32; 3],
    radius_m: f32,
) -> DiffractionResult {
    let direct = norm3(listener, source);
    if !direct.is_finite() || direct <= EPS || !radius_m.is_finite() || radius_m <= EPS {
        return DiffractionResult::NONE;
    }
    let closest = closest_point_on_segment(obstacle_center, listener, source);
    let cx = obstacle_center[0] - closest[0];
    let cy = obstacle_center[1] - closest[1];
    let cz = obstacle_center[2] - closest[2];
    let cdist = (cx * cx + cy * cy + cz * cz).sqrt();
    if cdist > radius_m {
        return DiffractionResult::NONE;
    }

    // Knife-edge apex: the obstacle surface point closest to the line of sight.
    let (ux, uy, uz) = if cdist > EPS {
        (cx / cdist, cy / cdist, cz / cdist)
    } else {
        // Center lies exactly on the ray — pick a deterministic perpendicular.
        let dnx = (source[0] - listener[0]) / direct;
        let dny = (source[1] - listener[1]) / direct;
        let dnz = (source[2] - listener[2]) / direct;
        perpendicular(&[dnx, dny, dnz])
    };

    let edge = [
        obstacle_center[0] - ux * radius_m,
        obstacle_center[1] - uy * radius_m,
        obstacle_center[2] - uz * radius_m,
    ];
    let d_s = norm3(edge, source);
    let d_l = norm3(edge, listener);
    let d_diff = d_s + d_l;
    let edge_ratio = (direct / d_diff.max(EPS)).clamp(0.0, 1.0);
    let diff_gain = edge_ratio.sqrt() * 0.5;
    DiffractionResult {
        diffracted: true,
        edge_ratio,
        diff_gain,
    }
}

/// Deterministic unit vector perpendicular to `d` (fallback for on-axis edges).
fn perpendicular(d: &[f32; 3]) -> (f32, f32, f32) {
    let up = [0.0_f32, 1.0, 0.0];
    let mut cx = d[1] * up[2] - d[2] * up[1];
    let mut cy = d[2] * up[0] - d[0] * up[2];
    let mut cz = d[0] * up[1] - d[1] * up[0];
    let mut len = (cx * cx + cy * cy + cz * cz).sqrt();
    if len <= EPS {
        let alt = [1.0_f32, 0.0, 0.0];
        cx = d[1] * alt[2] - d[2] * alt[1];
        cy = d[2] * alt[0] - d[0] * alt[2];
        cz = d[0] * alt[1] - d[1] * alt[0];
        len = (cx * cx + cy * cy + cz * cz).sqrt();
    }
    if len <= EPS {
        (1.0, 0.0, 0.0)
    } else {
        (cx / len, cy / len, cz / len)
    }
}

// ---------------------------------------------------------------------------
// Voice virtualization (Founder "Densidade Sonora (O Caos)")
// ---------------------------------------------------------------------------

/// Voice virtualization budget — render only the nearest `K` emitters at full
/// quality; track the rest as silent virtual voices (Hollywood rule).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VoiceBudget {
    /// Active emitters in the world.
    pub active_emitters: usize,
    /// Emitters actually rendered (nearest K).
    pub rendered: usize,
    /// Emitters tracked as silent virtual voices.
    pub virtualized: usize,
    /// Inactive entity slots ignored by the mixer.
    pub inactive_ignored: usize,
    /// Sorted distances of the rendered emitters [m].
    pub nearest_distances_m: Vec<f32>,
}

/// Compute the voice budget for a world relative to a listener. Inactive slots
/// are ignored; the `max_rendered` nearest active emitters are rendered and the
/// rest virtualized — the ear cannot resolve more than ~30 simultaneous voices.
pub fn budget_voice_virtualization(
    world: &SceneGraph,
    listener: [f32; 3],
    max_rendered: usize,
) -> VoiceBudget {
    let mut active = 0_usize;
    let mut inactive = 0_usize;
    let mut dists = Vec::with_capacity(world.len);
    for i in 0..world.len {
        if !world.is_active(i) {
            inactive += 1;
            continue;
        }
        active += 1;
        let dx = world.pos_x[i] - listener[0];
        let dy = world.pos_y[i] - listener[1];
        let dz = world.pos_z[i] - listener[2];
        dists.push((dx * dx + dy * dy + dz * dz).sqrt());
    }
    dists.sort_by(f32::total_cmp);
    let rendered = active.min(max_rendered);
    let virtualized = active.saturating_sub(rendered);
    VoiceBudget {
        active_emitters: active,
        rendered,
        virtualized,
        inactive_ignored: inactive,
        nearest_distances_m: dists[..rendered].to_vec(),
    }
}

// ---------------------------------------------------------------------------
// Deterministic impulse-response build
// ---------------------------------------------------------------------------

/// One-pole lowpass coefficient derived from material brightness — darker
/// materials (carpet) roll the tail off at ~750 Hz, bright ones (steel) near
/// 8 kHz, producing the measurable coloration contrast.
fn material_lowpass_alpha(material: AcousticMaterial, sample_rate_hz: f32) -> f32 {
    let lg = BandTransmission::through_material(material, 1.0)
        .lowpass_gain
        .clamp(0.0, 1.0);
    let log_lo = 200.0_f32.ln();
    let log_hi = 8_000.0_f32.ln();
    let log_cut = log_lo + lg * (log_hi - log_lo);
    let cutoff_hz = log_cut.exp().clamp(200.0, 8_000.0);
    let a = 1.0 - (-2.0 * std::f32::consts::PI * cutoff_hz / sample_rate_hz).exp();
    a.clamp(0.001, 0.999)
}

/// Build a bounded, deterministic impulse response:
/// direct impulse + specular echo tap (composed from
/// [`AcousticRaytracingEcho::propagate_sound_waves`]) + edge diffraction tap +
/// deterministic LCG tail with material one-pole coloration and
/// `exp(−3t/RT60)` decay (composed from the room RT60). Bit-exact across runs.
pub fn build_impulse_response(
    sample_rate_hz: f32,
    material: AcousticMaterial,
    room: &crate::acoustic_reverb_geometry::RoomReverbEstimate,
    echo: AcousticEchoTap,
    occlusion: f32,
    diff_gain: f32,
    seed: u64,
) -> Vec<f32> {
    let sr = if sample_rate_hz.is_finite() && sample_rate_hz > 1_000.0 {
        sample_rate_hz
    } else {
        SAMPLE_RATE_HZ
    };
    let rt60 = if room.is_finite() {
        room.rt60_sabine_sec
    } else {
        0.5
    };
    let rt60 = rt60.max(0.05);
    let len = (((rt60 * 1.4 + 0.05) * sr).round() as usize).clamp(64, 65_536);
    let mut ir = vec![0.0_f32; len];

    // Deterministic LCG tail with material one-pole coloration + RT60 decay —
    // built FIRST so the direct impulse and the specular/diffraction taps below
    // become ADDITIVE peaks on top of the diffuse reverberant floor (they would
    // otherwise be overwritten by the tail assignment at the same index).
    let alpha = material_lowpass_alpha(material, sr);
    let mut state = seed ^ 0x6B61_736F_6C76_u64;
    let mut prev = 0.0_f32;
    for i in TAIL_START..len {
        state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        let noise = ((state >> 40) as f32) / 16_777_216.0 * 2.0 - 1.0;
        let env = (-3.0 * i as f32 / sr / rt60).exp();
        prev += alpha * (noise - prev);
        ir[i] = prev * env * TAIL_GAIN;
    }

    // Direct path (first sample dominates the energy budget).
    ir[0] += 1.0;

    // Specular echo tap at the round-trip delay (ef composition), scaled by the
    // material broadband transmission and the occlusion obstruction.
    let delay_idx = ((echo.delay_sec.max(0.0) * sr).round() as usize).min(len - 1);
    if echo.delay_sec > 1e-5 && echo.echo_gain > 1e-5 {
        let transmission = BandTransmission::through_material(material, 1.0);
        let obstruct = (1.0 - occlusion * 0.5).clamp(0.0, 1.0);
        let tap_gain = echo.echo_gain * transmission.broadband * obstruct;
        if tap_gain > 1e-5 {
            ir[delay_idx] += tap_gain;
        }
    }
    // Edge-diffraction tap at the same delay (Huygens secondary source).
    if diff_gain > 1e-5 {
        let diff_tap = diff_gain * 0.5;
        ir[delay_idx] += diff_tap;
    }
    ir
}

/// High-frequency energy of an IR — sum of adjacent-sample magnitudes from
/// [`TAIL_START`] (avoids the direct-impulse edge dominating the metric).
/// Dark materials smooth the tail → lower HF energy.
pub fn high_frequency_energy(ir: &[f32]) -> f32 {
    let mut acc = 0.0_f32;
    for i in TAIL_START..ir.len() {
        acc += (ir[i] - ir[i - 1]).abs();
    }
    acc
}

// ---------------------------------------------------------------------------
// Acoustic raytracing solver
// ---------------------------------------------------------------------------

/// Stateful spatial-audio solver: holds the current dynamic impulse response
/// and the voice budget, and swaps both on demand.
#[derive(Debug, Clone)]
pub struct AcousticRaytracingSolver {
    /// Monotonic IR generation counter (bumped on every swap).
    pub generation: u64,
    /// Total swaps performed.
    pub swap_count: u64,
    /// Current impulse response (bounded, deterministic).
    pub current_ir: Vec<f32>,
    /// Render rate [Hz].
    pub sample_rate_hz: f32,
    /// Active surface material (drives tail coloration + tap broadband).
    pub material: AcousticMaterial,
    /// Last voice virtualization budget.
    pub voice_budget: VoiceBudget,
    /// Last composed room RT60 [s].
    pub last_room_rt60: f32,
    /// Last occlusion fraction.
    pub last_occlusion: f32,
    /// Last diffraction gain.
    pub last_diff_gain: f32,
}

impl Default for AcousticRaytracingSolver {
    fn default() -> Self {
        Self::new(SAMPLE_RATE_HZ)
    }
}

impl AcousticRaytracingSolver {
    /// Create an idle solver at the given render rate (fail-closed to 48 kHz).
    pub fn new(sample_rate_hz: f32) -> Self {
        let sr = if sample_rate_hz.is_finite() && sample_rate_hz > 1_000.0 {
            sample_rate_hz
        } else {
            SAMPLE_RATE_HZ
        };
        Self {
            generation: 0,
            swap_count: 0,
            current_ir: Vec::new(),
            sample_rate_hz: sr,
            material: AcousticMaterial::Concrete,
            voice_budget: VoiceBudget {
                active_emitters: 0,
                rendered: 0,
                virtualized: 0,
                inactive_ignored: 0,
                nearest_distances_m: Vec::new(),
            },
            last_room_rt60: 0.0,
            last_occlusion: 0.0,
            last_diff_gain: 0.0,
        }
    }

    /// Change the active surface material (next swap uses it).
    pub fn set_material(&mut self, material: AcousticMaterial) {
        self.material = material;
    }

    /// Dynamic IR swap: compose the room RT60 tail + echo tap + diffraction +
    /// material coloration + voice budget, bump the generation, and return it.
    /// Bit-exact deterministic for a fixed seed.
    pub fn swap_impulse_response(
        &mut self,
        listener: [f32; 3],
        source: [f32; 3],
        wall_distance_m: f32,
        room: &crate::acoustic_reverb_geometry::RoomReverbEstimate,
        world: &SceneGraph,
        medium_density: f32,
        seed: u64,
        max_rendered: usize,
    ) -> u64 {
        let hit = sonic_raycast(listener, source, world, self.material);
        let echo = AcousticRaytracingEcho::propagate_sound_waves(
            BAND_CENTERS_HZ[3],
            wall_distance_m,
            0.8,
            medium_density,
        );
        let diff = if hit.hit {
            knife_edge(listener, source, hit.blocking_center, hit.blocking_radius_m)
        } else {
            DiffractionResult::NONE
        };
        let ir = build_impulse_response(
            self.sample_rate_hz,
            self.material,
            room,
            echo,
            hit.occlusion,
            diff.diff_gain,
            seed,
        );
        let budget = budget_voice_virtualization(world, listener, max_rendered);

        self.generation += 1;
        self.swap_count += 1;
        self.current_ir = ir;
        self.voice_budget = budget;
        self.last_room_rt60 = room.rt60_sabine_sec;
        self.last_occlusion = hit.occlusion;
        self.last_diff_gain = diff.diff_gain;
        self.generation
    }
}

/// Lightweight solver-state probe (wire-facing).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AcousticRaytracingSolverProbe {
    /// True once at least one swap produced a non-empty IR.
    pub acoustic_raytracing_solver_ready: bool,
    /// Current IR generation.
    pub generation: u64,
    /// Total swaps performed.
    pub swap_count: u64,
    /// Current IR length.
    pub current_ir_len: usize,
    /// Rendered (audible) voices.
    pub rendered: usize,
    /// Virtualized (silent-tracked) voices.
    pub virtualized: usize,
    /// Last occlusion fraction.
    pub last_occlusion: f32,
    /// Last diffraction gain.
    pub last_diff_gain: f32,
    /// Honesty: full MetaSounds AAA remains HELD.
    pub metasounds_aaa_ready: bool,
    /// Honesty: full HRTF AAA remains HELD.
    pub hrtf_aaa_ready: bool,
}

/// Probe a solver instance.
pub fn probe_solver(solver: &AcousticRaytracingSolver) -> AcousticRaytracingSolverProbe {
    AcousticRaytracingSolverProbe {
        acoustic_raytracing_solver_ready: solver.generation > 0 && !solver.current_ir.is_empty(),
        generation: solver.generation,
        swap_count: solver.swap_count,
        current_ir_len: solver.current_ir.len(),
        rendered: solver.voice_budget.rendered,
        virtualized: solver.voice_budget.virtualized,
        last_occlusion: solver.last_occlusion,
        last_diff_gain: solver.last_diff_gain,
        metasounds_aaa_ready: false,
        hrtf_aaa_ready: false,
    }
}

// ---------------------------------------------------------------------------
// Soak + probe
// ---------------------------------------------------------------------------

/// Evidence fingerprint mixer (shared with sibling kernels).
fn hash_mix(h: u64, v: u64) -> u64 {
    (h ^ v).wrapping_mul(0x9E37_79B9_7F4A_7C15)
}

fn ka_evidence_fingerprint(
    direct_path_m: f32,
    occlusion: f32,
    diff_gain: f32,
    steel_hf: f32,
    carpet_hf: f32,
    rt60_sec: f32,
    rendered: usize,
) -> u64 {
    let mut h = 0x6B61_736F_6C76_u64; // "kasolv" — ka seed, distinct from peers.
    h = hash_mix(h, direct_path_m.to_bits() as u64);
    h = hash_mix(h, occlusion.to_bits() as u64);
    h = hash_mix(h, diff_gain.to_bits() as u64);
    h = hash_mix(h, steel_hf.to_bits() as u64);
    h = hash_mix(h, carpet_hf.to_bits() as u64);
    h = hash_mix(h, rt60_sec.to_bits() as u64);
    h = hash_mix(h, rendered as u64);
    h
}

/// Soak report for the acoustic raytracing solver (letter **ka**).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AcousticRaytracingSolverSoakReport {
    /// True when every physical invariant below measurably holds.
    pub acoustic_raytracing_solver_ready: bool,
    /// Steel vs carpet per-band absorption differ measurably.
    pub material_distinct: bool,
    /// Occluded path transmits less broadband than the clear path.
    pub occlusion_lowers_band_power: bool,
    /// Knife-edge diffraction only appears on a blocked line of sight.
    pub diffraction_visible: bool,
    /// Two swaps with different materials increment generation + change the IR.
    pub ir_swap_changes_generation: bool,
    /// Built IR length stays within [64, 65 536].
    pub ir_length_bounded: bool,
    /// Steel tail carries more HF energy than carpet (`steel_hf > carpet_hf·1.5`).
    pub ir_tail_coloration_visible: bool,
    /// Specular echo tap sits at the round-trip delay as a local peak.
    pub echo_tap_at_delay: bool,
    /// Voice budget renders 3 of 11 active emitters and virtualizes 8.
    pub voice_budget_virtualizes: bool,
    /// Same seed ⇒ bit-exact identical IR.
    pub ir_deterministic: bool,
    /// Direct path length [m].
    pub direct_path_m: f32,
    /// Composed room RT60 [s].
    pub rt60_sec: f32,
    /// High-frequency energy of the steel-material IR.
    pub steel_hf: f32,
    /// High-frequency energy of the carpet-material IR.
    pub carpet_hf: f32,
    /// Rendered (audible) voices.
    pub rendered: usize,
    /// Virtualized (silent-tracked) voices.
    pub virtualized: usize,
    /// Evidence kind (distinct from sibling kernels).
    pub evidence_kind: String,
    /// Deterministic evidence fingerprint.
    pub evidence_fingerprint: u64,
    /// Kernel letter.
    pub letter: String,
    /// Human-readable soak note.
    pub note: String,
    /// Honesty flags — full MetaSounds / HRTF / AVX512 / neural upscaling HELD.
    pub metasounds_aaa_ready: bool,
    pub hrtf_aaa_ready: bool,
    pub avx512_kernel_ready: bool,
    pub neural_upscale_aaa_ready: bool,
    /// False — the linear plan is gone; the solver is active.
    pub linear_plan_only: bool,
}

/// Run the full deterministic acoustic raytracing solver soak.
pub fn run_acoustic_raytracing_solver_soak() -> AcousticRaytracingSolverSoakReport {
    let sr = SAMPLE_RATE_HZ;
    let seed = 0x6B61_736F_6C76_0001_u64;
    let listener = [0.0_f32, 1.5, 0.0];
    let source = [10.0_f32, 1.5, 0.0];

    // Scene: 12 entities in a ring around the listener (none on the line of
    // sight), one inactive (index 1) for the voice-budget invariant.
    let mut world = SceneGraph::with_capacity(64);
    let step_deg = 30.0_f32.to_radians();
    for k in 0..12 {
        let ang = step_deg + k as f32 * step_deg;
        world.add_entity(3.0 * ang.cos(), 1.5, 3.0 * ang.sin());
    }
    world.set_active(1, false);

    // 1. Material distinctness (published absorption tables).
    let t_steel = BandTransmission::through_material(AcousticMaterial::Steel, 1.0);
    let t_carpet = BandTransmission::through_material(AcousticMaterial::Carpet, 1.0);
    let mut max_band_delta = 0.0_f32;
    for k in 0..BAND_COUNT {
        let d = (t_steel.bands[k] - t_carpet.bands[k]).abs();
        max_band_delta = max_band_delta.max(d);
    }
    let material_distinct = max_band_delta > 0.1
        && t_carpet.bands[BAND_COUNT - 1] < t_steel.bands[BAND_COUNT - 1];

    // 2. Occlusion lowers band power (open vs blocked line of sight, carpet).
    let hit_open = sonic_raycast(listener, source, &world, AcousticMaterial::Carpet);
    world.pos_x[0] = 5.0;
    world.pos_y[0] = 1.5;
    world.pos_z[0] = 0.0;
    world.set_scale(0, 4.0, 4.0, 4.0);
    let hit_blocked = sonic_raycast(listener, source, &world, AcousticMaterial::Carpet);
    let occlusion_lowers_band_power = hit_open.transmission.broadband
        > hit_blocked.transmission.broadband * 1.2
        && hit_blocked.occlusion > 0.1;

    // 3. Knife-edge diffraction only on a blocked line of sight.
    let diff_open = knife_edge(listener, source, [3.0, 1.5, 1.5], 0.5);
    let diff_blocked = knife_edge(listener, source, [5.0, 1.5, 0.0], 2.0);
    let diffraction_visible = !diff_open.diffracted
        && diff_open.diff_gain.abs() < 1e-4
        && diff_blocked.diffracted
        && diff_blocked.diff_gain > 0.1;

    // 4. Room reverb composition (ei) + echo tap (ef).
    let room = AcousticReverbGeometry::estimate_room_reverb(20.0, 15.0, 4.0, 0.2);
    let rt60_sec = room.rt60_sabine_sec;
    let echo = AcousticRaytracingEcho::propagate_sound_waves(1_000.0, 5.0, 0.8, 1.225);

    // 5. IR build + material tail coloration.
    let ir_steel = build_impulse_response(
        sr,
        AcousticMaterial::Steel,
        &room,
        echo,
        hit_blocked.occlusion,
        diff_blocked.diff_gain,
        seed,
    );
    let ir_carpet = build_impulse_response(
        sr,
        AcousticMaterial::Carpet,
        &room,
        echo,
        hit_blocked.occlusion,
        diff_blocked.diff_gain,
        seed,
    );
    let steel_hf = high_frequency_energy(&ir_steel);
    let carpet_hf = high_frequency_energy(&ir_carpet);
    let ir_tail_coloration_visible = steel_hf > carpet_hf * 1.5;
    let ir_length_bounded =
        ir_steel.len() >= 64 && ir_steel.len() <= 65_536 && ir_carpet.len() == ir_steel.len();

    // 6. Echo tap sits at the round-trip delay as a local peak.
    let delay_idx = ((echo.delay_sec * sr).round() as usize).min(ir_steel.len() - 1);
    let mut echo_tap_at_delay = false;
    if delay_idx > TAIL_START {
        let center = ir_steel[delay_idx];
        if center > 0.25 {
            let w = 8_usize;
            let lo = delay_idx.saturating_sub(w);
            let hi = (delay_idx + w).min(ir_steel.len() - 1);
            let mut is_peak = true;
            for k in lo..=hi {
                if k != delay_idx && ir_steel[k] >= center {
                    is_peak = false;
                    break;
                }
            }
            echo_tap_at_delay = is_peak;
        }
    }

    // 7. Determinism (bit-exact same seed).
    let ir_det = build_impulse_response(
        sr,
        AcousticMaterial::Steel,
        &room,
        echo,
        hit_blocked.occlusion,
        diff_blocked.diff_gain,
        seed,
    );
    let ir_deterministic = ir_det == ir_steel;

    // 8. Solver dynamic IR swap (material A → material B).
    let mut solver = AcousticRaytracingSolver::new(sr);
    solver.set_material(AcousticMaterial::Steel);
    let g1 = solver.swap_impulse_response(listener, source, 5.0, &room, &world, 1.225, seed, 3);
    let ir1 = solver.current_ir.clone();
    solver.set_material(AcousticMaterial::Carpet);
    let g2 = solver.swap_impulse_response(listener, source, 5.0, &room, &world, 1.225, seed, 3);
    let ir2 = solver.current_ir.clone();
    let ir_swap_changes_generation = g2 > g1 && ir1 != ir2 && solver.swap_count == 2;

    // 9. Voice virtualization (11 active, budget 3 → 3 rendered / 8 virtual).
    let budget = &solver.voice_budget;
    let voice_budget_virtualizes = budget.active_emitters == 11
        && budget.rendered == 3
        && budget.virtualized == 8
        && budget.inactive_ignored == 1;

    let direct_path_m = hit_blocked.direct_path_m;
    let ready = material_distinct
        && occlusion_lowers_band_power
        && diffraction_visible
        && ir_swap_changes_generation
        && ir_length_bounded
        && ir_tail_coloration_visible
        && echo_tap_at_delay
        && voice_budget_virtualizes
        && ir_deterministic
        && direct_path_m > 0.0
        && rt60_sec > 0.0;

    let fingerprint = ka_evidence_fingerprint(
        direct_path_m,
        hit_blocked.occlusion,
        diff_blocked.diff_gain,
        steel_hf,
        carpet_hf,
        rt60_sec,
        budget.rendered,
    );

    AcousticRaytracingSolverSoakReport {
        acoustic_raytracing_solver_ready: ready,
        material_distinct,
        occlusion_lowers_band_power,
        diffraction_visible,
        ir_swap_changes_generation,
        ir_length_bounded,
        ir_tail_coloration_visible,
        echo_tap_at_delay,
        voice_budget_virtualizes,
        ir_deterministic,
        direct_path_m,
        rt60_sec,
        steel_hf,
        carpet_hf,
        rendered: budget.rendered,
        virtualized: budget.virtualized,
        evidence_kind: "ka_acoustic_raytracing_solver".to_string(),
        evidence_fingerprint: fingerprint,
        letter: "ka".to_string(),
        note: "Desktop soak: 48 kHz acoustic raytracing solver — published octave-band absorption (125 Hz–4 kHz) for Concrete/Glass/Wood/Carpet/Steel composes per-band transmission t=(1−α)^layers; fixed-step sonic raycast vs the live WorldSoA (radius from scale) measures occlusion → HF-rolloff obstruction (Wwise/FMOD obstruction parity); Huygens knife-edge diffraction re-radiates from the line-of-sight grazing edge (√(d_direct/d_diff)·0.5); swapImpulseResponse composes estimate_room_reverb RT60 tail + propagate_sound_waves specular tap + deterministic LCG with material one-pole coloration + edge tap into a bounded, bit-exact IR; carpet darkens the tail (steel_hf > carpet_hf·1.5); voice virtualization renders the nearest 3 of 11 active emitters and tracks 8 as silent virtual voices (Founder Densidade Sonora — Hollywood rule, Wwise/FMOD voice-limit parity); solver ready true; metasounds_aaa_ready / hrtf_aaa_ready / avx512_kernel_ready / neural_upscale_aaa_ready false (HELD); distinct from ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, ex sdfAudioRaymarchingReady, jx metasoundsDspReady, and prior probes".to_string(),
        metasounds_aaa_ready: false,
        hrtf_aaa_ready: false,
        avx512_kernel_ready: false,
        neural_upscale_aaa_ready: false,
        linear_plan_only: false,
    }
}

/// Compatibility probe — runs the deterministic soak.
pub fn probe_acoustic_raytracing_solver() -> AcousticRaytracingSolverSoakReport {
    run_acoustic_raytracing_solver_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn material_absorption_tables_are_distinct() {
        let t_steel = BandTransmission::through_material(AcousticMaterial::Steel, 1.0);
        let t_carpet = BandTransmission::through_material(AcousticMaterial::Carpet, 1.0);
        let mut max_delta = 0.0_f32;
        for k in 0..BAND_COUNT {
            let d = (t_steel.bands[k] - t_carpet.bands[k]).abs();
            max_delta = max_delta.max(d);
        }
        assert!(max_delta > 0.1, "steel/carpet bands too close: {max_delta}");
        // Published anchors: carpet absorbs highs (α_4k = 0.65), steel reflects.
        assert!((t_carpet.bands[5] - 0.35).abs() < 1e-4);
        assert!((t_steel.bands[5] - 0.98).abs() < 1e-4);
        assert!(t_carpet.bands[BAND_COUNT - 1] < t_steel.bands[BAND_COUNT - 1]);
    }

    #[test]
    fn occlusion_reduces_band_transmission() {
        let clear = BandTransmission::through_material(AcousticMaterial::Carpet, 0.0);
        let blocked = BandTransmission::through_material(AcousticMaterial::Carpet, 2.0);
        assert!(clear.broadband > blocked.broadband * 1.3);
        assert!(blocked.bands[BAND_COUNT - 1] < clear.bands[BAND_COUNT - 1]);
    }

    #[test]
    fn knife_edge_diffraction_only_when_blocked() {
        let l = [0.0_f32, 1.5, 0.0];
        let s = [10.0_f32, 1.5, 0.0];
        let open = knife_edge(l, s, [3.0, 1.5, 1.5], 0.5);
        let blocked = knife_edge(l, s, [5.0, 1.5, 0.0], 2.0);
        assert!(!open.diffracted && open.diff_gain.abs() < 1e-4);
        assert!(blocked.diffracted);
        assert!(blocked.diff_gain > 0.1 && blocked.diff_gain <= 0.5);
        assert!(blocked.edge_ratio > 0.0 && blocked.edge_ratio < 1.0);
    }

    #[test]
    fn ir_swap_increments_generation_and_changes_ir() {
        let mut world = SceneGraph::with_capacity(32);
        world.add_entity(5.0, 1.5, 0.0);
        world.set_scale(0, 4.0, 4.0, 4.0);
        let room = AcousticReverbGeometry::estimate_room_reverb(20.0, 15.0, 4.0, 0.2);
        let mut solver = AcousticRaytracingSolver::new(SAMPLE_RATE_HZ);
        solver.set_material(AcousticMaterial::Steel);
        let g1 = solver.swap_impulse_response(
            [0.0, 1.5, 0.0],
            [10.0, 1.5, 0.0],
            5.0,
            &room,
            &world,
            1.225,
            0x6B61_736F_6C76_0001_u64,
            3,
        );
        let ir1 = solver.current_ir.clone();
        solver.set_material(AcousticMaterial::Carpet);
        let g2 = solver.swap_impulse_response(
            [0.0, 1.5, 0.0],
            [10.0, 1.5, 0.0],
            5.0,
            &room,
            &world,
            1.225,
            0x6B61_736F_6C76_0001_u64,
            3,
        );
        let ir2 = solver.current_ir.clone();
        assert_eq!(g1, 1);
        assert_eq!(g2, 2);
        assert_eq!(solver.swap_count, 2);
        assert_ne!(ir1, ir2);
    }

    #[test]
    fn ir_length_is_bounded() {
        let room = AcousticReverbGeometry::estimate_room_reverb(20.0, 15.0, 4.0, 0.2);
        let ir = build_impulse_response(
            SAMPLE_RATE_HZ,
            AcousticMaterial::Steel,
            &room,
            AcousticEchoTap::SILENT,
            0.0,
            0.0,
            7,
        );
        assert!(ir.len() >= 64 && ir.len() <= 65_536);
        assert!(ir[0] >= 1.0, "direct impulse missing");
    }

    #[test]
    fn material_coloration_darkens_carpet_tail() {
        let room = AcousticReverbGeometry::estimate_room_reverb(20.0, 15.0, 4.0, 0.2);
        let echo = AcousticRaytracingEcho::propagate_sound_waves(1_000.0, 5.0, 0.8, 1.225);
        let seed = 0x6B61_736F_6C76_0042_u64;
        let steel = build_impulse_response(
            SAMPLE_RATE_HZ,
            AcousticMaterial::Steel,
            &room,
            echo,
            0.0,
            0.0,
            seed,
        );
        let carpet = build_impulse_response(
            SAMPLE_RATE_HZ,
            AcousticMaterial::Carpet,
            &room,
            echo,
            0.0,
            0.0,
            seed,
        );
        let hf_steel = high_frequency_energy(&steel);
        let hf_carpet = high_frequency_energy(&carpet);
        assert!(
            hf_steel > hf_carpet * 1.5,
            "steel HF {hf_steel} should exceed carpet HF {hf_carpet} by 1.5x"
        );
    }

    #[test]
    fn echo_tap_sits_at_round_trip_delay() {
        let room = AcousticReverbGeometry::estimate_room_reverb(20.0, 15.0, 4.0, 0.2);
        let echo = AcousticRaytracingEcho::propagate_sound_waves(1_000.0, 5.0, 0.8, 1.225);
        assert!(echo.delay_sec > 0.0);
        let ir = build_impulse_response(
            SAMPLE_RATE_HZ,
            AcousticMaterial::Steel,
            &room,
            echo,
            0.0,
            0.0,
            9,
        );
        let delay_idx = ((echo.delay_sec * SAMPLE_RATE_HZ).round() as usize).min(ir.len() - 1);
        let center = ir[delay_idx];
        assert!(center > 0.3, "tap amplitude {center}");
        let w = 8_usize;
        let lo = delay_idx.saturating_sub(w);
        let hi = (delay_idx + w).min(ir.len() - 1);
        for k in lo..=hi {
            if k != delay_idx {
                assert!(ir[k] < center, "tap at {delay_idx} is not a local peak vs {k}");
            }
        }
    }

    #[test]
    fn voice_budget_virtualizes_beyond_budget() {
        let mut world = SceneGraph::with_capacity(32);
        let step = std::f32::consts::PI / 6.0;
        for k in 0..12 {
            world.add_entity(3.0 * (k as f32 * step).cos(), 1.5, 3.0 * (k as f32 * step).sin());
        }
        world.set_active(1, false);
        let budget = budget_voice_virtualization(&world, [0.0, 1.5, 0.0], 3);
        assert_eq!(budget.active_emitters, 11);
        assert_eq!(budget.rendered, 3);
        assert_eq!(budget.virtualized, 8);
        assert_eq!(budget.inactive_ignored, 1);
        assert_eq!(budget.nearest_distances_m.len(), 3);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_acoustic_raytracing_solver_soak();
        assert!(
            r.acoustic_raytracing_solver_ready,
            "soak not ready: {}",
            r.note
        );
        assert!(!r.metasounds_aaa_ready);
        assert!(!r.hrtf_aaa_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.neural_upscale_aaa_ready);
        assert!(!r.linear_plan_only);
        assert_eq!(r.evidence_kind, "ka_acoustic_raytracing_solver");
        assert_eq!(r.letter, "ka");
        assert_ne!(r.evidence_fingerprint, 0);
        assert!(r.rendered == 3 && r.virtualized == 8);
    }

    #[test]
    fn soak_is_deterministic_and_distinct() {
        let a = run_acoustic_raytracing_solver_soak();
        let b = run_acoustic_raytracing_solver_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, 0);
        assert_ne!(a.evidence_kind, "jx_metasounds_dsp_graph_vm");
        let jx = crate::metasounds_dsp_compiler::probe_metasounds_dsp();
        assert_ne!(a.evidence_fingerprint, jx.evidence_fingerprint);
    }
}

//! # Gaze & Intent Anticipation Kernel — letter **lh** (R4-F / Aethel Latent Dreamspace).
//!
//! Foveated rendering exists today ([`gaze_foveated_reprojection`](crate::gaze_foveated_reprojection)
//! **gt** reprojects the fovea at higher quality) but nothing **anticipates** where
//! the gaze is heading next. This kernel closes that gap: from the gaze
//! position/velocity/acceleration it deterministically projects the **future
//! focal point** (parabolic look-ahead **clamped at 300 ms**), classifies the
//! intent into one of three deterministic phases (Fixation / Saccade /
//! Anticipation), and emits a **focal rendering hint** consumed by the foveated
//! reprojector so the GPU can already be shading the region the eye is about to
//! land on.
//!
//! Founder directive (Dreamspace): the dream must **test physics/light in 1 ms
//! and the compiler turns validated numbers into typed Rust structs**. This
//! kernel is the **anticipation choreographer**: it composes the real
//! `gaze_foveated_reprojection` soak evidence (fovea mean / periph mean /
//! motion-aware temporal blend) and rides the fovea-dominance invariant into a
//! bounded `focal_hint`, so the Dream Pass knows whether a scene's gaze-driven
//! focal budget is coherent before committing to the real render.
//!
//! **Honesty note (Anti-Hype, doctrine #66):** the plan names
//! `gaze_foveated_ui_collapse` as a substrate, but that module is a **legacy
//! theater file** — a `GazeFoveatedUiCollapse` struct with only commented-out
//! `println!` placeholders and **no soak, no fingerprint, no evidence**. Per the
//! Zero-MVP / Anti-Mock doctrine this kernel does **not** trust theater as a
//! substrate. Instead it implements the same cognitive-load intent as a **real,
//! deterministic `ui_collapse_hint`**: flow state (steady fixation, low dwell)
//! → interface collapses toward invisible; hesitation (high dwell / saccade) →
//! semantic tools surface. The theater file stays untouched and unreferenced.
//!
//! Anti-laziness quality bar (doctrine #66): full double-pass bit-identical
//! soak, zero-alloc keep-capacity hot loop, 20 AAA tests, fail-closed gaze
//! sanitization (non-finite position/velocity/acceleration → **no prediction**,
//! never extrapolates garbage), and a 29-distinct-from-peer evidence
//! fingerprint (lg included).
//!
//! Fingerprint seed `lh_gaze` (`0x6C68_0000_0000_0001`).

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use crate::gaze_foveated_reprojection::run_gaze_foveated_reprojection_soak;
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Constants — anticipation topology (binding).
// ---------------------------------------------------------------------------

/// Hard clamp on the parabolic look-ahead — the future focal point is never
/// extrapolated more than 300 ms ahead (plan R4-F binding invariant).
pub const GAZE_LOOKAHEAD_MS: f32 = 300.0;
/// Same clamp expressed in seconds.
pub const GAZE_LOOKAHEAD_S: f32 = 0.3;
/// Fixed steps per measured hot-loop drive.
pub const GAZE_STEPS: u32 = 64;
/// Speed (normalized screen units/sec) below which the gaze is a fixation.
pub const FIXATION_SPEED_MAX: f32 = 0.4;
/// Acceleration (units/s²) below which the gaze is a fixation.
pub const FIXATION_ACCEL_MAX: f32 = 2.0;
/// Speed at or above which the movement is a ballistic saccade (landing unknown).
pub const SACCADE_SPEED_MIN: f32 = 20.0;
/// Acceleration at or above which the movement is a ballistic saccade.
pub const SACCADE_ACCEL_MIN: f32 = 600.0;
/// Speed at which the full 300 ms look-ahead is used (pursuit at full speed).
pub const ANTICIPATION_FULL_SPEED: f32 = 6.0;
/// Dwell window (ms) over which hesitation ramps the semantic-tools surfacing.
pub const HESITATION_MS: f32 = 2000.0;
/// Prediction confidence for a steady fixation.
pub const CONFIDENCE_FIXATION: f32 = 1.0;
/// Prediction confidence for a smooth anticipatory pursuit.
pub const CONFIDENCE_ANTICIPATION: f32 = 0.7;
/// Prediction confidence for a ballistic saccade (landing genuinely unknown).
pub const CONFIDENCE_SACCADE: f32 = 0.2;

/// Deterministic soak seed for the double-pass bit-identical gate.
pub const GAZE_SOAK_SEED: u64 = 0x6C68_0000_4040_5EED;
/// Fingerprint seed for letter **lh** (0x6C68 = "lh").
pub const GAZE_FP_SEED: u64 = 0x6C68_0000_0000_0001;
/// Final fingerprint fold.
pub const GAZE_FP_FOLD: u64 = 0x6C68_6C68_6C68_6C68;
/// Evidence kind for the wire registry.
pub const GAZE_EVIDENCE_KIND: &str = "lh_gaze_intent_anticipation";

// ---------------------------------------------------------------------------
// Deterministic intent classification.
// ---------------------------------------------------------------------------

/// The three deterministic intent phases, ordered by index.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GazeIntentPhase {
    /// Steady gaze on a fixed point — prediction is the point itself.
    Fixation,
    /// Ballistic gaze jump — the landing is genuinely unknown (no extrapolation).
    Saccade,
    /// Smooth anticipatory pursuit — the focal point is projected 300 ms ahead.
    Anticipation,
}

impl GazeIntentPhase {
    /// All phases, ordered by index.
    pub const ALL: [GazeIntentPhase; 3] = [
        GazeIntentPhase::Fixation,
        GazeIntentPhase::Saccade,
        GazeIntentPhase::Anticipation,
    ];

    /// Stable zero-based index (Fixation=0, Saccade=1, Anticipation=2).
    pub const fn index(self) -> usize {
        match self {
            GazeIntentPhase::Fixation => 0,
            GazeIntentPhase::Saccade => 1,
            GazeIntentPhase::Anticipation => 2,
        }
    }

    /// Stable tag used by the wire layer.
    pub const fn tag(self) -> &'static str {
        match self {
            GazeIntentPhase::Fixation => "fixation",
            GazeIntentPhase::Saccade => "saccade",
            GazeIntentPhase::Anticipation => "anticipation",
        }
    }
}

/// A single deterministic gaze sample in normalized screen coordinates.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GazeSample {
    /// Current focal x in [0, 1].
    pub px: f32,
    /// Current focal y in [0, 1].
    pub py: f32,
    /// Horizontal gaze velocity (normalized screen units/sec).
    pub vx: f32,
    /// Vertical gaze velocity (normalized screen units/sec).
    pub vy: f32,
    /// Horizontal gaze acceleration (normalized screen units/s²).
    pub ax: f32,
    /// Vertical gaze acceleration (normalized screen units/s²).
    pub ay: f32,
}

impl GazeSample {
    /// All-zero sample.
    pub const ZERO: Self = Self {
        px: 0.5,
        py: 0.5,
        vx: 0.0,
        vy: 0.0,
        ax: 0.0,
        ay: 0.0,
    };

    /// Every field is finite (fail-closed gate).
    pub fn is_finite(&self) -> bool {
        self.px.is_finite()
            && self.py.is_finite()
            && self.vx.is_finite()
            && self.vy.is_finite()
            && self.ax.is_finite()
            && self.ay.is_finite()
    }

    /// Euclidean gaze speed.
    pub fn speed(&self) -> f32 {
        (self.vx * self.vx + self.vy * self.vy).sqrt()
    }

    /// Euclidean gaze acceleration magnitude.
    pub fn accel(&self) -> f32 {
        (self.ax * self.ax + self.ay * self.ay).sqrt()
    }
}

/// The deterministic prediction emitted for one gaze sample.
#[derive(Debug, Clone, PartialEq)]
pub struct GazePrediction {
    /// False when the gaze was non-finite or otherwise invalid (fail-closed).
    pub valid: bool,
    /// Predicted future focal x in [0, 1] (clamped).
    pub future_x: f32,
    /// Predicted future focal y in [0, 1] (clamped).
    pub future_y: f32,
    /// Look-ahead actually applied, always ≤ `GAZE_LOOKAHEAD_MS`.
    pub lookahead_ms: f32,
    /// Deterministic intent phase.
    pub phase: GazeIntentPhase,
    /// Focal rendering hint in [0, 1] — the foveated reprojector's priority.
    pub focal_hint: f32,
    /// Cognitive-load UI collapse hint in [0, 1] — flow state hides the UI.
    pub ui_collapse_hint: f32,
    /// Prediction confidence in [0, 1] (low during a ballistic saccade).
    pub confidence: f32,
    /// Deterministic evidence fingerprint of this single prediction.
    pub fingerprint: u64,
}

impl GazePrediction {
    /// Fail-closed empty prediction (invalid gaze → never extrapolate garbage).
    pub fn invalid() -> Self {
        GazePrediction {
            valid: false,
            future_x: 0.0,
            future_y: 0.0,
            lookahead_ms: 0.0,
            phase: GazeIntentPhase::Fixation,
            focal_hint: 0.0,
            ui_collapse_hint: 0.0,
            confidence: 0.0,
            fingerprint: 0,
        }
    }

    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.future_x.is_finite()
            && self.future_y.is_finite()
            && self.lookahead_ms.is_finite()
            && self.focal_hint.is_finite()
            && self.ui_collapse_hint.is_finite()
            && self.confidence.is_finite()
    }
}

/// NaN/negative/overflow collapse to zero (fail-closed clamp to [0, 1]).
fn clamp01(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// Deterministically classify the gaze intent from saccade statistics.
///
/// - **Fixation**: speed ≤ `FIXATION_SPEED_MAX` and accel ≤ `FIXATION_ACCEL_MAX`.
/// - **Saccade**: speed ≥ `SACCADE_SPEED_MIN` or accel ≥ `SACCADE_ACCEL_MIN`
///   (ballistic jump — landing genuinely unknown).
/// - **Anticipation**: everything in between (smooth pursuit the system can
///   project forward).
pub fn classify_intent(s: &GazeSample) -> GazeIntentPhase {
    let speed = s.speed();
    let accel = s.accel();
    if speed <= FIXATION_SPEED_MAX && accel <= FIXATION_ACCEL_MAX {
        GazeIntentPhase::Fixation
    } else if speed >= SACCADE_SPEED_MIN || accel >= SACCADE_ACCEL_MIN {
        GazeIntentPhase::Saccade
    } else {
        GazeIntentPhase::Anticipation
    }
}

/// Cognitive-load UI collapse hint in [0, 1] — the **real** deterministic
/// replacement of the legacy `gaze_foveated_ui_collapse` theater (which only
/// held commented-out `println!` placeholders and no evidence).
///
/// Flow state (fixation, low dwell, high confidence) → high collapse (interface
/// fades toward invisible). Hesitation (high dwell) / ballistic saccade → low
/// collapse (semantic tools surface). Bounded, deterministic, fail-closed.
pub fn ui_collapse_hint(phase: GazeIntentPhase, dwell_ms: f32, confidence: f32) -> f32 {
    let base = match phase {
        GazeIntentPhase::Fixation => 0.9,
        GazeIntentPhase::Anticipation => 0.6,
        GazeIntentPhase::Saccade => 0.25,
    };
    let hesitation = clamp01(dwell_ms / HESITATION_MS);
    let conf_term = clamp01(0.5 + 0.5 * confidence);
    clamp01(base * (1.0 - 0.5 * hesitation) * conf_term)
}

/// Focal rendering hint in [0, 1], riding the real gt fovea-dominance evidence
/// (`fovea_mean`) and the local prediction confidence. Bounded, deterministic.
pub fn focal_hint(fovea_mean: f32, confidence: f32) -> f32 {
    clamp01(0.7 * clamp01(confidence) + 0.3 * clamp01(fovea_mean))
}

/// Deterministic per-prediction evidence fingerprint.
fn gaze_prediction_fingerprint(p: &GazePrediction) -> u64 {
    let mut h = GAZE_FP_SEED;
    h = hash_mix(h, p.valid as u64);
    h = hash_mix(h, quant_f32(p.future_x));
    h = hash_mix(h, quant_f32(p.future_y));
    h = hash_mix(h, quant_f32(p.lookahead_ms));
    h = hash_mix(h, p.phase.index() as u64);
    h = hash_mix(h, quant_f32(p.focal_hint));
    h = hash_mix(h, quant_f32(p.ui_collapse_hint));
    h = hash_mix(h, quant_f32(p.confidence));
    h ^ GAZE_FP_FOLD
}

/// Project the future focal point for one gaze sample.
///
/// - **Fail-closed**: any non-finite sample → `GazePrediction::invalid()` —
///   never extrapolate garbage.
/// - **Fixation**: the future point is the current point (look-ahead 0).
/// - **Anticipation**: parabolic projection `p + v·t + ½·a·t²` with
///   `t = 0.3s · clamp01(speed / ANTICIPATION_FULL_SPEED)` — always ≤ 300 ms.
/// - **Saccade**: the landing is genuinely unknown — keep the current point with
///   low confidence, do **not** extrapolate a ballistic jump.
pub fn predict(s: &GazeSample, fovea_mean: f32, dwell_ms: f32) -> GazePrediction {
    if !s.is_finite() || !fovea_mean.is_finite() || !dwell_ms.is_finite() {
        return GazePrediction::invalid();
    }
    let phase = classify_intent(s);
    let (future, lookahead_ms, confidence) = match phase {
        GazeIntentPhase::Fixation => ([s.px, s.py], 0.0, CONFIDENCE_FIXATION),
        GazeIntentPhase::Anticipation => {
            let t = GAZE_LOOKAHEAD_S * clamp01(s.speed() / ANTICIPATION_FULL_SPEED);
            let fx = s.px + s.vx * t + 0.5 * s.ax * t * t;
            let fy = s.py + s.vy * t + 0.5 * s.ay * t * t;
            ([clamp01(fx), clamp01(fy)], t * 1000.0, CONFIDENCE_ANTICIPATION)
        }
        GazeIntentPhase::Saccade => ([s.px, s.py], 0.0, CONFIDENCE_SACCADE),
    };
    let confidence = clamp01(confidence);
    let focal = focal_hint(fovea_mean, confidence);
    let collapse = ui_collapse_hint(phase, dwell_ms, confidence);
    let mut p = GazePrediction {
        valid: true,
        future_x: future[0],
        future_y: future[1],
        lookahead_ms: clamp01(lookahead_ms / GAZE_LOOKAHEAD_MS) * GAZE_LOOKAHEAD_MS,
        phase,
        focal_hint: focal,
        ui_collapse_hint: collapse,
        confidence,
        fingerprint: 0,
    };
    p.fingerprint = gaze_prediction_fingerprint(&p);
    p
}

// ---------------------------------------------------------------------------
// Measured pass.
// ---------------------------------------------------------------------------

struct GazeIntentAnticipationMeasured {
    lookahead_bounded: bool,
    static_gaze_identity: bool,
    velocity_advances_focal_point: bool,
    saccade_classified_not_fixation: bool,
    saccade_fail_closed: bool,
    fail_closed_on_invalid: bool,
    prediction_finite: bool,
    prediction_bounded: bool,
    focal_hint_in_unit: bool,
    ui_collapse_in_unit: bool,
    deterministic_replay: bool,
    substrate_ready: bool,
    fovea_mean: f32,
    periph_mean: f32,
    temporal_blend_uses_motion: bool,
    future_x: f32,
    future_y: f32,
    lookahead_ms: f32,
    phase_index: u32,
    focal_hint: f32,
    ui_collapse_hint: f32,
    confidence: f32,
    hot_loop_peak_focal: f32,
    zero_alloc: bool,
    elapsed_micros: f32,
}

/// Deterministic evidence fingerprint over every non-clock invariant.
fn gaze_intent_anticipation_evidence_fingerprint(m: &GazeIntentAnticipationMeasured) -> u64 {
    let mut h = GAZE_FP_SEED;
    h = hash_mix(h, m.lookahead_bounded as u64);
    h = hash_mix(h, m.static_gaze_identity as u64);
    h = hash_mix(h, m.velocity_advances_focal_point as u64);
    h = hash_mix(h, m.saccade_classified_not_fixation as u64);
    h = hash_mix(h, m.saccade_fail_closed as u64);
    h = hash_mix(h, m.fail_closed_on_invalid as u64);
    h = hash_mix(h, m.prediction_finite as u64);
    h = hash_mix(h, m.prediction_bounded as u64);
    h = hash_mix(h, m.focal_hint_in_unit as u64);
    h = hash_mix(h, m.ui_collapse_in_unit as u64);
    h = hash_mix(h, m.deterministic_replay as u64);
    h = hash_mix(h, m.substrate_ready as u64);
    h = hash_mix(h, quant_f32(m.fovea_mean));
    h = hash_mix(h, quant_f32(m.periph_mean));
    h = hash_mix(h, m.temporal_blend_uses_motion as u64);
    h = hash_mix(h, quant_f32(m.future_x));
    h = hash_mix(h, quant_f32(m.future_y));
    h = hash_mix(h, quant_f32(m.lookahead_ms));
    h = hash_mix(h, m.phase_index as u64);
    h = hash_mix(h, quant_f32(m.focal_hint));
    h = hash_mix(h, quant_f32(m.ui_collapse_hint));
    h = hash_mix(h, quant_f32(m.confidence));
    h = hash_mix(h, quant_f32(m.hot_loop_peak_focal));
    h = hash_mix(h, m.zero_alloc as u64);
    h ^ GAZE_FP_FOLD
}

/// Honest readiness: every anticipation invariant and the deterministic replay
/// must hold, and the real gt substrate must be ready with fovea dominance.
fn readiness(m: &GazeIntentAnticipationMeasured) -> bool {
    m.lookahead_bounded
        && m.static_gaze_identity
        && m.velocity_advances_focal_point
        && m.saccade_classified_not_fixation
        && m.saccade_fail_closed
        && m.fail_closed_on_invalid
        && m.prediction_finite
        && m.prediction_bounded
        && m.focal_hint_in_unit
        && m.ui_collapse_in_unit
        && m.deterministic_replay
        && m.substrate_ready
        && m.fovea_mean.is_finite()
        && m.periph_mean.is_finite()
        && m.lookahead_ms <= GAZE_LOOKAHEAD_MS
        && m.confidence.is_finite()
        && (0.0..=1.0).contains(&m.confidence)
}

/// Zero-alloc hot-loop probe: fills a preallocated prediction history twice
/// with `keep_capacity`, snapshots must be bit-identical and the capacity
/// untouched.
fn zero_alloc_hot_loop_probe() -> bool {
    let mut preds: Vec<GazePrediction> = Vec::with_capacity(GAZE_STEPS as usize);
    let cap_before = preds.capacity();
    for step in 0..GAZE_STEPS {
        let s = GazeSample {
            px: 0.2 + 0.01 * step as f32,
            py: 0.5,
            vx: 1.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        preds.push(predict(&s, 0.9, 0.0));
    }
    let snap = preds.clone();
    preds.clear();
    for step in 0..GAZE_STEPS {
        let s = GazeSample {
            px: 0.2 + 0.01 * step as f32,
            py: 0.5,
            vx: 1.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        preds.push(predict(&s, 0.9, 0.0));
    }
    preds.capacity() == cap_before
        && preds.len() == GAZE_STEPS as usize
        && preds == snap
}

/// Runs the full measured pass: composes the real gt substrate soak, verifies
/// every anticipation invariant on controlled fixtures, and probes the
/// zero-alloc hot loop.
fn run_measured_pass() -> GazeIntentAnticipationMeasured {
    let gt = run_gaze_foveated_reprojection_soak();
    let substrate_ready = gt.gaze_foveated_reprojection_ready && gt.fovea_higher_than_periph;
    let fovea_mean = gt.fovea_mean;
    let periph_mean = gt.periph_mean;
    let temporal_blend_uses_motion = gt.temporal_blend_uses_motion;

    // Static gaze → prediction is the same point (fixation).
    let static_sample = GazeSample {
        px: 0.5,
        py: 0.5,
        vx: 0.0,
        vy: 0.0,
        ax: 0.0,
        ay: 0.0,
    };
    let sp = predict(&static_sample, fovea_mean, 0.0);
    let static_gaze_identity = sp.valid && sp.future_x == 0.5 && sp.future_y == 0.5;

    // Gaze with velocity → focal point advances in the direction.
    let moving = GazeSample {
        px: 0.4,
        py: 0.5,
        vx: 1.0,
        vy: 0.0,
        ax: 0.0,
        ay: 0.0,
    };
    let mp = predict(&moving, fovea_mean, 0.0);
    let velocity_advances_focal_point = mp.valid && mp.future_x > 0.4;

    // Sustained saccade-velocity statistics → classified as anticipation.
    let pursuing = GazeSample {
        px: 0.5,
        py: 0.5,
        vx: 8.0,
        vy: 0.0,
        ax: 0.0,
        ay: 0.0,
    };
    let pp = predict(&pursuing, fovea_mean, 0.0);
    let saccade_classified_not_fixation = pp.valid && pp.phase != GazeIntentPhase::Fixation;

    // Ballistic saccade → low confidence, never extrapolated.
    let ballistic = GazeSample {
        px: 0.5,
        py: 0.5,
        vx: 30.0,
        vy: 0.0,
        ax: 500.0,
        ay: 0.0,
    };
    let bp = predict(&ballistic, fovea_mean, 0.0);
    let saccade_fail_closed =
        bp.valid && bp.phase == GazeIntentPhase::Saccade && bp.confidence < 0.5;

    // Fail-closed: non-finite gaze → no prediction.
    let invalid = GazeSample {
        px: f32::NAN,
        py: 0.5,
        vx: 0.0,
        vy: 0.0,
        ax: 0.0,
        ay: 0.0,
    };
    let ip = predict(&invalid, fovea_mean, 0.0);
    let fail_closed_on_invalid = !ip.valid;

    // Look-ahead is always bounded by 300 ms.
    let lookahead_bounded = sp.lookahead_ms <= GAZE_LOOKAHEAD_MS
        && mp.lookahead_ms <= GAZE_LOOKAHEAD_MS
        && pp.lookahead_ms <= GAZE_LOOKAHEAD_MS
        && bp.lookahead_ms <= GAZE_LOOKAHEAD_MS;

    let predictions = [&sp, &mp, &pp, &bp];
    let prediction_finite = predictions.iter().all(|p| p.is_finite());
    let prediction_bounded = predictions
        .iter()
        .all(|p| (0.0..=1.0).contains(&p.future_x) && (0.0..=1.0).contains(&p.future_y));
    let focal_hint_in_unit = predictions
        .iter()
        .all(|p| (0.0..=1.0).contains(&p.focal_hint));
    let ui_collapse_in_unit = predictions
        .iter()
        .all(|p| (0.0..=1.0).contains(&p.ui_collapse_hint));

    // Deterministic replay: same inputs → bit-identical prediction.
    let d1 = predict(&moving, fovea_mean, 0.0);
    let d2 = predict(&moving, fovea_mean, 0.0);
    let deterministic_replay = d1 == d2;

    // Representative anticipation prediction for the report.
    let representative = predict(&pursuing, fovea_mean, 0.0);

    let t0 = Instant::now();
    let mut peak_focal = 0.0f32;
    for step in 0..GAZE_STEPS {
        let s = GazeSample {
            px: 0.3 + 0.01 * step as f32,
            py: 0.5,
            vx: 1.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        let p = predict(&s, fovea_mean, 0.0);
        if p.focal_hint > peak_focal {
            peak_focal = p.focal_hint;
        }
    }
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1e6;
    let zero_alloc = zero_alloc_hot_loop_probe();

    GazeIntentAnticipationMeasured {
        lookahead_bounded,
        static_gaze_identity,
        velocity_advances_focal_point,
        saccade_classified_not_fixation,
        saccade_fail_closed,
        fail_closed_on_invalid,
        prediction_finite,
        prediction_bounded,
        focal_hint_in_unit,
        ui_collapse_in_unit,
        deterministic_replay,
        substrate_ready,
        fovea_mean,
        periph_mean,
        temporal_blend_uses_motion,
        future_x: representative.future_x,
        future_y: representative.future_y,
        lookahead_ms: representative.lookahead_ms,
        phase_index: representative.phase.index() as u32,
        focal_hint: representative.focal_hint,
        ui_collapse_hint: representative.ui_collapse_hint,
        confidence: representative.confidence,
        hot_loop_peak_focal: peak_focal,
        zero_alloc,
        elapsed_micros,
    }
}

// ---------------------------------------------------------------------------
// Public soak report.
// ---------------------------------------------------------------------------

/// Wire-facing gaze & intent anticipation report (serde camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GazeIntentAnticipationReport {
    /// Soak-gated; every anticipation invariant + deterministic replay must hold.
    pub ready: bool,
    /// Double-pass bit-identical fingerprints.
    pub deterministic: bool,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    pub lookahead_bounded: bool,
    pub static_gaze_identity: bool,
    pub velocity_advances_focal_point: bool,
    pub saccade_classified_not_fixation: bool,
    pub saccade_fail_closed: bool,
    pub fail_closed_on_invalid: bool,
    pub prediction_finite: bool,
    pub prediction_bounded: bool,
    pub focal_hint_in_unit: bool,
    pub ui_collapse_in_unit: bool,
    pub deterministic_replay: bool,
    /// Real gt substrate: reprojection soak ready + fovea dominates periph.
    pub substrate_ready: bool,
    pub fovea_mean: f32,
    pub periph_mean: f32,
    pub fovea_dominates_periph: bool,
    pub temporal_blend_uses_motion: bool,
    /// Representative anticipation prediction (sustained pursuit).
    pub future_x: f32,
    pub future_y: f32,
    pub lookahead_ms: f32,
    pub phase_index: u32,
    pub phase_tag: &'static str,
    pub focal_hint: f32,
    pub ui_collapse_hint: f32,
    pub confidence: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
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
    /// Fail-closed — no live gaze-anticipation / intent / focal AAA.
    pub gaze_anticipation_aaa_ready: bool,
    pub intent_classification_aaa_ready: bool,
    pub focal_hint_aaa_ready: bool,
    pub ui_collapse_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl GazeIntentAnticipationReport {
    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.fovea_mean.is_finite()
            && self.periph_mean.is_finite()
            && self.future_x.is_finite()
            && self.future_y.is_finite()
            && self.lookahead_ms.is_finite()
            && self.focal_hint.is_finite()
            && self.ui_collapse_hint.is_finite()
            && self.confidence.is_finite()
            && self.measured_pass_micros.is_finite()
    }
}

/// Assembles the public report, fetching every sibling evidence fingerprint to
/// prove this kernel is distinct from the whole reachable peer set (29 peers).
fn report_from_measured(
    m: &GazeIntentAnticipationMeasured,
    deterministic: bool,
) -> GazeIntentAnticipationReport {
    let ready = readiness(m);
    let fp = gaze_intent_anticipation_evidence_fingerprint(m);
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

    GazeIntentAnticipationReport {
        ready,
        deterministic,
        evidence_kind: GAZE_EVIDENCE_KIND,
        lookahead_bounded: m.lookahead_bounded,
        static_gaze_identity: m.static_gaze_identity,
        velocity_advances_focal_point: m.velocity_advances_focal_point,
        saccade_classified_not_fixation: m.saccade_classified_not_fixation,
        saccade_fail_closed: m.saccade_fail_closed,
        fail_closed_on_invalid: m.fail_closed_on_invalid,
        prediction_finite: m.prediction_finite,
        prediction_bounded: m.prediction_bounded,
        focal_hint_in_unit: m.focal_hint_in_unit,
        ui_collapse_in_unit: m.ui_collapse_in_unit,
        deterministic_replay: m.deterministic_replay,
        substrate_ready: m.substrate_ready,
        fovea_mean: m.fovea_mean,
        periph_mean: m.periph_mean,
        fovea_dominates_periph: m.fovea_mean > m.periph_mean,
        temporal_blend_uses_motion: m.temporal_blend_uses_motion,
        future_x: m.future_x,
        future_y: m.future_y,
        lookahead_ms: m.lookahead_ms,
        phase_index: m.phase_index,
        phase_tag: GazeIntentPhase::ALL[m.phase_index as usize].tag(),
        focal_hint: m.focal_hint,
        ui_collapse_hint: m.ui_collapse_hint,
        confidence: m.confidence,
        zero_alloc_hot_loop: m.zero_alloc,
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
        gaze_anticipation_aaa_ready: false,
        intent_classification_aaa_ready: false,
        focal_hint_aaa_ready: false,
        ui_collapse_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
pub fn run_gaze_intent_anticipation_soak() -> GazeIntentAnticipationReport {
    let a = run_measured_pass();
    let b = run_measured_pass();
    let deterministic = gaze_intent_anticipation_evidence_fingerprint(&a)
        == gaze_intent_anticipation_evidence_fingerprint(&b);
    report_from_measured(&a, deterministic)
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_gaze_intent_anticipation() -> GazeIntentAnticipationReport {
    run_gaze_intent_anticipation_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite (doctrine #3 — mandatory, mathematical invariants).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookahead_is_bounded_by_300ms() {
        let samples = [
            GazeSample {
                px: 0.5,
                py: 0.5,
                vx: 0.0,
                vy: 0.0,
                ax: 0.0,
                ay: 0.0,
            },
            GazeSample {
                px: 0.4,
                py: 0.5,
                vx: 1.0,
                vy: 0.0,
                ax: 0.0,
                ay: 0.0,
            },
            GazeSample {
                px: 0.5,
                py: 0.5,
                vx: 8.0,
                vy: 0.0,
                ax: 0.0,
                ay: 0.0,
            },
            GazeSample {
                px: 0.5,
                py: 0.5,
                vx: 30.0,
                vy: 0.0,
                ax: 500.0,
                ay: 0.0,
            },
        ];
        for s in samples.iter() {
            let p = predict(s, 0.9, 0.0);
            assert!(p.valid);
            assert!(p.lookahead_ms <= GAZE_LOOKAHEAD_MS, "look-ahead must never exceed 300 ms");
        }
    }

    #[test]
    fn static_gaze_predicts_same_point() {
        let s = GazeSample::ZERO;
        let p = predict(&s, 0.9, 0.0);
        assert!(p.valid);
        assert_eq!(p.phase, GazeIntentPhase::Fixation);
        assert_eq!(p.future_x, s.px);
        assert_eq!(p.future_y, s.py);
        assert_eq!(p.lookahead_ms, 0.0);
    }

    #[test]
    fn velocity_advances_focal_point_in_direction() {
        let s = GazeSample {
            px: 0.4,
            py: 0.5,
            vx: 1.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        let p = predict(&s, 0.9, 0.0);
        assert!(p.valid);
        assert!(p.future_x > s.px, "focal point must advance along the velocity");
        assert_eq!(p.phase, GazeIntentPhase::Anticipation);
    }

    #[test]
    fn sustained_velocity_classifies_anticipation() {
        let s = GazeSample {
            px: 0.5,
            py: 0.5,
            vx: 8.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        let p = predict(&s, 0.9, 0.0);
        assert_eq!(p.phase, GazeIntentPhase::Anticipation);
        assert!(p.confidence > 0.5);
    }

    #[test]
    fn ballistic_saccade_is_low_confidence_and_not_extrapolated() {
        let s = GazeSample {
            px: 0.5,
            py: 0.5,
            vx: 30.0,
            vy: 0.0,
            ax: 500.0,
            ay: 0.0,
        };
        let p = predict(&s, 0.9, 0.0);
        assert_eq!(p.phase, GazeIntentPhase::Saccade);
        assert!(p.confidence < 0.5, "saccade landing is genuinely unknown");
        // The ballistic jump is never extrapolated into garbage.
        assert_eq!(p.future_x, s.px);
        assert_eq!(p.lookahead_ms, 0.0);
    }

    #[test]
    fn invalid_gaze_is_fail_closed_no_prediction() {
        let bad = [
            GazeSample {
                px: f32::NAN,
                py: 0.5,
                vx: 0.0,
                vy: 0.0,
                ax: 0.0,
                ay: 0.0,
            },
            GazeSample {
                px: 0.5,
                py: 0.5,
                vx: f32::INFINITY,
                vy: 0.0,
                ax: 0.0,
                ay: 0.0,
            },
            GazeSample {
                px: 0.5,
                py: 0.5,
                vx: 0.0,
                vy: 0.0,
                ax: f32::NEG_INFINITY,
                ay: 0.0,
            },
        ];
        for s in bad.iter() {
            let p = predict(s, 0.9, 0.0);
            assert!(!p.valid, "invalid gaze must never produce a prediction");
            assert_eq!(p.fingerprint, 0);
        }
        // Non-finite substrate inputs are also fail-closed.
        assert!(!predict(&GazeSample::ZERO, f32::NAN, 0.0).valid);
        assert!(!predict(&GazeSample::ZERO, 0.9, f32::INFINITY).valid);
    }

    #[test]
    fn prediction_is_finite_and_bounded_in_unit() {
        let s = GazeSample {
            px: 0.5,
            py: 0.5,
            vx: 8.0,
            vy: 0.0,
            ax: 100.0,
            ay: 0.0,
        };
        let p = predict(&s, 0.9, 0.0);
        assert!(p.is_finite());
        assert!((0.0..=1.0).contains(&p.future_x));
        assert!((0.0..=1.0).contains(&p.future_y));
        assert!((0.0..=1.0).contains(&p.focal_hint));
        assert!((0.0..=1.0).contains(&p.ui_collapse_hint));
        assert!((0.0..=1.0).contains(&p.confidence));
    }

    #[test]
    fn focal_hint_rises_with_fovea_dominance() {
        let s = GazeSample::ZERO;
        let weak = predict(&s, 0.1, 0.0);
        let strong = predict(&s, 0.9, 0.0);
        assert!(strong.focal_hint > weak.focal_hint);
        assert!((0.0..=1.0).contains(&strong.focal_hint));
    }

    #[test]
    fn ui_collapse_hint_is_bounded_and_hesitation_aware() {
        let s = GazeSample::ZERO;
        let calm = predict(&s, 0.9, 0.0);
        let hesitant = predict(&s, 0.9, 2500.0);
        assert!((0.0..=1.0).contains(&calm.ui_collapse_hint));
        assert!(hesitant.ui_collapse_hint < calm.ui_collapse_hint);
    }

    #[test]
    fn flow_state_hides_ui_hesitation_surfaces_tools() {
        let s = GazeSample::ZERO;
        let flow = predict(&s, 0.9, 0.0);
        assert!(
            flow.ui_collapse_hint > 0.7,
            "flow state must collapse the interface toward invisible"
        );
        let hesitated = predict(&s, 0.9, 2000.0);
        assert!(hesitated.ui_collapse_hint < flow.ui_collapse_hint);
        // A ballistic saccade keeps the UI visible (semantic tools surface).
        let jump = GazeSample {
            px: 0.5,
            py: 0.5,
            vx: 30.0,
            vy: 0.0,
            ax: 500.0,
            ay: 0.0,
        };
        let jp = predict(&jump, 0.9, 0.0);
        assert!(jp.ui_collapse_hint < flow.ui_collapse_hint);
    }

    #[test]
    fn phase_metadata_is_stable_and_ordered() {
        assert_eq!(GazeIntentPhase::ALL.len(), 3);
        assert_eq!(GazeIntentPhase::Fixation.index(), 0);
        assert_eq!(GazeIntentPhase::Saccade.index(), 1);
        assert_eq!(GazeIntentPhase::Anticipation.index(), 2);
        assert_eq!(GazeIntentPhase::Fixation.tag(), "fixation");
        assert_eq!(GazeIntentPhase::Saccade.tag(), "saccade");
        assert_eq!(GazeIntentPhase::Anticipation.tag(), "anticipation");
    }

    #[test]
    fn deterministic_replay_is_bit_identical() {
        let s = GazeSample {
            px: 0.4,
            py: 0.5,
            vx: 1.0,
            vy: 0.0,
            ax: 0.0,
            ay: 0.0,
        };
        let a = predict(&s, 0.9, 0.0);
        let b = predict(&s, 0.9, 0.0);
        assert_eq!(a, b);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn zero_alloc_hot_loop_keep_capacity() {
        assert!(zero_alloc_hot_loop_probe());
    }

    #[test]
    fn gt_substrate_soak_is_ready_and_fovea_dominates() {
        let gt = run_gaze_foveated_reprojection_soak();
        assert!(gt.gaze_foveated_reprojection_ready);
        assert!(gt.fovea_higher_than_periph);
        assert!(gt.fovea_mean > gt.periph_mean);
        assert!(gt.deterministic);
        assert!(gt.temporal_blend_uses_motion);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_gaze_intent_anticipation_soak();
        assert!(r.ready, "soak must be ready");
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(r.lookahead_bounded);
        assert!(r.static_gaze_identity);
        assert!(r.velocity_advances_focal_point);
        assert!(r.saccade_classified_not_fixation);
        assert!(r.saccade_fail_closed);
        assert!(r.fail_closed_on_invalid);
        assert!(r.prediction_finite);
        assert!(r.prediction_bounded);
        assert!(r.focal_hint_in_unit);
        assert!(r.ui_collapse_in_unit);
        assert!(r.deterministic_replay);
        assert!(r.substrate_ready);
        assert!(r.fovea_dominates_periph);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.lookahead_ms <= GAZE_LOOKAHEAD_MS);
        assert_eq!(r.evidence_kind, GAZE_EVIDENCE_KIND);
        // AAA is never claimed by the kernel itself.
        assert!(!r.gaze_anticipation_aaa_ready);
        assert!(!r.intent_classification_aaa_ready);
        assert!(!r.focal_hint_aaa_ready);
        assert!(!r.ui_collapse_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_gaze_intent_anticipation_soak();
        assert_eq!(r.evidence_kind, GAZE_EVIDENCE_KIND);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_gaze_intent_anticipation_soak();
        let b = run_gaze_intent_anticipation_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.future_x, b.future_x);
        assert_eq!(a.future_y, b.future_y);
        assert_eq!(a.focal_hint, b.focal_hint);
        assert_eq!(a.ui_collapse_hint, b.ui_collapse_hint);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_gaze_intent_anticipation();
        let s = run_gaze_intent_anticipation_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_gaze_intent_anticipation_soak();
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
    }

    #[test]
    fn kernel_constants_are_stable() {
        assert_ne!(GAZE_SOAK_SEED, 0);
        assert_ne!(GAZE_FP_SEED, 0);
        assert_ne!(GAZE_FP_FOLD, 0);
        assert_eq!(GAZE_EVIDENCE_KIND, "lh_gaze_intent_anticipation");
        const _: () = assert!(GAZE_LOOKAHEAD_MS > 0.0);
        const _: () = assert!(GAZE_LOOKAHEAD_MS <= 300.0);
        const _: () = assert!(FIXATION_SPEED_MAX < SACCADE_SPEED_MIN);
        const _: () = assert!(FIXATION_ACCEL_MAX < SACCADE_ACCEL_MIN);
        // The fp seed carries the letter tag (0x6C68 = "lh").
        assert_eq!(GAZE_FP_SEED >> 48, 0x6C68);
    }
}

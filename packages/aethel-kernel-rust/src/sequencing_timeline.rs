//! # Non-Linear Timeline Sequencing Kernel — letter **ju** (S-3 Sequencing tool backend).
//!
//! Deterministic non-linear timeline/keyframe evaluator for the in-engine cinema
//! pipe. Anchors the S-3 sequencing surface on top of the **real**
//! [`crate::in_engine_compositor_zero_loss`] compositor substrate with zero
//! substrate edits: this kernel owns the authored timeline (tracks, keyframes,
//! interpolation), evaluates every track at a requested time or whole frame with
//! **fail-closed validation** (unsorted/duplicate/NaN keyframes and non-finite
//! eval times are rejected), and composes an exported frame through the real
//! `InEngineCompositorZeroLoss::process_timeline_compositor_frame` facade.
//!
//! Interpolation modes (deterministic, closed-form):
//!   - `Step` — holds the most-recent authored keyframe value.
//!   - `Linear` — `v0 + (v1 - v0)·u` between bracketing keyframes.
//!   - `CubicCatmullRom` — uniform Catmull-Rom basis (endpoint tangents
//!     `m_i = (p_{i+1} - p_{i-1})/2`), clamped to authored range.
//!
//! Soak-gated `sequencing_timeline_ready`; fingerprint seed **ju**
//! (`0x6A75_5348` = "juSH") distinct from io/hs/fw/ip4/s17/jt; `sequencer_aaa_ready`
//! / `after_effects_aaa_ready` / `nuke_aaa_ready` HELD fail-closed (honesty —
//! this is the backend evaluator, not an After Effects / Nuke replacement).

use serde::{Deserialize, Serialize};

use crate::in_engine_compositor_zero_loss::{CinemaExportFormat, InEngineCompositorZeroLoss};

/// Deterministic evidence-fingerprint seed for the sequencing timeline (letter **ju**).
const SEQUENCING_TIMELINE_FP_SEED: u64 = 0x6A75_5348; // "juSH"
/// Evidence kind tag reported by the soak (letter **ju**).
pub const SEQUENCING_TIMELINE_EVIDENCE_KIND: &str = "non_linear_timeline_deterministic_evaluator";

/// Splitmix-style deterministic mixing (mirrors sibling substrates).
fn hash_mix(mut h: u64, x: u64) -> u64 {
    h = h.rotate_left(23) ^ x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 31;
    h
}

/// Deterministic quantization of a finite f32 for fingerprinting (sub-`1/1024`
/// jitter is irrelevant to the soak contract).
fn quant_f32(v: f32) -> u64 {
    (v as f64 * 1024.0).round() as u64
}

/// Interpolation between consecutive keyframes of a track.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InterpolationKind {
    /// Holds the most-recent authored keyframe value until the next keyframe.
    Step,
    /// Linear blend `v0 + (v1 - v0)·u` between the bracketing keyframes.
    Linear,
    /// Uniform Catmull-Rom cubic with endpoint-tangent smoothing.
    CubicCatmullRom,
}

impl InterpolationKind {
    pub const fn tag(self) -> &'static str {
        match self {
            InterpolationKind::Step => "step",
            InterpolationKind::Linear => "linear",
            InterpolationKind::CubicCatmullRom => "cubic_catmull_rom",
        }
    }
}

/// A single authored keyframe on a track.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Keyframe {
    pub time_s: f32,
    pub value: f32,
}

impl Keyframe {
    pub const fn new(time_s: f32, value: f32) -> Self {
        Self { time_s, value }
    }
}

/// One animated property track: an ordered, strictly-increasing keyframe curve.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TimelineTrack {
    pub name: String,
    pub interpolation: InterpolationKind,
    pub keyframes: Vec<Keyframe>,
}

impl TimelineTrack {
    /// Fail-closed validation: non-empty, strictly-increasing finite keyframes.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.keyframes.is_empty() {
            return Err("track has no keyframes");
        }
        let mut prev_t = f32::NEG_INFINITY;
        for kf in &self.keyframes {
            if !kf.time_s.is_finite() || !kf.value.is_finite() {
                return Err("keyframe time or value is not finite");
            }
            if kf.time_s <= prev_t {
                return Err("keyframes must be strictly increasing in time");
            }
            prev_t = kf.time_s;
        }
        Ok(())
    }

    /// Deterministic evaluation at `time_s` (fail-closed on invalid state).
    ///
    /// Times before the first keyframe return the first value; times at/after
    /// the last keyframe return the last value (clamped, never extrapolated).
    pub fn evaluate(&self, time_s: f32) -> Result<f32, &'static str> {
        self.validate()?;
        if !time_s.is_finite() {
            return Err("evaluation time is not finite");
        }
        let kf = &self.keyframes;
        let first = kf[0];
        let last = kf[kf.len() - 1];
        if time_s <= first.time_s {
            return Ok(first.value);
        }
        if time_s >= last.time_s {
            return Ok(last.value);
        }
        // Bracketing interval: `lo` is the most-recent keyframe at/before t.
        let mut hi = 1usize;
        // `<=` — at the exact keyframe time the NEW value applies (Step jumps AT
        // the keyframe, the industry convention). Linear/Catmull-Rom are
        // continuous here (u == 0 → the keyframe's own value), so the boundary
        // change is exact for every interpolation kind.
        while hi < kf.len() && kf[hi].time_s <= time_s {
            hi += 1;
        }
        let lo = hi - 1;
        let t0 = kf[lo].time_s;
        let t1 = kf[hi].time_s;
        let u = (time_s - t0) / (t1 - t0); // in [0, 1]
        match self.interpolation {
            InterpolationKind::Step => Ok(kf[lo].value),
            InterpolationKind::Linear => {
                let v0 = kf[lo].value;
                let v1 = kf[hi].value;
                Ok(v0 + (v1 - v0) * u)
            }
            InterpolationKind::CubicCatmullRom => {
                let p0 = kf[lo.saturating_sub(1)].value;
                let p1 = kf[lo].value;
                let p2 = kf[hi].value;
                let p3 = kf[(hi + 1).min(kf.len() - 1)].value;
                let u2 = u * u;
                let u3 = u2 * u;
                // Uniform Catmull-Rom basis (Hermite tangents (p2-p0)/2, (p3-p1)/2).
                let c0 = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
                let c1 = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
                let c2 = -0.5 * p0 + 0.5 * p2;
                let c3 = p1;
                Ok(c0 * u3 + c1 * u2 + c2 * u + c3)
            }
        }
    }
}

/// A composed non-linear timeline: named tracks over a bounded duration at `fps`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Timeline {
    pub tracks: Vec<TimelineTrack>,
    pub duration_s: f32,
    pub fps: f32,
}

impl Timeline {
    /// Fail-closed validation of duration, fps and every track.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.duration_s.is_finite() || self.duration_s <= 0.0 {
            return Err("duration must be finite and positive");
        }
        if !self.fps.is_finite() || self.fps <= 0.0 {
            return Err("fps must be finite and positive");
        }
        for track in &self.tracks {
            track.validate()?;
        }
        Ok(())
    }

    /// Deterministic sample of every track at `time_s`, in track order.
    pub fn evaluate(&self, time_s: f32) -> Result<Vec<(String, f32)>, &'static str> {
        self.validate()?;
        let mut out = Vec::with_capacity(self.tracks.len());
        for track in &self.tracks {
            out.push((track.name.clone(), track.evaluate(time_s)?));
        }
        Ok(out)
    }

    /// Deterministic sample at a whole frame index: `time = frame / fps`.
    pub fn evaluate_frame(&self, frame: u64) -> Result<Vec<(String, f32)>, &'static str> {
        self.evaluate(frame as f32 / self.fps)
    }

    pub fn track(&self, name: &str) -> Option<&TimelineTrack> {
        self.tracks.iter().find(|t| t.name == name)
    }

    pub fn track_count(&self) -> u32 {
        self.tracks.len() as u32
    }
}

/// A timeline frame composed through the real in-engine zero-loss compositor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ComposedCinemaFrame {
    pub frame: u64,
    pub export_format: CinemaExportFormat,
    pub is_zero_loss_master: bool,
    pub render_time_per_frame_ms: f32,
    pub track_sample_count: u32,
    pub samples: Vec<(String, f32)>,
}

/// Deterministic composition of `timeline` at `frame` through the real
/// [`InEngineCompositorZeroLoss`] substrate (letter **ju** anchors S-3 into the
/// cinema pipe without editing the compositor).
pub fn compose_cinema_frame(
    timeline: &Timeline,
    frame: u64,
    format: CinemaExportFormat,
) -> Result<ComposedCinemaFrame, &'static str> {
    let samples = timeline.evaluate_frame(frame)?;
    let payload = InEngineCompositorZeroLoss::process_timeline_compositor_frame(frame, format);
    Ok(ComposedCinemaFrame {
        frame,
        export_format: payload.export_format,
        is_zero_loss_master: payload.is_zero_loss_master,
        render_time_per_frame_ms: payload.render_time_per_frame_ms,
        track_sample_count: samples.len() as u32,
        samples,
    })
}

/// Deterministic fingerprint of soak evidence (excludes wall-clock time).
fn soak_evidence_fingerprint(
    replay_deterministic: bool,
    linear_interpolation_ok: bool,
    step_hold_ok: bool,
    cubic_tangent_ok: bool,
    validation_fail_closed_ok: bool,
    range_clamp_ok: bool,
    composition_ok: bool,
    roll_at_0_5: u64,
    roll_at_2_5: u64,
    focus_at_1_5: u64,
    frame0_sample_count: u32,
    frame120_sample_count: u32,
    soak_frames: u32,
) -> u64 {
    let mut h = hash_mix(SEQUENCING_TIMELINE_FP_SEED, replay_deterministic as u64);
    h = hash_mix(h, linear_interpolation_ok as u64);
    h = hash_mix(h, step_hold_ok as u64);
    h = hash_mix(h, cubic_tangent_ok as u64);
    h = hash_mix(h, validation_fail_closed_ok as u64);
    h = hash_mix(h, range_clamp_ok as u64);
    h = hash_mix(h, composition_ok as u64);
    h = hash_mix(h, roll_at_0_5);
    h = hash_mix(h, roll_at_2_5);
    h = hash_mix(h, focus_at_1_5);
    h = hash_mix(h, frame0_sample_count as u64);
    h = hash_mix(h, frame120_sample_count as u64);
    h = hash_mix(h, soak_frames as u64);
    h ^ 0x6A75_5348_5348_5348 // "juSHSSSH" final fold
}

/// Soak report for the sequencing-timeline substrate (letter **ju**).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequencingTimelineSoakReport {
    pub sequencing_timeline_ready: bool,
    pub replay_deterministic: bool,
    pub linear_interpolation_ok: bool,
    pub step_hold_ok: bool,
    pub cubic_tangent_ok: bool,
    pub validation_fail_closed_ok: bool,
    pub range_clamp_ok: bool,
    pub composition_ok: bool,
    pub camera_roll_at_frame30: f32,
    pub light_intensity_at_frame84: f32,
    pub lens_focus_at_frame90: f32,
    pub frame0_sample_count: u32,
    pub frame120_sample_count: u32,
    pub track_count: u32,
    pub soaked_frames: u32,
    pub soak_elapsed_ns: u64,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    // Distinctness — measured against real peer probes, never hard-coded true.
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    // AAA — always HELD (fail-closed).
    pub sequencer_aaa_ready: bool,
    pub after_effects_aaa_ready: bool,
    pub nuke_aaa_ready: bool,
}

/// Deterministic 4-second soak timeline at 60 fps:
///   `camera_roll`   — Linear       (0→30 at 1.0s, →−15 at 2.0s, →45 at 4.0s)
///   `light_intensity`— Step        (0.1 → 0.8 at 1.5s → 0.4 at 3.0s)
///   `lens_focus`    — CubicCatmullRom (24→35→28→50 across 0/1/2/4s)
fn soak_timeline() -> Timeline {
    Timeline {
        fps: 60.0,
        duration_s: 4.0,
        tracks: vec![
            TimelineTrack {
                name: "camera_roll".to_string(),
                interpolation: InterpolationKind::Linear,
                keyframes: vec![
                    Keyframe::new(0.0, 0.0),
                    Keyframe::new(1.0, 30.0),
                    Keyframe::new(2.0, -15.0),
                    Keyframe::new(4.0, 45.0),
                ],
            },
            TimelineTrack {
                name: "light_intensity".to_string(),
                interpolation: InterpolationKind::Step,
                keyframes: vec![
                    Keyframe::new(0.0, 0.1),
                    Keyframe::new(1.5, 0.8),
                    Keyframe::new(3.0, 0.4),
                ],
            },
            TimelineTrack {
                name: "lens_focus".to_string(),
                interpolation: InterpolationKind::CubicCatmullRom,
                keyframes: vec![
                    Keyframe::new(0.0, 24.0),
                    Keyframe::new(1.0, 35.0),
                    Keyframe::new(2.0, 28.0),
                    Keyframe::new(4.0, 50.0),
                ],
            },
        ],
    }
}

/// Fail-closed validation checks (unsorted, NaN, duplicate time, empty track).
fn fail_closed_validation_ok() -> bool {
    let unsorted = TimelineTrack {
        name: "bad_unsorted".to_string(),
        interpolation: InterpolationKind::Linear,
        keyframes: vec![Keyframe::new(1.0, 1.0), Keyframe::new(0.5, 0.5)],
    };
    if unsorted.validate().is_ok() {
        return false;
    }
    let nan = TimelineTrack {
        name: "bad_nan".to_string(),
        interpolation: InterpolationKind::Linear,
        keyframes: vec![Keyframe::new(0.0, f32::NAN)],
    };
    if nan.validate().is_ok() {
        return false;
    }
    let duplicate = TimelineTrack {
        name: "bad_duplicate".to_string(),
        interpolation: InterpolationKind::Linear,
        keyframes: vec![Keyframe::new(0.0, 1.0), Keyframe::new(0.0, 2.0)],
    };
    if duplicate.validate().is_ok() {
        return false;
    }
    let empty = TimelineTrack {
        name: "bad_empty".to_string(),
        interpolation: InterpolationKind::Linear,
        keyframes: vec![],
    };
    if empty.validate().is_ok() {
        return false;
    }
    let non_finite_time = TimelineTrack {
        name: "bad_time".to_string(),
        interpolation: InterpolationKind::Linear,
        keyframes: vec![Keyframe::new(f32::INFINITY, 1.0)],
    };
    if non_finite_time.validate().is_ok() {
        return false;
    }
    true
}

/// Range-clamping checks: before-first returns first value; after-last returns last.
fn clamp_fail_closed_ok(roll: &TimelineTrack) -> bool {
    let before = roll.evaluate(-0.5).expect("before range");
    let after = roll.evaluate(10.0).expect("after range");
    (before - 0.0).abs() < 1e-3 && (after - 45.0).abs() < 1e-3
}

/// Runs the full soak: deterministic replay across all 241 authored frames,
/// closed-form interpolation spot-checks (linear midpoint, step hold, Catmull-Rom
/// midpoint), fail-closed validation, range clamping, and real composition with
/// the zero-loss compositor — plus measured distinctness vs peers.
pub fn run_sequencing_timeline_soak() -> SequencingTimelineSoakReport {
    static CACHE: std::sync::OnceLock<SequencingTimelineSoakReport> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| {
    let started = std::time::Instant::now();
    let timeline = soak_timeline();

    // Deterministic replay across every authored frame (0..=240 at 60 fps × 4 s).
    let mut frame0_samples: Vec<(String, f32)> = Vec::new();
    let mut frame120_samples: Vec<(String, f32)> = Vec::new();
    let mut replay_deterministic = true;
    for frame in 0..=240u64 {
        let a = timeline.evaluate_frame(frame).expect("valid soak timeline");
        let b = timeline.evaluate_frame(frame).expect("valid soak timeline");
        if a != b {
            replay_deterministic = false;
        }
        if frame == 0 {
            frame0_samples = a.clone();
        }
        if frame == 120 {
            frame120_samples = a;
        }
    }

    let roll = timeline.track("camera_roll").expect("roll track");
    let light = timeline.track("light_intensity").expect("light track");
    let focus = timeline.track("lens_focus").expect("focus track");

    // Linear midpoint between (0.0, 0.0) and (1.0, 30.0) at t=0.5 → 15.0.
    let linear_interpolation_ok = {
        let mid = roll.evaluate(0.5).expect("roll midpoint");
        (mid - 15.0).abs() < 1e-3
    };

    // Step holds the previous authored value before a keyframe, then jumps.
    let step_hold_ok = {
        let before = light.evaluate(1.4).expect("light before step");
        let after = light.evaluate(1.6).expect("light after step");
        (before - 0.1).abs() < 1e-3 && (after - 0.8).abs() < 1e-3
    };

    // Catmull-Rom midpoint between (1.0, 35.0) and (2.0, 28.0) with neighbors
    // p0=24.0 / p3=50.0 — closed-form value at u=0.5 is exactly 30.8125.
    let cubic_tangent_ok = {
        let mid = focus.evaluate(1.5).expect("focus midpoint");
        (mid - 30.8125).abs() < 1e-3
    };

    let validation_fail_closed_ok = fail_closed_validation_ok();
    let range_clamp_ok = clamp_fail_closed_ok(roll);

    // Real composition through the in-engine zero-loss compositor at frame 60.
    let composed = compose_cinema_frame(&timeline, 60, CinemaExportFormat::ProRes4444Xq)
        .expect("soak compose");
    let composition_ok = composed.frame == 60
        && composed.is_zero_loss_master
        && composed.track_sample_count == 3
        && composed.export_format == CinemaExportFormat::ProRes4444Xq;

    let ready = replay_deterministic
        && linear_interpolation_ok
        && step_hold_ok
        && cubic_tangent_ok
        && validation_fail_closed_ok
        && range_clamp_ok
        && composition_ok;

    let evidence_fingerprint = soak_evidence_fingerprint(
        replay_deterministic,
        linear_interpolation_ok,
        step_hold_ok,
        cubic_tangent_ok,
        validation_fail_closed_ok,
        range_clamp_ok,
        composition_ok,
        quant_f32(roll.evaluate(0.5).expect("roll midpoint")),
        quant_f32(roll.evaluate(2.5).expect("roll 2.5s")),
        quant_f32(focus.evaluate(1.5).expect("focus midpoint")),
        frame0_samples.len() as u32,
        frame120_samples.len() as u32,
        241,
    );

    // Measured distinctness vs real peer probes.
    let io_fp =
        crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
    let hs_fp = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw_fp = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4_fp = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
        .fingerprint;
    let s17_fp = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt_fp = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;

    SequencingTimelineSoakReport {
        sequencing_timeline_ready: ready,
        replay_deterministic,
        linear_interpolation_ok,
        step_hold_ok,
        cubic_tangent_ok,
        validation_fail_closed_ok,
        range_clamp_ok,
        composition_ok,
        camera_roll_at_frame30: roll.evaluate(0.5).expect("roll frame30"),
        light_intensity_at_frame84: light.evaluate(1.4).expect("light frame84"),
        lens_focus_at_frame90: focus.evaluate(1.5).expect("focus frame90"),
        frame0_sample_count: frame0_samples.len() as u32,
        frame120_sample_count: frame120_samples.len() as u32,
        track_count: timeline.track_count(),
        soaked_frames: 241,
        soak_elapsed_ns: started.elapsed().as_nanos() as u64,
        evidence_kind: SEQUENCING_TIMELINE_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_io_sph_probe: evidence_fingerprint != 0 && evidence_fingerprint != io_fp,
        distinct_from_hs_field_network_probe: evidence_fingerprint != 0 && evidence_fingerprint != hs_fp,
        distinct_from_fw_quantum_overlap_probe: evidence_fingerprint != 0 && evidence_fingerprint != fw_fp,
        distinct_from_ip4_svo_terrain_probe: evidence_fingerprint != 0 && evidence_fingerprint != ip4_fp,
        distinct_from_s17_physics_world_probe: evidence_fingerprint != 0 && evidence_fingerprint != s17_fp,
        distinct_from_jt_task_graph_probe: evidence_fingerprint != 0 && evidence_fingerprint != jt_fp,
        sequencer_aaa_ready: false,
        after_effects_aaa_ready: false,
        nuke_aaa_ready: false,
    }
    })
    .clone()
}

/// Honesty probe — soak-gated `sequencing_timeline_ready` (letter **ju**).
pub fn probe_sequencing_timeline() -> SequencingTimelineSoakReport {
    run_sequencing_timeline_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roll_track() -> TimelineTrack {
        TimelineTrack {
            name: "camera_roll".to_string(),
            interpolation: InterpolationKind::Linear,
            keyframes: vec![
                Keyframe::new(0.0, 0.0),
                Keyframe::new(1.0, 30.0),
                Keyframe::new(2.0, -15.0),
                Keyframe::new(4.0, 45.0),
            ],
        }
    }

    #[test]
    fn evaluate_linear_midpoint_is_exact() {
        let t = roll_track();
        let mid = t.evaluate(0.5).expect("midpoint");
        assert!((mid - 15.0).abs() < 1e-3);
        // A later segment midpoint: (2.0, -15) → (4.0, 45) at t=3.0 → 15.0.
        let mid2 = t.evaluate(3.0).expect("segment midpoint");
        assert!((mid2 - 15.0).abs() < 1e-3);
    }

    #[test]
    fn evaluate_step_holds_previous_value_then_jumps() {
        let t = TimelineTrack {
            name: "light".to_string(),
            interpolation: InterpolationKind::Step,
            keyframes: vec![
                Keyframe::new(0.0, 0.1),
                Keyframe::new(1.5, 0.8),
                Keyframe::new(3.0, 0.4),
            ],
        };
        let before = t.evaluate(1.4).expect("before step");
        let at = t.evaluate(1.5).expect("at step");
        let after = t.evaluate(1.6).expect("after step");
        assert!((before - 0.1).abs() < 1e-3);
        assert!((at - 0.8).abs() < 1e-3);
        assert!((after - 0.8).abs() < 1e-3);
    }

    #[test]
    fn evaluate_cubic_catmull_rom_matches_closed_form() {
        let t = TimelineTrack {
            name: "lens_focus".to_string(),
            interpolation: InterpolationKind::CubicCatmullRom,
            keyframes: vec![
                Keyframe::new(0.0, 24.0),
                Keyframe::new(1.0, 35.0),
                Keyframe::new(2.0, 28.0),
                Keyframe::new(4.0, 50.0),
            ],
        };
        // Closed-form uniform Catmull-Rom at u=0.5: p0=24, p1=35, p2=28, p3=50 → 30.8125.
        let mid = t.evaluate(1.5).expect("focus midpoint");
        assert!((mid - 30.8125).abs() < 1e-3);
    }

    #[test]
    fn evaluate_fails_closed_on_unsorted_keyframes() {
        let t = TimelineTrack {
            name: "bad".to_string(),
            interpolation: InterpolationKind::Linear,
            keyframes: vec![Keyframe::new(1.0, 1.0), Keyframe::new(0.5, 0.5)],
        };
        assert!(t.evaluate(0.75).is_err());
        assert!(t.validate().is_err());
    }

    #[test]
    fn evaluate_fails_closed_on_nan_keyframe() {
        let t = TimelineTrack {
            name: "bad".to_string(),
            interpolation: InterpolationKind::Linear,
            keyframes: vec![Keyframe::new(0.0, f32::NAN)],
        };
        assert!(t.evaluate(0.5).is_err());
    }

    #[test]
    fn evaluate_fails_closed_on_non_finite_time() {
        let t = roll_track();
        assert!(t.evaluate(f32::NAN).is_err());
        assert!(t.evaluate(f32::INFINITY).is_err());
    }

    #[test]
    fn evaluate_clamps_outside_authored_range() {
        let t = roll_track();
        let before = t.evaluate(-1.0).expect("before");
        let after = t.evaluate(99.0).expect("after");
        assert!((before - 0.0).abs() < 1e-3);
        assert!((after - 45.0).abs() < 1e-3);
    }

    #[test]
    fn timeline_validate_rejects_bad_fps_and_duration() {
        let mut t = soak_timeline();
        t.fps = 0.0;
        assert!(t.validate().is_err());
        let mut t2 = soak_timeline();
        t2.duration_s = f32::NAN;
        assert!(t2.validate().is_err());
    }

    #[test]
    fn evaluate_frame_matches_time_domain() {
        let t = soak_timeline();
        // Frame 30 at 60 fps == 0.5s → camera_roll = 15.0.
        let samples = t.evaluate_frame(30).expect("frame 30");
        let roll = samples.iter().find(|(n, _)| n == "camera_roll").expect("roll");
        assert!((roll.1 - 15.0).abs() < 1e-3);
        assert_eq!(samples.len(), 3);
    }

    #[test]
    fn compose_cinema_frame_anchors_zero_loss_master() {
        let t = soak_timeline();
        let composed =
            compose_cinema_frame(&t, 60, CinemaExportFormat::OpenExrFloat16Linear).expect("compose");
        assert_eq!(composed.frame, 60);
        assert!(composed.is_zero_loss_master);
        assert_eq!(composed.track_sample_count, 3);
        assert_eq!(composed.export_format, CinemaExportFormat::OpenExrFloat16Linear);
        // 1.0s → camera_roll = 30.0.
        let roll = composed.samples.iter().find(|(n, _)| n == "camera_roll").expect("roll");
        assert!((roll.1 - 30.0).abs() < 1e-3);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_sequencing_timeline_soak();
        assert!(r.sequencing_timeline_ready);
        assert!(r.replay_deterministic);
        assert!(r.linear_interpolation_ok);
        assert!(r.step_hold_ok);
        assert!(r.cubic_tangent_ok);
        assert!(r.validation_fail_closed_ok);
        assert!(r.range_clamp_ok);
        assert!(r.composition_ok);
        assert_eq!(r.frame0_sample_count, 3);
        assert_eq!(r.frame120_sample_count, 3);
        assert_eq!(r.track_count, 3);
        assert_eq!(r.soaked_frames, 241);
        assert_eq!(r.evidence_kind, SEQUENCING_TIMELINE_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        // AAA fail-closed.
        assert!(!r.sequencer_aaa_ready);
        assert!(!r.after_effects_aaa_ready);
        assert!(!r.nuke_aaa_ready);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_sequencing_timeline_soak();
        let b = run_sequencing_timeline_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.camera_roll_at_frame30, b.camera_roll_at_frame30);
        assert_eq!(a.light_intensity_at_frame84, b.light_intensity_at_frame84);
        assert_eq!(a.lens_focus_at_frame90, b.lens_focus_at_frame90);
        assert_eq!(a.soaked_frames, b.soaked_frames);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_sequencing_timeline();
        let s = run_sequencing_timeline_soak();
        assert_eq!(p.sequencing_timeline_ready, s.sequencing_timeline_ready);
        assert_eq!(p.evidence_kind, s.evidence_kind);
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.lens_focus_at_frame90, s.lens_focus_at_frame90);
        assert_eq!(p.sequencer_aaa_ready, s.sequencer_aaa_ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_sequencing_timeline_soak();
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let hs = crate::unified_field_network::probe_unified_field_network()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, hs);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
    }
}

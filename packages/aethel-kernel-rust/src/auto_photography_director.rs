//! # Auto-Photography Director Kernel — letter **kw** (R2-I / Vanguarda P4).
//!
//! A deterministic **rule engine** for autonomous camera direction — the
//! in-engine "virtual photographer" that frames a subject by applying real
//! cinematography rules to a scene interest (subject position/size, motion and
//! gaze) and produces a directed camera shot (focal length, camera height,
//! lead room, headroom, roll, distance). This is the backend substrate behind
//! the R2-J lens/cinema consolidation and the P4 Vanguarda auto-photography
//! surface — **no UI, no viewport**: a pure internal kernel that emits a
//! `DirectedCameraShot` descriptor for the render pipe.
//!
//! ## Rule set (deterministic, closed-form)
//!
//! - **Rule of Thirds** — pulls the placed subject toward the nearest 1/3–2/3
//!   intersection, scaled by the normalized rule weight.
//! - **Headroom** — keeps vertical headroom in a cinematic band
//!   `[0.15, 0.45]` of frame height (large subjects shrink headroom).
//! - **Lead Room** — opens space ahead of the subject's motion (moving right →
//!   subject pulled left, `lead_room` grows with the rule weight).
//! - **Rule 180** — enforces the axis-of-action: if gaze contradicts motion
//!   (`motion · gaze < 0`) the shot is produced **non-compliant** (fail-closed
//!   refusal — the director never silently crosses the axis).
//! - **Lens Focal Length** — derives the focal from framing tightness
//!   (larger subject → longer lens) inside the configured `[min, max]` band.
//! - **Camera Height** — monotonic with the headroom rule inside
//!   `[height_min, height_max]`.
//!
//! ## Law XVI — CreativeFusionTransaction gate (TRAVA, fail-closed)
//!
//! Every authoring mutation — creating a `RuleBook`, configuring the director,
//! setting a rule, or running `direct()` — **requires an open**
//! [`CreativeFusionTransaction`]. `begin → mutate → commit|rollback`; any
//! mutation after commit/rollback is rejected with `Err`. This mirrors the web
//! Trava II (Yjs undo / CreativeFusionTransaction) on the Rust side: no
//! director/RuleBook mutation can occur outside an auditable, revertible
//! transaction scope.
//!
//! ## Composition edge (R2-I → ju)
//!
//! The soak composes the directed shot through the **real**
//! [`crate::sequencing_timeline::compose_cinema_frame`] substrate (letter **ju**,
//! S-3 sequencing backend): the shot's `roll_deg` and `focal_length_mm` become
//! authored timeline tracks evaluated through the zero-loss compositor — proving
//! the R2-I → R1.5 edge with zero substrate edits.
//!
//! Soak-gated `auto_photography_director_ready` measured from real invariants
//! (compliant shot produced, Rule-180 violation refused, zero-loss composition
//! through ju, Law XVI transaction gate fail-closed, deterministic replay, all
//! finite); fingerprint seed `0x6B77_4452_0000_0005` ("kwDR") distinct from
//! ju/kv/ku/hg/kq/kr/ks/kt/ko/io/hs/fw/ip4/s17/jt; `auto_photography_aaa_ready`
//! / `cinematography_ai_aaa_ready` / `virtual_production_aaa_ready` HELD
//! fail-closed (honesty — this is the backend rule engine, not a shipped
//! AAA cinematography AI).

use serde::{Deserialize, Serialize};

use crate::in_engine_compositor_zero_loss::CinemaExportFormat;
use crate::sequencing_timeline::{
    compose_cinema_frame, InterpolationKind, Keyframe, Timeline, TimelineTrack,
};

/// Deterministic evidence-fingerprint seed for the auto-photography director
/// (letter **kw**).
const AUTO_PHOTOGRAPHY_DIRECTOR_FP_SEED: u64 = 0x6B77_4452_0000_0005; // "kwDR..."
/// Final fold for the evidence fingerprint (letter **kw**).
const AUTO_PHOTOGRAPHY_DIRECTOR_FP_FOLD: u64 = 0x6B77_4452_4452_4452; // "kwDRDRDR"
/// Evidence kind tag reported by the soak (letter **kw**).
pub const AUTO_PHOTOGRAPHY_DIRECTOR_EVIDENCE_KIND: &str =
    "auto_photography_director_rule_engine";

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

// ---------------------------------------------------------------------------
// Law XVI — CreativeFusionTransaction (fail-closed transaction gate)
// ---------------------------------------------------------------------------

/// Fail-closed creative transaction scope (Law XVI — TRAVA). Mirrors the web
/// `CreativeFusionTransaction` on the Rust side: any director/RuleBook mutation
/// requires an **open** transaction. `begin → mutate → commit | rollback`;
/// mutations after close are rejected.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreativeFusionTransaction {
    id: u64,
    open: bool,
    mutation_count: u64,
}

impl CreativeFusionTransaction {
    /// Opens a new creative transaction with a caller-supplied id.
    pub fn begin(id: u64) -> Self {
        Self {
            id,
            open: true,
            mutation_count: 0,
        }
    }

    /// Unique id of this transaction scope.
    pub fn id(&self) -> u64 {
        self.id
    }

    /// True while the transaction is open (mutations allowed).
    pub fn is_open(&self) -> bool {
        self.open
    }

    /// Number of mutations recorded inside this open transaction.
    pub fn mutation_count(&self) -> u64 {
        self.mutation_count
    }

    /// Fail-closed gate: `Err` when the transaction is closed.
    pub fn require_open(&self) -> Result<(), &'static str> {
        if self.open {
            Ok(())
        } else {
            Err("creative transaction is closed — Law XVI: mutation outside an open transaction is rejected")
        }
    }

    /// Records one auditable mutation. Fail-closed when the transaction is
    /// closed (cannot mutate after commit/rollback).
    pub fn record_mutation(&mut self) -> Result<(), &'static str> {
        self.require_open()?;
        self.mutation_count = self.mutation_count.saturating_add(1);
        Ok(())
    }

    /// Closes the transaction, sealing the recorded mutation set. Fail-closed
    /// on double-commit.
    pub fn commit(&mut self) -> Result<(), &'static str> {
        self.require_open()?;
        self.open = false;
        Ok(())
    }

    /// Closes the transaction and resets the recorded mutation count
    /// (the creative state is discarded by the caller). Fail-closed on
    /// double-rollback.
    pub fn rollback(&mut self) -> Result<(), &'static str> {
        self.require_open()?;
        self.mutation_count = 0;
        self.open = false;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Rule engine — rules, rule book, config, scene interest, directed shot
// ---------------------------------------------------------------------------

/// The six cinematography rules the director applies (deterministic, closed-form).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RuleKind {
    /// Subject pulled toward the nearest 1/3–2/3 intersection.
    RuleOfThirds,
    /// Vertical headroom band `[0.15, 0.45]` of frame height.
    Headroom,
    /// Horizontal space opened ahead of the subject's motion.
    LeadRoom,
    /// Axis-of-action enforcement (motion · gaze < 0 → non-compliant shot).
    Rule180,
    /// Focal length derived from framing tightness inside `[min_focal, max_focal]`.
    LensFocalLength,
    /// Camera height derived from headroom inside `[height_min, height_max]`.
    CameraHeight,
}

impl RuleKind {
    /// Stable wire tag.
    pub const fn tag(self) -> &'static str {
        match self {
            RuleKind::RuleOfThirds => "rule_of_thirds",
            RuleKind::Headroom => "headroom",
            RuleKind::LeadRoom => "lead_room",
            RuleKind::Rule180 => "rule_180",
            RuleKind::LensFocalLength => "lens_focal_length",
            RuleKind::CameraHeight => "camera_height",
        }
    }

    /// All six rules, in deterministic registration order.
    pub const fn all() -> [RuleKind; 6] {
        [
            RuleKind::RuleOfThirds,
            RuleKind::Headroom,
            RuleKind::LeadRoom,
            RuleKind::Rule180,
            RuleKind::LensFocalLength,
            RuleKind::CameraHeight,
        ]
    }

    /// Index of a rule in the `[f32; 6]` score array (deterministic).
    pub const fn index(self) -> usize {
        match self {
            RuleKind::RuleOfThirds => 0,
            RuleKind::Headroom => 1,
            RuleKind::LeadRoom => 2,
            RuleKind::Rule180 => 3,
            RuleKind::LensFocalLength => 4,
            RuleKind::CameraHeight => 5,
        }
    }
}

/// One weighted, enabled/disabled cinema rule.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CinemaRule {
    pub kind: RuleKind,
    /// Influence weight in `[0, 1]` (0 = no influence while still "present").
    pub weight: f32,
    /// Disabled rules do not influence the shot nor gate compliance.
    pub enabled: bool,
}

impl CinemaRule {
    pub const fn new(kind: RuleKind, weight: f32, enabled: bool) -> Self {
        Self {
            kind,
            weight,
            enabled,
        }
    }

    /// Fail-closed validation: finite weight in `[0, 1]`.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.weight.is_finite() {
            return Err("rule weight must be finite");
        }
        if !(0.0..=1.0).contains(&self.weight) {
            return Err("rule weight must be in [0, 1]");
        }
        Ok(())
    }
}

/// The director's rule book: all six rules with per-rule weight + enablement.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RuleBook {
    rules: [CinemaRule; 6],
}

impl Default for RuleBook {
    fn default() -> Self {
        Self {
            rules: [
                CinemaRule::new(RuleKind::RuleOfThirds, 1.0, true),
                CinemaRule::new(RuleKind::Headroom, 0.8, true),
                CinemaRule::new(RuleKind::LeadRoom, 0.7, true),
                CinemaRule::new(RuleKind::Rule180, 1.0, true),
                CinemaRule::new(RuleKind::LensFocalLength, 0.6, true),
                CinemaRule::new(RuleKind::CameraHeight, 0.6, true),
            ],
        }
    }
}

impl RuleBook {
    /// Authoring a rule book is a creative mutation (Law XVI — TRAVA).
    pub fn new(tx: &mut CreativeFusionTransaction) -> Result<Self, &'static str> {
        tx.require_open()?;
        tx.record_mutation()?;
        Ok(Self::default())
    }

    /// Fail-closed validation of every rule.
    pub fn validate(&self) -> Result<(), &'static str> {
        for rule in &self.rules {
            rule.validate()?;
        }
        Ok(())
    }

    /// Immutable read of one rule.
    pub fn get(&self, kind: RuleKind) -> CinemaRule {
        self.rules[kind.index()]
    }

    /// Mutates one rule — Law XVI: requires an open transaction.
    pub fn set(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        kind: RuleKind,
        weight: f32,
        enabled: bool,
    ) -> Result<(), &'static str> {
        tx.require_open()?;
        let rule = CinemaRule::new(kind, weight, enabled);
        rule.validate()?;
        self.rules[kind.index()] = rule;
        tx.record_mutation()?;
        Ok(())
    }

    /// Toggles a rule's enablement — Law XVI: requires an open transaction.
    pub fn toggle(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        kind: RuleKind,
        enabled: bool,
    ) -> Result<(), &'static str> {
        let cur = self.get(kind);
        self.set(tx, kind, cur.weight, enabled)
    }

    /// Sum of the weights of enabled rules (0 when none enabled).
    pub fn total_weight(&self) -> f32 {
        self.rules
            .iter()
            .filter(|r| r.enabled)
            .map(|r| r.weight)
            .sum()
    }

    /// Normalized influence of one rule in `[0, 1]` (0 when nothing enabled).
    pub fn normalized_weight(&self, kind: RuleKind) -> f32 {
        let rule = self.get(kind);
        if !rule.enabled {
            return 0.0;
        }
        let total = self.total_weight();
        if total <= 0.0 {
            return 0.0;
        }
        (rule.weight / total).clamp(0.0, 1.0)
    }

    /// The kinds of all enabled rules, in registration order.
    pub fn enabled_kinds(&self) -> Vec<RuleKind> {
        self.rules
            .iter()
            .filter(|r| r.enabled)
            .map(|r| r.kind)
            .collect()
    }
}

/// Authoring configuration for the director (aspect, focal band, height band).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoPhotographyConfig {
    pub aspect_ratio: f32,
    pub min_focal_mm: f32,
    pub max_focal_mm: f32,
    pub camera_height_min: f32,
    pub camera_height_max: f32,
}

impl Default for AutoPhotographyConfig {
    fn default() -> Self {
        Self {
            aspect_ratio: 16.0 / 9.0,
            min_focal_mm: 24.0,
            max_focal_mm: 85.0,
            camera_height_min: 0.5,
            camera_height_max: 3.0,
        }
    }
}

impl AutoPhotographyConfig {
    /// Fail-closed validation: finite positive aspect, ordered focal band,
    /// ordered height band.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.aspect_ratio.is_finite() || self.aspect_ratio <= 0.0 {
            return Err("aspect_ratio must be finite and positive");
        }
        if !self.min_focal_mm.is_finite() || self.min_focal_mm <= 0.0 {
            return Err("min_focal_mm must be finite and positive");
        }
        if !self.max_focal_mm.is_finite() || self.max_focal_mm < self.min_focal_mm {
            return Err("max_focal_mm must be finite and >= min_focal_mm");
        }
        if !self.camera_height_min.is_finite() || self.camera_height_min <= 0.0 {
            return Err("camera_height_min must be finite and positive");
        }
        if !self.camera_height_max.is_finite()
            || self.camera_height_max < self.camera_height_min
        {
            return Err("camera_height_max must be finite and >= camera_height_min");
        }
        Ok(())
    }
}

/// The scene interest the director frames: subject position/size (normalized
/// 0..1 frame units), horizontal motion and gaze directions.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SceneInterest {
    pub subject_x: f32,
    pub subject_y: f32,
    pub subject_width: f32,
    pub subject_height: f32,
    pub motion_dir_x: f32,
    pub gaze_dir_x: f32,
}

impl SceneInterest {
    /// Fail-closed validation of the scene interest.
    pub fn validate(&self) -> Result<(), &'static str> {
        for (name, v) in [
            ("subject_x", self.subject_x),
            ("subject_y", self.subject_y),
            ("subject_width", self.subject_width),
            ("subject_height", self.subject_height),
            ("motion_dir_x", self.motion_dir_x),
            ("gaze_dir_x", self.gaze_dir_x),
        ] {
            if !v.is_finite() {
                return Err(match name {
                    "subject_x" => "scene interest subject_x must be finite",
                    "subject_y" => "scene interest subject_y must be finite",
                    "subject_width" => "scene interest subject_width must be finite",
                    "subject_height" => "scene interest subject_height must be finite",
                    "motion_dir_x" => "scene interest motion_dir_x must be finite",
                    _ => "scene interest gaze_dir_x must be finite",
                });
            }
        }
        if !(0.0..=1.0).contains(&self.subject_x) || !(0.0..=1.0).contains(&self.subject_y) {
            return Err("subject position must be in [0, 1]");
        }
        if self.subject_width <= 0.0
            || self.subject_width > 1.0
            || self.subject_height <= 0.0
            || self.subject_height > 1.0
        {
            return Err("subject size must be in (0, 1]");
        }
        Ok(())
    }
}

/// The full composition input: scene interest + frame resolution.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CompositionInput {
    pub scene: SceneInterest,
    pub frame_width: u32,
    pub frame_height: u32,
}

impl CompositionInput {
    /// Fail-closed validation.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.frame_width == 0 || self.frame_height == 0 {
            return Err("frame dimensions must be non-zero");
        }
        self.scene.validate()
    }
}

/// A directed camera shot produced by the rule engine.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectedCameraShot {
    /// Placed normalized subject position after rule application.
    pub subject_x: f32,
    pub subject_y: f32,
    /// Lens focal length in mm (inside `[min_focal, max_focal]`).
    pub focal_length_mm: f32,
    /// Camera height in world units (inside `[height_min, height_max]`).
    pub camera_height: f32,
    /// Roll in degrees (leveled director → 0).
    pub roll_deg: f32,
    /// Fraction of frame width reserved ahead of the subject's motion.
    pub lead_room: f32,
    /// Vertical headroom as a fraction of frame height.
    pub headroom: f32,
    /// Distance to subject in world units (derived from focal + subject size).
    pub distance: f32,
    /// True when every enabled rule scores >= 0.5 (Rule-180 violations fail).
    pub is_rule_compliant: bool,
    /// Enabled rules, in registration order.
    pub applied_rules: Vec<RuleKind>,
    /// Per-rule compliance contribution in `[0, 1]`, indexed by `RuleKind::index`.
    pub rule_scores: [f32; 6],
}

impl DirectedCameraShot {
    /// All numeric fields finite and within their configured bands.
    pub fn is_finite_and_bounded(&self, config: &AutoPhotographyConfig) -> bool {
        [
            self.subject_x,
            self.subject_y,
            self.focal_length_mm,
            self.camera_height,
            self.roll_deg,
            self.lead_room,
            self.headroom,
            self.distance,
        ]
        .iter()
        .all(|v| v.is_finite())
            && (0.0..=1.0).contains(&self.subject_x)
            && (0.0..=1.0).contains(&self.subject_y)
            && (config.min_focal_mm..=config.max_focal_mm).contains(&self.focal_length_mm)
            && (config.camera_height_min..=config.camera_height_max)
                .contains(&self.camera_height)
            && (0.15..=0.45).contains(&self.headroom)
    }
}

/// The auto-photography director: owns a `RuleBook` + `AutoPhotographyConfig`
/// and frames `CompositionInput`s into `DirectedCameraShot`s. Every mutation
/// and every `direct()` requires an open [`CreativeFusionTransaction`].
#[derive(Debug, Clone, PartialEq)]
pub struct AutoPhotographyDirector {
    config: AutoPhotographyConfig,
    book: RuleBook,
    last_shot: Option<DirectedCameraShot>,
}

impl AutoPhotographyDirector {
    /// Creates a director with a default rule book — Law XVI (TRAVA).
    pub fn new(
        tx: &mut CreativeFusionTransaction,
        config: AutoPhotographyConfig,
    ) -> Result<Self, &'static str> {
        tx.require_open()?;
        config.validate()?;
        tx.record_mutation()?;
        Ok(Self {
            config,
            book: RuleBook::default(),
            last_shot: None,
        })
    }

    pub fn config(&self) -> &AutoPhotographyConfig {
        &self.config
    }

    pub fn rule_book(&self) -> &RuleBook {
        &self.book
    }

    pub fn last_shot(&self) -> Option<&DirectedCameraShot> {
        self.last_shot.as_ref()
    }

    /// Reconfigures the director — Law XVI (TRAVA).
    pub fn configure(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        config: AutoPhotographyConfig,
    ) -> Result<(), &'static str> {
        tx.require_open()?;
        config.validate()?;
        self.config = config;
        tx.record_mutation()?;
        Ok(())
    }

    /// Mutates one rule — Law XVI (TRAVA).
    pub fn set_rule(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        kind: RuleKind,
        weight: f32,
        enabled: bool,
    ) -> Result<(), &'static str> {
        self.book.set(tx, kind, weight, enabled)
    }

    /// Deterministic rule application — Law XVI (TRAVA): requires an open
    /// transaction (a directed shot is a creative artifact).
    pub fn direct(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        input: &CompositionInput,
    ) -> Result<DirectedCameraShot, &'static str> {
        tx.require_open()?;
        input.validate()?;
        self.config.validate()?;
        self.book.validate()?;

        let sc = &input.scene;
        let influence = |kind: RuleKind| self.book.normalized_weight(kind);

        // Rule of Thirds — pull toward the nearest 1/3–2/3 intersection.
        let rot = influence(RuleKind::RuleOfThirds);
        let third_x = if sc.subject_x < 0.5 { 1.0 / 3.0 } else { 2.0 / 3.0 };
        let third_y = if sc.subject_y < 0.5 { 1.0 / 3.0 } else { 2.0 / 3.0 };
        let mut placed_x = sc.subject_x + (third_x - sc.subject_x) * rot;
        let mut placed_y = sc.subject_y + (third_y - sc.subject_y) * rot;

        // Lead Room — open space ahead of the subject's motion.
        // NOTE: `f32::signum()` returns 1.0 for +0.0, which would misclassify a
        // static subject (motion_dir_x == 0.0) as moving right and pull the
        // frame open ahead of non-existent motion. Use an explicit zero check so
        // static subjects get `dir == 0.0` (no lead space, vacuously compliant).
        let lead = influence(RuleKind::LeadRoom);
        let dir = if sc.motion_dir_x > 0.0 {
            1.0
        } else if sc.motion_dir_x < 0.0 {
            -1.0
        } else {
            0.0
        };
        let mut lead_room = 0.5;
        if dir != 0.0 {
            placed_x += -dir * lead * 0.12;
            lead_room = 0.35 + lead * 0.25;
        }
        placed_x = placed_x.clamp(0.0, 1.0);
        placed_y = placed_y.clamp(0.0, 1.0);

        // Headroom — cinematic band, shrinks with subject size, pulled by the rule.
        let hd = influence(RuleKind::Headroom);
        let mut headroom = (0.45 - sc.subject_height * 0.2).clamp(0.15, 0.45);
        headroom = (headroom + (0.35 - headroom) * hd).clamp(0.15, 0.45);

        // Camera Height — monotonic with headroom inside the configured band.
        let headroom_rel = (headroom - 0.15) / 0.30;
        let camera_height = self.config.camera_height_min
            + (self.config.camera_height_max - self.config.camera_height_min)
                * (1.0 - headroom_rel);

        // Rule 180 — axis-of-action enforcement (fail-closed refusal).
        let axis_respected = if dir == 0.0 {
            true
        } else {
            sc.motion_dir_x * sc.gaze_dir_x >= 0.0
        };

        // Lens Focal Length — from framing tightness inside the configured band.
        let framing = (sc.subject_width / 0.6).clamp(0.0, 1.0);
        let target_focal = self.config.min_focal_mm
            + (self.config.max_focal_mm - self.config.min_focal_mm) * framing;
        let focal = target_focal.clamp(self.config.min_focal_mm, self.config.max_focal_mm);

        // Distance — derived from focal + subject size (world units).
        let distance = (sc.subject_width * 12.0 / focal.max(1.0)).clamp(0.5, 40.0);

        // Per-rule compliance in [0, 1].
        let rot_score =
            (1.0 - ((placed_x - third_x).abs() + (placed_y - third_y).abs()) * 0.5).clamp(0.0, 1.0);
        let headroom_score = (1.0 - (headroom - 0.35).abs() / 0.30).clamp(0.0, 1.0);
        // Lead Room compliance: a static subject (no motion) needs no lead space,
        // so it is vacuously compliant. A moving subject is compliant to the
        // degree that the frame actually opens space ahead of the motion —
        // measured against the generous 0.60 target produced when the rule
        // reaches its full normalized influence.
        let lead_score = if dir == 0.0 {
            1.0
        } else {
            (lead_room / 0.60).clamp(0.0, 1.0)
        };
        let r180_score = if axis_respected { 1.0 } else { 0.0 };
        let focal_score = 1.0; // chosen inside the configured band by construction
        let height_score = if (self.config.camera_height_min..=self.config.camera_height_max)
            .contains(&camera_height)
        {
            1.0
        } else {
            0.0
        };

        let mut rule_scores = [0.0f32; 6];
        rule_scores[RuleKind::RuleOfThirds.index()] = rot_score;
        rule_scores[RuleKind::Headroom.index()] = headroom_score;
        rule_scores[RuleKind::LeadRoom.index()] = lead_score;
        rule_scores[RuleKind::Rule180.index()] = r180_score;
        rule_scores[RuleKind::LensFocalLength.index()] = focal_score;
        rule_scores[RuleKind::CameraHeight.index()] = height_score;

        let applied_rules = self.book.enabled_kinds();
        let is_rule_compliant = applied_rules
            .iter()
            .all(|kind| rule_scores[kind.index()] >= 0.5);

        let shot = DirectedCameraShot {
            subject_x: placed_x,
            subject_y: placed_y,
            focal_length_mm: focal,
            camera_height,
            roll_deg: 0.0,
            lead_room,
            headroom,
            distance,
            is_rule_compliant,
            applied_rules,
            rule_scores,
        };
        self.last_shot = Some(shot.clone());
        tx.record_mutation()?;
        Ok(shot)
    }
}

// ---------------------------------------------------------------------------
// Soak — deterministic measurement, fingerprint and honest report
// ---------------------------------------------------------------------------

/// Measured invariants of one soak pass (fail-closed on construction error).
struct AutoPhotographyDirectorMeasured {
    rule_of_thirds_placed_x: f32,
    headroom: f32,
    camera_height: f32,
    focal_length_mm: f32,
    lead_room: f32,
    compliant_shot_ok: bool,
    rule180_refusal_ok: bool,
    composition_ok: bool,
    tx_gate_fail_closed_ok: bool,
    all_finite: bool,
    replay_deterministic: bool,
}

impl AutoPhotographyDirectorMeasured {
    fn fail_closed() -> Self {
        Self {
            rule_of_thirds_placed_x: f32::NAN,
            headroom: f32::NAN,
            camera_height: f32::NAN,
            focal_length_mm: f32::NAN,
            lead_room: f32::NAN,
            compliant_shot_ok: false,
            rule180_refusal_ok: false,
            composition_ok: false,
            tx_gate_fail_closed_ok: false,
            all_finite: false,
            replay_deterministic: false,
        }
    }
}

/// Compact deterministic soak config.
fn soak_config() -> AutoPhotographyConfig {
    AutoPhotographyConfig::default()
}

/// Compliant scene: subject near center moving right, gazing right.
fn soak_input() -> CompositionInput {
    CompositionInput {
        scene: SceneInterest {
            subject_x: 0.5,
            subject_y: 0.5,
            subject_width: 0.35,
            subject_height: 0.4,
            motion_dir_x: 1.0,
            gaze_dir_x: 1.0,
        },
        frame_width: 1920,
        frame_height: 1080,
    }
}

/// Rule-180 violating scene: subject moving right but gazing left.
fn violating_input() -> CompositionInput {
    let mut input = soak_input();
    input.scene.gaze_dir_x = -1.0;
    input
}

/// Builds a 2-track ju timeline from a directed shot (proves the R2-I → ju edge).
fn build_timeline_from_shot(shot: &DirectedCameraShot) -> Timeline {
    Timeline {
        tracks: vec![
            TimelineTrack {
                name: "camera_roll".to_string(),
                interpolation: InterpolationKind::Step,
                keyframes: vec![
                    Keyframe::new(0.0, shot.roll_deg),
                    Keyframe::new(4.0, shot.roll_deg),
                ],
            },
            TimelineTrack {
                name: "lens_focus".to_string(),
                interpolation: InterpolationKind::Linear,
                keyframes: vec![
                    Keyframe::new(0.0, shot.focal_length_mm),
                    Keyframe::new(4.0, shot.focal_length_mm),
                ],
            },
        ],
        duration_s: 4.0,
        fps: 60.0,
    }
}

/// One measured soak pass. Any failure leaves every field fail-closed.
fn run_measured_pass() -> AutoPhotographyDirectorMeasured {
    let mut m = AutoPhotographyDirectorMeasured::fail_closed();

    // --- Law XVI transaction gate (fail-closed) ---------------------------
    let mut tx = CreativeFusionTransaction::begin(0x4B57_0000_0000_0001);
    let mut tx_gate_ok = true;

    let book = match RuleBook::new(&mut tx) {
        Ok(b) => b,
        Err(_) => return m,
    };
    let mut book = book;
    if book.set(&mut tx, RuleKind::RuleOfThirds, 1.0, true).is_err() {
        return m;
    }
    if tx.record_mutation().is_err() {
        return m;
    }
    if tx.commit().is_err() {
        return m;
    }
    // Mutations after commit must be rejected (fail-closed).
    tx_gate_ok &= book.set(&mut tx, RuleKind::Headroom, 1.0, true).is_err();
    tx_gate_ok &= tx.record_mutation().is_err();
    tx_gate_ok &= tx.commit().is_err(); // double-commit rejected

    // Rollback path: rollback closes and resets; mutations after rollback fail.
    let mut tx2 = CreativeFusionTransaction::begin(0x4B57_0000_0000_0002);
    let mut book2 = match RuleBook::new(&mut tx2) {
        Ok(b) => b,
        Err(_) => return m,
    };
    if book2.set(&mut tx2, RuleKind::LeadRoom, 1.0, true).is_err() {
        return m;
    }
    if tx2.rollback().is_err() {
        return m;
    }
    tx_gate_ok &= !tx2.is_open();
    tx_gate_ok &= tx2.mutation_count() == 0;
    tx_gate_ok &= book2.set(&mut tx2, RuleKind::LeadRoom, 1.0, true).is_err();

    // --- Director + deterministic shot ------------------------------------
    let mut tx3 = CreativeFusionTransaction::begin(0x4B57_0000_0000_0003);
    let config = soak_config();
    let mut director = match AutoPhotographyDirector::new(&mut tx3, config.clone()) {
        Ok(d) => d,
        Err(_) => return m,
    };

    let input = soak_input();
    let shot = match director.direct(&mut tx3, &input) {
        Ok(s) => s,
        Err(_) => return m,
    };

    // Replay determinism with a second, identical director.
    let mut tx4 = CreativeFusionTransaction::begin(0x4B57_0000_0000_0004);
    let mut director_b = match AutoPhotographyDirector::new(&mut tx4, config.clone()) {
        Ok(d) => d,
        Err(_) => return m,
    };
    let shot_b = match director_b.direct(&mut tx4, &input) {
        Ok(s) => s,
        Err(_) => return m,
    };

    // Rule-180 violation refusal.
    let shot_v = match director.direct(&mut tx3, &violating_input()) {
        Ok(s) => s,
        Err(_) => return m,
    };

    // Mutation / direct after commit must be rejected (Law XVI).
    if tx3.commit().is_err() {
        return m;
    }
    tx_gate_ok &= director.set_rule(&mut tx3, RuleKind::LeadRoom, 1.0, true).is_err();
    tx_gate_ok &= director.direct(&mut tx3, &input).is_err();

    // --- Composition through the real ju substrate ------------------------
    let timeline = build_timeline_from_shot(&shot);
    let composition_ok = matches!(
        compose_cinema_frame(&timeline, 60, CinemaExportFormat::OpenExrFloat16Linear),
        Ok(c) if c.is_zero_loss_master && c.track_sample_count == 2
    );

    m.rule_of_thirds_placed_x = shot.subject_x;
    m.headroom = shot.headroom;
    m.camera_height = shot.camera_height;
    m.focal_length_mm = shot.focal_length_mm;
    m.lead_room = shot.lead_room;
    m.compliant_shot_ok = shot.is_rule_compliant;
    m.rule180_refusal_ok = !shot_v.is_rule_compliant;
    m.composition_ok = composition_ok;
    m.tx_gate_fail_closed_ok = tx_gate_ok;
    m.all_finite = shot.is_finite_and_bounded(&config) && shot_v.is_finite_and_bounded(&config);
    m.replay_deterministic = shot == shot_b;
    m
}

/// Deterministic evidence fingerprint — folds only measured invariants.
fn auto_photography_director_evidence_fingerprint(m: &AutoPhotographyDirectorMeasured) -> u64 {
    let mut h = AUTO_PHOTOGRAPHY_DIRECTOR_FP_SEED;
    h = hash_mix(h, quant_f32(m.rule_of_thirds_placed_x));
    h = hash_mix(h, quant_f32(m.headroom));
    h = hash_mix(h, quant_f32(m.camera_height));
    h = hash_mix(h, quant_f32(m.focal_length_mm));
    h = hash_mix(h, quant_f32(m.lead_room));
    h = hash_mix(h, m.compliant_shot_ok as u64);
    h = hash_mix(h, m.rule180_refusal_ok as u64);
    h = hash_mix(h, m.composition_ok as u64);
    h = hash_mix(h, m.tx_gate_fail_closed_ok as u64);
    h = hash_mix(h, m.all_finite as u64);
    h = hash_mix(h, m.replay_deterministic as u64);
    hash_mix(h, AUTO_PHOTOGRAPHY_DIRECTOR_FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &AutoPhotographyDirectorMeasured) -> bool {
    m.compliant_shot_ok
        && m.rule180_refusal_ok
        && m.composition_ok
        && m.tx_gate_fail_closed_ok
        && m.all_finite
        && m.replay_deterministic
}

/// Honest auto-photography director soak report. Readiness derives from
/// measurement; AAA flags are always HELD (fail-closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AutoPhotographyDirectorSoakReport {
    pub deterministic: bool,
    pub rule_of_thirds_placed_x: f32,
    pub headroom: f32,
    pub camera_height: f32,
    pub focal_length_mm: f32,
    pub lead_room: f32,
    pub compliant_shot_ok: bool,
    pub rule180_refusal_ok: bool,
    pub composition_ok: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite: bool,
    pub replay_deterministic: bool,
    pub evidence_fingerprint: u64,
    pub ready: bool,
    pub evidence_kind: &'static str,
    // Distinctness — measured against 15 real peer fingerprints.
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
    // AAA — always HELD (fail-closed).
    pub auto_photography_aaa_ready: bool,
    pub cinematography_ai_aaa_ready: bool,
    pub virtual_production_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(
    m: &AutoPhotographyDirectorMeasured,
    deterministic: bool,
) -> AutoPhotographyDirectorSoakReport {
    let ready = readiness(m) && deterministic;
    let fp = auto_photography_director_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ju_fp = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
    let kv_fp = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
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
    let ko_fp = crate::euphoria_balance_controller::run_euphoria_balance_soak()
        .evidence_fingerprint;
    let io_fp = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
        .evidence_fingerprint;
    let hs_fp = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw_fp = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4_fp = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
        .fingerprint;
    let s17_fp = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt_fp = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;

    AutoPhotographyDirectorSoakReport {
        deterministic,
        rule_of_thirds_placed_x: m.rule_of_thirds_placed_x,
        headroom: m.headroom,
        camera_height: m.camera_height,
        focal_length_mm: m.focal_length_mm,
        lead_room: m.lead_room,
        compliant_shot_ok: m.compliant_shot_ok,
        rule180_refusal_ok: m.rule180_refusal_ok,
        composition_ok: m.composition_ok,
        tx_gate_fail_closed_ok: m.tx_gate_fail_closed_ok,
        all_finite: m.all_finite,
        replay_deterministic: m.replay_deterministic,
        evidence_fingerprint: fp,
        ready,
        evidence_kind: AUTO_PHOTOGRAPHY_DIRECTOR_EVIDENCE_KIND,
        distinct_from_ju_sequencing_timeline: distinct(ju_fp),
        distinct_from_kv_wind_field: distinct(kv_fp),
        distinct_from_ku_world_forge: distinct(ku_fp),
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
        auto_photography_aaa_ready: false,
        cinematography_ai_aaa_ready: false,
        virtual_production_aaa_ready: false,
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
pub fn run_auto_photography_director_soak() -> AutoPhotographyDirectorSoakReport {
    static CACHE: std::sync::OnceLock<AutoPhotographyDirectorSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = auto_photography_director_evidence_fingerprint(&a)
                == auto_photography_director_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Honesty probe — soak-gated `ready` (letter **kw**).
pub fn probe_auto_photography_director() -> AutoPhotographyDirectorSoakReport {
    run_auto_photography_director_soak()
}

// ---------------------------------------------------------------------------
// Tests — exact mathematical invariants, determinism, edge cases, Law XVI.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn open_tx() -> CreativeFusionTransaction {
        CreativeFusionTransaction::begin(0x4B57_0000_0000_00FF)
    }

    fn test_config() -> AutoPhotographyConfig {
        AutoPhotographyConfig::default()
    }

    fn dir_shot(config: &AutoPhotographyConfig) -> (DirectedCameraShot, CreativeFusionTransaction) {
        let mut tx = open_tx();
        let mut director = AutoPhotographyDirector::new(&mut tx, config.clone()).expect("director");
        let shot = director
            .direct(&mut tx, &soak_input())
            .expect("deterministic shot");
        (shot, tx)
    }

    #[test]
    fn config_rejects_invalid_values() {
        let mut c = test_config();
        c.aspect_ratio = 0.0;
        assert!(c.validate().is_err());
        let mut c = test_config();
        c.aspect_ratio = f32::NAN;
        assert!(c.validate().is_err());
        let mut c = test_config();
        c.min_focal_mm = 0.0;
        assert!(c.validate().is_err());
        let mut c = test_config();
        c.max_focal_mm = 10.0;
        c.min_focal_mm = 20.0;
        assert!(c.validate().is_err());
        let mut c = test_config();
        c.camera_height_max = 0.1;
        c.camera_height_min = 1.0;
        assert!(c.validate().is_err());
    }

    #[test]
    fn scene_interest_validate_fails_closed() {
        let mut s = soak_input().scene;
        s.subject_x = 1.5;
        assert!(s.validate().is_err());
        let mut s = soak_input().scene;
        s.subject_y = -0.1;
        assert!(s.validate().is_err());
        let mut s = soak_input().scene;
        s.subject_width = 0.0;
        assert!(s.validate().is_err());
        let mut s = soak_input().scene;
        s.motion_dir_x = f32::NAN;
        assert!(s.validate().is_err());
    }

    #[test]
    fn composition_input_validate_fails_closed() {
        let mut input = soak_input();
        input.frame_width = 0;
        assert!(input.validate().is_err());
        let mut input = soak_input();
        input.frame_height = 0;
        assert!(input.validate().is_err());
    }

    #[test]
    fn rule_book_validate_rejects_bad_weight() {
        let mut tx = open_tx();
        let mut book = RuleBook::new(&mut tx).expect("book");
        assert!(book.set(&mut tx, RuleKind::Headroom, 1.5, true).is_err());
        assert!(book.set(&mut tx, RuleKind::Headroom, -0.1, true).is_err());
        assert!(book.set(&mut tx, RuleKind::Headroom, f32::NAN, true).is_err());
        assert!(book.set(&mut tx, RuleKind::Headroom, 0.5, true).is_ok());
    }

    #[test]
    fn transaction_requires_open_for_mutation() {
        let mut tx = open_tx();
        assert!(tx.is_open());
        let mut book = RuleBook::new(&mut tx).expect("book");
        assert!(book.set(&mut tx, RuleKind::RuleOfThirds, 1.0, true).is_ok());
        assert_eq!(tx.mutation_count(), 2); // RuleBook::new + set
        tx.commit().expect("commit");
        assert!(!tx.is_open());
        // Fail-closed: mutation / record / double-commit after close.
        assert!(book.set(&mut tx, RuleKind::Headroom, 1.0, true).is_err());
        assert!(tx.record_mutation().is_err());
        assert!(tx.commit().is_err());
    }

    #[test]
    fn transaction_rollback_resets_and_closes() {
        let mut tx = open_tx();
        let mut book = RuleBook::new(&mut tx).expect("book");
        book.set(&mut tx, RuleKind::RuleOfThirds, 0.5, true)
            .expect("set");
        tx.rollback().expect("rollback");
        assert!(!tx.is_open());
        assert_eq!(tx.mutation_count(), 0);
        assert!(book.set(&mut tx, RuleKind::LeadRoom, 1.0, true).is_err());
        assert!(tx.rollback().is_err());
    }

    #[test]
    fn director_requires_open_transaction() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config).expect("director");
        let input = soak_input();
        director.direct(&mut tx, &input).expect("direct while open");
        tx.commit().expect("commit");
        // Law XVI: no direct / no rule mutation after close.
        assert!(director.direct(&mut tx, &input).is_err());
        assert!(director.set_rule(&mut tx, RuleKind::LeadRoom, 1.0, true).is_err());
    }

    #[test]
    fn rule_of_thirds_pulls_subject_to_third() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config).expect("director");
        // Enable ONLY the Rule of Thirds at full normalized weight
        // (lead/headroom/etc. neutral — zeroed weights so the total is 1.0).
        for kind in RuleKind::all() {
            director.set_rule(&mut tx, kind, 0.0, false).expect("disable");
        }
        director
            .set_rule(&mut tx, RuleKind::RuleOfThirds, 1.0, true)
            .expect("enable only rule of thirds");
        let shot = director.direct(&mut tx, &soak_input()).expect("shot");
        // subject_x 0.5 + (2/3 - 0.5) * (1.0/1.0) = 0.6667.
        assert!((shot.subject_x - 2.0 / 3.0).abs() < 1e-3);
        assert!((shot.subject_y - 2.0 / 3.0).abs() < 1e-3);
    }

    #[test]
    fn disabled_rule_does_not_influence_placement() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config).expect("director");
        // All rules disabled → subject stays where authored (clamped).
        for kind in RuleKind::all() {
            director.set_rule(&mut tx, kind, 0.0, false).expect("disable");
        }
        let shot = director.direct(&mut tx, &soak_input()).expect("shot");
        assert!((shot.subject_x - 0.5).abs() < 1e-4);
        assert!((shot.subject_y - 0.5).abs() < 1e-4);
        assert!(shot.applied_rules.is_empty());
        assert!(shot.is_rule_compliant); // no enabled rule → vacuously compliant
    }

    #[test]
    fn lead_room_opens_space_ahead_of_motion() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config).expect("director");
        // Enable ONLY the Lead Room rule at full normalized weight.
        for kind in RuleKind::all() {
            director.set_rule(&mut tx, kind, 0.0, false).expect("disable");
        }
        director
            .set_rule(&mut tx, RuleKind::LeadRoom, 1.0, true)
            .expect("enable lead room");
        let mut moving = soak_input();
        let mut still = soak_input();
        moving.scene.motion_dir_x = 1.0;
        still.scene.motion_dir_x = 0.0;
        let shot_moving = director.direct(&mut tx, &moving).expect("moving");
        let shot_still = director.direct(&mut tx, &still).expect("still");
        // Moving right → subject pulled left vs the still frame, generous lead room.
        assert!(shot_moving.subject_x < shot_still.subject_x - 1e-4);
        assert!(shot_moving.lead_room >= 0.55);
        assert!((shot_still.lead_room - 0.5).abs() < 1e-4);
    }

    #[test]
    fn headroom_affects_camera_height_monotonically() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config.clone()).expect("director");
        for kind in RuleKind::all() {
            director
                .set_rule(&mut tx, kind, 0.0, kind == RuleKind::Headroom)
                .expect("set");
        }
        let mut small = soak_input();
        let mut big = soak_input();
        small.scene.subject_height = 0.2; // large headroom
        big.scene.subject_height = 0.8; // small headroom
        let shot_small = director.direct(&mut tx, &small).expect("small subject");
        let shot_big = director.direct(&mut tx, &big).expect("big subject");
        // Smaller subject → more headroom → lower camera (bigger 1 - headroom_rel).
        assert!(shot_small.headroom > shot_big.headroom + 1e-3);
        assert!(shot_small.camera_height < shot_big.camera_height - 1e-3);
        // Bands respected.
        assert!((0.15..=0.45).contains(&shot_small.headroom));
        assert!((0.15..=0.45).contains(&shot_big.headroom));
        assert!(
            (config.camera_height_min..=config.camera_height_max)
                .contains(&shot_small.camera_height)
        );
        assert!(
            (config.camera_height_min..=config.camera_height_max).contains(&shot_big.camera_height)
        );
    }

    #[test]
    fn rule180_violation_refuses_compliance() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config).expect("director");
        let compliant = director.direct(&mut tx, &soak_input()).expect("compliant");
        let violating = director.direct(&mut tx, &violating_input()).expect("violating");
        assert!(compliant.is_rule_compliant);
        assert!(!violating.is_rule_compliant);
        assert!(violating.rule_scores[RuleKind::Rule180.index()] < 0.5);
    }

    #[test]
    fn focal_length_follows_framing_within_range() {
        let mut tx = open_tx();
        let config = test_config();
        let mut director = AutoPhotographyDirector::new(&mut tx, config.clone()).expect("director");
        for kind in RuleKind::all() {
            director
                .set_rule(&mut tx, kind, 0.0, kind == RuleKind::LensFocalLength)
                .expect("set");
        }
        let mut tight = soak_input();
        let mut loose = soak_input();
        tight.scene.subject_width = 0.7; // tight framing → long lens
        loose.scene.subject_width = 0.15; // loose framing → short lens
        let shot_tight = director.direct(&mut tx, &tight).expect("tight");
        let shot_loose = director.direct(&mut tx, &loose).expect("loose");
        assert!(shot_tight.focal_length_mm > shot_loose.focal_length_mm + 1e-3);
        for shot in [&shot_tight, &shot_loose] {
            assert!(
                (config.min_focal_mm..=config.max_focal_mm).contains(&shot.focal_length_mm)
            );
        }
    }

    #[test]
    fn normalized_weights_of_enabled_rules_sum_to_one() {
        let mut tx = open_tx();
        let book = RuleBook::new(&mut tx).expect("book");
        let mut sum = 0.0;
        for kind in RuleKind::all() {
            sum += book.normalized_weight(kind);
        }
        assert!((sum - 1.0).abs() < 1e-4);
        // A disabled-only book has zero total weight and zero influence.
        let mut tx2 = open_tx();
        let mut book2 = RuleBook::new(&mut tx2).expect("book2");
        for kind in RuleKind::all() {
            book2.toggle(&mut tx2, kind, false).expect("disable");
        }
        assert_eq!(book2.total_weight(), 0.0);
        assert_eq!(book2.normalized_weight(RuleKind::RuleOfThirds), 0.0);
    }

    #[test]
    fn direct_is_deterministic() {
        let config = test_config();
        let (a, _) = dir_shot(&config);
        let (b, _) = dir_shot(&config);
        assert_eq!(a, b);
        assert!((a.subject_x - b.subject_x).abs() < 1e-6);
        assert!((a.focal_length_mm - b.focal_length_mm).abs() < 1e-6);
    }

    #[test]
    fn shot_values_are_finite_and_bounded() {
        let config = test_config();
        let (shot, _) = dir_shot(&config);
        assert!(shot.is_finite_and_bounded(&config));
        assert!(shot.is_rule_compliant);
        assert_eq!(shot.applied_rules.len(), 6);
        assert_eq!(shot.roll_deg, 0.0);
        assert!(shot.distance > 0.0);
    }

    #[test]
    fn composition_with_sequencing_timeline_is_zero_loss() {
        let config = test_config();
        let (shot, _) = dir_shot(&config);
        let timeline = build_timeline_from_shot(&shot);
        let composed =
            compose_cinema_frame(&timeline, 60, CinemaExportFormat::OpenExrFloat16Linear)
                .expect("compose");
        assert!(composed.is_zero_loss_master);
        assert_eq!(composed.track_sample_count, 2);
        // 1.0s → lens_focus = authored focal (constant linear track).
        let focus = composed
            .samples
            .iter()
            .find(|(n, _)| n == "lens_focus")
            .expect("lens_focus track");
        assert!((focus.1 - shot.focal_length_mm).abs() < 1e-3);
        let roll = composed
            .samples
            .iter()
            .find(|(n, _)| n == "camera_roll")
            .expect("camera_roll track");
        assert!((roll.1 - shot.roll_deg).abs() < 1e-3);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_auto_photography_director_soak();
        assert!(r.ready, "auto-photography director soak must prove readiness");
        assert!(r.deterministic);
        assert!(r.compliant_shot_ok);
        assert!(r.rule180_refusal_ok);
        assert!(r.composition_ok);
        assert!(r.tx_gate_fail_closed_ok);
        assert!(r.all_finite);
        assert!(r.replay_deterministic);
        assert_eq!(r.evidence_kind, AUTO_PHOTOGRAPHY_DIRECTOR_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        // AAA fail-closed.
        assert!(!r.auto_photography_aaa_ready);
        assert!(!r.cinematography_ai_aaa_ready);
        assert!(!r.virtual_production_aaa_ready);
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_auto_photography_director_soak();
        let b = run_auto_photography_director_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.rule_of_thirds_placed_x, b.rule_of_thirds_placed_x);
        assert_eq!(a.focal_length_mm, b.focal_length_mm);
        assert_eq!(a.ready, b.ready);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_auto_photography_director();
        let s = run_auto_photography_director_soak();
        assert_eq!(p.ready, s.ready);
        assert_eq!(p.evidence_kind, s.evidence_kind);
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.focal_length_mm, s.focal_length_mm);
        assert_eq!(p.auto_photography_aaa_ready, s.auto_photography_aaa_ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_auto_photography_director_soak();
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak()
            .evidence_fingerprint;
        let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak()
            .evidence_fingerprint;
        let ku = crate::world_forge_densification::run_world_forge_densification_soak()
            .evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak()
            .evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
            .evidence_fingerprint;
        let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak()
            .evidence_fingerprint;
        let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak()
            .evidence_fingerprint;
        let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak()
            .evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let hs = crate::unified_field_network::probe_unified_field_network()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;

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
    }
}

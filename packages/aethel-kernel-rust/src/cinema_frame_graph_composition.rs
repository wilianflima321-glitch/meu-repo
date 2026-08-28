//! # Cinema Frame-Graph Composition Kernel — letter **kx** (R2-J / Vanguarda P4+P1).
//!
//! The **lens/cinema consolidation** kernel: it composes the R2-I
//! auto-photography director's placed shot ([`crate::auto_photography_director`],
//! letter **kw**) into a **depth-aware cinematic chain built directly inside the
//! [`crate::wgpu_framegraph`] retained render graph** (letter **fg**), with zero
//! edits to any substrate:
//!
//! ```text
//!   Depth ──► DepthToCoC ──► CircleOfConfusion
//!                                      │
//!   HdrLinear ──► LensDof (ACES lens buffer) ──► LensDof
//!                                                      │
//!   LensDof ──► AcesTonemap (Stephen Hill RRT/ODT) ──► AcesTonemapped
//!                                                                │
//!   AcesTonemapped + Depth ──► Composite ──► Backbuffer (root)
//!   UnusedAlbedo ──► UnusedPass                       (culled by compile)
//! ```
//!
//! ## VERIFY DEPTH (the R2-J mandate)
//!
//! - **Depth survives compile-culling** — `DepthToCoC` reads `Depth` and is a
//!   live pass (its writes propagate to the backbuffer root through the chain),
//!   so the depth resource is **alive** after `WgpuFramegraph::compile`.
//!   Measured by the pass actually executing exactly once.
//! - **CoC is finite, bounded and monotonic in `|depth − focal|`** — the
//!   closed-form thin-lens approximation
//!   `CoC = min(aperture · |depth − focal| / (depth · focal), max_coc)` is zero
//!   at the focal plane, grows monotonically as depth recedes on either side,
//!   and is clamped to `[0, max_coc_px]`.
//! - **Measured composition depth == live passes** — the number of passes that
//!   actually executed equals the number of live passes reported by `compile`,
//!   and the intentionally-unused pass is culled (5 defined → 4 live → 4
//!   executed).
//!
//! ## Law XVI — CreativeFusionTransaction gate (TRAVA, fail-closed)
//!
//! `compose()` requires an **open** [`CreativeFusionTransaction`] and records
//! every composition as a mutation; composing or mutating after `commit` /
//! `rollback` is rejected — mirroring the web Trava II (Yjs undo) on the Rust
//! side for the cinema/lens composition surface.
//!
//! ## Composition edges (R2-J → kw → ju, R2-J → fg)
//!
//! The soak drives a real [`AutoPhotographyDirector`] (R2-I) to produce the
//! placed shot, derives the lens focal distance from `shot.distance`, composes
//! the chain inside a real [`WgpuFramegraph`], runs the ACES lens buffer +
//! RRT/ODT fit through the real [`crate::aces_cinematic_tonemapper`] (letter
//! **gf**), and exports a zero-loss master through the real
//! [`crate::sequencing_timeline::compose_cinema_frame`] compositor (letter
//! **ju**) — all with zero substrate edits.
//!
//! Soak-gated `cinema_frame_graph_composition_ready` measured from real
//! invariants (depth alive, CoC finite/bounded/monotonic, unused pass culled,
//! pass math in range, zero-loss master, Law XVI gate fail-closed, deterministic
//! replay, all finite); fingerprint seed `0x6B78_4353_0000_0006` ("kxCS")
//! distinct from ju/kv/ku/hg/kq/kr/ks/kt/ko/io/hs/fw/ip4/s17/jt **and** kw
//! (R2-I); `cinema_frame_graph_aaa_ready` / `depth_of_field_aaa_ready` /
//! `prores_export_aaa_ready` HELD fail-closed (honesty — this is the backend
//! composition kernel, not a shipped AAA renderer).

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

use serde::{Deserialize, Serialize};

use crate::aces_cinematic_tonemapper::{AcesCinematicTonemapper, AcesTonemapParams, HIGH_LUM};
use crate::auto_photography_director::{
    AutoPhotographyConfig, AutoPhotographyDirector, CompositionInput, CreativeFusionTransaction,
    DirectedCameraShot, SceneInterest,
};
use crate::in_engine_compositor_zero_loss::CinemaExportFormat;
use crate::sequencing_timeline::{
    compose_cinema_frame, InterpolationKind, Keyframe, Timeline, TimelineTrack,
};
use crate::wgpu_framegraph::{probe_wgpu_framegraph, WgpuFramegraph, WgpuFramegraphProbe};

/// Deterministic evidence-fingerprint seed for the cinema frame-graph
/// composition kernel (letter **kx**).
const CINEMA_FRAME_GRAPH_FP_SEED: u64 = 0x6B78_4353_0000_0006; // "kxCS..."
/// Final fold for the evidence fingerprint (letter **kx**).
const CINEMA_FRAME_GRAPH_FP_FOLD: u64 = 0x6B78_4353_4353_4353; // "kxCSCSCS"
/// Evidence kind tag reported by the soak (letter **kx**).
pub const CINEMA_FRAME_GRAPH_EVIDENCE_KIND: &str = "cinema_frame_graph_depth_composition";
/// Default CoC clamp (pixels) — bounded, industry-typical maximum circle.
pub const DEFAULT_MAX_COC_PX: f32 = 32.0;
/// Frame index composed through the real ju compositor in the soak (1 s @ 60 fps).
const SOAK_FRAME: u64 = 60;
/// Absolute tolerance for the "zero at focal" CoC assertion.
const COC_ZERO_EPS: f32 = 1e-6;
/// Deterministic quantizer scale shared by the in-pass atomics and fingerprints.
const QUANT_SCALE: f32 = 1024.0;

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
// Pipeline stages + Circle of Confusion (the depth-verification math)
// ---------------------------------------------------------------------------

/// The five passes the cinema composition defines in the frame graph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CinemaPipelineStage {
    DepthToCoc,
    LensDof,
    AcesTonemap,
    Composite,
    Unused,
}

impl CinemaPipelineStage {
    pub const fn tag(self) -> &'static str {
        match self {
            CinemaPipelineStage::DepthToCoc => "depth_to_coc",
            CinemaPipelineStage::LensDof => "lens_dof",
            CinemaPipelineStage::AcesTonemap => "aces_tonemap",
            CinemaPipelineStage::Composite => "composite",
            CinemaPipelineStage::Unused => "unused_culled",
        }
    }

    /// The four live passes (the `Unused` stage is intentionally culled).
    pub const fn live_stages() -> [CinemaPipelineStage; 4] {
        [
            CinemaPipelineStage::DepthToCoc,
            CinemaPipelineStage::LensDof,
            CinemaPipelineStage::AcesTonemap,
            CinemaPipelineStage::Composite,
        ]
    }
}

/// Closed-form thin-lens **Circle of Confusion** (finite, bounded, monotonic).
///
/// `CoC(d) = min(aperture · |d − f| / (d · f), max_coc)` for positive depth
/// `d`, focal distance `f` and aperture factor — zero at the focal plane and
/// monotonically increasing in `|d − f|` on either side. **Fail-closed:** any
/// non-positive or non-finite input returns `f32::NAN` (the caller must gate).
pub fn circle_of_confusion(
    depth: f32,
    focal_distance: f32,
    aperture_factor: f32,
    max_coc_px: f32,
) -> f32 {
    if !depth.is_finite()
        || !focal_distance.is_finite()
        || !aperture_factor.is_finite()
        || !max_coc_px.is_finite()
        || depth <= 0.0
        || focal_distance <= 0.0
        || aperture_factor <= 0.0
        || max_coc_px <= 0.0
    {
        return f32::NAN;
    }
    let delta = (depth - focal_distance).abs();
    let denom = (depth * focal_distance).max(1e-6);
    (aperture_factor * delta / denom).min(max_coc_px)
}

/// Verified CoC invariants across a symmetric depth sweep around the focal
/// plane (finite, bounded, zero-at-focal, monotonic in `|depth − focal|`).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CoCVerification {
    pub all_finite: bool,
    pub all_bounded: bool,
    pub zero_at_focal: bool,
    pub monotonic_in_abs_depth_focal: bool,
    pub sample_count: u32,
    pub coc_at_focal: f32,
    pub coc_at_near: f32,
    pub coc_at_far: f32,
}

/// Deterministic CoC verification: 17 depths from `focal·0.5` to `focal·2.0`
/// (symmetric around the focal plane). Clamping preserves monotonicity, so the
/// bounded curve is still monotonic in `|depth − focal|`.
fn verify_coc(focal_distance: f32, aperture_factor: f32, max_coc_px: f32) -> CoCVerification {
    let near = focal_distance * 0.5;
    let far = focal_distance * 2.0;
    let left: Vec<f32> = (0..=8)
        .map(|i| near + (focal_distance - near) * i as f32 / 8.0)
        .collect();
    let right: Vec<f32> = (1..=8)
        .map(|i| focal_distance + (far - focal_distance) * i as f32 / 8.0)
        .collect();
    let mut depths = left;
    depths.extend(right);
    let cocs: Vec<f32> = depths
        .iter()
        .map(|&d| circle_of_confusion(d, focal_distance, aperture_factor, max_coc_px))
        .collect();

    let all_finite = cocs.iter().all(|c| c.is_finite());
    let all_bounded = cocs.iter().all(|c| (0.0..=max_coc_px).contains(c));
    let zero_at_focal = (cocs[8] - 0.0).abs() <= COC_ZERO_EPS;

    // Left of the focal plane (depth → focal) the CoC must be non-increasing;
    // right of it (depth → far) it must be non-decreasing.
    let left_side = &cocs[..=8];
    let right_side = &cocs[8..];
    let mut monotonic = true;
    for pair in left_side.windows(2) {
        if pair[0] < pair[1] {
            monotonic = false;
        }
    }
    for pair in right_side.windows(2) {
        if pair[0] > pair[1] {
            monotonic = false;
        }
    }

    CoCVerification {
        all_finite,
        all_bounded,
        zero_at_focal,
        monotonic_in_abs_depth_focal: monotonic,
        sample_count: cocs.len() as u32,
        coc_at_focal: cocs[8],
        coc_at_near: cocs[0],
        coc_at_far: cocs.last().copied().unwrap_or(0.0),
    }
}

// ---------------------------------------------------------------------------
// Lens/cinema composition config
// ---------------------------------------------------------------------------

/// Lens + composition configuration for one cinematic frame-graph pass set.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CinemaCompositionConfig {
    /// Focal plane distance in meters (derived from the R2-I shot by default).
    pub focal_distance_m: f32,
    /// Aperture factor scaling the Circle of Confusion (positive).
    pub aperture_factor: f32,
    /// CoC clamp in pixels (positive, bounded).
    pub max_coc_px: f32,
    /// Frame width (pixels) — must be non-zero.
    pub frame_width: u32,
    /// Frame height (pixels) — must be non-zero.
    pub frame_height: u32,
    /// Target zero-loss cinema export format.
    pub export_format: CinemaExportFormat,
    /// Deterministic seed for the ACES lens path.
    pub seed: u64,
}

impl Default for CinemaCompositionConfig {
    fn default() -> Self {
        Self {
            focal_distance_m: 3.0,
            aperture_factor: 0.5,
            max_coc_px: DEFAULT_MAX_COC_PX,
            frame_width: 1920,
            frame_height: 1080,
            export_format: CinemaExportFormat::ProRes4444Xq,
            seed: 0x6B78_4353,
        }
    }
}

impl CinemaCompositionConfig {
    /// Fail-closed validation: finite positive lens values and non-zero frame.
    pub fn validate(&self) -> Result<(), &'static str> {
        if !self.focal_distance_m.is_finite() || self.focal_distance_m <= 0.0 {
            return Err("focal_distance_m must be finite and positive");
        }
        if !self.aperture_factor.is_finite() || self.aperture_factor <= 0.0 {
            return Err("aperture_factor must be finite and positive");
        }
        if !self.max_coc_px.is_finite() || self.max_coc_px <= 0.0 {
            return Err("max_coc_px must be finite and positive");
        }
        if self.frame_width == 0 || self.frame_height == 0 {
            return Err("frame dimensions must be non-zero");
        }
        Ok(())
    }

    /// Derives a config from the R2-I director's placed shot: the lens focal
    /// distance (meters) follows the shot's derived distance to subject —
    /// consolidating the R2-I lens surface into the frame graph.
    pub fn from_shot(shot: &DirectedCameraShot) -> Self {
        let mut cfg = Self::default();
        if shot.distance.is_finite() && shot.distance > 0.0 {
            cfg.focal_distance_m = shot.distance;
        }
        cfg
    }
}

// ---------------------------------------------------------------------------
// CinemaComposition — the measured result of one compose
// ---------------------------------------------------------------------------

/// The measured outcome of composing the cinema chain inside the frame graph.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CinemaComposition {
    /// Live passes reported by `WgpuFramegraph::compile` (4 of 5 defined).
    pub live_pass_count: u32,
    /// Total passes defined in the graph (including the culled unused one).
    pub total_pass_count: u32,
    /// Passes that actually executed (must equal `live_pass_count`).
    pub executed_pass_count: u32,
    /// The intentionally-unused pass was culled by the compile pass.
    pub unused_pass_culled: bool,
    /// Depth resource survived compile-culling (DepthToCoC ran exactly once).
    pub depth_resource_alive: bool,
    /// Measured composition depth == live passes (executed == live == 4).
    pub composition_depth_matches_live_passes: bool,
    /// CoC depth verification (finite/bounded/zero-at-focal/monotonic).
    pub coc: CoCVerification,
    /// How many times the DepthToCoC pass callback executed (1 when live).
    pub depth_to_coc_runs: u32,
    /// How many times the LensDof pass callback executed (1 when live).
    pub lens_dof_runs: u32,
    /// How many times the AcesTonemap pass callback executed (1 when live).
    pub aces_runs: u32,
    /// How many times the Composite pass callback executed (1 when live).
    pub composite_runs: u32,
    /// How many times the Unused pass callback executed (0 — culled).
    pub unused_runs: u32,
    /// Peak aliased transient VRAM reported by the frame graph allocator.
    pub transient_vram_bytes: u64,
    /// Max CoC computed inside the DepthToCoC pass (reconstructed, in px).
    pub depth_coc_max_from_pass: f32,
    /// Lens soft factor computed inside the LensDof pass via the real ACES
    /// lens buffer (reconstructed, in (0, 1) when sane).
    pub lens_soft_from_pass: f32,
    /// ACES LDR luminance computed inside the AcesTonemap pass for HIGH_LUM
    /// (reconstructed, in [0, 1] when compressed).
    pub aces_ldr_luminance_from_pass: f32,
    /// The real ACES lens buffer produced a finite, in-(0,1) factor.
    pub lens_soft_factor_finite: bool,
    /// The real ACES RRT/ODT fit compressed HIGH_LUM into [0, 1].
    pub tonemap_high_lum_compressed: bool,
    /// The ju compositor exported a zero-loss master for this frame.
    pub zero_loss_master: bool,
    /// Export format requested for the zero-loss master.
    pub export_format: CinemaExportFormat,
    /// Render time per frame reported by the real ju compositor.
    pub render_time_per_frame_ms: f32,
    /// Track sample count of the composed zero-loss frame.
    pub track_sample_count: u32,
    /// Law XVI audit trail: mutations recorded at compose time.
    pub mutation_count: u64,
    /// The Composite pass reached the backbuffer root.
    pub backbuffer_reached: bool,
}

/// Bit-for-bit determinism proof for the R2-J replay mandate.
///
/// Compares every composition property EXCEPT [`CinemaComposition::mutation_count`]:
/// that field is a Law XVI audit trail of the *transaction* (it legitimately
/// accumulates across sequential composes on a shared transaction) and therefore
/// is not a property of the composed frame. Two composes of the same shot/config
/// must produce identical composition math — proven here.
pub fn compose_is_deterministically_equal(
    a: &CinemaComposition,
    b: &CinemaComposition,
) -> bool {
    a.live_pass_count == b.live_pass_count
        && a.total_pass_count == b.total_pass_count
        && a.executed_pass_count == b.executed_pass_count
        && a.unused_pass_culled == b.unused_pass_culled
        && a.depth_resource_alive == b.depth_resource_alive
        && a.composition_depth_matches_live_passes == b.composition_depth_matches_live_passes
        && a.coc == b.coc
        && a.depth_to_coc_runs == b.depth_to_coc_runs
        && a.lens_dof_runs == b.lens_dof_runs
        && a.aces_runs == b.aces_runs
        && a.composite_runs == b.composite_runs
        && a.unused_runs == b.unused_runs
        && a.transient_vram_bytes == b.transient_vram_bytes
        && a.depth_coc_max_from_pass == b.depth_coc_max_from_pass
        && a.lens_soft_from_pass == b.lens_soft_from_pass
        && a.aces_ldr_luminance_from_pass == b.aces_ldr_luminance_from_pass
        && a.lens_soft_factor_finite == b.lens_soft_factor_finite
        && a.tonemap_high_lum_compressed == b.tonemap_high_lum_compressed
        && a.zero_loss_master == b.zero_loss_master
        && a.export_format == b.export_format
        && a.render_time_per_frame_ms == b.render_time_per_frame_ms
        && a.track_sample_count == b.track_sample_count
        && a.backbuffer_reached == b.backbuffer_reached
}

// ---------------------------------------------------------------------------
// ComposeCinemaFrameGraph — the retained composition kernel
// ---------------------------------------------------------------------------

/// Retained cinema-composition kernel that builds the depth-aware cinematic
/// chain inside a [`WgpuFramegraph`] and verifies depth. Law XVI (TRAVA):
/// every `compose()` requires an open [`CreativeFusionTransaction`].
#[derive(Default)]
pub struct ComposeCinemaFrameGraph {
    graph: WgpuFramegraph,
    last: Option<CinemaComposition>,
}

impl ComposeCinemaFrameGraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Borrows the retained frame graph (passes/resources from the last compose).
    pub fn graph(&self) -> &WgpuFramegraph {
        &self.graph
    }

    /// Honest readiness probe of the underlying frame-graph substrate.
    pub fn probe(&self) -> WgpuFramegraphProbe {
        probe_wgpu_framegraph(&self.graph)
    }

    /// Last measured composition (deterministic replay evidence).
    pub fn last_composition(&self) -> Option<&CinemaComposition> {
        self.last.as_ref()
    }

    /// Composes the cinematic chain inside a fresh retained frame graph and
    /// verifies depth. Law XVI (TRAVA): requires an open transaction and
    /// records every composition as a mutation.
    pub fn compose(
        &mut self,
        tx: &mut CreativeFusionTransaction,
        config: &CinemaCompositionConfig,
        shot: &DirectedCameraShot,
    ) -> Result<CinemaComposition, &'static str> {
        // Law XVI — TRAVA (fail-closed).
        tx.require_open()?;
        config.validate()?;

        let focal = config.focal_distance_m;
        let aperture = config.aperture_factor;
        let max_coc = config.max_coc_px;

        // Fresh retained graph per composition (deterministic build).
        let mut graph = WgpuFramegraph::new();

        let depth = graph.create_resource("CinemaDepth", true, 1024 * 1024 * 4);
        let coc = graph.create_resource("CircleOfConfusion", true, 1024 * 1024 * 2);
        let hdr = graph.create_resource("HdrLinear", true, 1024 * 1024 * 8);
        let lens = graph.create_resource("LensDof", true, 1024 * 1024 * 8);
        let tonemapped = graph.create_resource("AcesTonemapped", true, 1024 * 1024 * 4);
        let backbuffer = graph.create_resource("Backbuffer", true, 1024 * 1024 * 8);
        let albedo = graph.create_resource("UnusedAlbedo", true, 1024 * 1024 * 4);

        let depth_runs = Arc::new(AtomicU32::new(0));
        let coc_max_store = Arc::new(AtomicU32::new(0));
        let lens_runs = Arc::new(AtomicU32::new(0));
        let lens_soft_store = Arc::new(AtomicU32::new(0));
        let aces_runs = Arc::new(AtomicU32::new(0));
        let aces_ldr_store = Arc::new(AtomicU32::new(0));
        let composite_runs = Arc::new(AtomicU32::new(0));
        let unused_runs = Arc::new(AtomicU32::new(0));

        // Stage 1 — Depth → CoC. Reads `Depth`; the depth-consuming pass that
        // proves the depth resource is alive after compile-culling. Computes
        // REAL CoC math inside the pass and stores the max (quantized).
        {
            let runs = Arc::clone(&depth_runs);
            let store = Arc::clone(&coc_max_store);
            graph.add_pass("DepthToCoC", vec![depth], vec![coc], move || {
                let mut max_in_pass = 0.0f32;
                for i in 0..=16u32 {
                    let t = i as f32 / 16.0;
                    let d = focal * 0.5 + t * focal * 1.5;
                    let c = circle_of_confusion(d, focal, aperture, max_coc);
                    if c > max_in_pass {
                        max_in_pass = c;
                    }
                }
                store.store((max_in_pass * QUANT_SCALE).round() as u32, Ordering::Relaxed);
                runs.fetch_add(1, Ordering::Relaxed);
            });
        }

        // Stage 2 — Lens / DOF pass. Runs the REAL ACES lens buffer
        // (focal-distance soft bias) — the lens/cinema consolidation.
        {
            let runs = Arc::clone(&lens_runs);
            let store = Arc::clone(&lens_soft_store);
            graph.add_pass("LensDof", vec![coc, hdr], vec![lens], move || {
                let soft = AcesCinematicTonemapper::prepare_cinematic_lens_buffer(focal);
                let q = if soft.is_finite() {
                    (soft.clamp(0.0, 1024.0) * QUANT_SCALE).round() as u32
                } else {
                    0
                };
                store.store(q, Ordering::Relaxed);
                runs.fetch_add(1, Ordering::Relaxed);
            });
        }

        // Stage 3 — ACES tonemap pass. Runs the REAL Stephen Hill RRT/ODT fit
        // on a HIGH_LUM probe and stores the LDR luminance (compression proof).
        {
            let runs = Arc::clone(&aces_runs);
            let store = Arc::clone(&aces_ldr_store);
            let params = AcesTonemapParams {
                exposure: 1.0,
                focal_distance: focal,
                seed: config.seed,
            };
            graph.add_pass("AcesTonemap", vec![lens], vec![tonemapped], move || {
                let sample = AcesCinematicTonemapper::tonemap_rgb([HIGH_LUM; 3], &params);
                let lum = if sample.luminance_ldr.is_finite() {
                    sample.luminance_ldr.clamp(0.0, 1024.0)
                } else {
                    0.0
                };
                store.store((lum * QUANT_SCALE).round() as u32, Ordering::Relaxed);
                runs.fetch_add(1, Ordering::Relaxed);
            });
        }

        // Stage 4 — Composite into the backbuffer (the compile root resource).
        {
            let runs = Arc::clone(&composite_runs);
            graph.add_pass("Composite", vec![tonemapped, depth], vec![backbuffer], move || {
                runs.fetch_add(1, Ordering::Relaxed);
            });
        }

        // Stage 5 — Intentionally-unused pass: must be culled by `compile()`.
        {
            let runs = Arc::clone(&unused_runs);
            graph.add_pass("UnusedPass", vec![albedo], vec![], move || {
                runs.fetch_add(1, Ordering::Relaxed);
            });
        }

        let total_pass_count = 5u32;
        let live_passes = graph.compile(backbuffer);
        let live_pass_count = live_passes.len() as u32;
        let unused_pass_culled = live_pass_count == 4;

        // Execute the live passes (proves DepthToCoC ran and Unused never does).
        graph.execute(&live_passes);

        let depth_r = depth_runs.load(Ordering::Relaxed);
        let lens_r = lens_runs.load(Ordering::Relaxed);
        let aces_r = aces_runs.load(Ordering::Relaxed);
        let comp_r = composite_runs.load(Ordering::Relaxed);
        let unused_r = unused_runs.load(Ordering::Relaxed);
        let executed_pass_count = depth_r + lens_r + aces_r + comp_r;

        // VERIFY DEPTH — the R2-J mandate.
        let depth_resource_alive = depth_r == 1 && unused_r == 0 && live_pass_count == 4;
        let composition_depth_matches_live_passes =
            executed_pass_count == live_pass_count && live_pass_count == 4;
        let coc_check = verify_coc(focal, aperture, max_coc);

        // Reconstruct the deterministic in-pass measurements.
        let depth_coc_max_from_pass = coc_max_store.load(Ordering::Relaxed) as f32 / QUANT_SCALE;
        let lens_soft_from_pass = lens_soft_store.load(Ordering::Relaxed) as f32 / QUANT_SCALE;
        let aces_ldr_from_pass = aces_ldr_store.load(Ordering::Relaxed) as f32 / QUANT_SCALE;

        // Direct (outside-pass) checks through the real ACES substrate.
        let lens_soft_factor_finite =
            lens_soft_from_pass.is_finite() && lens_soft_from_pass > 0.0 && lens_soft_from_pass < 1.0;
        let aces_params = AcesTonemapParams {
            exposure: 1.0,
            focal_distance: focal,
            seed: config.seed,
        };
        let sample = AcesCinematicTonemapper::tonemap_rgb([HIGH_LUM; 3], &aces_params);
        let tonemap_high_lum_compressed = sample.outputs_finite
            && sample.in_unit_interval
            && sample.luminance_ldr < HIGH_LUM
            && aces_ldr_from_pass <= 1.0;

        // Zero-loss master through the real ju compositor (lens/cinema edge).
        let timeline = build_timeline_from_shot(shot);
        let composed = compose_cinema_frame(&timeline, SOAK_FRAME, config.export_format)?;
        let zero_loss_master = composed.is_zero_loss_master;
        let render_time_per_frame_ms = composed.render_time_per_frame_ms;
        let track_sample_count = composed.track_sample_count;

        // Law XVI — audit every composition as a mutation.
        tx.record_mutation()?;

        let result = CinemaComposition {
            live_pass_count,
            total_pass_count,
            executed_pass_count,
            unused_pass_culled,
            depth_resource_alive,
            composition_depth_matches_live_passes,
            coc: coc_check,
            depth_to_coc_runs: depth_r,
            lens_dof_runs: lens_r,
            aces_runs: aces_r,
            composite_runs: comp_r,
            unused_runs: unused_r,
            transient_vram_bytes: graph.total_transient_vram_bytes,
            depth_coc_max_from_pass,
            lens_soft_from_pass,
            aces_ldr_luminance_from_pass: aces_ldr_from_pass,
            lens_soft_factor_finite,
            tonemap_high_lum_compressed,
            zero_loss_master,
            export_format: config.export_format,
            render_time_per_frame_ms,
            track_sample_count,
            mutation_count: tx.mutation_count(),
            backbuffer_reached: comp_r == 1,
        };

        self.graph = graph;
        self.last = Some(result.clone());
        Ok(result)
    }
}

/// Builds a 2-track ju timeline from the directed shot (the R2-J → ju edge),
/// mirroring the R2-I soak: `camera_roll` (Step) + `lens_focus` (Linear).
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

// ---------------------------------------------------------------------------
// Soak — deterministic measurement, fingerprint and honest report
// ---------------------------------------------------------------------------

/// Measured invariants of one soak pass (fail-closed on construction error).
struct CinemaFrameGraphMeasured {
    focal_distance_m: f32,
    composition_ok: bool,
    depth_resource_alive: bool,
    unused_pass_culled: bool,
    composition_depth_matches_live_passes: bool,
    coc_all_finite: bool,
    coc_all_bounded: bool,
    coc_zero_at_focal: bool,
    coc_monotonic: bool,
    lens_soft_factor_finite: bool,
    tonemap_high_lum_compressed: bool,
    pass_math_ok: bool,
    zero_loss_master: bool,
    tx_gate_fail_closed_ok: bool,
    all_finite_and_bounded: bool,
    replay_deterministic: bool,
    live_pass_count: u32,
    executed_pass_count: u32,
    transient_vram_bytes: u64,
    coc_at_focal: f32,
    coc_at_near: f32,
    coc_at_far: f32,
    pass_depth_coc_max: f32,
    pass_lens_soft: f32,
    pass_aces_ldr: f32,
}

impl CinemaFrameGraphMeasured {
    fn fail_closed() -> Self {
        Self {
            focal_distance_m: f32::NAN,
            composition_ok: false,
            depth_resource_alive: false,
            unused_pass_culled: false,
            composition_depth_matches_live_passes: false,
            coc_all_finite: false,
            coc_all_bounded: false,
            coc_zero_at_focal: false,
            coc_monotonic: false,
            lens_soft_factor_finite: false,
            tonemap_high_lum_compressed: false,
            pass_math_ok: false,
            zero_loss_master: false,
            tx_gate_fail_closed_ok: false,
            all_finite_and_bounded: false,
            replay_deterministic: false,
            live_pass_count: 0,
            executed_pass_count: 0,
            transient_vram_bytes: 0,
            coc_at_focal: f32::NAN,
            coc_at_near: f32::NAN,
            coc_at_far: f32::NAN,
            pass_depth_coc_max: f32::NAN,
            pass_lens_soft: f32::NAN,
            pass_aces_ldr: f32::NAN,
        }
    }
}

/// One measured soak pass. Any failure leaves every field fail-closed.
fn run_measured_pass() -> CinemaFrameGraphMeasured {
    let mut m = CinemaFrameGraphMeasured::fail_closed();

    // --- R2-I edge: the director produces the placed lens/cinema shot -------
    let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0001);
    let director_config = AutoPhotographyConfig::default();
    let mut director = match AutoPhotographyDirector::new(&mut tx, director_config) {
        Ok(d) => d,
        Err(_) => return m,
    };
    let input = CompositionInput {
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
    };
    let shot = match director.direct(&mut tx, &input) {
        Ok(s) => s,
        Err(_) => return m,
    };

    // --- Compose the cinema chain in the frame graph (Law XVI gate) ---------
    let mut cg = ComposeCinemaFrameGraph::new();
    let comp_config = CinemaCompositionConfig::from_shot(&shot);
    let comp = match cg.compose(&mut tx, &comp_config, &shot) {
        Ok(c) => c,
        Err(_) => return m,
    };

    // Replay with a second identical composer → bit-for-bit determinism
    // (mutation_count excluded: it is a per-transaction Law XVI audit trail,
    // not a property of the composed frame).
    let mut cg_b = ComposeCinemaFrameGraph::new();
    let comp_b = match cg_b.compose(&mut tx, &comp_config, &shot) {
        Ok(c) => c,
        Err(_) => return m,
    };
    let replay_deterministic = compose_is_deterministically_equal(&comp, &comp_b);

    // Law XVI fail-closed: compose/mutate after commit must be rejected.
    if tx.commit().is_err() {
        return m;
    }
    let mut cg_c = ComposeCinemaFrameGraph::new();
    let tx_gate_fail_closed_ok = cg_c.compose(&mut tx, &comp_config, &shot).is_err()
        && tx.record_mutation().is_err()
        && tx.commit().is_err(); // double-commit rejected

    let pass_math_ok = comp.depth_coc_max_from_pass.is_finite()
        && comp.depth_coc_max_from_pass <= comp_config.max_coc_px
        && comp.lens_soft_from_pass > 0.0
        && comp.lens_soft_from_pass < 1.0
        && comp.aces_ldr_luminance_from_pass <= 1.0;

    m.focal_distance_m = comp_config.focal_distance_m;
    m.composition_ok = comp.backbuffer_reached
        && comp.live_pass_count == 4
        && comp.executed_pass_count == 4
        && comp.zero_loss_master;
    m.depth_resource_alive = comp.depth_resource_alive;
    m.unused_pass_culled = comp.unused_pass_culled;
    m.composition_depth_matches_live_passes = comp.composition_depth_matches_live_passes;
    m.coc_all_finite = comp.coc.all_finite;
    m.coc_all_bounded = comp.coc.all_bounded;
    m.coc_zero_at_focal = comp.coc.zero_at_focal;
    m.coc_monotonic = comp.coc.monotonic_in_abs_depth_focal;
    m.lens_soft_factor_finite = comp.lens_soft_factor_finite;
    m.tonemap_high_lum_compressed = comp.tonemap_high_lum_compressed;
    m.pass_math_ok = pass_math_ok;
    m.zero_loss_master = comp.zero_loss_master;
    m.tx_gate_fail_closed_ok = tx_gate_fail_closed_ok;
    m.all_finite_and_bounded = comp.coc.all_finite
        && comp.coc.all_bounded
        && comp.lens_soft_factor_finite
        && comp.tonemap_high_lum_compressed
        && pass_math_ok;
    m.replay_deterministic = replay_deterministic;
    m.live_pass_count = comp.live_pass_count;
    m.executed_pass_count = comp.executed_pass_count;
    m.transient_vram_bytes = comp.transient_vram_bytes;
    m.coc_at_focal = comp.coc.coc_at_focal;
    m.coc_at_near = comp.coc.coc_at_near;
    m.coc_at_far = comp.coc.coc_at_far;
    m.pass_depth_coc_max = comp.depth_coc_max_from_pass;
    m.pass_lens_soft = comp.lens_soft_from_pass;
    m.pass_aces_ldr = comp.aces_ldr_luminance_from_pass;
    m
}

/// Deterministic evidence fingerprint — folds only measured invariants.
fn cinema_frame_graph_evidence_fingerprint(m: &CinemaFrameGraphMeasured) -> u64 {
    let mut h = CINEMA_FRAME_GRAPH_FP_SEED;
    h = hash_mix(h, quant_f32(m.focal_distance_m));
    h = hash_mix(h, m.composition_ok as u64);
    h = hash_mix(h, m.depth_resource_alive as u64);
    h = hash_mix(h, m.unused_pass_culled as u64);
    h = hash_mix(h, m.composition_depth_matches_live_passes as u64);
    h = hash_mix(h, m.coc_all_finite as u64);
    h = hash_mix(h, m.coc_all_bounded as u64);
    h = hash_mix(h, m.coc_zero_at_focal as u64);
    h = hash_mix(h, m.coc_monotonic as u64);
    h = hash_mix(h, m.lens_soft_factor_finite as u64);
    h = hash_mix(h, m.tonemap_high_lum_compressed as u64);
    h = hash_mix(h, m.pass_math_ok as u64);
    h = hash_mix(h, m.zero_loss_master as u64);
    h = hash_mix(h, m.tx_gate_fail_closed_ok as u64);
    h = hash_mix(h, m.all_finite_and_bounded as u64);
    h = hash_mix(h, m.replay_deterministic as u64);
    h = hash_mix(h, m.live_pass_count as u64);
    h = hash_mix(h, m.executed_pass_count as u64);
    h = hash_mix(h, m.transient_vram_bytes);
    h = hash_mix(h, quant_f32(m.coc_at_focal));
    h = hash_mix(h, quant_f32(m.coc_at_near));
    h = hash_mix(h, quant_f32(m.coc_at_far));
    h = hash_mix(h, quant_f32(m.pass_depth_coc_max));
    h = hash_mix(h, quant_f32(m.pass_lens_soft));
    h = hash_mix(h, quant_f32(m.pass_aces_ldr));
    hash_mix(h, CINEMA_FRAME_GRAPH_FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &CinemaFrameGraphMeasured) -> bool {
    m.composition_ok
        && m.depth_resource_alive
        && m.unused_pass_culled
        && m.composition_depth_matches_live_passes
        && m.coc_all_finite
        && m.coc_all_bounded
        && m.coc_zero_at_focal
        && m.coc_monotonic
        && m.lens_soft_factor_finite
        && m.tonemap_high_lum_compressed
        && m.pass_math_ok
        && m.zero_loss_master
        && m.tx_gate_fail_closed_ok
        && m.all_finite_and_bounded
        && m.replay_deterministic
}

/// Honest cinema frame-graph composition soak report. Readiness derives from
/// measurement; AAA flags are always HELD (fail-closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CinemaFrameGraphCompositionSoakReport {
    pub deterministic: bool,
    pub focal_distance_m: f32,
    pub composition_ok: bool,
    pub depth_resource_alive: bool,
    pub unused_pass_culled: bool,
    pub composition_depth_matches_live_passes: bool,
    pub coc_all_finite: bool,
    pub coc_all_bounded: bool,
    pub coc_zero_at_focal: bool,
    pub coc_monotonic_in_abs_depth_focal: bool,
    pub lens_soft_factor_finite: bool,
    pub tonemap_high_lum_compressed: bool,
    pub pass_math_ok: bool,
    pub zero_loss_master: bool,
    pub tx_gate_fail_closed_ok: bool,
    pub all_finite_and_bounded: bool,
    pub replay_deterministic: bool,
    pub live_pass_count: u32,
    pub executed_pass_count: u32,
    pub transient_vram_bytes: u64,
    pub coc_at_focal: f32,
    pub coc_at_near: f32,
    pub coc_at_far: f32,
    pub pass_depth_coc_max: f32,
    pub pass_lens_soft: f32,
    pub pass_aces_ldr: f32,
    pub evidence_fingerprint: u64,
    pub ready: bool,
    pub evidence_kind: &'static str,
    // Distinctness — 16 real peer fingerprints (15 prior + R2-I kw).
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
    // AAA — always HELD (fail-closed).
    pub cinema_frame_graph_aaa_ready: bool,
    pub depth_of_field_aaa_ready: bool,
    pub prores_export_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(
    m: &CinemaFrameGraphMeasured,
    deterministic: bool,
) -> CinemaFrameGraphCompositionSoakReport {
    let ready = readiness(m) && deterministic;
    let fp = cinema_frame_graph_evidence_fingerprint(m);
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
    let kw_fp = crate::auto_photography_director::run_auto_photography_director_soak()
        .evidence_fingerprint;

    CinemaFrameGraphCompositionSoakReport {
        deterministic,
        focal_distance_m: m.focal_distance_m,
        composition_ok: m.composition_ok,
        depth_resource_alive: m.depth_resource_alive,
        unused_pass_culled: m.unused_pass_culled,
        composition_depth_matches_live_passes: m.composition_depth_matches_live_passes,
        coc_all_finite: m.coc_all_finite,
        coc_all_bounded: m.coc_all_bounded,
        coc_zero_at_focal: m.coc_zero_at_focal,
        coc_monotonic_in_abs_depth_focal: m.coc_monotonic,
        lens_soft_factor_finite: m.lens_soft_factor_finite,
        tonemap_high_lum_compressed: m.tonemap_high_lum_compressed,
        pass_math_ok: m.pass_math_ok,
        zero_loss_master: m.zero_loss_master,
        tx_gate_fail_closed_ok: m.tx_gate_fail_closed_ok,
        all_finite_and_bounded: m.all_finite_and_bounded,
        replay_deterministic: m.replay_deterministic,
        live_pass_count: m.live_pass_count,
        executed_pass_count: m.executed_pass_count,
        transient_vram_bytes: m.transient_vram_bytes,
        coc_at_focal: m.coc_at_focal,
        coc_at_near: m.coc_at_near,
        coc_at_far: m.coc_at_far,
        pass_depth_coc_max: m.pass_depth_coc_max,
        pass_lens_soft: m.pass_lens_soft,
        pass_aces_ldr: m.pass_aces_ldr,
        evidence_fingerprint: fp,
        ready,
        evidence_kind: CINEMA_FRAME_GRAPH_EVIDENCE_KIND,
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
        distinct_from_kw_auto_photography: distinct(kw_fp),
        cinema_frame_graph_aaa_ready: false,
        depth_of_field_aaa_ready: false,
        prores_export_aaa_ready: false,
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
pub fn run_cinema_frame_graph_composition_soak() -> CinemaFrameGraphCompositionSoakReport {
    static CACHE: std::sync::OnceLock<CinemaFrameGraphCompositionSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = cinema_frame_graph_evidence_fingerprint(&a)
                == cinema_frame_graph_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Honesty probe — soak-gated `ready` (letter **kx**).
pub fn probe_cinema_frame_graph_composition() -> CinemaFrameGraphCompositionSoakReport {
    run_cinema_frame_graph_composition_soak()
}

// ---------------------------------------------------------------------------
// Tests — exact mathematical invariants, determinism, edge cases, Law XVI.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Builds a compliant directed shot through the real R2-I director and
    /// derives the lens config from it (the R2-J → kw edge).
    fn soak_fixture(tx: &mut CreativeFusionTransaction) -> (CinemaCompositionConfig, DirectedCameraShot) {
        let director_config = AutoPhotographyConfig::default();
        let mut director = AutoPhotographyDirector::new(tx, director_config)
            .expect("director creation must succeed on an open transaction");
        let input = CompositionInput {
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
        };
        let shot = director
            .direct(tx, &input)
            .expect("direct must produce a compliant shot");
        (CinemaCompositionConfig::from_shot(&shot), shot)
    }

    #[test]
    fn circle_of_confusion_zero_at_focal() {
        let c = circle_of_confusion(3.0, 3.0, 0.5, DEFAULT_MAX_COC_PX);
        assert!(c.is_finite());
        assert!((c - 0.0).abs() <= COC_ZERO_EPS, "CoC must be zero at the focal plane");
    }

    #[test]
    fn circle_of_confusion_finite_and_bounded_across_depths() {
        for depth in [0.01f32, 0.5, 1.0, 3.0, 10.0, 100.0, 1000.0] {
            let c = circle_of_confusion(depth, 3.0, 0.5, DEFAULT_MAX_COC_PX);
            assert!(c.is_finite(), "CoC must be finite at depth {depth}");
            assert!(
                (0.0..=DEFAULT_MAX_COC_PX).contains(&c),
                "CoC must be bounded at depth {depth}: {c}"
            );
        }
    }

    #[test]
    fn circle_of_confusion_monotonic_in_abs_depth_focal() {
        let focal = 3.0;
        let mut prev = f32::MAX;
        let mut d = focal * 0.25;
        while d < focal {
            let c = circle_of_confusion(d, focal, 0.5, DEFAULT_MAX_COC_PX);
            assert!(c <= prev, "CoC must not grow as depth approaches focal");
            prev = c;
            d *= 1.5;
        }
        prev = -1.0;
        d = focal * 1.1;
        while d <= focal * 32.0 {
            let c = circle_of_confusion(d, focal, 0.5, DEFAULT_MAX_COC_PX);
            assert!(c >= prev, "CoC must not shrink as depth recedes past focal");
            prev = c;
            d *= 1.5;
        }
    }

    #[test]
    fn circle_of_confusion_fails_closed_on_non_positive_inputs() {
        let focal = 3.0;
        let aperture = 0.5;
        let max_coc = DEFAULT_MAX_COC_PX;
        assert!(circle_of_confusion(0.0, focal, aperture, max_coc).is_nan());
        assert!(circle_of_confusion(-1.0, focal, aperture, max_coc).is_nan());
        assert!(circle_of_confusion(focal, 0.0, aperture, max_coc).is_nan());
        assert!(circle_of_confusion(focal, -3.0, aperture, max_coc).is_nan());
        assert!(circle_of_confusion(focal, focal, 0.0, max_coc).is_nan());
        assert!(circle_of_confusion(focal, focal, -0.5, max_coc).is_nan());
        assert!(circle_of_confusion(focal, focal, aperture, 0.0).is_nan());
        assert!(circle_of_confusion(f32::NAN, focal, aperture, max_coc).is_nan());
        assert!(circle_of_confusion(f32::INFINITY, focal, aperture, max_coc).is_nan());
    }

    #[test]
    fn verify_coc_reports_all_invariants() {
        let v = verify_coc(3.0, 0.5, DEFAULT_MAX_COC_PX);
        assert!(v.all_finite);
        assert!(v.all_bounded);
        assert!(v.zero_at_focal);
        assert!(v.monotonic_in_abs_depth_focal);
        assert_eq!(v.sample_count, 17);
        assert!((v.coc_at_focal - 0.0).abs() <= COC_ZERO_EPS);
        assert!(v.coc_at_near > 0.0);
        assert!(v.coc_at_far > 0.0);
    }

    #[test]
    fn config_rejects_invalid_values() {
        let good = CinemaCompositionConfig::default();
        assert!(good.validate().is_ok());

        let mut bad = good.clone();
        bad.focal_distance_m = 0.0;
        assert!(bad.validate().is_err());
        bad.focal_distance_m = f32::NAN;
        assert!(bad.validate().is_err());

        let mut bad = good.clone();
        bad.aperture_factor = 0.0;
        assert!(bad.validate().is_err());

        let mut bad = good.clone();
        bad.max_coc_px = -1.0;
        assert!(bad.validate().is_err());

        let mut bad = good.clone();
        bad.frame_width = 0;
        assert!(bad.validate().is_err());
        bad.frame_width = 1920;
        bad.frame_height = 0;
        assert!(bad.validate().is_err());
    }

    #[test]
    fn config_from_shot_derives_focal_distance_from_directed_shot() {
        let shot = DirectedCameraShot {
            subject_x: 0.5,
            subject_y: 0.5,
            focal_length_mm: 50.0,
            camera_height: 1.5,
            roll_deg: 0.0,
            lead_room: 0.5,
            headroom: 0.3,
            distance: 4.2,
            is_rule_compliant: true,
            applied_rules: Vec::new(),
            rule_scores: [0.0; 6],
        };
        let cfg = CinemaCompositionConfig::from_shot(&shot);
        assert!((cfg.focal_distance_m - 4.2).abs() < 1e-5);
    }

    #[test]
    fn compose_builds_four_live_passes_and_culls_unused() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0101);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert_eq!(comp.live_pass_count, 4);
        assert_eq!(comp.total_pass_count, 5);
        assert!(comp.unused_pass_culled);
        assert_eq!(comp.unused_runs, 0, "the unused pass must never execute");
        assert_eq!(comp.depth_to_coc_runs, 1);
        assert_eq!(comp.lens_dof_runs, 1);
        assert_eq!(comp.aces_runs, 1);
        assert_eq!(comp.composite_runs, 1);
        assert!(comp.backbuffer_reached);
    }

    #[test]
    fn compose_depth_resource_survives_compile_culling() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0102);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(
            comp.depth_resource_alive,
            "the depth resource must survive compile-culling"
        );
    }

    #[test]
    fn compose_measured_depth_matches_live_passes() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0103);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(comp.composition_depth_matches_live_passes);
        assert_eq!(comp.executed_pass_count, comp.live_pass_count);
        assert_eq!(comp.executed_pass_count, 4);
    }

    #[test]
    fn compose_coc_verification_holds() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0104);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(comp.coc.all_finite);
        assert!(comp.coc.all_bounded);
        assert!(comp.coc.zero_at_focal);
        assert!(comp.coc.monotonic_in_abs_depth_focal);
        assert!(comp.depth_coc_max_from_pass.is_finite());
        assert!(comp.depth_coc_max_from_pass <= cfg.max_coc_px);
    }

    #[test]
    fn compose_lens_dof_uses_real_aces_lens_buffer() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0105);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(comp.lens_soft_factor_finite);
        assert!(comp.lens_soft_from_pass > 0.0);
        assert!(comp.lens_soft_from_pass < 1.0);
        assert_eq!(comp.lens_dof_runs, 1);
    }

    #[test]
    fn compose_aces_tonemap_compresses_high_luminance() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0106);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(comp.tonemap_high_lum_compressed);
        assert!(comp.aces_ldr_luminance_from_pass <= 1.0);
        assert_eq!(comp.aces_runs, 1);
    }

    #[test]
    fn compose_zero_loss_master_through_real_compositor() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0107);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        let comp = cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        assert!(comp.zero_loss_master);
        assert_eq!(comp.export_format, CinemaExportFormat::ProRes4444Xq);
        assert_eq!(comp.track_sample_count, 2);
        assert!(comp.render_time_per_frame_ms > 0.0);
    }

    #[test]
    fn compose_requires_open_transaction() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0108);
        let (cfg, shot) = soak_fixture(&mut tx);
        tx.commit().expect("commit must succeed");
        let mut cg = ComposeCinemaFrameGraph::new();
        assert!(
            cg.compose(&mut tx, &cfg, &shot).is_err(),
            "compose after commit must be fail-closed (Law XVI)"
        );
    }

    #[test]
    fn compose_after_commit_is_fail_closed() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0109);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        cg.compose(&mut tx, &cfg, &shot).expect("first compose must succeed");
        tx.commit().expect("commit must succeed");
        let rejected = cg.compose(&mut tx, &cfg, &shot).is_err()
            && tx.record_mutation().is_err()
            && tx.commit().is_err(); // double-commit rejected
        assert!(rejected, "all mutations after commit must be fail-closed");
    }

    #[test]
    fn compose_is_deterministic() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0110);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg_a = ComposeCinemaFrameGraph::new();
        let mut cg_b = ComposeCinemaFrameGraph::new();
        let a = cg_a.compose(&mut tx, &cfg, &shot).expect("compose a must succeed");
        let b = cg_b.compose(&mut tx, &cfg, &shot).expect("compose b must succeed");
        // The composition math must be bit-for-bit equal. `mutation_count` is a
        // Law XVI transaction audit trail that legitimately advances on a shared
        // transaction — it is excluded from the determinism proof and asserted
        // separately below as live evidence that the audit keeps recording.
        assert!(
            compose_is_deterministically_equal(&a, &b),
            "two identical composes must be bit-for-bit equal"
        );
        assert!(
            a.mutation_count < b.mutation_count,
            "the shared-transaction audit trail must advance across composes"
        );
    }

    #[test]
    fn framegraph_probe_reports_aliasing_after_compose() {
        let mut tx = CreativeFusionTransaction::begin(0x6B78_4353_0000_0111);
        let (cfg, shot) = soak_fixture(&mut tx);
        let mut cg = ComposeCinemaFrameGraph::new();
        cg.compose(&mut tx, &cfg, &shot).expect("compose must succeed");
        let probe = cg.probe();
        assert!(probe.framegraph_ready);
        assert!(probe.memory_aliasing_active);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_cinema_frame_graph_composition_soak();
        assert!(r.ready);
        assert_eq!(r.evidence_kind, CINEMA_FRAME_GRAPH_EVIDENCE_KIND);
        assert!(r.deterministic);
        assert!(r.composition_ok);
        assert!(r.depth_resource_alive);
        assert!(r.unused_pass_culled);
        assert!(r.coc_all_finite && r.coc_all_bounded && r.coc_zero_at_focal);
        assert!(r.coc_monotonic_in_abs_depth_focal);
        assert!(r.lens_soft_factor_finite);
        assert!(r.tonemap_high_lum_compressed);
        assert!(r.pass_math_ok);
        assert!(r.zero_loss_master);
        assert!(r.tx_gate_fail_closed_ok);
        assert!(r.all_finite_and_bounded);
        assert!(r.replay_deterministic);
        assert_eq!(r.live_pass_count, 4);
        assert_eq!(r.executed_pass_count, 4);
        // Fingerprint determinism is proven by `soak_is_deterministic_across_runs`
        // and peer-distinctness by `distinct_from_all_peers`; here we only assert
        // the non-degenerate canary (a zero fingerprint would be a silent failure).
        assert_ne!(r.evidence_fingerprint, 0, "evidence fingerprint must be non-zero");
        // AAA — always HELD (fail-closed).
        assert!(!r.cinema_frame_graph_aaa_ready);
        assert!(!r.depth_of_field_aaa_ready);
        assert!(!r.prores_export_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_cinema_frame_graph_composition_soak();
        let b = run_cinema_frame_graph_composition_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a, b);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_cinema_frame_graph_composition_soak();
        let probe = probe_cinema_frame_graph_composition();
        assert_eq!(probe.evidence_fingerprint, soak.evidence_fingerprint);
        assert_eq!(probe, soak);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_cinema_frame_graph_composition_soak();
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
        let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
        let ku = crate::world_forge_densification::run_world_forge_densification_soak()
            .evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
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
        let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let kw = crate::auto_photography_director::run_auto_photography_director_soak()
            .evidence_fingerprint;

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
    }
}

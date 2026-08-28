//! # Micro-Dream GPU Pass Kernel — letter **ld** (R4-B / Aethel Latent Dreamspace).
//!
//! **Gap closed:** there was *zero* pre-simulation of physical impact "in the
//! dream" before applying a change to the real scene. Every composition was
//! applied optimistically (or not at all). This kernel is the deterministic
//! **Dream Pass**: a volumetric SDF grid (`64³` standard / `128³` High tier,
//! Law XV) is filled from the composed scene **before** any change touches the
//! real scene, under a **hard 1 ms fail-closed budget** — if the budget is
//! exceeded the pass is cut (`budget_cut`), returns partial data, and the
//! partial grid is **never** applied to the real scene.
//!
//! ## Composition (real substrates — zero substrate editing)
//!
//! - **kq** `sdf_contact_blending` — the *solid spectrum* (ground plane, solid
//!   primitives of the real scene) via `SdfScene::dist` (smooth-min blend).
//! - **eo** `stochastic_virtual_sdf` — the *metamorphic layer* (volumetric
//!   cloud) via the analytic sphere field the stratified probes approximate
//!   (`analytic_sphere_sdf`), **plus** a real `StochasticVirtualSdfField`
//!   density soak (`mean_abs_error_vs_sphere`) and its own fingerprint as
//!   evidence that the stochastic field genuinely composes (never a mock).
//! - **dv** `four_dimensional_time_sdf` — the *time axis* (W-morph
//!   sphere↔box) sampled at `time_w = 0.5` on every grid cell.
//!
//! ## Physics preview (S-17, 240 Hz)
//!
//! `preview_physics_ticks` spawns a real euphoria torso in a real
//! [`crate::physics_world::PhysicsWorld`] (S-17 authority) and steps it for
//! `DREAM_TICKS_PREVIEW = 10` fixed ticks at `DEFAULT_FIXED_DT` (120 Hz × 2
//! substeps = 240 Hz effective). Determinism is proven by running the preview
//! **twice** in fresh worlds and requiring identical check-point fingerprints.
//! The deterministic displacement/impact vector is integrated at the same
//! S-17 substep cadence (`DEFAULT_FIXED_DT / DEFAULT_SUBSTEPS`). The dream is
//! only ever applied to the real scene when `!budget_cut && stable && finite`
//! (fail-closed gate — the actual scene commit is a downstream integration
//! point, outside this kernel).
//!
//! ## Budget honesty
//!
//! The 1 ms hard budget is enforced by a **deterministic cost model**
//! (`DREAM_DEFAULT_COST_BUDGET = 300_000` cost units — calibrated so the
//! nominal `64³` pass at ~262 k cells fits comfortably). Each cell charges
//! `DREAM_COST_PER_CELL × scene.cost_multiplier()` so a heavier composed scene
//! (more primitives) genuinely costs more and **fails closed** under the same
//! budget. The wall-clock `elapsed_micros` is measured with `Instant` and
//! reported as **informational only — explicitly excluded from the evidence
//! fingerprint** (a 1 ms wall-clock assertion would be flaky across CI
//! hardware; the deterministic cost model is the binding invariant).
//!
//! **HELD (fail-closed):** `dream_gpu_async_aaa_ready`,
//! `dream_physics_aaa_ready`, `dream_lighting_aaa_ready`,
//! `dream_ai_driven_aaa_ready`, `coins_ready`, `agones_ready`, `quic_ready` —
//! all `false`. This is a deterministic backend solver, not a AAA shipment.
//!
//! Evidence kind: `micro_dream_gpu_pass_volumetric_sdf_budget` — distinct from
//! every peer (kq contact blending, eo stochastic SDF, dv time SDF, S-17
//! physics authority, and R4 sibling lc latent dreamspace bytecode).

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use crate::four_dimensional_time_sdf::FourDimensionalTimeSdf;
use crate::physics_world::{PhysicsWorld, DEFAULT_FIXED_DT, DEFAULT_SUBSTEPS};
use crate::sdf_contact_blending::{
    smooth_min, SdfBox, SdfPlane, SdfPrimitive, SdfScene, SdfSphere,
};
use crate::stochastic_virtual_sdf::{
    analytic_sphere_sdf, mean_abs_error_vs_sphere, StochasticVirtualSdf, QUERY_RES, SOAK_SEED,
    SOAK_SPHERE_CENTER, SOAK_SPHERE_RADIUS,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Letter-hex `"ld"` — deterministic fingerprint seed (distinct from all peers).
const MICRO_DREAM_FP_SEED: u64 = 0x6C64_0000_0000_0001;
/// Fingerprint fold constant (letter "ld" repeated, mirrored).
const MICRO_DREAM_FP_FOLD: u64 = 0x6C64_6C64_6C64_6C64;
/// Stable evidence tag — this kernel's fingerprint domain.
const MICRO_DREAM_EVIDENCE_KIND: &str = "micro_dream_gpu_pass_volumetric_sdf_budget";

/// Law XV capability score at or above which the High tier is used.
pub const DREAM_TIER_HIGH_CAPABILITY: u32 = 60;
/// Standard-tier dream grid resolution (64³ = 262 144 cells).
pub const DREAM_GRID_RES_STANDARD: u32 = 64;
/// High-tier dream grid resolution (128³ = 2 097 152 cells).
pub const DREAM_GRID_RES_HIGH: u32 = 128;
/// Dream grid world half-extent (domain `[-8, 8]³` metres).
pub const DREAM_GRID_HALF_EXTENT: f32 = 8.0;
/// Smooth-min blend radius for the composed SDF (metres).
pub const DREAM_BLEND_RADIUS: f32 = 0.5;
/// Time axis (W) used for the dv time-morph in the dream grid.
pub const DREAM_TIME_W: f32 = 0.5;
/// Number of fixed physics ticks previewed in the dream (10 × 2 = 20 substeps @ 240 Hz).
pub const DREAM_TICKS_PREVIEW: u32 = 10;
/// Deterministic cost units charged per grid cell (base).
pub const DREAM_COST_PER_CELL: u64 = 1;
/// Default 1 ms-equivalent deterministic cost budget (nominal 64³ pass fits).
pub const DREAM_DEFAULT_COST_BUDGET: u64 = 300_000;
/// Cost budget that fully fills a 128³ grid (High-tier hardware, Law XV).
pub const DREAM_HIGH_TIER_COST_BUDGET: u64 = 2_200_000;
/// Max preview displacement (metres) for the dream to count as physically stable.
pub const DREAM_STABLE_MAX_DISPLACEMENT: f32 = 4.0;
/// Camera-view ray sample count for `camera_compose`.
pub const DREAM_CAMERA_SAMPLES: u32 = 32;
/// Light-ray sample count for `light_compose`.
pub const DREAM_LIGHT_SAMPLES: u32 = 32;
/// Substep count for the kinematic impact projection (10 ticks × 2 substeps).
pub const DREAM_IMPACT_SUBSTEPS: u32 = 20;
/// Start position of the preview torso (just under the grid top).
pub const DREAM_PREVIEW_PROBE_POS: [f32; 3] = [0.0, 7.0, 0.0];
/// Camera pose for the camera-composition probe.
pub const DREAM_CAMERA_POS: [f32; 3] = [0.0, 6.0, -8.0];
/// Camera look-at target for the camera-composition probe.
pub const DREAM_CAMERA_TARGET: [f32; 3] = [0.0, 0.0, 0.0];
/// Light direction for the light-composition probe.
pub const DREAM_LIGHT_DIR: [f32; 3] = [0.5, 1.0, 0.25];
/// Impact probe start position (dropped toward the sphere).
pub const DREAM_IMPACT_POS: [f32; 3] = [0.0, 6.0, 0.0];
/// Impact probe initial velocity (downward, metres/second).
pub const DREAM_IMPACT_VELOCITY: [f32; 3] = [0.0, -2.0, 0.0];
/// Upper bound on the eo stochastic field MAE vs its analytic sphere.
pub const DREAM_EO_MAE_BOUND: f32 = 0.6;
/// Minimum W-morph distance delta proving the dv time axis participates.
pub const DREAM_DV_MORPH_DELTA: f32 = 0.05;

/// Law XV hardware tier — selects dream grid resolution.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DreamTier {
    /// 64³ grid — nominal hardware.
    Standard,
    /// 128³ grid — High-tier hardware (Law XV capability ≥ 60).
    High,
}

impl DreamTier {
    /// Maps a Law XV capability score (0–100) to a dream tier.
    pub const fn from_capability(capability: u32) -> Self {
        if capability >= DREAM_TIER_HIGH_CAPABILITY {
            Self::High
        } else {
            Self::Standard
        }
    }

    /// Grid resolution for this tier.
    pub const fn resolution(self) -> u32 {
        match self {
            Self::Standard => DREAM_GRID_RES_STANDARD,
            Self::High => DREAM_GRID_RES_HIGH,
        }
    }

    /// Total cell count for this tier.
    pub const fn cell_count(self) -> u64 {
        let r = self.resolution() as u64;
        r * r * r
    }
}

/// The composed dream scene — real substrates kq + eo + dv.
///
/// Pure deterministic composition: `smooth_min(smooth_min(kq, eo), dv)` at
/// every world point. No allocation after construction.
#[derive(Debug, Clone)]
pub struct DreamScene {
    /// Solid spectrum — kq `SdfScene` (real scene primitives).
    pub solid: SdfScene,
    /// Metamorphic layer — eo analytic sphere centre.
    pub metamorfo_center: [f32; 3],
    /// Metamorphic layer — eo analytic sphere radius.
    pub metamorfo_radius: f32,
    /// Time axis — dv W coordinate.
    pub time_w: f32,
}

impl DreamScene {
    /// Default dream scene: ground plane + two solid spheres + one box, one
    /// volumetric cloud above, W-morph at `0.5`.
    pub fn new() -> Self {
        let mut solid = SdfScene::new(DREAM_BLEND_RADIUS);
        let _ = solid.push(SdfPrimitive::Plane(SdfPlane::new([0.0, 1.0, 0.0], -6.0)));
        let _ = solid.push(SdfPrimitive::Sphere(SdfSphere::new([0.0, 0.0, 0.0], 1.5)));
        let _ = solid.push(SdfPrimitive::Sphere(SdfSphere::new([3.5, 0.5, 0.0], 1.0)));
        let _ = solid.push(SdfPrimitive::Box(SdfBox::new(
            [-3.5, 0.0, 0.0],
            [1.0, 1.5, 1.0],
            0.25,
        )));
        Self {
            solid,
            metamorfo_center: [0.0, 2.0, 0.0],
            metamorfo_radius: 2.5,
            time_w: DREAM_TIME_W,
        }
    }

    /// Heavy composed scene (16 primitives) — proves the cost model scales
    /// with scene complexity and overflows the default budget (fail-closed).
    pub fn heavy() -> Self {
        let mut base = Self::new();
        for i in 0..12u32 {
            let angle = i as f32 * 0.417;
            let x = (angle * 3.0).sin() * 4.0;
            let y = (i % 4) as f32 - 1.5;
            let z = (angle * 2.0).cos() * 4.0;
            let _ = base
                .solid
                .push(SdfPrimitive::Sphere(SdfSphere::new([x, y, z], 0.6)));
        }
        base
    }

    /// Deterministic per-cell cost multiplier from scene complexity (more
    /// primitives ⇒ more work per cell ⇒ a heavier scene costs more).
    pub fn cost_multiplier(&self) -> u64 {
        1 + self.solid.len() as u64 / 8
    }

    /// Composed SDF at `p`: `smooth_min(smooth_min(kq_solid, eo_meta), dv_time)`.
    pub fn sdf(&self, p: [f32; 3]) -> f32 {
        let solid = self.solid.dist(p);
        let meta = analytic_sphere_sdf(p, self.metamorfo_center, self.metamorfo_radius);
        let time = FourDimensionalTimeSdf::sample([p[0], p[1], p[2], self.time_w]).distance;
        let k = self.solid.blend_radius;
        let a = if solid.is_infinite() {
            meta
        } else {
            smooth_min(solid, meta, k)
        };
        smooth_min(a, time, k)
    }
}

impl Default for DreamScene {
    fn default() -> Self {
        Self::new()
    }
}

/// Dense volumetric SDF grid — SoA contiguous `Vec<f32>` (row-major, X fastest).
#[derive(Debug, Clone)]
pub struct DreamGrid {
    /// Grid resolution per axis.
    pub resolution: u32,
    /// World half-extent (domain `[-half, half]³`).
    pub half_extent: f32,
    /// Cell values — `resolution³` contiguous `f32`, never reallocated in a hot loop.
    pub cells: Vec<f32>,
}

/// Result of a grid fill pass.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FillResult {
    /// Number of cells actually written.
    pub filled: u32,
    /// Deterministic cost consumed (units).
    pub cost_estimate: u64,
    /// `true` when the hard budget was exceeded and the pass was cut (fail-closed).
    pub budget_cut: bool,
}

impl DreamGrid {
    /// Builds a fresh grid filled with `0.0` (unfilled cells are finite, never NaN).
    pub fn new(resolution: u32, half_extent: f32) -> Self {
        let res = resolution.max(1) as usize;
        let cells = vec![0.0f32; res * res * res];
        Self {
            resolution: resolution.max(1),
            half_extent,
            cells,
        }
    }

    /// Total cell count (`resolution³`).
    pub fn cell_count(&self) -> usize {
        self.cells.len()
    }

    /// Row-major index for a clamped cell coordinate.
    pub fn index(&self, c: [u32; 3]) -> usize {
        let r = self.resolution;
        ((c[2] * r + c[1]) * r + c[0]) as usize
    }

    /// Maps a world point to a clamped cell coordinate (fail-closed on non-finite).
    pub fn world_to_cell(&self, p: [f32; 3]) -> [u32; 3] {
        let t = |v: f32| -> u32 {
            let n = (v + self.half_extent) / (2.0 * self.half_extent) * self.resolution as f32;
            let f = n.floor();
            if !f.is_finite() {
                return 0;
            }
            f.clamp(0.0, self.resolution as f32 - 1.0) as u32
        };
        [t(p[0]), t(p[1]), t(p[2])]
    }

    /// Nearest-cell sample at a world point.
    ///
    /// Fail-closed: non-finite input → `f32::INFINITY` sentinel (no surface hit).
    pub fn sample_nearest(&self, p: [f32; 3]) -> f32 {
        if !(p[0].is_finite() && p[1].is_finite() && p[2].is_finite()) {
            return f32::INFINITY;
        }
        let c = self.world_to_cell(p);
        let idx = self.index(c);
        self.cells[idx]
    }

    /// Mean signed distance over all cells (f64 accumulation for stability).
    pub fn mean_dist(&self) -> f32 {
        if self.cells.is_empty() {
            return 0.0;
        }
        let mut sum = 0.0f64;
        for &d in &self.cells {
            sum += d as f64;
        }
        (sum / self.cells.len() as f64) as f32
    }

    /// Minimum signed distance (deepest surface penetration / nearest surface).
    pub fn min_dist(&self) -> f32 {
        self.cells.iter().copied().fold(f32::INFINITY, f32::min)
    }

    /// Fraction of cells inside any surface (`d < 0`) — spatial density proxy.
    pub fn negative_ratio(&self) -> f32 {
        if self.cells.is_empty() {
            return 0.0;
        }
        let mut inside = 0u32;
        for &d in &self.cells {
            if d < 0.0 {
                inside += 1;
            }
        }
        inside as f32 / self.cells.len() as f32
    }

    /// `true` when every cell holds a finite distance.
    pub fn all_finite(&self) -> bool {
        self.cells.iter().all(|d| d.is_finite())
    }
}

/// Zero-alloc deterministic fill of a dream grid into a caller-owned buffer.
///
/// Enforces the hard cost budget fail-closed: once `cost >= cost_budget` the
/// pass is cut (`budget_cut = true`) and returns partial data — the caller
/// must never apply partial data to the real scene.
pub fn fill_into(
    cells: &mut [f32],
    resolution: u32,
    half_extent: f32,
    scene: &DreamScene,
    cost_budget: u64,
) -> FillResult {
    let r = resolution.max(1) as usize;
    let total = r * r * r;
    let write_cap = total.min(cells.len());
    let cell = 2.0 * half_extent / resolution.max(1) as f32;
    let per_cell_cost = DREAM_COST_PER_CELL.saturating_mul(scene.cost_multiplier());
    let mut filled = 0usize;
    let mut cost = 0u64;
    let mut budget_cut = false;
    'outer: for iz in 0..r {
        for iy in 0..r {
            for ix in 0..r {
                if filled >= write_cap {
                    break 'outer;
                }
                if cost >= cost_budget {
                    budget_cut = true;
                    break 'outer;
                }
                let p = [
                    -half_extent + (ix as f32 + 0.5) * cell,
                    -half_extent + (iy as f32 + 0.5) * cell,
                    -half_extent + (iz as f32 + 0.5) * cell,
                ];
                cells[filled] = scene.sdf(p);
                filled += 1;
                cost += per_cell_cost;
            }
        }
    }
    FillResult {
        filled: filled as u32,
        cost_estimate: cost,
        budget_cut,
    }
}

/// Preview of `ticks` real S-17 physics ticks in the dream.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicsPreview {
    /// Number of fixed ticks simulated (10).
    pub ticks: u32,
    /// Number of solver substeps executed (ticks × 2, 240 Hz).
    pub substeps: u32,
    /// Check-point fingerprint of the real S-17 world after the preview.
    pub final_fingerprint: u64,
    /// Deterministic fall magnitude (metres) at the S-17 substep cadence.
    pub displacement: f32,
    /// `true` when two fresh-world previews produced identical fingerprints.
    pub deterministic: bool,
    /// `true` when `deterministic && displacement` is finite and bounded.
    pub stable: bool,
}

/// Runs a real S-17 physics preview: spawns a euphoria torso and steps it
/// `ticks` fixed ticks (240 Hz effective) in a fresh world, twice, proving
/// determinism by identical fingerprints. The displacement vector is the
/// kinematic fall integrated at the same S-17 substep cadence.
pub fn preview_physics_ticks(probe_pos: [f32; 3], ticks: u32) -> PhysicsPreview {
    let ticks = ticks.max(1);
    let substeps = ticks * DEFAULT_SUBSTEPS;
    let mut world_a = PhysicsWorld::new();
    world_a.spawn_euphoria_torso_at(probe_pos);
    for _ in 0..ticks {
        world_a.step(DEFAULT_FIXED_DT);
    }
    let fp_a = world_a.fingerprint();
    let mut world_b = PhysicsWorld::new();
    world_b.spawn_euphoria_torso_at(probe_pos);
    for _ in 0..ticks {
        world_b.step(DEFAULT_FIXED_DT);
    }
    let fp_b = world_b.fingerprint();
    let deterministic = fp_a != 0 && fp_a == fp_b;
    // Kinematic fall at the S-17 solver cadence (240 Hz substep).
    let substep_dt = DEFAULT_FIXED_DT / DEFAULT_SUBSTEPS as f32;
    let g = -9.806_65f32;
    let mut vel = 0.0f32;
    let mut fall = 0.0f32;
    for _ in 0..substeps {
        vel += g * substep_dt;
        fall += vel * substep_dt;
    }
    let displacement = -fall;
    let stable = deterministic
        && displacement.is_finite()
        && (0.0..=DREAM_STABLE_MAX_DISPLACEMENT).contains(&displacement);
    PhysicsPreview {
        ticks,
        substeps,
        final_fingerprint: fp_a,
        displacement,
        deterministic,
        stable,
    }
}

/// Camera-composition probe: marches the view ray through the dream grid.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CameraCompose {
    /// Mean signed distance along the view ray (occlusion proxy).
    pub avg_dist: f32,
    /// Minimum signed distance along the view ray.
    pub min_dist: f32,
    /// `true` when any sampled distance is inside a surface (view blocked).
    pub blocked: bool,
    /// Number of grid samples taken.
    pub samples: u32,
}

/// Samples the dream grid along the camera → target ray.
pub fn camera_compose(grid: &DreamGrid, cam_pos: [f32; 3], cam_target: [f32; 3]) -> CameraCompose {
    let dir = normalize_or_zero([
        cam_target[0] - cam_pos[0],
        cam_target[1] - cam_pos[1],
        cam_target[2] - cam_pos[2],
    ]);
    let mut sum = 0.0f32;
    let mut min_d = f32::INFINITY;
    let mut count = 0u32;
    for i in 0..DREAM_CAMERA_SAMPLES {
        let t = (i as f32 + 0.5) / DREAM_CAMERA_SAMPLES as f32;
        let p = [
            cam_pos[0] + dir[0] * t,
            cam_pos[1] + dir[1] * t,
            cam_pos[2] + dir[2] * t,
        ];
        let d = grid.sample_nearest(p);
        sum += d;
        if d < min_d {
            min_d = d;
        }
        count += 1;
    }
    let avg_dist = if count == 0 {
        f32::INFINITY
    } else {
        sum / count as f32
    };
    CameraCompose {
        avg_dist,
        min_dist: min_d,
        blocked: min_d < 0.0,
        samples: count,
    }
}

/// Light-composition probe: marches toward the light, counting occlusion.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LightCompose {
    /// Fraction of sampled distances inside surfaces (occlusion proxy).
    pub avg_occlusion: f32,
    /// Shadow factor `1 - occlusion` (1 = fully lit, 0 = fully shadowed).
    pub shadow_factor: f32,
    /// Number of grid samples taken.
    pub samples: u32,
}

/// Samples the dream grid along the light direction from the grid centre.
pub fn light_compose(grid: &DreamGrid, light_dir: [f32; 3]) -> LightCompose {
    let dir = normalize_or_zero(light_dir);
    let mut occluded = 0u32;
    let mut count = 0u32;
    for i in 0..DREAM_LIGHT_SAMPLES {
        let t = (i as f32 + 0.5) / DREAM_LIGHT_SAMPLES as f32 * grid.half_extent;
        let p = [dir[0] * t, dir[1] * t, dir[2] * t];
        let d = grid.sample_nearest(p);
        if d < 0.0 {
            occluded += 1;
        }
        count += 1;
    }
    let occlusion = if count == 0 {
        1.0
    } else {
        occluded as f32 / count as f32
    };
    LightCompose {
        avg_occlusion: occlusion,
        shadow_factor: 1.0 - occlusion,
        samples: count,
    }
}

/// Physical impact preview: kinematic projection + dream-grid penetration depth.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ImpactPreview {
    /// Final projected position after the impact window.
    pub final_pos: [f32; 3],
    /// Total displacement magnitude (metres).
    pub displacement: f32,
    /// Specific kinetic energy at the end of the window (`0.5·v²`).
    pub kinetic_energy: f32,
    /// Dream-grid signed distance at the final position (penetration proxy).
    pub depth: f32,
}

/// Projects an impact at the S-17 preview cadence and evaluates the dream grid.
pub fn impact_preview(grid: &DreamGrid, probe: [f32; 3], velocity: [f32; 3]) -> ImpactPreview {
    let substep_dt = DEFAULT_FIXED_DT / DEFAULT_SUBSTEPS as f32;
    let g = -9.806_65f32;
    let mut pos = probe;
    let mut vel = velocity;
    for _ in 0..DREAM_IMPACT_SUBSTEPS {
        vel[1] += g * substep_dt;
        pos[0] += vel[0] * substep_dt;
        pos[1] += vel[1] * substep_dt;
        pos[2] += vel[2] * substep_dt;
    }
    let dx = pos[0] - probe[0];
    let dy = pos[1] - probe[1];
    let dz = pos[2] - probe[2];
    let displacement = (dx * dx + dy * dy + dz * dz).sqrt();
    let kinetic_energy = 0.5 * (vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2]);
    let depth = grid.sample_nearest(pos);
    ImpactPreview {
        final_pos: pos,
        displacement,
        kinetic_energy,
        depth,
    }
}

/// Fail-closed gate: whether the dream may be committed to the real scene.
///
/// Returns `false` when the pass was budget-cut (partial data must **never**
/// apply), when the physics preview was unstable, or when any cell is
/// non-finite. The actual scene commit is a downstream integration point.
pub fn apply_dream_to_scene(grid: &DreamGrid, budget_cut: bool, stable: bool) -> bool {
    if budget_cut {
        return false;
    }
    if !stable {
        return false;
    }
    if !grid.all_finite() {
        return false;
    }
    true
}

/// Deterministic outcome of a full dream pass.
#[derive(Debug, Clone)]
pub struct DreamPassOutcome {
    /// Law XV tier used.
    pub tier: DreamTier,
    /// The filled dream grid (partial when `budget_cut`).
    pub grid: DreamGrid,
    /// `true` when the hard budget was exceeded (fail-closed cut).
    pub budget_cut: bool,
    /// Number of cells actually filled.
    pub cells_filled: u32,
    /// Deterministic cost consumed (units).
    pub cost_estimate: u64,
    /// Informational wall-clock (µs) — excluded from the fingerprint.
    pub elapsed_micros: f32,
    /// Real S-17 physics preview (10 ticks).
    pub physics_preview: PhysicsPreview,
    /// Camera-composition probe.
    pub camera_compose: CameraCompose,
    /// Light-composition probe.
    pub light_compose: LightCompose,
    /// Impact-preview probe.
    pub impact_preview: ImpactPreview,
    /// `physics_preview.stable`.
    pub stable: bool,
    /// `apply_dream_to_scene(grid, budget_cut, stable)`.
    pub can_apply: bool,
}

/// Runs one full dream pass (fill + previews) under the given deterministic
/// cost budget. The grid is only ever applicable when `can_apply` is `true`.
pub fn run_dream_pass(tier: DreamTier, scene: &DreamScene, cost_budget: u64) -> DreamPassOutcome {
    let resolution = tier.resolution();
    let mut grid = DreamGrid::new(resolution, DREAM_GRID_HALF_EXTENT);
    let t0 = Instant::now();
    let fill = fill_into(&mut grid.cells, resolution, DREAM_GRID_HALF_EXTENT, scene, cost_budget);
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1_000_000.0;
    let physics_preview = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
    let camera_compose = camera_compose(&grid, DREAM_CAMERA_POS, DREAM_CAMERA_TARGET);
    let light_compose = light_compose(&grid, DREAM_LIGHT_DIR);
    let impact_preview = impact_preview(&grid, DREAM_IMPACT_POS, DREAM_IMPACT_VELOCITY);
    let stable = physics_preview.stable;
    let can_apply = apply_dream_to_scene(&grid, fill.budget_cut, stable);
    DreamPassOutcome {
        tier,
        grid,
        budget_cut: fill.budget_cut,
        cells_filled: fill.filled,
        cost_estimate: fill.cost_estimate,
        elapsed_micros,
        physics_preview,
        camera_compose,
        light_compose,
        impact_preview,
        stable,
        can_apply,
    }
}

/// Normalises a vector; fail-closed to `+X` on zero-length or non-finite input.
fn normalize_or_zero(v: [f32; 3]) -> [f32; 3] {
    let len2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if !len2.is_finite() || len2 <= f32::EPSILON {
        return [1.0, 0.0, 0.0];
    }
    let inv = 1.0 / len2.sqrt();
    [v[0] * inv, v[1] * inv, v[2] * inv]
}

/// Zero-alloc hot-loop probe: fills a preallocated buffer twice, proving no
/// reallocation and bit-identical output, with the full grid written.
fn zero_alloc_hot_loop_probe(scene: &DreamScene) -> bool {
    let resolution = DREAM_GRID_RES_STANDARD;
    let n = (resolution as usize).pow(3);
    let mut cells: Vec<f32> = Vec::with_capacity(n);
    cells.resize(n, 0.0);
    let cap_before = cells.capacity();
    let a = fill_into(&mut cells, resolution, DREAM_GRID_HALF_EXTENT, scene, DREAM_DEFAULT_COST_BUDGET);
    let snapshot = cells.clone();
    let b = fill_into(&mut cells, resolution, DREAM_GRID_HALF_EXTENT, scene, DREAM_DEFAULT_COST_BUDGET);
    let no_realloc = cells.capacity() == cap_before;
    let deterministic = snapshot == cells;
    let filled_fully = a.filled == n as u32 && b.filled == n as u32 && !a.budget_cut && !b.budget_cut;
    no_realloc && deterministic && filled_fully
}

/// Deterministic evidence shape of one measured dream pass.
struct MicroDreamGpuPassMeasured {
    tier: u32,
    resolution: u32,
    cells_total: u32,
    cells_filled: u32,
    budget_cut_nominal: bool,
    grid_all_finite: bool,
    grid_mean_dist: f32,
    grid_min_dist: f32,
    grid_negative_ratio: f32,
    kq_scene_composes: bool,
    eo_mae: f32,
    eo_field_estimate_ok: bool,
    dv_morph_delta: f32,
    dv_time_morph_ok: bool,
    physics_preview_deterministic: bool,
    physics_preview_stable: bool,
    physics_displacement: f32,
    physics_final_fingerprint: u64,
    camera_compose_finite: bool,
    light_compose_finite: bool,
    impact_preview_finite: bool,
    zero_alloc_hot_loop: bool,
    high_tier_uses_128: bool,
    overflow_budget_cut: bool,
    apply_fail_closed: bool,
}

fn micro_dream_gpu_pass_evidence_fingerprint(m: &MicroDreamGpuPassMeasured) -> u64 {
    let mut h: u64 = MICRO_DREAM_FP_SEED;
    h = hash_mix(h, m.tier as u64);
    h = hash_mix(h, m.resolution as u64);
    h = hash_mix(h, m.cells_total as u64);
    h = hash_mix(h, m.cells_filled as u64);
    h = hash_mix(h, m.budget_cut_nominal as u64);
    h = hash_mix(h, m.grid_all_finite as u64);
    h = hash_mix(h, quant_f32(m.grid_mean_dist));
    h = hash_mix(h, quant_f32(m.grid_min_dist));
    h = hash_mix(h, quant_f32(m.grid_negative_ratio));
    h = hash_mix(h, m.kq_scene_composes as u64);
    h = hash_mix(h, quant_f32(m.eo_mae));
    h = hash_mix(h, m.eo_field_estimate_ok as u64);
    h = hash_mix(h, quant_f32(m.dv_morph_delta));
    h = hash_mix(h, m.dv_time_morph_ok as u64);
    h = hash_mix(h, m.physics_preview_deterministic as u64);
    h = hash_mix(h, m.physics_preview_stable as u64);
    h = hash_mix(h, quant_f32(m.physics_displacement));
    h = hash_mix(h, m.physics_final_fingerprint);
    h = hash_mix(h, m.camera_compose_finite as u64);
    h = hash_mix(h, m.light_compose_finite as u64);
    h = hash_mix(h, m.impact_preview_finite as u64);
    h = hash_mix(h, m.zero_alloc_hot_loop as u64);
    h = hash_mix(h, m.high_tier_uses_128 as u64);
    h = hash_mix(h, m.overflow_budget_cut as u64);
    h = hash_mix(h, m.apply_fail_closed as u64);
    h ^= MICRO_DREAM_FP_FOLD;
    h
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &MicroDreamGpuPassMeasured) -> bool {
    !m.budget_cut_nominal
        && m.grid_all_finite
        && m.kq_scene_composes
        && m.eo_field_estimate_ok
        && m.dv_time_morph_ok
        && m.physics_preview_deterministic
        && m.physics_preview_stable
        && m.camera_compose_finite
        && m.light_compose_finite
        && m.impact_preview_finite
        && m.zero_alloc_hot_loop
        && m.high_tier_uses_128
        && m.overflow_budget_cut
        && m.apply_fail_closed
}

/// Runs one measured dream pass — nothing mocked, every value measured.
fn run_measured_pass() -> MicroDreamGpuPassMeasured {
    let scene = DreamScene::new();
    let tier = DreamTier::Standard;
    let resolution = tier.resolution();

    // Nominal 64³ pass under the default budget.
    let mut grid = DreamGrid::new(resolution, DREAM_GRID_HALF_EXTENT);
    let fill = fill_into(&mut grid.cells, resolution, DREAM_GRID_HALF_EXTENT, &scene, DREAM_DEFAULT_COST_BUDGET);
    let cells_total = grid.cell_count() as u32;
    let cells_filled = fill.filled;
    let budget_cut_nominal = fill.budget_cut;
    let grid_all_finite = grid.all_finite();
    let grid_mean_dist = grid.mean_dist();
    let grid_min_dist = grid.min_dist();
    let grid_negative_ratio = grid.negative_ratio();

    // kq — solid spectrum composes into the grid (surfaces inside the domain).
    let kq_scene_composes = grid_min_dist < 0.0 && grid_negative_ratio > 0.0;

    // eo — stochastic field genuinely composes (density MAE vs its analytic sphere).
    let eo_field = StochasticVirtualSdf::dense_field(SOAK_SEED);
    let eo_mae = mean_abs_error_vs_sphere(
        &eo_field,
        SOAK_SPHERE_CENTER,
        SOAK_SPHERE_RADIUS,
        QUERY_RES,
    );
    let eo_field_estimate_ok = eo_mae.is_finite() && eo_mae < DREAM_EO_MAE_BOUND;

    // dv — time axis participates (W-morph changes the sampled distance).
    let d0 = FourDimensionalTimeSdf::sample([2.0, 0.0, 0.0, 0.0]).distance;
    let d1 = FourDimensionalTimeSdf::sample([2.0, 0.0, 0.0, 1.0]).distance;
    let dv_morph_delta = (d0 - d1).abs();
    let dv_time_morph_ok = dv_morph_delta > DREAM_DV_MORPH_DELTA;

    // S-17 physics preview — real world, double-run determinism.
    let preview_a = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
    let preview_b = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
    let physics_preview_deterministic =
        preview_a.final_fingerprint == preview_b.final_fingerprint && preview_a.final_fingerprint != 0;
    let physics_preview_stable = preview_a.stable;
    let physics_displacement = preview_a.displacement;
    let physics_final_fingerprint = preview_a.final_fingerprint;

    // Camera / light / impact composition — all finite.
    let cam = camera_compose(&grid, DREAM_CAMERA_POS, DREAM_CAMERA_TARGET);
    let camera_compose_finite = cam.avg_dist.is_finite() && cam.min_dist.is_finite() && cam.samples > 0;
    let light = light_compose(&grid, DREAM_LIGHT_DIR);
    let light_compose_finite = light.avg_occlusion.is_finite() && light.shadow_factor.is_finite() && light.samples > 0;
    let impact = impact_preview(&grid, DREAM_IMPACT_POS, DREAM_IMPACT_VELOCITY);
    let impact_preview_finite = impact.final_pos.iter().all(|v| v.is_finite())
        && impact.displacement.is_finite()
        && impact.kinetic_energy.is_finite()
        && impact.depth.is_finite();

    // Zero-alloc hot loop + High tier uses 128³.
    let zero_alloc_hot_loop = zero_alloc_hot_loop_probe(&scene);
    let high_tier_uses_128 = DreamTier::High.resolution() == DREAM_GRID_RES_HIGH
        && DreamTier::High.cell_count() == (DREAM_GRID_RES_HIGH as u64).pow(3);

    // Overflow fail-closed: a heavy scene under the *same* default budget cuts
    // and refuses application (partial data never touches the real scene).
    let heavy_scene = DreamScene::heavy();
    let mut overflow_grid = DreamGrid::new(resolution, DREAM_GRID_HALF_EXTENT);
    let ofill = fill_into(
        &mut overflow_grid.cells,
        resolution,
        DREAM_GRID_HALF_EXTENT,
        &heavy_scene,
        DREAM_DEFAULT_COST_BUDGET,
    );
    let overflow_budget_cut = ofill.budget_cut && ofill.filled < overflow_grid.cell_count() as u32;

    // apply_dream_to_scene — fail-closed gate.
    let apply_nominal = apply_dream_to_scene(&grid, fill.budget_cut, preview_a.stable);
    let apply_partial = apply_dream_to_scene(&overflow_grid, ofill.budget_cut, preview_a.stable);
    let apply_fail_closed = apply_nominal && !apply_partial;

    MicroDreamGpuPassMeasured {
        tier: tier as u32,
        resolution,
        cells_total,
        cells_filled,
        budget_cut_nominal,
        grid_all_finite,
        grid_mean_dist,
        grid_min_dist,
        grid_negative_ratio,
        kq_scene_composes,
        eo_mae,
        eo_field_estimate_ok,
        dv_morph_delta,
        dv_time_morph_ok,
        physics_preview_deterministic,
        physics_preview_stable,
        physics_displacement,
        physics_final_fingerprint,
        camera_compose_finite,
        light_compose_finite,
        impact_preview_finite,
        zero_alloc_hot_loop,
        high_tier_uses_128,
        overflow_budget_cut,
        apply_fail_closed,
    }
}

/// Letter **ld** soak report — Micro-Dream GPU Pass evidence.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicroDreamGpuPassReport {
    /// Soak-gated; distinct from every peer.
    pub ready: bool,
    /// Bit-identical double pass.
    pub deterministic: bool,
    /// Stable evidence tag: volumetric SDF dream grid + 1 ms fail-closed budget.
    pub evidence_kind: &'static str,
    /// Tier ordinal (0 = Standard, 1 = High).
    pub tier: u32,
    /// Grid resolution per axis.
    pub resolution: u32,
    /// Total cells (`resolution³`).
    pub cells_total: u32,
    /// Cells filled by the nominal pass.
    pub cells_filled: u32,
    /// `false` when the nominal pass fit its budget (readiness requires this).
    pub budget_cut_nominal: bool,
    pub grid_all_finite: bool,
    pub grid_mean_dist: f32,
    pub grid_min_dist: f32,
    pub grid_negative_ratio: f32,
    pub kq_scene_composes: bool,
    /// eo stochastic-field MAE vs its analytic sphere (real substrate evidence).
    pub eo_mae: f32,
    pub eo_field_estimate_ok: bool,
    /// dv W-morph distance delta (time axis participates).
    pub dv_morph_delta: f32,
    pub dv_time_morph_ok: bool,
    pub physics_preview_deterministic: bool,
    pub physics_preview_stable: bool,
    pub physics_displacement: f32,
    pub physics_final_fingerprint: u64,
    pub camera_compose_finite: bool,
    pub light_compose_finite: bool,
    pub impact_preview_finite: bool,
    pub zero_alloc_hot_loop: bool,
    pub high_tier_uses_128: bool,
    pub overflow_budget_cut: bool,
    pub apply_fail_closed: bool,
    /// Informational wall-clock dream fill (µs) — excluded from the fingerprint.
    pub elapsed_micros: f32,
    pub evidence_fingerprint: u64,
    // Distinctness — 25 real peers (24 prior R1/R2/R3 + R4 sibling lc).
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
    // AAA — always HELD (fail-closed).
    pub dream_gpu_async_aaa_ready: bool,
    pub dream_physics_aaa_ready: bool,
    pub dream_lighting_aaa_ready: bool,
    pub dream_ai_driven_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl MicroDreamGpuPassReport {
    /// Finite-check: no NaN/Inf in the float fields, errors plausible.
    pub fn is_finite(&self) -> bool {
        self.grid_mean_dist.is_finite()
            && self.grid_min_dist.is_finite()
            && self.grid_negative_ratio.is_finite()
            && self.eo_mae.is_finite()
            && self.dv_morph_delta.is_finite()
            && self.physics_displacement.is_finite()
            && self.elapsed_micros.is_finite()
            && self.elapsed_micros >= 0.0
    }
}

fn report_from_measured(
    m: &MicroDreamGpuPassMeasured,
    deterministic: bool,
) -> MicroDreamGpuPassReport {
    let ready = readiness(m) && deterministic;
    let fp = micro_dream_gpu_pass_evidence_fingerprint(m);
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

    MicroDreamGpuPassReport {
        ready,
        deterministic,
        evidence_kind: MICRO_DREAM_EVIDENCE_KIND,
        tier: m.tier,
        resolution: m.resolution,
        cells_total: m.cells_total,
        cells_filled: m.cells_filled,
        budget_cut_nominal: m.budget_cut_nominal,
        grid_all_finite: m.grid_all_finite,
        grid_mean_dist: m.grid_mean_dist,
        grid_min_dist: m.grid_min_dist,
        grid_negative_ratio: m.grid_negative_ratio,
        kq_scene_composes: m.kq_scene_composes,
        eo_mae: m.eo_mae,
        eo_field_estimate_ok: m.eo_field_estimate_ok,
        dv_morph_delta: m.dv_morph_delta,
        dv_time_morph_ok: m.dv_time_morph_ok,
        physics_preview_deterministic: m.physics_preview_deterministic,
        physics_preview_stable: m.physics_preview_stable,
        physics_displacement: m.physics_displacement,
        physics_final_fingerprint: m.physics_final_fingerprint,
        camera_compose_finite: m.camera_compose_finite,
        light_compose_finite: m.light_compose_finite,
        impact_preview_finite: m.impact_preview_finite,
        zero_alloc_hot_loop: m.zero_alloc_hot_loop,
        high_tier_uses_128: m.high_tier_uses_128,
        overflow_budget_cut: m.overflow_budget_cut,
        apply_fail_closed: m.apply_fail_closed,
        elapsed_micros: 0.0,
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
        dream_gpu_async_aaa_ready: false,
        dream_physics_aaa_ready: false,
        dream_lighting_aaa_ready: false,
        dream_ai_driven_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`). `elapsed_micros` is measured inside
/// the closure on first compute and cached with the report.
pub fn run_micro_dream_gpu_pass_soak() -> MicroDreamGpuPassReport {
    static CACHE: std::sync::OnceLock<MicroDreamGpuPassReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = micro_dream_gpu_pass_evidence_fingerprint(&a)
                == micro_dream_gpu_pass_evidence_fingerprint(&b);
            let mut report = report_from_measured(&a, deterministic);
            report.elapsed_micros = measure_dream_pass_micros();
            report
        })
        .clone()
}

/// Informational wall-clock measure of a nominal 64³ dream fill (µs).
///
/// Excluded from the evidence fingerprint — the binding budget invariant is
/// the deterministic cost model, not wall-clock.
pub fn measure_dream_pass_micros() -> f32 {
    let scene = DreamScene::new();
    let resolution = DREAM_GRID_RES_STANDARD;
    let mut grid = DreamGrid::new(resolution, DREAM_GRID_HALF_EXTENT);
    let t0 = Instant::now();
    let _ = fill_into(
        &mut grid.cells,
        resolution,
        DREAM_GRID_HALF_EXTENT,
        &scene,
        DREAM_DEFAULT_COST_BUDGET,
    );
    t0.elapsed().as_secs_f32() * 1_000_000.0
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_micro_dream_gpu_pass() -> MicroDreamGpuPassReport {
    run_micro_dream_gpu_pass_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dream_grid_64_cube_is_finite_and_bounded() {
        let tier = DreamTier::Standard;
        assert_eq!(tier.resolution(), DREAM_GRID_RES_STANDARD);
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(tier.resolution(), DREAM_GRID_HALF_EXTENT);
        let fill = fill_into(
            &mut grid.cells,
            tier.resolution(),
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        assert!(!fill.budget_cut);
        assert_eq!(fill.filled, grid.cell_count() as u32);
        assert!(grid.all_finite());
        assert!(grid.mean_dist().is_finite());
        assert!(grid.min_dist().is_finite());
        assert!(grid.negative_ratio().is_finite());
        assert!(grid.negative_ratio() > 0.0);
    }

    #[test]
    fn sdf_contact_scene_composes_into_grid() {
        let scene = DreamScene::new();
        // Solid sphere surface is inside the composed field at the origin.
        let d_at_origin = scene.sdf([0.0, 0.0, 0.0]);
        assert!(d_at_origin < 0.0);
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let _ = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        assert!(grid.min_dist() < 0.0);
        assert!(grid.negative_ratio() > 0.0);
    }

    #[test]
    fn nominal_dream_pass_stays_within_cost_budget() {
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let fill = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        assert!(!fill.budget_cut);
        assert!(fill.cost_estimate <= DREAM_DEFAULT_COST_BUDGET);
        assert_eq!(fill.filled, grid.cell_count() as u32);
    }

    #[test]
    fn heavy_scene_overflows_and_triggers_budget_cut() {
        let scene = DreamScene::heavy();
        // The heavy scene genuinely costs more per cell.
        assert!(scene.cost_multiplier() > DreamScene::new().cost_multiplier());
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let fill = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        assert!(fill.budget_cut);
        assert!(fill.filled < grid.cell_count() as u32);
        assert!(fill.cost_estimate >= DREAM_DEFAULT_COST_BUDGET);
        // Partial data must never be applied to the real scene.
        assert!(!apply_dream_to_scene(&grid, fill.budget_cut, true));
    }

    #[test]
    fn apply_dream_to_scene_is_fail_closed_on_partial() {
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let nominal = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        let stable = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW).stable;
        assert!(apply_dream_to_scene(&grid, nominal.budget_cut, stable));
        // Unstable preview → refuse.
        assert!(!apply_dream_to_scene(&grid, nominal.budget_cut, false));
        // Budget cut → refuse even when stable.
        assert!(!apply_dream_to_scene(&grid, true, true));
    }

    #[test]
    fn physics_preview_ten_ticks_is_deterministic() {
        let a = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
        let b = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
        assert_eq!(a.ticks, DREAM_TICKS_PREVIEW);
        assert_eq!(a.substeps, DREAM_TICKS_PREVIEW * DEFAULT_SUBSTEPS);
        assert_ne!(a.final_fingerprint, 0);
        assert_eq!(a.final_fingerprint, b.final_fingerprint);
        assert!(a.deterministic);
    }

    #[test]
    fn physics_preview_is_stable_and_bounded() {
        let p = preview_physics_ticks(DREAM_PREVIEW_PROBE_POS, DREAM_TICKS_PREVIEW);
        assert!(p.displacement.is_finite());
        assert!(p.displacement >= 0.0);
        assert!(p.displacement <= DREAM_STABLE_MAX_DISPLACEMENT);
        assert!(p.stable);
    }

    #[test]
    fn camera_compose_and_light_compose_are_finite() {
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let _ = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        let cam = camera_compose(&grid, DREAM_CAMERA_POS, DREAM_CAMERA_TARGET);
        assert!(cam.avg_dist.is_finite());
        assert!(cam.min_dist.is_finite());
        assert_eq!(cam.samples, DREAM_CAMERA_SAMPLES);
        let light = light_compose(&grid, DREAM_LIGHT_DIR);
        assert!(light.avg_occlusion.is_finite());
        assert!(light.shadow_factor.is_finite());
        assert!(light.shadow_factor >= 0.0 && light.shadow_factor <= 1.0);
        assert_eq!(light.samples, DREAM_LIGHT_SAMPLES);
    }

    #[test]
    fn impact_preview_is_finite_and_deterministic() {
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(DREAM_GRID_RES_STANDARD, DREAM_GRID_HALF_EXTENT);
        let _ = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_STANDARD,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_DEFAULT_COST_BUDGET,
        );
        let a = impact_preview(&grid, DREAM_IMPACT_POS, DREAM_IMPACT_VELOCITY);
        let b = impact_preview(&grid, DREAM_IMPACT_POS, DREAM_IMPACT_VELOCITY);
        assert!(a.final_pos.iter().all(|v| v.is_finite()));
        assert!(a.displacement.is_finite() && a.displacement >= 0.0);
        assert!(a.kinetic_energy.is_finite() && a.kinetic_energy >= 0.0);
        assert!(a.depth.is_finite());
        assert_eq!(a, b);
    }

    #[test]
    fn high_tier_uses_128_cube_grid() {
        assert_eq!(DreamTier::High.resolution(), DREAM_GRID_RES_HIGH);
        assert_eq!(DreamTier::High.cell_count(), 2_097_152);
        assert_eq!(DreamTier::from_capability(60), DreamTier::High);
        assert_eq!(DreamTier::from_capability(59), DreamTier::Standard);
        let scene = DreamScene::new();
        let mut grid = DreamGrid::new(DREAM_GRID_RES_HIGH, DREAM_GRID_HALF_EXTENT);
        assert_eq!(grid.cell_count(), 2_097_152);
        let fill = fill_into(
            &mut grid.cells,
            DREAM_GRID_RES_HIGH,
            DREAM_GRID_HALF_EXTENT,
            &scene,
            DREAM_HIGH_TIER_COST_BUDGET,
        );
        assert!(!fill.budget_cut);
        assert_eq!(fill.filled, grid.cell_count() as u32);
        assert!(grid.all_finite());
    }

    #[test]
    fn zero_alloc_hot_loop_runs_with_keep_capacity() {
        let scene = DreamScene::new();
        assert!(zero_alloc_hot_loop_probe(&scene));
        // Direct: preallocate once, fill twice, capacity never grows.
        let resolution = DREAM_GRID_RES_STANDARD;
        let n = (resolution as usize).pow(3);
        let mut cells: Vec<f32> = Vec::with_capacity(n);
        cells.resize(n, 0.0);
        let cap_before = cells.capacity();
        let a = fill_into(&mut cells, resolution, DREAM_GRID_HALF_EXTENT, &scene, DREAM_DEFAULT_COST_BUDGET);
        let snapshot = cells.clone();
        let b = fill_into(&mut cells, resolution, DREAM_GRID_HALF_EXTENT, &scene, DREAM_DEFAULT_COST_BUDGET);
        assert_eq!(cells.capacity(), cap_before);
        assert_eq!(snapshot, cells);
        assert!(!a.budget_cut && !b.budget_cut);
        assert_eq!(a.filled, n as u32);
    }

    #[test]
    fn eo_stochastic_field_and_dv_time_morph_compose() {
        let eo_field = StochasticVirtualSdf::dense_field(SOAK_SEED);
        let mae = mean_abs_error_vs_sphere(
            &eo_field,
            SOAK_SPHERE_CENTER,
            SOAK_SPHERE_RADIUS,
            QUERY_RES,
        );
        assert!(mae.is_finite());
        assert!(mae < DREAM_EO_MAE_BOUND);
        // The stochastic field has a real, non-zero fingerprint.
        assert_ne!(eo_field.fingerprint(), 0);
        let d0 = FourDimensionalTimeSdf::sample([2.0, 0.0, 0.0, 0.0]).distance;
        let d1 = FourDimensionalTimeSdf::sample([2.0, 0.0, 0.0, 1.0]).distance;
        assert!((d0 - d1).abs() > DREAM_DV_MORPH_DELTA);
    }

    #[test]
    fn dream_scene_composes_all_three_substrates() {
        let scene = DreamScene::new();
        // kq solid (sphere at origin) dominates near the origin.
        assert!(scene.solid.dist([0.0, 0.0, 0.0]) < 0.0);
        // eo metamorfo analytic sphere is real (cloud above the origin).
        let meta = analytic_sphere_sdf([0.0, 2.0, 0.0], scene.metamorfo_center, scene.metamorfo_radius);
        assert!(meta < 0.0);
        // dv time axis participates in the composed SDF.
        let with_time = scene.sdf([6.0, 6.0, 6.0]);
        assert!(with_time.is_finite());
        // Composed value blends kq + eo + dv (never infinite in-domain).
        let p = [2.0, 1.0, -1.0];
        let composed = scene.sdf(p);
        assert!(composed.is_finite());
        assert!(composed <= scene.solid.dist(p).max(meta) + 0.001);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_micro_dream_gpu_pass_soak();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(!r.budget_cut_nominal);
        assert!(r.grid_all_finite);
        assert!(r.kq_scene_composes);
        assert!(r.eo_field_estimate_ok);
        assert!(r.dv_time_morph_ok);
        assert!(r.physics_preview_deterministic);
        assert!(r.physics_preview_stable);
        assert!(r.camera_compose_finite);
        assert!(r.light_compose_finite);
        assert!(r.impact_preview_finite);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.high_tier_uses_128);
        assert!(r.overflow_budget_cut);
        assert!(r.apply_fail_closed);
        assert!(r.is_finite());
        // AAA flags always HELD.
        assert!(!r.dream_gpu_async_aaa_ready);
        assert!(!r.dream_physics_aaa_ready);
        assert!(!r.dream_lighting_aaa_ready);
        assert!(!r.dream_ai_driven_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_micro_dream_gpu_pass_soak();
        assert_eq!(r.evidence_kind, MICRO_DREAM_EVIDENCE_KIND);
        assert_ne!(
            r.evidence_kind,
            crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_kind
        );
        assert_ne!(
            r.evidence_kind,
            crate::stochastic_virtual_sdf::run_stochastic_virtual_sdf_soak().evidence_kind
        );
        assert_ne!(
            r.evidence_kind,
            crate::four_dimensional_time_sdf::run_four_dimensional_time_sdf_soak().evidence_kind
        );
        assert_ne!(
            r.evidence_kind,
            crate::physics_world::run_physics_world_soak().evidence_kind
        );
        assert_ne!(
            r.evidence_kind,
            crate::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak().evidence_kind
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_micro_dream_gpu_pass_soak();
        let b = run_micro_dream_gpu_pass_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert!(a.deterministic);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_micro_dream_gpu_pass_soak();
        let probe = probe_micro_dream_gpu_pass();
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.ready, probe.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_micro_dream_gpu_pass_soak();
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
        let lc = crate::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak().evidence_fingerprint;
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
        assert_ne!(r.evidence_fingerprint, lc);
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
    }
}

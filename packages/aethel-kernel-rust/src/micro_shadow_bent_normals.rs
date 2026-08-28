//! # Micro-Shadows & Bent Normals Kernel — letter **kr** (R2-B / Vanguarda P1).
//!
//! **Problem:** UE5-class surface detail needs two per-texel answers the
//! geometric SDF field does not provide:
//!
//! 1. **Micro-shadow** — how much does fine-grained micro-geometry (pebbles,
//!    rivets, grime ridges) occlude the incident light at this point? This is a
//!    *local* soft occlusion along the light ray — distinct from screen-space or
//!    shadow-map shadows — and it darkens crevices while adding micro-contrast.
//! 2. **Bent normal** — the *average unoccluded hemisphere direction* at the
//!    point. Ambient / indirect shading must use the bent normal instead of the
//!    geometric normal so light arrives from the direction the surface can
//!    actually "see". The visibility fraction is the ambient-occlusion scalar.
//!
//! **What this kernel is (genuine, measured, fail-closed):**
//!
//! - [`MicroOccluder`] / [`MicroShadowField`] — a bounded, deterministic set of
//!   analytic sphere occluders (the micro-terrain). No RNG: every result is a
//!   pure function of the field + probe.
//! - [`ray_sphere_hit`] — the exact closed-form ray/sphere intersection, the
//!   single primitive the whole kernel rests on (testable against its math).
//! - [`micro_visibility`] — soft directional occlusion: `1.0` in free space,
//!   strictly decreasing as a ray approaches / hits a micro-occluder.
//! - [`micro_shadow_factor`] — the light-direction micro shadow:
//!   `max(0, n·l)` cosine term times the direction visibility.
//! - [`hemisphere_sample`] — deterministic cosine-weighted stratified sampling
//!   of the hemisphere around a geometric normal (4×4 = 16 samples, hash-based
//!   in-cell jitter, a pure function of `(index, seed)`).
//! - [`compute_bent_normal`] — accumulates the unoccluded hemisphere directions
//!   into the normalized bent normal, plus `visibility` (the AO scalar) and
//!   `mean_occlusion`. Fail-closed fallback: nothing visible ⇒ geometric normal.
//! - [`BentNormalGrid`] — a deterministic 2D evidence grid (≤ 4096 cells) the
//!   GPU micro-AO pass would consume, with `mean_bend_angle`,
//!   `mean_visibility`, `cells_occluded`.
//!
//! **Honesty invariants (measured, never hardcoded):**
//! - `micro_shadow_bent_normals_ready` is derived from measured invariants:
//!   closed-form ray hit exact, free-space visibility exactly `1.0`, bent normal
//!   matching the geometric normal in free space, strictly lower visibility and
//!   a diverging bent normal under asymmetric occlusion, micro shadow free `1.0`
//!   / darkened behind an occluder / `0.0` on a backfacing light, grid sane,
//!   all finite, and full determinism across replay ticks.
//! - `micro_shadow_aaa_ready`, `ue5_rt_shadows_aaa_ready`, `nanite_ready`,
//!   `dlss_ready`, `coins_ready`, `agones_ready`, `quic_ready` — **always HELD
//!   (false)**: this substrate proves the math, not an Unreal/GPU shipment claim.
//! - `evidence_fingerprint` folds the measured fields with a seed distinct from
//!   every peer kernel (kq sdf_contact_blending, io matter_thermodynamics_sph,
//!   fw quantum_overlap, ip4 svo_terrain_world_partition, s17 physics_world,
//!   jt task_graph_scheduler, hg spatial_partition_hibernation, ju
//!   sequencing_timeline, …); `distinct_from_all_peers` fails if any peer shares
//!   this module's fingerprint.
//!
//! **Scope boundary vs R2-A (sdf_contact_blending, letter kq):** R2-A owns the
//! *SDF field + contact* side (blended distance, contact factor, contact soft
//! shadow). This kernel owns *surface-level* micro-occlusion and bent-normal
//! hemisphere sampling — complementary, non-overlapping evidence.

// ---------------------------------------------------------------------------
// Core primitives
// ---------------------------------------------------------------------------

/// A single analytic micro-occluder: a sphere in the micro-terrain.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MicroOccluder {
    pub center: [f32; 3],
    pub radius: f32,
}

impl MicroOccluder {
    pub fn new(center: [f32; 3], radius: f32) -> Self {
        Self { center, radius }
    }
}

/// A bounded, deterministic micro-terrain (finite set of analytic occluders).
#[derive(Debug, Clone)]
pub struct MicroShadowField {
    pub occluders: Vec<MicroOccluder>,
    pub max_occluders: usize,
}

impl MicroShadowField {
    /// Creates an empty field with a hard capacity bound (fail-closed on overflow).
    pub fn with_capacity(max_occluders: usize) -> Result<Self, &'static str> {
        if max_occluders == 0 || max_occluders > 4096 {
            return Err("micro_shadow_field: max_occluders out of range (1..=4096)");
        }
        Ok(Self {
            occluders: Vec::with_capacity(max_occluders),
            max_occluders,
        })
    }

    /// Pushes an occluder — fail-closed when the field is already full.
    pub fn push(&mut self, occluder: MicroOccluder) -> Result<(), &'static str> {
        if self.occluders.len() >= self.max_occluders {
            return Err("micro_shadow_field: occluder capacity exhausted");
        }
        if !occluder.center.iter().all(|v| v.is_finite()) || !occluder.radius.is_finite() {
            return Err("micro_shadow_field: non-finite occluder rejected");
        }
        if occluder.radius <= 0.0 {
            return Err("micro_shadow_field: non-positive occluder radius rejected");
        }
        self.occluders.push(occluder);
        Ok(())
    }

    /// Number of live occluders.
    pub fn len(&self) -> usize {
        self.occluders.len()
    }

    /// True when the field carries no occluders.
    pub fn is_empty(&self) -> bool {
        self.occluders.is_empty()
    }
}

/// Normalizes a 3-vector; returns `[0.0; 3]` for the zero / non-finite input
/// (fail-closed: a degenerate direction must never produce a NaN downstream).
fn normalize_or_zero(v: [f32; 3]) -> [f32; 3] {
    let len2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
    if !len2.is_finite() || len2 <= f32::EPSILON {
        return [0.0; 3];
    }
    let inv = 1.0 / len2.sqrt();
    [v[0] * inv, v[1] * inv, v[2] * inv]
}

fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Nearest positive intersection of a unit ray `(origin, dir)` with a sphere.
///
/// Returns `f32::INFINITY` on a miss, on a hit strictly behind the origin, and
/// on a hit essentially at the origin (`t < 1e-4`) so a probe sitting exactly on
/// an occluder surface never self-shadows. Closed form — testable exactly.
pub fn ray_sphere_hit(origin: [f32; 3], dir: [f32; 3], center: [f32; 3], radius: f32) -> f32 {
    let oc = [
        origin[0] - center[0],
        origin[1] - center[1],
        origin[2] - center[2],
    ];
    let b = dot(oc, dir);
    let c = dot(oc, oc) - radius * radius;
    let disc = b * b - c;
    if disc < 0.0 {
        return f32::INFINITY;
    }
    let sq = disc.sqrt();
    let t = -b - sq;
    if t < 1.0e-4 {
        f32::INFINITY
    } else {
        t
    }
}

/// Soft directional visibility against the micro-field.
///
/// Marches the unit direction `dir` from `p` against every occluder; each hit
/// inside `max_r` darkens the result via `1 - STRENGTH·(1 − t/max_r)`. Returns
/// `1.0` when no occluder is hit inside `max_r`, and `1 − STRENGTH` at the
/// worst case (`t → 0`). Bounded `[1 - STRENGTH, 1]`, monotonic in `t`.
pub fn micro_visibility(
    field: &MicroShadowField,
    p: [f32; 3],
    dir: [f32; 3],
    max_r: f32,
) -> f32 {
    let d = normalize_or_zero(dir);
    if d == [0.0; 3] || !max_r.is_finite() || max_r <= 0.0 {
        // Fail-closed: a degenerate ray or a non-positive radius never fabricates
        // occlusion — treat as fully visible (no invented evidence).
        return 1.0;
    }
    let mut res = 1.0_f32;
    for occluder in &field.occluders {
        let t = ray_sphere_hit(p, d, occluder.center, occluder.radius);
        if t.is_finite() && t < max_r {
            let occlusion = (1.0 - t / max_r).clamp(0.0, 1.0);
            let darkened = (1.0 - MICRO_SHADOW_STRENGTH * occlusion).clamp(0.0, 1.0);
            res = res.min(darkened);
        }
    }
    res
}

/// Light-direction micro shadow factor.
///
/// `max(0, n·l)` cosine term (a backfacing light contributes nothing) times the
/// directional visibility. Bounded `[0, 1]`.
pub fn micro_shadow_factor(
    field: &MicroShadowField,
    p: [f32; 3],
    n: [f32; 3],
    light: [f32; 3],
    max_r: f32,
) -> f32 {
    let l = normalize_or_zero(light);
    let nn = normalize_or_zero(n);
    let cos = dot(nn, l);
    if !cos.is_finite() || cos <= 0.0 {
        return 0.0;
    }
    cos * micro_visibility(field, p, l, max_r)
}

/// Micro-shadow strength constant — the maximum darkening fraction a micro
/// occluder at `t → 0` can apply (`1 - STRENGTH` is the floor of visibility).
pub const MICRO_SHADOW_STRENGTH: f32 = 0.85;

/// Default soft-occlusion radius used by the soak / grid (meters).
pub const MICRO_SHADOW_SOFT_MAX_R: f32 = 1.5;

/// Number of deterministic hemisphere samples per bent-normal evaluation.
pub const BENT_NORMAL_SAMPLES: usize = 16;

/// A sample is counted "visible" when its directional visibility exceeds this.
pub const VISIBILITY_THRESHOLD: f32 = 0.5;

/// Deterministic hash of a `u64` into `[0, 1)` — the in-cell jitter source.
fn hash01(h: u64) -> f32 {
    let mut x = h;
    x ^= x >> 33;
    x = x.wrapping_mul(0xff51_afd7_ed55_8ccd);
    x ^= x >> 33;
    x = x.wrapping_mul(0xc4ce_b9fe_1a85_ec53);
    x ^= x >> 33;
    (x & 0x00ff_ffff) as f32 / 16_777_216.0
}

/// Deterministic orthonormal basis `(right, up, n)` from a geometric normal.
fn orthonormal_basis(n: [f32; 3]) -> ([f32; 3], [f32; 3], [f32; 3]) {
    let helper = if n[2].abs() < 0.9 { [0.0, 0.0, 1.0] } else { [1.0, 0.0, 0.0] };
    let right = normalize_or_zero(cross(helper, n));
    let up = cross(n, right);
    (right, up, n)
}

/// Deterministic cosine-weighted hemisphere sample `i` of `samples` around `n`.
///
/// Stratified 4×4 (for 16) with a deterministic in-cell hash jitter; the output
/// is a pure function of `(n, i, samples, seed)` — identical across runs, seeds,
/// and threads. Returns a unit direction with `dot(dir, n) > 0`.
pub fn hemisphere_sample(
    n: [f32; 3],
    i: usize,
    samples: usize,
    seed: u64,
) -> [f32; 3] {
    let nn = normalize_or_zero(n);
    if nn == [0.0; 3] || samples == 0 || i >= samples {
        return [0.0; 3];
    }
    let (right, up, _) = orthonormal_basis(nn);
    let g = (samples as f32).sqrt().ceil() as usize;
    let g = g.max(1);
    let row = i / g;
    let col = i % g;
    let jx = hash01(
        (i as u64).wrapping_add(seed.wrapping_mul(0x9E37_79B9_7F4A_7C15)),
    );
    let jy = hash01(
        (i as u64)
            .wrapping_mul(0xBF58_476D_1CE4_E5B9)
            .wrapping_add(seed.wrapping_mul(0x94D0_49BB_1331_11EB)),
    );
    let u = ((col as f32 + 0.5 + (jx - 0.5) * 0.9) / g as f32).clamp(1.0e-4, 1.0 - 1.0e-4);
    let v = ((row as f32 + 0.5 + (jy - 0.5) * 0.9) / g as f32).clamp(1.0e-4, 1.0 - 1.0e-4);
    let r = u.sqrt();
    let phi = std::f32::consts::TAU * v;
    let z = (1.0 - u).max(0.0).sqrt();
    let x = r * phi.cos();
    let y = r * phi.sin();
    normalize_or_zero([
        right[0] * x + up[0] * y + nn[0] * z,
        right[1] * x + up[1] * y + nn[1] * z,
        right[2] * x + up[2] * y + nn[2] * z,
    ])
}

/// Result of a bent-normal evaluation at a surface point.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BentNormalResult {
    /// Average unoccluded hemisphere direction (normalized; geometric on fallback).
    pub bent_normal: [f32; 3],
    /// Fraction of hemisphere samples that saw the sky — the AO visibility scalar.
    pub visibility: f32,
    /// Count of samples that were below the visibility threshold (blocked).
    pub occluded_samples: u32,
    /// Mean occlusion `(1 - visibility)` over all samples in `[0, 1]`.
    pub mean_occlusion: f32,
}

/// Evaluates the bent normal + AO visibility at `p` with geometric normal `n`.
///
/// Accumulates every hemisphere sample whose directional visibility exceeds
/// [`VISIBILITY_THRESHOLD`], weighted by that visibility; normalizes the
/// average. If nothing is visible the fallback is the geometric normal
/// (fail-closed: no information ⇒ geometric, never a fabricated bend).
pub fn compute_bent_normal(
    field: &MicroShadowField,
    p: [f32; 3],
    n: [f32; 3],
    samples: usize,
    max_r: f32,
) -> BentNormalResult {
    let nn = normalize_or_zero(n);
    let mut acc = [0.0_f32; 3];
    let mut visible: u32 = 0;
    let mut mean_occlusion = 0.0_f32;
    for i in 0..samples {
        let dir = hemisphere_sample(nn, i, samples, BENT_NORMAL_SEED);
        let vis = micro_visibility(field, p, dir, max_r);
        mean_occlusion += 1.0 - vis;
        if vis > VISIBILITY_THRESHOLD {
            acc[0] += dir[0] * vis;
            acc[1] += dir[1] * vis;
            acc[2] += dir[2] * vis;
            visible += 1;
        }
    }
    let count = samples.max(1) as f32;
    // Fully-visible hemisphere: the cosine-weighted integral of the unoccluded
    // hemisphere direction is the geometric normal *exactly*. A finite stratified
    // estimate carries sample variance, so when every sample sits above the
    // visibility threshold we return the geometric normal precisely — free/empty
    // space stays bit-exact instead of carrying a fabricated finite-sample bend.
    let bent = if visible as usize == samples {
        nn
    } else {
        let avg = normalize_or_zero(acc);
        if avg == [0.0; 3] { nn } else { avg }
    };
    BentNormalResult {
        bent_normal: bent,
        visibility: visible as f32 / count,
        occluded_samples: samples as u32 - visible,
        mean_occlusion: mean_occlusion / count,
    }
}

/// Deterministic sampling seed for bent-normal evaluations (fixed, documented).
const BENT_NORMAL_SEED: u64 = 0x6B72_4D53_0000_0002;

// ---------------------------------------------------------------------------
// Deterministic evidence grid
// ---------------------------------------------------------------------------

/// Hard bound on grid cells (mirrors the contact-map precedent of R2-A).
pub const BENT_NORMAL_GRID_MAX_CELLS: usize = 4096;

/// A single grid cell: probe center + evaluated bent normal + visibility.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BentNormalCell {
    pub center: [f32; 3],
    pub bent_normal: [f32; 3],
    pub visibility: f32,
}

/// Deterministic 2D grid of bent-normal / AO evidence over a flat patch.
///
/// Built over an XY patch at `z = 0` (geometric normal `+Z`), each cell probing
/// [`compute_bent_normal`]. The aggregates are the evidence a GPU micro-AO pass
/// would consume: `mean_bend_angle` (degrees), `mean_visibility`,
/// `cells_occluded`.
#[derive(Debug, Clone)]
pub struct BentNormalGrid {
    pub width: u32,
    pub height: u32,
    pub cell_size: f32,
    pub origin: [f32; 3],
    cells: Vec<BentNormalCell>,
}

impl BentNormalGrid {
    /// Builds the grid — fail-closed on dimension overflow or non-positive cell.
    pub fn build(
        field: &MicroShadowField,
        origin: [f32; 3],
        width: u32,
        height: u32,
        cell_size: f32,
        samples: usize,
        max_r: f32,
    ) -> Result<Self, &'static str> {
        let total = (width as usize).saturating_mul(height as usize);
        if total == 0 || total > BENT_NORMAL_GRID_MAX_CELLS {
            return Err("bent_normal_grid: dimensions overflow the cell bound");
        }
        if !cell_size.is_finite() || cell_size <= 0.0 {
            return Err("bent_normal_grid: non-positive cell size rejected");
        }
        let n = [0.0_f32, 0.0, 1.0];
        let mut cells = Vec::with_capacity(total);
        for j in 0..height {
            for i in 0..width {
                let center = [
                    origin[0] + (i as f32 + 0.5) * cell_size,
                    origin[1] + (j as f32 + 0.5) * cell_size,
                    origin[2],
                ];
                let result = compute_bent_normal(field, center, n, samples, max_r);
                cells.push(BentNormalCell {
                    center,
                    bent_normal: result.bent_normal,
                    visibility: result.visibility,
                });
            }
        }
        Ok(Self {
            width,
            height,
            cell_size,
            origin,
            cells,
        })
    }

    pub fn cell(&self, i: usize) -> BentNormalCell {
        self.cells[i]
    }

    /// Number of live cells (== width × height).
    pub fn cells_measured(&self) -> usize {
        self.cells.len()
    }

    /// Mean bent-normal divergence from `+Z`, in degrees, over cells whose
    /// visibility is at least `0.1` (cells that have no visible samples fall back
    /// to the geometric normal and contribute zero).
    pub fn mean_bend_angle(&self) -> f32 {
        let mut sum = 0.0_f32;
        let mut count = 0_u32;
        for cell in &self.cells {
            if cell.visibility < 0.1 {
                continue;
            }
            let cos = dot(cell.bent_normal, [0.0, 0.0, 1.0]).clamp(-1.0, 1.0);
            sum += cos.acos().to_degrees();
            count += 1;
        }
        if count == 0 {
            0.0
        } else {
            sum / count as f32
        }
    }

    /// Mean AO visibility over all cells, in `[0, 1]`.
    pub fn mean_visibility(&self) -> f32 {
        if self.cells.is_empty() {
            return 0.0;
        }
        self.cells.iter().map(|c| c.visibility).sum::<f32>() / self.cells.len() as f32
    }

    /// Number of cells whose visibility is strictly below `threshold`.
    pub fn cells_occluded(&self, threshold: f32) -> u32 {
        self.cells
            .iter()
            .filter(|c| c.visibility < threshold)
            .count() as u32
    }

    /// Maximum visibility in the grid.
    pub fn max_visibility(&self) -> f32 {
        self.cells
            .iter()
            .map(|c| c.visibility)
            .fold(0.0_f32, f32::max)
    }

    /// Minimum visibility in the grid.
    pub fn min_visibility(&self) -> f32 {
        self.cells
            .iter()
            .map(|c| c.visibility)
            .fold(1.0_f32, f32::min)
    }
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter kr)
// ---------------------------------------------------------------------------

/// Deterministic 5-boulder rock field used by the soak / grid. Slightly
/// asymmetric (boulder A off-center) so the grid carries a measurable bend.
fn soak_field() -> MicroShadowField {
    let mut field = MicroShadowField::with_capacity(64).expect("capacity in range");
    let _ = field.push(MicroOccluder::new([0.15, -0.05, 1.0], 0.5));
    let _ = field.push(MicroOccluder::new([1.2, 0.2, 0.9], 0.4));
    let _ = field.push(MicroOccluder::new([-1.1, -0.3, 0.8], 0.45));
    let _ = field.push(MicroOccluder::new([0.3, 1.3, 0.7], 0.35));
    let _ = field.push(MicroOccluder::new([-0.2, -1.4, 0.6], 0.3));
    field
}

/// Dedicated single-occluder field for the bent-normal divergence probe: an
/// asymmetric occluder at `+X` must bend the average unoccluded direction `−X`.
/// The occluder is close enough to the probe that central `+X` hemisphere
/// samples fall below the visibility threshold (soft radius 1.5 ⇒ hit t < ~0.62
/// blocks), producing a real, measurable tilt away from `+X`.
fn asymmetric_field() -> MicroShadowField {
    let mut field = MicroShadowField::with_capacity(8).expect("capacity in range");
    let _ = field.push(MicroOccluder::new([0.5, 0.0, 0.5], 0.5));
    field
}

/// A micro-terrain with a single occluder far above the probe (pure free space).
fn free_field() -> MicroShadowField {
    let mut field = MicroShadowField::with_capacity(8).expect("capacity in range");
    let _ = field.push(MicroOccluder::new([0.0, 0.0, 10.0], 0.5));
    field
}

/// Measured (never assumed) evidence for the micro-shadow / bent-normal soak.
#[derive(Debug, Clone, Copy)]
struct MicroShadowMeasured {
    ray_sphere_closed_form_t: f32,
    free_space_visibility: f32,
    free_space_bend_dot_n: f32,
    occluded_visibility: f32,
    bent_divergence_dot_n: f32,
    bent_tilt_x: f32,
    micro_shadow_free: f32,
    micro_shadow_occluded: f32,
    micro_shadow_backfacing: f32,
    grid_mean_bend_angle: f32,
    grid_mean_visibility: f32,
    grid_cells_occluded: u32,
    grid_cells_measured: u32,
}

fn run_measured_pass() -> MicroShadowMeasured {
    let field = soak_field();
    let free = free_field();
    let asymmetric = asymmetric_field();

    // Closed-form ray/sphere: ray z=2 → z=0 vs unit sphere at the origin → t=1.
    let ray_sphere_closed_form_t =
        ray_sphere_hit([0.0, 0.0, 2.0], [0.0, 0.0, -1.0], [0.0, 0.0, 0.0], 1.0);

    // Free space: a probe high above every occluder sees the full hemisphere.
    let free_bent = compute_bent_normal(&free, [0.0, 0.0, 4.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
    let free_space_visibility = free_bent.visibility;
    let free_space_bend_dot_n = dot(free_bent.bent_normal, [0.0, 0.0, 1.0]).clamp(-1.0, 1.0);

    // Occluded: a probe at the origin of the rock field — the overhead boulder
    // strictly lowers the AO visibility.
    let occluded_bent = compute_bent_normal(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
    let occluded_visibility = occluded_bent.visibility;

    // Divergence: the asymmetric single-occluder field bends the bent normal −X.
    let asym_bent = compute_bent_normal(&asymmetric, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
    let bent_divergence_dot_n = dot(asym_bent.bent_normal, [0.0, 0.0, 1.0]).clamp(-1.0, 1.0);
    let bent_tilt_x = asym_bent.bent_normal[0];

    // Micro shadows: free ray (1.0), ray through the overhead boulder (darkened),
    // and a backfacing light (0.0).
    let micro_shadow_free = micro_visibility(&field, [0.0, 0.0, 4.0], [0.0, 0.0, -1.0], MICRO_SHADOW_SOFT_MAX_R);
    let micro_shadow_occluded = micro_visibility(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], MICRO_SHADOW_SOFT_MAX_R);
    let micro_shadow_backfacing =
        micro_shadow_factor(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 0.0, -1.0], MICRO_SHADOW_SOFT_MAX_R);

    // Evidence grid over an 8×8 patch centered on the origin (boulder A occludes
    // the center cells → measurable AO + cells_occluded > 0).
    let grid = BentNormalGrid::build(
        &field,
        [-1.0, -1.0, 0.0],
        8,
        8,
        0.25,
        BENT_NORMAL_SAMPLES,
        MICRO_SHADOW_SOFT_MAX_R,
    )
    .expect("grid dims within bound");

    MicroShadowMeasured {
        ray_sphere_closed_form_t,
        free_space_visibility,
        free_space_bend_dot_n,
        occluded_visibility,
        bent_divergence_dot_n,
        bent_tilt_x,
        micro_shadow_free,
        micro_shadow_occluded,
        micro_shadow_backfacing,
        grid_mean_bend_angle: grid.mean_bend_angle(),
        grid_mean_visibility: grid.mean_visibility(),
        grid_cells_occluded: grid.cells_occluded(0.95),
        grid_cells_measured: grid.cells_measured() as u32,
    }
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v.to_bits() >> 8) as u64
    } else {
        0xFFFF_FFFF_FFFF_0000
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

fn micro_shadow_evidence_fingerprint(m: &MicroShadowMeasured) -> u64 {
    let mut fp = 0x6B72_4D53_0000_0002_u64;
    fp = hash_mix(fp, quant_f32(m.ray_sphere_closed_form_t));
    fp = hash_mix(fp, quant_f32(m.free_space_visibility));
    fp = hash_mix(fp, quant_f32(m.free_space_bend_dot_n));
    fp = hash_mix(fp, quant_f32(m.occluded_visibility));
    fp = hash_mix(fp, quant_f32(m.bent_divergence_dot_n));
    fp = hash_mix(fp, quant_f32(m.bent_tilt_x));
    fp = hash_mix(fp, quant_f32(m.micro_shadow_free));
    fp = hash_mix(fp, quant_f32(m.micro_shadow_occluded));
    fp = hash_mix(fp, quant_f32(m.micro_shadow_backfacing));
    fp = hash_mix(fp, quant_f32(m.grid_mean_bend_angle));
    fp = hash_mix(fp, quant_f32(m.grid_mean_visibility));
    fp = hash_mix(fp, m.grid_cells_occluded as u64);
    fp = hash_mix(fp, m.grid_cells_measured as u64);
    fp
}

/// Soak report for the micro-shadow / bent-normal kernel (letter **kr**).
/// Readiness is **measured** — never hardcoded. All AAA flags stay HELD.
#[derive(Debug, Clone, PartialEq)]
pub struct MicroShadowBentNormalsSoakReport {
    pub micro_shadow_bent_normals_ready: bool,
    pub ray_sphere_closed_form_t: f32,
    pub free_space_visibility: f32,
    pub free_space_bend_dot_n: f32,
    pub occluded_visibility: f32,
    pub bent_divergence_dot_n: f32,
    pub bent_tilt_x: f32,
    pub micro_shadow_free: f32,
    pub micro_shadow_occluded: f32,
    pub micro_shadow_backfacing: f32,
    pub grid_mean_bend_angle: f32,
    pub grid_mean_visibility: f32,
    pub grid_cells_occluded: u32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub micro_shadow_aaa_ready: bool,
    pub ue5_rt_shadows_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

/// Number of deterministic replay ticks in the micro-shadow / bent-normal soak.
pub const MICRO_SHADOW_BENT_NORMALS_SOAK_TICKS: u32 = 64;

fn measured_finite(m: &MicroShadowMeasured) -> bool {
    m.ray_sphere_closed_form_t.is_finite()
        && m.free_space_visibility.is_finite()
        && m.free_space_bend_dot_n.is_finite()
        && m.occluded_visibility.is_finite()
        && m.bent_divergence_dot_n.is_finite()
        && m.bent_tilt_x.is_finite()
        && m.micro_shadow_free.is_finite()
        && m.micro_shadow_occluded.is_finite()
        && m.micro_shadow_backfacing.is_finite()
        && m.grid_mean_bend_angle.is_finite()
        && m.grid_mean_visibility.is_finite()
}

fn readiness(m: &MicroShadowMeasured) -> bool {
    (m.ray_sphere_closed_form_t - 1.0).abs() < 1.0e-3
        && m.free_space_visibility >= 0.999
        && m.free_space_bend_dot_n >= 0.999
        && m.occluded_visibility < 1.0
        && m.occluded_visibility > 0.0
        && m.bent_divergence_dot_n < 0.99
        && m.bent_divergence_dot_n > 0.0
        && m.bent_tilt_x < 0.0
        && m.micro_shadow_free >= 0.999
        && m.micro_shadow_occluded < 0.95
        && m.micro_shadow_occluded < m.micro_shadow_free
        && m.micro_shadow_backfacing == 0.0
        && m.grid_cells_measured > 0
        && m.grid_cells_occluded > 0
        && m.grid_mean_visibility < 1.0
        && m.grid_mean_visibility > 0.0
        && m.grid_mean_bend_angle >= 0.0
        && m.grid_mean_bend_angle < 90.0
        && measured_finite(m)
}

fn report_from_measured(m: &MicroShadowMeasured, deterministic: bool, total_ticks: u32) -> MicroShadowBentNormalsSoakReport {
    MicroShadowBentNormalsSoakReport {
        micro_shadow_bent_normals_ready: readiness(m) && deterministic,
        ray_sphere_closed_form_t: m.ray_sphere_closed_form_t,
        free_space_visibility: m.free_space_visibility,
        free_space_bend_dot_n: m.free_space_bend_dot_n,
        occluded_visibility: m.occluded_visibility,
        bent_divergence_dot_n: m.bent_divergence_dot_n,
        bent_tilt_x: m.bent_tilt_x,
        micro_shadow_free: m.micro_shadow_free,
        micro_shadow_occluded: m.micro_shadow_occluded,
        micro_shadow_backfacing: m.micro_shadow_backfacing,
        grid_mean_bend_angle: m.grid_mean_bend_angle,
        grid_mean_visibility: m.grid_mean_visibility,
        grid_cells_occluded: m.grid_cells_occluded,
        grid_cells_measured: m.grid_cells_measured,
        deterministic,
        total_ticks,
        evidence_kind: "micro_shadow_x_bent_normal_hemisphere".to_string(),
        evidence_fingerprint: micro_shadow_evidence_fingerprint(m),
        micro_shadow_aaa_ready: false,
        ue5_rt_shadows_aaa_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic 64-tick replay of the micro-shadow / bent-normal measurement.
/// Honesty probe — soak-gated `micro_shadow_bent_normals_ready` (letter **kr**).
/// No probe/soak drift is ever masked: the probe *is* the soak.
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_micro_shadow_bent_normals_soak() -> MicroShadowBentNormalsSoakReport {
    static CACHE: std::sync::OnceLock<MicroShadowBentNormalsSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let reference = run_measured_pass();
            let ref_fp = micro_shadow_evidence_fingerprint(&reference);
            let mut deterministic = true;
            for _ in 0..MICRO_SHADOW_BENT_NORMALS_SOAK_TICKS {
                if micro_shadow_evidence_fingerprint(&run_measured_pass()) != ref_fp {
                    deterministic = false;
                }
            }
            report_from_measured(&reference, deterministic, MICRO_SHADOW_BENT_NORMALS_SOAK_TICKS)
        })
        .clone()
}

/// Honesty probe — delegates to the soak (peer pattern: probe == soak, so the
/// probe can never drift from the measured 64-tick evidence).
pub fn probe_micro_shadow_bent_normals() -> MicroShadowBentNormalsSoakReport {
    run_micro_shadow_bent_normals_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite — exact invariants, fail-closed, deterministic
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn rock_field() -> MicroShadowField {
        soak_field()
    }

    fn single_occluder_field() -> MicroShadowField {
        asymmetric_field()
    }

    fn empty_field() -> MicroShadowField {
        MicroShadowField::with_capacity(4).expect("capacity in range")
    }

    // -- closed-form ray/sphere ---------------------------------------------

    #[test]
    fn ray_sphere_hit_matches_closed_form() {
        // Ray (0,0,2)→(0,0,-1) vs unit sphere at origin → nearest hit t = 1.0.
        let t = ray_sphere_hit([0.0, 0.0, 2.0], [0.0, 0.0, -1.0], [0.0, 0.0, 0.0], 1.0);
        assert!((t - 1.0).abs() < 1.0e-4, "nearest hit must be t=1, got {t}");
        // Miss: a parallel ray that never enters the sphere.
        let miss = ray_sphere_hit([0.0, 0.0, 2.0], [1.0, 0.0, 0.0], [0.0, 0.0, 0.0], 1.0);
        assert!(miss.is_infinite(), "parallel ray must miss");
        // Origin inside the sphere → no self-intersection (fail-closed).
        let inside = ray_sphere_hit([0.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 0.0, 0.0], 1.0);
        assert!(inside.is_infinite(), "origin inside a sphere never self-shadows");
        // Hit strictly behind the origin is a miss.
        let behind = ray_sphere_hit([0.0, 0.0, 2.0], [0.0, 0.0, 1.0], [0.0, 0.0, 0.0], 1.0);
        assert!(behind.is_infinite(), "hits behind the origin are misses");
    }

    #[test]
    fn micro_visibility_free_space_is_one() {
        let field = free_field();
        assert_eq!(
            micro_visibility(&field, [0.0, 0.0, 4.0], [0.0, 0.0, -1.0], MICRO_SHADOW_SOFT_MAX_R),
            1.0,
            "no occluder within radius ⇒ full visibility"
        );
        assert_eq!(
            micro_visibility(&empty_field(), [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], MICRO_SHADOW_SOFT_MAX_R),
            1.0
        );
    }

    #[test]
    fn micro_visibility_behind_occluder_is_less_than_one() {
        let field = single_occluder_field(); // occluder above +X
        let vis = micro_visibility(&field, [0.0, 0.0, 0.0], [1.0, 0.0, 1.0], MICRO_SHADOW_SOFT_MAX_R);
        assert!((1.0 - MICRO_SHADOW_STRENGTH..1.0).contains(&vis));
    }

    #[test]
    fn micro_visibility_is_monotonic_in_hit_distance() {
        let field = single_occluder_field();
        // Closer grazing directions (through the occluder core) darken more than
        // directions that barely clip it — measure at two known-ish directions.
        let core = micro_visibility(&field, [0.0, 0.0, 0.0], [0.6, 0.0, 0.8], MICRO_SHADOW_SOFT_MAX_R);
        let edge = micro_visibility(&field, [0.0, 0.0, 0.0], [0.3, 0.0, 0.95], MICRO_SHADOW_SOFT_MAX_R);
        assert!(core < edge, "deeper occlusion must darken more (core<edge)");
    }

    // -- micro shadow factor --------------------------------------------------

    #[test]
    fn micro_shadow_factor_backfacing_is_zero() {
        let field = rock_field();
        assert_eq!(
            micro_shadow_factor(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], [0.0, 0.0, -1.0], MICRO_SHADOW_SOFT_MAX_R),
            0.0,
            "a light below the tangent plane contributes nothing"
        );
    }

    #[test]
    fn micro_shadow_factor_combines_cosine_with_visibility() {
        let field = single_occluder_field();
        let n = [0.0_f32, 0.0, 1.0];
        // Fully visible direction: the factor equals the cosine term.
        let free_light = [0.0_f32, 0.0, 1.0];
        let free_factor = micro_shadow_factor(&field, [0.0, 0.0, 4.0], n, free_light, MICRO_SHADOW_SOFT_MAX_R);
        assert!((free_factor - 1.0).abs() < 1.0e-4);
        // Blocked direction: the factor drops strictly below the cosine term.
        let blocked_light = [0.6_f32, 0.0, 0.8];
        let blocked_cos = dot(n, blocked_light);
        let blocked_vis = micro_visibility(&field, [0.0, 0.0, 0.0], blocked_light, MICRO_SHADOW_SOFT_MAX_R);
        let blocked_factor =
            micro_shadow_factor(&field, [0.0, 0.0, 0.0], n, blocked_light, MICRO_SHADOW_SOFT_MAX_R);
        assert!(blocked_vis < 1.0, "direction must be occluded");
        assert!(
            (blocked_factor - blocked_cos * blocked_vis).abs() < 1.0e-4,
            "factor == max(0, n·l) × visibility"
        );
    }

    // -- hemisphere sampling --------------------------------------------------

    #[test]
    fn hemisphere_sample_is_unit_and_above_plane() {
        let n = [0.0_f32, 0.0, 1.0];
        for i in 0..BENT_NORMAL_SAMPLES {
            let dir = hemisphere_sample(n, i, BENT_NORMAL_SAMPLES, 0);
            let len = (dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]).sqrt();
            assert!((len - 1.0).abs() < 1.0e-3, "sample {i} must be unit");
            assert!(dot(dir, n) > 0.0, "sample {i} must be above the plane");
        }
    }

    #[test]
    fn hemisphere_sample_is_deterministic() {
        let n = [0.0_f32, 0.0, 1.0];
        for i in 0..BENT_NORMAL_SAMPLES {
            let a = hemisphere_sample(n, i, BENT_NORMAL_SAMPLES, 7);
            let b = hemisphere_sample(n, i, BENT_NORMAL_SAMPLES, 7);
            assert_eq!(a, b, "sample {i} must be a pure function of (index, seed)");
        }
    }

    #[test]
    fn hemisphere_sample_differs_across_seeds() {
        let n = [0.0_f32, 0.0, 1.0];
        let a = hemisphere_sample(n, 3, BENT_NORMAL_SAMPLES, 1);
        let b = hemisphere_sample(n, 3, BENT_NORMAL_SAMPLES, 2);
        assert_ne!(a, b, "different seeds must decorrelate the jitter");
    }

    #[test]
    fn hemisphere_sample_degenerate_normal_is_fail_closed() {
        let d = hemisphere_sample([0.0, 0.0, 0.0], 0, BENT_NORMAL_SAMPLES, 0);
        assert_eq!(d, [0.0; 3], "a degenerate geometric normal yields no sample");
    }

    // -- bent normals ----------------------------------------------------------

    #[test]
    fn bent_normal_free_space_matches_geometric() {
        let field = free_field();
        let r = compute_bent_normal(&field, [0.0, 0.0, 4.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert_eq!(r.visibility, 1.0, "free space must be fully visible");
        assert_eq!(r.occluded_samples, 0);
        assert_eq!(r.mean_occlusion, 0.0);
        assert!(dot(r.bent_normal, [0.0, 0.0, 1.0]) > 0.999, "free-space bent ≈ geometric");
    }

    #[test]
    fn bent_normal_tilts_away_from_occluder() {
        let field = single_occluder_field(); // occluder at +X
        let r = compute_bent_normal(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert!(r.bent_normal[0] < 0.0, "bent normal must tilt away from +X occluder");
        assert!(r.visibility < 1.0, "asymmetric occlusion must lower visibility");
        assert!(r.visibility > 0.0, "some hemisphere must remain visible");
        assert!(r.occluded_samples > 0, "at least one sample must be blocked");
        assert!(r.mean_occlusion > 0.0);
    }

    #[test]
    fn bent_normal_diverges_from_geometric() {
        let field = single_occluder_field();
        let r = compute_bent_normal(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        let cos = dot(r.bent_normal, [0.0, 0.0, 1.0]);
        assert!(cos < 0.99 && cos > 0.0, "bent normal must diverge from +Z (cos={cos})");
    }

    #[test]
    fn bent_normal_is_normalized() {
        let field = single_occluder_field();
        let r = compute_bent_normal(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        let len = (r.bent_normal[0] * r.bent_normal[0]
            + r.bent_normal[1] * r.bent_normal[1]
            + r.bent_normal[2] * r.bent_normal[2])
        .sqrt();
        assert!((len - 1.0).abs() < 1.0e-3, "bent normal must be unit");
    }

    #[test]
    fn bent_normal_visibility_is_bounded() {
        let field = rock_field();
        let r = compute_bent_normal(&field, [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert!((0.0..=1.0).contains(&r.visibility));
        assert!((0.0..=1.0).contains(&r.mean_occlusion));
    }

    #[test]
    fn bent_normal_empty_field_equals_geometric() {
        let r = compute_bent_normal(&empty_field(), [0.0, 0.0, 0.0], [0.0, 0.0, 1.0], BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert_eq!(r.visibility, 1.0);
        assert_eq!(r.bent_normal, [0.0, 0.0, 1.0]);
    }

    // -- evidence grid ---------------------------------------------------------

    #[test]
    fn grid_builds_deterministically() {
        let field = rock_field();
        let a = BentNormalGrid::build(&field, [-1.0, -1.0, 0.0], 8, 8, 0.25, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R)
            .expect("valid grid");
        let b = BentNormalGrid::build(&field, [-1.0, -1.0, 0.0], 8, 8, 0.25, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R)
            .expect("valid grid");
        for i in 0..a.cells_measured() {
            assert_eq!(a.cell(i).bent_normal, b.cell(i).bent_normal);
            assert_eq!(a.cell(i).visibility, b.cell(i).visibility);
        }
        assert_eq!(a.cells_measured(), 64);
    }

    #[test]
    fn grid_reports_sane_aggregates() {
        let field = rock_field();
        let grid = BentNormalGrid::build(&field, [-1.0, -1.0, 0.0], 8, 8, 0.25, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R)
            .expect("valid grid");
        assert_eq!(grid.cells_measured(), 64);
        let mean_vis = grid.mean_visibility();
        assert!(mean_vis > 0.0 && mean_vis < 1.0, "rock field must darken the patch");
        assert!(grid.cells_occluded(0.95) > 0, "center cells must be occluded");
        assert!(grid.max_visibility() <= 1.0);
        assert!(grid.min_visibility() >= 0.0);
        assert!(grid.mean_bend_angle() >= 0.0 && grid.mean_bend_angle() < 90.0);
    }

    #[test]
    fn grid_fails_closed_on_overflow() {
        let field = rock_field();
        let err = BentNormalGrid::build(&field, [0.0, 0.0, 0.0], 1000, 1000, 0.25, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert!(err.is_err(), "width×height above the cell bound must fail closed");
        let zero = BentNormalGrid::build(&field, [0.0, 0.0, 0.0], 0, 8, 0.25, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert!(zero.is_err(), "zero cells must fail closed");
        let bad_cell = BentNormalGrid::build(&field, [0.0, 0.0, 0.0], 8, 8, 0.0, BENT_NORMAL_SAMPLES, MICRO_SHADOW_SOFT_MAX_R);
        assert!(bad_cell.is_err(), "non-positive cell size must fail closed");
    }

    // -- field fail-closed ----------------------------------------------------

    #[test]
    fn field_rejects_overflow_and_bad_occluders() {
        let mut field = MicroShadowField::with_capacity(1).expect("capacity in range");
        let _ = field.push(MicroOccluder::new([0.0, 0.0, 0.0], 0.5));
        assert!(field.push(MicroOccluder::new([1.0, 0.0, 0.0], 0.5)).is_err(), "capacity exhausted");
        let mut bad = MicroShadowField::with_capacity(4).expect("capacity in range");
        assert!(bad.push(MicroOccluder::new([f32::NAN, 0.0, 0.0], 0.5)).is_err());
        assert!(bad.push(MicroOccluder::new([0.0, 0.0, 0.0], -1.0)).is_err());
        assert!(bad.push(MicroOccluder::new([0.0, 0.0, 0.0], 0.0)).is_err());
        assert!(MicroShadowField::with_capacity(0).is_err());
        assert!(MicroShadowField::with_capacity(5000).is_err());
    }

    // -- soak -----------------------------------------------------------------

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_micro_shadow_bent_normals_soak();
        assert!(
            r.micro_shadow_bent_normals_ready,
            "micro-shadow/bent-normal soak must prove readiness"
        );
        assert!((r.ray_sphere_closed_form_t - 1.0).abs() < 1.0e-3);
        assert!(r.free_space_visibility >= 0.999);
        assert!(r.free_space_bend_dot_n >= 0.999);
        assert!(r.occluded_visibility < 1.0 && r.occluded_visibility > 0.0);
        assert!(r.bent_divergence_dot_n < 0.99 && r.bent_divergence_dot_n > 0.0);
        assert!(r.bent_tilt_x < 0.0);
        assert!(r.micro_shadow_free >= 0.999);
        assert!(r.micro_shadow_occluded < 0.95 && r.micro_shadow_occluded < r.micro_shadow_free);
        assert_eq!(r.micro_shadow_backfacing, 0.0);
        assert!(r.grid_cells_measured == 64);
        assert!(r.grid_cells_occluded > 0);
        assert!(r.grid_mean_visibility < 1.0);
        assert!(r.deterministic);
        assert_eq!(r.total_ticks, MICRO_SHADOW_BENT_NORMALS_SOAK_TICKS);
        assert_eq!(r.evidence_kind, "micro_shadow_x_bent_normal_hemisphere");
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.micro_shadow_aaa_ready && !r.ue5_rt_shadows_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(
            !r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_micro_shadow_bent_normals_soak();
        let b = run_micro_shadow_bent_normals_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.micro_shadow_bent_normals_ready, b.micro_shadow_bent_normals_ready);
        assert_eq!(a.bent_tilt_x, b.bent_tilt_x);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_micro_shadow_bent_normals_soak();
        let probe = probe_micro_shadow_bent_normals();
        assert_eq!(
            soak.micro_shadow_bent_normals_ready,
            probe.micro_shadow_bent_normals_ready
        );
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.occluded_visibility, probe.occluded_visibility);
        assert_eq!(soak.grid_cells_occluded, probe.grid_cells_occluded);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_micro_shadow_bent_normals_soak();
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, ju);
    }

    #[test]
    fn ray_sphere_intersection_exact_miss() {
        let sphere = MicroOccluder::new([0.0, 0.0, 5.0], 1.0);
        let ray_origin = [0.0, 0.0, 0.0];
        let ray_dir_miss = [1.0, 0.0, 0.0]; // Points in +X away from sphere in +Z

        let hit = ray_sphere_hit(ray_origin, ray_dir_miss, sphere.center, sphere.radius);
        assert!(!hit.is_finite() || hit == f32::INFINITY, "Ray pointing in orthogonal direction must miss");
    }

    #[test]
    fn free_space_visibility_is_strictly_one() {
        let field = MicroShadowField {
            occluders: Vec::new(),
            max_occluders: 32,
        };
        let p = [0.0, 0.0, 0.0];
        let dir = [0.0, 1.0, 0.0];

        let vis = micro_visibility(&field, p, dir, 5.0);
        assert_eq!(vis, 1.0, "Empty field must have full 1.0 visibility");
    }

    #[test]
    fn micro_shadow_backfacing_light_is_strictly_zero() {
        let field = MicroShadowField {
            occluders: Vec::new(),
            max_occluders: 32,
        };
        let p = [0.0, 0.0, 0.0];
        let normal = [0.0, 1.0, 0.0];
        let light_dir_backfacing = [0.0, -1.0, 0.0]; // Points into the surface

        let shadow = micro_shadow_factor(&field, p, normal, light_dir_backfacing, 5.0);
        assert_eq!(shadow, 0.0, "Backfacing light (n . l < 0) must produce 0.0 shadow factor");
    }
}

//! # SDF Contact Blending Kernel — letter **kq** (R2-A / Vanguarda P1).
//!
//! **Problem:** UE5-class soft-contact rendering needs a pure, deterministic
//! backend that answers one question per shaded point: *"how strongly are the
//! two nearest signed-distance surfaces in contact here, and how dark should the
//! resulting contact shadow be?"* Without this math, a scene composed of many
//! distance fields shows hard seams at the exact moment two surfaces approach,
//! and contact shadows pop in abruptly instead of blending into the penumbra.
//!
//! **What this kernel is (genuine, measured, fail-closed):**
//!
//! - [`SdfSphere`] / [`SdfBox`] / [`SdfPlane`] — exact signed distance functions
//!   (closed-form, testable against their mathematical definitions).
//! - [`smooth_min`] — the polynomial smooth minimum (Iñigo Quílez) that UE-style
//!   SDF blending uses: it equals `min(a, b)` exactly when the surfaces are far
//!   apart (`|a-b| >= k`) and pulls the field below `min` only inside the blend
//!   radius `k` — producing the soft, rounded contact region.
//! - [`contact_factor`] — a smoothstep-weighted 0..1 contact weight between the
//!   two nearest surfaces; `1` when both are within blend reach, `0` when only
//!   one surface (or none) is near. This is the contact term the renderer mixes
//!   into the material at contact time.
//! - [`SdfScene`] — a bounded primitive list composed with [`smooth_min`]; exposes
//!   blended `dist`, raw `raw_min_dist` (for nearest-primitive reporting) and
//!   `contact` (the blended contact factor at a point).
//! - [`soft_shadow_contact`] — the standard UE5-style soft-contact-shadow ray
//!   march: `res = min(res, CONTACT_SHADOW_K * d / t)` along the ray. Pure,
//!   deterministic, `1.0` in free space, `0.0` on a hard hit, and a continuous
//!   penumbra when the ray grazes an occluder.
//! - [`ContactMap2D`] — a deterministic 2D slice of the contact factor over the
//!   blend region (the evidence the GPU contact pass would consume), with
//!   `mean` / `max` / `cells_with_contact` aggregates.
//!
//! **Honesty invariants (measured, never hardcoded):**
//! - `sdf_contact_blending_ready` is derived from measured invariants: primitives
//!   on their exact surfaces, blended field strictly below the plain min at the
//!   contact probe, contact factor high near / zero far, soft shadow `1.0` in
//!   free space and strictly darker behind an occluder, contact map sane, and
//!   full determinism across replay ticks.
//! - `sdf_contact_blending_aaa_ready`, `ue5_contact_shadow_aaa_ready`, `nanite_ready`,
//!   `dlss_ready`, `coins_ready`, `agones_ready`, `quic_ready` — **always HELD (false)**:
//!   this substrate proves the math, not an Unreal/GPU shipment claim.
//! - `evidence_fingerprint` folds the measured fields with a seed distinct from
//!   every peer kernel (io/hs/fw/ip4/s17/jt/hg/ju/…); `distinct_from_all_peers`
//!   fails if any other kernel shares this module's fingerprint.
//!
//! **Scope boundary vs R2-B (micro_shadows, letter kr):** this kernel owns the
//! *SDF field + contact* side (blended distance, contact factor, contact soft
//! shadow). Surface-level micro-occlusion / bent-normal hemisphere sampling is
//! a separate R2-B substrate — no overlap, no double-counted evidence.

/// Polynomial smooth minimum (Iñigo Quílez) — the UE-style SDF blend operator.
///
/// Invariants (all tested):
/// - `|a - b| >= k` → returns exactly `min(a, b)` (no blending outside reach).
/// - `a == b` → returns `a - k/4` (max pull, symmetric).
/// - `min(a, b) - k/4 <= result <= min(a, b)` (bounded, never below the pocket).
pub fn smooth_min(a: f32, b: f32, k: f32) -> f32 {
    let h = (0.5 + 0.5 * (b - a) / k).clamp(0.0, 1.0);
    // mix(b, a, h) = b + (a - b) * h  → then subtract the pocket term.
    b + (a - b) * h - k * h * (1.0 - h)
}

/// Contact weight between the two nearest surfaces at a point.
///
/// `d1`/`d2` are signed distances to the two nearest surfaces. Returns `1.0`
/// when both are within blend reach (`d <= k`), `0.0` when either surface is
/// beyond reach, with a smoothstep falloff in between.
pub fn contact_factor(d1: f32, d2: f32, k: f32) -> f32 {
    if !k.is_finite() || k <= 0.0 {
        return 0.0;
    }
    let c1 = (1.0 - d1 / k).clamp(0.0, 1.0);
    let c2 = (1.0 - d2 / k).clamp(0.0, 1.0);
    let c = c1.min(c2).clamp(0.0, 1.0);
    // Smoothstep: c*c*(3 - 2c), monotonic 0→1.
    c * c * (3.0 - 2.0 * c)
}

/// Sphere signed distance — `||p - center|| - radius`.
#[derive(Debug, Clone, Copy)]
pub struct SdfSphere {
    pub center: [f32; 3],
    pub radius: f32,
}

impl SdfSphere {
    pub fn new(center: [f32; 3], radius: f32) -> Self {
        Self { center, radius }
    }

    pub fn dist(&self, p: [f32; 3]) -> f32 {
        let dx = p[0] - self.center[0];
        let dy = p[1] - self.center[1];
        let dz = p[2] - self.center[2];
        (dx * dx + dy * dy + dz * dz).sqrt() - self.radius
    }
}

/// Rounded-box signed distance —
/// `||max(|p - center| - half + corner_radius, 0)|| - corner_radius`.
#[derive(Debug, Clone, Copy)]
pub struct SdfBox {
    pub center: [f32; 3],
    pub half: [f32; 3],
    pub corner_radius: f32,
}

impl SdfBox {
    pub fn new(center: [f32; 3], half: [f32; 3], corner_radius: f32) -> Self {
        Self {
            center,
            half,
            corner_radius,
        }
    }

    pub fn dist(&self, p: [f32; 3]) -> f32 {
        // Standard Quílez rounded box: q = |p - center| - half + corner_radius.
        let qx = (p[0] - self.center[0]).abs() - self.half[0] + self.corner_radius;
        let qy = (p[1] - self.center[1]).abs() - self.half[1] + self.corner_radius;
        let qz = (p[2] - self.center[2]).abs() - self.half[2] + self.corner_radius;
        let ax = qx.max(0.0);
        let ay = qy.max(0.0);
        let az = qz.max(0.0);
        (ax * ax + ay * ay + az * az).sqrt() + qx.max(qy.max(qz)).min(0.0) - self.corner_radius
    }
}

/// Plane signed distance — `dot(p, normal) - offset`. For a ground plane at
/// `y = -1.5` use `normal = [0,1,0]`, `offset = -1.5` (points above → positive).
#[derive(Debug, Clone, Copy)]
pub struct SdfPlane {
    pub normal: [f32; 3],
    pub offset: f32,
}

impl SdfPlane {
    pub fn new(normal: [f32; 3], offset: f32) -> Self {
        Self { normal, offset }
    }

    pub fn dist(&self, p: [f32; 3]) -> f32 {
        p[0] * self.normal[0] + p[1] * self.normal[1] + p[2] * self.normal[2] - self.offset
    }
}

/// One primitive of the composed scene (stable tag: 0=sphere, 1=box, 2=plane).
#[derive(Debug, Clone, Copy)]
pub enum SdfPrimitive {
    Sphere(SdfSphere),
    Box(SdfBox),
    Plane(SdfPlane),
}

impl SdfPrimitive {
    pub fn dist(&self, p: [f32; 3]) -> f32 {
        match self {
            SdfPrimitive::Sphere(s) => s.dist(p),
            SdfPrimitive::Box(b) => b.dist(p),
            SdfPrimitive::Plane(pl) => pl.dist(p),
        }
    }

    /// Stable tag used by the nearest-primitive reporting (never derives Debug).
    pub const fn tag(&self) -> u32 {
        match self {
            SdfPrimitive::Sphere(_) => 0,
            SdfPrimitive::Box(_) => 1,
            SdfPrimitive::Plane(_) => 2,
        }
    }
}

/// Maximum number of primitives a scene may hold (bounds the contact map).
pub const MAX_SCENE_PRIMITIVES: usize = 16;

/// A bounded list of SDF primitives composed with [`smooth_min`] under a blend
/// radius `k`. Pure, deterministic, no allocation after construction.
#[derive(Debug, Clone)]
pub struct SdfScene {
    primitives: Vec<SdfPrimitive>,
    pub blend_radius: f32,
}

impl SdfScene {
    pub fn new(blend_radius: f32) -> Self {
        Self {
            primitives: Vec::new(),
            blend_radius,
        }
    }

    /// Appends a primitive; fails closed when the scene exceeds the bound.
    pub fn push(&mut self, prim: SdfPrimitive) -> Result<(), &'static str> {
        if self.primitives.len() >= MAX_SCENE_PRIMITIVES {
            return Err("sdf scene primitive overflow");
        }
        self.primitives.push(prim);
        Ok(())
    }

    pub fn len(&self) -> usize {
        self.primitives.len()
    }

    pub fn is_empty(&self) -> bool {
        self.primitives.is_empty()
    }

    /// Blended distance: `smooth_min` over all primitives. Fails closed to
    /// `+inf` on an empty scene (no surface ever hit — honest).
    pub fn dist(&self, p: [f32; 3]) -> f32 {
        let mut acc = f32::INFINITY;
        for prim in &self.primitives {
            let d = prim.dist(p);
            acc = if acc.is_infinite() {
                d
            } else {
                smooth_min(acc, d, self.blend_radius)
            };
        }
        acc
    }

    /// Raw (un-blended) minimum distance and the index of the nearest primitive.
    /// Fail-closed: `(+inf, u32::MAX)` on an empty scene.
    pub fn raw_min_dist(&self, p: [f32; 3]) -> (f32, u32) {
        let mut d0 = f32::INFINITY;
        let mut idx = u32::MAX;
        for (i, prim) in self.primitives.iter().enumerate() {
            let d = prim.dist(p);
            if d < d0 {
                d0 = d;
                idx = i as u32;
            }
        }
        (d0, idx)
    }

    /// The two smallest raw distances and the index of the nearest (for the
    /// contact term). Fail-closed: `(inf, inf, u32::MAX)` on an empty scene.
    pub fn two_nearest(&self, p: [f32; 3]) -> (f32, f32, u32) {
        let mut d0 = f32::INFINITY;
        let mut d1 = f32::INFINITY;
        let mut idx = u32::MAX;
        for (i, prim) in self.primitives.iter().enumerate() {
            let d = prim.dist(p);
            if d < d0 {
                d1 = d0;
                d0 = d;
                idx = i as u32;
            } else if d < d1 {
                d1 = d;
            }
        }
        (d0, d1, idx)
    }

    /// Contact factor at `p` — the contact weight of the two nearest surfaces.
    /// Fail-closed: `0.0` on an empty scene (no contact without surfaces).
    pub fn contact(&self, p: [f32; 3]) -> f32 {
        let (d0, d1, _) = self.two_nearest(p);
        if d0.is_infinite() {
            return 0.0;
        }
        contact_factor(d0, d1, self.blend_radius)
    }
}

/// UE5-style contact-shadow constant: `res = min(res, K * d / t)`.
pub const CONTACT_SHADOW_K: f32 = 8.0;

/// Distance threshold treated as a hard hit (`res -> 0.0`).
pub const CONTACT_SHADOW_HIT_EPS: f32 = 1.0e-4;

fn normalize_or_zero(v: [f32; 3]) -> [f32; 3] {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    if len > 1.0e-6 {
        [v[0] / len, v[1] / len, v[2] / len]
    } else {
        [0.0, 0.0, 0.0]
    }
}

/// Soft contact shadow by ray marching the blended SDF scene.
///
/// Returns `1.0` in free space, `0.0` on a hard hit, and a continuous penumbra
/// (`K * d / t`) when the ray grazes an occluder. Deterministic for fixed
/// inputs; fail-closed `1.0` when `dir` is degenerate (no direction → no shadow).
pub fn soft_shadow_contact(
    scene: &SdfScene,
    origin: [f32; 3],
    dir: [f32; 3],
    t_min: f32,
    t_max: f32,
    steps: u32,
) -> f32 {
    let dir_n = normalize_or_zero(dir);
    if dir_n == [0.0, 0.0, 0.0] || !t_max.is_finite() || !t_min.is_finite() || t_max <= t_min {
        return 1.0;
    }
    let t_start = t_min.max(1.0e-4);
    let mut t = t_start;
    let mut res = 1.0f32;
    for _ in 0..steps {
        let p = [
            origin[0] + dir_n[0] * t,
            origin[1] + dir_n[1] * t,
            origin[2] + dir_n[2] * t,
        ];
        let d = scene.dist(p);
        if d < CONTACT_SHADOW_HIT_EPS {
            return 0.0;
        }
        res = res.min(CONTACT_SHADOW_K * d / t);
        t += d.max(t_start);
        if t > t_max {
            break;
        }
    }
    res.clamp(0.0, 1.0)
}

/// Deterministic 2D slice of the contact factor over a blend region (the
/// evidence the GPU contact pass consumes). Bounded to `4_096` cells.
#[derive(Debug, Clone)]
pub struct ContactMap2D {
    pub width: u32,
    pub height: u32,
    pub values: Vec<f32>,
}

impl ContactMap2D {
    /// Builds a `width x height` contact map over the plane `y = center[1]`,
    /// spanning `2 * half_extent` on `x` and `z`. Fails closed on bad bounds.
    pub fn build(
        scene: &SdfScene,
        center: [f32; 3],
        half_extent: f32,
        width: u32,
        height: u32,
    ) -> Result<Self, &'static str> {
        if width == 0
            || height == 0
            || width * height > 4096
            || !half_extent.is_finite()
            || half_extent <= 0.0
        {
            return Err("contact map out of bounds");
        }
        let wx = width.saturating_sub(1).max(1) as f32;
        let hz = height.saturating_sub(1).max(1) as f32;
        let mut values = Vec::with_capacity((width * height) as usize);
        for j in 0..height {
            let z = center[2] - half_extent + 2.0 * half_extent * (j as f32) / hz;
            for i in 0..width {
                let x = center[0] - half_extent + 2.0 * half_extent * (i as f32) / wx;
                values.push(scene.contact([x, center[1], z]));
            }
        }
        Ok(Self {
            width,
            height,
            values,
        })
    }

    /// Mean contact over the slice (deterministic).
    pub fn mean(&self) -> f32 {
        if self.values.is_empty() {
            return 0.0;
        }
        let sum: f32 = self.values.iter().sum();
        sum / self.values.len() as f32
    }

    /// Maximum contact over the slice (deterministic).
    pub fn max(&self) -> f32 {
        self.values.iter().copied().fold(0.0f32, f32::max)
    }

    /// Number of cells whose contact exceeds `threshold`.
    pub fn cells_with_contact(&self, threshold: f32) -> u32 {
        self.values
            .iter()
            .filter(|v| **v > threshold)
            .count() as u32
    }
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter kq).
// Evidence is computed from the real scene; AAA flags are always HELD.
// ---------------------------------------------------------------------------

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x;
    h = h.wrapping_mul(0x0000_0100_0000_01b3);
    h ^= h >> 29;
    h
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        ((v as f64 * 1_000_000.0).round() as i64) as u64
    } else {
        0xDEAD_0000_0000_0000 | (v.to_bits() as u64)
    }
}

/// Soak report for the SDF contact-blending kernel (letter **kq**). Readiness is
/// **measured** — never hardcoded. `*_aaa_ready` / `*_ready` HELD fail-closed.
#[derive(Debug, Clone, PartialEq)]
pub struct SdfContactBlendingSoakReport {
    pub sdf_contact_blending_ready: bool,
    pub sphere_dist: f32,
    pub box_dist: f32,
    pub plane_dist: f32,
    pub blended_dist: f32,
    pub plain_min_dist: f32,
    pub contact_factor_near: f32,
    pub contact_factor_far: f32,
    pub shadow_free_space: f32,
    pub shadow_occluded: f32,
    pub nearest_primitive: u32,
    pub contact_map_mean: f32,
    pub contact_map_max: f32,
    pub contact_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub sdf_contact_blending_aaa_ready: bool,
    pub ue5_contact_shadow_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

/// Number of deterministic replay ticks in the SDF contact-blending soak.
pub const SDF_CONTACT_BLENDING_SOAK_TICKS: u32 = 64;

/// Fixed soak scene: two spheres in near-contact (gap 0.4 < blend radius 0.6),
/// a rounded box above the blend pocket, and a ground plane at `y = -1.5`.
fn soak_scene() -> SdfScene {
    let mut scene = SdfScene::new(0.6);
    // Index 0 — sphere A at the origin (the reported nearest primitive).
    let _ = scene.push(SdfPrimitive::Sphere(SdfSphere::new([0.0, 0.0, 0.0], 1.0)));
    // Index 1 — sphere B, surface 0.4 away from A's surface (contact band).
    let _ = scene.push(SdfPrimitive::Sphere(SdfSphere::new([1.6, 0.0, 0.0], 1.0)));
    // Index 2 — rounded box above the pocket (corner radius 0.3).
    let _ = scene.push(SdfPrimitive::Box(SdfBox::new(
        [0.0, 2.5, 0.0],
        [0.6, 0.6, 0.6],
        0.3,
    )));
    // Index 3 — ground plane at y = -1.5 (points above → positive distance).
    let _ = scene.push(SdfPrimitive::Plane(SdfPlane::new([0.0, 1.0, 0.0], -1.5)));
    scene
}

fn run_measured_pass() -> SdfContactBlendingSoakReport {
    let scene = soak_scene();

    // Exact-surface probes.
    let sphere_dist = SdfSphere::new([0.0, 0.0, 0.0], 1.0).dist([1.0, 0.0, 0.0]); // == 0
    let box_dist = SdfBox::new([0.0, 2.5, 0.0], [0.6, 0.6, 0.6], 0.3).dist([0.0, 2.5, 0.0]); // == -0.6
    // On-plane sample (y = -1.5) — must land on the exact surface, else readiness fails.
    let plane_dist = SdfPlane::new([0.0, 1.0, 0.0], -1.5).dist([0.0, -1.5, 0.0]); // == 0

    // Contact pocket: between the two spheres.
    let (plain_min, nearest) = scene.raw_min_dist([0.8, 0.0, 0.0]);
    let blended = scene.dist([0.8, 0.0, 0.0]);
    let contact_near = scene.contact([0.8, 0.0, 0.0]);
    let contact_far = scene.contact([5.0, 5.0, 5.0]);

    // Soft shadows: free space vs grazing penumbra beside the box.
    let shadow_free = soft_shadow_contact(
        &scene,
        [1.5, 1.5, 1.5],
        [1.0, 1.0, 1.0],
        0.05,
        3.0,
        64,
    );
    // Grazes the rounded box edge (x = 0.7 sits 0.1 outside the corrected face) → penumbra.
    let shadow_occluded = soft_shadow_contact(
        &scene,
        [0.7, 4.0, 0.0],
        [0.0, -1.0, 0.0],
        0.01,
        2.5,
        64,
    );

    // Deterministic 2D contact map over the blend pocket.
    let map = match ContactMap2D::build(&scene, [0.8, 0.0, 0.0], 1.2, 32, 16) {
        Ok(m) => m,
        Err(_) => {
            let r = SdfContactBlendingSoakReport {
                sdf_contact_blending_ready: false,
                sphere_dist,
                box_dist,
                plane_dist,
                blended_dist: f32::NAN,
                plain_min_dist: f32::NAN,
                contact_factor_near: f32::NAN,
                contact_factor_far: f32::NAN,
                shadow_free_space: f32::NAN,
                shadow_occluded: f32::NAN,
                nearest_primitive: u32::MAX,
                contact_map_mean: f32::NAN,
                contact_map_max: f32::NAN,
                contact_cells_measured: 0,
                deterministic: false,
                total_ticks: 0,
                evidence_kind: "sdf_field_contact_blend_x_soft_shadow".to_string(),
                evidence_fingerprint: 0,
                sdf_contact_blending_aaa_ready: false,
                ue5_contact_shadow_aaa_ready: false,
                nanite_ready: false,
                dlss_ready: false,
                coins_ready: false,
                agones_ready: false,
                quic_ready: false,
            };
            return r;
        }
    };

    let mut r = SdfContactBlendingSoakReport {
        sdf_contact_blending_ready: false,
        sphere_dist,
        box_dist,
        plane_dist,
        blended_dist: blended,
        plain_min_dist: plain_min,
        contact_factor_near: contact_near,
        contact_factor_far: contact_far,
        shadow_free_space: shadow_free,
        shadow_occluded,
        nearest_primitive: nearest,
        contact_map_mean: map.mean(),
        contact_map_max: map.max(),
        contact_cells_measured: map.cells_with_contact(0.05),
        deterministic: true,
        total_ticks: 1,
        evidence_kind: "sdf_field_contact_blend_x_soft_shadow".to_string(),
        evidence_fingerprint: 0,
        sdf_contact_blending_aaa_ready: false,
        ue5_contact_shadow_aaa_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    };
    r.evidence_fingerprint = soak_evidence_fingerprint(&r);
    r.sdf_contact_blending_ready = readiness(&r);
    r
}

fn soak_evidence_fingerprint(r: &SdfContactBlendingSoakReport) -> u64 {
    let mut fp = hash_mix(0x6B71_5143_0000_0001, quant_f32(r.sphere_dist));
    fp = hash_mix(fp, quant_f32(r.box_dist));
    fp = hash_mix(fp, quant_f32(r.plane_dist));
    fp = hash_mix(fp, quant_f32(r.blended_dist));
    fp = hash_mix(fp, quant_f32(r.plain_min_dist));
    fp = hash_mix(fp, quant_f32(r.contact_factor_near));
    fp = hash_mix(fp, quant_f32(r.contact_factor_far));
    fp = hash_mix(fp, quant_f32(r.shadow_free_space));
    fp = hash_mix(fp, quant_f32(r.shadow_occluded));
    fp = hash_mix(fp, u64::from(r.nearest_primitive));
    fp = hash_mix(fp, quant_f32(r.contact_map_mean));
    fp = hash_mix(fp, quant_f32(r.contact_map_max));
    fp = hash_mix(fp, u64::from(r.contact_cells_measured));
    fp = hash_mix(fp, u64::from(r.total_ticks));
    fp = hash_mix(fp, u64::from(r.deterministic));
    fp
}

/// Readiness — measured invariants of the real scene (never hardcoded).
fn readiness(r: &SdfContactBlendingSoakReport) -> bool {
    let fields_finite = r.sphere_dist.is_finite()
        && r.box_dist.is_finite()
        && r.plane_dist.is_finite()
        && r.blended_dist.is_finite()
        && r.plain_min_dist.is_finite()
        && r.contact_factor_near.is_finite()
        && r.contact_factor_far.is_finite()
        && r.shadow_free_space.is_finite()
        && r.shadow_occluded.is_finite()
        && r.contact_map_mean.is_finite()
        && r.contact_map_max.is_finite();
    let primitives_exact = r.sphere_dist.abs() < 1.0e-3
        && r.box_dist < 0.0
        && r.plane_dist.abs() < 1.0e-3
        && r.nearest_primitive == 0;
    let blend_pulls_down = r.blended_dist < r.plain_min_dist;
    let contact_bounds = r.contact_factor_near > 0.5
        && r.contact_factor_near <= 1.0
        && r.contact_factor_far == 0.0;
    let shadows = r.shadow_free_space >= 0.99 && r.shadow_occluded < r.shadow_free_space;
    let map_sane = r.contact_cells_measured > 0
        && r.contact_map_max > 0.5
        && r.contact_map_mean < 1.0
        && r.contact_map_mean >= 0.0;
    fields_finite
        && primitives_exact
        && blend_pulls_down
        && contact_bounds
        && shadows
        && map_sane
        && r.deterministic
}

/// Honesty probe — soak-gated `sdf_contact_blending_ready` (letter **kq**).
///
/// The probe replays the same deterministic 64-tick soak the readiness gate
/// consumes (peer pattern of `hg`/`fw`), so its `total_ticks` and fingerprint
/// are identical to the soak — no probe/soak drift is ever masked.
pub fn probe_sdf_contact_blending() -> SdfContactBlendingSoakReport {
    run_sdf_contact_blending_soak()
}

/// Deterministic 64-tick replay of the SDF contact-blending measurement.
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_sdf_contact_blending_soak() -> SdfContactBlendingSoakReport {
    static CACHE: std::sync::OnceLock<SdfContactBlendingSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let reference = run_measured_pass();
            let ref_fp = soak_evidence_fingerprint(&reference);
            let mut deterministic = true;
            for _ in 0..SDF_CONTACT_BLENDING_SOAK_TICKS {
                if soak_evidence_fingerprint(&run_measured_pass()) != ref_fp {
                    deterministic = false;
                }
            }
            let mut r = reference;
            r.deterministic = deterministic;
            r.total_ticks = SDF_CONTACT_BLENDING_SOAK_TICKS;
            r.evidence_fingerprint = soak_evidence_fingerprint(&r);
            r.sdf_contact_blending_ready = readiness(&r);
            r
        })
        .clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sphere_sdf_dist_matches_closed_form() {
        let s = SdfSphere::new([0.0, 0.0, 0.0], 1.0);
        assert!((s.dist([0.0, 0.0, 0.0]) - (-1.0)).abs() < 1.0e-6);
        assert!((s.dist([1.0, 0.0, 0.0])).abs() < 1.0e-6);
        assert!((s.dist([2.0, 0.0, 0.0]) - 1.0).abs() < 1.0e-6);
        assert!((s.dist([1.0, 1.0, 1.0]) - ((3.0f32).sqrt() - 1.0)).abs() < 1.0e-6);
    }

    #[test]
    fn box_sdf_dist_matches_closed_form() {
        let b = SdfBox::new([0.0, 0.0, 0.0], [1.0, 2.0, 3.0], 0.5);
        // At center the distance is exactly -half - corner_radius = -1.0.
        assert!((b.dist([0.0, 0.0, 0.0]) - (-1.0)).abs() < 1.0e-6);
        // Exactly on the +x face (|p| - half + corner = corner) → distance 0.
        assert!((b.dist([1.0, 0.0, 0.0]) - 0.0).abs() < 1.0e-6);
        // One unit beyond the +x face.
        assert!((b.dist([2.0, 0.0, 0.0]) - 1.0).abs() < 1.0e-6);
        // On the rounded corner sphere: corner center (h-r) = (0.5,1.5,2.5), radius r,
        // so (0.5+r, 1.5, 2.5) = (1.0, 1.5, 2.5) is exactly on the surface.
        assert!((b.dist([1.0, 1.5, 2.5]) - 0.0).abs() < 1.0e-6);
    }

    #[test]
    fn plane_sdf_dist_matches_closed_form() {
        let pl = SdfPlane::new([0.0, 1.0, 0.0], -1.5);
        assert!((pl.dist([0.0, -1.5, 0.0])).abs() < 1.0e-6);
        assert!((pl.dist([0.0, 0.0, 0.0]) - 1.5).abs() < 1.0e-6);
        assert!((pl.dist([0.0, -2.5, 0.0]) - (-1.0)).abs() < 1.0e-6);
    }

    #[test]
    fn smooth_min_equals_min_when_far_apart() {
        assert!((smooth_min(5.0, 1.0, 0.6) - 1.0).abs() < 1.0e-6);
        assert!((smooth_min(1.0, 5.0, 0.6) - 1.0).abs() < 1.0e-6);
        assert!((smooth_min(3.0, 1.0, 0.6) - 1.0).abs() < 1.0e-6);
    }

    #[test]
    fn smooth_min_pulls_below_min_near_contact() {
        // Equal near-contact distances: result = a - k/4 (max pocket pull).
        let r = smooth_min(-0.2, -0.2, 0.6);
        assert!(r < -0.2, "blend must pull the field below the plain min");
        assert!((r - (-0.35)).abs() < 1.0e-6);
    }

    #[test]
    fn smooth_min_is_symmetric_and_bounded() {
        for (a, b) in [(-0.2f32, 0.3f32), (1.0, -0.5), (0.7, 0.2), (-0.4, -0.9)] {
            let r = smooth_min(a, b, 0.6);
            let r_swapped = smooth_min(b, a, 0.6);
            assert!((r - r_swapped).abs() < 1.0e-6, "smooth_min must be symmetric");
            let lo = a.min(b) - 0.6 * 0.25;
            assert!(r >= lo - 1.0e-6 && r <= a.min(b) + 1.0e-6, "bounded by min and min - k/4");
        }
    }

    #[test]
    fn contact_factor_is_one_in_overlap_and_zero_far() {
        assert_eq!(contact_factor(-0.2, -0.2, 0.6), 1.0);
        assert_eq!(contact_factor(10.0, 10.0, 0.6), 0.0);
        assert_eq!(contact_factor(0.6, 0.6, 0.6), 0.0);
        // One surface near, the other far → no contact.
        assert_eq!(contact_factor(0.0, 10.0, 0.6), 0.0);
    }

    #[test]
    fn contact_factor_is_monotonic_in_proximity() {
        let mut prev = 0.0f32;
        let mut d = 0.6f32;
        while d > -0.6 {
            let f = contact_factor(d, d, 0.6);
            assert!(f >= prev - 1.0e-6, "contact factor must be monotonic");
            prev = f;
            d -= 0.05;
        }
        assert!(prev > 0.9, "at deep overlap the factor must saturate near 1");
    }

    #[test]
    fn scene_blended_dist_preserves_min_far_away() {
        let scene = soak_scene();
        // [10,10,10] is genuinely far: plane 11.5 vs next primitive ~15.2 (gap ≫ k).
        let (raw, _) = scene.raw_min_dist([10.0, 10.0, 10.0]);
        assert!((scene.dist([10.0, 10.0, 10.0]) - raw).abs() < 1.0e-4);
    }

    #[test]
    fn scene_contact_near_sphere_pair_is_high() {
        let scene = soak_scene();
        let c = scene.contact([0.8, 0.0, 0.0]);
        assert!(c > 0.5 && c <= 1.0, "contact at the pocket must be high, got {c}");
        assert!(scene.contact([5.0, 5.0, 5.0]) == 0.0, "far point has no contact");
    }

    #[test]
    fn nearest_primitive_is_reported() {
        let scene = soak_scene();
        let (d0, d1, idx) = scene.two_nearest([0.8, 0.0, 0.0]);
        assert_eq!(idx, 0, "sphere A (index 0) is the nearest at the pocket");
        assert!((d0 - (-0.2)).abs() < 1.0e-4);
        assert!((d1 - (-0.2)).abs() < 1.0e-4);
    }

    #[test]
    fn soft_shadow_is_unoccluded_in_free_space() {
        let scene = soak_scene();
        let s = soft_shadow_contact(&scene, [1.5, 1.5, 1.5], [1.0, 1.0, 1.0], 0.05, 3.0, 64);
        assert!(s >= 0.99, "free-space ray must stay unoccluded, got {s}");
        assert!(s <= 1.0);
    }

    #[test]
    fn soft_shadow_darkens_behind_occluder() {
        let scene = soak_scene();
        let free = soft_shadow_contact(&scene, [1.5, 1.5, 1.5], [1.0, 1.0, 1.0], 0.05, 3.0, 64);
        let occluded =
            soft_shadow_contact(&scene, [0.7, 4.0, 0.0], [0.0, -1.0, 0.0], 0.01, 2.5, 64);
        assert!(occluded < free, "grazing ray must be darker, got {occluded} vs {free}");
        assert!(occluded > 0.0 && occluded < 1.0, "penumbra must be continuous, got {occluded}");
    }

    #[test]
    fn degenerate_direction_is_fail_closed() {
        let scene = soak_scene();
        let s = soft_shadow_contact(&scene, [0.0, 0.0, 0.0], [0.0, 0.0, 0.0], 0.05, 3.0, 64);
        assert_eq!(s, 1.0, "no direction must mean no shadow (fail-closed)");
    }

    #[test]
    fn contact_map_builds_deterministic_grid() {
        let scene = soak_scene();
        let a = ContactMap2D::build(&scene, [0.8, 0.0, 0.0], 1.2, 32, 16).expect("map builds");
        let b = ContactMap2D::build(&scene, [0.8, 0.0, 0.0], 1.2, 32, 16).expect("map builds");
        assert_eq!(a.values, b.values, "contact map must be deterministic");
        let mean = a.mean();
        assert!((0.0..1.0).contains(&mean), "mean contact in [0,1), got {mean}");
        assert!(a.max() > 0.5, "pocket cells must show strong contact");
        assert!(a.cells_with_contact(0.05) > 0);
        // Out-of-bounds builds fail closed.
        assert!(ContactMap2D::build(&scene, [0.0, 0.0, 0.0], 1.0, 0, 16).is_err());
    }

    #[test]
    fn empty_scene_is_fail_closed() {
        let scene = SdfScene::new(0.6);
        assert!(scene.dist([0.0, 0.0, 0.0]).is_infinite());
        assert!(scene.contact([0.0, 0.0, 0.0]) == 0.0);
        let (d, idx) = scene.raw_min_dist([0.0, 0.0, 0.0]);
        assert!(d.is_infinite() && idx == u32::MAX);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_sdf_contact_blending_soak();
        assert!(
            r.sdf_contact_blending_ready,
            "SDF contact-blending soak must prove readiness"
        );
        assert!(r.blended_dist < r.plain_min_dist);
        assert!(r.contact_factor_near > 0.5 && r.contact_factor_far == 0.0);
        assert!(r.shadow_free_space >= 0.99 && r.shadow_occluded < r.shadow_free_space);
        assert!(r.contact_cells_measured > 0);
        assert!(r.deterministic);
        assert_eq!(r.total_ticks, SDF_CONTACT_BLENDING_SOAK_TICKS);
        assert_eq!(r.evidence_kind, "sdf_field_contact_blend_x_soft_shadow");
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.sdf_contact_blending_aaa_ready && !r.ue5_contact_shadow_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(
            !r.nanite_ready
                && !r.dlss_ready
                && !r.coins_ready
                && !r.agones_ready
                && !r.quic_ready
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_sdf_contact_blending_soak();
        let b = run_sdf_contact_blending_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.sdf_contact_blending_ready, b.sdf_contact_blending_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_sdf_contact_blending_soak();
        let probe = probe_sdf_contact_blending();
        assert_eq!(soak.sdf_contact_blending_ready, probe.sdf_contact_blending_ready);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.blended_dist, probe.blended_dist);
        assert_eq!(soak.shadow_occluded, probe.shadow_occluded);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_sdf_contact_blending_soak();
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

        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, ju);
    }

    #[test]
    fn smooth_min_polynomial_pull_at_equality() {
        let a = 2.0f32;
        let k = 0.4f32;
        let s_min = smooth_min(a, a, k);
        let expected = a - k / 4.0;
        assert!((s_min - expected).abs() < 1e-6, "smooth_min at equality must equal a - k/4: {s_min} vs {expected}");
    }

    #[test]
    fn smooth_min_far_apart_matches_hard_min() {
        let a = 1.0f32;
        let b = 3.0f32; // |a - b| = 2.0 >= k=0.5
        let k = 0.5f32;
        let s_min = smooth_min(a, b, k);
        assert_eq!(s_min, a.min(b), "Far surfaces must not blend and must match hard min");
    }

    #[test]
    fn contact_factor_smoothstep_monotonicity() {
        let k = 0.6f32;
        let c_zero = contact_factor(0.0, 0.0, k); // Exact surface contact
        let c_near = contact_factor(0.2, 0.2, k);
        let c_far = contact_factor(0.5, 0.5, k);
        let c_out = contact_factor(0.7, 0.7, k);

        assert_eq!(c_zero, 1.0);
        assert!(c_zero > c_near);
        assert!(c_near > c_far);
        assert!(c_far > c_out);
        assert_eq!(c_out, 0.0);
    }
}

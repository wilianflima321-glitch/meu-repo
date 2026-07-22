//! Hybrid Cluster Shading VSVM (lite) — letter **gk**.
//!
//! Replaces ZST / comment-theater `fragment_into_stochastic_clusters`
//! (unused frustum bool, empty body, no soak/probe) with real clustered
//! light assignment: partition view volume into tiles×depth clusters,
//! assign point lights whose influence spheres intersect a cluster AABB,
//! then evaluate Lambert + Blinn-Phong for a fixture pixel grid using only
//! that cluster's light list.
//!
//! Soak proves lit pixel > unlit, cluster lists non-empty for in-frustum
//! lights, lights affect only nearby clusters, same seed→same, no NaN.
//!
//! Honesty probe `hybrid_cluster_shading_vsvm_ready` /
//! `hybridClusterShadingVsvmReady` is **distinct** from gg
//! `fluidNinjaComputeReady`, gf `acesCinematicTonemapperReady`, ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! and prior.
//!
//! **HELD:** Full Forward+ / UE clustered deferred AAA
//! (`full_forward_plus_ready: false`, `ue_clustered_deferred_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x67_6B_63_6C; // "gkcl"
/// Tile count X/Y in the view plane.
pub const TILE_XY: usize = 4;
/// Depth slices (Z clusters).
pub const SLICE_Z: usize = 4;
/// Max lights stored per cluster list.
pub const MAX_LIGHTS_PER_CLUSTER: usize = 8;
/// Fixture shade resolution (pixels per axis).
pub const FIXTURE_RES: usize = 8;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Min lit−unlit luminance delta.
pub const MIN_LIT_DELTA: f32 = 0.02;
/// Fingerprint seed ("gkvs").
const FP_SEED: u64 = 0x676B_7673;
const EPS: f32 = 1e-6;

/// Point light in view space (position + intensity + radius).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClusterPointLight {
    pub pos: [f32; 3],
    pub intensity: f32,
    pub radius: f32,
    pub color: [f32; 3],
}

/// View-space AABB for one cluster cell.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClusterAabb {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

impl ClusterAabb {
    #[inline]
    pub fn center(&self) -> [f32; 3] {
        [
            0.5 * (self.min[0] + self.max[0]),
            0.5 * (self.min[1] + self.max[1]),
            0.5 * (self.min[2] + self.max[2]),
        ]
    }

    /// Sphere–AABB intersection (light influence vs cluster).
    #[inline]
    pub fn intersects_sphere(&self, center: [f32; 3], radius: f32) -> bool {
        let r = radius.max(0.0);
        let mut d2 = 0.0_f32;
        for i in 0..3 {
            let v = center[i];
            if v < self.min[i] {
                let d = self.min[i] - v;
                d2 += d * d;
            } else if v > self.max[i] {
                let d = v - self.max[i];
                d2 += d * d;
            }
        }
        d2 <= r * r + EPS
    }
}

/// Packed light index list for one cluster (count + indices).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ClusterLightList {
    pub count: u8,
    pub indices: [u8; MAX_LIGHTS_PER_CLUSTER],
}

impl ClusterLightList {
    pub const EMPTY: Self = Self {
        count: 0,
        indices: [0; MAX_LIGHTS_PER_CLUSTER],
    };

    #[inline]
    pub fn push(&mut self, light_idx: u8) {
        if (self.count as usize) < MAX_LIGHTS_PER_CLUSTER {
            self.indices[self.count as usize] = light_idx;
            self.count = self.count.saturating_add(1);
        }
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    #[inline]
    pub fn contains(&self, light_idx: u8) -> bool {
        self.indices[..self.count as usize].contains(&light_idx)
    }
}

/// Clustered shading grid — tiles × depth slices with light lists.
#[derive(Debug, Clone)]
pub struct HybridClusterGrid {
    pub tiles_x: usize,
    pub tiles_y: usize,
    pub slices_z: usize,
    /// View-space bounds of the frustum volume [min, max].
    pub bounds_min: [f32; 3],
    pub bounds_max: [f32; 3],
    pub clusters: Vec<ClusterAabb>,
    pub lists: Vec<ClusterLightList>,
    pub lights: Vec<ClusterPointLight>,
    seed: u64,
}

impl HybridClusterGrid {
    pub fn new(
        tiles_x: usize,
        tiles_y: usize,
        slices_z: usize,
        bounds_min: [f32; 3],
        bounds_max: [f32; 3],
        seed: u64,
    ) -> Self {
        let tx = tiles_x.max(1);
        let ty = tiles_y.max(1);
        let sz = slices_z.max(1);
        let count = tx * ty * sz;
        let mut clusters = Vec::with_capacity(count);
        let dx = (bounds_max[0] - bounds_min[0]) / tx as f32;
        let dy = (bounds_max[1] - bounds_min[1]) / ty as f32;
        let dz = (bounds_max[2] - bounds_min[2]) / sz as f32;
        for z in 0..sz {
            for y in 0..ty {
                for x in 0..tx {
                    let min = [
                        bounds_min[0] + x as f32 * dx,
                        bounds_min[1] + y as f32 * dy,
                        bounds_min[2] + z as f32 * dz,
                    ];
                    let max = [min[0] + dx, min[1] + dy, min[2] + dz];
                    clusters.push(ClusterAabb { min, max });
                }
            }
        }
        Self {
            tiles_x: tx,
            tiles_y: ty,
            slices_z: sz,
            bounds_min,
            bounds_max,
            clusters,
            lists: vec![ClusterLightList::EMPTY; count],
            lights: Vec::new(),
            seed,
        }
    }

    #[inline]
    pub fn cluster_count(&self) -> usize {
        self.clusters.len()
    }

    #[inline]
    pub fn seed(&self) -> u64 {
        self.seed
    }

    #[inline]
    pub fn cluster_index(&self, x: usize, y: usize, z: usize) -> usize {
        x + self.tiles_x * (y + self.tiles_y * z)
    }

    /// Map a view-space position to a cluster index (clamped).
    pub fn cluster_at_pos(&self, pos: [f32; 3]) -> usize {
        let nx = ((pos[0] - self.bounds_min[0])
            / (self.bounds_max[0] - self.bounds_min[0]).max(EPS))
        .clamp(0.0, 1.0 - EPS);
        let ny = ((pos[1] - self.bounds_min[1])
            / (self.bounds_max[1] - self.bounds_min[1]).max(EPS))
        .clamp(0.0, 1.0 - EPS);
        let nz = ((pos[2] - self.bounds_min[2])
            / (self.bounds_max[2] - self.bounds_min[2]).max(EPS))
        .clamp(0.0, 1.0 - EPS);
        let x = ((nx * self.tiles_x as f32) as usize).min(self.tiles_x - 1);
        let y = ((ny * self.tiles_y as f32) as usize).min(self.tiles_y - 1);
        let z = ((nz * self.slices_z as f32) as usize).min(self.slices_z - 1);
        self.cluster_index(x, y, z)
    }

    /// Clear lists and assign lights whose spheres intersect cluster AABBs.
    /// When `view_frustum_intersection` is false, skip assignment (latent).
    pub fn assign_lights(&mut self, view_frustum_intersection: bool) {
        for list in &mut self.lists {
            *list = ClusterLightList::EMPTY;
        }
        if !view_frustum_intersection || self.lights.is_empty() {
            return;
        }
        for (li, light) in self.lights.iter().enumerate() {
            if li >= 255 {
                break;
            }
            let idx = li as u8;
            let r = light.radius.max(0.0);
            if r <= 0.0 || !light.intensity.is_finite() || light.intensity <= 0.0 {
                continue;
            }
            // Skip lights wholly outside expanded frustum bounds.
            if !sphere_overlaps_aabb(light.pos, r, self.bounds_min, self.bounds_max) {
                continue;
            }
            for (ci, aabb) in self.clusters.iter().enumerate() {
                if aabb.intersects_sphere(light.pos, r) {
                    self.lists[ci].push(idx);
                }
            }
        }
    }

    /// Count clusters with at least one light.
    pub fn non_empty_cluster_count(&self) -> u32 {
        self.lists.iter().filter(|l| !l.is_empty()).count() as u32
    }

    /// True if light `li` appears in any cluster near `pos` and not in a far cluster.
    pub fn light_localized(&self, light_idx: u8, near_pos: [f32; 3], far_pos: [f32; 3]) -> bool {
        let near_i = self.cluster_at_pos(near_pos);
        let far_i = self.cluster_at_pos(far_pos);
        let in_near = self.lists[near_i].contains(light_idx);
        let in_far = self.lists[far_i].contains(light_idx);
        in_near && !in_far
    }
}

/// Shade a surface sample with Lambert + Blinn using a cluster light list.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShadeSample {
    pub rgb: [f32; 3],
    pub luminance: f32,
    pub lights_used: u32,
    pub outputs_finite: bool,
}

impl ShadeSample {
    pub const ZERO: Self = Self {
        rgb: [0.0, 0.0, 0.0],
        luminance: 0.0,
        lights_used: 0,
        outputs_finite: true,
    };
}

/// Stateless facade — Hybrid Cluster Shading VSVM lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct HybridClusterShadingVsvm;

impl HybridClusterShadingVsvm {
    /// Legacy entry — uses `view_frustum_intersection` to run real cluster
    /// assignment on a seeded fixture; returns non-empty cluster count
    /// (replaces empty theater body).
    pub fn fragment_into_stochastic_clusters(view_frustum_intersection: bool) -> u32 {
        let mut grid = build_fixture_grid(SOAK_SEED);
        grid.assign_lights(view_frustum_intersection);
        grid.non_empty_cluster_count()
    }

    /// Lambert diffuse + Blinn-Phong specular for one pixel using cluster lights.
    pub fn shade_pixel(
        grid: &HybridClusterGrid,
        pos: [f32; 3],
        normal: [f32; 3],
        view_dir: [f32; 3],
        albedo: [f32; 3],
        shininess: f32,
    ) -> ShadeSample {
        let n = normalize3(normal);
        let v = normalize3(view_dir);
        let ci = grid.cluster_at_pos(pos);
        let list = &grid.lists[ci];
        let mut rgb = [0.0_f32; 3];
        let mut used = 0_u32;
        let amb = 0.02_f32;
        for c in 0..3 {
            rgb[c] = albedo[c] * amb;
        }
        for k in 0..list.count as usize {
            let li = list.indices[k] as usize;
            if li >= grid.lights.len() {
                continue;
            }
            let light = &grid.lights[li];
            let to_l = [
                light.pos[0] - pos[0],
                light.pos[1] - pos[1],
                light.pos[2] - pos[2],
            ];
            let dist = length3(to_l);
            if dist > light.radius || dist < EPS {
                continue;
            }
            let ldir = [
                to_l[0] / dist,
                to_l[1] / dist,
                to_l[2] / dist,
            ];
            let ndotl = dot3(n, ldir).max(0.0);
            // Inverse-square falloff clamped by radius (smooth window).
            let atten = (1.0 - dist / light.radius.max(EPS)).max(0.0);
            let atten = atten * atten * light.intensity;
            // Lambert
            for c in 0..3 {
                rgb[c] += albedo[c] * light.color[c] * ndotl * atten;
            }
            // Blinn-Phong
            let h = normalize3([ldir[0] + v[0], ldir[1] + v[1], ldir[2] + v[2]]);
            let ndoth = dot3(n, h).max(0.0);
            let spec = ndoth.powf(shininess.max(1.0)) * atten * 0.35;
            for c in 0..3 {
                rgb[c] += light.color[c] * spec;
            }
            used = used.saturating_add(1);
        }
        let finite = rgb.iter().all(|c| c.is_finite()) && n.iter().all(|c| c.is_finite());
        let lum = luminance(rgb);
        ShadeSample {
            rgb,
            luminance: if lum.is_finite() { lum } else { 0.0 },
            lights_used: used,
            outputs_finite: finite,
        }
    }

    /// Shade a fixture RES×RES plane at z = mid depth (normals +Y).
    pub fn shade_fixture_plane(grid: &HybridClusterGrid) -> Vec<ShadeSample> {
        let mut out = Vec::with_capacity(FIXTURE_RES * FIXTURE_RES);
        let z = 0.5 * (grid.bounds_min[2] + grid.bounds_max[2]);
        let view = [0.0, 0.0, -1.0];
        let normal = [0.0, 0.0, 1.0];
        let albedo = [0.85, 0.82, 0.78];
        for j in 0..FIXTURE_RES {
            for i in 0..FIXTURE_RES {
                let u = (i as f32 + 0.5) / FIXTURE_RES as f32;
                let v = (j as f32 + 0.5) / FIXTURE_RES as f32;
                let pos = [
                    grid.bounds_min[0]
                        + u * (grid.bounds_max[0] - grid.bounds_min[0]),
                    grid.bounds_min[1]
                        + v * (grid.bounds_max[1] - grid.bounds_min[1]),
                    z,
                ];
                out.push(Self::shade_pixel(grid, pos, normal, view, albedo, 32.0));
            }
        }
        out
    }
}

/// Soak report — gates `hybridClusterShadingVsvmReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct HybridClusterShadingVsvmSoakReport {
    pub hybrid_cluster_shading_vsvm_ready: bool,
    pub lit_exceeds_unlit: bool,
    pub cluster_lists_non_empty: bool,
    pub lights_localized: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub non_empty_clusters: u32,
    pub lit_luminance: f32,
    pub unlit_luminance: f32,
    pub mean_fixture_luminance: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub full_forward_plus_ready: bool,
    pub ue_clustered_deferred_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report() -> HybridClusterShadingVsvmSoakReport {
    HybridClusterShadingVsvmSoakReport {
        hybrid_cluster_shading_vsvm_ready: false,
        lit_exceeds_unlit: false,
        cluster_lists_non_empty: false,
        lights_localized: false,
        same_seed_same_output: false,
        deterministic: false,
        outputs_finite: false,
        no_nan: false,
        state_mutated: false,
        non_empty_clusters: 0,
        lit_luminance: 0.0,
        unlit_luminance: 0.0,
        mean_fixture_luminance: 0.0,
        sample_count: 0,
        fingerprint: 0,
        distinct_from_fluid_ninja_compute_probe: true,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_preintegrated_sss_transmittance_probe: true,
        distinct_from_chromatic_glass_refraction_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_forward_plus_ready: false,
        ue_clustered_deferred_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Build fixture: frustum volume + one bright near light + one far light.
pub fn build_fixture_grid(seed: u64) -> HybridClusterGrid {
    let bounds_min = [-4.0, -4.0, 1.0];
    let bounds_max = [4.0, 4.0, 9.0];
    let mut grid = HybridClusterGrid::new(TILE_XY, TILE_XY, SLICE_Z, bounds_min, bounds_max, seed);
    // Near light — covers left-front clusters only (small radius).
    let jitter = hash_unit(seed, 1.0, 2.0, 3.0);
    grid.lights.push(ClusterPointLight {
        pos: [-2.0 + 0.05 * jitter, 0.0, 3.0],
        intensity: 4.0,
        radius: 2.25,
        color: [1.0, 0.95, 0.9],
    });
    // Far light — opposite corner, small radius (should not fill near clusters).
    grid.lights.push(ClusterPointLight {
        pos: [3.0, 3.0, 7.5],
        intensity: 2.5,
        radius: 1.75,
        color: [0.7, 0.85, 1.0],
    });
    // Out-of-frustum light — must not populate lists when frustum-culled by bounds.
    grid.lights.push(ClusterPointLight {
        pos: [20.0, 0.0, 5.0],
        intensity: 10.0,
        radius: 1.0,
        color: [1.0, 0.0, 0.0],
    });
    grid
}

/// Run soak: lit > unlit; non-empty lists; localization; same seed; no NaN.
pub fn run_hybrid_cluster_shading_vsvm_soak() -> HybridClusterShadingVsvmSoakReport {
    let mut grid_a = build_fixture_grid(SOAK_SEED);
    grid_a.assign_lights(true);
    let mut grid_b = build_fixture_grid(SOAK_SEED);
    grid_b.assign_lights(true);

    let non_empty = grid_a.non_empty_cluster_count();
    let lists_non_empty = non_empty > 0;

    // Localization: light 0 near its position, absent from far opposite corner.
    let near_cluster_pos = [-2.0, 0.0, 3.0];
    let far_pos = [3.5, 3.5, 8.0];
    let localized = grid_a.light_localized(0, near_cluster_pos, far_pos);

    // Shade a surface sample near light 0 (offset so dist > EPS; not on the lamp).
    let shade_pos = [-1.6, 0.0, 2.6];
    let normal = [0.0, 0.0, 1.0];
    let view = [0.0, 0.0, -1.0];
    let albedo = [0.9, 0.9, 0.9];
    let lit = HybridClusterShadingVsvm::shade_pixel(
        &grid_a, shade_pos, normal, view, albedo, 32.0,
    );
    let mut unlit_grid = grid_a.clone();
    for list in &mut unlit_grid.lists {
        *list = ClusterLightList::EMPTY;
    }
    let unlit = HybridClusterShadingVsvm::shade_pixel(
        &unlit_grid, shade_pos, normal, view, albedo, 32.0,
    );
    let lit_exceeds = lit.outputs_finite
        && unlit.outputs_finite
        && lit.luminance > unlit.luminance + MIN_LIT_DELTA
        && lit.lights_used > 0;

    // Same seed → same lists + shade.
    let same_lists = grid_a.lists == grid_b.lists;
    let shade_a = HybridClusterShadingVsvm::shade_fixture_plane(&grid_a);
    let shade_b = HybridClusterShadingVsvm::shade_fixture_plane(&grid_b);
    let same_shade = shade_a.len() == shade_b.len()
        && shade_a
            .iter()
            .zip(shade_b.iter())
            .all(|(a, b)| a.rgb == b.rgb && a.luminance == b.luminance);
    let same_seed = same_lists && same_shade;

    let mut outputs_finite = lit.outputs_finite && unlit.outputs_finite;
    let mut mean_lum = 0.0_f32;
    for s in &shade_a {
        if !s.outputs_finite || !s.luminance.is_finite() {
            outputs_finite = false;
        }
        for &c in &s.rgb {
            if !c.is_finite() {
                outputs_finite = false;
            }
        }
        mean_lum += s.luminance;
    }
    let sample_count = shade_a.len() as u32;
    if sample_count > 0 {
        mean_lum /= sample_count as f32;
    }

    // Legacy path mutates: frustum true → non-empty; false → zero.
    let legacy_on = HybridClusterShadingVsvm::fragment_into_stochastic_clusters(true);
    let legacy_off = HybridClusterShadingVsvm::fragment_into_stochastic_clusters(false);
    let state_mutated = legacy_on > 0 && legacy_off == 0;

    let no_nan = outputs_finite
        && lit.luminance.is_finite()
        && unlit.luminance.is_finite()
        && mean_lum.is_finite();

    let ready = lit_exceeds
        && lists_non_empty
        && localized
        && same_seed
        && no_nan
        && state_mutated
        && sample_count > 0;

    if !ready {
        let mut r = fail_report();
        r.lit_exceeds_unlit = lit_exceeds;
        r.cluster_lists_non_empty = lists_non_empty;
        r.lights_localized = localized;
        r.same_seed_same_output = same_seed;
        r.outputs_finite = outputs_finite;
        r.no_nan = no_nan;
        r.state_mutated = state_mutated;
        r.non_empty_clusters = non_empty;
        r.lit_luminance = lit.luminance;
        r.unlit_luminance = unlit.luminance;
        r.mean_fixture_luminance = mean_lum;
        r.sample_count = sample_count;
        return r;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        non_empty as u64,
        quant_f32(lit.luminance),
        quant_f32(unlit.luminance),
        quant_f32(mean_lum),
        SOAK_SEED,
        legacy_on as u64,
    ]);

    HybridClusterShadingVsvmSoakReport {
        hybrid_cluster_shading_vsvm_ready: true,
        lit_exceeds_unlit: true,
        cluster_lists_non_empty: true,
        lights_localized: true,
        same_seed_same_output: true,
        deterministic: true,
        outputs_finite: true,
        no_nan: true,
        state_mutated: true,
        non_empty_clusters: non_empty,
        lit_luminance: lit.luminance,
        unlit_luminance: unlit.luminance,
        mean_fixture_luminance: mean_lum,
        sample_count,
        fingerprint: fp,
        distinct_from_fluid_ninja_compute_probe: true,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_preintegrated_sss_transmittance_probe: true,
        distinct_from_chromatic_glass_refraction_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_forward_plus_ready: false,
        ue_clustered_deferred_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `hybrid_cluster_shading_vsvm_ready` (**gk**).
pub fn probe_hybrid_cluster_shading_vsvm() -> HybridClusterShadingVsvmSoakReport {
    run_hybrid_cluster_shading_vsvm_soak()
}

#[inline]
fn sphere_overlaps_aabb(
    center: [f32; 3],
    radius: f32,
    bmin: [f32; 3],
    bmax: [f32; 3],
) -> bool {
    ClusterAabb {
        min: bmin,
        max: bmax,
    }
    .intersects_sphere(center, radius)
}

#[inline]
fn luminance(rgb: [f32; 3]) -> f32 {
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

#[inline]
fn dot3(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn length3(v: [f32; 3]) -> f32 {
    (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt()
}

#[inline]
fn normalize3(v: [f32; 3]) -> [f32; 3] {
    let len = length3(v);
    if len < EPS || !len.is_finite() {
        return [0.0, 0.0, 1.0];
    }
    [v[0] / len, v[1] / len, v[2] / len]
}

#[inline]
fn quant_f32(v: f32) -> u64 {
    let bits = if v.is_finite() { v.to_bits() } else { 0 };
    bits as u64
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

#[inline]
fn hash_unit(seed: u64, a: f32, b: f32, c: f32) -> f32 {
    let mut h = seed;
    h = hash_mix(h, quant_f32(a));
    h = hash_mix(h, quant_f32(b));
    h = hash_mix(h, quant_f32(c));
    ((h >> 11) as f32) * (1.0 / ((1u64 << 53) as f32))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_hybrid_cluster_shading_vsvm_soak();
        assert!(r.hybrid_cluster_shading_vsvm_ready, "{r:?}");
        assert!(r.lit_exceeds_unlit);
        assert!(r.cluster_lists_non_empty);
        assert!(r.lights_localized);
        assert!(r.same_seed_same_output);
        assert!(r.no_nan);
        assert!(!r.full_forward_plus_ready);
        assert!(!r.ue_clustered_deferred_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.dlss_ready);
        assert!(!r.quic_ready);
        assert!(r.distinct_from_fluid_ninja_compute_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn lit_pixel_exceeds_unlit() {
        let mut grid = build_fixture_grid(SOAK_SEED);
        grid.assign_lights(true);
        let pos = [-1.6, 0.0, 2.6];
        let lit = HybridClusterShadingVsvm::shade_pixel(
            &grid,
            pos,
            [0.0, 0.0, 1.0],
            [0.0, 0.0, -1.0],
            [0.9, 0.9, 0.9],
            32.0,
        );
        let mut empty = grid.clone();
        for list in &mut empty.lists {
            *list = ClusterLightList::EMPTY;
        }
        let unlit = HybridClusterShadingVsvm::shade_pixel(
            &empty,
            pos,
            [0.0, 0.0, 1.0],
            [0.0, 0.0, -1.0],
            [0.9, 0.9, 0.9],
            32.0,
        );
        assert!(
            lit.luminance > unlit.luminance + MIN_LIT_DELTA,
            "lit={} unlit={}",
            lit.luminance,
            unlit.luminance
        );
        assert!(lit.lights_used > 0);
    }

    #[test]
    fn cluster_lists_non_empty_for_in_frustum_lights() {
        let mut grid = build_fixture_grid(SOAK_SEED);
        grid.assign_lights(true);
        assert!(grid.non_empty_cluster_count() > 0);
        // Out-of-frustum light index 2 must not appear in any list.
        for list in &grid.lists {
            assert!(!list.contains(2), "out-of-frustum light leaked into cluster");
        }
    }

    #[test]
    fn lights_affect_only_nearby_clusters() {
        let mut grid = build_fixture_grid(SOAK_SEED);
        grid.assign_lights(true);
        assert!(grid.light_localized(0, [-2.0, 0.0, 3.0], [3.5, 3.5, 8.0]));
    }

    #[test]
    fn same_seed_same_output() {
        let a = run_hybrid_cluster_shading_vsvm_soak();
        let b = run_hybrid_cluster_shading_vsvm_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.lit_luminance, b.lit_luminance);
        assert_eq!(a.mean_fixture_luminance, b.mean_fixture_luminance);
    }

    #[test]
    fn frustum_false_leaves_clusters_empty() {
        let on = HybridClusterShadingVsvm::fragment_into_stochastic_clusters(true);
        let off = HybridClusterShadingVsvm::fragment_into_stochastic_clusters(false);
        assert!(on > 0);
        assert_eq!(off, 0);
    }

    #[test]
    fn probe_matches_soak() {
        let a = probe_hybrid_cluster_shading_vsvm();
        let b = run_hybrid_cluster_shading_vsvm_soak();
        assert_eq!(a.hybrid_cluster_shading_vsvm_ready, b.hybrid_cluster_shading_vsvm_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn sphere_aabb_intersection_basic() {
        let aabb = ClusterAabb {
            min: [0.0, 0.0, 0.0],
            max: [1.0, 1.0, 1.0],
        };
        assert!(aabb.intersects_sphere([0.5, 0.5, 0.5], 0.1));
        assert!(aabb.intersects_sphere([1.5, 0.5, 0.5], 0.6));
        assert!(!aabb.intersects_sphere([3.0, 0.5, 0.5], 0.5));
    }
}

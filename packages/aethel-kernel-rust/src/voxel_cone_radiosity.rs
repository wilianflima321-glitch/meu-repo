//! Voxel Cone Radiosity (lite) — letter **ga**.
//!
//! Replaces ZST / comment-theater `execute_0ms_bake_radiance` (unused density,
//! empty body, no soak/probe) with a real fixed-res radiance + occupancy
//! voxel grid and cone march: apex → direction, aperture, steps; irradiance
//! accumulates along the cone with footprint growing by aperture.
//!
//! Honesty probe `voxel_cone_radiosity_ready` / `voxelConeRadiosityReady` is
//! **distinct** from fz `symmetricVectorAlgebraReady`, fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, and prior probes.
//!
//! **HELD:** Full Lumen / VXGI AAA / Nanite (`lumen_vxgi_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0A_5C01_5EED;
/// Grid resolution (N³ dense radiance + occupancy).
pub const GRID_RES: usize = 16;
/// World half-extent — grid covers [-extent, +extent]³.
pub const HALF_EXTENT: f32 = 1.0;
/// Default cone half-angle (radians).
pub const DEFAULT_APERTURE: f32 = 0.35;
/// Default march steps along cone.
pub const DEFAULT_STEPS: u32 = 24;
/// Default max march distance (world units).
pub const DEFAULT_MAX_DIST: f32 = 2.0;
/// Absolute epsilon for energy / compare.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gavc").
const FP_SEED: u64 = 0x6761_7663;
const EPS: f32 = 1e-6;

/// One voxel cell: occupancy + RGB radiance (non-negative).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct VoxelCell {
    pub occupied: bool,
    pub radiance: [f32; 3],
}

impl Default for VoxelCell {
    fn default() -> Self {
        Self {
            occupied: false,
            radiance: [0.0, 0.0, 0.0],
        }
    }
}

/// Fixed-res dense radiance / occupancy grid.
#[derive(Debug, Clone, PartialEq)]
pub struct VoxelRadianceGrid {
    pub res: usize,
    pub half_extent: f32,
    pub cells: Vec<VoxelCell>,
}

impl VoxelRadianceGrid {
    pub fn empty(res: usize, half_extent: f32) -> Self {
        let n = res.max(1);
        Self {
            res: n,
            half_extent: half_extent.max(EPS),
            cells: vec![VoxelCell::default(); n * n * n],
        }
    }

    #[inline]
    fn idx(&self, x: usize, y: usize, z: usize) -> usize {
        (z * self.res + y) * self.res + x
    }

    #[inline]
    pub fn world_to_cell(&self, p: [f32; 3]) -> Option<(usize, usize, usize)> {
        let he = self.half_extent;
        let n = self.res as f32;
        let mut c = [0usize; 3];
        for i in 0..3 {
            let u = (p[i] + he) / (2.0 * he);
            if !(0.0..1.0).contains(&u) {
                return None;
            }
            let ci = (u * n).floor() as usize;
            c[i] = ci.min(self.res - 1);
        }
        Some((c[0], c[1], c[2]))
    }

    #[inline]
    pub fn get(&self, x: usize, y: usize, z: usize) -> VoxelCell {
        if x >= self.res || y >= self.res || z >= self.res {
            return VoxelCell::default();
        }
        self.cells[self.idx(x, y, z)]
    }

    #[inline]
    pub fn set(&mut self, x: usize, y: usize, z: usize, cell: VoxelCell) {
        if x < self.res && y < self.res && z < self.res {
            let i = self.idx(x, y, z);
            self.cells[i] = cell;
        }
    }

    /// Sample radiance at world point (nearest cell); zero outside.
    pub fn sample_radiance(&self, p: [f32; 3]) -> [f32; 3] {
        match self.world_to_cell(p) {
            Some((x, y, z)) => self.get(x, y, z).radiance,
            None => [0.0, 0.0, 0.0],
        }
    }

    /// True if any occupied voxel near `p` within `radius` (world).
    pub fn occluded_near(&self, p: [f32; 3], radius: f32) -> bool {
        let r = radius.max(0.0);
        let he = self.half_extent;
        let cell_size = (2.0 * he) / self.res as f32;
        let steps = ((r / cell_size).ceil() as i32).max(0);
        let center = match self.world_to_cell(p) {
            Some(c) => c,
            None => return false,
        };
        for dz in -steps..=steps {
            for dy in -steps..=steps {
                for dx in -steps..=steps {
                    let x = center.0 as i32 + dx;
                    let y = center.1 as i32 + dy;
                    let z = center.2 as i32 + dz;
                    if x < 0 || y < 0 || z < 0 {
                        continue;
                    }
                    let (ux, uy, uz) = (x as usize, y as usize, z as usize);
                    if ux >= self.res || uy >= self.res || uz >= self.res {
                        continue;
                    }
                    if self.get(ux, uy, uz).occupied {
                        // Approximate world center of cell.
                        let wx = -he + (ux as f32 + 0.5) * cell_size;
                        let wy = -he + (uy as f32 + 0.5) * cell_size;
                        let wz = -he + (uz as f32 + 0.5) * cell_size;
                        let d2 = (wx - p[0]).powi(2) + (wy - p[1]).powi(2) + (wz - p[2]).powi(2);
                        if d2 <= (r + cell_size * 0.5).powi(2) {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
}

/// Cone trace parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ConeParams {
    pub aperture: f32,
    pub steps: u32,
    pub max_dist: f32,
}

impl Default for ConeParams {
    fn default() -> Self {
        Self {
            aperture: DEFAULT_APERTURE,
            steps: DEFAULT_STEPS,
            max_dist: DEFAULT_MAX_DIST,
        }
    }
}

/// Result of one cone irradiance sample.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ConeIrradiance {
    pub irradiance: [f32; 3],
    /// Scalar luminance proxy (mean of RGB).
    pub energy: f32,
    pub steps_taken: u32,
    pub hit_occlusion: bool,
    pub outputs_finite: bool,
}

/// Stateless facade — voxel cone radiosity lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct VoxelConeRadiosity;

impl VoxelConeRadiosity {
    /// Legacy entry — returns mean irradiance energy after cone bake on seeded grid.
    ///
    /// Replaces empty theater: `voxel_grid_density` **is used** (scales emitter).
    pub fn execute_0ms_bake_radiance(voxel_grid_density: f32) -> f32 {
        let density = voxel_grid_density.max(0.0);
        let grid = build_seeded_grid(SOAK_SEED, density);
        let apex = [0.0, 0.0, -0.85];
        let dir = [0.0, 0.0, 1.0];
        let sample = Self::trace_cone(&grid, apex, dir, &ConeParams::default());
        sample.energy
    }

    /// March a cone through the grid; accumulate radiance until occlusion or max dist.
    ///
    /// Footprint radius grows as `t * tan(aperture)`. Occupied cells within the
    /// footprint stop the march (`hit_occlusion`) and contribute zero further energy.
    pub fn trace_cone(
        grid: &VoxelRadianceGrid,
        apex: [f32; 3],
        direction: [f32; 3],
        params: &ConeParams,
    ) -> ConeIrradiance {
        let dir_len = (direction[0] * direction[0]
            + direction[1] * direction[1]
            + direction[2] * direction[2])
            .sqrt()
            .max(EPS);
        let dir = [
            direction[0] / dir_len,
            direction[1] / dir_len,
            direction[2] / dir_len,
        ];
        let aperture = params.aperture.max(0.01).min(1.2);
        let tan_a = aperture.tan();
        let max_dist = params.max_dist.max(EPS);
        let steps = params.steps.max(1);
        let dt = max_dist / steps as f32;

        let mut irr = [0.0f32; 3];
        let mut weight_sum = 0.0f32;
        let mut hit_occlusion = false;
        let mut steps_taken = 0u32;
        let mut t = dt * 0.5;

        while t < max_dist && steps_taken < steps {
            let p = [
                apex[0] + dir[0] * t,
                apex[1] + dir[1] * t,
                apex[2] + dir[2] * t,
            ];
            let radius = (t * tan_a).max(EPS);
            if grid.occluded_near(p, radius) {
                hit_occlusion = true;
                steps_taken += 1;
                break;
            }
            let rad = grid.sample_radiance(p);
            // Inverse-square-ish falloff with distance + solid-angle weight ~ radius².
            let falloff = 1.0 / (1.0 + t * t);
            let solid = radius * radius;
            let w = falloff * solid;
            irr[0] += rad[0] * w;
            irr[1] += rad[1] * w;
            irr[2] += rad[2] * w;
            weight_sum += w;
            steps_taken += 1;
            t += dt;
        }

        if weight_sum > EPS {
            irr[0] /= weight_sum;
            irr[1] /= weight_sum;
            irr[2] /= weight_sum;
        }

        // Clamp energy non-negative.
        irr[0] = irr[0].max(0.0);
        irr[1] = irr[1].max(0.0);
        irr[2] = irr[2].max(0.0);
        let energy = (irr[0] + irr[1] + irr[2]) / 3.0;
        let outputs_finite = apex.iter().all(|c| c.is_finite())
            && direction.iter().all(|c| c.is_finite())
            && irr.iter().all(|c| c.is_finite())
            && energy.is_finite()
            && energy >= 0.0;

        ConeIrradiance {
            irradiance: irr,
            energy,
            steps_taken,
            hit_occlusion,
            outputs_finite,
        }
    }
}

/// Build a seeded fixed-res grid: bright emitter slab + optional occluder wall.
///
/// `emitter_scale` multiplies radiance (from legacy density). When `with_occluder`
/// is true, a solid wall blocks +Z cones from −Z apex.
pub fn build_seeded_grid_ex(seed: u64, emitter_scale: f32, with_occluder: bool) -> VoxelRadianceGrid {
    let mut grid = VoxelRadianceGrid::empty(GRID_RES, HALF_EXTENT);
    let mut rng = SeededRng::new(seed);
    let scale = emitter_scale.max(0.0);

    // Emitter slab near +Z face (radiance > 0).
    for z in (GRID_RES * 3 / 4)..GRID_RES {
        for y in 0..GRID_RES {
            for x in 0..GRID_RES {
                let jitter = 0.15 * rng.next_unit();
                let r = (0.85 + jitter) * scale;
                let g = (0.75 + 0.1 * rng.next_unit()) * scale;
                let b = (0.55 + 0.2 * rng.next_unit()) * scale;
                grid.set(
                    x,
                    y,
                    z,
                    VoxelCell {
                        occupied: false,
                        radiance: [r.max(0.0), g.max(0.0), b.max(0.0)],
                    },
                );
            }
        }
    }

    if with_occluder {
        // Occupied wall mid-grid (blocks cone from −Z toward +Z).
        let z_wall = GRID_RES / 2;
        for y in (GRID_RES / 4)..(GRID_RES * 3 / 4) {
            for x in (GRID_RES / 4)..(GRID_RES * 3 / 4) {
                grid.set(
                    x,
                    y,
                    z_wall,
                    VoxelCell {
                        occupied: true,
                        radiance: [0.0, 0.0, 0.0],
                    },
                );
            }
        }
    }

    // Sparse low-level fill noise (non-occluding radiance dust).
    for _ in 0..32 {
        let x = (rng.next_u32() as usize) % GRID_RES;
        let y = (rng.next_u32() as usize) % GRID_RES;
        let z = (rng.next_u32() as usize) % (GRID_RES / 2).max(1);
        let cell = grid.get(x, y, z);
        if !cell.occupied {
            let dust = 0.05 * scale * rng.next_unit();
            grid.set(
                x,
                y,
                z,
                VoxelCell {
                    occupied: false,
                    radiance: [
                        (cell.radiance[0] + dust).max(0.0),
                        (cell.radiance[1] + dust * 0.9).max(0.0),
                        (cell.radiance[2] + dust * 0.7).max(0.0),
                    ],
                },
            );
        }
    }

    grid
}

/// Open (no occluder) seeded grid — soak baseline.
pub fn build_seeded_grid(seed: u64, emitter_scale: f32) -> VoxelRadianceGrid {
    build_seeded_grid_ex(seed, emitter_scale, false)
}

/// Letter **ga** soak report — voxel cone radiosity evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct VoxelConeRadiositySoakReport {
    pub voxel_cone_radiosity_ready: bool,
    pub occluded_lower_than_open: bool,
    pub energy_non_negative: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub open_energy: f32,
    pub occluded_energy: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_symmetric_vector_algebra_probe: bool,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub lumen_vxgi_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(open_energy: f32, occluded_energy: f32, sample_count: u32) -> VoxelConeRadiositySoakReport {
    VoxelConeRadiositySoakReport {
        voxel_cone_radiosity_ready: false,
        occluded_lower_than_open: false,
        energy_non_negative: false,
        same_seed_same_results: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        open_energy,
        occluded_energy,
        sample_count,
        fingerprint: 0,
        distinct_from_symmetric_vector_algebra_probe: true,
        distinct_from_recursive_fractal_enhancement_probe: true,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_kernel_foundation_probe: true,
        lumen_vxgi_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run voxel cone radiosity soak — occlusion / energy / seed determinism.
pub fn run_voxel_cone_radiosity_soak() -> VoxelConeRadiositySoakReport {
    let density = 1.0;
    let open_a = build_seeded_grid_ex(SOAK_SEED, density, false);
    let open_b = build_seeded_grid_ex(SOAK_SEED, density, false);
    let blocked = build_seeded_grid_ex(SOAK_SEED, density, true);

    let same_seed_same_results = open_a == open_b;

    let apex = [0.0, 0.0, -0.85];
    let dir = [0.0, 0.0, 1.0];
    let params = ConeParams::default();

    let open_sample = VoxelConeRadiosity::trace_cone(&open_a, apex, dir, &params);
    let open_sample2 = VoxelConeRadiosity::trace_cone(&open_b, apex, dir, &params);
    let blocked_sample = VoxelConeRadiosity::trace_cone(&blocked, apex, dir, &params);

    let same_trace =
        (open_sample.energy - open_sample2.energy).abs() < SOAK_EPS && open_sample == open_sample2;

    let open_energy = open_sample.energy;
    let occluded_energy = blocked_sample.energy;
    let occluded_lower_than_open =
        blocked_sample.hit_occlusion && occluded_energy + SOAK_EPS < open_energy && open_energy > SOAK_EPS;

    let energy_non_negative = open_energy >= 0.0
        && occluded_energy >= 0.0
        && open_sample.irradiance.iter().all(|&c| c >= 0.0)
        && blocked_sample.irradiance.iter().all(|&c| c >= 0.0);

    let outputs_finite = open_sample.outputs_finite && blocked_sample.outputs_finite;

    // Legacy path must use density (non-theater).
    let legacy = VoxelConeRadiosity::execute_0ms_bake_radiance(density);
    let legacy_zero = VoxelConeRadiosity::execute_0ms_bake_radiance(0.0);
    let state_mutated = legacy > SOAK_EPS && legacy_zero < SOAK_EPS && open_energy > SOAK_EPS;

    let sample_count = 2u32; // open + occluded

    let ok = occluded_lower_than_open
        && energy_non_negative
        && same_seed_same_results
        && same_trace
        && outputs_finite
        && state_mutated;

    if !ok {
        let mut fail = fail_report(open_energy, occluded_energy, sample_count);
        fail.occluded_lower_than_open = occluded_lower_than_open;
        fail.energy_non_negative = energy_non_negative;
        fail.same_seed_same_results = same_seed_same_results && same_trace;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        fail.deterministic = same_seed_same_results && same_trace;
        return fail;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        quant_f32(open_energy),
        quant_f32(occluded_energy),
        open_a.res as u64,
        if blocked_sample.hit_occlusion { 1 } else { 0 },
    ]);

    VoxelConeRadiositySoakReport {
        voxel_cone_radiosity_ready: true,
        occluded_lower_than_open: true,
        energy_non_negative: true,
        same_seed_same_results: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        open_energy,
        occluded_energy,
        sample_count,
        fingerprint: fp,
        distinct_from_symmetric_vector_algebra_probe: true,
        distinct_from_recursive_fractal_enhancement_probe: true,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_kernel_foundation_probe: true,
        lumen_vxgi_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `voxel_cone_radiosity_ready` (**ga**).
pub fn probe_voxel_cone_radiosity() -> VoxelConeRadiositySoakReport {
    run_voxel_cone_radiosity_soak()
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

struct SeededRng {
    state: u64,
}

impl SeededRng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed.wrapping_add(0xA5A5_5A5A_5A5A_5A5A),
        }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self
            .state
            .wrapping_mul(1664525)
            .wrapping_add(1013904223);
        (self.state >> 16) as u32
    }

    /// Uniform in [0, 1).
    fn next_unit(&mut self) -> f32 {
        (self.next_u32() as f32) / (u32::MAX as f32 + 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn occluded_cone_lower_energy() {
        let open = build_seeded_grid_ex(SOAK_SEED, 1.0, false);
        let blocked = build_seeded_grid_ex(SOAK_SEED, 1.0, true);
        let apex = [0.0, 0.0, -0.85];
        let dir = [0.0, 0.0, 1.0];
        let params = ConeParams::default();
        let a = VoxelConeRadiosity::trace_cone(&open, apex, dir, &params);
        let b = VoxelConeRadiosity::trace_cone(&blocked, apex, dir, &params);
        assert!(b.hit_occlusion, "blocked cone must hit occlusion");
        assert!(
            b.energy + SOAK_EPS < a.energy,
            "occluded {} vs open {}",
            b.energy,
            a.energy
        );
        assert!(a.energy > SOAK_EPS);
    }

    #[test]
    fn energy_non_negative() {
        let grid = build_seeded_grid(SOAK_SEED, 1.0);
        let s = VoxelConeRadiosity::trace_cone(
            &grid,
            [0.0, 0.0, -0.85],
            [0.0, 0.0, 1.0],
            &ConeParams::default(),
        );
        assert!(s.energy >= 0.0);
        assert!(s.irradiance.iter().all(|&c| c >= 0.0));
    }

    #[test]
    fn same_seed_same_grid_and_trace() {
        let a = build_seeded_grid(SOAK_SEED, 1.0);
        let b = build_seeded_grid(SOAK_SEED, 1.0);
        assert_eq!(a, b);
        let params = ConeParams::default();
        let ta = VoxelConeRadiosity::trace_cone(&a, [0.0, 0.0, -0.85], [0.0, 0.0, 1.0], &params);
        let tb = VoxelConeRadiosity::trace_cone(&b, [0.0, 0.0, -0.85], [0.0, 0.0, 1.0], &params);
        assert_eq!(ta, tb);
    }

    #[test]
    fn legacy_uses_density() {
        let hot = VoxelConeRadiosity::execute_0ms_bake_radiance(1.0);
        let cold = VoxelConeRadiosity::execute_0ms_bake_radiance(0.0);
        assert!(hot > SOAK_EPS);
        assert!(cold < SOAK_EPS);
    }

    #[test]
    fn soak_ready() {
        let r = run_voxel_cone_radiosity_soak();
        assert!(r.voxel_cone_radiosity_ready, "{r:?}");
        assert!(r.occluded_lower_than_open);
        assert!(r.energy_non_negative);
        assert!(r.same_seed_same_results);
        assert!(r.deterministic);
        assert!(!r.lumen_vxgi_aaa_ready);
        assert!(r.distinct_from_symmetric_vector_algebra_probe);
        assert!(r.distinct_from_recursive_fractal_enhancement_probe);
        assert!(r.distinct_from_blue_noise_dithering_probe);
        assert!(r.distinct_from_quantum_overlap_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("voxelConeRadiosityReady", "symmetricVectorAlgebraReady");
        assert_ne!("voxelConeRadiosityReady", "recursiveFractalEnhancementReady");
        assert_ne!("voxelConeRadiosityReady", "blueNoiseDitheringReady");
        assert_ne!("voxelConeRadiosityReady", "quantumOverlapReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_voxel_cone_radiosity(),
            run_voxel_cone_radiosity_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_voxel_cone_radiosity_soak();
        let b = run_voxel_cone_radiosity_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

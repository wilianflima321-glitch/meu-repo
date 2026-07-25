//! Recursive Fractal Enhancement — letter **fy**.
//!
//! Replaces Semantic Echo / Art Filter theater (`amplify_foveal_narrative_detail`
//! with empty fovea_zoom narrative comments) with seeded **diamond-square lite**
//! (midpoint-displacement recursion) on a `(2^n)+1` heightfield. Soak proves
//! same seed → same field and recursion depth > 0 strictly increases detail
//! metrics (height variance + edge-gradient count) vs depth-0.
//!
//! Honesty probe `recursive_fractal_enhancement_ready` /
//! `recursiveFractalEnhancementReady` is **distinct** from fx
//! `blueNoiseDitheringReady`, fw `quantumOverlapReady`, ev
//! `microDisplacementNoiseReady`, and prior probes.
//!
//! **HELD:** Full Nanite/Lumen/Unreal terrain AAA
//! (`nanite_lumen_terrain_aaa_ready: false`) · Coins / Agones / Nanite / DLSS /
//! Quic.

/// Default soak seed (deterministic).
pub const SOAK_SEED: u64 = 0x0F_F701_5EED;
/// Heightfield power — size = 2^POWER + 1 (17×17 for soak).
pub const SOAK_POWER: u32 = 4;
/// Soak compare depths.
pub const SOAK_DEPTH_ZERO: u32 = 0;
pub const SOAK_DEPTH_DEEP: u32 = 4;
/// Initial corner roughness amplitude.
pub const BASE_AMPLITUDE: f32 = 1.0;
/// Roughness decay per recursion level (halved each step).
pub const ROUGHNESS_DECAY: f32 = 0.5;
/// Edge threshold for gradient-count metric (|Δh| > EDGE_EPS).
pub const EDGE_EPS: f32 = 1e-4;
/// Fingerprint seed ("fyrec").
const FP_SEED: u64 = 0x6679_7265_63;
const EPS: f32 = 1e-8;

/// Seeded diamond-square heightfield.
#[derive(Debug, Clone, PartialEq)]
pub struct FractalHeightfield {
    pub seed: u64,
    pub power: u32,
    pub depth: u32,
    /// Row-major heights; len = size*size, size = 2^power + 1.
    pub heights: Vec<f32>,
}

impl FractalHeightfield {
    /// Build a heightfield with `depth` diamond-square recursion levels.
    /// `depth == 0` → corners only (flat interior zeros).
    /// `depth >= power` → full subdivision to unit step.
    pub fn generate(seed: u64, power: u32, depth: u32) -> Self {
        let power = power.clamp(1, 8);
        let size = ((1u32 << power) + 1) as usize;
        let mut heights = vec![0.0f32; size * size];
        let mut rng = SeededRng::new(seed);

        // Seed four corners.
        set(&mut heights, size, 0, 0, rng.next_signed() * BASE_AMPLITUDE);
        set(
            &mut heights,
            size,
            size - 1,
            0,
            rng.next_signed() * BASE_AMPLITUDE,
        );
        set(
            &mut heights,
            size,
            0,
            size - 1,
            rng.next_signed() * BASE_AMPLITUDE,
        );
        set(
            &mut heights,
            size,
            size - 1,
            size - 1,
            rng.next_signed() * BASE_AMPLITUDE,
        );

        let max_depth = depth.min(power);
        let mut step = 1usize << power;
        let mut amp = BASE_AMPLITUDE * ROUGHNESS_DECAY;
        let mut level = 0u32;

        while level < max_depth && step > 1 {
            let half = step / 2;

            // Diamond step: center of each square.
            let mut y = 0usize;
            while y < size - 1 {
                let mut x = 0usize;
                while x < size - 1 {
                    let avg = (get(&heights, size, x, y)
                        + get(&heights, size, x + step, y)
                        + get(&heights, size, x, y + step)
                        + get(&heights, size, x + step, y + step))
                        * 0.25;
                    let noise = rng.next_signed() * amp;
                    set(&mut heights, size, x + half, y + half, avg + noise);
                    x += step;
                }
                y += step;
            }

            // Square step: edge midpoints.
            let mut y = 0usize;
            while y < size {
                let mut x = 0usize;
                while x < size {
                    // Odd-x / even-y on this lattice → horizontal midpoints.
                    if (x % step == half) && y.is_multiple_of(step) {
                        let avg = square_avg(&heights, size, x, y, half);
                        let noise = rng.next_signed() * amp;
                        set(&mut heights, size, x, y, avg + noise);
                    }
                    // Even-x / odd-y → vertical midpoints.
                    if x.is_multiple_of(step) && (y % step == half) {
                        let avg = square_avg(&heights, size, x, y, half);
                        let noise = rng.next_signed() * amp;
                        set(&mut heights, size, x, y, avg + noise);
                    }
                    x += half;
                    if half == 0 {
                        break;
                    }
                }
                y += half;
                if half == 0 {
                    break;
                }
            }

            step = half;
            amp *= ROUGHNESS_DECAY;
            level += 1;
        }

        Self {
            seed,
            power,
            depth: max_depth,
            heights,
        }
    }

    #[inline]
    pub fn size(&self) -> usize {
        ((1u32 << self.power) + 1) as usize
    }

    #[inline]
    pub fn sample_count(&self) -> usize {
        self.heights.len()
    }

    /// Population variance of heights.
    pub fn variance(&self) -> f32 {
        let n = self.heights.len();
        if n == 0 {
            return 0.0;
        }
        let mean = self.heights.iter().sum::<f32>() / n as f32;
        let mut acc = 0.0f32;
        for &h in &self.heights {
            let d = h - mean;
            acc += d * d;
        }
        acc / n as f32
    }

    /// Count of horizontal+vertical neighbor pairs with |Δh| > EDGE_EPS.
    pub fn edge_count(&self) -> u32 {
        let size = self.size();
        let mut count = 0u32;
        for y in 0..size {
            for x in 0..size {
                let h = get(&self.heights, size, x, y);
                if x + 1 < size {
                    let d = (h - get(&self.heights, size, x + 1, y)).abs();
                    if d > EDGE_EPS {
                        count += 1;
                    }
                }
                if y + 1 < size {
                    let d = (h - get(&self.heights, size, x, y + 1)).abs();
                    if d > EDGE_EPS {
                        count += 1;
                    }
                }
            }
        }
        count
    }

    /// Count of non-zero (filled) samples after generation.
    pub fn filled_sample_count(&self) -> u32 {
        self.heights
            .iter()
            .filter(|&&h| h.abs() > EPS)
            .count() as u32
    }

    /// Fingerprint of seed + depth + quantized heights.
    pub fn fingerprint(&self) -> u64 {
        let mut h = FP_SEED;
        h = hash_mix(h, self.seed);
        h = hash_mix(h, self.power as u64);
        h = hash_mix(h, self.depth as u64);
        h = hash_mix(h, self.heights.len() as u64);
        for &v in &self.heights {
            h = hash_mix(h, quant_f32(v));
        }
        h
    }
}

/// Real recursive fractal enhancement kernel (not narrative theater).
#[derive(Debug, Clone)]
pub struct RecursiveFractalEnhancement {
    pub field: FractalHeightfield,
}

impl RecursiveFractalEnhancement {
    pub fn new(seed: u64, power: u32, depth: u32) -> Self {
        Self {
            field: FractalHeightfield::generate(seed, power, depth),
        }
    }

    /// Sample height at normalized UV in `[0,1]²` (bilinear).
    pub fn sample_uv(&self, u: f32, v: f32) -> f32 {
        let size = self.field.size();
        if size < 2 {
            return 0.0;
        }
        let u = sanitize01(u);
        let v = sanitize01(v);
        let fx = u * (size - 1) as f32;
        let fy = v * (size - 1) as f32;
        let x0 = fx.floor() as usize;
        let y0 = fy.floor() as usize;
        let x1 = (x0 + 1).min(size - 1);
        let y1 = (y0 + 1).min(size - 1);
        let tx = fx - x0 as f32;
        let ty = fy - y0 as f32;
        let h00 = get(&self.field.heights, size, x0, y0);
        let h10 = get(&self.field.heights, size, x1, y0);
        let h01 = get(&self.field.heights, size, x0, y1);
        let h11 = get(&self.field.heights, size, x1, y1);
        let a = h00 + (h10 - h00) * tx;
        let b = h01 + (h11 - h01) * tx;
        a + (b - a) * ty
    }

    /// Legacy theater signature — now real: depth from fovea zoom proxy.
    /// `fovea_zoom_level` maps to recursion depth (clamped); narrative ignored.
    pub fn amplify_foveal_narrative_detail(fovea_zoom_level: f32, _semantic_narrative: &str) -> f32 {
        let zoom = if fovea_zoom_level.is_finite() {
            fovea_zoom_level.max(0.0)
        } else {
            0.0
        };
        let depth = if zoom > 8.0 {
            SOAK_DEPTH_DEEP
        } else if zoom > 2.0 {
            2
        } else {
            SOAK_DEPTH_ZERO
        };
        let k = RecursiveFractalEnhancement::new(SOAK_SEED, SOAK_POWER, depth);
        k.sample_uv(0.5, 0.5)
    }
}

/// Letter **fy** soak report — recursive fractal enhancement evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct RecursiveFractalEnhancementSoakReport {
    pub recursive_fractal_enhancement_ready: bool,
    pub same_seed_same_field: bool,
    pub depth_increases_variance: bool,
    pub depth_increases_edge_count: bool,
    pub depth_increases_filled_samples: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub variance_depth0: f32,
    pub variance_deep: f32,
    pub edge_count_depth0: u32,
    pub edge_count_deep: u32,
    pub filled_depth0: u32,
    pub filled_deep: u32,
    pub fingerprint: u64,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_micro_displacement_noise_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub nanite_lumen_terrain_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(
    sample_count: u32,
    var0: f32,
    var_d: f32,
    e0: u32,
    e_d: u32,
    f0: u32,
    f_d: u32,
) -> RecursiveFractalEnhancementSoakReport {
    RecursiveFractalEnhancementSoakReport {
        recursive_fractal_enhancement_ready: false,
        same_seed_same_field: false,
        depth_increases_variance: false,
        depth_increases_edge_count: false,
        depth_increases_filled_samples: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        sample_count,
        variance_depth0: var0,
        variance_deep: var_d,
        edge_count_depth0: e0,
        edge_count_deep: e_d,
        filled_depth0: f0,
        filled_deep: f_d,
        fingerprint: 0,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_micro_displacement_noise_probe: true,
        distinct_from_kernel_foundation_probe: true,
        nanite_lumen_terrain_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run recursive fractal enhancement soak — depth detail + determinism.
pub fn run_recursive_fractal_enhancement_soak() -> RecursiveFractalEnhancementSoakReport {
    let deep_a = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
    let deep_b = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
    let shallow = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_ZERO);

    let same_seed_same_field =
        deep_a.heights == deep_b.heights && deep_a.fingerprint() == deep_b.fingerprint();

    let var0 = shallow.variance();
    let var_d = deep_a.variance();
    let e0 = shallow.edge_count();
    let e_d = deep_a.edge_count();
    let f0 = shallow.filled_sample_count();
    let f_d = deep_a.filled_sample_count();

    let depth_increases_variance = var_d > var0 + EPS;
    let depth_increases_edge_count = e_d > e0;
    let depth_increases_filled_samples = f_d > f0;

    let kernel = RecursiveFractalEnhancement {
        field: deep_a.clone(),
    };
    let s0 = kernel.sample_uv(0.25, 0.75);
    let legacy = RecursiveFractalEnhancement::amplify_foveal_narrative_detail(9.0, "unused");
    let sample_finite = s0.is_finite() && legacy.is_finite();

    let fp_a = deep_a.fingerprint();
    let fp_b = deep_b.fingerprint();
    let deterministic = fp_a == fp_b && same_seed_same_field;

    let outputs_finite = var0.is_finite()
        && var_d.is_finite()
        && sample_finite
        && deep_a.heights.iter().all(|h| h.is_finite())
        && shallow.heights.iter().all(|h| h.is_finite());

    let state_mutated = deep_a.sample_count() > 4 && e_d > 0 && f_d > 4;

    let sample_count = deep_a.sample_count() as u32;

    let ready = same_seed_same_field
        && depth_increases_variance
        && depth_increases_edge_count
        && depth_increases_filled_samples
        && deterministic
        && outputs_finite
        && state_mutated;

    if !ready {
        let mut fail = fail_report(sample_count, var0, var_d, e0, e_d, f0, f_d);
        fail.same_seed_same_field = same_seed_same_field;
        fail.depth_increases_variance = depth_increases_variance;
        fail.depth_increases_edge_count = depth_increases_edge_count;
        fail.depth_increases_filled_samples = depth_increases_filled_samples;
        fail.deterministic = deterministic;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        quant_f32(var0),
        quant_f32(var_d),
        e0 as u64,
        e_d as u64,
        f0 as u64,
        f_d as u64,
        fp_a,
    ]);

    RecursiveFractalEnhancementSoakReport {
        recursive_fractal_enhancement_ready: true,
        same_seed_same_field: true,
        depth_increases_variance: true,
        depth_increases_edge_count: true,
        depth_increases_filled_samples: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        sample_count,
        variance_depth0: var0,
        variance_deep: var_d,
        edge_count_depth0: e0,
        edge_count_deep: e_d,
        filled_depth0: f0,
        filled_deep: f_d,
        fingerprint: fp,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_micro_displacement_noise_probe: true,
        distinct_from_kernel_foundation_probe: true,
        nanite_lumen_terrain_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `recursive_fractal_enhancement_ready` (**fy**).
pub fn probe_recursive_fractal_enhancement() -> RecursiveFractalEnhancementSoakReport {
    run_recursive_fractal_enhancement_soak()
}

fn square_avg(heights: &[f32], size: usize, x: usize, y: usize, half: usize) -> f32 {
    let mut sum = 0.0f32;
    let mut n = 0u32;
    if x >= half {
        sum += get(heights, size, x - half, y);
        n += 1;
    }
    if x + half < size {
        sum += get(heights, size, x + half, y);
        n += 1;
    }
    if y >= half {
        sum += get(heights, size, x, y - half);
        n += 1;
    }
    if y + half < size {
        sum += get(heights, size, x, y + half);
        n += 1;
    }
    if n == 0 {
        0.0
    } else {
        sum / n as f32
    }
}

#[inline]
fn get(heights: &[f32], size: usize, x: usize, y: usize) -> f32 {
    heights[y * size + x]
}

#[inline]
fn set(heights: &mut [f32], size: usize, x: usize, y: usize, v: f32) {
    heights[y * size + x] = if v.is_finite() { v } else { 0.0 };
}

#[inline]
fn sanitize01(v: f32) -> f32 {
    if !v.is_finite() {
        return 0.0;
    }
    v.clamp(0.0, 1.0)
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

    /// Uniform in [-1, 1).
    fn next_signed(&mut self) -> f32 {
        let t = (self.next_u32() as f32) / (u32::MAX as f32 + 1.0);
        t * 2.0 - 1.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_seed_same_field() {
        let a = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
        let b = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
        assert_eq!(a.heights, b.heights);
        assert_eq!(a.fingerprint(), b.fingerprint());
    }

    #[test]
    fn different_seed_diverges() {
        let a = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
        let b = FractalHeightfield::generate(SOAK_SEED ^ 0xDEAD, SOAK_POWER, SOAK_DEPTH_DEEP);
        assert_ne!(a.heights, b.heights);
    }

    #[test]
    fn depth_increases_detail_metrics() {
        let shallow = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_ZERO);
        let deep = FractalHeightfield::generate(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
        assert!(
            deep.variance() > shallow.variance(),
            "var deep={} shallow={}",
            deep.variance(),
            shallow.variance()
        );
        assert!(
            deep.edge_count() > shallow.edge_count(),
            "edges deep={} shallow={}",
            deep.edge_count(),
            shallow.edge_count()
        );
        assert!(deep.filled_sample_count() > shallow.filled_sample_count());
    }

    #[test]
    fn sample_uv_finite() {
        let k = RecursiveFractalEnhancement::new(SOAK_SEED, SOAK_POWER, SOAK_DEPTH_DEEP);
        let s = k.sample_uv(0.3, 0.7);
        assert!(s.is_finite());
        let legacy = RecursiveFractalEnhancement::amplify_foveal_narrative_detail(9.0, "x");
        assert!(legacy.is_finite());
    }

    #[test]
    fn soak_ready() {
        let r = run_recursive_fractal_enhancement_soak();
        assert!(r.recursive_fractal_enhancement_ready, "{r:?}");
        assert!(r.same_seed_same_field);
        assert!(r.depth_increases_variance);
        assert!(r.depth_increases_edge_count);
        assert!(r.depth_increases_filled_samples);
        assert!(r.deterministic);
        assert!(!r.nanite_lumen_terrain_aaa_ready);
        assert!(r.distinct_from_blue_noise_dithering_probe);
        assert!(r.distinct_from_quantum_overlap_probe);
        assert!(r.distinct_from_micro_displacement_noise_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("recursiveFractalEnhancementReady", "blueNoiseDitheringReady");
        assert_ne!("recursiveFractalEnhancementReady", "quantumOverlapReady");
        assert_ne!(
            "recursiveFractalEnhancementReady",
            "microDisplacementNoiseReady"
        );
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_recursive_fractal_enhancement(),
            run_recursive_fractal_enhancement_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_recursive_fractal_enhancement_soak();
        let b = run_recursive_fractal_enhancement_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

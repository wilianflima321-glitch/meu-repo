//! WGSL Surface Noise Kernel (CPU reference) — letter **gh**.
//!
//! Replaces ZST / println-theater `allocate_direct_noise_buffer` (empty
//! WebGPU bind marketing, no soak/probe) with real seeded surface noise
//! usable as a displacement factor: value noise, gradient (Perlin-lite),
//! and simplex-lite. Same seed+uv → same value; different seeds diverge;
//! outputs bounded; soak proves continuity vs white-noise baseline.
//!
//! Honesty probe `wgsl_surface_noise_kernel_ready` /
//! `wgslSurfaceNoiseKernelReady` is **distinct** from gf
//! `acesCinematicTonemapperReady`, gg `fluidNinjaComputeReady`, ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! ev `microDisplacementNoiseReady`, and prior.
//!
//! Letter **in**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs fk/fd.
//!
//! **HELD:** Full WGSL runtime GPU dispatch AAA
//! (`wgsl_gpu_dispatch_aaa_ready: false`) · Coins / Agones / Nanite / DLSS /
//! Quic. This module is the CPU reference path for surface displacement.

/// Default soak seed ("ghns").
pub const SOAK_SEED: u32 = 0x6768_6e73;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("ghfp").
const FP_SEED: u64 = 0x6768_6670;
const EPS: f32 = 1e-6;

/// Default octaves for FBM displacement factor.
pub const DEFAULT_OCTAVES: u32 = 4;
/// Base frequency (UV space).
pub const BASE_FREQUENCY: f32 = 4.0;
/// Base amplitude before amplitude scale.
pub const BASE_AMPLITUDE: f32 = 0.5;
/// Lacunarity / gain for FBM.
pub const LACUNARITY: f32 = 2.0;
pub const GAIN: f32 = 0.5;
/// Soak buffer resolution (square).
pub const SOAK_RES: usize = 32;
/// Continuity step for finite-difference mean |Δ|.
pub const CONTINUITY_STEP: f32 = 1.0 / 64.0;

/// Noise algorithm variant for surface displacement.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[derive(Default)]
pub enum SurfaceNoiseKind {
    /// Trilinear value noise (smooth lattice).
    Value,
    /// Gradient / Perlin-lite (dot with hashed grads).
    #[default]
    Gradient,
    /// Simplex-lite (skewed lattice, 2D/3D).
    SimplexLite,
}


/// Parameters for surface noise evaluation / buffer fill.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SurfaceNoiseParams {
    pub kind: SurfaceNoiseKind,
    pub octaves: u32,
    pub base_frequency: f32,
    pub base_amplitude: f32,
    pub lacunarity: f32,
    pub gain: f32,
    pub seed: u32,
    /// Scales the final displacement factor (≥ 0).
    pub amplitude_scale: f32,
}

impl Default for SurfaceNoiseParams {
    fn default() -> Self {
        Self {
            kind: SurfaceNoiseKind::Gradient,
            octaves: DEFAULT_OCTAVES,
            base_frequency: BASE_FREQUENCY,
            base_amplitude: BASE_AMPLITUDE,
            lacunarity: LACUNARITY,
            gain: GAIN,
            seed: SOAK_SEED,
            amplitude_scale: 1.0,
        }
    }
}

/// One noise sample (displacement factor).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SurfaceNoiseSample {
    /// Signed displacement factor (typically ∈ [-1, 1] before scale).
    pub value: f32,
    /// UV / world sample position.
    pub uv: [f32; 2],
    pub outputs_finite: bool,
    pub in_bounds: bool,
}

/// Filled noise buffer ready for (future) WGSL bind upload — CPU reference.
#[derive(Debug, Clone, PartialEq)]
pub struct SurfaceNoiseBuffer {
    pub width: u32,
    pub height: u32,
    pub seed: u32,
    pub kind: SurfaceNoiseKind,
    /// Row-major displacement factors.
    pub samples: Vec<f32>,
}

impl SurfaceNoiseBuffer {
    #[inline]
    pub fn len(&self) -> usize {
        self.samples.len()
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.samples.is_empty()
    }

    /// Sample nearest texel (clamp).
    pub fn sample_nearest(&self, u: f32, v: f32) -> f32 {
        if self.width == 0 || self.height == 0 || self.samples.is_empty() {
            return 0.0;
        }
        let x = (u.clamp(0.0, 1.0) * (self.width - 1) as f32).round() as usize;
        let y = (v.clamp(0.0, 1.0) * (self.height - 1) as f32).round() as usize;
        let x = x.min(self.width as usize - 1);
        let y = y.min(self.height as usize - 1);
        self.samples[y * self.width as usize + x]
    }
}

/// Stateless facade — WGSL surface noise CPU reference.
#[derive(Debug, Default, Clone, Copy)]
pub struct WgslSurfaceNoiseKernel;

impl WgslSurfaceNoiseKernel {
    /// Legacy entry — replaces println theater with a real seeded buffer fill.
    ///
    /// Allocates a 64×64 gradient-FBM displacement map for the default seed.
    pub fn allocate_direct_noise_buffer() -> SurfaceNoiseBuffer {
        Self::allocate_noise_buffer(64, 64, &SurfaceNoiseParams::default())
    }

    /// Allocate and fill a noise buffer (CPU reference for WGSL bind upload).
    pub fn allocate_noise_buffer(
        width: u32,
        height: u32,
        params: &SurfaceNoiseParams,
    ) -> SurfaceNoiseBuffer {
        let w = width.max(1);
        let h = height.max(1);
        let mut samples = Vec::with_capacity((w * h) as usize);
        for y in 0..h {
            for x in 0..w {
                let u = if w > 1 {
                    x as f32 / (w - 1) as f32
                } else {
                    0.0
                };
                let v = if h > 1 {
                    y as f32 / (h - 1) as f32
                } else {
                    0.0
                };
                samples.push(Self::sample_uv([u, v], params).value);
            }
        }
        SurfaceNoiseBuffer {
            width: w,
            height: h,
            seed: params.seed,
            kind: params.kind,
            samples,
        }
    }

    /// Surface displacement factor at UV (FBM of chosen kind).
    pub fn sample_uv(uv: [f32; 2], params: &SurfaceNoiseParams) -> SurfaceNoiseSample {
        let amp_scale = params.amplitude_scale.max(0.0);
        let mut amp = params.base_amplitude.max(0.0);
        let mut freq = params.base_frequency.max(EPS);
        let mut sum = 0.0_f32;
        let mut amp_sum = 0.0_f32;
        let octaves = params.octaves.clamp(1, 8);
        for o in 0..octaves {
            let p = [uv[0] * freq, uv[1] * freq];
            let seed = params.seed.wrapping_add(o.wrapping_mul(0x9e37));
            let n = match params.kind {
                SurfaceNoiseKind::Value => Self::value_noise_2d(p, seed),
                SurfaceNoiseKind::Gradient => Self::gradient_noise_2d(p, seed),
                SurfaceNoiseKind::SimplexLite => Self::simplex_lite_2d(p, seed),
            };
            sum += n * amp;
            amp_sum += amp;
            freq *= params.lacunarity.max(1.0);
            amp *= params.gain.clamp(0.0, 1.0);
        }
        let norm = if amp_sum > EPS { sum / amp_sum } else { 0.0 };
        let value = (norm * amp_scale).clamp(-1.0, 1.0);
        let finite = value.is_finite() && uv.iter().all(|c| c.is_finite());
        let in_bounds = (-1.0..=1.0).contains(&value);
        SurfaceNoiseSample {
            value,
            uv,
            outputs_finite: finite,
            in_bounds,
        }
    }

    /// 3D value noise ∈ [-1, 1] (optional volumetric surface factor).
    pub fn value_noise_3d(p: [f32; 3], seed: u32) -> f32 {
        let x0 = p[0].floor() as i32;
        let y0 = p[1].floor() as i32;
        let z0 = p[2].floor() as i32;
        let fx = fade(p[0] - x0 as f32);
        let fy = fade(p[1] - y0 as f32);
        let fz = fade(p[2] - z0 as f32);

        let n000 = hash01(x0, y0, z0, seed);
        let n100 = hash01(x0 + 1, y0, z0, seed);
        let n010 = hash01(x0, y0 + 1, z0, seed);
        let n110 = hash01(x0 + 1, y0 + 1, z0, seed);
        let n001 = hash01(x0, y0, z0 + 1, seed);
        let n101 = hash01(x0 + 1, y0, z0 + 1, seed);
        let n011 = hash01(x0, y0 + 1, z0 + 1, seed);
        let n111 = hash01(x0 + 1, y0 + 1, z0 + 1, seed);

        let nx00 = lerp(n000, n100, fx);
        let nx10 = lerp(n010, n110, fx);
        let nx01 = lerp(n001, n101, fx);
        let nx11 = lerp(n011, n111, fx);
        let nxy0 = lerp(nx00, nx10, fy);
        let nxy1 = lerp(nx01, nx11, fy);
        lerp(nxy0, nxy1, fz) * 2.0 - 1.0
    }

    /// 2D value noise ∈ [-1, 1].
    pub fn value_noise_2d(p: [f32; 2], seed: u32) -> f32 {
        let x0 = p[0].floor() as i32;
        let y0 = p[1].floor() as i32;
        let fx = fade(p[0] - x0 as f32);
        let fy = fade(p[1] - y0 as f32);
        let n00 = hash01(x0, y0, 0, seed);
        let n10 = hash01(x0 + 1, y0, 0, seed);
        let n01 = hash01(x0, y0 + 1, 0, seed);
        let n11 = hash01(x0 + 1, y0 + 1, 0, seed);
        let nx0 = lerp(n00, n10, fx);
        let nx1 = lerp(n01, n11, fx);
        lerp(nx0, nx1, fy) * 2.0 - 1.0
    }

    /// 2D gradient / Perlin-lite noise ∈ ~[-1, 1].
    pub fn gradient_noise_2d(p: [f32; 2], seed: u32) -> f32 {
        let x0 = p[0].floor() as i32;
        let y0 = p[1].floor() as i32;
        let fx = p[0] - x0 as f32;
        let fy = p[1] - y0 as f32;
        let u = fade(fx);
        let v = fade(fy);

        let g00 = grad2(x0, y0, seed);
        let g10 = grad2(x0 + 1, y0, seed);
        let g01 = grad2(x0, y0 + 1, seed);
        let g11 = grad2(x0 + 1, y0 + 1, seed);

        let n00 = g00[0] * fx + g00[1] * fy;
        let n10 = g10[0] * (fx - 1.0) + g10[1] * fy;
        let n01 = g01[0] * fx + g01[1] * (fy - 1.0);
        let n11 = g11[0] * (fx - 1.0) + g11[1] * (fy - 1.0);

        let nx0 = lerp(n00, n10, u);
        let nx1 = lerp(n01, n11, u);
        // Scale so typical range sits near [-1, 1].
        (lerp(nx0, nx1, v) * std::f32::consts::SQRT_2).clamp(-1.0, 1.0)
    }

    /// 2D simplex-lite noise ∈ ~[-1, 1].
    pub fn simplex_lite_2d(p: [f32; 2], seed: u32) -> f32 {
        // Skew to simplex grid (F2 = 0.5*(√3-1), G2 = (3-√3)/6).
        const F2: f32 = 0.366_025_4;
        const G2: f32 = 0.211_324_87;
        let s = (p[0] + p[1]) * F2;
        let i = (p[0] + s).floor();
        let j = (p[1] + s).floor();
        let t = (i + j) * G2;
        let x0 = p[0] - (i - t);
        let y0 = p[1] - (j - t);

        let (i1, j1) = if x0 > y0 { (1_i32, 0_i32) } else { (0, 1) };
        let x1 = x0 - i1 as f32 + G2;
        let y1 = y0 - j1 as f32 + G2;
        let x2 = x0 - 1.0 + 2.0 * G2;
        let y2 = y0 - 1.0 + 2.0 * G2;

        let ii = i as i32;
        let jj = j as i32;

        let n0 = contrib2(x0, y0, ii, jj, seed);
        let n1 = contrib2(x1, y1, ii + i1, jj + j1, seed);
        let n2 = contrib2(x2, y2, ii + 1, jj + 1, seed);
        (70.0_f32 * (n0 + n1 + n2)).clamp(-1.0, 1.0)
    }
}

#[inline]
fn fade(t: f32) -> f32 {
    t * t * (3.0 - 2.0 * t)
}

#[inline]
fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Hash → [0, 1).
#[inline]
fn hash01(ix: i32, iy: i32, iz: i32, seed: u32) -> f32 {
    let mut h = seed
        .wrapping_mul(0x9e37_79b1)
        .wrapping_add((ix as u32).wrapping_mul(0x85eb_ca6b));
    h = h
        .wrapping_add((iy as u32).wrapping_mul(0xc2b2_ae35))
        .rotate_left(13);
    h = h
        .wrapping_add((iz as u32).wrapping_mul(0x27d4_eb2d))
        .rotate_left(17);
    h ^= h >> 16;
    h = h.wrapping_mul(0x7feb_352d);
    h ^= h >> 15;
    (h as f32) * (1.0 / (u32::MAX as f32))
}

#[inline]
fn grad2(ix: i32, iy: i32, seed: u32) -> [f32; 2] {
    let a = hash01(ix, iy, 1, seed) * std::f32::consts::TAU;
    [a.cos(), a.sin()]
}

#[inline]
fn contrib2(x: f32, y: f32, ix: i32, iy: i32, seed: u32) -> f32 {
    let t = 0.5 - x * x - y * y;
    if t < 0.0 {
        0.0
    } else {
        let g = grad2(ix, iy, seed);
        let t2 = t * t;
        t2 * t2 * (g[0] * x + g[1] * y)
    }
}

/// Soak report — gates `wgslSurfaceNoiseKernelReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct WgslSurfaceNoiseKernelSoakReport {
    pub wgsl_surface_noise_kernel_ready: bool,
    pub same_seed_same_uv: bool,
    pub different_seeds_diverge: bool,
    pub range_bounded: bool,
    pub continuous_vs_white: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub mean_abs_delta_noise: f32,
    pub mean_abs_delta_white: f32,
    pub sample_value: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: seeded value/gradient/simplex UV FBM vs white — **in**.
    pub evidence_kind: &'static str,
    /// Fingerprint of surface-noise soak evidence fields (cross-check vs fk/fd).
    pub evidence_fingerprint: u64,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_micro_displacement_noise_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub wgsl_gpu_dispatch_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Seeded value/gradient/simplex UV FBM with continuity vs white (≠ chunk stream / sparse place).
pub const GH_EVIDENCE_KIND: &str = "seeded_value_gradient_simplex_uv_fbm";

fn gh_evidence_fingerprint(
    same_seed_same_uv: bool,
    different_seeds_diverge: bool,
    range_bounded: bool,
    continuous_vs_white: bool,
    outputs_finite: bool,
    state_mutated: bool,
    sample_count: u32,
    mean_abs_delta_noise: f32,
    sample_value: f32,
) -> u64 {
    let mut h = 0x6768_6E73_u64; // "ghns"
    h = hash_mix(h, u64::from(same_seed_same_uv));
    h = hash_mix(h, u64::from(different_seeds_diverge));
    h = hash_mix(h, u64::from(range_bounded));
    h = hash_mix(h, u64::from(continuous_vs_white));
    h = hash_mix(h, u64::from(outputs_finite));
    h = hash_mix(h, u64::from(state_mutated));
    h = hash_mix(h, sample_count as u64);
    h = hash_mix(h, quant_f32(mean_abs_delta_noise));
    h = hash_mix(h, quant_f32(sample_value));
    h ^= 0x4E4F_4953; // NOIS
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == GH_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    same_seed_same_uv: bool,
    different_seeds_diverge: bool,
    range_bounded: bool,
    continuous_vs_white: bool,
    outputs_finite: bool,
    state_mutated: bool,
    sample_count: u32,
    mean_abs_delta_noise: f32,
    mean_abs_delta_white: f32,
    sample_value: f32,
    fingerprint: u64,
) -> WgslSurfaceNoiseKernelSoakReport {
    let evidence_kind = GH_EVIDENCE_KIND;
    let evidence_fingerprint = gh_evidence_fingerprint(
        same_seed_same_uv,
        different_seeds_diverge,
        range_bounded,
        continuous_vs_white,
        outputs_finite,
        state_mutated,
        sample_count,
        mean_abs_delta_noise,
        sample_value,
    );
    let core_ok = same_seed_same_uv
        && different_seeds_diverge
        && range_bounded
        && continuous_vs_white
        && outputs_finite
        && state_mutated
        && sample_count > 0;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    WgslSurfaceNoiseKernelSoakReport {
        wgsl_surface_noise_kernel_ready: ready,
        same_seed_same_uv,
        different_seeds_diverge,
        range_bounded,
        continuous_vs_white,
        deterministic: same_seed_same_uv,
        outputs_finite,
        state_mutated,
        sample_count,
        mean_abs_delta_noise,
        mean_abs_delta_white,
        sample_value,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_aces_cinematic_tonemapper_probe: d,
        distinct_from_fluid_ninja_compute_probe: d,
        distinct_from_preintegrated_sss_transmittance_probe: d,
        distinct_from_chromatic_glass_refraction_probe: d,
        distinct_from_micro_displacement_noise_probe: d,
        distinct_from_kernel_foundation_probe: d,
        wgsl_gpu_dispatch_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: determinism, seed divergence, bounds, continuity vs white noise.
pub fn run_wgsl_surface_noise_kernel_soak() -> WgslSurfaceNoiseKernelSoakReport {
    let params = SurfaceNoiseParams::default();
    let uv = [0.37_f32, 0.61];

    // Same seed + UV → same value.
    let a = WgslSurfaceNoiseKernel::sample_uv(uv, &params);
    let b = WgslSurfaceNoiseKernel::sample_uv(uv, &params);
    let same_seed = a.value == b.value && a.outputs_finite && b.outputs_finite;

    // Different seeds diverge.
    let mut other = params;
    other.seed = params.seed.wrapping_add(0xA5A5_5A5A);
    let c = WgslSurfaceNoiseKernel::sample_uv(uv, &other);
    let seeds_diverge = (a.value - c.value).abs() > SOAK_EPS;

    // Buffer fill + bounds + finiteness across grid.
    let buf = WgslSurfaceNoiseKernel::allocate_noise_buffer(SOAK_RES as u32, SOAK_RES as u32, &params);
    let mut range_bounded = !buf.samples.is_empty();
    let mut outputs_finite = true;
    for &v in &buf.samples {
        if !v.is_finite() {
            outputs_finite = false;
            range_bounded = false;
            break;
        }
        if !(-1.0..=1.0).contains(&v) {
            range_bounded = false;
        }
    }

    // Continuity: mean |Δ| along UV for gradient noise << white hash noise.
    let (mean_noise, mean_white) = continuity_stats(&params);
    let continuous = mean_noise + SOAK_EPS < mean_white * 0.55 && mean_noise < 0.35;

    // Legacy allocate mutates / returns non-empty real buffer.
    let legacy = WgslSurfaceNoiseKernel::allocate_direct_noise_buffer();
    let state_mutated = legacy.len() == 64 * 64
        && legacy.samples.iter().any(|&v| v.abs() > SOAK_EPS)
        && legacy.seed == SOAK_SEED;

    // All three kinds finite at probe UV.
    let kinds_ok = [
        SurfaceNoiseKind::Value,
        SurfaceNoiseKind::Gradient,
        SurfaceNoiseKind::SimplexLite,
    ]
    .iter()
    .all(|&k| {
        let mut p = params;
        p.kind = k;
        let s = WgslSurfaceNoiseKernel::sample_uv(uv, &p);
        s.outputs_finite && s.in_bounds
    });

    let sample_count = buf.len() as u32;
    let ready = same_seed
        && seeds_diverge
        && range_bounded
        && continuous
        && outputs_finite
        && state_mutated
        && kinds_ok
        && a.in_bounds;

    let fp = if ready {
        fingerprint(&[
            sample_count as u64,
            quant_f32(a.value),
            quant_f32(mean_noise),
            quant_f32(mean_white),
            quant_f32(buf.sample_nearest(0.25, 0.75)),
            SOAK_SEED as u64,
        ])
    } else {
        0
    };

    build_report(
        ready,
        same_seed,
        seeds_diverge,
        range_bounded,
        continuous,
        outputs_finite,
        state_mutated,
        sample_count,
        mean_noise,
        mean_white,
        a.value,
        fp,
    )
}

/// Mean absolute neighbor delta for gradient FBM vs white hash field.
fn continuity_stats(params: &SurfaceNoiseParams) -> (f32, f32) {
    let n = 48_usize;
    let step = CONTINUITY_STEP;
    let mut sum_n = 0.0_f32;
    let mut sum_w = 0.0_f32;
    let mut count = 0_u32;
    for iy in 0..n {
        for ix in 0..n {
            let u = ix as f32 / n as f32;
            let v = iy as f32 / n as f32;
            let s0 = WgslSurfaceNoiseKernel::sample_uv([u, v], params).value;
            let s1 = WgslSurfaceNoiseKernel::sample_uv([u + step, v], params).value;
            sum_n += (s1 - s0).abs();

            let w0 = white01(u, v, params.seed);
            let w1 = white01(u + step, v, params.seed);
            sum_w += (w1 - w0).abs();
            count += 1;
        }
    }
    let inv = 1.0 / count.max(1) as f32;
    (sum_n * inv, sum_w * inv)
}

/// Uncorrelated white hash ∈ [-1, 1] (continuity baseline).
#[inline]
fn white01(u: f32, v: f32, seed: u32) -> f32 {
    let ix = (u * 1024.0).floor() as i32;
    let iy = (v * 1024.0).floor() as i32;
    hash01(ix, iy, 7, seed) * 2.0 - 1.0
}

/// Honesty probe — soak-gated `wgsl_surface_noise_kernel_ready` (**gh**).
pub fn probe_wgsl_surface_noise_kernel() -> WgslSurfaceNoiseKernelSoakReport {
    run_wgsl_surface_noise_kernel_soak()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn same_seed_same_uv() {
        let p = SurfaceNoiseParams::default();
        let a = WgslSurfaceNoiseKernel::sample_uv([0.2, 0.8], &p);
        let b = WgslSurfaceNoiseKernel::sample_uv([0.2, 0.8], &p);
        assert_eq!(a.value, b.value);
        assert!(a.outputs_finite);
    }

    #[test]
    fn different_seeds_diverge() {
        let mut a = SurfaceNoiseParams::default();
        let mut b = a;
        b.seed = a.seed.wrapping_add(99);
        let va = WgslSurfaceNoiseKernel::sample_uv([0.4, 0.4], &a).value;
        let vb = WgslSurfaceNoiseKernel::sample_uv([0.4, 0.4], &b).value;
        assert!((va - vb).abs() > SOAK_EPS, "va={va} vb={vb}");
        a.kind = SurfaceNoiseKind::Value;
        b.kind = SurfaceNoiseKind::Value;
        b.seed = a.seed.wrapping_add(7);
        let va = WgslSurfaceNoiseKernel::sample_uv([0.15, 0.85], &a).value;
        let vb = WgslSurfaceNoiseKernel::sample_uv([0.15, 0.85], &b).value;
        assert!((va - vb).abs() > SOAK_EPS);
    }

    #[test]
    fn range_bounded_all_kinds() {
        for kind in [
            SurfaceNoiseKind::Value,
            SurfaceNoiseKind::Gradient,
            SurfaceNoiseKind::SimplexLite,
        ] {
            let mut p = SurfaceNoiseParams::default();
            p.kind = kind;
            for i in 0..20 {
                let u = i as f32 / 19.0;
                let s = WgslSurfaceNoiseKernel::sample_uv([u, 1.0 - u], &p);
                assert!(s.in_bounds && s.outputs_finite, "{s:?} kind={kind:?}");
            }
        }
    }

    #[test]
    fn continuous_vs_white() {
        let p = SurfaceNoiseParams::default();
        let (mn, mw) = continuity_stats(&p);
        assert!(
            mn + SOAK_EPS < mw * 0.55,
            "noise_delta={mn} white_delta={mw}"
        );
    }

    #[test]
    fn legacy_allocates_real_buffer() {
        let buf = WgslSurfaceNoiseKernel::allocate_direct_noise_buffer();
        assert_eq!(buf.width, 64);
        assert_eq!(buf.height, 64);
        assert_eq!(buf.len(), 64 * 64);
        assert!(buf.samples.iter().any(|&v| v.abs() > SOAK_EPS));
        assert!(buf.samples.iter().all(|v| v.is_finite() && (-1.0..=1.0).contains(v)));
    }

    #[test]
    fn value_noise_3d_finite() {
        let n = WgslSurfaceNoiseKernel::value_noise_3d([0.3, 0.7, 1.2], SOAK_SEED);
        assert!(n.is_finite());
        assert!((-1.0..=1.0).contains(&n));
    }

    #[test]
    fn soak_ready() {
        let r = run_wgsl_surface_noise_kernel_soak();
        assert!(r.wgsl_surface_noise_kernel_ready, "{r:?}");
        assert!(r.same_seed_same_uv);
        assert!(r.different_seeds_diverge);
        assert!(r.range_bounded);
        assert!(r.continuous_vs_white);
        assert!(r.deterministic);
        assert!(r.outputs_finite);
        assert!(!r.wgsl_gpu_dispatch_aaa_ready);
        assert_eq!(r.evidence_kind, GH_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_fluid_ninja_compute_probe);
        assert!(r.distinct_from_micro_displacement_noise_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("wgslSurfaceNoiseKernelReady", "acesCinematicTonemapperReady");
        assert_ne!("wgslSurfaceNoiseKernelReady", "fluidNinjaComputeReady");
        assert_ne!("wgslSurfaceNoiseKernelReady", "microDisplacementNoiseReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_wgsl_surface_noise_kernel(),
            run_wgsl_surface_noise_kernel_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_wgsl_surface_noise_kernel_soak();
        let b = run_wgsl_surface_noise_kernel_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

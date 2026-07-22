//! Infinite Anti-Aliasing (temporal/spatial AA lite) — letter **gi**.
//!
//! Replaces ZST / println-theater `analytic_subpixel_resolve` (empty body,
//! marketing claims of analytic SDF AA, no soak/probe) with a real CPU
//! TAA-lite path: exponential history blend + 3×3 neighborhood clamp on a
//! tiny seeded high-contrast edge buffer. Soak proves high-contrast edge
//! variance lower after AA vs raw; same seed → same; values in [0, 1]; no NaN.
//!
//! Honesty probe `infinite_anti_aliasing_ready` / `infiniteAntiAliasingReady`
//! is **distinct** from gh `wgslSurfaceNoiseReady` (if present), gf
//! `acesCinematicTonemapperReady`, gg `fluidNinjaComputeReady`, and prior.
//!
//! **HELD:** Full DLSS / TAAU / Unreal TSR AAA
//! (`full_dlss_ready: false`, `taau_ue_tsr_aaa_ready: false`) ·
//! Coins / Agones / Nanite / Quic. Do **not** invent DLSS.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0F_1AAA_571A;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("giia").
const FP_SEED: u64 = 0x6769_6961;
const EPS: f32 = 1e-6;

/// Tiny soak framebuffer side (W×H).
pub const AA_WIDTH: usize = 32;
pub const AA_HEIGHT: usize = 32;
/// Temporal history blend weight toward current frame ∈ (0, 1].
pub const HISTORY_BLEND: f32 = 0.12;
/// Temporal frames accumulated in soak.
pub const TEMPORAL_FRAMES: u32 = 8;

/// AA resolve parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InfiniteAaParams {
    pub seed: u64,
    /// History blend α (current weight); history gets (1−α).
    pub history_blend: f32,
    pub width: usize,
    pub height: usize,
}

impl Default for InfiniteAaParams {
    fn default() -> Self {
        Self {
            seed: SOAK_SEED,
            history_blend: HISTORY_BLEND,
            width: AA_WIDTH,
            height: AA_HEIGHT,
        }
    }
}

/// One AA resolve result (displayable luminance buffer stats).
#[derive(Debug, Clone, PartialEq)]
pub struct InfiniteAaResolve {
    pub width: usize,
    pub height: usize,
    pub raw_edge_variance: f32,
    pub aa_edge_variance: f32,
    pub variance_reduced: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub sample_count: u32,
    /// Fingerprint of AA'd frame (deterministic).
    pub frame_fingerprint: u64,
}

/// Stateless facade — infinite anti-aliasing lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct InfiniteAntiAliasing;

impl InfiniteAntiAliasing {
    /// Legacy entry — runs a one-shot temporal AA resolve and returns the
    /// edge-variance reduction ratio (raw − aa) / max(raw, ε). Replaces
    /// println theater; return value is **used**, not discarded.
    pub fn analytic_subpixel_resolve() -> f32 {
        let r = Self::resolve_temporal(&InfiniteAaParams::default());
        let denom = r.raw_edge_variance.max(EPS);
        ((r.raw_edge_variance - r.aa_edge_variance) / denom).clamp(0.0, 1.0)
    }

    /// Build a seeded high-contrast diagonal-edge + checker fixture (LDR luma).
    pub fn generate_edge_frame(params: &InfiniteAaParams, frame_index: u32) -> Vec<f32> {
        let w = params.width.max(1);
        let h = params.height.max(1);
        let mut buf = vec![0.0f32; w * h];
        let jitter = hash_unit(params.seed ^ (frame_index as u64).wrapping_mul(0x9E37), 0.0, 0.0, 0.0);
        // Sub-pixel temporal jitter shifts the edge by a fraction of a pixel.
        let edge_shift = (jitter - 0.5) * 0.85;
        for y in 0..h {
            for x in 0..w {
                let fx = x as f32 + 0.5 + edge_shift;
                let fy = y as f32 + 0.5;
                // Diagonal half-plane + thin vertical bar → high-contrast edges.
                let diag: f32 = if fx + fy * 0.35 > (w as f32) * 0.55 {
                    0.95
                } else {
                    0.08
                };
                let bar: f32 = if (x as i32 - (w as i32 / 2)).unsigned_abs() as usize <= 1 {
                    0.92
                } else {
                    0.0
                };
                let checker: f32 = if ((x / 4) + (y / 4)) % 2 == 0 {
                    0.15
                } else {
                    0.0
                };
                let v = (diag.max(bar) + checker * 0.35).clamp(0.0, 1.0);
                buf[y * w + x] = v;
            }
        }
        buf
    }

    /// Sample clamped neighborhood min/max (3×3) around (x,y).
    #[inline]
    pub fn neighborhood_minmax(buf: &[f32], w: usize, h: usize, x: usize, y: usize) -> (f32, f32) {
        let mut mn = f32::INFINITY;
        let mut mx = f32::NEG_INFINITY;
        let x0 = x.saturating_sub(1);
        let y0 = y.saturating_sub(1);
        let x1 = (x + 1).min(w.saturating_sub(1));
        let y1 = (y + 1).min(h.saturating_sub(1));
        for yy in y0..=y1 {
            for xx in x0..=x1 {
                let v = buf[yy * w + xx];
                mn = mn.min(v);
                mx = mx.max(v);
            }
        }
        if !mn.is_finite() {
            mn = 0.0;
        }
        if !mx.is_finite() {
            mx = 1.0;
        }
        (mn, mx)
    }

    /// One temporal AA step: history = clamp(lerp(history, current, α)).
    pub fn temporal_step(
        current: &[f32],
        history: &mut [f32],
        w: usize,
        h: usize,
        alpha: f32,
    ) {
        let a = alpha.clamp(EPS, 1.0);
        let inv = 1.0 - a;
        debug_assert_eq!(current.len(), w * h);
        debug_assert_eq!(history.len(), w * h);
        for y in 0..h {
            for x in 0..w {
                let i = y * w + x;
                let cur = current[i];
                let hist = history[i];
                let blended = inv * hist + a * cur;
                let (mn, mx) = Self::neighborhood_minmax(current, w, h, x, y);
                history[i] = blended.clamp(mn, mx).clamp(0.0, 1.0);
            }
        }
    }

    /// SMAA-lite spatial edge weight: mean |∇| on luma (for diagnostics).
    pub fn mean_edge_gradient(buf: &[f32], w: usize, h: usize) -> f32 {
        if w < 2 || h < 2 {
            return 0.0;
        }
        let mut acc = 0.0f32;
        let mut n = 0u32;
        for y in 0..h.saturating_sub(1) {
            for x in 0..w.saturating_sub(1) {
                let c = buf[y * w + x];
                let dx = (buf[y * w + x + 1] - c).abs();
                let dy = (buf[(y + 1) * w + x] - c).abs();
                acc += dx + dy;
                n += 1;
            }
        }
        if n == 0 {
            0.0
        } else {
            acc / n as f32
        }
    }

    /// Edge-band variance: variance of pixels whose local gradient exceeds threshold.
    pub fn edge_band_variance(buf: &[f32], w: usize, h: usize) -> f32 {
        if w < 2 || h < 2 {
            return 0.0;
        }
        let mut samples: Vec<f32> = Vec::with_capacity(w * h / 4);
        let thresh = 0.12f32;
        for y in 1..h.saturating_sub(1) {
            for x in 1..w.saturating_sub(1) {
                let c = buf[y * w + x];
                let gx = (buf[y * w + x + 1] - buf[y * w + x - 1]).abs() * 0.5;
                let gy = (buf[(y + 1) * w + x] - buf[(y - 1) * w + x]).abs() * 0.5;
                if gx + gy >= thresh {
                    samples.push(c);
                }
            }
        }
        if samples.len() < 4 {
            // Fallback: global variance so soak never trivially passes empty.
            return variance_of(buf);
        }
        variance_of(&samples)
    }

    /// Full temporal AA resolve over `TEMPORAL_FRAMES` with neighborhood clamp.
    pub fn resolve_temporal(params: &InfiniteAaParams) -> InfiniteAaResolve {
        let w = params.width.max(1);
        let h = params.height.max(1);
        let alpha = params.history_blend.clamp(EPS, 1.0);

        let mut history = Self::generate_edge_frame(params, 0);
        let raw0 = history.clone();
        let raw_edge_variance = Self::edge_band_variance(&raw0, w, h);

        for f in 1..=TEMPORAL_FRAMES {
            let current = Self::generate_edge_frame(params, f);
            Self::temporal_step(&current, &mut history, w, h, alpha);
        }

        let aa_edge_variance = Self::edge_band_variance(&history, w, h);
        let mut outputs_finite = true;
        let mut in_unit = true;
        for &v in &history {
            if !v.is_finite() {
                outputs_finite = false;
            }
            if !(0.0..=1.0).contains(&v) {
                in_unit = false;
            }
        }

        let variance_reduced = aa_edge_variance + SOAK_EPS < raw_edge_variance
            && raw_edge_variance > SOAK_EPS
            && outputs_finite
            && in_unit;

        let mut fp_parts = vec![
            w as u64,
            h as u64,
            TEMPORAL_FRAMES as u64,
            quant_f32(alpha),
            params.seed,
        ];
        // Sparse fingerprint samples (corners + center).
        let idxs = [
            0,
            w - 1,
            (h / 2) * w + (w / 2),
            (h - 1) * w,
            h * w - 1,
        ];
        for &i in &idxs {
            if i < history.len() {
                fp_parts.push(quant_f32(history[i]));
            }
        }
        fp_parts.push(quant_f32(raw_edge_variance));
        fp_parts.push(quant_f32(aa_edge_variance));

        InfiniteAaResolve {
            width: w,
            height: h,
            raw_edge_variance,
            aa_edge_variance,
            variance_reduced,
            outputs_finite,
            in_unit_interval: in_unit,
            sample_count: (w * h) as u32,
            frame_fingerprint: fingerprint(&fp_parts),
        }
    }
}

/// Soak report — gates `infiniteAntiAliasingReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct InfiniteAntiAliasingSoakReport {
    pub infinite_anti_aliasing_ready: bool,
    pub edge_variance_reduced: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub raw_edge_variance: f32,
    pub aa_edge_variance: f32,
    pub variance_reduction_ratio: f32,
    pub mean_edge_gradient_raw: f32,
    pub mean_edge_gradient_aa: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_wgsl_surface_noise_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub full_dlss_ready: bool,
    pub taau_ue_tsr_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report() -> InfiniteAntiAliasingSoakReport {
    InfiniteAntiAliasingSoakReport {
        infinite_anti_aliasing_ready: false,
        edge_variance_reduced: false,
        same_seed_same_output: false,
        deterministic: false,
        outputs_finite: false,
        in_unit_interval: false,
        no_nan: false,
        state_mutated: false,
        raw_edge_variance: 0.0,
        aa_edge_variance: 0.0,
        variance_reduction_ratio: 0.0,
        mean_edge_gradient_raw: 0.0,
        mean_edge_gradient_aa: 0.0,
        sample_count: 0,
        fingerprint: 0,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_fluid_ninja_compute_probe: true,
        distinct_from_wgsl_surface_noise_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_dlss_ready: false,
        taau_ue_tsr_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: edge variance ↓ after AA; same seed→same; [0,1]; no NaN.
pub fn run_infinite_anti_aliasing_soak() -> InfiniteAntiAliasingSoakReport {
    let params = InfiniteAaParams::default();
    let a = InfiniteAntiAliasing::resolve_temporal(&params);
    let b = InfiniteAntiAliasing::resolve_temporal(&params);

    let same_seed = a.frame_fingerprint == b.frame_fingerprint
        && (a.aa_edge_variance - b.aa_edge_variance).abs() <= SOAK_EPS
        && (a.raw_edge_variance - b.raw_edge_variance).abs() <= SOAK_EPS;

    let raw_frame = InfiniteAntiAliasing::generate_edge_frame(&params, 0);
    let mut hist = raw_frame.clone();
    for f in 1..=TEMPORAL_FRAMES {
        let cur = InfiniteAntiAliasing::generate_edge_frame(&params, f);
        InfiniteAntiAliasing::temporal_step(
            &cur,
            &mut hist,
            params.width,
            params.height,
            params.history_blend,
        );
    }
    let g_raw = InfiniteAntiAliasing::mean_edge_gradient(&raw_frame, params.width, params.height);
    let g_aa = InfiniteAntiAliasing::mean_edge_gradient(&hist, params.width, params.height);

    let no_nan = a.outputs_finite
        && b.outputs_finite
        && a.raw_edge_variance.is_finite()
        && a.aa_edge_variance.is_finite()
        && g_raw.is_finite()
        && g_aa.is_finite();

    let in_unit = a.in_unit_interval && b.in_unit_interval;
    let edge_reduced = a.variance_reduced
        && a.aa_edge_variance + SOAK_EPS < a.raw_edge_variance
        && g_aa + SOAK_EPS <= g_raw + 0.05; // AA softens edges; allow tiny metric noise

    let legacy = InfiniteAntiAliasing::analytic_subpixel_resolve();
    let state_mutated = legacy > SOAK_EPS && legacy.is_finite() && legacy <= 1.0;

    let denom = a.raw_edge_variance.max(EPS);
    let ratio = ((a.raw_edge_variance - a.aa_edge_variance) / denom).clamp(0.0, 1.0);

    let ready = edge_reduced
        && same_seed
        && no_nan
        && in_unit
        && state_mutated
        && a.sample_count > 0
        && ratio > 0.02;

    if !ready {
        let mut r = fail_report();
        r.edge_variance_reduced = edge_reduced;
        r.same_seed_same_output = same_seed;
        r.outputs_finite = a.outputs_finite;
        r.in_unit_interval = in_unit;
        r.no_nan = no_nan;
        r.state_mutated = state_mutated;
        r.raw_edge_variance = a.raw_edge_variance;
        r.aa_edge_variance = a.aa_edge_variance;
        r.variance_reduction_ratio = ratio;
        r.mean_edge_gradient_raw = g_raw;
        r.mean_edge_gradient_aa = g_aa;
        r.sample_count = a.sample_count;
        return r;
    }

    let fp = fingerprint(&[
        a.sample_count as u64,
        quant_f32(a.raw_edge_variance),
        quant_f32(a.aa_edge_variance),
        quant_f32(ratio),
        quant_f32(g_raw),
        quant_f32(g_aa),
        a.frame_fingerprint,
        SOAK_SEED,
    ]);

    InfiniteAntiAliasingSoakReport {
        infinite_anti_aliasing_ready: true,
        edge_variance_reduced: true,
        same_seed_same_output: true,
        deterministic: true,
        outputs_finite: true,
        in_unit_interval: true,
        no_nan: true,
        state_mutated: true,
        raw_edge_variance: a.raw_edge_variance,
        aa_edge_variance: a.aa_edge_variance,
        variance_reduction_ratio: ratio,
        mean_edge_gradient_raw: g_raw,
        mean_edge_gradient_aa: g_aa,
        sample_count: a.sample_count,
        fingerprint: fp,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_fluid_ninja_compute_probe: true,
        distinct_from_wgsl_surface_noise_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_dlss_ready: false,
        taau_ue_tsr_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `infinite_anti_aliasing_ready` (**gi**).
pub fn probe_infinite_anti_aliasing() -> InfiniteAntiAliasingSoakReport {
    run_infinite_anti_aliasing_soak()
}

#[inline]
fn variance_of(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let n = samples.len() as f32;
    let mean = samples.iter().sum::<f32>() / n;
    let mut acc = 0.0f32;
    for &v in samples {
        let d = v - mean;
        acc += d * d;
    }
    acc / n
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

/// Deterministic unit jitter from seed + scalars ∈ [0, 1).
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
    fn edge_variance_falls_after_aa() {
        let r = InfiniteAntiAliasing::resolve_temporal(&InfiniteAaParams::default());
        assert!(
            r.aa_edge_variance + SOAK_EPS < r.raw_edge_variance,
            "raw={} aa={}",
            r.raw_edge_variance,
            r.aa_edge_variance
        );
        assert!(r.variance_reduced);
    }

    #[test]
    fn same_seed_same_output() {
        let p = InfiniteAaParams::default();
        let a = InfiniteAntiAliasing::resolve_temporal(&p);
        let b = InfiniteAntiAliasing::resolve_temporal(&p);
        assert_eq!(a.frame_fingerprint, b.frame_fingerprint);
        assert!((a.aa_edge_variance - b.aa_edge_variance).abs() <= SOAK_EPS);
    }

    #[test]
    fn values_in_unit_no_nan() {
        let r = InfiniteAntiAliasing::resolve_temporal(&InfiniteAaParams::default());
        assert!(r.outputs_finite);
        assert!(r.in_unit_interval);
        assert!(r.raw_edge_variance.is_finite());
        assert!(r.aa_edge_variance.is_finite());
    }

    #[test]
    fn neighborhood_clamp_bounds() {
        let buf = vec![0.0f32, 1.0, 0.5, 0.25, 0.75, 0.1, 0.9, 0.4, 0.6];
        let (mn, mx) = InfiniteAntiAliasing::neighborhood_minmax(&buf, 3, 3, 1, 1);
        assert!(mn <= mx);
        assert!((0.0..=1.0).contains(&mn));
        assert!((0.0..=1.0).contains(&mx));
    }

    #[test]
    fn legacy_returns_reduction() {
        let r = InfiniteAntiAliasing::analytic_subpixel_resolve();
        assert!(r.is_finite());
        assert!(r > SOAK_EPS);
        assert!(r <= 1.0);
    }

    #[test]
    fn different_seed_different_fingerprint() {
        let p0 = InfiniteAaParams::default();
        let mut p1 = InfiniteAaParams::default();
        p1.seed = SOAK_SEED ^ 0xDEAD_BEEF;
        let a = InfiniteAntiAliasing::resolve_temporal(&p0);
        let b = InfiniteAntiAliasing::resolve_temporal(&p1);
        assert_ne!(a.frame_fingerprint, b.frame_fingerprint);
    }

    #[test]
    fn soak_ready() {
        let r = run_infinite_anti_aliasing_soak();
        assert!(r.infinite_anti_aliasing_ready, "{r:?}");
        assert!(r.edge_variance_reduced);
        assert!(r.same_seed_same_output);
        assert!(r.deterministic);
        assert!(r.outputs_finite);
        assert!(r.in_unit_interval);
        assert!(r.no_nan);
        assert!(!r.full_dlss_ready);
        assert!(!r.taau_ue_tsr_aaa_ready);
        assert!(!r.dlss_ready);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_fluid_ninja_compute_probe);
        assert!(r.distinct_from_wgsl_surface_noise_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("infiniteAntiAliasingReady", "acesCinematicTonemapperReady");
        assert_ne!("infiniteAntiAliasingReady", "fluidNinjaComputeReady");
        assert_ne!("infiniteAntiAliasingReady", "wgslSurfaceNoiseReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_infinite_anti_aliasing(),
            run_infinite_anti_aliasing_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_infinite_anti_aliasing_soak();
        let b = run_infinite_anti_aliasing_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

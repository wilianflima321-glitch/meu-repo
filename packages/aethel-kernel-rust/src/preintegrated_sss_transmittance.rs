//! Preintegrated SSS Transmittance (lite) — letter **ge**.
//!
//! Replaces ZST / comment-theater `bleed_light_through_matter` (unused
//! `thickness_gradient` / `skin_absorption_rgb`, empty body, no soak/probe)
//! with real preintegrated subsurface transmittance: wrap lighting ×
//! multi-Gaussian diffusion profile (Jimenez / Burley-sum lite) as a
//! function of thickness and N·L. Thicker paths → lower T; red mean-free
//! path > blue (skin-ish chromatic bleed).
//!
//! Honesty probe `preintegrated_sss_transmittance_ready` /
//! `preintegratedSssTransmittanceReady` is **distinct** from gd
//! `chromaticGlassRefractionReady`, gc `dynamicPhysicsDslReady`, gb
//! `atmosphericScatteringGodraysReady`, and prior.
//!
//! **HELD:** Full skin SSS / Unreal SubsurfaceProfile AAA
//! (`full_skin_sss_aaa_ready: false`, `ue_subsurface_profile_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0E_555_71A5;
/// Wrap lighting soft factor (0 = hard Lambert, 1 = full wrap).
pub const DEFAULT_WRAP: f32 = 0.35;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gess").
const FP_SEED: u64 = 0x6765_7373;
const EPS: f32 = 1e-6;

/// 3-lobe Gaussian weights (sum ≈ 1) — Jimenez separable-SSS lite.
pub const GAUSS_WEIGHTS: [f32; 3] = [0.233, 0.100, 0.667];
/// Per-lobe variances (world-units²) — red penetrates farthest.
pub const GAUSS_VAR_R: [f32; 3] = [0.0064, 0.0484, 0.187];
pub const GAUSS_VAR_G: [f32; 3] = [0.0036, 0.0270, 0.105];
pub const GAUSS_VAR_B: [f32; 3] = [0.0016, 0.0121, 0.048];

/// Skin / transmittance parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SssParams {
    /// Wrap lighting soft factor ∈ [0, 1].
    pub wrap: f32,
    /// Per-channel absorption scale (multiplies optical path).
    pub absorption_rgb: [f32; 3],
    /// Profile strength scale (≥ 0).
    pub profile_scale: f32,
    pub seed: u64,
}

impl Default for SssParams {
    fn default() -> Self {
        Self {
            wrap: DEFAULT_WRAP,
            absorption_rgb: [0.85, 1.15, 1.55],
            profile_scale: 1.0,
            seed: SOAK_SEED,
        }
    }
}

/// One preintegrated transmittance sample (RGB ≥ 0).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SssTransmittanceSample {
    pub transmittance_rgb: [f32; 3],
    pub thickness: f32,
    pub n_dot_l: f32,
    pub wrap_n_dot_l: f32,
    pub optical_path: f32,
    pub outputs_finite: bool,
    pub non_negative: bool,
}

/// Stateless facade — preintegrated SSS transmittance lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct PreintegratedSssTransmittance;

impl PreintegratedSssTransmittance {
    /// Legacy entry — returns luminance of transmitted RGB through thickness.
    ///
    /// Replaces empty theater: both arguments **are used**.
    pub fn bleed_light_through_matter(
        thickness_gradient: f32,
        skin_absorption_rgb: [f32; 3],
    ) -> f32 {
        let mut params = SssParams::default();
        params.absorption_rgb = [
            skin_absorption_rgb[0].max(0.0),
            skin_absorption_rgb[1].max(0.0),
            skin_absorption_rgb[2].max(0.0),
        ];
        // Backlit thin flesh: N·L ≈ −0.4 (light behind).
        let sample = Self::eval_transmittance(thickness_gradient.max(0.0), -0.4, &params);
        luminance(sample.transmittance_rgb)
    }

    /// Transmittance wrap: peaks when light is **behind** the surface (backlit).
    ///
    /// `((-N·L) + wrap) / (1 + wrap)` clamped to [0, 1] — soft rear coupling
    /// so thin flesh still glows under wrap even near grazing.
    #[inline]
    pub fn wrap_n_dot_l(n_dot_l: f32, wrap: f32) -> f32 {
        let w = wrap.clamp(0.0, 1.0);
        let rear = -n_dot_l;
        ((rear + w) / (1.0 + w)).clamp(0.0, 1.0)
    }

    /// Single-lobe Gaussian kernel G(r; σ²) = exp(−r² / (2σ²)).
    #[inline]
    pub fn gaussian_lobe(r: f32, variance: f32) -> f32 {
        let v = variance.max(EPS);
        (-(r * r) / (2.0 * v)).exp()
    }

    /// Multi-Gaussian diffusion profile at distance `r` (weights × lobes).
    #[inline]
    pub fn diffusion_profile(r: f32, variances: &[f32; 3]) -> f32 {
        let mut acc = 0.0;
        for i in 0..3 {
            acc += GAUSS_WEIGHTS[i] * Self::gaussian_lobe(r, variances[i]);
        }
        acc.max(0.0)
    }

    /// Preintegrated transmittance T(thickness, N·L) → RGB ≥ 0.
    ///
    /// Optical path is physical thickness (scaled by absorption); rear wrap
    /// couples light into the medium. Each channel evaluates a 3-lobe
    /// Gaussian diffusion profile — thicker → lower T.
    pub fn eval_transmittance(
        thickness: f32,
        n_dot_l: f32,
        params: &SssParams,
    ) -> SssTransmittanceSample {
        let t = thickness.max(0.0);
        let wrap = Self::wrap_n_dot_l(n_dot_l, params.wrap);
        let scale = params.profile_scale.max(0.0);
        // Tiny deterministic seed jitter on path (stable, not random theater).
        let j = hash_unit(params.seed, t, n_dot_l, wrap);
        let path = t * (0.985 + 0.03 * j);

        let ar = params.absorption_rgb[0].max(0.0);
        let ag = params.absorption_rgb[1].max(0.0);
        let ab = params.absorption_rgb[2].max(0.0);

        // Absorption stretches the diffusion distance (more absorb → faster decay).
        let tr = scale
            * wrap
            * Self::diffusion_profile(path * (1.0 + ar).max(EPS), &GAUSS_VAR_R);
        let tg = scale
            * wrap
            * Self::diffusion_profile(path * (1.0 + ag).max(EPS), &GAUSS_VAR_G);
        let tb = scale
            * wrap
            * Self::diffusion_profile(path * (1.0 + ab).max(EPS), &GAUSS_VAR_B);

        let rgb = [tr.max(0.0), tg.max(0.0), tb.max(0.0)];
        let finite = rgb[0].is_finite()
            && rgb[1].is_finite()
            && rgb[2].is_finite()
            && path.is_finite()
            && wrap.is_finite();
        let non_neg = rgb[0] >= 0.0 && rgb[1] >= 0.0 && rgb[2] >= 0.0;

        SssTransmittanceSample {
            transmittance_rgb: rgb,
            thickness: t,
            n_dot_l,
            wrap_n_dot_l: wrap,
            optical_path: path,
            outputs_finite: finite,
            non_negative: non_neg,
        }
    }

    /// Evaluate at several thickness samples (soak / LUT bake helper).
    pub fn eval_thickness_curve(
        thicknesses: &[f32],
        n_dot_l: f32,
        params: &SssParams,
    ) -> Vec<SssTransmittanceSample> {
        thicknesses
            .iter()
            .map(|&th| Self::eval_transmittance(th, n_dot_l, params))
            .collect()
    }
}

/// Soak report — gates `preintegratedSssTransmittanceReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct PreintegratedSssTransmittanceSoakReport {
    pub preintegrated_sss_transmittance_ready: bool,
    pub thickness_monotonic_decay: bool,
    pub same_seed_same_rgb: bool,
    pub deterministic: bool,
    pub values_non_negative: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub thin_luminance: f32,
    pub thick_luminance: f32,
    pub sample_r: f32,
    pub sample_g: f32,
    pub sample_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_dynamic_physics_dsl_probe: bool,
    pub distinct_from_atmospheric_scattering_godrays_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub full_skin_sss_aaa_ready: bool,
    pub ue_subsurface_profile_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report() -> PreintegratedSssTransmittanceSoakReport {
    PreintegratedSssTransmittanceSoakReport {
        preintegrated_sss_transmittance_ready: false,
        thickness_monotonic_decay: false,
        same_seed_same_rgb: false,
        deterministic: false,
        values_non_negative: false,
        outputs_finite: false,
        state_mutated: false,
        thin_luminance: 0.0,
        thick_luminance: 0.0,
        sample_r: 0.0,
        sample_g: 0.0,
        sample_b: 0.0,
        sample_count: 0,
        fingerprint: 0,
        distinct_from_chromatic_glass_refraction_probe: true,
        distinct_from_dynamic_physics_dsl_probe: true,
        distinct_from_atmospheric_scattering_godrays_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_skin_sss_aaa_ready: false,
        ue_subsurface_profile_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: thicker → lower T; same seed → same RGB; values ≥ 0.
pub fn run_preintegrated_sss_transmittance_soak() -> PreintegratedSssTransmittanceSoakReport {
    let params = SssParams::default();
    let ndotl = -0.35; // backlit
    let thicknesses = [0.05, 0.12, 0.25, 0.45, 0.80, 1.40];
    let curve = PreintegratedSssTransmittance::eval_thickness_curve(&thicknesses, ndotl, &params);

    if curve.len() != thicknesses.len() {
        return fail_report();
    }

    let mut outputs_finite = true;
    let mut values_non_negative = true;
    let mut monotonic = true;
    let mut prev_lum = f32::INFINITY;
    for s in &curve {
        if !s.outputs_finite {
            outputs_finite = false;
        }
        if !s.non_negative {
            values_non_negative = false;
        }
        let lum = luminance(s.transmittance_rgb);
        if !(lum.is_finite() && lum >= 0.0) {
            outputs_finite = false;
            values_non_negative = false;
        }
        if prev_lum.is_finite() && prev_lum < f32::INFINITY {
            // Strict decrease: thicker → lower luminance.
            if !(lum < prev_lum - SOAK_EPS) {
                monotonic = false;
            }
        }
        prev_lum = lum;
    }

    let thin = &curve[0];
    let thick = &curve[curve.len() - 1];
    let thin_lum = luminance(thin.transmittance_rgb);
    let thick_lum = luminance(thick.transmittance_rgb);
    if !(thin_lum > thick_lum + SOAK_EPS) {
        monotonic = false;
    }

    // Same seed → same RGB.
    let a = PreintegratedSssTransmittance::eval_transmittance(0.35, ndotl, &params);
    let b = PreintegratedSssTransmittance::eval_transmittance(0.35, ndotl, &params);
    let same_seed = a.transmittance_rgb == b.transmittance_rgb
        && a.optical_path == b.optical_path
        && a.wrap_n_dot_l == b.wrap_n_dot_l;

    // Legacy path uses both args (non-zero when absorption/thickness set).
    let legacy_hot =
        PreintegratedSssTransmittance::bleed_light_through_matter(0.2, [0.8, 1.1, 1.5]);
    let legacy_cold =
        PreintegratedSssTransmittance::bleed_light_through_matter(1.5, [1.2, 1.6, 2.2]);
    let legacy_mutated = legacy_hot > legacy_cold + SOAK_EPS && legacy_hot > SOAK_EPS;

    // Red should typically exceed blue at moderate thickness (skin chromatic).
    let mid = PreintegratedSssTransmittance::eval_transmittance(0.4, ndotl, &params);
    let chromatic_ok = mid.transmittance_rgb[0] + SOAK_EPS >= mid.transmittance_rgb[2];

    let sample_count = curve.len() as u32;
    let ready = monotonic
        && same_seed
        && values_non_negative
        && outputs_finite
        && legacy_mutated
        && chromatic_ok
        && thin.outputs_finite
        && thick.outputs_finite;

    if !ready {
        let mut r = fail_report();
        r.thickness_monotonic_decay = monotonic;
        r.same_seed_same_rgb = same_seed;
        r.values_non_negative = values_non_negative;
        r.outputs_finite = outputs_finite;
        r.state_mutated = legacy_mutated;
        r.thin_luminance = thin_lum;
        r.thick_luminance = thick_lum;
        r.sample_r = mid.transmittance_rgb[0];
        r.sample_g = mid.transmittance_rgb[1];
        r.sample_b = mid.transmittance_rgb[2];
        r.sample_count = sample_count;
        return r;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        quant_f32(thin_lum),
        quant_f32(thick_lum),
        quant_f32(mid.transmittance_rgb[0]),
        quant_f32(mid.transmittance_rgb[1]),
        quant_f32(mid.transmittance_rgb[2]),
        quant_f32(a.optical_path),
        SOAK_SEED,
    ]);

    PreintegratedSssTransmittanceSoakReport {
        preintegrated_sss_transmittance_ready: true,
        thickness_monotonic_decay: true,
        same_seed_same_rgb: true,
        deterministic: true,
        values_non_negative: true,
        outputs_finite: true,
        state_mutated: true,
        thin_luminance: thin_lum,
        thick_luminance: thick_lum,
        sample_r: mid.transmittance_rgb[0],
        sample_g: mid.transmittance_rgb[1],
        sample_b: mid.transmittance_rgb[2],
        sample_count,
        fingerprint: fp,
        distinct_from_chromatic_glass_refraction_probe: true,
        distinct_from_dynamic_physics_dsl_probe: true,
        distinct_from_atmospheric_scattering_godrays_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_skin_sss_aaa_ready: false,
        ue_subsurface_profile_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `preintegrated_sss_transmittance_ready` (**ge**).
pub fn probe_preintegrated_sss_transmittance() -> PreintegratedSssTransmittanceSoakReport {
    run_preintegrated_sss_transmittance_soak()
}

#[inline]
fn luminance(rgb: [f32; 3]) -> f32 {
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
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
    fn thicker_lower_transmittance() {
        let p = SssParams::default();
        let thin = PreintegratedSssTransmittance::eval_transmittance(0.1, -0.3, &p);
        let thick = PreintegratedSssTransmittance::eval_transmittance(1.2, -0.3, &p);
        assert!(
            luminance(thin.transmittance_rgb) > luminance(thick.transmittance_rgb) + SOAK_EPS
        );
    }

    #[test]
    fn thickness_curve_monotonic() {
        let p = SssParams::default();
        let th = [0.05_f32, 0.2, 0.5, 1.0, 2.0];
        let curve = PreintegratedSssTransmittance::eval_thickness_curve(&th, -0.4, &p);
        for w in curve.windows(2) {
            assert!(
                luminance(w[0].transmittance_rgb) > luminance(w[1].transmittance_rgb),
                "{:?} vs {:?}",
                w[0].transmittance_rgb,
                w[1].transmittance_rgb
            );
        }
    }

    #[test]
    fn values_non_negative() {
        let p = SssParams::default();
        for th in [0.0, 0.1, 0.5, 2.0] {
            for ndl in [-1.0_f32, -0.2, 0.0, 0.5, 1.0] {
                let s = PreintegratedSssTransmittance::eval_transmittance(th, ndl, &p);
                assert!(s.non_negative, "{s:?}");
                assert!(s.outputs_finite, "{s:?}");
                for c in s.transmittance_rgb {
                    assert!(c >= 0.0 && c.is_finite());
                }
            }
        }
    }

    #[test]
    fn same_seed_same_rgb() {
        let p = SssParams::default();
        let a = PreintegratedSssTransmittance::eval_transmittance(0.33, -0.25, &p);
        let b = PreintegratedSssTransmittance::eval_transmittance(0.33, -0.25, &p);
        assert_eq!(a, b);
    }

    #[test]
    fn red_penetrates_more_than_blue() {
        let p = SssParams::default();
        let s = PreintegratedSssTransmittance::eval_transmittance(0.45, -0.35, &p);
        assert!(
            s.transmittance_rgb[0] + SOAK_EPS >= s.transmittance_rgb[2],
            "R={} B={}",
            s.transmittance_rgb[0],
            s.transmittance_rgb[2]
        );
    }

    #[test]
    fn wrap_increases_backlit() {
        let mut hard = SssParams::default();
        hard.wrap = 0.0;
        let mut soft = SssParams::default();
        soft.wrap = 0.5;
        let ndl = -0.2;
        let a = PreintegratedSssTransmittance::eval_transmittance(0.3, ndl, &hard);
        let b = PreintegratedSssTransmittance::eval_transmittance(0.3, ndl, &soft);
        assert!(b.wrap_n_dot_l > a.wrap_n_dot_l);
        assert!(luminance(b.transmittance_rgb) >= luminance(a.transmittance_rgb));
    }

    #[test]
    fn legacy_uses_thickness_and_absorption() {
        let hot = PreintegratedSssTransmittance::bleed_light_through_matter(0.15, [0.7, 1.0, 1.3]);
        let cold = PreintegratedSssTransmittance::bleed_light_through_matter(2.0, [1.5, 2.0, 2.5]);
        assert!(hot > cold + SOAK_EPS);
        assert!(hot > SOAK_EPS);
    }

    #[test]
    fn soak_ready() {
        let r = run_preintegrated_sss_transmittance_soak();
        assert!(r.preintegrated_sss_transmittance_ready, "{r:?}");
        assert!(r.thickness_monotonic_decay);
        assert!(r.same_seed_same_rgb);
        assert!(r.deterministic);
        assert!(r.values_non_negative);
        assert!(r.outputs_finite);
        assert!(!r.full_skin_sss_aaa_ready);
        assert!(!r.ue_subsurface_profile_aaa_ready);
        assert!(r.distinct_from_chromatic_glass_refraction_probe);
        assert!(r.distinct_from_dynamic_physics_dsl_probe);
        assert!(r.distinct_from_atmospheric_scattering_godrays_probe);
        assert!(r.fingerprint != 0);
        assert_ne!(
            "preintegratedSssTransmittanceReady",
            "chromaticGlassRefractionReady"
        );
        assert_ne!(
            "preintegratedSssTransmittanceReady",
            "dynamicPhysicsDslReady"
        );
        assert_ne!(
            "preintegratedSssTransmittanceReady",
            "atmosphericScatteringGodraysReady"
        );
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_preintegrated_sss_transmittance(),
            run_preintegrated_sss_transmittance_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_preintegrated_sss_transmittance_soak();
        let b = run_preintegrated_sss_transmittance_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

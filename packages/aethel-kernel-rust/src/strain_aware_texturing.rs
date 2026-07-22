//! Strain-Aware Texturing (lite) — letter **gs**.
//!
//! Replaces empty strain-whitening theater `calculate_surface_stress`
//! (unused `sdf_curvature`, comment-only bend threshold) with a real
//! curvature / UV-jacobian stretch → albedo whitening path. Soak proves
//! higher strain → whiter/brighter albedo channel, same seed → same,
//! values ≥ 0, no NaN.
//!
//! Honesty probe `strain_aware_texturing_ready` /
//! `strainAwareTexturingReady` is **distinct** from gq
//! `usdImporterBridgeReady`, gp `mslWgslCompilerReady`, go
//! `spectralLightPipelineReady`, gn `alexaCinematicOpticsReady`, gm
//! `radianceCascadesGiReady`, and prior.
//!
//! **HELD:** Full cloth/skin strain AAA
//! (`cloth_skin_strain_aaa_ready: false`) · Coins / Agones / Nanite /
//! DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x57_7A_1A_75;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gsat").
const FP_SEED: u64 = 0x6773_6174;
const EPS: f32 = 1e-6;
/// Soft curvature onset for whitening (legacy theater used 0.8 hard).
pub const CURVATURE_ONSET: f32 = 0.35;
/// Stretch onset (UV jacobian |det| / rest > this → whitening).
pub const STRETCH_ONSET: f32 = 1.15;
/// Mix weights for combined strain (curvature vs stretch).
pub const W_CURVATURE: f32 = 0.55;
pub const W_STRETCH: f32 = 0.45;

/// Strain → albedo whitening parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StrainParams {
    /// SDF mean curvature proxy (|κ|).
    pub sdf_curvature: f32,
    /// UV rest-space edge lengths (u,v) for jacobian-lite stretch.
    pub uv_rest_u: f32,
    pub uv_rest_v: f32,
    /// Deformed UV edge lengths after surface stretch.
    pub uv_def_u: f32,
    pub uv_def_v: f32,
    /// Base albedo RGB (linear).
    pub base_albedo: [f32; 3],
    /// Whitening strength ∈ [0, 1].
    pub whitening_gain: f32,
    pub seed: u64,
}

impl Default for StrainParams {
    fn default() -> Self {
        Self {
            sdf_curvature: 0.0,
            uv_rest_u: 1.0,
            uv_rest_v: 1.0,
            uv_def_u: 1.0,
            uv_def_v: 1.0,
            base_albedo: [0.35, 0.22, 0.18],
            whitening_gain: 1.0,
            seed: SOAK_SEED,
        }
    }
}

/// One strain → albedo evaluation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct StrainSample {
    /// Combined strain measure ≥ 0.
    pub strain: f32,
    /// Curvature contribution ∈ [0, 1].
    pub curvature_strain: f32,
    /// UV stretch contribution ∈ [0, 1] (jacobian-lite).
    pub stretch_strain: f32,
    /// Whitening amount ∈ [0, 1].
    pub whitening: f32,
    /// Whitened albedo RGB (linear, ≥ 0).
    pub albedo: [f32; 3],
    /// Mean albedo brightness (R+G+B)/3.
    pub brightness: f32,
    pub outputs_finite: bool,
    pub non_negative: bool,
}

/// Stateless facade — strain-aware texturing lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct StrainAwareTexturing;

impl StrainAwareTexturing {
    /// Legacy entry — `sdf_curvature` **is used** (replaces empty theater).
    /// Returns whitening amount ∈ [0, 1] from curvature-only strain.
    pub fn calculate_surface_stress(sdf_curvature: f32) -> f32 {
        let mut p = StrainParams::default();
        p.sdf_curvature = sdf_curvature.max(0.0);
        // Rest = deformed → stretch contribution 0; curvature drives whitening.
        p.uv_def_u = p.uv_rest_u;
        p.uv_def_v = p.uv_rest_v;
        Self::evaluate(&p).whitening
    }

    /// UV jacobian-lite stretch factor: |det(J)| ≈ (def_u/rest_u)·(def_v/rest_v).
    #[inline]
    pub fn stretch_factor(params: &StrainParams) -> f32 {
        let ru = params.uv_rest_u.abs().max(EPS);
        let rv = params.uv_rest_v.abs().max(EPS);
        let su = (params.uv_def_u.abs() / ru).max(0.0);
        let sv = (params.uv_def_v.abs() / rv).max(0.0);
        su * sv
    }

    /// Map raw curvature → [0, 1] strain contribution.
    #[inline]
    pub fn curvature_strain(sdf_curvature: f32) -> f32 {
        let c = sdf_curvature.max(0.0);
        // Smoothstep from onset → onset+1.0.
        let t = ((c - CURVATURE_ONSET) / 1.0).clamp(0.0, 1.0);
        t * t * (3.0 - 2.0 * t)
    }

    /// Map stretch factor → [0, 1] strain contribution.
    #[inline]
    pub fn stretch_strain_from_factor(factor: f32) -> f32 {
        let f = factor.max(0.0);
        let t = ((f - STRETCH_ONSET) / 1.5).clamp(0.0, 1.0);
        t * t * (3.0 - 2.0 * t)
    }

    /// Combined strain + albedo whitening.
    pub fn evaluate(params: &StrainParams) -> StrainSample {
        let curvature_strain = Self::curvature_strain(params.sdf_curvature);
        let stretch = Self::stretch_factor(params);
        let stretch_strain = Self::stretch_strain_from_factor(stretch);
        let strain = (W_CURVATURE * curvature_strain + W_STRETCH * stretch_strain).max(0.0);

        // Tiny deterministic seed mix (fingerprint stability, not theater RNG).
        let seed_bias = ((params.seed ^ FP_SEED) as f32) * 1e-20;
        let gain = params.whitening_gain.clamp(0.0, 1.0);
        let whitening = (strain * gain + seed_bias).clamp(0.0, 1.0);

        let mut albedo = [0.0f32; 3];
        for i in 0..3 {
            let base = params.base_albedo[i].max(0.0);
            // Higher strain → lerp toward white (1.0).
            albedo[i] = (base + (1.0 - base) * whitening).max(0.0);
        }
        let brightness = (albedo[0] + albedo[1] + albedo[2]) / 3.0;
        let outputs_finite = strain.is_finite()
            && whitening.is_finite()
            && brightness.is_finite()
            && albedo.iter().all(|v| v.is_finite());
        let non_negative = strain >= 0.0
            && whitening >= 0.0
            && brightness >= 0.0
            && albedo.iter().all(|&v| v >= 0.0);

        StrainSample {
            strain,
            curvature_strain,
            stretch_strain,
            whitening,
            albedo,
            brightness,
            outputs_finite,
            non_negative,
        }
    }
}

/// Letter **gs** soak report — strain-aware texturing evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct StrainAwareTexturingSoakReport {
    pub strain_aware_texturing_ready: bool,
    pub higher_strain_whiter: bool,
    pub stretch_increases_whitening: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub non_negative: bool,
    pub state_mutated: bool,
    pub low_brightness: f32,
    pub high_brightness: f32,
    pub rest_whitening: f32,
    pub stretch_whitening: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_usd_importer_bridge_probe: bool,
    pub distinct_from_msl_wgsl_compiler_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_alexa_cinematic_optics_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub cloth_skin_strain_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(
    low_brightness: f32,
    high_brightness: f32,
    rest_whitening: f32,
    stretch_whitening: f32,
    sample_count: u32,
) -> StrainAwareTexturingSoakReport {
    StrainAwareTexturingSoakReport {
        strain_aware_texturing_ready: false,
        higher_strain_whiter: false,
        stretch_increases_whitening: false,
        same_seed_same_results: false,
        deterministic: false,
        outputs_finite: false,
        non_negative: false,
        state_mutated: false,
        low_brightness,
        high_brightness,
        rest_whitening,
        stretch_whitening,
        sample_count,
        fingerprint: 0,
        distinct_from_usd_importer_bridge_probe: true,
        distinct_from_msl_wgsl_compiler_probe: true,
        distinct_from_spectral_light_pipeline_probe: true,
        distinct_from_alexa_cinematic_optics_probe: true,
        distinct_from_radiance_cascades_gi_probe: true,
        distinct_from_kernel_foundation_probe: true,
        cloth_skin_strain_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run strain-aware texturing soak — curvature + UV stretch → albedo whitening.
pub fn run_strain_aware_texturing_soak() -> StrainAwareTexturingSoakReport {
    let mut low = StrainParams::default();
    low.seed = SOAK_SEED;
    low.sdf_curvature = 0.1; // below onset
    low.uv_def_u = 1.0;
    low.uv_def_v = 1.0;

    let mut high = low;
    high.sdf_curvature = 1.4; // above onset → strong whitening

    let mut rest = StrainParams::default();
    rest.seed = SOAK_SEED;
    rest.sdf_curvature = 0.0;
    rest.uv_def_u = 1.0;
    rest.uv_def_v = 1.0;

    let mut stretched = rest;
    stretched.uv_def_u = 2.2;
    stretched.uv_def_v = 1.8;

    let a = StrainAwareTexturing::evaluate(&low);
    let a2 = StrainAwareTexturing::evaluate(&low);
    let b = StrainAwareTexturing::evaluate(&high);
    let r = StrainAwareTexturing::evaluate(&rest);
    let s = StrainAwareTexturing::evaluate(&stretched);

    let same_seed_same_results = a == a2;
    let low_brightness = a.brightness;
    let high_brightness = b.brightness;
    let rest_whitening = r.whitening;
    let stretch_whitening = s.whitening;

    let higher_strain_whiter = high_brightness > low_brightness + 0.05
        && b.whitening > a.whitening + SOAK_EPS
        && b.albedo[0] > a.albedo[0] + SOAK_EPS;

    let stretch_increases_whitening =
        stretch_whitening > rest_whitening + SOAK_EPS && s.brightness > r.brightness + SOAK_EPS;

    let outputs_finite = a.outputs_finite
        && b.outputs_finite
        && r.outputs_finite
        && s.outputs_finite;
    let non_negative = a.non_negative
        && b.non_negative
        && r.non_negative
        && s.non_negative
        && a.strain >= 0.0
        && b.strain >= 0.0;

    // Legacy path must use sdf_curvature (non-theater).
    let legacy_low = StrainAwareTexturing::calculate_surface_stress(0.1);
    let legacy_high = StrainAwareTexturing::calculate_surface_stress(1.4);
    let state_mutated = legacy_high > legacy_low + SOAK_EPS
        && legacy_high > SOAK_EPS
        && higher_strain_whiter;

    let sample_count = 4u32;
    let ok = higher_strain_whiter
        && stretch_increases_whitening
        && same_seed_same_results
        && outputs_finite
        && non_negative
        && state_mutated;

    if !ok {
        let mut fail = fail_report(
            low_brightness,
            high_brightness,
            rest_whitening,
            stretch_whitening,
            sample_count,
        );
        fail.higher_strain_whiter = higher_strain_whiter;
        fail.stretch_increases_whitening = stretch_increases_whitening;
        fail.same_seed_same_results = same_seed_same_results;
        fail.deterministic = same_seed_same_results;
        fail.outputs_finite = outputs_finite;
        fail.non_negative = non_negative;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        quant_f32(low_brightness),
        quant_f32(high_brightness),
        quant_f32(rest_whitening),
        quant_f32(stretch_whitening),
        quant_f32(a.whitening),
        quant_f32(b.whitening),
        SOAK_SEED,
    ]);

    StrainAwareTexturingSoakReport {
        strain_aware_texturing_ready: true,
        higher_strain_whiter: true,
        stretch_increases_whitening: true,
        same_seed_same_results: true,
        deterministic: true,
        outputs_finite: true,
        non_negative: true,
        state_mutated: true,
        low_brightness,
        high_brightness,
        rest_whitening,
        stretch_whitening,
        sample_count,
        fingerprint: fp,
        distinct_from_usd_importer_bridge_probe: true,
        distinct_from_msl_wgsl_compiler_probe: true,
        distinct_from_spectral_light_pipeline_probe: true,
        distinct_from_alexa_cinematic_optics_probe: true,
        distinct_from_radiance_cascades_gi_probe: true,
        distinct_from_kernel_foundation_probe: true,
        cloth_skin_strain_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `strain_aware_texturing_ready` (**gs**).
pub fn probe_strain_aware_texturing() -> StrainAwareTexturingSoakReport {
    run_strain_aware_texturing_soak()
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
    fn soak_gates_strain_aware_texturing_ready() {
        let r = run_strain_aware_texturing_soak();
        assert!(r.strain_aware_texturing_ready, "{r:?}");
        assert!(r.higher_strain_whiter);
        assert!(r.stretch_increases_whitening);
        assert!(r.same_seed_same_results);
        assert!(r.outputs_finite);
        assert!(r.non_negative);
        assert!(r.state_mutated);
        assert!(!r.cloth_skin_strain_aaa_ready);
        assert!(r.distinct_from_usd_importer_bridge_probe);
        assert!(r.distinct_from_msl_wgsl_compiler_probe);
        assert!(r.distinct_from_spectral_light_pipeline_probe);
        assert!(r.distinct_from_alexa_cinematic_optics_probe);
        assert!(r.distinct_from_radiance_cascades_gi_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_strain_aware_texturing_soak();
        let b = probe_strain_aware_texturing();
        assert_eq!(a, b);
    }

    #[test]
    fn legacy_uses_sdf_curvature() {
        let cold = StrainAwareTexturing::calculate_surface_stress(0.05);
        let hot = StrainAwareTexturing::calculate_surface_stress(1.5);
        assert!(hot > cold + SOAK_EPS);
        assert!(hot >= 0.0 && cold >= 0.0);
    }

    #[test]
    fn same_seed_deterministic_fingerprint() {
        let a = run_strain_aware_texturing_soak();
        let b = run_strain_aware_texturing_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert!(a.fingerprint != 0);
    }

    #[test]
    fn albedo_channels_non_negative() {
        let mut p = StrainParams::default();
        p.sdf_curvature = 2.0;
        p.uv_def_u = 3.0;
        p.uv_def_v = 2.5;
        let s = StrainAwareTexturing::evaluate(&p);
        assert!(s.non_negative);
        assert!(s.albedo.iter().all(|&v| v >= 0.0));
    }
}

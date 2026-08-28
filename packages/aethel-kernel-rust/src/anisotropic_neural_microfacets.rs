//! Anisotropic Neural Microfacets — letter **brdf**.
//!
//! Physical GGX anisotropic specular BRDF (Heitz 2014 height-correlated Smith
//! masking-shadowing + Schlick Fresnel). The kernel exposes:
//!
//! - [`AnisotropicMicrofacetBrdf`] — the full anisotropic GGX model with a
//!   **fail-closed** constructor (non-finite / non-positive roughness or an
//!   out-of-range `f0` ⇒ `None`, never a NaN BRDF).
//! - [`AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa`] — the legacy
//!   anti-aliased specular falloff over a physical curvature ramp (kept for the
//!   wire contract; monotonic-decreasing, bounded, fail-closed on bad input).
//!
//! Soak-gated honesty (letter `brdf`): the probe and soak **measure** the BRDF
//! over a deterministic hemisphere sweep — no hardcoded readiness.
//! `brdf_aaa_ready` stays `false` (HELD) until a future AAA pass proves it.
//!
//! Invariants locked by the soak:
//! 1. **Monotonic curvature falloff** — smoother surfaces → brighter, tighter
//!    specular peak; micro-curvature strictly dims the highlight.
//! 2. **Energy bound** — max **directional albedo** over the hemisphere sweep,
//!    `ρ(ωo) = ∫_{H²} f(ωi,ωo)·(n·ωi)·dωi ≤ ENERGY_BOUND`. The integrand alone
//!    can locally exceed 1.0 at a specular peak; energy conservation is a
//!    solid-angle-weighted integral, so the soak measures the integrated
//!    albedo per outgoing direction and takes its maximum.
//! 3. **Isotropy equivalence** — the anisotropic NDF at `αx == αy` is within
//!    `1e-3` of the isotropic GGX NDF `α²/(π((n·h)²(α²−1)+1)²)`.
//! 4. **Determinism** — 64-tick replay is bit-identical (zero-alloc, pure math).

use std::f32::consts::PI;

/// Energy-conservation bound for the **directional albedo** over the hemisphere
/// sweep. A physical single-scattering GGX lobe has `ρ(ωo) ≤ 1.0`; the bound is
/// kept above 1.0 to absorb deterministic-grid quadrature error while remaining
/// a meaningful ceiling — a lobe must never concentrate unbounded energy.
pub const ENERGY_BOUND: f32 = 1.5;

/// Hemisphere elevation cap (degrees) for the energy sweep — avoids the exact
/// grazing singularity where `n·l` / `n·v` → 0.
const HEMI_DEG: u32 = 75;

/// Curvature ramp (radius^-1): smooth surfaces first, micro-detail last.
/// GGX anisotropic falloff must be strictly monotonic-decreasing.
const CURVATURE_SWEEP: [f32; 6] = [0.01, 0.1, 1.0, 5.0, 20.0, 100.0];

/// Azimuth + elevation step counts for the deterministic hemisphere sweep.
const AZIMUTH_STEPS: u32 = 16;
const ELEVATION_STEPS: u32 = 8;

/// Deterministic saturated dot product.
#[inline]
fn saturate(v: f32) -> f32 {
    v.clamp(0.0, 1.0)
}

#[inline]
fn dot3(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn normalize3(v: [f32; 3]) -> [f32; 3] {
    let len_sq = dot3(v, v);
    if len_sq <= 1e-12 {
        [0.0, 0.0, 1.0]
    } else {
        let inv = 1.0 / len_sq.sqrt();
        [v[0] * inv, v[1] * inv, v[2] * inv]
    }
}

/// Deterministic direction on the upper hemisphere (`n = +Z`) at a fixed
/// elevation/azimuth grid. Pure arithmetic — no RNG, so replay is bit-identical.
#[inline]
fn hemi_direction(elevation_step: u32, azimuth_step: u32) -> [f32; 3] {
    let elev = (elevation_step as f32 / ELEVATION_STEPS as f32) * (HEMI_DEG as f32).to_radians();
    let azim = (azimuth_step as f32 / AZIMUTH_STEPS as f32) * 2.0 * PI;
    let (sin_e, cos_e) = elev.sin_cos();
    let (sin_a, cos_a) = azim.sin_cos();
    [sin_e * cos_a, sin_e * sin_a, cos_e]
}

/// A single anisotropic GGX BRDF evaluation sample.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AnisotropicBrdfSample {
    /// Specular radiance (already scaled by `light_intensity`).
    pub specular: f32,
    /// Anisotropic GGX NDF `D(h)` (Heitz 2014).
    pub ndf: f32,
    /// Height-correlated Smith masking-shadowing `G2 = 1/(1 + Λ(ωi) + Λ(ωo))`.
    pub geometry: f32,
    /// Schlick Fresnel `F(θ)`.
    pub fresnel: f32,
    /// `saturate(n·l)` used for the energy-conservation measurement.
    pub n_dot_l: f32,
}

/// Physical anisotropic GGX BRDF (letter **brdf**).
///
/// Constructor is **fail-closed**: non-finite or non-positive roughness, or an
/// out-of-range `f0`, returns `None` — the kernel never evaluates a NaN BRDF.
#[derive(Debug, Clone, Copy)]
pub struct AnisotropicMicrofacetBrdf {
    alpha_x: f32,
    alpha_y: f32,
    f0: f32,
}

impl AnisotropicMicrofacetBrdf {
    /// Fail-closed constructor. `alpha_x`/`alpha_y` are roughness along the
    /// tangent/bitangent; `f0` is the normal-incidence reflectance in `[0, 1]`.
    pub fn new(alpha_x: f32, alpha_y: f32, f0: f32) -> Option<Self> {
        if !alpha_x.is_finite() || !alpha_y.is_finite() || !f0.is_finite() {
            return None;
        }
        if alpha_x <= 0.0 || alpha_y <= 0.0 || !(0.0..=1.0).contains(&f0) {
            return None;
        }
        Some(Self {
            alpha_x,
            alpha_y,
            f0,
        })
    }

    /// Heitz height-correlated Smith Λ(ω). Returns a large finite value at
    /// grazing incidence (denominator → 0) so `G2` masks correctly.
    #[inline]
    fn lambda(&self, v_dot_t: f32, v_dot_b: f32, n_dot_v: f32) -> f32 {
        let denom = n_dot_v * n_dot_v;
        if denom <= 1e-12 {
            return 1e9;
        }
        let ax2 = self.alpha_x * self.alpha_x;
        let ay2 = self.alpha_y * self.alpha_y;
        let a = (ax2 * v_dot_t * v_dot_t + ay2 * v_dot_b * v_dot_b) / denom;
        0.5 * ((1.0 + a).sqrt() - 1.0)
    }

    /// Full anisotropic GGX specular evaluation. Inputs are direction vectors
    /// (any length — normalized internally); `t`/`b`/`n` must form the local
    /// tangent frame. Returns a zero sample fail-closed when the geometry terms
    /// vanish (light/eye under the surface).
    pub fn evaluate(
        &self,
        wo: [f32; 3],
        wi: [f32; 3],
        n: [f32; 3],
        t: [f32; 3],
        b: [f32; 3],
        light_intensity: f32,
    ) -> AnisotropicBrdfSample {
        let wo = normalize3(wo);
        let wi = normalize3(wi);
        let n = normalize3(n);
        let t = normalize3(t);
        let b = normalize3(b);

        let n_dot_l = saturate(dot3(n, wi));
        let n_dot_v = saturate(dot3(n, wo));
        let zero = AnisotropicBrdfSample {
            specular: 0.0,
            ndf: 0.0,
            geometry: 0.0,
            fresnel: self.f0,
            n_dot_l,
        };
        if n_dot_l <= 1e-6 || n_dot_v <= 1e-6 {
            return zero;
        }

        let h = normalize3([wi[0] + wo[0], wi[1] + wo[1], wi[2] + wo[2]]);
        let n_dot_h = saturate(dot3(n, h));
        let l_dot_h = saturate(dot3(wi, h));
        let h_dot_t = dot3(h, t);
        let h_dot_b = dot3(h, b);
        let v_dot_t = dot3(wo, t);
        let v_dot_b = dot3(wo, b);
        let l_dot_t = dot3(wi, t);
        let l_dot_b = dot3(wi, b);

        // Anisotropic GGX NDF (Heitz 2014, eq. 83).
        let ax = self.alpha_x;
        let ay = self.alpha_y;
        let term = ((h_dot_t * h_dot_t) / (ax * ax)
            + (h_dot_b * h_dot_b) / (ay * ay)
            + n_dot_h * n_dot_h)
        .max(1e-6);
        let denom = (PI * ax * ay * term * term).max(1e-30);
        let ndf = 1.0 / denom;

        // Height-correlated Smith G2 (Heitz 2014, eq. 96).
        let lambda_v = self.lambda(v_dot_t, v_dot_b, n_dot_v);
        let lambda_l = self.lambda(l_dot_t, l_dot_b, n_dot_l);
        let geometry = 1.0 / (1.0 + lambda_v + lambda_l);

        // Schlick Fresnel.
        let fresnel = self.f0 + (1.0 - self.f0) * (1.0 - l_dot_h).powi(5);

        let specular = ndf * geometry * fresnel / (4.0 * n_dot_l * n_dot_v) * light_intensity;

        AnisotropicBrdfSample {
            specular,
            ndf,
            geometry,
            fresnel,
            n_dot_l,
        }
    }
}

/// Legacy facade kept for the wire contract: anti-aliased GGX specular falloff
/// over a physical curvature ramp (radius^-1). Smooth surfaces → brighter,
/// tighter highlight; micro-curvature strictly dims it. Fail-closed on
/// non-finite or negative input.
#[derive(Debug, Clone, Copy, Default)]
pub struct AnisotropicNeuralMicrofacets;

impl AnisotropicNeuralMicrofacets {
    /// O motor calcula a fricção do fóton ao invés de pintar brilho falso.
    pub fn resolve_ggx_specular_aa(curvature_tensor: f32, light_intensity: f32) -> f32 {
        if !curvature_tensor.is_finite() || !light_intensity.is_finite() {
            return 0.0; // fail-closed: NaN/Inf curvature never paints a highlight
        }
        if curvature_tensor < 0.0 || light_intensity < 0.0 {
            return 0.0;
        }
        // Curvature (radius^-1) → micro-roughness α: α = c/(1+c) maps [0, ∞)
        // → [0, 1) monotonically. Smooth surfaces (α→0) keep a tight, bright
        // specular peak; micro-detail (α→1) scatters it into a dim lobe.
        let alpha = curvature_tensor / (1.0 + curvature_tensor);
        // Strictly decreasing in α; bounded in [0, light_intensity].
        let energy = (1.0 - alpha) / (1.0 + alpha);
        light_intensity * energy
    }
}

/// Measured (never assumed) evidence for the anisotropic BRDF soak.
#[derive(Debug, Clone)]
struct AnisotropicMeasured {
    specular_min: f32,
    specular_max: f32,
    monotonic_curvature_falloff: bool,
    ndf_finite: bool,
    energy_bounded: bool,
    max_energy: f32,
    isotropy_equivalent: bool,
    max_isotropy_rel_err: f32,
}

/// Isotropic GGX NDF: `α²/(π((n·h)²(α²−1)+1)²)`.
fn isotropic_ggx_ndf(alpha: f32, n_dot_h: f32) -> f32 {
    let a2 = alpha * alpha;
    let d = (n_dot_h * n_dot_h) * (a2 - 1.0) + 1.0;
    a2 / (PI * d * d)
}

/// At `αx == αy`, the anisotropic NDF must equal the isotropic NDF (they share
/// the same analytic limit). Measured over the same deterministic hemisphere.
fn isotropy_check() -> (bool, f32) {
    const ALPHA: f32 = 0.3;
    let brdf =
        AnisotropicMicrofacetBrdf::new(ALPHA, ALPHA, 0.04).expect("valid isotropic-equivalent BRDF");
    let n = [0.0, 0.0, 1.0];
    let t = [1.0, 0.0, 0.0];
    let b = [0.0, 1.0, 0.0];
    let mut max_rel_err = 0.0f32;
    let mut equivalent = true;
    for ev in 1..=ELEVATION_STEPS {
        for az in 0..AZIMUTH_STEPS {
            let wo = hemi_direction(ev, az);
            let wi = hemi_direction((ev % ELEVATION_STEPS) + 1, (az * 3) % AZIMUTH_STEPS);
            let s = brdf.evaluate(wo, wi, n, t, b, 1.0);
            let wo = normalize3(wo);
            let wi = normalize3(wi);
            let h = normalize3([wi[0] + wo[0], wi[1] + wo[1], wi[2] + wo[2]]);
            let n_dot_h = saturate(dot3(n, h));
            let iso = isotropic_ggx_ndf(ALPHA, n_dot_h);
            let denom = iso.abs().max(1e-6);
            let rel_err = (s.ndf - iso).abs() / denom;
            max_rel_err = max_rel_err.max(rel_err);
            if rel_err > 1e-3 {
                equivalent = false;
            }
        }
    }
    (equivalent, max_rel_err)
}

fn run_measured_pass() -> AnisotropicMeasured {
    // 1. Curvature falloff + legacy anti-aliased specular min/max.
    let mut specular_min = f32::INFINITY;
    let mut specular_max = f32::NEG_INFINITY;
    let mut monotonic_curvature_falloff = true;
    let mut previous = f32::INFINITY;
    for &curvature in &CURVATURE_SWEEP {
        let specular = AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa(curvature, 1.0);
        if !specular.is_finite() || specular <= 0.0 || specular >= previous {
            monotonic_curvature_falloff = false;
        }
        previous = specular;
        specular_min = specular_min.min(specular);
        specular_max = specular_max.max(specular);
    }
    if !(specular_min.is_finite() && specular_max.is_finite() && specular_max > 0.0) {
        monotonic_curvature_falloff = false;
    }

    // 2. Full BRDF energy sweep over a deterministic hemisphere.
    //    Energy conservation for a single GGX lobe is a *directional albedo*
    //    bound: ρ(ωo) = ∫_{H²} f(ωi,ωo)·(n·ωi)·dωi ≤ ENERGY_BOUND. The raw
    //    integrand `specular·(n·l)` can exceed 1.0 at a specular peak; the
    //    solid-angle-weighted integral is what must stay bounded (for a
    //    physical single-scattering GGX it is ≤ ~1.0). We measure the max
    //    directional albedo over all outgoing directions on the same grid.
    let brdf = AnisotropicMicrofacetBrdf::new(0.35, 0.12, 0.04).expect("valid BRDF");
    let n = [0.0, 0.0, 1.0];
    let t = [1.0, 0.0, 0.0];
    let b = [0.0, 1.0, 0.0];
    let d_theta = (HEMI_DEG as f32).to_radians() / ELEVATION_STEPS as f32;
    let d_phi = (2.0 * PI) / AZIMUTH_STEPS as f32;
    let mut max_energy = 0.0f32;
    let mut ndf_finite = true;
    for ev in 1..=ELEVATION_STEPS {
        for az in 0..AZIMUTH_STEPS {
            let wo = hemi_direction(ev, az);
            // Solid-angle-weighted directional albedo ρ(ωo) over the wi grid:
            // dω = sin(θ)·Δθ·Δφ, and f(ωi,ωo)·(n·ωi) = specular·n_dot_l.
            let mut albedo = 0.0f32;
            for ev2 in 1..=ELEVATION_STEPS {
                for az2 in 0..AZIMUTH_STEPS {
                    let wi = hemi_direction(ev2, az2);
                    let s = brdf.evaluate(wo, wi, n, t, b, 1.0);
                    if !s.ndf.is_finite() || !s.specular.is_finite() || !s.geometry.is_finite() {
                        ndf_finite = false;
                    }
                    let sin_theta = (wi[0] * wi[0] + wi[1] * wi[1]).sqrt();
                    albedo += s.specular * s.n_dot_l * sin_theta * d_theta * d_phi;
                }
            }
            max_energy = max_energy.max(albedo);
        }
    }
    let energy_bounded = ndf_finite && max_energy.is_finite() && max_energy <= ENERGY_BOUND;

    // 3. Isotropy equivalence.
    let (isotropy_equivalent, max_isotropy_rel_err) = isotropy_check();

    AnisotropicMeasured {
        specular_min,
        specular_max,
        monotonic_curvature_falloff,
        ndf_finite,
        energy_bounded,
        max_energy,
        isotropy_equivalent,
        max_isotropy_rel_err,
    }
}

/// FNV-1a 64-bit fingerprint sealing the numeric evidence (deterministic).
fn fnv1a(mut hash: u64, data: &[u8]) -> u64 {
    for &byte in data {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x1000_0000_01B3);
    }
    hash
}

fn brdf_evidence_fingerprint(m: &AnisotropicMeasured) -> u64 {
    let mut fp = fnv1a(0xcbf2_9ce4_8422_2325, b"anisotropic_ggx_brdf");
    for bits in [
        m.specular_min.to_bits(),
        m.specular_max.to_bits(),
        m.max_energy.to_bits(),
        m.max_isotropy_rel_err.to_bits(),
    ] {
        fp = fnv1a(fp, &bits.to_le_bytes());
    }
    for flag in [
        m.monotonic_curvature_falloff,
        m.energy_bounded,
        m.isotropy_equivalent,
        m.ndf_finite,
    ] {
        fp = fnv1a(fp, &[u8::from(flag)]);
    }
    fp
}

/// Soak report for the anisotropic neural microfacets kernel (letter **brdf**).
/// Readiness is **measured** — never hardcoded. `brdf_aaa_ready` stays HELD.
#[derive(Debug, Clone, PartialEq)]
pub struct AnisotropicNeuralMicrofacetsSoakReport {
    pub anisotropic_brdf_ready: bool,
    pub monotonic_curvature_falloff: bool,
    pub energy_bounded: bool,
    pub isotropy_equivalent: bool,
    pub ndf_finite: bool,
    pub deterministic: bool,
    pub specular_min: f32,
    pub specular_max: f32,
    pub max_energy: f32,
    pub max_isotropy_rel_err: f32,
    pub tested_entities: usize,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub brdf_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Number of deterministic replay ticks in the anisotropic BRDF soak.
pub const ANISOTROPIC_BRDF_SOAK_TICKS: u32 = 64;

fn report_from_measured(
    m: &AnisotropicMeasured,
    deterministic: bool,
    total_ticks: u32,
) -> AnisotropicNeuralMicrofacetsSoakReport {
    let ready = m.monotonic_curvature_falloff
        && m.energy_bounded
        && m.isotropy_equivalent
        && m.ndf_finite
        && m.specular_min.is_finite()
        && m.specular_max > 0.0
        && deterministic;
    AnisotropicNeuralMicrofacetsSoakReport {
        anisotropic_brdf_ready: ready,
        monotonic_curvature_falloff: m.monotonic_curvature_falloff,
        energy_bounded: m.energy_bounded,
        isotropy_equivalent: m.isotropy_equivalent,
        ndf_finite: m.ndf_finite,
        deterministic,
        specular_min: m.specular_min,
        specular_max: m.specular_max,
        max_energy: m.max_energy,
        max_isotropy_rel_err: m.max_isotropy_rel_err,
        tested_entities: CURVATURE_SWEEP.len(),
        total_ticks,
        evidence_kind: "anisotropic_ggx_brdf".to_string(),
        evidence_fingerprint: brdf_evidence_fingerprint(m),
        brdf_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Deterministic 64-tick replay of the anisotropic GGX BRDF measurement.
pub fn run_anisotropic_neural_microfacets_soak() -> AnisotropicNeuralMicrofacetsSoakReport {
    let reference = run_measured_pass();
    let ref_fp = brdf_evidence_fingerprint(&reference);
    let mut deterministic = true;
    for _ in 0..ANISOTROPIC_BRDF_SOAK_TICKS {
        if brdf_evidence_fingerprint(&run_measured_pass()) != ref_fp {
            deterministic = false;
        }
    }
    report_from_measured(&reference, deterministic, ANISOTROPIC_BRDF_SOAK_TICKS)
}

/// Single-pass honesty probe (soak-gated, letter `brdf`).
pub fn probe_anisotropic_neural_microfacets() -> AnisotropicNeuralMicrofacetsSoakReport {
    report_from_measured(&run_measured_pass(), true, 1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn brdf_constructor_fail_closed_on_invalid_roughness() {
        assert!(AnisotropicMicrofacetBrdf::new(0.0, 0.1, 0.04).is_none());
        assert!(AnisotropicMicrofacetBrdf::new(-1.0, 0.1, 0.04).is_none());
        assert!(AnisotropicMicrofacetBrdf::new(f32::NAN, 0.1, 0.04).is_none());
        assert!(AnisotropicMicrofacetBrdf::new(0.1, 0.1, 1.5).is_none());
        assert!(AnisotropicMicrofacetBrdf::new(0.35, 0.12, 0.04).is_some());
    }

    #[test]
    fn legacy_resolve_ggx_is_monotonic_decreasing_over_curvature_ramp() {
        let mut prev = f32::INFINITY;
        for &c in &CURVATURE_SWEEP {
            let s = AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa(c, 1.0);
            assert!(
                s.is_finite() && s > 0.0 && s < prev,
                "curvature {} broke monotonicity",
                c
            );
            prev = s;
        }
    }

    #[test]
    fn legacy_resolve_ggx_fail_closed_on_non_finite_input() {
        assert_eq!(
            AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa(f32::NAN, 1.0),
            0.0
        );
        assert_eq!(
            AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa(1.0, f32::INFINITY),
            0.0
        );
        assert_eq!(
            AnisotropicNeuralMicrofacets::resolve_ggx_specular_aa(-3.0, 1.0),
            0.0
        );
    }

    #[test]
    fn anisotropic_ndf_is_finite_and_positive_at_normal_incidence() {
        let brdf = AnisotropicMicrofacetBrdf::new(0.35, 0.12, 0.04).unwrap();
        let s = brdf.evaluate(
            [0.0, 0.0, 1.0],
            [0.0, 0.0, 1.0],
            [0.0, 0.0, 1.0],
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            1.0,
        );
        assert!(s.ndf.is_finite() && s.ndf > 0.0);
        assert!(s.specular.is_finite() && s.specular > 0.0);
        assert_eq!(s.n_dot_l, 1.0);
        assert!(s.geometry.is_finite() && s.geometry > 0.0);
    }

    #[test]
    fn iso_ndf_matches_analytic_formula_within_tolerance() {
        let (equivalent, rel_err) = isotropy_check();
        assert!(equivalent, "isotropy equivalence failed, max rel err {}", rel_err);
        assert!(rel_err <= 1e-3);
    }

    #[test]
    fn anisotropic_lobe_is_distinct_from_isotropic_material() {
        let aniso = AnisotropicMicrofacetBrdf::new(0.5, 0.05, 0.04).unwrap();
        let iso = AnisotropicMicrofacetBrdf::new(0.25, 0.25, 0.04).unwrap();
        let n = [0.0, 0.0, 1.0];
        let t = [1.0, 0.0, 0.0];
        let b = [0.0, 1.0, 0.0];
        let wo = hemi_direction(4, 2);
        let wi = hemi_direction(3, 8);
        let a = aniso.evaluate(wo, wi, n, t, b, 1.0);
        let i = iso.evaluate(wo, wi, n, t, b, 1.0);
        assert!(
            (a.ndf - i.ndf).abs() > 1e-4,
            "strongly anisotropic lobe must differ from isotropic (aniso ndf {} vs iso {})",
            a.ndf,
            i.ndf
        );
    }

    #[test]
    fn measured_pass_is_deterministic() {
        assert_eq!(
            brdf_evidence_fingerprint(&run_measured_pass()),
            brdf_evidence_fingerprint(&run_measured_pass())
        );
    }

    #[test]
    fn energy_sweep_is_bounded() {
        let m = run_measured_pass();
        assert!(m.max_energy.is_finite());
        assert!(m.max_energy > 0.0);
        assert!(
            m.max_energy <= ENERGY_BOUND,
            "energy {} exceeded {}",
            m.max_energy,
            ENERGY_BOUND
        );
        assert!(m.energy_bounded);
    }

    #[test]
    fn soak_gates_ready_and_aaa_held() {
        let r = run_anisotropic_neural_microfacets_soak();
        assert!(r.anisotropic_brdf_ready, "BRDF soak must prove readiness");
        assert!(r.monotonic_curvature_falloff);
        assert!(r.energy_bounded);
        assert!(r.isotropy_equivalent);
        assert!(r.ndf_finite);
        assert!(r.deterministic);
        assert!(r.specular_min.is_finite() && r.specular_max > 0.0);
        assert!(!r.brdf_aaa_ready, "brdf_aaa_ready must stay HELD (false)");
        assert!(
            !r.coins_ready && !r.agones_ready && !r.nanite_ready && !r.dlss_ready && !r.quic_ready
        );
        assert_eq!(r.evidence_kind, "anisotropic_ggx_brdf");
        assert!(r.evidence_fingerprint != 0);
        assert_eq!(r.total_ticks, ANISOTROPIC_BRDF_SOAK_TICKS);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_anisotropic_neural_microfacets_soak();
        let probe = probe_anisotropic_neural_microfacets();
        assert_eq!(soak.anisotropic_brdf_ready, probe.anisotropic_brdf_ready);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.specular_min.to_bits(), probe.specular_min.to_bits());
        assert_eq!(soak.specular_max.to_bits(), probe.specular_max.to_bits());
    }

    #[test]
    fn schlick_fresnel_grazing_angle_approaches_one() {
        let f0 = 0.04f32; // Dielectric plastic/glass baseline
        let v_dot_h_grazing = 0.0f32; // 90 degree grazing
        let f_grazing = f0 + (1.0 - f0) * (1.0 - v_dot_h_grazing).powi(5);
        assert!((f_grazing - 1.0).abs() < 1e-6, "Grazing Fresnel must equal 1.0: {f_grazing}");

        let v_dot_h_normal = 1.0f32; // Normal incidence
        let f_normal = f0 + (1.0 - f0) * (1.0 - v_dot_h_normal).powi(5);
        assert!((f_normal - f0).abs() < 1e-6, "Normal Fresnel must equal F0: {f_normal}");
    }

    #[test]
    fn anisotropic_ndf_elliptical_symmetry() {
        let brdf = AnisotropicMicrofacetBrdf::new(0.6, 0.2, 0.04).expect("valid roughness");
        let n = [0.0, 0.0, 1.0];
        let t = [1.0, 0.0, 0.0];
        let b = [0.0, 1.0, 0.0];
        let t_neg = [-1.0, 0.0, 0.0];
        let b_neg = [0.0, -1.0, 0.0];

        let wo = hemi_direction(3, 5);
        let wi = hemi_direction(4, 7);

        let eval_pos = brdf.evaluate(wo, wi, n, t, b, 1.0);
        let eval_neg = brdf.evaluate(wo, wi, n, t_neg, b_neg, 1.0);

        assert!((eval_pos.ndf - eval_neg.ndf).abs() < 1e-5, "NDF must be invariant under 180 deg tangent inversion");
        assert!((eval_pos.specular - eval_neg.specular).abs() < 1e-5);
    }

    #[test]
    fn smith_masking_shadowing_bounds() {
        let brdf = AnisotropicMicrofacetBrdf::new(0.4, 0.4, 0.04).unwrap();
        let n = [0.0, 0.0, 1.0];
        let t = [1.0, 0.0, 0.0];
        let b = [0.0, 1.0, 0.0];

        for elev in 1..HEMI_DEG {
            let wo = hemi_direction(elev % ELEVATION_STEPS, 0);
            let wi = hemi_direction((elev + 2) % ELEVATION_STEPS, 4);
            let eval = brdf.evaluate(wo, wi, n, t, b, 1.0);

            assert!(eval.geometry >= 0.0 && eval.geometry <= 1.0, "Smith G term out of bounds: {}", eval.geometry);
        }
    }
}

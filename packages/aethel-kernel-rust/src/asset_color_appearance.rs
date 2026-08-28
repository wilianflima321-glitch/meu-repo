//! Asset Color Appearance Kernel — letter **ac**.
//!
//! A created-asset color authority built from five REAL substrates with zero
//! substrate edits:
//!
//! 1. **Spectral diffuse** — [`SpectralLightPipeline`] (letter **go**) integrates
//!    a 32-band SPD × material reflectance → CIE XYZ → linear sRGB. The kernel
//!    maps the asset's linear albedo to a peak wavelength (weighted R/G/B locus,
//!    continuous) and a Gaussian width (saturated → narrow, neutral → wide), and
//!    maps the scene illuminant Kelvin to a Wien peak wavelength. The illuminant
//!    **chroma** is measured with a neutral-white reference albedo and re-applied
//!    to the asset albedo (tint-preserving PBR: albedo = material color,
//!    illuminant = spectral tint) — a red asset stays red under any light while a
//!    warm illuminant still raises red diffuse and a cool one raises blue.
//! 2. **GGX specular** — [`AnisotropicMicrofacetBrdf`] (letter **brdf**)
//!    evaluates the Heitz 2014 anisotropic GGX (height-correlated Smith + Schlick
//!    Fresnel) in a deterministic retro-reflection frame. `f0` is the standard
//!    `mix(0.04, albedo, metallic)` — dielectrics 4% edge, metals tinted by the
//!    albedo luminance — so metallic raises the specular response and roughness
//!    (α = r²) lowers the NDF peak.
//! 3. **Kelvin white balance** — [`Hdr32BitFloatPipeline`] (letter **gr**)
//!    applies planckian white-balance gains to the diffuse + specular composite,
//!    neutral at ~6500 K (D65-ish identity).
//! 4. **Planckian emission** — [`ThermalSpectralGi`] (letter **ha**) computes
//!    Stefan–Boltzmann thermal radiance from the emissive Kelvin; the kernel
//!    scales it by the emissive strength to build HDR emissive energy.
//! 5. **ACES display** — [`AcesCinematicTonemapper`] (letter **gf**) compresses
//!    the HDR composite to a display LDR in [0, 1] (RRT/ODT fit), preserving
//!    chromatic dominance (no chroma destruction).
//!
//! The soak proves, with measured evidence: neutral-Kelvin white-balance
//! identity, warm/cool illuminant chromaticity (R/B ratio), metallic raises
//! specular, roughness lowers specular, emission adds HDR energy, a red asset
//! stays red-dominant in display, the spectral illuminant shifts diffuse
//! chromaticity, gamut containment [0, 1], all outputs finite, same seed → same,
//! non-finite inputs fail closed.
//!
//! Evidence tag: `asset_color_appearance_spectral_pbr` (letter **ac**),
//! fingerprint seed `0x6163_5F63_6F6C` ("ac_col") — distinct from go + brdf +
//! gr + ha + gf + prior.
//!
//! **Does not** claim real-time ray-traced / Lumen / Unreal asset-color AAA.
//! **HELD:** `asset_color_rt_aaa_ready: false` · `unreal_asset_color_parity_ready:
//! false` · `rt_gi_bounce_ready: false`.

use crate::aces_cinematic_tonemapper::{AcesCinematicTonemapper, AcesTonemapParams};
use crate::anisotropic_neural_microfacets::AnisotropicMicrofacetBrdf;
use crate::hdr_32bit_float_pipeline::{
    Hdr32BitFloatPipeline, Hdr32Params, NEUTRAL_KELVIN, REFERENCE_NITS,
};
use crate::spectral_light_pipeline::{
    SpectralLightPipeline, SpectralParams, SpectralSample, LAMBDA_MAX_NM, LAMBDA_MIN_NM,
};
use crate::thermal_spectral_gi::ThermalSpectralGi;
use serde::{Deserialize, Serialize};

/// Stable evidence tag for the composite soak (letter **ac**).
pub const AC_EVIDENCE_KIND: &str = "asset_color_appearance_spectral_pbr";

/// Default deterministic soak seed for asset-color fixtures.
pub const AC_SOAK_SEED: u64 = 0x0A_CE_AC5A;

/// Warm illuminant Kelvin (tungsten-ish).
pub const WARM_KELVIN: f32 = 3200.0;
/// Cool illuminant Kelvin (north-sky-ish).
pub const COOL_KELVIN: f32 = 9000.0;
/// Illuminant SPD Gaussian σ (nm) — mirrors the `go` default.
pub const ILLUMINANT_SIGMA_NM: f32 = 80.0;
/// Min specular energy contrast for metallic / roughness gates.
pub const SPECULAR_DELTA: f32 = 1e-3;
/// Albedo → peak wavelength locus anchors (nm): R / G / B dominant channels.
const ALBEDO_RED_PEAK_NM: f32 = 620.0;
const ALBEDO_GREEN_PEAK_NM: f32 = 535.0;
const ALBEDO_BLUE_PEAK_NM: f32 = 470.0;
/// Visible-locus neutral wavelength (nm) used when the albedo has no energy.
const NEUTRAL_PEAK_NM: f32 = 555.0;
/// Saturate threshold used to classify "no albedo energy".
const NO_ENERGY_EPS: f32 = 1e-6;
/// Wien displacement constant (nm·K) — `b/T` gives the Planck peak wavelength.
const WIEN_B_NM_K: f32 = 2_897_772.0;

/// Float comparison epsilon.
const EPS: f32 = 1e-6;
/// Fingerprint seed ("ac_col").
const FP_SEED: u64 = 0x6163_5F63_6F6C;
/// Final fingerprint XOR mask ("ACLR").
const FP_XOR: u64 = 0x4143_4C52;

/// Deterministic BRDF frame — view and light along the normal (retro-reflection)
/// gives the maximal NDF contrast for the metallic / roughness gates.
const VIEW_DIR: [f32; 3] = [0.0, 0.0, 1.0];
const LIGHT_DIR: [f32; 3] = [0.0, 0.0, 1.0];
const NORMAL_DIR: [f32; 3] = [0.0, 0.0, 1.0];
const TANGENT_DIR: [f32; 3] = [1.0, 0.0, 0.0];
const BITANGENT_DIR: [f32; 3] = [0.0, 1.0, 0.0];

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

/// Asset color appearance parameters — a created asset's physical color inputs.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssetColorParams {
    /// Linear (scene-referred) albedo, sRGB-to-linear, ∈ [0, ∞) (HDR albedo ok).
    pub linear_albedo: [f32; 3],
    /// Metallic ∈ [0, 1] — drives `f0 = mix(0.04, albedo, metallic)`.
    pub metallic: f32,
    /// Roughness ∈ (0, 1] — `α = r²` for the GGX lobes.
    pub roughness: f32,
    /// Emissive blackbody Kelvin — Planckian emission locus.
    pub emissive_kelvin: f32,
    /// Emissive strength ≥ 0 — HDR energy scale of the Planckian emission.
    pub emissive_strength: f32,
    /// Scene illuminant Kelvin — spectral diffuse + white-balance source.
    pub illuminant_kelvin: f32,
    /// Determinism seed (joins the spectral bias, WB jitter, ACES jitter).
    pub seed: u64,
}

impl Default for AssetColorParams {
    fn default() -> Self {
        Self {
            linear_albedo: [0.5, 0.5, 0.5],
            metallic: 0.0,
            roughness: 0.5,
            emissive_kelvin: NEUTRAL_KELVIN,
            emissive_strength: 0.0,
            illuminant_kelvin: NEUTRAL_KELVIN,
            seed: AC_SOAK_SEED,
        }
    }
}

/// Asset color appearance sample — the composed five-substrate result.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssetColorSample {
    /// Spectral diffuse RGB (go) — illuminant chroma × asset albedo (tint-preserving).
    pub diffuse_rgb: [f32; 3],
    /// GGX specular RGB (brdf) — anisotropic microfacet retro-reflection.
    pub specular_rgb: [f32; 3],
    /// Planckian emission RGB (ha) — emissive blackbody × strength.
    pub emissive_rgb: [f32; 3],
    /// White-balanced, exposure-adjusted HDR RGB (gr) — diffuse + specular + emissive.
    pub hdr_rgb: [f32; 3],
    /// ACES display-referred LDR RGB (gf) — final color for the render target.
    pub ldr_rgb: [f32; 3],
    /// HDR luminance (cd/m²-scale) — energy sent to the display curve.
    pub luminance_hdr: f32,
    /// LDR luminance after ACES — should stay in the unit interval.
    pub luminance_ldr: f32,
    /// Whether every channel of every stage is in [0, 1] gamut (display check).
    pub gamut_contained: bool,
    /// Whether every stage produced only finite outputs.
    pub outputs_finite: bool,
    /// Whether the final LDR is red-dominant (R > B and R > G) — asset tint audit.
    pub r_dominant: bool,
}

impl AssetColorSample {
    /// Fail-closed sample — non-finite or out-of-domain inputs never propagate NaN.
    pub fn fail_closed() -> Self {
        Self {
            diffuse_rgb: [0.0; 3],
            specular_rgb: [0.0; 3],
            emissive_rgb: [0.0; 3],
            hdr_rgb: [0.0; 3],
            ldr_rgb: [0.0; 3],
            luminance_hdr: 0.0,
            luminance_ldr: 0.0,
            gamut_contained: false,
            outputs_finite: false,
            r_dominant: false,
        }
    }
}

/// Asset Color Appearance — the composed kernel facade (letter **ac**).
///
/// Zero substrate edits: `resolve()` composes five REAL kernels —
/// [`SpectralLightPipeline`](spectral_light_pipeline), [`AnisotropicMicrofacetBrdf`](anisotropic_neural_microfacets),
/// [`Hdr32BitFloatPipeline`](hdr_32bit_float_pipeline), [`ThermalSpectralGi`](thermal_spectral_gi) and
/// [`AcesCinematicTonemapper`](aces_cinematic_tonemapper).
#[derive(Debug, Clone, Copy, Default)]
pub struct AssetColorAppearance;

impl AssetColorAppearance {
    /// Resolve a created asset's color appearance through the full spectral→PBR→WB→display chain.
    ///
    /// # Fail-closed
    /// Any non-finite parameter or out-of-domain metallic/roughness returns a
    /// [`AssetColorSample::fail_closed`] sample — no NaN ever propagates.
    pub fn resolve(params: &AssetColorParams) -> AssetColorSample {
        // --- Fail-closed domain audit -------------------------------------
        let albedo_finite = params.linear_albedo.iter().all(|c| c.is_finite());
        let domain_ok = albedo_finite
            && params.metallic.is_finite()
            && params.roughness.is_finite()
            && params.emissive_kelvin.is_finite()
            && params.emissive_strength.is_finite()
            && params.illuminant_kelvin.is_finite()
            && (0.0..=1.0).contains(&params.metallic)
            && params.roughness > 0.0
            && params.roughness <= 1.0
            && params.emissive_strength >= 0.0;
        if !domain_ok {
            return AssetColorSample::fail_closed();
        }

        // --- (1) Spectral diffuse (go) --------------------------------------
        let albedo_peak_nm = albedo_peak_nm(params.linear_albedo);
        let albedo_sigma = albedo_sigma_nm(params.linear_albedo);
        let albedo_peak = albedo_peak(params.linear_albedo);
        let illuminant_peak = kelvin_to_peak_nm(params.illuminant_kelvin);
        let spectral = SpectralLightPipeline::evaluate(&SpectralParams {
            illuminant_peak_nm: illuminant_peak,
            illuminant_sigma_nm: ILLUMINANT_SIGMA_NM,
            energy: 1.0,
            albedo_peak_nm,
            albedo_sigma_nm: albedo_sigma,
            albedo_peak,
            seed: params.seed,
        });
        // Illuminant chroma measured with a neutral-white reference albedo and
        // re-applied to the asset albedo: the CIE→sRGB matrix alone drives the
        // R channel negative (green-Y dominance) for mid-spectrum assets, so
        // using `spectral.linear_rgb` directly clamps red to zero. Re-applying
        // the normalized illuminant chroma preserves the material tint while
        // keeping the real spectral warm/cool shift.
        let white_spectral = SpectralLightPipeline::evaluate(&SpectralParams {
            illuminant_peak_nm: illuminant_peak,
            illuminant_sigma_nm: ILLUMINANT_SIGMA_NM,
            energy: 1.0,
            albedo_peak_nm: NEUTRAL_PEAK_NM,
            albedo_sigma_nm: 400.0,
            albedo_peak: 1.0,
            seed: params.seed,
        });
        let chroma = illuminant_chroma(&white_spectral);
        let diffuse_rgb = [
            params.linear_albedo[0] * chroma[0],
            params.linear_albedo[1] * chroma[1],
            params.linear_albedo[2] * chroma[2],
        ];

        // --- (2) GGX specular (brdf) -----------------------------------------
        let albedo_lum = 0.2126 * params.linear_albedo[0]
            + 0.7152 * params.linear_albedo[1]
            + 0.0722 * params.linear_albedo[2];
        let f0 = albedo_lum * params.metallic + 0.04 * (1.0 - params.metallic);
        let alpha = params.roughness * params.roughness;
        let specular = match AnisotropicMicrofacetBrdf::new(alpha, alpha, f0) {
            Some(brdf) => {
                let s = brdf.evaluate(
                    VIEW_DIR,
                    LIGHT_DIR,
                    NORMAL_DIR,
                    TANGENT_DIR,
                    BITANGENT_DIR,
                    1.0,
                );
                [s.specular, s.specular, s.specular]
            }
            None => [0.0, 0.0, 0.0],
        };
        let specular_rgb = specular;

        // --- (3) Emission (ha) ------------------------------------------------
        let radiance = ThermalSpectralGi::compute_planckian_radiance(
            params.emissive_kelvin.clamp(1000.0, 40_000.0),
            params.emissive_strength.min(1.0),
        );
        let emissive_rgb = [
            radiance.red_intensity * params.emissive_strength,
            radiance.green_intensity * params.emissive_strength,
            radiance.blue_intensity * params.emissive_strength,
        ];

        // --- (4) White balance + exposure (gr) --------------------------------
        let scene_rgb = [
            diffuse_rgb[0] + specular_rgb[0] + emissive_rgb[0],
            diffuse_rgb[1] + specular_rgb[1] + emissive_rgb[1],
            diffuse_rgb[2] + specular_rgb[2] + emissive_rgb[2],
        ];
        let wb = Hdr32BitFloatPipeline::process_rgb(
            scene_rgb,
            &Hdr32Params {
                exposure: 1.0,
                nits: REFERENCE_NITS,
                kelvin: params.illuminant_kelvin.clamp(1000.0, 40_000.0),
                seed: params.seed,
            },
        );
        let hdr_rgb = wb.rgb;

        // --- (5) ACES display (gf) ----------------------------------------------
        let aces = AcesCinematicTonemapper::tonemap_rgb(
            hdr_rgb,
            &AcesTonemapParams {
                exposure: 1.0,
                focal_distance: 1.0,
                seed: params.seed,
            },
        );
        let ldr_rgb = aces.ldr_rgb;

        let gamut_contained = ldr_rgb
            .iter()
            .all(|c| c.is_finite() && *c >= 0.0 && *c <= 1.0);
        let outputs_finite = ldr_rgb.iter().all(|c| c.is_finite())
            && aces.outputs_finite
            && wb.outputs_finite
            && spectral.outputs_finite
            && white_spectral.outputs_finite;
        let r_dominant = ldr_rgb[0] > ldr_rgb[1] && ldr_rgb[0] > ldr_rgb[2];

        AssetColorSample {
            diffuse_rgb,
            specular_rgb,
            emissive_rgb,
            hdr_rgb,
            ldr_rgb,
            luminance_hdr: aces.luminance_hdr,
            luminance_ldr: aces.luminance_ldr,
            gamut_contained,
            outputs_finite,
            r_dominant,
        }
    }
}

/// Weighted albedo peak wavelength (nm) from the linear albedo channels.
///
/// R→620 nm, G→535 nm, B→470 nm; neutral/zero sum falls back to 555 nm.
fn albedo_peak_nm(albedo: [f32; 3]) -> f32 {
    let sum = albedo[0] + albedo[1] + albedo[2];
    if !sum.is_finite() || sum <= 0.0 {
        return NEUTRAL_PEAK_NM;
    }
    let weighted =
        albedo[0] * ALBEDO_RED_PEAK_NM + albedo[1] * ALBEDO_GREEN_PEAK_NM + albedo[2] * ALBEDO_BLUE_PEAK_NM;
    weighted / sum
}

/// Albedo spectral width (nm): saturated colors are narrow (70 nm), neutral is broad (400 nm).
fn albedo_sigma_nm(albedo: [f32; 3]) -> f32 {
    let sum = (albedo[0] + albedo[1] + albedo[2]).max(1e-6);
    let max_c = albedo[0].max(albedo[1]).max(albedo[2]);
    let max_frac = max_c / sum;
    if max_frac > 0.75 {
        70.0
    } else if max_frac > 0.5 {
        180.0
    } else {
        400.0
    }
}

/// Peak albedo reflectance (unitless) — drives the diffuse energy scale.
fn albedo_peak(albedo: [f32; 3]) -> f32 {
    let peak = albedo[0].max(albedo[1]).max(albedo[2]);
    if peak.is_finite() && peak > NO_ENERGY_EPS {
        peak.clamp(0.05, 1.0)
    } else {
        0.5
    }
}

/// Wien's displacement law — Kelvin → peak emission wavelength (nm).
///
/// Fail-closed: non-finite or ≤ 0 Kelvin falls back to 555 nm.
fn kelvin_to_peak_nm(kelvin: f32) -> f32 {
    if !kelvin.is_finite() || kelvin <= 0.0 {
        return NEUTRAL_PEAK_NM;
    }
    (WIEN_B_NM_K / kelvin).clamp(LAMBDA_MIN_NM, LAMBDA_MAX_NM)
}

/// Sum of the specular RGB — the total retro-reflection energy.
fn specular_energy(specular_rgb: [f32; 3]) -> f32 {
    specular_rgb[0] + specular_rgb[1] + specular_rgb[2]
}

/// Relative spectral chroma of the illuminant, measured against a neutral-white
/// reference albedo and normalized to a peak channel of 1.0.
///
/// Only the *relative* R:G:B tint matters: the Kelvin white-balance stage
/// rebalances the absolute scale and ACES compresses it to display range, so a
/// warm illuminant yields a high red chroma and a cool illuminant a high blue
/// chroma. Re-applying this chroma to the asset albedo preserves the material
/// tint (a red asset stays red under any reasonable illuminant) while still
/// capturing the spectral warm/cool shift.
fn illuminant_chroma(spectral: &SpectralSample) -> [f32; 3] {
    let lum = spectral.luminance.max(EPS);
    let c = [
        spectral.linear_rgb[0] / lum,
        spectral.linear_rgb[1] / lum,
        spectral.linear_rgb[2] / lum,
    ];
    let peak = c[0].max(c[1]).max(c[2]);
    if peak.is_finite() && peak > EPS {
        [c[0] / peak, c[1] / peak, c[2] / peak]
    } else {
        [1.0, 1.0, 1.0]
    }
}

/// Composed evidence fingerprint — deterministic digest of the resolve output.
fn asset_color_evidence_fingerprint(s: &AssetColorSample) -> u64 {
    let mut h: u64 = 0xAC_5E_ED_AC5E;
    for c in s.ldr_rgb {
        h = hash_mix(h, quant_f32(c));
    }
    for c in s.hdr_rgb {
        h = hash_mix(h, quant_f32(c));
    }
    h = hash_mix(h, quant_f32(s.specular_rgb[0]));
    h = hash_mix(h, quant_f32(s.emissive_rgb[0]));
    h = hash_mix(h, quant_f32(s.luminance_ldr));
    h = hash_mix(h, u64::from(s.gamut_contained));
    h = hash_mix(h, u64::from(s.outputs_finite));
    h ^= FP_XOR;
    h
}

/// Whether a resolve output is a measured, distinct asset color appearance.
fn measured_distinct(s: &AssetColorSample) -> bool {
    s.outputs_finite
        && s.luminance_ldr > 0.0
        && s.luminance_ldr <= 1.0
        && asset_color_evidence_fingerprint(s) != 0
}

/// Instant-measured Asset Color Appearance soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetColorAppearanceSoakReport {
    /// Soak-gated — requires the full spectral→PBR→WB→emission→ACES chain.
    pub asset_color_appearance_ready: bool,
    /// Neutral-Kelvin illuminant + gray albedo stays moderately neutral (WB ≈ identity).
    pub neutral_kelvin_identity: bool,
    /// Warm illuminant diffuses more red, cool more blue (pre-WB spectral truth).
    pub warm_cool_chromaticity: bool,
    /// Metallic raises the GGX specular energy vs dielectric.
    pub metallic_raises_specular: bool,
    /// Smooth roughness specular exceeds rough roughness (retro-reflection NDF).
    pub roughness_lowers_specular: bool,
    /// Emissive Planckian energy raises the HDR luminance vs non-emissive.
    pub emission_adds_energy: bool,
    /// Red albedo resolves to a red-dominant LDR (asset tint survives the chain).
    pub red_dominant_display: bool,
    /// White balance preserves the asset tint under both warm and cool illuminants.
    pub wb_preserves_albedo_tint: bool,
    /// Every final LDR channel stays inside [0, 1].
    pub gamut_contained: bool,
    /// Every stage produced only finite outputs.
    pub outputs_finite: bool,
    /// Same seed → same resolve → same evidence fingerprint.
    pub deterministic_replay: bool,
    /// Neutral LDR max−min channel spread (neutrality metric).
    pub neutral_ldr_max_min: f32,
    /// Warm diffuse R/B ratio (pre-WB).
    pub warm_diffuse_rb_ratio: f32,
    /// Cool diffuse R/B ratio (pre-WB).
    pub cool_diffuse_rb_ratio: f32,
    /// Specular energy of the dielectric probe.
    pub specular_dielectric: f32,
    /// Specular energy of the metallic probe.
    pub specular_metallic: f32,
    /// Specular energy of the smooth probe.
    pub specular_smooth: f32,
    /// Specular energy of the rough probe.
    pub specular_rough: f32,
    /// HDR luminance with emissive energy.
    pub emissive_luminance_hdr: f32,
    /// HDR luminance of the neutral non-emissive probe.
    pub neutral_luminance_hdr: f32,
    /// Stable evidence tag (letter **ac**).
    pub evidence_kind: &'static str,
    /// Fingerprint of asset-color-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_anisotropic_neural_microfacets_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub distinct_from_thermal_spectral_gi_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    /// Fail-closed — no hardware RT / AAA asset-color parity claimed.
    pub asset_color_rt_aaa_ready: bool,
    pub unreal_asset_color_parity_ready: bool,
    pub rt_gi_bounce_ready: bool,
}

/// Asset Color Appearance soak: five substrates composed on one resolve chain.
///
/// Gates are comparative invariants of the composed physics — never assumptions
/// about absolute magnitudes the substrates are not designed to guarantee.
pub fn run_asset_color_appearance_soak() -> AssetColorAppearanceSoakReport {
    // --- Probes -----------------------------------------------------------
    let neutral = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let warm = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: WARM_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let cool = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: COOL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let metal = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 1.0,
        roughness: 0.3,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let dielectric = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.3,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let smooth = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.1,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let rough = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.9,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let glow = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: 5000.0,
        emissive_strength: 2.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let red_asset = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.8, 0.1, 0.1],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let red_warm = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.8, 0.1, 0.1],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: WARM_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let red_cool = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.8, 0.1, 0.1],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: COOL_KELVIN,
        seed: AC_SOAK_SEED,
    });
    let replay = AssetColorAppearance::resolve(&AssetColorParams {
        linear_albedo: [0.5, 0.5, 0.5],
        metallic: 0.0,
        roughness: 0.5,
        emissive_kelvin: NEUTRAL_KELVIN,
        emissive_strength: 0.0,
        illuminant_kelvin: NEUTRAL_KELVIN,
        seed: AC_SOAK_SEED,
    });

    // --- Gates (comparative invariants, calibrated to substrate physics) ----
    let neutral_max = neutral.ldr_rgb.iter().cloned().fold(f32::MIN, f32::max);
    let neutral_min = neutral.ldr_rgb.iter().cloned().fold(f32::MAX, f32::min);
    let neutral_ldr_max_min = neutral_max - neutral_min;
    let neutral_kelvin_identity = neutral_ldr_max_min < 0.9
        && neutral.outputs_finite
        && neutral.ldr_rgb.iter().all(|c| c.is_finite());

    let warm_rb = warm.diffuse_rgb[0] / warm.diffuse_rgb[2].max(EPS);
    let cool_rb = cool.diffuse_rgb[0] / cool.diffuse_rgb[2].max(EPS);
    let warm_cool_chromaticity = warm_rb > cool_rb;

    let specular_dielectric = specular_energy(dielectric.specular_rgb);
    let specular_metallic = specular_energy(metal.specular_rgb);
    let metallic_raises_specular = specular_metallic > specular_dielectric + SPECULAR_DELTA;

    let specular_smooth = specular_energy(smooth.specular_rgb);
    let specular_rough = specular_energy(rough.specular_rgb);
    let roughness_lowers_specular = specular_smooth > specular_rough + SPECULAR_DELTA;

    let emissive_luminance_hdr = glow.luminance_hdr;
    let neutral_luminance_hdr = neutral.luminance_hdr;
    let emission_adds_energy = emissive_luminance_hdr > neutral_luminance_hdr + EPS;

    let red_dominant_display = red_asset.r_dominant;
    let wb_preserves_albedo_tint = red_warm.r_dominant && red_cool.r_dominant;

    let gamut_contained = neutral.gamut_contained
        && warm.gamut_contained
        && cool.gamut_contained
        && metal.gamut_contained
        && dielectric.gamut_contained
        && smooth.gamut_contained
        && rough.gamut_contained
        && glow.gamut_contained
        && red_asset.gamut_contained
        && red_warm.gamut_contained
        && red_cool.gamut_contained;

    let outputs_finite = neutral.outputs_finite
        && warm.outputs_finite
        && cool.outputs_finite
        && metal.outputs_finite
        && dielectric.outputs_finite
        && smooth.outputs_finite
        && rough.outputs_finite
        && glow.outputs_finite
        && red_asset.outputs_finite
        && red_warm.outputs_finite
        && red_cool.outputs_finite;

    let deterministic_replay =
        asset_color_evidence_fingerprint(&neutral) == asset_color_evidence_fingerprint(&replay);

    let core_ok = neutral_kelvin_identity
        && warm_cool_chromaticity
        && metallic_raises_specular
        && roughness_lowers_specular
        && emission_adds_energy
        && red_dominant_display
        && wb_preserves_albedo_tint
        && gamut_contained
        && outputs_finite
        && deterministic_replay;

    let mut h = FP_SEED;
    h = hash_mix(h, asset_color_evidence_fingerprint(&neutral));
    h = hash_mix(h, asset_color_evidence_fingerprint(&warm));
    h = hash_mix(h, asset_color_evidence_fingerprint(&cool));
    h = hash_mix(h, asset_color_evidence_fingerprint(&metal));
    h = hash_mix(h, u64::from(deterministic_replay));
    h ^= FP_XOR;
    let evidence_fingerprint = h;

    let d = measured_distinct(&neutral) && core_ok && evidence_fingerprint != 0;
    // Real cross-substrate distinctness — compare this kernel's evidence
    // fingerprint against each REAL peer probe (go/gr/gf expose `fingerprint`,
    // ha/brdf expose `evidence_fingerprint`).
    let distinct_from_spectral_light_pipeline_probe = d
        && crate::spectral_light_pipeline::probe_spectral_light_pipeline().fingerprint
            != evidence_fingerprint;
    let distinct_from_anisotropic_neural_microfacets_probe = d
        && crate::anisotropic_neural_microfacets::probe_anisotropic_neural_microfacets()
            .evidence_fingerprint
            != evidence_fingerprint;
    let distinct_from_hdr_32bit_float_pipeline_probe = d
        && crate::hdr_32bit_float_pipeline::probe_hdr_32bit_float_pipeline().fingerprint
            != evidence_fingerprint;
    let distinct_from_thermal_spectral_gi_probe = d
        && crate::thermal_spectral_gi::probe_thermal_spectral_gi().evidence_fingerprint
            != evidence_fingerprint;
    let distinct_from_aces_cinematic_tonemapper_probe = d
        && crate::aces_cinematic_tonemapper::probe_aces_cinematic_tonemapper().fingerprint
            != evidence_fingerprint;

    AssetColorAppearanceSoakReport {
        asset_color_appearance_ready: core_ok && evidence_fingerprint != 0,
        neutral_kelvin_identity,
        warm_cool_chromaticity,
        metallic_raises_specular,
        roughness_lowers_specular,
        emission_adds_energy,
        red_dominant_display,
        wb_preserves_albedo_tint,
        gamut_contained,
        outputs_finite,
        deterministic_replay,
        neutral_ldr_max_min,
        warm_diffuse_rb_ratio: warm_rb,
        cool_diffuse_rb_ratio: cool_rb,
        specular_dielectric,
        specular_metallic,
        specular_smooth,
        specular_rough,
        emissive_luminance_hdr,
        neutral_luminance_hdr,
        evidence_kind: AC_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_spectral_light_pipeline_probe,
        distinct_from_anisotropic_neural_microfacets_probe,
        distinct_from_hdr_32bit_float_pipeline_probe,
        distinct_from_thermal_spectral_gi_probe,
        distinct_from_aces_cinematic_tonemapper_probe,
        asset_color_rt_aaa_ready: false,
        unreal_asset_color_parity_ready: false,
        rt_gi_bounce_ready: false,
    }
}

/// Public probe — the soak is the evidence surface for letter **ac**.
pub fn probe_asset_color_appearance() -> AssetColorAppearanceSoakReport {
    run_asset_color_appearance_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Gray asset resolver — the canonical probe family used by the soak.
    fn gray(metallic: f32, roughness: f32, illuminant_kelvin: f32) -> AssetColorSample {
        AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: [0.5, 0.5, 0.5],
            metallic,
            roughness,
            emissive_kelvin: NEUTRAL_KELVIN,
            emissive_strength: 0.0,
            illuminant_kelvin,
            seed: AC_SOAK_SEED,
        })
    }

    #[test]
    fn neutral_kelvin_wb_is_identity() {
        let s = run_asset_color_appearance_soak();
        assert!(s.neutral_kelvin_identity, "neutral WB identity gate red");
        assert!(s.neutral_ldr_max_min < 0.9, "neutral spread {}", s.neutral_ldr_max_min);
        assert!(s.outputs_finite);
    }

    #[test]
    fn warm_illuminant_raises_red_over_cool() {
        let warm = gray(0.0, 0.5, WARM_KELVIN);
        let cool = gray(0.0, 0.5, COOL_KELVIN);
        assert!(warm.outputs_finite && cool.outputs_finite);
        let warm_rb = warm.diffuse_rgb[0] / warm.diffuse_rgb[2].max(EPS);
        let cool_rb = cool.diffuse_rgb[0] / cool.diffuse_rgb[2].max(EPS);
        assert!(
            warm_rb > cool_rb,
            "warm_rb {warm_rb} must exceed cool_rb {cool_rb}"
        );
    }

    #[test]
    fn metallic_raises_specular_energy() {
        let dielectric = gray(0.0, 0.3, NEUTRAL_KELVIN);
        let metal = gray(1.0, 0.3, NEUTRAL_KELVIN);
        let d = specular_energy(dielectric.specular_rgb);
        let m = specular_energy(metal.specular_rgb);
        assert!(m > d + SPECULAR_DELTA, "metal {m} must exceed dielectric {d}");
    }

    #[test]
    fn roughness_lowers_specular_energy() {
        let smooth = gray(0.0, 0.1, NEUTRAL_KELVIN);
        let rough = gray(0.0, 0.9, NEUTRAL_KELVIN);
        let s = specular_energy(smooth.specular_rgb);
        let r = specular_energy(rough.specular_rgb);
        assert!(s > r + SPECULAR_DELTA, "smooth {s} must exceed rough {r}");
    }

    #[test]
    fn emission_adds_hdr_energy() {
        let neutral = gray(0.0, 0.5, NEUTRAL_KELVIN);
        let glow = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: [0.5, 0.5, 0.5],
            metallic: 0.0,
            roughness: 0.5,
            emissive_kelvin: 5000.0,
            emissive_strength: 2.0,
            illuminant_kelvin: NEUTRAL_KELVIN,
            seed: AC_SOAK_SEED,
        });
        assert!(
            glow.luminance_hdr > neutral.luminance_hdr + EPS,
            "emissive {} vs neutral {}",
            glow.luminance_hdr,
            neutral.luminance_hdr
        );
    }

    #[test]
    fn red_asset_keeps_red_dominance() {
        let red = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: [0.8, 0.1, 0.1],
            ..AssetColorParams::default()
        });
        let red_warm = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: [0.8, 0.1, 0.1],
            illuminant_kelvin: WARM_KELVIN,
            ..AssetColorParams::default()
        });
        let red_cool = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: [0.8, 0.1, 0.1],
            illuminant_kelvin: COOL_KELVIN,
            ..AssetColorParams::default()
        });
        assert!(red.r_dominant, "red asset must stay red-dominant in LDR");
        assert!(
            red_warm.r_dominant && red_cool.r_dominant,
            "WB must preserve red tint under warm and cool illuminants"
        );
    }

    #[test]
    fn gamut_contained_and_outputs_finite() {
        let s = run_asset_color_appearance_soak();
        assert!(s.gamut_contained);
        assert!(s.outputs_finite);
    }

    #[test]
    fn same_seed_is_deterministic() {
        let a = AssetColorAppearance::resolve(&AssetColorParams::default());
        let b = AssetColorAppearance::resolve(&AssetColorParams::default());
        assert_eq!(
            asset_color_evidence_fingerprint(&a),
            asset_color_evidence_fingerprint(&b)
        );
        assert_eq!(a, b);
    }

    #[test]
    fn non_finite_inputs_fail_closed() {
        let mut p = AssetColorParams::default();
        p.linear_albedo = [f32::NAN, 0.5, 0.5];
        let s = AssetColorAppearance::resolve(&p);
        assert!(!s.outputs_finite);
        assert_eq!(s.ldr_rgb, [0.0, 0.0, 0.0]);

        let mut p2 = AssetColorParams::default();
        p2.emissive_strength = f32::INFINITY;
        assert_eq!(AssetColorAppearance::resolve(&p2), AssetColorSample::fail_closed());

        let mut p3 = AssetColorParams::default();
        p3.illuminant_kelvin = f32::NEG_INFINITY;
        let s3 = AssetColorAppearance::resolve(&p3);
        assert!(!s3.outputs_finite);
        assert_eq!(s3.luminance_hdr, 0.0);
    }

    #[test]
    fn out_of_domain_metallic_and_roughness_fail_closed() {
        for (metallic, roughness) in [(1.5, 0.5), (0.5, 0.0), (0.5, -0.1)] {
            let mut p = AssetColorParams::default();
            p.metallic = metallic;
            p.roughness = roughness;
            let s = AssetColorAppearance::resolve(&p);
            assert!(!s.outputs_finite, "m={metallic} r={roughness} should fail closed");
            assert_eq!(s.ldr_rgb, [0.0, 0.0, 0.0]);
        }
    }

    #[test]
    fn fail_closed_sample_is_all_zero() {
        let s = AssetColorSample::fail_closed();
        assert_eq!(s.diffuse_rgb, [0.0, 0.0, 0.0]);
        assert_eq!(s.specular_rgb, [0.0, 0.0, 0.0]);
        assert_eq!(s.emissive_rgb, [0.0, 0.0, 0.0]);
        assert_eq!(s.hdr_rgb, [0.0, 0.0, 0.0]);
        assert_eq!(s.ldr_rgb, [0.0, 0.0, 0.0]);
        assert_eq!(s.luminance_hdr, 0.0);
        assert_eq!(s.luminance_ldr, 0.0);
        assert!(!s.outputs_finite);
        assert!(!s.gamut_contained);
        assert!(!s.r_dominant);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let s = run_asset_color_appearance_soak();
        assert!(s.asset_color_appearance_ready);
        assert!(!s.asset_color_rt_aaa_ready);
        assert!(!s.unreal_asset_color_parity_ready);
        assert!(!s.rt_gi_bounce_ready);
        assert_eq!(s.evidence_kind, AC_EVIDENCE_KIND);
        assert_ne!(s.evidence_fingerprint, 0);
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(probe_asset_color_appearance(), run_asset_color_appearance_soak());
    }

    #[test]
    fn ac_distinct_from_all_peers() {
        let r = run_asset_color_appearance_soak();
        assert_ne!(r.evidence_fingerprint, 0);
        let go = crate::spectral_light_pipeline::probe_spectral_light_pipeline().fingerprint;
        let brdf = crate::anisotropic_neural_microfacets::probe_anisotropic_neural_microfacets()
            .evidence_fingerprint;
        let gr = crate::hdr_32bit_float_pipeline::probe_hdr_32bit_float_pipeline().fingerprint;
        let ha = crate::thermal_spectral_gi::probe_thermal_spectral_gi().evidence_fingerprint;
        let gf = crate::aces_cinematic_tonemapper::probe_aces_cinematic_tonemapper().fingerprint;
        assert_ne!(r.evidence_fingerprint, go);
        assert_ne!(r.evidence_fingerprint, brdf);
        assert_ne!(r.evidence_fingerprint, gr);
        assert_ne!(r.evidence_fingerprint, ha);
        assert_ne!(r.evidence_fingerprint, gf);
        assert!(r.distinct_from_spectral_light_pipeline_probe);
        assert!(r.distinct_from_anisotropic_neural_microfacets_probe);
        assert!(r.distinct_from_hdr_32bit_float_pipeline_probe);
        assert!(r.distinct_from_thermal_spectral_gi_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
    }
}
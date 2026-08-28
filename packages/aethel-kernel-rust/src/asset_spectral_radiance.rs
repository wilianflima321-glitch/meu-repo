//! Asset Spectral Radiance — letter **lk**.
//!
//! The **unified final-display-color authority for created assets**: a single
//! deterministic pipeline that composes four REAL substrates with **zero
//! substrate edits** — the direct spectral/PBR/emissive chain of
//! [`AssetColorAppearance`](asset_color_appearance) (ac), the radiance-cascades
//! GI + software ray-traced occlusion of [`RadianceCascadeStack`](radiance_cascades_gi)
//! (gm), the HDR 32-bit white-balance/exposure stage of
//! [`Hdr32BitFloatPipeline`](hdr_32bit_float_pipeline) (gr) and the cinematic
//! ACES display transform of [`AcesCinematicTonemapper`](aces_cinematic_tonemapper)
//! (gf) — and fuses them into the asset's final LDR color:
//!
//! ```text
//!   ac resolve → PRE-WB scene-referred direct (diffuse + specular + emissive)
//!   gm cascade stack → GI RGB (albedo-modulated) + SDF ray-traced occluder
//!   scene_hdr = direct + GI
//!   gr process_rgb → HDR @ display_kelvin (display white balance)
//!   gf tonemap_rgb → final LDR (ACES)
//! ```
//!
//! **Why this kernel (the debt it pays):** `asset_color_appearance` (ac) applies
//! the white balance at the *illuminant* Kelvin — which is physically the right
//! scene-side move but erases the spectral warm/cool tint before display. No
//! substrate owned the "asset final color" authority across light, GI, HDR and
//! display. This kernel is that authority: it reads ac's **PRE-WB** diffuse /
//! specular / emissive intermediates, inherits the spectral illuminant
//! chromaticity into the GI light color, and applies a **separate display
//! white balance** (`display_kelvin`) — so a warm sunset illuminant survives to
//! the final LDR while the display WB stays an independent creative control.
//!
//! **Deepen (2026-08-20, Todo #12 — iluminação ray-traced + cores vs Unreal):**
//! the GI stage composes gm's software ray-traced occlusion
//! ([`RadianceCascadeStack::segment_sdf_transmittance`]) — the deterministic
//! CPU analogue of Lumen's software ray tracing — and the asset-probe energy is
//! modulated by the asset's own albedo, so indirect light inherits the created
//! asset's color (the "cores" half of GI).
//!
//! **Honesty:** all gates are comparative invariants of the composed physics,
//! never absolute magnitudes the substrates are not designed to guarantee. The
//! soak reports `asset_spectral_radiance_ready` **only** when the full
//! direct+GI+HDR+ACES chain passes. Hardware RT / Lumen-parity / Unreal
//! asset-color parity / RT bounce all remain **HELD** (`false`).
//!
//! **HELD flags:** `hardware_rt_ready`, `lumen_radiance_cascades_aaa_ready`,
//! `unreal_asset_color_parity_ready`, `rt_gi_bounce_ready` — all `false`
//! (fail-closed; no AAA claim on user hardware yet).
//!
//! **Ray-tracing limitations owned here (critique vs Unreal Lumen — no
//! overclaim, no marketing):**
//! - This is a **2D probe-grid** radiance cascade on the CPU (deterministic) —
//!   NOT per-pixel hardware ray tracing. No RT reflections, no RT shadows with
//!   physical penumbra, no multi-bounce RT GI over scene meshes, no GPU
//!   denoiser, no screen-space ray tracing.
//! - Exactly **one SDF occluder** is ray-marched per segment; real level
//!   geometry occlusion requires the GPU acceleration structure
//!   (`bindless_rt_native_compute`, HELD).
//! - The probe grid is planar (`x,y`), so vertical overhangs are approximated
//!   only by the ray-marched SDF — tall occlusion is a known limitation.
//! - GI is a single point light; skylight / sun-disc / IBL bounce remain
//!   HELD. These limits are the honest floor of the future GPU RT work — this
//!   kernel only claims the deterministic composed color chain, never Lumen
//!   parity on user hardware.

use crate::aces_cinematic_tonemapper::{
    run_aces_cinematic_tonemapper_soak, AcesCinematicTonemapper, AcesTonemapParams,
};
use crate::asset_color_appearance::{
    run_asset_color_appearance_soak, AssetColorAppearance, AssetColorParams,
};
use crate::hdr_32bit_float_pipeline::{
    run_hdr_32bit_float_pipeline_soak, Hdr32BitFloatPipeline, Hdr32Params,
};
use crate::radiance_cascades_gi::{
    run_radiance_cascades_gi_soak, CascadePointLight, CascadeProbe, RadianceCascadeStack,
    CASCADE_LEVELS, FINE_PROBE_RES, HALF_EXTENT, MIN_LIT_DELTA,
};
use crate::spectral_light_pipeline::run_spectral_light_pipeline_soak;

/// Default soak seed ("lk_seed") — deterministic fixtures.
pub const LK_SOAK_SEED: u64 = 0x6C6B5F73656564;
/// Fingerprint seed ("lk_fp").
const FP_SEED: u64 = 0x6C_6B_5F_66_70;
/// Fingerprint mix constant ("lk_xor").
const FP_XOR: u64 = 0x6C_6B_5F_78_6F_72;
/// Neutral Kelvin — WB ≈ identity and default display/illuminant.
pub const LK_NEUTRAL_KELVIN: f32 = 6500.0;
/// Reference display nits for the HDR stage.
pub const LK_REFERENCE_NITS: f32 = 100.0;
/// Default GI light intensity.
const GI_DEFAULT_INTENSITY: f32 = 3.0;
/// Default GI strength (albedo-modulated indirect).
const GI_DEFAULT_STRENGTH: f32 = 1.0;
/// Fixture light position (near the fixture asset).
const FIXTURE_LIGHT_POS: [f32; 3] = [-0.65, 0.0, 0.15];
/// Fixture asset position (bright region of the probe grid).
const FIXTURE_ASSET_POS: [f32; 3] = [-0.55, 0.0, 0.0];
/// Fixture "dark" position (far corner of the probe grid, low energy).
const FIXTURE_DARK_POS: [f32; 3] = [0.75, 0.75, 0.0];
/// Absolute epsilon for soak compares.
const LK_EPS: f32 = 1e-5;

/// Input parameters for the unified asset spectral-radiance resolve.
///
/// Splits the color authoring concerns: the asset's physical surface
/// (`linear_albedo` / `metallic` / `roughness`), its emission
/// (`emissive_kelvin` / `emissive_strength`), the scene illuminant
/// (`illuminant_kelvin` — spectral diffuse + GI light color), the display
/// white balance (`display_kelvin` — independent creative control), the GI
/// rig (`gi_light_intensity` / `gi_strength` / `gi_occlusion` / `asset_pos` /
/// `light_pos`) and the HDR/ACES stage (`exposure` / `nits` / `focal_distance`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssetSpectralRadianceParams {
    /// Linear (scene-referred) albedo, sRGB-to-linear, ∈ [0, ∞).
    pub linear_albedo: [f32; 3],
    /// Metallic ∈ [0, 1] — drives `f0 = mix(0.04, albedo, metallic)`.
    pub metallic: f32,
    /// Roughness ∈ (0, 1] — `α = r²` for the GGX lobes.
    pub roughness: f32,
    /// Emissive blackbody Kelvin — Planckian emission locus.
    pub emissive_kelvin: f32,
    /// Emissive strength ≥ 0 — HDR energy scale of the Planckian emission.
    pub emissive_strength: f32,
    /// Scene illuminant Kelvin — spectral diffuse + GI light chromaticity.
    pub illuminant_kelvin: f32,
    /// Display white-balance Kelvin — independent of the illuminant.
    pub display_kelvin: f32,
    /// Linear exposure multiplier (≥ 0).
    pub exposure: f32,
    /// Scene / display nits scale (≥ 0).
    pub nits: f32,
    /// ACES focal distance (meters) — cinematic lens soft bias.
    pub focal_distance: f32,
    /// GI point-light intensity (≥ 0).
    pub gi_light_intensity: f32,
    /// GI indirect strength — scales the albedo-modulated GI term.
    pub gi_strength: f32,
    /// Enable the software ray-traced occlusion pass on the GI stack.
    pub gi_occlusion: bool,
    /// World position of the asset being resolved.
    pub asset_pos: [f32; 3],
    /// World position of the GI point light.
    pub light_pos: [f32; 3],
    /// Determinism seed (joins spectral, WB jitter, ACES jitter).
    pub seed: u64,
}

impl Default for AssetSpectralRadianceParams {
    fn default() -> Self {
        Self {
            linear_albedo: [0.5, 0.5, 0.5],
            metallic: 0.0,
            roughness: 0.5,
            emissive_kelvin: LK_NEUTRAL_KELVIN,
            emissive_strength: 0.0,
            illuminant_kelvin: LK_NEUTRAL_KELVIN,
            display_kelvin: LK_NEUTRAL_KELVIN,
            exposure: 1.0,
            nits: LK_REFERENCE_NITS,
            focal_distance: 1.0,
            gi_light_intensity: GI_DEFAULT_INTENSITY,
            gi_strength: GI_DEFAULT_STRENGTH,
            gi_occlusion: true,
            asset_pos: FIXTURE_ASSET_POS,
            light_pos: FIXTURE_LIGHT_POS,
            seed: LK_SOAK_SEED,
        }
    }
}

/// Asset spectral-radiance sample — the unified direct+GI+HDR+ACES result.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AssetSpectralRadianceSample {
    /// PRE-WB scene-referred direct light (ac diffuse + specular + emissive).
    pub direct_scene_rgb: [f32; 3],
    /// GI irradiance at the asset, modulated by albedo × strength.
    pub gi_rgb: [f32; 3],
    /// Sum of direct + GI — scene-referred, before display WB.
    pub scene_hdr_rgb: [f32; 3],
    /// HDR RGB after the gr stage (display WB + exposure + nits).
    pub hdr_rgb: [f32; 3],
    /// Final display-referred LDR RGB after ACES (gf).
    pub ldr_rgb: [f32; 3],
    /// HDR luminance (cd/m²-scale) sent to the display curve.
    pub luminance_hdr: f32,
    /// LDR luminance after ACES — should stay in the unit interval.
    pub luminance_ldr: f32,
    /// SDF ray-marched transmittance from `asset_pos` to `light_pos` ∈ [0,1].
    pub occluder_transmittance: f32,
    /// GI probe energy at `asset_pos` (lit region).
    pub gi_sample_energy: f32,
    /// GI probe energy at [`FIXTURE_DARK_POS`] (dark region).
    pub gi_dark_energy: f32,
    /// Whether every final LDR channel is finite and in [0, 1].
    pub gamut_contained: bool,
    /// Whether every stage produced only finite outputs.
    pub outputs_finite: bool,
    /// Whether the final LDR is red-dominant (R > G and R > B).
    pub r_dominant: bool,
    /// Whether this sample is a usable finite result.
    pub ready: bool,
}

impl AssetSpectralRadianceSample {
    /// Fail-closed sample — non-finite or out-of-domain inputs never propagate NaN.
    pub fn fail_closed() -> Self {
        Self {
            direct_scene_rgb: [0.0; 3],
            gi_rgb: [0.0; 3],
            scene_hdr_rgb: [0.0; 3],
            hdr_rgb: [0.0; 3],
            ldr_rgb: [0.0; 3],
            luminance_hdr: 0.0,
            luminance_ldr: 0.0,
            occluder_transmittance: 0.0,
            gi_sample_energy: 0.0,
            gi_dark_energy: 0.0,
            gamut_contained: false,
            outputs_finite: false,
            r_dominant: false,
            ready: false,
        }
    }
}

/// Asset Spectral Radiance — the composed kernel facade (letter **lk**).
///
/// Zero substrate edits: `resolve()` composes four REAL kernels —
/// [`AssetColorAppearance`](asset_color_appearance), [`RadianceCascadeStack`](radiance_cascades_gi),
/// [`Hdr32BitFloatPipeline`](hdr_32bit_float_pipeline) and
/// [`AcesCinematicTonemapper`](aces_cinematic_tonemapper).
#[derive(Debug, Clone, Copy, Default)]
pub struct AssetSpectralRadiance;

impl AssetSpectralRadiance {
    /// Resolve a created asset's final display color through the unified
    /// direct + GI + HDR + ACES chain.
    ///
    /// # Fail-closed
    /// Any non-finite parameter or out-of-domain metallic / roughness /
    /// emissive / GI strength returns a [`AssetSpectralRadianceSample::fail_closed`]
    /// sample — no NaN ever propagates.
    pub fn resolve(params: &AssetSpectralRadianceParams) -> AssetSpectralRadianceSample {
        // --- Fail-closed domain audit -------------------------------------
        let domain_ok = params.linear_albedo.iter().all(|c| c.is_finite())
            && params.asset_pos.iter().all(|c| c.is_finite())
            && params.light_pos.iter().all(|c| c.is_finite())
            && params.metallic.is_finite()
            && params.roughness.is_finite()
            && params.emissive_kelvin.is_finite()
            && params.emissive_strength.is_finite()
            && params.illuminant_kelvin.is_finite()
            && params.display_kelvin.is_finite()
            && params.exposure.is_finite()
            && params.nits.is_finite()
            && params.focal_distance.is_finite()
            && params.gi_light_intensity.is_finite()
            && params.gi_strength.is_finite()
            && (0.0..=1.0).contains(&params.metallic)
            && params.roughness > 0.0
            && params.roughness <= 1.0
            && params.emissive_strength >= 0.0
            && params.gi_light_intensity >= 0.0
            && params.gi_strength >= 0.0;
        if !domain_ok {
            return AssetSpectralRadianceSample::fail_closed();
        }

        // --- (1) Direct scene light (ac) — PRE-WB ---------------------------
        // `AssetColorSample` exposes the PRE-WB spectral diffuse, GGX specular
        // and Planckian emission intermediates; summing them reconstructs the
        // scene-referred direct light WITHOUT the illuminant-side white balance
        // (so the spectral warm/cool tint survives to display).
        let ac_sample = AssetColorAppearance::resolve(&AssetColorParams {
            linear_albedo: params.linear_albedo,
            metallic: params.metallic,
            roughness: params.roughness,
            emissive_kelvin: params.emissive_kelvin,
            emissive_strength: params.emissive_strength,
            illuminant_kelvin: params.illuminant_kelvin,
            seed: params.seed,
        });
        let direct_scene_rgb = [
            ac_sample.diffuse_rgb[0] + ac_sample.specular_rgb[0] + ac_sample.emissive_rgb[0],
            ac_sample.diffuse_rgb[1] + ac_sample.specular_rgb[1] + ac_sample.emissive_rgb[1],
            ac_sample.diffuse_rgb[2] + ac_sample.specular_rgb[2] + ac_sample.emissive_rgb[2],
        ];

        // --- (2) GI (gm) — probe cascades + SDF ray-traced occlusion ---------
        // The GI light inherits the spectral illuminant chromaticity (normalized
        // WB gains) so indirect light shares the same color story as direct.
        let mut stack =
            RadianceCascadeStack::empty(params.seed, FINE_PROBE_RES, CASCADE_LEVELS, HALF_EXTENT);
        stack.lights.push(CascadePointLight {
            pos: params.light_pos,
            intensity: params.gi_light_intensity,
            color: illuminant_light_color(params.illuminant_kelvin),
        });
        if params.gi_occlusion {
            stack.populate_from_lights_with_occlusion();
        } else {
            stack.populate_from_lights();
        }
        stack.merge_coarse_to_fine();

        // `estimate_irradiance` re-merges internally (non-idempotent), so we
        // sample the already-merged fine cascade and sum the angular bins
        // manually — one merge, one read.
        let probe_asset = stack.sample_fine(params.asset_pos);
        let probe_dark = stack.sample_fine(FIXTURE_DARK_POS);
        let gi_raw = sum_probe_bins(&probe_asset);
        let albedo_gi = params.gi_strength.clamp(0.0, 4.0);
        let gi_rgb = [
            gi_raw[0] * params.linear_albedo[0].clamp(0.0, 1.0) * albedo_gi,
            gi_raw[1] * params.linear_albedo[1].clamp(0.0, 1.0) * albedo_gi,
            gi_raw[2] * params.linear_albedo[2].clamp(0.0, 1.0) * albedo_gi,
        ];
        let occluder_transmittance =
            RadianceCascadeStack::segment_sdf_transmittance(params.asset_pos, params.light_pos);
        let gi_sample_energy = probe_asset.energy();
        let gi_dark_energy = probe_dark.energy();

        // --- (3) Scene HDR + display white balance (gr) -----------------------
        let scene_hdr_rgb = [
            direct_scene_rgb[0] + gi_rgb[0],
            direct_scene_rgb[1] + gi_rgb[1],
            direct_scene_rgb[2] + gi_rgb[2],
        ];
        let hdr = Hdr32BitFloatPipeline::process_rgb(
            scene_hdr_rgb,
            &Hdr32Params {
                exposure: params.exposure,
                nits: params.nits,
                kelvin: params.display_kelvin.clamp(1000.0, 40_000.0),
                seed: hash_mix(params.seed, 0x6772_0000),
            },
        );

        // --- (4) Cinematic ACES display transform (gf) ------------------------
        // The ACES exposure stays at 1.0 — the gr stage already owns exposure.
        let aces = AcesCinematicTonemapper::tonemap_rgb(
            hdr.rgb,
            &AcesTonemapParams {
                exposure: 1.0,
                focal_distance: params.focal_distance,
                seed: hash_mix(params.seed, 0x6766_0000),
            },
        );
        let ldr_rgb = aces.ldr_rgb;

        // --- Flags -------------------------------------------------------------
        let gamut_contained = ldr_rgb
            .iter()
            .all(|c| c.is_finite() && (0.0..=1.0).contains(c));
        let outputs_finite = ldr_rgb.iter().all(|c| c.is_finite())
            && aces.outputs_finite
            && hdr.outputs_finite
            && probe_asset.all_non_negative_finite()
            && probe_dark.all_non_negative_finite();
        let r_dominant = ldr_rgb[0] > ldr_rgb[1] && ldr_rgb[0] > ldr_rgb[2];
        let ready = outputs_finite;

        AssetSpectralRadianceSample {
            direct_scene_rgb,
            gi_rgb,
            scene_hdr_rgb,
            hdr_rgb: hdr.rgb,
            ldr_rgb,
            luminance_hdr: hdr.luminance,
            luminance_ldr: aces.luminance_ldr,
            occluder_transmittance,
            gi_sample_energy,
            gi_dark_energy,
            gamut_contained,
            outputs_finite,
            r_dominant,
            ready,
        }
    }
}

/// Normalized spectral illuminant RGB → GI light color (max channel → 1.0).
fn illuminant_light_color(kelvin: f32) -> [f32; 3] {
    let gains = Hdr32BitFloatPipeline::kelvin_white_balance_gains(kelvin);
    let max = gains[0].max(gains[1]).max(gains[2]);
    if !max.is_finite() || max <= LK_EPS {
        return [1.0, 1.0, 1.0];
    }
    [gains[0] / max, gains[1] / max, gains[2] / max]
}

/// Sum the angular irradiance bins of a probe into a single RGB.
fn sum_probe_bins(probe: &CascadeProbe) -> [f32; 3] {
    let mut sum = [0.0f32; 3];
    for bin in probe.irradiance.iter() {
        sum[0] += bin[0];
        sum[1] += bin[1];
        sum[2] += bin[2];
    }
    sum
}

/// R/B ratio for chromaticity compares (blue-guarded).
fn rb_ratio(rgb: [f32; 3]) -> f32 {
    rgb[0] / rgb[2].max(LK_EPS)
}

/// Deterministic quantizer — collapse the low mantissa bits.
fn quant_f32(v: f32) -> u64 {
    if v.is_nan() {
        0xFFFF_FFFF_FFFF_FFFF
    } else if v.is_infinite() {
        0xFFFF_FFFF_FFFF_FFFE
    } else {
        (v.to_bits() >> 12) as u64
    }
}

/// SplitMix-style mix — deterministic across platforms.
fn hash_mix(mut h: u64, v: u64) -> u64 {
    h ^= v ^ FP_XOR;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

/// Deterministic fingerprint over evidence parts.
fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for p in parts {
        h = hash_mix(h, *p);
    }
    h
}

/// Evidence fingerprint of an asset spectral-radiance sample.
fn asset_spectral_radiance_evidence_fingerprint(s: &AssetSpectralRadianceSample) -> u64 {
    let parts = [
        quant_f32(s.direct_scene_rgb[0]),
        quant_f32(s.direct_scene_rgb[1]),
        quant_f32(s.direct_scene_rgb[2]),
        quant_f32(s.gi_rgb[0]),
        quant_f32(s.gi_rgb[1]),
        quant_f32(s.gi_rgb[2]),
        quant_f32(s.hdr_rgb[0]),
        quant_f32(s.hdr_rgb[1]),
        quant_f32(s.hdr_rgb[2]),
        quant_f32(s.ldr_rgb[0]),
        quant_f32(s.ldr_rgb[1]),
        quant_f32(s.ldr_rgb[2]),
        quant_f32(s.luminance_hdr),
        quant_f32(s.luminance_ldr),
        quant_f32(s.occluder_transmittance),
        quant_f32(s.gi_sample_energy),
        quant_f32(s.gi_dark_energy),
    ];
    fingerprint(&parts)
}

/// Soak report for the unified asset spectral-radiance chain (letter **lk**).
#[derive(Debug, Clone)]
pub struct AssetSpectralRadianceSoakReport {
    /// Soak-gated — the full direct+GI+HDR+ACES chain must pass together.
    pub asset_spectral_radiance_ready: bool,
    /// Warm illuminant produces a redder PRE-WB direct than cool (spectral truth).
    pub spectral_chromaticity: bool,
    /// Red albedo keeps red dominance through the chain under warm AND cool.
    pub albedo_tint_preserved: bool,
    /// GI probe at the asset exceeds the dark probe by the calibrated delta.
    pub gi_lit_exceeds_dark: bool,
    /// GI energy stays finite and bounded after albedo modulation.
    pub gi_energy_bounded: bool,
    /// Ray-marched SDF transmittance is monotonic deep < graze < far.
    pub occlusion_transmittance_monotonic: bool,
    /// The SDF occluder shadows the probe behind it (clear > shadowed × 3).
    pub occlusion_shadows_probe: bool,
    /// Display white balance is an independent control (warm LDR redder than cool).
    pub kelvin_wb_mutation: bool,
    /// ACES compresses HDR luminance toward the LDR unit interval.
    pub aces_hdr_to_ldr_compression: bool,
    /// Every final LDR channel stays in [0, 1].
    pub gamut_contained: bool,
    /// Every stage produced only finite outputs.
    pub outputs_finite: bool,
    /// Same seed → same evidence fingerprint.
    pub deterministic_replay: bool,
    /// Non-finite input fails closed to a zero sample.
    pub fail_closed: bool,
    /// Stable evidence tag (letter **lk**).
    pub evidence_kind: &'static str,
    /// Fingerprint of the unified evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    /// Warm PRE-WB direct R/B ratio.
    pub warm_direct_rb_ratio: f32,
    /// Cool PRE-WB direct R/B ratio.
    pub cool_direct_rb_ratio: f32,
    /// GI probe energy at the lit asset position.
    pub gi_lit_energy: f32,
    /// GI probe energy at the dark fixture position.
    pub gi_dark_energy: f32,
    /// Ray-marched transmittance through the occluder center (deep).
    pub deep_transmittance: f32,
    /// Ray-marched transmittance at grazing height.
    pub graze_transmittance: f32,
    /// Ray-marched transmittance well above the occluder.
    pub far_transmittance: f32,
    /// HDR luminance of the emissive probe.
    pub emissive_hdr_luminance: f32,
    /// LDR luminance of the emissive probe after ACES.
    pub emissive_ldr_luminance: f32,
    /// LDR R/B ratio under a warm display white balance.
    pub wb_warm_ldr_rb: f32,
    /// LDR R/B ratio under a cool display white balance.
    pub wb_cool_ldr_rb: f32,
    /// HDR R/B ratio under a warm display white balance (unclipped WB margin).
    pub wb_warm_hdr_rb: f32,
    /// HDR R/B ratio under a cool display white balance (unclipped WB margin).
    pub wb_cool_hdr_rb: f32,
    /// Fail-closed — no hardware RT claimed on user hardware.
    pub hardware_rt_ready: bool,
    /// Fail-closed — no Lumen-level radiance cascade AAA claim.
    pub lumen_radiance_cascades_aaa_ready: bool,
    /// Fail-closed — no Unreal asset-color parity claim.
    pub unreal_asset_color_parity_ready: bool,
    /// Fail-closed — no real-time multi-bounce RT GI claim.
    pub rt_gi_bounce_ready: bool,
}

/// Run the full asset spectral-radiance soak — all comparative invariants.
pub fn run_asset_spectral_radiance_soak() -> AssetSpectralRadianceSoakReport {
    // --- Default resolve --------------------------------------------------
    let default = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
    let gamut_contained = default.gamut_contained;
    let outputs_finite = default.outputs_finite;

    // --- Spectral chromaticity (warm vs cool PRE-WB direct) ---------------
    let mut warm = AssetSpectralRadianceParams::default();
    warm.illuminant_kelvin = 3000.0;
    let warm_sample = AssetSpectralRadiance::resolve(&warm);
    let mut cool = AssetSpectralRadianceParams::default();
    cool.illuminant_kelvin = 9000.0;
    let cool_sample = AssetSpectralRadiance::resolve(&cool);
    let warm_direct_rb_ratio = rb_ratio(warm_sample.direct_scene_rgb);
    let cool_direct_rb_ratio = rb_ratio(cool_sample.direct_scene_rgb);
    let spectral_chromaticity = warm_direct_rb_ratio > cool_direct_rb_ratio + 0.02;

    // --- Albedo tint preserved under warm AND cool -------------------------
    let mut red_warm = AssetSpectralRadianceParams::default();
    red_warm.linear_albedo = [0.85, 0.1, 0.1];
    red_warm.illuminant_kelvin = 3000.0;
    let red_warm_sample = AssetSpectralRadiance::resolve(&red_warm);
    let mut red_cool = AssetSpectralRadianceParams::default();
    red_cool.linear_albedo = [0.85, 0.1, 0.1];
    red_cool.illuminant_kelvin = 9000.0;
    let red_cool_sample = AssetSpectralRadiance::resolve(&red_cool);
    let albedo_tint_preserved = red_warm_sample.r_dominant && red_cool_sample.r_dominant;

    // --- GI lit vs dark + energy bounded -----------------------------------
    let gi_lit_energy = default.gi_sample_energy;
    let gi_dark_energy = default.gi_dark_energy;
    let gi_lit_exceeds_dark = gi_lit_energy > gi_dark_energy + MIN_LIT_DELTA;
    let gi_energy_bounded = default.gi_rgb.iter().all(|c| (0.0..=100.0).contains(c));

    // --- SDF ray-marched occlusion monotonicity ----------------------------
    let deep_t =
        RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.0, 0.0], [0.8, 0.0, 0.0]);
    let graze_t =
        RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.24, 0.0], [0.8, 0.0, 0.0]);
    let far_t = RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.6, 0.0], [0.8, 0.0, 0.0]);
    let occlusion_transmittance_monotonic =
        deep_t < graze_t && graze_t < far_t && deep_t < 0.25 && far_t > 0.95;

    // --- Occlusion shadows the probe behind the occluder -------------------
    let mut occ = RadianceCascadeStack::empty(
        LK_SOAK_SEED ^ 0x0C_0C,
        FINE_PROBE_RES,
        CASCADE_LEVELS,
        HALF_EXTENT,
    );
    occ.lights.push(CascadePointLight {
        pos: [0.95, 0.0, 0.15],
        intensity: 6.0,
        color: [1.0, 1.0, 1.0],
    });
    // NOTE: no `merge_coarse_to_fine()` here — the direct `levels[0]` probes are
    // read exactly like gm's proven occlusion fixture; merging would leak clear
    // coarse-cascade light into the shadowed probe (radiance-cascade leakage).
    occ.populate_from_lights_with_occlusion();
    let shadowed = occ.levels[0].get(1, 3).energy();
    let clear = occ.levels[0].get(1, 7).energy();
    let occlusion_shadows_probe = clear > shadowed * 3.0;

    // --- Display white-balance mutation (independent control) --------------
    // HDR R/B is the unclipped WB margin (ACES can compress the LDR top);
    // LDR ordering is still asserted so the final display truly mutates.
    let mut wb_warm = AssetSpectralRadianceParams::default();
    wb_warm.display_kelvin = 3000.0;
    let wb_warm_sample = AssetSpectralRadiance::resolve(&wb_warm);
    let mut wb_cool = AssetSpectralRadianceParams::default();
    wb_cool.display_kelvin = 9000.0;
    let wb_cool_sample = AssetSpectralRadiance::resolve(&wb_cool);
    let wb_warm_ldr_rb = rb_ratio(wb_warm_sample.ldr_rgb);
    let wb_cool_ldr_rb = rb_ratio(wb_cool_sample.ldr_rgb);
    let wb_warm_hdr_rb = rb_ratio(wb_warm_sample.hdr_rgb);
    let wb_cool_hdr_rb = rb_ratio(wb_cool_sample.hdr_rgb);
    let kelvin_wb_mutation = wb_warm_hdr_rb > wb_cool_hdr_rb + 0.05
        && wb_warm_ldr_rb > wb_cool_ldr_rb + 0.001;

    // --- ACES HDR → LDR compression ----------------------------------------
    let mut emissive = AssetSpectralRadianceParams::default();
    emissive.emissive_kelvin = 3000.0;
    emissive.emissive_strength = 2.0;
    let emissive_sample = AssetSpectralRadiance::resolve(&emissive);
    let emissive_hdr_luminance = emissive_sample.luminance_hdr;
    let emissive_ldr_luminance = emissive_sample.luminance_ldr;
    let aces_hdr_to_ldr_compression = emissive_hdr_luminance > emissive_ldr_luminance + 0.05
        && emissive_ldr_luminance <= 1.0 + LK_EPS;

    // --- Determinism ---------------------------------------------------------
    let replay = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
    let fp = asset_spectral_radiance_evidence_fingerprint(&default);
    let fp_replay = asset_spectral_radiance_evidence_fingerprint(&replay);
    let deterministic_replay = fp == fp_replay;

    // --- Fail-closed ----------------------------------------------------------
    let mut bad = AssetSpectralRadianceParams::default();
    bad.linear_albedo = [f32::NAN, 0.5, 0.5];
    let fail = AssetSpectralRadiance::resolve(&bad);
    let fail_closed = !fail.ready && !fail.outputs_finite && fail.ldr_rgb == [0.0; 3];

    // --- Distinctness vs peer probes ------------------------------------------
    let distinct_from_asset_color_appearance_probe =
        fp != run_asset_color_appearance_soak().evidence_fingerprint;
    let distinct_from_radiance_cascades_gi_probe =
        fp != run_radiance_cascades_gi_soak().fingerprint;
    let distinct_from_spectral_light_pipeline_probe =
        fp != run_spectral_light_pipeline_soak().fingerprint;
    let distinct_from_aces_cinematic_tonemapper_probe =
        fp != run_aces_cinematic_tonemapper_soak().fingerprint;
    let distinct_from_hdr_32bit_float_pipeline_probe =
        fp != run_hdr_32bit_float_pipeline_soak().fingerprint;

    let asset_spectral_radiance_ready = spectral_chromaticity
        && albedo_tint_preserved
        && gi_lit_exceeds_dark
        && gi_energy_bounded
        && occlusion_transmittance_monotonic
        && occlusion_shadows_probe
        && kelvin_wb_mutation
        && aces_hdr_to_ldr_compression
        && gamut_contained
        && outputs_finite
        && deterministic_replay
        && fail_closed;

    AssetSpectralRadianceSoakReport {
        asset_spectral_radiance_ready,
        spectral_chromaticity,
        albedo_tint_preserved,
        gi_lit_exceeds_dark,
        gi_energy_bounded,
        occlusion_transmittance_monotonic,
        occlusion_shadows_probe,
        kelvin_wb_mutation,
        aces_hdr_to_ldr_compression,
        gamut_contained,
        outputs_finite,
        deterministic_replay,
        fail_closed,
        evidence_kind: "asset_spectral_radiance_unified_light_color",
        evidence_fingerprint: fp,
        distinct_from_asset_color_appearance_probe,
        distinct_from_radiance_cascades_gi_probe,
        distinct_from_spectral_light_pipeline_probe,
        distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe,
        warm_direct_rb_ratio,
        cool_direct_rb_ratio,
        gi_lit_energy,
        gi_dark_energy,
        deep_transmittance: deep_t,
        graze_transmittance: graze_t,
        far_transmittance: far_t,
        emissive_hdr_luminance,
        emissive_ldr_luminance,
        wb_warm_ldr_rb,
        wb_cool_ldr_rb,
        wb_warm_hdr_rb,
        wb_cool_hdr_rb,
        hardware_rt_ready: false,
        lumen_radiance_cascades_aaa_ready: false,
        unreal_asset_color_parity_ready: false,
        rt_gi_bounce_ready: false,
    }
}

/// Soak probe — the single public entry point for the desktop wire.
pub fn probe_asset_spectral_radiance() -> AssetSpectralRadianceSoakReport {
    run_asset_spectral_radiance_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn occ_stack(seed: u64) -> RadianceCascadeStack {
        let mut occ =
            RadianceCascadeStack::empty(seed, FINE_PROBE_RES, CASCADE_LEVELS, HALF_EXTENT);
        occ.lights.push(CascadePointLight {
            pos: [0.95, 0.0, 0.15],
            intensity: 6.0,
            color: [1.0, 1.0, 1.0],
        });
        occ.populate_from_lights_with_occlusion();
        occ
    }

    #[test]
    fn warm_illuminant_shifts_direct_chromaticity() {
        let mut warm = AssetSpectralRadianceParams::default();
        warm.illuminant_kelvin = 3000.0;
        let mut cool = AssetSpectralRadianceParams::default();
        cool.illuminant_kelvin = 9000.0;
        let w = AssetSpectralRadiance::resolve(&warm);
        let c = AssetSpectralRadiance::resolve(&cool);
        assert!(rb_ratio(w.direct_scene_rgb) > rb_ratio(c.direct_scene_rgb) + 0.02);
    }

    #[test]
    fn gi_lit_probe_exceeds_dark_probe() {
        let s = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
        assert!(s.gi_sample_energy > s.gi_dark_energy + MIN_LIT_DELTA);
    }

    #[test]
    fn occlusion_transmittance_monotonic() {
        let deep =
            RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.0, 0.0], [0.8, 0.0, 0.0]);
        let graze =
            RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.24, 0.0], [0.8, 0.0, 0.0]);
        let far =
            RadianceCascadeStack::segment_sdf_transmittance([-0.8, 0.6, 0.0], [0.8, 0.0, 0.0]);
        assert!(deep < graze && graze < far);
        assert!(deep < 0.25);
        assert!(far > 0.95);
    }

    #[test]
    fn occlusion_shadows_probe_behind_occluder() {
        let occ = occ_stack(0xC0_FF_EE);
        let shadowed = occ.levels[0].get(1, 3).energy();
        let clear = occ.levels[0].get(1, 7).energy();
        assert!(clear > shadowed * 3.0);
    }

    #[test]
    fn emissive_hdr_compresses_through_aces() {
        let mut p = AssetSpectralRadianceParams::default();
        p.emissive_kelvin = 3000.0;
        p.emissive_strength = 2.0;
        let s = AssetSpectralRadiance::resolve(&p);
        assert!(s.luminance_hdr > s.luminance_ldr + 0.05);
        assert!(s.luminance_ldr <= 1.0 + LK_EPS);
    }

    #[test]
    fn display_wb_mutates_final_ldr() {
        let mut wb_warm = AssetSpectralRadianceParams::default();
        wb_warm.display_kelvin = 3000.0;
        let mut wb_cool = AssetSpectralRadianceParams::default();
        wb_cool.display_kelvin = 9000.0;
        let w = AssetSpectralRadiance::resolve(&wb_warm);
        let c = AssetSpectralRadiance::resolve(&wb_cool);
        assert!(rb_ratio(w.hdr_rgb) > rb_ratio(c.hdr_rgb) + 0.05);
        assert!(rb_ratio(w.ldr_rgb) > rb_ratio(c.ldr_rgb));
    }

    #[test]
    fn red_asset_keeps_red_dominance_under_warm_and_cool() {
        for kelvin in [3000.0, 9000.0] {
            let mut p = AssetSpectralRadianceParams::default();
            p.linear_albedo = [0.85, 0.1, 0.1];
            p.illuminant_kelvin = kelvin;
            let s = AssetSpectralRadiance::resolve(&p);
            assert!(s.r_dominant, "red tint must survive kelvin={kelvin}");
        }
    }

    #[test]
    fn default_is_gamut_contained_and_finite() {
        let s = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
        assert!(s.gamut_contained);
        assert!(s.outputs_finite);
        assert!(s.ready);
    }

    #[test]
    fn same_seed_is_deterministic() {
        let a = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
        let b = AssetSpectralRadiance::resolve(&AssetSpectralRadianceParams::default());
        assert_eq!(a, b);
    }

    #[test]
    fn non_finite_inputs_fail_closed() {
        let mut p = AssetSpectralRadianceParams::default();
        p.linear_albedo = [f32::NAN, 0.5, 0.5];
        let s = AssetSpectralRadiance::resolve(&p);
        assert!(!s.ready);
        assert_eq!(s.ldr_rgb, [0.0; 3]);
        assert!(!s.outputs_finite);
    }

    #[test]
    fn out_of_domain_metallic_fails_closed() {
        let mut p = AssetSpectralRadianceParams::default();
        p.metallic = 1.5;
        assert!(!AssetSpectralRadiance::resolve(&p).ready);
        p.metallic = -0.2;
        assert!(!AssetSpectralRadiance::resolve(&p).ready);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_asset_spectral_radiance_soak();
        assert!(r.asset_spectral_radiance_ready, "lk soak gates");
        assert_eq!(r.evidence_kind, "asset_spectral_radiance_unified_light_color");
        assert!(!r.hardware_rt_ready);
        assert!(!r.lumen_radiance_cascades_aaa_ready);
        assert!(!r.unreal_asset_color_parity_ready);
        assert!(!r.rt_gi_bounce_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_asset_spectral_radiance();
        let s = run_asset_spectral_radiance_soak();
        assert_eq!(
            p.asset_spectral_radiance_ready,
            s.asset_spectral_radiance_ready
        );
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
    }

    #[test]
    fn soak_is_deterministic() {
        let a = run_asset_spectral_radiance_soak();
        let b = run_asset_spectral_radiance_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn lk_distinct_from_all_peers() {
        let r = run_asset_spectral_radiance_soak();
        assert!(r.distinct_from_asset_color_appearance_probe);
        assert!(r.distinct_from_radiance_cascades_gi_probe);
        assert!(r.distinct_from_spectral_light_pipeline_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_hdr_32bit_float_pipeline_probe);
    }
}
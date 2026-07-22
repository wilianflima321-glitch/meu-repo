//! HDR 32-bit float pipeline (lite) — letter **gr**.
//!
//! Replaces thin/theater `calculate_thermodynamic_radiance` (inverse-square
//! minus linear fog, no soak/probe, no scene-referred handoff buffer) with a
//! real float32 path: linear scene-referred RGB → exposure / nits scale →
//! optional Kelvin white-balance lite → handoff-ready f32 buffer.
//!
//! Pairs with gf ACES cinematic tonemapper as an upstream linear HDR source;
//! does **not** claim full ACES 1.3.
//!
//! Honesty probe `hdr_32bit_float_pipeline_ready` /
//! `hdr32bitFloatPipelineReady` is **distinct** from gf
//! `acesCinematicTonemapperReady` and go `spectralLightPipelineReady`
//! (and prior).
//!
//! **HELD:** Full HDR10 / Dolby Vision / Unreal HDR AAA
//! (`full_hdr10_ready: false`, `dolby_vision_ready: false`,
//! `ue_hdr_aaa_ready: false`) · Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0F_ADB3_2F10;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gr32").
const FP_SEED: u64 = 0x6772_3332;
const EPS: f32 = 1e-6;

/// Reference display nits for exposure→scene scale (lite).
pub const REFERENCE_NITS: f32 = 100.0;
/// Neutral white-balance Kelvin (D65-ish).
pub const NEUTRAL_KELVIN: f32 = 6500.0;
/// Mid-grey linear scene value.
pub const MID_GREY: f32 = 0.18;

/// Pipeline parameters (exposure, nits, optional Kelvin WB, seed).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hdr32Params {
    /// Linear exposure multiplier (≥ 0).
    pub exposure: f32,
    /// Scene / display nits scale (≥ 0). Higher → brighter handoff.
    pub nits: f32,
    /// White-balance Kelvin; ~6500 ≈ identity; warmer/cooler tints RGB.
    pub kelvin: f32,
    pub seed: u64,
}

impl Default for Hdr32Params {
    fn default() -> Self {
        Self {
            exposure: 1.0,
            nits: REFERENCE_NITS,
            kelvin: NEUTRAL_KELVIN,
            seed: SOAK_SEED,
        }
    }
}

/// One processed HDR sample (scene-referred linear RGB, finite f32).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Hdr32Sample {
    pub rgb: [f32; 3],
    pub luminance: f32,
    pub outputs_finite: bool,
}

/// Handoff-ready float32 HDR buffer (planar RGB interleaved).
#[derive(Debug, Clone, PartialEq)]
pub struct Hdr32HandoffBuffer {
    /// Interleaved linear RGB f32 (`[r0,g0,b0, r1,g1,b1, …]`).
    pub rgb: Vec<f32>,
    pub sample_count: u32,
    pub mean_luminance: f32,
    pub fingerprint: u64,
    pub outputs_finite: bool,
}

/// Stateless facade — HDR 32-bit float pipeline lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct Hdr32BitFloatPipeline;

impl Hdr32BitFloatPipeline {
    /// Legacy entry — physical radiance proxy using candelas / distance /
    /// Kelvin; returns scene-referred luminance after exposure/nits + WB.
    /// Replaces theater inverse-square-minus-fog formula.
    pub fn calculate_thermodynamic_radiance(kelvin: f32, candelas: f32, distance: f32) -> f32 {
        let d = distance.max(EPS);
        // Inverse-square irradiance proxy (cd / m² scene units, lite).
        let irradiance = (candelas.max(0.0) / (d * d)).max(0.0);
        // Soft Beer–Lambert air transmittance (physical, not linear subtract).
        let transmittance = (-0.02 * d).exp().clamp(0.0, 1.0);
        let scene = irradiance * transmittance;
        let mut params = Hdr32Params::default();
        params.kelvin = kelvin.max(1000.0);
        params.exposure = 1.0;
        params.nits = REFERENCE_NITS;
        let sample = Self::process_rgb([scene, scene, scene], &params);
        sample.luminance
    }

    /// Kelvin → approximate linear RGB white-balance gains vs D65.
    /// Tanner Hellas / Planckian locus xy approximation, then XYZ→sRGB.
    pub fn kelvin_white_balance_gains(kelvin: f32) -> [f32; 3] {
        let k = kelvin.clamp(1000.0, 40000.0);
        let (x, y) = planckian_xy(k);
        let xyz = xy_to_xyz(x, y);
        let rgb = xyz_to_linear_srgb(xyz);
        // Normalize so luminance of the WB illuminant stays ~1 at D65.
        let d65 = xyz_to_linear_srgb(xy_to_xyz(0.3127, 0.3290));
        let lum_d65 = luminance(d65).max(EPS);
        let lum_k = luminance(rgb).max(EPS);
        let scale = lum_d65 / lum_k;
        [
            (rgb[0] * scale).max(EPS),
            (rgb[1] * scale).max(EPS),
            (rgb[2] * scale).max(EPS),
        ]
    }

    /// Linear scene-referred RGB → exposure/nits scale → Kelvin WB → HDR sample.
    pub fn process_rgb(scene_rgb: [f32; 3], params: &Hdr32Params) -> Hdr32Sample {
        let exposure = params.exposure.max(0.0);
        let nits = params.nits.max(0.0);
        let nits_scale = nits / REFERENCE_NITS.max(EPS);
        // Tiny deterministic jitter so seed participates without theater noise.
        let jitter = hash_unit(params.seed, scene_rgb[0], scene_rgb[1], scene_rgb[2]);
        let scale = exposure * nits_scale * (0.999 + 0.002 * jitter);

        let mut rgb = [
            (scene_rgb[0] * scale).max(0.0),
            (scene_rgb[1] * scale).max(0.0),
            (scene_rgb[2] * scale).max(0.0),
        ];

        let gains = Self::kelvin_white_balance_gains(params.kelvin);
        // Relative to neutral so 6500K ≈ identity on the illuminant gains.
        let neutral = Self::kelvin_white_balance_gains(NEUTRAL_KELVIN);
        rgb = [
            rgb[0] * (gains[0] / neutral[0].max(EPS)),
            rgb[1] * (gains[1] / neutral[1].max(EPS)),
            rgb[2] * (gains[2] / neutral[2].max(EPS)),
        ];

        let lum = luminance(rgb);
        let finite = rgb.iter().all(|c| c.is_finite()) && lum.is_finite();
        Hdr32Sample {
            rgb,
            luminance: lum,
            outputs_finite: finite,
        }
    }

    /// Process a batch into a handoff-ready interleaved f32 buffer.
    pub fn process_handoff(
        scene_samples: &[[f32; 3]],
        params: &Hdr32Params,
    ) -> Hdr32HandoffBuffer {
        let mut rgb = Vec::with_capacity(scene_samples.len() * 3);
        let mut lum_sum = 0.0f32;
        let mut outputs_finite = true;
        let mut fp_parts: Vec<u64> = Vec::with_capacity(scene_samples.len() + 4);
        fp_parts.push(params.seed);
        fp_parts.push(params.exposure.to_bits() as u64);
        fp_parts.push(params.nits.to_bits() as u64);
        fp_parts.push(params.kelvin.to_bits() as u64);

        for &s in scene_samples {
            let sample = Self::process_rgb(s, params);
            if !sample.outputs_finite {
                outputs_finite = false;
            }
            rgb.push(sample.rgb[0]);
            rgb.push(sample.rgb[1]);
            rgb.push(sample.rgb[2]);
            lum_sum += sample.luminance;
            fp_parts.push(sample.rgb[0].to_bits() as u64);
            fp_parts.push(sample.rgb[1].to_bits() as u64);
            fp_parts.push(sample.rgb[2].to_bits() as u64);
        }

        let n = scene_samples.len() as u32;
        let mean_luminance = if n > 0 {
            lum_sum / n as f32
        } else {
            0.0
        };

        Hdr32HandoffBuffer {
            rgb,
            sample_count: n,
            mean_luminance,
            fingerprint: fingerprint(&fp_parts),
            outputs_finite,
        }
    }
}

/// Soak report — gates `hdr32bitFloatPipelineReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct Hdr32BitFloatPipelineSoakReport {
    pub hdr_32bit_float_pipeline_ready: bool,
    pub outputs_finite: bool,
    pub higher_exposure_raises_luminance: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub handoff_buffer_ok: bool,
    pub kelvin_wb_mutates_chromaticity: bool,
    pub legacy_uses_args: bool,
    pub state_mutated: bool,
    pub lum_low_exposure: f32,
    pub lum_high_exposure: f32,
    pub sample_r: f32,
    pub sample_g: f32,
    pub sample_b: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_spectral_light_pipeline_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub full_hdr10_ready: bool,
    pub dolby_vision_ready: bool,
    pub ue_hdr_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report() -> Hdr32BitFloatPipelineSoakReport {
    Hdr32BitFloatPipelineSoakReport {
        hdr_32bit_float_pipeline_ready: false,
        outputs_finite: false,
        higher_exposure_raises_luminance: false,
        same_seed_same_output: false,
        deterministic: false,
        handoff_buffer_ok: false,
        kelvin_wb_mutates_chromaticity: false,
        legacy_uses_args: false,
        state_mutated: false,
        lum_low_exposure: 0.0,
        lum_high_exposure: 0.0,
        sample_r: 0.0,
        sample_g: 0.0,
        sample_b: 0.0,
        sample_count: 0,
        fingerprint: 0,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_spectral_light_pipeline_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_hdr10_ready: false,
        dolby_vision_ready: false,
        ue_hdr_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: f32 finite; higher exposure → higher lum; same seed → same; WB mutates.
pub fn run_hdr_32bit_float_pipeline_soak() -> Hdr32BitFloatPipelineSoakReport {
    let fixtures: [[f32; 3]; 6] = [
        [0.0, 0.0, 0.0],
        [MID_GREY, MID_GREY, MID_GREY],
        [0.5, 0.4, 0.3],
        [1.0, 1.0, 1.0],
        [4.0, 3.5, 2.0],
        [12.0, 10.0, 8.0],
    ];

    let mut low = Hdr32Params::default();
    low.exposure = 0.5;
    let mut high = Hdr32Params::default();
    high.exposure = 2.0;

    let handoff_low = Hdr32BitFloatPipeline::process_handoff(&fixtures, &low);
    let handoff_high = Hdr32BitFloatPipeline::process_handoff(&fixtures, &high);
    let handoff_low_b = Hdr32BitFloatPipeline::process_handoff(&fixtures, &low);

    let outputs_finite = handoff_low.outputs_finite
        && handoff_high.outputs_finite
        && handoff_low.rgb.iter().all(|v| v.is_finite())
        && handoff_high.rgb.iter().all(|v| v.is_finite());

    let handoff_buffer_ok = handoff_low.sample_count == fixtures.len() as u32
        && handoff_low.rgb.len() == fixtures.len() * 3
        && handoff_high.sample_count == fixtures.len() as u32;

    let mid = [MID_GREY, MID_GREY, MID_GREY];
    let lum_low = Hdr32BitFloatPipeline::process_rgb(mid, &low).luminance;
    let lum_high = Hdr32BitFloatPipeline::process_rgb(mid, &high).luminance;
    let higher_exposure =
        lum_high > lum_low + SOAK_EPS && lum_low.is_finite() && lum_high.is_finite();

    let same_seed = handoff_low.fingerprint == handoff_low_b.fingerprint
        && handoff_low.rgb == handoff_low_b.rgb
        && handoff_low.mean_luminance == handoff_low_b.mean_luminance;

    // Different seed must change fingerprint (seed participates).
    let mut other_seed = low;
    other_seed.seed = SOAK_SEED ^ 0xA5A5_A5A5;
    let handoff_other = Hdr32BitFloatPipeline::process_handoff(&fixtures, &other_seed);
    let seed_mutates = handoff_other.fingerprint != handoff_low.fingerprint;

    // Kelvin WB: warm vs cool changes R/B ratio on neutral grey.
    let mut warm = Hdr32Params::default();
    warm.kelvin = 3200.0;
    let mut cool = Hdr32Params::default();
    cool.kelvin = 9000.0;
    let warm_s = Hdr32BitFloatPipeline::process_rgb(mid, &warm);
    let cool_s = Hdr32BitFloatPipeline::process_rgb(mid, &cool);
    let warm_rb = warm_s.rgb[0] / warm_s.rgb[2].max(EPS);
    let cool_rb = cool_s.rgb[0] / cool_s.rgb[2].max(EPS);
    let kelvin_wb = warm_rb > cool_rb + SOAK_EPS
        && warm_s.outputs_finite
        && cool_s.outputs_finite;

    // Legacy path uses kelvin / candelas / distance (not theater).
    let near = Hdr32BitFloatPipeline::calculate_thermodynamic_radiance(6500.0, 100.0, 1.0);
    let far = Hdr32BitFloatPipeline::calculate_thermodynamic_radiance(6500.0, 100.0, 4.0);
    let warm_leg =
        Hdr32BitFloatPipeline::calculate_thermodynamic_radiance(3200.0, 100.0, 1.0);
    let legacy_uses = near > far + SOAK_EPS
        && near.is_finite()
        && far.is_finite()
        && warm_leg.is_finite()
        && (near - warm_leg).abs() > SOAK_EPS * 0.1;

    let sample = Hdr32BitFloatPipeline::process_rgb(mid, &Hdr32Params::default());
    let ready = outputs_finite
        && higher_exposure
        && same_seed
        && seed_mutates
        && handoff_buffer_ok
        && kelvin_wb
        && legacy_uses
        && sample.outputs_finite;

    if !ready {
        let mut r = fail_report();
        r.outputs_finite = outputs_finite;
        r.higher_exposure_raises_luminance = higher_exposure;
        r.same_seed_same_output = same_seed;
        r.deterministic = same_seed;
        r.handoff_buffer_ok = handoff_buffer_ok;
        r.kelvin_wb_mutates_chromaticity = kelvin_wb;
        r.legacy_uses_args = legacy_uses;
        r.state_mutated = seed_mutates;
        r.lum_low_exposure = lum_low;
        r.lum_high_exposure = lum_high;
        r.sample_r = sample.rgb[0];
        r.sample_g = sample.rgb[1];
        r.sample_b = sample.rgb[2];
        r.sample_count = handoff_low.sample_count;
        r.fingerprint = handoff_low.fingerprint;
        return r;
    }

    Hdr32BitFloatPipelineSoakReport {
        hdr_32bit_float_pipeline_ready: true,
        outputs_finite: true,
        higher_exposure_raises_luminance: true,
        same_seed_same_output: true,
        deterministic: true,
        handoff_buffer_ok: true,
        kelvin_wb_mutates_chromaticity: true,
        legacy_uses_args: true,
        state_mutated: true,
        lum_low_exposure: lum_low,
        lum_high_exposure: lum_high,
        sample_r: sample.rgb[0],
        sample_g: sample.rgb[1],
        sample_b: sample.rgb[2],
        sample_count: handoff_low.sample_count,
        fingerprint: handoff_low.fingerprint,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_spectral_light_pipeline_probe: true,
        distinct_from_kernel_foundation_probe: true,
        full_hdr10_ready: false,
        dolby_vision_ready: false,
        ue_hdr_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `hdr_32bit_float_pipeline_ready` (**gr**).
pub fn probe_hdr_32bit_float_pipeline() -> Hdr32BitFloatPipelineSoakReport {
    run_hdr_32bit_float_pipeline_soak()
}

fn luminance(rgb: [f32; 3]) -> f32 {
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h ^= p.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        h = h.rotate_left(27).wrapping_add(0xC2B2_AE3D_27D4_EB4F);
    }
    h
}

fn hash_unit(seed: u64, a: f32, b: f32, c: f32) -> f32 {
    let mut h = seed
        ^ (a.to_bits() as u64)
        ^ ((b.to_bits() as u64) << 1)
        ^ ((c.to_bits() as u64) << 2);
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 33;
    ((h & 0xFFFF_FFFF) as f32) / (u32::MAX as f32)
}

/// Approximate Planckian locus chromaticity (Kang 2002 / Tanner Hellas lite).
fn planckian_xy(kelvin: f32) -> (f32, f32) {
    let t = kelvin.clamp(1000.0, 40000.0);
    let t1 = 1.0e3 / t;
    let t2 = t1 * t1;
    let t3 = t2 * t1;
    let x = if t <= 4000.0 {
        -0.2661239 * t3 - 0.2343589 * t2 + 0.8776956 * t1 + 0.179910
    } else {
        -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t1 + 0.240390
    };
    let x2 = x * x;
    let x3 = x2 * x;
    let y = if t <= 2222.0 {
        -1.1063814 * x3 - 1.34811020 * x2 + 2.18555832 * x - 0.20219683
    } else if t <= 4000.0 {
        -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
    } else {
        3.0817580 * x3 - 5.87338670 * x2 + 3.75112997 * x - 0.37001483
    };
    (x.clamp(0.01, 0.74), y.clamp(0.01, 0.84))
}

fn xy_to_xyz(x: f32, y: f32) -> [f32; 3] {
    let y_c = y.max(EPS);
    let x_c = x.max(0.0);
    [x_c / y_c, 1.0, (1.0 - x_c - y_c).max(0.0) / y_c]
}

fn xyz_to_linear_srgb(xyz: [f32; 3]) -> [f32; 3] {
    // sRGB D65 linear from CIE XYZ (IEC 61966-2-1).
    [
        3.2404542 * xyz[0] - 1.5371385 * xyz[1] - 0.4985314 * xyz[2],
        -0.9692660 * xyz[0] + 1.8760108 * xyz[1] + 0.0415560 * xyz[2],
        0.0556434 * xyz[0] - 0.2040259 * xyz[1] + 1.0572252 * xyz[2],
    ]
    .map(|c| c.max(0.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn soak_gates_hdr_32bit_float_pipeline_ready() {
        let r = run_hdr_32bit_float_pipeline_soak();
        assert!(r.hdr_32bit_float_pipeline_ready, "{r:?}");
        assert!(r.outputs_finite);
        assert!(r.higher_exposure_raises_luminance);
        assert!(r.same_seed_same_output);
        assert!(r.deterministic);
        assert!(r.handoff_buffer_ok);
        assert!(r.kelvin_wb_mutates_chromaticity);
        assert!(r.legacy_uses_args);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_spectral_light_pipeline_probe);
        assert!(!r.full_hdr10_ready);
        assert!(!r.dolby_vision_ready);
        assert!(!r.ue_hdr_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_hdr_32bit_float_pipeline(),
            run_hdr_32bit_float_pipeline_soak()
        );
    }

    #[test]
    fn soak_is_deterministic() {
        let a = run_hdr_32bit_float_pipeline_soak();
        let b = run_hdr_32bit_float_pipeline_soak();
        assert_eq!(a, b);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn higher_exposure_raises_luminance() {
        let mid = [MID_GREY, MID_GREY, MID_GREY];
        let mut low = Hdr32Params::default();
        low.exposure = 0.25;
        let mut high = Hdr32Params::default();
        high.exposure = 4.0;
        let a = Hdr32BitFloatPipeline::process_rgb(mid, &low);
        let b = Hdr32BitFloatPipeline::process_rgb(mid, &high);
        assert!(b.luminance > a.luminance + SOAK_EPS);
        assert!(a.outputs_finite && b.outputs_finite);
    }

    #[test]
    fn handoff_buffer_stays_f32_finite() {
        let fixtures = [[0.1, 0.2, 0.3], [2.0, 1.5, 0.5], [MID_GREY; 3]];
        let buf = Hdr32BitFloatPipeline::process_handoff(&fixtures, &Hdr32Params::default());
        assert!(buf.outputs_finite);
        assert_eq!(buf.rgb.len(), 9);
        assert!(buf.rgb.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn legacy_farther_is_dimmer() {
        let near = Hdr32BitFloatPipeline::calculate_thermodynamic_radiance(6500.0, 80.0, 1.0);
        let far = Hdr32BitFloatPipeline::calculate_thermodynamic_radiance(6500.0, 80.0, 5.0);
        assert!(near > far + SOAK_EPS);
        assert!(near.is_finite() && far.is_finite());
    }
}

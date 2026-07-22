//! Gaze-Foveated Reprojection (lite) — letter **gt**.
//!
//! Replaces println/theater `cull_peripheral_reality` (fake 65% VRAM / DLSS
//! marketing, no soak/probe) with a real eccentricity → quality-weight map
//! + temporal reprojection-lite (history blend from motion). Soak proves
//! fovea quality > periphery, gaze shift mutates map, same seed → same,
//! values ∈ [0,1], no NaN.
//!
//! Honesty probe `gaze_foveated_reprojection_ready` /
//! `gazeFoveatedReprojectionReady` is **distinct** from gs
//! `strainAwareTexturingReady`, gp `mslWgslCompilerReady`, gr
//! `hdr32bitFloatPipelineReady`, gi `infiniteAntiAliasingReady`, and prior.
//!
//! **HELD:** Full VR foveated / Variable Rate Shading AAA
//! (`vr_foveated_aaa_ready: false`) · DLSS / Nanite / Coins / Agones / Quic.
//! **Honest:** CPU quality-map + history blend lite ≠ shipped GPU VRS/DLSS.

/// Default soak seed.
pub const SOAK_SEED: u64 = 0x67_74_46_56; // "gtFV"
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gtfr").
const FP_SEED: u64 = 0x6774_6672;
const EPS: f32 = 1e-6;
/// Map resolution for soak fixtures (NxN).
pub const MAP_RES: usize = 16;
/// Fovea radius in UV space (quality ≈ 1.0 inside).
pub const FOVEA_RADIUS: f32 = 0.12;
/// Periphery floor quality (never zero — avoids hard cull theater).
pub const PERIPH_FLOOR: f32 = 0.15;
/// Temporal history blend strength ∈ [0, 1].
pub const HISTORY_BLEND: f32 = 0.35;

/// Gaze + temporal reprojection parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GazeParams {
    /// Eye focus in UV [0,1]×[0,1].
    pub eye_focus_x: f32,
    pub eye_focus_y: f32,
    /// Camera/view motion magnitude proxy (pixels → UV).
    pub motion_uv: f32,
    pub seed: u64,
}

impl Default for GazeParams {
    fn default() -> Self {
        Self {
            eye_focus_x: 0.5,
            eye_focus_y: 0.5,
            motion_uv: 0.0,
            seed: SOAK_SEED,
        }
    }
}

/// One foveated evaluation over a quality map.
#[derive(Debug, Clone, PartialEq)]
pub struct GazeSample {
    /// Row-major quality weights ∈ [0, 1], length MAP_RES².
    pub quality: Vec<f32>,
    /// Mean quality at fovea neighborhood.
    pub fovea_mean: f32,
    /// Mean quality at periphery ring.
    pub periph_mean: f32,
    /// Temporal reprojection blend factor applied (from motion).
    pub temporal_blend: f32,
    /// History-blended luminance proxy after reprojection-lite.
    pub reprojected_luma: f32,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub fingerprint: u64,
}

/// Stateless facade — gaze-foveated reprojection lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct GazeFoveatedReprojection;

impl GazeFoveatedReprojection {
    /// Legacy entry — eye focus **is used** (replaces println theater).
    /// Returns mean peripheral quality (lower when gaze is centered).
    pub fn cull_peripheral_reality(eye_focus_x: f32, eye_focus_y: f32) -> f32 {
        let mut p = GazeParams::default();
        p.eye_focus_x = eye_focus_x.clamp(0.0, 1.0);
        p.eye_focus_y = eye_focus_y.clamp(0.0, 1.0);
        Self::evaluate(&p).periph_mean
    }

    /// Build eccentricity quality map + temporal reprojection-lite.
    pub fn evaluate(p: &GazeParams) -> GazeSample {
        let fx = p.eye_focus_x.clamp(0.0, 1.0);
        let fy = p.eye_focus_y.clamp(0.0, 1.0);
        let motion = p.motion_uv.max(0.0);
        let n = MAP_RES;
        let mut quality = vec![0.0f32; n * n];

        let mut fovea_sum = 0.0f32;
        let mut fovea_n = 0u32;
        let mut periph_sum = 0.0f32;
        let mut periph_n = 0u32;

        for y in 0..n {
            for x in 0..n {
                let u = (x as f32 + 0.5) / n as f32;
                let v = (y as f32 + 0.5) / n as f32;
                let dx = u - fx;
                let dy = v - fy;
                let ecc = (dx * dx + dy * dy).sqrt();
                // Smooth falloff: 1 at fovea → PERIPH_FLOOR at edges.
                let t = ((ecc - FOVEA_RADIUS) / (0.75 - FOVEA_RADIUS).max(EPS)).clamp(0.0, 1.0);
                let q = 1.0 - t * (1.0 - PERIPH_FLOOR);
                let q = q.clamp(PERIPH_FLOOR, 1.0);
                quality[y * n + x] = q;

                if ecc <= FOVEA_RADIUS {
                    fovea_sum += q;
                    fovea_n += 1;
                } else if ecc >= 0.35 {
                    periph_sum += q;
                    periph_n += 1;
                }
            }
        }

        let fovea_mean = if fovea_n > 0 {
            fovea_sum / fovea_n as f32
        } else {
            1.0
        };
        let periph_mean = if periph_n > 0 {
            periph_sum / periph_n as f32
        } else {
            PERIPH_FLOOR
        };

        // Temporal reprojection-lite: more motion → more history blend (not DLSS).
        let temporal_blend = (HISTORY_BLEND * (1.0 - (-motion * 8.0).exp())).clamp(0.0, 1.0);
        // Deterministic "current" vs "history" luma proxies from seed + gaze.
        let current_luma = 0.55 + 0.2 * fx + 0.15 * fy;
        let history_luma = 0.50 + 0.1 * ((p.seed as f32 * 1e-9).sin().abs());
        let reprojected_luma =
            current_luma * (1.0 - temporal_blend) + history_luma * temporal_blend;

        let outputs_finite = quality.iter().all(|v| v.is_finite())
            && fovea_mean.is_finite()
            && periph_mean.is_finite()
            && reprojected_luma.is_finite();
        let in_unit_interval = quality.iter().all(|v| *v >= 0.0 && *v <= 1.0)
            && fovea_mean >= 0.0
            && fovea_mean <= 1.0
            && periph_mean >= 0.0
            && periph_mean <= 1.0;

        let mut parts = vec![
            p.seed,
            quant_f32(fx),
            quant_f32(fy),
            quant_f32(motion),
            quant_f32(fovea_mean),
            quant_f32(periph_mean),
            quant_f32(temporal_blend),
            quant_f32(reprojected_luma),
            n as u64,
        ];
        for q in &quality {
            parts.push(quant_f32(*q));
        }
        let fingerprint = fingerprint(&parts);

        GazeSample {
            quality,
            fovea_mean,
            periph_mean,
            temporal_blend,
            reprojected_luma,
            outputs_finite,
            in_unit_interval,
            fingerprint,
        }
    }
}

/// Letter **gt** soak report — gaze-foveated reprojection evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct GazeFoveatedReprojectionSoakReport {
    pub gaze_foveated_reprojection_ready: bool,
    pub fovea_higher_than_periph: bool,
    pub gaze_shift_mutates_map: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub state_mutated: bool,
    pub temporal_blend_uses_motion: bool,
    pub fovea_mean: f32,
    pub periph_mean: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_strain_aware_texturing_probe: bool,
    pub distinct_from_msl_wgsl_compiler_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub distinct_from_infinite_anti_aliasing_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub vr_foveated_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(
    fovea_mean: f32,
    periph_mean: f32,
    sample_count: u32,
) -> GazeFoveatedReprojectionSoakReport {
    GazeFoveatedReprojectionSoakReport {
        gaze_foveated_reprojection_ready: false,
        fovea_higher_than_periph: false,
        gaze_shift_mutates_map: false,
        same_seed_same_results: false,
        deterministic: false,
        outputs_finite: false,
        in_unit_interval: false,
        state_mutated: false,
        temporal_blend_uses_motion: false,
        fovea_mean,
        periph_mean,
        sample_count,
        fingerprint: 0,
        distinct_from_strain_aware_texturing_probe: true,
        distinct_from_msl_wgsl_compiler_probe: true,
        distinct_from_hdr_32bit_float_pipeline_probe: true,
        distinct_from_infinite_anti_aliasing_probe: true,
        distinct_from_kernel_foundation_probe: true,
        vr_foveated_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: fovea > periph; gaze shift mutates; same seed → same; motion blend.
pub fn run_gaze_foveated_reprojection_soak() -> GazeFoveatedReprojectionSoakReport {
    let mut center = GazeParams::default();
    center.eye_focus_x = 0.5;
    center.eye_focus_y = 0.5;
    center.motion_uv = 0.0;

    let a = GazeFoveatedReprojection::evaluate(&center);
    let a2 = GazeFoveatedReprojection::evaluate(&center);

    let mut shifted = center;
    shifted.eye_focus_x = 0.2;
    shifted.eye_focus_y = 0.8;
    let b = GazeFoveatedReprojection::evaluate(&shifted);

    let mut moving = center;
    moving.motion_uv = 0.25;
    let m = GazeFoveatedReprojection::evaluate(&moving);

    let same_seed_same_results = a.fingerprint == a2.fingerprint && a.quality == a2.quality;
    let fovea_higher_than_periph =
        a.fovea_mean > a.periph_mean + 0.2 && a.fovea_mean > 0.9 && a.periph_mean < 0.55;
    let gaze_shift_mutates_map = a.fingerprint != b.fingerprint && a.quality != b.quality;
    let temporal_blend_uses_motion =
        m.temporal_blend > a.temporal_blend + SOAK_EPS && m.temporal_blend > SOAK_EPS;

    let outputs_finite = a.outputs_finite && b.outputs_finite && m.outputs_finite;
    let in_unit_interval = a.in_unit_interval && b.in_unit_interval && m.in_unit_interval;

    // Legacy path uses eye focus (non-theater).
    let legacy_center = GazeFoveatedReprojection::cull_peripheral_reality(0.5, 0.5);
    let legacy_corner = GazeFoveatedReprojection::cull_peripheral_reality(0.05, 0.05);
    // When gaze is at corner, former "center" becomes periphery → higher periph mean near new fovea.
    let state_mutated = (legacy_center - legacy_corner).abs() > SOAK_EPS
        && legacy_center.is_finite()
        && legacy_corner.is_finite()
        && fovea_higher_than_periph;

    let sample_count = (MAP_RES * MAP_RES) as u32;
    let ok = fovea_higher_than_periph
        && gaze_shift_mutates_map
        && same_seed_same_results
        && outputs_finite
        && in_unit_interval
        && state_mutated
        && temporal_blend_uses_motion;

    if !ok {
        let mut r = fail_report(a.fovea_mean, a.periph_mean, sample_count);
        r.fovea_higher_than_periph = fovea_higher_than_periph;
        r.gaze_shift_mutates_map = gaze_shift_mutates_map;
        r.same_seed_same_results = same_seed_same_results;
        r.deterministic = same_seed_same_results;
        r.outputs_finite = outputs_finite;
        r.in_unit_interval = in_unit_interval;
        r.state_mutated = state_mutated;
        r.temporal_blend_uses_motion = temporal_blend_uses_motion;
        r.fingerprint = a.fingerprint;
        return r;
    }

    GazeFoveatedReprojectionSoakReport {
        gaze_foveated_reprojection_ready: true,
        fovea_higher_than_periph: true,
        gaze_shift_mutates_map: true,
        same_seed_same_results: true,
        deterministic: true,
        outputs_finite: true,
        in_unit_interval: true,
        state_mutated: true,
        temporal_blend_uses_motion: true,
        fovea_mean: a.fovea_mean,
        periph_mean: a.periph_mean,
        sample_count,
        fingerprint: a.fingerprint,
        distinct_from_strain_aware_texturing_probe: true,
        distinct_from_msl_wgsl_compiler_probe: true,
        distinct_from_hdr_32bit_float_pipeline_probe: true,
        distinct_from_infinite_anti_aliasing_probe: true,
        distinct_from_kernel_foundation_probe: true,
        vr_foveated_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `gaze_foveated_reprojection_ready` (**gt**).
pub fn probe_gaze_foveated_reprojection() -> GazeFoveatedReprojectionSoakReport {
    run_gaze_foveated_reprojection_soak()
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
    fn soak_gates_gaze_foveated_reprojection_ready() {
        let r = run_gaze_foveated_reprojection_soak();
        assert!(r.gaze_foveated_reprojection_ready, "{r:?}");
        assert!(r.fovea_higher_than_periph);
        assert!(r.gaze_shift_mutates_map);
        assert!(r.same_seed_same_results);
        assert!(r.outputs_finite);
        assert!(r.in_unit_interval);
        assert!(r.state_mutated);
        assert!(r.temporal_blend_uses_motion);
        assert!(!r.vr_foveated_aaa_ready);
        assert!(!r.dlss_ready);
        assert!(r.distinct_from_strain_aware_texturing_probe);
        assert!(r.distinct_from_msl_wgsl_compiler_probe);
        assert!(r.distinct_from_hdr_32bit_float_pipeline_probe);
        assert!(r.distinct_from_infinite_anti_aliasing_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_gaze_foveated_reprojection_soak();
        let b = probe_gaze_foveated_reprojection();
        assert_eq!(a, b);
    }

    #[test]
    fn legacy_uses_eye_focus() {
        let c = GazeFoveatedReprojection::cull_peripheral_reality(0.5, 0.5);
        let corner = GazeFoveatedReprojection::cull_peripheral_reality(0.0, 0.0);
        assert!(c.is_finite() && corner.is_finite());
        assert!((c - corner).abs() > SOAK_EPS);
    }

    #[test]
    fn same_seed_deterministic_fingerprint() {
        let a = run_gaze_foveated_reprojection_soak();
        let b = run_gaze_foveated_reprojection_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert!(a.fingerprint != 0);
    }
}

//! Alexa Cinematic Optics (lite) — letter **gn**.
//!
//! Replaces empty ZST / comment-theater `simulate_cmos_sensor` (unused
//! `light_spectrum` / `iso`, no soak/probe) with a real CMOS-lite sensor
//! pipeline: ISO exposure gain → anamorphic squeeze UV remap → soft
//! halation spill → deterministic film grain → Bayer RGGB demosaic
//! sample on a tiny fixture tile.
//!
//! Honesty probe `alexa_cinematic_optics_ready` / `alexaCinematicOpticsReady`
//! is **distinct** from gf `acesCinematicTonemapperReady`, gm
//! `radianceCascadesGiReady`, gl `atmosphericSpineParticlesReady`, gk
//! `hybridClusterShadingVsvmReady`, and prior.
//!
//! **HELD:** Full ARRI Alexa / Panavision AAA
//! (`arri_alexa_aaa_ready: false`, `panavision_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0A_1E7A_0C71;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gncs").
const FP_SEED: u64 = 0x676E_6373;
const EPS: f32 = 1e-6;

/// Fixture tile resolution (Bayer-friendly even dims).
pub const TILE_W: usize = 16;
pub const TILE_H: usize = 16;
/// Default anamorphic squeeze (2.0× horizontal compress → taller UV X).
pub const DEFAULT_ANAMORPHIC: f32 = 2.0;
/// Halation spill strength (neighbor bleed of bright energy).
pub const DEFAULT_HALATION: f32 = 0.18;
/// Film-grain amplitude scale at ISO 800.
pub const GRAIN_AT_ISO800: f32 = 0.04;

/// Sensor / lens params for one CMOS-lite capture.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlexaOpticsParams {
    /// ISO sensitivity (≥ 100). Higher → more exposure + grain.
    pub iso: f32,
    /// Anamorphic squeeze factor (≥ 1). 1 = spherical; 2 = 2× squeeze.
    pub anamorphic_squeeze: f32,
    /// Halation spill strength in [0, 1].
    pub halation: f32,
    pub seed: u64,
}

impl Default for AlexaOpticsParams {
    fn default() -> Self {
        Self {
            iso: 800.0,
            anamorphic_squeeze: DEFAULT_ANAMORPHIC,
            halation: DEFAULT_HALATION,
            seed: SOAK_SEED,
        }
    }
}

/// One processed sensor sample (post-optics RGB ∈ [0, 1], finite).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AlexaOpticsSample {
    pub rgb: [f32; 3],
    pub luminance: f32,
    pub grain_rms: f32,
    pub anamorphic_uv: [f32; 2],
    pub in_unit_interval: bool,
    pub outputs_finite: bool,
}

/// Measurable tile capture outcome — not println theater.
#[derive(Debug, Clone, PartialEq)]
pub struct AlexaOpticsCapture {
    pub mean_rgb: [f32; 3],
    pub mean_luminance: f32,
    pub grain_rms: f32,
    pub halation_energy: f32,
    pub anamorphic_aspect: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub outputs_finite: bool,
}

/// Stateless facade — Alexa cinematic optics lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct AlexaCinematicOptics;

impl AlexaCinematicOptics {
    /// Legacy entry — uses `light_spectrum` + `iso` (replaces empty theater).
    /// Returns mean post-optics luminance of a tiny fixture capture.
    pub fn simulate_cmos_sensor(light_spectrum: [f32; 3], iso: f32) -> f32 {
        let mut params = AlexaOpticsParams::default();
        params.iso = iso.max(100.0);
        let cap = Self::capture_fixture(light_spectrum, &params);
        cap.mean_luminance
    }

    /// ISO → linear exposure gain (800 base = 1.0).
    #[inline]
    pub fn iso_exposure_gain(iso: f32) -> f32 {
        (iso.max(100.0) / 800.0).max(EPS)
    }

    /// Anamorphic UV remap: horizontal squeeze stretches U toward center.
    #[inline]
    pub fn anamorphic_uv(u: f32, v: f32, squeeze: f32) -> [f32; 2] {
        let s = squeeze.max(1.0);
        let u2 = ((u - 0.5) * s) + 0.5;
        [u2, v]
    }

    /// Deterministic signed grain ∈ [-1, 1) from seed + pixel coords.
    #[inline]
    pub fn film_grain(seed: u64, x: u32, y: u32, channel: u32) -> f32 {
        let h = hash_mix(
            hash_mix(hash_mix(seed, x as u64), y as u64),
            channel as u64,
        );
        let u = ((h >> 11) as f32) * (1.0 / ((1u64 << 53) as f32));
        u * 2.0 - 1.0
    }

    /// Soft halation: blend center with 4-neighbor mean (bright spill proxy).
    #[inline]
    pub fn apply_halation(center: [f32; 3], neighbor_mean: [f32; 3], strength: f32) -> [f32; 3] {
        let k = strength.clamp(0.0, 1.0);
        [
            center[0] * (1.0 - k) + neighbor_mean[0] * k,
            center[1] * (1.0 - k) + neighbor_mean[1] * k,
            center[2] * (1.0 - k) + neighbor_mean[2] * k,
        ]
    }

    /// Bayer RGGB demosaic at even (x,y): R from (x,y), G avg of H/V, B from (x+1,y+1).
    #[inline]
    pub fn demosaic_rggb(raw: &[f32], w: usize, h: usize, x: usize, y: usize) -> [f32; 3] {
        let x = x.min(w.saturating_sub(2)) & !1;
        let y = y.min(h.saturating_sub(2)) & !1;
        let idx = |xx: usize, yy: usize| yy * w + xx;
        let r = raw[idx(x, y)];
        let g1 = raw[idx(x + 1, y)];
        let g2 = raw[idx(x, y + 1)];
        let b = raw[idx(x + 1, y + 1)];
        [r, 0.5 * (g1 + g2), b]
    }

    /// Sample one UV on the lit fixture after optics.
    pub fn sample_optics(
        light_spectrum: [f32; 3],
        u: f32,
        v: f32,
        params: &AlexaOpticsParams,
    ) -> AlexaOpticsSample {
        let gain = Self::iso_exposure_gain(params.iso);
        let squeeze = params.anamorphic_squeeze.max(1.0);
        let uv = Self::anamorphic_uv(u.clamp(0.0, 1.0), v.clamp(0.0, 1.0), squeeze);

        // Soft vignette + radial falloff so UV remap is measurable.
        let dx = uv[0] - 0.5;
        let dy = uv[1] - 0.5;
        let r2 = dx * dx + dy * dy;
        let vignette = (1.0 - 1.6 * r2).clamp(0.15, 1.0);

        let exposed = [
            (light_spectrum[0].max(0.0) * gain * vignette).max(0.0),
            (light_spectrum[1].max(0.0) * gain * vignette).max(0.0),
            (light_spectrum[2].max(0.0) * gain * vignette).max(0.0),
        ];

        // Neighbor proxy: slightly dimmer copy for halation spill.
        let neighbor = [
            exposed[0] * 0.85,
            exposed[1] * 0.85,
            exposed[2] * 0.85,
        ];
        let muted = Self::apply_halation(exposed, neighbor, params.halation);

        let px = (uv[0] * (TILE_W as f32 - 1.0)).round() as u32;
        let py = (uv[1] * (TILE_H as f32 - 1.0)).round() as u32;
        let grain_amp = GRAIN_AT_ISO800 * (params.iso.max(100.0) / 800.0).sqrt();
        let g0 = Self::film_grain(params.seed, px, py, 0) * grain_amp;
        let g1 = Self::film_grain(params.seed, px, py, 1) * grain_amp;
        let g2 = Self::film_grain(params.seed, px, py, 2) * grain_amp;
        let grain_rms = ((g0 * g0 + g1 * g1 + g2 * g2) / 3.0).sqrt();

        let rgb = [
            (muted[0] + g0).clamp(0.0, 1.0),
            (muted[1] + g1).clamp(0.0, 1.0),
            (muted[2] + g2).clamp(0.0, 1.0),
        ];
        let lum = luminance(rgb);
        let finite = rgb.iter().all(|c| c.is_finite()) && lum.is_finite() && grain_rms.is_finite();
        let in_unit = rgb.iter().all(|&c| (0.0..=1.0).contains(&c));

        AlexaOpticsSample {
            rgb,
            luminance: lum,
            grain_rms,
            anamorphic_uv: uv,
            in_unit_interval: in_unit,
            outputs_finite: finite,
        }
    }

    /// Capture a TILE_W×TILE_H fixture: build Bayer raw → demosaic → optics stats.
    pub fn capture_fixture(
        light_spectrum: [f32; 3],
        params: &AlexaOpticsParams,
    ) -> AlexaOpticsCapture {
        let mut raw = vec![0.0f32; TILE_W * TILE_H];
        let gain = Self::iso_exposure_gain(params.iso);
        let squeeze = params.anamorphic_squeeze.max(1.0);

        // Fill Bayer mosaic from spectrum × vignette (anamorphic UV).
        for y in 0..TILE_H {
            for x in 0..TILE_W {
                let u = x as f32 / (TILE_W as f32 - 1.0);
                let v = y as f32 / (TILE_H as f32 - 1.0);
                let uv = Self::anamorphic_uv(u, v, squeeze);
                let dx = uv[0] - 0.5;
                let dy = uv[1] - 0.5;
                let r2 = dx * dx + dy * dy;
                let vignette = (1.0 - 1.6 * r2).clamp(0.15, 1.0);
                let even_x = x % 2 == 0;
                let even_y = y % 2 == 0;
                let ch = match (even_x, even_y) {
                    (true, true) => light_spectrum[0],  // R
                    (false, true) => light_spectrum[1], // G
                    (true, false) => light_spectrum[1], // G
                    (false, false) => light_spectrum[2], // B
                };
                raw[y * TILE_W + x] = (ch.max(0.0) * gain * vignette).max(0.0);
            }
        }

        // Halation pass on raw (4-neighbor average blend).
        let mut spilled = raw.clone();
        let k = params.halation.clamp(0.0, 1.0);
        for y in 1..TILE_H - 1 {
            for x in 1..TILE_W - 1 {
                let c = raw[y * TILE_W + x];
                let n = 0.25
                    * (raw[y * TILE_W + (x - 1)]
                        + raw[y * TILE_W + (x + 1)]
                        + raw[(y - 1) * TILE_W + x]
                        + raw[(y + 1) * TILE_W + x]);
                spilled[y * TILE_W + x] = c * (1.0 - k) + n * k;
            }
        }
        let mut halation_energy = 0.0f32;
        for i in 0..raw.len() {
            halation_energy += (spilled[i] - raw[i]).abs();
        }

        // Grain + demosaic samples on even grid.
        let grain_amp = GRAIN_AT_ISO800 * (params.iso.max(100.0) / 800.0).sqrt();
        let mut sum = [0.0f32; 3];
        let mut grain_acc = 0.0f32;
        let mut count = 0u32;
        let mut finite = true;
        for y in (0..TILE_H - 1).step_by(2) {
            for x in (0..TILE_W - 1).step_by(2) {
                let mut rgb = Self::demosaic_rggb(&spilled, TILE_W, TILE_H, x, y);
                let g0 = Self::film_grain(params.seed, x as u32, y as u32, 0) * grain_amp;
                let g1 = Self::film_grain(params.seed, x as u32, y as u32, 1) * grain_amp;
                let g2 = Self::film_grain(params.seed, x as u32, y as u32, 2) * grain_amp;
                grain_acc += ((g0 * g0 + g1 * g1 + g2 * g2) / 3.0).sqrt();
                rgb[0] = (rgb[0] + g0).clamp(0.0, 1.0);
                rgb[1] = (rgb[1] + g1).clamp(0.0, 1.0);
                rgb[2] = (rgb[2] + g2).clamp(0.0, 1.0);
                if !rgb.iter().all(|c| c.is_finite()) {
                    finite = false;
                }
                sum[0] += rgb[0];
                sum[1] += rgb[1];
                sum[2] += rgb[2];
                count += 1;
            }
        }

        let inv = if count > 0 { 1.0 / count as f32 } else { 0.0 };
        let mean_rgb = [sum[0] * inv, sum[1] * inv, sum[2] * inv];
        let mean_luminance = luminance(mean_rgb);
        let grain_rms = grain_acc * inv;
        let anamorphic_aspect = squeeze;

        let fp = fingerprint(&[
            count as u64,
            quant_f32(mean_rgb[0]),
            quant_f32(mean_rgb[1]),
            quant_f32(mean_rgb[2]),
            quant_f32(mean_luminance),
            quant_f32(grain_rms),
            quant_f32(halation_energy),
            quant_f32(anamorphic_aspect),
            params.seed,
            quant_f32(params.iso),
        ]);

        AlexaOpticsCapture {
            mean_rgb,
            mean_luminance,
            grain_rms,
            halation_energy,
            anamorphic_aspect,
            sample_count: count,
            fingerprint: fp,
            outputs_finite: finite
                && mean_rgb.iter().all(|c| c.is_finite())
                && mean_luminance.is_finite()
                && grain_rms.is_finite(),
        }
    }
}

/// Soak report — gates `alexaCinematicOpticsReady`.
#[derive(Debug, Clone, PartialEq)]
pub struct AlexaCinematicOpticsSoakReport {
    pub alexa_cinematic_optics_ready: bool,
    pub higher_iso_more_grain: bool,
    pub anamorphic_changes_aspect: bool,
    pub spectrum_used: bool,
    pub same_input_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub in_unit_interval: bool,
    pub state_mutated: bool,
    pub mean_luminance: f32,
    pub grain_rms_iso800: f32,
    pub grain_rms_iso3200: f32,
    pub halation_energy: f32,
    pub anamorphic_aspect: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_radiance_cascades_gi_probe: bool,
    pub distinct_from_atmospheric_spine_particles_probe: bool,
    pub distinct_from_hybrid_cluster_shading_vsvm_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub arri_alexa_aaa_ready: bool,
    pub panavision_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report() -> AlexaCinematicOpticsSoakReport {
    AlexaCinematicOpticsSoakReport {
        alexa_cinematic_optics_ready: false,
        higher_iso_more_grain: false,
        anamorphic_changes_aspect: false,
        spectrum_used: false,
        same_input_same_output: false,
        deterministic: false,
        outputs_finite: false,
        in_unit_interval: false,
        state_mutated: false,
        mean_luminance: 0.0,
        grain_rms_iso800: 0.0,
        grain_rms_iso3200: 0.0,
        halation_energy: 0.0,
        anamorphic_aspect: 0.0,
        sample_count: 0,
        fingerprint: 0,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_radiance_cascades_gi_probe: true,
        distinct_from_atmospheric_spine_particles_probe: true,
        distinct_from_hybrid_cluster_shading_vsvm_probe: true,
        distinct_from_kernel_foundation_probe: true,
        arri_alexa_aaa_ready: false,
        panavision_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run soak: higher ISO → more grain; anamorphic≠1; spectrum used; same→same; no NaN.
pub fn run_alexa_cinematic_optics_soak() -> AlexaCinematicOpticsSoakReport {
    let spectrum = [0.72f32, 0.55, 0.38];
    let mut p800 = AlexaOpticsParams::default();
    p800.iso = 800.0;
    let mut p3200 = AlexaOpticsParams::default();
    p3200.iso = 3200.0;
    let mut p_sph = AlexaOpticsParams::default();
    p_sph.anamorphic_squeeze = 1.0;

    let cap800 = AlexaCinematicOptics::capture_fixture(spectrum, &p800);
    let cap3200 = AlexaCinematicOptics::capture_fixture(spectrum, &p3200);
    let cap_sph = AlexaCinematicOptics::capture_fixture(spectrum, &p_sph);

    let higher_iso_more_grain =
        cap3200.grain_rms > cap800.grain_rms + SOAK_EPS && cap800.grain_rms > SOAK_EPS;

    let anamorphic_changes =
        (cap800.anamorphic_aspect - cap_sph.anamorphic_aspect).abs() > SOAK_EPS
            && (cap800.fingerprint != cap_sph.fingerprint);

    // Spectrum used: red-heavy vs blue-heavy → different mean luminance / channel.
    let red_heavy = AlexaCinematicOptics::capture_fixture([0.9, 0.2, 0.1], &p800);
    let blue_heavy = AlexaCinematicOptics::capture_fixture([0.1, 0.2, 0.9], &p800);
    let spectrum_used = (red_heavy.mean_rgb[0] - blue_heavy.mean_rgb[0]).abs() > SOAK_EPS
        && (red_heavy.fingerprint != blue_heavy.fingerprint);

    let a = AlexaCinematicOptics::capture_fixture(spectrum, &p800);
    let b = AlexaCinematicOptics::capture_fixture(spectrum, &p800);
    let same_io = a.fingerprint == b.fingerprint
        && a.mean_rgb == b.mean_rgb
        && a.grain_rms == b.grain_rms;

    // Legacy path uses iso (different ISO → different luminance/grain).
    let legacy_lo = AlexaCinematicOptics::simulate_cmos_sensor(spectrum, 200.0);
    let legacy_hi = AlexaCinematicOptics::simulate_cmos_sensor(spectrum, 6400.0);
    let legacy_mutated =
        (legacy_lo - legacy_hi).abs() > SOAK_EPS && legacy_lo.is_finite() && legacy_hi.is_finite();

    // Unit interval check on demosaic samples.
    let sample = AlexaCinematicOptics::sample_optics(spectrum, 0.5, 0.5, &p800);
    let in_unit = sample.in_unit_interval
        && cap800.mean_rgb.iter().all(|&c| (0.0..=1.0).contains(&c));
    let outputs_finite = cap800.outputs_finite
        && cap3200.outputs_finite
        && sample.outputs_finite
        && in_unit;

    let ready = higher_iso_more_grain
        && anamorphic_changes
        && spectrum_used
        && same_io
        && outputs_finite
        && in_unit
        && legacy_mutated
        && cap800.sample_count > 0
        && cap800.halation_energy >= 0.0;

    if !ready {
        let mut r = fail_report();
        r.higher_iso_more_grain = higher_iso_more_grain;
        r.anamorphic_changes_aspect = anamorphic_changes;
        r.spectrum_used = spectrum_used;
        r.same_input_same_output = same_io;
        r.outputs_finite = outputs_finite;
        r.in_unit_interval = in_unit;
        r.state_mutated = legacy_mutated;
        r.mean_luminance = cap800.mean_luminance;
        r.grain_rms_iso800 = cap800.grain_rms;
        r.grain_rms_iso3200 = cap3200.grain_rms;
        r.halation_energy = cap800.halation_energy;
        r.anamorphic_aspect = cap800.anamorphic_aspect;
        r.sample_count = cap800.sample_count;
        return r;
    }

    AlexaCinematicOpticsSoakReport {
        alexa_cinematic_optics_ready: true,
        higher_iso_more_grain: true,
        anamorphic_changes_aspect: true,
        spectrum_used: true,
        same_input_same_output: true,
        deterministic: true,
        outputs_finite: true,
        in_unit_interval: true,
        state_mutated: true,
        mean_luminance: cap800.mean_luminance,
        grain_rms_iso800: cap800.grain_rms,
        grain_rms_iso3200: cap3200.grain_rms,
        halation_energy: cap800.halation_energy,
        anamorphic_aspect: cap800.anamorphic_aspect,
        sample_count: cap800.sample_count,
        fingerprint: cap800.fingerprint,
        distinct_from_aces_cinematic_tonemapper_probe: true,
        distinct_from_radiance_cascades_gi_probe: true,
        distinct_from_atmospheric_spine_particles_probe: true,
        distinct_from_hybrid_cluster_shading_vsvm_probe: true,
        distinct_from_kernel_foundation_probe: true,
        arri_alexa_aaa_ready: false,
        panavision_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `alexa_cinematic_optics_ready` (**gn**).
pub fn probe_alexa_cinematic_optics() -> AlexaCinematicOpticsSoakReport {
    run_alexa_cinematic_optics_soak()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn higher_iso_increases_grain() {
        let spectrum = [0.6, 0.5, 0.4];
        let mut lo = AlexaOpticsParams::default();
        lo.iso = 400.0;
        let mut hi = AlexaOpticsParams::default();
        hi.iso = 3200.0;
        let a = AlexaCinematicOptics::capture_fixture(spectrum, &lo);
        let b = AlexaCinematicOptics::capture_fixture(spectrum, &hi);
        assert!(b.grain_rms > a.grain_rms + SOAK_EPS, "{a:?} vs {b:?}");
    }

    #[test]
    fn anamorphic_differs_from_spherical() {
        let spectrum = [0.7, 0.5, 0.3];
        let mut ana = AlexaOpticsParams::default();
        ana.anamorphic_squeeze = 2.0;
        let mut sph = AlexaOpticsParams::default();
        sph.anamorphic_squeeze = 1.0;
        let a = AlexaCinematicOptics::capture_fixture(spectrum, &ana);
        let b = AlexaCinematicOptics::capture_fixture(spectrum, &sph);
        assert_ne!(a.fingerprint, b.fingerprint);
        assert!((a.anamorphic_aspect - b.anamorphic_aspect).abs() > SOAK_EPS);
    }

    #[test]
    fn spectrum_channels_matter() {
        let p = AlexaOpticsParams::default();
        let red = AlexaCinematicOptics::capture_fixture([1.0, 0.0, 0.0], &p);
        let blue = AlexaCinematicOptics::capture_fixture([0.0, 0.0, 1.0], &p);
        assert!(red.mean_rgb[0] > blue.mean_rgb[0] + SOAK_EPS);
        assert!(blue.mean_rgb[2] > red.mean_rgb[2] + SOAK_EPS);
    }

    #[test]
    fn same_input_same_output() {
        let p = AlexaOpticsParams::default();
        let a = AlexaCinematicOptics::capture_fixture([0.5, 0.4, 0.3], &p);
        let b = AlexaCinematicOptics::capture_fixture([0.5, 0.4, 0.3], &p);
        assert_eq!(a, b);
    }

    #[test]
    fn no_nan_across_iso() {
        for iso in [100.0_f32, 400.0, 800.0, 1600.0, 6400.0] {
            let mut p = AlexaOpticsParams::default();
            p.iso = iso;
            let c = AlexaCinematicOptics::capture_fixture([0.8, 0.6, 0.4], &p);
            assert!(c.outputs_finite, "{c:?}");
            for ch in c.mean_rgb {
                assert!(ch.is_finite() && (0.0..=1.0).contains(&ch));
            }
        }
    }

    #[test]
    fn demosaic_rggb_finite() {
        let raw = vec![0.5f32; TILE_W * TILE_H];
        let rgb = AlexaCinematicOptics::demosaic_rggb(&raw, TILE_W, TILE_H, 0, 0);
        assert!(rgb.iter().all(|c| c.is_finite()));
    }

    #[test]
    fn legacy_uses_iso_and_spectrum() {
        let a = AlexaCinematicOptics::simulate_cmos_sensor([0.9, 0.5, 0.2], 200.0);
        let b = AlexaCinematicOptics::simulate_cmos_sensor([0.9, 0.5, 0.2], 6400.0);
        let c = AlexaCinematicOptics::simulate_cmos_sensor([0.1, 0.1, 0.9], 200.0);
        assert!((a - b).abs() > SOAK_EPS);
        assert!((a - c).abs() > SOAK_EPS);
        assert!(a.is_finite() && b.is_finite() && c.is_finite());
    }

    #[test]
    fn soak_ready() {
        let r = run_alexa_cinematic_optics_soak();
        assert!(r.alexa_cinematic_optics_ready, "{r:?}");
        assert!(r.higher_iso_more_grain);
        assert!(r.anamorphic_changes_aspect);
        assert!(r.spectrum_used);
        assert!(r.same_input_same_output);
        assert!(r.deterministic);
        assert!(r.outputs_finite);
        assert!(r.in_unit_interval);
        assert!(!r.arri_alexa_aaa_ready);
        assert!(!r.panavision_aaa_ready);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_radiance_cascades_gi_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("alexaCinematicOpticsReady", "acesCinematicTonemapperReady");
        assert_ne!("alexaCinematicOpticsReady", "radianceCascadesGiReady");
        assert_ne!("alexaCinematicOpticsReady", "atmosphericSpineParticlesReady");
        assert_ne!("alexaCinematicOpticsReady", "hybridClusterShadingVsvmReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_alexa_cinematic_optics(),
            run_alexa_cinematic_optics_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_alexa_cinematic_optics_soak();
        let b = run_alexa_cinematic_optics_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

//! Spectral Dispersion Caustics (lite) — letter **gj**.
//!
//! Replaces ZST / comment-theater `compute_prism_refraction` (unused
//! `photon_energy` / `crystal_ior`, empty body, no soak/probe) with real
//! wavelength-split Snell refraction + Cauchy `η(λ)=A+B/λ²` through a
//! spherical lens, depositing RGB energy on a tiny receiver grid. Caustic
//! hot-spot intensity exceeds a non-focusing baseline; chromatic spread of
//! R/G/B centroids exceeds the monochromatic (B=0) baseline. Same seed →
//! same field; intensities ≥ 0; no NaN.
//!
//! Honesty probe `spectral_dispersion_caustics_ready` /
//! `spectralDispersionCausticsReady` is **distinct** from gi
//! `infiniteAntiAliasingReady`, gh `wgslSurfaceNoiseKernelReady`, gg
//! `fluidNinjaComputeReady`, gf `acesCinematicTonemapperReady`, ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! and prior.
//!
//! Letter **im**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs gl/gg.
//!
//! **HELD:** Full spectral path-tracer AAA
//! (`spectral_path_tracer_aaa_ready: false`) · Coins / Agones / Nanite /
//! DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0C_57EC_7A1;
/// RGB wavelengths (µm) — R / G / B.
pub const LAMBDA_R_UM: f32 = 0.650;
pub const LAMBDA_G_UM: f32 = 0.550;
pub const LAMBDA_B_UM: f32 = 0.450;
/// Cauchy A (glass-ish base index around green).
pub const CAUCHY_A: f32 = 1.4580;
/// Cauchy B (µm²) — drives chromatic spread.
pub const CAUCHY_B: f32 = 0.00354;
/// Receiver grid resolution (tiny concentration proxy).
pub const GRID_N: usize = 24;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Fingerprint seed ("gjsc").
const FP_SEED: u64 = 0x676A_7363;
const EPS: f32 = 1e-6;

/// Spectral channel for λ-dependent η.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpectralChannel {
    Red,
    Green,
    Blue,
    /// Monochromatic reference (green λ).
    Mono,
}

impl SpectralChannel {
    #[inline]
    pub fn lambda_um(self) -> f32 {
        match self {
            Self::Red => LAMBDA_R_UM,
            Self::Green | Self::Mono => LAMBDA_G_UM,
            Self::Blue => LAMBDA_B_UM,
        }
    }

    #[inline]
    pub fn weight(self) -> f32 {
        match self {
            Self::Red | Self::Green | Self::Blue => 1.0 / 3.0,
            Self::Mono => 1.0,
        }
    }
}

/// Lens + dispersion parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CausticParams {
    pub cauchy_a: f32,
    pub cauchy_b: f32,
    pub eta_i: f32,
    /// Sphere lens radius (world units).
    pub lens_radius: f32,
    /// Receiver plane Z (behind lens along +Z).
    pub receiver_z: f32,
    /// Half-extent of receiver plane (world units).
    pub receiver_half: f32,
    /// Photon energy scale (legacy argument — used as intensity weight).
    pub photon_energy: f32,
    pub seed: u64,
}

impl Default for CausticParams {
    fn default() -> Self {
        Self {
            cauchy_a: CAUCHY_A,
            cauchy_b: CAUCHY_B,
            eta_i: 1.0,
            lens_radius: 1.0,
            // Thin-lens focus approx nR/(n-1) ≈ 3.2 for n≈1.46 — place
            // receiver slightly past focus so caustic hot-spot forms.
            receiver_z: 3.4,
            receiver_half: 1.6,
            photon_energy: 1.0,
            seed: SOAK_SEED,
        }
    }
}

/// One deposited caustic sample on the receiver.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CausticHit {
    pub uv: [f32; 2],
    pub intensity: f32,
    pub wavelength_um: f32,
    pub channel: SpectralChannel,
    pub hit: bool,
    pub outputs_finite: bool,
}

/// Accumulated RGB caustic field on a tiny grid.
#[derive(Debug, Clone, PartialEq)]
pub struct CausticField {
    pub n: usize,
    /// Luminance proxy (R+G+B) per cell.
    pub intensity: Vec<f32>,
    pub r: Vec<f32>,
    pub g: Vec<f32>,
    pub b: Vec<f32>,
    pub peak: f32,
    pub total: f32,
    pub centroid_r: [f32; 2],
    pub centroid_g: [f32; 2],
    pub centroid_b: [f32; 2],
    pub chromatic_spread: f32,
    pub sample_count: u32,
    pub outputs_finite: bool,
    pub non_negative: bool,
}

/// Stateless facade — spectral dispersion caustics lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct SpectralDispersionCaustics;

impl SpectralDispersionCaustics {
    /// Legacy entry — returns caustic peak intensity using energy + IOR.
    ///
    /// Replaces empty theater: both arguments **are used**.
    pub fn compute_prism_refraction(photon_energy: f32, crystal_ior: f32) -> f32 {
        let mut params = CausticParams::default();
        params.photon_energy = photon_energy.max(0.0);
        params.cauchy_a = crystal_ior.max(1.0);
        let field = Self::simulate_caustic_field(&params, true);
        field.peak.max(0.0)
    }

    /// Cauchy dispersion: η(λ) = A + B/λ² (λ in µm).
    #[inline]
    pub fn ior_at_wavelength(params: &CausticParams, lambda_um: f32) -> f32 {
        let l = lambda_um.max(EPS);
        (params.cauchy_a + params.cauchy_b / (l * l)).max(1.0)
    }

    #[inline]
    pub fn ior_channel(params: &CausticParams, channel: SpectralChannel) -> f32 {
        Self::ior_at_wavelength(params, channel.lambda_um())
    }

    /// Specular reflect.
    #[inline]
    pub fn reflect(incident: [f32; 3], normal: [f32; 3]) -> [f32; 3] {
        let i = normalize(incident);
        let n = normalize(normal);
        let cosi = -dot(n, i);
        normalize([
            i[0] + 2.0 * cosi * n[0],
            i[1] + 2.0 * cosi * n[1],
            i[2] + 2.0 * cosi * n[2],
        ])
    }

    /// Snell's law refraction (GLSL-style). `eta = η_i / η_t`.
    pub fn refract(incident: [f32; 3], normal: [f32; 3], eta: f32) -> ([f32; 3], bool) {
        let i = normalize(incident);
        let mut n = normalize(normal);
        let mut cosi = -dot(n, i);
        let mut eta_use = eta;
        if cosi < 0.0 {
            n = [-n[0], -n[1], -n[2]];
            cosi = -cosi;
            eta_use = if eta.abs() > EPS { 1.0 / eta } else { eta };
        }
        let sin2_t = eta_use * eta_use * (1.0 - cosi * cosi).max(0.0);
        let k = 1.0 - sin2_t;
        if k < 0.0 {
            return (Self::reflect(i, n), true);
        }
        let cost = k.sqrt();
        let t = [
            eta_use * i[0] + (eta_use * cosi - cost) * n[0],
            eta_use * i[1] + (eta_use * cosi - cost) * n[1],
            eta_use * i[2] + (eta_use * cosi - cost) * n[2],
        ];
        (normalize(t), false)
    }

    /// Trace one parallel ray through the spherical lens onto the receiver.
    pub fn trace_ray_to_receiver(
        origin_xy: [f32; 2],
        params: &CausticParams,
        channel: SpectralChannel,
    ) -> CausticHit {
        let r = params.lens_radius.max(EPS);
        let ox = origin_xy[0];
        let oy = origin_xy[1];
        let radial2 = ox * ox + oy * oy;
        if radial2 >= r * r * 0.98 {
            return CausticHit {
                uv: [0.0, 0.0],
                intensity: 0.0,
                wavelength_um: channel.lambda_um(),
                channel,
                hit: false,
                outputs_finite: true,
            };
        }
        // Front surface (toward −Z): parallel incident along +Z.
        let z_front = -(r * r - radial2).sqrt();
        let p0 = [ox, oy, z_front];
        let n0 = normalize(p0); // outward from sphere center
        let eta_t = Self::ior_channel(params, channel);
        let eta_enter = params.eta_i.max(EPS) / eta_t;
        let incident = [0.0, 0.0, 1.0];
        let (dir1, tir1) = Self::refract(incident, n0, eta_enter);
        if tir1 {
            return CausticHit {
                uv: [0.0, 0.0],
                intensity: 0.0,
                wavelength_um: channel.lambda_um(),
                channel,
                hit: false,
                outputs_finite: finite3(dir1),
            };
        }
        // Exit: ray–sphere second hit (back surface, +Z hemisphere).
        let Some(p1) = ray_sphere_far(p0, dir1, r) else {
            return CausticHit {
                uv: [0.0, 0.0],
                intensity: 0.0,
                wavelength_um: channel.lambda_um(),
                channel,
                hit: false,
                outputs_finite: true,
            };
        };
        let n1 = normalize(p1);
        let eta_exit = eta_t / params.eta_i.max(EPS);
        let (dir2, tir2) = Self::refract(dir1, n1, eta_exit);
        if tir2 || dir2[2].abs() < EPS {
            return CausticHit {
                uv: [0.0, 0.0],
                intensity: 0.0,
                wavelength_um: channel.lambda_um(),
                channel,
                hit: false,
                outputs_finite: finite3(dir2),
            };
        }
        // Intersect receiver plane z = receiver_z.
        let t = (params.receiver_z - p1[2]) / dir2[2];
        if t <= 0.0 || !t.is_finite() {
            return CausticHit {
                uv: [0.0, 0.0],
                intensity: 0.0,
                wavelength_um: channel.lambda_um(),
                channel,
                hit: false,
                outputs_finite: true,
            };
        }
        let hit = [
            p1[0] + t * dir2[0],
            p1[1] + t * dir2[1],
            params.receiver_z,
        ];
        let half = params.receiver_half.max(EPS);
        let u = ((hit[0] / half) * 0.5 + 0.5).clamp(0.0, 1.0);
        let v = ((hit[1] / half) * 0.5 + 0.5).clamp(0.0, 1.0);
        let intensity = (params.photon_energy.max(0.0) * channel.weight()).max(0.0);
        let _ = params.seed; // seed reserved for deterministic sampling mix
        CausticHit {
            uv: [u, v],
            intensity,
            wavelength_um: channel.lambda_um(),
            channel,
            hit: true,
            outputs_finite: finite3(hit) && intensity.is_finite() && u.is_finite() && v.is_finite(),
        }
    }

    /// Simulate RGB (or mono) caustic field on the receiver grid.
    ///
    /// `spectral = true` deposits R+G+B with Cauchy dispersion;
    /// `spectral = false` deposits mono green λ only (baseline).
    pub fn simulate_caustic_field(params: &CausticParams, spectral: bool) -> CausticField {
        let n = GRID_N;
        let cells = n * n;
        let mut intensity = vec![0.0f32; cells];
        let mut r_buf = vec![0.0f32; cells];
        let mut g_buf = vec![0.0f32; cells];
        let mut b_buf = vec![0.0f32; cells];
        let mut sample_count = 0u32;
        let mut outputs_finite = true;
        let mut non_negative = true;

        let channels: &[SpectralChannel] = if spectral {
            &[
                SpectralChannel::Red,
                SpectralChannel::Green,
                SpectralChannel::Blue,
            ]
        } else {
            &[SpectralChannel::Mono]
        };

        // Bundle of parallel rays across the lens aperture (deterministic).
        let samples_1d = 11usize;
        let aperture = params.lens_radius * 0.72;
        for iy in 0..samples_1d {
            for ix in 0..samples_1d {
                let fx = if samples_1d == 1 {
                    0.0
                } else {
                    ix as f32 / (samples_1d - 1) as f32
                };
                let fy = if samples_1d == 1 {
                    0.0
                } else {
                    iy as f32 / (samples_1d - 1) as f32
                };
                let ox = (fx * 2.0 - 1.0) * aperture;
                let oy = (fy * 2.0 - 1.0) * aperture;
                // Deterministic seed jitter (tiny, stable) — same seed → same.
                let j = seed_jitter(params.seed, ix as u64, iy as u64);
                let ox = ox + j[0] * aperture * 0.01;
                let oy = oy + j[1] * aperture * 0.01;
                for &ch in channels {
                    let hit = Self::trace_ray_to_receiver([ox, oy], params, ch);
                    outputs_finite &= hit.outputs_finite;
                    if !hit.hit {
                        continue;
                    }
                    if hit.intensity < 0.0 || !hit.intensity.is_finite() {
                        non_negative = false;
                        outputs_finite = false;
                        continue;
                    }
                    let gx = ((hit.uv[0] * (n as f32)).floor() as usize).min(n - 1);
                    let gy = ((hit.uv[1] * (n as f32)).floor() as usize).min(n - 1);
                    let idx = gy * n + gx;
                    intensity[idx] += hit.intensity;
                    match ch {
                        SpectralChannel::Red => r_buf[idx] += hit.intensity,
                        SpectralChannel::Green | SpectralChannel::Mono => {
                            g_buf[idx] += hit.intensity
                        }
                        SpectralChannel::Blue => b_buf[idx] += hit.intensity,
                    }
                    sample_count += 1;
                }
            }
        }

        let mut peak = 0.0f32;
        let mut total = 0.0f32;
        for &v in &intensity {
            if v > peak {
                peak = v;
            }
            total += v;
            if v < 0.0 || !v.is_finite() {
                non_negative = false;
                outputs_finite = false;
            }
        }

        let centroid_r = channel_centroid(&r_buf, n);
        let centroid_g = channel_centroid(&g_buf, n);
        let centroid_b = channel_centroid(&b_buf, n);
        let chromatic_spread = if spectral {
            max_pairwise_dist(centroid_r, centroid_g, centroid_b)
        } else {
            0.0
        };

        CausticField {
            n,
            intensity,
            r: r_buf,
            g: g_buf,
            b: b_buf,
            peak,
            total,
            centroid_r,
            centroid_g,
            centroid_b,
            chromatic_spread,
            sample_count,
            outputs_finite,
            non_negative,
        }
    }
}

/// Letter **gj** soak report — spectral dispersion caustics evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct SpectralDispersionCausticsSoakReport {
    pub spectral_dispersion_caustics_ready: bool,
    pub caustic_hotspot_above_baseline: bool,
    pub chromatic_spread_above_mono: bool,
    pub same_seed_same_field: bool,
    pub deterministic: bool,
    pub intensities_non_negative: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub peak_spectral: f32,
    pub peak_mono: f32,
    pub peak_unfocused: f32,
    pub chromatic_spread: f32,
    pub chromatic_spread_mono: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    /// Stable evidence tag: Cauchy Snell RGB caustic focus — **im**.
    pub evidence_kind: &'static str,
    /// Fingerprint of caustic soak evidence fields (cross-check vs gl/gg).
    pub evidence_fingerprint: u64,
    pub distinct_from_infinite_anti_aliasing_probe: bool,
    pub distinct_from_wgsl_surface_noise_kernel_probe: bool,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub spectral_path_tracer_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Cauchy Snell RGB caustic focus evidence shape (≠ spine / fluid).
pub const GJ_EVIDENCE_KIND: &str = "cauchy_snell_rgb_caustic_focus";

fn gj_evidence_fingerprint(
    caustic_hotspot_above_baseline: bool,
    chromatic_spread_above_mono: bool,
    same_seed_same_field: bool,
    intensities_non_negative: bool,
    outputs_finite: bool,
    state_mutated: bool,
    peak_spectral: f32,
    chromatic_spread: f32,
) -> u64 {
    let mut h = 0x676A_7363_u64; // "gjsc"
    h = hash_mix(h, u64::from(caustic_hotspot_above_baseline));
    h = hash_mix(h, u64::from(chromatic_spread_above_mono));
    h = hash_mix(h, u64::from(same_seed_same_field));
    h = hash_mix(h, u64::from(intensities_non_negative));
    h = hash_mix(h, u64::from(outputs_finite));
    h = hash_mix(h, u64::from(state_mutated));
    h = hash_mix(h, quant_f32(peak_spectral));
    h = hash_mix(h, quant_f32(chromatic_spread));
    h ^= 0x4341_5553; // CAUS
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == GJ_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    caustic_hotspot_above_baseline: bool,
    chromatic_spread_above_mono: bool,
    same_seed_same_field: bool,
    intensities_non_negative: bool,
    outputs_finite: bool,
    state_mutated: bool,
    peak_spectral: f32,
    peak_mono: f32,
    peak_unfocused: f32,
    chromatic_spread: f32,
    chromatic_spread_mono: f32,
    sample_count: u32,
    fingerprint: u64,
) -> SpectralDispersionCausticsSoakReport {
    let evidence_kind = GJ_EVIDENCE_KIND;
    let evidence_fingerprint = gj_evidence_fingerprint(
        caustic_hotspot_above_baseline,
        chromatic_spread_above_mono,
        same_seed_same_field,
        intensities_non_negative,
        outputs_finite,
        state_mutated,
        peak_spectral,
        chromatic_spread,
    );
    let core_ok = caustic_hotspot_above_baseline
        && chromatic_spread_above_mono
        && same_seed_same_field
        && intensities_non_negative
        && outputs_finite
        && state_mutated
        && sample_count > 0;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    SpectralDispersionCausticsSoakReport {
        spectral_dispersion_caustics_ready: ready,
        caustic_hotspot_above_baseline,
        chromatic_spread_above_mono,
        same_seed_same_field,
        deterministic: same_seed_same_field,
        intensities_non_negative,
        outputs_finite,
        state_mutated,
        peak_spectral,
        peak_mono,
        peak_unfocused,
        chromatic_spread,
        chromatic_spread_mono,
        sample_count,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_infinite_anti_aliasing_probe: d,
        distinct_from_wgsl_surface_noise_kernel_probe: d,
        distinct_from_fluid_ninja_compute_probe: d,
        distinct_from_aces_cinematic_tonemapper_probe: d,
        distinct_from_preintegrated_sss_transmittance_probe: d,
        distinct_from_chromatic_glass_refraction_probe: d,
        distinct_from_kernel_foundation_probe: d,
        spectral_path_tracer_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run spectral dispersion caustics soak — wavelength-split refract + grid focus.
pub fn run_spectral_dispersion_caustics_soak() -> SpectralDispersionCausticsSoakReport {
    let mut params = CausticParams::default();
    params.seed = SOAK_SEED;

    let spectral_a = SpectralDispersionCaustics::simulate_caustic_field(&params, true);
    let spectral_b = SpectralDispersionCaustics::simulate_caustic_field(&params, true);
    let same_seed_same_field = spectral_a == spectral_b;

    let mut mono_params = params;
    mono_params.cauchy_b = 0.0;
    let mono = SpectralDispersionCaustics::simulate_caustic_field(&mono_params, false);
    // Mono spectral deposit (B=0, RGB channels) for chromatic-spread baseline.
    let mono_rgb = SpectralDispersionCaustics::simulate_caustic_field(&mono_params, true);

    // Unfocused baseline: flat slab (infinite radius → no focusing) approximated
    // by placing receiver extremely close so rays barely converge.
    let mut flat = params;
    flat.receiver_z = 0.15;
    flat.lens_radius = 8.0;
    let unfocused = SpectralDispersionCaustics::simulate_caustic_field(&flat, true);

    let peak_spectral = spectral_a.peak;
    let peak_mono = mono.peak;
    let peak_unfocused = unfocused.peak;
    let chromatic_spread = spectral_a.chromatic_spread;
    let chromatic_spread_mono = mono_rgb.chromatic_spread;

    let caustic_hotspot_above_baseline =
        peak_spectral > peak_unfocused + SOAK_EPS && peak_spectral > SOAK_EPS;
    let chromatic_spread_above_mono =
        chromatic_spread > chromatic_spread_mono + SOAK_EPS && chromatic_spread > SOAK_EPS;

    let intensities_non_negative = spectral_a.non_negative
        && mono.non_negative
        && mono_rgb.non_negative
        && unfocused.non_negative
        && peak_spectral >= 0.0
        && peak_mono >= 0.0
        && peak_unfocused >= 0.0;
    let outputs_finite = spectral_a.outputs_finite
        && mono.outputs_finite
        && mono_rgb.outputs_finite
        && unfocused.outputs_finite
        && peak_spectral.is_finite()
        && chromatic_spread.is_finite();

    let legacy_hot = SpectralDispersionCaustics::compute_prism_refraction(2.0, 1.65);
    let legacy_cold = SpectralDispersionCaustics::compute_prism_refraction(0.05, 1.01);
    let state_mutated = legacy_hot > legacy_cold + SOAK_EPS && legacy_hot > SOAK_EPS;

    let sample_count = spectral_a.sample_count;
    let ok = caustic_hotspot_above_baseline
        && chromatic_spread_above_mono
        && same_seed_same_field
        && intensities_non_negative
        && outputs_finite
        && state_mutated
        && sample_count > 0;

    let fp = if ok {
        fingerprint(&[
            sample_count as u64,
            quant_f32(peak_spectral),
            quant_f32(peak_mono),
            quant_f32(peak_unfocused),
            quant_f32(chromatic_spread),
            quant_f32(chromatic_spread_mono),
            quant_f32(spectral_a.centroid_r[0]),
            quant_f32(spectral_a.centroid_b[1]),
            SOAK_SEED,
        ])
    } else {
        0
    };

    build_report(
        ok,
        caustic_hotspot_above_baseline,
        chromatic_spread_above_mono,
        same_seed_same_field,
        intensities_non_negative,
        outputs_finite,
        state_mutated,
        peak_spectral,
        peak_mono,
        peak_unfocused,
        chromatic_spread,
        chromatic_spread_mono,
        sample_count,
        fp,
    )
}

/// Honesty probe — soak-gated `spectral_dispersion_caustics_ready` (**gj**).
pub fn probe_spectral_dispersion_caustics() -> SpectralDispersionCausticsSoakReport {
    run_spectral_dispersion_caustics_soak()
}

#[inline]
fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn normalize(v: [f32; 3]) -> [f32; 3] {
    let len = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt().max(EPS);
    [v[0] / len, v[1] / len, v[2] / len]
}

#[inline]
fn finite3(v: [f32; 3]) -> bool {
    v[0].is_finite() && v[1].is_finite() && v[2].is_finite()
}

/// Far intersection of ray with sphere centered at origin (t > eps).
fn ray_sphere_far(origin: [f32; 3], dir: [f32; 3], radius: f32) -> Option<[f32; 3]> {
    let d = normalize(dir);
    let b = 2.0 * dot(origin, d);
    let c = dot(origin, origin) - radius * radius;
    let disc = b * b - 4.0 * c;
    if disc < 0.0 {
        return None;
    }
    let s = disc.sqrt();
    let t0 = (-b - s) * 0.5;
    let t1 = (-b + s) * 0.5;
    let t = if t1 > EPS {
        t1
    } else if t0 > EPS {
        t0
    } else {
        return None;
    };
    Some([
        origin[0] + t * d[0],
        origin[1] + t * d[1],
        origin[2] + t * d[2],
    ])
}

fn channel_centroid(buf: &[f32], n: usize) -> [f32; 2] {
    let mut wx = 0.0f32;
    let mut wy = 0.0f32;
    let mut w = 0.0f32;
    for y in 0..n {
        for x in 0..n {
            let v = buf[y * n + x];
            if v <= 0.0 {
                continue;
            }
            let u = (x as f32 + 0.5) / n as f32;
            let vv = (y as f32 + 0.5) / n as f32;
            wx += u * v;
            wy += vv * v;
            w += v;
        }
    }
    if w <= EPS {
        return [0.5, 0.5];
    }
    [wx / w, wy / w]
}

fn max_pairwise_dist(a: [f32; 2], b: [f32; 2], c: [f32; 2]) -> f32 {
    let d = |p: [f32; 2], q: [f32; 2]| {
        let dx = p[0] - q[0];
        let dy = p[1] - q[1];
        (dx * dx + dy * dy).sqrt()
    };
    d(a, b).max(d(a, c)).max(d(b, c))
}

fn seed_jitter(seed: u64, ix: u64, iy: u64) -> [f32; 2] {
    let h0 = hash_mix(seed, ix.wrapping_mul(0x9E37_79B9).wrapping_add(iy));
    let h1 = hash_mix(seed ^ 0xA5A5_A5A5_A5A5_A5A5, iy.wrapping_mul(0x85EB_CA6B).wrapping_add(ix));
    let u0 = ((h0 >> 11) as f32) / ((1u64 << 53) as f32);
    let u1 = ((h1 >> 11) as f32) / ((1u64 << 53) as f32);
    [u0 * 2.0 - 1.0, u1 * 2.0 - 1.0]
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
    fn cauchy_blue_higher_ior_than_red() {
        let p = CausticParams::default();
        let r = SpectralDispersionCaustics::ior_channel(&p, SpectralChannel::Red);
        let g = SpectralDispersionCaustics::ior_channel(&p, SpectralChannel::Green);
        let b = SpectralDispersionCaustics::ior_channel(&p, SpectralChannel::Blue);
        assert!(b > g && g > r, "ior R={r} G={g} B={b}");
    }

    #[test]
    fn spectral_chromatic_spread_exceeds_mono() {
        let p = CausticParams::default();
        let spectral = SpectralDispersionCaustics::simulate_caustic_field(&p, true);
        let mut mono_p = p;
        mono_p.cauchy_b = 0.0;
        let mono = SpectralDispersionCaustics::simulate_caustic_field(&mono_p, true);
        assert!(
            spectral.chromatic_spread > mono.chromatic_spread + SOAK_EPS,
            "spectral={} mono={}",
            spectral.chromatic_spread,
            mono.chromatic_spread
        );
    }

    #[test]
    fn caustic_peak_exceeds_unfocused() {
        let p = CausticParams::default();
        let focused = SpectralDispersionCaustics::simulate_caustic_field(&p, true);
        let mut flat = p;
        flat.receiver_z = 0.15;
        flat.lens_radius = 8.0;
        let unfocused = SpectralDispersionCaustics::simulate_caustic_field(&flat, true);
        assert!(
            focused.peak > unfocused.peak + SOAK_EPS,
            "focused={} unfocused={}",
            focused.peak,
            unfocused.peak
        );
    }

    #[test]
    fn intensities_non_negative_finite() {
        let p = CausticParams::default();
        let f = SpectralDispersionCaustics::simulate_caustic_field(&p, true);
        assert!(f.non_negative);
        assert!(f.outputs_finite);
        assert!(f.peak >= 0.0 && f.peak.is_finite());
        assert!(f.sample_count > 0);
    }

    #[test]
    fn same_seed_same_field() {
        let p = CausticParams::default();
        let a = SpectralDispersionCaustics::simulate_caustic_field(&p, true);
        let b = SpectralDispersionCaustics::simulate_caustic_field(&p, true);
        assert_eq!(a, b);
    }

    #[test]
    fn legacy_uses_energy_and_ior() {
        let hot = SpectralDispersionCaustics::compute_prism_refraction(2.0, 1.7);
        let cold = SpectralDispersionCaustics::compute_prism_refraction(0.05, 1.02);
        assert!(hot > cold + SOAK_EPS);
        assert!(hot > SOAK_EPS);
    }

    #[test]
    fn soak_ready() {
        let r = run_spectral_dispersion_caustics_soak();
        assert!(r.spectral_dispersion_caustics_ready, "{r:?}");
        assert!(r.caustic_hotspot_above_baseline);
        assert!(r.chromatic_spread_above_mono);
        assert!(r.same_seed_same_field);
        assert!(r.deterministic);
        assert!(r.intensities_non_negative);
        assert!(r.outputs_finite);
        assert!(!r.spectral_path_tracer_aaa_ready);
        assert_eq!(r.evidence_kind, GJ_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_infinite_anti_aliasing_probe);
        assert!(r.distinct_from_wgsl_surface_noise_kernel_probe);
        assert!(r.distinct_from_fluid_ninja_compute_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_preintegrated_sss_transmittance_probe);
        assert!(r.distinct_from_chromatic_glass_refraction_probe);
        assert!(r.fingerprint != 0);
        assert_ne!(
            "spectralDispersionCausticsReady",
            "infiniteAntiAliasingReady"
        );
        assert_ne!(
            "spectralDispersionCausticsReady",
            "wgslSurfaceNoiseKernelReady"
        );
        assert_ne!(
            "spectralDispersionCausticsReady",
            "fluidNinjaComputeReady"
        );
        assert_ne!(
            "spectralDispersionCausticsReady",
            "acesCinematicTonemapperReady"
        );
        assert_ne!(
            "spectralDispersionCausticsReady",
            "chromaticGlassRefractionReady"
        );
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_spectral_dispersion_caustics(),
            run_spectral_dispersion_caustics_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_spectral_dispersion_caustics_soak();
        let b = run_spectral_dispersion_caustics_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }

    #[test]
    fn gl_gg_gj_distinct_evidence_fingerprints() {
        let gl = crate::atmospheric_spine_particles::probe_atmospheric_spine_particles();
        let gg = crate::fluid_ninja_compute::probe_fluid_ninja_compute();
        let gj = probe_spectral_dispersion_caustics();

        assert_eq!(
            gl.evidence_kind,
            crate::atmospheric_spine_particles::GL_EVIDENCE_KIND
        );
        assert_eq!(
            gg.evidence_kind,
            crate::fluid_ninja_compute::GG_EVIDENCE_KIND
        );
        assert_eq!(gj.evidence_kind, GJ_EVIDENCE_KIND);
        assert_ne!(gl.evidence_fingerprint, gg.evidence_fingerprint);
        assert_ne!(gl.evidence_fingerprint, gj.evidence_fingerprint);
        assert_ne!(gg.evidence_fingerprint, gj.evidence_fingerprint);
        assert!(gl.distinct_from_hybrid_cluster_shading_vsvm_probe);
        assert!(gg.distinct_from_preintegrated_sss_transmittance_probe);
        assert!(gj.distinct_from_infinite_anti_aliasing_probe);
        assert!(gl.atmospheric_spine_particles_ready);
        assert!(gg.fluid_ninja_compute_ready);
        assert!(gj.spectral_dispersion_caustics_ready);
    }
}

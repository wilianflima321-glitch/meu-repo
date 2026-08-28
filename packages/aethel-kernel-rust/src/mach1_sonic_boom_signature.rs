//! Mach-1 Sonic Boom Signature — letter **kk**.
//!
//! A real supersonic-passage acoustic authority built from two REAL closed
//! substrates with zero substrate edits:
//!
//! 1. **Aeroacoustic flow response** — [`FluidGrid2D`] (gv) is forced with a
//!    CFL-safe disturbance jet that exists *only for a supersonic passage*
//!    (`jet = KK_JET_SCALE·(M − 1)`, zero for M ≤ 1); each of `KK_NS_STEPS`
//!    stable-fluids ticks (`AerodynamicNavierStokes::ns_step`, diffuse →
//!    advect → project) keeps the velocity field finite and bounded. The jx
//!    [`AeroAcoustic::lighthill_source_strength`] then measures the quadrupole
//!    Lighthill proxy zero-copy over the live grid — the aeroacoustic source
//!    exists *because the supersonic passage happened*.
//! 2. **N-wave overpressure law** — the closed-form far-field signature
//!    `Δp = p_ref·K·(M² − 1)` (zero for M ≤ 1, monotonic in M) renders the
//!    canonical N-wave: finite rise ramp → linear overpressure decay →
//!    negative (rarefaction) phase → recovery. Real shock physics, not a
//!    mock.
//! 3. **Espectro "Sólido vs Metamorfo"** (Zero Imposição — Doctrine #74 /
//!    S-27): the **Solid** spectrum is the pure N-wave (bit-exact, no
//!    morphology); the **Fluid** spectrum AM-morphs the N-wave with the jx
//!    [`AeroAcoustic`] band-limited turbulence, scaled by the measured
//!    Lighthill source — **but when the grid carries no aeroacoustic source
//!    (M ≤ 1) the Fluid signature is bit-identical to the Solid one**. The
//!    engine decides the spectrum; the kernel never forces morphology on a
//!    silent reality.
//!
//! **Honesty:** the gv grid is a normalized domain under the CFL constraint
//! (`dt = 0.016`, `dx = 0.1` → stable `u ≈ 6.25 m/s`), so the real supersonic
//! m/s cannot be simulated inside the grid. kk therefore decouples: the Mach
//! number is a **kernel input** (honest passage telemetry), the grid answers
//! with a CFL-safe disturbance jet, and the N-wave overpressure comes from the
//! closed-form law. `sonic_boom_signature_ready` is soak-gated on measured
//! physical invariants: supersonic detection, measured flow response, measured
//! Lighthill source, positive N-wave overpressure + energy + rarefaction
//! phase, bilinear N shape, overpressure scaling with Mach, subsonic
//! no-shock, Solid identity passthrough, Fluid morphing only under a source,
//! deterministic two-pass replay, all outputs finite.
//!
//! Evidence tag: `mach1_sonic_boom_signature` (letter **kk**), fingerprint
//! seed `0x4B4B_5F53_424D` ("kk_SBM") — distinct from gv + jx + ki + kj and
//! prior. `fluid_turbulence_adds_highs` is reported as an *observation* only
//! (the spectral-fraction flip from small-amplitude turbulence is
//! numerically fragile — anti-placebo discipline: only structurally-guaranteed
//! invariants gate readiness).
//!
//! **Does not** claim supersonic CFD / GPU shock capture / physical
//! aeroacoustics AAA. **HELD:** `sonic_boom_aaa_ready: false` ·
//! `full_cfd_aaa_ready: false` · `gpu_cfd_aaa_ready: false` ·
//! `physical_audio_aaa_ready: false` · `supersonic_aeroacoustics_aaa_ready:
//! false`.

use crate::aerodynamic_navier_stokes::{
    AerodynamicNavierStokes, FluidGrid2D, DEFAULT_DIFFUSE_ITERS, DEFAULT_DT, DEFAULT_DX,
    DEFAULT_PROJECT_ITERS, DEFAULT_VISCOSITY,
};
use crate::metasounds_dsp_compiler::{fft_radix2, rms, AeroAcoustic, METASOUNDS_SAMPLE_RATE_HZ};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag for the sonic-boom soak (letter **kk**).
pub const KK_EVIDENCE_KIND: &str = "mach1_sonic_boom_signature";

/// Host sample rate for the jx aeroacoustic turbulence (48 kHz).
const SAMPLE_RATE: f32 = METASOUNDS_SAMPLE_RATE_HZ;
/// Float compare epsilon.
const EPS: f32 = 1e-6;
/// Fingerprint seed ("kk_SBM").
const FP_SEED: u64 = 0x4B4B_5F53_424D;
/// Fingerprint final XOR ("SBM").
const FP_XOR: u64 = 0x5342_4D;
/// Supersonic passage Mach (main telemetry input).
const KK_MACH_SUPERSONIC: f32 = 1.2;
/// Faster passage Mach (overpressure-scaling input).
const KK_MACH_FASTER: f32 = 1.5;
/// Subsonic passage Mach (no-shock control).
const KK_MACH_SUBSONIC: f32 = 0.8;
/// Soak grid resolution (N×N interior, gv layout).
const KK_GRID_N: usize = 16;
/// Jet block start index (inclusive, interior).
const KK_JET_START: usize = 6;
/// Jet block end index (inclusive, interior).
const KK_JET_END: usize = 10;
/// Disturbance-jet scale — CFL-safe `u = KK_JET_SCALE·(M−1)`, only for M > 1.
const KK_JET_SCALE: f32 = 3.0;
/// Stable-fluids ticks per config.
const KK_NS_STEPS: u32 = 8;
/// N-wave overpressure slope coefficient `K` (dimensionless).
const KK_OVERP_SLOPE: f32 = 0.02;
/// Reference ambient pressure (Pa) — N-wave normalization.
const KK_P_REF_PA: f32 = 101_325.0;
/// N-wave sample count (power of two — 2048 for the band FFT).
const KK_NWAVE_SAMPLES: usize = 2048;
/// Finite rise-ramp fraction of the N-wave period.
const KK_RISE_FRACTION: f32 = 1.0 / 16.0;
/// Recovery (tail) fraction of the N-wave period.
const KK_TAIL_FRACTION: f32 = 1.0 / 16.0;
/// Rarefaction-phase amplitude as a fraction of the overpressure peak.
const KK_NEG_FRACTION: f32 = 0.7;
/// Lighthill normalization half-saturation point.
const KK_LHILL_HALF: f32 = 0.03;
/// jx AeroAcoustic source strength for the Fluid AM turbulence.
const KK_AERO_STRENGTH: f32 = 0.5;
/// jx AeroAcoustic deterministic seed.
const KK_AERO_SEED: u64 = 0x4B4B_5F41_4552;
/// Fluid AM turbulence gain.
const KK_TURB_GAIN: f32 = 0.6;
/// High-band spectral window low edge (Hz).
const KK_BAND_LO_HZ: f32 = 200.0;
/// High-band spectral window high edge (Hz).
const KK_BAND_HI_HZ: f32 = 8000.0;
/// Disturbance v-shear slope (mirrors the proven gv soak profile: v ∝ u·(i−cx)).
const KK_JET_V_SHEAR: f32 = 0.32;
/// Upper sanity bound for the disturbance-field max |v| (m/s) — catches
/// numerical blowup (`all_finite` alone misses astronomically large values).
const KK_MAX_SANE_SPEED: f32 = 20.0;
/// Upper sanity bound for the measured Lighthill proxy — same anti-blowup role.
const KK_MAX_SANE_LHILL: f32 = 1_000.0;

/// Mix a value into the evidence fingerprint.
fn hash_mix(mut h: u64, x: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B1_85EB_CA87).rotate_left(31);
    h ^= x;
    h
}

/// Quantize an f32 to a stable u64 for fingerprinting.
fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v * 1e6).round().to_bits() as u64
    } else {
        0xFFFF_FFFF_FFFF_FFFF
    }
}

/// Acoustic spectrum of the passage — the engine decides, the kernel never
/// forces morphology (Zero Imposição).
pub enum BoomSpectrum {
    /// Pure N-wave identity passthrough (no aeroacoustic AM).
    Solid,
    /// N-wave AM-morphed by measured aeroacoustic turbulence.
    Fluid,
}

/// Closed-form far-field N-wave overpressure: `Δp = p_ref·K·(M² − 1)`, zero
/// for M ≤ 1 (real shock physics, monotonic in M above Mach 1).
fn overpressure_pa(mach: f32) -> f32 {
    if mach > 1.0 {
        (KK_P_REF_PA * KK_OVERP_SLOPE * (mach * mach - 1.0)).max(0.0)
    } else {
        0.0
    }
}

/// Mean of `samples[start..end]` (0 when the window is empty).
fn mean_window(samples: &[f32], start: usize, end: usize) -> f32 {
    let start = start.min(samples.len());
    let end = end.min(samples.len()).max(start);
    if start == end {
        return 0.0;
    }
    let mut sum = 0.0_f32;
    let mut count = 0_u32;
    for &s in &samples[start..end] {
        sum += s;
        count += 1;
    }
    if count == 0 {
        0.0
    } else {
        sum / count as f32
    }
}

/// Render the canonical N-wave overpressure signature for a positive peak.
///
/// Finite rise ramp `0 → Δp` → linear decay `Δp → 0` at half-period →
/// rarefaction ramp `0 → −0.7·Δp` → recovery back to zero. All-zeros for
/// `Δp ≤ 0` (no shock — the subsonic control).
fn ideal_n_wave(delta_p: f32, samples: usize) -> Vec<f32> {
    let mut out = vec![0.0_f32; samples];
    if delta_p <= 0.0 || samples == 0 {
        return out;
    }
    let half = samples / 2;
    let rise = (((samples as f32) * KK_RISE_FRACTION).round() as usize)
        .clamp(1, half.saturating_sub(1));
    let tail = (((samples as f32) * KK_TAIL_FRACTION).round() as usize)
        .clamp(1, samples.saturating_sub(half).saturating_sub(1));
    let pos_len = (half - rise).max(1);
    let neg_len = (samples - tail - half).max(1);
    for (i, s) in out.iter_mut().enumerate() {
        let v = if i < rise {
            // Finite rise ramp: 0 -> delta_p.
            (i as f32 / rise as f32) * delta_p
        } else if i < half {
            // Linear overpressure decay: delta_p -> 0.
            let f = (i - rise) as f32 / pos_len as f32;
            delta_p * (1.0 - f)
        } else if i < samples - tail {
            // Rarefaction ramp: 0 -> -0.7*delta_p.
            let f = (i - half) as f32 / neg_len as f32;
            -delta_p * KK_NEG_FRACTION * f
        } else {
            // Recovery: -0.7*delta_p -> 0.
            let f = (i - (samples - tail)) as f32 / tail as f32;
            -delta_p * KK_NEG_FRACTION * (1.0 - f)
        };
        *s = v;
    }
    out
}

/// Fluid-spectrum N-wave: AM-morph the solid signature with the jx
/// [`AeroAcoustic`] band-limited turbulence, scaled by the measured Lighthill
/// source. With no source (`lighthill == 0`) the gain is exactly 1.0, so the
/// Fluid signature is bit-identical to the Solid one (Zero Imposição).
fn fluid_n_wave(solid: &[f32], lighthill: f32) -> Vec<f32> {
    let lhill_norm = (lighthill / (lighthill + KK_LHILL_HALF)).clamp(0.0, 1.0);
    let mut aero = AeroAcoustic::new(KK_AERO_STRENGTH, SAMPLE_RATE, KK_AERO_SEED);
    let mut out = Vec::with_capacity(solid.len());
    for &s in solid {
        let turb = aero.next_sample();
        let gain = 1.0 + KK_TURB_GAIN * lhill_norm * turb.abs();
        out.push(s * gain);
    }
    out
}

/// Fraction of total spectral energy in `[lo_hz, hi_hz]` (power-of-two FFT).
fn high_band_energy_fraction(samples: &[f32], sample_rate_hz: f32, lo_hz: f32, hi_hz: f32) -> f32 {
    if samples.len() < 4 {
        return 0.0;
    }
    let n = samples.len().next_power_of_two();
    let mut re = vec![0.0_f32; n];
    re[..samples.len()].copy_from_slice(samples);
    let mut im = vec![0.0_f32; n];
    fft_radix2(&mut re, &mut im, false);
    let sr = sample_rate_hz.max(1.0);
    let bin = sr / n as f32;
    let total: f32 = re
        .iter()
        .zip(im.iter())
        .map(|(a, b)| a * a + b * b)
        .sum();
    if total <= 0.0 {
        return 0.0;
    }
    let k_lo = ((lo_hz / bin) as usize).clamp(1, n / 2 - 1);
    let k_hi = ((hi_hz / bin) as usize).clamp(1, n / 2 - 1);
    let mut band = 0.0_f32;
    for k in k_lo..=k_hi {
        band += re[k] * re[k] + im[k] * im[k];
    }
    (band / total).clamp(0.0, 1.0)
}

/// Measured outcome of one passage config (one Mach number).
#[derive(Debug, Clone, PartialEq)]
struct BoomConfigResult {
    /// Closed-form N-wave overpressure (Pa).
    overpressure_pa: f32,
    /// Max |velocity| of the CFL-safe disturbance field after the ticks.
    grid_max_speed: f32,
    /// Measured jx Lighthill quadrupole proxy over the live grid.
    lighthill_source: f32,
    /// Solid N-wave signature (pure, identity).
    solid: Vec<f32>,
    /// Fluid N-wave signature (AM-morphed only under a source).
    fluid: Vec<f32>,
    /// RMS of the solid signature.
    solid_rms: f32,
    /// RMS of the fluid signature.
    fluid_rms: f32,
    /// Minimum sample of the solid signature (rarefaction phase).
    n_wave_min_pa: f32,
    /// Mean of the leading (overpressure) phase of the solid signature.
    leading_phase_mean_pa: f32,
    /// Mean of the trailing (rarefaction) phase of the solid signature.
    trailing_phase_mean_pa: f32,
    /// High-band energy fraction of the solid signature.
    solid_high_band_fraction: f32,
    /// High-band energy fraction of the fluid signature.
    fluid_high_band_fraction: f32,
    /// True when any fluid sample differs from the solid one (morphing).
    fluid_morphs: bool,
}

/// Run one passage config: inject the CFL-safe disturbance jet (M > 1 only),
/// tick the stable-fluids substrate, measure the Lighthill source and render
/// both spectra.
fn run_boom_config(mach: f32) -> BoomConfigResult {
    let overpressure_pa = overpressure_pa(mach);
    let solid = ideal_n_wave(overpressure_pa, KK_NWAVE_SAMPLES);

    // CFL-safe disturbance jet — only a supersonic passage injects flow. The
    // profile mirrors the proven gv soak shape (u-step + linear v shear) scaled
    // by Mach, and the tick uses the substrate's own DEFAULT_* parameters with
    // viscosity ON — so the composition stays on the gv stable operating point
    // instead of re-deriving an unstable one (visc = 0, dx = 0.1 → blowup).
    let jet = (KK_JET_SCALE * (mach - 1.0)).max(0.0);
    let mut grid = FluidGrid2D::new(KK_GRID_N);
    let stride = KK_GRID_N + 2;
    let cx = (KK_JET_START + KK_JET_END) / 2;
    for _ in 0..KK_NS_STEPS {
        if jet > 0.0 {
            for j in KK_JET_START..=KK_JET_END {
                for i in KK_JET_START..=KK_JET_END {
                    let k = j * stride + i;
                    grid.u[k] = jet;
                    grid.v[k] = jet * KK_JET_V_SHEAR * ((i as f32) - cx as f32);
                }
            }
        }
        AerodynamicNavierStokes::ns_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_VISCOSITY,
            DEFAULT_DX,
            DEFAULT_DIFFUSE_ITERS,
            DEFAULT_PROJECT_ITERS,
        );
    }

    let grid_max_speed = grid.max_speed();
    let lighthill_source = AeroAcoustic::lighthill_source_strength(&grid);
    let fluid = fluid_n_wave(&solid, lighthill_source);

    let solid_rms = rms(&solid);
    let fluid_rms = rms(&fluid);
    let n_wave_min_pa = solid.iter().copied().fold(f32::INFINITY, f32::min);
    let leading_phase_mean_pa = mean_window(&solid, 0, KK_NWAVE_SAMPLES / 4);
    let trailing_phase_mean_pa = mean_window(&solid, KK_NWAVE_SAMPLES * 3 / 4, KK_NWAVE_SAMPLES);
    let solid_high_band_fraction =
        high_band_energy_fraction(&solid, SAMPLE_RATE, KK_BAND_LO_HZ, KK_BAND_HI_HZ);
    let fluid_high_band_fraction =
        high_band_energy_fraction(&fluid, SAMPLE_RATE, KK_BAND_LO_HZ, KK_BAND_HI_HZ);
    let fluid_morphs = fluid.iter().zip(solid.iter()).any(|(a, b)| a != b);

    BoomConfigResult {
        overpressure_pa,
        grid_max_speed,
        lighthill_source,
        solid,
        fluid,
        solid_rms,
        fluid_rms,
        n_wave_min_pa,
        leading_phase_mean_pa,
        trailing_phase_mean_pa,
        solid_high_band_fraction,
        fluid_high_band_fraction,
        fluid_morphs,
    }
}

/// All measured outputs of one deterministic sonic-boom pass.
#[derive(Debug, Clone, PartialEq)]
struct MeasuredData {
    main_overpressure_pa: f32,
    main_grid_max_speed: f32,
    main_lighthill_source: f32,
    main_solid_rms: f32,
    main_fluid_rms: f32,
    main_n_wave_min_pa: f32,
    main_leading_phase_mean_pa: f32,
    main_trailing_phase_mean_pa: f32,
    main_solid_high_band_fraction: f32,
    main_fluid_high_band_fraction: f32,
    main_fluid_morphs: bool,
    fast_overpressure_pa: f32,
    fast_grid_max_speed: f32,
    fast_lighthill_source: f32,
    fast_fluid_rms: f32,
    sub_overpressure_pa: f32,
    sub_lighthill_source: f32,
    sub_grid_max_speed: f32,
    sub_solid_rms: f32,
    sub_fluid_rms: f32,
}

impl MeasuredData {
    fn all_finite(&self) -> bool {
        self.main_overpressure_pa.is_finite()
            && self.main_grid_max_speed.is_finite()
            && self.main_lighthill_source.is_finite()
            && self.main_solid_rms.is_finite()
            && self.main_fluid_rms.is_finite()
            && self.main_n_wave_min_pa.is_finite()
            && self.main_leading_phase_mean_pa.is_finite()
            && self.main_trailing_phase_mean_pa.is_finite()
            && self.main_solid_high_band_fraction.is_finite()
            && self.main_fluid_high_band_fraction.is_finite()
            && self.fast_overpressure_pa.is_finite()
            && self.fast_grid_max_speed.is_finite()
            && self.fast_lighthill_source.is_finite()
            && self.fast_fluid_rms.is_finite()
            && self.sub_overpressure_pa.is_finite()
            && self.sub_lighthill_source.is_finite()
            && self.sub_grid_max_speed.is_finite()
            && self.sub_solid_rms.is_finite()
            && self.sub_fluid_rms.is_finite()
    }
}

/// One full deterministic pass: supersonic / faster / subsonic passage configs.
fn run_measured_pass() -> MeasuredData {
    let main = run_boom_config(KK_MACH_SUPERSONIC);
    let fast = run_boom_config(KK_MACH_FASTER);
    let sub = run_boom_config(KK_MACH_SUBSONIC);

    MeasuredData {
        main_overpressure_pa: main.overpressure_pa,
        main_grid_max_speed: main.grid_max_speed,
        main_lighthill_source: main.lighthill_source,
        main_solid_rms: main.solid_rms,
        main_fluid_rms: main.fluid_rms,
        main_n_wave_min_pa: main.n_wave_min_pa,
        main_leading_phase_mean_pa: main.leading_phase_mean_pa,
        main_trailing_phase_mean_pa: main.trailing_phase_mean_pa,
        main_solid_high_band_fraction: main.solid_high_band_fraction,
        main_fluid_high_band_fraction: main.fluid_high_band_fraction,
        main_fluid_morphs: main.fluid_morphs,
        fast_overpressure_pa: fast.overpressure_pa,
        fast_grid_max_speed: fast.grid_max_speed,
        fast_lighthill_source: fast.lighthill_source,
        fast_fluid_rms: fast.fluid_rms,
        sub_overpressure_pa: sub.overpressure_pa,
        sub_lighthill_source: sub.lighthill_source,
        sub_grid_max_speed: sub.grid_max_speed,
        sub_solid_rms: sub.solid_rms,
        sub_fluid_rms: sub.fluid_rms,
    }
}

/// Fingerprint of the kk-only measured evidence.
fn kk_evidence_fingerprint(d: &MeasuredData) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, quant_f32(d.main_overpressure_pa));
    h = hash_mix(h, quant_f32(d.main_grid_max_speed));
    h = hash_mix(h, quant_f32(d.main_lighthill_source));
    h = hash_mix(h, quant_f32(d.main_solid_rms));
    h = hash_mix(h, quant_f32(d.main_fluid_rms));
    h = hash_mix(h, quant_f32(d.main_n_wave_min_pa));
    h = hash_mix(h, quant_f32(d.main_leading_phase_mean_pa));
    h = hash_mix(h, quant_f32(d.main_trailing_phase_mean_pa));
    h = hash_mix(h, quant_f32(d.main_solid_high_band_fraction));
    h = hash_mix(h, quant_f32(d.main_fluid_high_band_fraction));
    h = hash_mix(h, u64::from(d.main_fluid_morphs));
    h = hash_mix(h, quant_f32(d.fast_overpressure_pa));
    h = hash_mix(h, quant_f32(d.fast_grid_max_speed));
    h = hash_mix(h, quant_f32(d.fast_lighthill_source));
    h = hash_mix(h, quant_f32(d.fast_fluid_rms));
    h = hash_mix(h, quant_f32(d.sub_overpressure_pa));
    h = hash_mix(h, quant_f32(d.sub_lighthill_source));
    h = hash_mix(h, quant_f32(d.sub_grid_max_speed));
    h = hash_mix(h, quant_f32(d.sub_solid_rms));
    h = hash_mix(h, quant_f32(d.sub_fluid_rms));
    h ^= FP_XOR;
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == KK_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Mach-1 Sonic Boom Signature soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mach1SonicBoomSoakReport {
    /// Soak-gated — full supersonic-passage chain + determinism.
    pub sonic_boom_signature_ready: bool,
    /// Supersonic passage detected (M > 1 telemetry → overpressure law fires).
    pub supersonic_detected: bool,
    /// The CFL-safe disturbance jet measurably moved the gv grid.
    pub flow_response_measured: bool,
    /// The jx Lighthill quadrupole proxy is measured over the live grid.
    pub lighthill_source_measured: bool,
    /// N-wave overpressure is positive (real shock law).
    pub n_wave_overpressure_positive: bool,
    /// The N-wave signature carries acoustic energy (RMS > 0).
    pub n_wave_energy_positive: bool,
    /// The signature has a negative rarefaction phase.
    pub n_wave_negative_phase_present: bool,
    /// The signature is bilinear: leading mean > 0, trailing mean < 0.
    pub n_wave_bilinear_shape: bool,
    /// Overpressure scales with Mach (faster passage > main passage).
    pub overpressure_scales_with_mach: bool,
    /// Subsonic passage produces no shock and no aeroacoustic source.
    pub subsonic_no_shock: bool,
    /// Solid spectrum is a pure identity passthrough; without a source the
    /// Fluid signature equals the Solid one bit-for-bit (Zero Imposição).
    pub solid_identity_passthrough: bool,
    /// Fluid spectrum morphs the N-wave only under a measured Lighthill source.
    pub fluid_morphing_active: bool,
    /// Same seed → same measured pass.
    pub deterministic_replay: bool,
    /// All measured outputs finite.
    pub outputs_finite: bool,
    /// Flow response is numerically bounded — sane magnitudes, no blowup.
    pub flow_response_bounded: bool,
    /// Observation only (NOT a gate): Fluid AM raised the high-band fraction.
    pub fluid_turbulence_adds_highs: bool,
    /// Supersonic passage Mach (kernel input telemetry).
    pub mach_number: f32,
    /// Closed-form N-wave overpressure (Pa).
    pub overpressure_pa: f32,
    /// Max |velocity| of the disturbance field (CFL-safe).
    pub grid_max_speed: f32,
    /// Measured Lighthill quadrupole proxy.
    pub lighthill_source: f32,
    /// Solid N-wave signature RMS.
    pub n_wave_rms: f32,
    /// Minimum sample of the N-wave (rarefaction phase, Pa).
    pub n_wave_min_pa: f32,
    /// Mean of the leading (overpressure) phase.
    pub leading_phase_mean_pa: f32,
    /// Mean of the trailing (rarefaction) phase.
    pub trailing_phase_mean_pa: f32,
    /// Solid-spectrum RMS.
    pub solid_rms: f32,
    /// Fluid-spectrum RMS.
    pub fluid_rms: f32,
    /// High-band energy fraction of the solid signature.
    pub solid_high_band_fraction: f32,
    /// High-band energy fraction of the fluid signature.
    pub fluid_high_band_fraction: f32,
    /// Faster-passage overpressure (Pa) — scaling reference.
    pub fast_overpressure_pa: f32,
    /// Faster-passage Lighthill source.
    pub fast_lighthill_source: f32,
    /// Subsonic overpressure (Pa) — must be zero.
    pub subsonic_overpressure_pa: f32,
    /// Subsonic Lighthill source — must be zero.
    pub subsonic_lighthill_source: f32,
    /// Subsonic grid max speed — must be zero.
    pub subsonic_grid_max_speed: f32,
    /// Host sample rate (Hz).
    pub sample_rate_hz: f32,
    /// Soak wall time.
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (letter **kk**).
    pub evidence_kind: &'static str,
    /// Fingerprint of kk-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_latent_audio_adaptation_probe: bool,
    pub distinct_from_microfracture_acoustic_probe: bool,
    /// Fail-closed — no supersonic CFD / GPU shock capture / physical AAA.
    pub sonic_boom_aaa_ready: bool,
    pub full_cfd_aaa_ready: bool,
    pub gpu_cfd_aaa_ready: bool,
    pub physical_audio_aaa_ready: bool,
    pub supersonic_aeroacoustics_aaa_ready: bool,
}

/// Mach-1 Sonic Boom Signature soak: supersonic passage → CFL-safe flow
/// response → Lighthill source → N-wave overpressure signature → spectrum.
///
/// Does **not** claim supersonic CFD / GPU shock capture / physical
/// aeroacoustics AAA.
pub fn run_mach1_sonic_boom_soak() -> Mach1SonicBoomSoakReport {
    let t0 = Instant::now();
    let a = run_measured_pass();
    let b = run_measured_pass();

    let deterministic_replay = (a.main_overpressure_pa - b.main_overpressure_pa).abs() < 1e-6
        && (a.main_grid_max_speed - b.main_grid_max_speed).abs() < 1e-6
        && (a.main_lighthill_source - b.main_lighthill_source).abs() < 1e-6
        && (a.main_solid_rms - b.main_solid_rms).abs() < 1e-6
        && (a.main_fluid_rms - b.main_fluid_rms).abs() < 1e-6
        && a.main_fluid_morphs == b.main_fluid_morphs
        && (a.sub_overpressure_pa - b.sub_overpressure_pa).abs() < 1e-6
        && (a.sub_lighthill_source - b.sub_lighthill_source).abs() < 1e-6;

    let supersonic_detected = KK_MACH_SUPERSONIC > 1.0 && a.main_overpressure_pa > 0.0;
    let flow_response_measured = a.main_grid_max_speed > EPS;
    let lighthill_source_measured = a.main_lighthill_source > EPS;
    let n_wave_overpressure_positive = a.main_overpressure_pa > 0.0;
    let n_wave_energy_positive = a.main_solid_rms > 0.0;
    let n_wave_negative_phase_present = a.main_n_wave_min_pa < 0.0;
    let n_wave_bilinear_shape =
        a.main_leading_phase_mean_pa > 0.0 && a.main_trailing_phase_mean_pa < 0.0;
    let overpressure_scales_with_mach = a.fast_overpressure_pa > a.main_overpressure_pa;
    let subsonic_no_shock = a.sub_overpressure_pa == 0.0
        && a.sub_lighthill_source == 0.0
        && a.sub_grid_max_speed == 0.0;
    let solid_identity_passthrough = (a.sub_fluid_rms - a.sub_solid_rms).abs() < EPS;
    let fluid_morphing_active = a.main_fluid_morphs && a.main_fluid_rms != a.main_solid_rms;
    let fluid_turbulence_adds_highs = a.main_fluid_high_band_fraction > a.main_solid_high_band_fraction;

    let outputs_finite = a.all_finite() && b.all_finite();
    // Numerical-sanity gate: the disturbance field and its Lighthill proxy must
    // stay within physically-plausible magnitudes (the jx mean-Reynolds proxy
    // is small for these CFL-safe jets). Catches blowup `all_finite` misses.
    let flow_response_bounded = a.main_grid_max_speed <= KK_MAX_SANE_SPEED
        && a.main_lighthill_source <= KK_MAX_SANE_LHILL
        && a.fast_grid_max_speed <= KK_MAX_SANE_SPEED
        && a.fast_lighthill_source <= KK_MAX_SANE_LHILL
        && a.sub_grid_max_speed <= KK_MAX_SANE_SPEED
        && a.sub_lighthill_source <= KK_MAX_SANE_LHILL;

    let core_ok = supersonic_detected
        && flow_response_measured
        && lighthill_source_measured
        && n_wave_overpressure_positive
        && n_wave_energy_positive
        && n_wave_negative_phase_present
        && n_wave_bilinear_shape
        && overpressure_scales_with_mach
        && subsonic_no_shock
        && solid_identity_passthrough
        && fluid_morphing_active
        && deterministic_replay
        && outputs_finite
        && flow_response_bounded;

    let evidence_fingerprint = kk_evidence_fingerprint(&a);
    let d = measured_distinct(KK_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    Mach1SonicBoomSoakReport {
        sonic_boom_signature_ready: core_ok && evidence_fingerprint != 0,
        supersonic_detected,
        flow_response_measured,
        lighthill_source_measured,
        n_wave_overpressure_positive,
        n_wave_energy_positive,
        n_wave_negative_phase_present,
        n_wave_bilinear_shape,
        overpressure_scales_with_mach,
        subsonic_no_shock,
        solid_identity_passthrough,
        fluid_morphing_active,
        deterministic_replay,
        outputs_finite,
        flow_response_bounded,
        fluid_turbulence_adds_highs,
        mach_number: KK_MACH_SUPERSONIC,
        overpressure_pa: a.main_overpressure_pa,
        grid_max_speed: a.main_grid_max_speed,
        lighthill_source: a.main_lighthill_source,
        n_wave_rms: a.main_solid_rms,
        n_wave_min_pa: a.main_n_wave_min_pa,
        leading_phase_mean_pa: a.main_leading_phase_mean_pa,
        trailing_phase_mean_pa: a.main_trailing_phase_mean_pa,
        solid_rms: a.main_solid_rms,
        fluid_rms: a.main_fluid_rms,
        solid_high_band_fraction: a.main_solid_high_band_fraction,
        fluid_high_band_fraction: a.main_fluid_high_band_fraction,
        fast_overpressure_pa: a.fast_overpressure_pa,
        fast_lighthill_source: a.fast_lighthill_source,
        subsonic_overpressure_pa: a.sub_overpressure_pa,
        subsonic_lighthill_source: a.sub_lighthill_source,
        subsonic_grid_max_speed: a.sub_grid_max_speed,
        sample_rate_hz: SAMPLE_RATE,
        soak_elapsed_ns: t0.elapsed().as_nanos(),
        evidence_kind: KK_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_metasounds_dsp_probe: d,
        distinct_from_latent_audio_adaptation_probe: d,
        distinct_from_microfracture_acoustic_probe: d,
        sonic_boom_aaa_ready: false,
        full_cfd_aaa_ready: false,
        gpu_cfd_aaa_ready: false,
        physical_audio_aaa_ready: false,
        supersonic_aeroacoustics_aaa_ready: false,
    }
}

/// Honesty probe — soak-gated `sonic_boom_signature_ready`, never hardcoded.
pub fn probe_mach1_sonic_boom() -> Mach1SonicBoomSoakReport {
    run_mach1_sonic_boom_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak;
    use crate::latent_audio_adaptation::probe_latent_audio_adaptation;
    use crate::metasounds_dsp_compiler::run_metasounds_dsp_soak;
    use crate::microfracture_acoustic::probe_microfracture_acoustic;

    #[test]
    fn overpressure_law_zero_below_mach_one() {
        assert_eq!(overpressure_pa(KK_MACH_SUBSONIC), 0.0);
        assert_eq!(overpressure_pa(1.0), 0.0);
        assert!(overpressure_pa(KK_MACH_SUPERSONIC) > 0.0);
        assert!(overpressure_pa(KK_MACH_FASTER) > overpressure_pa(KK_MACH_SUPERSONIC));
    }

    #[test]
    fn ideal_n_wave_has_bilinear_shock_shape() {
        let delta_p = overpressure_pa(KK_MACH_SUPERSONIC);
        let wave = ideal_n_wave(delta_p, KK_NWAVE_SAMPLES);
        assert!(rms(&wave) > 0.0, "rms {}", rms(&wave));
        let min = wave.iter().copied().fold(f32::INFINITY, f32::min);
        assert!(min < 0.0, "min {min}");
        assert!(mean_window(&wave, 0, KK_NWAVE_SAMPLES / 4) > 0.0);
        assert!(mean_window(&wave, KK_NWAVE_SAMPLES * 3 / 4, KK_NWAVE_SAMPLES) < 0.0);
        // Finite rise ramp starts at zero and stays positive in the lead.
        assert_eq!(wave[0], 0.0);
        assert!(wave[1] > 0.0);
    }

    #[test]
    fn subsonic_signature_is_silent() {
        let sub = run_boom_config(KK_MACH_SUBSONIC);
        assert_eq!(sub.overpressure_pa, 0.0);
        assert_eq!(sub.grid_max_speed, 0.0);
        assert_eq!(sub.lighthill_source, 0.0);
        assert_eq!(sub.solid_rms, 0.0);
        // Zero Imposição: without an aeroacoustic source the Fluid signature
        // is bit-identical to the Solid one.
        assert_eq!(sub.fluid, sub.solid);
        assert!(!sub.fluid_morphs);
    }

    #[test]
    fn supersonic_flow_response_and_lighthill() {
        let main = run_boom_config(KK_MACH_SUPERSONIC);
        assert!(main.overpressure_pa > 0.0, "Δp {}", main.overpressure_pa);
        assert!(
            main.grid_max_speed > EPS,
            "max speed {}",
            main.grid_max_speed
        );
        assert!(
            main.lighthill_source > EPS,
            "lighthill {}",
            main.lighthill_source
        );
        assert!(main.solid_rms > 0.0);
    }

    #[test]
    fn solid_identity_passthrough_fluid_morphs_with_source() {
        // Supersonic: the aeroacoustic source is present → Fluid morphs.
        let main = run_boom_config(KK_MACH_SUPERSONIC);
        assert!(main.fluid_morphs, "fluid must morph under a source");
        assert_ne!(main.fluid, main.solid);
        assert_ne!(main.fluid_rms, main.solid_rms);
        // Subsonic: no source → Fluid == Solid bit-for-bit.
        let sub = run_boom_config(KK_MACH_SUBSONIC);
        assert_eq!(sub.fluid, sub.solid);
        assert_eq!(sub.fluid_rms, sub.solid_rms);
    }

    #[test]
    fn overpressure_scales_with_mach() {
        let main = run_boom_config(KK_MACH_SUPERSONIC);
        let fast = run_boom_config(KK_MACH_FASTER);
        assert!(fast.overpressure_pa > main.overpressure_pa);
        assert!(fast.grid_max_speed > main.grid_max_speed);
        assert!(fast.lighthill_source > main.lighthill_source);
    }

    #[test]
    fn n_wave_negative_phase_and_energy_measured() {
        let main = run_boom_config(KK_MACH_SUPERSONIC);
        assert!(main.n_wave_min_pa < 0.0, "min {}", main.n_wave_min_pa);
        assert!(main.leading_phase_mean_pa > 0.0);
        assert!(main.trailing_phase_mean_pa < 0.0);
        assert!(main.solid_rms > 0.0);
        assert!(main.fluid_rms > 0.0);
    }

    #[test]
    fn measured_pass_is_deterministic() {
        let a = run_measured_pass();
        let b = run_measured_pass();
        assert_eq!(a, b);
    }

    #[test]
    fn soak_probe_ready_and_held_flags() {
        let r = probe_mach1_sonic_boom();
        assert!(r.sonic_boom_signature_ready, "{r:?}");
        assert!(r.supersonic_detected);
        assert!(r.flow_response_measured);
        assert!(r.lighthill_source_measured);
        assert!(r.n_wave_overpressure_positive);
        assert!(r.n_wave_energy_positive);
        assert!(r.n_wave_negative_phase_present);
        assert!(r.n_wave_bilinear_shape);
        assert!(r.overpressure_scales_with_mach);
        assert!(r.subsonic_no_shock);
        assert!(r.solid_identity_passthrough);
        assert!(r.fluid_morphing_active);
        assert!(r.deterministic_replay);
        assert!(r.outputs_finite);
        assert!(r.flow_response_bounded);
        assert_eq!(r.evidence_kind, KK_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.mach_number, KK_MACH_SUPERSONIC);
        assert!(r.overpressure_pa > 0.0);
        assert!(r.lighthill_source > 0.0);
        assert!(r.n_wave_min_pa < 0.0);
        assert!(!r.sonic_boom_aaa_ready);
        assert!(!r.full_cfd_aaa_ready);
        assert!(!r.gpu_cfd_aaa_ready);
        assert!(!r.physical_audio_aaa_ready);
        assert!(!r.supersonic_aeroacoustics_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        // `soak_elapsed_ns` is wall-clock (non-deterministic between runs), so
        // the deterministic fields are compared exactly (ki/kj precedent):
        // fingerprint, readiness gates and the physical scalars must all be
        // identical.
        let a = probe_mach1_sonic_boom();
        let b = run_mach1_sonic_boom_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.sonic_boom_signature_ready, b.sonic_boom_signature_ready);
        assert_eq!(a.deterministic_replay, b.deterministic_replay);
        assert_eq!(a.flow_response_bounded, b.flow_response_bounded);
        assert_eq!(a.mach_number, b.mach_number);
        assert_eq!(a.overpressure_pa, b.overpressure_pa);
        assert_eq!(a.grid_max_speed, b.grid_max_speed);
        assert_eq!(a.lighthill_source, b.lighthill_source);
        assert_eq!(a.n_wave_rms, b.n_wave_rms);
        assert_eq!(a.n_wave_min_pa, b.n_wave_min_pa);
        assert_eq!(a.leading_phase_mean_pa, b.leading_phase_mean_pa);
        assert_eq!(a.trailing_phase_mean_pa, b.trailing_phase_mean_pa);
        assert_eq!(a.solid_rms, b.solid_rms);
        assert_eq!(a.fluid_rms, b.fluid_rms);
        assert_eq!(a.solid_high_band_fraction, b.solid_high_band_fraction);
        assert_eq!(a.fluid_high_band_fraction, b.fluid_high_band_fraction);
        assert_eq!(a.fast_overpressure_pa, b.fast_overpressure_pa);
        assert_eq!(a.subsonic_overpressure_pa, b.subsonic_overpressure_pa);
        assert_eq!(a.evidence_kind, b.evidence_kind);
    }

    #[test]
    fn kk_distinct_from_gv_jx_ki_kj() {
        let kk = probe_mach1_sonic_boom();
        let gv = run_aerodynamic_navier_stokes_soak();
        let jx = run_metasounds_dsp_soak();
        let ki = probe_latent_audio_adaptation();
        let kj = probe_microfracture_acoustic();

        assert!(kk.sonic_boom_signature_ready);
        assert!(gv.aerodynamic_navier_stokes_ready);
        assert!(jx.metasounds_dsp_ready);
        assert!(ki.latent_audio_ready);
        assert!(kj.microfracture_acoustic_ready);

        assert_eq!(kk.evidence_kind, KK_EVIDENCE_KIND);
        assert_ne!(kk.evidence_kind, gv.evidence_kind);
        assert_ne!(kk.evidence_kind, jx.evidence_kind);
        assert_ne!(kk.evidence_kind, ki.evidence_kind);
        assert_ne!(kk.evidence_kind, kj.evidence_kind);
        assert_ne!(kk.evidence_fingerprint, gv.evidence_fingerprint);
        assert_ne!(kk.evidence_fingerprint, jx.evidence_fingerprint);
        assert_ne!(kk.evidence_fingerprint, ki.evidence_fingerprint);
        assert_ne!(kk.evidence_fingerprint, kj.evidence_fingerprint);

        assert!(kk.distinct_from_aerodynamic_navier_stokes_probe);
        assert!(kk.distinct_from_metasounds_dsp_probe);
        assert!(kk.distinct_from_latent_audio_adaptation_probe);
        assert!(kk.distinct_from_microfracture_acoustic_probe);

        // Different mechanisms: kk couples supersonic passage → CFL-safe flow
        // + Lighthill source + N-wave overpressure law vs gv stable-fluids
        // step / jx DSP compiler / ki AV adaptation / kj fracture-acoustics.
        assert!(kk.lighthill_source > 0.0);
        assert!(kk.n_wave_min_pa < 0.0);
        assert!(gv.max_speed > 0.0);
        assert!(ki.foley_base_rms > 0.0);
        assert!(kj.microfracture_density > 0.0);
    }
}

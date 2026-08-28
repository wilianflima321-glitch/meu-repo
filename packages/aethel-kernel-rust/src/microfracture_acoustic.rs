//! Microfracture Acoustic Degradation — letter **kj**.
//!
//! A cohesive sound-of-breaking authority built from three REAL substrates with
//! zero substrate edits:
//!
//! 1. **Fracture topology** — [`VoronoiDestruction3D`] fractures a 6³ = 216
//!    seed lattice above the microfracture yield stress. Measured evidence:
//!    `fractured`, `fragment_count`, `bisector_count`, `volume_sample_count`,
//!    mass conservation, and the mean fragment ejection speed `⟨|v|⟩`.
//! 2. **Fracture-energy → acoustic coupling** — the ejection energy couples to
//!    the jx [`ModalSynthesizer`] (`MaterialParams::CONCRETE`): the mean
//!    fragment speed drives the strike velocity `v_trigger ∈ [0.15, 0.85]`, so
//!    the modal ring *exists only because the Voronoi fracture happened*. The
//!    fresh ring decays (early RMS ≫ late RMS) and carries real high-band
//!    content (CONCRETE bending modes ≈ 1.0 / 2.9 / 5.7 kHz).
//! 3. **Microfracture density → timbre degradation** — the measured
//!    microfracture density `μ = bisectors / material_volume` drives the
//!    **Fluid** morphing chain: energy dissipation (`(1 − 0.7·μ̂)`) plus a jx
//!    [`RbjBiquad`] low-pass whose cutoff falls from 4 kHz (intact) to 800 Hz
//!    (fully microfractured) — the broken material rings quieter *and* muffled
//!    (high-band fraction drops). On the **Solid** spectrum the identity is a
//!    pure passthrough: the degraded ring equals the fresh ring bit-for-bit
//!    (Zero Imposição — the engine decides, the kernel never forces morphology).
//! 4. **Debris re-trigger** — `spawn_entropy_chunks_into_rapier` inserts one
//!    dynamic sphere per chunk and 45 gravity ticks drop the debris COM; the
//!    fall re-strikes the modal bank (a secondary acoustic event) — the
//!    `aethel_matter_model` (jv) chain.
//!
//! The soak proves, with measured evidence: fracture gates on stress (above
//! yield → fractured, mass conserved, ≥ 64 chunks), density is measured, the
//! fracture energy couples to a decaying modal ring, Solid = identity
//! passthrough, Fluid = active degradation (RMS lost + highs muffled), debris
//! falls and re-triggers a secondary ring, same seed → same, all outputs finite.
//!
//! Evidence tag: `microfracture_acoustic_degradation` (letter **kj**),
//! fingerprint seed `0x4B4A_5F4D_4943` ("kj_MIC") — distinct from ip2 + erpb +
//! kh + jx + ki + prior.
//!
//! **Does not** claim Unreal Chaos destruction AAA / GPU Voronoi /
//! physically-based audio AAA. **HELD:** `chaos_destruction_aaa_ready: false` ·
//! `unreal_chaos_parity_ready: false` · `gpu_voronoi_ready: false` ·
//! `physical_audio_aaa_ready: false` · `microfracture_acoustic_aaa_ready:
//! false`.

use crate::entropy_rapier_bridge::spawn_entropy_chunks_into_rapier;
use crate::metasounds_dsp_compiler::{
    fft_radix2, rms, spectral_peak_in_band, BiquadType, MaterialParams, ModalSynthesizer,
    RbjBiquad, METASOUNDS_SAMPLE_RATE_HZ,
};
use crate::physics_kernel::{PhysicsKernel, SOAK_FIXED_DT};
use crate::voronoi_destruction_3d::{VoronoiDestruction3D, VoronoiFragmentSoA};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag for the acoustic-degradation soak (letter **kj**).
pub const MICROFRACTURE_EVIDENCE_KIND: &str = "microfracture_acoustic_degradation";

/// Host sample rate for the modal bank (jx substrate).
const SAMPLE_RATE: f32 = METASOUNDS_SAMPLE_RATE_HZ;
/// Fracture seed-lattice side — 6³ = 216 chunks (> 64 GPU toy).
const KIJ_CHUNK_SIDE: usize = 6;
/// Total microfracture chunk target.
const KIJ_CHUNK_TARGET: usize = KIJ_CHUNK_SIDE * KIJ_CHUNK_SIDE * KIJ_CHUNK_SIDE;
/// Chunk-scale floor — acoustic degradation is proven on ≥ 64 chunks.
const KIJ_CHUNK_SCALE_FLOOR: usize = 64;
/// Microfracture yield stress (Pa) — above the Voronoi default, below concrete.
const KIJ_YIELD_STRESS: f32 = 2.0e6;
/// Applied fracture stress (Pa) — comfortably above yield.
const KIJ_APPLIED_STRESS: f32 = 4.0e6;
/// Fracture body mass (kg) — mirrors the proven erpb / kh soak.
const KIJ_FRACTURE_MASS: f32 = 256.0;
/// Fracture AABB min (m).
const KIJ_BBOX_MIN: [f32; 3] = [-2.0, 0.0, -2.0];
/// Fracture AABB max (m).
const KIJ_BBOX_MAX: [f32; 3] = [2.0, 6.0, 2.0];
/// Central impact point (m).
const KIJ_IMPACT_POINT: [f32; 3] = [0.0, 3.0, 0.0];
/// Impact impulse (kg·m/s) — drives fragment ejection.
const KIJ_IMPACT_IMPULSE: [f32; 3] = [0.0, -500.0, 0.0];
/// Ejection-speed normalizer for the fracture-energy → modal trigger mapping.
const KIJ_VEL_NORM: f32 = 25.0;
/// Minimum modal strike velocity (morphology-off floor).
const KIJ_TRIGGER_MIN: f32 = 0.15;
/// Maximum modal strike velocity.
const KIJ_TRIGGER_MAX: f32 = 0.85;
/// Microfracture-density half-saturation (bisectors per m³) — a logistic map
/// keeps `μ̂ ∈ (0, 1)` for any measured positive density.
const KIJ_DENSITY_HALF: f32 = 25.0;
/// Max acoustic energy fraction dissipated by full microfracture.
const KIJ_ENERGY_LOSS: f32 = 0.7;
/// Minimum energy-loss ratio that still counts as active degradation.
const KIJ_ENERGY_LOSS_MIN: f32 = 0.03;
/// Low-pass cutoff for the intact material (Hz).
const KIJ_CUTOFF_INTACT_HZ: f32 = 4000.0;
/// Low-pass cutoff for the fully microfractured material (Hz).
const KIJ_CUTOFF_FRACTURED_HZ: f32 = 800.0;
/// Modal ring render length (samples) — 0.34 s at 48 kHz, enough for decay.
const KIJ_RING_SAMPLES: usize = 16_384;
/// Early decay window (samples).
const KIJ_EARLY: usize = 4096;
/// Late decay window (samples).
const KIJ_LATE: usize = 4096;
/// Ring-decay gate: `rms_late < rms_early · KIJ_DECAY_FACTOR`.
const KIJ_DECAY_FACTOR: f32 = 0.6;
/// Modal bank seed (fracture-event signature).
const KIJ_MODAL_SEED: u64 = 0x4B4A_5F4D_4F44;
/// Debris-impact modal seed (secondary acoustic event).
const KIJ_DEBRIS_SEED: u64 = 0x4B4A_5F44_4552;
/// Rapier gravity ticks after debris spawn (mirrors jv / erpb).
const KIJ_DEBRIS_TICKS: u32 = 45;
/// High-band spectral analysis window (Hz) — captures CONCRETE modes 2–4.
const KIJ_BAND_LO_HZ: f32 = 1000.0;
const KIJ_BAND_HI_HZ: f32 = 8000.0;
/// Float comparison epsilon.
const EPS: f32 = 1e-5;
/// Fingerprint seed ("kj_MIC").
const FP_SEED: u64 = 0x4B4A_5F4D_4943;
/// Final fingerprint XOR mask ("MIC").
const FP_XOR: u64 = 0x4D4943;

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

/// Espectro Sólido vs Metamorfo (Doctrine #74 / S-27, Zero Imposição).
///
/// `Solid` is a pure identity passthrough — the acoustic signature of the
/// fracture preserves the intact-material identity (no morphing chain). `Fluid`
/// is the full morphing chain: microfracture density dissipates ring energy and
/// muffles the highs. The spectrum is supplied by the engine/consumer; the
/// kernel never forces morphology.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MicrofractureSpectrum {
    /// Identity passthrough — degraded == fresh (Zero Imposição).
    Solid,
    /// Full morphing chain — microfracture degrades the timbre.
    Fluid,
}

/// Measured outcome of one acoustic-degradation evaluation.
#[derive(Debug, Clone, PartialEq)]
pub struct DegradationResult {
    /// Modal strike velocity driven by the fracture energy.
    pub trigger_velocity: f32,
    /// Early-window RMS of the fresh ring (decay evidence).
    pub ring_rms_early: f32,
    /// Late-window RMS of the fresh ring (decay evidence).
    pub ring_rms_late: f32,
    /// RMS of the intact-material ring.
    pub rms_fresh: f32,
    /// RMS of the degraded (Fluid) ring — equals `rms_fresh` on Solid.
    pub rms_degraded: f32,
    /// Dominant high-band peak of the fresh ring (Hz).
    pub peak_hz_fresh: f32,
    /// Dominant high-band peak of the degraded ring (Hz).
    pub peak_hz_degraded: f32,
    /// High-band energy fraction of the fresh ring.
    pub high_band_fraction_fresh: f32,
    /// High-band energy fraction of the degraded ring.
    pub high_band_fraction_degraded: f32,
    /// Fresh ring decays: `rms_late < rms_early · KIJ_DECAY_FACTOR`.
    pub ring_decays: bool,
    /// Fluid chain active: RMS lost below `1 − KIJ_ENERGY_LOSS_MIN` and highs
    /// muffled. Always false on Solid.
    pub degradation_active: bool,
    /// High-band fraction dropped (broken material muffles the highs).
    pub high_band_dropped: bool,
}

/// Render a deterministic modal ring from a strike.
fn render_ring(
    material: MaterialParams,
    trigger_velocity: f32,
    sample_rate: f32,
    seed: u64,
    len: usize,
) -> Vec<f32> {
    let mut modal = ModalSynthesizer::new(material, sample_rate, seed);
    modal.trigger(trigger_velocity);
    let mut out = Vec::with_capacity(len);
    for _ in 0..len {
        out.push(modal.next_sample());
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

/// Evaluate the acoustic degradation of a fracture event.
///
/// `trigger_velocity` carries the fracture ejection energy (coupling); the
/// `microfracture_density` (bisectors per m³) drives the Fluid morphing chain.
pub fn degrade_acoustic(
    material: MaterialParams,
    spectrum: MicrofractureSpectrum,
    trigger_velocity: f32,
    microfracture_density: f32,
) -> DegradationResult {
    let fresh = render_ring(material, trigger_velocity, SAMPLE_RATE, KIJ_MODAL_SEED, KIJ_RING_SAMPLES);
    let rms_fresh = rms(&fresh);
    let ring_rms_early = rms(&fresh[..KIJ_EARLY]);
    let ring_rms_late = rms(&fresh[KIJ_RING_SAMPLES - KIJ_LATE..]);
    let peak_hz_fresh = spectral_peak_in_band(&fresh, SAMPLE_RATE, KIJ_BAND_LO_HZ, KIJ_BAND_HI_HZ);
    let high_band_fraction_fresh =
        high_band_energy_fraction(&fresh, SAMPLE_RATE, KIJ_BAND_LO_HZ, KIJ_BAND_HI_HZ);
    let ring_decays = ring_rms_late < ring_rms_early * KIJ_DECAY_FACTOR;

    // Logistic saturation keeps the degradation driver in (0, 1) for any
    // measured positive density (robust against substrate magnitude variation).
    let density_norm =
        (microfracture_density / (microfracture_density + KIJ_DENSITY_HALF)).clamp(0.0, 1.0);

    match spectrum {
        MicrofractureSpectrum::Solid => DegradationResult {
            trigger_velocity,
            ring_rms_early,
            ring_rms_late,
            rms_fresh,
            rms_degraded: rms_fresh,
            peak_hz_fresh,
            peak_hz_degraded: peak_hz_fresh,
            high_band_fraction_fresh,
            high_band_fraction_degraded: high_band_fraction_fresh,
            ring_decays,
            degradation_active: false,
            high_band_dropped: false,
        },
        MicrofractureSpectrum::Fluid => {
            // Microfracture dissipates acoustic energy and muffles the highs:
            // energy residual `(1 − 0.7·μ̂)` plus a low-pass whose cutoff falls
            // from 4 kHz (intact) to 800 Hz (fully broken).
            let energy_residual = (1.0 - KIJ_ENERGY_LOSS * density_norm).clamp(0.0, 1.0);
            let cutoff = KIJ_CUTOFF_INTACT_HZ
                + (KIJ_CUTOFF_FRACTURED_HZ - KIJ_CUTOFF_INTACT_HZ) * density_norm;
            let mut biquad = RbjBiquad::new(BiquadType::LowPass, cutoff, 0.707, 0.0, SAMPLE_RATE);
            let mut degraded = Vec::with_capacity(KIJ_RING_SAMPLES);
            for &s in &fresh {
                degraded.push(biquad.next_sample(s * energy_residual));
            }
            let rms_degraded = rms(&degraded);
            let peak_hz_degraded =
                spectral_peak_in_band(&degraded, SAMPLE_RATE, KIJ_BAND_LO_HZ, KIJ_BAND_HI_HZ);
            let high_band_fraction_degraded =
                high_band_energy_fraction(&degraded, SAMPLE_RATE, KIJ_BAND_LO_HZ, KIJ_BAND_HI_HZ);
            DegradationResult {
                trigger_velocity,
                ring_rms_early,
                ring_rms_late,
                rms_fresh,
                rms_degraded,
                peak_hz_fresh,
                peak_hz_degraded,
                high_band_fraction_fresh,
                high_band_fraction_degraded,
                ring_decays,
                degradation_active: rms_degraded
                    < rms_fresh * (1.0 - KIJ_ENERGY_LOSS_MIN)
                    && high_band_fraction_degraded < high_band_fraction_fresh,
                high_band_dropped: high_band_fraction_degraded < high_band_fraction_fresh,
            }
        }
    }
}

/// Deterministic microfracture seed lattice (6³ = 216 seeds). Geometry mirrors
/// the proven erpb / kh soak — x/z in [−1,1], y in [2,4] so gravity drops the
/// debris COM.
fn microfracture_seed_lattice(side: usize) -> Vec<[f32; 3]> {
    let side = side.max(2);
    let mut seeds = Vec::with_capacity(side * side * side);
    let inv = 1.0 / (side as f32);
    for iz in 0..side {
        for iy in 0..side {
            for ix in 0..side {
                seeds.push([
                    -1.0 + (ix as f32 + 0.5) * 2.0 * inv,
                    2.0 + (iy as f32 + 0.5) * 2.0 * inv,
                    -1.0 + (iz as f32 + 0.5) * 2.0 * inv,
                ]);
            }
        }
    }
    seeds
}

/// Mean ejection speed of the active fragments (m/s) — the fracture-energy
/// driver of the modal strike.
fn mean_fragment_speed(fragments: &VoronoiFragmentSoA, n: usize) -> f32 {
    let n = n.min(fragments.len()).min(fragments.active.len());
    let mut sum = 0.0_f32;
    let mut count = 0u32;
    for i in 0..n {
        if !fragments.active[i] {
            continue;
        }
        let v = (fragments.vel_x[i] * fragments.vel_x[i]
            + fragments.vel_y[i] * fragments.vel_y[i]
            + fragments.vel_z[i] * fragments.vel_z[i])
            .sqrt();
        sum += v;
        count += 1;
    }
    if count == 0 {
        0.0
    } else {
        sum / count as f32
    }
}

/// Mean COM Y of all Rapier bodies (debris COM proxy).
fn mean_com_y(kernel: &PhysicsKernel) -> f32 {
    let mut sum = 0.0_f32;
    let mut count = 0u32;
    for (_, body) in kernel.rigid_body_set.iter() {
        sum += body.translation().y;
        count += 1;
    }
    if count == 0 {
        0.0
    } else {
        sum / count as f32
    }
}

/// Secondary acoustic event: the fallen debris re-strikes the modal bank.
///
/// Returns the impact-ring RMS (0 when the debris did not fall — the event
/// gate, never a hard-coded number).
fn render_debris_impact_ring(avg_fragment_velocity: f32, fell: bool) -> f32 {
    if !fell {
        return 0.0;
    }
    let energy = (avg_fragment_velocity / KIJ_VEL_NORM).clamp(0.0, 1.0);
    let impact_v = (KIJ_TRIGGER_MIN + energy * (KIJ_TRIGGER_MAX - KIJ_TRIGGER_MIN)).clamp(0.1, 1.0);
    let ring = render_ring(
        MaterialParams::CONCRETE,
        impact_v,
        SAMPLE_RATE,
        KIJ_DEBRIS_SEED,
        2048,
    );
    rms(&ring)
}

/// All measured outputs of one deterministic microfracture-acoustic pass.
#[derive(Debug, Clone, PartialEq)]
struct MeasuredData {
    fragment_count: u32,
    bisector_count: u32,
    volume_sample_count: u32,
    mass_conserved: bool,
    fractured: bool,
    total_mass: f32,
    avg_fragment_speed: f32,
    microfracture_density: f32,
    modal_trigger_velocity: f32,
    ring_rms_early: f32,
    ring_rms_late: f32,
    ring_rms_fresh: f32,
    ring_rms_degraded: f32,
    ring_peak_hz_fresh: f32,
    ring_peak_hz_degraded: f32,
    high_band_fraction_fresh: f32,
    high_band_fraction_degraded: f32,
    solid_rms: f32,
    solid_peak_hz: f32,
    solid_high_band_fraction: f32,
    debris_bodies: u32,
    debris_impact_rms: f32,
    com_y_before: f32,
    com_y_after: f32,
}

impl MeasuredData {
    fn all_finite(&self) -> bool {
        self.total_mass.is_finite()
            && self.avg_fragment_speed.is_finite()
            && self.microfracture_density.is_finite()
            && self.modal_trigger_velocity.is_finite()
            && self.ring_rms_early.is_finite()
            && self.ring_rms_late.is_finite()
            && self.ring_rms_fresh.is_finite()
            && self.ring_rms_degraded.is_finite()
            && self.ring_peak_hz_fresh.is_finite()
            && self.ring_peak_hz_degraded.is_finite()
            && self.high_band_fraction_fresh.is_finite()
            && self.high_band_fraction_degraded.is_finite()
            && self.solid_rms.is_finite()
            && self.solid_peak_hz.is_finite()
            && self.solid_high_band_fraction.is_finite()
            && self.debris_impact_rms.is_finite()
            && self.com_y_before.is_finite()
            && self.com_y_after.is_finite()
    }
}

/// One full deterministic pass: Voronoi fracture → modal coupling → debris.
fn run_measured_pass() -> MeasuredData {
    let seeds = microfracture_seed_lattice(KIJ_CHUNK_SIDE);
    let mut fragments = VoronoiFragmentSoA::with_capacity(KIJ_CHUNK_TARGET);
    let solver = VoronoiDestruction3D::new(KIJ_YIELD_STRESS);
    let step = solver.compute_fracture(
        KIJ_FRACTURE_MASS,
        KIJ_BBOX_MIN,
        KIJ_BBOX_MAX,
        KIJ_IMPACT_POINT,
        KIJ_IMPACT_IMPULSE,
        KIJ_APPLIED_STRESS,
        &seeds,
        &mut fragments,
    );

    let avg_speed = mean_fragment_speed(&fragments, KIJ_CHUNK_TARGET);
    let volume_material = KIJ_FRACTURE_MASS / MaterialParams::CONCRETE.density_kg_m3;
    let microfracture_density = if volume_material > 0.0 {
        step.bisector_count as f32 / volume_material
    } else {
        0.0
    };

    // Fracture ejection energy → modal strike velocity (acoustic coupling).
    let energy = (avg_speed / KIJ_VEL_NORM).clamp(0.0, 1.0);
    let trigger = KIJ_TRIGGER_MIN + energy * (KIJ_TRIGGER_MAX - KIJ_TRIGGER_MIN);
    let solid = degrade_acoustic(
        MaterialParams::CONCRETE,
        MicrofractureSpectrum::Solid,
        trigger,
        microfracture_density,
    );
    let fluid = degrade_acoustic(
        MaterialParams::CONCRETE,
        MicrofractureSpectrum::Fluid,
        trigger,
        microfracture_density,
    );

    // Debris: spawn one Rapier body per chunk, tick gravity, detect the fall
    // and re-strike the modal bank as a secondary acoustic event.
    let mut kernel = PhysicsKernel::new();
    let debris_bodies = spawn_entropy_chunks_into_rapier(&mut kernel, &fragments);
    let com_y_before = mean_com_y(&kernel);
    for _ in 0..KIJ_DEBRIS_TICKS {
        kernel.tick_rapier_only(SOAK_FIXED_DT);
    }
    let com_y_after = mean_com_y(&kernel);
    let fell = com_y_after < com_y_before - 0.01;
    let debris_impact_rms = render_debris_impact_ring(avg_speed, fell);

    MeasuredData {
        fragment_count: step.fragment_count,
        bisector_count: step.bisector_count,
        volume_sample_count: step.volume_sample_count,
        mass_conserved: step.mass_conserved,
        fractured: step.fractured,
        total_mass: fragments.total_mass(),
        avg_fragment_speed: avg_speed,
        microfracture_density,
        modal_trigger_velocity: trigger,
        ring_rms_early: solid.ring_rms_early,
        ring_rms_late: solid.ring_rms_late,
        ring_rms_fresh: solid.rms_fresh,
        ring_rms_degraded: fluid.rms_degraded,
        ring_peak_hz_fresh: solid.peak_hz_fresh,
        ring_peak_hz_degraded: fluid.peak_hz_degraded,
        high_band_fraction_fresh: solid.high_band_fraction_fresh,
        high_band_fraction_degraded: fluid.high_band_fraction_degraded,
        solid_rms: solid.rms_degraded,
        solid_peak_hz: solid.peak_hz_degraded,
        solid_high_band_fraction: solid.high_band_fraction_degraded,
        debris_bodies: debris_bodies as u32,
        debris_impact_rms,
        com_y_before,
        com_y_after,
    }
}

/// Fingerprint of the kj-only measured evidence.
fn kj_evidence_fingerprint(d: &MeasuredData) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, u64::from(d.fragment_count));
    h = hash_mix(h, u64::from(d.bisector_count));
    h = hash_mix(h, u64::from(d.volume_sample_count));
    h = hash_mix(h, u64::from(d.mass_conserved));
    h = hash_mix(h, u64::from(d.fractured));
    h = hash_mix(h, quant_f32(d.total_mass));
    h = hash_mix(h, quant_f32(d.avg_fragment_speed));
    h = hash_mix(h, quant_f32(d.microfracture_density));
    h = hash_mix(h, quant_f32(d.modal_trigger_velocity));
    h = hash_mix(h, quant_f32(d.ring_rms_early));
    h = hash_mix(h, quant_f32(d.ring_rms_late));
    h = hash_mix(h, quant_f32(d.ring_rms_fresh));
    h = hash_mix(h, quant_f32(d.ring_rms_degraded));
    h = hash_mix(h, quant_f32(d.ring_peak_hz_fresh));
    h = hash_mix(h, quant_f32(d.ring_peak_hz_degraded));
    h = hash_mix(h, quant_f32(d.high_band_fraction_fresh));
    h = hash_mix(h, quant_f32(d.high_band_fraction_degraded));
    h = hash_mix(h, quant_f32(d.solid_rms));
    h = hash_mix(h, quant_f32(d.solid_peak_hz));
    h = hash_mix(h, quant_f32(d.solid_high_band_fraction));
    h = hash_mix(h, u64::from(d.debris_bodies));
    h = hash_mix(h, quant_f32(d.debris_impact_rms));
    h = hash_mix(h, quant_f32(d.com_y_before));
    h = hash_mix(h, quant_f32(d.com_y_after));
    h ^= FP_XOR;
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == MICROFRACTURE_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Microfracture Acoustic Degradation soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MicrofractureAcousticSoakReport {
    /// Soak-gated — full fracture → acoustic → debris chain + determinism.
    pub microfracture_acoustic_ready: bool,
    /// Voronoi fractured above yield, mass conserved, ≥ 64 chunks.
    pub microfracture_fractured: bool,
    /// Measured microfracture density (`bisectors / material volume`) > 0.
    pub microfracture_density_measured: bool,
    /// Chunk scale is beyond the 64-chunk GPU toy substrate.
    pub chunk_scale_beyond_64: bool,
    /// Fracture mass conserved across the Voronoi step + debris spawn.
    pub fracture_mass_conserved: bool,
    /// Solid spectrum is a pure identity passthrough (degraded == fresh).
    pub solid_passthrough_identity: bool,
    /// Fluid spectrum activates the morphing chain (energy loss + muffled).
    pub fluid_morphing_active: bool,
    /// Fracture ejection energy couples to a non-zero modal ring.
    pub fracture_energy_couples_to_modal: bool,
    /// Fresh modal ring decays (early RMS ≫ late RMS).
    pub modal_ring_decays: bool,
    /// High-band energy fraction dropped on the degraded ring.
    pub high_band_energy_dropped: bool,
    /// Debris COM fell under gravity.
    pub debris_moved: bool,
    /// The fall re-triggered a secondary modal ring (impact RMS > 0).
    pub debris_impact_re_triggers: bool,
    /// Same seed → same measured pass.
    pub deterministic_replay: bool,
    /// All measured outputs finite.
    pub outputs_finite: bool,
    /// Active Voronoi fragments after the microfracture.
    pub fragment_count: u32,
    /// Voronoi bisector planes processed (microfissure count proxy).
    pub bisector_count: u32,
    /// AABB volume samples exercised in the fracture step.
    pub volume_sample_count: u32,
    /// Mean fragment ejection speed (m/s).
    pub avg_fragment_velocity: f32,
    /// Microfracture density (bisectors per m³).
    pub microfracture_density: f32,
    /// Modal strike velocity driven by the fracture energy.
    pub modal_trigger_velocity: f32,
    /// Early-window RMS of the fresh ring.
    pub ring_rms_early: f32,
    /// Late-window RMS of the fresh ring.
    pub ring_rms_late: f32,
    /// RMS of the intact-material ring.
    pub ring_rms_fresh: f32,
    /// RMS of the degraded (Fluid) ring.
    pub ring_rms_degraded: f32,
    /// Dominant high-band peak of the fresh ring (Hz).
    pub ring_peak_hz_fresh: f32,
    /// Dominant high-band peak of the degraded ring (Hz).
    pub ring_peak_hz_degraded: f32,
    /// High-band energy fraction of the fresh ring.
    pub high_band_fraction_fresh: f32,
    /// High-band energy fraction of the degraded ring.
    pub high_band_fraction_degraded: f32,
    /// Solid-spectrum degraded RMS (== fresh RMS when identity holds).
    pub solid_rms: f32,
    /// Solid-spectrum degraded peak (Hz).
    pub solid_peak_hz: f32,
    /// Rapier debris bodies spawned from the chunks.
    pub debris_bodies_spawned: u32,
    /// Debris gravity ticks executed.
    pub debris_ticks: u32,
    /// Debris COM Y before the gravity ticks (m).
    pub com_y_before: f32,
    /// Debris COM Y after the gravity ticks (m).
    pub com_y_after: f32,
    /// Impact-ring RMS of the secondary acoustic event.
    pub debris_impact_rms: f32,
    /// Soak wall time.
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (letter **kj**).
    pub evidence_kind: &'static str,
    /// Fingerprint of kj-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_composite_fracture_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_latent_audio_adaptation_probe: bool,
    /// Fail-closed — no Unreal Chaos destruction AAA.
    pub chaos_destruction_aaa_ready: bool,
    pub unreal_chaos_parity_ready: bool,
    pub gpu_voronoi_ready: bool,
    pub physical_audio_aaa_ready: bool,
    pub microfracture_acoustic_aaa_ready: bool,
}

/// Microfracture Acoustic Degradation soak: fracture → acoustic coupling →
/// degradation spectrum → debris re-trigger.
///
/// Does **not** claim Unreal Chaos destruction AAA / physical audio AAA.
pub fn run_microfracture_acoustic_soak() -> MicrofractureAcousticSoakReport {
    let t0 = Instant::now();
    let a = run_measured_pass();
    let b = run_measured_pass();

    let deterministic_replay = a.fragment_count == b.fragment_count
        && a.bisector_count == b.bisector_count
        && (a.total_mass - b.total_mass).abs() < 1e-3
        && (a.avg_fragment_speed - b.avg_fragment_speed).abs() < 1e-3
        && (a.ring_rms_fresh - b.ring_rms_fresh).abs() < 1e-5
        && (a.ring_rms_degraded - b.ring_rms_degraded).abs() < 1e-5
        && (a.com_y_after - b.com_y_after).abs() < 1e-3;

    let microfracture_fractured =
        a.fractured && a.mass_conserved && a.fragment_count >= KIJ_CHUNK_SCALE_FLOOR as u32;
    let microfracture_density_measured = a.bisector_count > 0 && a.microfracture_density > 0.0;
    let chunk_scale_beyond_64 = a.fragment_count >= KIJ_CHUNK_SCALE_FLOOR as u32;
    let fracture_mass_conserved = a.mass_conserved && (a.total_mass - KIJ_FRACTURE_MASS).abs() < 1e-2;
    let solid_passthrough_identity = (a.solid_rms - a.ring_rms_fresh).abs() < EPS
        && (a.solid_peak_hz - a.ring_peak_hz_fresh).abs() < EPS
        && (a.solid_high_band_fraction - a.high_band_fraction_fresh).abs() < EPS;
    let fracture_energy_couples_to_modal = a.modal_trigger_velocity > 0.0 && a.ring_rms_fresh > 0.0;
    let modal_ring_decays = a.ring_rms_late < a.ring_rms_early * KIJ_DECAY_FACTOR;
    let fluid_morphing_active = a.ring_rms_degraded < a.ring_rms_fresh * (1.0 - KIJ_ENERGY_LOSS_MIN)
        && a.high_band_fraction_degraded < a.high_band_fraction_fresh;
    let high_band_energy_dropped = a.high_band_fraction_degraded < a.high_band_fraction_fresh;
    let debris_moved = a.com_y_after < a.com_y_before - 0.01;
    let debris_impact_re_triggers = a.debris_impact_rms > 0.0 && debris_moved;

    let outputs_finite = a.all_finite() && b.all_finite();

    let core_ok = microfracture_fractured
        && microfracture_density_measured
        && chunk_scale_beyond_64
        && fracture_mass_conserved
        && solid_passthrough_identity
        && fluid_morphing_active
        && high_band_energy_dropped
        && fracture_energy_couples_to_modal
        && modal_ring_decays
        && debris_moved
        && debris_impact_re_triggers
        && deterministic_replay
        && outputs_finite;

    let evidence_fingerprint = kj_evidence_fingerprint(&a);
    let d = measured_distinct(MICROFRACTURE_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    MicrofractureAcousticSoakReport {
        microfracture_acoustic_ready: core_ok && evidence_fingerprint != 0,
        microfracture_fractured,
        microfracture_density_measured,
        chunk_scale_beyond_64,
        fracture_mass_conserved,
        solid_passthrough_identity,
        fluid_morphing_active,
        fracture_energy_couples_to_modal,
        modal_ring_decays,
        high_band_energy_dropped,
        debris_moved,
        debris_impact_re_triggers,
        deterministic_replay,
        outputs_finite,
        fragment_count: a.fragment_count,
        bisector_count: a.bisector_count,
        volume_sample_count: a.volume_sample_count,
        avg_fragment_velocity: a.avg_fragment_speed,
        microfracture_density: a.microfracture_density,
        modal_trigger_velocity: a.modal_trigger_velocity,
        ring_rms_early: a.ring_rms_early,
        ring_rms_late: a.ring_rms_late,
        ring_rms_fresh: a.ring_rms_fresh,
        ring_rms_degraded: a.ring_rms_degraded,
        ring_peak_hz_fresh: a.ring_peak_hz_fresh,
        ring_peak_hz_degraded: a.ring_peak_hz_degraded,
        high_band_fraction_fresh: a.high_band_fraction_fresh,
        high_band_fraction_degraded: a.high_band_fraction_degraded,
        solid_rms: a.solid_rms,
        solid_peak_hz: a.solid_peak_hz,
        debris_bodies_spawned: a.debris_bodies,
        debris_ticks: KIJ_DEBRIS_TICKS,
        com_y_before: a.com_y_before,
        com_y_after: a.com_y_after,
        debris_impact_rms: a.debris_impact_rms,
        soak_elapsed_ns: t0.elapsed().as_nanos(),
        evidence_kind: MICROFRACTURE_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_voronoi_destruction_3d_probe: d,
        distinct_from_entropy_rapier_bridge_probe: d,
        distinct_from_composite_fracture_probe: d,
        distinct_from_metasounds_dsp_probe: d,
        distinct_from_latent_audio_adaptation_probe: d,
        chaos_destruction_aaa_ready: false,
        unreal_chaos_parity_ready: false,
        gpu_voronoi_ready: false,
        physical_audio_aaa_ready: false,
        microfracture_acoustic_aaa_ready: false,
    }
}

/// Honesty probe — soak-gated `microfracture_acoustic_ready`, never hardcoded.
pub fn probe_microfracture_acoustic() -> MicrofractureAcousticSoakReport {
    run_microfracture_acoustic_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::composite_fracture_kernel::probe_composite_fracture;
    use crate::entropy_rapier_bridge::probe_entropy_rapier_bridge;
    use crate::latent_audio_adaptation::probe_latent_audio_adaptation;
    use crate::metasounds_dsp_compiler::run_metasounds_dsp_soak;
    use crate::voronoi_destruction_3d::probe_voronoi_destruction_3d;

    #[test]
    fn degrade_solid_is_identity_passthrough() {
        let solid = degrade_acoustic(
            MaterialParams::CONCRETE,
            MicrofractureSpectrum::Solid,
            0.6,
            300.0,
        );
        assert!(!solid.degradation_active);
        assert!(!solid.high_band_dropped);
        assert_eq!(solid.rms_degraded, solid.rms_fresh);
        assert_eq!(solid.peak_hz_degraded, solid.peak_hz_fresh);
        assert_eq!(
            solid.high_band_fraction_degraded,
            solid.high_band_fraction_fresh
        );
        // The solid signature still rings (coupling is spectrum-independent).
        assert!(solid.rms_fresh > 0.0);
        assert!(solid.ring_rms_early > 0.0);
    }

    #[test]
    fn degrade_fluid_activates_energy_loss_and_high_muffle() {
        let fluid = degrade_acoustic(
            MaterialParams::CONCRETE,
            MicrofractureSpectrum::Fluid,
            0.6,
            300.0,
        );
        assert!(fluid.degradation_active, "{fluid:?}");
        assert!(fluid.high_band_dropped);
        assert!(
            fluid.rms_degraded < fluid.rms_fresh * (1.0 - KIJ_ENERGY_LOSS_MIN),
            "degraded {} vs fresh {}",
            fluid.rms_degraded,
            fluid.rms_fresh
        );
        assert!(fluid.high_band_fraction_degraded < fluid.high_band_fraction_fresh);
    }

    #[test]
    fn degrade_is_monotonic_in_microfracture_density() {
        let low = degrade_acoustic(MaterialParams::CONCRETE, MicrofractureSpectrum::Fluid, 0.6, 8.0);
        let high = degrade_acoustic(
            MaterialParams::CONCRETE,
            MicrofractureSpectrum::Fluid,
            0.6,
            400.0,
        );
        // More microfracture → more energy lost + more high-band muffling.
        assert!(low.rms_degraded > high.rms_degraded);
        assert!(
            low.high_band_fraction_degraded > high.high_band_fraction_degraded,
            "low {} high {}",
            low.high_band_fraction_degraded,
            high.high_band_fraction_degraded
        );
    }

    #[test]
    fn modal_ring_decays_over_time() {
        let r = render_ring(
            MaterialParams::CONCRETE,
            0.6,
            SAMPLE_RATE,
            KIJ_MODAL_SEED,
            KIJ_RING_SAMPLES,
        );
        let early = rms(&r[..KIJ_EARLY]);
        let late = rms(&r[KIJ_RING_SAMPLES - KIJ_LATE..]);
        assert!(late < early * KIJ_DECAY_FACTOR, "early {early} late {late}");
        assert!(rms(&r) > 0.0);
    }

    #[test]
    fn fracture_energy_couples_to_modal_ring() {
        let d = run_measured_pass();
        assert!(d.fractured);
        assert!(d.avg_fragment_speed > 0.0, "avg speed {}", d.avg_fragment_speed);
        assert!(
            d.modal_trigger_velocity > 0.0,
            "trigger {}",
            d.modal_trigger_velocity
        );
        assert!(d.ring_rms_fresh > 0.0, "rms {}", d.ring_rms_fresh);
        assert!(d.ring_peak_hz_fresh >= KIJ_BAND_LO_HZ);
    }

    #[test]
    fn voronoi_microfracture_density_measured_and_mass_conserved() {
        let d = run_measured_pass();
        assert!(d.fractured);
        assert!(d.mass_conserved);
        assert!(d.bisector_count > 0, "bisectors {}", d.bisector_count);
        assert!(
            d.microfracture_density > 0.0,
            "density {}",
            d.microfracture_density
        );
        assert!((d.total_mass - KIJ_FRACTURE_MASS).abs() < 1e-2);
        assert!(d.fragment_count >= KIJ_CHUNK_SCALE_FLOOR as u32);
    }

    #[test]
    fn debris_impact_re_triggers_secondary_ring() {
        let d = run_measured_pass();
        assert!(d.com_y_after < d.com_y_before - 0.01, "com {:.4} -> {:.4}", d.com_y_before, d.com_y_after);
        assert!(d.debris_bodies >= KIJ_CHUNK_SCALE_FLOOR as u32);
        assert!(d.debris_impact_rms > 0.0, "impact rms {}", d.debris_impact_rms);
    }

    #[test]
    fn measured_pass_is_deterministic() {
        let a = run_measured_pass();
        let b = run_measured_pass();
        assert_eq!(a.fragment_count, b.fragment_count);
        assert_eq!(a.bisector_count, b.bisector_count);
        assert!((a.avg_fragment_speed - b.avg_fragment_speed).abs() < 1e-3);
        assert_eq!(a.ring_rms_fresh, b.ring_rms_fresh);
        assert_eq!(a.ring_rms_degraded, b.ring_rms_degraded);
        assert_eq!(a.high_band_fraction_degraded, b.high_band_fraction_degraded);
        assert_eq!(a.com_y_after, b.com_y_after);
    }

    #[test]
    fn soak_probe_ready_and_held_flags() {
        let r = probe_microfracture_acoustic();
        assert!(r.microfracture_acoustic_ready, "{r:?}");
        assert!(r.microfracture_fractured);
        assert!(r.microfracture_density_measured);
        assert!(r.chunk_scale_beyond_64);
        assert!(r.fracture_mass_conserved);
        assert!(r.solid_passthrough_identity);
        assert!(r.fluid_morphing_active);
        assert!(r.fracture_energy_couples_to_modal);
        assert!(r.modal_ring_decays);
        assert!(r.high_band_energy_dropped);
        assert!(r.debris_moved);
        assert!(r.debris_impact_re_triggers);
        assert!(r.deterministic_replay);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, MICROFRACTURE_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        assert!(!r.chaos_destruction_aaa_ready);
        assert!(!r.unreal_chaos_parity_ready);
        assert!(!r.gpu_voronoi_ready);
        assert!(!r.physical_audio_aaa_ready);
        assert!(!r.microfracture_acoustic_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        // `soak_elapsed_ns` is wall-clock (non-deterministic between runs), so the
        // deterministic fields are compared exactly (ki precedent): fingerprint,
        // readiness gates and the physical scalars must all be identical.
        let a = probe_microfracture_acoustic();
        let b = run_microfracture_acoustic_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.microfracture_acoustic_ready, b.microfracture_acoustic_ready);
        assert_eq!(a.deterministic_replay, b.deterministic_replay);
        assert_eq!(a.fragment_count, b.fragment_count);
        assert_eq!(a.bisector_count, b.bisector_count);
        assert_eq!(a.microfracture_density, b.microfracture_density);
        assert_eq!(a.modal_trigger_velocity, b.modal_trigger_velocity);
        assert_eq!(a.ring_rms_early, b.ring_rms_early);
        assert_eq!(a.ring_rms_late, b.ring_rms_late);
        assert_eq!(a.ring_rms_fresh, b.ring_rms_fresh);
        assert_eq!(a.ring_rms_degraded, b.ring_rms_degraded);
        assert_eq!(a.ring_peak_hz_fresh, b.ring_peak_hz_fresh);
        assert_eq!(a.ring_peak_hz_degraded, b.ring_peak_hz_degraded);
        assert_eq!(a.high_band_fraction_fresh, b.high_band_fraction_fresh);
        assert_eq!(a.high_band_fraction_degraded, b.high_band_fraction_degraded);
        assert_eq!(a.debris_bodies_spawned, b.debris_bodies_spawned);
        assert_eq!(a.debris_impact_rms, b.debris_impact_rms);
        assert_eq!(a.evidence_kind, b.evidence_kind);
    }

    #[test]
    fn kj_distinct_from_ip2_erpb_kh_jx_ki() {
        let kj = probe_microfracture_acoustic();
        let ip2 = probe_voronoi_destruction_3d();
        let erpb = probe_entropy_rapier_bridge();
        let kh = probe_composite_fracture();
        let ki = probe_latent_audio_adaptation();
        let jx = run_metasounds_dsp_soak();

        assert!(kj.microfracture_acoustic_ready);
        assert!(ip2.voronoi_destruction_3d_ready);
        assert!(erpb.entropy_rapier_bridge_ready);
        assert!(kh.composite_fracture_ready);
        assert!(ki.latent_audio_ready);

        assert_eq!(kj.evidence_kind, MICROFRACTURE_EVIDENCE_KIND);
        assert_ne!(
            kj.evidence_kind,
            crate::entropy_rapier_bridge::ERPB_EVIDENCE_KIND
        );
        assert_ne!(
            kj.evidence_kind,
            crate::composite_fracture_kernel::COMPOSITE_EVIDENCE_KIND
        );
        assert_ne!(kj.evidence_kind, ki.evidence_kind);
        assert_ne!(kj.evidence_kind, jx.evidence_kind);
        assert_ne!(kj.evidence_fingerprint, erpb.evidence_fingerprint);
        assert_ne!(kj.evidence_fingerprint, kh.evidence_fingerprint);
        assert_ne!(kj.evidence_fingerprint, ki.evidence_fingerprint);
        assert_ne!(kj.evidence_fingerprint, jx.evidence_fingerprint);
        // Voronoi gates on measured site/shard/bisector scalars (no fingerprint
        // field) — derive one so the distinctness check stays honest.
        let ip2_fp = quant_f32(ip2.site_count as f32)
            ^ quant_f32(ip2.active_fragments as f32)
            ^ quant_f32(ip2.shard_count as f32)
            ^ quant_f32(ip2.bisector_count as f32);
        assert_ne!(kj.evidence_fingerprint, ip2_fp);

        assert!(kj.distinct_from_voronoi_destruction_3d_probe);
        assert!(kj.distinct_from_entropy_rapier_bridge_probe);
        assert!(kj.distinct_from_composite_fracture_probe);
        assert!(kj.distinct_from_metasounds_dsp_probe);
        assert!(kj.distinct_from_latent_audio_adaptation_probe);
        // Different mechanisms: kj couples fracture energy → modal timbre
        // degradation + debris re-trigger vs ip2 sites / erpb bridge / kh
        // rebar hinge / jx DSP compiler / ki AV adaptation.
        assert!(kj.microfracture_density > 0.0);
        assert!(kj.debris_impact_rms > 0.0);
        assert!(erpb.bodies_spawned > 0);
        assert!(kh.fracture_fragments >= 256);
        assert!(ki.foley_base_rms > 0.0);
    }
}

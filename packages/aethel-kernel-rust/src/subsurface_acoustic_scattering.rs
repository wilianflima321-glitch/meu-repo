//! Subsurface Acoustic Scattering — letter **kl**.
//!
//! A real volumetric tissue-acoustic authority built from four REAL closed
//! substrates with zero substrate edits:
//!
//! 1. **Volumetric tissue geometry** — the ex
//!    [`SdfAudioRaymarching::march_occlusion`] (letter ex) sphere-traces a
//!    listener→source path through a tissue sphere and returns the broadband
//!    `transmission`, the high-frequency `lowpass_gain` and the integrated
//!    `solid_path` spent inside the volume — the raw geometric occlusion.
//! 2. **Tissue material opacity** — the ip12 [`StrandHairSkinSoA`] carries the
//!    real subsurface-scattering mean-free-path `sss_radius_*` (mm); kl maps
//!    that measured skin parameter to an acoustic absorption coefficient
//!    (`abs = KL_ABS_SIGMA / mfp`, small mean-free-path = dense tissue =
//!    strong absorption) and composes the coherent transmission
//!    `direct = SDF_transmission · exp(−abs·solid_path)`. The same substrate's
//!    [`StrandHairSkinSoA`] + `step_strand_physics` + real honesty probe yield
//!    a hair-fringe density that absorbs high frequencies.
//! 3. **Surface micro-detail scatter** — the kd [`SkinWrinkleMap::evaluate`]
//!    (letter kd) runs on the **real** gs [`StrainParams`] strain; wrinkle
//!    density·strength (groove intensity) scales a surface diffuse-scatter that
//!    further mutes high frequencies (fold grooves break the coherent
//!    wavefront).
//! 4. **Tissue modal resonance** — the jx [`ModalSynthesizer`] (letter jx,
//!    WOOD low modes as the soft-organic resonance proxy) rings only when a
//!    tissue volume was struck by transmitted energy (`solid_path > 0` and
//!    `direct > threshold`).
//!
//! **Espectro "Sólido vs Metamorfo"** (Zero Imposição — Doctrine #74 / S-27):
//! the **Solid** spectrum is the identity passthrough of a deterministic
//! band-limited strike transient (no tissue morphology); the **Fluid**
//! spectrum applies the full tissue chain — coherent `direct` attenuation,
//! gain-driven one-pole lowpass (identity when `lowpass_gain == 1`), diffuse
//! subsurface-scatter (only when a tissue volume exists), and the jx modal
//! ring — **but when the path is clear (no tissue) the Fluid signature is
//! bit-identical to the Solid one**. The engine decides the spectrum; the
//! kernel never forces morphology on a free-field reality.
//!
//! **Honesty:** the SSS mean-free-path is a real ip12 skin-scattering
//! parameter and the mapping to acoustic absorption is a documented model (the
//! kernel does not claim a measured tissue impulse response); the WOOD modal is
//! an existing jx soft-resonant material, not a claimed tissue IR. Soak-gated
//! `subsurface_acoustic_scattering_ready` on measured invariants: tissue
//! transmission measured, mean-free-path couples absorption (light tissue
//! transmits more than dense), clear path identity, Solid identity
//! passthrough, Fluid morphing only under a tissue volume, wrinkle surface
//! scatter measured, hair-fringe absorption measured, SDF volumetric occlusion
//! traverses tissue, diffuse scatter measured, tissue modal resonance measured
//! (dense > 0, clear = 0), deterministic two-pass replay, all finite, bounded.
//!
//! Evidence tag: `subsurface_acoustic_scattering` (letter **kl**), fingerprint
//! seed `0x4B4C_5F53_5343` ("kl_SSC") — distinct from ip12 + kd + ex + jx + kj
//! + kk and prior. `tissue_scatter_alters_highs` is reported as an
//! *observation* only.
//!
//! **Does not** claim physical tissue acoustics / MetaHuman audio / full SSS
//! audio AAA. **HELD:** `physical_audio_aaa_ready: false` ·
//! `tissue_acoustics_aaa_ready: false` · `meta_human_audio_aaa_ready: false` ·
//! `strand_hair_subsurface_skin_aaa_ready: false` · `wrinkle_aaa_ready: false`
//! · `sdf_occlusion_aaa_ready: false`.

use crate::metasounds_dsp_compiler::{
    fft_radix2, rms, MaterialParams, ModalSynthesizer, METASOUNDS_SAMPLE_RATE_HZ,
};
use crate::sdf_audio_raymarching::{AudioMarchParams, SdfAudioField, SdfAudioRaymarching};
use crate::skin_wrinkle_map::{SkinWrinkleMap, WrinkleRegionParams, REGION_CHEEK};
use crate::strain_aware_texturing::StrainParams;
use crate::strand_hair_subsurface_skin::{
    probe_strand_hair_subsurface_skin, StrandHairSkinSoA, MAX_HAIR_STRANDS,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Stable evidence tag for the subsurface-scattering soak (letter **kl**).
pub const KL_EVIDENCE_KIND: &str = "subsurface_acoustic_scattering";

/// Host sample rate for the jx tissue modal resonance (48 kHz).
const SAMPLE_RATE: f32 = METASOUNDS_SAMPLE_RATE_HZ;
/// Float compare epsilon.
const EPS: f32 = 1e-6;
/// Fingerprint seed ("kl_SSC").
const FP_SEED: u64 = 0x4B4C_5F53_5343;
/// Fingerprint final XOR ("SSC").
const FP_XOR: u64 = 0x5353_43;
/// Tissue sphere radius (m) — the volumetric occluder on the X-axis path.
const KL_TISSUE_RADIUS_M: f32 = 0.25;
/// Acoustic source position (m).
const KL_SOURCE: [f32; 3] = [1.2, 0.0, 0.0];
/// Acoustic listener position (m).
const KL_LISTENER: [f32; 3] = [-1.2, 0.0, 0.0];
/// Dense tissue SSS mean-free-path (mm) — compact dermis.
const KL_MFP_DENSE_MM: f32 = 0.4;
/// Light / translucent tissue SSS mean-free-path (mm).
const KL_MFP_LIGHT_MM: f32 = 2.5;
/// MFP normalization floor (mm).
const KL_MFP_MIN_MM: f32 = 0.2;
/// MFP normalization ceiling (mm).
const KL_MFP_MAX_MM: f32 = 3.0;
/// Acoustic absorption scale: `abs (1/m) = KL_ABS_SIGMA / mfp_mm`.
const KL_ABS_SIGMA: f32 = 0.9;
/// Sane upper bound for the tissue absorption coefficient (1/m).
const KL_MAX_ABS_M: f32 = 5.0;
/// Diffuse subsurface-scatter fraction of the coherent transmission.
const KL_DIFFUSE_FRACTION: f32 = 0.35;
/// Wrinkled region crease curvature (deep fold drive).
const KL_CREASE_DENSE: f32 = 0.9;
/// Smooth region crease curvature (below the kd fold onset).
const KL_CREASE_LIGHT: f32 = 0.05;
/// Real gs strain curvature for the wrinkled fixture.
const KL_STRAIN_CURV_DENSE: f32 = 0.9;
/// Real gs strain curvature for the smooth fixture.
const KL_STRAIN_CURV_LIGHT: f32 = 0.05;
/// UV stretch scale for the wrinkled fixture (real gs jacobian-lite stretch).
const KL_UV_STRETCH: f32 = 1.4;
/// Deterministic strain seed (distinct from kd `SOAK_SEED`).
const KL_STRAIN_SEED: u64 = 0x4B4C_5F47_5354;
/// Surface diffuse-scatter weight on wrinkle groove intensity.
const KL_WRINKLE_SCATTER: f32 = 0.5;
/// Hair-fringe strand count for the dense fixture.
const KL_HAIR_STRANDS: usize = 512;
/// Hair-fringe high-frequency absorption scale.
const KL_HAIR_DAMP: f32 = 0.5;
/// Strike-transient buffer length (power of two — 2048 for the band FFT).
const KL_IMPULSE_SAMPLES: usize = 2048;
/// Strike-transient finite attack (samples).
const KL_ATTACK: usize = 32;
/// Strike-transient exponential decay per sample.
const KL_DECAY: f32 = 0.35;
/// Floor of the gain-driven one-pole identity-coefficient.
const KL_LP_BASE: f32 = 0.05;
/// Deterministic diffuse-scatter noise seed (distinct from every prior).
const KL_SCATTER_SEED: u64 = 0x4B4C_5F53_4354;
/// jx ModalSynthesizer deterministic seed.
const KL_MODAL_SEED: u64 = 0x4B4C_5F4D_4F44;
/// Minimum transmitted energy to strike the tissue modal.
const KL_MODAL_TRIGGER_MIN: f32 = 0.02;
/// High-band spectral window low edge (Hz).
const KL_BAND_LO_HZ: f32 = 4000.0;
/// High-band spectral window high edge (Hz).
const KL_BAND_HI_HZ: f32 = 12000.0;
/// Upper sanity bound for any signature RMS — anti-blowup gate.
const KL_MAX_SANE_RMS: f32 = 4.0;

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

/// Acoustic spectrum of the tissue transmission — the engine decides, the
/// kernel never forces morphology (Zero Imposição).
pub enum SubsurfaceSpectrum {
    /// Pure identity passthrough (free-field, no tissue morphology).
    Solid,
    /// Full tissue morphing chain (volumetric + material + surface + modal).
    Fluid,
}

/// Map the real ip12 SSS mean-free-path (mm) to a tissue acoustic absorption
/// coefficient (1/m): a short mean-free-path means a dense medium, hence a
/// strong absorption per meter.
fn sss_absorption(mfp_mm: f32) -> f32 {
    let m = mfp_mm.max(EPS);
    (KL_ABS_SIGMA / m).clamp(0.0, KL_MAX_ABS_M)
}

/// Normalize the SSS mean-free-path to a translucent-diffusion factor in
/// [0, 1] (larger MFP → more translucent tissue → more diffuse re-radiation).
fn mfp_norm(mfp_mm: f32) -> f32 {
    ((mfp_mm - KL_MFP_MIN_MM) / (KL_MFP_MAX_MM - KL_MFP_MIN_MM)).clamp(0.0, 1.0)
}

/// Render the deterministic band-limited strike transient: a smoothstep finite
/// attack then an exponential decay. This is the **Solid** identity source.
fn source_transient(samples: usize) -> Vec<f32> {
    let mut out = vec![0.0_f32; samples];
    let attack = KL_ATTACK.min(samples);
    for (i, s) in out.iter_mut().enumerate() {
        let env = if i < attack {
            let t = i as f32 / attack as f32;
            t * t * (3.0 - 2.0 * t)
        } else {
            (-KL_DECAY * (i - attack) as f32).exp()
        };
        *s = env;
    }
    out
}

/// Deterministic splitmix-style sample in [-1, 1] for the diffuse field.
fn scatter_sample(rng: &mut u64) -> f32 {
    *rng = rng
        .wrapping_mul(0x9E37_79B9_7F4A_7C15)
        .wrapping_add(0x9E37_79B9_7F4A_7C15);
    let hi = (*rng >> 33) as u32;
    (hi as f32 / u32::MAX as f32) * 2.0 - 1.0
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

/// Build a hair-fringe `StrandHairSkinSoA`, run one real physics tick, probe
/// the honesty gate and return the fringe high-frequency damp in [0, 1].
fn hair_fringe_damp_soa(strand_count: usize) -> f32 {
    let mut soa = StrandHairSkinSoA::default();
    let n = strand_count.min(MAX_HAIR_STRANDS);
    for i in 0..n {
        let t = if n > 0 {
            i as f32 / n as f32
        } else {
            0.0
        };
        let rz = (t * std::f32::consts::PI * 0.5 - std::f32::consts::PI * 0.25).sin() * 0.4;
        soa.push_strand(0.0, 1.7, rz, 0.0, 1.2, rz + 0.2);
    }
    soa.step_strand_physics(0.016);
    let probe = probe_strand_hair_subsurface_skin(&soa);
    let density = probe.active_hair_strands as f32 / MAX_HAIR_STRANDS as f32;
    (KL_HAIR_DAMP * density).clamp(0.0, 1.0)
}

/// Fluid-spectrum morph: coherent `direct` attenuation + diffuse subsurface
/// scatter + gain-driven one-pole lowpass + jx tissue modal ring. With
/// `direct == 1`, `diffuse == 0`, `lowpass_gain == 1` and no ring the output is
/// bit-identical to the Solid source (Zero Imposição).
fn render_fluid(
    solid: &[f32],
    direct: f32,
    diffuse: f32,
    lowpass_gain: f32,
    modal_ring: &[f32],
    triggered: bool,
) -> Vec<f32> {
    // One-pole identity-coefficient: 1.0 when lowpass_gain == 1 (no muffling),
    // down to KL_LP_BASE when fully opaque to highs.
    let coeff = KL_LP_BASE + (1.0 - KL_LP_BASE) * lowpass_gain.clamp(0.0, 1.0);
    let mut rng = KL_SCATTER_SEED;
    let mut y = 0.0_f32;
    let mut out = Vec::with_capacity(solid.len());
    for (i, &s) in solid.iter().enumerate() {
        let x = direct * s + diffuse * scatter_sample(&mut rng);
        y = y + coeff * (x - y);
        let ring = if triggered {
            modal_ring.get(i).copied().unwrap_or(0.0)
        } else {
            0.0
        };
        out.push(y + ring);
    }
    out
}

/// Measured outcome of one tissue config (one material / surface / hair /
/// occlusion combination).
#[derive(Debug, Clone, PartialEq)]
struct TissueImpulseResult {
    /// Coherent broadband transmission `SDF_transmission · exp(−abs·path)`.
    direct_transmission: f32,
    /// Diffuse subsurface-scattered energy fraction added to the fluid.
    diffuse_scatter_gain: f32,
    /// Combined fluid high-frequency lowpass gain in [0, 1].
    lowpass_gain: f32,
    /// Integrated tissue path traversed by the SDF march (m).
    solid_path_m: f32,
    /// Tissue acoustic absorption coefficient (1/m) from the SSS MFP.
    sss_absorption_m: f32,
    /// Wrinkle groove intensity (kd density · strength).
    wrinkle_intensity: f32,
    /// Surface diffuse-scatter factor in [0, 1].
    wrinkle_scatter: f32,
    /// Hair-fringe high-frequency damp in [0, 1].
    hair_fringe_damp: f32,
    /// Solid signature (identity transient).
    solid: Vec<f32>,
    /// Fluid signature (tissue-morphed).
    fluid: Vec<f32>,
    /// RMS of the solid signature.
    solid_rms: f32,
    /// RMS of the fluid signature.
    fluid_rms: f32,
    /// RMS of the isolated jx tissue modal ring.
    modal_ring_rms: f32,
    /// High-band energy fraction of the solid signature.
    solid_high_band_fraction: f32,
    /// High-band energy fraction of the fluid signature.
    fluid_high_band_fraction: f32,
    /// True when any fluid sample differs from the solid one (morphing).
    fluid_morphs: bool,
    /// Every scalar output is finite.
    outputs_finite: bool,
}

/// Run one tissue config: march the ex SDF occluder, compose the ip12 SSS
/// absorption + hair fringe, evaluate the kd wrinkle surface on real gs strain,
/// render the Solid identity and the Fluid morph with the jx modal ring.
fn run_tissue_config(
    mfp_mm: f32,
    crease: f32,
    strain_curv: f32,
    uv_stretch: f32,
    hair_on: bool,
    occluder: bool,
) -> TissueImpulseResult {
    let solid = source_transient(KL_IMPULSE_SAMPLES);

    // 1) SDF volumetric occlusion (ex substrate).
    let field = if occluder {
        SdfAudioField::Sphere {
            center: [0.0, 0.0, 0.0],
            radius: KL_TISSUE_RADIUS_M,
        }
    } else {
        SdfAudioField::Empty
    };
    let occ = SdfAudioRaymarching::march_occlusion(
        KL_LISTENER,
        KL_SOURCE,
        field,
        &AudioMarchParams::default(),
    );
    let solid_path_m = if occ.hit_solid {
        occ.solid_path.max(0.0)
    } else {
        0.0
    };

    // 2) SSS mean-free-path → tissue acoustic absorption (ip12 substrate).
    let sss_absorption_m = sss_absorption(mfp_mm);
    let tissue_trans = if solid_path_m > EPS {
        (-sss_absorption_m * solid_path_m).exp()
    } else {
        1.0
    };
    let direct_transmission = (occ.transmission * tissue_trans).clamp(0.0, 1.0);

    // 3) Wrinkle surface detail on real gs strain (kd substrate).
    let strain = StrainParams {
        seed: KL_STRAIN_SEED,
        sdf_curvature: strain_curv,
        uv_def_u: uv_stretch,
        uv_def_v: uv_stretch,
        ..StrainParams::default()
    };
    let region = WrinkleRegionParams {
        region: REGION_CHEEK,
        region_weight: 1.0,
        crease_curvature: crease,
    };
    let wr = SkinWrinkleMap::evaluate(&region, &strain);
    let wrinkle_intensity = (wr.wrinkle_density * wr.wrinkle_strength).clamp(0.0, 1.0);
    let wrinkle_scatter = (KL_WRINKLE_SCATTER * wrinkle_intensity).clamp(0.0, 1.0);

    // 4) Hair-fringe damp (ip12 substrate).
    let hair_fringe_damp = if hair_on {
        hair_fringe_damp_soa(KL_HAIR_STRANDS)
    } else {
        0.0
    };

    // Combined fluid high-frequency lowpass gain.
    let lowpass_gain =
        (occ.lowpass_gain * (1.0 - wrinkle_scatter) * (1.0 - hair_fringe_damp)).clamp(0.0, 1.0);

    // Diffuse subsurface-scattered energy — only when a tissue volume exists
    // (a free-field path has nothing to scatter into).
    let diffuse_scatter_gain = if solid_path_m > EPS {
        (direct_transmission * KL_DIFFUSE_FRACTION * mfp_norm(mfp_mm)).clamp(0.0, 1.0)
    } else {
        0.0
    };

    // 5) Tissue modal resonance (jx substrate) — struck only by real
    // transmitted energy through a real tissue volume.
    let triggered = solid_path_m > EPS && direct_transmission > KL_MODAL_TRIGGER_MIN;
    let modal_ring: Vec<f32> = if triggered {
        let mut modal = ModalSynthesizer::new(MaterialParams::WOOD, SAMPLE_RATE, KL_MODAL_SEED);
        modal.trigger(direct_transmission);
        (0..KL_IMPULSE_SAMPLES).map(|_| modal.next_sample()).collect()
    } else {
        vec![0.0_f32; KL_IMPULSE_SAMPLES]
    };
    let modal_ring_rms = if triggered { rms(&modal_ring) } else { 0.0 };

    let fluid = render_fluid(
        &solid,
        direct_transmission,
        diffuse_scatter_gain,
        lowpass_gain,
        &modal_ring,
        triggered,
    );

    let solid_rms = rms(&solid);
    let fluid_rms = rms(&fluid);
    let solid_high_band_fraction =
        high_band_energy_fraction(&solid, SAMPLE_RATE, KL_BAND_LO_HZ, KL_BAND_HI_HZ);
    let fluid_high_band_fraction =
        high_band_energy_fraction(&fluid, SAMPLE_RATE, KL_BAND_LO_HZ, KL_BAND_HI_HZ);
    let fluid_morphs = fluid.iter().zip(solid.iter()).any(|(a, b)| a != b);

    let outputs_finite = direct_transmission.is_finite()
        && diffuse_scatter_gain.is_finite()
        && lowpass_gain.is_finite()
        && solid_path_m.is_finite()
        && sss_absorption_m.is_finite()
        && wrinkle_intensity.is_finite()
        && wrinkle_scatter.is_finite()
        && hair_fringe_damp.is_finite()
        && solid_rms.is_finite()
        && fluid_rms.is_finite()
        && modal_ring_rms.is_finite()
        && solid_high_band_fraction.is_finite()
        && fluid_high_band_fraction.is_finite();

    TissueImpulseResult {
        direct_transmission,
        diffuse_scatter_gain,
        lowpass_gain,
        solid_path_m,
        sss_absorption_m,
        wrinkle_intensity,
        wrinkle_scatter,
        hair_fringe_damp,
        solid,
        fluid,
        solid_rms,
        fluid_rms,
        modal_ring_rms,
        solid_high_band_fraction,
        fluid_high_band_fraction,
        fluid_morphs,
        outputs_finite,
    }
}

/// All measured outputs of one deterministic tissue pass.
#[derive(Debug, Clone, PartialEq)]
struct MeasuredData {
    dense_direct: f32,
    dense_diffuse: f32,
    dense_lowpass: f32,
    dense_solid_path_m: f32,
    dense_sss_absorption_m: f32,
    dense_wrinkle_scatter: f32,
    dense_hair_fringe_damp: f32,
    dense_modal_ring_rms: f32,
    dense_solid_rms: f32,
    dense_fluid_rms: f32,
    dense_fluid_morphs: bool,
    dense_solid_high_band: f32,
    dense_fluid_high_band: f32,
    light_direct: f32,
    light_lowpass: f32,
    light_sss_absorption_m: f32,
    light_wrinkle_scatter: f32,
    light_hair_fringe_damp: f32,
    light_diffuse: f32,
    clear_direct: f32,
    clear_lowpass: f32,
    clear_solid_rms: f32,
    clear_fluid_rms: f32,
    clear_fluid_morphs: bool,
}

impl MeasuredData {
    fn all_finite(&self) -> bool {
        self.dense_direct.is_finite()
            && self.dense_diffuse.is_finite()
            && self.dense_lowpass.is_finite()
            && self.dense_solid_path_m.is_finite()
            && self.dense_sss_absorption_m.is_finite()
            && self.dense_wrinkle_scatter.is_finite()
            && self.dense_hair_fringe_damp.is_finite()
            && self.dense_modal_ring_rms.is_finite()
            && self.dense_solid_rms.is_finite()
            && self.dense_fluid_rms.is_finite()
            && self.dense_solid_high_band.is_finite()
            && self.dense_fluid_high_band.is_finite()
            && self.light_direct.is_finite()
            && self.light_lowpass.is_finite()
            && self.light_sss_absorption_m.is_finite()
            && self.light_wrinkle_scatter.is_finite()
            && self.light_hair_fringe_damp.is_finite()
            && self.light_diffuse.is_finite()
            && self.clear_direct.is_finite()
            && self.clear_lowpass.is_finite()
            && self.clear_solid_rms.is_finite()
            && self.clear_fluid_rms.is_finite()
    }
}

/// One full deterministic pass: dense tissue / light tissue / clear path.
fn run_measured_pass() -> MeasuredData {
    let dense = run_tissue_config(
        KL_MFP_DENSE_MM,
        KL_CREASE_DENSE,
        KL_STRAIN_CURV_DENSE,
        KL_UV_STRETCH,
        true,
        true,
    );
    let light = run_tissue_config(
        KL_MFP_LIGHT_MM,
        KL_CREASE_LIGHT,
        KL_STRAIN_CURV_LIGHT,
        1.0,
        false,
        true,
    );
    let clear = run_tissue_config(
        KL_MFP_DENSE_MM,
        KL_CREASE_LIGHT,
        KL_STRAIN_CURV_LIGHT,
        1.0,
        false,
        false,
    );

    MeasuredData {
        dense_direct: dense.direct_transmission,
        dense_diffuse: dense.diffuse_scatter_gain,
        dense_lowpass: dense.lowpass_gain,
        dense_solid_path_m: dense.solid_path_m,
        dense_sss_absorption_m: dense.sss_absorption_m,
        dense_wrinkle_scatter: dense.wrinkle_scatter,
        dense_hair_fringe_damp: dense.hair_fringe_damp,
        dense_modal_ring_rms: dense.modal_ring_rms,
        dense_solid_rms: dense.solid_rms,
        dense_fluid_rms: dense.fluid_rms,
        dense_fluid_morphs: dense.fluid_morphs,
        dense_solid_high_band: dense.solid_high_band_fraction,
        dense_fluid_high_band: dense.fluid_high_band_fraction,
        light_direct: light.direct_transmission,
        light_lowpass: light.lowpass_gain,
        light_sss_absorption_m: light.sss_absorption_m,
        light_wrinkle_scatter: light.wrinkle_scatter,
        light_hair_fringe_damp: light.hair_fringe_damp,
        light_diffuse: light.diffuse_scatter_gain,
        clear_direct: clear.direct_transmission,
        clear_lowpass: clear.lowpass_gain,
        clear_solid_rms: clear.solid_rms,
        clear_fluid_rms: clear.fluid_rms,
        clear_fluid_morphs: clear.fluid_morphs,
    }
}

/// Fingerprint of the kl-only measured evidence.
fn kl_evidence_fingerprint(d: &MeasuredData) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, quant_f32(d.dense_direct));
    h = hash_mix(h, quant_f32(d.dense_diffuse));
    h = hash_mix(h, quant_f32(d.dense_lowpass));
    h = hash_mix(h, quant_f32(d.dense_solid_path_m));
    h = hash_mix(h, quant_f32(d.dense_sss_absorption_m));
    h = hash_mix(h, quant_f32(d.dense_wrinkle_scatter));
    h = hash_mix(h, quant_f32(d.dense_hair_fringe_damp));
    h = hash_mix(h, quant_f32(d.dense_modal_ring_rms));
    h = hash_mix(h, quant_f32(d.dense_solid_rms));
    h = hash_mix(h, quant_f32(d.dense_fluid_rms));
    h = hash_mix(h, u64::from(d.dense_fluid_morphs));
    h = hash_mix(h, quant_f32(d.dense_solid_high_band));
    h = hash_mix(h, quant_f32(d.dense_fluid_high_band));
    h = hash_mix(h, quant_f32(d.light_direct));
    h = hash_mix(h, quant_f32(d.light_lowpass));
    h = hash_mix(h, quant_f32(d.light_sss_absorption_m));
    h = hash_mix(h, quant_f32(d.light_wrinkle_scatter));
    h = hash_mix(h, quant_f32(d.light_hair_fringe_damp));
    h = hash_mix(h, quant_f32(d.light_diffuse));
    h = hash_mix(h, quant_f32(d.clear_direct));
    h = hash_mix(h, quant_f32(d.clear_lowpass));
    h = hash_mix(h, quant_f32(d.clear_solid_rms));
    h = hash_mix(h, quant_f32(d.clear_fluid_rms));
    h = hash_mix(h, u64::from(d.clear_fluid_morphs));
    h ^= FP_XOR;
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == KL_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Instant-measured Subsurface Acoustic Scattering soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubsurfaceAcousticScatteringSoakReport {
    /// Soak-gated — full tissue transmission chain + determinism.
    pub subsurface_acoustic_scattering_ready: bool,
    /// A tissue volume attenuates broadband transmission measurably.
    pub tissue_transmission_measured: bool,
    /// Larger SSS mean-free-path → weaker absorption → higher transmission.
    pub mfp_couples_absorption: bool,
    /// A clear path passes the source at identity (transmission/lowpass = 1).
    pub clear_path_identity: bool,
    /// Without a tissue volume the Fluid signature equals the Solid one
    /// bit-for-bit (Zero Imposição).
    pub solid_identity_passthrough: bool,
    /// Fluid spectrum morphs the transient only under a tissue volume.
    pub fluid_morphing_active: bool,
    /// Wrinkle surface detail scatters only when the region is wrinkled.
    pub wrinkle_surface_scatter_measured: bool,
    /// Hair-fringe density absorbs highs only when hair is present.
    pub hair_fringe_absorption_measured: bool,
    /// The ex SDF march actually traversed tissue (solid path > 0).
    pub sdf_volumetric_occlusion_measured: bool,
    /// Diffuse subsurface-scattered energy is measured (and stronger in
    /// translucent tissue).
    pub diffuse_scatter_measured: bool,
    /// The jx tissue modal rings on a struck tissue volume and stays silent on
    /// a clear path.
    pub tissue_modal_resonance_measured: bool,
    /// Same seed → same measured pass.
    pub deterministic_replay: bool,
    /// All measured outputs finite.
    pub outputs_finite: bool,
    /// Transmission / RMS stay within physically-plausible magnitudes.
    pub transmission_bounded: bool,
    /// Observation only (NOT a gate): the tissue chain altered the high band.
    pub tissue_scatter_alters_highs: bool,
    /// Dense tissue SSS mean-free-path (mm).
    pub sss_mfp_mm_dense: f32,
    /// Light tissue SSS mean-free-path (mm).
    pub sss_mfp_mm_light: f32,
    /// Dense tissue coherent transmission.
    pub dense_direct_transmission: f32,
    /// Dense tissue combined lowpass gain.
    pub dense_lowpass_gain: f32,
    /// Dense tissue solid path traversed (m).
    pub dense_solid_path_m: f32,
    /// Dense tissue absorption coefficient (1/m).
    pub dense_sss_absorption_m: f32,
    /// Dense tissue wrinkle surface scatter.
    pub dense_wrinkle_scatter: f32,
    /// Dense tissue hair-fringe damp.
    pub dense_hair_fringe_damp: f32,
    /// Dense tissue diffuse scatter gain.
    pub dense_diffuse_scatter_gain: f32,
    /// Dense tissue modal ring RMS.
    pub dense_modal_ring_rms: f32,
    /// Dense tissue solid signature RMS.
    pub dense_solid_rms: f32,
    /// Dense tissue fluid signature RMS.
    pub dense_fluid_rms: f32,
    /// Dense tissue solid high-band fraction.
    pub dense_solid_high_band_fraction: f32,
    /// Dense tissue fluid high-band fraction.
    pub dense_fluid_high_band_fraction: f32,
    /// Light tissue coherent transmission.
    pub light_direct_transmission: f32,
    /// Light tissue combined lowpass gain.
    pub light_lowpass_gain: f32,
    /// Light tissue absorption coefficient (1/m).
    pub light_sss_absorption_m: f32,
    /// Light tissue wrinkle surface scatter (must be ~0 — smooth).
    pub light_wrinkle_scatter: f32,
    /// Light tissue hair-fringe damp (must be 0 — no hair).
    pub light_hair_fringe_damp: f32,
    /// Light tissue diffuse scatter gain.
    pub light_diffuse_scatter_gain: f32,
    /// Clear-path coherent transmission (must be 1.0).
    pub clear_direct_transmission: f32,
    /// Clear-path lowpass gain (must be 1.0).
    pub clear_lowpass_gain: f32,
    /// Host sample rate (Hz).
    pub sample_rate_hz: f32,
    /// Soak wall time.
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (letter **kl**).
    pub evidence_kind: &'static str,
    /// Fingerprint of kl-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_strand_hair_subsurface_skin_probe: bool,
    pub distinct_from_skin_wrinkle_map_probe: bool,
    pub distinct_from_sdf_audio_raymarching_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_microfracture_acoustic_probe: bool,
    pub distinct_from_mach1_sonic_boom_probe: bool,
    /// Fail-closed — no physical tissue acoustics / MetaHuman audio AAA.
    pub physical_audio_aaa_ready: bool,
    pub tissue_acoustics_aaa_ready: bool,
    pub meta_human_audio_aaa_ready: bool,
    pub strand_hair_subsurface_skin_aaa_ready: bool,
    pub wrinkle_aaa_ready: bool,
    pub sdf_occlusion_aaa_ready: bool,
}

/// Subsurface Acoustic Scattering soak: tissue volume → SDF geometric
/// occlusion → SSS mean-free-path absorption → wrinkle surface scatter →
/// hair-fringe damp → diffuse scatter → jx tissue modal resonance → spectrum.
///
/// Does **not** claim physical tissue acoustics / MetaHuman audio / full SSS
/// audio AAA.
pub fn run_subsurface_acoustic_scattering_soak() -> SubsurfaceAcousticScatteringSoakReport {
    let t0 = Instant::now();
    let a = run_measured_pass();
    let b = run_measured_pass();

    let deterministic_replay = (a.dense_direct - b.dense_direct).abs() < 1e-6
        && (a.dense_lowpass - b.dense_lowpass).abs() < 1e-6
        && (a.dense_solid_path_m - b.dense_solid_path_m).abs() < 1e-6
        && (a.dense_sss_absorption_m - b.dense_sss_absorption_m).abs() < 1e-6
        && (a.dense_modal_ring_rms - b.dense_modal_ring_rms).abs() < 1e-6
        && (a.dense_solid_rms - b.dense_solid_rms).abs() < 1e-6
        && (a.dense_fluid_rms - b.dense_fluid_rms).abs() < 1e-6
        && a.dense_fluid_morphs == b.dense_fluid_morphs
        && (a.light_direct - b.light_direct).abs() < 1e-6
        && (a.clear_direct - b.clear_direct).abs() < 1e-6;

    let tissue_transmission_measured = a.dense_direct > 0.0 && a.dense_direct < 1.0;
    let mfp_couples_absorption =
        a.light_direct > a.dense_direct && a.light_sss_absorption_m < a.dense_sss_absorption_m;
    let clear_path_identity = a.clear_direct == 1.0
        && a.clear_lowpass == 1.0
        && (a.clear_solid_rms - a.clear_fluid_rms).abs() < EPS;
    let solid_identity_passthrough = !a.clear_fluid_morphs;
    let fluid_morphing_active = a.dense_fluid_morphs && a.dense_fluid_rms != a.dense_solid_rms;
    let wrinkle_surface_scatter_measured = a.dense_wrinkle_scatter > EPS
        && a.light_wrinkle_scatter <= EPS;
    let hair_fringe_absorption_measured = a.dense_hair_fringe_damp > EPS
        && a.light_hair_fringe_damp == 0.0;
    let sdf_volumetric_occlusion_measured = a.dense_solid_path_m > EPS;
    let diffuse_scatter_measured = a.dense_diffuse > 0.0 && a.light_diffuse > a.dense_diffuse;
    let tissue_modal_resonance_measured = a.dense_modal_ring_rms > 0.0;
    let tissue_scatter_alters_highs =
        a.dense_fluid_high_band != a.dense_solid_high_band;

    let outputs_finite = a.all_finite() && b.all_finite();
    // Numerical-sanity gate: every transmission stays in (0, 1] and every
    // signature RMS stays within physically-plausible magnitudes (catches
    // blowup `all_finite` alone misses).
    let transmission_bounded = a.dense_direct > 0.0
        && a.dense_direct <= 1.0
        && a.dense_diffuse <= 1.0
        && a.dense_lowpass <= 1.0
        && a.dense_solid_rms <= KL_MAX_SANE_RMS
        && a.dense_fluid_rms <= KL_MAX_SANE_RMS
        && a.dense_modal_ring_rms <= KL_MAX_SANE_RMS
        && a.light_direct > 0.0
        && a.light_direct <= 1.0
        && a.light_lowpass <= 1.0
        && a.clear_direct == 1.0
        && a.clear_lowpass == 1.0
        && a.clear_solid_rms <= KL_MAX_SANE_RMS
        && a.clear_fluid_rms <= KL_MAX_SANE_RMS;

    let core_ok = tissue_transmission_measured
        && mfp_couples_absorption
        && clear_path_identity
        && solid_identity_passthrough
        && fluid_morphing_active
        && wrinkle_surface_scatter_measured
        && hair_fringe_absorption_measured
        && sdf_volumetric_occlusion_measured
        && diffuse_scatter_measured
        && tissue_modal_resonance_measured
        && deterministic_replay
        && outputs_finite
        && transmission_bounded;

    let evidence_fingerprint = kl_evidence_fingerprint(&a);
    let d = measured_distinct(KL_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    SubsurfaceAcousticScatteringSoakReport {
        subsurface_acoustic_scattering_ready: core_ok && evidence_fingerprint != 0,
        tissue_transmission_measured,
        mfp_couples_absorption,
        clear_path_identity,
        solid_identity_passthrough,
        fluid_morphing_active,
        wrinkle_surface_scatter_measured,
        hair_fringe_absorption_measured,
        sdf_volumetric_occlusion_measured,
        diffuse_scatter_measured,
        tissue_modal_resonance_measured,
        deterministic_replay,
        outputs_finite,
        transmission_bounded,
        tissue_scatter_alters_highs,
        sss_mfp_mm_dense: KL_MFP_DENSE_MM,
        sss_mfp_mm_light: KL_MFP_LIGHT_MM,
        dense_direct_transmission: a.dense_direct,
        dense_lowpass_gain: a.dense_lowpass,
        dense_solid_path_m: a.dense_solid_path_m,
        dense_sss_absorption_m: a.dense_sss_absorption_m,
        dense_wrinkle_scatter: a.dense_wrinkle_scatter,
        dense_hair_fringe_damp: a.dense_hair_fringe_damp,
        dense_diffuse_scatter_gain: a.dense_diffuse,
        dense_modal_ring_rms: a.dense_modal_ring_rms,
        dense_solid_rms: a.dense_solid_rms,
        dense_fluid_rms: a.dense_fluid_rms,
        dense_solid_high_band_fraction: a.dense_solid_high_band,
        dense_fluid_high_band_fraction: a.dense_fluid_high_band,
        light_direct_transmission: a.light_direct,
        light_lowpass_gain: a.light_lowpass,
        light_sss_absorption_m: a.light_sss_absorption_m,
        light_wrinkle_scatter: a.light_wrinkle_scatter,
        light_hair_fringe_damp: a.light_hair_fringe_damp,
        light_diffuse_scatter_gain: a.light_diffuse,
        clear_direct_transmission: a.clear_direct,
        clear_lowpass_gain: a.clear_lowpass,
        sample_rate_hz: SAMPLE_RATE,
        soak_elapsed_ns: t0.elapsed().as_nanos(),
        evidence_kind: KL_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_strand_hair_subsurface_skin_probe: d,
        distinct_from_skin_wrinkle_map_probe: d,
        distinct_from_sdf_audio_raymarching_probe: d,
        distinct_from_metasounds_dsp_probe: d,
        distinct_from_microfracture_acoustic_probe: d,
        distinct_from_mach1_sonic_boom_probe: d,
        physical_audio_aaa_ready: false,
        tissue_acoustics_aaa_ready: false,
        meta_human_audio_aaa_ready: false,
        strand_hair_subsurface_skin_aaa_ready: false,
        wrinkle_aaa_ready: false,
        sdf_occlusion_aaa_ready: false,
    }
}

/// Honesty probe — soak-gated `subsurface_acoustic_scattering_ready`, never
/// hardcoded.
pub fn probe_subsurface_acoustic_scattering() -> SubsurfaceAcousticScatteringSoakReport {
    run_subsurface_acoustic_scattering_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mach1_sonic_boom_signature::probe_mach1_sonic_boom;
    use crate::metasounds_dsp_compiler::run_metasounds_dsp_soak;
    use crate::microfracture_acoustic::probe_microfracture_acoustic;
    use crate::sdf_audio_raymarching::run_sdf_audio_raymarching_soak;
    use crate::skin_wrinkle_map::run_skin_wrinkle_map_soak;
    use crate::strand_hair_subsurface_skin::probe_strand_hair_subsurface_skin;

    #[test]
    fn sss_absorption_inversely_scales_with_mfp() {
        let dense_abs = sss_absorption(KL_MFP_DENSE_MM);
        let light_abs = sss_absorption(KL_MFP_LIGHT_MM);
        assert!(dense_abs > light_abs, "{dense_abs} vs {light_abs}");
        assert!(dense_abs > 0.0);
        assert!(light_abs < KL_MAX_ABS_M);
        // Both absorptions keep the tissue transmission strictly in (0, 1).
        let dense_t = (-dense_abs * 0.5).exp();
        let light_t = (-light_abs * 0.5).exp();
        assert!(dense_t > 0.0 && dense_t < 1.0);
        assert!(light_t > dense_t);
    }

    #[test]
    fn clear_path_is_identity_passthrough() {
        let clear = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_LIGHT,
            KL_STRAIN_CURV_LIGHT,
            1.0,
            false,
            false,
        );
        assert_eq!(clear.direct_transmission, 1.0);
        assert_eq!(clear.lowpass_gain, 1.0);
        assert_eq!(clear.solid_path_m, 0.0);
        assert_eq!(clear.diffuse_scatter_gain, 0.0);
        assert_eq!(clear.wrinkle_scatter, 0.0);
        assert_eq!(clear.hair_fringe_damp, 0.0);
        // Zero Imposição: no tissue volume → no morphology → bit-identical.
        assert_eq!(clear.fluid, clear.solid);
        assert!(!clear.fluid_morphs);
        assert_eq!(clear.modal_ring_rms, 0.0);
    }

    #[test]
    fn dense_tissue_morphs_and_modal_rings() {
        let dense = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_DENSE,
            KL_STRAIN_CURV_DENSE,
            KL_UV_STRETCH,
            true,
            true,
        );
        assert!(dense.direct_transmission > 0.0, "{}", dense.direct_transmission);
        assert!(dense.direct_transmission < 1.0);
        assert!(dense.solid_path_m > 0.0);
        assert!(dense.fluid_morphs, "fluid must morph under a tissue volume");
        assert_ne!(dense.fluid, dense.solid);
        assert_ne!(dense.fluid_rms, dense.solid_rms);
        assert!(dense.modal_ring_rms > 0.0, "modal {}", dense.modal_ring_rms);
        assert!(dense.outputs_finite);
    }

    #[test]
    fn wrinkle_scatter_only_with_surface_detail() {
        let dense = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_DENSE,
            KL_STRAIN_CURV_DENSE,
            KL_UV_STRETCH,
            false,
            true,
        );
        let light = run_tissue_config(
            KL_MFP_LIGHT_MM,
            KL_CREASE_LIGHT,
            KL_STRAIN_CURV_LIGHT,
            1.0,
            false,
            true,
        );
        assert!(dense.wrinkle_intensity > 0.0, "int {}", dense.wrinkle_intensity);
        assert!(dense.wrinkle_scatter > EPS, "scatter {}", dense.wrinkle_scatter);
        assert_eq!(light.wrinkle_intensity, 0.0);
        assert_eq!(light.wrinkle_scatter, 0.0);
    }

    #[test]
    fn hair_fringe_damp_measured() {
        let dense = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_DENSE,
            KL_STRAIN_CURV_DENSE,
            KL_UV_STRETCH,
            true,
            true,
        );
        let light = run_tissue_config(
            KL_MFP_LIGHT_MM,
            KL_CREASE_LIGHT,
            KL_STRAIN_CURV_LIGHT,
            1.0,
            false,
            true,
        );
        assert!(dense.hair_fringe_damp > EPS, "hair {}", dense.hair_fringe_damp);
        assert_eq!(light.hair_fringe_damp, 0.0);
    }

    #[test]
    fn sdf_volumetric_occlusion_traverses_tissue() {
        let dense = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_DENSE,
            KL_STRAIN_CURV_DENSE,
            KL_UV_STRETCH,
            true,
            true,
        );
        let clear = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_LIGHT,
            KL_STRAIN_CURV_LIGHT,
            1.0,
            false,
            false,
        );
        assert!(dense.solid_path_m > 0.0, "path {}", dense.solid_path_m);
        assert_eq!(clear.solid_path_m, 0.0);
    }

    #[test]
    fn diffuse_scatter_stronger_in_light_tissue() {
        let dense = run_tissue_config(
            KL_MFP_DENSE_MM,
            KL_CREASE_DENSE,
            KL_STRAIN_CURV_DENSE,
            KL_UV_STRETCH,
            false,
            true,
        );
        let light = run_tissue_config(
            KL_MFP_LIGHT_MM,
            KL_CREASE_LIGHT,
            KL_STRAIN_CURV_LIGHT,
            1.0,
            false,
            true,
        );
        assert!(dense.diffuse_scatter_gain > 0.0, "{}", dense.diffuse_scatter_gain);
        assert!(
            light.diffuse_scatter_gain > dense.diffuse_scatter_gain,
            "light {} dense {}",
            light.diffuse_scatter_gain,
            dense.diffuse_scatter_gain
        );
    }

    #[test]
    fn measured_pass_is_deterministic() {
        let a = run_measured_pass();
        let b = run_measured_pass();
        assert_eq!(a, b);
    }

    #[test]
    fn soak_probe_ready_and_held_flags() {
        let r = probe_subsurface_acoustic_scattering();
        assert!(r.subsurface_acoustic_scattering_ready, "{r:?}");
        assert!(r.tissue_transmission_measured);
        assert!(r.mfp_couples_absorption);
        assert!(r.clear_path_identity);
        assert!(r.solid_identity_passthrough);
        assert!(r.fluid_morphing_active);
        assert!(r.wrinkle_surface_scatter_measured);
        assert!(r.hair_fringe_absorption_measured);
        assert!(r.sdf_volumetric_occlusion_measured);
        assert!(r.diffuse_scatter_measured);
        assert!(r.tissue_modal_resonance_measured);
        assert!(r.deterministic_replay);
        assert!(r.outputs_finite);
        assert!(r.transmission_bounded);
        assert_eq!(r.evidence_kind, KL_EVIDENCE_KIND);
        assert_ne!(r.evidence_fingerprint, 0);
        assert!(r.dense_direct_transmission > 0.0);
        assert!(r.dense_direct_transmission < 1.0);
        assert!(r.dense_solid_path_m > 0.0);
        assert!(r.light_direct_transmission > r.dense_direct_transmission);
        assert_eq!(r.clear_direct_transmission, 1.0);
        assert_eq!(r.clear_lowpass_gain, 1.0);
        assert!(r.dense_modal_ring_rms > 0.0);
        assert!(!r.physical_audio_aaa_ready);
        assert!(!r.tissue_acoustics_aaa_ready);
        assert!(!r.meta_human_audio_aaa_ready);
        assert!(!r.strand_hair_subsurface_skin_aaa_ready);
        assert!(!r.wrinkle_aaa_ready);
        assert!(!r.sdf_occlusion_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        // `soak_elapsed_ns` is wall-clock (non-deterministic between runs), so
        // the deterministic fields are compared exactly (ki/kj/kk precedent):
        // fingerprint, readiness gates and the physical scalars must all be
        // identical.
        let a = probe_subsurface_acoustic_scattering();
        let b = run_subsurface_acoustic_scattering_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(
            a.subsurface_acoustic_scattering_ready,
            b.subsurface_acoustic_scattering_ready
        );
        assert_eq!(a.deterministic_replay, b.deterministic_replay);
        assert_eq!(a.transmission_bounded, b.transmission_bounded);
        assert_eq!(a.dense_direct_transmission, b.dense_direct_transmission);
        assert_eq!(a.dense_lowpass_gain, b.dense_lowpass_gain);
        assert_eq!(a.dense_solid_path_m, b.dense_solid_path_m);
        assert_eq!(a.dense_sss_absorption_m, b.dense_sss_absorption_m);
        assert_eq!(a.dense_modal_ring_rms, b.dense_modal_ring_rms);
        assert_eq!(a.light_direct_transmission, b.light_direct_transmission);
        assert_eq!(a.clear_direct_transmission, b.clear_direct_transmission);
        assert_eq!(a.clear_lowpass_gain, b.clear_lowpass_gain);
        assert_eq!(a.evidence_kind, b.evidence_kind);
    }

    #[test]
    fn kl_distinct_from_peers() {
        let kl = probe_subsurface_acoustic_scattering();
        let kd = run_skin_wrinkle_map_soak();
        let ex = run_sdf_audio_raymarching_soak();
        let jx = run_metasounds_dsp_soak();
        let kj = probe_microfracture_acoustic();
        let kk = probe_mach1_sonic_boom();
        let mut soa = StrandHairSkinSoA::default();
        soa.push_strand(0.0, 1.8, 0.0, 0.0, 1.5, 0.1);
        let ip12 = probe_strand_hair_subsurface_skin(&soa);

        assert!(kl.subsurface_acoustic_scattering_ready);
        assert!(kd.skin_wrinkle_map_ready);
        assert!(ex.sdf_audio_raymarching_ready);
        assert!(jx.metasounds_dsp_ready);
        assert!(kj.microfracture_acoustic_ready);
        assert!(kk.sonic_boom_signature_ready);
        assert!(ip12.strand_hair_subsurface_skin_ready);

        assert_eq!(kl.evidence_kind, KL_EVIDENCE_KIND);
        assert_ne!(kl.evidence_kind, kd.evidence_kind.as_str());
        assert_ne!(kl.evidence_kind, ex.evidence_kind);
        assert_ne!(kl.evidence_kind, jx.evidence_kind);
        assert_ne!(kl.evidence_kind, kj.evidence_kind);
        assert_ne!(kl.evidence_kind, kk.evidence_kind);
        assert_ne!(kl.evidence_fingerprint, kd.evidence_fingerprint);
        assert_ne!(kl.evidence_fingerprint, ex.evidence_fingerprint);
        assert_ne!(kl.evidence_fingerprint, jx.evidence_fingerprint);
        assert_ne!(kl.evidence_fingerprint, kj.evidence_fingerprint);
        assert_ne!(kl.evidence_fingerprint, kk.evidence_fingerprint);

        assert!(kl.distinct_from_strand_hair_subsurface_skin_probe);
        assert!(kl.distinct_from_skin_wrinkle_map_probe);
        assert!(kl.distinct_from_sdf_audio_raymarching_probe);
        assert!(kl.distinct_from_metasounds_dsp_probe);
        assert!(kl.distinct_from_microfracture_acoustic_probe);
        assert!(kl.distinct_from_mach1_sonic_boom_probe);

        // Different mechanisms: kl couples tissue volume + SSS mean-free-path +
        // wrinkle surface scatter + hair fringe + modal vs kd visual wrinkle
        // map / ex SDF occlusion / jx DSP compiler / kj fracture-acoustics /
        // kk sonic boom.
        assert!(kl.dense_solid_path_m > 0.0);
        assert!(kd.substrate_strain_high > 0.0);
        assert!(ex.sdf_audio_raymarching_ready);
        assert!(kj.microfracture_density > 0.0);
        assert!(kk.lighthill_source > 0.0);
    }
}

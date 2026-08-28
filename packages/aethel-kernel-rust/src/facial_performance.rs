//! Facial Performance Kernel — letter **kc**.
//!
//! The unified audio → face duplex of the AV/Render supremacy audit
//! (Founder "A Sincronia Áudio-Visual e a Qualidade de Renderização",
//! claim 1): phonemes become visemes, visemes drive the **real** virtual
//! facial muscles, emotional arousal drives the **real** micro-saccade /
//! blink engine, and muscle tension drives the **real** subsurface skin
//! scattering — one deterministic driver, zero JSON in the hot path.
//!
//! Real, not mock (Zero-MVP / Anti-Mock). This kernel **composes four real
//! published substrate kernels** (one physical unit-error corrected
//! 2026-08-14kc — see [`emotion_micro_saccade_engine`]): the missing `2π` in
//! the micro-tremor phase made the substrate oscillate at `f/(2π)` ≈ 4.8-7.6 Hz
//! while its own contract documented 20-80 Hz; fixed with `TAU` so the delivered
//! tremor genuinely sits in the 20-80 Hz band. All other substrate code is
//! untouched:
//! - **Phoneme → viseme.** [`PhonemeClass`] is the real articulatory
//!   classification space (vowel quadrilateral from formants, consonant
//!   places of articulation, silence). [`classify_phoneme`] derives the
//!   vowel / silence class from the **real** spectral formant geometry of a
//!   [`SpectralAudioFrame`] (high F1 ⇒ open vowel, low F2 ⇒ rounded/back
//!   vowel — the documented IPA acoustic cues). Each class maps to real
//!   viseme weights (jaw-open, lip-round, lip-spread, labiodental contact,
//!   tongue-tip).
//! - **Viseme → muscle activation.** The **real**
//!   [`VocalMuscleResolver::resolve_facial_muscles`] turns the spectral
//!   energy frame into a [`FacialMuscleActivationState`] (jaw, lip pucker /
//!   stretch, neck platysma, pupil); the kernel then blends that real state
//!   with the phoneme's viseme weights (`viseme_muscle_blend`) so an open
//!   vowel physically opens the jaw and a rounded vowel physically puckers
//!   the lips.
//! - **Emotion → gaze.** The **real**
//!   [`EmotionMicroSaccadeEngine::sample_organic_gaze`] injects the 20-80 Hz
//!   micro-tremor, binocular divergence, the 3.5 s blink cycle and the
//!   speech-driven eyebrow tremor. The kernel maps the frame's
//!   `emotional_intensity` onto the engine's `[-1, 1]` valence axis — the
//!   substrate scales the tremor *rate* with `|valence|`, so higher arousal
//!   measurably raises the micro-saccade frequency (proven by the soak via
//!   the implied-frequency estimate from the sampled slope).
//! - **Muscle tension → SSS.** The **real**
//!   [`LuxFacialSubsurfaceOcclusion::compute_dynamic_skin_sss`] converts
//!   muscle tension + jaw opening into epidermal scattering radius,
//!   subdermal blood perfusion and micro-fold shadow depth.
//! - **Language → retarget.** The **real**
//!   [`MultilingualLipsyncBridge::retarget_lip_sync`] reports the active
//!   viseme count for the target dubbing language (JP 14 / FR 18 / EN 20).
//!
//! Soak-gated honesty: [`run_facial_performance_soak`] proves the full chain
//! — phoneme classification is real articulatory acoustics, open vowels open
//! the jaw, rounded vowels pucker the lips, silence fails closed to neutral,
//! emotional arousal scales the 20-80 Hz micro-tremor rate, the micro
//! amplitude stays bounded, binocular divergence and blinks are present,
//! speech drives eyebrow tremor, tension drives SSS, the JP14/FR18 retarget
//! table is respected and every output is finite — then flips
//! `facial_performance_ready`. `evidence_fingerprint` (seed
//! `0x6B63_5F66_6163_6961` = `kc_facia`) is **distinct** from ej / jx / ka /
//! kb / ex / ei / ef / gw / gv / ew.
//!
//! **HELD (fail-closed, `false`):** full MetaHuman-class facial AAA
//! (`facial_aaa_ready`), full production lip-sync AAA (`lipsync_aaa_ready`),
//! full gaze AAA (`gaze_aaa_ready`), full subsurface AAA (`sss_aaa_ready`) ·
//! Coins / Agones / Nanite / DLSS / Quic. **STOP** J.11/J.12.

use crate::emotion_micro_saccade_engine::{EmotionMicroSaccadeEngine, MicroSaccadeEyeState};
use crate::lux_facial_subsurface_occlusion::{
    FacialSpectralSssState, LuxFacialSubsurfaceOcclusion,
};
use crate::multilingual_lipsync_bridge::{LipSyncRetargetOutput, MultilingualLipsyncBridge};
use crate::vocal_muscle_resolver::{
    FacialMuscleActivationState, SpectralAudioFrame, VocalMuscleResolver,
};
use serde::{Deserialize, Serialize};

/// Normalized-energy threshold below which a frame is treated as silence
/// (fail-closed — no articulation).
pub const PHONEME_SILENCE_ENERGY: f32 = 0.05;
/// First-formant threshold (Hz): above this the jaw is articulatorily open
/// (open / low vowels — high F1 is the documented IPA open-vowel cue).
pub const OPEN_VOWEL_F1_HZ: f32 = 600.0;
/// Second-formant threshold (Hz): below this the lips are articulatorily
/// rounded / the vowel is back (lip protrusion strongly lowers F2).
pub const ROUNDED_F2_HZ: f32 = 1100.0;

/// Soak geometry constants (fixed, deterministic — never randomized).
/// The 0..4 s range spans a full 3.5 s blink cycle plus many micro-tremor
/// cycles, so the max blink / divergence / slope evidence is captured.
pub const SOAK_T_START: f32 = 0.0;
pub const SOAK_T_END: f32 = 4.0;
pub const SOAK_STEPS: usize = 80;
pub const SOAK_DT: f32 = 0.05;
/// Sampling delta (s) for the micro-tremor slope estimate — well inside the
/// Nyquist half-period of the fastest substrate tremor (50 Hz → T/4 = 5 ms).
pub const SOAK_SLOPE_DELTA_S: f32 = 1.0 / 320.0;
/// X-axis micro-tremor amplitude of the real substrate engine (rad).
pub const TREMOR_X_AMPLITUDE_RAD: f32 = 0.005;

/// Evidence identifier for the soak / probe (letter kc).
pub const FACIAL_PERFORMANCE_EVIDENCE_KIND: &str =
    "facial_performance_phoneme_viseme_muscle_gaze_sss";

/// Real articulatory phoneme classes the facial driver understands.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum PhonemeClass {
    /// Open vowel — tongue low, jaw open (IPA low vowels, high F1).
    OpenVowel,
    /// Closed vowel — tongue high, jaw nearly shut (IPA high vowels, low F1).
    ClosedVowel,
    /// Rounded / back vowel — lip protrusion, strongly lowered F2.
    RoundedVowel,
    /// Bilabial — both lips contact (b, p, m).
    Bilabial,
    /// Labiodental — lower lip to upper teeth (f, v).
    Labiodental,
    /// Alveolar — tongue tip to alveolar ridge (t, d, s, n).
    Alveolar,
    /// Velar — tongue dorsum to velum (k, g, ŋ).
    Velar,
    /// Silence / pause — neutral rest.
    Silence,
}

/// Real viseme weight set — the visual equivalence classes of the phonemes,
/// expressed in the facial-muscle axes the substrate [`FacialMuscleActivationState`]
/// exposes (jaw, lip round/pucker, lip spread) plus contact cues.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct VisemeWeights {
    /// Jaw-open weight (0..1) — open vowels.
    pub jaw_open: f32,
    /// Lip-round / pucker weight (0..1) — rounded vowels, bilabials.
    pub lip_round: f32,
    /// Lip-spread / stretch weight (0..1) — closed front vowels.
    pub lip_spread: f32,
    /// Labiodental contact weight (0..1) — lower lip vs upper teeth.
    pub labiodental_contact: f32,
    /// Tongue-tip visibility weight (0..1) — alveolar / dental.
    pub tongue_tip: f32,
}

impl PhonemeClass {
    /// Real phoneme → viseme mapping (the visual equivalence classes of
    /// articulation). Open vowels open the jaw; rounded vowels protrude the
    /// lips; bilabials close-round the lips; labiodentals raise the lower lip
    /// to the teeth; alveolars show the tongue tip; silence is neutral.
    pub fn viseme_weights(self) -> VisemeWeights {
        match self {
            PhonemeClass::OpenVowel => VisemeWeights {
                jaw_open: 0.85,
                lip_round: 0.10,
                lip_spread: 0.15,
                labiodental_contact: 0.0,
                tongue_tip: 0.0,
            },
            PhonemeClass::ClosedVowel => VisemeWeights {
                jaw_open: 0.20,
                lip_round: 0.15,
                lip_spread: 0.60,
                labiodental_contact: 0.0,
                tongue_tip: 0.10,
            },
            PhonemeClass::RoundedVowel => VisemeWeights {
                jaw_open: 0.55,
                lip_round: 0.90,
                lip_spread: 0.0,
                labiodental_contact: 0.0,
                tongue_tip: 0.0,
            },
            PhonemeClass::Bilabial => VisemeWeights {
                jaw_open: 0.25,
                lip_round: 0.50,
                lip_spread: 0.20,
                labiodental_contact: 0.0,
                tongue_tip: 0.0,
            },
            PhonemeClass::Labiodental => VisemeWeights {
                jaw_open: 0.30,
                lip_round: 0.10,
                lip_spread: 0.30,
                labiodental_contact: 0.90,
                tongue_tip: 0.0,
            },
            PhonemeClass::Alveolar => VisemeWeights {
                jaw_open: 0.40,
                lip_round: 0.05,
                lip_spread: 0.20,
                labiodental_contact: 0.0,
                tongue_tip: 0.85,
            },
            PhonemeClass::Velar => VisemeWeights {
                jaw_open: 0.35,
                lip_round: 0.10,
                lip_spread: 0.20,
                labiodental_contact: 0.0,
                tongue_tip: 0.10,
            },
            PhonemeClass::Silence => VisemeWeights {
                jaw_open: 0.05,
                lip_round: 0.05,
                lip_spread: 0.05,
                labiodental_contact: 0.0,
                tongue_tip: 0.0,
            },
        }
    }
}

/// Real spectral → phoneme classifier. Vowel / silence articulation is read
/// directly from the formant geometry of a [`SpectralAudioFrame`] using the
/// documented IPA acoustic cues (F1 ↔ tongue height / jaw openness, F2 ↔ lip
/// rounding / backness). Consonant places of articulation are supplied by the
/// upstream phoneme recognizer through the explicit [`PhonemeClass`] drive.
/// Fail-closed: non-finite / silent frames classify as [`PhonemeClass::Silence`].
pub fn classify_phoneme(audio: &SpectralAudioFrame) -> PhonemeClass {
    let energy = ((audio.energy_db + 60.0) / 60.0).clamp(0.0, 1.0);
    if !energy.is_finite() || energy < PHONEME_SILENCE_ENERGY {
        return PhonemeClass::Silence;
    }
    let f1 = audio.formant_f1_hz;
    let f2 = audio.formant_f2_hz;
    if !f1.is_finite() || !f2.is_finite() {
        return PhonemeClass::Silence;
    }
    if f1 > OPEN_VOWEL_F1_HZ {
        PhonemeClass::OpenVowel
    } else if f2 < ROUNDED_F2_HZ {
        PhonemeClass::RoundedVowel
    } else {
        PhonemeClass::ClosedVowel
    }
}

/// One fully-resolved facial performance frame — the unified output of the
/// whole audio → face duplex for a single instant.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FacialPerformanceFrame {
    /// Articulatory class driving this frame.
    pub phoneme: PhonemeClass,
    /// Viseme weights selected for this phoneme.
    pub viseme: VisemeWeights,
    /// Real [`FacialMuscleActivationState`] from the vocal-muscle resolver,
    /// viseme-blended.
    pub muscles: FacialMuscleActivationState,
    /// Real [`MicroSaccadeEyeState`] from the emotion micro-saccade engine.
    pub gaze: MicroSaccadeEyeState,
    /// Real [`FacialSpectralSssState`] from the Lux subsurface occlusion.
    pub sss: FacialSpectralSssState,
    /// Real [`LipSyncRetargetOutput`] for the configured dubbing language.
    pub retarget: LipSyncRetargetOutput,
    /// Measured binocular divergence (rad) — right eye vs left eye offset.
    pub binoc_divergence_rad: f32,
}

/// The unified facial-performance authority: one config drives phoneme →
/// viseme → muscle → gaze → SSS through the four real substrate kernels.
/// Deterministic — the substrates are pure functions of their inputs, so the
/// same inputs (same "seed" of spectral frame + time + speech flag) always
/// produce the same frame.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FacialPerformanceKernel {
    /// How strongly viseme weights override the raw spectral muscle state
    /// (0..1). 1.0 = articulation fully drives the mouth; 0.0 = raw spectral
    /// only.
    pub viseme_muscle_blend: f32,
    /// Ambient illumination (lux) forwarded to the real SSS engine.
    pub ambient_light_lux: f32,
    /// Source dubbing language tag.
    pub source_language: String,
    /// Target dubbing language tag (JP 14 / FR 18 / EN 20 visemes).
    pub target_language: String,
}

impl Default for FacialPerformanceKernel {
    fn default() -> Self {
        Self {
            viseme_muscle_blend: 0.65,
            ambient_light_lux: 500.0,
            source_language: "Portuguese".to_string(),
            target_language: "Japanese".to_string(),
        }
    }
}

impl FacialPerformanceKernel {
    /// Spectral entry point: classify the frame's phoneme then resolve the
    /// full facial performance at absolute time `t` (s).
    pub fn step(&self, audio: &SpectralAudioFrame, t: f32, speech_active: bool) -> FacialPerformanceFrame {
        let phoneme = classify_phoneme(audio);
        self.step_phoneme(phoneme, audio, t, speech_active)
    }

    /// Explicit phoneme drive (used by upstream phoneme recognizers for
    /// consonant places the spectral classifier does not resolve) — resolves
    /// the full facial performance at absolute time `t` (s).
    pub fn step_phoneme(
        &self,
        phoneme: PhonemeClass,
        audio: &SpectralAudioFrame,
        t: f32,
        speech_active: bool,
    ) -> FacialPerformanceFrame {
        // 1. Phoneme → viseme.
        let viseme = phoneme.viseme_weights();

        // 2. Real vocal-muscle resolution, then viseme blend on the real state.
        let mut muscles = VocalMuscleResolver::resolve_facial_muscles(audio);
        let b = self.viseme_muscle_blend.clamp(0.0, 1.0);
        muscles.jaw_opening_factor =
            (muscles.jaw_opening_factor * (1.0 - b) + viseme.jaw_open * b).clamp(0.0, 1.0);
        muscles.lip_pucker_factor =
            (muscles.lip_pucker_factor * (1.0 - b) + viseme.lip_round * b).clamp(0.0, 1.0);
        muscles.lip_stretch_factor =
            (muscles.lip_stretch_factor * (1.0 - b) + viseme.lip_spread * b).clamp(0.0, 1.0);

        // 3. Emotional arousal → valence on the real micro-saccade engine.
        let intensity = audio.emotional_intensity.clamp(0.0, 1.0);
        let valence = intensity * 2.0 - 1.0;
        let gaze = EmotionMicroSaccadeEngine::sample_organic_gaze(valence, speech_active, t);

        // 4. Muscle tension for SSS: real neck/platysma + viseme contact drives.
        let tension = (muscles.neck_platysma_tension * 0.5
            + viseme.labiodental_contact * 0.35
            + viseme.jaw_open * 0.15)
            .clamp(0.0, 1.0);
        let sss = LuxFacialSubsurfaceOcclusion::compute_dynamic_skin_sss(
            tension,
            muscles.jaw_opening_factor,
            self.ambient_light_lux,
        );

        // 5. Language retarget through the real bridge.
        let retarget = MultilingualLipsyncBridge::retarget_lip_sync(
            &self.source_language,
            &self.target_language,
            intensity,
        );

        // 6. Measured binocular divergence (real substrate: right eye trails
        //    the left by a small fixed factor — divergence is always present).
        let binoc_divergence_rad = ((gaze.left_eye_offset_rad[0] - gaze.right_eye_offset_rad[0])
            .powi(2)
            + (gaze.left_eye_offset_rad[1] - gaze.right_eye_offset_rad[1]).powi(2))
        .sqrt();

        FacialPerformanceFrame {
            phoneme,
            viseme,
            muscles,
            gaze,
            sss,
            retarget,
            binoc_divergence_rad,
        }
    }
}

/// Scan a run of frames and return the max evidence tuple:
/// `(max_tremor_slope, max_saccade_amp, max_binoc_div, max_blink, max_eyebrow)`.
/// Deterministic — pure function of the inputs.
fn scan_gaze(
    kernel: &FacialPerformanceKernel,
    phoneme: PhonemeClass,
    audio: &SpectralAudioFrame,
    speech_active: bool,
    sample_delta: f32,
) -> (f32, f32, f32, f32, f32) {
    let mut max_slope = 0.0_f32;
    let mut max_amp = 0.0_f32;
    let mut max_binoc = 0.0_f32;
    let mut max_blink = 0.0_f32;
    let mut max_eyebrow = 0.0_f32;
    for i in 0..SOAK_STEPS {
        let t = SOAK_T_START + i as f32 * SOAK_DT;
        let a = kernel.step_phoneme(phoneme, audio, t, speech_active);
        let t2 = (t + sample_delta).min(SOAK_T_END);
        let b = kernel.step_phoneme(phoneme, audio, t2, speech_active);
        let lxa = a.gaze.left_eye_offset_rad[0];
        let lxb = b.gaze.left_eye_offset_rad[0];
        max_slope = max_slope.max((lxb - lxa).abs());
        let amp = (a.gaze.left_eye_offset_rad[0].powi(2)
            + a.gaze.left_eye_offset_rad[1].powi(2))
        .sqrt();
        max_amp = max_amp.max(amp);
        max_binoc = max_binoc.max(a.binoc_divergence_rad);
        max_blink = max_blink.max(a.gaze.eyelid_blink_weight);
        max_eyebrow = max_eyebrow.max(a.gaze.eyebrow_tremor_mm);
    }
    (max_slope, max_amp, max_binoc, max_blink, max_eyebrow)
}

/// Estimate the micro-tremor frequency (Hz) from the max sampled slope of a
/// sine of amplitude [`TREMOR_X_AMPLITUDE_RAD`]: `f = slope / (A · 2π · Δt)`.
fn implied_tremor_freq_hz(max_slope: f32) -> f32 {
    if max_slope <= 0.0 || !max_slope.is_finite() {
        return 0.0;
    }
    max_slope / (TREMOR_X_AMPLITUDE_RAD * 2.0 * std::f32::consts::PI * SOAK_SLOPE_DELTA_S)
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= v;
    h = h.rotate_left(31);
    h
}

/// Letter **kc** evidence fingerprint — deterministic hash of the measured
/// facial-performance metrics. Seed `0x6B63_5F66_6163_6961` (`kc_facia`),
/// distinct from every prior kernel seed.
fn kc_evidence_fingerprint(
    jaw_open_high: f32,
    jaw_open_silence: f32,
    lip_pucker_high: f32,
    tremor_slope_high: f32,
    tremor_slope_low: f32,
    freq_implied_high: f32,
    freq_implied_low: f32,
    saccade_amp_high: f32,
    saccade_amp_low: f32,
    binoc_divergence_max: f32,
    blink_max: f32,
    eyebrow_speech: f32,
    eyebrow_silent: f32,
    perfusion_tense: f32,
    perfusion_relaxed: f32,
    scatter_radius_tense: f32,
    scatter_radius_relaxed: f32,
    shadow_tense: f32,
    shadow_relaxed: f32,
    viseme_jp: f32,
    viseme_fr: f32,
) -> u64 {
    let mut h = 0x6B63_5F66_6163_6961_u64;
    for v in [
        jaw_open_high.to_bits() as u64,
        jaw_open_silence.to_bits() as u64,
        lip_pucker_high.to_bits() as u64,
        tremor_slope_high.to_bits() as u64,
        tremor_slope_low.to_bits() as u64,
        freq_implied_high.to_bits() as u64,
        freq_implied_low.to_bits() as u64,
        saccade_amp_high.to_bits() as u64,
        saccade_amp_low.to_bits() as u64,
        binoc_divergence_max.to_bits() as u64,
        blink_max.to_bits() as u64,
        eyebrow_speech.to_bits() as u64,
        eyebrow_silent.to_bits() as u64,
        perfusion_tense.to_bits() as u64,
        perfusion_relaxed.to_bits() as u64,
        scatter_radius_tense.to_bits() as u64,
        scatter_radius_relaxed.to_bits() as u64,
        shadow_tense.to_bits() as u64,
        shadow_relaxed.to_bits() as u64,
        viseme_jp.to_bits() as u64,
        viseme_fr.to_bits() as u64,
    ] {
        h = hash_mix(h, v);
    }
    h
}

/// Letter **kc** soak report — facial-performance evidence.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FacialPerformanceSoakReport {
    /// Soak-gated; distinct from ej/jx/ka/kb/ex/ei/ef/gw/gv/ew probes.
    pub facial_performance_ready: bool,
    /// Spectral formants classify real articulatory vowels/silence.
    pub phoneme_classification_real: bool,
    /// An open vowel physically opens the jaw (viseme → muscle).
    pub open_vowel_opens_jaw: bool,
    /// A rounded vowel physically puckers the lips (viseme → muscle).
    pub rounded_vowel_puckers_lips: bool,
    /// Silence fails closed to a neutral mouth.
    pub silence_fails_closed_to_neutral: bool,
    /// Higher emotional arousal raises the micro-tremor rate.
    pub emotion_scales_saccade_tremor: bool,
    /// The implied micro-tremor frequency sits in the 20-80 Hz band.
    pub tremor_in_20_80_hz_band: bool,
    /// The micro-saccade amplitude stays in the micro range (>0, ≤ 0.01 rad).
    pub micro_saccade_amplitude_bounded: bool,
    /// Binocular divergence is physically present (real substrate).
    pub binocular_divergence_present: bool,
    /// The 3.5 s blink cycle produces a non-trivial blink.
    pub blink_present: bool,
    /// Speech drives eyebrow tremor; silence suppresses it.
    pub speech_drives_eyebrow_tremor: bool,
    /// Muscle tension raises perfusion, thins scattering, deepens micro-shadows.
    pub muscle_tension_drives_sss: bool,
    /// The real retarget table respects JP 14 / FR 18 visemes.
    pub retarget_respects_language_viseme_table: bool,
    /// Every reported float is finite.
    pub outputs_finite: bool,
    pub jaw_open_high: f32,
    pub jaw_open_silence: f32,
    pub lip_pucker_high: f32,
    pub tremor_slope_high: f32,
    pub tremor_slope_low: f32,
    pub freq_implied_high: f32,
    pub freq_implied_low: f32,
    pub saccade_amp_high: f32,
    pub saccade_amp_low: f32,
    pub binoc_divergence_max: f32,
    pub blink_max: f32,
    pub eyebrow_speech: f32,
    pub eyebrow_silent: f32,
    pub perfusion_tense: f32,
    pub perfusion_relaxed: f32,
    pub scatter_radius_tense: f32,
    pub scatter_radius_relaxed: f32,
    pub shadow_tense: f32,
    pub shadow_relaxed: f32,
    pub viseme_jp: f32,
    pub viseme_fr: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    /// HELD — full MetaHuman-class facial AAA.
    pub facial_aaa_ready: bool,
    /// HELD — full production lip-sync AAA.
    pub lipsync_aaa_ready: bool,
    /// HELD — full gaze AAA.
    pub gaze_aaa_ready: bool,
    /// HELD — full subsurface AAA.
    pub sss_aaa_ready: bool,
    pub linear_plan_only: bool,
}

/// Run the deterministic facial-performance soak and return the evidence.
pub fn run_facial_performance_soak() -> FacialPerformanceSoakReport {
    let kernel = FacialPerformanceKernel::default();

    // --- Spectral frames: real articulatory geometries ---
    let open_audio = SpectralAudioFrame {
        energy_db: -5.0,
        fundamental_frequency_hz: 140.0,
        formant_f1_hz: 800.0,
        formant_f2_hz: 1400.0,
        emotional_intensity: 0.9,
    };
    let rounded_audio = SpectralAudioFrame {
        energy_db: -8.0,
        fundamental_frequency_hz: 160.0,
        formant_f1_hz: 400.0,
        formant_f2_hz: 800.0,
        emotional_intensity: 0.7,
    };
    let silence_audio = SpectralAudioFrame {
        energy_db: -70.0,
        fundamental_frequency_hz: 120.0,
        formant_f1_hz: 400.0,
        formant_f2_hz: 1200.0,
        emotional_intensity: 0.05,
    };
    let high_audio = SpectralAudioFrame {
        energy_db: -5.0,
        fundamental_frequency_hz: 150.0,
        formant_f1_hz: 700.0,
        formant_f2_hz: 1300.0,
        emotional_intensity: 0.95,
    };
    let low_audio = SpectralAudioFrame {
        energy_db: -5.0,
        fundamental_frequency_hz: 150.0,
        formant_f1_hz: 700.0,
        formant_f2_hz: 1300.0,
        emotional_intensity: 0.5,
    };
    let tense_audio = SpectralAudioFrame {
        energy_db: -8.0,
        fundamental_frequency_hz: 170.0,
        formant_f1_hz: 500.0,
        formant_f2_hz: 1800.0,
        emotional_intensity: 0.95,
    };

    // --- Phoneme classification (real articulatory acoustics) ---
    let phoneme_classification_real = classify_phoneme(&open_audio) == PhonemeClass::OpenVowel
        && classify_phoneme(&rounded_audio) == PhonemeClass::RoundedVowel
        && classify_phoneme(&silence_audio) == PhonemeClass::Silence;

    // --- Viseme → muscle activation (real resolver + viseme blend) ---
    let open_frame = kernel.step_phoneme(PhonemeClass::OpenVowel, &open_audio, 0.1, true);
    let round_frame = kernel.step_phoneme(PhonemeClass::RoundedVowel, &rounded_audio, 0.1, true);
    let silence_frame = kernel.step_phoneme(PhonemeClass::Silence, &silence_audio, 0.1, false);
    let jaw_open_high = open_frame.muscles.jaw_opening_factor;
    let jaw_open_silence = silence_frame.muscles.jaw_opening_factor;
    let lip_pucker_high = round_frame.muscles.lip_pucker_factor;
    let open_vowel_opens_jaw = jaw_open_high > 0.5;
    let rounded_vowel_puckers_lips = lip_pucker_high > 0.5;
    let silence_fails_closed_to_neutral = jaw_open_silence < 0.1;

    // --- Emotion → micro-saccade tremor (real engine, rate scaling) ---
    let (slope_high, amp_high, binoc_high, blink_high, eyebrow_speech) =
        scan_gaze(&kernel, PhonemeClass::OpenVowel, &high_audio, true, SOAK_SLOPE_DELTA_S);
    let (slope_low, amp_low, _binoc_low, _blink_low, _eyebrow_low) =
        scan_gaze(&kernel, PhonemeClass::OpenVowel, &low_audio, true, SOAK_SLOPE_DELTA_S);
    let (_slope_sil, _amp_sil, _binoc_sil, _blink_sil, eyebrow_silent) =
        scan_gaze(&kernel, PhonemeClass::Silence, &silence_audio, false, SOAK_SLOPE_DELTA_S);
    let freq_implied_high = implied_tremor_freq_hz(slope_high);
    let freq_implied_low = implied_tremor_freq_hz(slope_low);

    let emotion_scales_saccade_tremor = slope_high > slope_low;
    let tremor_in_20_80_hz_band = (20.0..=80.0).contains(&freq_implied_high)
        && (20.0..=80.0).contains(&freq_implied_low);
    let micro_saccade_amplitude_bounded = amp_high > 0.0
        && amp_high <= 0.01
        && amp_low > 0.0
        && amp_low <= 0.01;
    let binocular_divergence_present = binoc_high > 1.0e-6;
    let blink_present = blink_high > 0.1;
    let speech_drives_eyebrow_tremor = eyebrow_speech > 0.05 && eyebrow_silent < 1.0e-6;

    // --- Muscle tension → SSS (real Lux engine) ---
    let tense_frame = kernel.step_phoneme(PhonemeClass::Labiodental, &tense_audio, 0.1, true);
    let relaxed_frame = kernel.step_phoneme(PhonemeClass::Silence, &silence_audio, 0.1, false);
    let perfusion_tense = tense_frame.sss.subdermal_blood_perfusion;
    let perfusion_relaxed = relaxed_frame.sss.subdermal_blood_perfusion;
    let scatter_radius_tense = tense_frame.sss.epidermal_scattering_radius_mm;
    let scatter_radius_relaxed = relaxed_frame.sss.epidermal_scattering_radius_mm;
    let shadow_tense = tense_frame.sss.micro_fold_shadow_depth;
    let shadow_relaxed = relaxed_frame.sss.micro_fold_shadow_depth;
    let muscle_tension_drives_sss = perfusion_tense > perfusion_relaxed
        && scatter_radius_tense < scatter_radius_relaxed
        && shadow_tense > shadow_relaxed;

    // --- Language retarget table (real bridge, JP 14 / FR 18) ---
    let viseme_jp = open_frame.retarget.active_viseme_count as f32;
    let kernel_fr = FacialPerformanceKernel {
        target_language: "French".to_string(),
        ..kernel.clone()
    };
    let fr_frame = kernel_fr.step_phoneme(PhonemeClass::OpenVowel, &open_audio, 0.1, true);
    let viseme_fr = fr_frame.retarget.active_viseme_count as f32;
    let retarget_respects_language_viseme_table = viseme_jp == 14.0 && viseme_fr == 18.0;

    let outputs_finite = [
        jaw_open_high,
        jaw_open_silence,
        lip_pucker_high,
        slope_high,
        slope_low,
        freq_implied_high,
        freq_implied_low,
        amp_high,
        amp_low,
        binoc_high,
        blink_high,
        eyebrow_speech,
        eyebrow_silent,
        perfusion_tense,
        perfusion_relaxed,
        scatter_radius_tense,
        scatter_radius_relaxed,
        shadow_tense,
        shadow_relaxed,
        viseme_jp,
        viseme_fr,
    ]
    .iter()
    .all(|v| v.is_finite());

    let ready = phoneme_classification_real
        && open_vowel_opens_jaw
        && rounded_vowel_puckers_lips
        && silence_fails_closed_to_neutral
        && emotion_scales_saccade_tremor
        && tremor_in_20_80_hz_band
        && micro_saccade_amplitude_bounded
        && binocular_divergence_present
        && blink_present
        && speech_drives_eyebrow_tremor
        && muscle_tension_drives_sss
        && retarget_respects_language_viseme_table
        && outputs_finite;

    let evidence_fingerprint = kc_evidence_fingerprint(
        jaw_open_high,
        jaw_open_silence,
        lip_pucker_high,
        slope_high,
        slope_low,
        freq_implied_high,
        freq_implied_low,
        amp_high,
        amp_low,
        binoc_high,
        blink_high,
        eyebrow_speech,
        eyebrow_silent,
        perfusion_tense,
        perfusion_relaxed,
        scatter_radius_tense,
        scatter_radius_relaxed,
        shadow_tense,
        shadow_relaxed,
        viseme_jp,
        viseme_fr,
    );

    FacialPerformanceSoakReport {
        facial_performance_ready: ready,
        phoneme_classification_real,
        open_vowel_opens_jaw,
        rounded_vowel_puckers_lips,
        silence_fails_closed_to_neutral,
        emotion_scales_saccade_tremor,
        tremor_in_20_80_hz_band,
        micro_saccade_amplitude_bounded,
        binocular_divergence_present,
        blink_present,
        speech_drives_eyebrow_tremor,
        muscle_tension_drives_sss,
        retarget_respects_language_viseme_table,
        outputs_finite,
        jaw_open_high,
        jaw_open_silence,
        lip_pucker_high,
        tremor_slope_high: slope_high,
        tremor_slope_low: slope_low,
        freq_implied_high,
        freq_implied_low,
        saccade_amp_high: amp_high,
        saccade_amp_low: amp_low,
        binoc_divergence_max: binoc_high,
        blink_max: blink_high,
        eyebrow_speech,
        eyebrow_silent,
        perfusion_tense,
        perfusion_relaxed,
        scatter_radius_tense,
        scatter_radius_relaxed,
        shadow_tense,
        shadow_relaxed,
        viseme_jp,
        viseme_fr,
        evidence_kind: FACIAL_PERFORMANCE_EVIDENCE_KIND.to_string(),
        evidence_fingerprint,
        letter: "kc".to_string(),
        note: "Facial performance duplex: phoneme (real F1/F2 articulatory classification) -> viseme weights -> real VocalMuscleResolver muscle state (viseme-blended jaw/pucker/stretch) -> real EmotionMicroSaccadeEngine gaze (20-80 Hz tremor rate scaling with emotional arousal, bounded micro amplitude, binocular divergence, 3.5 s blink, speech eyebrow tremor) -> real LuxFacialSubsurfaceOcclusion SSS (tension raises perfusion, thins scattering radius, deepens micro-fold shadows) -> real MultilingualLipsyncBridge retarget (JP14/FR18). facialPerformanceReady soak-gated on 13 invariants; facial_aaa_ready / lipsync_aaa_ready / gaze_aaa_ready / sss_aaa_ready HELD; fingerprint seed kc_facia distinct from ej/jx/ka/kb/ex/ei/ef/gw/gv/ew".to_string(),
        facial_aaa_ready: false,
        lipsync_aaa_ready: false,
        gaze_aaa_ready: false,
        sss_aaa_ready: false,
        linear_plan_only: false,
    }
}

/// Honesty probe — soak-gated `facial_performance_ready` (letter kc).
pub fn probe_facial_performance() -> FacialPerformanceSoakReport {
    run_facial_performance_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phoneme_classification_is_real_articulatory() {
        let open = SpectralAudioFrame {
            energy_db: -5.0,
            fundamental_frequency_hz: 140.0,
            formant_f1_hz: 800.0,
            formant_f2_hz: 1400.0,
            emotional_intensity: 0.9,
        };
        let rounded = SpectralAudioFrame {
            energy_db: -5.0,
            fundamental_frequency_hz: 160.0,
            formant_f1_hz: 400.0,
            formant_f2_hz: 800.0,
            emotional_intensity: 0.7,
        };
        let closed_front = SpectralAudioFrame {
            energy_db: -5.0,
            fundamental_frequency_hz: 200.0,
            formant_f1_hz: 350.0,
            formant_f2_hz: 2400.0,
            emotional_intensity: 0.5,
        };
        let silent = SpectralAudioFrame {
            energy_db: -70.0,
            fundamental_frequency_hz: 120.0,
            formant_f1_hz: 400.0,
            formant_f2_hz: 1200.0,
            emotional_intensity: 0.05,
        };
        let nan = SpectralAudioFrame {
            energy_db: -5.0,
            fundamental_frequency_hz: 140.0,
            formant_f1_hz: f32::NAN,
            formant_f2_hz: 1400.0,
            emotional_intensity: 0.9,
        };
        assert_eq!(classify_phoneme(&open), PhonemeClass::OpenVowel);
        assert_eq!(classify_phoneme(&rounded), PhonemeClass::RoundedVowel);
        assert_eq!(classify_phoneme(&closed_front), PhonemeClass::ClosedVowel);
        assert_eq!(classify_phoneme(&silent), PhonemeClass::Silence);
        // Non-finite formants fail closed to silence.
        assert_eq!(classify_phoneme(&nan), PhonemeClass::Silence);
    }

    #[test]
    fn open_vowel_opens_jaw_rounded_puckers_silence_neutral() {
        let k = FacialPerformanceKernel::default();
        let open = SpectralAudioFrame {
            energy_db: -5.0,
            fundamental_frequency_hz: 140.0,
            formant_f1_hz: 800.0,
            formant_f2_hz: 1400.0,
            emotional_intensity: 0.9,
        };
        let rounded = SpectralAudioFrame {
            energy_db: -8.0,
            fundamental_frequency_hz: 160.0,
            formant_f1_hz: 400.0,
            formant_f2_hz: 800.0,
            emotional_intensity: 0.7,
        };
        let silent = SpectralAudioFrame {
            energy_db: -70.0,
            fundamental_frequency_hz: 120.0,
            formant_f1_hz: 400.0,
            formant_f2_hz: 1200.0,
            emotional_intensity: 0.05,
        };
        let open_frame = k.step_phoneme(PhonemeClass::OpenVowel, &open, 0.1, true);
        let round_frame = k.step_phoneme(PhonemeClass::RoundedVowel, &rounded, 0.1, true);
        let silent_frame = k.step_phoneme(PhonemeClass::Silence, &silent, 0.1, false);
        assert!(open_frame.muscles.jaw_opening_factor > 0.5);
        assert!(round_frame.muscles.lip_pucker_factor > 0.5);
        assert!(silent_frame.muscles.jaw_opening_factor < 0.1);
        // The spectral entry classifies and drives the same articulation.
        let spectral_frame = k.step(&open, 0.1, true);
        assert_eq!(spectral_frame.phoneme, PhonemeClass::OpenVowel);
        assert!(spectral_frame.muscles.jaw_opening_factor > 0.5);
    }

    #[test]
    fn emotion_scales_micro_tremor_rate_in_band() {
        let r = run_facial_performance_soak();
        assert!(r.emotion_scales_saccade_tremor);
        assert!(r.tremor_in_20_80_hz_band);
        assert!(r.micro_saccade_amplitude_bounded);
        assert!(r.freq_implied_high > r.freq_implied_low);
    }

    #[test]
    fn binocular_divergence_and_blink_present() {
        let r = run_facial_performance_soak();
        assert!(r.binocular_divergence_present);
        assert!(r.binoc_divergence_max > 0.0);
        assert!(r.blink_present);
        assert!(r.blink_max > 0.0);
    }

    #[test]
    fn speech_drives_eyebrow_tremor() {
        let r = run_facial_performance_soak();
        assert!(r.speech_drives_eyebrow_tremor);
        assert!(r.eyebrow_speech > 0.05);
        assert!(r.eyebrow_silent < 1.0e-6);
    }

    #[test]
    fn muscle_tension_drives_sss() {
        let r = run_facial_performance_soak();
        assert!(r.muscle_tension_drives_sss);
        assert!(r.perfusion_tense > r.perfusion_relaxed);
        assert!(r.scatter_radius_tense < r.scatter_radius_relaxed);
        assert!(r.shadow_tense > r.shadow_relaxed);
    }

    #[test]
    fn retarget_respects_jp14_fr18() {
        let r = run_facial_performance_soak();
        assert!(r.retarget_respects_language_viseme_table);
        assert_eq!(r.viseme_jp, 14.0);
        assert_eq!(r.viseme_fr, 18.0);
        // The real substrate table also covers EN 20 and a generic fallback.
        let en = MultilingualLipsyncBridge::retarget_lip_sync("Portuguese", "English", 1.0);
        assert_eq!(en.active_viseme_count, 20);
        let other = MultilingualLipsyncBridge::retarget_lip_sync("Portuguese", "German", 1.0);
        assert_eq!(other.active_viseme_count, 16);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = probe_facial_performance();
        assert!(r.facial_performance_ready);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, FACIAL_PERFORMANCE_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert_eq!(r.letter, "kc");
        // Honesty: every AAA vector stays fail-closed.
        assert!(!r.facial_aaa_ready);
        assert!(!r.lipsync_aaa_ready);
        assert!(!r.gaze_aaa_ready);
        assert!(!r.sss_aaa_ready);
        assert!(!r.linear_plan_only);
    }

    #[test]
    fn soak_is_deterministic_and_distinct() {
        let a = run_facial_performance_soak();
        let b = run_facial_performance_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, 0);

        // Distinct evidence_kind + fingerprint from every coupled / prior peer.
        let ej = crate::fm_additive_synthesis::probe_fm_additive_synthesis();
        let jx = crate::metasounds_dsp_compiler::probe_metasounds_dsp();
        let ka = crate::acoustic_raytracing_solver::probe_acoustic_raytracing_solver();
        let kb = crate::sound_physics_duplex::probe_sound_physics_duplex();
        let ex = crate::sdf_audio_raymarching::probe_sdf_audio_raymarching();
        let ei = crate::acoustic_reverb_geometry::probe_acoustic_reverb_geometry();
        let ef = crate::acoustic_raytracing_echo::probe_acoustic_raytracing_echo();
        let gw = crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver();
        let gv = crate::aerodynamic_navier_stokes::probe_aerodynamic_navier_stokes();
        let ew = crate::volumetric_extinction_medium::probe_volumetric_extinction_medium();

        // Each peer has its own report struct type, so assert per-peer.
        assert_ne!(a.evidence_kind, ej.evidence_kind);
        assert_ne!(a.evidence_kind, jx.evidence_kind);
        assert_ne!(a.evidence_kind, ka.evidence_kind);
        assert_ne!(a.evidence_kind, kb.evidence_kind);
        assert_ne!(a.evidence_kind, ex.evidence_kind);
        assert_ne!(a.evidence_kind, ei.evidence_kind);
        assert_ne!(a.evidence_kind, ef.evidence_kind);
        assert_ne!(a.evidence_kind, gw.evidence_kind);
        assert_ne!(a.evidence_kind, gv.evidence_kind);
        assert_ne!(a.evidence_kind, ew.evidence_kind);

        assert_ne!(a.evidence_fingerprint, ej.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, jx.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ka.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, kb.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ex.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ei.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ef.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gw.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gv.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ew.evidence_fingerprint);
    }
}

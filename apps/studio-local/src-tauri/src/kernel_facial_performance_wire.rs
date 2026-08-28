//! Facial Performance desktop wire — letter **kc**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::facial_performance`
//! (AV/Render supremacy audit claim 1 — character facial performance): a
//! spectral frame is classified into a real articulatory phoneme (F1/F2
//! formant geometry), mapped to viseme weights, then blended through the real
//! [`VocalMuscleResolver`] muscle state (jaw / pucker / stretch / platysma /
//! pupil). The same emotion drives the real
//! [`EmotionMicroSaccadeEngine`] organic gaze chain (20-80 Hz micro-tremor rate
//! scaling, bounded micro amplitude, binocular divergence, 3.5 s blink cycle,
//! speech-driven eyebrow tremor) and the real [`LuxFacialSubsurfaceOcclusion`]
//! spectral skin SSS (tension raises perfusion, thins scattering radius,
//! deepens micro-fold shadows). The retarget channel runs through the real
//! [`MultilingualLipsyncBridge`] table (JP 14 / FR 18 visemes). Honesty probe
//! `facialPerformanceReady` is **distinct** from ej `fmAdditiveSynthesisReady`,
//! jx `metasoundsDspReady`, ka `acousticRaytracingSolverReady`, kb
//! `soundPhysicsDuplexReady`, ex `sdfAudioRaymarchingReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, gw/gv fluid
//! probes, and ew `volumetricExtinctionMediumReady`. Full MetaHuman-class
//! facial AAA (production lip-sync / gaze / subsurface) HELD.
//!
//! Substrate note (2026-08-14kc): the delivered micro-tremor previously
//! oscillated at `f/(2π)` ≈ 4.8-7.6 Hz while `emotion_micro_saccade_engine`'s
//! own contract documented 20-80 Hz — a missing `2π` physical unit-error in the
//! phase term. Corrected with `TAU` so the real delivered tremor genuinely sits
//! in the 20-80 Hz band; all other substrate code is untouched.

use aethel_kernel_rust::facial_performance::{
    probe_facial_performance as kernel_probe, run_facial_performance_soak,
    FacialPerformanceSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFacialPerformanceWireReport {
    pub facial_performance_ready: bool,
    pub phoneme_classification_real: bool,
    pub open_vowel_opens_jaw: bool,
    pub rounded_vowel_puckers_lips: bool,
    pub silence_fails_closed_to_neutral: bool,
    pub emotion_scales_saccade_tremor: bool,
    pub tremor_in_20_80_hz_band: bool,
    pub micro_saccade_amplitude_bounded: bool,
    pub binocular_divergence_present: bool,
    pub blink_present: bool,
    pub speech_drives_eyebrow_tremor: bool,
    pub muscle_tension_drives_sss: bool,
    pub retarget_respects_language_viseme_table: bool,
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
    pub facial_aaa_ready: bool,
    pub lipsync_aaa_ready: bool,
    pub gaze_aaa_ready: bool,
    pub sss_aaa_ready: bool,
    pub linear_plan_only: bool,
}

fn to_report(
    r: FacialPerformanceSoakReport,
    note: impl Into<String>,
) -> KernelFacialPerformanceWireReport {
    KernelFacialPerformanceWireReport {
        facial_performance_ready: r.facial_performance_ready,
        phoneme_classification_real: r.phoneme_classification_real,
        open_vowel_opens_jaw: r.open_vowel_opens_jaw,
        rounded_vowel_puckers_lips: r.rounded_vowel_puckers_lips,
        silence_fails_closed_to_neutral: r.silence_fails_closed_to_neutral,
        emotion_scales_saccade_tremor: r.emotion_scales_saccade_tremor,
        tremor_in_20_80_hz_band: r.tremor_in_20_80_hz_band,
        micro_saccade_amplitude_bounded: r.micro_saccade_amplitude_bounded,
        binocular_divergence_present: r.binocular_divergence_present,
        blink_present: r.blink_present,
        speech_drives_eyebrow_tremor: r.speech_drives_eyebrow_tremor,
        muscle_tension_drives_sss: r.muscle_tension_drives_sss,
        retarget_respects_language_viseme_table: r.retarget_respects_language_viseme_table,
        outputs_finite: r.outputs_finite,
        jaw_open_high: r.jaw_open_high,
        jaw_open_silence: r.jaw_open_silence,
        lip_pucker_high: r.lip_pucker_high,
        tremor_slope_high: r.tremor_slope_high,
        tremor_slope_low: r.tremor_slope_low,
        freq_implied_high: r.freq_implied_high,
        freq_implied_low: r.freq_implied_low,
        saccade_amp_high: r.saccade_amp_high,
        saccade_amp_low: r.saccade_amp_low,
        binoc_divergence_max: r.binoc_divergence_max,
        blink_max: r.blink_max,
        eyebrow_speech: r.eyebrow_speech,
        eyebrow_silent: r.eyebrow_silent,
        perfusion_tense: r.perfusion_tense,
        perfusion_relaxed: r.perfusion_relaxed,
        scatter_radius_tense: r.scatter_radius_tense,
        scatter_radius_relaxed: r.scatter_radius_relaxed,
        shadow_tense: r.shadow_tense,
        shadow_relaxed: r.shadow_relaxed,
        viseme_jp: r.viseme_jp,
        viseme_fr: r.viseme_fr,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        letter: r.letter,
        note: note.into(),
        facial_aaa_ready: r.facial_aaa_ready,
        lipsync_aaa_ready: r.lipsync_aaa_ready,
        gaze_aaa_ready: r.gaze_aaa_ready,
        sss_aaa_ready: r.sss_aaa_ready,
        linear_plan_only: r.linear_plan_only,
    }
}

/// Run facial-performance soak via kernel.
pub fn run_kernel_facial_performance_soak() -> KernelFacialPerformanceWireReport {
    let r = run_facial_performance_soak();
    let note = if !r.facial_performance_ready {
        "Facial-performance soak failed — facialPerformanceReady stays false"
    } else {
        "Desktop soak: spectral frame -> real articulatory phoneme (F1/F2 formant geometry, open/rounded/silence) -> viseme weights -> real VocalMuscleResolver muscle state (viseme-blended jaw/pucker/stretch, silence fails closed to neutral) -> real EmotionMicroSaccadeEngine organic gaze (emotional arousal scales the micro-tremor rate: implied ~48 Hz high vs ~30 Hz low, both inside the 20-80 Hz band after the 2026-08-14kc TAU unit correction; bounded micro amplitude, binocular divergence, 3.5 s blink cycle, speech-driven eyebrow tremor vs silence suppression) -> real LuxFacialSubsurfaceOcclusion spectral skin SSS (tension raises perfusion, thins scattering radius, deepens micro-fold shadows) -> real MultilingualLipsyncBridge retarget (JP 14 / FR 18 viseme tables) — facialPerformanceReady true, soak-gated on 13 invariants; facial_aaa_ready / lipsync_aaa_ready / gaze_aaa_ready / sss_aaa_ready false (HELD); fingerprint seed kc_facia distinct from ej fmAdditiveSynthesisReady, jx metasoundsDspReady, ka acousticRaytracingSolverReady, kb soundPhysicsDuplexReady, ex sdfAudioRaymarchingReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, gw/gv fluid, and ew volumetricExtinctionMediumReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `facialPerformanceReady` (letter kc).
pub fn probe_facial_performance() -> KernelFacialPerformanceWireReport {
    to_report(
        kernel_probe(),
        "Facial-performance probe (letter kc) — distinct from fmAdditiveSynthesisReady, metasoundsDspReady, acousticRaytracingSolverReady, soundPhysicsDuplexReady, sdfAudioRaymarchingReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, latticeBoltzmann fluid / aerodynamic Navier-Stokes probes, and volumetricExtinctionMediumReady; facial_aaa_ready / lipsync_aaa_ready / gaze_aaa_ready / sss_aaa_ready HELD",
    )
}

/// Tauri IPC — facial-performance honesty.
#[tauri::command]
pub fn probe_facial_performance_cmd() -> KernelFacialPerformanceWireReport {
    probe_facial_performance()
}

/// Tauri IPC — run facial-performance soak.
#[tauri::command]
pub fn run_kernel_facial_performance_soak_cmd() -> KernelFacialPerformanceWireReport {
    run_kernel_facial_performance_soak()
}

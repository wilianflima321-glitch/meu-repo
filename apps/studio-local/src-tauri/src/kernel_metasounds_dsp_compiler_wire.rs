//! MetaSounds DSP Graph Compiler desktop wire — letter **jx**.
//!
//! Thin studio-local IPC over
//! `aethel_kernel_rust::metasounds_dsp_compiler` (naive poly-BLEP oscillators,
//! RBJ biquads, modal rings, granular clouds, FFT convolution, Kelly–Lochbaum
//! vocal tract, Lighthill aero-acoustics, JSON graph VM). Honesty probe
//! `metasoundsDspReady` is **distinct** from ei `acousticReverbGeometryReady`,
//! ef `acousticRaytracingEchoReady`, ka `acousticRaytracingSolverReady`,
//! ex `sdfAudioRaymarchingReady`, ej `fmAdditiveSynthesisReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen probes,
//! and dc–dm foundation probes.
//! Full MetaSounds AAA / HRTF AAA / AVX512 / neural upscale HELD.

use aethel_kernel_rust::metasounds_dsp_compiler::{
    probe_metasounds_dsp as kernel_probe, run_metasounds_dsp_soak, MetasoundsDspSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMetasoundsDspCompilerWireReport {
    pub metasounds_dsp_ready: bool,
    pub oscillator_measured_freq_hz: f32,
    pub biquad_stopband_db: f32,
    pub modal_ring_ratio: f32,
    pub granular_rms: f32,
    pub granular_density_ratio: f32,
    pub convolution_impulse_err: f32,
    pub vocal_tract_formant_shift_hz: f32,
    pub aero_lighthill_low: f32,
    pub aero_lighthill_high: f32,
    pub json_graph_rms: f32,
    pub json_graph_deterministic: bool,
    pub simd_fft_ready: bool,
    pub simd_match_max_err: f32,
    pub bounce_wav_valid: bool,
    pub bounce_deterministic: bool,
    pub baked_rms: f32,
    pub sidechain_ducking_db: f32,
    pub hybrid_baked_sounds: usize,
    pub hybrid_live_sounds: usize,
    pub treasury_1ms_samples: usize,
    pub hybrid_export_ready: bool,
    pub baking_aaa_ready: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    pub metasounds_aaa_ready: bool,
    pub hrtf_aaa_ready: bool,
    pub avx512_kernel_ready: bool,
    pub neural_upscale_aaa_ready: bool,
    pub linear_plan_only: bool,
}

fn to_report(
    r: MetasoundsDspSoakReport,
    note: impl Into<String>,
) -> KernelMetasoundsDspCompilerWireReport {
    KernelMetasoundsDspCompilerWireReport {
        metasounds_dsp_ready: r.metasounds_dsp_ready,
        oscillator_measured_freq_hz: r.oscillator_measured_freq_hz,
        biquad_stopband_db: r.biquad_stopband_db,
        modal_ring_ratio: r.modal_ring_ratio,
        granular_rms: r.granular_rms,
        granular_density_ratio: r.granular_density_ratio,
        convolution_impulse_err: r.convolution_impulse_err,
        vocal_tract_formant_shift_hz: r.vocal_tract_formant_shift_hz,
        aero_lighthill_low: r.aero_lighthill_low,
        aero_lighthill_high: r.aero_lighthill_high,
        json_graph_rms: r.json_graph_rms,
        json_graph_deterministic: r.json_graph_deterministic,
        simd_fft_ready: r.simd_fft_ready,
        simd_match_max_err: r.simd_match_max_err,
        bounce_wav_valid: r.bounce_wav_valid,
        bounce_deterministic: r.bounce_deterministic,
        baked_rms: r.baked_rms,
        sidechain_ducking_db: r.sidechain_ducking_db,
        hybrid_baked_sounds: r.hybrid_baked_sounds,
        hybrid_live_sounds: r.hybrid_live_sounds,
        treasury_1ms_samples: r.treasury_1ms_samples,
        hybrid_export_ready: r.hybrid_export_ready,
        baking_aaa_ready: r.baking_aaa_ready,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        letter: r.letter,
        note: note.into(),
        metasounds_aaa_ready: r.metasounds_aaa_ready,
        hrtf_aaa_ready: r.hrtf_aaa_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        neural_upscale_aaa_ready: r.neural_upscale_aaa_ready,
        linear_plan_only: r.linear_plan_only,
    }
}

/// Run MetaSounds DSP graph compiler soak via kernel.
pub fn run_kernel_metasounds_dsp_compiler_soak() -> KernelMetasoundsDspCompilerWireReport {
    let r = run_metasounds_dsp_soak();
    let note = if !r.metasounds_dsp_ready {
        "MetaSounds DSP graph compiler soak failed — metasoundsDspReady stays false"
    } else {
        "Desktop soak: 48 kHz DSP graph VM — sine/poly-BLEP oscillators (440 Hz measured), RBJ biquads (1 kHz lowpass stopband), modal rings, granular clouds (density-driven RMS), FFT convolution (impulse-reconstruction), Kelly–Lochbaum vocal tract (formant shift), Lighthill aero-acoustics (velocity-scaled source strength), JSON graph compile (bit-exact deterministic) — metasoundsDspReady true; FASE 1 Hybrid Export: SSE2 SIMD FFT (SIMD==scalar within 1e-3 + inverse round-trip), Bouncer bounce_to_disk (parseable 16-bit PCM .wav, bit-exact determinism), 3-mode Hybrid Export plan (baked 2 / live 2), sidechain auto-ducking (music crushed on voice), Treasury 1 ms granular seed (slot count >= 48) — hybridExportReady true; metasounds_aaa_ready / hrtf_aaa_ready / avx512_kernel_ready / neural_upscale_aaa_ready / baking_aaa_ready false (HELD); distinct from ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, ka acousticRaytracingSolverReady, ex sdfAudioRaymarchingReady, and ej fmAdditiveSynthesisReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `metasoundsDspReady` (letter jx).
pub fn probe_metasounds_dsp() -> KernelMetasoundsDspCompilerWireReport {
    to_report(
        kernel_probe(),
        "MetaSounds DSP graph compiler probe (letter jx) — distinct from acousticReverbGeometryReady, acousticRaytracingEchoReady, acousticRaytracingSolverReady, sdfAudioRaymarchingReady, fmAdditiveSynthesisReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, and all d*–g* foundation / deepen probes; metasounds_aaa_ready / hrtf_aaa_ready / avx512_kernel_ready / neural_upscale_aaa_ready HELD",
    )
}

/// Tauri IPC — MetaSounds DSP graph compiler honesty.
#[tauri::command]
pub fn probe_metasounds_dsp_cmd() -> KernelMetasoundsDspCompilerWireReport {
    probe_metasounds_dsp()
}

/// Tauri IPC — run MetaSounds DSP graph compiler soak.
#[tauri::command]
pub fn run_kernel_metasounds_dsp_compiler_soak_cmd() -> KernelMetasoundsDspCompilerWireReport {
    run_kernel_metasounds_dsp_compiler_soak()
}

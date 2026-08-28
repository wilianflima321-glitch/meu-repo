//! Acoustic Raytracing Solver desktop wire — letter **ka**.
//!
//! Thin studio-local IPC over
//! `aethel_kernel_rust::acoustic_raytracing_solver` (published octave-band
//! absorption → per-band transmission; fixed-step sonic raycast vs the live
//! WorldSoA; Huygens knife-edge diffraction; dynamic bounded IR swap composing
//! ei room RT60 + ef specular echo tap + material one-pole coloration; voice
//! virtualization — Founder "Densidade Sonora" / Wwise–FMOD voice-limit
//! parity). Honesty probe `acousticRaytracingSolverReady` is **distinct** from
//! ei `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`,
//! ex `sdfAudioRaymarchingReady`, jx `metasoundsDspReady`, ej
//! `fmAdditiveSynthesisReady`, eh `finiteElementAnalysisReady`, ee–ea fluid/PBD
//! probes, dz–dq deepen probes, and dc–dm foundation probes.
//! Full MetaSounds AAA / HRTF AAA / AVX512 / neural upscale HELD.

use aethel_kernel_rust::acoustic_raytracing_solver::{
    probe_acoustic_raytracing_solver as kernel_probe, run_acoustic_raytracing_solver_soak,
    AcousticRaytracingSolverSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAcousticRaytracingSolverWireReport {
    pub acoustic_raytracing_solver_ready: bool,
    pub material_distinct: bool,
    pub occlusion_lowers_band_power: bool,
    pub diffraction_visible: bool,
    pub ir_swap_changes_generation: bool,
    pub ir_length_bounded: bool,
    pub ir_tail_coloration_visible: bool,
    pub echo_tap_at_delay: bool,
    pub voice_budget_virtualizes: bool,
    pub ir_deterministic: bool,
    pub direct_path_m: f32,
    pub rt60_sec: f32,
    pub steel_hf: f32,
    pub carpet_hf: f32,
    pub rendered: usize,
    pub virtualized: usize,
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
    r: AcousticRaytracingSolverSoakReport,
    note: impl Into<String>,
) -> KernelAcousticRaytracingSolverWireReport {
    KernelAcousticRaytracingSolverWireReport {
        acoustic_raytracing_solver_ready: r.acoustic_raytracing_solver_ready,
        material_distinct: r.material_distinct,
        occlusion_lowers_band_power: r.occlusion_lowers_band_power,
        diffraction_visible: r.diffraction_visible,
        ir_swap_changes_generation: r.ir_swap_changes_generation,
        ir_length_bounded: r.ir_length_bounded,
        ir_tail_coloration_visible: r.ir_tail_coloration_visible,
        echo_tap_at_delay: r.echo_tap_at_delay,
        voice_budget_virtualizes: r.voice_budget_virtualizes,
        ir_deterministic: r.ir_deterministic,
        direct_path_m: r.direct_path_m,
        rt60_sec: r.rt60_sec,
        steel_hf: r.steel_hf,
        carpet_hf: r.carpet_hf,
        rendered: r.rendered,
        virtualized: r.virtualized,
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

/// Run acoustic raytracing solver soak via kernel.
pub fn run_kernel_acoustic_raytracing_solver_soak() -> KernelAcousticRaytracingSolverWireReport {
    let r = run_acoustic_raytracing_solver_soak();
    let note = if !r.acoustic_raytracing_solver_ready {
        "Acoustic raytracing solver soak failed — acousticRaytracingSolverReady stays false"
    } else {
        "Desktop soak: 48 kHz acoustic raytracing solver — published octave-band absorption (Concrete/Glass/Wood/Carpet/Steel) → per-band t=(1−α)^layers; fixed-step sonic raycast vs the live WorldSoA (radius from scale) → occlusion / HF-rolloff obstruction (Wwise/FMOD parity); Huygens knife-edge diffraction (√(d_direct/d_diff)·0.5); dynamic IR swap composing estimate_room_reverb RT60 tail + propagate_sound_waves specular tap + deterministic LCG with material one-pole coloration + edge tap into a bounded bit-exact IR; carpet darkens the tail (steel_hf > carpet_hf·1.5); voice virtualization renders nearest 3 of 11 active, tracks 8 silent virtual (Founder Densidade Sonora — Hollywood rule) — acousticRaytracingSolverReady true; metasounds_aaa_ready / hrtf_aaa_ready / avx512_kernel_ready / neural_upscale_aaa_ready false (HELD); distinct from ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, ex sdfAudioRaymarchingReady, and jx metasoundsDspReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `acousticRaytracingSolverReady` (letter ka).
pub fn probe_acoustic_raytracing_solver() -> KernelAcousticRaytracingSolverWireReport {
    to_report(
        kernel_probe(),
        "Acoustic raytracing solver probe (letter ka) — distinct from acousticReverbGeometryReady, acousticRaytracingEchoReady, sdfAudioRaymarchingReady, metasoundsDspReady, fmAdditiveSynthesisReady, finiteElementAnalysisReady, and all d*–g* foundation / deepen probes; metasounds_aaa_ready / hrtf_aaa_ready / avx512_kernel_ready / neural_upscale_aaa_ready HELD",
    )
}

/// Tauri IPC — acoustic raytracing solver honesty.
#[tauri::command]
pub fn probe_acoustic_raytracing_solver_cmd() -> KernelAcousticRaytracingSolverWireReport {
    probe_acoustic_raytracing_solver()
}

/// Tauri IPC — run acoustic raytracing solver soak.
#[tauri::command]
pub fn run_kernel_acoustic_raytracing_solver_soak_cmd(
) -> KernelAcousticRaytracingSolverWireReport {
    run_kernel_acoustic_raytracing_solver_soak()
}

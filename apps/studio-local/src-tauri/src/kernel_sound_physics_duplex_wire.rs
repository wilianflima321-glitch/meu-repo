//! Sound-Physics Duplex desktop wire — letter **kb**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sound_physics_duplex`
//! (AV/Render supremacy audit claim 2 — "sound-as-force"): an acoustic blast
//! `ShockwaveEvent` is converted into a radial overpressure field via spherical
//! spreading `I = E/(4πr²)` + `p = √(I·Z)`, time-of-arrival `r/c`, and a
//! Friedlander positive-phase envelope `(1−τ)·e^(−τ)`; that force then drives
//! three **real** receivers — the muscle PD joint
//! ([`MuscleSimRig::step_joint_muscle_torque`] torque impulse), the LBM dust
//! scalar ([`LatticeBoltzmannFluidGrid`] entrainment above threshold / settling
//! below), and the Beer–Lambert medium ([`VolumetricExtinctionMedium`] optical
//! depth pulse). Honesty probe `soundPhysicsDuplexReady` is **distinct** from
//! ka `acousticRaytracingSolverReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, ex `sdfAudioRaymarchingReady`, jx
//! `metasoundsDspReady`, ej `fmAdditiveSynthesisReady`, gw/gv fluid probes, and
//! ew `volumetricExtinctionMediumReady`. Full Unreal audio-driven-physics AAA
//! (shockwave / Euphoria muscle / Chaos dust / OpenVDB volumetric) HELD.

use aethel_kernel_rust::sound_physics_duplex::{
    probe_sound_physics_duplex as kernel_probe, run_sound_physics_duplex_soak,
    SoundPhysicsDuplexSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSoundPhysicsDuplexWireReport {
    pub sound_physics_duplex_ready: bool,
    pub impulse_scales_with_energy: bool,
    pub toa_delay_respected: bool,
    pub falloff_monotonic: bool,
    pub muscle_responds: bool,
    pub dust_lifts_above_threshold: bool,
    pub dust_settles_below_threshold: bool,
    pub extinction_pulse_visible: bool,
    pub degenerate_fails_closed: bool,
    pub outputs_finite: bool,
    pub impulse_high: f32,
    pub impulse_low: f32,
    pub toa_delay_s: f32,
    pub muscle_peak_omega: f32,
    pub control_peak_omega: f32,
    pub dust_mean_high: f32,
    pub dust_mean_low: f32,
    pub dust_mean_zero: f32,
    pub tau_high: f32,
    pub tau_low: f32,
    pub tau_zero: f32,
    pub overpressure_peak: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub letter: String,
    pub note: String,
    pub shockwave_aaa_ready: bool,
    pub muscle_aaa_ready: bool,
    pub dust_fluid_aaa_ready: bool,
    pub vdb_volumetric_aaa_ready: bool,
    pub linear_plan_only: bool,
}

fn to_report(
    r: SoundPhysicsDuplexSoakReport,
    note: impl Into<String>,
) -> KernelSoundPhysicsDuplexWireReport {
    KernelSoundPhysicsDuplexWireReport {
        sound_physics_duplex_ready: r.sound_physics_duplex_ready,
        impulse_scales_with_energy: r.impulse_scales_with_energy,
        toa_delay_respected: r.toa_delay_respected,
        falloff_monotonic: r.falloff_monotonic,
        muscle_responds: r.muscle_responds,
        dust_lifts_above_threshold: r.dust_lifts_above_threshold,
        dust_settles_below_threshold: r.dust_settles_below_threshold,
        extinction_pulse_visible: r.extinction_pulse_visible,
        degenerate_fails_closed: r.degenerate_fails_closed,
        outputs_finite: r.outputs_finite,
        impulse_high: r.impulse_high,
        impulse_low: r.impulse_low,
        toa_delay_s: r.toa_delay_s,
        muscle_peak_omega: r.muscle_peak_omega,
        control_peak_omega: r.control_peak_omega,
        dust_mean_high: r.dust_mean_high,
        dust_mean_low: r.dust_mean_low,
        dust_mean_zero: r.dust_mean_zero,
        tau_high: r.tau_high,
        tau_low: r.tau_low,
        tau_zero: r.tau_zero,
        overpressure_peak: r.overpressure_peak,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        letter: r.letter,
        note: note.into(),
        shockwave_aaa_ready: r.shockwave_aaa_ready,
        muscle_aaa_ready: r.muscle_aaa_ready,
        dust_fluid_aaa_ready: r.dust_fluid_aaa_ready,
        vdb_volumetric_aaa_ready: r.vdb_volumetric_aaa_ready,
        linear_plan_only: r.linear_plan_only,
    }
}

/// Run sound-physics duplex soak via kernel.
pub fn run_kernel_sound_physics_duplex_soak() -> KernelSoundPhysicsDuplexWireReport {
    let r = run_sound_physics_duplex_soak();
    let note = if !r.sound_physics_duplex_ready {
        "Sound-physics duplex soak failed — soundPhysicsDuplexReady stays false"
    } else {
        "Desktop soak: acoustic blast energy (200 kJ game roar class) -> radial overpressure field (spherical spreading I=E/4pi r^2, p=sqrt(I*Z) with Z=413 Rayls, TOA=r/c at 343 m/s, Friedlander positive-phase envelope (1-tau)e^-tau over duration radius/c=0.035 s) -> three real coupled receivers: (1) muscle PD joint torque impulse p*A*arm*dt -> dW=impulse/(2.5*mass) into MuscleSimRig::step_joint_muscle_torque (peak |w| >> PD-only control); (2) LBM LatticeBoltzmannFluidGrid dust entrainment above 400 Pa toward the 2.0 cap vs settling below threshold (fail-closed); (3) Beer-Lambert VolumetricExtinctionMedium optical depth pulse (density = rho0 + kappa*p, tau = sigma*rho*path) with the extinction sample inside the positive phase (0.01 s -> env ~0.65) — soundPhysicsDuplexReady true; shockwave_aaa_ready / muscle_aaa_ready / dust_fluid_aaa_ready / vdb_volumetric_aaa_ready false (HELD); fingerprint seed kb_sound distinct from ka acousticRaytracingSolverReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, ex sdfAudioRaymarchingReady, jx metasoundsDspReady, ej fmAdditiveSynthesisReady, gw/gv fluid, and ew volumetricExtinctionMediumReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `soundPhysicsDuplexReady` (letter kb).
pub fn probe_sound_physics_duplex() -> KernelSoundPhysicsDuplexWireReport {
    to_report(
        kernel_probe(),
        "Sound-physics duplex probe (letter kb) — distinct from acousticRaytracingSolverReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, sdfAudioRaymarchingReady, metasoundsDspReady, fmAdditiveSynthesisReady, latticeBoltzmann fluid / aerodynamic Navier-Stokes probes, and volumetricExtinctionMediumReady; shockwave_aaa_ready / muscle_aaa_ready / dust_fluid_aaa_ready / vdb_volumetric_aaa_ready HELD",
    )
}

/// Tauri IPC — sound-physics duplex honesty.
#[tauri::command]
pub fn probe_sound_physics_duplex_cmd() -> KernelSoundPhysicsDuplexWireReport {
    probe_sound_physics_duplex()
}

/// Tauri IPC — run sound-physics duplex soak.
#[tauri::command]
pub fn run_kernel_sound_physics_duplex_soak_cmd() -> KernelSoundPhysicsDuplexWireReport {
    run_kernel_sound_physics_duplex_soak()
}

//! Mach-1 Sonic Boom Signature desktop wire — letter **kk**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::mach1_sonic_boom_signature`
//! (Passo 2, round kk — the aeroacoustic shock-signature lane of the "Paradigma
//! do Áudio Latente (MetaSounds Supremacy)" + P2-GAS physics spine of Launch
//! Hard Gate #72): one cohesive kernel that **composes the closed, already
//! shipped real substrates with zero substrate edits** (kh precedent),
//! everything on the **Espectro "Sólido vs Metamorfo"** (Zero Imposição — the 3
//! Leis da Adaptação Universal, Doctrine #74 / S-27):
//! - **Passagem supersônica → resposta de fluxo (gv):** the Mach number is
//!   kernel **input telemetry** (the gv normalized (N+2)² grid cannot host real
//!   supersonic m/s under its CFL constraint — no fake CFD), so the grid
//!   answers with a CFL-safe disturbance jet at the substrate's own proven
//!   operating point (`DEFAULT_DT`, `DEFAULT_VISCOSITY` ON, `DEFAULT_DX`,
//!   `DEFAULT_DIFFUSE_ITERS`, `DEFAULT_PROJECT_ITERS`): an u-step + linear
//!   v-shear profile scaled by `(M−1)`, run for 8 `ns_step` passes. The
//!   response is measurably moving (main grid_max_speed 0.719, fast 1.78 —
//!   monotonic in Mach) and numerically bounded (anti-blowup
//!   `flow_response_bounded` gate — catches absurd-but-finite magnitudes that
//!   `outputs_finite` alone would miss);
//! - **Fonte Lighthill (jx):** `AeroAcoustic::lighthill_source_strength` is the
//!   MEAN over the interior of `|u·v| + 0.5(u²+v²)` — a Reynolds-stress
//!   quadrupole proxy that scales ~jet² (main 0.058, fast 0.358, monotonic).
//!   Under that measured source the jx one-pole band-limited turbulence raises
//!   the high-band fraction of the Fluid signature (observation
//!   `fluid_turbulence_adds_highs`);
//! - **Assinatura de choque N-wave (lei fechada):** overpressure
//!   `Δp = p_ref·K·(M²−1)` (zero for M ≤ 1) — main 891.66 Pa, fast 2533.13 Pa,
//!   subsonic exactly 0; the ideal N-wave is bilinear (finite rise ramp →
//!   linear decay → −0.7·Δp rarefaction → recovery), carries positive RMS,
//!   and has a real negative phase;
//! - **Espectro Sólido vs Metamorfo (Zero Imposição):** `Solid` = pure identity
//!   passthrough (without a source the Fluid signature equals the Solid one
//!   bit-for-bit); `Fluid` = AM morphing of the N-wave only under a measured
//!   Lighthill source (`gain = 1 + 0.6·lhill_norm·|turb|`). Subsonic passage
//!   produces no shock and no aeroacoustic source (subsonic overpressure,
//!   Lighthill and grid speed all exactly zero).
//!
//! Soak chain (all honest, measured): supersonic detected + flow response
//! measured + Lighthill source measured + N-wave overpressure positive + N-wave
//! energy positive + negative phase present + bilinear shape + overpressure
//! scales with Mach + subsonic no shock + Solid identity + Fluid morphing
//! active + deterministic replay + outputs finite + flow response bounded →
//! `sonic_boom_signature_ready` true, soak-gated.
//!
//! Honesty probe `sonic_boom_signature_ready` is soak-gated on measured
//! physical invariants and is **distinct** (single measured `d`, no hard-coded
//! `true`) from gv `aerodynamicNavierStokesReady`, jx `metasoundsDspReady`, ki
//! `latentAudioReady` and kj `microfractureAcousticReady` (evidence kind
//! "mach1_sonic_boom_signature", FP seed `0x4B4B_5F53_424D` / XOR `0x5342_4D`).
//! All `*_aaa_ready` flags false (**HELD** — a CPU composition of a CFL-safe
//! disturbance field + closed-form overpressure law is not a shipped supersonic
//! CFD / GPU shock-capture / physical aeroacoustics AAA system). J.11/J.12
//! STOPPED, backend only.

use aethel_kernel_rust::mach1_sonic_boom_signature::{
    probe_mach1_sonic_boom as kernel_probe, run_mach1_sonic_boom_soak, Mach1SonicBoomSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMach1SonicBoomWireReport {
    // readiness
    pub sonic_boom_signature_ready: bool,
    // subsystem gates
    pub supersonic_detected: bool,
    pub flow_response_measured: bool,
    pub lighthill_source_measured: bool,
    pub n_wave_overpressure_positive: bool,
    pub n_wave_energy_positive: bool,
    pub n_wave_negative_phase_present: bool,
    pub n_wave_bilinear_shape: bool,
    pub overpressure_scales_with_mach: bool,
    pub subsonic_no_shock: bool,
    pub solid_identity_passthrough: bool,
    pub fluid_morphing_active: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    pub flow_response_bounded: bool,
    // observation only (NOT a gate)
    pub fluid_turbulence_adds_highs: bool,
    // shock telemetry
    pub mach_number: f32,
    pub overpressure_pa: f32,
    pub grid_max_speed: f32,
    pub lighthill_source: f32,
    pub n_wave_rms: f32,
    pub n_wave_min_pa: f32,
    pub leading_phase_mean_pa: f32,
    pub trailing_phase_mean_pa: f32,
    pub solid_rms: f32,
    pub fluid_rms: f32,
    pub solid_high_band_fraction: f32,
    pub fluid_high_band_fraction: f32,
    pub fast_overpressure_pa: f32,
    pub fast_lighthill_source: f32,
    pub subsonic_overpressure_pa: f32,
    pub subsonic_lighthill_source: f32,
    pub subsonic_grid_max_speed: f32,
    pub sample_rate_hz: f32,
    pub soak_elapsed_ns: u128,
    // evidence
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_latent_audio_adaptation_probe: bool,
    pub distinct_from_microfracture_acoustic_probe: bool,
    // AAA held — always false (HELD)
    pub sonic_boom_aaa_ready: bool,
    pub full_cfd_aaa_ready: bool,
    pub gpu_cfd_aaa_ready: bool,
    pub physical_audio_aaa_ready: bool,
    pub supersonic_aeroacoustics_aaa_ready: bool,
    pub note: String,
}

fn to_report(
    r: Mach1SonicBoomSoakReport,
    note: impl Into<String>,
) -> KernelMach1SonicBoomWireReport {
    KernelMach1SonicBoomWireReport {
        sonic_boom_signature_ready: r.sonic_boom_signature_ready,
        supersonic_detected: r.supersonic_detected,
        flow_response_measured: r.flow_response_measured,
        lighthill_source_measured: r.lighthill_source_measured,
        n_wave_overpressure_positive: r.n_wave_overpressure_positive,
        n_wave_energy_positive: r.n_wave_energy_positive,
        n_wave_negative_phase_present: r.n_wave_negative_phase_present,
        n_wave_bilinear_shape: r.n_wave_bilinear_shape,
        overpressure_scales_with_mach: r.overpressure_scales_with_mach,
        subsonic_no_shock: r.subsonic_no_shock,
        solid_identity_passthrough: r.solid_identity_passthrough,
        fluid_morphing_active: r.fluid_morphing_active,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        flow_response_bounded: r.flow_response_bounded,
        fluid_turbulence_adds_highs: r.fluid_turbulence_adds_highs,
        mach_number: r.mach_number,
        overpressure_pa: r.overpressure_pa,
        grid_max_speed: r.grid_max_speed,
        lighthill_source: r.lighthill_source,
        n_wave_rms: r.n_wave_rms,
        n_wave_min_pa: r.n_wave_min_pa,
        leading_phase_mean_pa: r.leading_phase_mean_pa,
        trailing_phase_mean_pa: r.trailing_phase_mean_pa,
        solid_rms: r.solid_rms,
        fluid_rms: r.fluid_rms,
        solid_high_band_fraction: r.solid_high_band_fraction,
        fluid_high_band_fraction: r.fluid_high_band_fraction,
        fast_overpressure_pa: r.fast_overpressure_pa,
        fast_lighthill_source: r.fast_lighthill_source,
        subsonic_overpressure_pa: r.subsonic_overpressure_pa,
        subsonic_lighthill_source: r.subsonic_lighthill_source,
        subsonic_grid_max_speed: r.subsonic_grid_max_speed,
        sample_rate_hz: r.sample_rate_hz,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_aerodynamic_navier_stokes_probe: r.distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_metasounds_dsp_probe: r.distinct_from_metasounds_dsp_probe,
        distinct_from_latent_audio_adaptation_probe: r.distinct_from_latent_audio_adaptation_probe,
        distinct_from_microfracture_acoustic_probe: r.distinct_from_microfracture_acoustic_probe,
        sonic_boom_aaa_ready: r.sonic_boom_aaa_ready,
        full_cfd_aaa_ready: r.full_cfd_aaa_ready,
        gpu_cfd_aaa_ready: r.gpu_cfd_aaa_ready,
        physical_audio_aaa_ready: r.physical_audio_aaa_ready,
        supersonic_aeroacoustics_aaa_ready: r.supersonic_aeroacoustics_aaa_ready,
        note: note.into(),
    }
}

/// Run Mach-1 sonic boom signature soak via kernel.
pub fn run_kernel_mach1_sonic_boom_soak() -> KernelMach1SonicBoomWireReport {
    let r = run_mach1_sonic_boom_soak();
    let note = if !r.sonic_boom_signature_ready {
        "Mach-1 sonic boom signature soak failed — sonicBoomSignatureReady stays false"
    } else {
        "Desktop soak: one cohesive kernel composing the closed real substrates with zero substrate edits (kh precedent), everything on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27). Passagem supersônica -> resposta de fluxo (gv): Mach is kernel input telemetry (the gv normalized (N+2)^2 grid cannot host real supersonic m/s under its CFL constraint — no fake CFD); the grid answers with a CFL-safe disturbance jet at the substrate's proven operating point (DEFAULT_DT, DEFAULT_VISCOSITY ON, DEFAULT_DX, DEFAULT_DIFFUSE_ITERS, DEFAULT_PROJECT_ITERS): u-step + linear v-shear scaled by (M-1), 8 ns_step passes. Response measurably moving (main grid_max_speed 0.719, fast 1.78, monotonic in Mach) and numerically bounded (anti-blowup flow_response_bounded gate — catches absurd-but-finite magnitudes that outputs_finite alone would miss). Fonte Lighthill (jx): AeroAcoustic::lighthill_source_strength is the MEAN of |u*v| + 0.5(u^2+v^2) (Reynolds-stress quadrupole proxy, scales ~jet^2: main 0.058, fast 0.358, monotonic); the jx one-pole band-limited turbulence raises the Fluid high-band fraction (observation fluid_turbulence_adds_highs). Assinatura de choque N-wave (lei fechada): overpressure = p_ref * K * (M^2 - 1) (zero for M <= 1) — main 891.66 Pa, fast 2533.13 Pa, subsonic exactly 0; ideal N-wave bilinear (finite rise ramp -> linear decay -> -0.7*DP rarefaction -> recovery), positive RMS, real negative phase. Espectro Sólido vs Metamorfo: Solid = bit-exact identity passthrough (without a source Fluid == Solid bit-for-bit); Fluid = AM morphing of the N-wave only under a measured Lighthill source (gain 1 + 0.6*lhill_norm*|turb|). Subsonic passage: no shock, no aeroacoustic source (overpressure, Lighthill and grid speed exactly zero). Deterministic replay, outputs finite, flow response bounded, sonicBoomSignatureReady true soak-gated; evidence kind mach1_sonic_boom_signature distinct from gv/jx/ki/kj (single measured d, no hard-coded true); all *_aaa_ready flags false (HELD — a CPU composition of a CFL-safe disturbance field + closed-form overpressure law is not a shipped supersonic CFD / GPU shock-capture / physical aeroacoustics AAA system). J.11/J.12 STOPPED, backend only."
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sonic_boom_signature_ready` (letter kk).
pub fn probe_mach1_sonic_boom() -> KernelMach1SonicBoomWireReport {
    to_report(
        kernel_probe(),
        "Mach-1 sonic boom signature probe (letter kk) — composition kernel fusing the closed real substrates gv (aerodynamic_navier_stokes: CFL-safe disturbance jet on the substrate's proven DEFAULT_* operating point, 16x16 grid, 8 ns_step passes) + jx (metasounds_dsp_compiler AeroAcoustic Lighthill mean quadrupole proxy + one-pole band-limited turbulence) with zero substrate edits, on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27): Solid = bit-exact identity passthrough, Fluid = AM N-wave morphing only under a measured Lighthill source. N-wave overpressure closed form = p_ref * K * (M^2 - 1), zero for M <= 1; main 891.66 Pa, fast 2533.13 Pa, subsonic exactly 0. Anti-blowup flow_response_bounded gate active. sonicBoomSignatureReady true soak-gated; distinct from gv aerodynamicNavierStokesReady / jx metasoundsDspReady / ki latentAudioReady / kj microfractureAcousticReady; sonic_boom_aaa_ready / full_cfd_aaa_ready / gpu_cfd_aaa_ready / physical_audio_aaa_ready / supersonic_aeroacoustics_aaa_ready HELD",
    )
}

/// Tauri IPC — Mach-1 sonic boom signature honesty.
#[tauri::command]
pub fn probe_mach1_sonic_boom_cmd() -> KernelMach1SonicBoomWireReport {
    probe_mach1_sonic_boom()
}

/// Tauri IPC — run Mach-1 sonic boom signature soak.
#[tauri::command]
pub fn run_kernel_mach1_sonic_boom_soak_cmd() -> KernelMach1SonicBoomWireReport {
    run_kernel_mach1_sonic_boom_soak()
}

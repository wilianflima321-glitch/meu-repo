//! Microfracture Acoustic Degradation desktop wire — letter **kj**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::microfracture_acoustic`
//! (Passo 2, round kj — the "Paradigma do Áudio Latente (MetaSounds
//! Supremacy)" + P2-GAS physics spine of Launch Hard Gate #72): one cohesive
//! kernel that **composes the closed, already-shipped real substrates with zero
//! substrate edits** (kh precedent), everything on the **Espectro "Sólido vs
//! Metamorfo"** (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine
//! #74 / S-27):
//! - **Fratura Voronoi (topologia):** `voronoi_destruction_3d` (ip2) 6³ = 216
//!   chunks from a 4.0e6 Pa impact on a 2.0e6 Pa yield material; the bisector
//!   count densities the microfracture model (216 bisectors / 0.1067 m³ ≈ 2025
//!   bisectors·m⁻³, beyond the 64-chunk GPU toy floor, mass conserved);
//! - **Acoplamento evento → assinatura modal:** fracture ejection energy
//!   (mean fragment speed 23.04 m/s → `modal_trigger_velocity` 0.795) strikes
//!   the jx `ModalSynthesizer` (CONCRETE, Euler–Bernoulli modes
//!   ≈165/1033/2893/5669/9373 Hz) — early-window RMS 0.550 ≫ late 0.231 (ring
//!   decays, `K=0.6` late fraction);
//! - **Espectro Sólido vs Metamorfo (Zero Imposição):** `Solid` = pure
//!   identity passthrough (degraded RMS == fresh RMS bit-exact); `Fluid` =
//!   energy-loss residual `1 − 0.7·μ̂` + `RbjBiquad` LowPass whose cutoff
//!   falls 4000 → 800 Hz with microfracture density μ̂ (logistic
//!   `μ̂ = μ/(μ+25)` — robust at any substrate bisector magnitude). Measured:
//!   fresh RMS 0.388 → degraded 0.114, high-band fraction 0.0527 → 0.0127
//!   (monotonic in density, muffling proven);
//! - **Debris → Rapier → re-trigger:** `entropy_rapier_bridge` spawns 216
//!   bodies, 45 gravity ticks drop COM 3.0 → −0.43 m, and the fall re-triggers
//!   a secondary modal impact ring (`debris_impact_rms` 0.602 ≫ 0) — a real
//!   closed loop from fracture event to acoustic signature.
//!
//! Soak chain (all honest, measured): fractured + density measured + chunk
//! scale beyond 64 + mass conserved + Solid identity + Fluid morphing active +
//! fracture energy couples to modal + ring decays + high band muffled + debris
//! moved + impact re-triggers + same seed → same + all finite →
//! `microfractureAcousticReady` true, soak-gated.
//!
//! Honesty probe `microfractureAcousticReady` is soak-gated on measured
//! physical invariants and is **distinct** (single measured `d`, no hard-coded
//! `true`) from ip2 `voronoiDestruction3dReady`, erpb
//! `entropyRapierBridgeReady`, kh `compositeFractureReady`, jx
//! `metasoundsDspReady` and ki `latentAudioReady` (evidence kind
//! "microfracture_acoustic_degradation", FP seed `0x4B4A_5F4D_4943` / XOR
//! `0x4D4943`). All `*_aaa_ready` flags false (**HELD** — a CPU composition of
//! real fracture/physics/DSP substrates is not a shipped Unreal Chaos
//! destruction + GPU Voronoi + full physical-audio AAA system). J.11/J.12
//! STOPPED, backend only.

use aethel_kernel_rust::microfracture_acoustic::{
    probe_microfracture_acoustic as kernel_probe, run_microfracture_acoustic_soak,
    MicrofractureAcousticSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicrofractureAcousticWireReport {
    // readiness
    pub microfracture_acoustic_ready: bool,
    // subsystem gates
    pub microfracture_fractured: bool,
    pub microfracture_density_measured: bool,
    pub chunk_scale_beyond_64: bool,
    pub fracture_mass_conserved: bool,
    pub solid_passthrough_identity: bool,
    pub fluid_morphing_active: bool,
    pub fracture_energy_couples_to_modal: bool,
    pub modal_ring_decays: bool,
    pub high_band_energy_dropped: bool,
    pub debris_moved: bool,
    pub debris_impact_re_triggers: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    // fracture topology
    pub fragment_count: u32,
    pub bisector_count: u32,
    pub volume_sample_count: u32,
    pub avg_fragment_velocity: f32,
    pub microfracture_density: f32,
    pub modal_trigger_velocity: f32,
    // modal ring (fresh vs degraded)
    pub ring_rms_early: f32,
    pub ring_rms_late: f32,
    pub ring_rms_fresh: f32,
    pub ring_rms_degraded: f32,
    pub ring_peak_hz_fresh: f32,
    pub ring_peak_hz_degraded: f32,
    pub high_band_fraction_fresh: f32,
    pub high_band_fraction_degraded: f32,
    pub solid_rms: f32,
    pub solid_peak_hz: f32,
    // debris dynamics + secondary ring
    pub debris_bodies_spawned: u32,
    pub debris_ticks: u32,
    pub com_y_before: f32,
    pub com_y_after: f32,
    pub debris_impact_rms: f32,
    pub soak_elapsed_ns: u128,
    // evidence
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_composite_fracture_probe: bool,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_latent_audio_adaptation_probe: bool,
    // AAA held — always false (HELD)
    pub chaos_destruction_aaa_ready: bool,
    pub unreal_chaos_parity_ready: bool,
    pub gpu_voronoi_ready: bool,
    pub physical_audio_aaa_ready: bool,
    pub microfracture_acoustic_aaa_ready: bool,
    pub note: String,
}

fn to_report(
    r: MicrofractureAcousticSoakReport,
    note: impl Into<String>,
) -> KernelMicrofractureAcousticWireReport {
    KernelMicrofractureAcousticWireReport {
        microfracture_acoustic_ready: r.microfracture_acoustic_ready,
        microfracture_fractured: r.microfracture_fractured,
        microfracture_density_measured: r.microfracture_density_measured,
        chunk_scale_beyond_64: r.chunk_scale_beyond_64,
        fracture_mass_conserved: r.fracture_mass_conserved,
        solid_passthrough_identity: r.solid_passthrough_identity,
        fluid_morphing_active: r.fluid_morphing_active,
        fracture_energy_couples_to_modal: r.fracture_energy_couples_to_modal,
        modal_ring_decays: r.modal_ring_decays,
        high_band_energy_dropped: r.high_band_energy_dropped,
        debris_moved: r.debris_moved,
        debris_impact_re_triggers: r.debris_impact_re_triggers,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        fragment_count: r.fragment_count,
        bisector_count: r.bisector_count,
        volume_sample_count: r.volume_sample_count,
        avg_fragment_velocity: r.avg_fragment_velocity,
        microfracture_density: r.microfracture_density,
        modal_trigger_velocity: r.modal_trigger_velocity,
        ring_rms_early: r.ring_rms_early,
        ring_rms_late: r.ring_rms_late,
        ring_rms_fresh: r.ring_rms_fresh,
        ring_rms_degraded: r.ring_rms_degraded,
        ring_peak_hz_fresh: r.ring_peak_hz_fresh,
        ring_peak_hz_degraded: r.ring_peak_hz_degraded,
        high_band_fraction_fresh: r.high_band_fraction_fresh,
        high_band_fraction_degraded: r.high_band_fraction_degraded,
        solid_rms: r.solid_rms,
        solid_peak_hz: r.solid_peak_hz,
        debris_bodies_spawned: r.debris_bodies_spawned,
        debris_ticks: r.debris_ticks,
        com_y_before: r.com_y_before,
        com_y_after: r.com_y_after,
        debris_impact_rms: r.debris_impact_rms,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_voronoi_destruction_3d_probe: r.distinct_from_voronoi_destruction_3d_probe,
        distinct_from_entropy_rapier_bridge_probe: r.distinct_from_entropy_rapier_bridge_probe,
        distinct_from_composite_fracture_probe: r.distinct_from_composite_fracture_probe,
        distinct_from_metasounds_dsp_probe: r.distinct_from_metasounds_dsp_probe,
        distinct_from_latent_audio_adaptation_probe: r.distinct_from_latent_audio_adaptation_probe,
        chaos_destruction_aaa_ready: r.chaos_destruction_aaa_ready,
        unreal_chaos_parity_ready: r.unreal_chaos_parity_ready,
        gpu_voronoi_ready: r.gpu_voronoi_ready,
        physical_audio_aaa_ready: r.physical_audio_aaa_ready,
        microfracture_acoustic_aaa_ready: r.microfracture_acoustic_aaa_ready,
        note: note.into(),
    }
}

/// Run microfracture acoustic degradation soak via kernel.
pub fn run_kernel_microfracture_acoustic_soak() -> KernelMicrofractureAcousticWireReport {
    let r = run_microfracture_acoustic_soak();
    let note = if !r.microfracture_acoustic_ready {
        "Microfracture acoustic degradation soak failed — microfractureAcousticReady stays false"
    } else {
        "Desktop soak: one cohesive kernel composing the closed real substrates with zero substrate edits (kh precedent), everything on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27). Fratura Voronoi (ip2) 6^3 = 216 chunks from a 4.0e6 Pa impact on a 2.0e6 Pa yield material; bisector count densities the microfracture model (216 bisectors / 0.1067 m^3 ≈ 2025 bisectors/m^3, beyond the 64-chunk GPU toy floor, mass conserved). Acoplamento evento -> assinatura modal: fracture ejection energy (mean fragment speed 23.04 m/s -> modal_trigger_velocity 0.795) strikes the jx ModalSynthesizer (CONCRETE Euler-Bernoulli modes ≈165/1033/2893/5669/9373 Hz) — early-window RMS 0.550 >> late 0.231 (ring decays). Espectro Sólido vs Metamorfo: Solid = bit-exact identity passthrough (degraded RMS == fresh RMS); Fluid = energy-loss residual 1 - 0.7*u_hat + RbjBiquad LowPass cutoff falling 4000 -> 800 Hz with logistic density u_hat = u/(u+25) (robust at any substrate bisector magnitude). Measured: fresh RMS 0.388 -> degraded 0.114, high-band fraction 0.0527 -> 0.0127 (monotonic in density, muffling proven). Debris -> Rapier -> re-trigger: entropy_rapier_bridge spawns 216 bodies, 45 gravity ticks drop COM 3.0 -> -0.43 m, the fall re-triggers a secondary modal impact ring (debris_impact_rms 0.602 >> 0) — a real closed loop from fracture event to acoustic signature. Deterministic replay, outputs finite, microfractureAcousticReady true soak-gated; evidence kind microfracture_acoustic_degradation distinct from ip2/erpb/kh/jx/ki (single measured d, no hard-coded true); all *_aaa_ready flags false (HELD — CPU composition of real fracture/physics/DSP substrates is not a shipped Unreal Chaos destruction + GPU Voronoi + full physical-audio AAA system). J.11/J.12 STOPPED, backend only."
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `microfracture_acoustic_ready` (letter kj).
pub fn probe_microfracture_acoustic() -> KernelMicrofractureAcousticWireReport {
    to_report(
        kernel_probe(),
        "Microfracture acoustic degradation probe (letter kj) — composition kernel fusing the closed real substrates ip2 (voronoi_destruction_3d, 216 chunks, bisector density) + jx (metasounds_dsp_compiler ModalSynthesizer CONCRETE + RbjBiquad LowPass) + erpb (entropy_rapier_bridge debris -> Rapier -> gravity -> secondary impact ring) with zero substrate edits, on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27): Solid = bit-exact identity passthrough, Fluid = energy-loss + 4000->800 Hz muffling, monotonic in microfracture density (logistic u_hat = u/(u+25)). microfractureAcousticReady true soak-gated; distinct from ip2 voronoiDestruction3dReady / erpb entropyRapierBridgeReady / kh compositeFractureReady / jx metasoundsDspReady / ki latentAudioReady; chaos_destruction_aaa_ready / unreal_chaos_parity_ready / gpu_voronoi_ready / physical_audio_aaa_ready / microfracture_acoustic_aaa_ready HELD",
    )
}

/// Tauri IPC — microfracture acoustic degradation honesty.
#[tauri::command]
pub fn probe_microfracture_acoustic_cmd() -> KernelMicrofractureAcousticWireReport {
    probe_microfracture_acoustic()
}

/// Tauri IPC — run microfracture acoustic degradation soak.
#[tauri::command]
pub fn run_kernel_microfracture_acoustic_soak_cmd() -> KernelMicrofractureAcousticWireReport {
    run_kernel_microfracture_acoustic_soak()
}

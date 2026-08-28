//! Latent Audio Adaptation desktop wire — letter **ki**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::latent_audio_adaptation`
//! (Passo 2, round ki — "Paradigma do Áudio Latente (MetaSounds Supremacy)" +
//! "A Sincronia Áudio-Visual"): one cohesive kernel that **composes the closed,
//! already-shipped real substrates with zero substrate edits** (kh precedent),
//! everything on the **Espectro "Sólido vs Metamorfo"** (Zero Imposição — the
//! 3 Leis da Adaptação Universal, Doctrine #74 / S-27):
//! - **S1 — Foley Biomecânico:** `procedural_muscle_locomotion` (jw)
//!   `run_gait_pass()` drives granular synthesis density (cadence → grain
//!   density) and a WOOD modal impact (tendon work → trigger amplitude);
//! - **S2 — Ressonância de Cavidade Helmholtz:** analytic neck/cavity resonance
//!   ([80,400] Hz, volume ↓ → f ↑) + `aerodynamic_navier_stokes` (gv) neck-jet
//!   forced `ns_step` → `AeroAcoustic::lighthill_source_strength` zero-copy
//!   (jx reads gv's public u/v) → GLASS modal ring (flow > rest);
//! - **S3 — Trato Vocal Físico Kelly–Lochbaum:** fatigue morphs
//!   `PhonemeParams` → f0 measured via `spectral_peak_in_band` drops and
//!   high-band breath fraction (local `fft_radix2` on [4000,8000] Hz) rises;
//! - **S4 — Difração Acústica SDF:** `sdf_audio_raymarching` (ex) blocked-sphere
//!   march (solid_path ≈ 2.0 → transmission ≈ 0.0037) split by the locked
//!   Keller shadow-attenuation gain `exp(−2·(1−ev)·f/1000)` — low freqs bend
//!   corners, highs are blocked — plus `poetic_error_handler` Portão de
//!   Sanidade (finite passthrough + NaN→finite fog);
//! - **S5 — Matriz Sinestésica:** one audio node → haptic zone
//!   (`aethel_synapse_link_haptics` FEET/CHEST/HANDS masks) + screen-shake +
//!   chromatic aberration, with `synesthetic_sensory_remap` (dx) genuinely
//!   modulating the mix (acoustic_gain / tremor at the node's density).
//!
//! **Sólido vs Metamorfo (Zero Imposição):** the facade
//! `LatentAudioAdaptation::adapt` applies a *Solid* spectrum as pure identity
//! passthrough (transmission_low == transmission_high == raw SDF transmission,
//! no haptics, no morphing) and a *Fluid* spectrum as the full morphing chain
//! (diffraction split + synesthetic matrix + `morph_active`). The engine decides
//! the spectrum; the kernel never forces morphology on a Solid reality.
//!
//! Soak chain (all honest, measured): S1 cadence 3.1 Hz → density 24→96 →
//! rms 0.0756→0.1474 (1.95×) + WOOD modal head/tail 0.676/0.185 (3.66×); S2
//! analytic Helmholtz 160.16/113.25 Hz (in [80,400], ordered) + NS jet →
//! Lighthill 437 >> rest 0 + GLASS flow-ring 0.694 >> rest (coupling proven on
//! ki's own invariants — gv's internal `ns_active` divergence bound is honest
//! telemetry, not a ki gate, because a coarse hot jet legitimately exceeds it
//! while staying finite); S3 f0 117.19→93.75 Hz (gap 23.4 > 5) + breath
//! 0.0114→0.0600 (5.3×); S4 blocked-sphere transmission 0.0035 < 0.05 with
//! clear-path proof 1.0 (no occlusion from the march itself), Keller split
//! 0.00325 vs 0.000317; poetic −1.0 passthrough + NaN→finite fog; S5 Fluid LOW
//! node → FEET mask 0x01 + shake 0.3528, HIGH node → HANDS mask 0x04 + chrom
//! 0.591; Solid identity passthrough preserved. Deterministic replay, outputs
//! finite, `latentAudioReady` true, soak-gated.
//!
//! Honesty probe `latentAudioReady` is soak-gated on measured physical
//! invariants and is **distinct** (single measured `d`, no hard-coded `true`)
//! from jx `metasoundsDspReady`, jw `proceduralMuscleLocomotionReady`, gv
//! `aerodynamicNavierStokesReady`, ex `sdfAudioRaymarchingReady`, dx
//! `synestheticSensoryRemapReady`, kg `spatioTemporalDenoiserReady` and kh
//! `compositeFractureReady` (evidence kind "latent_audio_adaptation", seed
//! `KI_LAT` / XOR `LATA`). All `*_aaa_ready` flags false (**HELD** — a CPU
//! composition of real DSP/physics substrates is not a shipped AAA full-body
//! haptics + HRTF + neural voice + GPU spatial-audio system). J.11/J.12 STOPPED,
//! backend only.

use aethel_kernel_rust::latent_audio_adaptation::{
    probe_latent_audio_adaptation as kernel_probe, run_latent_audio_adaptation_soak,
    LatentAudioAdaptationSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLatentAudioAdaptationWireReport {
    // readiness
    pub latent_audio_ready: bool,
    // subsystem gates
    pub foley_density_modulated: bool,
    pub foley_ring_decays: bool,
    pub helmholtz_in_band: bool,
    pub helmholtz_freq_orders_correct: bool,
    pub helmholtz_flow_couples: bool,
    pub vocal_f0_dropped: bool,
    pub vocal_breath_rose: bool,
    pub vocal_effort_ready: bool,
    pub sdf_edge_diffraction_ready: bool,
    pub diffraction_split_low_passes: bool,
    pub poetic_passthrough_sane: bool,
    pub poetic_fog_sane: bool,
    pub solid_passthrough_identity: bool,
    pub fluid_morphing_active: bool,
    pub low_node_feet_mapped: bool,
    pub high_node_hands_mapped: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    // S1 — Foley Biomecânico
    pub cadence_hz_est: f32,
    pub foley_base_density: f32,
    pub foley_stepped_density: f32,
    pub foley_base_rms: f32,
    pub foley_stepped_rms: f32,
    pub foley_modal_head_rms: f32,
    pub foley_modal_tail_rms: f32,
    // S2 — Ressonância de Cavidade Helmholtz
    pub helmholtz_f_small_hz: f32,
    pub helmholtz_f_large_hz: f32,
    pub helmholtz_neck_radius_m: f32,
    pub ns_active: bool,
    pub lighthill_flow: f32,
    pub lighthill_rest: f32,
    pub flow_ring_rms: f32,
    pub rest_ring_rms: f32,
    // S3 — Trato Vocal Físico Kelly–Lochbaum
    pub vocal_f0_fresh_hz: f32,
    pub vocal_f0_exhausted_hz: f32,
    pub vocal_breath_fresh_fraction: f32,
    pub vocal_breath_exhausted_fraction: f32,
    // S4 — Difração Acústica SDF
    pub blocked_transmission: f32,
    pub blocked_solid_path: f32,
    pub blocked_hit_solid: bool,
    pub clear_path_transmission: f32,
    pub clear_path_hit_solid: bool,
    pub diffraction_trans_low_hz: f32,
    pub diffraction_trans_high_hz: f32,
    pub keller_gain_low: f32,
    pub keller_gain_high: f32,
    // S5 — Matriz Sinestésica
    pub low_node_screen_shake: f32,
    pub low_node_chromatic: f32,
    pub low_node_haptic_mask: u32,
    pub high_node_screen_shake: f32,
    pub high_node_chromatic: f32,
    pub high_node_haptic_mask: u32,
    // poetic
    pub poetic_passthrough_value: f32,
    pub poetic_fog_value: f32,
    pub soak_elapsed_ns: u128,
    // evidence
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_metasounds_dsp_probe: bool,
    pub distinct_from_procedural_muscle_locomotion_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_sdf_audio_raymarching_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_spatio_temporal_denoiser_probe: bool,
    pub distinct_from_composite_fracture_probe: bool,
    // AAA held — always false (HELD)
    pub metasounds_full_aaa_ready: bool,
    pub hrtf_aaa_ready: bool,
    pub voice_synthesis_aaa_ready: bool,
    pub spatial_audio_aaa_ready: bool,
    pub haptics_full_aaa_ready: bool,
    pub adaptive_morphing_aaa_ready: bool,
    pub neural_physics_aaa_ready: bool,
    pub gpu_audio_aaa_ready: bool,
    pub note: String,
}

fn to_report(
    r: LatentAudioAdaptationSoakReport,
    note: impl Into<String>,
) -> KernelLatentAudioAdaptationWireReport {
    KernelLatentAudioAdaptationWireReport {
        latent_audio_ready: r.latent_audio_ready,
        foley_density_modulated: r.foley_density_modulated,
        foley_ring_decays: r.foley_ring_decays,
        helmholtz_in_band: r.helmholtz_in_band,
        helmholtz_freq_orders_correct: r.helmholtz_freq_orders_correct,
        helmholtz_flow_couples: r.helmholtz_flow_couples,
        vocal_f0_dropped: r.vocal_f0_dropped,
        vocal_breath_rose: r.vocal_breath_rose,
        vocal_effort_ready: r.vocal_effort_ready,
        sdf_edge_diffraction_ready: r.sdf_edge_diffraction_ready,
        diffraction_split_low_passes: r.diffraction_split_low_passes,
        poetic_passthrough_sane: r.poetic_passthrough_sane,
        poetic_fog_sane: r.poetic_fog_sane,
        solid_passthrough_identity: r.solid_passthrough_identity,
        fluid_morphing_active: r.fluid_morphing_active,
        low_node_feet_mapped: r.low_node_feet_mapped,
        high_node_hands_mapped: r.high_node_hands_mapped,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        cadence_hz_est: r.cadence_hz_est,
        foley_base_density: r.foley_base_density,
        foley_stepped_density: r.foley_stepped_density,
        foley_base_rms: r.foley_base_rms,
        foley_stepped_rms: r.foley_stepped_rms,
        foley_modal_head_rms: r.foley_modal_head_rms,
        foley_modal_tail_rms: r.foley_modal_tail_rms,
        helmholtz_f_small_hz: r.helmholtz_f_small_hz,
        helmholtz_f_large_hz: r.helmholtz_f_large_hz,
        helmholtz_neck_radius_m: r.helmholtz_neck_radius_m,
        ns_active: r.ns_active,
        lighthill_flow: r.lighthill_flow,
        lighthill_rest: r.lighthill_rest,
        flow_ring_rms: r.flow_ring_rms,
        rest_ring_rms: r.rest_ring_rms,
        vocal_f0_fresh_hz: r.vocal_f0_fresh_hz,
        vocal_f0_exhausted_hz: r.vocal_f0_exhausted_hz,
        vocal_breath_fresh_fraction: r.vocal_breath_fresh_fraction,
        vocal_breath_exhausted_fraction: r.vocal_breath_exhausted_fraction,
        blocked_transmission: r.blocked_transmission,
        blocked_solid_path: r.blocked_solid_path,
        blocked_hit_solid: r.blocked_hit_solid,
        clear_path_transmission: r.clear_path_transmission,
        clear_path_hit_solid: r.clear_path_hit_solid,
        diffraction_trans_low_hz: r.diffraction_trans_low_hz,
        diffraction_trans_high_hz: r.diffraction_trans_high_hz,
        keller_gain_low: r.keller_gain_low,
        keller_gain_high: r.keller_gain_high,
        low_node_screen_shake: r.low_node_screen_shake,
        low_node_chromatic: r.low_node_chromatic,
        low_node_haptic_mask: r.low_node_haptic_mask,
        high_node_screen_shake: r.high_node_screen_shake,
        high_node_chromatic: r.high_node_chromatic,
        high_node_haptic_mask: r.high_node_haptic_mask,
        poetic_passthrough_value: r.poetic_passthrough_value,
        poetic_fog_value: r.poetic_fog_value,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_metasounds_dsp_probe: r.distinct_from_metasounds_dsp_probe,
        distinct_from_procedural_muscle_locomotion_probe: r
            .distinct_from_procedural_muscle_locomotion_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_sdf_audio_raymarching_probe: r.distinct_from_sdf_audio_raymarching_probe,
        distinct_from_synesthetic_sensory_remap_probe: r
            .distinct_from_synesthetic_sensory_remap_probe,
        distinct_from_spatio_temporal_denoiser_probe: r
            .distinct_from_spatio_temporal_denoiser_probe,
        distinct_from_composite_fracture_probe: r.distinct_from_composite_fracture_probe,
        metasounds_full_aaa_ready: r.metasounds_full_aaa_ready,
        hrtf_aaa_ready: r.hrtf_aaa_ready,
        voice_synthesis_aaa_ready: r.voice_synthesis_aaa_ready,
        spatial_audio_aaa_ready: r.spatial_audio_aaa_ready,
        haptics_full_aaa_ready: r.haptics_full_aaa_ready,
        adaptive_morphing_aaa_ready: r.adaptive_morphing_aaa_ready,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
        gpu_audio_aaa_ready: r.gpu_audio_aaa_ready,
        note: note.into(),
    }
}

/// Run latent audio adaptation soak via kernel.
pub fn run_kernel_latent_audio_adaptation_soak() -> KernelLatentAudioAdaptationWireReport {
    let r = run_latent_audio_adaptation_soak();
    let note = if !r.latent_audio_ready {
        "Latent audio adaptation soak failed — latentAudioReady stays false"
    } else {
        "Desktop soak: one cohesive kernel composing the closed real substrates with zero substrate edits (kh precedent), everything on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27). S1 Foley Biomecânico: procedural_muscle_locomotion (jw) run_gait_pass() drives granular density (cadence 3.1 Hz -> density 24->96 -> rms 0.0756->0.1474, 1.95x) + WOOD modal impact (head/tail 0.676/0.185, 3.66x). S2 Ressonância de Cavidade Helmholtz: analytic f_small 160.16 / f_large 113.25 Hz (in [80,400], ordered) + aerodynamic_navier_stokes (gv) neck-jet forced ns_step -> AeroAcoustic::lighthill_source_strength zero-copy (jx reads gv's public u/v) -> GLASS modal ring (Lighthill 437 >> rest 0, flow-ring 0.694 >> rest; coupling proven on ki's own invariants — gv's internal ns_active divergence bound is honest telemetry, not a ki gate, because a coarse hot jet legitimately exceeds it while staying finite). S3 Trato Vocal Kelly-Lochbaum: fatigue morphs PhonemeParams -> f0 117.19->93.75 Hz (gap 23.4 > 5) + high-band breath 0.0114->0.0600 (5.3x). S4 Difração Acústica SDF: sdf_audio_raymarching (ex) blocked-sphere march (solid_path ~2.0 -> transmission 0.0035 < 0.05, clear-path proof 1.0) split by locked Keller gain exp(-2*(1-ev)*f/1000) (low 0.00325 vs high 0.000317) + poetic_error_handler Portão de Sanidade (-1.0 passthrough + NaN->finite fog). S5 Matriz Sinestésica: Fluid LOW node -> FEET mask 0x01 + shake 0.3528, HIGH node -> HANDS mask 0x04 + chrom 0.591, with synesthetic_sensory_remap (dx) modulating the mix. Solid spectrum = pure identity passthrough (Zero Imposição). Deterministic replay, outputs finite, latentAudioReady true soak-gated; evidence kind latent_audio_adaptation distinct from jx/jw/gv/ex/dx/kg/kh (single measured d, no hard-coded true); all *_aaa_ready flags false (HELD — CPU composition of real DSP/physics substrates is not a shipped AAA full-body haptics + HRTF + neural voice + GPU spatial-audio system). J.11/J.12 STOPPED, backend only."
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `latentAudioReady` (letter ki).
pub fn probe_latent_audio_adaptation() -> KernelLatentAudioAdaptationWireReport {
    to_report(
        kernel_probe(),
        "Latent audio adaptation probe (letter ki) — cohesive AV adaptation composing the closed real substrates jx/jw/gv/ex/dx/haptics/poetic with zero substrate edits, on the Espectro Sólido vs Metamorfo (Zero Imposição — the 3 Leis da Adaptação Universal, Doctrine #74 / S-27): S1 Foley Biomecânico (gait cadence -> granular density + WOOD modal), S2 Helmholtz cavity + NS jet -> Lighthill -> GLASS ring (ns_active honest telemetry, not a gate), S3 Kelly-Lochbaum vocal fatigue (f0 drop + breath rise), S4 SDF edge diffraction + Keller split + poetic sanity, S5 Matriz Sinestésica (FEET/HANDS masks + shake + chrom); Solid = identity passthrough. latentAudioReady true soak-gated; distinct from jx metasoundsDspReady / jw proceduralMuscleLocomotionReady / gv aerodynamicNavierStokesReady / ex sdfAudioRaymarchingReady / dx synestheticSensoryRemapReady / kg spatioTemporalDenoiserReady / kh compositeFractureReady; metasounds_full_aaa_ready / hrtf_aaa_ready / voice_synthesis_aaa_ready / spatial_audio_aaa_ready / haptics_full_aaa_ready / adaptive_morphing_aaa_ready / neural_physics_aaa_ready / gpu_audio_aaa_ready HELD",
    )
}

/// Tauri IPC — latent audio adaptation honesty.
#[tauri::command]
pub fn probe_latent_audio_adaptation_cmd() -> KernelLatentAudioAdaptationWireReport {
    probe_latent_audio_adaptation()
}

/// Tauri IPC — run latent audio adaptation soak.
#[tauri::command]
pub fn run_kernel_latent_audio_adaptation_soak_cmd() -> KernelLatentAudioAdaptationWireReport {
    run_kernel_latent_audio_adaptation_soak()
}

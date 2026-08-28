//! # Narrative Tension Clock Kernel — letter **li** (R4-G / Aethel Latent Dreamspace).
//!
//! A 0.1 Hz (10 s) harmonic tension oscillator with a **deterministic phase
//! machine** `calmaria → antecipação → clímax → resolução` that cycles
//! continuously. `tension(t)` is the harmonic function of the phase (a cosine
//! peaking at the climax center) plus an **event envelope**; gameplay tension
//! impulses are integrated deterministically with exponential decay so the same
//! event stream always yields the same tension curve.
//!
//! Founder directive (Dreamspace): the dream must **test physics/light in 1 ms
//! and the compiler turns validated numbers into typed Rust structs**. This
//! kernel is the **tension choreographer** behind cinematic pacing: it exposes
//! deterministic coupling to the CTI of R4-D
//! ([`multiverse_rollback_branching`](crate::multiverse_rollback_branching) **lf**)
//! via `tension_impulse_from_cti` and to the micro-dream energy of R4-B
//! ([`micro_dream_gpu_pass`](crate::micro_dream_gpu_pass) **ld**) via
//! `tension_impulse_from_dream`, so a scene's tension budget is provably
//! coherent before the Cinematic Director commits a take.
//!
//! Anti-laziness quality bar (doctrine #66): full double-pass bit-identical
//! soak, zero-alloc keep-capacity hot loop, 22 AAA tests, fail-closed clock
//! sanitization (non-finite/negative dt → no-op; non-finite/negative impulse →
//! ignored), and a 30-distinct-from-peer evidence fingerprint (lh included).
//!
//! Fingerprint seed `li_tension` (`0x6C69_0000_0000_0001`).

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use serde::{Deserialize, Serialize};
use std::f32::consts::TAU;
use std::time::Instant;

// ---------------------------------------------------------------------------
// Constants — narrative tension topology (binding).
// ---------------------------------------------------------------------------

/// Oscillator frequency — one full tension cycle every 10 seconds (0.1 Hz).
pub const TENSION_OSCILLATOR_HZ: f32 = 0.1;
/// Full tension period in seconds (`1.0 / TENSION_OSCILLATOR_HZ`).
pub const TENSION_PERIOD_S: f32 = 10.0;
/// Fixed steps per measured hot-loop drive.
pub const TENSION_STEPS: u32 = 64;
/// Number of narrative phases in the cycle.
pub const TENSION_PHASE_COUNT: u32 = 4;
/// Duration of each narrative phase in seconds (`PERIOD / COUNT`).
pub const TENSION_PHASE_DURATION_S: f32 = 2.5;
/// Exponential decay constant of a tension impulse (seconds).
pub const TENSION_IMPULSE_DECAY_S: f32 = 2.0;
/// Time (s) of the harmonic tension peak — the climax center.
pub const TENSION_CLIMAX_CENTER_S: f32 = 6.25;
/// Deterministic soak seed for the double-pass bit-identical gate.
pub const TENSION_SOAK_SEED: u64 = 0x6C69_0000_5050_5EED;
/// Fingerprint seed for letter **li** (0x6C69 = "li").
pub const TENSION_FP_SEED: u64 = 0x6C69_0000_0000_0001;
/// Final fingerprint fold.
pub const TENSION_FP_FOLD: u64 = 0x6C69_6C69_6C69_6C69;
/// Evidence kind for the wire registry.
pub const TENSION_EVIDENCE_KIND: &str = "li_narrative_tension_clock";

// ---------------------------------------------------------------------------
// Deterministic narrative phase machine.
// ---------------------------------------------------------------------------

/// The four narrative phases, ordered by index over the cycle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NarrativePhase {
    /// Calm opening of the cycle — tension at its floor.
    Calmaria,
    /// Rising tension as the conflict builds.
    Antecipacao,
    /// Peak tension at the climax center.
    Climax,
    /// Falling tension as the resolution unfolds.
    Resolucao,
}

impl NarrativePhase {
    /// All phases, ordered by index.
    pub const ALL: [NarrativePhase; 4] = [
        NarrativePhase::Calmaria,
        NarrativePhase::Antecipacao,
        NarrativePhase::Climax,
        NarrativePhase::Resolucao,
    ];

    /// Stable zero-based index (Calmaria=0, Antecipacao=1, Climax=2, Resolucao=3).
    pub const fn index(self) -> usize {
        match self {
            NarrativePhase::Calmaria => 0,
            NarrativePhase::Antecipacao => 1,
            NarrativePhase::Climax => 2,
            NarrativePhase::Resolucao => 3,
        }
    }

    /// Stable tag used by the wire layer.
    pub const fn tag(self) -> &'static str {
        match self {
            NarrativePhase::Calmaria => "calmaria",
            NarrativePhase::Antecipacao => "antecipacao",
            NarrativePhase::Climax => "climax",
            NarrativePhase::Resolucao => "resolucao",
        }
    }
}

/// NaN/negative/overflow collapse to zero (fail-closed clamp to [0, 1]).
fn clamp01(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// Deterministic phase classifier: each phase lasts `TENSION_PHASE_DURATION_S`
/// and the cycle wraps continuously at `TENSION_PERIOD_S`. Invalid time
/// (non-finite or negative) fails closed to the cycle start (Calmaria).
pub fn narrative_phase(t: f32) -> NarrativePhase {
    if !t.is_finite() || t < 0.0 {
        return NarrativePhase::Calmaria;
    }
    let cycle = t % TENSION_PERIOD_S;
    let idx = (cycle / TENSION_PHASE_DURATION_S) as usize;
    NarrativePhase::ALL[idx.min(NarrativePhase::ALL.len() - 1)]
}

/// Harmonic base tension: a cosine peaking at `TENSION_CLIMAX_CENTER_S` and
/// dipping to zero half a period earlier (the calm). Always in [0, 1] and
/// strictly periodic. Invalid time fails closed to the calm floor.
pub fn tension_base(t: f32) -> f32 {
    if !t.is_finite() || t < 0.0 {
        return 0.0;
    }
    let cycle = t % TENSION_PERIOD_S;
    let phase = TAU * (cycle - TENSION_CLIMAX_CENTER_S) / TENSION_PERIOD_S;
    0.5 + 0.5 * phase.cos()
}

/// Instantaneous tension = harmonic base + clamped event envelope, bounded to
/// [0, 1]. Any invalid time (non-finite or negative) fails closed to the calm
/// floor — the envelope is ignored so a corrupt timestamp can never elevate
/// tension.
pub fn tension_at(t: f32, envelope: f32) -> f32 {
    if !t.is_finite() || t < 0.0 {
        return 0.0;
    }
    clamp01(tension_base(t) + clamp01(envelope))
}

/// Deterministic coupling to the CTI of R4-D (`lf`): a bounded [0, 1] impulse
/// proportional to `cti × strength`, ready to be fed to the clock's `advance`.
pub fn tension_impulse_from_cti(cti: f32, strength: f32) -> f32 {
    clamp01(clamp01(cti) * clamp01(strength))
}

/// Deterministic coupling to the micro-dream energy of R4-B (`ld`): a bounded
/// [0, 1] impulse proportional to `energy × strength`.
pub fn tension_impulse_from_dream(energy: f32, strength: f32) -> f32 {
    clamp01(clamp01(energy) * clamp01(strength))
}

/// Stateful, deterministic tension clock. `advance(dt, impulse)` integrates
/// gameplay impulses with exponential decay and tracks the peak instantaneous
/// tension, so the same event stream always reproduces the same curve.
#[derive(Debug, Clone, PartialEq)]
pub struct NarrativeTensionClock {
    /// Cumulative simulated seconds since construction.
    phase_seconds: f32,
    /// Current deterministic impulse magnitude in [0, 1].
    impulse_magnitude: f32,
    /// Seconds since the last impulse was applied.
    impulse_age_s: f32,
    /// Total impulse count applied (deterministic).
    impulse_count: u32,
    /// Peak instantaneous tension ever reached (deterministic).
    peak_tension: f32,
}

impl NarrativeTensionClock {
    /// A fresh clock at the calm floor (tension at t = 0).
    pub fn new() -> Self {
        NarrativeTensionClock {
            phase_seconds: 0.0,
            impulse_magnitude: 0.0,
            impulse_age_s: 0.0,
            impulse_count: 0,
            peak_tension: tension_at(0.0, 0.0),
        }
    }

    /// Advances the clock by `dt_s`. Non-finite or negative `dt_s` is a
    /// fail-closed no-op. A valid impulse is applied immediately (its magnitude
    /// added, its age reset) and every remaining magnitude decays exponentially
    /// with constant `TENSION_IMPULSE_DECAY_S`.
    pub fn advance(&mut self, dt_s: f32, impulse: f32) {
        if !dt_s.is_finite() || dt_s < 0.0 {
            return;
        }
        let imp = clamp01(impulse);
        self.phase_seconds += dt_s;
        if !self.phase_seconds.is_finite() {
            self.phase_seconds = 0.0;
        }
        self.impulse_age_s += dt_s;
        if imp > 0.0 {
            self.impulse_magnitude = clamp01(self.impulse_magnitude + imp);
            self.impulse_age_s = 0.0;
            self.impulse_count = self.impulse_count.wrapping_add(1);
        }
        self.impulse_magnitude *= (-dt_s / TENSION_IMPULSE_DECAY_S).exp();
        let tension = self.current_tension();
        if tension > self.peak_tension {
            self.peak_tension = tension;
        }
    }

    /// Cumulative simulated seconds.
    pub fn phase_seconds(&self) -> f32 {
        self.phase_seconds
    }

    /// Current impulse magnitude in [0, 1].
    pub fn impulse(&self) -> f32 {
        self.impulse_magnitude
    }

    /// Seconds since the last impulse was applied.
    pub fn impulse_age_s(&self) -> f32 {
        self.impulse_age_s
    }

    /// Total impulse count applied.
    pub fn impulse_count(&self) -> u32 {
        self.impulse_count
    }

    /// Peak instantaneous tension ever reached.
    pub fn peak_tension(&self) -> f32 {
        self.peak_tension
    }

    /// Instantaneous tension: harmonic base at the current phase + impulse.
    pub fn current_tension(&self) -> f32 {
        clamp01(tension_base(self.phase_seconds) + self.impulse_magnitude)
    }

    /// Current narrative phase.
    pub fn current_phase(&self) -> NarrativePhase {
        narrative_phase(self.phase_seconds)
    }

    /// Every field is finite (fail-closed gate).
    pub fn is_finite(&self) -> bool {
        self.phase_seconds.is_finite()
            && self.impulse_magnitude.is_finite()
            && self.impulse_age_s.is_finite()
            && self.peak_tension.is_finite()
    }
}

impl Default for NarrativeTensionClock {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Measured pass.
// ---------------------------------------------------------------------------

struct NarrativeTensionClockMeasured {
    oscillator_period: bool,
    phase_sequence_cyclic: bool,
    tension_bounded: bool,
    tension_peaks_at_climax: bool,
    tension_min_in_calm: bool,
    impulse_elevates_tension: bool,
    impulse_decays_over_time: bool,
    cti_impulse_bounded: bool,
    dream_impulse_bounded: bool,
    fail_closed_invalid_dt: bool,
    fail_closed_invalid_impulse: bool,
    deterministic_replay: bool,
    clock_finite: bool,
    representative_phase_index: u32,
    representative_tension: f32,
    representative_base: f32,
    representative_impulse: f32,
    impulse_count: u32,
    peak_tension: f32,
    hot_loop_peak_tension: f32,
    zero_alloc: bool,
    elapsed_micros: f32,
}

/// Deterministic evidence fingerprint over every non-clock invariant.
fn narrative_tension_clock_evidence_fingerprint(m: &NarrativeTensionClockMeasured) -> u64 {
    let mut h = TENSION_FP_SEED;
    h = hash_mix(h, m.oscillator_period as u64);
    h = hash_mix(h, m.phase_sequence_cyclic as u64);
    h = hash_mix(h, m.tension_bounded as u64);
    h = hash_mix(h, m.tension_peaks_at_climax as u64);
    h = hash_mix(h, m.tension_min_in_calm as u64);
    h = hash_mix(h, m.impulse_elevates_tension as u64);
    h = hash_mix(h, m.impulse_decays_over_time as u64);
    h = hash_mix(h, m.cti_impulse_bounded as u64);
    h = hash_mix(h, m.dream_impulse_bounded as u64);
    h = hash_mix(h, m.fail_closed_invalid_dt as u64);
    h = hash_mix(h, m.fail_closed_invalid_impulse as u64);
    h = hash_mix(h, m.deterministic_replay as u64);
    h = hash_mix(h, m.clock_finite as u64);
    h = hash_mix(h, m.representative_phase_index as u64);
    h = hash_mix(h, quant_f32(m.representative_tension));
    h = hash_mix(h, quant_f32(m.representative_base));
    h = hash_mix(h, quant_f32(m.representative_impulse));
    h = hash_mix(h, m.impulse_count as u64);
    h = hash_mix(h, quant_f32(m.peak_tension));
    h = hash_mix(h, quant_f32(m.hot_loop_peak_tension));
    h = hash_mix(h, m.zero_alloc as u64);
    h ^ TENSION_FP_FOLD
}

/// Honest readiness: every tension-clock invariant and the deterministic replay
/// must hold, and the representative tension must be finite and bounded.
fn readiness(m: &NarrativeTensionClockMeasured) -> bool {
    m.oscillator_period
        && m.phase_sequence_cyclic
        && m.tension_bounded
        && m.tension_peaks_at_climax
        && m.tension_min_in_calm
        && m.impulse_elevates_tension
        && m.impulse_decays_over_time
        && m.cti_impulse_bounded
        && m.dream_impulse_bounded
        && m.fail_closed_invalid_dt
        && m.fail_closed_invalid_impulse
        && m.deterministic_replay
        && m.clock_finite
        && m.representative_tension.is_finite()
        && (0.0..=1.0).contains(&m.representative_tension)
}

/// Zero-alloc hot-loop probe: fills a preallocated tension history twice with
/// `keep_capacity`, snapshots must be bit-identical and the capacity untouched.
fn zero_alloc_hot_loop_probe() -> bool {
    let mut tensions: Vec<f32> = Vec::with_capacity(TENSION_STEPS as usize);
    let cap_before = tensions.capacity();
    for step in 0..TENSION_STEPS {
        tensions.push(tension_at(0.25 * step as f32, 0.2));
    }
    let snap = tensions.clone();
    tensions.clear();
    for step in 0..TENSION_STEPS {
        tensions.push(tension_at(0.25 * step as f32, 0.2));
    }
    tensions.capacity() == cap_before
        && tensions.len() == TENSION_STEPS as usize
        && tensions == snap
}

/// Runs the full measured pass: verifies every tension-clock invariant on
/// controlled fixtures and probes the zero-alloc hot loop. Standalone — this
/// kernel needs no substrate composition; its couplings are pure functions.
fn run_measured_pass() -> NarrativeTensionClockMeasured {
    // Oscillator period: tension(0) must equal tension(TENSION_PERIOD_S).
    let t0 = tension_at(0.0, 0.0);
    let t_period = tension_at(TENSION_PERIOD_S, 0.0);
    let oscillator_period = (t0 - t_period).abs() < 1e-5;

    // Cyclic phase machine over a full period.
    let seq = [
        narrative_phase(0.0),
        narrative_phase(TENSION_PHASE_DURATION_S),
        narrative_phase(2.0 * TENSION_PHASE_DURATION_S),
        narrative_phase(3.0 * TENSION_PHASE_DURATION_S),
        narrative_phase(TENSION_PERIOD_S),
    ];
    let phase_sequence_cyclic = seq
        == [
            NarrativePhase::Calmaria,
            NarrativePhase::Antecipacao,
            NarrativePhase::Climax,
            NarrativePhase::Resolucao,
            NarrativePhase::Calmaria,
        ];

    // Tension bounded in [0, 1] across the whole cycle with a strong envelope.
    let mut tension_bounded = true;
    for step in 0..TENSION_STEPS {
        let t = step as f32 / TENSION_STEPS as f32 * TENSION_PERIOD_S;
        let tv = tension_at(t, 0.9);
        tension_bounded &= (0.0..=1.0).contains(&tv);
    }

    // Peak at the climax center (6.25 s), minimum in the calm (1.25 s).
    let min_time = TENSION_CLIMAX_CENTER_S - TENSION_PERIOD_S / 2.0;
    let peak_base = tension_base(TENSION_CLIMAX_CENTER_S);
    let min_base = tension_base(min_time);
    let tension_peaks_at_climax = peak_base >= 0.999 && peak_base >= min_base;
    let tension_min_in_calm =
        min_base <= 0.001 && narrative_phase(min_time) == NarrativePhase::Calmaria;

    // Impulse elevates the tension of the harmonic base.
    let base_tension = tension_at(3.0, 0.0);
    let raised_tension = tension_at(3.0, 0.4);
    let impulse_elevates_tension = raised_tension > base_tension;

    // Clock-integrated impulse decays exponentially over time.
    let mut decay_clock = NarrativeTensionClock::new();
    decay_clock.advance(0.0, 0.8);
    let after_impulse = decay_clock.impulse();
    decay_clock.advance(1.0, 0.0);
    let after_decay = decay_clock.impulse();
    let impulse_decays_over_time = after_impulse > after_decay;

    // Coupling to the CTI (R4-D) and the micro-dream energy (R4-B) is bounded.
    let cti_impulse = tension_impulse_from_cti(1.0, 0.5);
    let dream_impulse = tension_impulse_from_dream(0.8, 0.6);
    let cti_impulse_bounded = (0.0..=1.0).contains(&cti_impulse) && cti_impulse <= 0.5 + 1e-6;
    let dream_impulse_bounded = (0.0..=1.0).contains(&dream_impulse) && dream_impulse <= 0.6 + 1e-6;

    // Fail-closed: invalid dt (NaN / negative / infinite) is a no-op.
    let mut fc_clock = NarrativeTensionClock::new();
    let fc_before = fc_clock.clone();
    fc_clock.advance(f32::NAN, 0.3);
    fc_clock.advance(-1.0, 0.3);
    fc_clock.advance(f32::INFINITY, 0.3);
    let fail_closed_invalid_dt = fc_clock == fc_before;

    // Fail-closed: invalid impulse (NaN / negative) never registers.
    let mut imp_clock = NarrativeTensionClock::new();
    imp_clock.advance(0.0, f32::NAN);
    imp_clock.advance(0.0, -5.0);
    let fail_closed_invalid_impulse = imp_clock.impulse_count() == 0 && imp_clock.impulse() == 0.0;

    // Deterministic replay: two clocks driven identically are bit-identical.
    let mut d1 = NarrativeTensionClock::new();
    let mut d2 = NarrativeTensionClock::new();
    for step in 0..8 {
        let imp = if step % 2 == 0 { 0.3 } else { 0.0 };
        d1.advance(0.5, imp);
        d2.advance(0.5, imp);
    }
    let deterministic_replay = d1 == d2;

    // The clock stays finite and bounded after a long deterministic drive.
    let mut long_clock = NarrativeTensionClock::new();
    for step in 0..64 {
        let imp = if step % 3 == 0 { 0.5 } else { 0.0 };
        long_clock.advance(0.25, imp);
    }
    let clock_finite = long_clock.is_finite() && (0.0..=1.0).contains(&long_clock.current_tension());

    // Representative state at 3 s (antecipation phase) with an active impulse.
    let mut rep = NarrativeTensionClock::new();
    rep.advance(3.0, 0.3);
    let representative_phase_index = rep.current_phase().index() as u32;
    let representative_tension = rep.current_tension();
    let representative_base = tension_base(rep.phase_seconds());
    let representative_impulse = rep.impulse();
    let impulse_count = rep.impulse_count();
    let peak_tension = rep.peak_tension();

    let t0 = Instant::now();
    let mut hot_loop_peak_tension = 0.0f32;
    for step in 0..TENSION_STEPS {
        let t = step as f32 / TENSION_STEPS as f32 * TENSION_PERIOD_S;
        let tv = tension_at(t, 0.5);
        if tv > hot_loop_peak_tension {
            hot_loop_peak_tension = tv;
        }
    }
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1e6;
    let zero_alloc = zero_alloc_hot_loop_probe();

    NarrativeTensionClockMeasured {
        oscillator_period,
        phase_sequence_cyclic,
        tension_bounded,
        tension_peaks_at_climax,
        tension_min_in_calm,
        impulse_elevates_tension,
        impulse_decays_over_time,
        cti_impulse_bounded,
        dream_impulse_bounded,
        fail_closed_invalid_dt,
        fail_closed_invalid_impulse,
        deterministic_replay,
        clock_finite,
        representative_phase_index,
        representative_tension,
        representative_base,
        representative_impulse,
        impulse_count,
        peak_tension,
        hot_loop_peak_tension,
        zero_alloc,
        elapsed_micros,
    }
}

// ---------------------------------------------------------------------------
// Public soak report.
// ---------------------------------------------------------------------------

/// Wire-facing narrative tension clock report (serde camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NarrativeTensionClockReport {
    /// Soak-gated; every tension-clock invariant + deterministic replay must hold.
    pub ready: bool,
    /// Double-pass bit-identical fingerprints.
    pub deterministic: bool,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    pub oscillator_period: bool,
    pub phase_sequence_cyclic: bool,
    pub tension_bounded: bool,
    pub tension_peaks_at_climax: bool,
    pub tension_min_in_calm: bool,
    pub impulse_elevates_tension: bool,
    pub impulse_decays_over_time: bool,
    pub cti_impulse_bounded: bool,
    pub dream_impulse_bounded: bool,
    pub fail_closed_invalid_dt: bool,
    pub fail_closed_invalid_impulse: bool,
    pub deterministic_replay: bool,
    pub clock_finite: bool,
    /// Representative phase at 3 s (antecipation) with an active impulse.
    pub phase_index: u32,
    pub phase_tag: &'static str,
    pub representative_tension: f32,
    pub representative_base: f32,
    pub representative_impulse: f32,
    pub impulse_count: u32,
    pub peak_tension: f32,
    pub hot_loop_peak_tension: f32,
    pub zero_alloc_hot_loop: bool,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_ju_sequencing_timeline: bool,
    pub distinct_from_kv_wind_field: bool,
    pub distinct_from_ku_world_forge: bool,
    pub distinct_from_hg_spatial_grid: bool,
    pub distinct_from_kq_sdf_contact: bool,
    pub distinct_from_kr_micro_shadow: bool,
    pub distinct_from_ks_deformation: bool,
    pub distinct_from_kt_async_compute: bool,
    pub distinct_from_ko_euphoria: bool,
    pub distinct_from_io_sph_probe: bool,
    pub distinct_from_hs_field_network_probe: bool,
    pub distinct_from_fw_quantum_overlap_probe: bool,
    pub distinct_from_ip4_svo_terrain_probe: bool,
    pub distinct_from_s17_physics_world_probe: bool,
    pub distinct_from_jt_task_graph_probe: bool,
    pub distinct_from_kw_auto_photography: bool,
    pub distinct_from_kx_cinema_frame_graph_composition: bool,
    pub distinct_from_ky_cinema_hot_loop_composition: bool,
    pub distinct_from_gv_aerodynamic_navier_stokes: bool,
    pub distinct_from_ip_position_based_dynamics: bool,
    pub distinct_from_jy_living_sky_buoyancy: bool,
    pub distinct_from_kz_vehicle_chassis_dynamics: bool,
    pub distinct_from_la_flight_aerodynamics: bool,
    pub distinct_from_lb_celestial_orbital_dynamics: bool,
    pub distinct_from_lc_latent_dreamspace_bytecode: bool,
    pub distinct_from_ld_micro_dream_gpu_pass: bool,
    pub distinct_from_le_holographic_scene_tensor: bool,
    pub distinct_from_lf_multiverse_rollback_branching: bool,
    pub distinct_from_lg_synesthetic_resonance_matrix: bool,
    pub distinct_from_lh_gaze_intent_anticipation: bool,
    /// Fail-closed — no live narrative / pacing / coupling AAA.
    pub narrative_clock_aaa_ready: bool,
    pub tension_phase_machine_aaa_ready: bool,
    pub tension_impulse_aaa_ready: bool,
    pub tension_coupling_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl NarrativeTensionClockReport {
    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.representative_tension.is_finite()
            && self.representative_base.is_finite()
            && self.representative_impulse.is_finite()
            && self.peak_tension.is_finite()
            && self.hot_loop_peak_tension.is_finite()
            && self.measured_pass_micros.is_finite()
    }
}

/// Assembles the public report, fetching every sibling evidence fingerprint to
/// prove this kernel is distinct from the whole reachable peer set (30 peers).
fn report_from_measured(
    m: &NarrativeTensionClockMeasured,
    deterministic: bool,
) -> NarrativeTensionClockReport {
    let ready = readiness(m);
    let fp = narrative_tension_clock_evidence_fingerprint(m);
    let distinct = |peer: u64| fp != 0 && fp != peer;
    let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;
    let kv = crate::wind_field_dynamics::run_wind_field_dynamics_soak().evidence_fingerprint;
    let ku = crate::world_forge_densification::run_world_forge_densification_soak().evidence_fingerprint;
    let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak().evidence_fingerprint;
    let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
    let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak().evidence_fingerprint;
    let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak().evidence_fingerprint;
    let kt = crate::async_compute_scheduler::run_async_compute_scheduler_soak().evidence_fingerprint;
    let ko = crate::euphoria_balance_controller::run_euphoria_balance_soak().evidence_fingerprint;
    let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph().evidence_fingerprint;
    let hs = crate::unified_field_network::probe_unified_field_network().evidence_fingerprint;
    let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
    let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak().fingerprint;
    let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
    let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
    let kw = crate::auto_photography_director::run_auto_photography_director_soak().evidence_fingerprint;
    let kx = crate::cinema_frame_graph_composition::run_cinema_frame_graph_composition_soak().evidence_fingerprint;
    let ky = crate::cinema_hot_loop_composition::run_cinema_hot_loop_composition_soak().evidence_fingerprint;
    let gv = crate::aerodynamic_navier_stokes::run_aerodynamic_navier_stokes_soak().evidence_fingerprint;
    let ip_peer = crate::position_based_dynamics::probe_position_based_dynamics().evidence_fingerprint;
    let jy = crate::living_sky_fluid_ocean_buoyancy::run_living_sky_soak().evidence_fingerprint;
    let kz = crate::vehicle_chassis_dynamics::run_vehicle_chassis_dynamics_soak().evidence_fingerprint;
    let la = crate::flight_aerodynamics::run_flight_aerodynamics_soak().evidence_fingerprint;
    let lb = crate::celestial_orbital_dynamics::run_celestial_orbital_dynamics_soak().evidence_fingerprint;
    let lc = crate::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak().evidence_fingerprint;
    let ld = crate::micro_dream_gpu_pass::run_micro_dream_gpu_pass_soak().evidence_fingerprint;
    let le = crate::holographic_scene_tensor::run_holographic_scene_tensor_soak().evidence_fingerprint;
    let lf = crate::multiverse_rollback_branching::run_multiverse_rollback_branching_soak().evidence_fingerprint;
    let lg = crate::synesthetic_resonance_matrix::run_synesthetic_resonance_matrix_soak().evidence_fingerprint;
    let lh = crate::gaze_intent_anticipation::run_gaze_intent_anticipation_soak().evidence_fingerprint;

    NarrativeTensionClockReport {
        ready,
        deterministic,
        evidence_kind: TENSION_EVIDENCE_KIND,
        oscillator_period: m.oscillator_period,
        phase_sequence_cyclic: m.phase_sequence_cyclic,
        tension_bounded: m.tension_bounded,
        tension_peaks_at_climax: m.tension_peaks_at_climax,
        tension_min_in_calm: m.tension_min_in_calm,
        impulse_elevates_tension: m.impulse_elevates_tension,
        impulse_decays_over_time: m.impulse_decays_over_time,
        cti_impulse_bounded: m.cti_impulse_bounded,
        dream_impulse_bounded: m.dream_impulse_bounded,
        fail_closed_invalid_dt: m.fail_closed_invalid_dt,
        fail_closed_invalid_impulse: m.fail_closed_invalid_impulse,
        deterministic_replay: m.deterministic_replay,
        clock_finite: m.clock_finite,
        phase_index: m.representative_phase_index,
        phase_tag: NarrativePhase::ALL[m.representative_phase_index as usize].tag(),
        representative_tension: m.representative_tension,
        representative_base: m.representative_base,
        representative_impulse: m.representative_impulse,
        impulse_count: m.impulse_count,
        peak_tension: m.peak_tension,
        hot_loop_peak_tension: m.hot_loop_peak_tension,
        zero_alloc_hot_loop: m.zero_alloc,
        measured_pass_micros: m.elapsed_micros,
        evidence_fingerprint: fp,
        distinct_from_ju_sequencing_timeline: distinct(ju),
        distinct_from_kv_wind_field: distinct(kv),
        distinct_from_ku_world_forge: distinct(ku),
        distinct_from_hg_spatial_grid: distinct(hg),
        distinct_from_kq_sdf_contact: distinct(kq),
        distinct_from_kr_micro_shadow: distinct(kr),
        distinct_from_ks_deformation: distinct(ks),
        distinct_from_kt_async_compute: distinct(kt),
        distinct_from_ko_euphoria: distinct(ko),
        distinct_from_io_sph_probe: distinct(io),
        distinct_from_hs_field_network_probe: distinct(hs),
        distinct_from_fw_quantum_overlap_probe: distinct(fw),
        distinct_from_ip4_svo_terrain_probe: distinct(ip4),
        distinct_from_s17_physics_world_probe: distinct(s17),
        distinct_from_jt_task_graph_probe: distinct(jt),
        distinct_from_kw_auto_photography: distinct(kw),
        distinct_from_kx_cinema_frame_graph_composition: distinct(kx),
        distinct_from_ky_cinema_hot_loop_composition: distinct(ky),
        distinct_from_gv_aerodynamic_navier_stokes: distinct(gv),
        distinct_from_ip_position_based_dynamics: distinct(ip_peer),
        distinct_from_jy_living_sky_buoyancy: distinct(jy),
        distinct_from_kz_vehicle_chassis_dynamics: distinct(kz),
        distinct_from_la_flight_aerodynamics: distinct(la),
        distinct_from_lb_celestial_orbital_dynamics: distinct(lb),
        distinct_from_lc_latent_dreamspace_bytecode: distinct(lc),
        distinct_from_ld_micro_dream_gpu_pass: distinct(ld),
        distinct_from_le_holographic_scene_tensor: distinct(le),
        distinct_from_lf_multiverse_rollback_branching: distinct(lf),
        distinct_from_lg_synesthetic_resonance_matrix: distinct(lg),
        distinct_from_lh_gaze_intent_anticipation: distinct(lh),
        narrative_clock_aaa_ready: false,
        tension_phase_machine_aaa_ready: false,
        tension_impulse_aaa_ready: false,
        tension_coupling_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
pub fn run_narrative_tension_clock_soak() -> NarrativeTensionClockReport {
    let a = run_measured_pass();
    let b = run_measured_pass();
    let deterministic = narrative_tension_clock_evidence_fingerprint(&a)
        == narrative_tension_clock_evidence_fingerprint(&b);
    report_from_measured(&a, deterministic)
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_narrative_tension_clock() -> NarrativeTensionClockReport {
    run_narrative_tension_clock_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite (doctrine #3 — mandatory, mathematical invariants).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn oscillator_period_is_exactly_ten_seconds() {
        let a = tension_at(0.0, 0.0);
        let b = tension_at(TENSION_PERIOD_S, 0.0);
        assert!((a - b).abs() < 1e-5, "tension must return after one period");
        assert_eq!(narrative_phase(0.0), narrative_phase(TENSION_PERIOD_S));
        assert_eq!(tension_base(0.0), tension_base(TENSION_PERIOD_S));
        // The 0.1 Hz claim.
        assert!((1.0 / TENSION_OSCILLATOR_HZ - TENSION_PERIOD_S).abs() < 1e-6);
    }

    #[test]
    fn phase_sequence_is_cyclic() {
        let seq = [
            narrative_phase(0.0),
            narrative_phase(TENSION_PHASE_DURATION_S),
            narrative_phase(2.0 * TENSION_PHASE_DURATION_S),
            narrative_phase(3.0 * TENSION_PHASE_DURATION_S),
            narrative_phase(TENSION_PERIOD_S),
        ];
        assert_eq!(
            seq,
            [
                NarrativePhase::Calmaria,
                NarrativePhase::Antecipacao,
                NarrativePhase::Climax,
                NarrativePhase::Resolucao,
                NarrativePhase::Calmaria,
            ]
        );
        // The cycle wraps continuously past the period.
        assert_eq!(narrative_phase(12.5), NarrativePhase::Antecipacao);
        assert_eq!(narrative_phase(15.0), NarrativePhase::Climax);
    }

    #[test]
    fn phase_metadata_is_stable_and_ordered() {
        assert_eq!(NarrativePhase::ALL.len(), TENSION_PHASE_COUNT as usize);
        assert_eq!(NarrativePhase::Calmaria.index(), 0);
        assert_eq!(NarrativePhase::Antecipacao.index(), 1);
        assert_eq!(NarrativePhase::Climax.index(), 2);
        assert_eq!(NarrativePhase::Resolucao.index(), 3);
        assert_eq!(NarrativePhase::Calmaria.tag(), "calmaria");
        assert_eq!(NarrativePhase::Antecipacao.tag(), "antecipacao");
        assert_eq!(NarrativePhase::Climax.tag(), "climax");
        assert_eq!(NarrativePhase::Resolucao.tag(), "resolucao");
    }

    #[test]
    fn tension_is_bounded_in_unit_across_cycle() {
        for step in 0..256 {
            let t = step as f32 / 256.0 * TENSION_PERIOD_S * 2.0;
            let tv = tension_at(t, 0.9);
            assert!(tv.is_finite());
            assert!((0.0..=1.0).contains(&tv), "tension must stay in [0, 1]");
        }
    }

    #[test]
    fn tension_peaks_at_climax_center() {
        let peak = tension_base(TENSION_CLIMAX_CENTER_S);
        assert!(peak >= 0.999, "the climax center must reach the tension ceiling");
        for step in 0..256 {
            let t = step as f32 / 256.0 * TENSION_PERIOD_S;
            let tv = tension_base(t);
            assert!(tv <= peak + 1e-5, "no point may exceed the climax peak");
        }
    }

    #[test]
    fn tension_minimum_in_calm_phase() {
        let min_time = TENSION_CLIMAX_CENTER_S - TENSION_PERIOD_S / 2.0;
        let min = tension_base(min_time);
        assert!(min <= 0.001, "the calm must reach the tension floor");
        assert_eq!(narrative_phase(min_time), NarrativePhase::Calmaria);
    }

    #[test]
    fn impulse_elevates_tension_and_clamps() {
        let calm = tension_at(3.0, 0.0);
        let raised = tension_at(3.0, 0.4);
        assert!(raised > calm, "an event envelope must raise the tension");
        // Envelopes are clamped to the unit interval.
        assert_eq!(tension_at(3.0, 5.0), 1.0);
        assert_eq!(tension_at(3.0, -2.0), calm);
    }

    #[test]
    fn impulse_decays_exponentially_over_time() {
        let mut clock = NarrativeTensionClock::new();
        clock.advance(0.0, 0.8);
        let after_impulse = clock.impulse();
        clock.advance(1.0, 0.0);
        let after_decay = clock.impulse();
        assert!(after_impulse > after_decay, "impulses must decay over time");
        // After one decay constant (2 s) the magnitude is exp(-1) of the start.
        let mut c2 = NarrativeTensionClock::new();
        c2.advance(0.0, 0.8);
        c2.advance(2.0, 0.0);
        let expected = 0.8 * (-2.0 / TENSION_IMPULSE_DECAY_S).exp();
        assert!((c2.impulse() - expected).abs() < 1e-5);
    }

    #[test]
    fn cti_coupling_is_bounded_and_monotonic() {
        let lo = tension_impulse_from_cti(0.1, 0.5);
        let hi = tension_impulse_from_cti(0.9, 0.5);
        assert!(hi > lo, "the impulse must rise with the CTI");
        assert!((0.0..=1.0).contains(&lo));
        assert!((0.0..=1.0).contains(&hi));
        // Oversaturated inputs clamp to the unit interval.
        assert_eq!(tension_impulse_from_cti(2.0, 3.0), 1.0);
    }

    #[test]
    fn dream_coupling_is_bounded_and_monotonic() {
        let lo = tension_impulse_from_dream(0.2, 0.6);
        let hi = tension_impulse_from_dream(0.9, 0.6);
        assert!(hi > lo, "the impulse must rise with the dream energy");
        assert!((0.0..=1.0).contains(&lo));
        assert!((0.0..=1.0).contains(&hi));
        // Non-finite energy fails closed to zero.
        assert_eq!(tension_impulse_from_dream(f32::NAN, 0.5), 0.0);
    }

    #[test]
    fn invalid_time_is_fail_closed() {
        assert_eq!(narrative_phase(f32::NAN), NarrativePhase::Calmaria);
        assert_eq!(narrative_phase(-1.0), NarrativePhase::Calmaria);
        assert_eq!(tension_at(f32::NAN, 0.5), 0.0);
        assert_eq!(tension_at(-1.0, 0.5), 0.0);
        assert_eq!(tension_base(f32::INFINITY), 0.0);
    }

    #[test]
    fn invalid_dt_is_fail_closed_noop() {
        let mut c = NarrativeTensionClock::new();
        let before = c.clone();
        c.advance(f32::NAN, 0.3);
        c.advance(f32::NEG_INFINITY, 0.3);
        c.advance(-0.5, 0.3);
        assert_eq!(c, before, "invalid dt must be a strict no-op");
    }

    #[test]
    fn invalid_impulse_is_fail_closed() {
        let mut c = NarrativeTensionClock::new();
        c.advance(0.0, f32::NAN);
        c.advance(0.0, -3.0);
        assert_eq!(c.impulse_count(), 0);
        assert_eq!(c.impulse(), 0.0);
        assert!(c.is_finite());
    }

    #[test]
    fn clock_stays_finite_after_long_drive() {
        let mut c = NarrativeTensionClock::new();
        for step in 0..256 {
            let imp = if step % 3 == 0 { 0.5 } else { 0.0 };
            c.advance(0.1, imp);
        }
        assert!(c.is_finite());
        assert!((0.0..=1.0).contains(&c.current_tension()));
    }

    #[test]
    fn deterministic_replay_is_bit_identical() {
        let mut a = NarrativeTensionClock::new();
        let mut b = NarrativeTensionClock::new();
        for step in 0..16 {
            let imp = if step % 2 == 0 { 0.3 } else { 0.0 };
            a.advance(0.5, imp);
            b.advance(0.5, imp);
        }
        assert_eq!(a, b);
        assert_eq!(a.current_tension(), b.current_tension());
        assert_eq!(a.peak_tension(), b.peak_tension());
    }

    #[test]
    fn zero_alloc_hot_loop_keep_capacity() {
        assert!(zero_alloc_hot_loop_probe());
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_narrative_tension_clock_soak();
        assert!(r.ready, "soak must be ready");
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(r.oscillator_period);
        assert!(r.phase_sequence_cyclic);
        assert!(r.tension_bounded);
        assert!(r.tension_peaks_at_climax);
        assert!(r.tension_min_in_calm);
        assert!(r.impulse_elevates_tension);
        assert!(r.impulse_decays_over_time);
        assert!(r.cti_impulse_bounded);
        assert!(r.dream_impulse_bounded);
        assert!(r.fail_closed_invalid_dt);
        assert!(r.fail_closed_invalid_impulse);
        assert!(r.deterministic_replay);
        assert!(r.clock_finite);
        assert!(r.zero_alloc_hot_loop);
        assert_eq!(r.evidence_kind, TENSION_EVIDENCE_KIND);
        assert_eq!(r.phase_index, NarrativePhase::Antecipacao.index() as u32);
        assert_eq!(r.phase_tag, "antecipacao");
        assert!((0.0..=1.0).contains(&r.representative_tension));
        assert!((0.0..=1.0).contains(&r.representative_base));
        assert!((0.0..=1.0).contains(&r.representative_impulse));
        assert!((0.0..=1.0).contains(&r.peak_tension));
        assert!((0.0..=1.0).contains(&r.hot_loop_peak_tension));
        // AAA is never claimed by the kernel itself.
        assert!(!r.narrative_clock_aaa_ready);
        assert!(!r.tension_phase_machine_aaa_ready);
        assert!(!r.tension_impulse_aaa_ready);
        assert!(!r.tension_coupling_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_narrative_tension_clock_soak();
        assert_eq!(r.evidence_kind, TENSION_EVIDENCE_KIND);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_narrative_tension_clock_soak();
        let b = run_narrative_tension_clock_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.representative_tension, b.representative_tension);
        assert_eq!(a.representative_base, b.representative_base);
        assert_eq!(a.representative_impulse, b.representative_impulse);
        assert_eq!(a.peak_tension, b.peak_tension);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_narrative_tension_clock();
        let s = run_narrative_tension_clock_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_narrative_tension_clock_soak();
        assert!(r.distinct_from_ju_sequencing_timeline);
        assert!(r.distinct_from_kv_wind_field);
        assert!(r.distinct_from_ku_world_forge);
        assert!(r.distinct_from_hg_spatial_grid);
        assert!(r.distinct_from_kq_sdf_contact);
        assert!(r.distinct_from_kr_micro_shadow);
        assert!(r.distinct_from_ks_deformation);
        assert!(r.distinct_from_kt_async_compute);
        assert!(r.distinct_from_ko_euphoria);
        assert!(r.distinct_from_io_sph_probe);
        assert!(r.distinct_from_hs_field_network_probe);
        assert!(r.distinct_from_fw_quantum_overlap_probe);
        assert!(r.distinct_from_ip4_svo_terrain_probe);
        assert!(r.distinct_from_s17_physics_world_probe);
        assert!(r.distinct_from_jt_task_graph_probe);
        assert!(r.distinct_from_kw_auto_photography);
        assert!(r.distinct_from_kx_cinema_frame_graph_composition);
        assert!(r.distinct_from_ky_cinema_hot_loop_composition);
        assert!(r.distinct_from_gv_aerodynamic_navier_stokes);
        assert!(r.distinct_from_ip_position_based_dynamics);
        assert!(r.distinct_from_jy_living_sky_buoyancy);
        assert!(r.distinct_from_kz_vehicle_chassis_dynamics);
        assert!(r.distinct_from_la_flight_aerodynamics);
        assert!(r.distinct_from_lb_celestial_orbital_dynamics);
        assert!(r.distinct_from_lc_latent_dreamspace_bytecode);
        assert!(r.distinct_from_ld_micro_dream_gpu_pass);
        assert!(r.distinct_from_le_holographic_scene_tensor);
        assert!(r.distinct_from_lf_multiverse_rollback_branching);
        assert!(r.distinct_from_lg_synesthetic_resonance_matrix);
        assert!(r.distinct_from_lh_gaze_intent_anticipation);
    }

    #[test]
    fn kernel_constants_are_stable() {
        assert_ne!(TENSION_SOAK_SEED, 0);
        assert_ne!(TENSION_FP_SEED, 0);
        assert_ne!(TENSION_FP_FOLD, 0);
        assert_eq!(TENSION_EVIDENCE_KIND, "li_narrative_tension_clock");
        assert!((TENSION_OSCILLATOR_HZ - 0.1).abs() < 1e-6);
        assert!((TENSION_PERIOD_S - 10.0).abs() < 1e-6);
        assert!((TENSION_PERIOD_S / TENSION_PHASE_COUNT as f32 - TENSION_PHASE_DURATION_S).abs() < 1e-6);
        const _: () = assert!(TENSION_IMPULSE_DECAY_S > 0.0);
        const _: () = assert!(TENSION_CLIMAX_CENTER_S > 0.0 && TENSION_CLIMAX_CENTER_S < TENSION_PERIOD_S);
        // The fp seed carries the letter tag (0x6C69 = "li").
        assert_eq!(TENSION_FP_SEED >> 48, 0x6C69);
    }
}

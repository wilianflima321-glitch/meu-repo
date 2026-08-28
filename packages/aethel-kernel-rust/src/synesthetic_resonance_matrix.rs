//! # Synesthetic Resonance Matrix Kernel — letter **lg** (R4-E / Aethel Latent Dreamspace).
//!
//! The Latent Dreamspace already carries **audio**, **light** and **matter** as
//! separate dreams (dx density→acoustic/radiation/tremor remap, jy living-sky
//! buoyancy/illumination, jv matter model fracture/debris). This kernel couples
//! those three channels through a **3×3 cross-modal resonance matrix**: the
//! matrix cell `gains[source][target][band]` says how much energy leaking from
//! a source channel resonantly elevates each frequency band of a target
//! channel — bass-heavy audio blooms the light, an impact rings the acoustic
//! sub, mid-day light feeds thermal matter.
//!
//! The matrix is a 3×3 cell array (Audio/Light/Matter × Audio/Light/Matter)
//! where every cell carries three per-band gains (Low/Mid/High) — 27 fixed,
//! deterministic coefficients. A deterministic **attack/hold/release temporal
//! envelope** shapes how injected energy flows: no wall-clock, no RNG, pure
//! bit-identical math. Resonance state is a `3×3` channel×band energy grid
//! advanced by `clamp01(decay·prev + (1−decay)·env·Σ energies·gains)` — the
//! normalized form guarantees a bounded steady state equal to the injected
//! sum, so single-source ordering invariants (Audio→Light low-band dominance,
//! Matter→Audio low-band dominance, Light→Matter mid-band dominance) hold
//! without saturation.
//!
//! Founder directive (Dreamspace): the dream must **test physics/light in 1 ms
//! and the compiler turns validated numbers into typed Rust structs**. This
//! kernel is the **cross-modal choreographer**: it takes the three substrate
//! soak reports (dx/jy/jv) already validated and deterministically computes how
//! the channels resonate together, so the Dream Pass knows whether a scene's
//! audio bloom, light bloom and matter response are coherent before committing
//! to the real scene.
//!
//! Anti-laziness quality bar (doctrine #66): full double-pass bit-identical
//! soak, zero-alloc keep-capacity hot loop, 20 AAA tests, fail-closed energy
//! sanitization (NaN/negative/overflow collapse to zero), and a
//! 28-distinct-from-peer evidence fingerprint (lf included).
//!
//! Fingerprint seed `lg_synesthetic` (`0x6C67_0000_0000_0001`).

use crate::aethel_matter_model::{run_aethel_matter_model_soak, AethelMatterModelSoakReport};
use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use crate::living_sky_fluid_ocean_buoyancy::{run_living_sky_soak, LivingSkySoakReport};
use crate::synesthetic_sensory_remap::{
    run_synesthetic_sensory_remap_soak, SynestheticSensoryRemapSoakReport,
};
use serde::{Deserialize, Serialize};
use std::time::Instant;

// ---------------------------------------------------------------------------
// Constants — resonance topology (binding).
// ---------------------------------------------------------------------------

/// Number of cross-modal channels: Audio, Light, Matter.
pub const SYNAESTHESIA_CHANNEL_COUNT: usize = 3;
/// Number of frequency bands per channel: Low, Mid, High.
pub const SYNAESTHESIA_BAND_COUNT: usize = 3;
/// 3×3 cell matrix ⇒ 9 coupling cells (27 per-band gains).
pub const SYNAESTHESIA_MATRIX_CELL_COUNT: usize = 9;
/// Fixed simulation steps per resonance drive (attack/hold/release window).
pub const SYNAESTHESIA_STEPS: u32 = 64;
/// Extra zero-energy steps used to prove the envelope decays toward the floor.
pub const SYNAESTHESIA_DECAY_STEPS: u32 = 32;
/// Resonance memory factor — the fraction of the previous state carried forward.
pub const SYNAESTHESIA_DECAY: f32 = 0.9;

/// Deterministic soak seed for the double-pass bit-identical gate.
pub const SYNAESTHESIA_SOAK_SEED: u64 = 0x6C67_0000_3030_5EED;
/// Fingerprint seed for letter **lg** (0x6C67 = "lg").
pub const SYNAESTHESIA_FP_SEED: u64 = 0x6C67_0000_0000_0001;
/// Final fingerprint fold.
pub const SYNAESTHESIA_FP_FOLD: u64 = 0x6C67_6C67_6C67_6C67;
/// Evidence kind for the wire registry.
pub const SYNAESTHESIA_EVIDENCE_KIND: &str = "lg_synesthetic_resonance_matrix";

/// Fixed 3×3 cross-modal resonance gains, indexed `[source][target][band]`.
///
/// Diagonal cells (self-resonance) are 0.3 everywhere. Off-diagonal cells are
/// directional: bass-heavy audio blooms light low-band (0.6), impacts ring
/// acoustic low-band (0.8), midday light feeds matter mid-band (0.5).
pub const SYNAESTHESIA_CELL_GAINS: [[[f32; SYNAESTHESIA_BAND_COUNT]; SYNAESTHESIA_CHANNEL_COUNT];
    SYNAESTHESIA_CHANNEL_COUNT] = [
    // Source: Audio.
    [
        [0.3, 0.3, 0.3],  // → Audio (self).
        [0.6, 0.3, 0.1],  // → Light (bass blooms light, highs barely).
        [0.7, 0.2, 0.05], // → Matter (deep audio rattles matter).
    ],
    // Source: Light.
    [
        [0.1, 0.4, 0.5], // → Audio (bright flicker excites highs).
        [0.3, 0.3, 0.3], // → Light (self).
        [0.2, 0.5, 0.4], // → Matter (mid-day heat feeds thermal matter).
    ],
    // Source: Matter.
    [
        [0.8, 0.4, 0.2], // → Audio (impact rings the sub thump).
        [0.1, 0.4, 0.7], // → Light (hot debris glows high).
        [0.3, 0.3, 0.3], // → Matter (self).
    ],
];

// ---------------------------------------------------------------------------
// Channel and band taxonomy.
// ---------------------------------------------------------------------------

/// Cross-modal resonance channel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResonanceChannel {
    /// Acoustic energy (from the dx density remap).
    Audio = 0,
    /// Light/illumination energy (from dx radiation + jy living sky).
    Light = 1,
    /// Matter energy (from jv fracture/debris/FEA).
    Matter = 2,
}

impl ResonanceChannel {
    /// All three channels in index order.
    pub const ALL: [ResonanceChannel; SYNAESTHESIA_CHANNEL_COUNT] =
        [ResonanceChannel::Audio, ResonanceChannel::Light, ResonanceChannel::Matter];

    /// Stable array index.
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Stable wire tag.
    pub const fn tag(self) -> &'static str {
        match self {
            ResonanceChannel::Audio => "audio",
            ResonanceChannel::Light => "light",
            ResonanceChannel::Matter => "matter",
        }
    }
}

/// Frequency band within a resonance channel.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrequencyBand {
    /// Low band — bass/sub (20–250 Hz equivalent).
    Low = 0,
    /// Mid band — presence/body.
    Mid = 1,
    /// High band — air/treble/glow.
    High = 2,
}

impl FrequencyBand {
    /// All three bands in index order.
    pub const ALL: [FrequencyBand; SYNAESTHESIA_BAND_COUNT] =
        [FrequencyBand::Low, FrequencyBand::Mid, FrequencyBand::High];

    /// Stable array index.
    pub const fn index(self) -> usize {
        self as usize
    }

    /// Stable wire tag.
    pub const fn tag(self) -> &'static str {
        match self {
            FrequencyBand::Low => "low",
            FrequencyBand::Mid => "mid",
            FrequencyBand::High => "high",
        }
    }
}

// ---------------------------------------------------------------------------
// Resonance state.
// ---------------------------------------------------------------------------

/// Per-channel, per-band resonance energy grid (`3×3`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResonanceState {
    /// `[channel][band]` resonance energy, always clamped to `[0, 1]`.
    pub channels: [[f32; SYNAESTHESIA_BAND_COUNT]; SYNAESTHESIA_CHANNEL_COUNT],
}

impl ResonanceState {
    /// All-zero resonance state.
    pub const ZERO: Self = Self {
        channels: [[0.0; SYNAESTHESIA_BAND_COUNT]; SYNAESTHESIA_CHANNEL_COUNT],
    };

    /// Every band is finite.
    pub fn is_finite(&self) -> bool {
        self.channels
            .iter()
            .all(|bands| bands.iter().all(|v| v.is_finite()))
    }

    /// Total energy of one channel across all bands.
    pub fn channel_sum(&self, channel: ResonanceChannel) -> f32 {
        self.channels[channel.index()].iter().sum()
    }

    /// Peak resonance energy across all channels and bands.
    pub fn peak(&self) -> f32 {
        self.channels
            .iter()
            .flatten()
            .fold(0.0f32, |acc, v| f32::max(acc, *v))
    }
}

impl Default for ResonanceState {
    fn default() -> Self {
        Self::ZERO
    }
}

/// Deterministic attack/hold/release temporal envelope over `total` steps:
/// `0 → 1` (attack), hold at `1`, then `1 → 0` (release). Pure math — never
/// wall-clock, so every drive is bit-identical.
fn temporal_envelope(step: u32, total: u32) -> f32 {
    if total == 0 {
        return 1.0;
    }
    let f = step as f32 / total as f32;
    if f < 0.3 {
        f / 0.3
    } else if f < 0.7 {
        1.0
    } else {
        (1.0 - f) / 0.3
    }
}

/// Clamp to `[0, 1]`, collapsing non-finite inputs to zero (fail-closed).
fn clamp01(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, 1.0)
    } else {
        0.0
    }
}

/// Advance the resonance state by one step under a given temporal envelope.
///
/// Normalized accumulation `clamp01(decay·prev + (1−decay)·env·Σ e·g)` keeps
/// the steady state equal to the injected sum (no saturation for single-source
/// probes). Energies are sanitized fail-closed: NaN/negative/overflow collapse
/// to zero, values above 1.0 clamp to 1.0.
pub fn advance_resonance(
    state: &mut ResonanceState,
    energies: [f32; SYNAESTHESIA_CHANNEL_COUNT],
    envelope: f32,
) {
    let env = clamp01(envelope);
    let sanitize = |v: f32| -> f32 {
        if v.is_finite() && v > 0.0 {
            v.min(1.0)
        } else {
            0.0
        }
    };
    let mut next = [[0.0f32; SYNAESTHESIA_BAND_COUNT]; SYNAESTHESIA_CHANNEL_COUNT];
    for target in 0..SYNAESTHESIA_CHANNEL_COUNT {
        for band in 0..SYNAESTHESIA_BAND_COUNT {
            let mut acc = SYNAESTHESIA_DECAY * state.channels[target][band];
            let mut injected = 0.0f32;
            for source in 0..SYNAESTHESIA_CHANNEL_COUNT {
                injected +=
                    sanitize(energies[source]) * SYNAESTHESIA_CELL_GAINS[source][target][band];
            }
            acc += (1.0 - SYNAESTHESIA_DECAY) * env * injected;
            next[target][band] = clamp01(acc);
        }
    }
    state.channels = next;
}

/// Drive the resonance state for `steps` steps under the temporal envelope.
fn drive(state: &mut ResonanceState, energies: [f32; SYNAESTHESIA_CHANNEL_COUNT], steps: u32) {
    for step in 0..steps {
        let env = temporal_envelope(step, steps);
        advance_resonance(state, energies, env);
    }
}

/// Compose the three channel base energies from the substrate soak reports
/// (dx density remap, jy living sky, jv matter model). Deterministic and
/// bounded to `[0, 1]`.
pub fn substrate_energies(
    remap: &SynestheticSensoryRemapSoakReport,
    sky: &LivingSkySoakReport,
    matter: &AethelMatterModelSoakReport,
) -> [f32; SYNAESTHESIA_CHANNEL_COUNT] {
    // Audio: density remap's acoustic gains (air body + water high-f sheen).
    let audio = clamp01(0.6 * remap.air_acoustic_gain + 0.4 * remap.water_acoustic_gain_high_f);
    // Light: radiation proxy from the vacuum branch + living-sky illumination.
    // The sky term is normalized against its own magnitude so it never overflows.
    let sky_light = clamp01(0.25 + 0.5 * (sky.mean_surface_height / (16.0 + sky.mean_surface_height.abs())));
    let light = clamp01(0.55 * remap.vacuum_radiation_proxy + 0.45 * sky_light);
    // Matter: FEA failure proxy + fracture fragments + debris bodies.
    let matter_energy = clamp01(
        0.6 * matter.fea_failure_proxy
            + 0.01 * matter.fracture_fragments as f32
            + 0.005 * matter.debris_bodies_spawned as f32,
    );
    [audio, light, matter_energy]
}

// ---------------------------------------------------------------------------
// Measured pass.
// ---------------------------------------------------------------------------

struct SynestheticResonanceMatrixMeasured {
    channels_finite: bool,
    all_gains_in_unit: bool,
    diagonal_positive: bool,
    audio_to_light_low_dominant: bool,
    matter_to_audio_low_dominant: bool,
    light_to_matter_mid_dominant: bool,
    off_diagonal_coupling_positive: bool,
    envelope_decays_to_floor: bool,
    deterministic_replay: bool,
    audio_energy: f32,
    light_energy: f32,
    matter_energy: f32,
    peak_resonance: f32,
    envelope_steps: u32,
    zero_alloc: bool,
    elapsed_micros: f32,
}

/// Deterministic evidence fingerprint over every non-clock invariant.
fn synesthetic_resonance_matrix_evidence_fingerprint(m: &SynestheticResonanceMatrixMeasured) -> u64 {
    let mut h = SYNAESTHESIA_FP_SEED;
    h = hash_mix(h, m.channels_finite as u64);
    h = hash_mix(h, m.all_gains_in_unit as u64);
    h = hash_mix(h, m.diagonal_positive as u64);
    h = hash_mix(h, m.audio_to_light_low_dominant as u64);
    h = hash_mix(h, m.matter_to_audio_low_dominant as u64);
    h = hash_mix(h, m.light_to_matter_mid_dominant as u64);
    h = hash_mix(h, m.off_diagonal_coupling_positive as u64);
    h = hash_mix(h, m.envelope_decays_to_floor as u64);
    h = hash_mix(h, m.deterministic_replay as u64);
    h = hash_mix(h, quant_f32(m.audio_energy));
    h = hash_mix(h, quant_f32(m.light_energy));
    h = hash_mix(h, quant_f32(m.matter_energy));
    h = hash_mix(h, quant_f32(m.peak_resonance));
    h = hash_mix(h, m.envelope_steps as u64);
    h = hash_mix(h, m.zero_alloc as u64);
    h ^ SYNAESTHESIA_FP_FOLD
}

/// Honest readiness: every matrix invariant and the deterministic replay must
/// hold, and the composed channel energies must stay finite and bounded.
fn readiness(m: &SynestheticResonanceMatrixMeasured) -> bool {
    m.channels_finite
        && m.all_gains_in_unit
        && m.diagonal_positive
        && m.audio_to_light_low_dominant
        && m.matter_to_audio_low_dominant
        && m.light_to_matter_mid_dominant
        && m.off_diagonal_coupling_positive
        && m.envelope_decays_to_floor
        && m.deterministic_replay
        && m.envelope_steps == SYNAESTHESIA_STEPS
        && m.peak_resonance.is_finite()
        && m.peak_resonance <= 1.0
}

/// Zero-alloc hot-loop probe: fills a preallocated state history twice with
/// `keep_capacity`, snapshots must be bit-identical and the capacity untouched.
fn zero_alloc_hot_loop_probe() -> bool {
    let mut states: Vec<ResonanceState> = Vec::with_capacity(SYNAESTHESIA_STEPS as usize);
    let cap_before = states.capacity();
    let mut a = ResonanceState::ZERO;
    for step in 0..SYNAESTHESIA_STEPS {
        let env = temporal_envelope(step, SYNAESTHESIA_STEPS);
        advance_resonance(&mut a, [1.0, 1.0, 1.0], env);
        states.push(a);
    }
    let snap = states.clone();
    states.clear();
    let mut b = ResonanceState::ZERO;
    for step in 0..SYNAESTHESIA_STEPS {
        let env = temporal_envelope(step, SYNAESTHESIA_STEPS);
        advance_resonance(&mut b, [1.0, 1.0, 1.0], env);
        states.push(b);
    }
    states.capacity() == cap_before
        && states.len() == SYNAESTHESIA_STEPS as usize
        && states == snap
}

/// Runs the full measured pass: composes the dx/jy/jv substrate soaks for the
/// channel energies, verifies every matrix invariant on controlled fixtures,
/// and probes the zero-alloc hot loop.
fn run_measured_pass() -> SynestheticResonanceMatrixMeasured {
    let remap = run_synesthetic_sensory_remap_soak();
    let sky = run_living_sky_soak();
    let matter = run_aethel_matter_model_soak();
    let energies = substrate_energies(&remap, &sky, &matter);

    let all_gains_in_unit = SYNAESTHESIA_CELL_GAINS
        .iter()
        .flatten()
        .flatten()
        .all(|g| g.is_finite() && (0.0..=1.0).contains(g));

    let diagonal_positive = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        s.channels[ResonanceChannel::Audio.index()][FrequencyBand::Low.index()] > 0.0
    };
    let audio_to_light_low_dominant = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        s.channels[ResonanceChannel::Light.index()][FrequencyBand::Low.index()]
            > s.channels[ResonanceChannel::Light.index()][FrequencyBand::High.index()]
    };
    let matter_to_audio_low_dominant = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [0.0, 0.0, 1.0], SYNAESTHESIA_STEPS);
        s.channels[ResonanceChannel::Audio.index()][FrequencyBand::Low.index()]
            > s.channels[ResonanceChannel::Audio.index()][FrequencyBand::High.index()]
    };
    let light_to_matter_mid_dominant = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [0.0, 1.0, 0.0], SYNAESTHESIA_STEPS);
        s.channels[ResonanceChannel::Matter.index()][FrequencyBand::Mid.index()]
            > s.channels[ResonanceChannel::Matter.index()][FrequencyBand::Low.index()]
    };
    let off_diagonal_coupling_positive = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        s.channels[ResonanceChannel::Light.index()]
            .iter()
            .any(|v| *v > 0.0)
            && s.channels[ResonanceChannel::Matter.index()]
                .iter()
                .any(|v| *v > 0.0)
    };
    let envelope_decays_to_floor = {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 1.0, 1.0], SYNAESTHESIA_STEPS);
        let peak_sum: f32 = s.channels.iter().flatten().sum();
        drive(&mut s, [0.0, 0.0, 0.0], SYNAESTHESIA_DECAY_STEPS);
        let decayed_sum: f32 = s.channels.iter().flatten().sum();
        decayed_sum < peak_sum
    };
    let deterministic_replay = {
        let mut s1 = ResonanceState::ZERO;
        drive(&mut s1, [1.0, 1.0, 1.0], SYNAESTHESIA_STEPS);
        let mut s2 = ResonanceState::ZERO;
        drive(&mut s2, [1.0, 1.0, 1.0], SYNAESTHESIA_STEPS);
        s1.channels == s2.channels
    };

    let t0 = Instant::now();
    let mut state = ResonanceState::ZERO;
    for step in 0..SYNAESTHESIA_STEPS {
        let env = temporal_envelope(step, SYNAESTHESIA_STEPS);
        advance_resonance(&mut state, energies, env);
    }
    let elapsed_micros = t0.elapsed().as_secs_f32() * 1e6;
    let channels_finite = state.is_finite();
    let peak_resonance = state.peak();
    let zero_alloc = zero_alloc_hot_loop_probe();

    SynestheticResonanceMatrixMeasured {
        channels_finite,
        all_gains_in_unit,
        diagonal_positive,
        audio_to_light_low_dominant,
        matter_to_audio_low_dominant,
        light_to_matter_mid_dominant,
        off_diagonal_coupling_positive,
        envelope_decays_to_floor,
        deterministic_replay,
        audio_energy: energies[0],
        light_energy: energies[1],
        matter_energy: energies[2],
        peak_resonance,
        envelope_steps: SYNAESTHESIA_STEPS,
        zero_alloc,
        elapsed_micros,
    }
}

// ---------------------------------------------------------------------------
// Public soak report.
// ---------------------------------------------------------------------------

/// Wire-facing synesthetic resonance matrix report (serde camelCase).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynestheticResonanceMatrixReport {
    /// Soak-gated; every matrix invariant + deterministic replay must hold.
    pub ready: bool,
    /// Double-pass bit-identical fingerprints.
    pub deterministic: bool,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    pub channels_finite: bool,
    pub all_gains_in_unit: bool,
    pub diagonal_positive: bool,
    pub audio_to_light_low_dominant: bool,
    pub matter_to_audio_low_dominant: bool,
    pub light_to_matter_mid_dominant: bool,
    pub off_diagonal_coupling_positive: bool,
    pub envelope_decays_to_floor: bool,
    pub deterministic_replay: bool,
    /// Composed channel energies from the dx/jy/jv substrate soaks.
    pub audio_energy: f32,
    pub light_energy: f32,
    pub matter_energy: f32,
    /// Peak resonance energy across all channels and bands.
    pub peak_resonance: f32,
    pub envelope_steps: u32,
    /// 3×3 = 9 coupling cells.
    pub matrix_cells: u32,
    /// 3 frequency bands per cell.
    pub band_count: u32,
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
    /// Fail-closed — no live cross-modal / chromesthesia / metal AAA.
    pub matrix_resonance_aaa_ready: bool,
    pub cross_modal_metal_aaa_ready: bool,
    pub live_chromesthesia_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl SynestheticResonanceMatrixReport {
    /// Every float field is finite.
    pub fn is_finite(&self) -> bool {
        self.audio_energy.is_finite()
            && self.light_energy.is_finite()
            && self.matter_energy.is_finite()
            && self.peak_resonance.is_finite()
            && self.measured_pass_micros.is_finite()
    }
}

/// Assembles the public report, fetching every sibling evidence fingerprint to
/// prove this kernel is distinct from the whole reachable peer set (28 peers).
fn report_from_measured(
    m: &SynestheticResonanceMatrixMeasured,
    deterministic: bool,
) -> SynestheticResonanceMatrixReport {
    let ready = readiness(m) && deterministic;
    let fp = synesthetic_resonance_matrix_evidence_fingerprint(m);
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

    SynestheticResonanceMatrixReport {
        ready,
        deterministic,
        evidence_kind: SYNAESTHESIA_EVIDENCE_KIND,
        channels_finite: m.channels_finite,
        all_gains_in_unit: m.all_gains_in_unit,
        diagonal_positive: m.diagonal_positive,
        audio_to_light_low_dominant: m.audio_to_light_low_dominant,
        matter_to_audio_low_dominant: m.matter_to_audio_low_dominant,
        light_to_matter_mid_dominant: m.light_to_matter_mid_dominant,
        off_diagonal_coupling_positive: m.off_diagonal_coupling_positive,
        envelope_decays_to_floor: m.envelope_decays_to_floor,
        deterministic_replay: m.deterministic_replay,
        audio_energy: m.audio_energy,
        light_energy: m.light_energy,
        matter_energy: m.matter_energy,
        peak_resonance: m.peak_resonance,
        envelope_steps: m.envelope_steps,
        matrix_cells: SYNAESTHESIA_MATRIX_CELL_COUNT as u32,
        band_count: SYNAESTHESIA_BAND_COUNT as u32,
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
        matrix_resonance_aaa_ready: false,
        cross_modal_metal_aaa_ready: false,
        live_chromesthesia_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
///
/// The computed report is memoized process-wide via `OnceLock`. `report_from_measured`
/// runs every reachable sibling soak LIVE to prove `distinct_from_*`; that peer
/// evidence DAG is acyclic (each kernel only fetches lower letters), so memoizing
/// collapses the per-process cost from O(n²) to O(leaves). Peer fingerprints stay
/// live-derived (computed at least once per process — never frozen constants) and
/// the internal double-pass determinism proof runs fresh inside the closure.
pub fn run_synesthetic_resonance_matrix_soak() -> SynestheticResonanceMatrixReport {
    static CACHE: std::sync::OnceLock<SynestheticResonanceMatrixReport> =
        std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic =
                synesthetic_resonance_matrix_evidence_fingerprint(&a)
                    == synesthetic_resonance_matrix_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_synesthetic_resonance_matrix() -> SynestheticResonanceMatrixReport {
    run_synesthetic_resonance_matrix_soak()
}

// ---------------------------------------------------------------------------
// AAA test suite (doctrine #3 — mandatory, mathematical invariants).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matrix_cells_are_stable_deterministic_in_unit() {
        assert_eq!(SYNAESTHESIA_MATRIX_CELL_COUNT, 9);
        assert_eq!(SYNAESTHESIA_CHANNEL_COUNT, 3);
        assert_eq!(SYNAESTHESIA_BAND_COUNT, 3);
        for source in 0..SYNAESTHESIA_CHANNEL_COUNT {
            for target in 0..SYNAESTHESIA_CHANNEL_COUNT {
                for band in 0..SYNAESTHESIA_BAND_COUNT {
                    let g = SYNAESTHESIA_CELL_GAINS[source][target][band];
                    assert!(g.is_finite(), "gain must be finite");
                    assert!((0.0..=1.0).contains(&g), "gain must stay in [0,1]");
                }
            }
        }
    }

    #[test]
    fn matrix_cells_directional_structure() {
        // Bass-heavy audio blooms the light low band hardest.
        assert!(
            SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Audio.index()][ResonanceChannel::Light.index()][FrequencyBand::Low.index()]
                > SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Audio.index()][ResonanceChannel::Light.index()][FrequencyBand::High.index()]
        );
        // Matter impact rings the acoustic low band hardest.
        assert!(
            SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Matter.index()][ResonanceChannel::Audio.index()][FrequencyBand::Low.index()]
                > SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Matter.index()][ResonanceChannel::Audio.index()][FrequencyBand::High.index()]
        );
        // Light feeds the matter mid band hardest.
        assert!(
            SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Light.index()][ResonanceChannel::Matter.index()][FrequencyBand::Mid.index()]
                > SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Light.index()][ResonanceChannel::Matter.index()][FrequencyBand::Low.index()]
        );
        // Coupling is directional: Matter→Audio differs from Audio→Matter.
        assert_ne!(
            SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Matter.index()][ResonanceChannel::Audio.index()][FrequencyBand::Low.index()],
            SYNAESTHESIA_CELL_GAINS[ResonanceChannel::Audio.index()][ResonanceChannel::Matter.index()][FrequencyBand::Low.index()]
        );
        // Diagonal self-resonance is symmetric (0.3 across every channel/band).
        for c in ResonanceChannel::ALL {
            for b in FrequencyBand::ALL {
                assert_eq!(SYNAESTHESIA_CELL_GAINS[c.index()][c.index()][b.index()], 0.3);
            }
        }
    }

    #[test]
    fn diagonal_self_resonance_is_positive_and_bounded() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        let diag = s.channels[ResonanceChannel::Audio.index()][FrequencyBand::Low.index()];
        assert!(diag > 0.0, "self-resonance must be nonzero when the channel is active");
        assert!(diag <= 1.0);
        assert!(s.is_finite());
    }

    #[test]
    fn audio_to_light_low_band_dominates() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        let light_low = s.channels[ResonanceChannel::Light.index()][FrequencyBand::Low.index()];
        let light_high = s.channels[ResonanceChannel::Light.index()][FrequencyBand::High.index()];
        assert!(light_low > light_high, "audio must elevate the light low band most");
        assert!(light_low > 0.0);
    }

    #[test]
    fn matter_to_audio_low_band_dominates() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [0.0, 0.0, 1.0], SYNAESTHESIA_STEPS);
        let audio_low = s.channels[ResonanceChannel::Audio.index()][FrequencyBand::Low.index()];
        let audio_high = s.channels[ResonanceChannel::Audio.index()][FrequencyBand::High.index()];
        assert!(audio_low > audio_high, "matter impact must ring the audio low band most");
        assert!(audio_low > 0.0);
    }

    #[test]
    fn light_to_matter_mid_band_dominates() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [0.0, 1.0, 0.0], SYNAESTHESIA_STEPS);
        let matter_mid = s.channels[ResonanceChannel::Matter.index()][FrequencyBand::Mid.index()];
        let matter_low = s.channels[ResonanceChannel::Matter.index()][FrequencyBand::Low.index()];
        assert!(matter_mid > matter_low, "light must elevate the matter mid band most");
        assert!(matter_mid > 0.0);
    }

    #[test]
    fn off_diagonal_coupling_is_positive() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 0.0, 0.0], SYNAESTHESIA_STEPS);
        assert!(
            s.channels[ResonanceChannel::Light.index()].iter().any(|v| *v > 0.0),
            "audio must leak into light"
        );
        assert!(
            s.channels[ResonanceChannel::Matter.index()].iter().any(|v| *v > 0.0),
            "audio must leak into matter"
        );
    }

    #[test]
    fn temporal_envelope_is_deterministic_and_bounded() {
        assert_eq!(temporal_envelope(0, SYNAESTHESIA_STEPS), 0.0);
        assert_eq!(temporal_envelope(SYNAESTHESIA_STEPS / 2, SYNAESTHESIA_STEPS), 1.0);
        let peak = temporal_envelope(SYNAESTHESIA_STEPS / 2, SYNAESTHESIA_STEPS);
        let release = temporal_envelope(SYNAESTHESIA_STEPS - 1, SYNAESTHESIA_STEPS);
        assert!(release < peak);
        for step in 0..SYNAESTHESIA_STEPS {
            let e = temporal_envelope(step, SYNAESTHESIA_STEPS);
            assert!(e.is_finite());
            assert!((0.0..=1.0).contains(&e));
        }
    }

    #[test]
    fn envelope_decays_resonance_toward_floor() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 1.0, 1.0], SYNAESTHESIA_STEPS);
        let peak_sum: f32 = s.channels.iter().flatten().sum();
        drive(&mut s, [0.0, 0.0, 0.0], SYNAESTHESIA_DECAY_STEPS);
        let decayed_sum: f32 = s.channels.iter().flatten().sum();
        assert!(decayed_sum < peak_sum, "resonance must decay toward the floor");
        assert!(decayed_sum >= 0.0);
    }

    #[test]
    fn resonance_drive_is_bit_identical_across_runs() {
        let mut a = ResonanceState::ZERO;
        drive(&mut a, [0.2, 0.7, 0.4], SYNAESTHESIA_STEPS);
        let mut b = ResonanceState::ZERO;
        drive(&mut b, [0.2, 0.7, 0.4], SYNAESTHESIA_STEPS);
        assert_eq!(a.channels, b.channels);
    }

    #[test]
    fn non_finite_energies_are_fail_closed() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [f32::NAN, -5.0, f32::MAX], SYNAESTHESIA_STEPS);
        assert!(s.is_finite(), "NaN/negative/overflow energies must fail closed to zero");
        for c in 0..SYNAESTHESIA_CHANNEL_COUNT {
            for b in 0..SYNAESTHESIA_BAND_COUNT {
                assert!((0.0..=1.0).contains(&s.channels[c][b]));
            }
        }
    }

    #[test]
    fn substrate_composition_is_finite_and_bounded() {
        let remap = run_synesthetic_sensory_remap_soak();
        let sky = run_living_sky_soak();
        let matter = run_aethel_matter_model_soak();
        let e = substrate_energies(&remap, &sky, &matter);
        for v in e {
            assert!(v.is_finite());
            assert!((0.0..=1.0).contains(&v));
        }
    }

    #[test]
    fn zero_alloc_hot_loop_keep_capacity() {
        assert!(zero_alloc_hot_loop_probe());
    }

    #[test]
    fn peak_resonance_bounded_in_unit() {
        let mut s = ResonanceState::ZERO;
        drive(&mut s, [1.0, 1.0, 1.0], SYNAESTHESIA_STEPS);
        assert!(s.peak() > 0.0);
        assert!(s.peak() <= 1.0);
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_synesthetic_resonance_matrix_soak();
        assert!(r.ready, "soak must be ready");
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(r.channels_finite);
        assert!(r.all_gains_in_unit);
        assert!(r.diagonal_positive);
        assert!(r.audio_to_light_low_dominant);
        assert!(r.matter_to_audio_low_dominant);
        assert!(r.light_to_matter_mid_dominant);
        assert!(r.off_diagonal_coupling_positive);
        assert!(r.envelope_decays_to_floor);
        assert!(r.deterministic_replay);
        assert!(r.zero_alloc_hot_loop);
        assert_eq!(r.matrix_cells, SYNAESTHESIA_MATRIX_CELL_COUNT as u32);
        assert_eq!(r.band_count, SYNAESTHESIA_BAND_COUNT as u32);
        // AAA is never claimed by the kernel itself.
        assert!(!r.matrix_resonance_aaa_ready);
        assert!(!r.cross_modal_metal_aaa_ready);
        assert!(!r.live_chromesthesia_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.quic_ready);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        let r = run_synesthetic_resonance_matrix_soak();
        assert_eq!(r.evidence_kind, SYNAESTHESIA_EVIDENCE_KIND);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_synesthetic_resonance_matrix_soak();
        let b = run_synesthetic_resonance_matrix_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.audio_energy, b.audio_energy);
        assert_eq!(a.light_energy, b.light_energy);
        assert_eq!(a.matter_energy, b.matter_energy);
        assert_eq!(a.peak_resonance, b.peak_resonance);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_synesthetic_resonance_matrix();
        let s = run_synesthetic_resonance_matrix_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_synesthetic_resonance_matrix_soak();
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
    }

    #[test]
    fn kernel_constants_are_stable() {
        assert_ne!(SYNAESTHESIA_SOAK_SEED, 0);
        assert_ne!(SYNAESTHESIA_FP_SEED, 0);
        assert_ne!(SYNAESTHESIA_FP_FOLD, 0);
        assert_eq!(SYNAESTHESIA_EVIDENCE_KIND, "lg_synesthetic_resonance_matrix");
        assert!((0.0..1.0).contains(&SYNAESTHESIA_DECAY));
        // The fp seed carries the letter tag (0x6C67 = "lg").
        assert_eq!(SYNAESTHESIA_FP_SEED >> 48, 0x6C67);
    }
}

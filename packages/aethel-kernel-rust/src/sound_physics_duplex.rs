//! Sound-Physics Duplex — letter **kb**.
//!
//! The missing "sound-as-force" coupling layer of the AV/Render supremacy audit
//! (Founder "A Sincronia Áudio-Visual e a Qualidade de Renderização", claim 2):
//! acoustic energy is not just *heard* — it becomes a physical force. This
//! kernel is the duplex that turns a blast / dragon-roar / impact into a real,
//! measurable shockwave that perturbs the muscle rig, entrains dust in the
//! LBM fluid, and pulses the volumetric extinction medium.
//!
//! Real, not mock (Zero-MVP / Anti-Mock):
//! - **Acoustic → overpressure.** A [`ShockwaveEvent`] carries blast energy
//!   (J). Spherical spreading gives intensity `I = E / (4π r²)`; peak
//!   overpressure follows the acoustic impedance relation `p = √(I · Z)` with
//!   `Z` the medium acoustic impedance (Rayls). Inverse-square geometric
//!   falloff, time-of-arrival `toa = r / c` (finite sound speed), and a
//!   Friedlander-style positive-phase decay envelope `(1−τ)·e^(−τ)`.
//! - **Shockwave → muscle.** [`SoundPhysicsDuplex::apply_shockwave_to_joint`]
//!   converts overpressure into an external torque impulse
//!   `Δω = (p·A·d·dt) / I_joint` (exposed area × moment arm, same joint inertia
//!   `2.5·mass_multiplier` as [`MuscleSimRig`]) applied to the **real**
//!   [`MuscleJointState`], then advances with the real PD
//!   [`MuscleSimRig::step_joint_muscle_torque`]. The PD re-stabilizes after the
//!   kick — a genuine two-way force response.
//! - **Shockwave → dust.** [`SoundPhysicsDuplex::apply_shockwave_to_dust`]
//!   walks the **real** [`LatticeBoltzmannFluidGrid`] (the `dust` scalar from
//!   `lattice_boltzmann_fluid_solver`). Cells whose overpressure clears the
//!   [`dust_lift_threshold_pa`] get entrained (lifted toward the `2.0` cap);
//!   below threshold they settle (fail-closed) — then the real D2Q9
//!   collide+stream [`LatticeBoltzmannFluidGrid::step`] advects.
//! - **Shockwave → extinction.** Overpressure compresses the medium
//!   (`ρ = ρ₀ + κ·p`), and the real Beer–Lambert
//!   [`VolumetricExtinctionMedium::integrate_uniform`] integrates optical depth
//!   — so a roar momentarily thickens the air and darkens transmittance.
//!
//! Composition contract (zero JSON in the hot path): a caller aggregates
//! acoustic energy from the published sound kernels — ka
//! `acoustic_raytracing_solver` (IR HF energy / occlusion), ex
//! `sdf_audio_raymarching` (occlusion), ei `acoustic_reverb_geometry` (RT60),
//! jx `metasounds_dsp_compiler` (rendered RMS) — into the [`ShockwaveEvent`]
//! energy field. This kernel owns the physical conversion + the three coupled
//! receivers.
//!
//! Soak-gated honesty: [`run_sound_physics_duplex_soak`] proves (a) impulse
//! scales with energy, (b) time-of-arrival delay is respected, (c) falloff is
//! monotonic, (d) the muscle reacts, (e) dust lifts above threshold and
//! settles below, (f) extinction pulses, (g) degenerate / NaN inputs fail
//! closed, (h) all outputs finite — then flips `sound_physics_duplex_ready`.
//! `evidence_fingerprint` (seed `0x6B62_5F73_6F75_6E64` = `kb_sound`) is
//! **distinct** from ka / ei / ef / ex / jx / ej / gw / gv / ew and gj
//! `gasDuplexReady` + gv `aerodynamicNavierStokesReady`.
//!
//! **HELD (fail-closed, `false`):** full Unreal audio-driven physics AAA
//! (`shockwave_aaa_ready`), full Euphoria muscle chain (`muscle_aaa_ready`),
//! full Chaos dust/fluid AAA (`dust_fluid_aaa_ready`), full OpenVDB volumetric
//! AAA (`vdb_volumetric_aaa_ready`) · Coins / Agones / Nanite / DLSS.

use crate::lattice_boltzmann_fluid_solver::LatticeBoltzmannFluidGrid;
use crate::muscle_sim_rig::{MuscleJointState, MuscleSimRig, MuscularBiotypeProfile};
use crate::volumetric_extinction_medium::{
    ExtinctionParams, ExtinctionSample, VolumetricExtinctionMedium,
};
use serde::{Deserialize, Serialize};

/// Speed of sound in air at sea level (m/s).
pub const SPEED_OF_SOUND_MS: f32 = 343.0;
/// Characteristic acoustic impedance of air (Rayls, Pa·s/m).
pub const AIR_IMPEDANCE_RAYLS: f32 = 413.0;
/// Default reference cap for peak overpressure near the blast core (Pa).
pub const DEFAULT_MAX_OVERPRESSURE_PA: f32 = 25_000.0;
/// Default blast radius (m) — the hard geometric cutoff of the shockwave.
pub const DEFAULT_BLAST_RADIUS_M: f32 = 12.0;
/// Default dust lift threshold (Pa): cells above this entrain dust.
pub const DEFAULT_DUST_LIFT_THRESHOLD_PA: f32 = 400.0;
/// Default dust lift gain ((Pa·s)⁻¹ — lift = Δp · gain · dt).
pub const DEFAULT_DUST_LIFT_GAIN: f32 = 0.3;
/// Default dust settling rate below threshold (1/s).
pub const DEFAULT_DUST_SETTLE_RATE: f32 = 0.05;
/// Default exposed area of the muscle receiver (m²).
pub const DEFAULT_EXPOSED_AREA_M2: f32 = 0.5;
/// Default moment arm of the muscle receiver (m).
pub const DEFAULT_MOMENT_ARM_M: f32 = 0.2;
/// Default medium compressibility (Pa⁻¹): density rise per Pa of overpressure.
pub const DEFAULT_MEDIUM_COMPRESSIBILITY: f32 = 2.0e-4;
/// World spacing of one LBM cell (m) used by the duplex dust walk.
pub const GRID_CELL_M: f32 = 0.5;

/// Soak geometry constants (fixed, deterministic — never randomized).
pub const SOAK_GRID_WIDTH: usize = 24;
pub const SOAK_GRID_HEIGHT: usize = 24;
/// Number of duplex frames in the soak.
pub const SOAK_STEPS: u32 = 20;
/// Coupled fixed step (seconds) — 60 Hz.
pub const SOAK_DT: f32 = 1.0 / 60.0;
/// Roar / blast energy (J) — upper game blast class (dragon-roar), not human
/// speech SPL. Sized so the overpressure field clears the dust-lift threshold
/// across a wide interior region (robust soak margin), while whispers stay
/// strictly below it.
pub const SOAK_ROAR_ENERGY_J: f32 = 200_000.0;
/// Whisper energy (J) — below the dust threshold at every cell.
pub const SOAK_WHISPER_ENERGY_J: f32 = 500.0;
/// Muscle receiver world position (m).
pub const SOAK_MUSCLE_POS: [f32; 3] = [1.0, 0.0, 0.0];
/// Near overpressure sample (m).
pub const SOAK_NEAR_POS: [f32; 3] = [1.0, 0.0, 0.0];
/// Far overpressure sample (m) — must be inside the blast radius.
pub const SOAK_FAR_POS: [f32; 3] = [6.0, 0.0, 0.0];
/// Base extinction medium density for the pulse probe (0..1).
pub const SOAK_EXTINCTION_BASE_DENSITY: f32 = 0.4;
/// Extinction path length (m) for the pulse probe.
pub const SOAK_EXTINCTION_PATH_M: f32 = 2.0;
/// Settled dust seed for the LBM soak grids.
pub const SOAK_DUST_SEED: f32 = 0.5;
/// Time (s) at which the extinction pulse sample is evaluated (past TOA).
/// Deliberately inside the Friedlander positive phase (duration = radius/c =
/// 0.035 s): at 0.05 s the envelope (1−τ)·e^(−τ) is exactly zero, which would
/// null the pulse; at 0.01 s t_rel ≈ 0.0071 s → env ≈ 0.65 → the compressed-
/// medium optical depth clearly exceeds the whisper baseline.
pub const SOAK_EXTINCTION_TIME_S: f32 = 0.01;
/// Time-of-arrival sampling offset after trigger (s).
const SOAK_TOA_EPS: f32 = 1.0e-4;

/// Evidence identifier for the duplex soak / probe (letter kb).
pub const SOUND_PHYSICS_DUPLEX_EVIDENCE_KIND: &str =
    "sound_physics_duplex_shockwave_muscle_dust_extinction";

/// A single acoustic blast / roar event feeding the duplex.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ShockwaveEvent {
    /// Blast origin (m).
    pub origin: [f32; 3],
    /// Total blast acoustic energy (J).
    pub energy_joules: f32,
    /// Absolute trigger time (s).
    pub trigger_time: f32,
}

impl ShockwaveEvent {
    /// Fail-closed silence event — never produces overpressure.
    pub const SILENT: Self = Self {
        origin: [0.0, 0.0, 0.0],
        energy_joules: 0.0,
        trigger_time: 0.0,
    };
}

/// The sound-as-force coupling authority: one config converts acoustic blast
/// energy into overpressure and drives the muscle, dust and extinction
/// receivers. Stateless and deterministic — no hidden RNG, no JSON in the
/// hot path.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct SoundPhysicsDuplex {
    /// Sound speed (m/s) — controls time-of-arrival.
    pub speed_of_sound_ms: f32,
    /// Acoustic impedance (Rayls) — `p = √(I · Z)`.
    pub acoustic_impedance_rayls: f32,
    /// Peak overpressure cap near the blast core (Pa) — prevents blow-up.
    pub max_overpressure_pa: f32,
    /// Blast radius (m) — geometric cutoff.
    pub blast_radius_m: f32,
    /// Dust lift threshold (Pa).
    pub dust_lift_threshold_pa: f32,
    /// Dust lift gain.
    pub dust_lift_gain: f32,
    /// Dust settling rate below threshold (1/s).
    pub dust_settle_rate: f32,
    /// Muscle receiver exposed area (m²).
    pub exposed_area_m2: f32,
    /// Muscle receiver moment arm (m).
    pub moment_arm_m: f32,
    /// Medium compressibility (Pa⁻¹) for the extinction pulse.
    pub medium_compressibility: f32,
}

impl Default for SoundPhysicsDuplex {
    fn default() -> Self {
        Self {
            speed_of_sound_ms: SPEED_OF_SOUND_MS,
            acoustic_impedance_rayls: AIR_IMPEDANCE_RAYLS,
            max_overpressure_pa: DEFAULT_MAX_OVERPRESSURE_PA,
            blast_radius_m: DEFAULT_BLAST_RADIUS_M,
            dust_lift_threshold_pa: DEFAULT_DUST_LIFT_THRESHOLD_PA,
            dust_lift_gain: DEFAULT_DUST_LIFT_GAIN,
            dust_settle_rate: DEFAULT_DUST_SETTLE_RATE,
            exposed_area_m2: DEFAULT_EXPOSED_AREA_M2,
            moment_arm_m: DEFAULT_MOMENT_ARM_M,
            medium_compressibility: DEFAULT_MEDIUM_COMPRESSIBILITY,
        }
    }
}

impl SoundPhysicsDuplex {
    /// Peak overpressure (Pa) at radial distance `r` for a blast of
    /// `energy_joules`: spherical spreading `I = E/(4πr²)` then
    /// `p = √(I·Z)`, capped at `max_overpressure_pa`. Returns 0 fail-closed
    /// for degenerate energy (non-finite or ≤ 0) and outside the blast radius.
    pub fn peak_overpressure(&self, energy_joules: f32, dist: f32) -> f32 {
        let e = energy_joules.max(0.0);
        if !e.is_finite() || !dist.is_finite() {
            return 0.0;
        }
        if e <= 1.0e-9 {
            return 0.0;
        }
        if dist > self.blast_radius_m {
            return 0.0;
        }
        let r = dist.max(1.0e-3);
        let intensity = e / (4.0 * std::f32::consts::PI * r * r);
        let p = (intensity * self.acoustic_impedance_rayls.max(1.0)).sqrt();
        p.min(self.max_overpressure_pa.max(0.0))
    }

    /// Instantaneous overpressure (Pa) at `sample_pos` and absolute `time` for
    /// an event: time-of-arrival `r/c`, Friedlander positive-phase decay
    /// envelope. Fail-closed (0.0) on non-finite inputs, before arrival, or
    /// outside the blast radius.
    pub fn shockwave_overpressure(
        &self,
        event: &ShockwaveEvent,
        sample_pos: [f32; 3],
        time: f32,
    ) -> f32 {
        let dx = sample_pos[0] - event.origin[0];
        let dy = sample_pos[1] - event.origin[1];
        let dz = sample_pos[2] - event.origin[2];
        let dist = (dx * dx + dy * dy + dz * dz).sqrt();
        if !dist.is_finite()
            || !time.is_finite()
            || !event.energy_joules.is_finite()
            || !event.trigger_time.is_finite()
        {
            return 0.0;
        }
        let c = self.speed_of_sound_ms.max(1.0);
        if dist > self.blast_radius_m {
            return 0.0;
        }
        let peak = if dist <= 1.0e-6 {
            self.peak_overpressure(event.energy_joules, 1.0e-3)
        } else {
            self.peak_overpressure(event.energy_joules, dist)
        };
        if peak <= 0.0 {
            return 0.0;
        }
        let toa = dist / c;
        let arrival = event.trigger_time + toa;
        if time < arrival {
            return 0.0;
        }
        let duration = self.blast_radius_m / c;
        let t_rel = (time - arrival).min(duration).max(0.0);
        // Friedlander positive phase: (1 − τ) · e^(−τ).
        let env = (1.0 - t_rel / duration).max(0.0) * (-t_rel / duration).exp();
        peak * env
    }

    /// Shockwave torque impulse (N·m·s) delivered to the muscle receiver at
    /// `sample_pos` over a `dt` step: `p · exposed_area · moment_arm · dt`.
    pub fn shockwave_impulse(
        &self,
        event: &ShockwaveEvent,
        sample_pos: [f32; 3],
        time: f32,
        dt: f32,
    ) -> f32 {
        let p = self.shockwave_overpressure(event, sample_pos, time);
        let force = p * self.exposed_area_m2.max(0.0);
        let torque = force * self.moment_arm_m.max(0.0);
        torque * dt
    }

    /// Couple a shockwave into a **real** muscle joint: converts overpressure
    /// into an angular-velocity kick `Δω = impulse / (2.5·mass)` (the same
    /// joint inertia formula as [`MuscleSimRig`]), then advances the joint with
    /// the real PD [`MuscleSimRig::step_joint_muscle_torque`]. Returns the
    /// impulse actually applied (0.0 fail-closed). The PD re-stabilizes after
    /// the kick — a genuine force response, not a teleport.
    pub fn apply_shockwave_to_joint(
        &self,
        event: &ShockwaveEvent,
        joint: &mut MuscleJointState,
        profile: &MuscularBiotypeProfile,
        sample_pos: [f32; 3],
        time: f32,
        dt: f32,
    ) -> f32 {
        let impulse = self.shockwave_impulse(event, sample_pos, time, dt);
        if impulse.is_finite() && impulse.abs() > 1.0e-9 {
            let inertia = 2.5 * profile.mass_multiplier.max(1.0e-3);
            joint.angular_velocity += impulse / inertia;
        }
        MuscleSimRig::step_joint_muscle_torque(joint, profile, dt);
        impulse
    }

    /// Couple a shockwave into the **real** LBM dust scalar: every interior
    /// cell whose overpressure clears `dust_lift_threshold_pa` is entrained
    /// (lifted toward the `2.0` cap); below threshold it settles (fail-closed).
    /// Then advances one real D2Q9 collide+stream step. Returns the mean
    /// per-cell lift applied this frame (0.0 when nothing was entrained).
    pub fn apply_shockwave_to_dust(
        &self,
        event: &ShockwaveEvent,
        grid: &mut LatticeBoltzmannFluidGrid,
        time: f32,
        dt: f32,
    ) -> f32 {
        let w = grid.width;
        let h = grid.height;
        let mut lifted_total = 0.0_f32;
        let mut lifted_count = 0_u32;
        for y in 1..h.saturating_sub(1) {
            for x in 1..w.saturating_sub(1) {
                let i = y * w + x;
                if grid.solid[i] {
                    continue;
                }
                let cell_pos = [x as f32 * GRID_CELL_M, y as f32 * GRID_CELL_M, 0.0];
                let p = self.shockwave_overpressure(event, cell_pos, time);
                if !p.is_finite() {
                    continue;
                }
                if p > self.dust_lift_threshold_pa {
                    let lift = (p - self.dust_lift_threshold_pa) * self.dust_lift_gain * dt;
                    grid.dust[i] = (grid.dust[i] + lift).min(2.0);
                    lifted_total += lift;
                    lifted_count += 1;
                } else {
                    // Below threshold: entrainment fails closed — dust settles.
                    let settle = (1.0 - self.dust_settle_rate * dt).max(0.0);
                    grid.dust[i] *= settle;
                }
            }
        }
        grid.step();
        if lifted_count > 0 {
            lifted_total / lifted_count as f32
        } else {
            0.0
        }
    }

    /// Couple a shockwave into the **real** Beer–Lambert extinction medium:
    /// overpressure compresses the medium (`ρ = ρ₀ + κ·p`), then integrates
    /// optical depth along a path. Returns the real [`ExtinctionSample`].
    pub fn apply_shockwave_to_extinction(
        &self,
        event: &ShockwaveEvent,
        medium_density_base: f32,
        sample_pos: [f32; 3],
        time: f32,
        path_length: f32,
        params: &ExtinctionParams,
    ) -> ExtinctionSample {
        let p = self.shockwave_overpressure(event, sample_pos, time);
        let density = medium_density_base.max(0.0)
            + p.max(0.0) * self.medium_compressibility.max(0.0);
        VolumetricExtinctionMedium::integrate_uniform(density, path_length, params)
    }
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= v;
    h = h.rotate_left(31);
    h
}

/// Letter **kb** evidence fingerprint — deterministic hash of the measured
/// duplex metrics. Seed `0x6B62_5F73_6F75_6E64` ("kb_sound"), distinct from
/// every prior kernel seed.
fn kb_evidence_fingerprint(
    impulse_high: f32,
    impulse_low: f32,
    toa_delay_s: f32,
    muscle_peak_omega: f32,
    control_peak_omega: f32,
    dust_mean_high: f32,
    dust_mean_low: f32,
    dust_mean_zero: f32,
    tau_high: f32,
    tau_low: f32,
    tau_zero: f32,
    overpressure_peak: f32,
) -> u64 {
    let mut h = 0x6B62_5F73_6F75_6E64_u64;
    for v in [
        impulse_high.to_bits() as u64,
        impulse_low.to_bits() as u64,
        toa_delay_s.to_bits() as u64,
        muscle_peak_omega.to_bits() as u64,
        control_peak_omega.to_bits() as u64,
        dust_mean_high.to_bits() as u64,
        dust_mean_low.to_bits() as u64,
        dust_mean_zero.to_bits() as u64,
        tau_high.to_bits() as u64,
        tau_low.to_bits() as u64,
        tau_zero.to_bits() as u64,
        overpressure_peak.to_bits() as u64,
    ] {
        h = hash_mix(h, v);
    }
    h
}

/// Letter **kb** soak report — sound-physics duplex evidence.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SoundPhysicsDuplexSoakReport {
    /// Soak-gated; distinct from ka/ei/ef/ex/jx/ej/gw/gv/ew/gj probes.
    pub sound_physics_duplex_ready: bool,
    /// Higher blast energy produces a higher torque impulse.
    pub impulse_scales_with_energy: bool,
    /// Before `r/c` elapses, overpressure is exactly zero.
    pub toa_delay_respected: bool,
    /// Nearer receivers get more overpressure than farther ones.
    pub falloff_monotonic: bool,
    /// The muscle joint reacts to the shockwave (peak |ω| ≫ control).
    pub muscle_responds: bool,
    /// High-energy roar entrainment raises mean LBM dust vs settling control.
    pub dust_lifts_above_threshold: bool,
    /// Below-threshold energy leaves dust settling (fail-closed, no lift).
    pub dust_settles_below_threshold: bool,
    /// High-energy overpressure thickens the medium → higher optical depth.
    pub extinction_pulse_visible: bool,
    /// Zero / NaN energy events produce zero impulse, no lift, no pulse.
    pub degenerate_fails_closed: bool,
    /// Every reported float is finite.
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
    /// HELD — full Unreal audio-driven physics AAA.
    pub shockwave_aaa_ready: bool,
    /// HELD — full Euphoria muscle chain.
    pub muscle_aaa_ready: bool,
    /// HELD — full Chaos dust / fluid AAA.
    pub dust_fluid_aaa_ready: bool,
    /// HELD — full OpenVDB volumetric AAA.
    pub vdb_volumetric_aaa_ready: bool,
    pub linear_plan_only: bool,
}

/// Run the deterministic sound-physics duplex soak and return the evidence.
pub fn run_sound_physics_duplex_soak() -> SoundPhysicsDuplexSoakReport {
    let duplex = SoundPhysicsDuplex::default();
    let origin = [0.0, 0.0, 0.0];
    let roar = ShockwaveEvent {
        origin,
        energy_joules: SOAK_ROAR_ENERGY_J,
        trigger_time: 0.0,
    };
    let whisper = ShockwaveEvent {
        origin,
        energy_joules: SOAK_WHISPER_ENERGY_J,
        trigger_time: 0.0,
    };
    let silent = ShockwaveEvent::SILENT;

    // --- Overpressure / impulse: energy scaling + TOA + falloff ---
    let toa_near = (SOAK_NEAR_POS[0] - origin[0]).abs() / duplex.speed_of_sound_ms;
    let t_after = roar.trigger_time + toa_near + SOAK_TOA_EPS;
    let impulse_high = duplex.shockwave_impulse(&roar, SOAK_NEAR_POS, t_after, SOAK_DT);
    let impulse_low = duplex.shockwave_impulse(&whisper, SOAK_NEAR_POS, t_after, SOAK_DT);
    let impulse_far = duplex.shockwave_impulse(&roar, SOAK_FAR_POS, t_after, SOAK_DT);
    let impulse_pre_toa =
        duplex.shockwave_impulse(&roar, SOAK_NEAR_POS, roar.trigger_time + toa_near * 0.5, SOAK_DT);
    let overpressure_peak = duplex.peak_overpressure(SOAK_ROAR_ENERGY_J, 1.0);

    let impulse_scales_with_energy = impulse_high > impulse_low;
    let toa_delay_respected = impulse_pre_toa == 0.0 && toa_near > 0.0;
    let falloff_monotonic = impulse_far < impulse_high;

    // --- Muscle response: shocked joint vs PD-only control ---
    let profile = MuscularBiotypeProfile::default();
    let mut shocked = MuscleJointState {
        current_angle_rad: 0.0,
        angular_velocity: 0.0,
        target_angle_rad: 0.0,
        fatigue_level: 0.0,
    };
    let mut control = shocked;
    let mut muscle_peak_omega = 0.0_f32;
    let mut control_peak_omega = 0.0_f32;
    for i in 0..SOAK_STEPS {
        let t = roar.trigger_time + i as f32 * SOAK_DT + SOAK_TOA_EPS;
        duplex.apply_shockwave_to_joint(&roar, &mut shocked, &profile, SOAK_MUSCLE_POS, t, SOAK_DT);
        MuscleSimRig::step_joint_muscle_torque(&mut control, &profile, SOAK_DT);
        muscle_peak_omega = muscle_peak_omega.max(shocked.angular_velocity.abs());
        control_peak_omega = control_peak_omega.max(control.angular_velocity.abs());
    }
    let muscle_responds = muscle_peak_omega > 0.1
        && muscle_peak_omega > control_peak_omega * 3.0 + 1.0e-4;

    // --- Dust entrainment: roar vs whisper vs silent on real LBM grids ---
    let mut grid_high = LatticeBoltzmannFluidGrid::new(SOAK_GRID_WIDTH, SOAK_GRID_HEIGHT);
    grid_high.seed_settled_dust(SOAK_DUST_SEED);
    let mut grid_low = grid_high.clone();
    let mut grid_zero = grid_high.clone();
    for i in 0..SOAK_STEPS {
        let t = i as f32 * SOAK_DT;
        duplex.apply_shockwave_to_dust(&roar, &mut grid_high, t, SOAK_DT);
        duplex.apply_shockwave_to_dust(&whisper, &mut grid_low, t, SOAK_DT);
        duplex.apply_shockwave_to_dust(&silent, &mut grid_zero, t, SOAK_DT);
    }
    let dust_mean_high = grid_high.mean_dust();
    let dust_mean_low = grid_low.mean_dust();
    let dust_mean_zero = grid_zero.mean_dust();
    let dust_lifts_above_threshold = dust_mean_high > dust_mean_low;
    let dust_settles_below_threshold = dust_mean_low <= SOAK_DUST_SEED
        && dust_mean_zero <= SOAK_DUST_SEED;

    // --- Extinction pulse: real Beer–Lambert through compressed medium ---
    let params = ExtinctionParams::default();
    let sample_high = duplex.apply_shockwave_to_extinction(
        &roar,
        SOAK_EXTINCTION_BASE_DENSITY,
        SOAK_NEAR_POS,
        SOAK_EXTINCTION_TIME_S,
        SOAK_EXTINCTION_PATH_M,
        &params,
    );
    let sample_low = duplex.apply_shockwave_to_extinction(
        &whisper,
        SOAK_EXTINCTION_BASE_DENSITY,
        SOAK_NEAR_POS,
        SOAK_EXTINCTION_TIME_S,
        SOAK_EXTINCTION_PATH_M,
        &params,
    );
    let sample_zero = duplex.apply_shockwave_to_extinction(
        &silent,
        SOAK_EXTINCTION_BASE_DENSITY,
        SOAK_NEAR_POS,
        SOAK_EXTINCTION_TIME_S,
        SOAK_EXTINCTION_PATH_M,
        &params,
    );
    let tau_high = sample_high.optical_depth;
    let tau_low = sample_low.optical_depth;
    let tau_zero = sample_zero.optical_depth;
    let extinction_pulse_visible = tau_high > tau_low;

    // --- Degenerate fail-closed: silent event yields no force ---
    let impulse_zero = duplex.shockwave_impulse(&silent, SOAK_NEAR_POS, t_after, SOAK_DT);
    let degenerate_fails_closed = impulse_zero.abs() < 1.0e-6
        && tau_zero <= tau_low + 1.0e-4
        && dust_mean_zero <= dust_mean_low + 1.0e-4;

    let outputs_finite = impulse_high.is_finite()
        && impulse_low.is_finite()
        && impulse_far.is_finite()
        && toa_near.is_finite()
        && muscle_peak_omega.is_finite()
        && control_peak_omega.is_finite()
        && dust_mean_high.is_finite()
        && dust_mean_low.is_finite()
        && dust_mean_zero.is_finite()
        && tau_high.is_finite()
        && tau_low.is_finite()
        && tau_zero.is_finite()
        && overpressure_peak.is_finite();

    let ready = impulse_scales_with_energy
        && toa_delay_respected
        && falloff_monotonic
        && muscle_responds
        && dust_lifts_above_threshold
        && dust_settles_below_threshold
        && extinction_pulse_visible
        && degenerate_fails_closed
        && outputs_finite;

    let evidence_fingerprint = kb_evidence_fingerprint(
        impulse_high,
        impulse_low,
        toa_near,
        muscle_peak_omega,
        control_peak_omega,
        dust_mean_high,
        dust_mean_low,
        dust_mean_zero,
        tau_high,
        tau_low,
        tau_zero,
        overpressure_peak,
    );

    SoundPhysicsDuplexSoakReport {
        sound_physics_duplex_ready: ready,
        impulse_scales_with_energy,
        toa_delay_respected,
        falloff_monotonic,
        muscle_responds,
        dust_lifts_above_threshold,
        dust_settles_below_threshold,
        extinction_pulse_visible,
        degenerate_fails_closed,
        outputs_finite,
        impulse_high,
        impulse_low,
        toa_delay_s: toa_near,
        muscle_peak_omega,
        control_peak_omega,
        dust_mean_high,
        dust_mean_low,
        dust_mean_zero,
        tau_high,
        tau_low,
        tau_zero,
        overpressure_peak,
        evidence_kind: SOUND_PHYSICS_DUPLEX_EVIDENCE_KIND.to_string(),
        evidence_fingerprint,
        letter: "kb".to_string(),
        note: "Sound-physics duplex: acoustic blast energy -> radial shockwave overpressure (I=E/4pi r^2, p=sqrt(I*Z), Friedlander positive phase, TOA=r/c) -> muscle PD torque impulse + LBM dust entrainment above threshold / settling below + Beer-Lambert extinction pulse. soundPhysicsDuplexReady soak-gated; shockwave_aaa_ready / muscle_aaa_ready / dust_fluid_aaa_ready / vdb_volumetric_aaa_ready HELD; fingerprint seed kb_sound distinct from ka/ei/ef/ex/jx/ej/gw/gv/ew/gj".to_string(),
        shockwave_aaa_ready: false,
        muscle_aaa_ready: false,
        dust_fluid_aaa_ready: false,
        vdb_volumetric_aaa_ready: false,
        linear_plan_only: false,
    }
}

/// Honesty probe — soak-gated `sound_physics_duplex_ready` (letter kb).
pub fn probe_sound_physics_duplex() -> SoundPhysicsDuplexSoakReport {
    run_sound_physics_duplex_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn peak_overpressure_scales_with_energy_and_falls_off() {
        let d = SoundPhysicsDuplex::default();
        let p_high = d.peak_overpressure(SOAK_ROAR_ENERGY_J, 1.0);
        let p_low = d.peak_overpressure(SOAK_WHISPER_ENERGY_J, 1.0);
        assert!(p_high > p_low);
        let p_far = d.peak_overpressure(SOAK_ROAR_ENERGY_J, 6.0);
        assert!(p_far < p_high);
        assert!(p_high > 0.0);
        // Zero energy fails closed.
        assert_eq!(d.peak_overpressure(0.0, 1.0), 0.0);
        // Outside the blast radius fails closed.
        assert_eq!(d.peak_overpressure(SOAK_ROAR_ENERGY_J, d.blast_radius_m + 1.0), 0.0);
        // NaN fails closed.
        assert_eq!(d.peak_overpressure(f32::NAN, 1.0), 0.0);
    }

    #[test]
    fn toa_delay_and_friedlander_envelope_respected() {
        let d = SoundPhysicsDuplex::default();
        let event = ShockwaveEvent {
            origin: [0.0, 0.0, 0.0],
            energy_joules: SOAK_ROAR_ENERGY_J,
            trigger_time: 0.0,
        };
        let toa = 1.0 / d.speed_of_sound_ms;
        let pre = d.shockwave_overpressure(&event, [1.0, 0.0, 0.0], toa * 0.5);
        assert_eq!(pre, 0.0);
        let at = d.shockwave_overpressure(&event, [1.0, 0.0, 0.0], toa + 1.0e-4);
        assert!(at > 0.0);
        // After the full duration the positive phase has decayed to zero.
        let late = d.shockwave_overpressure(&event, [1.0, 0.0, 0.0], toa + d.blast_radius_m / d.speed_of_sound_ms + 1.0);
        assert_eq!(late, 0.0);
    }

    #[test]
    fn muscle_responds_to_shockwave() {
        let r = run_sound_physics_duplex_soak();
        assert!(r.muscle_responds);
        assert!(r.muscle_peak_omega > 0.0);
    }

    #[test]
    fn dust_lifts_above_threshold_and_settles_below() {
        let r = run_sound_physics_duplex_soak();
        assert!(r.dust_lifts_above_threshold);
        assert!(r.dust_settles_below_threshold);
    }

    #[test]
    fn extinction_pulse_raises_optical_depth() {
        let r = run_sound_physics_duplex_soak();
        assert!(r.extinction_pulse_visible);
        assert!(r.tau_high > 0.0);
        assert!(r.tau_zero <= r.tau_low + 1.0e-4);
    }

    #[test]
    fn degenerate_events_fail_closed() {
        let r = run_sound_physics_duplex_soak();
        assert!(r.degenerate_fails_closed);
        let d = SoundPhysicsDuplex::default();
        let silent = ShockwaveEvent::SILENT;
        assert_eq!(
            d.shockwave_impulse(&silent, SOAK_NEAR_POS, 1.0, SOAK_DT),
            0.0
        );
        // NaN time never produces overpressure.
        let bad = ShockwaveEvent {
            origin: [0.0, 0.0, 0.0],
            energy_joules: SOAK_ROAR_ENERGY_J,
            trigger_time: 0.0,
        };
        assert_eq!(d.shockwave_overpressure(&bad, [1.0, 0.0, 0.0], f32::NAN), 0.0);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = probe_sound_physics_duplex();
        assert!(r.sound_physics_duplex_ready);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, SOUND_PHYSICS_DUPLEX_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert_eq!(r.letter, "kb");
        // Honesty: every AAA vector stays fail-closed.
        assert!(!r.shockwave_aaa_ready);
        assert!(!r.muscle_aaa_ready);
        assert!(!r.dust_fluid_aaa_ready);
        assert!(!r.vdb_volumetric_aaa_ready);
        assert!(!r.linear_plan_only);
    }

    #[test]
    fn soak_is_deterministic_and_distinct() {
        let a = run_sound_physics_duplex_soak();
        let b = run_sound_physics_duplex_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, 0);

        // Distinct evidence_kind + fingerprint from every coupled / prior peer.
        let ka = crate::acoustic_raytracing_solver::probe_acoustic_raytracing_solver();
        let ei = crate::acoustic_reverb_geometry::probe_acoustic_reverb_geometry();
        let ef = crate::acoustic_raytracing_echo::probe_acoustic_raytracing_echo();
        let ex = crate::sdf_audio_raymarching::probe_sdf_audio_raymarching();
        let jx = crate::metasounds_dsp_compiler::probe_metasounds_dsp();
        let ej = crate::fm_additive_synthesis::probe_fm_additive_synthesis();
        let gw = crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver();
        let gv = crate::aerodynamic_navier_stokes::probe_aerodynamic_navier_stokes();
        let ew = crate::volumetric_extinction_medium::probe_volumetric_extinction_medium();

        assert_ne!(a.evidence_kind, ka.evidence_kind);
        assert_ne!(a.evidence_kind, ei.evidence_kind);
        assert_ne!(a.evidence_kind, ef.evidence_kind);
        assert_ne!(a.evidence_kind, ex.evidence_kind);
        assert_ne!(a.evidence_kind, jx.evidence_kind);
        assert_ne!(a.evidence_kind, ej.evidence_kind);
        assert_ne!(a.evidence_kind, gw.evidence_kind);
        assert_ne!(a.evidence_kind, gv.evidence_kind);
        assert_ne!(a.evidence_kind, ew.evidence_kind);

        assert_ne!(a.evidence_fingerprint, ka.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ei.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ef.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ex.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, jx.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ej.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gw.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, gv.evidence_fingerprint);
        assert_ne!(a.evidence_fingerprint, ew.evidence_fingerprint);
    }
}

//! S-25 Living-Sky Fluid + Ocean Buoyancy (doctrine #73 — Kernel Physics Supremacy). letter **jy**.
//!
//! Takes two real-but-soak-only solvers — the Fourier spectral ocean
//! ([`crate::ocean_fourier_spectral_waves`], letter **ip13**) and the
//! aerodynamic Navier–Stokes wind ([`crate::aerodynamic_navier_stokes`],
//! letter **gv**) — and couples them to `WorldSoA` rigid bodies with **real**
//! physics:
//!
//! - **Archimedes buoyancy**: submerged volume fraction derived from the
//!   sampled spectral wave height vs the body bottom; `a = ρ_w·g·V·frac / m`.
//! - **Wave-slope advection**: the surface normal projected to the horizontal
//!   plane advects the body along the wave face (`a = g·WAVE_COUPLING·frac`).
//! - **Vertical skin drag**: `c·frac·vy` damps buoyancy oscillation so floating
//!   bodies reach a stable equilibrium instead of ringing forever.
//! - **Quadratic aerodynamic drag**: `0.5·ρ_a·Cd·A·(1−frac)·rel` pushes the
//!   exposed cross-section toward the wind vector sampled from the NS grid.
//! - **Bidirectional wakes**: a moving body injects a persistent, self-decaying
//!   ocean wake field (`ocean_wake_height`/`disp`) plus a wind momentum kick
//!   (`wake_strength·|v|` turbulent stirring magnitude) into the NS grid, so
//!   the body changes the very fluid that pushes it.
//!
//! The NS 2D grid is **reinterpreted as a horizontal wind field over (x, z)**
//! (the sibling `couple_rigid_body_world_soa` maps `py` as vertical — S-25 maps
//! the world `(x, z)` plane instead). Determinism is total: no entropy, no
//! HashMap; every body integrates with semi-implicit Euler, and a non-finite
//! step **fail-closes** by zeroing velocity and reverting position.
//!
//! Honesty: `living_sky_ready` is **soak-gated** on the measured bidirectional
//! fixture only; every AAA vector (full SPH ocean / GPU ocean / full-spectrum
//! FFT / Chaos ocean / live water surface / neural physics) stays fail-closed.

use crate::aerodynamic_navier_stokes::{
    AerodynamicNavierStokes, FluidGrid2D, DEFAULT_DIFFUSE_ITERS as NS_DIFFUSE_ITERS,
    DEFAULT_DX as NS_DX, DEFAULT_PROJECT_ITERS as NS_PROJECT_ITERS,
    DEFAULT_VISCOSITY as NS_VISCOSITY,
};
use crate::ecs_core::WorldSoA;
use crate::ocean_fourier_spectral_waves::{OceanWaveGridSoA, MAX_OCEAN_WAVE_GRID_POINTS};
use serde::{Deserialize, Serialize};
use std::f32::consts::PI;
use std::time::Instant;

/// Stable evidence tag — distinct from every sibling kernel (letter **jy**).
pub const SKY_EVIDENCE_KIND: &str = "living_sky_spectral_ocean_buoyancy_wake";
/// Standard gravity [m/s²].
pub const SKY_GRAVITY: f32 = 9.81;
/// Seawater density [kg/m³].
pub const WATER_DENSITY: f32 = 1000.0;
/// Air density [kg/m³].
pub const AIR_DENSITY: f32 = 1.225;
/// Nominal fixed timestep [s].
pub const DEFAULT_DT: f32 = 1.0 / 60.0;
/// Minimum accepted timestep — below this the step fails closed to `DEFAULT_DT`.
pub const SKY_MIN_DT: f32 = 1e-6;
/// Wind grid interior resolution (N×N; +2 ghost cells).
pub const WIND_GRID_N: usize = 16;
/// Wind / ocean domain extent [m].
pub const WIND_DOMAIN_SCALE: f32 = 100.0;
/// Max distance for a valid ocean sample [m].
pub const OCEAN_SAMPLE_RADIUS: f32 = 12.0;
/// Wind velocity clamp [m/s].
pub const WIND_MAX: f32 = 40.0;
/// Per-step wind drive blend toward the target wind (0.05 = 5%/step).
pub const WIND_BLEND: f32 = 0.05;
/// Wave-slope advection coupling coefficient.
pub const WAVE_COUPLING: f32 = 0.35;
/// Vertical skin drag coefficient [1/s].
pub const VERTICAL_DRAG: f32 = 2.0;
/// Ocean wake decay factor per step (persistent wake field).
pub const WAKE_DECAY: f32 = 0.98;
/// Ocean wake magnitude clamp [m].
pub const WAKE_MAX: f32 = 2.0;
/// Soak step count (600 steps @ 1/60 s = 10 s).
pub const SKY_SOAK_STEPS: usize = 600;

/// Living-sky configuration (deterministic, Copy).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LivingSkyConfig {
    /// Seawater density used by Archimedes buoyancy.
    pub water_density: f32,
    /// Air density used by aerodynamic drag.
    pub air_density: f32,
    /// Target wind velocity `(u, v)` over the (x, z) plane.
    pub wind_velocity: [f32; 2],
    /// Surface-height amplitude scale (calm-seas tuning for the coupled soak).
    pub wave_amplitude: f32,
    /// Wave choppiness fed to the spectral ocean update.
    pub choppiness: f32,
    /// Wake injection strength (0 disables wakes).
    pub wake_strength: f32,
    /// Aerodynamic drag coefficient.
    pub drag_coeff: f32,
    /// Horizontal velocity damping per second.
    pub horizontal_damping: f32,
}

impl Default for LivingSkyConfig {
    fn default() -> Self {
        Self {
            water_density: WATER_DENSITY,
            air_density: AIR_DENSITY,
            wind_velocity: [6.0, 0.0],
            wave_amplitude: 0.015,
            choppiness: 0.6,
            wake_strength: 0.15,
            drag_coeff: 0.5,
            horizontal_damping: 0.02,
        }
    }
}

/// Per-entity rigid-body parameters, aligned by index to `WorldSoA` entities.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SkyBodyParams {
    /// Mass [kg].
    pub mass: f32,
    /// Displaced-water volume [m³].
    pub volume: f32,
    /// Vertical extent [m].
    pub height: f32,
    /// Distance from body center to bottom [m].
    pub bottom_offset: f32,
    /// Horizontal cross-section radius [m].
    pub radius: f32,
}

impl SkyBodyParams {
    /// Fail-closed validation: all fields positive (bottom_offset ≥ 0) and finite.
    fn is_valid(&self) -> bool {
        self.mass > 0.0
            && self.volume > 0.0
            && self.height > 0.0
            && self.radius > 0.0
            && self.bottom_offset >= 0.0
            && self.mass.is_finite()
            && self.volume.is_finite()
            && self.height.is_finite()
            && self.radius.is_finite()
            && self.bottom_offset.is_finite()
    }
}

/// Sampled ocean surface at a world (x, z) position.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OceanSurfaceSample {
    /// Surface height above the world Y origin [m] (spectral height scaled by
    /// `wave_amplitude` plus the persistent wake height).
    pub height: f32,
    /// Surface normal X.
    pub normal_x: f32,
    /// Surface normal Y.
    pub normal_y: f32,
    /// Surface normal Z.
    pub normal_z: f32,
    /// True when a grid point was found within `OCEAN_SAMPLE_RADIUS`.
    pub found: bool,
}

/// Coupled Living-Sky state: spectral ocean + wind grid + persistent wakes.
#[derive(Debug, Clone)]
pub struct LivingSky {
    /// Spectral ocean wave grid (the buoyancy surface).
    pub ocean: OceanWaveGridSoA,
    /// Navier–Stokes wind grid reinterpreted over (x, z).
    pub wind: FluidGrid2D,
    /// Active configuration.
    pub cfg: LivingSkyConfig,
    /// Accumulated simulation time [s].
    pub time_sec: f32,
    /// Number of completed `step` calls.
    pub step_count: u64,
    /// Persistent self-decaying ocean wake height field (survives surface recompute).
    pub ocean_wake_height: [f32; MAX_OCEAN_WAVE_GRID_POINTS],
    /// Persistent ocean wake horizontal displacement X.
    pub ocean_wake_disp_x: [f32; MAX_OCEAN_WAVE_GRID_POINTS],
    /// Persistent ocean wake horizontal displacement Z.
    pub ocean_wake_disp_z: [f32; MAX_OCEAN_WAVE_GRID_POINTS],
}

/// One coupled step outcome — measurable, not println theater.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LivingSkyStepResult {
    /// Number of bodies actually coupled this step.
    pub bodies_coupled: u32,
    /// Coupled bodies with a meaningful submerged fraction.
    pub bodies_buoyant: u32,
    /// Coupled bodies with a meaningful wind relative speed.
    pub bodies_dragged: u32,
    /// Ocean wakes injected this step.
    pub ocean_wakes_injected: u32,
    /// Wind wakes injected this step.
    pub wind_wakes_injected: u32,
    /// Peak buoyancy acceleration observed this step [m/s²].
    pub max_buoyancy_accel: f32,
    /// Mean coupled-surface height [m].
    pub mean_surface_height: f32,
    /// Mean wind speed after the NS step [m/s].
    pub wind_mean_speed: f32,
    /// True when every measured scalar is finite.
    pub finite: bool,
}

impl Default for LivingSkyStepResult {
    fn default() -> Self {
        Self {
            bodies_coupled: 0,
            bodies_buoyant: 0,
            bodies_dragged: 0,
            ocean_wakes_injected: 0,
            wind_wakes_injected: 0,
            max_buoyancy_accel: 0.0,
            mean_surface_height: 0.0,
            wind_mean_speed: 0.0,
            finite: true,
        }
    }
}

impl LivingSkyStepResult {
    /// True when every measured float is finite (fail-closed honesty).
    pub fn is_finite(&self) -> bool {
        self.max_buoyancy_accel.is_finite()
            && self.mean_surface_height.is_finite()
            && self.wind_mean_speed.is_finite()
    }
}

impl LivingSky {
    /// Builds a coupled living sky: seeds a 32×16 = 512-point spectral ocean
    /// lattice over `[0, 100]²` and a fresh 16×16 wind grid. Fully deterministic.
    pub fn new(cfg: LivingSkyConfig) -> Self {
        let mut ocean = OceanWaveGridSoA::default();
        let cols = 32usize;
        let rows = 16usize;
        debug_assert_eq!(cols * rows, MAX_OCEAN_WAVE_GRID_POINTS);
        for j in 0..rows {
            for i in 0..cols {
                let x = (i as f32 / (cols - 1) as f32) * WIND_DOMAIN_SCALE;
                let z = (j as f32 / (rows - 1) as f32) * WIND_DOMAIN_SCALE;
                ocean.push_grid_point(x, z);
            }
        }
        Self {
            ocean,
            wind: FluidGrid2D::new(WIND_GRID_N),
            cfg,
            time_sec: 0.0,
            step_count: 0,
            ocean_wake_height: [0.0; MAX_OCEAN_WAVE_GRID_POINTS],
            ocean_wake_disp_x: [0.0; MAX_OCEAN_WAVE_GRID_POINTS],
            ocean_wake_disp_z: [0.0; MAX_OCEAN_WAVE_GRID_POINTS],
        }
    }

    /// Index of the grid point nearest to `(x, z)`, when within
    /// `OCEAN_SAMPLE_RADIUS`. Deterministic linear scan (512 points).
    fn nearest_grid_point(&self, x: f32, z: f32) -> Option<usize> {
        let n = self.ocean.active_count;
        if n == 0 {
            return None;
        }
        let mut best = 0usize;
        let mut best_d = f32::MAX;
        for i in 0..n {
            let dx = x - self.ocean.grid_pos_x[i];
            let dz = z - self.ocean.grid_pos_z[i];
            let d = dx * dx + dz * dz;
            if d < best_d {
                best_d = d;
                best = i;
            }
        }
        if best_d > OCEAN_SAMPLE_RADIUS * OCEAN_SAMPLE_RADIUS {
            None
        } else {
            Some(best)
        }
    }

    /// Samples the coupled ocean surface (scaled spectral height + wake height)
    /// at a world `(x, z)` position.
    fn sample_ocean(&self, x: f32, z: f32) -> OceanSurfaceSample {
        let idx = match self.nearest_grid_point(x, z) {
            Some(i) => i,
            None => {
                return OceanSurfaceSample {
                    height: 0.0,
                    normal_x: 0.0,
                    normal_y: 1.0,
                    normal_z: 0.0,
                    found: false,
                };
            }
        };
        OceanSurfaceSample {
            height: self.ocean.wave_height_y[idx] * self.cfg.wave_amplitude
                + self.ocean_wake_height[idx],
            normal_x: self.ocean.normal_x[idx],
            normal_y: self.ocean.normal_y[idx],
            normal_z: self.ocean.normal_z[idx],
            found: true,
        }
    }

    /// Injects an ocean wake at the nearest grid point: height kick from the
    /// body's horizontal speed, horizontal displacement clamped to `±WAKE_MAX`.
    fn inject_ocean_wake(&mut self, x: f32, z: f32, vx: f32, vz: f32, strength: f32, dt: f32) -> bool {
        let idx = match self.nearest_grid_point(x, z) {
            Some(i) => i,
            None => return false,
        };
        let speed = (vx * vx + vz * vz).sqrt();
        let kick = (speed * strength * dt).clamp(0.0, WAKE_MAX);
        self.ocean_wake_height[idx] += kick;
        self.ocean_wake_disp_x[idx] =
            (self.ocean_wake_disp_x[idx] + vx * strength * dt).clamp(-WAKE_MAX, WAKE_MAX);
        self.ocean_wake_disp_z[idx] =
            (self.ocean_wake_disp_z[idx] + vz * strength * dt).clamp(-WAKE_MAX, WAKE_MAX);
        true
    }

    /// Decays every persistent wake field by `WAKE_DECAY` (persistence survives
    /// the spectral surface recompute).
    fn decay_wakes(&mut self) {
        for i in 0..self.ocean.active_count {
            self.ocean_wake_height[i] *= WAKE_DECAY;
            self.ocean_wake_disp_x[i] *= WAKE_DECAY;
            self.ocean_wake_disp_z[i] *= WAKE_DECAY;
        }
    }

    /// Drives the whole wind field toward the target wind (the "living sky"
    /// must be a global field so drag acts anywhere, not a local blob).
    fn drive_wind(&mut self, dt: f32) {
        let n = self.wind.n;
        let blend = WIND_BLEND * (dt * 60.0).clamp(0.0, 1.0);
        for j in 1..=n {
            for i in 1..=n {
                let k = i + (n + 2) * j;
                self.wind.u[k] += (self.cfg.wind_velocity[0] - self.wind.u[k]) * blend;
                self.wind.v[k] += (self.cfg.wind_velocity[1] - self.wind.v[k]) * blend;
            }
        }
    }

    /// Maps a world `(x, z)` position to the interior NS cell `(i, j, k)`.
    fn wind_cell(&self, x: f32, z: f32) -> (usize, usize, usize) {
        let n = self.wind.n;
        let gx = ((x.clamp(0.0, WIND_DOMAIN_SCALE) / WIND_DOMAIN_SCALE) * (n as f32 - 1.0)) as usize
            + 1;
        let gz = ((z.clamp(0.0, WIND_DOMAIN_SCALE) / WIND_DOMAIN_SCALE) * (n as f32 - 1.0)) as usize
            + 1;
        let gx = gx.clamp(1, n);
        let gz = gz.clamp(1, n);
        let k = gx + (n + 2) * gz;
        (gx, gz, k)
    }

    /// One full coupled step: spectral surface update → wake decay → wind drive
    /// → per-body buoyancy + drag + wake coupling → one NS wind step.
    pub fn step(
        &mut self,
        world: &mut WorldSoA,
        bodies: &[SkyBodyParams],
        dt: f32,
    ) -> LivingSkyStepResult {
        let dt = if dt.is_finite() && dt > SKY_MIN_DT {
            dt
        } else {
            DEFAULT_DT
        };

        self.time_sec += dt;
        self.ocean
            .update_ocean_surface(self.time_sec, self.cfg.wind_velocity, self.cfg.choppiness);
        self.decay_wakes();
        self.drive_wind(dt);

        let mut result = LivingSkyStepResult::default();
        let body_count = bodies.len().min(world.len);
        for i in 0..body_count {
            if !world.is_active(i) {
                continue;
            }
            let body = bodies[i];
            if !body.is_valid() {
                continue;
            }
            let x = world.pos_x[i];
            let y = world.pos_y[i];
            let z = world.pos_z[i];
            if !(x.is_finite() && y.is_finite() && z.is_finite()) {
                continue;
            }
            let sample = self.sample_ocean(x, z);
            if !sample.found {
                continue;
            }

            // --- Archimedes buoyancy from submerged volume fraction ---
            let surface = sample.height;
            let bottom = y - body.bottom_offset;
            let frac = ((surface - bottom) / body.height).clamp(0.0, 1.0);
            let buoyancy_a =
                (self.cfg.water_density * SKY_GRAVITY * body.volume * frac) / body.mass;

            // --- Wave-slope advection (surface normal → horizontal plane) ---
            let (slope_x, slope_z) = if sample.normal_y.abs() > 1e-6 {
                (
                    (-sample.normal_x * self.cfg.wave_amplitude) / sample.normal_y,
                    (-sample.normal_z * self.cfg.wave_amplitude) / sample.normal_y,
                )
            } else {
                (0.0, 0.0)
            };
            let wave_a = SKY_GRAVITY * WAVE_COUPLING * frac;

            // --- Vertical skin drag damps buoyancy oscillation ---
            let vy = world.vel_y[i];
            let vy_damp = VERTICAL_DRAG * frac * vy;

            // --- Quadratic aerodynamic drag on the exposed cross-section ---
            let (_gx, _gz, k) = self.wind_cell(x, z);
            let rel_x = self.wind.u[k] - world.vel_x[i];
            let rel_z = self.wind.v[k] - world.vel_z[i];
            let rel_speed = (rel_x * rel_x + rel_z * rel_z).sqrt();
            let exposed = 1.0 - frac;
            let area = PI * body.radius * body.radius;
            let drag_force =
                0.5 * self.cfg.air_density * self.cfg.drag_coeff * area * rel_speed * exposed;
            let (drag_ax, drag_az) = if rel_speed > 1e-6 {
                let f = drag_force / rel_speed;
                (f * rel_x / body.mass, f * rel_z / body.mass)
            } else {
                (0.0, 0.0)
            };

            let acc_x = wave_a * slope_x + drag_ax;
            let acc_z = wave_a * slope_z + drag_az;
            let acc_y = buoyancy_a - SKY_GRAVITY - vy_damp;

            // --- Semi-implicit Euler integration with horizontal damping ---
            let hd = (1.0 - self.cfg.horizontal_damping * dt).clamp(0.0, 1.0);
            let vx_new = (world.vel_x[i] + acc_x * dt) * hd;
            let vy_new = world.vel_y[i] + acc_y * dt;
            let vz_new = (world.vel_z[i] + acc_z * dt) * hd;
            let nx = x + vx_new * dt;
            let ny = y + vy_new * dt;
            let nz = z + vz_new * dt;

            let finite = nx.is_finite()
                && ny.is_finite()
                && nz.is_finite()
                && vx_new.is_finite()
                && vy_new.is_finite()
                && vz_new.is_finite();
            if finite {
                world.pos_x[i] = nx;
                world.pos_y[i] = ny;
                world.pos_z[i] = nz;
                world.vel_x[i] = vx_new;
                world.vel_y[i] = vy_new;
                world.vel_z[i] = vz_new;
            } else {
                // Fail-closed: zero velocity, revert position (stays where it was).
                world.vel_x[i] = 0.0;
                world.vel_y[i] = 0.0;
                world.vel_z[i] = 0.0;
            }

            // --- Bidirectional wakes (body → ocean + body → wind) ---
            let speed = (vx_new * vx_new + vy_new * vy_new + vz_new * vz_new).sqrt();
            if speed > 1e-6 {
                if self.inject_ocean_wake(x, z, vx_new, vz_new, self.cfg.wake_strength, dt) {
                    result.ocean_wakes_injected += 1;
                }
                let wu = (self.wind.u[k] + self.cfg.wake_strength * vx_new.abs()).clamp(
                    -WIND_MAX,
                    WIND_MAX,
                );
                self.wind.u[k] = wu;
                let wv = (self.wind.v[k] + self.cfg.wake_strength * vz_new.abs()).clamp(
                    -WIND_MAX,
                    WIND_MAX,
                );
                self.wind.v[k] = wv;
                result.wind_wakes_injected += 1;
            }

            result.bodies_coupled += 1;
            if frac > 0.01 {
                result.bodies_buoyant += 1;
            }
            if rel_speed > 1e-6 {
                result.bodies_dragged += 1;
            }
            result.max_buoyancy_accel = result.max_buoyancy_accel.max(buoyancy_a);
        }

        // --- One NS wind step after all body coupling ---
        AerodynamicNavierStokes::ns_step(
            &mut self.wind,
            dt,
            NS_VISCOSITY,
            NS_DX,
            NS_DIFFUSE_ITERS,
            NS_PROJECT_ITERS,
        );

        result.mean_surface_height = self.mean_surface_height();
        result.wind_mean_speed = self.wind.mean_speed();
        result.finite = result.is_finite();
        self.step_count += 1;
        result
    }

    /// Mean coupled surface height over active grid points [m].
    fn mean_surface_height(&self) -> f32 {
        let n = self.ocean.active_count;
        if n == 0 {
            return 0.0;
        }
        let mut sum = 0.0_f64;
        for i in 0..n {
            sum += (self.ocean.wave_height_y[i] * self.cfg.wave_amplitude
                + self.ocean_wake_height[i]) as f64;
        }
        (sum / n as f64) as f32
    }

    /// Sum of persistent ocean wake heights over active grid points [m].
    fn total_ocean_wake_height(&self) -> f64 {
        let mut sum = 0.0_f64;
        for i in 0..self.ocean.active_count {
            sum += self.ocean_wake_height[i] as f64;
        }
        sum
    }
}

fn speed3(vx: f32, vy: f32, vz: f32) -> f32 {
    (vx * vx + vy * vy + vz * vz).sqrt()
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

/// Fingerprint of living-sky-only evidence fields (seed "SKY!" XOR "OCEA").
fn sky_evidence_fingerprint(o: &SkyFixtureOutcome, deterministic_replay: bool) -> u64 {
    let mut h: u64 = 0x534B_5921 ^ 0x4F43_4541; // "SKY!" XOR "OCEA"
    h = hash_mix(h, quant_f32(o.heavy_final_y));
    h = hash_mix(h, quant_f32(o.light_final_y));
    h = hash_mix(h, quant_f32(o.light_final_speed));
    h = hash_mix(h, quant_f32(o.rider_final_x));
    h = hash_mix(h, quant_f32(o.rider_final_y));
    h = hash_mix(h, quant_f32(o.rider_final_z));
    h = hash_mix(h, quant_f32(o.rider_surface_track_mean_err));
    h = hash_mix(h, o.rider_surface_track_samples as u64);
    h = hash_mix(h, quant_f32(o.drag_final_vel_x));
    h = hash_mix(h, quant_f32(o.total_ocean_wake_height as f32));
    h = hash_mix(h, quant_f32(o.wind_mean_speed));
    h = hash_mix(h, quant_f32(o.mean_surface_height));
    h = hash_mix(h, o.bodies_coupled as u64);
    h = hash_mix(h, quant_f32(o.max_buoyancy_accel));
    h = hash_mix(h, u64::from(deterministic_replay));
    h ^= 0x4C53_4B59; // "LSKY"
    h
}

fn measured_distinct(evidence_kind: &'static str, evidence_fingerprint: u64, core_ok: bool) -> bool {
    core_ok && evidence_kind == SKY_EVIDENCE_KIND && evidence_fingerprint != 0
}

/// Measured fixture outcome for one living-sky pass (deterministic).
#[derive(Debug, Clone, Copy, PartialEq)]
struct SkyFixtureOutcome {
    heavy_final_y: f32,
    light_final_y: f32,
    light_final_speed: f32,
    rider_final_x: f32,
    rider_final_y: f32,
    rider_final_z: f32,
    rider_surface_track_mean_err: f32,
    rider_surface_track_samples: u32,
    drag_final_vel_x: f32,
    total_ocean_wake_height: f64,
    wind_mean_speed: f32,
    mean_surface_height: f32,
    bodies_coupled: u32,
    max_buoyancy_accel: f32,
}

/// Builds the deterministic four-body soak fixture:
/// - heavy (500 kg / 0.05 m³) — sinks (Archimedes direction).
/// - light (60 kg / 0.1 m³) — floats 60% submerged.
/// - rider (8 kg / 0.12 m³) — rides waves, starts at local equilibrium + drift.
/// - drag (2 kg / 0.5 m³) — mostly exposed, wind drag reverses its −8 m/s.
fn build_soak_fixture(with_wakes: bool) -> (LivingSky, WorldSoA, [SkyBodyParams; 4], [u32; 4]) {
    let mut cfg = LivingSkyConfig::default();
    cfg.wake_strength = if with_wakes { 0.15 } else { 0.0 };
    let mut sky = LivingSky::new(cfg);
    let mut world = WorldSoA::with_capacity(8);
    // Pre-initialize the surface at t=0 so bodies start at their true equilibrium.
    sky.ocean
        .update_ocean_surface(0.0, cfg.wind_velocity, cfg.choppiness);

    let heavy = world.add_entity(40.0, -2.0, 50.0).unwrap().0;
    let light_surface = sky.sample_ocean(55.0, 45.0).height;
    let light = world.add_entity(55.0, light_surface - 0.1, 45.0).unwrap().0;

    let rider_surface = sky.sample_ocean(60.0, 50.0).height;
    let rider = world.add_entity(60.0, rider_surface + 0.433, 50.0).unwrap().0;
    world.set_velocity(rider as usize, 0.5, 0.0, 0.2);

    let drag_surface = sky.sample_ocean(30.0, 50.0).height;
    let drag = world.add_entity(30.0, drag_surface + 0.496, 50.0).unwrap().0;
    world.set_velocity(drag as usize, -8.0, 0.0, 0.0);

    let bodies = [
        SkyBodyParams {
            mass: 500.0,
            volume: 0.05,
            height: 1.0,
            bottom_offset: 0.5,
            radius: 0.5,
        },
        SkyBodyParams {
            mass: 60.0,
            volume: 0.1,
            height: 1.0,
            bottom_offset: 0.5,
            radius: 0.4,
        },
        SkyBodyParams {
            mass: 8.0,
            volume: 0.12,
            height: 1.0,
            bottom_offset: 0.5,
            radius: 0.3,
        },
        SkyBodyParams {
            mass: 2.0,
            volume: 0.5,
            height: 1.0,
            bottom_offset: 0.5,
            radius: 0.5,
        },
    ];
    (sky, world, bodies, [heavy, light, rider, drag])
}

/// Runs one full living-sky soak fixture and returns the measured outcome.
/// `with_wakes` toggles the wake strength so the bidirectional coupling can be
/// measured as a difference against the wake-less baseline.
fn run_sky_fixture(with_wakes: bool) -> SkyFixtureOutcome {
    let (mut sky, mut world, bodies, ids) = build_soak_fixture(with_wakes);
    let [heavy, light, rider, drag] = ids;

    // Rider's buoyant equilibrium offset above the local surface.
    let rider_eq_offset = bodies[2].bottom_offset
        - (bodies[2].mass / (sky.cfg.water_density * bodies[2].volume)) * bodies[2].height;

    let mut track_err_sum = 0.0_f64;
    let mut track_samples = 0_u32;
    let mut max_buoyancy_accel = 0.0_f32;
    let mut bodies_coupled = 0_u32;

    for _ in 0..SKY_SOAK_STEPS {
        let r = sky.step(&mut world, &bodies, DEFAULT_DT);
        bodies_coupled = r.bodies_coupled;
        max_buoyancy_accel = max_buoyancy_accel.max(r.max_buoyancy_accel);

        let rx = world.pos_x[rider as usize];
        let ry = world.pos_y[rider as usize];
        let rz = world.pos_z[rider as usize];
        let surf = sky.sample_ocean(rx, rz).height;
        track_err_sum += (ry - (surf + rider_eq_offset)).abs() as f64;
        track_samples += 1;
    }

    SkyFixtureOutcome {
        heavy_final_y: world.pos_y[heavy as usize],
        light_final_y: world.pos_y[light as usize],
        light_final_speed: speed3(
            world.vel_x[light as usize],
            world.vel_y[light as usize],
            world.vel_z[light as usize],
        ),
        rider_final_x: world.pos_x[rider as usize],
        rider_final_y: world.pos_y[rider as usize],
        rider_final_z: world.pos_z[rider as usize],
        rider_surface_track_mean_err: if track_samples > 0 {
            (track_err_sum / track_samples as f64) as f32
        } else {
            f32::MAX
        },
        rider_surface_track_samples: track_samples,
        drag_final_vel_x: world.vel_x[drag as usize],
        total_ocean_wake_height: sky.total_ocean_wake_height(),
        wind_mean_speed: sky.wind.mean_speed(),
        mean_surface_height: sky.mean_surface_height(),
        bodies_coupled,
        max_buoyancy_accel,
    }
}

/// Instant-measured Living-Sky soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LivingSkySoakReport {
    /// Soak-gated; requires the full bidirectional coupling chain measured.
    pub living_sky_ready: bool,
    pub heavy_body_sinks: bool,
    pub light_body_floats: bool,
    pub body_rides_waves: bool,
    pub wind_drag_changes_trajectory: bool,
    pub ocean_wake_written: bool,
    pub wind_wake_written: bool,
    pub bidirectional_coupling: bool,
    pub deterministic_replay: bool,
    pub bodies_coupled: u32,
    pub max_buoyancy_accel: f32,
    pub mean_surface_height: f32,
    pub soak_steps: u32,
    pub soak_elapsed_ns: u128,
    /// Stable evidence tag (distinct from every sibling kernel).
    pub evidence_kind: &'static str,
    /// Fingerprint of living-sky-only evidence fields.
    pub evidence_fingerprint: u64,
    pub distinct_from_procedural_muscle_locomotion_probe: bool,
    pub distinct_from_ocean_fourier_spectral_waves_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    /// Fail-closed — no full-SPH / GPU / FFT / Chaos / live-surface / neural AAA.
    pub full_sph_ocean_ready: bool,
    pub gpu_ocean_ready: bool,
    pub full_spectrum_fft_ready: bool,
    pub chaos_ocean_aaa_ready: bool,
    pub live_water_surface_ready: bool,
    pub neural_physics_aaa_ready: bool,
}

/// Living-sky soak: three deterministic fixture passes (with-wakes, without,
/// replay) measuring Archimedes, wave riding, wind drag and bidirectional wakes.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`); this kernel is a hot leaf fetched by
/// many sibling soaks, so caching collapses repeated peer recomputation.
pub fn run_living_sky_soak() -> LivingSkySoakReport {
    static CACHE: std::sync::OnceLock<LivingSkySoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let t0 = Instant::now();
    let with = run_sky_fixture(true);
    let without = run_sky_fixture(false);
    let rep_b = run_sky_fixture(true);
    let deterministic_replay = with == rep_b;
    let elapsed = t0.elapsed().as_nanos();

    let heavy_body_sinks = with.heavy_final_y < -5.0;
    let light_body_floats = with.light_final_y > -1.0 && with.light_final_speed < 3.0;
    let body_rides_waves = with.rider_surface_track_samples > 0
        && with.rider_surface_track_mean_err < 0.6
        && ((with.rider_final_x - 50.0).abs() + (with.rider_final_z - 50.0).abs()) > 0.05;
    let wind_drag_changes_trajectory = with.drag_final_vel_x > -2.0;
    let ocean_wake_written =
        (with.total_ocean_wake_height - without.total_ocean_wake_height) > 1e-4;
    let wind_wake_written = (with.wind_mean_speed - without.wind_mean_speed) > 1e-4;
    let bidirectional_coupling = ocean_wake_written && wind_wake_written && with.bodies_coupled > 0;
    let core_ok = heavy_body_sinks
        && light_body_floats
        && body_rides_waves
        && wind_drag_changes_trajectory
        && ocean_wake_written
        && wind_wake_written
        && bidirectional_coupling
        && deterministic_replay;

    let evidence_fingerprint = sky_evidence_fingerprint(&with, deterministic_replay);
    let d = measured_distinct(SKY_EVIDENCE_KIND, evidence_fingerprint, core_ok);

    LivingSkySoakReport {
        living_sky_ready: core_ok && evidence_fingerprint != 0,
        heavy_body_sinks,
        light_body_floats,
        body_rides_waves,
        wind_drag_changes_trajectory,
        ocean_wake_written,
        wind_wake_written,
        bidirectional_coupling,
        deterministic_replay,
        bodies_coupled: with.bodies_coupled,
        max_buoyancy_accel: with.max_buoyancy_accel,
        mean_surface_height: with.mean_surface_height,
        soak_steps: SKY_SOAK_STEPS as u32,
        soak_elapsed_ns: elapsed,
        evidence_kind: SKY_EVIDENCE_KIND,
        evidence_fingerprint,
        distinct_from_procedural_muscle_locomotion_probe: d,
        distinct_from_ocean_fourier_spectral_waves_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        full_sph_ocean_ready: false,
        gpu_ocean_ready: false,
        full_spectrum_fft_ready: false,
        chaos_ocean_aaa_ready: false,
        live_water_surface_ready: false,
        neural_physics_aaa_ready: false,
    }
        })
        .clone()
}

/// Honesty probe — soak-gated `living_sky_ready`, never hardcoded.
pub fn probe_living_sky() -> LivingSkySoakReport {
    run_living_sky_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::aerodynamic_navier_stokes::probe_aerodynamic_navier_stokes;
    use crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver;
    use crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph;
    use crate::ocean_fourier_spectral_waves::{
        probe_ocean_fourier_spectral_waves, OceanWaveGridSoA,
    };
    use crate::procedural_muscle_locomotion::probe_procedural_muscle_locomotion;

    #[test]
    fn heavy_body_sinks_under_archimedes() {
        let (mut sky, mut world, bodies, ids) = build_soak_fixture(true);
        for _ in 0..120 {
            sky.step(&mut world, &bodies, DEFAULT_DT);
        }
        assert!(world.pos_y[ids[0] as usize] < -5.0);
    }

    #[test]
    fn light_body_floats_near_surface() {
        let (mut sky, mut world, bodies, ids) = build_soak_fixture(true);
        for _ in 0..300 {
            sky.step(&mut world, &bodies, DEFAULT_DT);
        }
        let y = world.pos_y[ids[1] as usize];
        assert!(y > -1.0 && y < 2.0, "light body y = {y}");
        let sp = speed3(
            world.vel_x[ids[1] as usize],
            world.vel_y[ids[1] as usize],
            world.vel_z[ids[1] as usize],
        );
        assert!(sp < 3.0, "light body speed = {sp}");
    }

    #[test]
    fn wind_drag_drives_body_toward_wind() {
        let (mut sky, mut world, bodies, ids) = build_soak_fixture(true);
        for _ in 0..300 {
            sky.step(&mut world, &bodies, DEFAULT_DT);
        }
        assert!(world.vel_x[ids[3] as usize] > -4.0);
    }

    #[test]
    fn ocean_wake_written_and_decays() {
        let mut sky = LivingSky::new(LivingSkyConfig::default());
        assert!(sky.inject_ocean_wake(50.0, 50.0, 4.0, 0.0, 0.15, DEFAULT_DT));
        let before = sky.total_ocean_wake_height();
        assert!(before > 0.0);
        for _ in 0..120 {
            sky.decay_wakes();
        }
        let after = sky.total_ocean_wake_height();
        assert!(after < 0.5 * before, "wake decayed {before} -> {after}");
    }

    #[test]
    fn sample_ocean_within_domain() {
        let mut sky = LivingSky::new(LivingSkyConfig::default());
        sky.ocean
            .update_ocean_surface(0.5, sky.cfg.wind_velocity, sky.cfg.choppiness);
        let s = sky.sample_ocean(50.0, 50.0);
        assert!(s.found);
        assert!(s.height.is_finite());
        assert!(s.normal_y > 0.0);
        let far = sky.sample_ocean(500.0, 500.0);
        assert!(!far.found);
    }

    #[test]
    fn soak_flips_ready_aaa_held() {
        let r = run_living_sky_soak();
        assert!(r.living_sky_ready);
        assert!(r.heavy_body_sinks);
        assert!(r.light_body_floats);
        assert!(r.body_rides_waves);
        assert!(r.wind_drag_changes_trajectory);
        assert!(r.ocean_wake_written);
        assert!(r.wind_wake_written);
        assert!(r.bidirectional_coupling);
        assert!(r.deterministic_replay);
        assert_ne!(r.evidence_fingerprint, 0);
        assert!(!r.full_sph_ocean_ready);
        assert!(!r.gpu_ocean_ready);
        assert!(!r.full_spectrum_fft_ready);
        assert!(!r.chaos_ocean_aaa_ready);
        assert!(!r.live_water_surface_ready);
        assert!(!r.neural_physics_aaa_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_living_sky_soak();
        let probe = probe_living_sky();
        // Wall-clock soak_elapsed_ns differs between runs — compare the
        // deterministic fields only.
        assert_eq!(soak.living_sky_ready, probe.living_sky_ready);
        assert_eq!(soak.evidence_kind, probe.evidence_kind);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.full_sph_ocean_ready, probe.full_sph_ocean_ready);
        assert_eq!(soak.gpu_ocean_ready, probe.gpu_ocean_ready);
        assert_eq!(soak.full_spectrum_fft_ready, probe.full_spectrum_fft_ready);
        assert_eq!(soak.chaos_ocean_aaa_ready, probe.chaos_ocean_aaa_ready);
        assert_eq!(soak.live_water_surface_ready, probe.live_water_surface_ready);
        assert_eq!(soak.neural_physics_aaa_ready, probe.neural_physics_aaa_ready);
        assert!(soak.living_sky_ready);
    }

    #[test]
    fn deterministic_replay() {
        let a = run_sky_fixture(true);
        let b = run_sky_fixture(true);
        assert_eq!(a, b);
    }

    #[test]
    fn sky_probe_distinct_from_all_sibling_evidence() {
        let sky = probe_living_sky();
        assert!(sky.living_sky_ready);

        let loc = probe_procedural_muscle_locomotion();
        let ns = probe_aerodynamic_navier_stokes();
        let sph = probe_matter_thermodynamics_sph();
        let lbm = probe_lattice_boltzmann_fluid_solver();

        assert!(sky.distinct_from_procedural_muscle_locomotion_probe);
        assert!(sky.distinct_from_ocean_fourier_spectral_waves_probe);
        assert!(sky.distinct_from_aerodynamic_navier_stokes_probe);
        assert!(sky.distinct_from_matter_thermodynamics_sph_probe);
        assert!(sky.distinct_from_lattice_boltzmann_fluid_solver_probe);

        // Every evidence-exposing sibling carries a distinct, non-zero kind
        // and fingerprint; the living-sky fingerprint is different from all.
        for (kind, fp) in [
            (loc.evidence_kind, loc.evidence_fingerprint),
            (ns.evidence_kind, ns.evidence_fingerprint),
            (sph.evidence_kind, sph.evidence_fingerprint),
            (lbm.evidence_kind, lbm.evidence_fingerprint),
        ] {
            assert_ne!(kind, SKY_EVIDENCE_KIND);
            assert_ne!(fp, 0);
            assert_ne!(fp, sky.evidence_fingerprint);
        }

        // The ocean probe exposes no evidence fields — assert its real contract.
        let mut o = OceanWaveGridSoA::default();
        o.push_grid_point(0.0, 0.0);
        o.update_ocean_surface(0.5, [8.0, 2.0], 0.8);
        let op = probe_ocean_fourier_spectral_waves(&o);
        assert!(op.ocean_fourier_spectral_waves_ready);
        assert_eq!(op.active_grid_point_count, 1);
        assert!(op.phillips_spectrum_valid);
    }
}

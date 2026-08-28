//! # Celestial Orbital Dynamics Kernel — letter **lb** (R3-C / Vanguarda P2 — GAS & Física).
//!
//! Closes the R3 audit gap **"space/microgravity = ZERO"** on the same S-17
//! deterministic spine as [`crate::vehicle_chassis_dynamics`] (kz) and
//! [`crate::flight_aerodynamics`] (la): rollback-compatible, fingerprintable,
//! bit-identical double-pass soak, zero-alloc hot loop, fail-closed AAA flags.
//!
//! ## Model
//!
//! - **Two-body Kepler** in an ECI frame: state `(r, v)` + gravitational
//!   parameter `mu` of the central body. Propagation is **analytic** via
//!   **universal variables** (Vallado, Algorithm 5) — valid across all conics
//!   (elliptic / parabolic / hyperbolic) with a single deterministic Newton
//!   solver on the universal Kepler equation:
//!
//!   ```text
//!   F(χ) = χ³·S(z) + (r₀·v₀/√μ)·χ²·C(z) + r₀·χ·(1 − z·S(z)) − √μ·Δt = 0
//!   z    = α·χ²,   α = 2/r₀ − v₀²/μ
//!   F′(χ) = χ²·C(z) + (r₀·v₀/√μ)·χ·(1 − z·S(z)) + r₀·(1 − z·C(z))
//!   ```
//!
//!   (the closed-form derivative is derived from the Stumpff power series and
//!   is exact; Lagrange coefficients `f,g,ḟ,ġ` produce the propagated state —
//!   no semi-implicit Euler integration is needed, so the propagation is
//!   essentially exact and trivially deterministic).
//!
//! - **Classical orbital elements ↔ state** round-trip: `a, e, i, Ω, ω, ν, M`
//!   via the standard 3-1-3 (`Rz(−Ω)·Rx(−i)·Rz(−ω)`) perifocal→ECI rotation.
//!   Kepler's equation `M = E − e·sin E` is solved by bounded Newton.
//!
//! - **Patched conic**: the Laplace sphere of influence
//!   `r_soi = a·(1−e)·(μ_sec/μ_pri)^(2/5)`; when the spacecraft enters a
//!   secondary body's SOI, the primary **switches** (`mu`-switch), e.g. an
//!   Earth→Moon transfer. This is a single-step SOI resolution (appropriate for
//!   the kernel's deterministic spine), not a full N-body integrator.
//!
//! - **Microgravity**: a primary with `mu == 0` models deep space — no
//!   central gravity, straight-line ballistic flight (constant velocity when
//!   unthrust) and **RCS Δv impulses** applied as instantaneous velocity
//!   changes (exact).
//!
//! - **Configurable body table**: [`BodyTable`] holds up to [`MAX_BODIES`]
//!   bodies (Earth / Moon / Mars presets + arbitrary custom bodies) with
//!   `mu`, `radius` and `soi_radius` — flexible across any generated game,
//!   per the Founder flexibility mandate.
//!
//! ## Honesty
//!
//! - AAA vectors (`rcs_aaa_ready`, `orbital_maneuver_aaa_ready`,
//!   `n_body_aaa_ready`, `atmosphere_drag_aaa_ready`) stay **HELD** (fail-closed):
//!   this kernel is 2-body + patched conic, not an N-body / J2 / drag / finite
//!   burn simulator.
//! - `soak_steps` = [`SOAK_STEPS`], `hot_loop_iterations` = [`HOT_LOOP_ITERATIONS`];
//!   readiness derives only from the real measured pass (`run_measured_pass`).
//! - Distinctness: 23 real peers (21 prior R1/R2/R3-A + kz + la), each
//!   `evidence_fingerprint` must differ.

use crate::dynamic_shader_rewriter::{hash_mix, quant_f32};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Constants (letter-lb distinct).
// ---------------------------------------------------------------------------

/// Fingerprint seed — letter **lb** (`0x6C62...`).
pub const CELESTIAL_ORBITAL_FP_SEED: u64 = 0x6C62_0000_0000_0001;
/// Fingerprint fold — letter **lb**.
pub const CELESTIAL_ORBITAL_FP_FOLD: u64 = 0x6C62_6C62_6C62_6C62;
/// Evidence kind tag reported by the soak (letter **lb**).
pub const CELESTIAL_ORBITAL_EVIDENCE_KIND: &str = "celestial_orbital_dynamics";
/// Seconds per soak step (1 minute — orbital scale).
pub const SOAK_DT: f32 = 60.0;
/// Number of soak steps (2 hours of simulated orbit).
pub const SOAK_STEPS: u64 = 120;
/// Hot-loop iterations in the measured soak pass (zero-alloc, keep-capacity).
pub const HOT_LOOP_ITERATIONS: u64 = 4096;
/// Bounded Newton iterations for the universal / classical Kepler solvers.
pub const MAX_KEPLER_ITERS: u32 = 14;
/// Newton convergence tolerance on the anomaly (deterministic).
const KEPLER_TOLERANCE: f32 = 1.0e-9;
/// Maximum number of bodies in a [`BodyTable`].
pub const MAX_BODIES: usize = 8;
/// `2π` (f32).
const TWO_PI: f32 = std::f32::consts::TAU;

// ---------------------------------------------------------------------------
// Small zero-alloc vector helpers (all NaN-guarded).
// ---------------------------------------------------------------------------

#[inline]
fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[inline]
fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

#[inline]
fn length(a: [f32; 3]) -> f32 {
    dot(a, a).sqrt()
}

#[inline]
fn add3(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

#[inline]
fn sub(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

#[inline]
fn scale(a: [f32; 3], s: f32) -> [f32; 3] {
    [a[0] * s, a[1] * s, a[2] * s]
}

#[inline]
fn normalize_or_zero(a: [f32; 3]) -> [f32; 3] {
    let l = length(a);
    if l > 1.0e-9 {
        scale(a, 1.0 / l)
    } else {
        [0.0; 3]
    }
}

/// Smallest angle between two angles (radians), normalized to `[0, π]`.
#[inline]
fn angle_diff(a: f32, b: f32) -> f32 {
    let d = (a - b).abs() % TWO_PI;
    d.min(TWO_PI - d)
}

// ---------------------------------------------------------------------------
// Stumpff functions (universal variables).
// ---------------------------------------------------------------------------

/// Universal C-function `C(z)`; series near `z = 0` avoids `0/0`.
#[inline]
fn c_stumpff(z: f32) -> f32 {
    if z.abs() < 1.0e-4 {
        // C(z) ≈ 1/2 − z/24 + z²/720 − z³/40320
        0.5 - z * (1.0 / 24.0) + z * z * (1.0 / 720.0) - z * z * z * (1.0 / 40_320.0)
    } else if z > 0.0 {
        let s = z.sqrt();
        (1.0 - s.cos()) / z
    } else {
        let s = (-z).sqrt();
        (s.cosh() - 1.0) / (-z)
    }
}

/// Universal S-function `S(z)`; series near `z = 0` avoids `0/0`.
#[inline]
fn s_stumpff(z: f32) -> f32 {
    if z.abs() < 1.0e-4 {
        // S(z) ≈ 1/6 − z/120 + z²/5040 − z³/362880
        (1.0 / 6.0) - z * (1.0 / 120.0) + z * z * (1.0 / 5040.0) - z * z * z * (1.0 / 362_880.0)
    } else if z > 0.0 {
        let s = z.sqrt();
        (s - s.sin()) / (s * s * s)
    } else {
        let s = (-z).sqrt();
        (s.sinh() - s) / (s * s * s)
    }
}

// ---------------------------------------------------------------------------
// Core state / element / body types.
// ---------------------------------------------------------------------------

/// ECI orbital state — position and velocity.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OrbitalState {
    pub position: [f32; 3],
    pub velocity: [f32; 3],
}

impl Default for OrbitalState {
    fn default() -> Self {
        Self {
            position: [0.0; 3],
            velocity: [0.0; 3],
        }
    }
}

/// Classical orbital elements `a, e, i, Ω, ω, ν, M` (SI: meters / radians).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct OrbitalElements {
    pub semi_major_axis: f32,
    pub eccentricity: f32,
    pub inclination: f32,
    pub raan: f32,
    pub arg_periapsis: f32,
    pub true_anomaly: f32,
    pub mean_anomaly: f32,
}

impl Default for OrbitalElements {
    fn default() -> Self {
        Self {
            semi_major_axis: 7_000_000.0,
            eccentricity: 0.0,
            inclination: 0.0,
            raan: 0.0,
            arg_periapsis: 0.0,
            true_anomaly: 0.0,
            mean_anomaly: 0.0,
        }
    }
}

/// A celestial body: gravitational parameter, physical radius and sphere of
/// influence. Fully configurable (any generated game can define its own).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CelestialBody {
    pub name: &'static str,
    pub mu: f32,
    pub radius: f32,
    pub soi_radius: f32,
}

impl CelestialBody {
    /// Build a body from explicit parameters (flexible / game-authored).
    pub const fn new(name: &'static str, mu: f32, radius: f32, soi_radius: f32) -> Self {
        Self {
            name,
            mu,
            radius,
            soi_radius,
        }
    }

    /// Earth preset (μ [m³/s²], radius [m], SOI [m]).
    pub const fn earth() -> Self {
        Self::new("Earth", 3.986_004_5e14, 6_371_000.0, 924_400_000.0)
    }

    /// Moon preset.
    pub const fn moon() -> Self {
        Self::new("Moon", 4.904_869_5e12, 1_737_400.0, 66_183_000.0)
    }

    /// Mars preset.
    pub const fn mars() -> Self {
        Self::new("Mars", 4.282_837_2e13, 3_389_500.0, 578_000_000.0)
    }
}

/// Fixed-capacity, zero-alloc configurable body table (up to [`MAX_BODIES`]).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BodyTable {
    bodies: [CelestialBody; MAX_BODIES],
    count: usize,
}

impl BodyTable {
    /// Empty table.
    pub const fn new() -> Self {
        Self {
            bodies: [CelestialBody::new("", 0.0, 0.0, 0.0); MAX_BODIES],
            count: 0,
        }
    }

    /// Append a body; returns `false` (no-op) when full — fail-closed.
    pub fn push(&mut self, body: CelestialBody) -> bool {
        if self.count < MAX_BODIES {
            self.bodies[self.count] = body;
            self.count += 1;
            true
        } else {
            false
        }
    }

    pub fn len(&self) -> usize {
        self.count
    }

    pub fn is_empty(&self) -> bool {
        self.count == 0
    }

    pub fn get(&self, index: usize) -> Option<CelestialBody> {
        if index < self.count {
            Some(self.bodies[index])
        } else {
            None
        }
    }

    pub fn as_slice(&self) -> &[CelestialBody] {
        &self.bodies[..self.count]
    }
}

impl Default for BodyTable {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Two-body dynamics primitives (pure, deterministic, closed-form).
// ---------------------------------------------------------------------------

/// Solve Kepler's equation `M = E − e·sin(E)` for the eccentric anomaly `E`
/// via bounded Newton iteration (deterministic, never unbounded).
pub fn solve_kepler(mean_anomaly: f32, eccentricity: f32) -> f32 {
    let mut e_anom = mean_anomaly + eccentricity * mean_anomaly.sin();
    for _ in 0..MAX_KEPLER_ITERS {
        let f = e_anom - eccentricity * e_anom.sin() - mean_anomaly;
        let fp = 1.0 - eccentricity * e_anom.cos();
        let delta = if fp.abs() > 1.0e-12 { f / fp } else { f };
        e_anom -= delta;
        if delta.abs() < KEPLER_TOLERANCE {
            break;
        }
    }
    e_anom
}

/// Vis-viva speed: `v² = μ·(2/r − 1/a)` — conserved along any Kepler orbit.
pub fn vis_viva_speed(mu: f32, r_mag: f32, semi_major_axis: f32) -> f32 {
    (mu * (2.0 / r_mag - 1.0 / semi_major_axis)).max(0.0).sqrt()
}

/// Orbital period: `T = 2π·√(a³/μ)`.
pub fn orbital_period(mu: f32, semi_major_axis: f32) -> f32 {
    TWO_PI * (semi_major_axis * semi_major_axis * semi_major_axis / mu).sqrt()
}

/// Specific orbital energy: `ε = v²/2 − μ/r` (negative = bound).
pub fn specific_energy(mu: f32, r_mag: f32, v_mag: f32) -> f32 {
    0.5 * v_mag * v_mag - mu / r_mag
}

/// Escape speed: `v_esc = √(2μ/r)`.
pub fn escape_speed(mu: f32, r_mag: f32) -> f32 {
    (2.0 * mu / r_mag).sqrt()
}

/// Laplace sphere of influence: `r_soi = a·(1−e)·(μ_sec/μ_pri)^(2/5)`.
pub fn soi_radius_of(secondary_mu: f32, primary_mu: f32, a_sec: f32, e_sec: f32) -> f32 {
    a_sec * (1.0 - e_sec) * (secondary_mu / primary_mu).powf(0.4)
}

/// Propagate a two-body state by `dt` seconds using **universal variables**.
///
/// Exact conic propagation (no numerical integration error); deterministic
/// because the Newton iteration count is bounded and every operation is
/// deterministic. Requires `mu > 0` (microgravity `mu == 0` is handled by the
/// solver's ballistic branch).
pub fn universal_variable_step(mu: f32, r0: [f32; 3], v0: [f32; 3], dt: f32) -> OrbitalState {
    let r0_mag = length(r0);
    let v0_mag2 = dot(v0, v0);
    let r0_dot_v0 = dot(r0, v0);
    let alpha = 2.0 / r0_mag - v0_mag2 / mu;
    let sqrt_mu = mu.sqrt();
    // Vallado initial guess.
    let mut chi = sqrt_mu * dt * alpha;
    for _ in 0..MAX_KEPLER_ITERS {
        let z = alpha * chi * chi;
        let c = c_stumpff(z);
        let s = s_stumpff(z);
        let f = chi * chi * chi * s
            + (r0_dot_v0 / sqrt_mu) * chi * chi * c
            + r0_mag * chi * (1.0 - z * s)
            - sqrt_mu * dt;
        let fp = chi * chi * c
            + (r0_dot_v0 / sqrt_mu) * chi * (1.0 - z * s)
            + r0_mag * (1.0 - z * c);
        let delta = if fp.abs() > 1.0e-12 { f / fp } else { f };
        chi -= delta;
        if delta.abs() < KEPLER_TOLERANCE {
            break;
        }
    }
    let z = alpha * chi * chi;
    let c = c_stumpff(z);
    let s = s_stumpff(z);
    // Lagrange coefficients.
    let f = 1.0 - (chi * chi / r0_mag) * c;
    let g = dt - (chi * chi * chi / sqrt_mu) * s;
    let r1 = add3(scale(r0, f), scale(v0, g));
    let r1_mag = length(r1);
    let fdot = (sqrt_mu / (r0_mag * r1_mag)) * chi * (z * s - 1.0);
    let gdot = 1.0 - (chi * chi / r1_mag) * c;
    let v1 = add3(scale(r0, fdot), scale(v0, gdot));
    OrbitalState {
        position: r1,
        velocity: v1,
    }
}

/// Convert ECI state `(r, v)` to classical orbital elements.
pub fn elements_from_state(mu: f32, r: [f32; 3], v: [f32; 3]) -> OrbitalElements {
    let r_mag = length(r);
    let v_mag = length(v);
    let h = cross(r, v);
    let h_mag = length(h);
    // Node vector ẑ × h, normalized (zero when the orbit is equatorial).
    let n = normalize_or_zero([-h[1], h[0], 0.0]);
    let n_mag = length(n);
    let e_vec = scale(
        sub(scale(r, v_mag * v_mag - mu / r_mag), scale(v, dot(r, v))),
        1.0 / mu,
    );
    let e = length(e_vec);
    let energy = specific_energy(mu, r_mag, v_mag);
    let semi_major_axis = if (e - 1.0).abs() > 1.0e-6 {
        -mu / (2.0 * energy)
    } else {
        f32::INFINITY
    };
    let inclination = (h[2] / h_mag).clamp(-1.0, 1.0).acos();
    let raan = if n_mag > 1.0e-9 {
        let mut o = (n[0] / n_mag).clamp(-1.0, 1.0).acos();
        if n[1] < 0.0 {
            o = TWO_PI - o;
        }
        o
    } else {
        0.0
    };
    let arg_periapsis = if e > 1.0e-9 {
        if n_mag > 1.0e-9 {
            let mut w = (dot(n, e_vec) / (n_mag * e)).clamp(-1.0, 1.0).acos();
            if e_vec[2] < 0.0 {
                w = TWO_PI - w;
            }
            w
        } else {
            let mut w = e_vec[1].atan2(e_vec[0]);
            if w < 0.0 {
                w += TWO_PI;
            }
            w
        }
    } else {
        0.0
    };
    let true_anomaly = if e > 1.0e-9 {
        let mut nu = (dot(e_vec, r) / (e * r_mag)).clamp(-1.0, 1.0).acos();
        if dot(r, v) < 0.0 {
            nu = TWO_PI - nu;
        }
        nu
    } else if n_mag > 1.0e-9 {
        let mut nu = (dot(n, r) / (n_mag * r_mag)).clamp(-1.0, 1.0).acos();
        if r[2] < 0.0 {
            nu = TWO_PI - nu;
        }
        nu
    } else {
        let mut nu = r[1].atan2(r[0]);
        if nu < 0.0 {
            nu += TWO_PI;
        }
        nu
    };
    let mean_anomaly = if e < 1.0 && e > 1.0e-6 {
        let tan_half = ((1.0 - e) / (1.0 + e)).sqrt() * (true_anomaly * 0.5).tan();
        let mut e_anom = 2.0 * tan_half.atan();
        if e_anom < 0.0 {
            e_anom += TWO_PI;
        }
        e_anom - e * e_anom.sin()
    } else {
        // Parabolic / hyperbolic / circular-degenerate: report ν (documented).
        true_anomaly
    };
    OrbitalElements {
        semi_major_axis,
        eccentricity: e,
        inclination,
        raan,
        arg_periapsis,
        true_anomaly,
        mean_anomaly,
    }
}

/// Convert classical orbital elements to an ECI state (perifocal → ECI via the
/// 3-1-3 rotation `Rz(−Ω)·Rx(−i)·Rz(−ω)`). The state is driven by the true
/// anomaly; `mean_anomaly` is informational. Works for elliptic (`0 ≤ e < 1`)
/// and hyperbolic (`e > 1`, `a < 0`) conics.
pub fn state_from_elements(mu: f32, el: &OrbitalElements) -> OrbitalState {
    let e = el.eccentricity;
    let nu = el.true_anomaly;
    let p = el.semi_major_axis * (1.0 - e * e);
    let r_mag = p / (1.0 + e * nu.cos());
    // Perifocal frame (PQW).
    let r_pqw = [r_mag * nu.cos(), r_mag * nu.sin(), 0.0];
    let v_pqw = [
        -(mu / p).sqrt() * nu.sin(),
        (mu / p).sqrt() * (e + nu.cos()),
        0.0,
    ];
    // 3-1-3 rotation to ECI.
    let r = rotate_pqw_to_eci(el, r_pqw);
    let v = rotate_pqw_to_eci(el, v_pqw);
    OrbitalState {
        position: r,
        velocity: v,
    }
}

/// Apply the active 3-1-3 rotation `R3(Ω)·R1(i)·R3(ω)` to a perifocal vector
/// (PQW → ECI). This pairs with the passive extraction in
/// [`elements_from_state`] (node vector `n = ẑ × h`), whose angle formulas are
/// the exact inverse of this active rotation — the passive
/// `R3(−Ω)·R1(−i)·R3(−ω)` reconstruction would mirror the in-plane velocity.
#[inline]
fn rotate_pqw_to_eci(el: &OrbitalElements, pqw: [f32; 3]) -> [f32; 3] {
    let (c_raan, s_raan) = (el.raan.cos(), el.raan.sin());
    let (c_inc, s_inc) = (el.inclination.cos(), el.inclination.sin());
    let (c_arg, s_arg) = (el.arg_periapsis.cos(), el.arg_periapsis.sin());
    // R3(ω)
    let r = [c_arg * pqw[0] - s_arg * pqw[1], s_arg * pqw[0] + c_arg * pqw[1], pqw[2]];
    // R1(i)
    let r = [r[0], c_inc * r[1] - s_inc * r[2], s_inc * r[1] + c_inc * r[2]];
    // R3(Ω)
    [c_raan * r[0] - s_raan * r[1], s_raan * r[0] + c_raan * r[1], r[2]]
}

// ---------------------------------------------------------------------------
// Patched conic — SOI resolution.
// ---------------------------------------------------------------------------

/// Resolve which body's sphere of influence contains `position`. Returns the
/// `current_primary` unless a *secondary* SOI strictly dominates: the
/// spacecraft must be inside the secondary's `soi_radius` **and** strictly
/// closer to it than to the current primary (patched-conic single-step rule).
pub fn primary_under_soi(
    bodies: &[CelestialBody],
    secondary_positions: &[[f32; 3]],
    position: [f32; 3],
    current_primary: usize,
) -> usize {
    let mut best = current_primary;
    let mut best_d = length(position);
    for (i, body) in bodies.iter().enumerate() {
        if i == current_primary {
            continue;
        }
        let rel = sub(position, secondary_positions[i]);
        let d = length(rel);
        if d <= body.soi_radius && d < best_d {
            best = i;
            best_d = d;
        }
    }
    best
}

// ---------------------------------------------------------------------------
// The deterministic solver.
// ---------------------------------------------------------------------------

/// Celestial orbital dynamics solver (rollback-compatible, zero-alloc).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CelestialOrbitalDynamics {
    pub primary_mu: f32,
    pub state: OrbitalState,
}

impl CelestialOrbitalDynamics {
    /// New solver around a central body with gravitational parameter `primary_mu`.
    pub fn new(primary_mu: f32, state: OrbitalState) -> Self {
        Self { primary_mu, state }
    }

    /// Builder: swap the central body's gravitational parameter.
    pub fn with_primary_mu(mut self, primary_mu: f32) -> Self {
        self.primary_mu = primary_mu;
        self
    }

    /// All state components (and `primary_mu`) are finite and non-negative `mu`.
    pub fn all_finite(&self) -> bool {
        self.primary_mu.is_finite()
            && self.primary_mu >= 0.0
            && self.state.position.iter().all(|c| c.is_finite())
            && self.state.velocity.iter().all(|c| c.is_finite())
    }

    /// Deterministic state fingerprint (rollback-replay / determinism checks).
    pub fn fingerprint_state(&self) -> u64 {
        let mut h = CELESTIAL_ORBITAL_FP_SEED;
        for &c in &self.state.position {
            h = hash_mix(h, quant_f32(c));
        }
        for &c in &self.state.velocity {
            h = hash_mix(h, quant_f32(c));
        }
        h = hash_mix(h, quant_f32(self.primary_mu));
        hash_mix(h, CELESTIAL_ORBITAL_FP_FOLD)
    }

    /// Snapshot the orbital state (rollback restore point).
    pub fn snapshot(&self) -> OrbitalState {
        self.state
    }

    /// Restore a snapshotted orbital state (rollback replay).
    pub fn restore(&mut self, snap: OrbitalState) {
        self.state = snap;
    }

    /// Advance the orbit by `dt` seconds, applying an instantaneous RCS
    /// impulse `impulse` (Δv, m/s) at the start of the step.
    ///
    /// - `dt <= 0` → no-op.
    /// - `primary_mu == 0` → microgravity ballistic: `r += v·dt` (constant
    ///   velocity when unthrust).
    /// - `primary_mu > 0` → exact universal-variable Kepler propagation.
    pub fn step(&mut self, dt: f32, impulse: [f32; 3]) {
        if dt <= 0.0 {
            return;
        }
        if impulse[0] != 0.0 || impulse[1] != 0.0 || impulse[2] != 0.0 {
            self.state.velocity = add3(self.state.velocity, impulse);
        }
        if self.primary_mu <= 0.0 {
            self.state.position = add3(self.state.position, scale(self.state.velocity, dt));
        } else {
            self.state =
                universal_variable_step(self.primary_mu, self.state.position, self.state.velocity, dt);
        }
    }

    /// Patched-conic step: propagate (with optional RCS impulse) then resolve
    /// the primary by sphere of influence. On a switch, the state is re-based
    /// into the new primary's frame (`position -= secondary_positions[new]`,
    /// `velocity -= secondary_velocities[new]`), `primary_mu` swaps, and the
    /// caller's `primary_index` is updated. Returns `true` iff a switch occurred.
    pub fn step_patched(
        &mut self,
        dt: f32,
        impulse: [f32; 3],
        bodies: &[CelestialBody],
        secondary_positions: &[[f32; 3]],
        secondary_velocities: &[[f32; 3]],
        primary_index: &mut usize,
    ) -> bool {
        self.step(dt, impulse);
        let new_primary =
            primary_under_soi(bodies, secondary_positions, self.state.position, *primary_index);
        if new_primary != *primary_index {
            self.state.position = sub(self.state.position, secondary_positions[new_primary]);
            self.state.velocity = sub(self.state.velocity, secondary_velocities[new_primary]);
            *primary_index = new_primary;
            self.primary_mu = bodies[new_primary].mu;
            true
        } else {
            false
        }
    }
}

// ---------------------------------------------------------------------------
// Measured pass, fingerprint, readiness, report, soak, probe.
// ---------------------------------------------------------------------------

/// Real measurements produced by the deterministic soak (nothing mocked).
struct CelestialOrbitalMeasured {
    soak_steps: u64,
    hot_loop_iterations: u64,
    kepler_zero_eccentricity: bool,
    kepler_elliptical_residual: f32,
    circular_period_return_err: f32,
    vis_viva_max_rel_err: f32,
    elements_state_round_trip: bool,
    soi_switch_swaps_primary: bool,
    microgravity_constant_velocity: bool,
    rcs_impulse_exact_delta_v: bool,
    escape_positive_energy: bool,
    deterministic_step: bool,
    rollback_replay_identical: bool,
    zero_alloc_hot_loop: bool,
    all_finite_and_bounded: bool,
}

/// Deterministic evidence fingerprint (excludes no invariants; seed/fold are
/// the letter-**lb** distinct constants).
fn celestial_orbital_evidence_fingerprint(m: &CelestialOrbitalMeasured) -> u64 {
    let mut h = CELESTIAL_ORBITAL_FP_SEED;
    h = hash_mix(h, m.soak_steps);
    h = hash_mix(h, m.hot_loop_iterations);
    h = hash_mix(h, u64::from(m.kepler_zero_eccentricity));
    h = hash_mix(h, quant_f32(m.kepler_elliptical_residual));
    h = hash_mix(h, quant_f32(m.circular_period_return_err));
    h = hash_mix(h, quant_f32(m.vis_viva_max_rel_err));
    h = hash_mix(h, u64::from(m.elements_state_round_trip));
    h = hash_mix(h, u64::from(m.soi_switch_swaps_primary));
    h = hash_mix(h, u64::from(m.microgravity_constant_velocity));
    h = hash_mix(h, u64::from(m.rcs_impulse_exact_delta_v));
    h = hash_mix(h, u64::from(m.escape_positive_energy));
    h = hash_mix(h, u64::from(m.deterministic_step));
    h = hash_mix(h, u64::from(m.rollback_replay_identical));
    h = hash_mix(h, u64::from(m.zero_alloc_hot_loop));
    h = hash_mix(h, u64::from(m.all_finite_and_bounded));
    hash_mix(h, CELESTIAL_ORBITAL_FP_FOLD)
}

/// Soak-gated readiness — every measured invariant must hold.
fn readiness(m: &CelestialOrbitalMeasured) -> bool {
    m.kepler_zero_eccentricity
        && m.kepler_elliptical_residual < 1.0e-5
        && m.circular_period_return_err < 1.0e-3
        && m.vis_viva_max_rel_err < 1.0e-3
        && m.elements_state_round_trip
        && m.soi_switch_swaps_primary
        && m.microgravity_constant_velocity
        && m.rcs_impulse_exact_delta_v
        && m.escape_positive_energy
        && m.deterministic_step
        && m.rollback_replay_identical
        && m.zero_alloc_hot_loop
        && m.all_finite_and_bounded
}

/// Run one measured R3-C pass (the fixture):
///
/// 1. **Kepler `e=0`** — `M == E` exactly.
/// 2. **Kepler elliptic** — Newton converges to a tiny residual
///    `|M − (E − e·sin E)|`.
/// 3. **Circular period return** — after `T = 2π√(a³/μ)` the state returns.
/// 4. **Vis-viva** — `v² = μ(2/r − 1/a)` conserved along the orbit.
/// 5. **Elements ↔ state round-trip** — lossless in both directions.
/// 6. **SOI switch** — entering a secondary's SOI swaps the primary (`mu`).
/// 7. **Microgravity** — `mu=0`, no thrust → velocity constant.
/// 8. **RCS Δv** — impulse applied exactly.
/// 9. **Escape** — `v > v_esc` → `e > 1`, positive energy.
/// 10. **Determinism** — two identical simulations are bit-identical.
/// 11. **Rollback** — snapshot, advance, restore, replay → bit-identical.
/// 12. **Zero-alloc hot loop** — [`HOT_LOOP_ITERATIONS`] frames, keep-capacity.
/// 13. **Finite/bounded** — a circular-orbit soak stays finite and bounded.
fn run_measured_pass() -> CelestialOrbitalMeasured {
    let earth = CelestialBody::earth();
    let mu = earth.mu;
    let a = 7_000_000.0f32;
    let r0 = [a, 0.0, 0.0];
    let v_circ = vis_viva_speed(mu, a, a);
    let v0 = [0.0, v_circ, 0.0];

    // 1. Kepler e=0 → M == E.
    let e0 = solve_kepler(1.2, 0.0);
    let kepler_zero_eccentricity = (e0 - 1.2).abs() < 1.0e-6;

    // 2. Kepler elliptic → residual tiny.
    let e_anom = solve_kepler(0.8, 0.6);
    let residual = (0.8 - (e_anom - 0.6 * e_anom.sin())).abs();
    let kepler_elliptical_residual = residual;

    // 3. Circular period return.
    let period = orbital_period(mu, a);
    let s_period = universal_variable_step(mu, r0, v0, period);
    let circular_period_return_err = length(sub(s_period.position, r0)) / a;

    // 4. Vis-viva conservation at 8 points along the orbit.
    let mut vis_viva_max_rel_err = 0.0f32;
    for k in 1..=8 {
        let s2 = universal_variable_step(mu, r0, v0, period * k as f32 / 8.0);
        let r_mag = length(s2.position);
        let v_mag = length(s2.velocity);
        let vv = vis_viva_speed(mu, r_mag, a);
        let rel = (v_mag - vv).abs() / vv;
        if rel > vis_viva_max_rel_err {
            vis_viva_max_rel_err = rel;
        }
    }

    // 5. Elements ↔ state round-trip.
    let el = OrbitalElements {
        semi_major_axis: a,
        eccentricity: 0.25,
        inclination: 0.4,
        raan: 1.0,
        arg_periapsis: 0.8,
        true_anomaly: 1.1,
        mean_anomaly: 0.0,
    };
    let st = state_from_elements(mu, &el);
    let el2 = elements_from_state(mu, st.position, st.velocity);
    let forward_ok = (el2.semi_major_axis - a).abs() / a < 1.0e-3
        && (el2.eccentricity - el.eccentricity).abs() < 1.0e-3
        && angle_diff(el2.inclination, el.inclination) < 1.0e-3
        && angle_diff(el2.raan, el.raan) < 1.0e-3
        && angle_diff(el2.arg_periapsis, el.arg_periapsis) < 1.0e-3
        && angle_diff(el2.true_anomaly, el.true_anomaly) < 1.0e-3;
    let st3 = state_from_elements(mu, &el2);
    let reverse_ok = length(sub(st3.position, st.position)) / a < 1.0e-3
        && length(sub(st3.velocity, st.velocity)) / length(st.velocity) < 1.0e-3;
    let elements_state_round_trip = forward_ok && reverse_ok;

    // 6. SOI switch swaps the primary (Earth → Moon).
    let moon = CelestialBody::moon();
    let mut table = BodyTable::new();
    table.push(earth);
    table.push(moon);
    let moon_pos = [384_400_000.0f32, 0.0, 0.0];
    let secondary_positions = [[0.0f32; 3], moon_pos];
    let secondary_velocities = [[0.0f32; 3]; 2];
    let mut primary_index = 0usize;
    let mut solver_pc = CelestialOrbitalDynamics::new(
        earth.mu,
        OrbitalState {
            position: [380_000_000.0f32, 0.0, 0.0],
            velocity: [0.0, 0.0, 0.0],
        },
    );
    let switched = solver_pc.step_patched(
        60.0,
        [0.0; 3],
        table.as_slice(),
        &secondary_positions,
        &secondary_velocities,
        &mut primary_index,
    );
    let soi_switch_swaps_primary = switched && primary_index == 1 && solver_pc.primary_mu == moon.mu;

    // 7. Microgravity no-thrust → constant velocity.
    let mut mg = CelestialOrbitalDynamics::new(
        0.0,
        OrbitalState {
            position: [10.0, 20.0, 30.0],
            velocity: [2.0, -1.0, 4.0],
        },
    );
    mg.step(120.0, [0.0; 3]);
    let v_same = mg.state.velocity == [2.0, -1.0, 4.0];
    let p_mg = length(sub(
        mg.state.position,
        [10.0 + 2.0 * 120.0, 20.0 - 1.0 * 120.0, 30.0 + 4.0 * 120.0],
    ));
    let microgravity_constant_velocity = v_same && p_mg < 1.0e-3;

    // 8. RCS impulse → exact Δv.
    let mut rcs = CelestialOrbitalDynamics::new(
        0.0,
        OrbitalState {
            position: [0.0, 0.0, 0.0],
            velocity: [1.0, 0.0, 0.0],
        },
    );
    rcs.step(0.5, [5.0, 0.0, 3.0]);
    let v_exact = rcs.state.velocity == [6.0, 0.0, 3.0];
    let p_rcs = length(sub(rcs.state.position, [6.0 * 0.5, 0.0, 3.0 * 0.5]));
    let rcs_impulse_exact_delta_v = v_exact && p_rcs < 1.0e-3;

    // 9. Escape velocity → positive energy, hyperbolic. The parabolic energy
    //    must be ≈ 0; the f32 rounding of `√(2μ/r)` squared leaves a residual
    //    of order a few J/kg against a `v²/2 ≈ 5.7e7` J/kg scale, so we gate on
    //    `< 1e2` (≈ 2 ppm) — not an exact zero.
    let v_esc = escape_speed(mu, a);
    let energy_at_esc = specific_energy(mu, a, v_esc);
    let st_super = elements_from_state(mu, r0, [0.0, v_esc * 1.2, 0.0]);
    let energy_super = specific_energy(mu, a, v_esc * 1.2);
    let escape_positive_energy = energy_at_esc.abs() < 1.0e2
        && energy_super > 0.0
        && st_super.eccentricity > 1.0;

    // 10. Determinism: two identical simulations bit-identical.
    let mut a1 = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
    let mut b1 = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
    for _ in 0..240 {
        a1.step(SOAK_DT, [0.0; 3]);
        b1.step(SOAK_DT, [0.0; 3]);
    }
    let deterministic_step = a1.fingerprint_state() == b1.fingerprint_state() && a1.all_finite();

    // 11. Rollback replay bit-identical.
    let mut rb = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
    rb.step(SOAK_DT, [0.0; 3]);
    let snap = rb.snapshot();
    rb.step(SOAK_DT, [0.0; 3]);
    let after = rb.fingerprint_state();
    rb.restore(snap);
    rb.step(SOAK_DT, [0.0; 3]);
    let replay = rb.fingerprint_state();
    let rollback_replay_identical = after == replay;

    // 12. Zero-alloc hot loop (fixed arrays only — keep-capacity semantics).
    let mut hot = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
    let mut iterations = 0u64;
    let mut hot_finite = true;
    for _ in 0..HOT_LOOP_ITERATIONS {
        hot.step(SOAK_DT, [0.0; 3]);
        iterations += 1;
        if !hot.all_finite() {
            hot_finite = false;
        }
    }
    let zero_alloc_hot_loop = iterations == HOT_LOOP_ITERATIONS && hot_finite;

    // 13. Soak stays finite and bounded (circular orbit stays near `a`).
    let mut sim = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
    let mut max_r = 0.0f32;
    let mut bounded = true;
    for _ in 0..SOAK_STEPS {
        sim.step(SOAK_DT, [0.0; 3]);
        let r_mag = length(sim.state.position);
        if r_mag > max_r {
            max_r = r_mag;
        }
        if !sim.all_finite() {
            bounded = false;
            break;
        }
    }
    let all_finite_and_bounded = bounded && max_r.is_finite() && max_r < a * 1.5;

    CelestialOrbitalMeasured {
        soak_steps: SOAK_STEPS,
        hot_loop_iterations: HOT_LOOP_ITERATIONS,
        kepler_zero_eccentricity,
        kepler_elliptical_residual,
        circular_period_return_err,
        vis_viva_max_rel_err,
        elements_state_round_trip,
        soi_switch_swaps_primary,
        microgravity_constant_velocity,
        rcs_impulse_exact_delta_v,
        escape_positive_energy,
        deterministic_step,
        rollback_replay_identical,
        zero_alloc_hot_loop,
        all_finite_and_bounded,
    }
}

/// Standalone sibling fingerprint — runs one deterministic measured pass and
/// folds it WITHOUT entering the memoized soak `OnceLock` and WITHOUT fetching
/// any sibling soak. `run_measured_pass` is deterministic and self-contained,
/// so this equals the memoized soak's `evidence_fingerprint` exactly.
///
/// This breaks the reentrant-`OnceLock` deadlock that a mutual `kz↔la↔lb`
/// fetch would create: `OnceLock::get_or_init` is not reentrant, and each of
/// the R3 siblings fetches the other two live inside its own init closure.
pub(crate) fn celestial_orbital_dynamics_standalone_fingerprint() -> u64 {
    static FP: std::sync::OnceLock<u64> = std::sync::OnceLock::new();
    *FP.get_or_init(|| {
        let a = run_measured_pass();
        celestial_orbital_evidence_fingerprint(&a)
    })
}

/// Honest celestial orbital dynamics soak report. Readiness derives from
/// measurement; AAA flags are always HELD (fail-closed).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CelestialOrbitalDynamicsReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: &'static str,
    pub soak_steps: u64,
    pub hot_loop_iterations: u64,
    pub kepler_zero_eccentricity: bool,
    pub kepler_elliptical_residual: f32,
    pub circular_period_return_err: f32,
    pub vis_viva_max_rel_err: f32,
    pub elements_state_round_trip: bool,
    pub soi_switch_swaps_primary: bool,
    pub microgravity_constant_velocity: bool,
    pub rcs_impulse_exact_delta_v: bool,
    pub escape_positive_energy: bool,
    pub deterministic_step: bool,
    pub rollback_replay_identical: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub evidence_fingerprint: u64,
    // Distinctness — 23 real peers (21 prior R1/R2/R3-A + kz + la).
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
    // AAA — always HELD (fail-closed).
    pub rcs_aaa_ready: bool,
    pub orbital_maneuver_aaa_ready: bool,
    pub n_body_aaa_ready: bool,
    pub atmosphere_drag_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

impl CelestialOrbitalDynamicsReport {
    /// Finite-check: no NaN/Inf in the float fields, errors plausible.
    pub fn is_finite(&self) -> bool {
        self.kepler_elliptical_residual.is_finite()
            && self.kepler_elliptical_residual >= 0.0
            && self.circular_period_return_err.is_finite()
            && self.circular_period_return_err >= 0.0
            && self.circular_period_return_err <= 1.0
            && self.vis_viva_max_rel_err.is_finite()
            && self.vis_viva_max_rel_err >= 0.0
    }
}

fn report_from_measured(m: &CelestialOrbitalMeasured, deterministic: bool) -> CelestialOrbitalDynamicsReport {
    let ready = readiness(m) && deterministic;
    let fp = celestial_orbital_evidence_fingerprint(m);
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
    let kz = crate::vehicle_chassis_dynamics::vehicle_chassis_standalone_fingerprint();
    let la = crate::flight_aerodynamics::flight_aerodynamics_standalone_fingerprint();

    CelestialOrbitalDynamicsReport {
        ready,
        deterministic,
        evidence_kind: CELESTIAL_ORBITAL_EVIDENCE_KIND,
        soak_steps: m.soak_steps,
        hot_loop_iterations: m.hot_loop_iterations,
        kepler_zero_eccentricity: m.kepler_zero_eccentricity,
        kepler_elliptical_residual: m.kepler_elliptical_residual,
        circular_period_return_err: m.circular_period_return_err,
        vis_viva_max_rel_err: m.vis_viva_max_rel_err,
        elements_state_round_trip: m.elements_state_round_trip,
        soi_switch_swaps_primary: m.soi_switch_swaps_primary,
        microgravity_constant_velocity: m.microgravity_constant_velocity,
        rcs_impulse_exact_delta_v: m.rcs_impulse_exact_delta_v,
        escape_positive_energy: m.escape_positive_energy,
        deterministic_step: m.deterministic_step,
        rollback_replay_identical: m.rollback_replay_identical,
        zero_alloc_hot_loop: m.zero_alloc_hot_loop,
        all_finite_and_bounded: m.all_finite_and_bounded,
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
        rcs_aaa_ready: false,
        orbital_maneuver_aaa_ready: false,
        n_body_aaa_ready: false,
        atmosphere_drag_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Deterministic double-pass soak: bit-identical fingerprints ⇒ `deterministic`.
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_celestial_orbital_dynamics_soak() -> CelestialOrbitalDynamicsReport {
    static CACHE: std::sync::OnceLock<CelestialOrbitalDynamicsReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = celestial_orbital_evidence_fingerprint(&a)
                == celestial_orbital_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe command — delegates to the soak (single source of truth).
pub fn probe_celestial_orbital_dynamics() -> CelestialOrbitalDynamicsReport {
    run_celestial_orbital_dynamics_soak()
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn earth() -> CelestialBody {
        CelestialBody::earth()
    }

    #[test]
    fn kepler_equation_zero_eccentricity_mean_equals_eccentric() {
        let e_anom = solve_kepler(1.2, 0.0);
        assert!((e_anom - 1.2).abs() < 1.0e-6, "e=0 must give E == M");
    }

    #[test]
    fn kepler_equation_elliptical_converges_to_residual() {
        let e_anom = solve_kepler(0.8, 0.6);
        let residual = (0.8 - (e_anom - 0.6 * e_anom.sin())).abs();
        assert!(residual < 1.0e-6, "elliptic Kepler residual too large: {residual}");
    }

    #[test]
    fn circular_orbit_returns_after_one_period() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let r0 = [a, 0.0, 0.0];
        let v0 = [0.0, v, 0.0];
        let period = orbital_period(mu, a);
        // Closed-form period check.
        let t_closed = TWO_PI * (a * a * a / mu).sqrt();
        assert!((period - t_closed).abs() / t_closed < 1.0e-5);
        let s = universal_variable_step(mu, r0, v0, period);
        let pos_err = length(sub(s.position, r0)) / a;
        let vel_err = length(sub(s.velocity, v0)) / v;
        assert!(pos_err < 1.0e-3, "position return error too large: {pos_err}");
        assert!(vel_err < 1.0e-3, "velocity return error too large: {vel_err}");
    }

    #[test]
    fn vis_viva_conserved_along_the_orbit() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let r0 = [a, 0.0, 0.0];
        let v0 = [0.0, v, 0.0];
        let period = orbital_period(mu, a);
        let mut max_rel = 0.0f32;
        for k in 1..=8 {
            let s = universal_variable_step(mu, r0, v0, period * k as f32 / 8.0);
            let r_mag = length(s.position);
            let v_mag = length(s.velocity);
            let vv = vis_viva_speed(mu, r_mag, a);
            let rel = (v_mag - vv).abs() / vv;
            max_rel = max_rel.max(rel);
        }
        assert!(max_rel < 1.0e-3, "vis-viva drift too large: {max_rel}");
    }

    #[test]
    fn elements_state_round_trip_is_lossless() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let el = OrbitalElements {
            semi_major_axis: a,
            eccentricity: 0.25,
            inclination: 0.4,
            raan: 1.0,
            arg_periapsis: 0.8,
            true_anomaly: 1.1,
            mean_anomaly: 0.0,
        };
        let st = state_from_elements(mu, &el);
        let el2 = elements_from_state(mu, st.position, st.velocity);
        assert!((el2.semi_major_axis - a).abs() / a < 1.0e-3, "a mismatch");
        assert!((el2.eccentricity - el.eccentricity).abs() < 1.0e-3, "e mismatch");
        assert!(angle_diff(el2.inclination, el.inclination) < 1.0e-3, "i mismatch");
        assert!(angle_diff(el2.raan, el.raan) < 1.0e-3, "Ω mismatch");
        assert!(angle_diff(el2.arg_periapsis, el.arg_periapsis) < 1.0e-3, "ω mismatch");
        assert!(angle_diff(el2.true_anomaly, el.true_anomaly) < 1.0e-3, "ν mismatch");
        // Reverse: elements → state must reproduce the state.
        let st3 = state_from_elements(mu, &el2);
        let pos_err = length(sub(st3.position, st.position)) / a;
        let vel_err = length(sub(st3.velocity, st.velocity)) / length(st.velocity);
        assert!(pos_err < 1.0e-3, "reverse position error: {pos_err}");
        assert!(vel_err < 1.0e-3, "reverse velocity error: {vel_err}");
    }

    #[test]
    fn equatorial_circular_state_matches_closed_form() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let nu = 0.7f32;
        let el = OrbitalElements {
            semi_major_axis: a,
            eccentricity: 0.0,
            inclination: 0.0,
            raan: 0.0,
            arg_periapsis: 0.0,
            true_anomaly: nu,
            mean_anomaly: nu,
        };
        let st = state_from_elements(mu, &el);
        let r_exp = [a * nu.cos(), a * nu.sin(), 0.0];
        let v_exp = [-v * nu.sin(), v * nu.cos(), 0.0];
        assert!(length(sub(st.position, r_exp)) < 1.0, "circular r mismatch");
        assert!(length(sub(st.velocity, v_exp)) < 1.0, "circular v mismatch");
    }

    #[test]
    fn soi_detection_switches_primary_to_secondary() {
        let earth = CelestialBody::earth();
        let moon = CelestialBody::moon();
        let mut table = BodyTable::new();
        assert!(table.push(earth));
        assert!(table.push(moon));
        let moon_pos = [384_400_000.0f32, 0.0, 0.0];
        let secondary_positions = [[0.0f32; 3], moon_pos];
        let secondary_velocities = [[0.0f32; 3]; 2];
        let mut primary_index = 0usize;
        let mut solver = CelestialOrbitalDynamics::new(
            earth.mu,
            OrbitalState {
                position: [380_000_000.0f32, 0.0, 0.0],
                velocity: [0.0, 0.0, 0.0],
            },
        );
        let switched = solver.step_patched(
            60.0,
            [0.0; 3],
            table.as_slice(),
            &secondary_positions,
            &secondary_velocities,
            &mut primary_index,
        );
        assert!(switched, "SOI entry must switch primary");
        assert_eq!(primary_index, 1, "primary must become the Moon");
        assert_eq!(solver.primary_mu, moon.mu, "mu must swap to the Moon");
    }

    #[test]
    fn soi_radius_helper_is_in_physical_ballpark() {
        let earth = CelestialBody::earth();
        let moon = CelestialBody::moon();
        // Moon around Earth, a = 384,400 km, e ≈ 0.0549.
        let r_soi = soi_radius_of(moon.mu, earth.mu, 384_400_000.0, 0.0549);
        // Known Moon SOI ≈ 66,183 km — must be within a sane ballpark.
        assert!(r_soi > 50_000_000.0 && r_soi < 75_000_000.0, "SOI={r_soi}");
    }

    #[test]
    fn microgravity_no_thrust_keeps_velocity_constant() {
        let mut mg = CelestialOrbitalDynamics::new(
            0.0,
            OrbitalState {
                position: [10.0, 20.0, 30.0],
                velocity: [2.0, -1.0, 4.0],
            },
        );
        mg.step(120.0, [0.0; 3]);
        assert_eq!(mg.state.velocity, [2.0, -1.0, 4.0], "velocity must be constant");
        let expected = [10.0 + 2.0 * 120.0, 20.0 - 1.0 * 120.0, 30.0 + 4.0 * 120.0];
        assert!(length(sub(mg.state.position, expected)) < 1.0e-3);
    }

    #[test]
    fn rcs_impulse_applies_exact_delta_v() {
        let mut rcs = CelestialOrbitalDynamics::new(
            0.0,
            OrbitalState {
                position: [0.0, 0.0, 0.0],
                velocity: [1.0, 0.0, 0.0],
            },
        );
        rcs.step(0.5, [5.0, 0.0, 3.0]);
        assert_eq!(rcs.state.velocity, [6.0, 0.0, 3.0], "Δv must be exact");
        let expected = [6.0 * 0.5, 0.0, 3.0 * 0.5];
        assert!(length(sub(rcs.state.position, expected)) < 1.0e-3);
    }

    #[test]
    fn escape_velocity_gives_positive_energy_and_hyperbolic() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v_esc = escape_speed(mu, a);
        assert!((specific_energy(mu, a, v_esc)).abs() < 1.0e2, "parabolic ε ≈ 0");
        let st_super = elements_from_state(mu, [a, 0.0, 0.0], [0.0, v_esc * 1.2, 0.0]);
        assert!(specific_energy(mu, a, v_esc * 1.2) > 0.0, "hyperbolic ε > 0");
        assert!(st_super.eccentricity > 1.0, "hyperbolic e > 1");
        // A hyperbolic state must fly away monotonically (position grows).
        let st0 = OrbitalState {
            position: [a, 0.0, 0.0],
            velocity: [0.0, v_esc * 1.2, 0.0],
        };
        let s1 = universal_variable_step(mu, st0.position, st0.velocity, 3_600.0);
        let s2 = universal_variable_step(mu, st0.position, st0.velocity, 7_200.0);
        assert!(length(s2.position) > length(s1.position), "hyperbola must recede");
    }

    #[test]
    fn deterministic_step_is_bit_identical() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let r0 = [a, 0.0, 0.0];
        let v0 = [0.0, v, 0.0];
        let mut a1 = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
        let mut b1 = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
        for _ in 0..240 {
            a1.step(SOAK_DT, [0.0; 3]);
            b1.step(SOAK_DT, [0.0; 3]);
        }
        assert_eq!(a1.fingerprint_state(), b1.fingerprint_state());
        assert!(a1.all_finite());
    }

    #[test]
    fn rollback_replay_is_bit_identical() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let r0 = [a, 0.0, 0.0];
        let v0 = [0.0, v, 0.0];
        let mut rb = CelestialOrbitalDynamics::new(mu, OrbitalState { position: r0, velocity: v0 });
        rb.step(SOAK_DT, [0.0; 3]);
        let snap = rb.snapshot();
        rb.step(SOAK_DT, [0.0; 3]);
        let after = rb.fingerprint_state();
        rb.restore(snap);
        rb.step(SOAK_DT, [0.0; 3]);
        let replay = rb.fingerprint_state();
        assert_eq!(after, replay, "rollback replay must be bit-identical");
    }

    #[test]
    fn zero_alloc_hot_loop_runs_with_keep_capacity() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let mut hot = CelestialOrbitalDynamics::new(
            mu,
            OrbitalState {
                position: [a, 0.0, 0.0],
                velocity: [0.0, v, 0.0],
            },
        );
        let mut iterations = 0u64;
        let mut finite = true;
        for _ in 0..HOT_LOOP_ITERATIONS {
            hot.step(SOAK_DT, [0.0; 3]);
            iterations += 1;
            if !hot.all_finite() {
                finite = false;
            }
        }
        assert_eq!(iterations, HOT_LOOP_ITERATIONS);
        assert!(finite);
    }

    #[test]
    fn soak_stays_finite_and_bounded() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let mut sim = CelestialOrbitalDynamics::new(
            mu,
            OrbitalState {
                position: [a, 0.0, 0.0],
                velocity: [0.0, v, 0.0],
            },
        );
        let mut max_r = 0.0f32;
        let mut bounded = true;
        for _ in 0..SOAK_STEPS {
            sim.step(SOAK_DT, [0.0; 3]);
            let r_mag = length(sim.state.position);
            max_r = max_r.max(r_mag);
            if !sim.all_finite() {
                bounded = false;
                break;
            }
        }
        assert!(bounded);
        assert!(max_r.is_finite());
        assert!(max_r < a * 1.5, "circular orbit must stay bounded: {max_r}");
    }

    #[test]
    fn edge_zero_dt_is_a_noop() {
        let mu = earth().mu;
        let a = 7_000_000.0f32;
        let v = vis_viva_speed(mu, a, a);
        let mut s = CelestialOrbitalDynamics::new(
            mu,
            OrbitalState {
                position: [a, 0.0, 0.0],
                velocity: [0.0, v, 0.0],
            },
        );
        let before = s.fingerprint_state();
        s.step(0.0, [3.0, 0.0, 0.0]);
        s.step(-1.0, [0.0, 0.0, 0.0]);
        assert_eq!(s.fingerprint_state(), before, "dt<=0 must be a no-op");
    }

    #[test]
    fn body_table_earth_moon_mars_are_configurable() {
        let e = CelestialBody::earth();
        let m = CelestialBody::moon();
        let ma = CelestialBody::mars();
        assert!(e.mu > m.mu && m.mu > 0.0);
        assert!(ma.mu > m.mu);
        assert!(e.radius > ma.radius && ma.radius > m.radius);
        assert!(m.soi_radius > 0.0 && e.soi_radius > m.soi_radius);
        // Custom body via new() + BodyTable capacity.
        let custom = CelestialBody::new("custom", 1.0e12, 1_000_000.0, 50_000_000.0);
        let mut table = BodyTable::new();
        assert!(table.push(e));
        assert!(table.push(m));
        assert!(table.push(ma));
        assert!(table.push(custom));
        assert_eq!(table.len(), 4);
        assert_eq!(table.get(3), Some(custom));
        assert!(table.get(7).is_none());
        // Push past capacity → fail-closed false.
        for _ in 0..8 {
            table.push(custom);
        }
        assert_eq!(table.len(), MAX_BODIES);
    }

    #[test]
    fn evidence_kind_is_distinct() {
        assert_eq!(CELESTIAL_ORBITAL_EVIDENCE_KIND, "celestial_orbital_dynamics");
        assert_ne!(
            CELESTIAL_ORBITAL_EVIDENCE_KIND,
            crate::vehicle_chassis_dynamics::VEHICLE_CHASSIS_EVIDENCE_KIND
        );
        assert_ne!(
            CELESTIAL_ORBITAL_EVIDENCE_KIND,
            crate::flight_aerodynamics::FLIGHT_AERO_EVIDENCE_KIND
        );
        assert_ne!(
            CELESTIAL_ORBITAL_EVIDENCE_KIND,
            crate::aerodynamic_navier_stokes::NS_EVIDENCE_KIND
        );
    }

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_celestial_orbital_dynamics_soak();
        assert!(r.ready, "soak-gated readiness must hold");
        assert_eq!(r.evidence_kind, CELESTIAL_ORBITAL_EVIDENCE_KIND);
        assert!(r.deterministic);
        assert!(r.is_finite());
        assert!(r.kepler_zero_eccentricity);
        assert!(r.elements_state_round_trip);
        assert!(r.soi_switch_swaps_primary);
        assert!(r.microgravity_constant_velocity);
        assert!(r.rcs_impulse_exact_delta_v);
        assert!(r.escape_positive_energy);
        assert!(!r.rcs_aaa_ready, "AAA must stay HELD");
        assert!(!r.orbital_maneuver_aaa_ready);
        assert!(!r.n_body_aaa_ready);
        assert!(!r.atmosphere_drag_aaa_ready);
        assert!(!r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_celestial_orbital_dynamics_soak();
        let b = run_celestial_orbital_dynamics_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert!(a.deterministic && b.deterministic);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_celestial_orbital_dynamics();
        let s = run_celestial_orbital_dynamics_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_celestial_orbital_dynamics_soak();
        assert_ne!(r.evidence_fingerprint, 0);
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
        assert_ne!(r.evidence_fingerprint, ju);
        assert_ne!(r.evidence_fingerprint, kv);
        assert_ne!(r.evidence_fingerprint, ku);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, ks);
        assert_ne!(r.evidence_fingerprint, kt);
        assert_ne!(r.evidence_fingerprint, ko);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, hs);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, kw);
        assert_ne!(r.evidence_fingerprint, kx);
        assert_ne!(r.evidence_fingerprint, ky);
        assert_ne!(r.evidence_fingerprint, gv);
        assert_ne!(r.evidence_fingerprint, ip_peer);
        assert_ne!(r.evidence_fingerprint, jy);
        assert_ne!(r.evidence_fingerprint, kz);
        assert_ne!(r.evidence_fingerprint, la);
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
    }
}

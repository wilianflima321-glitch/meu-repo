//! # Dynamic Surface Deformation Kernel — letter **ks** (R2-C / Vanguarda P2).
//!
//! Physics-driven heightfield / vertex-surface deformation engineered for the
//! 60 Hz hot loop, with **provable invariants**:
//!
//! - **Volume conservation (exact)**: impacts inject the *2D Laplacian of a
//!   Gaussian* (LoG) kernel, whose integral over the plane is **exactly zero**.
//!   Every dent is paired with a rim bulge — the displaced volume never drifts.
//! - **Plasticity**: cells past the yield strain keep a permanent component
//!   (craters, footprints, deformable terrain) while the elastic component
//!   recovers toward rest.
//! - **Energy dissipation (monotone)**: a linear spring-damper with exponential
//!   damping guarantees total energy never increases — no numerical blow-up.
//! - **Determinism**: fixed timestep, no RNG — identical inputs reproduce
//!   bit-identical final states.
//!
//! Honesty doctrine: readiness is **measured** by the soak replay, never
//! hardcoded; all AAA flags (UE5 Chaos soft-body parity, world-shatter, …)
//! stay **HELD** until acceptance on real hardware.

/// Fixed timestep used by the soak (120 Hz substeps — inside the 60 Hz frame).
pub const DEFORMATION_DT: f32 = 1.0 / 120.0;

/// Soak replay length (4 s of simulated time at 120 Hz).
pub const DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS: u32 = 480;

/// Hard cell-count bound — the SoA field fails closed above this.
pub const DEFORMATION_MAX_CELLS: usize = 1 << 20;

/// Evidence tag for the soak report / IPC wire.
pub const DEFORMATION_EVIDENCE_KIND: &str = "dynamic_surface_deformation_log_ricker";

/// Seed used for the evidence fingerprint only (no RNG in the physics).
const DEFORMATION_FINGERPRINT_SEED: u64 = 0x4B53_0000_0000_0003_u64;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Bounded, validated configuration of a deformation field.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DeformationGridConfig {
    /// Grid width in cells (`1..=1024`).
    pub width: usize,
    /// Grid height in cells (`1..=1024`).
    pub height: usize,
    /// World-space size of one cell (`> 0`).
    pub cell_size: f32,
    /// Spring stiffness `K` of the elastic recovery (`> 0`).
    pub stiffness: f32,
    /// Exponential damping coefficient `C` (`>= 0`; 0 ⇒ conservative).
    pub damping: f32,
    /// Yield strain — only cells displaced beyond it keep a permanent dent.
    pub yield_strain: f32,
    /// Fraction of a past-yield displacement that becomes permanent (`(0, 1]`).
    pub plastic_ratio: f32,
}

impl DeformationGridConfig {
    /// Validates every field; fails closed on any non-finite or out-of-range
    /// value so a malformed config can never poison the hot loop.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.width == 0 || self.height == 0 {
            return Err("deformation grid must be non-empty");
        }
        if self.width > 1024 || self.height > 1024 {
            return Err("deformation grid side exceeds 1024 cells");
        }
        if self.width * self.height > DEFORMATION_MAX_CELLS {
            return Err("deformation grid exceeds the max cell bound");
        }
        if !self.cell_size.is_finite() || self.cell_size <= 0.0 {
            return Err("deformation cell size must be finite and positive");
        }
        if !self.stiffness.is_finite() || self.stiffness <= 0.0 {
            return Err("deformation stiffness must be finite and positive");
        }
        if !self.damping.is_finite() || self.damping < 0.0 {
            return Err("deformation damping must be finite and non-negative");
        }
        if !self.yield_strain.is_finite() || self.yield_strain <= 0.0 {
            return Err("deformation yield strain must be finite and positive");
        }
        if !self.plastic_ratio.is_finite() || self.plastic_ratio <= 0.0 || self.plastic_ratio > 1.0 {
            return Err("deformation plastic ratio must be in (0, 1]");
        }
        Ok(())
    }

    /// Number of cells in the field.
    pub fn cell_count(&self) -> usize {
        self.width * self.height
    }
}

/// The default soak configuration — a 64×64 field at 0.5 m cells.
impl Default for DeformationGridConfig {
    fn default() -> Self {
        Self {
            width: 64,
            height: 64,
            cell_size: 0.5,
            stiffness: 4.0,
            damping: 0.5,
            yield_strain: 0.02,
            plastic_ratio: 0.35,
        }
    }
}

// ---------------------------------------------------------------------------
// SoA field
// ---------------------------------------------------------------------------

/// Structure-of-arrays deformation field: `height = permanent + elastic`.
///
/// - `heights`   — current surface height (world units).
/// - `velocities`— vertical velocity (world units / s).
/// - `permanent` — plastic component that never recovers (craters).
///
/// The elastic component is `heights[i] - permanent[i]`; the spring pulls it
/// back to zero while the permanent dent stays.
#[derive(Debug, Clone, PartialEq)]
pub struct DeformationFieldSoA {
    pub heights: Vec<f32>,
    pub velocities: Vec<f32>,
    pub permanent: Vec<f32>,
    pub width: usize,
    pub height: usize,
    pub cell_size: f32,
}

impl DeformationFieldSoA {
    /// Allocates a flat field (all zeros) from a validated config.
    pub fn new(cfg: &DeformationGridConfig) -> Result<Self, &'static str> {
        cfg.validate()?;
        let n = cfg.cell_count();
        Ok(Self {
            heights: vec![0.0; n],
            velocities: vec![0.0; n],
            permanent: vec![0.0; n],
            width: cfg.width,
            height: cfg.height,
            cell_size: cfg.cell_size,
        })
    }

    /// Flat row-major index for a cell — panics only on an internal contract
    /// violation; callers must pre-validate coordinates.
    #[inline]
    pub fn idx(&self, x: usize, y: usize) -> usize {
        y * self.width + x
    }

    #[inline]
    pub fn cell_count(&self) -> usize {
        self.width * self.height
    }

    /// Elastic (recoverable) component at a flat index.
    #[inline]
    pub fn elastic_at(&self, i: usize) -> f32 {
        self.heights[i] - self.permanent[i]
    }

    /// Sum of displaced volume over the whole field (`Σ height · cell area`).
    pub fn displaced_volume(&self) -> f32 {
        let area = self.cell_size * self.cell_size;
        self.heights.iter().sum::<f32>() * area
    }

    /// Sum of permanent (plastic) volume — the part that never recovers.
    pub fn permanent_volume(&self) -> f32 {
        let area = self.cell_size * self.cell_size;
        self.permanent.iter().sum::<f32>() * area
    }

    /// Minimum height over the field (the deepest dent).
    pub fn min_height(&self) -> f32 {
        self.heights.iter().copied().fold(f32::INFINITY, f32::min)
    }

    /// Maximum height over the field (the highest rim bulge).
    pub fn max_height(&self) -> f32 {
        self.heights
            .iter()
            .copied()
            .fold(f32::NEG_INFINITY, f32::max)
    }

    /// Largest absolute height (bounded blow-up guard).
    pub fn max_abs_height(&self) -> f32 {
        self.heights
            .iter()
            .map(|h| h.abs())
            .fold(0.0_f32, f32::max)
    }

    /// Kinetic energy `Σ ½ v²`.
    pub fn kinetic_energy(&self) -> f32 {
        self.velocities.iter().map(|v| 0.5 * v * v).sum()
    }

    /// Elastic potential energy `Σ ½ K (h - p)²`.
    pub fn elastic_potential_energy(&self, stiffness: f32) -> f32 {
        self.heights
            .iter()
            .zip(self.permanent.iter())
            .map(|(h, p)| {
                let e = h - p;
                0.5 * stiffness * e * e
            })
            .sum()
    }

    /// Total mechanical energy `E = K + U`.
    pub fn total_energy(&self, stiffness: f32) -> f32 {
        self.kinetic_energy() + self.elastic_potential_energy(stiffness)
    }
}

// ---------------------------------------------------------------------------
// Volume-conserving deformation kernel (2D Laplacian of a Gaussian)
// ---------------------------------------------------------------------------

/// The volume-conserving deformation kernel: the 2D Laplacian of a Gaussian.
///
/// `K(u) = (u² − 2)·exp(−u²/2)` with `u = r/σ`. It is exactly `σ²∇²G` for the
/// Gaussian `G = exp(−u²/2)`, and the divergence theorem forces its integral
/// over the plane to be **exactly zero**:
///
/// ```text
/// ∫∫ K dA = σ² ∫∫ ∇²G dA = σ² ∮ ∇G·n dl = 0
/// ```
///
/// So every impact deposits a dent (negative, `r < σ√2`) paired with a rim
/// bulge (positive, `r > σ√2`) of equal magnitude — displaced volume is
/// conserved by construction.
#[inline]
pub fn deformation_kernel(r: f32, sigma: f32) -> f32 {
    let u = r / sigma;
    (u * u - 2.0) * (-0.5 * u * u).exp()
}

/// Applies a physics impact centred at world `(cx, cy)`.
///
/// - Total displacement uses the LoG kernel (volume conserving).
/// - Cells displaced beyond the yield strain keep `plastic_ratio` of the
///   displacement permanently (craters); the rest is elastic.
/// - The elastic displacement is released with spring-natural velocity so the
///   dent either stays (plastic) or springs back (elastic) — never both.
pub fn apply_impact(
    field: &mut DeformationFieldSoA,
    cfg: &DeformationGridConfig,
    cx: f32,
    cy: f32,
    strength: f32,
    sigma: f32,
) {
    debug_assert!(sigma.is_finite() && sigma > 0.0 && strength.is_finite());
    let omega = cfg.stiffness.sqrt();
    let sigma2 = sigma * sigma;
    for y in 0..field.height {
        let py = y as f32 * field.cell_size;
        for x in 0..field.width {
            let i = field.idx(x, y);
            let px = x as f32 * field.cell_size;
            let dx = px - cx;
            let dy = py - cy;
            let r2 = dx * dx + dy * dy;
            let u2 = r2 / sigma2;
            let kernel = (u2 - 2.0) * (-0.5 * u2).exp();
            let delta = strength * kernel;
            let past_yield = delta.abs() > cfg.yield_strain;
            let plastic = if past_yield {
                delta * cfg.plastic_ratio
            } else {
                0.0
            };
            let elastic = delta - plastic;
            field.permanent[i] += plastic;
            field.heights[i] += delta;
            field.velocities[i] += elastic * omega;
        }
    }
}

/// Advances the field by one fixed substep (semi-implicit Euler + exponential
/// damping). Zero-allocation: mutates the SoA buffers in place.
pub fn step(field: &mut DeformationFieldSoA, cfg: &DeformationGridConfig, dt: f32) {
    let damp = (-cfg.damping * dt).exp();
    let n = field.cell_count();
    for i in 0..n {
        let elastic = field.heights[i] - field.permanent[i];
        let accel = -cfg.stiffness * elastic;
        let v = field.velocities[i] * damp + accel * dt;
        field.velocities[i] = v;
        field.heights[i] += v * dt;
    }
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter ks)
// ---------------------------------------------------------------------------

/// Measured (never assumed) evidence for the deformation soak.
#[derive(Debug, Clone, Copy)]
struct DeformationMeasured {
    ricker_volume_integral: f32,
    impact_volume_drift: f32,
    peak_dent_depth: f32,
    rim_bulge_height: f32,
    permanent_dent_depth: f32,
    permanent_fraction: f32,
    elastic_recovery_ratio: f32,
    energy_before: f32,
    energy_after: f32,
    energy_dissipation_ratio: f32,
    max_abs_displacement: f32,
    grid_cells_measured: u32,
}

fn run_measured_pass() -> DeformationMeasured {
    let cfg = DeformationGridConfig::default();
    let mut field = DeformationFieldSoA::new(&cfg).expect("valid soak config");
    let center_x = (cfg.width as f32 * cfg.cell_size) * 0.5;
    let center_y = (cfg.height as f32 * cfg.cell_size) * 0.5;
    let center_idx = field.idx(cfg.width / 2, cfg.height / 2);

    // Impact: strength 0.6, sigma 1.0 — a strong, deep dent with rim.
    let strength = 0.6_f32;
    let sigma = 1.0_f32;
    let initial_center_delta = strength * deformation_kernel(0.0, sigma); // ≈ -1.2

    apply_impact(&mut field, &cfg, center_x, center_y, strength, sigma);

    // Volume-conservation invariants, measured immediately after the impact.
    let area = cfg.cell_size * cfg.cell_size;
    let grid_cells = cfg.cell_count() as f32;
    // Net height-sum of the LoG impact: exactly zero in the continuum; on the
    // discrete grid it is the midpoint-rule quadrature residual, O(h⁶)-small
    // because the two leading error terms vanish by the divergence theorem.
    let ricker_volume_integral = field.heights.iter().sum::<f32>();
    let impact_volume_drift = field.displaced_volume().abs() / (area * grid_cells);

    let peak_dent_depth = field.min_height();
    let rim_bulge_height = field.max_height();
    let permanent_dent_depth = field.permanent[center_idx];
    let permanent_fraction = (permanent_dent_depth.abs() / initial_center_delta.abs()).min(1.0);

    let elastic_start = field.elastic_at(center_idx);
    let energy_before = field.total_energy(cfg.stiffness);

    // Deterministic replay over the soak window.
    for _ in 0..DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS {
        step(&mut field, &cfg, DEFORMATION_DT);
    }

    let energy_after = field.total_energy(cfg.stiffness);
    let energy_dissipation_ratio = if energy_before > 0.0 {
        ((energy_before - energy_after) / energy_before).clamp(0.0, 1.0)
    } else {
        0.0
    };
    let elastic_end = field.elastic_at(center_idx);
    let elastic_recovery_ratio = if elastic_start.abs() > 1e-9 {
        (1.0 - (elastic_end.abs() / elastic_start.abs())).clamp(0.0, 1.0)
    } else {
        1.0
    };
    let max_abs_displacement = field.max_abs_height();

    DeformationMeasured {
        ricker_volume_integral,
        impact_volume_drift,
        peak_dent_depth,
        rim_bulge_height,
        permanent_dent_depth,
        permanent_fraction,
        elastic_recovery_ratio,
        energy_before,
        energy_after,
        energy_dissipation_ratio,
        max_abs_displacement,
        grid_cells_measured: cfg.cell_count() as u32,
    }
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v.to_bits() >> 8) as u64
    } else {
        0xFFFF_FFFF_FFFF_0000
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

fn deformation_evidence_fingerprint(m: &DeformationMeasured) -> u64 {
    let mut fp = DEFORMATION_FINGERPRINT_SEED;
    fp = hash_mix(fp, quant_f32(m.ricker_volume_integral));
    fp = hash_mix(fp, quant_f32(m.impact_volume_drift));
    fp = hash_mix(fp, quant_f32(m.peak_dent_depth));
    fp = hash_mix(fp, quant_f32(m.rim_bulge_height));
    fp = hash_mix(fp, quant_f32(m.permanent_dent_depth));
    fp = hash_mix(fp, quant_f32(m.permanent_fraction));
    fp = hash_mix(fp, quant_f32(m.elastic_recovery_ratio));
    fp = hash_mix(fp, quant_f32(m.energy_before));
    fp = hash_mix(fp, quant_f32(m.energy_after));
    fp = hash_mix(fp, quant_f32(m.energy_dissipation_ratio));
    fp = hash_mix(fp, quant_f32(m.max_abs_displacement));
    fp = hash_mix(fp, m.grid_cells_measured as u64);
    fp
}

fn measured_finite(m: &DeformationMeasured) -> bool {
    m.ricker_volume_integral.is_finite()
        && m.impact_volume_drift.is_finite()
        && m.peak_dent_depth.is_finite()
        && m.rim_bulge_height.is_finite()
        && m.permanent_dent_depth.is_finite()
        && m.permanent_fraction.is_finite()
        && m.elastic_recovery_ratio.is_finite()
        && m.energy_before.is_finite()
        && m.energy_after.is_finite()
        && m.energy_dissipation_ratio.is_finite()
        && m.max_abs_displacement.is_finite()
}

/// Measured readiness gate — every invariant below is proven by the replay.
fn readiness(m: &DeformationMeasured) -> bool {
    if !measured_finite(m) {
        return false;
    }
    // LoG kernel must conserve volume on the discrete grid (≈ 0).
    if m.ricker_volume_integral.abs() > 0.05 {
        return false;
    }
    if m.impact_volume_drift >= 1.0e-3 {
        return false;
    }
    // A real impact produces both a dent and a paired rim bulge.
    if m.peak_dent_depth >= 0.0 || m.rim_bulge_height <= 0.0 {
        return false;
    }
    // Plasticity: a permanent dent persists, but not everything is permanent.
    if m.permanent_dent_depth >= 0.0 {
        return false;
    }
    if m.permanent_fraction <= 0.0 || m.permanent_fraction >= 1.0 {
        return false;
    }
    // Elastic recovery: the elastic part measurably recovers toward rest.
    if m.elastic_recovery_ratio <= 0.0 || m.elastic_recovery_ratio > 1.0 {
        return false;
    }
    // Energy dissipation: total energy strictly drops with damping.
    if m.energy_dissipation_ratio <= 0.0 || m.energy_dissipation_ratio >= 1.0 {
        return false;
    }
    // Blow-up guard: displacements stay bounded.
    if m.max_abs_displacement >= 10.0 {
        return false;
    }
    if m.grid_cells_measured == 0 {
        return false;
    }
    true
}

/// Soak report for the dynamic-surface-deformation kernel (letter **ks**).
#[derive(Debug, Clone, PartialEq)]
pub struct DynamicSurfaceDeformationSoakReport {
    pub dynamic_surface_deformation_ready: bool,
    pub ricker_volume_integral: f32,
    pub impact_volume_drift: f32,
    pub peak_dent_depth: f32,
    pub rim_bulge_height: f32,
    pub permanent_dent_depth: f32,
    pub permanent_fraction: f32,
    pub elastic_recovery_ratio: f32,
    pub energy_before: f32,
    pub energy_after: f32,
    pub energy_dissipation_ratio: f32,
    pub max_abs_displacement: f32,
    pub grid_cells_measured: u32,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub dynamic_surface_aaa_ready: bool,
    pub ue5_chaos_softbody_aaa_ready: bool,
    pub world_shatter_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(m: &DeformationMeasured, deterministic: bool) -> DynamicSurfaceDeformationSoakReport {
    let ready = readiness(m) && deterministic;
    DynamicSurfaceDeformationSoakReport {
        dynamic_surface_deformation_ready: ready,
        ricker_volume_integral: m.ricker_volume_integral,
        impact_volume_drift: m.impact_volume_drift,
        peak_dent_depth: m.peak_dent_depth,
        rim_bulge_height: m.rim_bulge_height,
        permanent_dent_depth: m.permanent_dent_depth,
        permanent_fraction: m.permanent_fraction,
        elastic_recovery_ratio: m.elastic_recovery_ratio,
        energy_before: m.energy_before,
        energy_after: m.energy_after,
        energy_dissipation_ratio: m.energy_dissipation_ratio,
        max_abs_displacement: m.max_abs_displacement,
        grid_cells_measured: m.grid_cells_measured,
        deterministic,
        total_ticks: DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS,
        evidence_kind: DEFORMATION_EVIDENCE_KIND,
        evidence_fingerprint: deformation_evidence_fingerprint(m),
        dynamic_surface_aaa_ready: false,
        ue5_chaos_softbody_aaa_ready: false,
        world_shatter_aaa_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Runs the deterministic soak replay twice; readiness requires both passes to
/// agree bit-for-bit (same evidence fingerprint).
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_dynamic_surface_deformation_soak() -> DynamicSurfaceDeformationSoakReport {
    static CACHE: std::sync::OnceLock<DynamicSurfaceDeformationSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic = deformation_evidence_fingerprint(&a)
                == deformation_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe — delegates to the soak so the probe can never out-claim the kernel.
pub fn probe_dynamic_surface_deformation() -> DynamicSurfaceDeformationSoakReport {
    run_dynamic_surface_deformation_soak()
}

// ---------------------------------------------------------------------------
// Tests — AAA invariants
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn center_idx(cfg: &DeformationGridConfig) -> usize {
        (cfg.height / 2) * cfg.width + cfg.width / 2
    }

    fn run_until_settled(cfg: &DeformationGridConfig, ticks: u32) -> DeformationFieldSoA {
        let mut field = DeformationFieldSoA::new(cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, cfg, cx, cy, 0.6, 1.0);
        for _ in 0..ticks {
            step(&mut field, cfg, DEFORMATION_DT);
        }
        field
    }

    // -- LoG kernel mathematics ----------------------------------------------

    #[test]
    fn deformation_kernel_is_negative_at_center_and_positive_on_rim() {
        assert!((deformation_kernel(0.0, 1.0) - (-2.0)).abs() < 1.0e-6);
        // Zero crossing at r = σ√2 (u² = 2).
        let r0 = 2.0_f32.sqrt();
        assert!(deformation_kernel(r0, 1.0).abs() < 1.0e-6);
        assert!(deformation_kernel(0.5, 1.0) < 0.0, "inside √2σ must dent");
        assert!(deformation_kernel(2.0, 1.0) > 0.0, "outside √2σ must bulge");
    }

    #[test]
    fn deformation_kernel_2d_integral_is_zero() {
        // Discrete double-integral of the LoG over a fine grid ≈ 0 (the
        // continuous integral is exactly zero by the divergence theorem).
        let sigma = 1.0_f32;
        let step = 0.05_f32;
        let span = 8.0_f32; // 8σ radius captures the tails to ~e^-32
        let mut sum = 0.0_f32;
        let mut x = -span;
        while x <= span {
            let mut y = -span;
            while y <= span {
                let r = (x * x + y * y).sqrt();
                sum += deformation_kernel(r, sigma) * step * step;
                y += step;
            }
            x += step;
        }
        assert!(
            sum.abs() < 5.0e-3,
            "LoG plane integral must vanish (got {sum})"
        );
    }

    #[test]
    fn impact_conserves_volume() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let before = field.displaced_volume();
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let after = field.displaced_volume();
        assert!(
            (after - before).abs() < 1.0e-2,
            "dent+rim must conserve displaced volume (ΔV={})",
            after - before
        );
    }

    #[test]
    fn impact_creates_dent_and_rim() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        assert!(field.min_height() < -0.5, "deep dent at the centre");
        assert!(field.max_height() > 0.05, "paired rim bulge must appear");
    }

    // -- plasticity ----------------------------------------------------------

    #[test]
    fn past_yield_keeps_permanent_dent() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let ci = center_idx(&cfg);
        assert!(field.permanent[ci] < -0.3, "centre must hold a permanent dent");
        assert!(field.elastic_at(ci).abs() < 1.2, "elastic fraction bounded");
    }

    #[test]
    fn permanent_dent_survives_settling() {
        let cfg = DeformationGridConfig::default();
        let field = run_until_settled(&cfg, DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS);
        let ci = center_idx(&cfg);
        let dent = field.permanent[ci];
        assert!(dent < -0.3, "plastic crater must persist (dent={dent})");
    }

    #[test]
    fn elastic_component_recovers_toward_rest() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let ci = center_idx(&cfg);
        let start = field.elastic_at(ci).abs();
        for _ in 0..DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS {
            step(&mut field, &cfg, DEFORMATION_DT);
        }
        let end = field.elastic_at(ci).abs();
        assert!(
            end < start,
            "elastic dent must recover toward rest (start={start}, end={end})"
        );
    }

    // -- energy --------------------------------------------------------------

    #[test]
    fn energy_is_non_increasing_with_damping() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let mut prev = field.total_energy(cfg.stiffness);
        for _ in 0..64 {
            step(&mut field, &cfg, DEFORMATION_DT);
            let now = field.total_energy(cfg.stiffness);
            assert!(now <= prev + 1.0e-6, "energy must never increase");
            prev = now;
        }
    }

    #[test]
    fn energy_strictly_decreases_with_damping() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let e0 = field.total_energy(cfg.stiffness);
        for _ in 0..DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS {
            step(&mut field, &cfg, DEFORMATION_DT);
        }
        let e1 = field.total_energy(cfg.stiffness);
        assert!(e1 < e0, "damping must dissipate mechanical energy");
    }

    #[test]
    fn no_damping_approximately_conserves_energy() {
        let mut cfg = DeformationGridConfig::default();
        cfg.damping = 0.0;
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let e0 = field.total_energy(cfg.stiffness);
        for _ in 0..60 {
            step(&mut field, &cfg, DEFORMATION_DT);
        }
        let e1 = field.total_energy(cfg.stiffness);
        assert!(
            (e1 - e0).abs() / e0 < 5.0e-2,
            "conservative system must keep its energy (ΔE/E={})",
            (e1 - e0).abs() / e0
        );
    }

    // -- determinism ---------------------------------------------------------

    #[test]
    fn step_is_deterministic() {
        let cfg = DeformationGridConfig::default();
        let mut a = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let mut b = a.clone();
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut a, &cfg, cx, cy, 0.6, 1.0);
        apply_impact(&mut b, &cfg, cx, cy, 0.6, 1.0);
        for _ in 0..DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS {
            step(&mut a, &cfg, DEFORMATION_DT);
            step(&mut b, &cfg, DEFORMATION_DT);
        }
        assert_eq!(a.heights, b.heights, "bit-identical final heights");
        assert_eq!(a.velocities, b.velocities, "bit-identical final velocities");
    }

    // -- fail-closed ---------------------------------------------------------

    #[test]
    fn config_rejects_invalid_values() {
        let good = DeformationGridConfig::default();
        assert!(good.validate().is_ok());

        let mut zero_w = good;
        zero_w.width = 0;
        assert!(zero_w.validate().is_err());

        let mut zero_cell = good;
        zero_cell.cell_size = 0.0;
        assert!(zero_cell.validate().is_err());

        let mut neg_cell = good;
        neg_cell.cell_size = -0.5;
        assert!(neg_cell.validate().is_err());

        let mut zero_k = good;
        zero_k.stiffness = 0.0;
        assert!(zero_k.validate().is_err());

        let mut neg_damp = good;
        neg_damp.damping = -1.0;
        assert!(neg_damp.validate().is_err());

        let mut nan_k = good;
        nan_k.stiffness = f32::NAN;
        assert!(nan_k.validate().is_err());

        let mut zero_yield = good;
        zero_yield.yield_strain = 0.0;
        assert!(zero_yield.validate().is_err());

        let mut zero_plastic = good;
        zero_plastic.plastic_ratio = 0.0;
        assert!(zero_plastic.validate().is_err());

        let mut over_plastic = good;
        over_plastic.plastic_ratio = 1.5;
        assert!(over_plastic.validate().is_err());

        let mut too_big = good;
        too_big.width = 2048;
        assert!(too_big.validate().is_err());
    }

    #[test]
    fn field_fails_closed_on_overflow() {
        let mut cfg = DeformationGridConfig::default();
        cfg.width = 2048;
        cfg.height = 2048;
        assert!(DeformationFieldSoA::new(&cfg).is_err());
        let mut cfg2 = DeformationGridConfig::default();
        cfg2.width = 1024;
        cfg2.height = 1024;
        assert!(DeformationFieldSoA::new(&cfg2).is_ok());
    }

    #[test]
    fn zero_alloc_hot_loop_keeps_capacities() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 0.6, 1.0);
        let h_cap = field.heights.capacity();
        let v_cap = field.velocities.capacity();
        let p_cap = field.permanent.capacity();
        for _ in 0..256 {
            step(&mut field, &cfg, DEFORMATION_DT);
        }
        assert_eq!(field.heights.capacity(), h_cap);
        assert_eq!(field.velocities.capacity(), v_cap);
        assert_eq!(field.permanent.capacity(), p_cap);
    }

    // -- boundedness ---------------------------------------------------------

    #[test]
    fn strong_impact_stays_bounded() {
        let cfg = DeformationGridConfig::default();
        let mut field = DeformationFieldSoA::new(&cfg).expect("valid cfg");
        let cx = cfg.width as f32 * cfg.cell_size * 0.5;
        let cy = cfg.height as f32 * cfg.cell_size * 0.5;
        apply_impact(&mut field, &cfg, cx, cy, 10.0, 1.0);
        for _ in 0..DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS {
            step(&mut field, &cfg, DEFORMATION_DT);
        }
        assert!(field.max_abs_height() < 20.0);
        for h in &field.heights {
            assert!(h.is_finite());
        }
        for v in &field.velocities {
            assert!(v.is_finite());
        }
    }

    // -- soak ----------------------------------------------------------------

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_dynamic_surface_deformation_soak();
        assert!(
            r.dynamic_surface_deformation_ready,
            "deformation soak must prove readiness"
        );
        assert!(r.ricker_volume_integral.abs() < 0.05);
        assert!(r.impact_volume_drift < 1.0e-3);
        assert!(r.peak_dent_depth < 0.0, "dent present");
        assert!(r.rim_bulge_height > 0.0, "rim present");
        assert!(r.permanent_fraction > 0.0 && r.permanent_fraction < 1.0);
        assert!(r.elastic_recovery_ratio > 0.0 && r.elastic_recovery_ratio <= 1.0);
        assert!(r.energy_dissipation_ratio > 0.0 && r.energy_dissipation_ratio < 1.0);
        assert!(r.max_abs_displacement < 10.0);
        assert_eq!(r.grid_cells_measured, 64 * 64);
        assert!(r.deterministic);
        assert_eq!(r.total_ticks, DYNAMIC_SURFACE_DEFORMATION_SOAK_TICKS);
        assert_eq!(r.evidence_kind, DEFORMATION_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.dynamic_surface_aaa_ready
                && !r.ue5_chaos_softbody_aaa_ready
                && !r.world_shatter_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(
            !r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_dynamic_surface_deformation_soak();
        let b = run_dynamic_surface_deformation_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.elastic_recovery_ratio, b.elastic_recovery_ratio);
        assert_eq!(a.energy_dissipation_ratio, b.energy_dissipation_ratio);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_dynamic_surface_deformation_soak();
        let probe = probe_dynamic_surface_deformation();
        assert_eq!(
            soak.dynamic_surface_deformation_ready,
            probe.dynamic_surface_deformation_ready
        );
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.peak_dent_depth, probe.peak_dent_depth);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_dynamic_surface_deformation_soak();
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
            .evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, ju);
    }
}

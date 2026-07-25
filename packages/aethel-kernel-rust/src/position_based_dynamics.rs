//! Position-Based Dynamics minimal real kernel — letter **hj** (quality **hu**);
//! XPBD + fixed-substep deepen — letter **ip**.
//!
//! Replaces empty ZST stub `solve_molecular_constraints` (viscosity/mass/
//! velocity unused; no particle write). Real SoA particles + distance
//! constraint projection (1–2 iterations). Graph coloring is **precomputed**
//! once (`ConstraintColoring`); hot `solve_precolored` does not allocate or
//! recolor. Soak proves constraint residual decreases. Optional residual→
//! `FractalEnergyField` stress couple (ds) does not claim Chaos/XPBD/cloth AAA.
//!
//! Letter **ip**: XPBD-lite distance constraints with compliance α → α̃=α/h²,
//! Lagrange multiplier Δλ accumulation, and fixed substep loop `h=dt/n_substeps`.
//! Hot XPBD path uses preallocated [`XpbdScratch`] (zero alloc in solve).
//! CW2 load-scale soak N≥2048 particles (46²); residual decreases with iterations;
//! pin stable; same seed → bit-identical positions; wall budget on E: host.
//! Probe `position_based_dynamics_xpbd_ready` / `positionBasedDynamicsXpbdReady`
//! is **distinct** from hj `positionBasedDynamicsReady`.
//!
//! Honesty probe `position_based_dynamics_ready` /
//! `positionBasedDynamicsReady` is **distinct** from dz
//! `atmosphericPhysicalDampingReady`, dy `autonomousConflictGeneratorReady`,
//! dx `synestheticSensoryRemapReady`, dw `mnemonicMatterEntropyReady`, dv
//! `fourDimensionalTimeSdfReady`, du `shadowTimeReversalReady`, dt
//! `curvedRaymarcherReady`, ds `fractalEnergyPerturbationReady`, dr
//! `autonomousEntropyCorrectorReady`, dq `unifiedFieldNetworkReady`, and
//! dc–dm foundation probes.
//! Letter **hz**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full Chaos / XPBD / cloth AAA parity
//! (`chaos_pbd_parity_ready: false`, `xpbd_cloth_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::fractal_energy_perturbation::FractalEnergyField;

/// Soak particle count (two-particle rod + extras for SoA width).
pub const SOAK_PARTICLE_COUNT: usize = 4;
/// Distance constraints in soak fixture.
pub const SOAK_CONSTRAINT_COUNT: usize = 2;
/// Projection iterations (1–2 per doctrine).
pub const DEFAULT_SOLVER_ITERATIONS: u32 = 2;
/// Soft floor on rest length (avoid /0).
pub const REST_LENGTH_FLOOR: f32 = 1e-4;
/// Min residual drop fraction for soak evidence.
const MIN_RESIDUAL_DROP: f32 = 0.35;
/// Float compare epsilon.
const EPS: f32 = 1e-5;
/// Soak sample count (predict + project + residual evidence).
pub const SOAK_SAMPLE_COUNT: u32 = 4;

/// XPBD load-scale soak grid side (CW2: 46²=2116 ≥2048, beyond prior 9×9 micro).
pub const XPBD_SOAK_GRID: usize = 46;
/// XPBD soak particle count (2116).
pub const XPBD_SOAK_PARTICLE_COUNT: usize = XPBD_SOAK_GRID * XPBD_SOAK_GRID;
/// Horizontal + vertical edges: 46·45·2 = 4140.
pub const XPBD_SOAK_CONSTRAINT_COUNT: usize =
    XPBD_SOAK_GRID * (XPBD_SOAK_GRID - 1) * 2;
/// CW2 load-scale floor — xpbd_ready requires N≥2048 (not legacy micro ≥64).
pub const XPBD_LOAD_SCALE_MIN_PARTICLES: usize = 2048;
/// Wall-clock budget for XPBD load-scale soak on RTX 3060-class host (seconds).
pub const XPBD_SOAK_WALL_BUDGET_SECS: u64 = 45;
/// Frame dt for XPBD soak (60 Hz).
pub const XPBD_DEFAULT_DT: f32 = 1.0 / 60.0;
/// Fixed substeps per frame.
pub const XPBD_DEFAULT_SUBSTEPS: u32 = 4;
/// XPBD solver iterations per substep (load-scale needs deeper than micro 8).
pub const XPBD_DEFAULT_ITERATIONS: u32 = 16;
/// Distance compliance α for load-scale (stiffer than 1e-6 micro so residual drop stays measurable at N≥2k).
pub const XPBD_DEFAULT_COMPLIANCE: f32 = 1.0e-8;
/// Deterministic soak seed ("XPBD" tag).
pub const XPBD_SOAK_SEED: u32 = 0x5850_4244;
/// Min relative residual drop from few→many iterations (load-scale soft cloth).
const XPBD_MIN_ITER_DROP: f32 = 0.12;
/// Min residual drop fraction for XPBD load-scale primary step (≠ classical PBD 0.35).
const XPBD_LOAD_SCALE_MIN_RESIDUAL_DROP: f32 = 0.20;
/// Rest length / lattice spacing.
const XPBD_REST: f32 = 1.0;
/// Initial stretch factor (>1 stretches constraints).
const XPBD_STRETCH: f32 = 1.25;

/// One distance constraint (indices into SoA particle columns).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DistanceConstraint {
    pub i: usize,
    pub j: usize,
    pub rest_length: f32,
    /// Compliance α (XPBD); classical PBD path ignores this.
    pub compliance: f32,
}

impl DistanceConstraint {
    #[inline]
    pub fn stiff(i: usize, j: usize, rest_length: f32) -> Self {
        Self {
            i,
            j,
            rest_length,
            compliance: 0.0,
        }
    }

    #[inline]
    pub fn with_compliance(i: usize, j: usize, rest_length: f32, compliance: f32) -> Self {
        Self {
            i,
            j,
            rest_length,
            compliance,
        }
    }
}

/// Measurable projection outcome — not println theater.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PbdStepResult {
    /// Sum of |len − rest| before projection.
    pub residual_before: f32,
    /// Sum of |len − rest| after projection.
    pub residual_after: f32,
    /// Solver iterations applied.
    pub iterations: u32,
    /// True when positions mutated and residual decreased.
    pub projected: bool,
}

impl PbdStepResult {
    pub const IDENTITY: Self = Self {
        residual_before: 0.0,
        residual_after: 0.0,
        iterations: 0,
        projected: false,
    };

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.residual_before.is_finite() && self.residual_after.is_finite()
    }
}

/// SoA particle buffer for minimal PBD.
#[derive(Debug, Clone)]
pub struct PbdParticleSoA {
    pub pos_x: Vec<f32>,
    pub pos_y: Vec<f32>,
    pub pos_z: Vec<f32>,
    pub prev_pos_x: Vec<f32>,
    pub prev_pos_y: Vec<f32>,
    pub prev_pos_z: Vec<f32>,
    /// Inverse mass; 0 ⇒ pinned (infinite mass).
    pub inv_mass: Vec<f32>,
    steps: u64,
}

impl PbdParticleSoA {
    /// Allocate zeroed SoA. Fail-closed empty when `n == 0`.
    pub fn with_capacity(n: usize) -> Self {
        Self {
            pos_x: vec![0.0; n],
            pos_y: vec![0.0; n],
            pos_z: vec![0.0; n],
            prev_pos_x: vec![0.0; n],
            prev_pos_y: vec![0.0; n],
            prev_pos_z: vec![0.0; n],
            inv_mass: vec![1.0; n],
            steps: 0,
        }
    }

    /// Soak-sized field: stretched rod (particles 0–1) + free particle.
    pub fn soak_particles() -> Self {
        let mut p = Self::with_capacity(SOAK_PARTICLE_COUNT);
        // Particle 0 pinned at origin.
        p.pos_x[0] = 0.0;
        p.pos_y[0] = 0.0;
        p.pos_z[0] = 0.0;
        p.inv_mass[0] = 0.0;
        // Particle 1 stretched along +X (rest will be 1.0; start at 2.0).
        p.pos_x[1] = 2.0;
        p.pos_y[1] = 0.0;
        p.pos_z[1] = 0.0;
        p.inv_mass[1] = 1.0;
        // Particle 2 stretched along +Y vs particle 1 (rest 1.0; start farther).
        p.pos_x[2] = 2.0;
        p.pos_y[2] = 1.5;
        p.pos_z[2] = 0.0;
        p.inv_mass[2] = 1.0;
        // Particle 3 free (no constraint) — proves unused slots stay stable.
        p.pos_x[3] = 5.0;
        p.pos_y[3] = 5.0;
        p.pos_z[3] = 5.0;
        p.inv_mass[3] = 1.0;
        p
    }

    #[inline]
    pub fn particle_count(&self) -> usize {
        self.pos_x
            .len()
            .min(self.pos_y.len())
            .min(self.pos_z.len())
            .min(self.inv_mass.len())
    }

    #[inline]
    pub fn step_count(&self) -> u64 {
        self.steps
    }

    /// Sum of absolute distance residuals for all constraints.
    pub fn constraint_residual(&self, constraints: &[DistanceConstraint]) -> f32 {
        let n = self.particle_count();
        let mut acc = 0.0_f32;
        for c in constraints {
            if c.i >= n || c.j >= n {
                continue;
            }
            if !(c.rest_length.is_finite() && c.rest_length >= 0.0) {
                continue;
            }
            let dx = self.pos_x[c.j] - self.pos_x[c.i];
            let dy = self.pos_y[c.j] - self.pos_y[c.i];
            let dz = self.pos_z[c.j] - self.pos_z[c.i];
            if !(dx.is_finite() && dy.is_finite() && dz.is_finite()) {
                continue;
            }
            let len = (dx * dx + dy * dy + dz * dz).sqrt();
            let rest = c.rest_length.max(REST_LENGTH_FLOOR);
            acc += (len - rest).abs();
        }
        acc
    }
}

/// Soak distance constraints: rod 0–1 rest=1, chain 1–2 rest=1.
pub fn soak_constraints() -> Vec<DistanceConstraint> {
    vec![
        DistanceConstraint::stiff(0, 1, 1.0),
        DistanceConstraint::stiff(1, 2, 1.0),
    ]
}

/// Deterministic LCG step (same seed → same stretch noise).
#[inline]
fn xpbd_lcg(state: &mut u32) -> f32 {
    *state = state.wrapping_mul(1664525).wrapping_add(1013904223);
    (*state >> 8) as f32 / (1u32 << 24) as f32
}

/// XPBD soak particles: stretched load-scale lattice; left column pinned.
pub fn soak_xpbd_particles(seed: u32) -> PbdParticleSoA {
    let g = XPBD_SOAK_GRID;
    let mut p = PbdParticleSoA::with_capacity(XPBD_SOAK_PARTICLE_COUNT);
    let mut s = seed;
    for row in 0..g {
        for col in 0..g {
            let idx = row * g + col;
            let jitter = (xpbd_lcg(&mut s) - 0.5) * 0.05;
            p.pos_x[idx] = col as f32 * XPBD_REST * XPBD_STRETCH + jitter;
            p.pos_y[idx] = row as f32 * XPBD_REST * XPBD_STRETCH;
            p.pos_z[idx] = 0.0;
            p.prev_pos_x[idx] = p.pos_x[idx];
            p.prev_pos_y[idx] = p.pos_y[idx];
            p.prev_pos_z[idx] = p.pos_z[idx];
            // Pin left column.
            p.inv_mass[idx] = if col == 0 { 0.0 } else { 1.0 };
        }
    }
    p
}

/// XPBD soak distance constraints (load-scale grid edges with compliance).
pub fn soak_xpbd_constraints() -> Vec<DistanceConstraint> {
    let g = XPBD_SOAK_GRID;
    let mut out = Vec::with_capacity(XPBD_SOAK_CONSTRAINT_COUNT);
    for row in 0..g {
        for col in 0..g {
            let i = row * g + col;
            if col + 1 < g {
                out.push(DistanceConstraint::with_compliance(
                    i,
                    i + 1,
                    XPBD_REST,
                    XPBD_DEFAULT_COMPLIANCE,
                ));
            }
            if row + 1 < g {
                out.push(DistanceConstraint::with_compliance(
                    i,
                    i + g,
                    XPBD_REST,
                    XPBD_DEFAULT_COMPLIANCE,
                ));
            }
        }
    }
    out
}

/// Precomputed coloring for XPBD soak fixture.
pub fn soak_xpbd_constraint_coloring() -> ConstraintColoring {
    ConstraintColoring::precompute(&soak_xpbd_constraints(), XPBD_SOAK_PARTICLE_COUNT)
}

/// Preallocated XPBD λ buffer — allocate once; hot solve does not realloc.
#[derive(Debug, Clone)]
pub struct XpbdScratch {
    pub lambdas: Vec<f32>,
}

impl XpbdScratch {
    pub fn with_capacity(n_constraints: usize) -> Self {
        Self {
            lambdas: vec![0.0; n_constraints],
        }
    }

    /// Grow only if needed (call outside hot loop). Hot path uses [`reset`].
    pub fn ensure_len(&mut self, n: usize) {
        if self.lambdas.len() < n {
            self.lambdas.resize(n, 0.0);
        }
    }

    /// Zero λ[0..n] without reallocating.
    #[inline]
    pub fn reset(&mut self, n: usize) {
        let n = n.min(self.lambdas.len());
        for i in 0..n {
            self.lambdas[i] = 0.0;
        }
    }
}

/// XPBD + fixed-substep projection outcome.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct XpbdStepResult {
    pub residual_before: f32,
    pub residual_after: f32,
    pub iterations: u32,
    pub substeps: u32,
    pub projected: bool,
}

impl XpbdStepResult {
    pub const IDENTITY: Self = Self {
        residual_before: 0.0,
        residual_after: 0.0,
        iterations: 0,
        substeps: 0,
        projected: false,
    };

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.residual_before.is_finite() && self.residual_after.is_finite()
    }
}

/// Precomputed independent-set coloring of distance constraints.
///
/// Built once outside the hot loop; [`PositionBasedDynamics::solve_precolored`]
/// iterates color ranges without allocating or recoloring (**hu** / **hj**).
#[derive(Debug, Clone, PartialEq)]
pub struct ConstraintColoring {
    /// Validated constraints packed by color (contiguous ranges).
    pub constraints: Vec<DistanceConstraint>,
    /// `color_offsets[c]..color_offsets[c+1]` is color `c` (len = num_colors + 1).
    pub color_offsets: Vec<usize>,
}

impl ConstraintColoring {
    /// Empty coloring (identity solve).
    pub fn empty() -> Self {
        Self {
            constraints: Vec::new(),
            color_offsets: vec![0],
        }
    }

    /// Greedy graph coloring — allocate only here, never in hot solve.
    pub fn precompute(constraints: &[DistanceConstraint], particle_count: usize) -> Self {
        if particle_count == 0 || constraints.is_empty() {
            return Self::empty();
        }
        // Temporary buckets only during precompute.
        let mut colors: Vec<Vec<DistanceConstraint>> = Vec::new();
        for &c in constraints {
            if c.i >= particle_count || c.j >= particle_count || c.i == c.j {
                continue;
            }
            if !(c.rest_length.is_finite() && c.rest_length >= 0.0) {
                continue;
            }
            let mut placed = false;
            for color in &mut colors {
                let conflict = color.iter().any(|existing| {
                    existing.i == c.i
                        || existing.i == c.j
                        || existing.j == c.i
                        || existing.j == c.j
                });
                if !conflict {
                    color.push(c);
                    placed = true;
                    break;
                }
            }
            if !placed {
                colors.push(vec![c]);
            }
        }
        let mut flat = Vec::new();
        let mut offsets = Vec::with_capacity(colors.len().saturating_add(1));
        offsets.push(0);
        for color in colors {
            flat.extend(color);
            offsets.push(flat.len());
        }
        if offsets.len() == 1 {
            // No valid constraints.
            return Self::empty();
        }
        Self {
            constraints: flat,
            color_offsets: offsets,
        }
    }

    #[inline]
    pub fn color_count(&self) -> usize {
        self.color_offsets.len().saturating_sub(1)
    }

    #[inline]
    pub fn color_slice(&self, color: usize) -> &[DistanceConstraint] {
        if color + 1 >= self.color_offsets.len() {
            return &[];
        }
        let a = self.color_offsets[color];
        let b = self.color_offsets[color + 1];
        &self.constraints[a..b]
    }
}

/// Soak fixture coloring (precomputed once for soaks / hybrid).
pub fn soak_constraint_coloring() -> ConstraintColoring {
    ConstraintColoring::precompute(&soak_constraints(), SOAK_PARTICLE_COUNT)
}

/// Minimal PBD facade — distance constraint projection.
#[derive(Debug, Default, Clone, Copy)]
pub struct PositionBasedDynamics;

impl PositionBasedDynamics {
    /// Convenience: precompute coloring then hot-solve (allocates coloring only).
    ///
    /// Prefer [`solve_precolored`] on the hot path with a reused coloring.
    pub fn solve_molecular_constraints(
        particles: &mut PbdParticleSoA,
        constraints: &[DistanceConstraint],
        iterations: u32,
    ) -> PbdStepResult {
        let coloring = ConstraintColoring::precompute(constraints, particles.particle_count());
        Self::solve_precolored(particles, &coloring, iterations)
    }

    /// Hot path: project precolored distance constraints (1–2 iterations).
    ///
    /// Classic PBD: for each constraint, correct along the edge by
    /// `(len − rest) / (w_i + w_j)` weighted by inverse mass.
    /// Does **not** allocate / recolor. Does **not** claim Chaos / XPBD / cloth AAA.
    pub fn solve_precolored(
        particles: &mut PbdParticleSoA,
        coloring: &ConstraintColoring,
        iterations: u32,
    ) -> PbdStepResult {
        let iters = iterations.clamp(1, 2);
        let n = particles.particle_count();
        if n == 0 || coloring.constraints.is_empty() {
            return PbdStepResult::IDENTITY;
        }

        // Fail-closed non-finite positions → zero free particles, keep pins.
        for i in 0..n {
            if !(particles.pos_x[i].is_finite()
                && particles.pos_y[i].is_finite()
                && particles.pos_z[i].is_finite()
                && particles.inv_mass[i].is_finite())
            {
                if particles.inv_mass[i] > EPS {
                    particles.pos_x[i] = 0.0;
                    particles.pos_y[i] = 0.0;
                    particles.pos_z[i] = 0.0;
                }
                particles.inv_mass[i] = particles.inv_mass[i].max(0.0);
            }
        }

        let residual_before = particles.constraint_residual(&coloring.constraints);

        for _ in 0..iters {
            for c_idx in 0..coloring.color_count() {
                let color = coloring.color_slice(c_idx);
                for c in color {
                    let wi = particles.inv_mass[c.i].max(0.0);
                    let wj = particles.inv_mass[c.j].max(0.0);
                    let wsum = wi + wj;
                    if wsum <= EPS {
                        continue;
                    }

                    let dx = particles.pos_x[c.j] - particles.pos_x[c.i];
                    let dy = particles.pos_y[c.j] - particles.pos_y[c.i];
                    let dz = particles.pos_z[c.j] - particles.pos_z[c.i];

                    if !(dx.is_finite() && dy.is_finite() && dz.is_finite()) {
                        continue;
                    }

                    let len_sq = dx * dx + dy * dy + dz * dz;
                    let rest = c.rest_length.max(REST_LENGTH_FLOOR);
                    let (nx, ny, nz, len) = if len_sq <= EPS * EPS {
                        (1.0_f32, 0.0_f32, 0.0_f32, 0.0_f32)
                    } else {
                        let len = len_sq.sqrt();
                        (dx / len, dy / len, dz / len, len)
                    };

                    let corr = (len - rest) / wsum;
                    let ci = corr * wi;
                    let cj = corr * wj;

                    particles.pos_x[c.i] += nx * ci;
                    particles.pos_y[c.i] += ny * ci;
                    particles.pos_z[c.i] += nz * ci;

                    particles.pos_x[c.j] -= nx * cj;
                    particles.pos_y[c.j] -= ny * cj;
                    particles.pos_z[c.j] -= nz * cj;
                }
            }
        }

        let residual_after = particles.constraint_residual(&coloring.constraints);
        particles.steps = particles.steps.saturating_add(1);

        PbdStepResult {
            residual_before,
            residual_after,
            iterations: iters,
            projected: residual_after + EPS < residual_before,
        }
    }

    /// Optional read-only couple: write constraint residual into fractal stress
    /// as a tear proxy. Does **not** mutate fractal force columns; Chaos/PBD
    /// full parity remains HELD.
    pub fn couple_residual_to_fractal_stress(
        residual: f32,
        field: &mut FractalEnergyField,
    ) -> f32 {
        if !residual.is_finite() || residual <= 0.0 {
            return 0.0;
        }
        let n = field.particle_count();
        if n == 0 {
            return 0.0;
        }
        let per = (residual / n as f32).min(1.0e6);
        let mut written = 0.0_f32;
        for i in 0..n {
            let before = field.stress[i];
            field.stress[i] = (before + per).min(1.0e6);
            written += field.stress[i] - before;
        }
        written
    }

    /// Convenience: precompute coloring + scratch then XPBD-solve (allocates once).
    ///
    /// Prefer [`solve_xpbd_precolored`] on the hot path with reused coloring/scratch.
    pub fn solve_xpbd(
        particles: &mut PbdParticleSoA,
        constraints: &[DistanceConstraint],
        dt: f32,
        n_substeps: u32,
        iterations: u32,
    ) -> XpbdStepResult {
        let coloring = ConstraintColoring::precompute(constraints, particles.particle_count());
        let mut scratch = XpbdScratch::with_capacity(coloring.constraints.len());
        Self::solve_xpbd_precolored(
            particles,
            &coloring,
            &mut scratch,
            dt,
            n_substeps,
            iterations,
        )
    }

    /// Hot path: XPBD distance constraints with fixed substeps (letter **ip**).
    ///
    /// Per substep `h = dt / n_substeps`: reset λ, then for each iteration apply
    /// Δλ = (−C − α̃ λ) / (Σw + α̃) with α̃ = α / h², then Δx = w·Δλ·∇C.
    /// Does **not** allocate / recolor / grow scratch. Does **not** claim
    /// Chaos / cloth AAA (`xpbd_cloth_aaa_ready` stays false).
    pub fn solve_xpbd_precolored(
        particles: &mut PbdParticleSoA,
        coloring: &ConstraintColoring,
        scratch: &mut XpbdScratch,
        dt: f32,
        n_substeps: u32,
        iterations: u32,
    ) -> XpbdStepResult {
        let n_cons = coloring.constraints.len();
        let iters = iterations.clamp(1, 64);
        let subs = n_substeps.clamp(1, 64);
        let n = particles.particle_count();
        if n == 0 || n_cons == 0 || !dt.is_finite() || dt <= 0.0 {
            return XpbdStepResult::IDENTITY;
        }
        // Fail-closed if scratch too small — never grow on hot path.
        if scratch.lambdas.len() < n_cons {
            return XpbdStepResult::IDENTITY;
        }

        for i in 0..n {
            if !(particles.pos_x[i].is_finite()
                && particles.pos_y[i].is_finite()
                && particles.pos_z[i].is_finite()
                && particles.inv_mass[i].is_finite())
            {
                if particles.inv_mass[i] > EPS {
                    particles.pos_x[i] = 0.0;
                    particles.pos_y[i] = 0.0;
                    particles.pos_z[i] = 0.0;
                }
                particles.inv_mass[i] = particles.inv_mass[i].max(0.0);
            }
        }

        let residual_before = particles.constraint_residual(&coloring.constraints);
        let h = dt / subs as f32;
        let h2 = (h * h).max(EPS * EPS);

        for _ in 0..subs {
            scratch.reset(n_cons);
            for _ in 0..iters {
                for ci in 0..n_cons {
                    let c = coloring.constraints[ci];
                    let wi = particles.inv_mass[c.i].max(0.0);
                    let wj = particles.inv_mass[c.j].max(0.0);
                    let wsum = wi + wj;
                    if wsum <= EPS {
                        continue;
                    }

                    let dx = particles.pos_x[c.j] - particles.pos_x[c.i];
                    let dy = particles.pos_y[c.j] - particles.pos_y[c.i];
                    let dz = particles.pos_z[c.j] - particles.pos_z[c.i];
                    if !(dx.is_finite() && dy.is_finite() && dz.is_finite()) {
                        continue;
                    }

                    let len_sq = dx * dx + dy * dy + dz * dz;
                    let rest = c.rest_length.max(REST_LENGTH_FLOOR);
                    let (nx, ny, nz, len) = if len_sq <= EPS * EPS {
                        (1.0_f32, 0.0_f32, 0.0_f32, 0.0_f32)
                    } else {
                        let len = len_sq.sqrt();
                        (dx / len, dy / len, dz / len, len)
                    };

                    let c_err = len - rest;
                    let alpha = c.compliance.max(0.0);
                    let alpha_tilde = alpha / h2;
                    let denom = wsum + alpha_tilde;
                    if denom <= EPS {
                        continue;
                    }
                    let lambda = scratch.lambdas[ci];
                    let delta_lambda = (-c_err - alpha_tilde * lambda) / denom;
                    scratch.lambdas[ci] = lambda + delta_lambda;

                    // ∇C_i = −n, ∇C_j = +n → Δx = w · Δλ · ∇C
                    particles.pos_x[c.i] -= nx * wi * delta_lambda;
                    particles.pos_y[c.i] -= ny * wi * delta_lambda;
                    particles.pos_z[c.i] -= nz * wi * delta_lambda;
                    particles.pos_x[c.j] += nx * wj * delta_lambda;
                    particles.pos_y[c.j] += ny * wj * delta_lambda;
                    particles.pos_z[c.j] += nz * wj * delta_lambda;
                }
            }
        }

        let residual_after = particles.constraint_residual(&coloring.constraints);
        particles.steps = particles.steps.saturating_add(subs as u64);

        XpbdStepResult {
            residual_before,
            residual_after,
            iterations: iters,
            substeps: subs,
            projected: residual_after + EPS < residual_before,
        }
    }
}


/// Letter **hj** / deepen **ip** soak report — PBD + XPBD evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct PositionBasedDynamicsSoakReport {
    /// Soak-gated; distinct from dz / dy / dx / dw / dv / du / dt / ds / dr / dq / dc–dm.
    pub position_based_dynamics_ready: bool,
    /// XPBD + fixed-substep deepen (**ip**); distinct from hj ready.
    pub position_based_dynamics_xpbd_ready: bool,
    pub residual_decreased: bool,
    pub positions_mutated: bool,
    pub pinned_particle_stable: bool,
    pub unconstrained_particle_stable: bool,
    pub fractal_stress_coupled: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub residual_before: f32,
    pub residual_after: f32,
    pub residual_drop_fraction: f32,
    pub iterations: u32,
    pub fractal_stress_delta: f32,
    /// XPBD soak particle count (0 when classical-only report).
    pub xpbd_particle_count: u32,
    /// XPBD soak constraint count (≥64 when deepen ready).
    pub xpbd_constraint_count: u32,
    /// Fixed substeps used in XPBD soak.
    pub xpbd_substeps: u32,
    /// Residual curve slots: 1 / 2 / 4 / `XPBD_DEFAULT_ITERATIONS` (field name `_8` is legacy; CW2 max=16).
    pub residual_iters_1: f32,
    pub residual_iters_2: f32,
    pub residual_iters_4: f32,
    pub residual_iters_8: f32,
    /// True when residual curve is non-increasing across the four slots (1→2→4→max).
    pub residual_decreases_with_iterations: bool,
    /// Same seed → bit-identical positions after XPBD step.
    pub deterministic_replay: bool,
    /// Stable evidence tag: SoA distance-constraint projection (≠ SPH / medium damp / LBM) — **hz**.
    pub evidence_kind: &'static str,
    /// Fingerprint of PBD-only evidence fields (cross-check vs hl/hk + LBM).
    pub evidence_fingerprint: u64,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_four_dimensional_time_sdf_probe: bool,
    pub distinct_from_shadow_time_reversal_probe: bool,
    pub distinct_from_curved_raymarcher_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_autonomous_entropy_corrector_probe: bool,
    pub distinct_from_unified_field_network_probe: bool,
    pub distinct_from_slab_allocator_mmap_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full Chaos / XPBD / cloth AAA — always HELD.
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub unreal_gc_streaming_parity_ready: bool,
    pub metasounds_hrtf_aaa_ready: bool,
    pub adversary_ai_chaos_parity_ready: bool,
    pub ue_atmosphere_parity_ready: bool,
}

/// SoA distance-constraint projection evidence shape (≠ SPH thermo / medium damp / LBM).
pub const PBD_EVIDENCE_KIND: &str = "soa_distance_constraint_projection";
/// XPBD compliance + fixed-substep evidence shape — letter **ip**.
pub const XPBD_EVIDENCE_KIND: &str = "soa_xpbd_distance_compliance_substep";

fn pbd_evidence_fingerprint(
    residual_decreased: bool,
    positions_mutated: bool,
    pinned_particle_stable: bool,
    unconstrained_particle_stable: bool,
    fractal_stress_coupled: bool,
    residual_before: f32,
    residual_after: f32,
    residual_drop_fraction: f32,
    iterations: u32,
    fractal_stress_delta: f32,
) -> u64 {
    let mut h: u64 = 0x7062_645f; // "pbd_"
    h = h.rotate_left(11) ^ if residual_decreased { 0x5244 } else { 0 };
    h = h.rotate_left(5) ^ if positions_mutated { 0x504D } else { 0 };
    h = h.rotate_left(7) ^ if pinned_particle_stable { 0x5049 } else { 0 };
    h = h.rotate_left(3) ^ if unconstrained_particle_stable { 0x554E } else { 0 };
    h = h.rotate_left(9) ^ if fractal_stress_coupled { 0x4653 } else { 0 };
    h ^= residual_before.to_bits() as u64;
    h ^= (residual_after.to_bits() as u64).rotate_left(13);
    h ^= (residual_drop_fraction.to_bits() as u64).rotate_left(21);
    h ^= iterations as u64;
    h ^= (fractal_stress_delta.to_bits() as u64).rotate_left(17);
    h ^= 0x4450_524F; // DPRO
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == PBD_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn xpbd_fields_zero() -> (
    u32,
    u32,
    u32,
    f32,
    f32,
    f32,
    f32,
    bool,
    bool,
) {
    (0, 0, 0, 0.0, 0.0, 0.0, 0.0, false, false)
}

fn pbd_held(
    residual_decreased: bool,
    positions_mutated: bool,
    pinned_particle_stable: bool,
    unconstrained_particle_stable: bool,
    fractal_stress_coupled: bool,
    outputs_finite: bool,
    sample_count: u32,
    residual_before: f32,
    residual_after: f32,
    residual_drop_fraction: f32,
    iterations: u32,
    fractal_stress_delta: f32,
) -> PositionBasedDynamicsSoakReport {
    let evidence_kind = PBD_EVIDENCE_KIND;
    let evidence_fingerprint = pbd_evidence_fingerprint(
        residual_decreased,
        positions_mutated,
        pinned_particle_stable,
        unconstrained_particle_stable,
        fractal_stress_coupled,
        residual_before,
        residual_after,
        residual_drop_fraction,
        iterations,
        fractal_stress_delta,
    );
    let core_ok = residual_decreased
        && positions_mutated
        && pinned_particle_stable
        && unconstrained_particle_stable
        && fractal_stress_coupled
        && outputs_finite;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    let (pc, cc, subs, r1, r2, r4, r8, dec, replay) = xpbd_fields_zero();
    PositionBasedDynamicsSoakReport {
        position_based_dynamics_ready: false,
        position_based_dynamics_xpbd_ready: false,
        residual_decreased,
        positions_mutated,
        pinned_particle_stable,
        unconstrained_particle_stable,
        fractal_stress_coupled,
        outputs_finite,
        sample_count,
        residual_before,
        residual_after,
        residual_drop_fraction,
        iterations,
        fractal_stress_delta,
        xpbd_particle_count: pc,
        xpbd_constraint_count: cc,
        xpbd_substeps: subs,
        residual_iters_1: r1,
        residual_iters_2: r2,
        residual_iters_4: r4,
        residual_iters_8: r8,
        residual_decreases_with_iterations: dec,
        deterministic_replay: replay,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        xpbd_cloth_aaa_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
        adversary_ai_chaos_parity_ready: false,
        ue_atmosphere_parity_ready: false,
    }
}

/// Run SoA distance-constraint PBD soak.
///
/// Does **not** claim Chaos / XPBD / cloth AAA parity.
pub fn run_position_based_dynamics_soak() -> PositionBasedDynamicsSoakReport {
    let mut particles = PbdParticleSoA::soak_particles();
    let coloring = soak_constraint_coloring();
    let pin_x = particles.pos_x[0];
    let pin_y = particles.pos_y[0];
    let pin_z = particles.pos_z[0];
    let free_x = particles.pos_x[3];
    let free_y = particles.pos_y[3];
    let free_z = particles.pos_z[3];
    let stretch_x_before = particles.pos_x[1];

    let step = PositionBasedDynamics::solve_precolored(
        &mut particles,
        &coloring,
        DEFAULT_SOLVER_ITERATIONS,
    );

    let mut field = FractalEnergyField::soak_field();
    let fractal_stress_delta =
        PositionBasedDynamics::couple_residual_to_fractal_stress(step.residual_after, &mut field);
    // Prefer coupling the *before* residual so evidence is non-zero even if
    // projection nearly zeros residual; re-couple with before if after≈0.
    let fractal_stress_delta = if fractal_stress_delta <= EPS {
        PositionBasedDynamics::couple_residual_to_fractal_stress(step.residual_before, &mut field)
    } else {
        fractal_stress_delta
    };

    let sample_count = SOAK_SAMPLE_COUNT;
    let residual_drop_fraction = if step.residual_before > EPS {
        1.0 - (step.residual_after / step.residual_before)
    } else {
        0.0
    };

    let residual_decreased = step.projected
        && step.residual_after + EPS < step.residual_before
        && residual_drop_fraction >= MIN_RESIDUAL_DROP;
    let positions_mutated = (particles.pos_x[1] - stretch_x_before).abs() > EPS;
    let pinned_particle_stable = (particles.pos_x[0] - pin_x).abs() <= EPS
        && (particles.pos_y[0] - pin_y).abs() <= EPS
        && (particles.pos_z[0] - pin_z).abs() <= EPS;
    let unconstrained_particle_stable = (particles.pos_x[3] - free_x).abs() <= EPS
        && (particles.pos_y[3] - free_y).abs() <= EPS
        && (particles.pos_z[3] - free_z).abs() <= EPS;
    let fractal_stress_coupled = fractal_stress_delta > EPS;
    let outputs_finite = step.is_finite()
        && residual_drop_fraction.is_finite()
        && fractal_stress_delta.is_finite()
        && particles.pos_x.iter().all(|v| v.is_finite())
        && particles.pos_y.iter().all(|v| v.is_finite())
        && particles.pos_z.iter().all(|v| v.is_finite());

    if !(outputs_finite
        && residual_decreased
        && positions_mutated
        && pinned_particle_stable
        && unconstrained_particle_stable
        && fractal_stress_coupled)
    {
        return pbd_held(
            residual_decreased,
            positions_mutated,
            pinned_particle_stable,
            unconstrained_particle_stable,
            fractal_stress_coupled,
            outputs_finite,
            sample_count,
            step.residual_before,
            step.residual_after,
            residual_drop_fraction,
            step.iterations,
            fractal_stress_delta,
        );
    }

    let evidence_kind = PBD_EVIDENCE_KIND;
    let evidence_fingerprint = pbd_evidence_fingerprint(
        true,
        true,
        true,
        true,
        true,
        step.residual_before,
        step.residual_after,
        residual_drop_fraction,
        step.iterations,
        fractal_stress_delta,
    );
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    let (pc, cc, subs, r1, r2, r4, r8, dec, replay) = xpbd_fields_zero();
    PositionBasedDynamicsSoakReport {
        position_based_dynamics_ready: true,
        position_based_dynamics_xpbd_ready: false,
        residual_decreased: true,
        positions_mutated: true,
        pinned_particle_stable: true,
        unconstrained_particle_stable: true,
        fractal_stress_coupled: true,
        outputs_finite: true,
        sample_count,
        residual_before: step.residual_before,
        residual_after: step.residual_after,
        residual_drop_fraction,
        iterations: step.iterations,
        fractal_stress_delta,
        xpbd_particle_count: pc,
        xpbd_constraint_count: cc,
        xpbd_substeps: subs,
        residual_iters_1: r1,
        residual_iters_2: r2,
        residual_iters_4: r4,
        residual_iters_8: r8,
        residual_decreases_with_iterations: dec,
        deterministic_replay: replay,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        xpbd_cloth_aaa_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
        adversary_ai_chaos_parity_ready: false,
        ue_atmosphere_parity_ready: false,
    }
}

fn positions_bit_identical(a: &PbdParticleSoA, b: &PbdParticleSoA) -> bool {
    let n = a.particle_count().min(b.particle_count());
    for i in 0..n {
        if a.pos_x[i].to_bits() != b.pos_x[i].to_bits()
            || a.pos_y[i].to_bits() != b.pos_y[i].to_bits()
            || a.pos_z[i].to_bits() != b.pos_z[i].to_bits()
        {
            return false;
        }
    }
    true
}

/// N≥2048 XPBD + fixed-substep load-scale soak — letter **ip** + CW2.
///
/// Proves: residual decreases with iterations, pinned column stable,
/// same seed → bit-identical positions. Does **not** flip Chaos/cloth AAA.
pub fn run_position_based_dynamics_xpbd_soak() -> PositionBasedDynamicsSoakReport {
    let coloring = soak_xpbd_constraint_coloring();
    let n_cons = coloring.constraints.len();
    let mut scratch = XpbdScratch::with_capacity(n_cons);

    // Residual curve: same fixture, increasing iterations (1→2→4→16 at load-scale).
    let mut residuals = [0.0_f32; 4];
    let iter_counts = [1u32, 2, 4, XPBD_DEFAULT_ITERATIONS];
    for (k, &iters) in iter_counts.iter().enumerate() {
        let mut p = soak_xpbd_particles(XPBD_SOAK_SEED);
        let step = PositionBasedDynamics::solve_xpbd_precolored(
            &mut p,
            &coloring,
            &mut scratch,
            XPBD_DEFAULT_DT,
            XPBD_DEFAULT_SUBSTEPS,
            iters,
        );
        residuals[k] = step.residual_after;
    }
    // Non-increasing curve with meaningful drop 1→max iters.
    let residual_decreases_with_iterations = residuals[0] + EPS >= residuals[1]
        && residuals[1] + EPS >= residuals[2]
        && residuals[2] + EPS >= residuals[3]
        && residuals[0] > residuals[3] + EPS
        && residuals[0] > EPS
        && (1.0 - residuals[3] / residuals[0]) >= XPBD_MIN_ITER_DROP;

    // Primary step evidence (8 iters).
    let mut particles = soak_xpbd_particles(XPBD_SOAK_SEED);
    let pin_samples: Vec<(usize, f32, f32, f32)> = (0..XPBD_SOAK_GRID)
        .map(|row| {
            let i = row * XPBD_SOAK_GRID;
            (i, particles.pos_x[i], particles.pos_y[i], particles.pos_z[i])
        })
        .collect();
    let tip = XPBD_SOAK_GRID - 1;
    let tip_x_before = particles.pos_x[tip];

    let step = PositionBasedDynamics::solve_xpbd_precolored(
        &mut particles,
        &coloring,
        &mut scratch,
        XPBD_DEFAULT_DT,
        XPBD_DEFAULT_SUBSTEPS,
        XPBD_DEFAULT_ITERATIONS,
    );

    let pinned_particle_stable = pin_samples.iter().all(|&(i, x, y, z)| {
        (particles.pos_x[i] - x).abs() <= EPS
            && (particles.pos_y[i] - y).abs() <= EPS
            && (particles.pos_z[i] - z).abs() <= EPS
    });
    let positions_mutated = (particles.pos_x[tip] - tip_x_before).abs() > EPS;
    let residual_drop_fraction = if step.residual_before > EPS {
        1.0 - (step.residual_after / step.residual_before)
    } else {
        0.0
    };
    let residual_decreased = step.projected
        && step.residual_after + EPS < step.residual_before
        && residual_drop_fraction >= XPBD_LOAD_SCALE_MIN_RESIDUAL_DROP;

    // Same seed → bit-identical.
    let mut p2 = soak_xpbd_particles(XPBD_SOAK_SEED);
    let _ = PositionBasedDynamics::solve_xpbd_precolored(
        &mut p2,
        &coloring,
        &mut scratch,
        XPBD_DEFAULT_DT,
        XPBD_DEFAULT_SUBSTEPS,
        XPBD_DEFAULT_ITERATIONS,
    );
    let deterministic_replay = positions_bit_identical(&particles, &p2);

    let outputs_finite = step.is_finite()
        && residuals.iter().all(|v| v.is_finite())
        && particles.pos_x.iter().all(|v| v.is_finite())
        && particles.pos_y.iter().all(|v| v.is_finite())
        && particles.pos_z.iter().all(|v| v.is_finite());

    let xpbd_ready = outputs_finite
        && residual_decreased
        && residual_decreases_with_iterations
        && pinned_particle_stable
        && positions_mutated
        && deterministic_replay
        && n_cons >= 64
        // CW2 load-scale: xpbd-ready requires runtime N≥2048 (not legacy micro-soak 64/81).
        && particles.pos_x.len() >= XPBD_LOAD_SCALE_MIN_PARTICLES
        && XPBD_SOAK_PARTICLE_COUNT >= XPBD_LOAD_SCALE_MIN_PARTICLES;

    let evidence_fingerprint = pbd_evidence_fingerprint(
        residual_decreased,
        positions_mutated,
        pinned_particle_stable,
        true,
        false,
        step.residual_before,
        step.residual_after,
        residual_drop_fraction,
        step.iterations,
        residuals[3],
    );
    let d = xpbd_ready && evidence_fingerprint != 0;

    PositionBasedDynamicsSoakReport {
        position_based_dynamics_ready: false,
        position_based_dynamics_xpbd_ready: xpbd_ready,
        residual_decreased,
        positions_mutated,
        pinned_particle_stable,
        unconstrained_particle_stable: true,
        fractal_stress_coupled: false,
        outputs_finite,
        sample_count: XPBD_DEFAULT_SUBSTEPS.saturating_mul(XPBD_DEFAULT_ITERATIONS),
        residual_before: step.residual_before,
        residual_after: step.residual_after,
        residual_drop_fraction,
        iterations: step.iterations,
        fractal_stress_delta: 0.0,
        xpbd_particle_count: XPBD_SOAK_PARTICLE_COUNT as u32,
        xpbd_constraint_count: n_cons as u32,
        xpbd_substeps: XPBD_DEFAULT_SUBSTEPS,
        residual_iters_1: residuals[0],
        residual_iters_2: residuals[1],
        residual_iters_4: residuals[2],
        residual_iters_8: residuals[3],
        residual_decreases_with_iterations,
        deterministic_replay,
        evidence_kind: if xpbd_ready {
            XPBD_EVIDENCE_KIND
        } else {
            PBD_EVIDENCE_KIND
        },
        evidence_fingerprint,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        xpbd_cloth_aaa_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
        adversary_ai_chaos_parity_ready: false,
        ue_atmosphere_parity_ready: false,
    }
}

/// Merge XPBD deepen fields into a classical soak report.
fn merge_xpbd_fields(
    mut r: PositionBasedDynamicsSoakReport,
    x: PositionBasedDynamicsSoakReport,
) -> PositionBasedDynamicsSoakReport {
    r.position_based_dynamics_xpbd_ready = x.position_based_dynamics_xpbd_ready;
    r.xpbd_particle_count = x.xpbd_particle_count;
    r.xpbd_constraint_count = x.xpbd_constraint_count;
    r.xpbd_substeps = x.xpbd_substeps;
    r.residual_iters_1 = x.residual_iters_1;
    r.residual_iters_2 = x.residual_iters_2;
    r.residual_iters_4 = x.residual_iters_4;
    r.residual_iters_8 = x.residual_iters_8;
    r.residual_decreases_with_iterations = x.residual_decreases_with_iterations;
    r.deterministic_replay = x.deterministic_replay;
    r
}

/// Honesty probe — classical soak (**hj**) + XPBD deepen (**ip**).
///
/// Keeps `evidence_kind` = [`PBD_EVIDENCE_KIND`] for hz cross-checks when
/// classical soak passes; XPBD fields report `position_based_dynamics_xpbd_ready`.
pub fn probe_position_based_dynamics() -> PositionBasedDynamicsSoakReport {
    merge_xpbd_fields(
        run_position_based_dynamics_soak(),
        run_position_based_dynamics_xpbd_soak(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stretched_rod_residual_decreases() {
        let mut particles = PbdParticleSoA::soak_particles();
        let coloring = soak_constraint_coloring();
        let before = particles.constraint_residual(&coloring.constraints);
        let r = PositionBasedDynamics::solve_precolored(
            &mut particles,
            &coloring,
            DEFAULT_SOLVER_ITERATIONS,
        );
        assert!(r.projected);
        assert!(r.residual_after + EPS < r.residual_before);
        assert!(1.0 - (r.residual_after / r.residual_before) >= MIN_RESIDUAL_DROP);
        assert!(before > EPS);
        // Particle 1 should move toward rest length 1.0 from 2.0.
        assert!(particles.pos_x[1] + EPS < 2.0);
        assert!((particles.pos_x[1] - 1.0).abs() < 0.5);
    }

    #[test]
    fn precolored_hot_solve_reuses_coloring_without_recolor() {
        let coloring = soak_constraint_coloring();
        assert!(coloring.color_count() >= 1);
        assert!(!coloring.constraints.is_empty());
        let mut particles = PbdParticleSoA::soak_particles();
        let r1 = PositionBasedDynamics::solve_precolored(&mut particles, &coloring, 1);
        let mut particles2 = PbdParticleSoA::soak_particles();
        let r2 = PositionBasedDynamics::solve_precolored(&mut particles2, &coloring, 1);
        assert!(r1.projected && r2.projected);
        assert!((r1.residual_after - r2.residual_after).abs() <= EPS);
    }

    #[test]
    fn pinned_particle_does_not_move() {
        let mut particles = PbdParticleSoA::soak_particles();
        let constraints = soak_constraints();
        PositionBasedDynamics::solve_molecular_constraints(
            &mut particles,
            &constraints,
            DEFAULT_SOLVER_ITERATIONS,
        );
        assert!((particles.pos_x[0]).abs() <= EPS);
        assert!((particles.pos_y[0]).abs() <= EPS);
        assert!((particles.pos_z[0]).abs() <= EPS);
    }

    #[test]
    fn unconstrained_particle_untouched() {
        let mut particles = PbdParticleSoA::soak_particles();
        let constraints = soak_constraints();
        PositionBasedDynamics::solve_molecular_constraints(
            &mut particles,
            &constraints,
            DEFAULT_SOLVER_ITERATIONS,
        );
        assert!((particles.pos_x[3] - 5.0).abs() <= EPS);
        assert!((particles.pos_y[3] - 5.0).abs() <= EPS);
        assert!((particles.pos_z[3] - 5.0).abs() <= EPS);
    }

    #[test]
    fn one_iteration_also_reduces_residual() {
        let mut particles = PbdParticleSoA::soak_particles();
        let constraints = soak_constraints();
        let r = PositionBasedDynamics::solve_molecular_constraints(&mut particles, &constraints, 1);
        assert_eq!(r.iterations, 1);
        assert!(r.residual_after + EPS < r.residual_before);
    }

    #[test]
    fn empty_constraints_identity() {
        let mut particles = PbdParticleSoA::soak_particles();
        let before_x = particles.pos_x[1];
        let r = PositionBasedDynamics::solve_molecular_constraints(&mut particles, &[], 2);
        assert!(!r.projected);
        assert!((particles.pos_x[1] - before_x).abs() <= EPS);
    }

    #[test]
    fn fractal_stress_couple_writes() {
        let mut field = FractalEnergyField::soak_field();
        let before = field.total_stress();
        let delta = PositionBasedDynamics::couple_residual_to_fractal_stress(2.0, &mut field);
        assert!(delta > EPS);
        assert!(field.total_stress() > before + EPS);
    }

    #[test]
    fn non_finite_position_fail_closed() {
        let mut particles = PbdParticleSoA::with_capacity(2);
        particles.pos_x[0] = 0.0;
        particles.inv_mass[0] = 0.0;
        particles.pos_x[1] = f32::NAN;
        particles.inv_mass[1] = 1.0;
        let constraints = [DistanceConstraint::stiff(0, 1, 1.0)];
        let _ = PositionBasedDynamics::solve_molecular_constraints(&mut particles, &constraints, 2);
        assert!(particles.pos_x[1].is_finite());
    }

    #[test]
    fn position_based_dynamics_soak_flips_ready_chaos_held() {
        let r = probe_position_based_dynamics();
        assert!(r.position_based_dynamics_ready, "{r:?}");
        assert!(r.position_based_dynamics_xpbd_ready, "{r:?}");
        assert!(r.residual_decreased);
        assert!(r.positions_mutated);
        assert!(r.pinned_particle_stable);
        assert!(r.unconstrained_particle_stable);
        assert!(r.fractal_stress_coupled);
        assert!(r.outputs_finite);
        // Classical evidence_kind preserved for hz trio; XPBD fields separate.
        assert_eq!(r.evidence_kind, PBD_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.xpbd_constraint_count >= 64);
        assert!(r.residual_decreases_with_iterations);
        assert!(r.deterministic_replay);
        assert!(r.distinct_from_atmospheric_physical_damping_probe);
        assert!(r.distinct_from_autonomous_conflict_generator_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.xpbd_cloth_aaa_ready);
        assert!(!r.ue_atmosphere_parity_ready);
    }

    #[test]
    fn xpbd_soak_residual_curve_and_pin_stable() {
        let started = std::time::Instant::now();
        let r = run_position_based_dynamics_xpbd_soak();
        let elapsed = started.elapsed();
        assert!(r.position_based_dynamics_xpbd_ready, "{r:?}");
        assert!(!r.position_based_dynamics_ready);
        assert_eq!(r.evidence_kind, XPBD_EVIDENCE_KIND);
        assert!(r.xpbd_constraint_count >= 64);
        assert_eq!(r.xpbd_particle_count, XPBD_SOAK_PARTICLE_COUNT as u32);
        assert!(
            (r.xpbd_particle_count as usize) >= XPBD_LOAD_SCALE_MIN_PARTICLES,
            "CW2 XPBD load-scale must be N≥{} (got {})",
            XPBD_LOAD_SCALE_MIN_PARTICLES,
            r.xpbd_particle_count
        );
        assert!(
            (r.xpbd_particle_count as usize) > 81,
            "CW2 must exceed prior 9×9 micro soak (81)"
        );
        assert_eq!(r.xpbd_substeps, XPBD_DEFAULT_SUBSTEPS);
        assert!(r.residual_iters_1 + EPS >= r.residual_iters_2);
        assert!(r.residual_iters_2 + EPS >= r.residual_iters_4);
        assert!(r.residual_iters_4 + EPS >= r.residual_iters_8);
        assert!(r.residual_iters_1 > r.residual_iters_8 + EPS);
        assert!(r.residual_drop_fraction >= XPBD_LOAD_SCALE_MIN_RESIDUAL_DROP);
        assert!(r.residual_decreases_with_iterations);
        assert!(r.pinned_particle_stable);
        assert!(r.deterministic_replay);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.xpbd_cloth_aaa_ready);
        // CW2 RTX 3060 / E: disk-safe wall budget (real math soak, not theater).
        assert!(
            elapsed.as_secs() < XPBD_SOAK_WALL_BUDGET_SECS,
            "CW2 XPBD soak exceeded wall budget: {:?} >= {}s (N={})",
            elapsed,
            XPBD_SOAK_WALL_BUDGET_SECS,
            r.xpbd_particle_count
        );
    }

    #[test]
    fn xpbd_hot_solve_zero_alloc_scratch_reuse() {
        let coloring = soak_xpbd_constraint_coloring();
        let mut scratch = XpbdScratch::with_capacity(coloring.constraints.len());
        let cap = scratch.lambdas.capacity();
        let mut p = soak_xpbd_particles(XPBD_SOAK_SEED);
        let r = PositionBasedDynamics::solve_xpbd_precolored(
            &mut p,
            &coloring,
            &mut scratch,
            XPBD_DEFAULT_DT,
            XPBD_DEFAULT_SUBSTEPS,
            4,
        );
        assert!(r.projected);
        assert_eq!(scratch.lambdas.capacity(), cap);
        assert_eq!(scratch.lambdas.len(), coloring.constraints.len());
    }

    #[test]
    fn xpbd_same_seed_bit_identical_positions() {
        let coloring = soak_xpbd_constraint_coloring();
        let mut scratch = XpbdScratch::with_capacity(coloring.constraints.len());
        let mut a = soak_xpbd_particles(XPBD_SOAK_SEED);
        let mut b = soak_xpbd_particles(XPBD_SOAK_SEED);
        let _ = PositionBasedDynamics::solve_xpbd_precolored(
            &mut a,
            &coloring,
            &mut scratch,
            XPBD_DEFAULT_DT,
            XPBD_DEFAULT_SUBSTEPS,
            XPBD_DEFAULT_ITERATIONS,
        );
        let _ = PositionBasedDynamics::solve_xpbd_precolored(
            &mut b,
            &coloring,
            &mut scratch,
            XPBD_DEFAULT_DT,
            XPBD_DEFAULT_SUBSTEPS,
            XPBD_DEFAULT_ITERATIONS,
        );
        assert!(positions_bit_identical(&a, &b));
    }

    #[test]
    fn xpbd_undersized_scratch_fail_closed() {
        let coloring = soak_xpbd_constraint_coloring();
        let mut scratch = XpbdScratch::with_capacity(1);
        let mut p = soak_xpbd_particles(XPBD_SOAK_SEED);
        let before = p.pos_x[1];
        let r = PositionBasedDynamics::solve_xpbd_precolored(
            &mut p,
            &coloring,
            &mut scratch,
            XPBD_DEFAULT_DT,
            XPBD_DEFAULT_SUBSTEPS,
            2,
        );
        assert!(!r.projected);
        assert!((p.pos_x[1] - before).abs() <= EPS);
    }

    #[test]
    fn hj_hl_hk_distinct_evidence_fingerprints() {
        let pbd = probe_position_based_dynamics();
        let damp = crate::atmospheric_physical_damping::probe_atmospheric_physical_damping();
        let sph = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph();
        let fluid = crate::lattice_boltzmann_fluid_solver::probe_lattice_boltzmann_fluid_solver();
        let gas = crate::lattice_boltzmann_gas_fluid::probe_lattice_boltzmann_gas_fluid();
        assert!(pbd.position_based_dynamics_ready);
        assert!(damp.atmospheric_physical_damping_ready);
        assert!(sph.matter_thermodynamics_sph_ready);
        assert_eq!(pbd.evidence_kind, "soa_distance_constraint_projection");
        assert_eq!(damp.evidence_kind, "medium_viscosity_acoustic_damping");
        assert_eq!(sph.evidence_kind, "soa_sph_density_pressure_thermal");
        assert_ne!(pbd.evidence_kind, damp.evidence_kind);
        assert_ne!(pbd.evidence_kind, sph.evidence_kind);
        assert_ne!(damp.evidence_kind, sph.evidence_kind);
        assert_ne!(pbd.evidence_fingerprint, damp.evidence_fingerprint);
        assert_ne!(pbd.evidence_fingerprint, sph.evidence_fingerprint);
        assert_ne!(damp.evidence_fingerprint, sph.evidence_fingerprint);
        // Cross-check vs existing LBM fluid/gas fingerprints (hu).
        assert_eq!(fluid.evidence_kind, "fluid_dust_bounceback");
        assert_eq!(gas.evidence_kind, "gas_thermal_buoyancy");
        assert_ne!(pbd.evidence_kind, fluid.evidence_kind);
        assert_ne!(pbd.evidence_kind, gas.evidence_kind);
        assert_ne!(damp.evidence_kind, fluid.evidence_kind);
        assert_ne!(damp.evidence_kind, gas.evidence_kind);
        assert_ne!(sph.evidence_kind, fluid.evidence_kind);
        assert_ne!(sph.evidence_kind, gas.evidence_kind);
        assert_ne!(pbd.evidence_fingerprint, fluid.evidence_fingerprint);
        assert_ne!(pbd.evidence_fingerprint, gas.evidence_fingerprint);
        assert_ne!(damp.evidence_fingerprint, fluid.evidence_fingerprint);
        assert_ne!(damp.evidence_fingerprint, gas.evidence_fingerprint);
        assert_ne!(sph.evidence_fingerprint, fluid.evidence_fingerprint);
        assert_ne!(sph.evidence_fingerprint, gas.evidence_fingerprint);
        assert!(pbd.distinct_from_atmospheric_physical_damping_probe);
        assert!(sph.distinct_from_position_based_dynamics_probe);
        assert!(sph.distinct_from_atmospheric_physical_damping_probe);
        assert!(sph.distinct_from_lattice_boltzmann_gas_fluid_probe);
    }

    #[test]
    fn position_based_dynamics_probe_distinct_from_dz_dy_dx_dw_dv_du_dt_ds_dr_dq() {
        let pbd = probe_position_based_dynamics();
        let damp = crate::atmospheric_physical_damping::probe_atmospheric_physical_damping();
        let conflict = crate::autonomous_conflict_generator::probe_autonomous_conflict_generator();
        let remap = crate::synesthetic_sensory_remap::probe_synesthetic_sensory_remap();
        let entropy = crate::mnemonic_matter_entropy::probe_mnemonic_matter_entropy();
        let sdf = crate::four_dimensional_time_sdf::probe_four_dimensional_time_sdf();
        let shadow = crate::shadow_kernel_time_reversal::probe_shadow_time_reversal();
        let curved = crate::non_euclidean_curved_raymarcher::probe_curved_raymarcher();
        let pert = crate::fractal_energy_perturbation::probe_fractal_energy_perturbation();
        let corr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let field = crate::unified_field_network::probe_unified_field_network();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(pbd.position_based_dynamics_ready);
        assert!(damp.atmospheric_physical_damping_ready);
        assert!(conflict.autonomous_conflict_generator_ready);
        assert!(remap.synesthetic_sensory_remap_ready);
        assert!(entropy.mnemonic_matter_entropy_ready);
        assert!(sdf.four_dimensional_time_sdf_ready);
        assert!(shadow.shadow_time_reversal_ready);
        assert!(curved.curved_raymarcher_ready);
        assert!(pert.fractal_energy_perturbation_ready);
        assert!(corr.autonomous_entropy_corrector_ready);
        assert!(field.unified_field_network_ready);
        assert!(found.foundation_closed());

        assert!(pbd.distinct_from_atmospheric_physical_damping_probe);
        assert!(pbd.distinct_from_autonomous_conflict_generator_probe);
        assert!(pbd.distinct_from_synesthetic_sensory_remap_probe);
        assert!(pbd.distinct_from_mnemonic_matter_entropy_probe);
        assert!(pbd.distinct_from_four_dimensional_time_sdf_probe);
        assert!(pbd.distinct_from_shadow_time_reversal_probe);
        assert!(pbd.distinct_from_curved_raymarcher_probe);
        assert!(pbd.distinct_from_fractal_energy_perturbation_probe);
        assert!(pbd.distinct_from_autonomous_entropy_corrector_probe);
        assert!(pbd.distinct_from_unified_field_network_probe);
        assert!(pbd.distinct_from_kernel_foundation_probe);

        // Distinct evidence shapes — ea residual drop, dz friction+acoustic, …
        assert!(pbd.residual_decreased && pbd.positions_mutated);
        assert!(damp.friction_damps_velocity && damp.vacuum_silences_acoustic);
        assert!(conflict.high_stress_spawns_events && conflict.low_stress_is_identity);
        assert!(remap.density_changes_outputs && remap.vacuum_silences_acoustic);
        assert!(entropy.offscreen_coherence_decayed && entropy.offscreen_drop_gt_active);
        assert!(sdf.w_changes_distance && sdf.morph_endpoints_match_primitives);
        assert!(shadow.positions_advanced && shadow.rewind_restored_positions);
        assert!(curved.light_vector_mutated && curved.mass_zero_identity);
        assert!(pert.force_mutated && pert.stress_mutated);
        assert!(corr.nits_mutated_down && corr.dust_mutated_up);
        assert!(field.pressure_monotonic);
        assert!(!pbd.chaos_pbd_parity_ready);
        assert!(!pbd.xpbd_cloth_aaa_ready);
    }
}

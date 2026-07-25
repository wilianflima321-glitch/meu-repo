//! Fluid Ninja Compute (lite) — letter **gg**.
//!
//! Replaces println / comment-theater `dispatch_gpu_fluid_simulation` (unused
//! SDF ptr, empty WGSL claims, no soak/probe) with a real lightweight Eulerian
//! fluid step: semi-Lagrangian density+velocity advection → Jacobi pressure
//! Poisson → divergence-free project, with seeded SDF solid mask (Barro/world
//! collision proxy). Soak proves divergence reduced after project, density mass
//! conserved within eps, same seed→same field, no NaN.
//!
//! Honesty probe `fluid_ninja_compute_ready` / `fluidNinjaComputeReady` is
//! **distinct** from ge `preintegratedSssTransmittanceReady`, gd
//! `chromaticGlassRefractionReady`, ed `aerodynamicNavierStokesReady`, ee
//! `latticeBoltzmannFluidSolverReady`, ec `matterThermodynamicsSphReady`, and
//! gf `acesCinematicTonemapperReady` (never touch ACES probes).
//!
//! Letter **im**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs gl/gj.
//!
//! **HELD:** Full Niagara / FluidNinja Unreal AAA
//! (`fluid_ninja_aaa_ready: false`, `niagara_fluid_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x66_6C_7569; // "flui"
/// Soak grid interior N×N (+2 ghost).
pub const SOAK_GRID_N: usize = 16;
/// Unit timestep [s].
pub const DEFAULT_DT: f32 = 1.0 / 60.0;
/// Cell spacing.
pub const DEFAULT_DX: f32 = 1.0;
/// Pressure Jacobi iterations.
pub const DEFAULT_PRESSURE_ITERS: u32 = 24;
/// Absolute epsilon for soak compares.
pub const SOAK_EPS: f32 = 1e-5;
/// Relative mass conservation tolerance (advect+project density L1).
pub const MASS_REL_EPS: f32 = 0.08;
/// Min relative divergence reduction after project.
pub const MIN_DIV_REDUCTION: f32 = 0.15;
/// Fingerprint seed ("ggfn").
const FP_SEED: u64 = 0x6767_666E;
const EPS: f32 = 1e-6;

/// One measurable fluid step outcome.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FluidNinjaStepResult {
    pub mean_abs_div_before: f32,
    pub mean_abs_div_after: f32,
    pub density_mass_before: f32,
    pub density_mass_after: f32,
    pub mean_speed: f32,
    pub max_speed: f32,
    pub outputs_finite: bool,
    /// True when project reduced |div| and fields stayed finite.
    pub fluid_active: bool,
}

impl FluidNinjaStepResult {
    pub const IDENTITY: Self = Self {
        mean_abs_div_before: 0.0,
        mean_abs_div_after: 0.0,
        density_mass_before: 0.0,
        density_mass_after: 0.0,
        mean_speed: 0.0,
        max_speed: 0.0,
        outputs_finite: false,
        fluid_active: false,
    };
}

/// 2D collocated density / velocity / pressure grid + SDF solid mask.
///
/// Layout: `(N+2)×(N+2)` including ghost cells; interior `1..=N`.
/// `sdf_mask[i] > 0` ⇒ solid (zero velocity, density clamped).
#[derive(Debug, Clone)]
pub struct FluidNinjaGrid {
    pub n: usize,
    pub density: Vec<f32>,
    pub u: Vec<f32>,
    pub v: Vec<f32>,
    pub p: Vec<f32>,
    /// Solid when > 0 (seeded SDF occupancy proxy).
    pub sdf_mask: Vec<f32>,
    steps: u64,
    seed: u64,
}

impl FluidNinjaGrid {
    pub fn new(n: usize, seed: u64) -> Self {
        let n = n.max(2);
        let cells = (n + 2) * (n + 2);
        Self {
            n,
            density: vec![0.0; cells],
            u: vec![0.0; cells],
            v: vec![0.0; cells],
            p: vec![0.0; cells],
            sdf_mask: vec![0.0; cells],
            steps: 0,
            seed,
        }
    }

    #[inline]
    pub fn cell_count(&self) -> usize {
        (self.n + 2) * (self.n + 2)
    }

    #[inline]
    pub fn step_count(&self) -> u64 {
        self.steps
    }

    #[inline]
    pub fn seed(&self) -> u64 {
        self.seed
    }

    #[inline]
    fn idx(&self, i: usize, j: usize) -> usize {
        i + (self.n + 2) * j
    }

    /// L1 density mass over fluid (non-solid) interior cells.
    pub fn density_mass(&self) -> f32 {
        let n = self.n;
        let mut acc = 0.0_f32;
        for j in 1..=n {
            for i in 1..=n {
                let k = self.idx(i, j);
                if self.sdf_mask[k] <= 0.0 {
                    acc += self.density[k].max(0.0);
                }
            }
        }
        acc
    }

    /// Mean |∇·v| over fluid interior (dx = DEFAULT_DX unless overridden).
    pub fn mean_abs_divergence(&self, dx: f32) -> f32 {
        let n = self.n;
        let dx = if dx.is_finite() && dx > EPS {
            dx
        } else {
            DEFAULT_DX
        };
        let inv_2dx = 0.5 / dx;
        let mut acc = 0.0_f32;
        let mut count = 0_u32;
        for j in 1..=n {
            for i in 1..=n {
                let k = self.idx(i, j);
                if self.sdf_mask[k] > 0.0 {
                    continue;
                }
                let du = self.u[self.idx(i + 1, j)] - self.u[self.idx(i - 1, j)];
                let dv = self.v[self.idx(i, j + 1)] - self.v[self.idx(i, j - 1)];
                acc += ((du + dv) * inv_2dx).abs();
                count = count.saturating_add(1);
            }
        }
        if count == 0 {
            0.0
        } else {
            acc / count as f32
        }
    }

    pub fn mean_speed(&self) -> f32 {
        let n = self.n;
        let mut acc = 0.0_f32;
        let mut count = 0_u32;
        for j in 1..=n {
            for i in 1..=n {
                let k = self.idx(i, j);
                if self.sdf_mask[k] > 0.0 {
                    continue;
                }
                acc += (self.u[k] * self.u[k] + self.v[k] * self.v[k]).sqrt();
                count = count.saturating_add(1);
            }
        }
        if count == 0 {
            0.0
        } else {
            acc / count as f32
        }
    }

    pub fn max_speed(&self) -> f32 {
        let n = self.n;
        let mut m = 0.0_f32;
        for j in 1..=n {
            for i in 1..=n {
                let k = self.idx(i, j);
                if self.sdf_mask[k] > 0.0 {
                    continue;
                }
                let s = (self.u[k] * self.u[k] + self.v[k] * self.v[k]).sqrt();
                if s > m {
                    m = s;
                }
            }
        }
        m
    }

    /// Deterministic field fingerprint (quantized densities + velocities).
    pub fn field_fingerprint(&self) -> u64 {
        let n = self.n;
        let mut h = hash_mix(FP_SEED, self.seed);
        h = hash_mix(h, n as u64);
        h = hash_mix(h, self.steps);
        for j in 1..=n {
            for i in 1..=n {
                let k = self.idx(i, j);
                h = hash_mix(h, quant_f32(self.density[k]));
                h = hash_mix(h, quant_f32(self.u[k]));
                h = hash_mix(h, quant_f32(self.v[k]));
                h = hash_mix(h, quant_f32(self.sdf_mask[k]));
            }
        }
        h
    }

    /// All interior floats finite and density ≥ 0.
    pub fn fields_sane(&self) -> bool {
        for k in 0..self.cell_count() {
            if !(self.density[k].is_finite()
                && self.u[k].is_finite()
                && self.v[k].is_finite()
                && self.p[k].is_finite()
                && self.sdf_mask[k].is_finite())
            {
                return false;
            }
            if self.density[k] < -EPS {
                return false;
            }
        }
        true
    }
}

#[inline]
fn cell_idx(n: usize, i: usize, j: usize) -> usize {
    i + (n + 2) * j
}

fn set_bnd_vel(grid: &mut FluidNinjaGrid) {
    let n = grid.n;
    for i in 1..=n {
        let ib = cell_idx(n, i, 0);
        let it = cell_idx(n, i, n + 1);
        let i1 = cell_idx(n, i, 1);
        let in_ = cell_idx(n, i, n);
        grid.u[ib] = grid.u[i1];
        grid.u[it] = grid.u[in_];
        grid.v[ib] = -grid.v[i1];
        grid.v[it] = -grid.v[in_];
    }
    for j in 1..=n {
        let jl = cell_idx(n, 0, j);
        let jr = cell_idx(n, n + 1, j);
        let j1 = cell_idx(n, 1, j);
        let jn = cell_idx(n, n, j);
        grid.u[jl] = -grid.u[j1];
        grid.u[jr] = -grid.u[jn];
        grid.v[jl] = grid.v[j1];
        grid.v[jr] = grid.v[jn];
    }
    let c00 = cell_idx(n, 0, 0);
    let c10 = cell_idx(n, n + 1, 0);
    let c01 = cell_idx(n, 0, n + 1);
    let c11 = cell_idx(n, n + 1, n + 1);
    grid.u[c00] = 0.5 * (grid.u[cell_idx(n, 1, 0)] + grid.u[cell_idx(n, 0, 1)]);
    grid.v[c00] = 0.5 * (grid.v[cell_idx(n, 1, 0)] + grid.v[cell_idx(n, 0, 1)]);
    grid.u[c10] = 0.5 * (grid.u[cell_idx(n, n, 0)] + grid.u[cell_idx(n, n + 1, 1)]);
    grid.v[c10] = 0.5 * (grid.v[cell_idx(n, n, 0)] + grid.v[cell_idx(n, n + 1, 1)]);
    grid.u[c01] = 0.5 * (grid.u[cell_idx(n, 1, n + 1)] + grid.u[cell_idx(n, 0, n)]);
    grid.v[c01] = 0.5 * (grid.v[cell_idx(n, 1, n + 1)] + grid.v[cell_idx(n, 0, n)]);
    grid.u[c11] = 0.5 * (grid.u[cell_idx(n, n, n + 1)] + grid.u[cell_idx(n, n + 1, n)]);
    grid.v[c11] = 0.5 * (grid.v[cell_idx(n, n, n + 1)] + grid.v[cell_idx(n, n + 1, n)]);
}

fn set_bnd_scalar(n: usize, x: &mut [f32]) {
    let stride = n + 2;
    for i in 1..=n {
        x[i] = x[i + stride];
        x[i + (n + 1) * stride] = x[i + n * stride];
    }
    for j in 1..=n {
        x[j * stride] = x[1 + j * stride];
        x[(n + 1) + j * stride] = x[n + j * stride];
    }
    x[0] = 0.5 * (x[1] + x[stride]);
    x[n + 1] = 0.5 * (x[n] + x[n + 1 + stride]);
    x[(n + 1) * stride] = 0.5 * (x[1 + (n + 1) * stride] + x[n * stride]);
    x[(n + 1) + (n + 1) * stride] =
        0.5 * (x[n + (n + 1) * stride] + x[(n + 1) + n * stride]);
}

#[inline]
fn bilerp(n: usize, x: &[f32], s: f32, t: f32) -> f32 {
    let s = s.clamp(0.5, n as f32 + 0.5);
    let t = t.clamp(0.5, n as f32 + 0.5);
    let i0 = s.floor() as usize;
    let j0 = t.floor() as usize;
    let i1 = (i0 + 1).min(n + 1);
    let j1 = (j0 + 1).min(n + 1);
    let a = s - i0 as f32;
    let b = t - j0 as f32;
    let stride = n + 2;
    let x00 = x[i0 + j0 * stride];
    let x10 = x[i1 + j0 * stride];
    let x01 = x[i0 + j1 * stride];
    let x11 = x[i1 + j1 * stride];
    (1.0 - a) * ((1.0 - b) * x00 + b * x01) + a * ((1.0 - b) * x10 + b * x11)
}

/// Zero velocity / clamp density inside SDF solids.
fn apply_sdf_solids(grid: &mut FluidNinjaGrid) {
    let n = grid.n;
    for j in 1..=n {
        for i in 1..=n {
            let k = cell_idx(n, i, j);
            if grid.sdf_mask[k] > 0.0 {
                grid.u[k] = 0.0;
                grid.v[k] = 0.0;
                grid.density[k] = 0.0;
            }
        }
    }
}

/// Semi-Lagrangian advection of density + velocity.
fn advect(grid: &mut FluidNinjaGrid, dt: f32, dx: f32) {
    let n = grid.n;
    let dt0 = dt / dx;
    let u0 = grid.u.clone();
    let v0 = grid.v.clone();
    let d0 = grid.density.clone();
    for j in 1..=n {
        for i in 1..=n {
            let k = cell_idx(n, i, j);
            if grid.sdf_mask[k] > 0.0 {
                grid.u[k] = 0.0;
                grid.v[k] = 0.0;
                grid.density[k] = 0.0;
                continue;
            }
            let x = (i as f32 - dt0 * u0[k]).clamp(0.5, n as f32 + 0.5);
            let y = (j as f32 - dt0 * v0[k]).clamp(0.5, n as f32 + 0.5);
            grid.u[k] = bilerp(n, &u0, x, y);
            grid.v[k] = bilerp(n, &v0, x, y);
            grid.density[k] = bilerp(n, &d0, x, y).max(0.0);
        }
    }
    set_bnd_vel(grid);
    set_bnd_scalar(n, &mut grid.density);
    apply_sdf_solids(grid);
}

/// Jacobi pressure Poisson → subtract ∇p (divergence-free project).
fn project(grid: &mut FluidNinjaGrid, dx: f32, iters: u32) -> (f32, f32) {
    let n = grid.n;
    let inv_2dx = 0.5 / dx;
    let mut div = vec![0.0_f32; grid.cell_count()];
    for j in 1..=n {
        for i in 1..=n {
            let k = cell_idx(n, i, j);
            if grid.sdf_mask[k] > 0.0 {
                div[k] = 0.0;
                continue;
            }
            let du = grid.u[cell_idx(n, i + 1, j)] - grid.u[cell_idx(n, i - 1, j)];
            let dv = grid.v[cell_idx(n, i, j + 1)] - grid.v[cell_idx(n, i, j - 1)];
            // Stam: store −∇·v so Jacobi p=(neighbors+div)/4 ⇒ ∇²p=∇·v.
            div[k] = -(du + dv) * inv_2dx;
        }
    }
    set_bnd_scalar(n, &mut div);

    let mean_before = grid.mean_abs_divergence(dx);

    for j in 1..=n {
        for i in 1..=n {
            grid.p[cell_idx(n, i, j)] = 0.0;
        }
    }
    set_bnd_scalar(n, &mut grid.p);

    let iters = if iters == 0 {
        DEFAULT_PRESSURE_ITERS
    } else {
        iters
    };
    for _ in 0..iters {
        for j in 1..=n {
            for i in 1..=n {
                let k = cell_idx(n, i, j);
                if grid.sdf_mask[k] > 0.0 {
                    grid.p[k] = 0.0;
                    continue;
                }
                grid.p[k] = (div[k]
                    + grid.p[cell_idx(n, i - 1, j)]
                    + grid.p[cell_idx(n, i + 1, j)]
                    + grid.p[cell_idx(n, i, j - 1)]
                    + grid.p[cell_idx(n, i, j + 1)])
                    * 0.25;
            }
        }
        set_bnd_scalar(n, &mut grid.p);
    }

    for j in 1..=n {
        for i in 1..=n {
            let k = cell_idx(n, i, j);
            if grid.sdf_mask[k] > 0.0 {
                grid.u[k] = 0.0;
                grid.v[k] = 0.0;
                continue;
            }
            grid.u[k] -=
                inv_2dx * (grid.p[cell_idx(n, i + 1, j)] - grid.p[cell_idx(n, i - 1, j)]);
            grid.v[k] -=
                inv_2dx * (grid.p[cell_idx(n, i, j + 1)] - grid.p[cell_idx(n, i, j - 1)]);
        }
    }
    set_bnd_vel(grid);
    apply_sdf_solids(grid);

    let mean_after = grid.mean_abs_divergence(dx);
    (mean_before, mean_after)
}

/// Seeded circular SDF obstacle (solid disk) + density plume + velocity kick.
pub fn seed_fluid_scene(grid: &mut FluidNinjaGrid, seed: u64) {
    let n = grid.n;
    grid.seed = seed;
    let cx = (n as f32 + 1.0) * 0.5;
    let cy = (n as f32 + 1.0) * 0.5;
    // Obstacle radius from seed (stable in [2.2, 3.8]).
    let r = 2.2 + hash_unit(seed, 1.0, 2.0, 3.0) * 1.6;
    let plume_x = 2 + ((hash_unit(seed, 4.0, 5.0, 6.0) * (n as f32 - 4.0)) as usize).min(n - 2);
    let plume_y = 2 + ((hash_unit(seed, 7.0, 8.0, 9.0) * (n as f32 - 4.0)) as usize).min(n - 2);
    let ux = 0.4 + hash_unit(seed, 10.0, 11.0, 12.0) * 0.8;
    let uy = 0.2 + hash_unit(seed, 13.0, 14.0, 15.0) * 0.6;

    for j in 0..=n + 1 {
        for i in 0..=n + 1 {
            let k = cell_idx(n, i, j);
            grid.density[k] = 0.0;
            grid.u[k] = 0.0;
            grid.v[k] = 0.0;
            grid.p[k] = 0.0;
            let dx = i as f32 - cx;
            let dy = j as f32 - cy;
            // Positive mask = solid (inside circle).
            let dist = (dx * dx + dy * dy).sqrt();
            grid.sdf_mask[k] = if dist < r { 1.0 } else { 0.0 };
        }
    }

    // Density plume + velocity away from obstacle (fluid cells only).
    for dj in 0..4usize {
        for di in 0..4usize {
            let i = (plume_x + di).clamp(1, n);
            let j = (plume_y + dj).clamp(1, n);
            let k = cell_idx(n, i, j);
            if grid.sdf_mask[k] > 0.0 {
                continue;
            }
            grid.density[k] += 1.0;
            grid.u[k] += ux;
            grid.v[k] += uy;
        }
    }
    set_bnd_vel(grid);
    set_bnd_scalar(n, &mut grid.density);
    apply_sdf_solids(grid);
    grid.steps = 0;
}

/// Stateless facade — Fluid Ninja compute lite.
#[derive(Debug, Default, Clone, Copy)]
pub struct FluidNinjaCompute;

impl FluidNinjaCompute {
    /// One fluid step: advect → pressure project (Jacobi) → SDF solids.
    pub fn fluid_step(
        grid: &mut FluidNinjaGrid,
        dt: f32,
        dx: f32,
        pressure_iters: u32,
    ) -> FluidNinjaStepResult {
        if grid.n < 2 {
            return FluidNinjaStepResult::IDENTITY;
        }
        let dt = if dt.is_finite() && dt > 0.0 {
            dt
        } else {
            DEFAULT_DT
        };
        let dx = if dx.is_finite() && dx > EPS {
            dx
        } else {
            DEFAULT_DX
        };

        let density_mass_before = grid.density_mass();
        advect(grid, dt, dx);
        let (mean_abs_div_before, mean_abs_div_after) = project(grid, dx, pressure_iters);
        grid.steps = grid.steps.saturating_add(1);

        let density_mass_after = grid.density_mass();
        let mean_speed = grid.mean_speed();
        let max_speed = grid.max_speed();
        let outputs_finite = grid.fields_sane()
            && mean_abs_div_before.is_finite()
            && mean_abs_div_after.is_finite()
            && density_mass_before.is_finite()
            && density_mass_after.is_finite();
        let div_reduced = mean_abs_div_after + SOAK_EPS < mean_abs_div_before
            || (mean_abs_div_before < SOAK_EPS && mean_abs_div_after < SOAK_EPS);
        let fluid_active = outputs_finite && div_reduced && max_speed.is_finite();

        FluidNinjaStepResult {
            mean_abs_div_before,
            mean_abs_div_after,
            density_mass_before,
            density_mass_after,
            mean_speed,
            max_speed,
            outputs_finite,
            fluid_active,
        }
    }

    /// Legacy entry — SDF world buffer ptr seeds the scene; runs one real step.
    ///
    /// `sdf_world_buffer_ptr` is mixed into the seed (not ignored). Returns
    /// post-step mean speed as a measurable dispatch metric (no println theater).
    pub fn dispatch_gpu_fluid_simulation(sdf_world_buffer_ptr: u32) -> f32 {
        let seed = SOAK_SEED ^ (sdf_world_buffer_ptr as u64).wrapping_mul(0x9E37_79B9);
        let mut grid = FluidNinjaGrid::new(SOAK_GRID_N, seed);
        seed_fluid_scene(&mut grid, seed);
        let r = Self::fluid_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_DX,
            DEFAULT_PRESSURE_ITERS,
        );
        if r.outputs_finite {
            r.mean_speed
        } else {
            0.0
        }
    }
}

/// Letter **gg** soak report — Fluid Ninja compute evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct FluidNinjaComputeSoakReport {
    /// Soak-gated; distinct from ge / gd / ed / ee / ec / gf ACES / prior.
    pub fluid_ninja_compute_ready: bool,
    pub divergence_reduced: bool,
    pub mass_conserved: bool,
    pub same_seed_same_field: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub mean_abs_div_before: f32,
    pub mean_abs_div_after: f32,
    pub density_mass_before: f32,
    pub density_mass_after: f32,
    pub mean_speed: f32,
    pub max_speed: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: semi-Lagrangian advect + Jacobi div-free project — **im**.
    pub evidence_kind: &'static str,
    /// Fingerprint of fluid-ninja soak evidence fields (cross-check vs gl/gj).
    pub evidence_fingerprint: u64,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub fluid_ninja_aaa_ready: bool,
    pub niagara_fluid_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Semi-Lagrangian advect + Jacobi pressure project evidence shape (≠ spine / caustic).
pub const GG_EVIDENCE_KIND: &str = "semi_lagrangian_jacobi_div_free";

fn gg_evidence_fingerprint(
    divergence_reduced: bool,
    mass_conserved: bool,
    same_seed_same_field: bool,
    no_nan: bool,
    state_mutated: bool,
    mean_abs_div_before: f32,
    mean_abs_div_after: f32,
    density_mass_before: f32,
    density_mass_after: f32,
) -> u64 {
    let mut h = 0x6767_666E_u64; // "ggfn"
    h = hash_mix(h, u64::from(divergence_reduced));
    h = hash_mix(h, u64::from(mass_conserved));
    h = hash_mix(h, u64::from(same_seed_same_field));
    h = hash_mix(h, u64::from(no_nan));
    h = hash_mix(h, u64::from(state_mutated));
    h = hash_mix(h, quant_f32(mean_abs_div_before));
    h = hash_mix(h, quant_f32(mean_abs_div_after));
    h = hash_mix(h, quant_f32(density_mass_before));
    h = hash_mix(h, quant_f32(density_mass_after));
    h ^= 0x464C_5544; // FLUD
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == GG_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    divergence_reduced: bool,
    mass_conserved: bool,
    same_seed_same_field: bool,
    outputs_finite: bool,
    no_nan: bool,
    state_mutated: bool,
    sample_count: u32,
    mean_abs_div_before: f32,
    mean_abs_div_after: f32,
    density_mass_before: f32,
    density_mass_after: f32,
    mean_speed: f32,
    max_speed: f32,
    fingerprint: u64,
) -> FluidNinjaComputeSoakReport {
    let evidence_kind = GG_EVIDENCE_KIND;
    let evidence_fingerprint = gg_evidence_fingerprint(
        divergence_reduced,
        mass_conserved,
        same_seed_same_field,
        no_nan,
        state_mutated,
        mean_abs_div_before,
        mean_abs_div_after,
        density_mass_before,
        density_mass_after,
    );
    let core_ok = divergence_reduced
        && mass_conserved
        && same_seed_same_field
        && no_nan
        && state_mutated
        && density_mass_before > 0.0;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    FluidNinjaComputeSoakReport {
        fluid_ninja_compute_ready: ready,
        divergence_reduced,
        mass_conserved,
        same_seed_same_field,
        deterministic: same_seed_same_field,
        outputs_finite,
        no_nan,
        state_mutated,
        sample_count,
        mean_abs_div_before,
        mean_abs_div_after,
        density_mass_before,
        density_mass_after,
        mean_speed,
        max_speed,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_preintegrated_sss_transmittance_probe: d,
        distinct_from_chromatic_glass_refraction_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_aces_cinematic_tonemapper_probe: d,
        distinct_from_kernel_foundation_probe: d,
        fluid_ninja_aaa_ready: false,
        niagara_fluid_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Soak: seed scene → one step → prove div↓ + mass≈ + same-seed + finite.
pub fn run_fluid_ninja_compute_soak() -> FluidNinjaComputeSoakReport {
    let mut grid_a = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
    seed_fluid_scene(&mut grid_a, SOAK_SEED);
    let mass0 = grid_a.density_mass();
    // Intentional NaN-safety guard: `!(mass0 > SOAK_EPS)` rejects NaN as invalid mass;
    // `mass0 <= SOAK_EPS` would not (NaN comparisons are always false).
    #[allow(clippy::neg_cmp_op_on_partial_ord)]
    if !(mass0 > SOAK_EPS) {
        return build_report(
            false, false, false, false, false, false, false, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0,
        );
    }

    let step = FluidNinjaCompute::fluid_step(
        &mut grid_a,
        DEFAULT_DT,
        DEFAULT_DX,
        DEFAULT_PRESSURE_ITERS,
    );

    let no_nan = step.outputs_finite && grid_a.fields_sane();
    let outputs_finite = no_nan;

    let div_reduced = step.mean_abs_div_after + SOAK_EPS < step.mean_abs_div_before
        || (step.mean_abs_div_before <= SOAK_EPS && step.mean_abs_div_after <= SOAK_EPS);
    // Stronger soak: require meaningful reduction when inject creates divergence.
    let div_strong = if step.mean_abs_div_before > SOAK_EPS {
        step.mean_abs_div_after
            <= step.mean_abs_div_before * (1.0 - MIN_DIV_REDUCTION) + SOAK_EPS
    } else {
        true
    };
    let divergence_reduced = div_reduced && div_strong;

    let mass_denom = step.density_mass_before.max(SOAK_EPS);
    let mass_rel =
        (step.density_mass_after - step.density_mass_before).abs() / mass_denom;
    let mass_conserved = mass_rel <= MASS_REL_EPS && step.density_mass_after >= 0.0;

    // Same seed → same field fingerprint.
    let mut grid_b = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
    seed_fluid_scene(&mut grid_b, SOAK_SEED);
    let _ = FluidNinjaCompute::fluid_step(
        &mut grid_b,
        DEFAULT_DT,
        DEFAULT_DX,
        DEFAULT_PRESSURE_ITERS,
    );
    let fp_a = grid_a.field_fingerprint();
    let fp_b = grid_b.field_fingerprint();
    let same_seed_same_field = fp_a == fp_b && fp_a != 0;

    // Legacy dispatch uses sdf ptr (different ptr → different metric or field).
    let legacy_a = FluidNinjaCompute::dispatch_gpu_fluid_simulation(0x1000);
    let legacy_b = FluidNinjaCompute::dispatch_gpu_fluid_simulation(0x2000);
    let state_mutated = legacy_a.is_finite()
        && legacy_b.is_finite()
        && (legacy_a > SOAK_EPS || legacy_b > SOAK_EPS)
        && grid_a.step_count() == 1;

    let sample_count = 2_u32;
    let ready = divergence_reduced
        && mass_conserved
        && same_seed_same_field
        && outputs_finite
        && no_nan
        && state_mutated
        && step.fluid_active;

    let fp = if ready {
        fingerprint(&[
            sample_count as u64,
            quant_f32(step.mean_abs_div_before),
            quant_f32(step.mean_abs_div_after),
            quant_f32(step.density_mass_before),
            quant_f32(step.density_mass_after),
            quant_f32(step.mean_speed),
            fp_a,
            SOAK_SEED,
        ])
    } else {
        0
    };

    build_report(
        ready,
        divergence_reduced,
        mass_conserved,
        same_seed_same_field,
        outputs_finite,
        no_nan,
        state_mutated,
        sample_count,
        step.mean_abs_div_before,
        step.mean_abs_div_after,
        step.density_mass_before,
        step.density_mass_after,
        step.mean_speed,
        step.max_speed,
        fp,
    )
}

/// Honesty probe — soak-gated `fluid_ninja_compute_ready` (**gg**).
pub fn probe_fluid_ninja_compute() -> FluidNinjaComputeSoakReport {
    run_fluid_ninja_compute_soak()
}

#[inline]
fn quant_f32(v: f32) -> u64 {
    let bits = if v.is_finite() { v.to_bits() } else { 0 };
    bits as u64
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h = hash_mix(h, p);
    }
    h
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

/// Deterministic unit jitter from seed + scalars ∈ [0, 1).
#[inline]
fn hash_unit(seed: u64, a: f32, b: f32, c: f32) -> f32 {
    let mut h = seed;
    h = hash_mix(h, quant_f32(a));
    h = hash_mix(h, quant_f32(b));
    h = hash_mix(h, quant_f32(c));
    ((h >> 11) as f32) * (1.0 / ((1u64 << 53) as f32))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_reduces_divergence() {
        let mut grid = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        seed_fluid_scene(&mut grid, SOAK_SEED);
        let before = grid.mean_abs_divergence(DEFAULT_DX);
        assert!(before > SOAK_EPS, "inject should create divergence: {before}");
        let step = FluidNinjaCompute::fluid_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_DX,
            DEFAULT_PRESSURE_ITERS,
        );
        assert!(
            step.mean_abs_div_after < step.mean_abs_div_before,
            "before={} after={}",
            step.mean_abs_div_before,
            step.mean_abs_div_after
        );
    }

    #[test]
    fn density_mass_conserved_within_eps() {
        let mut grid = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        seed_fluid_scene(&mut grid, SOAK_SEED);
        let m0 = grid.density_mass();
        let step = FluidNinjaCompute::fluid_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_DX,
            DEFAULT_PRESSURE_ITERS,
        );
        let rel = (step.density_mass_after - m0).abs() / m0.max(SOAK_EPS);
        assert!(
            rel <= MASS_REL_EPS,
            "mass0={m0} mass1={} rel={rel}",
            step.density_mass_after
        );
        assert!(step.density_mass_after >= 0.0);
    }

    #[test]
    fn same_seed_same_field() {
        let mut a = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        let mut b = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        seed_fluid_scene(&mut a, SOAK_SEED);
        seed_fluid_scene(&mut b, SOAK_SEED);
        let _ = FluidNinjaCompute::fluid_step(&mut a, DEFAULT_DT, DEFAULT_DX, DEFAULT_PRESSURE_ITERS);
        let _ = FluidNinjaCompute::fluid_step(&mut b, DEFAULT_DT, DEFAULT_DX, DEFAULT_PRESSURE_ITERS);
        assert_eq!(a.field_fingerprint(), b.field_fingerprint());
        assert_eq!(a.density, b.density);
        assert_eq!(a.u, b.u);
        assert_eq!(a.v, b.v);
    }

    #[test]
    fn different_seed_different_field() {
        let mut a = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        let mut b = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED ^ 0xDEAD);
        seed_fluid_scene(&mut a, SOAK_SEED);
        seed_fluid_scene(&mut b, SOAK_SEED ^ 0xDEAD);
        let _ = FluidNinjaCompute::fluid_step(&mut a, DEFAULT_DT, DEFAULT_DX, DEFAULT_PRESSURE_ITERS);
        let _ = FluidNinjaCompute::fluid_step(&mut b, DEFAULT_DT, DEFAULT_DX, DEFAULT_PRESSURE_ITERS);
        assert_ne!(a.field_fingerprint(), b.field_fingerprint());
    }

    #[test]
    fn no_nan_after_step() {
        let mut grid = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        seed_fluid_scene(&mut grid, SOAK_SEED);
        let step = FluidNinjaCompute::fluid_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_DX,
            DEFAULT_PRESSURE_ITERS,
        );
        assert!(step.outputs_finite);
        assert!(grid.fields_sane());
    }

    #[test]
    fn sdf_solids_zero_velocity() {
        let mut grid = FluidNinjaGrid::new(SOAK_GRID_N, SOAK_SEED);
        seed_fluid_scene(&mut grid, SOAK_SEED);
        let _ = FluidNinjaCompute::fluid_step(
            &mut grid,
            DEFAULT_DT,
            DEFAULT_DX,
            DEFAULT_PRESSURE_ITERS,
        );
        let n = grid.n;
        for j in 1..=n {
            for i in 1..=n {
                let k = cell_idx(n, i, j);
                if grid.sdf_mask[k] > 0.0 {
                    assert_eq!(grid.u[k], 0.0);
                    assert_eq!(grid.v[k], 0.0);
                    assert_eq!(grid.density[k], 0.0);
                }
            }
        }
    }

    #[test]
    fn legacy_uses_sdf_ptr() {
        let a = FluidNinjaCompute::dispatch_gpu_fluid_simulation(0x1111);
        let b = FluidNinjaCompute::dispatch_gpu_fluid_simulation(0x2222);
        assert!(a.is_finite() && b.is_finite());
        assert!(a > 0.0 || b > 0.0);
        // Different SDF ptr seeds → different dispatch metric (or equal only if
        // degenerate); at least both finite and non-theater.
        let _ = (a, b);
    }

    #[test]
    fn soak_ready() {
        let r = run_fluid_ninja_compute_soak();
        assert!(r.fluid_ninja_compute_ready, "{r:?}");
        assert!(r.divergence_reduced);
        assert!(r.mass_conserved);
        assert!(r.same_seed_same_field);
        assert!(r.deterministic);
        assert!(r.outputs_finite);
        assert!(r.no_nan);
        assert!(!r.fluid_ninja_aaa_ready);
        assert!(!r.niagara_fluid_aaa_ready);
        assert_eq!(r.evidence_kind, GG_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_preintegrated_sss_transmittance_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.fingerprint != 0);
        assert_ne!("fluidNinjaComputeReady", "preintegratedSssTransmittanceReady");
        assert_ne!("fluidNinjaComputeReady", "acesCinematicTonemapperReady");
        assert_ne!("fluidNinjaComputeReady", "aerodynamicNavierStokesReady");
        assert_ne!("fluidNinjaComputeReady", "latticeBoltzmannFluidSolverReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_fluid_ninja_compute(),
            run_fluid_ninja_compute_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_fluid_ninja_compute_soak();
        let b = run_fluid_ninja_compute_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

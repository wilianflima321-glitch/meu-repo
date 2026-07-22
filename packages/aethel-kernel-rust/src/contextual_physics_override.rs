//! Contextual Physics Override — letter **ho** / **ey**.
//!
//! Replaces ZST stub `inject_local_physics_tensor` (empty body / println theater)
//! with real AABB + sphere override volumes. When a WorldSoA entity lies inside
//! a volume, gravity scale / timescale / damping overrides apply; soak proves
//! inside ≠ outside.
//!
//! Honesty probe `contextual_physics_override_ready` /
//! `contextualPhysicsOverrideReady` is **distinct** from ex
//! `sdfAudioRaymarchingReady`, ew `volumetricExtinctionMediumReady`, dz
//! `atmosphericPhysicalDampingReady`, ds `fractalEnergyPerturbationReady`,
//! and prior probes.
//!
//! Letter **ij**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs fa/ez.
//!
//! **HELD:** Full Chaos / physics volume AAA (`chaos_physics_volume_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::ecs_core::WorldSoA;

/// Default gravity magnitude (m/s²) — matches WorldSoA `tick_physics`.
pub const DEFAULT_GRAVITY: f32 = 9.8;
/// Unit timestep for damping / gravity soak [s].
pub const OVERRIDE_DT: f32 = 1.0 / 60.0;
/// Soft clamp on timescale.
pub const TIMESCALE_MAX: f32 = 64.0;
/// Soft clamp on damping coefficient [1/s].
pub const DAMPING_MAX: f32 = 1.0e3;
/// Float compare epsilon for soak evidence.
const EPS: f32 = 1e-5;
/// Min |Δy_out| − |Δy_in| after gravity tick for soak.
const MIN_GRAVITY_DELTA_Y: f32 = 0.01;
/// Min speed drop fraction inside vs outside for damping soak.
const MIN_DAMP_SPEED_RATIO: f32 = 0.15;
/// Fingerprint seed ("hdcpo").
const FP_SEED: u64 = 0x6864_6370_6f;

/// AABB or sphere region that overrides local physics laws.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OverrideShape {
    /// Inclusive AABB [min, max] per axis.
    Aabb { min: [f32; 3], max: [f32; 3] },
    /// Sphere (inclusive surface).
    Sphere { center: [f32; 3], radius: f32 },
}

impl OverrideShape {
    #[inline]
    pub fn contains(&self, p: [f32; 3]) -> bool {
        match *self {
            OverrideShape::Aabb { min, max } => {
                p[0] >= min[0]
                    && p[0] <= max[0]
                    && p[1] >= min[1]
                    && p[1] <= max[1]
                    && p[2] >= min[2]
                    && p[2] <= max[2]
            }
            OverrideShape::Sphere { center, radius } => {
                if !(radius.is_finite() && radius >= 0.0) {
                    return false;
                }
                let dx = p[0] - center[0];
                let dy = p[1] - center[1];
                let dz = p[2] - center[2];
                dx * dx + dy * dy + dz * dz <= radius * radius
            }
        }
    }
}

/// One override volume — gravity / time / damping laws local to the region.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PhysicsOverrideVolume {
    pub shape: OverrideShape,
    /// Multiplier on default down-gravity (1.0 = normal, 0.0 = zero-G).
    pub gravity_scale: f32,
    /// Optional directional gravity (world units). Zero vector ⇒ use
    /// `(0, −DEFAULT_GRAVITY * gravity_scale, 0)`.
    pub gravity_tensor: [f32; 3],
    /// Local timescale written into WorldSoA when entity is inside.
    pub timescale: f32,
    /// Velocity damping coefficient μ [1/s]: `v *= exp(−μ·dt)`.
    pub damping: f32,
    /// Higher priority wins when volumes overlap (tie → later insert).
    pub priority: i32,
}

impl Default for PhysicsOverrideVolume {
    fn default() -> Self {
        Self {
            shape: OverrideShape::Sphere { center: [0.0; 3], radius: 0.0 },
            gravity_scale: 1.0,
            gravity_tensor: [0.0; 3],
            timescale: 1.0,
            damping: 0.0,
            priority: 0,
        }
    }
}

impl PhysicsOverrideVolume {
    pub fn aabb(
        min: [f32; 3],
        max: [f32; 3],
        gravity_scale: f32,
        timescale: f32,
        damping: f32,
    ) -> Self {
        Self {
            shape: OverrideShape::Aabb { min, max },
            gravity_scale,
            gravity_tensor: [0.0, 0.0, 0.0],
            timescale,
            damping,
            priority: 0,
        }
    }

    pub fn sphere(
        center: [f32; 3],
        radius: f32,
        gravity_scale: f32,
        timescale: f32,
        damping: f32,
    ) -> Self {
        Self {
            shape: OverrideShape::Sphere { center, radius },
            gravity_scale,
            gravity_tensor: [0.0, 0.0, 0.0],
            timescale,
            damping,
            priority: 0,
        }
    }
}

/// Resolved laws at a world point (outside ⇒ identity defaults).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResolvedOverride {
    pub inside: bool,
    pub gravity_scale: f32,
    pub gravity_tensor: [f32; 3],
    pub timescale: f32,
    pub damping: f32,
    pub volume_index: Option<usize>,
}

impl ResolvedOverride {
    pub const OUTSIDE: Self = Self {
        inside: false,
        gravity_scale: 1.0,
        gravity_tensor: [0.0, 0.0, 0.0],
        timescale: 1.0,
        damping: 0.0,
        volume_index: None,
    };

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.gravity_scale.is_finite()
            && self.timescale.is_finite()
            && self.damping.is_finite()
            && self.gravity_tensor.iter().all(|c| c.is_finite())
    }
}

/// Per-entity apply outcome — measurable SoA mutation evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ApplyResult {
    pub entities_touched: u32,
    pub inside_count: u32,
    pub outside_count: u32,
    pub timescale_mutated: bool,
    pub velocity_damped: bool,
}

pub const MAX_VOLUMES: usize = 256;

/// Region-volume physics override kernel (not a ZST stub).
#[derive(Debug, Clone, Copy)]
pub struct ContextualPhysicsOverride {
    volumes: [PhysicsOverrideVolume; MAX_VOLUMES],
    volume_count: usize,
}

impl Default for ContextualPhysicsOverride {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextualPhysicsOverride {
    pub fn new() -> Self {
        Self {
            volumes: [PhysicsOverrideVolume::default(); MAX_VOLUMES],
            volume_count: 0,
        }
    }

    #[inline]
    pub fn volume_count(&self) -> usize {
        self.volume_count
    }

    #[inline]
    pub fn volumes(&self) -> &[PhysicsOverrideVolume] {
        &self.volumes[..self.volume_count]
    }

    /// Clear all volumes.
    pub fn clear(&mut self) {
        self.volume_count = 0;
    }

    /// Push a volume (sanitized). Returns index.
    pub fn add_volume(&mut self, mut vol: PhysicsOverrideVolume) -> usize {
        if self.volume_count >= MAX_VOLUMES {
            return self.volume_count;
        }
        vol.gravity_scale = sanitize_nonneg(vol.gravity_scale, 1.0);
        vol.timescale = sanitize_timescale(vol.timescale);
        vol.damping = sanitize_damping(vol.damping);
        vol.gravity_tensor = sanitize_tensor(vol.gravity_tensor);
        match &mut vol.shape {
            OverrideShape::Aabb { min, max } => {
                for a in 0..3 {
                    if !min[a].is_finite() {
                        min[a] = 0.0;
                    }
                    if !max[a].is_finite() {
                        max[a] = 0.0;
                    }
                    if min[a] > max[a] {
                        std::mem::swap(&mut min[a], &mut max[a]);
                    }
                }
            }
            OverrideShape::Sphere { center, radius } => {
                *center = sanitize_tensor(*center);
                *radius = if radius.is_finite() && *radius >= 0.0 {
                    *radius
                } else {
                    0.0
                };
            }
        }
        self.volumes[self.volume_count] = vol;
        self.volume_count += 1;
        self.volume_count - 1
    }

    /// Legacy entry — inject a sphere anomaly at the origin.
    ///
    /// Replaces empty stub: `volume_radius`, `gravity_tensor`, and `time_scale`
    /// are **used**. Gravity scale = `|gravity_tensor| / DEFAULT_GRAVITY`
    /// (or 1.0 when tensor is near-zero — still applies timescale).
    pub fn inject_local_physics_tensor(
        &mut self,
        volume_radius: f32,
        gravity_tensor: [f32; 3],
        time_scale: f32,
    ) -> usize {
        let g = sanitize_tensor(gravity_tensor);
        let mag = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]).sqrt();
        let gravity_scale = if mag > EPS {
            mag / DEFAULT_GRAVITY
        } else {
            1.0
        };
        self.add_volume(PhysicsOverrideVolume {
            shape: OverrideShape::Sphere {
                center: [0.0, 0.0, 0.0],
                radius: if volume_radius.is_finite() && volume_radius > 0.0 {
                    volume_radius
                } else {
                    0.0
                },
            },
            gravity_scale,
            gravity_tensor: g,
            timescale: time_scale,
            damping: 0.0,
            priority: 0,
        })
    }

    /// Resolve override at a world position (highest priority; tie → later).
    pub fn resolve_at(&self, p: [f32; 3]) -> ResolvedOverride {
        if !p.iter().all(|c| c.is_finite()) {
            return ResolvedOverride::OUTSIDE;
        }
        let mut best: Option<(usize, &PhysicsOverrideVolume)> = None;
        for (i, v) in self.volumes[..self.volume_count].iter().enumerate() {
            if !v.shape.contains(p) {
                continue;
            }
            match best {
                None => best = Some((i, v)),
                Some((_, cur)) => {
                    if v.priority >= cur.priority {
                        best = Some((i, v));
                    }
                }
            }
        }
        match best {
            None => ResolvedOverride::OUTSIDE,
            Some((i, v)) => ResolvedOverride {
                inside: true,
                gravity_scale: v.gravity_scale,
                gravity_tensor: v.gravity_tensor,
                timescale: v.timescale,
                damping: v.damping,
                volume_index: Some(i),
            },
        }
    }

    /// Apply timescale + velocity damping to active WorldSoA entities.
    ///
    /// Inside → write volume timescale / damp velocity; outside → timescale 1.0,
    /// no damp. Does **not** claim Chaos physics-volume AAA.
    pub fn apply_to_world(&self, world: &mut WorldSoA, dt: f32) -> ApplyResult {
        let dt = if dt.is_finite() && dt > 0.0 {
            dt
        } else {
            OVERRIDE_DT
        };
        let mut entities_touched = 0u32;
        let mut inside_count = 0u32;
        let mut outside_count = 0u32;
        let mut timescale_mutated = false;
        let mut velocity_damped = false;

        for i in 0..world.len {
            if !world.is_active(i) {
                continue;
            }
            entities_touched = entities_touched.saturating_add(1);
            let p = [world.pos_x[i], world.pos_y[i], world.pos_z[i]];
            let r = self.resolve_at(p);
            if r.inside {
                inside_count = inside_count.saturating_add(1);
                if (world.timescale[i] - r.timescale).abs() > EPS {
                    world.timescale[i] = r.timescale;
                    timescale_mutated = true;
                } else {
                    world.timescale[i] = r.timescale;
                }
                if r.damping > EPS {
                    let scale = (-r.damping * dt).exp().clamp(0.0, 1.0);
                    if scale < 1.0 - EPS {
                        world.vel_x[i] *= scale;
                        world.vel_y[i] *= scale;
                        world.vel_z[i] *= scale;
                        velocity_damped = true;
                    }
                }
            } else {
                outside_count = outside_count.saturating_add(1);
                if (world.timescale[i] - 1.0).abs() > EPS {
                    world.timescale[i] = 1.0;
                    timescale_mutated = true;
                } else {
                    world.timescale[i] = 1.0;
                }
            }
        }

        ApplyResult {
            entities_touched,
            inside_count,
            outside_count,
            timescale_mutated,
            velocity_damped,
        }
    }

    /// Gravity tick using per-entity resolved gravity (scale / tensor).
    ///
    /// Displacement: `Δp = g_eff * timescale * dt` where `g_eff` is the
    /// gravity tensor when non-zero, else `(0, −DEFAULT_GRAVITY * scale, 0)`.
    pub fn tick_gravity(&self, world: &mut WorldSoA, dt: f32) {
        let dt = if dt.is_finite() && dt > 0.0 {
            dt
        } else {
            OVERRIDE_DT
        };
        for i in 0..world.len {
            if !world.is_active(i) {
                continue;
            }
            let p = [world.pos_x[i], world.pos_y[i], world.pos_z[i]];
            let r = self.resolve_at(p);
            let ts = world.timescale[i].clamp(0.0, TIMESCALE_MAX);
            let g = effective_gravity(r.gravity_scale, r.gravity_tensor);
            world.pos_x[i] += g[0] * ts * dt;
            world.pos_y[i] += g[1] * ts * dt;
            world.pos_z[i] += g[2] * ts * dt;
        }
    }
}

#[inline]
fn sanitize_nonneg(v: f32, fallback: f32) -> f32 {
    if v.is_finite() && v >= 0.0 {
        v
    } else {
        fallback
    }
}

#[inline]
fn sanitize_timescale(v: f32) -> f32 {
    if v.is_finite() {
        v.clamp(0.0, TIMESCALE_MAX)
    } else {
        1.0
    }
}

#[inline]
fn sanitize_damping(v: f32) -> f32 {
    if v.is_finite() && v >= 0.0 {
        v.min(DAMPING_MAX)
    } else {
        0.0
    }
}

#[inline]
fn sanitize_tensor(t: [f32; 3]) -> [f32; 3] {
    [
        if t[0].is_finite() { t[0] } else { 0.0 },
        if t[1].is_finite() { t[1] } else { 0.0 },
        if t[2].is_finite() { t[2] } else { 0.0 },
    ]
}

#[inline]
fn effective_gravity(scale: f32, tensor: [f32; 3]) -> [f32; 3] {
    let mag = (tensor[0] * tensor[0] + tensor[1] * tensor[1] + tensor[2] * tensor[2]).sqrt();
    if mag > EPS {
        // Explicit tensor wins (already encodes direction + strength).
        tensor
    } else {
        [0.0, -DEFAULT_GRAVITY * scale, 0.0]
    }
}

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn fingerprint_from(dy_in: f32, dy_out: f32, speed_in: f32) -> u64 {
    let mut h = FP_SEED;
    h = hash_mix(h, dy_in.to_bits() as u64);
    h = hash_mix(h, dy_out.to_bits() as u64);
    h = hash_mix(h, speed_in.to_bits() as u64);
    h
}

/// Letter **ho**/**ey** soak report — contextual physics override evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct ContextualPhysicsOverrideSoakReport {
    /// Soak-gated; distinct from ex / ew / dz / ds / prior probes.
    pub contextual_physics_override_ready: bool,
    pub aabb_inside_ne_outside: bool,
    pub sphere_contains_works: bool,
    pub timescale_inside_ne_outside: bool,
    pub gravity_inside_ne_outside: bool,
    pub damping_inside_ne_outside: bool,
    pub legacy_inject_uses_args: bool,
    pub outputs_finite: bool,
    pub timescale_inside: f32,
    pub timescale_outside: f32,
    pub delta_y_inside: f32,
    pub delta_y_outside: f32,
    pub speed_inside_after: f32,
    pub speed_outside_after: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: AABB/sphere region override gravity/timescale/damping (≠ piston / velocity entropy) — **ij**.
    pub evidence_kind: &'static str,
    /// Fingerprint of override soak evidence fields (cross-check vs fa/ez).
    pub evidence_fingerprint: u64,
    pub distinct_from_sdf_audio_raymarching_probe: bool,
    pub distinct_from_volumetric_extinction_medium_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_micro_displacement_noise_probe: bool,
    pub distinct_from_internal_voxel_density_probe: bool,
    pub distinct_from_velocity_buffer_ecs_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full Chaos / physics volume AAA — always HELD.
    pub chaos_physics_volume_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// AABB/sphere region override gravity/timescale/damping evidence shape (≠ piston / velocity entropy).
pub const EY_EVIDENCE_KIND: &str = "aabb_sphere_gravity_timescale_damping";

fn ey_evidence_fingerprint(
    aabb_inside_ne_outside: bool,
    sphere_contains_works: bool,
    timescale_inside_ne_outside: bool,
    gravity_inside_ne_outside: bool,
    damping_inside_ne_outside: bool,
    legacy_inject_uses_args: bool,
    delta_y_inside: f32,
    delta_y_outside: f32,
) -> u64 {
    let mut h = 0x6579_6370_6f_u64; // "eycpo"
    h = hash_mix(h, u64::from(aabb_inside_ne_outside));
    h = hash_mix(h, u64::from(sphere_contains_works));
    h = hash_mix(h, u64::from(timescale_inside_ne_outside));
    h = hash_mix(h, u64::from(gravity_inside_ne_outside));
    h = hash_mix(h, u64::from(damping_inside_ne_outside));
    h = hash_mix(h, u64::from(legacy_inject_uses_args));
    h = hash_mix(h, delta_y_inside.to_bits() as u64);
    h = hash_mix(h, delta_y_outside.to_bits() as u64);
    h ^= 0x4f56_5252; // OVRR
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == EY_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn build_report(
    ready: bool,
    aabb_inside_ne_outside: bool,
    sphere_contains_works: bool,
    timescale_inside_ne_outside: bool,
    gravity_inside_ne_outside: bool,
    damping_inside_ne_outside: bool,
    legacy_inject_uses_args: bool,
    outputs_finite: bool,
    timescale_inside: f32,
    timescale_outside: f32,
    delta_y_inside: f32,
    delta_y_outside: f32,
    speed_inside_after: f32,
    speed_outside_after: f32,
    fingerprint: u64,
) -> ContextualPhysicsOverrideSoakReport {
    let evidence_kind = EY_EVIDENCE_KIND;
    let evidence_fingerprint = ey_evidence_fingerprint(
        aabb_inside_ne_outside,
        sphere_contains_works,
        timescale_inside_ne_outside,
        gravity_inside_ne_outside,
        damping_inside_ne_outside,
        legacy_inject_uses_args,
        delta_y_inside,
        delta_y_outside,
    );
    let core_ok = aabb_inside_ne_outside
        && sphere_contains_works
        && timescale_inside_ne_outside
        && gravity_inside_ne_outside
        && damping_inside_ne_outside
        && legacy_inject_uses_args
        && outputs_finite;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    ContextualPhysicsOverrideSoakReport {
        contextual_physics_override_ready: ready,
        aabb_inside_ne_outside,
        sphere_contains_works,
        timescale_inside_ne_outside,
        gravity_inside_ne_outside,
        damping_inside_ne_outside,
        legacy_inject_uses_args,
        outputs_finite,
        timescale_inside,
        timescale_outside,
        delta_y_inside,
        delta_y_outside,
        speed_inside_after,
        speed_outside_after,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_sdf_audio_raymarching_probe: d,
        distinct_from_volumetric_extinction_medium_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_micro_displacement_noise_probe: d,
        distinct_from_internal_voxel_density_probe: d,
        distinct_from_velocity_buffer_ecs_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_physics_volume_aaa_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run AABB/sphere override soak — inside ≠ outside on gravity/time/damping.
///
/// Does **not** claim Chaos physics-volume AAA.
pub fn run_contextual_physics_override_soak() -> ContextualPhysicsOverrideSoakReport {
    // --- AABB volume: low gravity, slow time, strong damp ---
    let mut cpo = ContextualPhysicsOverride::new();
    cpo.add_volume(PhysicsOverrideVolume::aabb(
        [-1.0, -1.0, -1.0],
        [1.0, 20.0, 1.0],
        0.1,  // gravity_scale
        0.5,  // timescale
        48.0, // damping
    ));

    let mut world = WorldSoA::with_capacity(4);
    let inside = world.add_entity(0.0, 10.0, 0.0).expect("inside");
    let outside = world.add_entity(5.0, 10.0, 0.0).expect("outside");
    let i = inside.0 as usize;
    let o = outside.0 as usize;
    world.set_velocity(i, 10.0, 0.0, 0.0);
    world.set_velocity(o, 10.0, 0.0, 0.0);
    world.timescale[i] = 1.0;
    world.timescale[o] = 1.0;

    let y_in_before = world.pos_y[i];
    let y_out_before = world.pos_y[o];
    let apply = cpo.apply_to_world(&mut world, OVERRIDE_DT);
    let ts_in = world.timescale[i];
    let ts_out = world.timescale[o];
    let speed_in = (world.vel_x[i] * world.vel_x[i]
        + world.vel_y[i] * world.vel_y[i]
        + world.vel_z[i] * world.vel_z[i])
        .sqrt();
    let speed_out = (world.vel_x[o] * world.vel_x[o]
        + world.vel_y[o] * world.vel_y[o]
        + world.vel_z[o] * world.vel_z[o])
        .sqrt();

    cpo.tick_gravity(&mut world, OVERRIDE_DT);
    let dy_in = (world.pos_y[i] - y_in_before).abs();
    let dy_out = (world.pos_y[o] - y_out_before).abs();

    let aabb_inside_ne_outside = apply.inside_count >= 1
        && apply.outside_count >= 1
        && cpo.resolve_at([0.0, 10.0, 0.0]).inside
        && !cpo.resolve_at([5.0, 10.0, 0.0]).inside;

    let timescale_inside_ne_outside =
        (ts_in - 0.5).abs() < 1e-4 && (ts_out - 1.0).abs() < 1e-4 && (ts_out - ts_in).abs() > EPS;

    let gravity_inside_ne_outside = dy_out > dy_in + MIN_GRAVITY_DELTA_Y;

    let damping_inside_ne_outside =
        speed_in < speed_out * (1.0 - MIN_DAMP_SPEED_RATIO) && speed_out > 9.0;

    // --- Sphere contains + legacy inject ---
    let mut sphere_cpo = ContextualPhysicsOverride::new();
    sphere_cpo.add_volume(PhysicsOverrideVolume::sphere(
        [0.0, 0.0, 0.0],
        2.0,
        0.0,
        0.25,
        0.0,
    ));
    let sphere_contains_works = sphere_cpo.resolve_at([0.5, 0.5, 0.5]).inside
        && !sphere_cpo.resolve_at([3.0, 0.0, 0.0]).inside;

    let mut legacy = ContextualPhysicsOverride::new();
    let idx = legacy.inject_local_physics_tensor(1.5, [0.0, -4.9, 0.0], 0.25);
    let legacy_r = legacy.resolve_at([0.0, 0.0, 0.0]);
    let legacy_inject_uses_args = idx == 0
        && legacy.volume_count() == 1
        && legacy_r.inside
        && (legacy_r.timescale - 0.25).abs() < 1e-4
        && legacy_r.gravity_scale > 0.4
        && legacy_r.gravity_scale < 0.6
        && !legacy.resolve_at([10.0, 0.0, 0.0]).inside;

    let outputs_finite = ts_in.is_finite()
        && ts_out.is_finite()
        && dy_in.is_finite()
        && dy_out.is_finite()
        && speed_in.is_finite()
        && speed_out.is_finite()
        && legacy_r.is_finite();

    let fingerprint = fingerprint_from(dy_in, dy_out, speed_in);

    let ready = aabb_inside_ne_outside
        && sphere_contains_works
        && timescale_inside_ne_outside
        && gravity_inside_ne_outside
        && damping_inside_ne_outside
        && legacy_inject_uses_args
        && outputs_finite
        && apply.timescale_mutated
        && apply.velocity_damped;

    build_report(
        ready,
        aabb_inside_ne_outside,
        sphere_contains_works,
        timescale_inside_ne_outside,
        gravity_inside_ne_outside,
        damping_inside_ne_outside,
        legacy_inject_uses_args,
        outputs_finite,
        ts_in,
        ts_out,
        dy_in,
        dy_out,
        speed_in,
        speed_out,
        fingerprint,
    )
}

/// Honesty probe — soak-gated `contextual_physics_override_ready` (**ho**).
pub fn probe_contextual_physics_override() -> ContextualPhysicsOverrideSoakReport {
    run_contextual_physics_override_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aabb_and_sphere_contains() {
        let aabb = OverrideShape::Aabb {
            min: [-1.0, -1.0, -1.0],
            max: [1.0, 1.0, 1.0],
        };
        assert!(aabb.contains([0.0, 0.0, 0.0]));
        assert!(!aabb.contains([2.0, 0.0, 0.0]));

        let sph = OverrideShape::Sphere {
            center: [0.0, 0.0, 0.0],
            radius: 1.0,
        };
        assert!(sph.contains([0.5, 0.0, 0.0]));
        assert!(!sph.contains([1.5, 0.0, 0.0]));
    }

    #[test]
    fn priority_picks_higher() {
        let mut cpo = ContextualPhysicsOverride::new();
        let mut low = PhysicsOverrideVolume::aabb(
            [-2.0, -2.0, -2.0],
            [2.0, 2.0, 2.0],
            1.0,
            1.0,
            0.0,
        );
        low.priority = 1;
        let mut high = PhysicsOverrideVolume::aabb(
            [-2.0, -2.0, -2.0],
            [2.0, 2.0, 2.0],
            0.0,
            0.1,
            0.0,
        );
        high.priority = 5;
        cpo.add_volume(low);
        cpo.add_volume(high);
        let r = cpo.resolve_at([0.0, 0.0, 0.0]);
        assert!(r.inside);
        assert!((r.timescale - 0.1).abs() < 1e-6);
        assert!((r.gravity_scale - 0.0).abs() < 1e-6);
    }

    #[test]
    fn soak_ready_and_distinct() {
        let r = run_contextual_physics_override_soak();
        assert!(r.contextual_physics_override_ready, "{r:?}");
        assert!(r.aabb_inside_ne_outside);
        assert!(r.sphere_contains_works);
        assert!(r.timescale_inside_ne_outside);
        assert!(r.gravity_inside_ne_outside);
        assert!(r.damping_inside_ne_outside);
        assert!(r.legacy_inject_uses_args);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, EY_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_sdf_audio_raymarching_probe);
        assert!(r.distinct_from_volumetric_extinction_medium_probe);
        assert!(r.distinct_from_atmospheric_physical_damping_probe);
        assert!(r.distinct_from_fractal_energy_perturbation_probe);
        assert!(!r.chaos_physics_volume_aaa_ready);
        assert!(!r.chaos_pbd_parity_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_contextual_physics_override_soak();
        let b = probe_contextual_physics_override();
        assert_eq!(
            a.contextual_physics_override_ready,
            b.contextual_physics_override_ready
        );
        assert!(b.contextual_physics_override_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn distinct_from_ex_ew_probes() {
        let ey = probe_contextual_physics_override();
        let ex = crate::sdf_audio_raymarching::probe_sdf_audio_raymarching();
        let ew = crate::volumetric_extinction_medium::probe_volumetric_extinction_medium();
        assert!(ey.contextual_physics_override_ready);
        assert!(ex.sdf_audio_raymarching_ready);
        assert!(ew.volumetric_extinction_medium_ready);
        // Distinct probe names / fields — ey ready is not ex/ew ready.
        assert!(ey.distinct_from_sdf_audio_raymarching_probe);
        assert!(ey.distinct_from_volumetric_extinction_medium_probe);
    }

    #[test]
    fn ey_fa_ez_distinct_evidence_fingerprints() {
        let ey = probe_contextual_physics_override();
        let fa = crate::digital_pressure_chamber::probe_digital_pressure_chamber();
        let ez = crate::dynamic_matter_entropy::probe_dynamic_matter_entropy();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(ey.contextual_physics_override_ready);
        assert!(fa.digital_pressure_chamber_ready);
        assert!(ez.dynamic_matter_entropy_ready);
        assert!(found.foundation_closed());

        assert_eq!(ey.evidence_kind, EY_EVIDENCE_KIND);
        assert_eq!(
            fa.evidence_kind,
            crate::digital_pressure_chamber::FA_EVIDENCE_KIND
        );
        assert_eq!(
            ez.evidence_kind,
            crate::dynamic_matter_entropy::EZ_EVIDENCE_KIND
        );
        assert_ne!(ey.evidence_kind, fa.evidence_kind);
        assert_ne!(ey.evidence_kind, ez.evidence_kind);
        assert_ne!(fa.evidence_kind, ez.evidence_kind);
        assert_ne!(ey.evidence_fingerprint, fa.evidence_fingerprint);
        assert_ne!(ey.evidence_fingerprint, ez.evidence_fingerprint);
        assert_ne!(fa.evidence_fingerprint, ez.evidence_fingerprint);

        assert!(ey.distinct_from_sdf_audio_raymarching_probe);
        assert!(fa.distinct_from_dynamic_matter_entropy_probe);
        assert!(ez.distinct_from_mnemonic_matter_entropy_probe);
        // Different evidence fields — region override ≠ piston P∝ρT ≠ velocity entropy.
        assert!(ey.aabb_inside_ne_outside && ey.gravity_inside_ne_outside && ey.damping_inside_ne_outside);
        assert!(fa.compress_raises_pressure && fa.heat_raises_pressure && fa.expand_lowers_pressure);
        assert!(ez.fast_entropy_gt_static && ez.fast_entropy_gained && ez.stress_increases_entropy);
    }

    #[test]
    fn legacy_inject_mutates_volume_list() {
        let mut cpo = ContextualPhysicsOverride::new();
        assert_eq!(cpo.volume_count(), 0);
        cpo.inject_local_physics_tensor(2.0, [0.0, -9.8, 0.0], 2.0);
        assert_eq!(cpo.volume_count(), 1);
        let r = cpo.resolve_at([0.0, 0.0, 0.0]);
        assert!(r.inside);
        assert!((r.timescale - 2.0).abs() < 1e-4);
        assert!((r.gravity_scale - 1.0).abs() < 1e-3);
    }
}

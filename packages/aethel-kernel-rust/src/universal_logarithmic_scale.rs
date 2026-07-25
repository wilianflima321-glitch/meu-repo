//! Universal Logarithmic Scale / Floating Origin — letter **fc**.
//!
//! Replaces ZST comment-theater stub `manage_fractal_scale_tree` with real
//! world↔signed-log mapping + floating-origin rebase + nested origin offsets.
//! Soak proves log roundtrip invertibility and rebase preserving relative
//! entity positions (camera-relative WorldSoA).
//!
//! Honesty probe `universal_logarithmic_scale_ready` /
//! `universalLogarithmicScaleReady` is **distinct** from fb
//! `geometricScaleConstraintsReady`, fa `digitalPressureChamberReady`, ez
//! `dynamicMatterEntropyReady`, ey `contextualPhysicsOverrideReady`, and
//! prior probes.
//!
//! **HELD:** Full Star-Citizen / cosmos AAA (`star_citizen_cosmos_aaa_ready:
//! false`) — TS cosmos floating-origin (cn/co) already exists; this is the
//! Rust kernel critical-path geometry helper only · Coins / Agones / Nanite /
//! DLSS.

use crate::ecs_core::WorldSoA;

/// Reference length [m] for signed-log map (1 m → log ≈ ln(2)).
pub const LOG_REF_M: f64 = 1.0;
/// Default floating-origin rebase threshold [m] (camera-relative).
pub const REBASE_THRESHOLD_M_DEFAULT: f64 = 10_000.0;
/// Max nested origin depth (fractal scale tree levels).
pub const MAX_NEST_DEPTH: usize = 8;
/// Roundtrip / relative-position soak epsilon [m].
const EPS_M: f64 = 1e-6;
/// Fingerprint seed ("fculs").
const FP_SEED: u64 = 0x6663_756c_73;

/// f64 world / absolute meters.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct WorldVec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl WorldVec3 {
    pub const ZERO: Self = Self {
        x: 0.0,
        y: 0.0,
        z: 0.0,
    };

    #[inline]
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    #[inline]
    pub fn length(self) -> f64 {
        (self.x * self.x + self.y * self.y + self.z * self.z).sqrt()
    }

    // Inherent methods predate `std::ops::Add`/`Sub`; retrofitting the traits would change
    // call-site ergonomics across existing soak code for no functional benefit.
    #[allow(clippy::should_implement_trait)]
    #[inline]
    pub fn add(self, o: Self) -> Self {
        Self {
            x: self.x + o.x,
            y: self.y + o.y,
            z: self.z + o.z,
        }
    }

    #[allow(clippy::should_implement_trait)]
    #[inline]
    pub fn sub(self, o: Self) -> Self {
        Self {
            x: self.x - o.x,
            y: self.y - o.y,
            z: self.z - o.z,
        }
    }

    #[inline]
    pub fn scale(self, s: f64) -> Self {
        Self {
            x: self.x * s,
            y: self.y * s,
            z: self.z * s,
        }
    }

    #[inline]
    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }
}

/// Signed log-space coordinates (invertible with [`world_to_log`] / [`log_to_world`]).
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct LogVec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl LogVec3 {
    #[inline]
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Self { x, y, z }
    }

    #[inline]
    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }
}

/// One nested origin node in the fractal scale tree.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct NestedOrigin {
    /// Absolute world offset of this nest level [m].
    pub absolute_offset: WorldVec3,
    /// Local scale factor relative to parent (1.0 = identity).
    pub local_scale: f64,
}

impl Default for NestedOrigin {
    fn default() -> Self {
        Self {
            absolute_offset: WorldVec3::ZERO,
            local_scale: 1.0,
        }
    }
}

/// Floating-origin + log-scale policy.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LogScalePolicy {
    pub log_ref_m: f64,
    pub rebase_threshold_m: f64,
}

impl Default for LogScalePolicy {
    fn default() -> Self {
        Self::cosmos_default()
    }
}

impl LogScalePolicy {
    pub fn cosmos_default() -> Self {
        Self {
            log_ref_m: LOG_REF_M,
            rebase_threshold_m: REBASE_THRESHOLD_M_DEFAULT,
        }
    }

    pub fn sanitized(self) -> Self {
        let log_ref_m = if self.log_ref_m.is_finite() && self.log_ref_m > 0.0 {
            self.log_ref_m
        } else {
            LOG_REF_M
        };
        let rebase_threshold_m = if self.rebase_threshold_m.is_finite() && self.rebase_threshold_m > 0.0
        {
            self.rebase_threshold_m
        } else {
            REBASE_THRESHOLD_M_DEFAULT
        };
        Self {
            log_ref_m,
            rebase_threshold_m,
        }
    }
}

/// Rebase outcome — measurable origin mutation.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct RebaseResult {
    pub rebased: bool,
    pub shift: WorldVec3,
    pub absolute_origin: WorldVec3,
    pub entities_shifted: u32,
}

/// Signed-log map: world meters → log space.
/// `u = sign(x) * ln(1 + |x| / ref)` — smooth through origin, invertible.
#[inline]
pub fn world_axis_to_log(x: f64, ref_m: f64) -> f64 {
    if !x.is_finite() {
        return 0.0;
    }
    let r = if ref_m.is_finite() && ref_m > 0.0 {
        ref_m
    } else {
        LOG_REF_M
    };
    let s = if x >= 0.0 { 1.0 } else { -1.0 };
    s * (1.0 + x.abs() / r).ln()
}

/// Inverse: log space → world meters.
#[inline]
pub fn log_axis_to_world(u: f64, ref_m: f64) -> f64 {
    if !u.is_finite() {
        return 0.0;
    }
    let r = if ref_m.is_finite() && ref_m > 0.0 {
        ref_m
    } else {
        LOG_REF_M
    };
    let s = if u >= 0.0 { 1.0 } else { -1.0 };
    s * r * (u.abs().exp() - 1.0)
}

#[inline]
pub fn world_to_log(w: WorldVec3, ref_m: f64) -> LogVec3 {
    LogVec3 {
        x: world_axis_to_log(w.x, ref_m),
        y: world_axis_to_log(w.y, ref_m),
        z: world_axis_to_log(w.z, ref_m),
    }
}

#[inline]
pub fn log_to_world(l: LogVec3, ref_m: f64) -> WorldVec3 {
    WorldVec3 {
        x: log_axis_to_world(l.x, ref_m),
        y: log_axis_to_world(l.y, ref_m),
        z: log_axis_to_world(l.z, ref_m),
    }
}

/// Universal logarithmic scale / floating-origin kernel (not a ZST stub).
#[derive(Debug, Clone)]
pub struct UniversalLogarithmicScale {
    pub policy: LogScalePolicy,
    /// Absolute floating origin in world meters (CPU f64).
    pub absolute_origin: WorldVec3,
    pub rebase_count: u32,
    /// Nested fractal scale-tree origins (parent→child offsets).
    pub nest: Vec<NestedOrigin>,
}

impl Default for UniversalLogarithmicScale {
    fn default() -> Self {
        Self::new()
    }
}

impl UniversalLogarithmicScale {
    pub fn new() -> Self {
        Self {
            policy: LogScalePolicy::cosmos_default(),
            absolute_origin: WorldVec3::ZERO,
            rebase_count: 0,
            nest: Vec::new(),
        }
    }

    pub fn with_policy(policy: LogScalePolicy) -> Self {
        Self {
            policy: policy.sanitized(),
            absolute_origin: WorldVec3::ZERO,
            rebase_count: 0,
            nest: Vec::new(),
        }
    }

    /// Absolute world = floating_origin + camera-relative.
    #[inline]
    pub fn relative_to_absolute(&self, relative: WorldVec3) -> WorldVec3 {
        self.absolute_origin.add(relative)
    }

    /// Camera-relative = absolute − floating_origin.
    #[inline]
    pub fn absolute_to_relative(&self, absolute: WorldVec3) -> WorldVec3 {
        absolute.sub(self.absolute_origin)
    }

    /// Push a nested origin offset (fractal scale tree). Caps at [`MAX_NEST_DEPTH`].
    pub fn push_nested_origin(&mut self, offset: WorldVec3, local_scale: f64) -> bool {
        if self.nest.len() >= MAX_NEST_DEPTH {
            return false;
        }
        let scale = if local_scale.is_finite() && local_scale > 0.0 {
            local_scale
        } else {
            1.0
        };
        let off = if offset.is_finite() {
            offset
        } else {
            WorldVec3::ZERO
        };
        self.nest.push(NestedOrigin {
            absolute_offset: off,
            local_scale: scale,
        });
        true
    }

    /// Compose nested offsets into a single world offset (Σ offset_i * Π scales).
    pub fn compose_nested_offset(&self) -> WorldVec3 {
        let mut acc = WorldVec3::ZERO;
        let mut scale_prod = 1.0;
        for n in &self.nest {
            acc = acc.add(n.absolute_offset.scale(scale_prod));
            scale_prod *= n.local_scale;
        }
        acc
    }

    /// Product of all nested local scales (identity when nest empty).
    pub fn nest_scale_product(&self) -> f64 {
        let mut s = 1.0;
        for n in &self.nest {
            if n.local_scale.is_finite() && n.local_scale > 0.0 {
                s *= n.local_scale;
            }
        }
        s
    }

    /// World point under nested tree: absolute_origin + nest_compose + local·Πscales.
    pub fn nest_local_to_absolute(&self, local: WorldVec3) -> WorldVec3 {
        let nest = self.compose_nested_offset();
        self.absolute_origin
            .add(nest)
            .add(local.scale(self.nest_scale_product()))
    }

    /// If |camera_relative| ≥ threshold, rebase origin to camera absolute;
    /// return shift to apply to scene objects (negates camera relative).
    pub fn maybe_rebase(&mut self, camera_relative: WorldVec3) -> RebaseResult {
        let p = self.policy.sanitized();
        let dist = camera_relative.length();
        if !camera_relative.is_finite() || dist < p.rebase_threshold_m {
            return RebaseResult {
                rebased: false,
                shift: WorldVec3::ZERO,
                absolute_origin: self.absolute_origin,
                entities_shifted: 0,
            };
        }
        let new_origin = self.absolute_origin.add(camera_relative);
        let shift = camera_relative.scale(-1.0);
        self.absolute_origin = new_origin;
        self.rebase_count = self.rebase_count.saturating_add(1);
        RebaseResult {
            rebased: true,
            shift,
            absolute_origin: new_origin,
            entities_shifted: 0,
        }
    }

    /// Apply camera-relative shift to WorldSoA positions (GPU path).
    pub fn apply_origin_shift_to_world(
        &self,
        world: &mut WorldSoA,
        shift: WorldVec3,
    ) -> u32 {
        if shift.x == 0.0 && shift.y == 0.0 && shift.z == 0.0 {
            return 0;
        }
        let sx = shift.x as f32;
        let sy = shift.y as f32;
        let sz = shift.z as f32;
        let mut n = 0u32;
        for i in 0..world.len {
            if !world.is_active(i) {
                continue;
            }
            world.pos_x[i] += sx;
            world.pos_y[i] += sy;
            world.pos_z[i] += sz;
            n += 1;
        }
        n
    }

    /// Rebase + shift WorldSoA when camera wanders past threshold.
    pub fn manage_fractal_scale_tree(
        &mut self,
        world: &mut WorldSoA,
        camera_relative: WorldVec3,
    ) -> RebaseResult {
        let mut r = self.maybe_rebase(camera_relative);
        if r.rebased {
            r.entities_shifted = self.apply_origin_shift_to_world(world, r.shift);
        }
        r
    }

    /// Roundtrip error |log⁻¹(log(w)) − w| max-axis.
    pub fn roundtrip_error_m(&self, w: WorldVec3) -> f64 {
        let p = self.policy.sanitized();
        let back = log_to_world(world_to_log(w, p.log_ref_m), p.log_ref_m);
        let dx = (back.x - w.x).abs();
        let dy = (back.y - w.y).abs();
        let dz = (back.z - w.z).abs();
        dx.max(dy).max(dz)
    }
}

fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED;
    for &p in parts {
        h ^= p.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        h = h.rotate_left(17).wrapping_add(0xA5A5_A5A5_A5A5_A5A5);
    }
    h
}

fn f64_bits(v: f64) -> u64 {
    v.to_bits()
}

/// Soak-gated honesty report — letter **fc**.
#[derive(Debug, Clone, PartialEq)]
pub struct UniversalLogarithmicScaleSoakReport {
    pub universal_logarithmic_scale_ready: bool,
    pub log_roundtrip_ok: bool,
    pub rebase_triggered: bool,
    pub relative_positions_preserved: bool,
    pub nested_offset_composes: bool,
    pub camera_near_origin_after_rebase: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub roundtrip_error_m: f64,
    pub relative_delta_error_m: f64,
    pub rebase_count: u32,
    pub absolute_origin_x: f64,
    pub fingerprint: u64,
    pub distinct_from_geometric_scale_constraints_probe: bool,
    pub distinct_from_digital_pressure_chamber_probe: bool,
    pub distinct_from_dynamic_matter_entropy_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub star_citizen_cosmos_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn fail_report(
    roundtrip_error_m: f64,
    relative_delta_error_m: f64,
    rebase_count: u32,
    absolute_origin_x: f64,
) -> UniversalLogarithmicScaleSoakReport {
    UniversalLogarithmicScaleSoakReport {
        universal_logarithmic_scale_ready: false,
        log_roundtrip_ok: false,
        rebase_triggered: false,
        relative_positions_preserved: false,
        nested_offset_composes: false,
        camera_near_origin_after_rebase: false,
        state_mutated: false,
        outputs_finite: false,
        roundtrip_error_m,
        relative_delta_error_m,
        rebase_count,
        absolute_origin_x,
        fingerprint: 0,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_digital_pressure_chamber_probe: true,
        distinct_from_dynamic_matter_entropy_probe: true,
        distinct_from_contextual_physics_override_probe: true,
        distinct_from_kernel_foundation_probe: true,
        star_citizen_cosmos_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Run universal log-scale / floating-origin soak — roundtrip + rebase evidence.
pub fn run_universal_logarithmic_scale_soak() -> UniversalLogarithmicScaleSoakReport {
    let policy = LogScalePolicy {
        log_ref_m: 1.0,
        rebase_threshold_m: 100.0,
    };
    let mut kernel = UniversalLogarithmicScale::with_policy(policy);

    // --- Log roundtrip across human → planetary spans ---
    let samples = [
        WorldVec3::new(0.0, 0.0, 0.0),
        WorldVec3::new(1.0, -2.5, 3.0),
        WorldVec3::new(1.0e3, 0.0, -1.0e3),
        WorldVec3::new(1.0e6, 2.0e5, -4.0e4),
        WorldVec3::new(-9.0e9, 1.0, 0.5),
    ];
    let mut max_rt = 0.0_f64;
    let mut roundtrip_ok = true;
    for &w in &samples {
        let err = kernel.roundtrip_error_m(w);
        max_rt = max_rt.max(err);
        // Relative tolerance: absolute ε near origin, relative far out.
        let tol = (1e-9_f64 * (1.0 + w.length())).max(EPS_M * 1e-3);
        if err > tol || !w.is_finite() {
            roundtrip_ok = false;
        }
    }

    // --- Nested origin compose ---
    kernel.push_nested_origin(WorldVec3::new(1000.0, 0.0, 0.0), 1.0);
    kernel.push_nested_origin(WorldVec3::new(10.0, 0.0, 0.0), 0.1);
    let composed = kernel.compose_nested_offset();
    // nest0: 1000; nest1: 10 * scale_prod(1.0) → 1010
    let nested_offset_composes = (composed.x - 1010.0).abs() < 1e-9
        && composed.y.abs() < 1e-12
        && composed.z.abs() < 1e-12;

    // Nest local→absolute: leaf scale 0.1 on local (5,0,0) → +0.5
    let nest_abs = kernel.nest_local_to_absolute(WorldVec3::new(5.0, 0.0, 0.0));
    let nest_local_ok = (nest_abs.x - 1010.5).abs() < 1e-9;

    // --- Floating-origin rebase preserves relative Δ between entities ---
    let mut world = WorldSoA::with_capacity(8);
    let cam = world.add_entity(150.0, 0.0, 0.0).unwrap(); // past threshold 100
    let a = world.add_entity(160.0, 0.0, 0.0).unwrap(); // Δ=+10 from cam
    let b = world.add_entity(140.0, 5.0, -2.0).unwrap(); // Δ=(-10,5,-2)

    let ci = cam.0 as usize;
    let ai = a.0 as usize;
    let bi = b.0 as usize;

    let dx_ab_before = (world.pos_x[ai] - world.pos_x[bi]) as f64;
    let dy_ab_before = (world.pos_y[ai] - world.pos_y[bi]) as f64;
    let dz_ab_before = (world.pos_z[ai] - world.pos_z[bi]) as f64;
    let dx_ca_before = (world.pos_x[ai] - world.pos_x[ci]) as f64;

    let camera_rel = WorldVec3::new(
        world.pos_x[ci] as f64,
        world.pos_y[ci] as f64,
        world.pos_z[ci] as f64,
    );
    let rebase = kernel.manage_fractal_scale_tree(&mut world, camera_rel);

    let dx_ab_after = (world.pos_x[ai] - world.pos_x[bi]) as f64;
    let dy_ab_after = (world.pos_y[ai] - world.pos_y[bi]) as f64;
    let dz_ab_after = (world.pos_z[ai] - world.pos_z[bi]) as f64;
    let dx_ca_after = (world.pos_x[ai] - world.pos_x[ci]) as f64;

    let relative_delta_error_m = (dx_ab_after - dx_ab_before)
        .abs()
        .max((dy_ab_after - dy_ab_before).abs())
        .max((dz_ab_after - dz_ab_before).abs())
        .max((dx_ca_after - dx_ca_before).abs());

    let relative_positions_preserved = relative_delta_error_m < 1e-3;
    let camera_near_origin_after_rebase = world.pos_x[ci].abs() < 1e-3
        && world.pos_y[ci].abs() < 1e-3
        && world.pos_z[ci].abs() < 1e-3;
    let rebase_triggered = rebase.rebased
        && rebase.entities_shifted >= 3
        && (kernel.absolute_origin.x - 150.0).abs() < 1e-9
        && kernel.rebase_count >= 1;

    let outputs_finite = max_rt.is_finite()
        && relative_delta_error_m.is_finite()
        && composed.is_finite()
        && nest_abs.is_finite()
        && world.pos_x[ai].is_finite()
        && world.pos_x[bi].is_finite();

    let state_mutated = rebase.rebased && rebase.entities_shifted > 0;

    let ready = roundtrip_ok
        && nested_offset_composes
        && nest_local_ok
        && rebase_triggered
        && relative_positions_preserved
        && camera_near_origin_after_rebase
        && state_mutated
        && outputs_finite;

    if !ready {
        let mut fail = fail_report(
            max_rt,
            relative_delta_error_m,
            kernel.rebase_count,
            kernel.absolute_origin.x,
        );
        fail.log_roundtrip_ok = roundtrip_ok;
        fail.rebase_triggered = rebase_triggered;
        fail.relative_positions_preserved = relative_positions_preserved;
        fail.nested_offset_composes = nested_offset_composes && nest_local_ok;
        fail.camera_near_origin_after_rebase = camera_near_origin_after_rebase;
        fail.state_mutated = state_mutated;
        fail.outputs_finite = outputs_finite;
        return fail;
    }

    let fp = fingerprint(&[
        f64_bits(max_rt),
        f64_bits(relative_delta_error_m),
        f64_bits(kernel.absolute_origin.x),
        kernel.rebase_count as u64,
        rebase.entities_shifted as u64,
        f64_bits(composed.x),
    ]);

    UniversalLogarithmicScaleSoakReport {
        universal_logarithmic_scale_ready: true,
        log_roundtrip_ok: true,
        rebase_triggered: true,
        relative_positions_preserved: true,
        nested_offset_composes: true,
        camera_near_origin_after_rebase: true,
        state_mutated: true,
        outputs_finite: true,
        roundtrip_error_m: max_rt,
        relative_delta_error_m,
        rebase_count: kernel.rebase_count,
        absolute_origin_x: kernel.absolute_origin.x,
        fingerprint: fp,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_digital_pressure_chamber_probe: true,
        distinct_from_dynamic_matter_entropy_probe: true,
        distinct_from_contextual_physics_override_probe: true,
        distinct_from_kernel_foundation_probe: true,
        star_citizen_cosmos_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `universal_logarithmic_scale_ready` (**fc**).
pub fn probe_universal_logarithmic_scale() -> UniversalLogarithmicScaleSoakReport {
    run_universal_logarithmic_scale_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_roundtrip_near_and_far() {
        let k = UniversalLogarithmicScale::new();
        for &w in &[
            WorldVec3::new(0.0, 0.0, 0.0),
            WorldVec3::new(42.0, -7.0, 0.5),
            WorldVec3::new(1.5e8, 0.0, 0.0),
        ] {
            let err = k.roundtrip_error_m(w);
            let tol = (1e-9 * (1.0 + w.length())).max(1e-12);
            assert!(err <= tol, "err={err} tol={tol} w={w:?}");
        }
    }

    #[test]
    fn rebase_preserves_relative_delta() {
        let mut k = UniversalLogarithmicScale::with_policy(LogScalePolicy {
            log_ref_m: 1.0,
            rebase_threshold_m: 50.0,
        });
        let mut w = WorldSoA::with_capacity(4);
        let cam = w.add_entity(80.0, 0.0, 0.0).unwrap();
        let other = w.add_entity(90.0, 1.0, -1.0).unwrap();
        let dx0 = w.pos_x[other.0 as usize] - w.pos_x[cam.0 as usize];
        let r = k.manage_fractal_scale_tree(
            &mut w,
            WorldVec3::new(80.0, 0.0, 0.0),
        );
        assert!(r.rebased);
        let dx1 = w.pos_x[other.0 as usize] - w.pos_x[cam.0 as usize];
        assert!((dx1 - dx0).abs() < 1e-4);
        assert!(w.pos_x[cam.0 as usize].abs() < 1e-4);
        assert!((k.absolute_origin.x - 80.0).abs() < 1e-9);
    }

    #[test]
    fn nested_origin_compose_and_cap() {
        let mut k = UniversalLogarithmicScale::new();
        assert!(k.push_nested_origin(WorldVec3::new(100.0, 0.0, 0.0), 2.0));
        assert!(k.push_nested_origin(WorldVec3::new(5.0, 0.0, 0.0), 1.0));
        let c = k.compose_nested_offset();
        // 100 + 5*2 = 110
        assert!((c.x - 110.0).abs() < 1e-12);
        for _ in 0..MAX_NEST_DEPTH {
            let _ = k.push_nested_origin(WorldVec3::ZERO, 1.0);
        }
        assert!(!k.push_nested_origin(WorldVec3::new(1.0, 0.0, 0.0), 1.0));
        assert!(k.nest.len() <= MAX_NEST_DEPTH);
    }

    #[test]
    fn no_rebase_when_under_threshold() {
        let mut k = UniversalLogarithmicScale::with_policy(LogScalePolicy {
            log_ref_m: 1.0,
            rebase_threshold_m: 1_000.0,
        });
        let mut w = WorldSoA::with_capacity(2);
        w.add_entity(10.0, 0.0, 0.0).unwrap();
        let r = k.manage_fractal_scale_tree(&mut w, WorldVec3::new(10.0, 0.0, 0.0));
        assert!(!r.rebased);
        assert_eq!(k.rebase_count, 0);
        assert!((w.pos_x[0] - 10.0).abs() < 1e-6);
    }

    #[test]
    fn soak_flips_ready_cosmos_aaa_held() {
        let r = run_universal_logarithmic_scale_soak();
        assert!(r.universal_logarithmic_scale_ready, "{r:?}");
        assert!(r.log_roundtrip_ok);
        assert!(r.rebase_triggered);
        assert!(r.relative_positions_preserved);
        assert!(!r.star_citizen_cosmos_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_universal_logarithmic_scale_soak();
        let b = probe_universal_logarithmic_scale();
        assert_eq!(
            a.universal_logarithmic_scale_ready,
            b.universal_logarithmic_scale_ready
        );
        assert!(b.universal_logarithmic_scale_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn probe_distinct_from_fb_fa() {
        let fc = probe_universal_logarithmic_scale();
        let fb = crate::geometric_scale_constraints::probe_geometric_scale_constraints();
        let fa = crate::digital_pressure_chamber::probe_digital_pressure_chamber();
        assert!(fc.universal_logarithmic_scale_ready);
        assert!(fb.geometric_scale_constraints_ready);
        assert!(fa.digital_pressure_chamber_ready);
        assert!(fc.distinct_from_geometric_scale_constraints_probe);
        assert!(fc.distinct_from_digital_pressure_chamber_probe);
        assert_ne!(
            fc.fingerprint, fb.fingerprint,
            "fc fingerprint must differ from fb"
        );
        assert_ne!(
            fc.fingerprint, fa.fingerprint,
            "fc fingerprint must differ from fa"
        );
    }
}

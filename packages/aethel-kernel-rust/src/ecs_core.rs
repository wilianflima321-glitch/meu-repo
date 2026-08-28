//! Kernel WorldSoA — fixed-capacity Structure-of-Arrays ECS core.
//! Boot allocates once; hot path never `Vec::push`es. Active mask is a `u64` bitset.

use serde::{Deserialize, Serialize};

/// Dense numeric entity handle (index into SoA columns).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EntityId(pub u32);

/// Structure-of-Arrays world with fixed capacity (letter **dc**).
///
/// Layout is contiguous columns for cache hits. `active_bits` is a bitset
/// (not `Vec<bool>`) so SIMD/bit-scan can skip inactive slots later.
pub struct SceneGraph {
    pub capacity: usize,
    pub len: usize,
    pub pos_x: Vec<f32>,
    pub pos_y: Vec<f32>,
    pub pos_z: Vec<f32>,
    /// Linear velocity SoA (letter **er** / `velocity_buffer_ecs`).
    pub vel_x: Vec<f32>,
    pub vel_y: Vec<f32>,
    pub vel_z: Vec<f32>,
    pub rot_x: Vec<f32>,
    pub rot_y: Vec<f32>,
    pub rot_z: Vec<f32>,
    pub rot_w: Vec<f32>,
    /// Local geometric scale SoA (letter **fb** / `geometric_scale_constraints`).
    /// Default 1.0 = identity. Clamped by min/max + parent-child inheritance.
    pub scale_x: Vec<f32>,
    pub scale_y: Vec<f32>,
    pub scale_z: Vec<f32>,
    /// Parent entity index (`-1` = root). Used by scale inheritance limits (**fb**).
    pub parent: Vec<i32>,
    /// Local time scale (1.0 = realtime). Used by `recursive_state_branching`.
    pub timescale: Vec<f32>,
    /// Bitset: bit i set ⇒ entity i active. Length = ceil(capacity / 64).
    pub active_bits: Vec<u64>,
    /// Optional genomic imprint (quantum provenance). Zero = unset.
    pub provenance_stamp: u64,
    /// Single authority owner per entity (0 = Kernel, 1 = Rapier, 2 = Kinematic) (P7).
    pub physics_authority: Vec<u8>,
    /// PBR metallic-roughness SoA (letter **R20 / materialx_bridge**): albedo is
    /// linear-space base color, roughness_x/y is anisotropic micro-surface
    /// roughness, metallic blends dielectric↔conductor, emission is self-illumination.
    /// Added 2026-08-11 so the MaterialX bridge maps real `.mtlx` standard_surface
    /// into the kernel WorldSoA (compile-or-delete resolution — genuine, not a mock).
    pub albedo_r: Vec<f32>,
    pub albedo_g: Vec<f32>,
    pub albedo_b: Vec<f32>,
    pub roughness_x: Vec<f32>,
    pub roughness_y: Vec<f32>,
    pub metallic: Vec<f32>,
    pub emission_r: Vec<f32>,
    pub emission_g: Vec<f32>,
    pub emission_b: Vec<f32>,
}

impl Default for SceneGraph {
    fn default() -> Self {
        Self::with_capacity(100_000)
    }
}

impl SceneGraph {
    pub fn new() -> Self {
        Self::with_capacity(100_000)
    }

    pub fn with_capacity(capacity: usize) -> Self {
        let words = capacity.div_ceil(64);
        Self {
            capacity,
            len: 0,
            pos_x: vec![0.0; capacity],
            pos_y: vec![0.0; capacity],
            pos_z: vec![0.0; capacity],
            vel_x: vec![0.0; capacity],
            vel_y: vec![0.0; capacity],
            vel_z: vec![0.0; capacity],
            rot_x: vec![0.0; capacity],
            rot_y: vec![0.0; capacity],
            rot_z: vec![0.0; capacity],
            rot_w: vec![1.0; capacity],
            scale_x: vec![1.0; capacity],
            scale_y: vec![1.0; capacity],
            scale_z: vec![1.0; capacity],
            parent: vec![-1; capacity],
            timescale: vec![1.0; capacity],
            active_bits: vec![0u64; words],
            provenance_stamp: 0,
            physics_authority: vec![0u8; capacity], // Default 0 = Kernel authority
            // PBR defaults: white albedo, rough dielectric, no self-emission.
            albedo_r: vec![1.0; capacity],
            albedo_g: vec![1.0; capacity],
            albedo_b: vec![1.0; capacity],
            roughness_x: vec![1.0; capacity],
            roughness_y: vec![1.0; capacity],
            metallic: vec![0.0; capacity],
            emission_r: vec![0.0; capacity],
            emission_g: vec![0.0; capacity],
            emission_b: vec![0.0; capacity],
        }
    }

    #[inline(always)]
    pub fn is_active(&self, index: usize) -> bool {
        if index >= self.len {
            return false;
        }
        let word = index / 64;
        let bit = index % 64;
        (self.active_bits[word] >> bit) & 1 == 1
    }

    #[inline(always)]
    pub fn set_active(&mut self, index: usize, active: bool) {
        if index >= self.capacity {
            return;
        }
        let word = index / 64;
        let bit = index % 64;
        if active {
            self.active_bits[word] |= 1u64 << bit;
        } else {
            self.active_bits[word] &= !(1u64 << bit);
        }
    }

    /// Spawn into the next free slot. Fail-closed when capacity exhausted (no realloc).
    pub fn add_entity(&mut self, px: f32, py: f32, pz: f32) -> Option<EntityId> {
        if self.len >= self.capacity {
            return None;
        }
        let id = self.len;
        self.pos_x[id] = px;
        self.pos_y[id] = py;
        self.pos_z[id] = pz;
        self.vel_x[id] = 0.0;
        self.vel_y[id] = 0.0;
        self.vel_z[id] = 0.0;
        self.rot_w[id] = 1.0;
        self.scale_x[id] = 1.0;
        self.scale_y[id] = 1.0;
        self.scale_z[id] = 1.0;
        self.parent[id] = -1;
        self.timescale[id] = 1.0;
        self.physics_authority[id] = 0; // Default Kernel authority
        self.set_active(id, true);
        self.len += 1;
        Some(EntityId(id as u32))
    }

    /// Set physics authority owner (0 = Kernel, 1 = Rapier, 2 = Kinematic) (P7).
    #[inline(always)]
    pub fn set_authority(&mut self, index: usize, authority_code: u8) {
        if index < self.len {
            self.physics_authority[index] = authority_code;
        }
    }

    /// Set linear velocity for an entity slot (letter **er**).
    #[inline(always)]
    pub fn set_velocity(&mut self, index: usize, vx: f32, vy: f32, vz: f32) {
        if index >= self.len {
            return;
        }
        self.vel_x[index] = vx;
        self.vel_y[index] = vy;
        self.vel_z[index] = vz;
    }

    /// Set local geometric scale for an entity slot (letter **fb**).
    #[inline(always)]
    pub fn set_scale(&mut self, index: usize, sx: f32, sy: f32, sz: f32) {
        if index >= self.len {
            return;
        }
        self.scale_x[index] = sx;
        self.scale_y[index] = sy;
        self.scale_z[index] = sz;
    }

    /// Set PBR self-emission SoA for an entity slot (letter **R20 / materialx_bridge**).
    /// RGB channels are scaled by the emission intensity and clamped to [0, 1].
    #[inline(always)]
    pub fn set_emission(&mut self, index: usize, er: f32, eg: f32, eb: f32, intensity: f32) {
        if index >= self.len {
            return;
        }
        self.emission_r[index] = (er * intensity).clamp(0.0, 1.0);
        self.emission_g[index] = (eg * intensity).clamp(0.0, 1.0);
        self.emission_b[index] = (eb * intensity).clamp(0.0, 1.0);
    }

    /// Set parent index (`-1` = root). Invalid parent indices are ignored (letter **fb**).
    #[inline(always)]
    pub fn set_parent(&mut self, index: usize, parent: i32) {
        if index >= self.len {
            return;
        }
        if parent >= 0 && (parent as usize) >= self.len {
            return;
        }
        // Fail-closed: no self-parent.
        if parent >= 0 && parent as usize == index {
            return;
        }
        self.parent[index] = parent;
    }

    /// Gravity-only hot loop over active entities (only Kernel-authority entities integrated) (P7).
    #[inline(always)]
    pub fn tick_physics(&mut self, delta_time: f32) {
        let gravity_step = 9.8 * delta_time;
        for i in 0..self.len {
            if self.is_active(i) && self.physics_authority[i] == 0 {
                let scale = self.timescale[i];
                self.pos_y[i] -= gravity_step * scale;
            }
        }
    }

    /// SIMD WorldSoA gravity hot path (letter **dk**).
    ///
    /// Builds gravity deltas via `simd_clay_math::scale_add_f32` on the
    /// contiguous `timescale` column (`delta = timescale * (-g·dt)`), then
    /// applies to active `pos_y`. Matches [`Self::tick_physics`] within ε.
    pub fn tick_physics_simd(&mut self, delta_time: f32) {
        let n = self.len;
        if n == 0 {
            return;
        }
        let gravity_step = 9.8 * delta_time;
        let mut delta = vec![0.0_f32; n];
        crate::simd_clay_math::scale_add_f32(
            &self.timescale[..n],
            -gravity_step,
            0.0,
            &mut delta,
        );
        for i in 0..n {
            if self.is_active(i) && self.physics_authority[i] == 0 {
                self.pos_y[i] += delta[i];
            }
        }
    }

    /// Batch `pos_y[i] = pos_y[i] * scale + add` via SIMD clay scale-add (letter **dk**).
    /// Only writes active slots; inactive `pos_y` unchanged.
    pub fn apply_pos_y_scale_add_simd(&mut self, scale: f32, add: f32) {
        let n = self.len;
        if n == 0 {
            return;
        }
        let mut out = vec![0.0_f32; n];
        crate::simd_clay_math::scale_add_f32(&self.pos_y[..n], scale, add, &mut out);
        for i in 0..n {
            if self.is_active(i) {
                self.pos_y[i] = out[i];
            }
        }
    }

    pub fn entity_count(&self) -> usize {
        self.len
    }

    /// Compute bit-exact hash of all active entities' SoA state for P4 determinism.
    pub fn compute_world_hash(&self) -> u64 {
        let mut h = 0xcbf2_9ce4_8422_2325_u64; // FNV-1a 64-bit offset
        for i in 0..self.len {
            if self.is_active(i) {
                let px = self.pos_x[i].to_bits() as u64;
                let py = self.pos_y[i].to_bits() as u64;
                let pz = self.pos_z[i].to_bits() as u64;
                let vx = self.vel_x[i].to_bits() as u64;
                let vy = self.vel_y[i].to_bits() as u64;
                let vz = self.vel_z[i].to_bits() as u64;
                let ts = self.timescale[i].to_bits() as u64;

                for val in [px, py, pz, vx, vy, vz, ts] {
                    h ^= val;
                    h = h.wrapping_mul(0x1000_0000_1b3);
                }
            }
        }
        h
    }
}

/// Alias used by kernel docs / honesty probes.
pub type WorldSoA = SceneGraph;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fixed_capacity_no_grow_past_cap() {
        let mut g = SceneGraph::with_capacity(2);
        assert!(g.add_entity(0.0, 1.0, 0.0).is_some());
        assert!(g.add_entity(1.0, 2.0, 0.0).is_some());
        assert!(g.add_entity(2.0, 3.0, 0.0).is_none());
        assert_eq!(g.entity_count(), 2);
    }

    #[test]
    fn bitset_active_and_tick() {
        let mut g = SceneGraph::with_capacity(8);
        let a = g.add_entity(0.0, 10.0, 0.0).unwrap();
        let b = g.add_entity(0.0, 10.0, 0.0).unwrap();
        g.set_active(b.0 as usize, false);
        g.tick_physics(1.0);
        assert!((g.pos_y[a.0 as usize] - (10.0 - 9.8)).abs() < 1e-4);
        assert!((g.pos_y[b.0 as usize] - 10.0).abs() < 1e-6);
    }

    #[test]
    fn tick_physics_simd_matches_scalar_within_eps() {
        let mut scalar = SceneGraph::with_capacity(16);
        let mut simd = SceneGraph::with_capacity(16);
        for i in 0..12 {
            let y = 20.0 - i as f32;
            scalar.add_entity(i as f32, y, 0.0).unwrap();
            simd.add_entity(i as f32, y, 0.0).unwrap();
            scalar.timescale[i] = 0.5 + (i as f32) * 0.1;
            simd.timescale[i] = scalar.timescale[i];
        }
        scalar.set_active(3, false);
        simd.set_active(3, false);
        for _ in 0..8 {
            scalar.tick_physics(0.016);
            simd.tick_physics_simd(0.016);
        }
        for i in 0..12 {
            assert!(
                (scalar.pos_y[i] - simd.pos_y[i]).abs() < crate::simd_clay_math::SIMD_CLAY_EPS,
                "pos_y[{i}] scalar={} simd={}",
                scalar.pos_y[i],
                simd.pos_y[i]
            );
        }
    }

    #[test]
    fn apply_pos_y_scale_add_simd_matches_scalar() {
        let mut world = SceneGraph::with_capacity(16);
        for i in 0..10 {
            world.add_entity(0.0, i as f32 * 1.5 - 2.0, 0.0).unwrap();
        }
        world.set_active(2, false);
        let before: Vec<f32> = world.pos_y[..10].to_vec();
        let scale = 1.25_f32;
        let add = -0.5_f32;
        world.apply_pos_y_scale_add_simd(scale, add);
        for i in 0..10 {
            if i == 2 {
                assert!((world.pos_y[i] - before[i]).abs() < 1e-6);
            } else {
                let expected = before[i] * scale + add;
                assert!((world.pos_y[i] - expected).abs() < crate::simd_clay_math::SIMD_CLAY_EPS);
            }
        }
    }

    #[test]
    fn bit_identical_fixed_dt_determinism() {
        let mut run1 = SceneGraph::with_capacity(64);
        let mut run2 = SceneGraph::with_capacity(64);

        for i in 0..32 {
            let px = i as f32 * 0.5 - 4.0;
            let py = 10.0 + (i % 5) as f32 * 2.0;
            let pz = (i % 3) as f32 * 1.5;
            let e1 = run1.add_entity(px, py, pz).unwrap();
            let e2 = run2.add_entity(px, py, pz).unwrap();
            run1.set_velocity(e1.0 as usize, 0.1, -0.5, 0.05);
            run2.set_velocity(e2.0 as usize, 0.1, -0.5, 0.05);
        }

        // Fixed dt tick sequence
        let dt = 1.0 / 60.0;
        for _ in 0..120 {
            run1.tick_physics_simd(dt);
            run2.tick_physics_simd(dt);
        }

        assert_eq!(
            run1.compute_world_hash(),
            run2.compute_world_hash(),
            "Fixed-dt replay must produce bit-identical WorldSoA hashes"
        );
    }

    #[test]
    fn rapier_authority_bridge_prevents_double_integration() {
        let mut world = SceneGraph::with_capacity(16);
        let e_kernel = world.add_entity(0.0, 100.0, 0.0).unwrap();
        let e_rapier = world.add_entity(0.0, 100.0, 0.0).unwrap();

        // Transfer authority of e_rapier to Rapier (authority code 1)
        world.set_authority(e_rapier.0 as usize, 1);

        world.tick_physics_simd(1.0);

        // e_kernel must fall by gravity (-9.8)
        assert!((world.pos_y[e_kernel.0 as usize] - 90.2).abs() < 1e-4);
        // e_rapier must NOT fall under Kernel tick (Rapier single authority owner)
        assert_eq!(world.pos_y[e_rapier.0 as usize], 100.0);
    }
}

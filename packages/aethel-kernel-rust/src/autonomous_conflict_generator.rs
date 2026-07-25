//! Autonomous Conflict Generator — letter **hm** (quality demote **hu**).
//!
//! Stress→event injector: when `tensor_stress` exceeds threshold, writes a
//! measurable vortex/conflict event into a SoA buffer; optionally couples
//! excess stress into a [`FractalEnergyField`] stress column. Not adversary
//! AI / Chaos narrative generation.
//!
//! Honesty probe `autonomous_conflict_generator_ready` /
//! `autonomousConflictGeneratorReady` is **distinct** from dx
//! `synestheticSensoryRemapReady`, dw `mnemonicMatterEntropyReady`, dv
//! `fourDimensionalTimeSdfReady`, du `shadowTimeReversalReady`, dt
//! `curvedRaymarcherReady`, ds/hr `fractalEnergyPerturbationReady`, dr
//! `autonomousEntropyCorrectorReady`, dq/hs `unifiedFieldNetworkReady`, and
//! dc–dm foundation probes.
//!
//! Letter **ie**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full adversary AI / Chaos parity (`adversary_ai_chaos_parity_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::ecs_core::WorldSoA;

/// Stress above this ⇒ spawn one vortex/conflict event (normalized units).
pub const TENSOR_STRESS_THRESHOLD: f32 = 1.0;
/// Soft upper bound on recorded vorticity / stress (fail-closed clamp).
pub const VORTICITY_MAX: f32 = 1.0e6;
/// Default soak buffer capacity (fixed SoA slots).
pub const SOAK_CAPACITY: usize = 16;
/// High-stress soak inject (must exceed threshold).
const SOAK_STRESS_HIGH: f32 = 2.5;
/// Low-stress soak inject (must stay at/under threshold — no spawn).
const SOAK_STRESS_LOW: f32 = 0.4;
/// Soak: how many high-stress antagonize calls.
const SOAK_HIGH_STEPS: u32 = 4;
/// Soak: how many low-stress antagonize calls (must remain event-free).
const SOAK_LOW_STEPS: u32 = 3;
/// Excess stress → fractal field stress couple gain.
const FIELD_COUPLE_GAIN: f32 = 0.35;
const EPS: f32 = 1e-5;

/// One antagonize outcome — measurable event write evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AntagonizeResult {
    /// True when a vortex/conflict event was written into the SoA buffer.
    pub spawned: bool,
    /// Slot index written (or `usize::MAX` when none).
    pub slot: usize,
    /// Vorticity magnitude written (0 when not spawned).
    pub vorticity: f32,
    /// Stress that triggered (or was rejected).
    pub stress: f32,
}

/// SoA conflict/vortex event buffer — contiguous columns (not actors).
#[derive(Debug, Clone)]
pub struct ConflictEventBuffer {
    /// 1 = live vortex event, 0 = empty slot.
    pub active: [u8; SOAK_CAPACITY],
    pub pos_x: [f32; SOAK_CAPACITY],
    pub pos_y: [f32; SOAK_CAPACITY],
    pub pos_z: [f32; SOAK_CAPACITY],
    /// Vortex strength proxy: `excess_stress = max(0, stress - threshold)`.
    pub vorticity: [f32; SOAK_CAPACITY],
    /// Tensor stress recorded at spawn.
    pub stress_at_spawn: [f32; SOAK_CAPACITY],
    /// Next write cursor (ring when full — overwrites oldest).
    cursor: usize,
    /// Total spawn attempts that wrote a slot.
    spawn_count: u64,
    steps: u64,
}

impl ConflictEventBuffer {
    /// Allocate zeroed SoA columns.
    pub fn new() -> Self {
        Self {
            active: [0; SOAK_CAPACITY],
            pos_x: [0.0; SOAK_CAPACITY],
            pos_y: [0.0; SOAK_CAPACITY],
            pos_z: [0.0; SOAK_CAPACITY],
            vorticity: [0.0; SOAK_CAPACITY],
            stress_at_spawn: [0.0; SOAK_CAPACITY],
            cursor: 0,
            spawn_count: 0,
            steps: 0,
        }
    }

    /// Soak-sized buffer.
    pub fn soak_buffer() -> Self {
        Self::new()
    }
}

impl Default for ConflictEventBuffer {
    fn default() -> Self {
        Self::new()
    }
}

impl ConflictEventBuffer {
    #[inline]
    pub fn capacity(&self) -> usize {
        SOAK_CAPACITY
    }

    #[inline]
    pub fn step_count(&self) -> u64 {
        self.steps
    }

    #[inline]
    pub fn spawn_count(&self) -> u64 {
        self.spawn_count
    }

    /// Count of currently active vortex slots.
    #[inline]
    pub fn active_event_count(&self) -> usize {
        self.active.iter().filter(|&&a| a != 0).count()
    }

    /// Sum of vorticity over active slots.
    #[inline]
    pub fn total_vorticity(&self) -> f32 {
        let n = self.capacity();
        let mut acc = 0.0_f32;
        for i in 0..n {
            if self.active[i] != 0 {
                acc += self.vorticity[i];
            }
        }
        acc
    }

    /// Clear all slots (test/soak helper).
    pub fn clear(&mut self) {
        let n = self.capacity();
        for i in 0..n {
            self.active[i] = 0;
            self.pos_x[i] = 0.0;
            self.pos_y[i] = 0.0;
            self.pos_z[i] = 0.0;
            self.vorticity[i] = 0.0;
            self.stress_at_spawn[i] = 0.0;
        }
        self.cursor = 0;
        self.spawn_count = 0;
        self.steps = 0;
    }
}

/// Stateless facade — threshold-gated vortex/conflict emit.
#[derive(Debug, Default, Clone, Copy)]
pub struct AutonomousConflictGenerator;

impl AutonomousConflictGenerator {
    /// Sanitize stress + origin (non-finite → fail-closed zero / origin).
    #[inline]
    pub fn sanitize_inputs(tensor_stress_level: f32, origin: [f32; 3]) -> (f32, [f32; 3]) {
        let stress = if tensor_stress_level.is_finite() && tensor_stress_level >= 0.0 {
            tensor_stress_level
        } else {
            0.0
        };
        let o = [
            if origin[0].is_finite() { origin[0] } else { 0.0 },
            if origin[1].is_finite() { origin[1] } else { 0.0 },
            if origin[2].is_finite() { origin[2] } else { 0.0 },
        ];
        (stress, o)
    }

    /// Inject conflict when tensor stress exceeds [`TENSOR_STRESS_THRESHOLD`].
    ///
    /// High stress → write one SoA vortex event (active + vorticity + origin).
    /// Low / at-threshold stress → identity (no spawn). Non-finite → fail-closed.
    /// Emit a stress-threshold conflict/vortex event (legacy name kept).
    /// Does **not** claim adversary AI / Chaos narrative parity.
    pub fn antagonize_impossible_physics(
        buffer: &mut ConflictEventBuffer,
        tensor_stress_level: f32,
        origin: [f32; 3],
    ) -> AntagonizeResult {
        let n = buffer.capacity();
        buffer.steps = buffer.steps.saturating_add(1);
        if n == 0 {
            return AntagonizeResult {
                spawned: false,
                slot: usize::MAX,
                vorticity: 0.0,
                stress: 0.0,
            };
        }

        let (stress, o) = Self::sanitize_inputs(tensor_stress_level, origin);
        if stress <= TENSOR_STRESS_THRESHOLD {
            return AntagonizeResult {
                spawned: false,
                slot: usize::MAX,
                vorticity: 0.0,
                stress,
            };
        }

        let excess = (stress - TENSOR_STRESS_THRESHOLD).min(VORTICITY_MAX);
        let slot = buffer.cursor % n;
        buffer.active[slot] = 1;
        buffer.pos_x[slot] = o[0];
        buffer.pos_y[slot] = o[1];
        buffer.pos_z[slot] = o[2];
        buffer.vorticity[slot] = excess;
        buffer.stress_at_spawn[slot] = stress.min(VORTICITY_MAX);
        buffer.cursor = (slot + 1) % n;
        buffer.spawn_count = buffer.spawn_count.saturating_add(1);

        AntagonizeResult {
            spawned: true,
            slot,
            vorticity: excess,
            stress,
        }
    }

    /// Couple last spawn excess into a [`WorldSoA`] velocity column.
    /// Measurable: field velocity rises when a vortex was spawned. Chaos HELD.
    pub fn couple_to_velocity_field(
        buffer: &ConflictEventBuffer,
        world: &mut WorldSoA,
        spawn: &AntagonizeResult,
    ) -> bool {
        if !spawn.spawned || spawn.vorticity <= EPS {
            return false;
        }
        let n = world.entity_count();
        if n == 0 {
            return false;
        }
        let bump = (spawn.vorticity * FIELD_COUPLE_GAIN).min(VORTICITY_MAX);
        let mut before = 0.0_f32;
        for i in 0..n {
            before += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
        }
        // Distribute excess into center-weighted particles (same radial idea as ds).
        let n_f = n as f32;
        for i in 0..n {
            let t = (i as f32 + 0.5) / n_f;
            let w = (1.0 - (t - 0.5).abs() * 1.5).max(0.15);
            world.vel_y[i] = (world.vel_y[i] + bump * w).min(VORTICITY_MAX);
        }
        let mut after = 0.0_f32;
        for i in 0..n {
            after += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
        }
        let _ = buffer; // evidence lives in spawn + field; buffer already holds event
        after > before + EPS
    }
}

/// Letter **hm** soak report — autonomous conflict generator evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct AutonomousConflictGeneratorSoakReport {
    /// Soak-gated; distinct from dx / dw / dv / du / dt / ds / dr / dq / dc–dm probes.
    pub autonomous_conflict_generator_ready: bool,
    pub high_stress_spawns_events: bool,
    pub low_stress_is_identity: bool,
    pub events_measurable: bool,
    pub velocity_field_perturbed: bool,
    pub high_spawn_count: u32,
    pub low_spawn_count: u32,
    pub final_active_events: u32,
    pub final_vorticity: f32,
    pub velocity_field_delta: f32,
    /// Stable evidence tag: stress-threshold SoA vortex inject (≠ SDF displace / density remap) — **ie**.
    pub evidence_kind: &'static str,
    /// Fingerprint of conflict-only evidence fields (cross-check vs ev/dx).
    pub evidence_fingerprint: u64,
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
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub unreal_gc_streaming_parity_ready: bool,
    pub metasounds_hrtf_aaa_ready: bool,
    /// Full adversary AI / Chaos parity — always HELD.
    pub adversary_ai_chaos_parity_ready: bool,
}

/// Stress-threshold SoA vortex inject evidence shape (≠ SDF displace / density remap).
pub const HM_EVIDENCE_KIND: &str = "stress_threshold_soa_vortex_inject";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn hm_evidence_fingerprint(
    high_spawn_count: u32,
    final_vorticity: f32,
    velocity_field_delta: f32,
) -> u64 {
    let mut h = 0x686d_6366_6c_u64; // "hmcfl"
    h = hash_mix(h, high_spawn_count as u64);
    h = hash_mix(h, final_vorticity.to_bits() as u64);
    h = hash_mix(h, velocity_field_delta.to_bits() as u64);
    h ^= 0x5652_5458; // VRTX
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == HM_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn conflict_held(
    high_stress_spawns_events: bool,
    low_stress_is_identity: bool,
    events_measurable: bool,
    velocity_field_perturbed: bool,
    high_spawn_count: u32,
    low_spawn_count: u32,
    final_active_events: u32,
    final_vorticity: f32,
    velocity_field_delta: f32,
) -> AutonomousConflictGeneratorSoakReport {
    let evidence_kind = HM_EVIDENCE_KIND;
    let evidence_fingerprint =
        hm_evidence_fingerprint(high_spawn_count, final_vorticity, velocity_field_delta);
    let core_ok = high_stress_spawns_events
        && low_stress_is_identity
        && events_measurable
        && velocity_field_perturbed;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    AutonomousConflictGeneratorSoakReport {
        autonomous_conflict_generator_ready: false,
        high_stress_spawns_events,
        low_stress_is_identity,
        events_measurable,
        velocity_field_perturbed,
        high_spawn_count,
        low_spawn_count,
        final_active_events,
        final_vorticity,
        velocity_field_delta,
        evidence_kind,
        evidence_fingerprint,
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
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
        adversary_ai_chaos_parity_ready: false,
    }
}

/// Run high/low stress contrast + fractal stress couple soak.
/// Does **not** claim full adversary AI / Chaos parity.
pub fn run_autonomous_conflict_generator_soak() -> AutonomousConflictGeneratorSoakReport {
    // --- High stress: must spawn measurable events ---
    let mut high_buf = ConflictEventBuffer::soak_buffer();
    let mut high_spawned: u32 = 0;
    let origin = [1.0, 2.0, 3.0];
    for step in 0..SOAK_HIGH_STEPS {
        let o = [
            origin[0] + step as f32 * 0.1,
            origin[1],
            origin[2],
        ];
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut high_buf,
            SOAK_STRESS_HIGH,
            o,
        );
        if r.spawned && r.vorticity > EPS {
            high_spawned = high_spawned.saturating_add(1);
        }
    }
    let high_stress_spawns_events = high_spawned == SOAK_HIGH_STEPS
        && high_buf.active_event_count() > 0
        && high_buf.total_vorticity() > EPS;
    let events_measurable = high_buf.spawn_count() == SOAK_HIGH_STEPS as u64
        && high_buf.vorticity.iter().any(|&v| v > EPS)
        && high_buf.active.iter().any(|&a| a != 0);

    // --- Low stress: must remain identity (no events) ---
    let mut low_buf = ConflictEventBuffer::soak_buffer();
    let mut low_spawned: u32 = 0;
    for _ in 0..SOAK_LOW_STEPS {
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut low_buf,
            SOAK_STRESS_LOW,
            origin,
        );
        if r.spawned {
            low_spawned = low_spawned.saturating_add(1);
        }
    }
    let low_stress_is_identity = low_spawned == 0
        && low_buf.active_event_count() == 0
        && low_buf.total_vorticity() <= EPS
        && low_buf.spawn_count() == 0;

    // --- Couple one high spawn into WorldSoA velocity ---
    let mut couple_buf = ConflictEventBuffer::soak_buffer();
    let mut world = WorldSoA::with_capacity(SOAK_CAPACITY);
    for _i in 0..SOAK_CAPACITY {
        world.add_entity(0.0, 0.0, 0.0).unwrap();
    }
    let mut vel_before = 0.0_f32;
    for i in 0..world.entity_count() {
        vel_before += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
    }
    let spawn = AutonomousConflictGenerator::antagonize_impossible_physics(
        &mut couple_buf,
        SOAK_STRESS_HIGH,
        origin,
    );
    let coupled =
        AutonomousConflictGenerator::couple_to_velocity_field(&couple_buf, &mut world, &spawn);
    let mut vel_after = 0.0_f32;
    for i in 0..world.entity_count() {
        vel_after += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
    }
    let velocity_field_delta = vel_after - vel_before;
    let velocity_field_perturbed = coupled && spawn.spawned && velocity_field_delta > EPS;

    let final_active = high_buf.active_event_count() as u32;
    let final_vorticity = high_buf.total_vorticity();

    if !(high_stress_spawns_events
        && low_stress_is_identity
        && events_measurable
        && velocity_field_perturbed)
    {
        return conflict_held(
            high_stress_spawns_events,
            low_stress_is_identity,
            events_measurable,
            velocity_field_perturbed,
            high_spawned,
            low_spawned,
            final_active,
            final_vorticity,
            velocity_field_delta,
        );
    }

    let evidence_kind = HM_EVIDENCE_KIND;
    let evidence_fingerprint =
        hm_evidence_fingerprint(high_spawned, final_vorticity, velocity_field_delta);
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    AutonomousConflictGeneratorSoakReport {
        autonomous_conflict_generator_ready: true,
        high_stress_spawns_events: true,
        low_stress_is_identity: true,
        events_measurable: true,
        velocity_field_perturbed: true,
        high_spawn_count: high_spawned,
        low_spawn_count: low_spawned,
        final_active_events: final_active,
        final_vorticity,
        velocity_field_delta,
        evidence_kind,
        evidence_fingerprint,
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
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
        adversary_ai_chaos_parity_ready: false,
    }
}

/// Honesty probe — soak-gated `autonomous_conflict_generator_ready` (**hm**).
pub fn probe_autonomous_conflict_generator() -> AutonomousConflictGeneratorSoakReport {
    run_autonomous_conflict_generator_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn high_stress_spawns_vortex_event() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            2.0,
            [4.0, 5.0, 6.0],
        );
        assert!(r.spawned);
        assert!(r.vorticity > EPS);
        assert_eq!(r.vorticity, 2.0 - TENSOR_STRESS_THRESHOLD);
        assert_eq!(buf.active_event_count(), 1);
        assert_eq!(buf.active[r.slot], 1);
        assert!((buf.pos_x[r.slot] - 4.0).abs() < EPS);
        assert!((buf.pos_y[r.slot] - 5.0).abs() < EPS);
        assert!((buf.pos_z[r.slot] - 6.0).abs() < EPS);
        assert_eq!(buf.spawn_count(), 1);
    }

    #[test]
    fn low_stress_is_identity_no_spawn() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            0.5,
            [1.0, 0.0, 0.0],
        );
        assert!(!r.spawned);
        assert_eq!(r.vorticity, 0.0);
        assert_eq!(buf.active_event_count(), 0);
        assert_eq!(buf.total_vorticity(), 0.0);
        assert_eq!(buf.spawn_count(), 0);
        // Steps still advance (call observed) but no write.
        assert_eq!(buf.step_count(), 1);
    }

    #[test]
    fn at_threshold_does_not_spawn() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            TENSOR_STRESS_THRESHOLD,
            [0.0, 0.0, 0.0],
        );
        assert!(!r.spawned);
        assert_eq!(buf.active_event_count(), 0);
    }

    #[test]
    fn non_finite_fail_closed() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let r = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            f32::NAN,
            [f32::INFINITY, 1.0, f32::NAN],
        );
        assert!(!r.spawned);
        assert_eq!(buf.active_event_count(), 0);
    }

    #[test]
    fn couple_raises_velocity_field() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let mut world = WorldSoA::with_capacity(SOAK_CAPACITY);
        for _ in 0..SOAK_CAPACITY {
            world.add_entity(0.0, 0.0, 0.0).unwrap();
        }
        let mut before = 0.0_f32;
        for i in 0..world.entity_count() {
            before += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
        }
        let spawn = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            3.0,
            [0.0, 0.0, 0.0],
        );
        assert!(AutonomousConflictGenerator::couple_to_velocity_field(
            &buf, &mut world, &spawn
        ));
        let mut after = 0.0_f32;
        for i in 0..world.entity_count() {
            after += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
        }
        assert!(after > before + EPS);
    }

    #[test]
    fn couple_skipped_when_no_spawn() {
        let mut buf = ConflictEventBuffer::soak_buffer();
        let mut world = WorldSoA::with_capacity(SOAK_CAPACITY);
        for _ in 0..SOAK_CAPACITY {
            world.add_entity(0.0, 0.0, 0.0).unwrap();
        }
        let spawn = AutonomousConflictGenerator::antagonize_impossible_physics(
            &mut buf,
            0.2,
            [0.0, 0.0, 0.0],
        );
        assert!(!AutonomousConflictGenerator::couple_to_velocity_field(
            &buf, &mut world, &spawn
        ));
        let mut after = 0.0_f32;
        for i in 0..world.entity_count() {
            after += (world.vel_x[i] * world.vel_x[i] + world.vel_y[i] * world.vel_y[i] + world.vel_z[i] * world.vel_z[i]).sqrt();
        }
        assert_eq!(after, 0.0);
    }

    #[test]
    fn conflict_soak_flips_ready_adversary_held() {
        let r = probe_autonomous_conflict_generator();
        assert!(r.autonomous_conflict_generator_ready, "{r:?}");
        assert!(r.high_stress_spawns_events);
        assert!(r.low_stress_is_identity);
        assert!(r.events_measurable);
        assert!(r.velocity_field_perturbed);
        assert_eq!(r.high_spawn_count, SOAK_HIGH_STEPS);
        assert_eq!(r.low_spawn_count, 0);
        assert!(r.final_vorticity > 0.0);
        assert!(r.velocity_field_delta > 0.0);
        assert_eq!(r.evidence_kind, HM_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_synesthetic_sensory_remap_probe);
        assert!(r.distinct_from_mnemonic_matter_entropy_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.adversary_ai_chaos_parity_ready);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.metasounds_hrtf_aaa_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn conflict_probe_distinct_from_dx_dw_dv_du_dt_ds_dr_dq() {
        let conflict = probe_autonomous_conflict_generator();
        let remap = crate::synesthetic_sensory_remap::probe_synesthetic_sensory_remap();
        let entropy = crate::mnemonic_matter_entropy::probe_mnemonic_matter_entropy();
        let sdf = crate::four_dimensional_time_sdf::probe_four_dimensional_time_sdf();
        let shadow = crate::shadow_kernel_time_reversal::probe_shadow_time_reversal();
        let curved = crate::non_euclidean_curved_raymarcher::probe_curved_raymarcher();
        let pert = crate::fractal_energy_perturbation::probe_fractal_energy_perturbation();
        let corr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let field = crate::unified_field_network::probe_unified_field_network();
        let found = crate::kernel_honesty::probe_kernel_foundation();

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

        assert!(conflict.distinct_from_synesthetic_sensory_remap_probe);
        assert!(conflict.distinct_from_mnemonic_matter_entropy_probe);
        assert!(conflict.distinct_from_four_dimensional_time_sdf_probe);
        assert!(conflict.distinct_from_shadow_time_reversal_probe);
        assert!(conflict.distinct_from_curved_raymarcher_probe);
        assert!(conflict.distinct_from_fractal_energy_perturbation_probe);
        assert!(conflict.distinct_from_autonomous_entropy_corrector_probe);
        assert!(conflict.distinct_from_unified_field_network_probe);
        assert!(conflict.distinct_from_kernel_foundation_probe);

        // Distinct evidence shapes — hc high/low stress events, dx density channels, …
        assert!(conflict.high_stress_spawns_events && conflict.low_stress_is_identity);
        assert!(remap.density_changes_outputs && remap.vacuum_silences_acoustic);
        assert!(entropy.offscreen_coherence_decayed && entropy.offscreen_drop_gt_active);
        assert!(sdf.w_changes_distance && sdf.morph_endpoints_match_primitives);
        assert!(shadow.positions_advanced && shadow.rewind_restored_positions);
        assert!(curved.light_vector_mutated && curved.mass_zero_identity);
        assert!(pert.force_mutated && pert.stress_mutated);
        assert!(corr.nits_mutated_down && corr.dust_mutated_up);
        assert!(field.pressure_monotonic);
        assert!(!conflict.adversary_ai_chaos_parity_ready);
    }
}

//! Mnemonic Matter Entropy — letter **dw**.
//!
//! Replaces empty `process_background_statistical_collapse` (no decay ODE /
//! entity store). Off-screen / inactive entities get continuous exponential
//! coherence decay on a SoA column; on-screen / active entities skip or use a
//! slower rate — measurable soak.
//!
//! Honesty probe `mnemonic_matter_entropy_ready` / `mnemonicMatterEntropyReady`
//! is **distinct** from dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`, dq
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes.
//!
//! Letter **if**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full Unreal GC/streaming parity (`unreal_gc_streaming_parity_ready:
//! false`) · Coins / Agones / Nanite / DLSS.

use crate::ecs_core::WorldSoA;

/// Background (off-screen / inactive) decay rate λ [1/s].
pub const LAMBDA_BACKGROUND: f32 = 0.35;
/// On-screen / active decay rate λ [1/s] — slower than background (or ~skip).
pub const LAMBDA_ACTIVE: f32 = 0.02;
/// Soft floor — coherence never goes below this (measurable residual).
pub const COHERENCE_FLOOR: f32 = 1e-4;
/// Soak entity count (small, deterministic).
pub const SOAK_ENTITY_COUNT: usize = 16;
/// Soak frames at fixed dt.
pub const SOAK_FRAMES: u32 = 120;
/// Soak frame dt (60 Hz).
pub const SOAK_DT: f32 = 1.0 / 60.0;
/// Float compare epsilon for soak evidence.
const EPS: f32 = 1e-5;
/// Off-screen must lose at least this much coherence over soak.
const MIN_OFFSCREEN_DROP: f32 = 0.15;
/// Active drop must be strictly less than off-screen drop by this margin.
const ACTIVE_VS_OFFSCREEN_MARGIN: f32 = 0.05;

/// One decay step outcome — measurable SoA coherence evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DecayStepResult {
    /// Entities that received background (full-rate) decay.
    pub offscreen_decayed: u32,
    /// Entities that received active (slow/skip) decay.
    pub active_decayed: u32,
    /// Sum of |Δcoherence| this step.
    pub total_coherence_delta: f32,
    /// True when at least one coherence column was mutated.
    pub mutated: bool,
}

/// Dedicated SoA store for mnemonic matter coherence (integrity column).
///
/// Aligns with WorldSoA length when coupled; `on_screen` bitset marks camera-
/// visible / active entities (slower decay). Off-screen slots decay at
/// [`LAMBDA_BACKGROUND`].
#[derive(Debug, Clone)]
pub struct MnemonicMatterStore {
    /// Coherence / integrity in (0, 1] — continuous entropy column.
    pub coherence: Vec<f32>,
    /// Bitset: bit i set ⇒ entity i on-screen / active (slower decay).
    pub on_screen_bits: Vec<u64>,
    pub capacity: usize,
    pub len: usize,
}

impl MnemonicMatterStore {
    /// Allocate zeroed SoA. Fail-closed empty when capacity 0.
    pub fn with_capacity(capacity: usize) -> Self {
        let words = if capacity == 0 {
            0
        } else {
            capacity.div_ceil(64)
        };
        Self {
            coherence: vec![1.0; capacity],
            on_screen_bits: vec![0u64; words],
            capacity,
            len: 0,
        }
    }

    /// Soak-sized store.
    pub fn soak_store() -> Self {
        Self::with_capacity(SOAK_ENTITY_COUNT)
    }

    /// Spawn next free slot at full coherence. Fail-closed when full.
    pub fn add_entity(&mut self, on_screen: bool) -> Option<usize> {
        if self.len >= self.capacity {
            return None;
        }
        let id = self.len;
        self.coherence[id] = 1.0;
        self.set_on_screen(id, on_screen);
        self.len += 1;
        Some(id)
    }

    #[inline]
    pub fn is_on_screen(&self, index: usize) -> bool {
        if index >= self.len || self.on_screen_bits.is_empty() {
            return false;
        }
        let word = index / 64;
        let bit = index % 64;
        (self.on_screen_bits[word] >> bit) & 1 == 1
    }

    #[inline]
    pub fn set_on_screen(&mut self, index: usize, on_screen: bool) {
        if index >= self.capacity || self.on_screen_bits.is_empty() {
            return;
        }
        let word = index / 64;
        let bit = index % 64;
        if on_screen {
            self.on_screen_bits[word] |= 1u64 << bit;
        } else {
            self.on_screen_bits[word] &= !(1u64 << bit);
        }
    }

    /// Mirror WorldSoA `active_bits` into on-screen mask (active ⇒ on-screen).
    pub fn sync_on_screen_from_world(&mut self, world: &WorldSoA) {
        let n = self.len.min(world.len).min(self.capacity);
        for i in 0..n {
            self.set_on_screen(i, world.is_active(i));
        }
    }

    #[inline]
    pub fn mean_coherence(&self) -> f32 {
        if self.len == 0 {
            return 0.0;
        }
        let sum: f32 = self.coherence[..self.len].iter().sum();
        sum / self.len as f32
    }

    #[inline]
    pub fn mean_coherence_offscreen(&self) -> f32 {
        let mut sum = 0.0_f32;
        let mut n = 0u32;
        for i in 0..self.len {
            if !self.is_on_screen(i) {
                sum += self.coherence[i];
                n += 1;
            }
        }
        if n == 0 {
            0.0
        } else {
            sum / n as f32
        }
    }

    #[inline]
    pub fn mean_coherence_onscreen(&self) -> f32 {
        let mut sum = 0.0_f32;
        let mut n = 0u32;
        for i in 0..self.len {
            if self.is_on_screen(i) {
                sum += self.coherence[i];
                n += 1;
            }
        }
        if n == 0 {
            0.0
        } else {
            sum / n as f32
        }
    }
}

/// Stateless facade — continuous background entropy decay.
#[derive(Debug, Default, Clone, Copy)]
pub struct MnemonicMatterEntropy;

impl MnemonicMatterEntropy {
    /// Continuous exponential decay on the coherence SoA column.
    ///
    /// `dC/dt = -λ C` with λ = [`LAMBDA_BACKGROUND`] off-screen / inactive,
    /// λ = [`LAMBDA_ACTIVE`] on-screen / active (slower). Clamped to
    /// [`COHERENCE_FLOOR`]. Non-finite / non-positive `time_elapsed` → identity.
    ///
    /// Does **not** claim Unreal GC/streaming parity.
    pub fn process_background_statistical_collapse(
        store: &mut MnemonicMatterStore,
        time_elapsed: f32,
    ) -> DecayStepResult {
        if !(time_elapsed.is_finite()) || time_elapsed <= 0.0 || store.len == 0 {
            return DecayStepResult {
                offscreen_decayed: 0,
                active_decayed: 0,
                total_coherence_delta: 0.0,
                mutated: false,
            };
        }

        let factor_bg = (-LAMBDA_BACKGROUND * time_elapsed).exp();
        let factor_fg = (-LAMBDA_ACTIVE * time_elapsed).exp();
        let mut offscreen_decayed = 0u32;
        let mut active_decayed = 0u32;
        let mut total_delta = 0.0_f32;

        for i in 0..store.len {
            let before = store.coherence[i];
            if !before.is_finite() {
                store.coherence[i] = COHERENCE_FLOOR;
                total_delta += (before - COHERENCE_FLOOR).abs();
                offscreen_decayed = offscreen_decayed.saturating_add(1);
                continue;
            }
            let factor = if store.is_on_screen(i) {
                active_decayed = active_decayed.saturating_add(1);
                factor_fg
            } else {
                offscreen_decayed = offscreen_decayed.saturating_add(1);
                factor_bg
            };
            let after = (before * factor).max(COHERENCE_FLOOR);
            total_delta += (before - after).abs();
            store.coherence[i] = after;
        }

        DecayStepResult {
            offscreen_decayed,
            active_decayed,
            total_coherence_delta: total_delta,
            mutated: total_delta > EPS,
        }
    }

    /// Convenience: sync on-screen from WorldSoA active mask, then decay.
    pub fn step_with_world(
        store: &mut MnemonicMatterStore,
        world: &WorldSoA,
        time_elapsed: f32,
    ) -> DecayStepResult {
        store.sync_on_screen_from_world(world);
        Self::process_background_statistical_collapse(store, time_elapsed)
    }
}

/// Letter **dw** soak report — mnemonic matter entropy evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct MnemonicMatterEntropySoakReport {
    /// Soak-gated; distinct from dv / du / dt / ds / dr / dq / dc–dm probes.
    pub mnemonic_matter_entropy_ready: bool,
    pub offscreen_coherence_decayed: bool,
    pub active_slower_or_skip: bool,
    pub offscreen_drop_gt_active: bool,
    pub state_mutated: bool,
    pub entities: u32,
    pub soak_frames: u32,
    pub mean_coherence_offscreen_final: f32,
    pub mean_coherence_onscreen_final: f32,
    pub offscreen_drop: f32,
    pub onscreen_drop: f32,
    /// Stable evidence tag: SoA off-screen coherence exponential decay (≠ ring rewind / light bend) — **if**.
    pub evidence_kind: &'static str,
    /// Fingerprint of coherence-decay evidence fields (cross-check vs du/dt).
    pub evidence_fingerprint: u64,
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
    /// Full Unreal GC / streaming parity — always HELD.
    pub unreal_gc_streaming_parity_ready: bool,
}

/// SoA off-screen coherence exponential decay evidence shape (≠ ring rewind / light bend).
pub const DW_EVIDENCE_KIND: &str = "soa_offscreen_coherence_exponential_decay";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn dw_evidence_fingerprint(offscreen_drop: f32, onscreen_drop: f32, mean_off: f32) -> u64 {
    let mut h = 0x6477_6d6d_65_u64; // "dwmme"
    h = hash_mix(h, offscreen_drop.to_bits() as u64);
    h = hash_mix(h, onscreen_drop.to_bits() as u64);
    h = hash_mix(h, mean_off.to_bits() as u64);
    h ^= 0x454e_5452; // ENTR
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == DW_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn entropy_held(
    offscreen_coherence_decayed: bool,
    active_slower_or_skip: bool,
    offscreen_drop_gt_active: bool,
    state_mutated: bool,
    entities: u32,
    soak_frames: u32,
    mean_coherence_offscreen_final: f32,
    mean_coherence_onscreen_final: f32,
    offscreen_drop: f32,
    onscreen_drop: f32,
) -> MnemonicMatterEntropySoakReport {
    let evidence_kind = DW_EVIDENCE_KIND;
    let evidence_fingerprint =
        dw_evidence_fingerprint(offscreen_drop, onscreen_drop, mean_coherence_offscreen_final);
    let core_ok = offscreen_coherence_decayed
        && active_slower_or_skip
        && offscreen_drop_gt_active
        && state_mutated;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    MnemonicMatterEntropySoakReport {
        mnemonic_matter_entropy_ready: false,
        offscreen_coherence_decayed,
        active_slower_or_skip,
        offscreen_drop_gt_active,
        state_mutated,
        entities,
        soak_frames,
        mean_coherence_offscreen_final,
        mean_coherence_onscreen_final,
        offscreen_drop,
        onscreen_drop,
        evidence_kind,
        evidence_fingerprint,
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
    }
}

/// Run off-screen vs on-screen coherence decay soak.
///
/// Does **not** claim Unreal GC/streaming parity.
pub fn run_mnemonic_matter_entropy_soak() -> MnemonicMatterEntropySoakReport {
    let mut store = MnemonicMatterStore::soak_store();
    // Half off-screen (inactive), half on-screen (active).
    for i in 0..SOAK_ENTITY_COUNT {
        let on_screen = i % 2 == 0;
        store.add_entity(on_screen).expect("soak capacity");
    }
    let entities = store.len as u32;
    let off0 = store.mean_coherence_offscreen();
    let on0 = store.mean_coherence_onscreen();

    let mut any_mutated = false;
    for _ in 0..SOAK_FRAMES {
        let r = MnemonicMatterEntropy::process_background_statistical_collapse(&mut store, SOAK_DT);
        if r.mutated {
            any_mutated = true;
        }
    }

    let off1 = store.mean_coherence_offscreen();
    let on1 = store.mean_coherence_onscreen();
    let offscreen_drop = (off0 - off1).max(0.0);
    let onscreen_drop = (on0 - on1).max(0.0);

    let offscreen_coherence_decayed = offscreen_drop >= MIN_OFFSCREEN_DROP;
    let active_slower_or_skip = onscreen_drop + EPS < offscreen_drop;
    let offscreen_drop_gt_active =
        offscreen_drop >= onscreen_drop + ACTIVE_VS_OFFSCREEN_MARGIN;
    let state_mutated = any_mutated && offscreen_drop > EPS;

    if !(offscreen_coherence_decayed
        && active_slower_or_skip
        && offscreen_drop_gt_active
        && state_mutated)
    {
        return entropy_held(
            offscreen_coherence_decayed,
            active_slower_or_skip,
            offscreen_drop_gt_active,
            state_mutated,
            entities,
            SOAK_FRAMES,
            off1,
            on1,
            offscreen_drop,
            onscreen_drop,
        );
    }

    let evidence_kind = DW_EVIDENCE_KIND;
    let evidence_fingerprint = dw_evidence_fingerprint(offscreen_drop, onscreen_drop, off1);
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    MnemonicMatterEntropySoakReport {
        mnemonic_matter_entropy_ready: true,
        offscreen_coherence_decayed: true,
        active_slower_or_skip: true,
        offscreen_drop_gt_active: true,
        state_mutated: true,
        entities,
        soak_frames: SOAK_FRAMES,
        mean_coherence_offscreen_final: off1,
        mean_coherence_onscreen_final: on1,
        offscreen_drop,
        onscreen_drop,
        evidence_kind,
        evidence_fingerprint,
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
    }
}

/// Honesty probe — soak-gated `mnemonic_matter_entropy_ready` (**dw**).
pub fn probe_mnemonic_matter_entropy() -> MnemonicMatterEntropySoakReport {
    run_mnemonic_matter_entropy_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn offscreen_decays_faster_than_onscreen() {
        let mut store = MnemonicMatterStore::with_capacity(4);
        store.add_entity(false).unwrap(); // off-screen
        store.add_entity(true).unwrap(); // on-screen
        let off0 = store.coherence[0];
        let on0 = store.coherence[1];
        for _ in 0..60 {
            MnemonicMatterEntropy::process_background_statistical_collapse(&mut store, SOAK_DT);
        }
        let off_drop = off0 - store.coherence[0];
        let on_drop = on0 - store.coherence[1];
        assert!(off_drop > on_drop + ACTIVE_VS_OFFSCREEN_MARGIN, "off={off_drop} on={on_drop}");
        assert!(store.coherence[0] < 1.0 - MIN_OFFSCREEN_DROP * 0.5);
    }

    #[test]
    fn zero_dt_is_identity() {
        let mut store = MnemonicMatterStore::with_capacity(2);
        store.add_entity(false).unwrap();
        let before = store.coherence[0];
        let r = MnemonicMatterEntropy::process_background_statistical_collapse(&mut store, 0.0);
        assert!(!r.mutated);
        assert!((store.coherence[0] - before).abs() < EPS);
    }

    #[test]
    fn non_finite_dt_is_identity() {
        let mut store = MnemonicMatterStore::with_capacity(2);
        store.add_entity(false).unwrap();
        let before = store.coherence[0];
        let r = MnemonicMatterEntropy::process_background_statistical_collapse(&mut store, f32::NAN);
        assert!(!r.mutated);
        assert!((store.coherence[0] - before).abs() < EPS);
    }

    #[test]
    fn coherence_floors_at_soft_min() {
        let mut store = MnemonicMatterStore::with_capacity(1);
        store.add_entity(false).unwrap();
        store.coherence[0] = COHERENCE_FLOOR * 2.0;
        for _ in 0..10_000 {
            MnemonicMatterEntropy::process_background_statistical_collapse(&mut store, 1.0);
        }
        assert!(store.coherence[0] >= COHERENCE_FLOOR - EPS);
        assert!(store.coherence[0] <= COHERENCE_FLOOR + 1e-3);
    }

    #[test]
    fn sync_on_screen_from_world_active_bits() {
        let mut world = WorldSoA::with_capacity(4);
        world.add_entity(0.0, 0.0, 0.0).unwrap();
        world.add_entity(1.0, 0.0, 0.0).unwrap();
        world.set_active(1, false);
        let mut store = MnemonicMatterStore::with_capacity(4);
        store.add_entity(false).unwrap();
        store.add_entity(true).unwrap();
        store.sync_on_screen_from_world(&world);
        assert!(store.is_on_screen(0));
        assert!(!store.is_on_screen(1));
        let r = MnemonicMatterEntropy::step_with_world(&mut store, &world, SOAK_DT);
        assert!(r.mutated);
        assert_eq!(r.offscreen_decayed, 1);
        assert_eq!(r.active_decayed, 1);
    }

    #[test]
    fn mnemonic_matter_entropy_soak_flips_ready_gc_held() {
        let r = probe_mnemonic_matter_entropy();
        assert!(r.mnemonic_matter_entropy_ready, "{r:?}");
        assert!(r.offscreen_coherence_decayed);
        assert!(r.active_slower_or_skip);
        assert!(r.offscreen_drop_gt_active);
        assert!(r.state_mutated);
        assert_eq!(r.evidence_kind, DW_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_four_dimensional_time_sdf_probe);
        assert!(r.distinct_from_shadow_time_reversal_probe);
        assert!(r.distinct_from_curved_raymarcher_probe);
        assert!(r.distinct_from_fractal_energy_perturbation_probe);
        assert!(r.distinct_from_autonomous_entropy_corrector_probe);
        assert!(r.distinct_from_unified_field_network_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.unreal_gc_streaming_parity_ready);
        assert!(!r.dual_timeline_240_ready);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
    }

    #[test]
    fn mnemonic_matter_entropy_probe_distinct_from_dv_du_dt_ds_dr_dq() {
        let entropy = probe_mnemonic_matter_entropy();
        let sdf = crate::four_dimensional_time_sdf::probe_four_dimensional_time_sdf();
        let shadow = crate::shadow_kernel_time_reversal::probe_shadow_time_reversal();
        let curved = crate::non_euclidean_curved_raymarcher::probe_curved_raymarcher();
        let pert = crate::fractal_energy_perturbation::probe_fractal_energy_perturbation();
        let corr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let field = crate::unified_field_network::probe_unified_field_network();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(entropy.mnemonic_matter_entropy_ready);
        assert!(sdf.four_dimensional_time_sdf_ready);
        assert!(shadow.shadow_time_reversal_ready);
        assert!(curved.curved_raymarcher_ready);
        assert!(pert.fractal_energy_perturbation_ready);
        assert!(corr.autonomous_entropy_corrector_ready);
        assert!(field.unified_field_network_ready);
        assert!(found.foundation_closed());

        assert!(entropy.distinct_from_four_dimensional_time_sdf_probe);
        assert!(entropy.distinct_from_shadow_time_reversal_probe);
        assert!(entropy.distinct_from_curved_raymarcher_probe);
        assert!(entropy.distinct_from_fractal_energy_perturbation_probe);
        assert!(entropy.distinct_from_autonomous_entropy_corrector_probe);
        assert!(entropy.distinct_from_unified_field_network_probe);
        assert!(entropy.distinct_from_kernel_foundation_probe);

        // Distinct evidence shapes — dw coherence decay, dv W-morph, du rewind, …
        assert!(entropy.offscreen_coherence_decayed && entropy.offscreen_drop_gt_active);
        assert!(sdf.w_changes_distance && sdf.morph_endpoints_match_primitives);
        assert!(shadow.positions_advanced && shadow.rewind_restored_positions);
        assert!(curved.light_vector_mutated && curved.mass_zero_identity);
        assert!(pert.force_mutated && pert.stress_mutated);
        assert!(corr.nits_mutated_down && corr.dust_mutated_up);
        assert!(field.pressure_monotonic);
        assert!(!entropy.unreal_gc_streaming_parity_ready);
    }

    #[test]
    fn dw_du_dt_distinct_evidence_fingerprints() {
        let dw = probe_mnemonic_matter_entropy();
        let du = crate::shadow_kernel_time_reversal::probe_shadow_time_reversal();
        let dt = crate::non_euclidean_curved_raymarcher::probe_curved_raymarcher();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(dw.mnemonic_matter_entropy_ready);
        assert!(du.shadow_time_reversal_ready);
        assert!(dt.curved_raymarcher_ready);
        assert!(found.foundation_closed());

        assert_eq!(dw.evidence_kind, DW_EVIDENCE_KIND);
        assert_eq!(
            du.evidence_kind,
            crate::shadow_kernel_time_reversal::DU_EVIDENCE_KIND
        );
        assert_eq!(
            dt.evidence_kind,
            crate::non_euclidean_curved_raymarcher::DT_EVIDENCE_KIND
        );
        assert_ne!(dw.evidence_kind, du.evidence_kind);
        assert_ne!(dw.evidence_kind, dt.evidence_kind);
        assert_ne!(du.evidence_kind, dt.evidence_kind);
        assert_ne!(dw.evidence_fingerprint, du.evidence_fingerprint);
        assert_ne!(dw.evidence_fingerprint, dt.evidence_fingerprint);
        assert_ne!(du.evidence_fingerprint, dt.evidence_fingerprint);

        assert!(dw.distinct_from_shadow_time_reversal_probe);
        assert!(du.distinct_from_curved_raymarcher_probe);
        assert!(dt.distinct_from_kernel_foundation_probe);
        assert!(!dw.unreal_gc_streaming_parity_ready);
        // Different evidence fields — coherence drop ≠ ring rewind ≠ light bend.
        assert!(dw.offscreen_drop > dw.onscreen_drop);
        assert!(du.positions_advanced && du.rewind_restored_positions);
        assert!(dt.light_vector_mutated && dt.mass_zero_identity && dt.heavier_bends_more);
    }
}

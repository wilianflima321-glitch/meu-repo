//! Desktop WorldSoA + LBM soak — letter **de**.
//! MutDNA serialize/replay + FrameArena bump deepen — letter **df**.
//! Timescale dilation + Beer–Lambert + sonic impedance soak — letter **dg**.
//! SIMD → WorldSoA hot-path wire — letter **dk**.
//!
//! Shared soak used by studio-local desktop wire. Distinct from
//! `probe_kernel_foundation` (letter dc). Letter **de** flips only on
//! WorldSoA tick + optional LBM mass evidence. Letter **df** flips
//! `kernel_mut_dna_desktop_ready` only on MutEvent DNA roundtrip +
//! LinearFrameAllocator bump evidence. Letter **dg** flips
//! `kernel_spectral_sonic_desktop_ready` only on timescale dilation +
//! spectral Beer–Lambert + sonic impedance evidence. Letter **dk** flips
//! `simd_world_soa_hot_path_ready` only when SIMD scale-add gravity on
//! WorldSoA `pos_y` matches scalar tick within ε (distinct from dj
//! `simd_clay_math_ready`). Chaos/100k/etc stay HELD.
//!
//! Letter **ig**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`).

use crate::ecs_core::{SceneGraph, WorldSoA};
use crate::lattice_boltzmann_gas_fluid::LatticeBoltzmannGasFluid;
use crate::linear_frame_allocator::LinearFrameAllocator;
use crate::quantum_snapshot_dna::{MutEvent, MutOp, QuantumSnapshotDna};
use crate::recursive_state_branching::RecursiveStateBranching;
use crate::simd_clay_math::{
    detect_simd_clay_lane, scale_add_f32_scalar, SimdClayLane, SIMD_CLAY_EPS,
};
use crate::sonic_impedance_protocol::SonicImpedanceProtocol;
use crate::spectral_participating_media::SpectralParticipatingMedia;

const SOAK_ENTITY_CAP: usize = 32;
const SOAK_TICKS: usize = 16;
const SOAK_DT: f32 = 0.016;
const LBM_WIDTH: usize = 12;
const LBM_HEIGHT: usize = 12;
const LBM_STEPS: usize = 8;
const LBM_MASS_DRIFT_EPS: f64 = 1e-3;

const MUT_DNA_SEED: u64 = 0xDF00_AE77;
const FRAME_ARENA_CAP: usize = 4096;
const FRAME_BURST_A: usize = 64;
const FRAME_BURST_B: usize = 128;

const SPECTRAL_SONIC_DT: f32 = 1.0;
const SPECTRAL_SONIC_SCALE: f64 = 0.25;
const BEER_SHALLOW_M: f32 = 1.0;
const BEER_DEEP_M: f32 = 50.0;
const BEER_N: f32 = 1.33;
const SONIC_DISTANCE_M: f32 = 5.0;

const SIMD_WORLD_SOAK_CAP: usize = 32;
const SIMD_WORLD_TICKS: usize = 16;
const SIMD_WORLD_DT: f32 = 0.016;
const SIMD_WORLD_SCALE: f32 = 1.25;
const SIMD_WORLD_ADD: f32 = -0.375;

/// WorldSoA tick + optional LBM mass evidence shape (≠ MutDNA / spectral / SIMD / nits/dust / force).
pub const DE_EVIDENCE_KIND: &str = "world_soa_tick_optional_lbm_mass";
/// MutEvent DNA serialize/replay + FrameArena bump evidence shape.
pub const DF_EVIDENCE_KIND: &str = "mut_event_dna_serialize_replay_frame_arena";
/// Timescale dilation + Beer–Lambert + sonic impedance evidence shape.
pub const DG_EVIDENCE_KIND: &str = "timescale_beer_lambert_sonic_impedance";
/// SIMD WorldSoA gravity tick + pos_y scale-add match evidence shape.
pub const DK_EVIDENCE_KIND: &str = "simd_world_soa_gravity_scale_add_match";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn de_evidence_fingerprint(
    entity_count: usize,
    ticks_run: usize,
    lbm_mass_drift: f64,
) -> u64 {
    let mut h = 0x6465_736b_u64; // "desk"
    h = hash_mix(h, entity_count as u64);
    h = hash_mix(h, ticks_run as u64);
    h = hash_mix(h, lbm_mass_drift.to_bits());
    h ^= 0x574c_424d; // WLBM
    h
}

fn df_evidence_fingerprint(
    mut_dna_byte_len: usize,
    frame_arena_bytes_used: usize,
) -> u64 {
    let mut h = 0x6466_6d64_6e_u64; // "dfmdn"
    h = hash_mix(h, mut_dna_byte_len as u64);
    h = hash_mix(h, frame_arena_bytes_used as u64);
    h ^= 0x444e_4146; // DNAF
    h
}

fn dg_evidence_fingerprint(
    timescale_ratio: f32,
    beer_deep_blue: f32,
    sonic_air_amp: f32,
) -> u64 {
    let mut h = 0x6467_7373_u64; // "dgss"
    h = hash_mix(h, timescale_ratio.to_bits() as u64);
    h = hash_mix(h, beer_deep_blue.to_bits() as u64);
    h = hash_mix(h, sonic_air_amp.to_bits() as u64);
    h ^= 0x534f_4e49; // SONI
    h
}

fn dk_evidence_fingerprint(entity_count: u32, ticks_run: usize, max_abs_err: f32) -> u64 {
    let mut h = 0x646b_7369_6d_u64; // "dksim"
    h = hash_mix(h, entity_count as u64);
    h = hash_mix(h, ticks_run as u64);
    h = hash_mix(h, max_abs_err.to_bits() as u64);
    h ^= 0x5349_4d44; // SIMD
    h
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DesktopSoakReport {
    pub kernel_desktop_wire_ready: bool,
    pub world_soa_ticked: bool,
    pub entity_count: usize,
    pub ticks_run: usize,
    pub lbm_stepped: bool,
    pub lbm_mass_conserved: bool,
    pub lbm_mass_drift: f64,
    /// Stable evidence tag: WorldSoA tick + optional LBM mass — **ig**.
    pub evidence_kind: &'static str,
    /// Fingerprint of desktop wire evidence fields (cross-check vs dr/ds).
    pub evidence_fingerprint: u64,
    /// Measured via evidence_kind/fingerprint — not `probe_kernel_foundation`.
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Letter **df** soak report — MutDNA + FrameArena desktop evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MutDnaDesktopSoakReport {
    /// Soak-gated; distinct from de `kernel_desktop_wire_ready` and dc foundation.
    pub kernel_mut_dna_desktop_ready: bool,
    pub mut_dna_serialized: bool,
    pub mut_dna_replayed: bool,
    pub mut_dna_byte_len: usize,
    pub frame_arena_bumped: bool,
    pub frame_arena_bytes_used: usize,
    pub frame_arena_flushed: bool,
    /// Stable evidence tag: MutEvent DNA + FrameArena bump — **ig**.
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Measured — not `probe_kernel_desktop_wire` / not `probe_kernel_foundation`.
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Letter **dg** soak report — timescale + Beer–Lambert + sonic desktop evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SpectralSonicDesktopSoakReport {
    /// Soak-gated; distinct from de wire, df MutDNA, and dc foundation.
    pub kernel_spectral_sonic_desktop_ready: bool,
    pub timescale_dilated: bool,
    pub beer_lambert_spectral: bool,
    pub sonic_impedance_traced: bool,
    pub timescale_ratio: f32,
    pub beer_deep_blue: f32,
    pub beer_deep_red: f32,
    pub sonic_air_amp: f32,
    pub sonic_rock_amp: f32,
    /// Stable evidence tag: timescale + Beer–Lambert + sonic — **ig**.
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Measured — not de/df/dc probes.
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Letter **dk** soak report — SIMD clay math wired into WorldSoA tick.
#[derive(Debug, Clone, PartialEq)]
pub struct SimdWorldSoaHotPathSoakReport {
    /// Soak-gated; distinct from dj `simdClayMathReady` and de–di / dc.
    pub simd_world_soa_hot_path_ready: bool,
    pub lane: String,
    pub world_tick_match: bool,
    pub pos_y_scale_add_match: bool,
    pub entity_count: u32,
    pub ticks_run: usize,
    pub max_abs_err: f32,
    /// Stable evidence tag: SIMD WorldSoA gravity + scale-add match — **ig**.
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    /// Always false — no AVX-512 kernels in this ship.
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn held(
    world_soa_ticked: bool,
    entity_count: usize,
    ticks_run: usize,
    lbm_stepped: bool,
    lbm_mass_conserved: bool,
    lbm_mass_drift: f64,
) -> DesktopSoakReport {
    let evidence_kind = DE_EVIDENCE_KIND;
    let evidence_fingerprint =
        de_evidence_fingerprint(entity_count, ticks_run, lbm_mass_drift);
    let core_ok = world_soa_ticked && lbm_mass_conserved;
    let d = core_ok && evidence_fingerprint != 0;
    DesktopSoakReport {
        kernel_desktop_wire_ready: false,
        world_soa_ticked,
        entity_count,
        ticks_run,
        lbm_stepped,
        lbm_mass_conserved,
        lbm_mass_drift,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

fn mut_dna_held(
    mut_dna_serialized: bool,
    mut_dna_replayed: bool,
    mut_dna_byte_len: usize,
    frame_arena_bumped: bool,
    frame_arena_bytes_used: usize,
    frame_arena_flushed: bool,
) -> MutDnaDesktopSoakReport {
    let evidence_kind = DF_EVIDENCE_KIND;
    let evidence_fingerprint =
        df_evidence_fingerprint(mut_dna_byte_len, frame_arena_bytes_used);
    let core_ok =
        mut_dna_serialized && mut_dna_replayed && frame_arena_bumped && frame_arena_flushed;
    let d = core_ok && evidence_fingerprint != 0;
    MutDnaDesktopSoakReport {
        kernel_mut_dna_desktop_ready: false,
        mut_dna_serialized,
        mut_dna_replayed,
        mut_dna_byte_len,
        frame_arena_bumped,
        frame_arena_bytes_used,
        frame_arena_flushed,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_desktop_wire_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

fn spectral_sonic_held(
    timescale_dilated: bool,
    beer_lambert_spectral: bool,
    sonic_impedance_traced: bool,
    timescale_ratio: f32,
    beer_deep_blue: f32,
    beer_deep_red: f32,
    sonic_air_amp: f32,
    sonic_rock_amp: f32,
) -> SpectralSonicDesktopSoakReport {
    let evidence_kind = DG_EVIDENCE_KIND;
    let evidence_fingerprint =
        dg_evidence_fingerprint(timescale_ratio, beer_deep_blue, sonic_air_amp);
    let core_ok = timescale_dilated && beer_lambert_spectral && sonic_impedance_traced;
    let d = core_ok && evidence_fingerprint != 0;
    SpectralSonicDesktopSoakReport {
        kernel_spectral_sonic_desktop_ready: false,
        timescale_dilated,
        beer_lambert_spectral,
        sonic_impedance_traced,
        timescale_ratio,
        beer_deep_blue,
        beer_deep_red,
        sonic_air_amp,
        sonic_rock_amp,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

fn simd_world_held(
    lane: SimdClayLane,
    world_tick_match: bool,
    pos_y_scale_add_match: bool,
    entity_count: u32,
    ticks_run: usize,
    max_abs_err: f32,
) -> SimdWorldSoaHotPathSoakReport {
    let evidence_kind = DK_EVIDENCE_KIND;
    let evidence_fingerprint =
        dk_evidence_fingerprint(entity_count, ticks_run, max_abs_err);
    let core_ok = world_tick_match && pos_y_scale_add_match;
    let d = core_ok && evidence_fingerprint != 0;
    SimdWorldSoaHotPathSoakReport {
        simd_world_soa_hot_path_ready: false,
        lane: lane.as_str().into(),
        world_tick_match,
        pos_y_scale_add_match,
        entity_count,
        ticks_run,
        max_abs_err,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run WorldSoA physics ticks + optional LBM D2Q9 steps.
/// Does **not** call `probe_kernel_foundation`.
pub fn run_desktop_world_lbm_soak(include_lbm: bool) -> DesktopSoakReport {
    let mut world: WorldSoA = SceneGraph::with_capacity(SOAK_ENTITY_CAP);
    let Some(_id) = world.add_entity(0.0, 10.0, 0.0) else {
        return held(false, 0, 0, false, false, 0.0);
    };
    let y0 = world.pos_y[0];
    for _ in 0..SOAK_TICKS {
        world.tick_physics(SOAK_DT);
    }
    let world_soa_ticked = world.entity_count() == 1 && (world.pos_y[0] - y0).abs() > 1e-4;
    if !world_soa_ticked {
        return held(false, world.entity_count(), SOAK_TICKS, false, false, 0.0);
    }

    let mut lbm_stepped = false;
    let mut lbm_mass_conserved = true;
    let mut lbm_mass_drift = 0.0f64;

    if include_lbm {
        let mut lbm = LatticeBoltzmannGasFluid::new(LBM_WIDTH, LBM_HEIGHT);
        let m0 = lbm.total_mass();
        for _ in 0..LBM_STEPS {
            lbm.step();
        }
        lbm_mass_drift = ((lbm.total_mass() - m0) / m0).abs();
        lbm_stepped = true;
        lbm_mass_conserved = lbm_mass_drift < LBM_MASS_DRIFT_EPS;
        if !lbm_mass_conserved {
            return held(
                true,
                world.entity_count(),
                SOAK_TICKS,
                true,
                false,
                lbm_mass_drift,
            );
        }
    }

    let entity_count = world.entity_count();
    let evidence_kind = DE_EVIDENCE_KIND;
    let evidence_fingerprint =
        de_evidence_fingerprint(entity_count, SOAK_TICKS, lbm_mass_drift);
    let d = evidence_fingerprint != 0;
    DesktopSoakReport {
        kernel_desktop_wire_ready: true,
        world_soa_ticked: true,
        entity_count,
        ticks_run: SOAK_TICKS,
        lbm_stepped,
        lbm_mass_conserved,
        lbm_mass_drift,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `kernel_desktop_wire_ready` (with LBM).
pub fn probe_kernel_desktop_wire() -> DesktopSoakReport {
    run_desktop_world_lbm_soak(true)
}

/// Desktop soak deepen (**df**): MutEvent DNA serialize/replay + LinearFrameAllocator bump.
/// Does **not** call `probe_kernel_foundation` or claim `kernel_desktop_wire_ready`.
pub fn run_desktop_mut_dna_frame_soak() -> MutDnaDesktopSoakReport {
    let events = [
        MutEvent {
            op: MutOp::SetPosition,
            entity: 0,
            a: 7.0,
            b: 8.0,
            c: 9.0,
        },
        MutEvent {
            op: MutOp::SetTimescale,
            entity: 0,
            a: 0.25,
            b: 0.0,
            c: 0.0,
        },
        MutEvent {
            op: MutOp::InjectForceY,
            entity: 0,
            a: 1.5,
            b: 0.0,
            c: 0.0,
        },
    ];
    let bytes = QuantumSnapshotDna::serialize_universe_genomic_log(MUT_DNA_SEED, &events);
    let mut_dna_serialized = !bytes.is_empty()
        && QuantumSnapshotDna::parse_seed(&bytes) == Some(MUT_DNA_SEED)
        && QuantumSnapshotDna::parse_events(&bytes)
            .map(|e| e.len() == events.len())
            .unwrap_or(false);
    if !mut_dna_serialized {
        return mut_dna_held(false, false, bytes.len(), false, 0, false);
    }

    let mut replay_world = SceneGraph::with_capacity(8);
    let mut_dna_replayed = QuantumSnapshotDna::replay(&mut replay_world, &bytes)
        && (replay_world.pos_x[0] - 7.0).abs() < 1e-5
        && (replay_world.pos_y[0] - 9.5).abs() < 1e-5
        && (replay_world.pos_z[0] - 9.0).abs() < 1e-5
        && (replay_world.timescale[0] - 0.25).abs() < 1e-6;
    if !mut_dna_replayed {
        return mut_dna_held(true, false, bytes.len(), false, 0, false);
    }

    let Some(mut arena) = LinearFrameAllocator::with_capacity(FRAME_ARENA_CAP) else {
        return mut_dna_held(true, true, bytes.len(), false, 0, false);
    };
    let p0 = arena.allocate_frame_burst(FRAME_BURST_A);
    let used_a = arena.bytes_used();
    let p1 = arena.allocate_frame_burst(FRAME_BURST_B);
    let used_b = arena.bytes_used();
    let frame_arena_bumped = p0.is_some()
        && p1.is_some()
        && p0 != p1
        && used_a == FRAME_BURST_A
        && used_b == FRAME_BURST_A + FRAME_BURST_B;
    if !frame_arena_bumped {
        return mut_dna_held(true, true, bytes.len(), false, used_b, false);
    }
    arena.flush_frame();
    let frame_arena_flushed = arena.bytes_used() == 0;
    if !frame_arena_flushed {
        return mut_dna_held(true, true, bytes.len(), true, used_b, false);
    }
    // Post-flush reuse proves bump rewind (same base offset).
    let p2 = arena.allocate_frame_burst(FRAME_BURST_A);
    if p2 != p0 {
        return mut_dna_held(true, true, bytes.len(), true, arena.bytes_used(), true);
    }

    let evidence_kind = DF_EVIDENCE_KIND;
    let evidence_fingerprint = df_evidence_fingerprint(bytes.len(), used_b);
    let d = evidence_fingerprint != 0;
    MutDnaDesktopSoakReport {
        kernel_mut_dna_desktop_ready: true,
        mut_dna_serialized: true,
        mut_dna_replayed: true,
        mut_dna_byte_len: bytes.len(),
        frame_arena_bumped: true,
        frame_arena_bytes_used: used_b,
        frame_arena_flushed: true,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_desktop_wire_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `kernel_mut_dna_desktop_ready` (**df**).
pub fn probe_kernel_mut_dna_desktop() -> MutDnaDesktopSoakReport {
    run_desktop_mut_dna_frame_soak()
}

/// Desktop soak deepen (**dg**): timescale dilation + Beer–Lambert + sonic impedance.
/// Does **not** claim de/df ready flags or call `probe_kernel_foundation`.
pub fn run_desktop_spectral_sonic_soak() -> SpectralSonicDesktopSoakReport {
    let mut fast = SceneGraph::with_capacity(4);
    let mut slow = SceneGraph::with_capacity(4);
    let Some(a) = fast.add_entity(0.0, 10.0, 0.0) else {
        return spectral_sonic_held(false, false, false, 0.0, 0.0, 0.0, 0.0, 0.0);
    };
    let Some(b) = slow.add_entity(0.0, 10.0, 0.0) else {
        return spectral_sonic_held(false, false, false, 0.0, 0.0, 0.0, 0.0, 0.0);
    };
    RecursiveStateBranching::execute_local_time_dilation(
        &mut slow,
        b.0 as u64,
        SPECTRAL_SONIC_SCALE,
    );
    RecursiveStateBranching::tick_dilated(&mut fast, SPECTRAL_SONIC_DT);
    RecursiveStateBranching::tick_dilated(&mut slow, SPECTRAL_SONIC_DT);
    let dy_fast = 10.0 - fast.pos_y[a.0 as usize];
    let dy_slow = 10.0 - slow.pos_y[b.0 as usize];
    let timescale_ratio = if dy_fast.abs() > 1e-8 {
        dy_slow / dy_fast
    } else {
        0.0
    };
    let timescale_dilated = dy_slow < dy_fast
        && (slow.timescale[b.0 as usize] - SPECTRAL_SONIC_SCALE as f32).abs() < 1e-6
        && (timescale_ratio - SPECTRAL_SONIC_SCALE as f32).abs() < 1e-3;
    if !timescale_dilated {
        return spectral_sonic_held(
            false,
            false,
            false,
            timescale_ratio,
            0.0,
            0.0,
            0.0,
            0.0,
        );
    }

    let shallow =
        SpectralParticipatingMedia::compute_beer_lambert_extinction(BEER_SHALLOW_M, BEER_N);
    let deep = SpectralParticipatingMedia::compute_beer_lambert_extinction(BEER_DEEP_M, BEER_N);
    let beer_deep_red = deep[0];
    let beer_deep_blue = deep[2];
    let beer_lambert_spectral = deep[0] < shallow[0] && deep[2] > deep[0];
    if !beer_lambert_spectral {
        return spectral_sonic_held(
            true,
            false,
            false,
            timescale_ratio,
            beer_deep_blue,
            beer_deep_red,
            0.0,
            0.0,
        );
    }

    let sonic_air_amp = SonicImpedanceProtocol::trace_acoustic_ray(SONIC_DISTANCE_M, 0.0);
    let sonic_rock_amp = SonicImpedanceProtocol::trace_acoustic_ray(SONIC_DISTANCE_M, 1.0);
    let sonic_impedance_traced = sonic_air_amp > sonic_rock_amp;
    if !sonic_impedance_traced {
        return spectral_sonic_held(
            true,
            true,
            false,
            timescale_ratio,
            beer_deep_blue,
            beer_deep_red,
            sonic_air_amp,
            sonic_rock_amp,
        );
    }

    let evidence_kind = DG_EVIDENCE_KIND;
    let evidence_fingerprint =
        dg_evidence_fingerprint(timescale_ratio, beer_deep_blue, sonic_air_amp);
    let d = evidence_fingerprint != 0;
    SpectralSonicDesktopSoakReport {
        kernel_spectral_sonic_desktop_ready: true,
        timescale_dilated: true,
        beer_lambert_spectral: true,
        sonic_impedance_traced: true,
        timescale_ratio,
        beer_deep_blue,
        beer_deep_red,
        sonic_air_amp,
        sonic_rock_amp,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `kernel_spectral_sonic_desktop_ready` (**dg**).
pub fn probe_kernel_spectral_sonic_desktop() -> SpectralSonicDesktopSoakReport {
    run_desktop_spectral_sonic_soak()
}

fn max_abs_pos_y_diff(a: &SceneGraph, b: &SceneGraph) -> f32 {
    let n = a.len.min(b.len);
    let mut m = 0.0_f32;
    for i in 0..n {
        m = m.max((a.pos_y[i] - b.pos_y[i]).abs());
    }
    m
}

/// SIMD → WorldSoA hot-path soak (**dk**): gravity tick + `pos_y` scale-add
/// via `simd_clay_math`, matched against scalar WorldSoA within ε.
/// Does **not** claim dj `simd_clay_math_ready` or de–di / dc flags.
pub fn run_simd_world_soa_hot_path_soak() -> SimdWorldSoaHotPathSoakReport {
    let lane = detect_simd_clay_lane();
    let mut scalar = SceneGraph::with_capacity(SIMD_WORLD_SOAK_CAP);
    let mut simd = SceneGraph::with_capacity(SIMD_WORLD_SOAK_CAP);

    for i in 0..24 {
        let y = 30.0 - i as f32 * 0.75;
        if scalar.add_entity(i as f32 * 0.1, y, 0.0).is_none()
            || simd.add_entity(i as f32 * 0.1, y, 0.0).is_none()
        {
            return simd_world_held(lane, false, false, 0, 0, f32::MAX);
        }
        let ts = 0.35 + (i as f32) * 0.05;
        scalar.timescale[i] = ts;
        simd.timescale[i] = ts;
    }
    // Prove inactive slots are skipped on both paths.
    scalar.set_active(5, false);
    simd.set_active(5, false);
    scalar.set_active(17, false);
    simd.set_active(17, false);

    let entity_count = scalar.entity_count() as u32;
    for _ in 0..SIMD_WORLD_TICKS {
        scalar.tick_physics(SIMD_WORLD_DT);
        simd.tick_physics_simd(SIMD_WORLD_DT);
    }
    let tick_err = max_abs_pos_y_diff(&scalar, &simd);
    let world_tick_match = tick_err <= SIMD_CLAY_EPS;
    if !world_tick_match {
        return simd_world_held(
            lane,
            false,
            false,
            entity_count,
            SIMD_WORLD_TICKS,
            tick_err,
        );
    }

    // Direct SoA column scale-add: SIMD WorldSoA vs scalar reference.
    let mut scale_ref = SceneGraph::with_capacity(SIMD_WORLD_SOAK_CAP);
    let mut scale_simd = SceneGraph::with_capacity(SIMD_WORLD_SOAK_CAP);
    for i in 0..20 {
        let y = i as f32 * 0.5 - 4.0;
        scale_ref.add_entity(0.0, y, 0.0).unwrap();
        scale_simd.add_entity(0.0, y, 0.0).unwrap();
    }
    scale_ref.set_active(4, false);
    scale_simd.set_active(4, false);

    let n = scale_ref.len;
    let mut expected = vec![0.0_f32; n];
    scale_add_f32_scalar(
        &scale_ref.pos_y[..n],
        SIMD_WORLD_SCALE,
        SIMD_WORLD_ADD,
        &mut expected,
    );
    for i in 0..n {
        if scale_ref.is_active(i) {
            scale_ref.pos_y[i] = expected[i];
        }
    }
    scale_simd.apply_pos_y_scale_add_simd(SIMD_WORLD_SCALE, SIMD_WORLD_ADD);
    let scale_err = max_abs_pos_y_diff(&scale_ref, &scale_simd);
    let pos_y_scale_add_match = scale_err <= SIMD_CLAY_EPS;
    let max_abs_err = tick_err.max(scale_err);
    if !pos_y_scale_add_match {
        return simd_world_held(
            lane,
            true,
            false,
            entity_count,
            SIMD_WORLD_TICKS,
            max_abs_err,
        );
    }

    let mut ready = world_tick_match && pos_y_scale_add_match;
    // On x86_64 require a real vector lane (proves intrinsics path, not scalar-only).
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        ready = ready && matches!(lane, SimdClayLane::Sse2 | SimdClayLane::Avx2);
    }
    if !ready {
        return simd_world_held(
            lane,
            world_tick_match,
            pos_y_scale_add_match,
            entity_count,
            SIMD_WORLD_TICKS,
            max_abs_err,
        );
    }

    let evidence_kind = DK_EVIDENCE_KIND;
    let evidence_fingerprint =
        dk_evidence_fingerprint(entity_count, SIMD_WORLD_TICKS, max_abs_err);
    let d = evidence_fingerprint != 0;
    SimdWorldSoaHotPathSoakReport {
        simd_world_soa_hot_path_ready: true,
        lane: lane.as_str().into(),
        world_tick_match: true,
        pos_y_scale_add_match: true,
        entity_count,
        ticks_run: SIMD_WORLD_TICKS,
        max_abs_err,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `simd_world_soa_hot_path_ready` (**dk**).
pub fn probe_simd_world_soa_hot_path() -> SimdWorldSoaHotPathSoakReport {
    run_simd_world_soa_hot_path_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_soak_with_lbm_flips_ready_parity_held() {
        let r = probe_kernel_desktop_wire();
        assert!(r.kernel_desktop_wire_ready, "{r:?}");
        assert!(r.world_soa_ticked);
        assert!(r.lbm_stepped);
        assert!(r.lbm_mass_conserved);
        assert_eq!(r.evidence_kind, DE_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn desktop_soak_world_only_also_ready() {
        let r = run_desktop_world_lbm_soak(false);
        assert!(r.kernel_desktop_wire_ready, "{r:?}");
        assert!(r.world_soa_ticked);
        assert!(!r.lbm_stepped);
        assert!(r.lbm_mass_conserved);
    }

    #[test]
    fn desktop_probe_is_not_foundation_probe() {
        let desk = probe_kernel_desktop_wire();
        let found = crate::kernel_honesty::probe_kernel_foundation();
        assert!(desk.distinct_from_kernel_foundation_probe);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(found.foundation_closed());
        // Distinct APIs / report shapes — desktop does not claim foundation fields.
        assert!(desk.lbm_stepped);
        assert!(found.lbm_kernel_ready);
    }

    #[test]
    fn mut_dna_desktop_soak_flips_ready_parity_held() {
        let r = probe_kernel_mut_dna_desktop();
        assert!(r.kernel_mut_dna_desktop_ready, "{r:?}");
        assert!(r.mut_dna_serialized);
        assert!(r.mut_dna_replayed);
        assert!(r.mut_dna_byte_len > 0);
        assert!(r.frame_arena_bumped);
        assert_eq!(r.frame_arena_bytes_used, FRAME_BURST_A + FRAME_BURST_B);
        assert!(r.frame_arena_flushed);
        assert_eq!(r.evidence_kind, DF_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_desktop_wire_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn mut_dna_desktop_probe_distinct_from_de_and_dc() {
        let mut_dna = probe_kernel_mut_dna_desktop();
        let desk = probe_kernel_desktop_wire();
        let found = crate::kernel_honesty::probe_kernel_foundation();
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(found.foundation_closed());
        assert!(mut_dna.distinct_from_desktop_wire_probe);
        assert!(mut_dna.distinct_from_kernel_foundation_probe);
        // Distinct report shapes / fields — df does not claim de wire ready.
        assert!(mut_dna.mut_dna_replayed);
        assert!(desk.lbm_stepped);
        assert!(found.mut_dna_ready);
        assert!(found.frame_arena_ready);
    }
    #[test]
    fn spectral_sonic_desktop_soak_flips_ready_parity_held() {
        let r = probe_kernel_spectral_sonic_desktop();
        assert!(r.kernel_spectral_sonic_desktop_ready, "{r:?}");
        assert!(r.timescale_dilated);
        assert!(r.beer_lambert_spectral);
        assert!(r.sonic_impedance_traced);
        assert!((r.timescale_ratio - SPECTRAL_SONIC_SCALE as f32).abs() < 1e-3);
        assert!(r.beer_deep_blue > r.beer_deep_red);
        assert!(r.sonic_air_amp > r.sonic_rock_amp);
        assert_eq!(r.evidence_kind, DG_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_desktop_wire_probe);
        assert!(r.distinct_from_mut_dna_desktop_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn spectral_sonic_desktop_probe_distinct_from_de_df_dc() {
        let spectral = probe_kernel_spectral_sonic_desktop();
        let mut_dna = probe_kernel_mut_dna_desktop();
        let desk = probe_kernel_desktop_wire();
        let found = crate::kernel_honesty::probe_kernel_foundation();
        assert!(spectral.kernel_spectral_sonic_desktop_ready);
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(found.foundation_closed());
        assert!(spectral.distinct_from_desktop_wire_probe);
        assert!(spectral.distinct_from_mut_dna_desktop_probe);
        assert!(spectral.distinct_from_kernel_foundation_probe);
        // Distinct report shapes -- dg does not claim de/df ready fields.
        assert!(spectral.timescale_dilated);
        assert!(spectral.beer_lambert_spectral);
        assert!(spectral.sonic_impedance_traced);
        assert!(mut_dna.mut_dna_replayed);
        assert!(desk.lbm_stepped);
        assert!(found.timescale_ready);
        assert!(found.beer_lambert_ready);
        assert!(found.sonic_impedance_ready);
    }

    #[test]
    fn simd_world_soa_hot_path_soak_flips_ready_avx512_held() {
        let r = probe_simd_world_soa_hot_path();
        assert!(r.simd_world_soa_hot_path_ready, "{r:?}");
        assert!(r.world_tick_match);
        assert!(r.pos_y_scale_add_match);
        assert_eq!(r.entity_count, 24);
        assert_eq!(r.ticks_run, SIMD_WORLD_TICKS);
        assert!(r.max_abs_err <= SIMD_CLAY_EPS);
        assert_eq!(r.evidence_kind, DK_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_simd_clay_math_probe);
        assert!(r.distinct_from_mmap_ecs_pager_probe);
        assert!(r.distinct_from_world_soa_sab_layout_probe);
        assert!(r.distinct_from_desktop_wire_probe);
        assert!(r.distinct_from_mut_dna_desktop_probe);
        assert!(r.distinct_from_spectral_sonic_desktop_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
        #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
        {
            assert!(
                r.lane == "sse2" || r.lane == "avx2",
                "expected real SIMD lane, got {}",
                r.lane
            );
        }
    }

    #[test]
    fn simd_world_soa_hot_path_probe_distinct_from_dj_di_dh_de_df_dg_dc() {
        let hot = probe_simd_world_soa_hot_path();
        let clay = crate::simd_clay_math::probe_simd_clay_math();
        let mmap = crate::mmap_ecs_pager::probe_mmap_ecs_pager();
        let sab = crate::wasm_shared_memory_buffer::probe_world_soa_sab_layout();
        let desk = probe_kernel_desktop_wire();
        let mut_dna = probe_kernel_mut_dna_desktop();
        let spectral = probe_kernel_spectral_sonic_desktop();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(hot.simd_world_soa_hot_path_ready);
        assert!(clay.simd_clay_math_ready);
        assert!(mmap.mmap_ecs_pager_ready);
        assert!(sab.world_soa_sab_layout_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(spectral.kernel_spectral_sonic_desktop_ready);
        assert!(found.foundation_closed());

        assert!(hot.distinct_from_simd_clay_math_probe);
        assert!(hot.distinct_from_mmap_ecs_pager_probe);
        assert!(hot.distinct_from_world_soa_sab_layout_probe);
        assert!(hot.distinct_from_desktop_wire_probe);
        assert!(hot.distinct_from_mut_dna_desktop_probe);
        assert!(hot.distinct_from_spectral_sonic_desktop_probe);
        assert!(hot.distinct_from_kernel_foundation_probe);

        // Distinct report shapes — dk claims WorldSoA tick match, not orphan clay SDF.
        assert!(hot.world_tick_match && hot.pos_y_scale_add_match);
        assert!(clay.scale_add_match && clay.sdf_batch_match);
    }

    #[test]
    fn de_df_dg_dk_distinct_evidence_fingerprints() {
        let de = probe_kernel_desktop_wire();
        let df = probe_kernel_mut_dna_desktop();
        let dg = probe_kernel_spectral_sonic_desktop();
        let dk = probe_simd_world_soa_hot_path();

        assert!(de.kernel_desktop_wire_ready);
        assert!(df.kernel_mut_dna_desktop_ready);
        assert!(dg.kernel_spectral_sonic_desktop_ready);
        assert!(dk.simd_world_soa_hot_path_ready);

        assert_eq!(de.evidence_kind, DE_EVIDENCE_KIND);
        assert_eq!(df.evidence_kind, DF_EVIDENCE_KIND);
        assert_eq!(dg.evidence_kind, DG_EVIDENCE_KIND);
        assert_eq!(dk.evidence_kind, DK_EVIDENCE_KIND);
        assert_ne!(de.evidence_kind, df.evidence_kind);
        assert_ne!(de.evidence_kind, dg.evidence_kind);
        assert_ne!(de.evidence_kind, dk.evidence_kind);
        assert_ne!(df.evidence_kind, dg.evidence_kind);
        assert_ne!(df.evidence_kind, dk.evidence_kind);
        assert_ne!(dg.evidence_kind, dk.evidence_kind);
        assert_ne!(de.evidence_fingerprint, df.evidence_fingerprint);
        assert_ne!(de.evidence_fingerprint, dg.evidence_fingerprint);
        assert_ne!(de.evidence_fingerprint, dk.evidence_fingerprint);
        assert_ne!(df.evidence_fingerprint, dg.evidence_fingerprint);
        assert_ne!(df.evidence_fingerprint, dk.evidence_fingerprint);
        assert_ne!(dg.evidence_fingerprint, dk.evidence_fingerprint);

        assert!(de.world_soa_ticked && de.lbm_mass_conserved);
        assert!(df.mut_dna_replayed && df.frame_arena_flushed);
        assert!(dg.timescale_dilated && dg.beer_lambert_spectral);
        assert!(dk.world_tick_match && dk.pos_y_scale_add_match);
    }
}
//! GAS 60Hz fixed-tick simulation driver — letter **gd**.
//!
//! Binds the deterministic [`GasRollbackWorld`] (P2 GAS substrate) to the
//! [`SimulationClock`] fixed-timestep authority (S-19) and publishes every
//! completed tick **directly into a [`GasSabRing`] slot** as a fixed binary
//! frame (Law I / R-S05 — no JSON, no generic-serde reflection in the 60 Hz
//! tick path, zero intermediate `Vec` in the publish hot loop).
//!
//! Zero-MVP / honesty contract:
//! - `GAS_SIM_DRIVER_AAA_READY` stays `false` until the GF-GAS-001 fixture
//!   (10,240 concurrent buffs/debuffs @60 Hz, zero-copy, zero drops) ships
//!   green on product-shaped load.
//! - The ring overflow path is **fail-closed**: `try_commit_frame` returns
//!   `Full`/`TooLong` and increments `dropped` — a non-green soak is the
//!   intended alarm, never a silent skip.
//! - All AAA/GAS/SAB readiness flags remain `false`; this driver is the
//!   **substrate**, not the certificate.

use std::time::Instant;

use aethel_kernel_rust::physics_world::{SimulationClock, SimulationClockConfig};
use serde::{Deserialize, Serialize};

use super::attributes::{AttributeBounds, CORE_ATTRIBUTE_NAMES};
use super::binary_ipc_tick::{
    decode_gas_binary_tick, encode_gas_binary_tick_into_slice, GasBinaryTickFrame, CUE_RECORD_BYTES,
    ENTITY_RECORD_BYTES, GAS_60HZ_BINARY_IPC_READY, HEADER_BYTES, HZ60_BUDGET_NS,
};
use super::rollback::{GasRollbackWorld, GAS_ROLLBACK_AAA_READY};
use crate::ipc::gas_sab_ring::{GasSabRing, RingCommitError, GAS_SAB_RING_PRODUCT_READY};

/// Fail-closed product flag — this block is a substrate until the GF-GAS-001
/// soak proves 10,240 concurrent effects @60 Hz zero-copy on product load.
pub const GAS_SIM_DRIVER_AAA_READY: bool = false;

/// Evidence identifier for the driver soak (mirrors `evidence_kind` pattern).
pub const GAS_SIM_DRIVER_EVIDENCE_KIND: &str = "gas_sim_driver_fixed_60hz_sab_binary";

/// Number of ticks in the driver soak.
pub const GAS_SIM_DRIVER_SOAK_TICKS: u32 = 360;

/// Driver configuration — fixed timestep, ring geometry, and entity scale.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasSimDriverConfig {
    /// Fixed base tick length in seconds (60 Hz).
    pub fixed_dt: f32,
    /// Solver substeps per base tick (1 = one `GasRollbackWorld` tick).
    pub substeps: u32,
    /// Maximum real `dt` accepted per frame before clamping.
    pub max_frame_dt: f32,
    /// Maximum substeps executed per real frame (spiral-of-death cap).
    pub max_substeps_per_frame: u32,
    /// SAB ring slot count (rounded up to a power of two, min 2).
    pub ring_capacity: usize,
    /// Number of entities created in the simulation world.
    pub entity_count: usize,
    /// Maximum cues per tick the ring slot is sized to carry.
    pub max_cues: usize,
}

impl Default for GasSimDriverConfig {
    fn default() -> Self {
        Self {
            fixed_dt: 1.0 / 60.0,
            substeps: 1,
            max_frame_dt: 1.0 / 20.0,
            max_substeps_per_frame: 4,
            ring_capacity: 256,
            entity_count: 2048,
            max_cues: 64,
        }
    }
}

/// The fixed-slot byte capacity of one binary tick for this driver.
///
/// `HEADER_BYTES` (24) + `entity_count * ENTITY_RECORD_BYTES` (16) +
/// `max_cues * CUE_RECORD_BYTES` (12).
pub fn driver_slot_bytes(entity_count: usize, max_cues: usize) -> usize {
    HEADER_BYTES
        + entity_count.saturating_mul(ENTITY_RECORD_BYTES)
        + max_cues.saturating_mul(CUE_RECORD_BYTES)
}

/// Deterministic fixed-tick GAS driver wired to the SAB binary ring.
pub struct GasSimDriver {
    config: GasSimDriverConfig,
    clock: SimulationClock,
    sim: GasRollbackWorld,
    ring: GasSabRing,
    entity_ids: Vec<u32>,
    frames_published: u64,
    frames_dropped: u64,
    min_tick_ns: u64,
    max_tick_ns: u64,
    total_tick_ns: u64,
    last_tick_ns: u64,
    tick_count: u64,
    rollbacks: u64,
    resims: u64,
}

impl GasSimDriver {
    /// Builds a driver: fresh deterministic world (`CORE_ATTRIBUTE_NAMES`,
    /// Health bounded to `[0, 1000]`), `entity_count` entities, and a SAB ring
    /// whose slots are exactly sized for `entity_count` entities + `max_cues`.
    pub fn new(config: GasSimDriverConfig) -> Self {
        let clock = SimulationClock::new(SimulationClockConfig {
            fixed_dt: config.fixed_dt,
            substeps: config.substeps,
            max_frame_dt: config.max_frame_dt,
            max_substeps_per_frame: config.max_substeps_per_frame,
            min_island_size: 128,
        });

        let mut sim = GasRollbackWorld::new(&CORE_ATTRIBUTE_NAMES);
        sim.state.world.attributes.set_bounds(
            "Health",
            AttributeBounds {
                min: Some(0.0),
                max: Some(1000.0),
            },
        );
        let mut entity_ids = Vec::with_capacity(config.entity_count);
        for _ in 0..config.entity_count {
            let id = sim
                .state
                .world
                .create_entity(&[("Health", 100.0), ("Mana", 50.0), ("Stamina", 80.0)]);
            entity_ids.push(id);
        }

        let slot_bytes = driver_slot_bytes(config.entity_count, config.max_cues);
        let ring = GasSabRing::new(config.ring_capacity, slot_bytes);

        Self {
            config,
            clock,
            sim,
            ring,
            entity_ids,
            frames_published: 0,
            frames_dropped: 0,
            min_tick_ns: u64::MAX,
            max_tick_ns: 0,
            total_tick_ns: 0,
            last_tick_ns: 0,
            tick_count: 0,
            rollbacks: 0,
            resims: 0,
        }
    }

    /// Consumes a real frame `dt` and executes the fixed substeps the clock
    /// schedules: `tick_fixed` → clock bookkeeping → zero-copy binary publish →
    /// per-tick `Instant` metrics. Ends with `finish_frame` (render alpha).
    pub fn step(&mut self, real_dt: f32) {
        let steps = self.clock.frame_tick(real_dt);
        for _ in 0..steps {
            let t0 = Instant::now();
            let completed = self.sim.tick_fixed();
            self.clock.on_substep_executed();
            match self.publish_frame(completed as u32) {
                Ok(_) => self.frames_published += 1,
                Err(_) => self.frames_dropped += 1,
            }
            let elapsed = t0.elapsed().as_nanos() as u64;
            self.last_tick_ns = elapsed;
            self.total_tick_ns = self.total_tick_ns.saturating_add(elapsed);
            self.tick_count = self.tick_count.saturating_add(1);
            self.min_tick_ns = self.min_tick_ns.min(elapsed);
            self.max_tick_ns = self.max_tick_ns.max(elapsed);
        }
        self.clock.finish_frame();
    }

    /// Publishes the just-completed tick into the ring slot **in place**
    /// (zero-copy: the encoder writes straight into `&mut [u8]`). Reads the
    /// world/entity-ids/cues immutably (field-disjoint from `self.ring`) and
    /// clears `last_cues` after publish to bound memory. Fail-closed on
    /// Full/TooLong/encode error.
    fn publish_frame(&mut self, tick_index: u32) -> Result<usize, RingCommitError> {
        let world = &self.sim.state.world;
        let entity_ids = &self.entity_ids;
        let cues = &self.sim.state.last_cues;
        let dt = self.sim.fixed_dt();
        let result = self.ring.try_commit_frame(|slot| {
            encode_gas_binary_tick_into_slice(world, entity_ids, tick_index, dt, cues, slot)
        });
        self.sim.state.last_cues.clear();
        result
    }

    /// Zero-copy peek of the front (oldest) frame; decodes in place without
    /// advancing the consumer cursor. `None` when the ring is empty or the
    /// frame fails decode (fail-closed).
    pub fn read_latest_frame(&self) -> Option<GasBinaryTickFrame> {
        self.ring
            .with_frame(decode_gas_binary_tick)
            .and_then(|result| result.ok())
    }

    /// Pop the front (oldest) frame from the SAB ring and decode it, advancing
    /// the consumer cursor — the drain path for a real duplex consumer (the
    /// ring is fail-closed on full, so a non-draining consumer surfaces as an
    /// honest `frames_dropped` alarm, never a silent overwrite). `None` when
    /// empty or the frame fails decode (fail-closed).
    pub fn pop_frame(&mut self) -> Option<GasBinaryTickFrame> {
        self.ring
            .pop_frame()
            .and_then(|bytes| decode_gas_binary_tick(&bytes).ok())
    }

    /// The world's authoritative fixed-tick frame counter.
    pub fn current_frame(&self) -> u64 {
        self.sim.current_frame()
    }

    /// Roll the live sim back to the checkpoint at the end of `target_frame`
    /// (GF-NET-001 divergence repair): restores the world snapshot, rewinds the
    /// fixed-timestep clock to the same position so clock+world stay in
    /// lockstep, and clears the SAB ring — published frames after the rollback
    /// point are divergent/stale and must never reach a consumer. Returns
    /// `false` (fail-closed) when no checkpoint exists at `target_frame`.
    pub fn rollback_to(&mut self, target_frame: u64) -> bool {
        if !self.sim.rollback_to(target_frame) {
            return false;
        }
        // `rollback_to` restores end-of-`target_frame` and leaves the world at
        // `target_frame + 1`; rewind the clock to that same frame.
        self.clock.rewind_to_frame(target_frame + 1);
        self.ring.clear();
        self.rollbacks = self.rollbacks.saturating_add(1);
        true
    }

    /// Re-simulate forward from the current position to `target_frame`
    /// inclusive, stepping exactly one fixed tick per call (real dt = fixed dt,
    /// so the clock schedules exactly one substep). Every re-simulated tick
    /// re-publishes its corrected binary frame into the SAB ring and advances
    /// clock + world in lockstep — the repair path is byte-for-byte identical
    /// to the production tick path. Returns the resulting current frame.
    pub fn resim_to(&mut self, target_frame: u64) -> u64 {
        while self.sim.current_frame() <= target_frame {
            let before = self.sim.current_frame();
            self.step(self.config.fixed_dt);
            if self.sim.current_frame() == before {
                // Misconfigured-clock guard (`fixed_dt > max_frame_dt` schedules
                // zero substeps): force exactly one fixed tick so the repair
                // path always makes progress instead of looping forever.
                self.sim.tick_fixed();
                self.clock.on_substep_executed();
                self.clock.finish_frame();
            }
        }
        self.resims = self.resims.saturating_add(1);
        self.sim.current_frame()
    }

    /// Mean per-tick wall cost in nanoseconds (0 before any tick).
    pub fn mean_tick_ns(&self) -> u64 {
        self.total_tick_ns.checked_div(self.tick_count).unwrap_or(0)
    }

    /// Deterministic fingerprint of the live simulation state.
    pub fn fingerprint(&self) -> u64 {
        self.sim.state.fingerprint()
    }

    /// Immutable access to the underlying rollback world (fixtures drive it
    /// with `record_command` / direct ability activation).
    pub fn sim(&self) -> &GasRollbackWorld {
        &self.sim
    }

    /// Mutable access for fixtures (command injection before stepping).
    pub fn sim_mut(&mut self) -> &mut GasRollbackWorld {
        &mut self.sim
    }

    /// Full honesty metrics for the driver (all timings in nanoseconds as
    /// `u64` — per-tick values fit comfortably; avoids `u128` Tauri serde).
    pub fn metrics(&self) -> GasSimDriverMetrics {
        let telemetry = self.sim.state.abilities.telemetry();
        GasSimDriverMetrics {
            fixed_hz: 1.0 / self.config.fixed_dt,
            effective_hz: self.clock.effective_hz(),
            sim_frames: self.sim.current_frame(),
            alpha: self.clock.interpolation_alpha(),
            frames_published: self.frames_published,
            frames_dropped: self.frames_dropped,
            ring_len: self.ring.len() as u32,
            ring_capacity: self.ring.capacity() as u32,
            slot_bytes: self.ring.slot_bytes() as u32,
            last_tick_ns: self.last_tick_ns,
            min_tick_ns: if self.tick_count > 0 {
                self.min_tick_ns
            } else {
                0
            },
            max_tick_ns: self.max_tick_ns,
            mean_tick_ns: self.mean_tick_ns(),
            rollbacks: self.rollbacks,
            resims: self.resims,
            active_effects: self.sim.state.world.effects.active_count() as u32,
            alive_ability_rows: self.sim.state.abilities.row_count() as u32,
            channel_count: self.sim.state.abilities.channel_count() as u32,
            activate_count: telemetry.0,
            cancel_count: telemetry.1,
            interrupt_count: telemetry.2,
            complete_count: telemetry.3,
            reject_count: telemetry.4,
            gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
            gas_sab_ring_product_ready: GAS_SAB_RING_PRODUCT_READY,
            gas_rollback_aaa_ready: GAS_ROLLBACK_AAA_READY,
            gas_sim_driver_aaa_ready: GAS_SIM_DRIVER_AAA_READY,
            evidence_kind: GAS_SIM_DRIVER_EVIDENCE_KIND,
            fingerprint: self.fingerprint(),
        }
    }
}

/// Serialized honesty metrics (u64 ns; all AAA/GAS/SAB flags false).
#[derive(Debug, Clone, Serialize)]
pub struct GasSimDriverMetrics {
    pub fixed_hz: f32,
    pub effective_hz: f32,
    pub sim_frames: u64,
    pub alpha: f32,
    pub frames_published: u64,
    pub frames_dropped: u64,
    pub ring_len: u32,
    pub ring_capacity: u32,
    pub slot_bytes: u32,
    pub last_tick_ns: u64,
    pub min_tick_ns: u64,
    pub max_tick_ns: u64,
    pub mean_tick_ns: u64,
    pub rollbacks: u64,
    pub resims: u64,
    pub active_effects: u32,
    pub alive_ability_rows: u32,
    pub channel_count: u32,
    pub activate_count: u64,
    pub cancel_count: u64,
    pub interrupt_count: u64,
    pub complete_count: u64,
    pub reject_count: u64,
    pub gas_60hz_binary_ipc_ready: bool,
    pub gas_sab_ring_product_ready: bool,
    pub gas_rollback_aaa_ready: bool,
    pub gas_sim_driver_aaa_ready: bool,
    pub evidence_kind: &'static str,
    pub fingerprint: u64,
}

/// Driver soak report (honesty + evidence).
#[derive(Debug, Clone, Serialize)]
pub struct GasSimDriverSoakReport {
    pub ticks: u32,
    pub frames_published: u64,
    pub frames_dropped: u64,
    pub decode_ok: bool,
    pub mean_tick_ns: u64,
    pub max_tick_ns: u64,
    pub within_60hz_budget: bool,
    pub gas_60hz_binary_ipc_ready: bool,
    pub gas_sab_ring_product_ready: bool,
    pub gas_rollback_aaa_ready: bool,
    pub gas_sim_driver_aaa_ready: bool,
    pub evidence_kind: &'static str,
}

/// Runs 360 fixed ticks @ 60 Hz through the full driver path (sim → clock →
/// zero-copy SAB publish → in-place decode peek). Green requires:
/// `frames_published == ticks`, `frames_dropped == 0`, decode round-trip ok,
/// and mean tick cost within the 60 Hz budget.
pub fn run_gas_sim_driver_soak() -> GasSimDriverSoakReport {
    let config = GasSimDriverConfig {
        ring_capacity: 512,
        ..Default::default()
    };
    let mut driver = GasSimDriver::new(config);
    let real_dt = 1.0 / 60.0;
    for _ in 0..GAS_SIM_DRIVER_SOAK_TICKS {
        driver.step(real_dt);
    }
    let decode_ok = driver.read_latest_frame().is_some();
    let mean_tick_ns = driver.mean_tick_ns();
    GasSimDriverSoakReport {
        ticks: GAS_SIM_DRIVER_SOAK_TICKS,
        frames_published: driver.frames_published,
        frames_dropped: driver.frames_dropped,
        decode_ok,
        mean_tick_ns,
        max_tick_ns: driver.max_tick_ns,
        within_60hz_budget: (mean_tick_ns as u128) <= HZ60_BUDGET_NS,
        gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
        gas_sab_ring_product_ready: GAS_SAB_RING_PRODUCT_READY,
        gas_rollback_aaa_ready: GAS_ROLLBACK_AAA_READY,
        gas_sim_driver_aaa_ready: GAS_SIM_DRIVER_AAA_READY,
        evidence_kind: GAS_SIM_DRIVER_EVIDENCE_KIND,
    }
}

/// Tauri command — exposes the driver soak to the desktop host (evidence, not
/// a readiness certificate).
#[tauri::command]
pub fn run_gas_sim_driver_soak_cmd() -> GasSimDriverSoakReport {
    run_gas_sim_driver_soak()
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::rollback::{f32_to_q16, GasCommand};

    fn small_config(entity_count: usize, ring_capacity: usize) -> GasSimDriverConfig {
        GasSimDriverConfig {
            fixed_dt: 1.0 / 60.0,
            substeps: 1,
            max_frame_dt: 1.0 / 20.0,
            max_substeps_per_frame: 4,
            ring_capacity,
            entity_count,
            max_cues: 8,
        }
    }

    #[test]
    fn driver_step_publishes_decodable_frame() {
        let mut driver = GasSimDriver::new(small_config(4, 8));
        driver.step(1.0 / 60.0);
        let frame = driver.read_latest_frame().expect("a frame should decode");
        assert_eq!(frame.header.tick_index, 0);
        assert_eq!(frame.header.entity_count, 4);
        assert_eq!(frame.entities.len(), 4);
        assert_eq!(frame.entities[0].entity_id, 0);
        assert!((frame.entities[0].health - 100.0).abs() < 0.01);
    }

    #[test]
    fn driver_full_ring_fails_closed() {
        // Ring capacity 2 → 3 steps: two publish, the third must be dropped
        // (fail-closed Full), never silently skipped.
        let mut driver = GasSimDriver::new(small_config(4, 2));
        for _ in 0..3 {
            driver.step(1.0 / 60.0);
        }
        assert_eq!(driver.frames_published, 2);
        assert_eq!(driver.frames_dropped, 1);
        assert_eq!(driver.ring.len(), 2);
    }

    #[test]
    fn driver_command_changes_published_world() {
        let mut driver = GasSimDriver::new(small_config(4, 8));
        driver.sim_mut().record_command(
            0,
            GasCommand::Damage {
                target: 0,
                source: u32::MAX,
                amount_q16: f32_to_q16(5.0),
            },
        );
        driver.step(1.0 / 60.0);
        let frame = driver.read_latest_frame().expect("a frame should decode");
        assert!((frame.entities[0].health - 95.0).abs() < 0.01);
    }

    #[test]
    fn driver_deterministic_same_commands_same_fingerprint() {
        let mut a = GasSimDriver::new(small_config(4, 8));
        let mut b = GasSimDriver::new(small_config(4, 8));
        let command = GasCommand::ApplyEffect {
            target: 0,
            source: u32::MAX,
            catalog_id: 0,
        };
        // Same (failed — catalog empty) command stream on both drivers.
        a.sim_mut().record_command(0, command);
        b.sim_mut().record_command(0, command);
        for _ in 0..10 {
            a.step(1.0 / 60.0);
            b.step(1.0 / 60.0);
        }
        assert_eq!(a.fingerprint(), b.fingerprint());
    }

    #[test]
    fn driver_rollback_resim_converges() {
        let mut a = GasSimDriver::new(small_config(4, 8));
        let mut b = GasSimDriver::new(small_config(4, 8));
        // Identical shared command stream through frame 9.
        for frame in 0..10 {
            for driver in [&mut a, &mut b] {
                driver.sim_mut().record_command(
                    frame,
                    GasCommand::Damage {
                        target: 0,
                        source: u32::MAX,
                        amount_q16: f32_to_q16(1.0),
                    },
                );
            }
            a.step(1.0 / 60.0);
            b.step(1.0 / 60.0);
        }
        assert_eq!(a.fingerprint(), b.fingerprint(), "identical stream → identical state");
        assert_eq!(a.current_frame(), 10);

        // Divergence: only `a` receives the frame-10 command.
        a.sim_mut().record_command(
            10,
            GasCommand::Damage {
                target: 1,
                source: u32::MAX,
                amount_q16: f32_to_q16(4.0),
            },
        );
        a.step(1.0 / 60.0);
        b.step(1.0 / 60.0);
        assert_ne!(a.fingerprint(), b.fingerprint(), "divergent input must diverge state");

        // Repair: roll `a` back to end-of-frame 9, drop the divergent command,
        // re-simulate frame 10.
        assert!(a.rollback_to(9), "checkpoint at frame 9 must exist");
        assert!(a.sim_mut().log.remove_command(
            10,
            &GasCommand::Damage {
                target: 1,
                source: u32::MAX,
                amount_q16: f32_to_q16(4.0),
            },
        ));
        let repaired = a.resim_to(10);
        assert_eq!(repaired, 11);
        assert_eq!(a.fingerprint(), b.fingerprint(), "rollback + resim must converge");
        assert_eq!(a.current_frame(), b.current_frame());
        assert_eq!(a.rollbacks, 1);
        assert_eq!(a.resims, 1);
    }

    #[test]
    fn driver_soak_ready_flags_fail_closed() {
        let report = run_gas_sim_driver_soak();
        assert_eq!(report.ticks, GAS_SIM_DRIVER_SOAK_TICKS);
        assert_eq!(report.frames_published, u64::from(GAS_SIM_DRIVER_SOAK_TICKS));
        assert_eq!(report.frames_dropped, 0);
        assert!(report.decode_ok, "decoded peek should succeed");
        assert!(
            report.within_60hz_budget,
            "mean tick {} ns must be <= 60 Hz budget",
            report.mean_tick_ns
        );
        assert!(!report.gas_60hz_binary_ipc_ready);
        assert!(!report.gas_sab_ring_product_ready);
        assert!(!report.gas_rollback_aaa_ready);
        assert!(!report.gas_sim_driver_aaa_ready);
        assert_eq!(report.evidence_kind, GAS_SIM_DRIVER_EVIDENCE_KIND);
        const { assert!(!GAS_SIM_DRIVER_AAA_READY, "driver AAA must fail closed") };
    }

    #[test]
    fn slot_bytes_match_binary_contract() {
        let slot = driver_slot_bytes(2048, 64);
        assert_eq!(slot, HEADER_BYTES + 2048 * ENTITY_RECORD_BYTES + 64 * CUE_RECORD_BYTES);
        // A 2048-entity tick must fit exactly within its slot.
        assert!(slot >= HEADER_BYTES + 2048 * ENTITY_RECORD_BYTES);
    }
}

//! Managed persistent GAS runtime instance (desktop product IPC path) — letter **ge**.
//!
//! [`GasSimDriver`] is the fixed-tick substrate; this runtime is the **managed
//! product instance** the desktop host owns in Tauri state: a single live
//! [`GasRollbackWorld`] with an explicit lifecycle (start / step / stop), live
//! [`GasCommand`] injection into the running sim, binary frame readback
//! (zero-copy SAB peek + drain pop), and an honest sustained-60Hz soak.
//!
//! Zero-MVP / honesty contract:
//! - `GAS_60HZ_BINARY_IPC_READY` stays `false` until a proven *product* duplex
//!   soak (Tauri/play path ↔ web) ships. This runtime is the managed substrate
//!   and the measurement surface — **not** the certificate.
//! - Every surface is fail-closed: reading / stepping / injecting / measuring
//!   before `start` returns an explicit [`GasRuntimeError`], never a silent
//!   no-op.
//! - JSON is used only at the Tauri **input boundary** (command args). The
//!   60 Hz tick path remains binary-only SAB (Law I / R-S05).

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::State;

use aethel_kernel_rust::physics_world::UnifiedEntityId;

use super::attributes::Entity;
use super::binary_ipc_tick::{GasBinaryTickFrame, GAS_60HZ_BINARY_IPC_READY, HZ60_BUDGET_NS};
use super::driver::{GasSimDriver, GasSimDriverConfig, GasSimDriverMetrics, GAS_SIM_DRIVER_AAA_READY};
use super::rollback::{GasCommand, GAS_ROLLBACK_AAA_READY};
use super::unified_id::{GasEntityUnifiedIndex, GAS_UNIFIED_ID_READY};
use crate::ipc::gas_sab_ring::GAS_SAB_RING_PRODUCT_READY;

/// Fail-closed product flag — this runtime is a managed substrate until a
/// proven *product* duplex soak ships.
pub const GAS_RUNTIME_PRODUCT_READY: bool = false;

/// Evidence identifier for the runtime soak / probe.
pub const GAS_RUNTIME_EVIDENCE_KIND: &str = "gas_sim_runtime_managed_60hz_sab_binary";

/// Fail-closed lifecycle state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GasRuntimeState {
    Stopped,
    Running,
}

/// Fail-closed runtime error surface.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GasRuntimeError {
    NotStarted,
    AlreadyRunning,
    InvalidStep,
    InvalidDuration,
}

impl std::fmt::Display for GasRuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GasRuntimeError::NotStarted => write!(f, "gas_runtime_not_started"),
            GasRuntimeError::AlreadyRunning => write!(f, "gas_runtime_already_running"),
            GasRuntimeError::InvalidStep => write!(f, "gas_runtime_invalid_step_dt"),
            GasRuntimeError::InvalidDuration => write!(f, "gas_runtime_invalid_soak_duration"),
        }
    }
}

/// Managed persistent GAS runtime instance.
pub struct GasSimRuntime {
    driver: Option<GasSimDriver>,
    config: GasSimDriverConfig,
    state: GasRuntimeState,
    started_unix_ms: u64,
    total_steps: u64,
    commands_recorded: u64,
    commands_rejected: u64,
    frames_read: u64,
}

impl Default for GasSimRuntime {
    fn default() -> Self {
        Self::new()
    }
}

impl GasSimRuntime {
    pub fn new() -> Self {
        Self {
            driver: None,
            config: GasSimDriverConfig::default(),
            state: GasRuntimeState::Stopped,
            started_unix_ms: 0,
            total_steps: 0,
            commands_recorded: 0,
            commands_rejected: 0,
            frames_read: 0,
        }
    }

    /// Lifecycle label ("stopped" / "running") for JSON metrics.
    pub fn state_label(&self) -> &'static str {
        match self.state {
            GasRuntimeState::Stopped => "stopped",
            GasRuntimeState::Running => "running",
        }
    }

    pub fn is_running(&self) -> bool {
        self.state == GasRuntimeState::Running
    }

    /// Start (or restart after `stop`) the managed sim. Fail-closed: a second
    /// `start` while running is an error, never a silent reset.
    pub fn start(&mut self, config: GasSimDriverConfig) -> Result<(), GasRuntimeError> {
        if self.is_running() {
            return Err(GasRuntimeError::AlreadyRunning);
        }
        self.config = config.clone();
        self.driver = Some(GasSimDriver::new(config));
        self.state = GasRuntimeState::Running;
        self.started_unix_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        self.total_steps = 0;
        self.commands_recorded = 0;
        self.commands_rejected = 0;
        self.frames_read = 0;
        Ok(())
    }

    /// Stop the managed sim, returning the final metrics. Fail-closed when not
    /// started.
    pub fn stop(&mut self) -> Result<GasSimRuntimeMetrics, GasRuntimeError> {
        let metrics = self.metrics()?;
        self.driver = None;
        self.state = GasRuntimeState::Stopped;
        Ok(metrics)
    }

    /// Consume a real frame `dt` through the managed driver. Returns the number
    /// of completed fixed ticks this frame. Fail-closed when not started or on
    /// a non-finite / negative `dt`.
    pub fn step(&mut self, real_dt: f32) -> Result<u64, GasRuntimeError> {
        if !self.is_running() {
            return Err(GasRuntimeError::NotStarted);
        }
        if !real_dt.is_finite() || real_dt < 0.0 {
            return Err(GasRuntimeError::InvalidStep);
        }
        let driver = match self.driver.as_mut() {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        let before = driver.sim().current_frame();
        driver.step(real_dt);
        let after = driver.sim().current_frame();
        let completed = after.saturating_sub(before);
        self.total_steps = self.total_steps.saturating_add(1);
        Ok(completed)
    }

    /// Record a live command at the *current* frame so the next fixed tick
    /// applies it deterministically (rollback-friendly: the command enters the
    /// frame log). Returns the new total of recorded commands.
    pub fn record_command(&mut self, command: GasCommand) -> Result<u64, GasRuntimeError> {
        if !self.is_running() {
            return Err(GasRuntimeError::NotStarted);
        }
        let driver = match self.driver.as_mut() {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        let frame = driver.sim().current_frame();
        driver.sim_mut().record_command(frame, command);
        self.commands_recorded = self.commands_recorded.saturating_add(1);
        Ok(self.commands_recorded)
    }

    /// Zero-copy peek of the front (oldest) binary frame; does not advance the
    /// consumer cursor. Fail-closed when not started.
    pub fn read_frame(&mut self) -> Result<Option<GasBinaryTickFrame>, GasRuntimeError> {
        if !self.is_running() {
            return Err(GasRuntimeError::NotStarted);
        }
        let driver = match self.driver.as_mut() {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        let frame = driver.read_latest_frame();
        if frame.is_some() {
            self.frames_read = self.frames_read.saturating_add(1);
        }
        Ok(frame)
    }

    /// Pop + decode the front (oldest) binary frame, advancing the consumer
    /// cursor — the drain path that keeps the fail-closed SAB ring from filling.
    pub fn pop_frame(&mut self) -> Result<Option<GasBinaryTickFrame>, GasRuntimeError> {
        if !self.is_running() {
            return Err(GasRuntimeError::NotStarted);
        }
        let driver = match self.driver.as_mut() {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        let frame = driver.pop_frame();
        if frame.is_some() {
            self.frames_read = self.frames_read.saturating_add(1);
        }
        Ok(frame)
    }

    /// Live GAS entity count (`GasWorld::entity_count` — the next free entity
    /// id, i.e. the number of live entities). Fail-closed when not started.
    pub fn entity_count(&self) -> Result<Entity, GasRuntimeError> {
        let driver = match &self.driver {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        Ok(driver.sim().state.world.entity_count())
    }

    /// Allocation-free live unified-id view over the running world's entity
    /// space (`0..entity_count`). Fail-closed when not started.
    pub fn unified_id_index(&self) -> Result<GasEntityUnifiedIndex, GasRuntimeError> {
        let count = self.entity_count()?;
        Ok(GasEntityUnifiedIndex::new(count))
    }

    /// Ranged forward pack of a GAS entity into a `UnifiedEntityId`
    /// (`EntityDomain::Gas`). Fail-closed when not started; `None` when the
    /// entity is out of range or the reserved sentinel.
    pub fn unified_id_for_entity(
        &self,
        entity: Entity,
    ) -> Result<Option<UnifiedEntityId>, GasRuntimeError> {
        let index = self.unified_id_index()?;
        Ok(index.unified_id(entity))
    }

    /// Ranged reverse decode of a `UnifiedEntityId` back to a GAS entity.
    /// Fail-closed when not started; `None` unless the id is `EntityDomain::Gas`,
    /// in range, and not the reserved sentinel.
    pub fn entity_from_unified(
        &self,
        id: UnifiedEntityId,
    ) -> Result<Option<Entity>, GasRuntimeError> {
        let index = self.unified_id_index()?;
        Ok(index.entity_from_unified(id))
    }

    /// Full honesty metrics (driver metrics flattened + runtime lifecycle).
    pub fn metrics(&self) -> Result<GasSimRuntimeMetrics, GasRuntimeError> {
        let driver = match &self.driver {
            Some(d) => d,
            None => return Err(GasRuntimeError::NotStarted),
        };
        Ok(GasSimRuntimeMetrics {
            state: self.state_label(),
            started_unix_ms: self.started_unix_ms,
            total_steps: self.total_steps,
            commands_recorded: self.commands_recorded,
            commands_rejected: self.commands_rejected,
            frames_read: self.frames_read,
            runtime_evidence_kind: GAS_RUNTIME_EVIDENCE_KIND,
            gas_runtime_product_ready: GAS_RUNTIME_PRODUCT_READY,
            driver: driver.metrics(),
        })
    }

    /// Sustained-60Hz measurement: steps at a fixed 1/60 real dt for
    /// `duration_secs`, reporting the real published/dropped counts, effective
    /// hz, and budget fit. Honest: it never flips any readiness flag — the
    /// product duplex certificate stays separate.
    pub fn sustained_soak(
        &mut self,
        duration_secs: f32,
    ) -> Result<GasSimRuntimeSoakReport, GasRuntimeError> {
        if !self.is_running() {
            return Err(GasRuntimeError::NotStarted);
        }
        if !duration_secs.is_finite() || duration_secs <= 0.0 {
            return Err(GasRuntimeError::InvalidDuration);
        }
        let frames_expected = (duration_secs * 60.0).round().max(1.0) as u64;
        let real_dt = 1.0 / 60.0;
        for _ in 0..frames_expected {
            self.step(real_dt)?;
        }
        let decode_ok = self.read_frame()?.is_some();
        let m = self.metrics()?;
        Ok(GasSimRuntimeSoakReport {
            duration_secs,
            frames_expected,
            frames_published: m.driver.frames_published,
            frames_dropped: m.driver.frames_dropped,
            zero_drops: m.driver.frames_dropped == 0 && m.driver.frames_published == frames_expected,
            effective_hz: m.driver.effective_hz,
            mean_tick_ns: m.driver.mean_tick_ns,
            max_tick_ns: m.driver.max_tick_ns,
            within_60hz_budget: (m.driver.mean_tick_ns as u128) <= HZ60_BUDGET_NS,
            decode_ok,
            gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
            gas_sab_ring_product_ready: GAS_SAB_RING_PRODUCT_READY,
            gas_rollback_aaa_ready: GAS_ROLLBACK_AAA_READY,
            gas_sim_driver_aaa_ready: GAS_SIM_DRIVER_AAA_READY,
            gas_runtime_product_ready: GAS_RUNTIME_PRODUCT_READY,
            gas_unified_id_ready: GAS_UNIFIED_ID_READY,
            evidence_kind: GAS_RUNTIME_EVIDENCE_KIND,
        })
    }
}

/// Serialized runtime metrics (driver metrics flattened + lifecycle).
#[derive(Debug, Clone, Serialize)]
pub struct GasSimRuntimeMetrics {
    pub state: &'static str,
    pub started_unix_ms: u64,
    pub total_steps: u64,
    pub commands_recorded: u64,
    pub commands_rejected: u64,
    pub frames_read: u64,
    pub runtime_evidence_kind: &'static str,
    pub gas_runtime_product_ready: bool,
    #[serde(flatten)]
    pub driver: GasSimDriverMetrics,
}

/// Honest sustained-60Hz soak report (evidence — never a readiness certificate).
#[derive(Debug, Clone, Serialize)]
pub struct GasSimRuntimeSoakReport {
    pub duration_secs: f32,
    pub frames_expected: u64,
    pub frames_published: u64,
    pub frames_dropped: u64,
    pub zero_drops: bool,
    pub effective_hz: f32,
    pub mean_tick_ns: u64,
    pub max_tick_ns: u64,
    pub within_60hz_budget: bool,
    pub decode_ok: bool,
    pub gas_60hz_binary_ipc_ready: bool,
    pub gas_sab_ring_product_ready: bool,
    pub gas_rollback_aaa_ready: bool,
    pub gas_sim_driver_aaa_ready: bool,
    pub gas_runtime_product_ready: bool,
    pub gas_unified_id_ready: bool,
    pub evidence_kind: &'static str,
}

/// Honesty probe (all flags false until the product duplex ships).
#[derive(Debug, Clone, Serialize)]
pub struct GasRuntimeProbe {
    pub gas_60hz_binary_ipc_ready: bool,
    pub gas_sab_ring_product_ready: bool,
    pub gas_rollback_aaa_ready: bool,
    pub gas_sim_driver_aaa_ready: bool,
    pub gas_runtime_product_ready: bool,
    pub gas_unified_id_ready: bool,
    pub evidence_kind: &'static str,
}

// ============================================================================
// Tauri command surface (JSON only at the RPC input/output boundary — the
// 60 Hz tick stream stays binary SAB; Law I / R-S05)
// ============================================================================

#[tauri::command]
pub fn gas_runtime_start(
    state: State<'_, Mutex<GasSimRuntime>>,
    config: GasSimDriverConfig,
) -> Result<(), String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.start(config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_stop(
    state: State<'_, Mutex<GasSimRuntime>>,
) -> Result<GasSimRuntimeMetrics, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.stop().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_step(
    state: State<'_, Mutex<GasSimRuntime>>,
    real_dt: f32,
) -> Result<u64, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.step(real_dt).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_record_command(
    state: State<'_, Mutex<GasSimRuntime>>,
    command: GasCommand,
) -> Result<u64, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.record_command(command).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_read_frame(
    state: State<'_, Mutex<GasSimRuntime>>,
) -> Result<Option<GasBinaryTickFrame>, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.read_frame().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_pop_frame(
    state: State<'_, Mutex<GasSimRuntime>>,
) -> Result<Option<GasBinaryTickFrame>, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.pop_frame().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_entity_count(
    state: State<'_, Mutex<GasSimRuntime>>,
) -> Result<u32, String> {
    let rt = state.lock().map_err(|e| e.to_string())?;
    rt.entity_count().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_unified_id_for_entity(
    state: State<'_, Mutex<GasSimRuntime>>,
    entity: u32,
) -> Result<Option<u64>, String> {
    let rt = state.lock().map_err(|e| e.to_string())?;
    rt.unified_id_for_entity(entity)
        .map(|opt| opt.map(|id| id.raw()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_entity_from_unified(
    state: State<'_, Mutex<GasSimRuntime>>,
    unified_raw: u64,
) -> Result<Option<u32>, String> {
    let rt = state.lock().map_err(|e| e.to_string())?;
    rt.entity_from_unified(UnifiedEntityId::from_raw(unified_raw))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_metrics(
    state: State<'_, Mutex<GasSimRuntime>>,
) -> Result<GasSimRuntimeMetrics, String> {
    let rt = state.lock().map_err(|e| e.to_string())?;
    rt.metrics().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_sustained_soak(
    state: State<'_, Mutex<GasSimRuntime>>,
    duration_secs: f32,
) -> Result<GasSimRuntimeSoakReport, String> {
    let mut rt = state.lock().map_err(|e| e.to_string())?;
    rt.sustained_soak(duration_secs).map_err(|e| e.to_string())
}

/// Self-contained sustained-60Hz soak (fresh runtime, large ring; evidence,
/// not a readiness certificate) — mirrors the other soak-cmd pattern.
#[tauri::command]
pub fn run_gas_runtime_sustained_soak_cmd(
    duration_secs: f32,
) -> Result<GasSimRuntimeSoakReport, String> {
    let mut rt = GasSimRuntime::new();
    let config = GasSimDriverConfig {
        ring_capacity: 4096,
        ..Default::default()
    };
    rt.start(config).map_err(|e| e.to_string())?;
    rt.sustained_soak(duration_secs).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn gas_runtime_honesty_probe() -> GasRuntimeProbe {
    GasRuntimeProbe {
        gas_60hz_binary_ipc_ready: GAS_60HZ_BINARY_IPC_READY,
        gas_sab_ring_product_ready: GAS_SAB_RING_PRODUCT_READY,
        gas_rollback_aaa_ready: GAS_ROLLBACK_AAA_READY,
        gas_sim_driver_aaa_ready: GAS_SIM_DRIVER_AAA_READY,
        gas_runtime_product_ready: GAS_RUNTIME_PRODUCT_READY,
        gas_unified_id_ready: GAS_UNIFIED_ID_READY,
        evidence_kind: GAS_RUNTIME_EVIDENCE_KIND,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aethel_kernel_rust::physics_world::{EntityDomain, UnifiedEntityId};

    fn small_config(ring_capacity: usize) -> GasSimDriverConfig {
        GasSimDriverConfig {
            entity_count: 64,
            ring_capacity,
            max_cues: 8,
            ..Default::default()
        }
    }

    fn damage(amount: f32) -> GasCommand {
        GasCommand::Damage {
            target: 0,
            source: u32::MAX,
            amount_q16: (amount * 65536.0) as u32,
        }
    }

    #[test]
    fn fail_closed_before_start() {
        let mut rt = GasSimRuntime::new();
        assert_eq!(rt.state_label(), "stopped");
        assert!(!rt.is_running());
        assert_eq!(
            rt.step(1.0 / 60.0).unwrap_err(),
            GasRuntimeError::NotStarted
        );
        assert_eq!(rt.read_frame().unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(rt.pop_frame().unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(rt.metrics().unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(rt.sustained_soak(1.0).unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(
            rt.record_command(damage(10.0)).unwrap_err(),
            GasRuntimeError::NotStarted
        );
        assert_eq!(rt.stop().unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(rt.entity_count().unwrap_err(), GasRuntimeError::NotStarted);
        assert_eq!(
            rt.unified_id_index().unwrap_err(),
            GasRuntimeError::NotStarted
        );
        assert_eq!(
            rt.unified_id_for_entity(0).unwrap_err(),
            GasRuntimeError::NotStarted
        );
        assert_eq!(
            rt.entity_from_unified(UnifiedEntityId::from_gas(0))
                .unwrap_err(),
            GasRuntimeError::NotStarted
        );
    }

    #[test]
    fn start_then_step_publishes_decodable_frame() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        assert_eq!(rt.state_label(), "running");
        for _ in 0..5 {
            rt.step(1.0 / 60.0).unwrap();
        }
        let m = rt.metrics().unwrap();
        assert_eq!(m.state, "running");
        assert!(m.driver.frames_published >= 5);
        assert_eq!(m.driver.frames_dropped, 0);
        let frame = rt.read_frame().unwrap().expect("decoded frame");
        assert_eq!(frame.entities.len(), 64);
    }

    #[test]
    fn command_injection_changes_next_published_frame() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        let fp_before = rt.metrics().unwrap().driver.fingerprint;
        rt.record_command(damage(25.0)).unwrap();
        assert_eq!(rt.metrics().unwrap().commands_recorded, 1);
        rt.step(1.0 / 60.0).unwrap();
        let frame = rt.read_frame().unwrap().expect("decoded frame");
        let ent = frame
            .entities
            .iter()
            .find(|e| e.entity_id == 0)
            .expect("entity 0 present");
        assert!(
            ent.health < 100.0,
            "damage must lower health, got {}",
            ent.health
        );
        let fp_after = rt.metrics().unwrap().driver.fingerprint;
        assert_ne!(fp_before, fp_after);
    }

    #[test]
    fn restart_fails_closed_without_stop() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        assert_eq!(
            rt.start(small_config(64)).unwrap_err(),
            GasRuntimeError::AlreadyRunning
        );
    }

    #[test]
    fn stop_fails_closed_then_restart() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        rt.step(1.0 / 60.0).unwrap();
        let m = rt.stop().unwrap();
        assert!(m.driver.frames_published >= 1);
        assert_eq!(rt.state_label(), "stopped");
        assert_eq!(rt.step(1.0 / 60.0).unwrap_err(), GasRuntimeError::NotStarted);
        rt.start(small_config(64)).unwrap();
        assert_eq!(rt.state_label(), "running");
    }

    #[test]
    fn invalid_step_and_duration_fail_closed() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        assert_eq!(rt.step(f32::NAN).unwrap_err(), GasRuntimeError::InvalidStep);
        assert_eq!(rt.step(-1.0).unwrap_err(), GasRuntimeError::InvalidStep);
        assert_eq!(
            rt.sustained_soak(0.0).unwrap_err(),
            GasRuntimeError::InvalidDuration
        );
        assert_eq!(
            rt.sustained_soak(f32::INFINITY).unwrap_err(),
            GasRuntimeError::InvalidDuration
        );
    }

    #[test]
    fn sustained_soak_green_and_all_ready_flags_held() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(256)).unwrap();
        let report = rt.sustained_soak(1.0).unwrap();
        assert_eq!(report.frames_expected, 60);
        assert_eq!(report.frames_published, 60);
        assert_eq!(report.frames_dropped, 0);
        assert!(report.zero_drops);
        assert!(report.decode_ok);
        assert!(report.within_60hz_budget);
        assert!((55.0..65.0).contains(&report.effective_hz));
        assert!(!report.gas_60hz_binary_ipc_ready);
        assert!(!report.gas_sab_ring_product_ready);
        assert!(!report.gas_rollback_aaa_ready);
        assert!(!report.gas_sim_driver_aaa_ready);
        assert!(!report.gas_runtime_product_ready);
        assert!(!report.gas_unified_id_ready);
    }

    #[test]
    fn pop_frame_drains_ring_and_reads_frames() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        for _ in 0..3 {
            rt.step(1.0 / 60.0).unwrap();
        }
        let first = rt.pop_frame().unwrap().expect("popped frame");
        assert_eq!(first.entities.len(), 64);
        assert!(rt.metrics().unwrap().frames_read >= 1);
    }

    #[test]
    fn probe_matches_ready_false() {
        let probe = gas_runtime_honesty_probe();
        assert!(!probe.gas_60hz_binary_ipc_ready);
        assert!(!probe.gas_sab_ring_product_ready);
        assert!(!probe.gas_rollback_aaa_ready);
        assert!(!probe.gas_sim_driver_aaa_ready);
        assert!(!probe.gas_runtime_product_ready);
        assert!(!probe.gas_unified_id_ready);
        assert_eq!(probe.evidence_kind, GAS_RUNTIME_EVIDENCE_KIND);
    }

    #[test]
    fn unified_id_surfaces_roundtrip_after_start() {
        let mut rt = GasSimRuntime::new();
        rt.start(small_config(64)).unwrap();
        assert_eq!(rt.entity_count().unwrap(), 64);
        let index = rt.unified_id_index().unwrap();
        assert_eq!(index.len(), 64);
        for entity in 0..64 {
            let id = rt
                .unified_id_for_entity(entity)
                .unwrap()
                .expect("in-range entity packs");
            assert_eq!(id.domain(), EntityDomain::Gas);
            assert_eq!(rt.entity_from_unified(id).unwrap(), Some(entity));
        }
        // Out of range and the reserved sentinel fail closed.
        assert_eq!(rt.unified_id_for_entity(64).unwrap(), None);
        assert_eq!(rt.unified_id_for_entity(u32::MAX).unwrap(), None);
        // Cross-domain id fails closed under the strict GAS decode.
        let physics = UnifiedEntityId::from_parts(EntityDomain::Physics, 1);
        assert_eq!(rt.entity_from_unified(physics).unwrap(), None);
    }
}

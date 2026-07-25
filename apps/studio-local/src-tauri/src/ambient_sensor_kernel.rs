//! Onda M — Ambient Sensor Kernel (M.0 scaffold)
//!
//! Dedicated thread + CSI frame ring buffer + IPC contract to TS.
//! **HELD / no-op** without a real CSI NIC driver — must never block `simulation-tick`.
//!
//! Law I / Immunity: ambient capture runs off the sim/render hot path.

use serde::Serialize;
use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;

/// Nominal edge capture target — not a production claim without driver evidence.
pub const AMBIENT_CSI_NOMINAL_HZ: u32 = 60;

/// Ring capacity (~1s at 60Hz). Bounded — never grow unbounded on the ambient thread.
pub const AMBIENT_CSI_RING_CAPACITY: usize = 64;

/// One CSI frame slot. Empty amplitudes = unsupported / held path.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbientCsiFrame {
    pub captured_at_ms: u64,
    pub amplitudes: Vec<f32>,
    pub phases: Vec<f32>,
    pub nominal_hz: u32,
    /// Honest provenance — never invent chipset support.
    pub held: bool,
    pub held_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbientSensorKernelStatus {
    pub running: bool,
    pub csi_driver_present: bool,
    pub ring_len: usize,
    pub ring_capacity: usize,
    pub blocks_simulation_tick: bool,
    pub held: bool,
    pub held_reason: String,
    pub note: String,
}

/// Shared ring between ambient thread and IPC readers (TS via Tauri command later).
#[derive(Debug, Default)]
pub struct AmbientCsiRing {
    frames: VecDeque<AmbientCsiFrame>,
}

impl AmbientCsiRing {
    pub fn push(&mut self, frame: AmbientCsiFrame) {
        if self.frames.len() >= AMBIENT_CSI_RING_CAPACITY {
            self.frames.pop_front();
        }
        self.frames.push_back(frame);
    }

    pub fn len(&self) -> usize {
        self.frames.len()
    }

    pub fn is_empty(&self) -> bool {
        self.frames.is_empty()
    }

    pub fn latest(&self) -> Option<&AmbientCsiFrame> {
        self.frames.back()
    }

    pub fn drain_snapshot(&self) -> Vec<AmbientCsiFrame> {
        self.frames.iter().cloned().collect()
    }
}

/// Isolated ambient sensor kernel — never joined from the physics/sim tick.
pub struct AmbientSensorKernel {
    running: Arc<AtomicBool>,
    csi_driver_present: Arc<AtomicBool>,
    ring: Arc<Mutex<AmbientCsiRing>>,
    join: Option<JoinHandle<()>>,
}

impl AmbientSensorKernel {
    /// Create a held kernel (no CSI driver). Safe default for all consumer hosts today.
    pub fn new_held() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            csi_driver_present: Arc::new(AtomicBool::new(false)),
            ring: Arc::new(Mutex::new(AmbientCsiRing::default())),
            join: None,
        }
    }

    /// Start isolated ambient thread. Without `csi_driver_present`, thread parks as no-op
    /// and never invents CSI samples or BPM.
    pub fn start(&mut self, csi_driver_present: bool) {
        if self.running.load(Ordering::SeqCst) {
            return;
        }
        self.csi_driver_present
            .store(csi_driver_present, Ordering::SeqCst);
        self.running.store(true, Ordering::SeqCst);

        let running = Arc::clone(&self.running);
        let driver = Arc::clone(&self.csi_driver_present);
        let ring = Arc::clone(&self.ring);

        self.join = Some(thread::Builder::new()
            .name("aethel-ambient-sensor".into())
            .spawn(move || {
                // Target ~60Hz wake — still no-op when driver absent (HELD).
                let period = Duration::from_millis(1000 / u64::from(AMBIENT_CSI_NOMINAL_HZ));
                let mut tick: u64 = 0;
                while running.load(Ordering::SeqCst) {
                    if !driver.load(Ordering::SeqCst) {
                        // HELD path: do not fabricate CSI; sleep only.
                        thread::sleep(period);
                        continue;
                    }

                    // Future: real NIC CSI ioctl / vendor SDK read into amplitudes/phases.
                    // Until driver lands, even "present" flag without IO stays held empty.
                    let frame = AmbientCsiFrame {
                        captured_at_ms: tick.saturating_mul(1000 / u64::from(AMBIENT_CSI_NOMINAL_HZ)),
                        amplitudes: Vec::new(),
                        phases: Vec::new(),
                        nominal_hz: AMBIENT_CSI_NOMINAL_HZ,
                        held: true,
                        held_reason: Some(
                            "CSI driver flag set but live NIC read not implemented — [HELD]"
                                .into(),
                        ),
                    };
                    if let Ok(mut guard) = ring.lock() {
                        guard.push(frame);
                    }
                    tick = tick.saturating_add(1);
                    thread::sleep(period);
                }
            })
            .expect("ambient sensor thread spawn"));
    }

    pub fn stop(&mut self) {
        self.running.store(false, Ordering::SeqCst);
        if let Some(handle) = self.join.take() {
            let _ = handle.join();
        }
    }

    pub fn status(&self) -> AmbientSensorKernelStatus {
        let ring_len = self.ring.lock().map(|g| g.len()).unwrap_or(0);
        let driver = self.csi_driver_present.load(Ordering::SeqCst);
        let running = self.running.load(Ordering::SeqCst);
        let held = !driver;
        AmbientSensorKernelStatus {
            running,
            csi_driver_present: driver,
            ring_len,
            ring_capacity: AMBIENT_CSI_RING_CAPACITY,
            blocks_simulation_tick: false,
            held,
            held_reason: if held {
                "No real CSI NIC driver — ambient_sensor_kernel no-op; gameplay-heuristic emotion on TS"
                    .into()
            } else {
                "Driver flag present — live CSI IO still [HELD] until vendor path proven".into()
            },
            note: "Ambient thread is isolated from simulation-tick / physics_kernel::step"
                .into(),
        }
    }

    /// IPC helper — snapshot ring for TS without blocking sim.
    pub fn ring_snapshot(&self) -> Vec<AmbientCsiFrame> {
        self.ring
            .lock()
            .map(|g| g.drain_snapshot())
            .unwrap_or_default()
    }
}

impl Default for AmbientSensorKernel {
    fn default() -> Self {
        Self::new_held()
    }
}

impl Drop for AmbientSensorKernel {
    fn drop(&mut self) {
        self.stop();
    }
}

/// Probe used by Tauri/desktop honesty — always honest about HELD CSI.
pub fn probe_ambient_sensor_kernel_held() -> AmbientSensorKernelStatus {
    AmbientSensorKernel::new_held().status()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn held_kernel_does_not_block_sim_and_reports_held() {
        let status = probe_ambient_sensor_kernel_held();
        assert!(!status.blocks_simulation_tick);
        assert!(status.held);
        assert!(!status.csi_driver_present);
        assert!(!status.running);
    }

    #[test]
    fn ring_caps_at_capacity() {
        let mut ring = AmbientCsiRing::default();
        for i in 0..(AMBIENT_CSI_RING_CAPACITY + 10) {
            ring.push(AmbientCsiFrame {
                captured_at_ms: i as u64,
                amplitudes: vec![],
                phases: vec![],
                nominal_hz: AMBIENT_CSI_NOMINAL_HZ,
                held: true,
                held_reason: Some("test".into()),
            });
        }
        assert_eq!(ring.len(), AMBIENT_CSI_RING_CAPACITY);
    }

    #[test]
    fn start_without_driver_stays_noop_ring_empty() {
        let mut kernel = AmbientSensorKernel::new_held();
        kernel.start(false);
        thread::sleep(Duration::from_millis(50));
        let snap = kernel.ring_snapshot();
        assert!(snap.is_empty());
        let status = kernel.status();
        assert!(status.running);
        assert!(status.held);
        assert!(!status.blocks_simulation_tick);
        kernel.stop();
    }
}

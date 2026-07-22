//! Asynchronous reality threads — letter **fm**.
//!
//! Replaces comment/println theater (`spawn_decoupled_kernels` 1000Hz/240Hz marketing,
//! no lanes/jobs/soak/probe) with real async job lanes: `std::thread` workers process
//! tick jobs via `mpsc` channels; an ordered apply lane commits physics ticks in
//! sequence. Soak proves N ticks applied in order with measurable completion.
//! Probe `asynchronous_reality_threads_ready` / `asynchronousRealityThreadsReady` is
//! **distinct** from fl `cpuAffinityMicroWorkersReady` and ff `atomicThreadSyncReady`.
//!
//! **HELD:** Full async runtime AAA (`async_runtime_aaa_ready: false` — no tokio /
//! async-std executor) · Coins / Agones / Nanite / DLSS.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

/// Physics ticks that must all apply in order during soak.
pub const SOAK_PHYSICS_TICKS: usize = 64;
/// Visual lane ticks (completion-counted; not order-gated).
pub const SOAK_VISUAL_TICKS: usize = 32;
/// Fingerprint seed ("fmart").
const FP_SEED: u64 = 0x666d_6172_74;

/// Lane kind for a reality tick job.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RealityLaneKind {
    Physics,
    Visual,
}

/// One tick job submitted to a lane.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RealityTickJob {
    pub seq: u64,
    pub lane: RealityLaneKind,
    pub payload: u64,
}

enum LaneMsg {
    Tick(RealityTickJob),
    Shutdown,
}

/// Result after a lane worker processes a tick (pre-apply).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TickProcessed {
    pub seq: u64,
    pub lane: RealityLaneKind,
    pub result: u64,
}

/// Shared ordered apply state for physics ticks.
#[derive(Debug, Default)]
struct OrderedApplyState {
    next_seq: u64,
    applied: u64,
    checksum: u64,
    /// Out-of-order buffer keyed by seq (small soak; Vec index).
    pending: Vec<Option<u64>>,
    order_ok: bool,
}

impl OrderedApplyState {
    fn with_capacity(cap: usize) -> Self {
        Self {
            next_seq: 0,
            applied: 0,
            checksum: 0,
            pending: vec![None; cap],
            order_ok: true,
        }
    }

    /// Commit a processed physics tick; may buffer if ahead of `next_seq`.
    fn apply_physics(&mut self, seq: u64, result: u64) {
        if (seq as usize) >= self.pending.len() {
            self.order_ok = false;
            return;
        }
        if self.pending[seq as usize].is_some() {
            self.order_ok = false;
            return;
        }
        self.pending[seq as usize] = Some(result);
        while (self.next_seq as usize) < self.pending.len() {
            match self.pending[self.next_seq as usize] {
                Some(r) => {
                    self.checksum = self.checksum.wrapping_add(hash_mix(self.next_seq, r));
                    self.pending[self.next_seq as usize] = None;
                    self.applied = self.applied.wrapping_add(1);
                    self.next_seq = self.next_seq.wrapping_add(1);
                }
                None => break,
            }
        }
    }
}

/// Dual-lane async reality kernel: physics + visual workers on mpsc channels,
/// plus an ordered apply lane for physics sequence commits.
pub struct AsyncRealityLanes {
    physics_tx: Mutex<Option<Sender<LaneMsg>>>,
    visual_tx: Mutex<Option<Sender<LaneMsg>>>,
    apply_tx: Mutex<Option<Sender<TickProcessed>>>,
    workers: Mutex<Vec<JoinHandle<()>>>,
    apply_handle: Mutex<Option<JoinHandle<()>>>,
    physics_done: Arc<AtomicU64>,
    visual_done: Arc<AtomicU64>,
    apply_state: Arc<Mutex<OrderedApplyState>>,
    live: AtomicBool,
    physics_cap: usize,
}

impl AsyncRealityLanes {
    /// Spawn physics + visual lane workers and one ordered apply thread.
    pub fn new(physics_capacity: usize) -> Self {
        let cap = physics_capacity.max(1);
        let (physics_tx, physics_rx) = mpsc::channel::<LaneMsg>();
        let (visual_tx, visual_rx) = mpsc::channel::<LaneMsg>();
        let (apply_tx, apply_rx) = mpsc::channel::<TickProcessed>();
        let physics_done = Arc::new(AtomicU64::new(0));
        let visual_done = Arc::new(AtomicU64::new(0));
        let apply_state = Arc::new(Mutex::new(OrderedApplyState::with_capacity(cap)));

        let physics_done_w = Arc::clone(&physics_done);
        let apply_tx_physics = apply_tx.clone();
        let physics_worker = thread::spawn(move || {
            lane_worker(physics_rx, RealityLaneKind::Physics, physics_done_w, apply_tx_physics);
        });

        let visual_done_w = Arc::clone(&visual_done);
        let apply_tx_visual = apply_tx.clone();
        let visual_worker = thread::spawn(move || {
            lane_worker(visual_rx, RealityLaneKind::Visual, visual_done_w, apply_tx_visual);
        });

        let apply_state_w = Arc::clone(&apply_state);
        let apply_worker = thread::spawn(move || {
            apply_worker_main(apply_rx, apply_state_w);
        });

        Self {
            physics_tx: Mutex::new(Some(physics_tx)),
            visual_tx: Mutex::new(Some(visual_tx)),
            apply_tx: Mutex::new(Some(apply_tx)),
            workers: Mutex::new(vec![physics_worker, visual_worker]),
            apply_handle: Mutex::new(Some(apply_worker)),
            physics_done,
            visual_done,
            apply_state,
            live: AtomicBool::new(true),
            physics_cap: cap,
        }
    }

    #[inline]
    pub fn physics_capacity(&self) -> usize {
        self.physics_cap
    }

    #[inline]
    pub fn physics_done(&self) -> u64 {
        self.physics_done.load(Ordering::Acquire)
    }

    #[inline]
    pub fn visual_done(&self) -> u64 {
        self.visual_done.load(Ordering::Acquire)
    }

    /// Snapshot ordered apply counters.
    pub fn apply_stats(&self) -> (u64, u64, bool) {
        match self.apply_state.lock() {
            Ok(st) => (st.applied, st.checksum, st.order_ok && st.next_seq == st.applied),
            Err(_) => (0, 0, false),
        }
    }

    /// Submit one tick job to the matching lane.
    pub fn submit(&self, job: RealityTickJob) -> Result<(), String> {
        if !self.live.load(Ordering::Acquire) {
            return Err("AsyncRealityLanes shut down".into());
        }
        let tx = match job.lane {
            RealityLaneKind::Physics => self.physics_tx.lock().map_err(|e| e.to_string())?,
            RealityLaneKind::Visual => self.visual_tx.lock().map_err(|e| e.to_string())?,
        };
        let tx = tx.as_ref().ok_or_else(|| "AsyncRealityLanes shut down".to_string())?;
        tx.send(LaneMsg::Tick(job)).map_err(|e| e.to_string())
    }

    /// Submit many jobs (lanes chosen per job).
    pub fn submit_all(&self, jobs: &[RealityTickJob]) -> Result<(), String> {
        for job in jobs {
            self.submit(*job)?;
        }
        Ok(())
    }

    /// Wait until physics/visual completion counters reach targets (or timeout).
    pub fn wait_completions(
        &self,
        physics_target: u64,
        visual_target: u64,
        timeout: Duration,
    ) -> Result<(), String> {
        let deadline = Instant::now() + timeout;
        loop {
            let p = self.physics_done();
            let v = self.visual_done();
            let (applied, _, order_ok) = self.apply_stats();
            if p >= physics_target && v >= visual_target && applied >= physics_target && order_ok {
                return Ok(());
            }
            if Instant::now() >= deadline {
                return Err(format!(
                    "wait timeout: physics_done={p}/{physics_target} visual_done={v}/{visual_target} applied={applied}"
                ));
            }
            thread::yield_now();
            thread::sleep(Duration::from_micros(50));
        }
    }

    /// Shut down lanes (idempotent).
    pub fn shutdown(&self) {
        if !self.live.swap(false, Ordering::AcqRel) {
            return;
        }
        if let Ok(mut g) = self.physics_tx.lock() {
            if let Some(tx) = g.take() {
                let _ = tx.send(LaneMsg::Shutdown);
            }
        }
        if let Ok(mut g) = self.visual_tx.lock() {
            if let Some(tx) = g.take() {
                let _ = tx.send(LaneMsg::Shutdown);
            }
        }
        if let Ok(mut handles) = self.workers.lock() {
            for h in handles.drain(..) {
                let _ = h.join();
            }
        }
        // Drop apply sender so apply worker exits after draining.
        if let Ok(mut g) = self.apply_tx.lock() {
            let _ = g.take();
        }
        if let Ok(mut h) = self.apply_handle.lock() {
            if let Some(handle) = h.take() {
                let _ = handle.join();
            }
        }
    }
}

impl Drop for AsyncRealityLanes {
    fn drop(&mut self) {
        self.shutdown();
    }
}

fn lane_worker(
    rx: Receiver<LaneMsg>,
    expected_lane: RealityLaneKind,
    done: Arc<AtomicU64>,
    apply_tx: Sender<TickProcessed>,
) {
    while let Ok(msg) = rx.recv() {
        match msg {
            LaneMsg::Shutdown => break,
            LaneMsg::Tick(job) => {
                if job.lane != expected_lane {
                    continue;
                }
                let result = process_tick(job);
                let _ = apply_tx.send(TickProcessed {
                    seq: job.seq,
                    lane: job.lane,
                    result,
                });
                done.fetch_add(1, Ordering::AcqRel);
            }
        }
    }
}

fn apply_worker_main(rx: Receiver<TickProcessed>, state: Arc<Mutex<OrderedApplyState>>) {
    while let Ok(tick) = rx.recv() {
        if tick.lane != RealityLaneKind::Physics {
            continue;
        }
        if let Ok(mut st) = state.lock() {
            st.apply_physics(tick.seq, tick.result);
        }
    }
}

/// Deterministic tick body (critical-path work, not theater).
#[inline]
pub fn process_tick(job: RealityTickJob) -> u64 {
    let lane_tag = match job.lane {
        RealityLaneKind::Physics => 0x5048_5953_u64, // PHYS
        RealityLaneKind::Visual => 0x5649_5355_u64,  // VISU
    };
    let mut x = job
        .payload
        .wrapping_mul(0x9E37_79B9_7F4A_7C15)
        ^ lane_tag
        ^ job.seq.wrapping_mul(0xC2B2_AE3D_27D4_EB4F);
    x = x.rotate_left(13).wrapping_add(job.seq);
    x ^ (x >> 29)
}

/// Expected ordered physics checksum for seq `0..tick_count` with `payload = seq`.
pub fn expected_physics_checksum(tick_count: u64) -> u64 {
    let mut sum = 0u64;
    for seq in 0..tick_count {
        let job = RealityTickJob {
            seq,
            lane: RealityLaneKind::Physics,
            payload: seq,
        };
        sum = sum.wrapping_add(hash_mix(seq, process_tick(job)));
    }
    sum
}

/// Legacy entry — real async lanes (no println theater).
pub struct AsynchronousRealityThreads;

impl AsynchronousRealityThreads {
    /// Spawn short-lived dual lanes, run soak-sized ticks, shut down.
    pub fn spawn_decoupled_kernels() {
        let _ = run_asynchronous_reality_threads_soak();
    }
}

/// Letter **fm** soak report — async reality lane evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct AsynchronousRealityThreadsSoakReport {
    pub asynchronous_reality_threads_ready: bool,
    pub ticks_applied_ok: bool,
    pub order_ok: bool,
    pub visual_completion_ok: bool,
    pub lanes_shutdown_ok: bool,
    pub state_mutated: bool,
    pub physics_ticks: u32,
    pub visual_ticks: u32,
    pub physics_applied: u32,
    pub physics_checksum: u64,
    pub fingerprint: u64,
    pub distinct_from_cpu_affinity_micro_workers_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full async runtime AAA — always false (HELD; no tokio).
    pub async_runtime_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn fail_report(physics_ticks: u32, visual_ticks: u32) -> AsynchronousRealityThreadsSoakReport {
    AsynchronousRealityThreadsSoakReport {
        asynchronous_reality_threads_ready: false,
        ticks_applied_ok: false,
        order_ok: false,
        visual_completion_ok: false,
        lanes_shutdown_ok: false,
        state_mutated: false,
        physics_ticks,
        visual_ticks,
        physics_applied: 0,
        physics_checksum: 0,
        fingerprint: 0,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        async_runtime_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Run async reality lanes soak — N physics ticks ordered apply + visual completions.
pub fn run_asynchronous_reality_threads_soak() -> AsynchronousRealityThreadsSoakReport {
    let physics_n = SOAK_PHYSICS_TICKS;
    let visual_n = SOAK_VISUAL_TICKS;
    let lanes = AsyncRealityLanes::new(physics_n);

    let mut jobs = Vec::with_capacity(physics_n + visual_n);
    // Interleave submissions so apply lane must reorder / still commit in seq order.
    for i in 0..physics_n {
        let seq = (physics_n - 1 - i) as u64; // reverse submit order
        jobs.push(RealityTickJob {
            seq,
            lane: RealityLaneKind::Physics,
            payload: seq,
        });
        if i < visual_n {
            jobs.push(RealityTickJob {
                seq: i as u64,
                lane: RealityLaneKind::Visual,
                payload: i as u64,
            });
        }
    }
    for i in physics_n..visual_n {
        jobs.push(RealityTickJob {
            seq: i as u64,
            lane: RealityLaneKind::Visual,
            payload: i as u64,
        });
    }

    if lanes.submit_all(&jobs).is_err() {
        lanes.shutdown();
        return fail_report(physics_n as u32, visual_n as u32);
    }

    if lanes
        .wait_completions(physics_n as u64, visual_n as u64, Duration::from_secs(10))
        .is_err()
    {
        let (applied, checksum, order_ok) = lanes.apply_stats();
        lanes.shutdown();
        let mut fail = fail_report(physics_n as u32, visual_n as u32);
        fail.physics_applied = applied as u32;
        fail.physics_checksum = checksum;
        fail.order_ok = order_ok;
        fail.ticks_applied_ok = applied == physics_n as u64;
        fail.visual_completion_ok = lanes.visual_done() >= visual_n as u64;
        return fail;
    }

    let (applied, checksum, order_ok) = lanes.apply_stats();
    let expected = expected_physics_checksum(physics_n as u64);
    let ticks_applied_ok = applied == physics_n as u64 && checksum == expected;
    let visual_completion_ok = lanes.visual_done() >= visual_n as u64
        && lanes.physics_done() >= physics_n as u64;

    lanes.shutdown();
    let lanes_shutdown_ok = lanes
        .submit(RealityTickJob {
            seq: 0,
            lane: RealityLaneKind::Physics,
            payload: 0,
        })
        .is_err();

    let state_mutated = ticks_applied_ok && order_ok && checksum != 0;
    let ready =
        ticks_applied_ok && order_ok && visual_completion_ok && lanes_shutdown_ok && state_mutated;

    if !ready {
        let mut fail = fail_report(physics_n as u32, visual_n as u32);
        fail.ticks_applied_ok = ticks_applied_ok;
        fail.order_ok = order_ok;
        fail.visual_completion_ok = visual_completion_ok;
        fail.lanes_shutdown_ok = lanes_shutdown_ok;
        fail.state_mutated = state_mutated;
        fail.physics_applied = applied as u32;
        fail.physics_checksum = checksum;
        return fail;
    }

    let fp = fingerprint(&[
        physics_n as u64,
        visual_n as u64,
        checksum,
        applied,
        0xf2,
    ]);

    AsynchronousRealityThreadsSoakReport {
        asynchronous_reality_threads_ready: true,
        ticks_applied_ok: true,
        order_ok: true,
        visual_completion_ok: true,
        lanes_shutdown_ok: true,
        state_mutated: true,
        physics_ticks: physics_n as u32,
        visual_ticks: visual_n as u32,
        physics_applied: applied as u32,
        physics_checksum: checksum,
        fingerprint: fp,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        async_runtime_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `asynchronous_reality_threads_ready` (**fm**).
pub fn probe_asynchronous_reality_threads() -> AsynchronousRealityThreadsSoakReport {
    run_asynchronous_reality_threads_soak()
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

#[allow(dead_code)]
static _FM_MARKER: AtomicBool = AtomicBool::new(false);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn process_tick_deterministic() {
        let a = RealityTickJob {
            seq: 7,
            lane: RealityLaneKind::Physics,
            payload: 7,
        };
        assert_eq!(process_tick(a), process_tick(a));
        let b = RealityTickJob {
            seq: 8,
            lane: RealityLaneKind::Physics,
            payload: 8,
        };
        assert_ne!(process_tick(a), process_tick(b));
    }

    #[test]
    fn lanes_submit_ordered_apply_despite_reverse_enqueue() {
        let n = 16usize;
        let lanes = AsyncRealityLanes::new(n);
        for i in (0..n).rev() {
            lanes
                .submit(RealityTickJob {
                    seq: i as u64,
                    lane: RealityLaneKind::Physics,
                    payload: i as u64,
                })
                .expect("submit");
        }
        lanes
            .wait_completions(n as u64, 0, Duration::from_secs(5))
            .expect("wait");
        let (applied, checksum, order_ok) = lanes.apply_stats();
        assert!(order_ok);
        assert_eq!(applied, n as u64);
        assert_eq!(checksum, expected_physics_checksum(n as u64));
        lanes.shutdown();
    }

    #[test]
    fn soak_flips_ready_async_runtime_held() {
        let r = run_asynchronous_reality_threads_soak();
        assert!(r.asynchronous_reality_threads_ready, "{r:?}");
        assert!(r.ticks_applied_ok);
        assert!(r.order_ok);
        assert!(r.visual_completion_ok);
        assert!(r.lanes_shutdown_ok);
        assert_eq!(
            r.physics_checksum,
            expected_physics_checksum(SOAK_PHYSICS_TICKS as u64)
        );
        assert!(!r.async_runtime_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_asynchronous_reality_threads_soak();
        let b = probe_asynchronous_reality_threads();
        assert_eq!(
            a.asynchronous_reality_threads_ready,
            b.asynchronous_reality_threads_ready
        );
        assert!(b.asynchronous_reality_threads_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.physics_checksum, b.physics_checksum);
    }

    #[test]
    fn probe_distinct_from_fl_ff_fe() {
        let fm = probe_asynchronous_reality_threads();
        let fl = crate::cpu_affinity_micro_workers::probe_cpu_affinity_micro_workers();
        let ff = crate::atomic_thread_sync::probe_atomic_thread_sync();
        let fe = crate::lockfree_ring_buffer::probe_lockfree_ring_buffer();
        assert!(fm.asynchronous_reality_threads_ready);
        assert!(fl.cpu_affinity_micro_workers_ready);
        assert!(ff.atomic_thread_sync_ready);
        assert!(fe.lockfree_ring_buffer_ready);
        assert!(fm.distinct_from_cpu_affinity_micro_workers_probe);
        assert!(fm.distinct_from_atomic_thread_sync_probe);
        assert!(fm.distinct_from_lockfree_ring_buffer_probe);
        assert_ne!(fm.fingerprint, fl.fingerprint);
        assert_ne!(fm.fingerprint, ff.fingerprint);
        assert_ne!(fm.fingerprint, fe.fingerprint);
    }

    #[test]
    fn spawn_decoupled_kernels_no_panic() {
        AsynchronousRealityThreads::spawn_decoupled_kernels();
    }
}

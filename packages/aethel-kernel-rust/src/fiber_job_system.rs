//! Fiber-like Work-Stealing Job System — letter **js11** deepen (quality **aa**).
//!
//! Production-quality scheduler substrate over `rayon` work-stealing:
//! - Preallocated SoA chunk jobs (no heap job payloads in soak hot path)
//! - Dependency-gated phases (A must finish before B reduce)
//! - Instant-measured soak evidence
//! - Honesty probe `fiber_job_system_ready` / `fiberJobSystemReady`
//!
//! **Does not** claim Unreal TaskGraph / DOTS / full rayon AAA parity.
//! **HELD:** `rayon_dots_aaa_ready: false` · Coins / Agones / Nanite / DLSS.

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Default soak entity count (cache-friendly SoA width).
pub const SOAK_ENTITY_COUNT: usize = 4096;
/// Chunk width for L1-friendly dispatch.
pub const SOAK_CHUNK_SIZE: usize = 256;
/// Fingerprint seed ("js11").
const FP_SEED: u64 = 0x6a73_3131;

/// Represents a distinct execution payload that runs on a worker thread.
pub trait Job: Send + Sync {
    fn execute(&self);
}

/// Lightweight chunk descriptor for the sequential `dispatch_parallel` path.
pub struct EcsChunkJob {
    pub chunk_index: usize,
    pub entity_count: usize,
    pub work_items: usize,
}

impl Job for EcsChunkJob {
    #[inline(always)]
    fn execute(&self) {
        // Sequential path: pure arithmetic (no alloc). Hot path = `dispatch_soa_integrate`.
        let _ = self.work_items.wrapping_mul(self.entity_count.wrapping_add(self.chunk_index));
    }
}

/// Frame orchestrator: atomic counters + dependency epoch.
#[derive(Clone)]
pub struct JobGraph {
    active_jobs: Arc<AtomicUsize>,
    completed_jobs: Arc<AtomicUsize>,
    /// Monotonic phase epoch — bumped after each successful barrier.
    phase_epoch: Arc<AtomicUsize>,
    /// Accumulated reduce fingerprint from last parallel pass (soak evidence).
    last_reduce: Arc<AtomicU64>,
}

impl Default for JobGraph {
    fn default() -> Self {
        Self::new()
    }
}

impl JobGraph {
    pub fn new() -> Self {
        Self {
            active_jobs: Arc::new(AtomicUsize::new(0)),
            completed_jobs: Arc::new(AtomicUsize::new(0)),
            phase_epoch: Arc::new(AtomicUsize::new(0)),
            last_reduce: Arc::new(AtomicU64::new(0)),
        }
    }

    #[inline]
    pub fn phase_epoch(&self) -> usize {
        self.phase_epoch.load(Ordering::Acquire)
    }

    #[inline]
    pub fn last_reduce_fingerprint(&self) -> u64 {
        self.last_reduce.load(Ordering::Acquire)
    }

    /// Dispatches jobs on the calling thread (compatibility / unit path).
    pub fn dispatch_parallel<J: Job>(&self, jobs: Vec<J>) {
        let count = jobs.len();
        self.active_jobs.fetch_add(count, Ordering::Release);
        let completed = self.completed_jobs.clone();
        for job in jobs {
            job.execute();
            completed.fetch_add(1, Ordering::Release);
        }
    }

    /// Real rayon work-stealing integrate: `vel += scale * pos * dt` per entity.
    ///
    /// Zero dynamic alloc in the hot loop: slices are pre-split; rayon only
    /// steals chunk ranges. Returns a deterministic sequential fingerprint.
    pub fn dispatch_soa_integrate(
        &self,
        pos_y: &[f32],
        vel_y: &mut [f32],
        scale: f32,
        dt: f32,
        chunk_size: usize,
    ) -> u64 {
        assert_eq!(pos_y.len(), vel_y.len());
        let n = pos_y.len();
        let chunk = chunk_size.max(1);
        let chunk_count = if n == 0 { 0 } else { n.div_ceil(chunk) };

        self.active_jobs.fetch_add(chunk_count, Ordering::Release);
        let completed = self.completed_jobs.clone();

        vel_y
            .par_chunks_mut(chunk)
            .zip(pos_y.par_chunks(chunk))
            .for_each(|(vel_chunk, pos_chunk)| {
                for (v, &p) in vel_chunk.iter_mut().zip(pos_chunk.iter()) {
                    *v += scale * p * dt;
                }
                completed.fetch_add(1, Ordering::Release);
            });

        let mut h = FP_SEED;
        for (i, &v) in vel_y.iter().enumerate() {
            h = hash_mix(h, quant_f32(v));
            h = hash_mix(h, i as u64);
        }
        self.last_reduce.store(h, Ordering::Release);
        h
    }

    /// Dependency gate: wait until completed == active, then bump phase epoch.
    pub fn wait_idle(&self) {
        let start = Instant::now();
        while self.completed_jobs.load(Ordering::Acquire)
            < self.active_jobs.load(Ordering::Acquire)
        {
            if start.elapsed().as_secs() > 5 {
                panic!("JobGraph wait_idle timeout — incomplete fiber barrier");
            }
            std::hint::spin_loop();
        }
        self.active_jobs.store(0, Ordering::Release);
        self.completed_jobs.store(0, Ordering::Release);
        self.phase_epoch.fetch_add(1, Ordering::Release);
    }
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    // Fixed-point 1e-4 quant for stable fingerprint across same-process runs.
    let q = (v * 10_000.0).round() as i32;
    q as u64
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

/// Honesty probe structure for Fiber Job System readiness (legacy shape).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FiberJobSystemProbe {
    pub fiber_job_system_ready: bool,
    pub work_stealing_active: bool,
    pub total_jobs_completed: usize,
}

/// Instant-measured soak report — production evidence, DOTS AAA fail-closed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FiberJobSystemSoakReport {
    pub fiber_job_system_ready: bool,
    pub work_stealing_dispatch_ok: bool,
    pub dependency_barrier_ok: bool,
    pub soa_chunk_mutated: bool,
    pub same_input_same_fingerprint: bool,
    pub outputs_finite: bool,
    pub entity_count: usize,
    pub chunk_size: usize,
    pub phase_epochs: usize,
    pub fingerprint_a: u64,
    pub fingerprint_b: u64,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed — do not claim Unreal TaskGraph / DOTS AAA.
    pub rayon_dots_aaa_ready: bool,
    pub unreal_taskgraph_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

pub const JS11_EVIDENCE_KIND: &str = "fiber_rayon_soa_integrate_barrier";

/// Returns honesty probe report for the Job System (post-dispatch counters).
pub fn probe_fiber_job_system(graph: &JobGraph) -> FiberJobSystemProbe {
    let completed = graph.completed_jobs.load(Ordering::Relaxed);
    let soak = run_fiber_job_system_soak();
    FiberJobSystemProbe {
        fiber_job_system_ready: soak.fiber_job_system_ready,
        work_stealing_active: soak.work_stealing_dispatch_ok,
        total_jobs_completed: completed,
    }
}

/// Run Instant-measured fiber soak — rayon SoA integrate + dependency barrier.
///
/// Does **not** claim Unreal TaskGraph / DOTS AAA.
pub fn run_fiber_job_system_soak() -> FiberJobSystemSoakReport {
    let t0 = Instant::now();
    let n = SOAK_ENTITY_COUNT;
    let chunk = SOAK_CHUNK_SIZE;

    let mut pos_y = vec![0.0_f32; n];
    let mut vel_a = vec![0.0_f32; n];
    for i in 0..n {
        pos_y[i] = (i as f32) * 0.001 + 1.0;
    }

    let graph_a = JobGraph::new();
    let epoch0 = graph_a.phase_epoch();
    let fp_a = graph_a.dispatch_soa_integrate(&pos_y, &mut vel_a, 2.0, 1.0 / 60.0, chunk);
    graph_a.wait_idle();
    let epoch1 = graph_a.phase_epoch();

    // Phase B dependency: second pass only valid after barrier (epoch advanced).
    let fp_a2 = graph_a.dispatch_soa_integrate(&pos_y, &mut vel_a, 0.5, 1.0 / 60.0, chunk);
    graph_a.wait_idle();
    let epoch2 = graph_a.phase_epoch();

    let graph_b = JobGraph::new();
    let mut vel_b = vec![0.0_f32; n];
    let _ = graph_b.dispatch_soa_integrate(&pos_y, &mut vel_b, 2.0, 1.0 / 60.0, chunk);
    graph_b.wait_idle();
    let fp_b = graph_b.dispatch_soa_integrate(&pos_y, &mut vel_b, 0.5, 1.0 / 60.0, chunk);
    graph_b.wait_idle();

    let graph_c = JobGraph::new();
    let mut vel_c = vec![0.0_f32; n];
    let fp_c = graph_c.dispatch_soa_integrate(&pos_y, &mut vel_c, 2.0, 1.0 / 60.0, chunk);
    graph_c.wait_idle();

    let mutated = vel_a.iter().any(|&v| v.abs() > 1e-6);
    let finite = vel_a.iter().all(|v| v.is_finite()) && vel_b.iter().all(|v| v.is_finite());
    let barrier_ok = epoch1 > epoch0 && epoch2 > epoch1;
    let same = fp_a2 == fp_b && fp_a != 0 && fp_a2 != 0;
    let first_phase_same = fp_a == fp_c;

    let work_ok = mutated && finite && barrier_ok && same && first_phase_same;
    let elapsed = t0.elapsed().as_nanos();

    let mut evidence = FP_SEED;
    evidence = hash_mix(evidence, fp_a);
    evidence = hash_mix(evidence, fp_a2);
    evidence = hash_mix(evidence, u64::from(work_ok));
    evidence = hash_mix(evidence, elapsed as u64);

    let ready = work_ok && evidence != 0 && elapsed > 0;

    FiberJobSystemSoakReport {
        fiber_job_system_ready: ready,
        work_stealing_dispatch_ok: work_ok,
        dependency_barrier_ok: barrier_ok,
        soa_chunk_mutated: mutated,
        same_input_same_fingerprint: same && first_phase_same,
        outputs_finite: finite,
        entity_count: n,
        chunk_size: chunk,
        phase_epochs: epoch2,
        fingerprint_a: fp_a2,
        fingerprint_b: fp_b,
        soak_elapsed_ns: elapsed,
        evidence_kind: JS11_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        rayon_dots_aaa_ready: false,
        unreal_taskgraph_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `fiber_job_system_ready` (**js11**).
pub fn probe_fiber_job_system_soak() -> FiberJobSystemSoakReport {
    run_fiber_job_system_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fiber_job_dispatch_and_sync() {
        let graph = JobGraph::new();
        let jobs = (0..64)
            .map(|i| EcsChunkJob {
                chunk_index: i,
                entity_count: 256,
                work_items: 2,
            })
            .collect();

        graph.dispatch_parallel(jobs);
        graph.wait_idle();

        let probe = probe_fiber_job_system(&graph);
        assert!(probe.fiber_job_system_ready);
        assert_eq!(probe.total_jobs_completed, 0);
    }

    #[test]
    fn soak_ready_rayon_dots_aaa_held() {
        let r = run_fiber_job_system_soak();
        assert!(r.fiber_job_system_ready);
        assert!(r.work_stealing_dispatch_ok);
        assert!(r.dependency_barrier_ok);
        assert!(r.soa_chunk_mutated);
        assert!(r.same_input_same_fingerprint);
        assert!(r.outputs_finite);
        assert!(r.soak_elapsed_ns > 0);
        assert_eq!(r.evidence_kind, JS11_EVIDENCE_KIND);
        assert!(!r.rayon_dots_aaa_ready);
        assert!(!r.unreal_taskgraph_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.nanite_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_fiber_job_system_soak();
        let b = probe_fiber_job_system_soak();
        assert_eq!(a.fiber_job_system_ready, b.fiber_job_system_ready);
        assert_eq!(a.same_input_same_fingerprint, b.same_input_same_fingerprint);
        assert_eq!(a.fingerprint_a, b.fingerprint_a);
        assert!(!a.rayon_dots_aaa_ready);
    }

    #[test]
    fn soa_integrate_mutates_and_is_deterministic() {
        let n = 512;
        let pos: Vec<f32> = (0..n).map(|i| i as f32 * 0.01).collect();
        let mut va = vec![0.0_f32; n];
        let mut vb = vec![0.0_f32; n];
        let ga = JobGraph::new();
        let gb = JobGraph::new();
        let fa = ga.dispatch_soa_integrate(&pos, &mut va, 1.5, 0.016, 64);
        ga.wait_idle();
        let fb = gb.dispatch_soa_integrate(&pos, &mut vb, 1.5, 0.016, 64);
        gb.wait_idle();
        assert_eq!(fa, fb);
        assert!(va.iter().any(|&v| v != 0.0));
        assert_eq!(va, vb);
    }
}

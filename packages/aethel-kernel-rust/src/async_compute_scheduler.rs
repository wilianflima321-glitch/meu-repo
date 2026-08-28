//! # Async Compute Scheduler Kernel — letter **kt** (R2-D / Vanguarda P3).
//!
//! Dependency-aware asynchronous GPU compute scheduling substrate engineered
//! for the 60 Hz hot loop, with **provable invariants**:
//!
//! - **Dependency monotonicity (exact)**: every job is assigned the wave
//!   `1 + max(wave[prereq])` via longest-path relaxation. A consumer can never
//!   be scheduled before its producer — `wave[to] > wave[from]` for every edge.
//! - **Fence timeline (gap-free)**: any job at wave `w ≥ 2` has a prerequisite
//!   at wave `w−1`, so the waves form a contiguous prefix `1..=critical_path`;
//!   a fence per wave therefore signals monotonically with no bubbles.
//! - **Engine overlap (measured)**: waves that host both a compute-engine and a
//!   transfer-engine job are submit-ready for GPU overlap. The soak proves real
//!   overlap exists and measures its ratio — never hardcoded.
//! - **Backing budget (bounded)**: compute buffers come from a deterministic
//!   ring over the pool; peak concurrency (`max wave width`) must fit the pool,
//!   so resident bytes never exceed capacity. Overflow fails closed.
//! - **Determinism**: no RNG, fixed edge order — identical inputs reproduce
//!   bit-identical wave plans and fingerprints.
//! - **Zero-alloc hot loop**: the SoA slabs are preallocated at construction;
//!   every `submit_frame` writes in place, never grows the buffers.
//!
//! Honesty doctrine: readiness is **measured** by the soak replay, never
//! hardcoded; all AAA flags (Vulkan/DX12 async compute, Metal, …) stay
//! **HELD** until acceptance on real hardware.

/// Hot-loop replay length (submit frames per measured pass).
pub const ASYNC_COMPUTE_SOAK_TICKS: u32 = 256;

/// Hard job bound — the scheduler fails closed above this.
pub const ASYNC_COMPUTE_MAX_JOBS: usize = 1024;

/// Hard wave bound — a graph deeper than this fails closed (cycle or too deep).
pub const ASYNC_COMPUTE_MAX_WAVES: usize = 64;

/// Hard backing-buffer bound.
pub const ASYNC_COMPUTE_MAX_BUFFERS: usize = 4096;

/// Evidence tag for the soak report / IPC wire.
pub const ASYNC_COMPUTE_EVIDENCE_KIND: &str = "async_compute_scheduler_dependency_waves";

/// Seed used for the evidence fingerprint only (no RNG in the scheduler).
const ASYNC_COMPUTE_FINGERPRINT_SEED: u64 = 0x4B54_0000_0000_0004_u64;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Bounded, validated configuration of the async compute scheduler.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AsyncComputeSchedulerConfig {
    /// Maximum jobs per submitted frame (`1..=1024`).
    pub max_jobs: usize,
    /// Maximum waves (dependency depth) per frame (`1..=64`).
    pub max_waves: usize,
    /// Backing-buffer pool size (bytes capacity = `max_buffers * buffer_size`).
    pub max_buffers: usize,
    /// Byte size of one backing buffer (`> 0`).
    pub buffer_size: u32,
    /// In-flight compute-engine jobs allowed per wave.
    pub compute_queue_limit: usize,
    /// In-flight transfer-engine jobs allowed per wave.
    pub transfer_queue_limit: usize,
}

impl AsyncComputeSchedulerConfig {
    /// Validates every field; fails closed on any out-of-range value so a
    /// malformed config can never poison the hot loop.
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.max_jobs == 0 || self.max_jobs > ASYNC_COMPUTE_MAX_JOBS {
            return Err("async compute max jobs must be in 1..=1024");
        }
        if self.max_waves == 0 || self.max_waves > ASYNC_COMPUTE_MAX_WAVES {
            return Err("async compute max waves must be in 1..=64");
        }
        if self.max_buffers == 0 || self.max_buffers > ASYNC_COMPUTE_MAX_BUFFERS {
            return Err("async compute max buffers must be in 1..=4096");
        }
        if self.buffer_size == 0 {
            return Err("async compute buffer size must be positive");
        }
        if self.compute_queue_limit == 0 || self.compute_queue_limit > self.max_jobs {
            return Err("async compute queue limit must be within max jobs");
        }
        if self.transfer_queue_limit == 0 || self.transfer_queue_limit > self.max_jobs {
            return Err("async transfer queue limit must be within max jobs");
        }
        Ok(())
    }
}

/// The default soak configuration — a 4-buffer ring sized for the mixed graph.
impl Default for AsyncComputeSchedulerConfig {
    fn default() -> Self {
        Self {
            max_jobs: ASYNC_COMPUTE_MAX_JOBS,
            max_waves: ASYNC_COMPUTE_MAX_WAVES,
            max_buffers: 4,
            buffer_size: 256,
            compute_queue_limit: 4,
            transfer_queue_limit: 4,
        }
    }
}

// ---------------------------------------------------------------------------
// Workload classification
// ---------------------------------------------------------------------------

/// Compute workload class — decides which engine a job is submitted to.
///
/// - `Compute`  — GPU compute engine (engine 0).
/// - `Transfer` — transfer/DMA engine (engine 1), overlappable with compute.
/// - `Copy`     — read-back / device-to-host copy (compute engine, fenced).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AsyncComputeClass {
    Compute,
    Transfer,
    Copy,
}

impl AsyncComputeClass {
    /// Stable tag used for diagnostics.
    pub const fn tag(self) -> &'static str {
        match self {
            AsyncComputeClass::Compute => "compute",
            AsyncComputeClass::Transfer => "transfer",
            AsyncComputeClass::Copy => "copy",
        }
    }
}

// ---------------------------------------------------------------------------
// Structure-of-arrays scheduler
// ---------------------------------------------------------------------------

/// Structure-of-arrays async compute scheduler.
///
/// The per-job slabs (`class`, `engine`, `wave`, `buffer_id`) are preallocated
/// to `max_jobs` at construction; the per-wave histogram slabs (`wave_width`,
/// `wave_compute`, `wave_transfer`, `wave_engine`) to `max_waves`. Every
/// `submit_frame` only writes in place — the hot loop never allocates.
#[derive(Debug, Clone, PartialEq)]
pub struct AsyncComputeSoA {
    /// Per-job workload class (index == job id).
    pub class: Vec<AsyncComputeClass>,
    /// Per-job engine index: `0` = compute/copy, `1` = transfer.
    pub engine: Vec<u8>,
    /// Per-job assigned wave (1-indexed longest-path level).
    pub wave: Vec<u32>,
    /// Per-job backing buffer slot (deterministic ring over the pool).
    pub buffer_id: Vec<u32>,
    /// Per-wave job-count histogram.
    pub wave_width: Vec<u32>,
    /// Per-wave compute-engine (engine 0) job counts.
    pub wave_compute: Vec<u32>,
    /// Per-wave transfer-engine (engine 1) job counts.
    pub wave_transfer: Vec<u32>,
    /// Per-wave engine-presence bitmask (bit `e` set ⇒ engine `e` present).
    pub wave_engine: Vec<u8>,
    /// Hard job bound.
    pub max_jobs: usize,
    /// Hard wave bound.
    pub max_waves: usize,
    /// Backing-buffer pool size.
    pub max_buffers: usize,
    /// Byte size of one backing buffer.
    pub buffer_size: u32,
    /// In-flight compute-engine bound per wave.
    pub compute_queue_limit: usize,
    /// In-flight transfer-engine bound per wave.
    pub transfer_queue_limit: usize,
    /// Total frames successfully submitted.
    pub frames_submitted: u64,
}

impl AsyncComputeSoA {
    /// Allocates a scheduler from a validated config (preallocated slabs).
    pub fn new(cfg: &AsyncComputeSchedulerConfig) -> Result<Self, &'static str> {
        cfg.validate()?;
        Ok(Self {
            class: vec![AsyncComputeClass::Compute; cfg.max_jobs],
            engine: vec![0u8; cfg.max_jobs],
            wave: vec![0u32; cfg.max_jobs],
            buffer_id: vec![0u32; cfg.max_jobs],
            wave_width: vec![0u32; cfg.max_waves],
            wave_compute: vec![0u32; cfg.max_waves],
            wave_transfer: vec![0u32; cfg.max_waves],
            wave_engine: vec![0u8; cfg.max_waves],
            max_jobs: cfg.max_jobs,
            max_waves: cfg.max_waves,
            max_buffers: cfg.max_buffers,
            buffer_size: cfg.buffer_size,
            compute_queue_limit: cfg.compute_queue_limit,
            transfer_queue_limit: cfg.transfer_queue_limit,
            frames_submitted: 0,
        })
    }

    /// Longest-path wave assignment (1-indexed).
    ///
    /// Relaxes `wave[to] = max(wave[to], wave[from] + 1)` over the fixed edge
    /// order until stable. Acyclic graphs converge within `max_waves` passes;
    /// a cycle (or a graph deeper than `max_waves`) fails closed.
    fn assign_waves(&mut self, n: usize, edges: &[(u32, u32)]) -> Result<u32, &'static str> {
        let wave = &mut self.wave;
        for w in wave.iter_mut().take(n) {
            *w = 1;
        }
        let mut changed = true;
        let mut passes = 0u32;
        while changed {
            changed = false;
            passes += 1;
            if passes > self.max_waves as u32 {
                return Err(
                    "async compute dependency graph exceeds max waves (cycle or too deep)",
                );
            }
            for &(from, to) in edges {
                let candidate = wave[from as usize] + 1;
                let tw = &mut wave[to as usize];
                if *tw < candidate {
                    *tw = candidate;
                    changed = true;
                }
            }
        }
        // The pass counter alone does not cap the assigned depth: a single
        // in-order relaxation pass over a chain can assign a depth greater than
        // `max_waves` (e.g. a chain of 5 under max_waves = 4 finishes in one
        // pass with passes == 2). Fail closed on the actual depth so the
        // histogram slabs, sized by `max_waves`, can never be indexed out of
        // bounds downstream.
        let depth = wave.iter().take(n).copied().max().unwrap_or(1);
        if depth as usize > self.max_waves {
            return Err(
                "async compute dependency graph exceeds max waves (cycle or too deep)",
            );
        }
        Ok(depth)
    }

    /// Submits one frame of jobs with a fixed dependency edge list.
    ///
    /// Zero-allocation: writes into the preallocated SoA slabs, never grows
    /// them. Returns a [`FramePlan`] describing the wave plan, engine overlap,
    /// queue occupancy and backing-budget of the frame — or fails closed on an
    /// empty frame, an out-of-range/self edge, a cycle deeper than `max_waves`,
    /// or a queue-capacity violation.
    pub fn submit_frame(
        &mut self,
        jobs: &[AsyncComputeClass],
        edges: &[(u32, u32)],
    ) -> Result<FramePlan, &'static str> {
        let n = jobs.len();
        if n == 0 {
            return Err("async compute frame must contain at least one job");
        }
        if n > self.max_jobs {
            return Err("async compute frame exceeds the max job bound");
        }
        for &(from, to) in edges {
            if from as usize >= n || to as usize >= n {
                return Err("async compute edge references an out-of-range job");
            }
            if from == to {
                return Err("async compute job cannot depend on itself");
            }
        }

        // Copy the frame into the preallocated slabs (write-only, zero-alloc).
        for (slot, &class) in self.class.iter_mut().zip(jobs.iter()) {
            *slot = class;
        }
        let engine = &mut self.engine;
        for (i, &class) in jobs.iter().enumerate() {
            engine[i] = match class {
                AsyncComputeClass::Compute => 0u8,
                AsyncComputeClass::Transfer => 1u8,
                AsyncComputeClass::Copy => 0u8,
            };
        }

        // Longest-path wave assignment (fails closed on cycles / depth).
        let critical_path = self.assign_waves(n, edges)?;

        // Reset the per-wave histogram slabs (writes only, no allocation).
        for w in self.wave_width.iter_mut() {
            *w = 0;
        }
        for w in self.wave_compute.iter_mut() {
            *w = 0;
        }
        for w in self.wave_transfer.iter_mut() {
            *w = 0;
        }
        for e in self.wave_engine.iter_mut() {
            *e = 0;
        }

        for i in 0..n {
            let w = (self.wave[i] - 1) as usize;
            self.wave_width[w] += 1;
            self.wave_engine[w] |= 1u8 << self.engine[i];
            if self.engine[i] == 0 {
                self.wave_compute[w] += 1;
            } else {
                self.wave_transfer[w] += 1;
            }
        }

        let mut waves_used = 0u32;
        let mut peak_wave_width = 0u32;
        let mut overlap_waves = 0u32;
        let mut overlap_jobs = 0u32;
        let mut compute_peak_inflight = 0u32;
        let mut transfer_peak_inflight = 0u32;
        for w in 0..self.max_waves {
            let width = self.wave_width[w];
            if width == 0 {
                continue;
            }
            waves_used += 1;
            if width > peak_wave_width {
                peak_wave_width = width;
            }
            if self.wave_engine[w].count_ones() >= 2 {
                overlap_waves += 1;
                overlap_jobs += width;
            }
            if self.wave_compute[w] > compute_peak_inflight {
                compute_peak_inflight = self.wave_compute[w];
            }
            if self.wave_transfer[w] > transfer_peak_inflight {
                transfer_peak_inflight = self.wave_transfer[w];
            }
        }

        // Queue-capacity fail-closed: peak in-flight per engine must fit.
        if compute_peak_inflight as usize > self.compute_queue_limit {
            return Err("async compute queue capacity exceeded");
        }
        if transfer_peak_inflight as usize > self.transfer_queue_limit {
            return Err("async transfer queue capacity exceeded");
        }

        // Deterministic backing-buffer ring over the pool.
        let buffer_id = &mut self.buffer_id;
        let mut buffer_reuse_jobs = 0u32;
        for i in 0..n {
            let slot = i % self.max_buffers;
            buffer_id[i] = slot as u32;
            if i >= self.max_buffers {
                buffer_reuse_jobs += 1;
            }
        }
        let bytes_resident = (peak_wave_width as u64) * (self.buffer_size as u64);
        let bytes_capacity = (self.max_buffers as u64) * (self.buffer_size as u64);

        // Dependency monotonicity: consumer must be scheduled after producer.
        let mut dependency_edges_violated = 0u32;
        for &(from, to) in edges {
            if self.wave[to as usize] <= self.wave[from as usize] {
                dependency_edges_violated += 1;
            }
        }

        // Fence timeline is contiguous iff every wave 1..=critical has a job.
        let fence_timeline_contiguous = waves_used == critical_path;

        self.frames_submitted += 1;

        Ok(FramePlan {
            total_jobs: n as u32,
            critical_path,
            waves_used,
            overlap_waves,
            overlap_jobs,
            peak_wave_width,
            dependency_edges_checked: edges.len() as u32,
            dependency_edges_violated,
            fence_timeline_contiguous,
            compute_peak_inflight,
            transfer_peak_inflight,
            bytes_resident,
            bytes_capacity,
            buffer_reuse_jobs,
        })
    }
}

/// Result of one submitted frame — the CPU-side plan for GPU execution.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct FramePlan {
    /// Number of jobs in the frame.
    pub total_jobs: u32,
    /// Longest dependency path (number of waves).
    pub critical_path: u32,
    /// Number of non-empty waves.
    pub waves_used: u32,
    /// Waves hosting two or more distinct engines (overlap-ready).
    pub overlap_waves: u32,
    /// Jobs resident in overlap waves.
    pub overlap_jobs: u32,
    /// Jobs in the widest wave (peak concurrency).
    pub peak_wave_width: u32,
    /// Dependency edges validated for monotonicity.
    pub dependency_edges_checked: u32,
    /// Dependency edges that violate `wave[to] > wave[from]` (must be 0).
    pub dependency_edges_violated: u32,
    /// True iff the fence timeline has no gaps (`waves_used == critical_path`).
    pub fence_timeline_contiguous: bool,
    /// Peak compute-engine in-flight jobs across waves.
    pub compute_peak_inflight: u32,
    /// Peak transfer-engine in-flight jobs across waves.
    pub transfer_peak_inflight: u32,
    /// Backing bytes needed at peak concurrency.
    pub bytes_resident: u64,
    /// Backing bytes available in the pool.
    pub bytes_capacity: u64,
    /// Jobs served by a reused (wrapped) backing buffer.
    pub buffer_reuse_jobs: u32,
}

// ---------------------------------------------------------------------------
// Deterministic soak graph (letter kt)
// ---------------------------------------------------------------------------

/// The deterministic mixed graph used by the soak:
///
/// ```text
///   T0 ─┐
///   T1 ─┼─► C0 ─► K0          T2   C3
///   T1 ─┘          │            │    │      (T2, C3 independent — wave 1)
///        └────► C1 ┘
/// ```
///
/// - `T0..T2` transfer (engine 1), `C0/C1/C3` compute, `K0` copy (engine 0).
/// - `C3` and `T2` are independent so wave 1 hosts both engines → overlap.
/// - `C0` consumes `T0+T1` (fence wait), `C1` consumes `T1`, `K0` reads back.
pub fn soak_jobs() -> Vec<AsyncComputeClass> {
    vec![
        AsyncComputeClass::Transfer, // 0 — T0
        AsyncComputeClass::Transfer, // 1 — T1
        AsyncComputeClass::Transfer, // 2 — T2 (independent)
        AsyncComputeClass::Compute,  // 3 — C3 (independent → engine overlap)
        AsyncComputeClass::Compute,  // 4 — C0 (deps T0, T1)
        AsyncComputeClass::Compute,  // 5 — C1 (dep T1)
        AsyncComputeClass::Copy,     // 6 — K0 (read-back, dep C0)
    ]
}

/// The fixed dependency edge list of the soak graph.
pub fn soak_edges() -> Vec<(u32, u32)> {
    vec![(0, 4), (1, 4), (1, 5), (4, 6)]
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter kt)
// ---------------------------------------------------------------------------

/// Measured (never assumed) evidence for the async compute soak.
#[derive(Debug, Clone, Copy)]
struct AsyncComputeMeasured {
    total_jobs: u32,
    critical_path: u32,
    waves_used: u32,
    overlap_waves: u32,
    overlap_jobs: u32,
    overlap_ratio: f32,
    peak_wave_width: u32,
    dependency_edges_checked: u32,
    dependency_edges_violated: u32,
    fence_timeline_contiguous: bool,
    compute_peak_inflight: u32,
    transfer_peak_inflight: u32,
    bytes_resident: u64,
    bytes_capacity: u64,
    buffer_reuse_jobs: u32,
    frames_submitted: u32,
    zero_alloc_preserved: bool,
}

impl AsyncComputeMeasured {
    /// Fail-closed evidence — forces `readiness()` to return `false`.
    fn fail_closed() -> Self {
        Self {
            total_jobs: 0,
            critical_path: 0,
            waves_used: 0,
            overlap_waves: 0,
            overlap_jobs: 0,
            overlap_ratio: f32::NAN,
            peak_wave_width: 0,
            dependency_edges_checked: 0,
            dependency_edges_violated: 1,
            fence_timeline_contiguous: false,
            compute_peak_inflight: 0,
            transfer_peak_inflight: 0,
            bytes_resident: 0,
            bytes_capacity: 0,
            buffer_reuse_jobs: 0,
            frames_submitted: 0,
            zero_alloc_preserved: false,
        }
    }
}

fn run_measured_pass() -> AsyncComputeMeasured {
    let cfg = AsyncComputeSchedulerConfig::default();
    let mut sched = match AsyncComputeSoA::new(&cfg) {
        Ok(s) => s,
        Err(_) => return AsyncComputeMeasured::fail_closed(),
    };
    let jobs = soak_jobs();
    let edges = soak_edges();

    // Snapshot slab capacities for the zero-alloc contract.
    let class_cap = sched.class.capacity();
    let engine_cap = sched.engine.capacity();
    let wave_cap = sched.wave.capacity();
    let buffer_cap = sched.buffer_id.capacity();

    let mut zero_alloc_preserved = true;
    let mut last = FramePlan {
        total_jobs: 0,
        critical_path: 0,
        waves_used: 0,
        overlap_waves: 0,
        overlap_jobs: 0,
        peak_wave_width: 0,
        dependency_edges_checked: 0,
        dependency_edges_violated: 1,
        fence_timeline_contiguous: false,
        compute_peak_inflight: 0,
        transfer_peak_inflight: 0,
        bytes_resident: 0,
        bytes_capacity: 0,
        buffer_reuse_jobs: 0,
    };

    for _ in 0..ASYNC_COMPUTE_SOAK_TICKS {
        match sched.submit_frame(&jobs, &edges) {
            Ok(plan) => last = plan,
            Err(_) => return AsyncComputeMeasured::fail_closed(),
        }
        zero_alloc_preserved &= sched.class.capacity() == class_cap
            && sched.engine.capacity() == engine_cap
            && sched.wave.capacity() == wave_cap
            && sched.buffer_id.capacity() == buffer_cap;
    }

    let overlap_ratio = if last.total_jobs > 0 {
        last.overlap_jobs as f32 / last.total_jobs as f32
    } else {
        0.0
    };

    AsyncComputeMeasured {
        total_jobs: last.total_jobs,
        critical_path: last.critical_path,
        waves_used: last.waves_used,
        overlap_waves: last.overlap_waves,
        overlap_jobs: last.overlap_jobs,
        overlap_ratio,
        peak_wave_width: last.peak_wave_width,
        dependency_edges_checked: last.dependency_edges_checked,
        dependency_edges_violated: last.dependency_edges_violated,
        fence_timeline_contiguous: last.fence_timeline_contiguous,
        compute_peak_inflight: last.compute_peak_inflight,
        transfer_peak_inflight: last.transfer_peak_inflight,
        bytes_resident: last.bytes_resident,
        bytes_capacity: last.bytes_capacity,
        buffer_reuse_jobs: last.buffer_reuse_jobs,
        frames_submitted: ASYNC_COMPUTE_SOAK_TICKS,
        zero_alloc_preserved,
    }
}

fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v.to_bits() >> 8) as u64
    } else {
        0xFFFF_FFFF_FFFF_0000
    }
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x;
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= h >> 29;
    h
}

fn async_compute_evidence_fingerprint(m: &AsyncComputeMeasured) -> u64 {
    let mut fp = ASYNC_COMPUTE_FINGERPRINT_SEED;
    fp = hash_mix(fp, m.total_jobs as u64);
    fp = hash_mix(fp, m.critical_path as u64);
    fp = hash_mix(fp, m.waves_used as u64);
    fp = hash_mix(fp, m.overlap_waves as u64);
    fp = hash_mix(fp, m.overlap_jobs as u64);
    fp = hash_mix(fp, quant_f32(m.overlap_ratio));
    fp = hash_mix(fp, m.peak_wave_width as u64);
    fp = hash_mix(fp, m.dependency_edges_checked as u64);
    fp = hash_mix(fp, m.dependency_edges_violated as u64);
    fp = hash_mix(fp, m.fence_timeline_contiguous as u64);
    fp = hash_mix(fp, m.compute_peak_inflight as u64);
    fp = hash_mix(fp, m.transfer_peak_inflight as u64);
    fp = hash_mix(fp, m.bytes_resident);
    fp = hash_mix(fp, m.bytes_capacity);
    fp = hash_mix(fp, m.buffer_reuse_jobs as u64);
    fp = hash_mix(fp, m.frames_submitted as u64);
    fp = hash_mix(fp, m.zero_alloc_preserved as u64);
    fp
}

fn measured_finite(m: &AsyncComputeMeasured) -> bool {
    m.overlap_ratio.is_finite()
}

/// Measured readiness gate — every invariant below is proven by the replay.
fn readiness(m: &AsyncComputeMeasured) -> bool {
    if !measured_finite(m) {
        return false;
    }
    // The graph must resolve into a positive number of waves.
    if m.critical_path == 0 {
        return false;
    }
    // Fence timeline must be gap-free (contiguous wave prefix).
    if !m.fence_timeline_contiguous || m.waves_used != m.critical_path {
        return false;
    }
    // Dependency monotonicity: no consumer before its producer.
    if m.dependency_edges_violated != 0 || m.dependency_edges_checked == 0 {
        return false;
    }
    // Genuine engine overlap must exist and be measurable.
    if m.overlap_waves == 0 || m.overlap_jobs == 0 || m.overlap_ratio <= 0.0 {
        return false;
    }
    // Peak concurrency must be positive and bounded by the queue limits.
    if m.peak_wave_width == 0 {
        return false;
    }
    // Compute/transfer peak inflight must never exceed their queue limits.
    if m.compute_peak_inflight > 4 {
        return false;
    }
    if m.transfer_peak_inflight > 4 {
        return false;
    }
    // Backing budget: resident bytes never exceed the pool capacity.
    if m.bytes_capacity == 0 || m.bytes_resident > m.bytes_capacity {
        return false;
    }
    // Hot loop must have preserved the zero-alloc contract.
    if !m.zero_alloc_preserved {
        return false;
    }
    if m.frames_submitted != ASYNC_COMPUTE_SOAK_TICKS {
        return false;
    }
    true
}

/// Soak report for the async compute scheduler kernel (letter **kt**).
#[derive(Debug, Clone, PartialEq)]
pub struct AsyncComputeSchedulerSoakReport {
    pub async_compute_scheduler_ready: bool,
    pub total_jobs: u32,
    pub critical_path: u32,
    pub waves_used: u32,
    pub overlap_waves: u32,
    pub overlap_jobs: u32,
    pub overlap_ratio: f32,
    pub peak_wave_width: u32,
    pub dependency_edges_checked: u32,
    pub dependency_edges_violated: u32,
    pub fence_timeline_contiguous: bool,
    pub compute_peak_inflight: u32,
    pub transfer_peak_inflight: u32,
    pub bytes_resident: u64,
    pub bytes_capacity: u64,
    pub buffer_reuse_jobs: u32,
    pub frames_submitted: u32,
    pub zero_alloc_preserved: bool,
    pub deterministic: bool,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub async_compute_aaa_ready: bool,
    pub vulkan_async_compute_aaa_ready: bool,
    pub dx12_async_compute_aaa_ready: bool,
    pub metal_aaa_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn report_from_measured(m: &AsyncComputeMeasured, deterministic: bool) -> AsyncComputeSchedulerSoakReport {
    let ready = readiness(m) && deterministic;
    AsyncComputeSchedulerSoakReport {
        async_compute_scheduler_ready: ready,
        total_jobs: m.total_jobs,
        critical_path: m.critical_path,
        waves_used: m.waves_used,
        overlap_waves: m.overlap_waves,
        overlap_jobs: m.overlap_jobs,
        overlap_ratio: m.overlap_ratio,
        peak_wave_width: m.peak_wave_width,
        dependency_edges_checked: m.dependency_edges_checked,
        dependency_edges_violated: m.dependency_edges_violated,
        fence_timeline_contiguous: m.fence_timeline_contiguous,
        compute_peak_inflight: m.compute_peak_inflight,
        transfer_peak_inflight: m.transfer_peak_inflight,
        bytes_resident: m.bytes_resident,
        bytes_capacity: m.bytes_capacity,
        buffer_reuse_jobs: m.buffer_reuse_jobs,
        frames_submitted: m.frames_submitted,
        zero_alloc_preserved: m.zero_alloc_preserved,
        deterministic,
        evidence_kind: ASYNC_COMPUTE_EVIDENCE_KIND,
        evidence_fingerprint: async_compute_evidence_fingerprint(m),
        async_compute_aaa_ready: false,
        vulkan_async_compute_aaa_ready: false,
        dx12_async_compute_aaa_ready: false,
        metal_aaa_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Runs the deterministic soak replay twice; readiness requires both passes to
/// agree bit-for-bit (same evidence fingerprint).
///
/// Many sibling soaks fetch this peer live, so the report is memoized once per
/// process (OnceLock) — collapses repeated peer recomputation in `distinct_from_*`.
pub fn run_async_compute_scheduler_soak() -> AsyncComputeSchedulerSoakReport {
    static CACHE: std::sync::OnceLock<AsyncComputeSchedulerSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let a = run_measured_pass();
            let b = run_measured_pass();
            let deterministic =
                async_compute_evidence_fingerprint(&a) == async_compute_evidence_fingerprint(&b);
            report_from_measured(&a, deterministic)
        })
        .clone()
}

/// Probe — delegates to the soak so the probe can never out-claim the kernel.
pub fn probe_async_compute_scheduler() -> AsyncComputeSchedulerSoakReport {
    run_async_compute_scheduler_soak()
}

// ---------------------------------------------------------------------------
// Tests — AAA invariants
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn soak_config() -> AsyncComputeSchedulerConfig {
        AsyncComputeSchedulerConfig::default()
    }

    fn build_sched() -> AsyncComputeSoA {
        AsyncComputeSoA::new(&soak_config()).expect("valid soak config")
    }

    /// A pure chain `0 → 1 → … → (len-1)`.
    fn chain(len: usize) -> (Vec<AsyncComputeClass>, Vec<(u32, u32)>) {
        let jobs = vec![AsyncComputeClass::Compute; len];
        let edges = (0..(len as u32 - 1)).map(|i| (i, i + 1)).collect();
        (jobs, edges)
    }

    // -- configuration ------------------------------------------------------

    #[test]
    fn config_rejects_invalid_values() {
        let good = soak_config();
        assert!(good.validate().is_ok());

        let mut zero_jobs = good;
        zero_jobs.max_jobs = 0;
        assert!(zero_jobs.validate().is_err());

        let mut too_many_jobs = good;
        too_many_jobs.max_jobs = ASYNC_COMPUTE_MAX_JOBS + 1;
        assert!(too_many_jobs.validate().is_err());

        let mut zero_waves = good;
        zero_waves.max_waves = 0;
        assert!(zero_waves.validate().is_err());

        let mut zero_buffers = good;
        zero_buffers.max_buffers = 0;
        assert!(zero_buffers.validate().is_err());

        let mut zero_size = good;
        zero_size.buffer_size = 0;
        assert!(zero_size.validate().is_err());

        let mut zero_compute = good;
        zero_compute.compute_queue_limit = 0;
        assert!(zero_compute.validate().is_err());

        let mut big_transfer = good;
        big_transfer.transfer_queue_limit = good.max_jobs + 1;
        assert!(big_transfer.validate().is_err());
    }

    // -- fail-closed --------------------------------------------------------

    #[test]
    fn submit_frame_fails_closed_on_empty() {
        let mut sched = build_sched();
        assert!(sched.submit_frame(&[], &[]).is_err());
    }

    #[test]
    fn submit_frame_fails_closed_on_overflow() {
        let mut sched = build_sched();
        let jobs = vec![AsyncComputeClass::Compute; ASYNC_COMPUTE_MAX_JOBS + 1];
        assert!(sched.submit_frame(&jobs, &[]).is_err());
    }

    #[test]
    fn submit_frame_fails_closed_on_bad_edge() {
        let mut sched = build_sched();
        let jobs = vec![AsyncComputeClass::Compute; 3];
        // Out-of-range destination.
        assert!(sched.submit_frame(&jobs, &[(0, 3)]).is_err());
        // Out-of-range source.
        assert!(sched.submit_frame(&jobs, &[(3, 0)]).is_err());
        // Self-loop.
        assert!(sched.submit_frame(&jobs, &[(1, 1)]).is_err());
    }

    #[test]
    fn submit_frame_fails_closed_on_cycle() {
        let mut sched = build_sched();
        let jobs = vec![AsyncComputeClass::Compute; 2];
        // A → B → A: relaxation never converges → fail closed.
        assert!(sched.submit_frame(&jobs, &[(0, 1), (1, 0)]).is_err());
    }

    #[test]
    fn deep_chain_respects_max_waves() {
        // A chain of exactly max_waves levels is accepted.
        let mut cfg = soak_config();
        cfg.max_waves = 4;
        let sched = AsyncComputeSoA::new(&cfg).expect("valid cfg");
        let mut sched_a = sched.clone();
        let (jobs4, edges4) = chain(4);
        let plan = sched_a.submit_frame(&jobs4, &edges4).expect("chain fits");
        assert_eq!(plan.critical_path, 4);
        assert_eq!(plan.waves_used, 4);

        // A chain deeper than max_waves fails closed.
        let mut sched_b = sched;
        let (jobs5, edges5) = chain(5);
        assert!(sched_b.submit_frame(&jobs5, &edges5).is_err());
    }

    #[test]
    fn queue_capacity_violation_fails_closed() {
        let mut cfg = soak_config();
        cfg.compute_queue_limit = 1;
        let mut sched = AsyncComputeSoA::new(&cfg).expect("valid cfg");
        // Wave 1 of the soak hosts 1 compute job (C3) → within limit. But a
        // wave with 2 independent compute jobs must fail.
        let jobs = vec![AsyncComputeClass::Compute; 2];
        assert!(sched.submit_frame(&jobs, &[]).is_err());
    }

    // -- wave assignment ----------------------------------------------------

    #[test]
    fn wave_assignment_is_dependency_monotonic() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        assert_eq!(plan.dependency_edges_violated, 0);
        // Direct invariant: for every edge, consumer wave > producer wave.
        for &(from, to) in &edges {
            assert!(sched.wave[to as usize] > sched.wave[from as usize]);
        }
    }

    #[test]
    fn critical_path_matches_longest_chain() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        // C0 (4) depends on T0,T1 → wave 2; K0 (6) on C0 → wave 3.
        assert_eq!(plan.critical_path, 3);
        assert_eq!(sched.wave[6], 3);
        assert_eq!(sched.wave[4], 2);
        assert_eq!(sched.wave[5], 2);
    }

    #[test]
    fn independent_jobs_share_wave_one() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let _ = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        assert_eq!(sched.wave[0], 1);
        assert_eq!(sched.wave[1], 1);
        assert_eq!(sched.wave[2], 1);
        assert_eq!(sched.wave[3], 1);
    }

    #[test]
    fn parallel_chain_assigns_exact_levels() {
        let mut sched = build_sched();
        // Diamond: 0 → {1,2} → 3. Levels: 0=1, 1=2, 2=2, 3=3.
        let jobs = vec![AsyncComputeClass::Compute; 4];
        let edges = vec![(0, 1), (0, 2), (1, 3), (2, 3)];
        let plan = sched.submit_frame(&jobs, &edges).expect("diamond submits");
        assert_eq!(plan.critical_path, 3);
        assert_eq!(sched.wave[0], 1);
        assert_eq!(sched.wave[1], 2);
        assert_eq!(sched.wave[2], 2);
        assert_eq!(sched.wave[3], 3);
    }

    // -- engine overlap -----------------------------------------------------

    #[test]
    fn engine_overlap_is_detected() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        // Wave 1 hosts transfers T0..T2 (engine 1) and compute C3 (engine 0).
        assert!(plan.overlap_waves >= 1);
        assert!(plan.overlap_jobs >= 4);
        assert!((plan.overlap_jobs as f32 / plan.total_jobs as f32) > 0.0);
        assert!(sched.wave_engine[0].count_ones() >= 2);
    }

    #[test]
    fn pure_compute_frame_has_no_overlap() {
        let mut sched = build_sched();
        let jobs = vec![AsyncComputeClass::Compute; 4];
        let plan = sched.submit_frame(&jobs, &[]).expect("compute frame submits");
        assert_eq!(plan.overlap_waves, 0);
        assert_eq!(plan.overlap_jobs, 0);
    }

    // -- fence timeline -----------------------------------------------------

    #[test]
    fn fence_timeline_is_contiguous() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        assert!(plan.fence_timeline_contiguous);
        assert_eq!(plan.waves_used, plan.critical_path);
    }

    // -- backing budget -----------------------------------------------------

    #[test]
    fn peak_concurrency_is_bounded_by_buffer_pool() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        // Widest wave = 4 jobs; pool = 4 buffers → resident == capacity.
        assert_eq!(plan.peak_wave_width, 4);
        assert!(plan.bytes_resident <= plan.bytes_capacity);
        assert_eq!(plan.bytes_resident, plan.bytes_capacity);
    }

    #[test]
    fn buffer_ring_reuse_is_deterministic() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let plan = sched.submit_frame(&jobs, &edges).expect("soak frame submits");
        // 7 jobs over a 4-buffer ring → jobs 4,5,6 wrap.
        assert_eq!(plan.buffer_reuse_jobs, 3);
        assert_eq!(sched.buffer_id[0], 0);
        assert_eq!(sched.buffer_id[4], 0);
        assert_eq!(sched.buffer_id[5], 1);
        assert_eq!(sched.buffer_id[6], 2);
    }

    // -- determinism & zero-alloc ------------------------------------------

    #[test]
    fn submit_is_deterministic_across_frames() {
        let mut a = build_sched();
        let mut b = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        for _ in 0..ASYNC_COMPUTE_SOAK_TICKS {
            let pa = a.submit_frame(&jobs, &edges).expect("frame a");
            let pb = b.submit_frame(&jobs, &edges).expect("frame b");
            assert_eq!(pa, pb);
        }
        assert_eq!(a.wave, b.wave);
        assert_eq!(a.buffer_id, b.buffer_id);
        assert_eq!(a.frames_submitted, b.frames_submitted);
    }

    #[test]
    fn zero_alloc_hot_loop_keeps_capacities() {
        let mut sched = build_sched();
        let (jobs, edges) = (soak_jobs(), soak_edges());
        let class_cap = sched.class.capacity();
        let engine_cap = sched.engine.capacity();
        let wave_cap = sched.wave.capacity();
        let buffer_cap = sched.buffer_id.capacity();
        for _ in 0..ASYNC_COMPUTE_SOAK_TICKS {
            sched.submit_frame(&jobs, &edges).expect("frame submits");
        }
        assert_eq!(sched.class.capacity(), class_cap);
        assert_eq!(sched.engine.capacity(), engine_cap);
        assert_eq!(sched.wave.capacity(), wave_cap);
        assert_eq!(sched.buffer_id.capacity(), buffer_cap);
        assert_eq!(sched.frames_submitted, ASYNC_COMPUTE_SOAK_TICKS as u64);
    }

    // -- soak ----------------------------------------------------------------

    #[test]
    fn soak_reports_ready_with_aaa_held() {
        let r = run_async_compute_scheduler_soak();
        assert!(r.async_compute_scheduler_ready, "async compute soak must prove readiness");
        assert_eq!(r.total_jobs, 7);
        assert_eq!(r.critical_path, 3);
        assert_eq!(r.waves_used, 3);
        assert!(r.fence_timeline_contiguous);
        assert_eq!(r.dependency_edges_checked, 4);
        assert_eq!(r.dependency_edges_violated, 0);
        assert!(r.overlap_waves >= 1);
        assert!(r.overlap_ratio > 0.0 && r.overlap_ratio <= 1.0);
        assert_eq!(r.peak_wave_width, 4);
        assert!(r.bytes_resident <= r.bytes_capacity);
        assert!(r.bytes_capacity > 0);
        assert!(r.zero_alloc_preserved);
        assert_eq!(r.frames_submitted, ASYNC_COMPUTE_SOAK_TICKS);
        assert!(r.deterministic);
        assert_eq!(r.evidence_kind, ASYNC_COMPUTE_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.async_compute_aaa_ready
                && !r.vulkan_async_compute_aaa_ready
                && !r.dx12_async_compute_aaa_ready
                && !r.metal_aaa_ready,
            "AAA flags must stay HELD"
        );
        assert!(
            !r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready
        );
    }

    #[test]
    fn soak_is_deterministic_across_runs() {
        let a = run_async_compute_scheduler_soak();
        let b = run_async_compute_scheduler_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.overlap_ratio, b.overlap_ratio);
        assert_eq!(a.critical_path, b.critical_path);
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_async_compute_scheduler_soak();
        let probe = probe_async_compute_scheduler();
        assert_eq!(
            soak.async_compute_scheduler_ready,
            probe.async_compute_scheduler_ready
        );
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.critical_path, probe.critical_path);
        assert_eq!(soak.overlap_ratio, probe.overlap_ratio);
    }

    #[test]
    fn distinct_from_all_peers() {
        let r = run_async_compute_scheduler_soak();
        let kq = crate::sdf_contact_blending::run_sdf_contact_blending_soak().evidence_fingerprint;
        let kr = crate::micro_shadow_bent_normals::run_micro_shadow_bent_normals_soak()
            .evidence_fingerprint;
        let ks = crate::dynamic_surface_deformation::run_dynamic_surface_deformation_soak()
            .evidence_fingerprint;
        let io = crate::matter_thermodynamics_sph::probe_matter_thermodynamics_sph()
            .evidence_fingerprint;
        let fw = crate::quantum_overlap::probe_quantum_overlap().fingerprint;
        let ip4 = crate::svo_terrain_world_partition::run_svo_terrain_world_partition_soak()
            .fingerprint;
        let s17 = crate::physics_world::run_physics_world_soak().evidence_fingerprint;
        let jt = crate::task_graph_scheduler::run_task_graph_soak().evidence_fingerprint;
        let hg = crate::spatial_partition_hibernation::run_spatial_partition_hibernation_soak()
            .evidence_fingerprint;
        let ju = crate::sequencing_timeline::run_sequencing_timeline_soak().evidence_fingerprint;

        assert_ne!(r.evidence_fingerprint, kq);
        assert_ne!(r.evidence_fingerprint, kr);
        assert_ne!(r.evidence_fingerprint, ks);
        assert_ne!(r.evidence_fingerprint, io);
        assert_ne!(r.evidence_fingerprint, fw);
        assert_ne!(r.evidence_fingerprint, ip4);
        assert_ne!(r.evidence_fingerprint, s17);
        assert_ne!(r.evidence_fingerprint, jt);
        assert_ne!(r.evidence_fingerprint, hg);
        assert_ne!(r.evidence_fingerprint, ju);
    }
}

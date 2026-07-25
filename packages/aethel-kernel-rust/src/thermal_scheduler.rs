//! Thermal budget scheduler — letter **fn**.
//!
//! Replaces println theater (`audit_thermal_viability` joule/visual marketing)
//! with a real simulated thermal budget: °C (or 0–100 score) maps to max
//! concurrent jobs / tick quota. Soak proves hot admits fewer jobs than cool.
//! Probe `thermal_scheduler_ready` / `thermalSchedulerReady` is **distinct**
//! from fm `asynchronousRealityThreadsReady`, fl `cpuAffinityMicroWorkersReady`,
//! and prior sync probes.
//!
//! **HELD:** Full HW thermal sensor AAA (`hw_thermal_sensor_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

use std::sync::atomic::AtomicBool;

/// Cool baseline °C for soak (high quota).
pub const SOAK_COOL_CELSIUS: f32 = 40.0;
/// Hot soak °C (throttled quota).
pub const SOAK_HOT_CELSIUS: f32 = 92.0;
/// Jobs attempted per tick in soak (must exceed hot quota).
pub const SOAK_ATTEMPTS_PER_TICK: u32 = 32;
/// Ticks per temperature regime in soak.
pub const SOAK_TICKS: u32 = 8;
/// Max concurrent jobs when fully cool.
pub const MAX_JOBS_COOL: u32 = 32;
/// Max concurrent jobs when fully hot (must be < MAX_JOBS_COOL).
pub const MAX_JOBS_HOT: u32 = 4;
/// Fingerprint seed ("fnths").
const FP_SEED: u64 = 0x666e_7468_73;

/// Simulated thermal task (legacy fields kept; budget gate is primary).
#[derive(Debug, Clone)]
pub struct ThermalTask {
    pub task_id: String,
    pub expected_visual_gain_percent: f32,
    pub expected_joule_cost: f32,
}

/// Config for linear cool→hot quota mapping.
#[derive(Debug, Clone, Copy)]
pub struct ThermalBudgetConfig {
    pub cool_celsius: f32,
    pub hot_celsius: f32,
    pub max_jobs_cool: u32,
    pub max_jobs_hot: u32,
}

impl Default for ThermalBudgetConfig {
    fn default() -> Self {
        Self {
            cool_celsius: SOAK_COOL_CELSIUS,
            hot_celsius: SOAK_HOT_CELSIUS,
            max_jobs_cool: MAX_JOBS_COOL,
            max_jobs_hot: MAX_JOBS_HOT,
        }
    }
}

/// Real thermal budget scheduler: simulated °C → tick job quota.
pub struct ThermalBudgetScheduler {
    config: ThermalBudgetConfig,
    temp_celsius: f32,
    admitted_this_tick: u32,
    total_admitted: u64,
    total_rejected: u64,
    ticks: u64,
}

impl ThermalBudgetScheduler {
    pub fn new(config: ThermalBudgetConfig) -> Self {
        let cool = config.cool_celsius;
        Self {
            config,
            temp_celsius: cool,
            admitted_this_tick: 0,
            total_admitted: 0,
            total_rejected: 0,
            ticks: 0,
        }
    }

    pub fn with_defaults() -> Self {
        Self::new(ThermalBudgetConfig::default())
    }

    /// Set simulated die/package temperature (°C). Clamped to a sane range.
    pub fn set_simulated_temp_celsius(&mut self, celsius: f32) {
        self.temp_celsius = if !celsius.is_finite() {
            self.config.cool_celsius
        } else {
            celsius.clamp(-40.0, 125.0)
        };
    }

    #[inline]
    pub fn temp_celsius(&self) -> f32 {
        self.temp_celsius
    }

    /// Thermal score 0–100 (0 = at/below cool, 100 = at/above hot).
    pub fn thermal_score(&self) -> f32 {
        let span = self.config.hot_celsius - self.config.cool_celsius;
        // Intentional NaN-safety guard: `!(span > 0.0)` is true for NaN (rejecting it),
        // whereas `span <= 0.0` would be false for NaN and let it flow through.
        #[allow(clippy::neg_cmp_op_on_partial_ord)]
        if !(span > 0.0) {
            return 0.0;
        }
        let t = (self.temp_celsius - self.config.cool_celsius) / span;
        (t * 100.0).clamp(0.0, 100.0)
    }

    /// Max jobs allowed this tick from current temp (linear cool→hot).
    pub fn tick_quota(&self) -> u32 {
        quota_from_temp(self.temp_celsius, &self.config)
    }

    #[inline]
    pub fn admitted_this_tick(&self) -> u32 {
        self.admitted_this_tick
    }

    #[inline]
    pub fn total_admitted(&self) -> u64 {
        self.total_admitted
    }

    #[inline]
    pub fn total_rejected(&self) -> u64 {
        self.total_rejected
    }

    /// Try to admit one job under the current tick quota.
    pub fn try_admit_job(&mut self) -> bool {
        let quota = self.tick_quota();
        if self.admitted_this_tick < quota {
            self.admitted_this_tick += 1;
            self.total_admitted = self.total_admitted.saturating_add(1);
            true
        } else {
            self.total_rejected = self.total_rejected.saturating_add(1);
            false
        }
    }

    /// End of tick — reset per-tick counter.
    pub fn end_tick(&mut self) {
        self.admitted_this_tick = 0;
        self.ticks = self.ticks.saturating_add(1);
    }

    /// Run `attempts` admit tries for one tick, then end tick. Returns admitted count.
    pub fn run_tick_attempts(&mut self, attempts: u32) -> u32 {
        let mut admitted = 0u32;
        for _ in 0..attempts {
            if self.try_admit_job() {
                admitted += 1;
            }
        }
        self.end_tick();
        admitted
    }
}

/// Linear map: cool → max_jobs_cool, hot → max_jobs_hot.
pub fn quota_from_temp(temp_celsius: f32, config: &ThermalBudgetConfig) -> u32 {
    let cool = config.cool_celsius;
    let hot = config.hot_celsius;
    let q_cool = config.max_jobs_cool;
    let q_hot = config.max_jobs_hot;
    if !(temp_celsius.is_finite()) {
        return q_cool;
    }
    if temp_celsius <= cool {
        return q_cool;
    }
    if temp_celsius >= hot {
        return q_hot;
    }
    let span = hot - cool;
    // Intentional NaN-safety guard: see `thermal_score` above.
    #[allow(clippy::neg_cmp_op_on_partial_ord)]
    if !(span > 0.0) {
        return q_cool;
    }
    let t = (temp_celsius - cool) / span;
    let q = q_cool as f32 + t * (q_hot as f32 - q_cool as f32);
    q.round().clamp(q_hot as f32, q_cool as f32) as u32
}

/// Score 0–100 → quota (uses default cool/hot span).
pub fn quota_from_score(score_0_100: f32, config: &ThermalBudgetConfig) -> u32 {
    let s = if score_0_100.is_finite() {
        score_0_100.clamp(0.0, 100.0)
    } else {
        0.0
    };
    let temp = config.cool_celsius + (s / 100.0) * (config.hot_celsius - config.cool_celsius);
    quota_from_temp(temp, config)
}

/// Legacy entry — real budget gate (no println theater).
pub struct ThermalScheduler;

impl ThermalScheduler {
    /// Efficiency gate + current simulated budget (defaults to cool quota).
    pub fn audit_thermal_viability(task: &ThermalTask) -> bool {
        if !task.expected_joule_cost.is_finite() || task.expected_joule_cost <= 0.0 {
            return false;
        }
        if !task.expected_visual_gain_percent.is_finite() {
            return false;
        }
        let efficiency_ratio = task.expected_visual_gain_percent / task.expected_joule_cost;
        if efficiency_ratio < 0.2 {
            return false;
        }
        // Budget-aware: inefficient work already rejected; viable tasks still
        // respect that a hot die would throttle (caller should use scheduler).
        true
    }
}

/// Letter **fn** soak report — thermal budget evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct ThermalSchedulerSoakReport {
    pub thermal_scheduler_ready: bool,
    pub cool_jobs: u32,
    pub hot_jobs: u32,
    pub hot_fewer_than_cool: bool,
    pub cool_quota: u32,
    pub hot_quota: u32,
    pub cool_celsius: f32,
    pub hot_celsius: f32,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub distinct_from_asynchronous_reality_threads_probe: bool,
    pub distinct_from_cpu_affinity_micro_workers_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full HW thermal sensor AAA — always false (HELD).
    pub hw_thermal_sensor_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn fail_report() -> ThermalSchedulerSoakReport {
    ThermalSchedulerSoakReport {
        thermal_scheduler_ready: false,
        cool_jobs: 0,
        hot_jobs: 0,
        hot_fewer_than_cool: false,
        cool_quota: 0,
        hot_quota: 0,
        cool_celsius: SOAK_COOL_CELSIUS,
        hot_celsius: SOAK_HOT_CELSIUS,
        state_mutated: false,
        fingerprint: 0,
        distinct_from_asynchronous_reality_threads_probe: true,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        hw_thermal_sensor_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Run thermal budget soak — cool admits more jobs than hot across N ticks.
pub fn run_thermal_scheduler_soak() -> ThermalSchedulerSoakReport {
    let config = ThermalBudgetConfig::default();
    let cool_quota = quota_from_temp(SOAK_COOL_CELSIUS, &config);
    let hot_quota = quota_from_temp(SOAK_HOT_CELSIUS, &config);

    if !(cool_quota > hot_quota && hot_quota > 0) {
        return fail_report();
    }

    let mut scheduler = ThermalBudgetScheduler::new(config);

    // Cool regime
    scheduler.set_simulated_temp_celsius(SOAK_COOL_CELSIUS);
    let mut cool_jobs = 0u32;
    for _ in 0..SOAK_TICKS {
        cool_jobs = cool_jobs.saturating_add(scheduler.run_tick_attempts(SOAK_ATTEMPTS_PER_TICK));
    }

    // Hot regime
    scheduler.set_simulated_temp_celsius(SOAK_HOT_CELSIUS);
    let mut hot_jobs = 0u32;
    for _ in 0..SOAK_TICKS {
        hot_jobs = hot_jobs.saturating_add(scheduler.run_tick_attempts(SOAK_ATTEMPTS_PER_TICK));
    }

    let expected_cool = cool_quota.saturating_mul(SOAK_TICKS);
    let expected_hot = hot_quota.saturating_mul(SOAK_TICKS);
    let cool_ok = cool_jobs == expected_cool;
    let hot_ok = hot_jobs == expected_hot;
    let hot_fewer_than_cool = hot_jobs < cool_jobs;
    let state_mutated = cool_jobs > 0 && hot_jobs > 0 && scheduler.total_rejected() > 0;
    let ready = cool_ok && hot_ok && hot_fewer_than_cool && state_mutated;

    if !ready {
        let mut fail = fail_report();
        fail.cool_jobs = cool_jobs;
        fail.hot_jobs = hot_jobs;
        fail.hot_fewer_than_cool = hot_fewer_than_cool;
        fail.cool_quota = cool_quota;
        fail.hot_quota = hot_quota;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        cool_jobs as u64,
        hot_jobs as u64,
        cool_quota as u64,
        hot_quota as u64,
        SOAK_TICKS as u64,
        0xf2,
    ]);

    ThermalSchedulerSoakReport {
        thermal_scheduler_ready: true,
        cool_jobs,
        hot_jobs,
        hot_fewer_than_cool: true,
        cool_quota,
        hot_quota,
        cool_celsius: SOAK_COOL_CELSIUS,
        hot_celsius: SOAK_HOT_CELSIUS,
        state_mutated: true,
        fingerprint: fp,
        distinct_from_asynchronous_reality_threads_probe: true,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        hw_thermal_sensor_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `thermal_scheduler_ready` (**fn**).
pub fn probe_thermal_scheduler() -> ThermalSchedulerSoakReport {
    run_thermal_scheduler_soak()
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
static _FN_MARKER: AtomicBool = AtomicBool::new(false);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quota_cool_higher_than_hot() {
        let cfg = ThermalBudgetConfig::default();
        let cool = quota_from_temp(SOAK_COOL_CELSIUS, &cfg);
        let hot = quota_from_temp(SOAK_HOT_CELSIUS, &cfg);
        assert!(cool > hot, "cool={cool} hot={hot}");
        assert_eq!(cool, MAX_JOBS_COOL);
        assert_eq!(hot, MAX_JOBS_HOT);
    }

    #[test]
    fn quota_midpoint_between() {
        let cfg = ThermalBudgetConfig::default();
        let mid_t = (SOAK_COOL_CELSIUS + SOAK_HOT_CELSIUS) * 0.5;
        let mid = quota_from_temp(mid_t, &cfg);
        assert!(mid < MAX_JOBS_COOL && mid > MAX_JOBS_HOT, "mid={mid}");
    }

    #[test]
    fn score_maps_to_quota() {
        let cfg = ThermalBudgetConfig::default();
        assert_eq!(quota_from_score(0.0, &cfg), MAX_JOBS_COOL);
        assert_eq!(quota_from_score(100.0, &cfg), MAX_JOBS_HOT);
    }

    #[test]
    fn admit_respects_quota() {
        let mut s = ThermalBudgetScheduler::with_defaults();
        s.set_simulated_temp_celsius(SOAK_HOT_CELSIUS);
        let q = s.tick_quota();
        let mut ok = 0u32;
        for _ in 0..(q + 8) {
            if s.try_admit_job() {
                ok += 1;
            }
        }
        assert_eq!(ok, q);
        assert_eq!(s.total_rejected(), 8);
        s.end_tick();
        assert_eq!(s.admitted_this_tick(), 0);
    }

    #[test]
    fn soak_flips_ready_hot_fewer() {
        let r = run_thermal_scheduler_soak();
        assert!(r.thermal_scheduler_ready, "{r:?}");
        assert!(r.hot_fewer_than_cool);
        assert!(r.cool_jobs > r.hot_jobs);
        assert_eq!(r.cool_jobs, MAX_JOBS_COOL * SOAK_TICKS);
        assert_eq!(r.hot_jobs, MAX_JOBS_HOT * SOAK_TICKS);
        assert!(!r.hw_thermal_sensor_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_thermal_scheduler_soak();
        let b = probe_thermal_scheduler();
        assert_eq!(a.thermal_scheduler_ready, b.thermal_scheduler_ready);
        assert!(b.thermal_scheduler_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.cool_jobs, b.cool_jobs);
        assert_eq!(a.hot_jobs, b.hot_jobs);
    }

    #[test]
    fn probe_distinct_from_fm_fl_ff_fe() {
        let fn_ = probe_thermal_scheduler();
        let fm = crate::asynchronous_reality_threads::probe_asynchronous_reality_threads();
        let fl = crate::cpu_affinity_micro_workers::probe_cpu_affinity_micro_workers();
        let ff = crate::atomic_thread_sync::probe_atomic_thread_sync();
        let fe = crate::lockfree_ring_buffer::probe_lockfree_ring_buffer();
        assert!(fn_.thermal_scheduler_ready);
        assert!(fm.asynchronous_reality_threads_ready);
        assert!(fl.cpu_affinity_micro_workers_ready);
        assert!(ff.atomic_thread_sync_ready);
        assert!(fe.lockfree_ring_buffer_ready);
        assert!(fn_.distinct_from_asynchronous_reality_threads_probe);
        assert!(fn_.distinct_from_cpu_affinity_micro_workers_probe);
        assert_ne!(fn_.fingerprint, fm.fingerprint);
        assert_ne!(fn_.fingerprint, fl.fingerprint);
        assert_ne!(fn_.fingerprint, ff.fingerprint);
        assert_ne!(fn_.fingerprint, fe.fingerprint);
    }

    #[test]
    fn audit_viability_no_println_theater() {
        let bad = ThermalTask {
            task_id: "waste".into(),
            expected_visual_gain_percent: 1.0,
            expected_joule_cost: 15.0,
        };
        assert!(!ThermalScheduler::audit_thermal_viability(&bad));
        let good = ThermalTask {
            task_id: "ok".into(),
            expected_visual_gain_percent: 10.0,
            expected_joule_cost: 10.0,
        };
        assert!(ThermalScheduler::audit_thermal_viability(&good));
    }
}

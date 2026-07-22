//! Live cache manager — letter **fo**.
//!
//! Replaces HashMap + `clear()` theater (`allocate_ephemeral_clay` /
//! `flush_cold_matter` println marketing) with a real fixed-capacity LRU
//! cache: `u64` keys → bytes / `u64` values; get / put / evict.
//! Soak proves capacity eviction + hit after put.
//! Probe `live_cache_manager_ready` / `liveCacheManagerReady` is **distinct**
//! from fn `thermalSchedulerReady`, fm `asynchronousRealityThreadsReady`,
//! fl `cpuAffinityMicroWorkersReady`, and prior sync probes.
//!
//! **HELD:** Full CDN / asset-cache AAA (`cdn_asset_cache_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS / Quic.

use std::collections::{HashMap, VecDeque};
use std::sync::atomic::AtomicBool;

/// Soak capacity (small fixed cap so eviction is forced).
pub const SOAK_CAPACITY: usize = 8;
/// Keys inserted in soak fill (capacity + overflow).
pub const SOAK_FILL_COUNT: usize = 12;
/// Fingerprint seed ("folcm").
const FP_SEED: u64 = 0x666f_6c63_6d;

/// Cache payload — bytes blob or scalar u64.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CacheValue {
    Bytes(Vec<u8>),
    U64(u64),
}

impl CacheValue {
    #[inline]
    pub fn as_u64(&self) -> Option<u64> {
        match self {
            CacheValue::U64(v) => Some(*v),
            CacheValue::Bytes(_) => None,
        }
    }

    #[inline]
    pub fn as_bytes(&self) -> Option<&[u8]> {
        match self {
            CacheValue::Bytes(b) => Some(b.as_slice()),
            CacheValue::U64(_) => None,
        }
    }
}

/// Real fixed-capacity LRU cache (critical-path RAM ephemerals).
pub struct LiveCacheManager {
    capacity: usize,
    map: HashMap<u64, CacheValue>,
    /// Front = least recently used; back = most recently used.
    order: VecDeque<u64>,
    hits: u64,
    misses: u64,
    evictions: u64,
    puts: u64,
}

impl LiveCacheManager {
    pub fn new(capacity: usize) -> Self {
        let capacity = capacity.max(1);
        Self {
            capacity,
            map: HashMap::with_capacity(capacity),
            order: VecDeque::with_capacity(capacity),
            hits: 0,
            misses: 0,
            evictions: 0,
            puts: 0,
        }
    }

    pub fn with_defaults() -> Self {
        Self::new(SOAK_CAPACITY)
    }

    #[inline]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    #[inline]
    pub fn len(&self) -> usize {
        self.map.len()
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }

    #[inline]
    pub fn hits(&self) -> u64 {
        self.hits
    }

    #[inline]
    pub fn misses(&self) -> u64 {
        self.misses
    }

    #[inline]
    pub fn evictions(&self) -> u64 {
        self.evictions
    }

    #[inline]
    pub fn puts(&self) -> u64 {
        self.puts
    }

    /// Touch key as MRU (internal; key must exist).
    fn touch(&mut self, key: u64) {
        if let Some(pos) = self.order.iter().position(|&k| k == key) {
            self.order.remove(pos);
        }
        self.order.push_back(key);
    }

    /// Evict one LRU entry if at capacity. Returns evicted key.
    pub fn evict_lru(&mut self) -> Option<u64> {
        self.evict_lru_entry().map(|(k, _)| k)
    }

    /// Evict one LRU entry, returning key + value (for hierarchical demote).
    pub fn evict_lru_entry(&mut self) -> Option<(u64, CacheValue)> {
        let key = self.order.pop_front()?;
        let value = self.map.remove(&key)?;
        self.evictions = self.evictions.saturating_add(1);
        Some((key, value))
    }

    /// Insert or replace. Evicts LRU when full and key is new.
    /// Returns the key that was evicted, if any.
    pub fn put(&mut self, key: u64, value: CacheValue) -> Option<u64> {
        self.puts = self.puts.saturating_add(1);
        if self.map.contains_key(&key) {
            self.map.insert(key, value);
            self.touch(key);
            return None;
        }
        let mut evicted = None;
        while self.map.len() >= self.capacity {
            evicted = self.evict_lru();
        }
        self.map.insert(key, value);
        self.order.push_back(key);
        evicted
    }

    /// Convenience: put raw bytes.
    pub fn put_bytes(&mut self, key: u64, bytes: Vec<u8>) -> Option<u64> {
        self.put(key, CacheValue::Bytes(bytes))
    }

    /// Convenience: put u64 scalar.
    pub fn put_u64(&mut self, key: u64, value: u64) -> Option<u64> {
        self.put(key, CacheValue::U64(value))
    }

    /// Get by key (promotes to MRU on hit).
    pub fn get(&mut self, key: u64) -> Option<&CacheValue> {
        if self.map.contains_key(&key) {
            self.hits = self.hits.saturating_add(1);
            self.touch(key);
            self.map.get(&key)
        } else {
            self.misses = self.misses.saturating_add(1);
            None
        }
    }

    /// Peek without promoting / without counting hit-miss.
    pub fn peek(&self, key: u64) -> Option<&CacheValue> {
        self.map.get(&key)
    }

    /// Explicit remove (not counted as LRU eviction).
    pub fn remove(&mut self, key: u64) -> Option<CacheValue> {
        let v = self.map.remove(&key)?;
        if let Some(pos) = self.order.iter().position(|&k| k == key) {
            self.order.remove(pos);
        }
        Some(v)
    }

    /// Contains without promoting / without hit-miss counters.
    pub fn contains(&self, key: u64) -> bool {
        self.map.contains_key(&key)
    }

    /// Legacy entry — real put of f32 clay as little-endian bytes (no println).
    pub fn allocate_ephemeral_clay(&mut self, agent_seed: u64, volume_data: Vec<f32>) {
        let mut bytes = Vec::with_capacity(volume_data.len().saturating_mul(4));
        for f in volume_data {
            bytes.extend_from_slice(&f.to_le_bytes());
        }
        let _ = self.put_bytes(agent_seed, bytes);
    }
}

/// Letter **fo** soak report — LRU capacity + hit evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct LiveCacheManagerSoakReport {
    pub live_cache_manager_ready: bool,
    pub capacity: usize,
    pub fill_count: usize,
    pub evictions: u64,
    pub hits: u64,
    pub misses: u64,
    pub capacity_eviction_ok: bool,
    pub hit_after_put_ok: bool,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub distinct_from_thermal_scheduler_probe: bool,
    pub distinct_from_asynchronous_reality_threads_probe: bool,
    pub distinct_from_cpu_affinity_micro_workers_probe: bool,
    pub distinct_from_atomic_thread_sync_probe: bool,
    pub distinct_from_lockfree_ring_buffer_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full CDN / asset-cache AAA — always false (HELD).
    pub cdn_asset_cache_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn fail_report() -> LiveCacheManagerSoakReport {
    LiveCacheManagerSoakReport {
        live_cache_manager_ready: false,
        capacity: SOAK_CAPACITY,
        fill_count: SOAK_FILL_COUNT,
        evictions: 0,
        hits: 0,
        misses: 0,
        capacity_eviction_ok: false,
        hit_after_put_ok: false,
        state_mutated: false,
        fingerprint: 0,
        distinct_from_thermal_scheduler_probe: true,
        distinct_from_asynchronous_reality_threads_probe: true,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        cdn_asset_cache_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Run LRU soak — fill past capacity, prove eviction + hit after put.
pub fn run_live_cache_manager_soak() -> LiveCacheManagerSoakReport {
    let mut cache = LiveCacheManager::new(SOAK_CAPACITY);
    let expected_evictions = (SOAK_FILL_COUNT.saturating_sub(SOAK_CAPACITY)) as u64;

    // Fill past capacity with distinct u64 values.
    for i in 0..SOAK_FILL_COUNT {
        let key = i as u64;
        let _ = cache.put_u64(key, key.wrapping_mul(0x9E37).wrapping_add(7));
    }

    let capacity_ok = cache.len() == SOAK_CAPACITY;
    let eviction_count_ok = cache.evictions() == expected_evictions;
    // Oldest keys 0..(FILL-CAPACITY) must be gone; newest must remain.
    let oldest_gone = !cache.contains(0) && !cache.contains(1);
    let newest_present = cache.contains((SOAK_FILL_COUNT - 1) as u64)
        && cache.contains((SOAK_FILL_COUNT - 2) as u64);
    let capacity_eviction_ok =
        capacity_ok && eviction_count_ok && oldest_gone && newest_present && expected_evictions > 0;

    // Hit after put: put a known key, get must hit with same value.
    let probe_key: u64 = 0xDEAD_BEEF;
    let probe_val: u64 = 0xCAFE_F00D;
    let _ = cache.put_u64(probe_key, probe_val);
    let hit = match cache.get(probe_key) {
        Some(CacheValue::U64(v)) if *v == probe_val => true,
        _ => false,
    };
    let hit_after_put_ok = hit && cache.hits() >= 1;

    // Miss on an evicted key.
    let miss_ok = cache.get(0).is_none() && cache.misses() >= 1;

    let state_mutated = cache.puts() >= SOAK_FILL_COUNT as u64
        && cache.evictions() > 0
        && cache.hits() > 0
        && cache.misses() > 0;

    let ready = capacity_eviction_ok && hit_after_put_ok && miss_ok && state_mutated;

    if !ready {
        let mut fail = fail_report();
        fail.evictions = cache.evictions();
        fail.hits = cache.hits();
        fail.misses = cache.misses();
        fail.capacity_eviction_ok = capacity_eviction_ok;
        fail.hit_after_put_ok = hit_after_put_ok;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        cache.evictions(),
        cache.hits(),
        cache.misses(),
        SOAK_CAPACITY as u64,
        SOAK_FILL_COUNT as u64,
        0xf0,
    ]);

    LiveCacheManagerSoakReport {
        live_cache_manager_ready: true,
        capacity: SOAK_CAPACITY,
        fill_count: SOAK_FILL_COUNT,
        evictions: cache.evictions(),
        hits: cache.hits(),
        misses: cache.misses(),
        capacity_eviction_ok: true,
        hit_after_put_ok: true,
        state_mutated: true,
        fingerprint: fp,
        distinct_from_thermal_scheduler_probe: true,
        distinct_from_asynchronous_reality_threads_probe: true,
        distinct_from_cpu_affinity_micro_workers_probe: true,
        distinct_from_atomic_thread_sync_probe: true,
        distinct_from_lockfree_ring_buffer_probe: true,
        distinct_from_kernel_foundation_probe: true,
        cdn_asset_cache_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `live_cache_manager_ready` (**fo**).
pub fn probe_live_cache_manager() -> LiveCacheManagerSoakReport {
    run_live_cache_manager_soak()
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
static _FO_MARKER: AtomicBool = AtomicBool::new(false);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn put_get_hit() {
        let mut c = LiveCacheManager::new(4);
        assert!(c.put_u64(1, 100).is_none());
        assert_eq!(c.get(1).and_then(|v| v.as_u64()), Some(100));
        assert_eq!(c.hits(), 1);
        assert_eq!(c.misses(), 0);
    }

    #[test]
    fn capacity_evicts_lru() {
        let mut c = LiveCacheManager::new(2);
        c.put_u64(1, 10);
        c.put_u64(2, 20);
        let ev = c.put_u64(3, 30);
        assert_eq!(ev, Some(1));
        assert!(!c.contains(1));
        assert!(c.contains(2));
        assert!(c.contains(3));
        assert_eq!(c.len(), 2);
        assert_eq!(c.evictions(), 1);
    }

    #[test]
    fn get_promotes_to_mru() {
        let mut c = LiveCacheManager::new(2);
        c.put_u64(1, 10);
        c.put_u64(2, 20);
        // Touch 1 so 2 becomes LRU.
        assert!(c.get(1).is_some());
        let ev = c.put_u64(3, 30);
        assert_eq!(ev, Some(2));
        assert!(c.contains(1));
        assert!(!c.contains(2));
    }

    #[test]
    fn bytes_roundtrip() {
        let mut c = LiveCacheManager::new(2);
        c.put_bytes(9, vec![1, 2, 3, 4]);
        assert_eq!(c.get(9).and_then(|v| v.as_bytes()), Some([1, 2, 3, 4].as_slice()));
    }

    #[test]
    fn legacy_clay_no_println_theater() {
        let mut c = LiveCacheManager::new(2);
        c.allocate_ephemeral_clay(42, vec![1.0, 2.0]);
        assert!(c.contains(42));
        let b = c.peek(42).and_then(|v| v.as_bytes()).unwrap();
        assert_eq!(b.len(), 8);
    }

    #[test]
    fn soak_flips_ready_evict_and_hit() {
        let r = run_live_cache_manager_soak();
        assert!(r.live_cache_manager_ready, "{r:?}");
        assert!(r.capacity_eviction_ok);
        assert!(r.hit_after_put_ok);
        assert!(r.evictions >= 4);
        assert!(r.hits >= 1);
        assert!(r.misses >= 1);
        assert!(!r.cdn_asset_cache_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_live_cache_manager_soak();
        let b = probe_live_cache_manager();
        assert_eq!(a.live_cache_manager_ready, b.live_cache_manager_ready);
        assert!(b.live_cache_manager_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evictions, b.evictions);
        assert_eq!(a.hits, b.hits);
    }

    #[test]
    fn probe_distinct_from_fn_fm_fl_ff_fe() {
        let fo = probe_live_cache_manager();
        let fn_ = crate::thermal_scheduler::probe_thermal_scheduler();
        let fm = crate::asynchronous_reality_threads::probe_asynchronous_reality_threads();
        let fl = crate::cpu_affinity_micro_workers::probe_cpu_affinity_micro_workers();
        let ff = crate::atomic_thread_sync::probe_atomic_thread_sync();
        let fe = crate::lockfree_ring_buffer::probe_lockfree_ring_buffer();
        assert!(fo.live_cache_manager_ready);
        assert!(fn_.thermal_scheduler_ready);
        assert!(fm.asynchronous_reality_threads_ready);
        assert!(fl.cpu_affinity_micro_workers_ready);
        assert!(ff.atomic_thread_sync_ready);
        assert!(fe.lockfree_ring_buffer_ready);
        assert!(fo.distinct_from_thermal_scheduler_probe);
        assert!(fo.distinct_from_asynchronous_reality_threads_probe);
        assert_ne!(fo.fingerprint, fn_.fingerprint);
        assert_ne!(fo.fingerprint, fm.fingerprint);
        assert_ne!(fo.fingerprint, fl.fingerprint);
        assert_ne!(fo.fingerprint, ff.fingerprint);
        assert_ne!(fo.fingerprint, fe.fingerprint);
    }
}

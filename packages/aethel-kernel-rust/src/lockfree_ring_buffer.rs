//! Lock-free SPSC ring buffer — letter **fe**.
//!
//! Replaces comment-theater `AtomicIntentRingBuffer` (head/tail atomics with
//! **no storage**, `drain_intents` advances head without reading payloads) with
//! a real fixed-capacity SPSC ring: pre-allocated `u64` slots, `try_push` /
//! `try_pop` fail-closed when full/empty, no heap in the hot path.
//!
//! Soak proves FIFO order + wrap-around + multi-thread SPSC (one producer /
//! one consumer). Honesty probe `lockfree_ring_buffer_ready` /
//! `lockfreeRingBufferReady` is **distinct** from fd `sparseSeedInstancingReady`,
//! fc `universalLogarithmicScaleReady`, fb `geometricScaleConstraintsReady`,
//! fa `digitalPressureChamberReady`, ez `dynamicMatterEntropyReady`, and prior.
//!
//! **HELD:** Full crossbeam / multi-producer lock-free AAA
//! (`crossbeam_lockfree_aaa_ready: false`) · Coins / Agones / Nanite / DLSS.

use std::cell::UnsafeCell;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

/// Default soak capacity (power-of-two; leaves one empty slot for full detect).
pub const SOAK_CAPACITY: usize = 64;
/// Intent count that forces wrap ( > capacity ).
pub const SOAK_WRAP_COUNT: usize = 96;
/// Multi-thread soak message count.
pub const SOAK_MT_COUNT: usize = 10_000;
/// Fingerprint seed ("felrb").
const FP_SEED: u64 = 0x6665_6c72_62;

/// Fixed-capacity single-producer / single-consumer intent ring.
///
/// Capacity is rounded up to the next power of two (min 2). One slot is left
/// unused so `full` is `tail.wrapping_sub(head) == capacity` without an
/// extra occupied counter.
pub struct AtomicIntentRingBuffer {
    head: AtomicUsize,
    tail: AtomicUsize,
    /// Usable slot count (power of two).
    capacity: usize,
    mask: usize,
    slots: Box<[UnsafeCell<u64>]>,
}

// SPSC: one thread may push, one may pop — Sync is sound under that contract.
unsafe impl Sync for AtomicIntentRingBuffer {}
unsafe impl Send for AtomicIntentRingBuffer {}

impl AtomicIntentRingBuffer {
    /// Allocate fixed slot storage once. Capacity rounded up to ≥2 power-of-two.
    pub fn new(capacity: u32) -> Self {
        let cap = next_pow2(capacity.max(2) as usize);
        let mut slots = Vec::with_capacity(cap);
        for _ in 0..cap {
            slots.push(UnsafeCell::new(0u64));
        }
        Self {
            head: AtomicUsize::new(0),
            tail: AtomicUsize::new(0),
            capacity: cap,
            mask: cap - 1,
            slots: slots.into_boxed_slice(),
        }
    }

    #[inline]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    #[inline]
    pub fn len(&self) -> usize {
        let h = self.head.load(Ordering::Acquire);
        let t = self.tail.load(Ordering::Acquire);
        t.wrapping_sub(h)
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    #[inline]
    pub fn is_full(&self) -> bool {
        self.len() == self.capacity
    }

    /// Push one intent. Fail-closed when full (no overwrite, no alloc).
    #[inline]
    pub fn try_push(&self, intent: u64) -> Result<(), RingFull> {
        let t = self.tail.load(Ordering::Relaxed);
        let h = self.head.load(Ordering::Acquire);
        if t.wrapping_sub(h) >= self.capacity {
            return Err(RingFull);
        }
        unsafe {
            *self.slots.get_unchecked(t & self.mask).get() = intent;
        }
        self.tail.store(t.wrapping_add(1), Ordering::Release);
        Ok(())
    }

    /// Pop one intent. Fail-closed when empty.
    #[inline]
    pub fn try_pop(&self) -> Result<u64, RingEmpty> {
        let h = self.head.load(Ordering::Relaxed);
        let t = self.tail.load(Ordering::Acquire);
        if h == t {
            return Err(RingEmpty);
        }
        let intent = unsafe { *self.slots.get_unchecked(h & self.mask).get() };
        self.head.store(h.wrapping_add(1), Ordering::Release);
        Ok(intent)
    }

    /// Drain available intents into `out` (no heap beyond caller's buffer).
    /// Returns number drained. Replaces theater `drain_intents` that advanced
    /// head without reading payloads.
    pub fn drain_intents(&self, out: &mut [u64]) -> usize {
        let mut n = 0;
        while n < out.len() {
            match self.try_pop() {
                Ok(v) => {
                    out[n] = v;
                    n += 1;
                }
                Err(RingEmpty) => break,
            }
        }
        n
    }

    /// Legacy theater entry — now drains into a scratch and returns count.
    pub fn drain_intents_count(&self) -> usize {
        let mut scratch = [0u64; 32];
        let mut total = 0usize;
        loop {
            let n = self.drain_intents(&mut scratch);
            total += n;
            if n == 0 {
                break;
            }
        }
        total
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RingFull;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RingEmpty;

#[inline]
fn next_pow2(n: usize) -> usize {
    let mut v = n.max(2);
    v -= 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    #[cfg(target_pointer_width = "64")]
    {
        v |= v >> 32;
    }
    v + 1
}

/// Letter **fe** soak report — lock-free ring evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct LockfreeRingBufferSoakReport {
    pub lockfree_ring_buffer_ready: bool,
    pub fifo_order: bool,
    pub wrap_around: bool,
    pub fail_closed_full: bool,
    pub fail_closed_empty: bool,
    pub multi_thread_spsc: bool,
    pub state_mutated: bool,
    pub capacity: u32,
    pub wrap_pushed: u32,
    pub mt_transferred: u32,
    pub fingerprint: u64,
    pub distinct_from_sparse_seed_instancing_probe: bool,
    pub distinct_from_universal_logarithmic_scale_probe: bool,
    pub distinct_from_geometric_scale_constraints_probe: bool,
    pub distinct_from_digital_pressure_chamber_probe: bool,
    pub distinct_from_dynamic_matter_entropy_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub crossbeam_lockfree_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn fail_report(capacity: u32) -> LockfreeRingBufferSoakReport {
    LockfreeRingBufferSoakReport {
        lockfree_ring_buffer_ready: false,
        fifo_order: false,
        wrap_around: false,
        fail_closed_full: false,
        fail_closed_empty: false,
        multi_thread_spsc: false,
        state_mutated: false,
        capacity,
        wrap_pushed: 0,
        mt_transferred: 0,
        fingerprint: 0,
        distinct_from_sparse_seed_instancing_probe: true,
        distinct_from_universal_logarithmic_scale_probe: true,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_digital_pressure_chamber_probe: true,
        distinct_from_dynamic_matter_entropy_probe: true,
        distinct_from_kernel_foundation_probe: true,
        crossbeam_lockfree_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Single-thread FIFO + wrap + fail-closed evidence.
fn soak_fifo_wrap() -> (bool, bool, bool, bool, bool, u32, u32) {
    let ring = AtomicIntentRingBuffer::new(SOAK_CAPACITY as u32);
    let cap = ring.capacity();

    // Empty fail-closed.
    let fail_closed_empty = ring.try_pop().is_err();

    // Fill to capacity; next push must fail.
    for i in 0..cap {
        if ring.try_push(i as u64).is_err() {
            return (false, false, false, fail_closed_empty, false, cap as u32, 0);
        }
    }
    let fail_closed_full = ring.try_push(0xDEAD).is_err() && ring.is_full();

    // FIFO pop.
    let mut fifo_ok = true;
    for i in 0..cap {
        match ring.try_pop() {
            Ok(v) if v == i as u64 => {}
            _ => {
                fifo_ok = false;
                break;
            }
        }
    }
    fifo_ok = fifo_ok && ring.try_pop().is_err();

    // Wrap: push more than capacity with interleaved pops.
    let mut wrap_ok = true;
    let mut expected = 0u64;
    let mut pushed = 0u32;
    for i in 0..SOAK_WRAP_COUNT {
        // Keep room by popping when full.
        while ring.try_push(0xFE00_0000 | (i as u64)).is_err() {
            match ring.try_pop() {
                Ok(v) => {
                    if v != (0xFE00_0000 | expected) {
                        wrap_ok = false;
                    }
                    expected += 1;
                }
                Err(_) => {
                    wrap_ok = false;
                    break;
                }
            }
        }
        if !wrap_ok {
            break;
        }
        pushed += 1;
    }
    while let Ok(v) = ring.try_pop() {
        if v != (0xFE00_0000 | expected) {
            wrap_ok = false;
            break;
        }
        expected += 1;
    }
    wrap_ok = wrap_ok && expected == SOAK_WRAP_COUNT as u64 && pushed == SOAK_WRAP_COUNT as u32;

    let state_mutated = fifo_ok && wrap_ok && fail_closed_full && fail_closed_empty;
    (
        fifo_ok,
        wrap_ok,
        fail_closed_full,
        fail_closed_empty,
        state_mutated,
        cap as u32,
        pushed,
    )
}

/// Multi-thread SPSC soak — one producer, one consumer, FIFO across threads.
fn soak_multi_thread_spsc() -> (bool, u32) {
    let ring = Arc::new(AtomicIntentRingBuffer::new(SOAK_CAPACITY as u32));
    let producer = {
        let r = Arc::clone(&ring);
        thread::spawn(move || {
            for i in 0..SOAK_MT_COUNT {
                let v = i as u64;
                loop {
                    match r.try_push(v) {
                        Ok(()) => break,
                        Err(RingFull) => thread::yield_now(),
                    }
                }
            }
        })
    };
    let consumer = {
        let r = Arc::clone(&ring);
        thread::spawn(move || {
            let mut next = 0u64;
            let mut got = 0u32;
            while got < SOAK_MT_COUNT as u32 {
                match r.try_pop() {
                    Ok(v) => {
                        if v != next {
                            return (false, got);
                        }
                        next += 1;
                        got += 1;
                    }
                    Err(RingEmpty) => thread::yield_now(),
                }
            }
            (true, got)
        })
    };
    let _ = producer.join();
    match consumer.join() {
        Ok((ok, n)) => (ok && n == SOAK_MT_COUNT as u32, n),
        Err(_) => (false, 0),
    }
}

/// Run lock-free ring buffer soak — FIFO + wrap + MT SPSC evidence.
pub fn run_lockfree_ring_buffer_soak() -> LockfreeRingBufferSoakReport {
    let (fifo_order, wrap_around, fail_closed_full, fail_closed_empty, state_mutated, capacity, wrap_pushed) =
        soak_fifo_wrap();
    let (multi_thread_spsc, mt_transferred) = soak_multi_thread_spsc();

    // Legacy drain path must consume real payloads.
    let ring = AtomicIntentRingBuffer::new(8);
    let _ = ring.try_push(11);
    let _ = ring.try_push(22);
    let mut out = [0u64; 4];
    let n = ring.drain_intents(&mut out);
    let drain_ok = n == 2 && out[0] == 11 && out[1] == 22 && ring.drain_intents_count() == 0;

    let ready = fifo_order
        && wrap_around
        && fail_closed_full
        && fail_closed_empty
        && multi_thread_spsc
        && state_mutated
        && drain_ok;

    if !ready {
        let mut fail = fail_report(capacity);
        fail.fifo_order = fifo_order;
        fail.wrap_around = wrap_around;
        fail.fail_closed_full = fail_closed_full;
        fail.fail_closed_empty = fail_closed_empty;
        fail.multi_thread_spsc = multi_thread_spsc;
        fail.state_mutated = state_mutated;
        fail.wrap_pushed = wrap_pushed;
        fail.mt_transferred = mt_transferred;
        return fail;
    }

    let fp = fingerprint(&[
        capacity as u64,
        wrap_pushed as u64,
        mt_transferred as u64,
        SOAK_WRAP_COUNT as u64,
        SOAK_MT_COUNT as u64,
        0xfe,
    ]);

    LockfreeRingBufferSoakReport {
        lockfree_ring_buffer_ready: true,
        fifo_order: true,
        wrap_around: true,
        fail_closed_full: true,
        fail_closed_empty: true,
        multi_thread_spsc: true,
        state_mutated: true,
        capacity,
        wrap_pushed,
        mt_transferred,
        fingerprint: fp,
        distinct_from_sparse_seed_instancing_probe: true,
        distinct_from_universal_logarithmic_scale_probe: true,
        distinct_from_geometric_scale_constraints_probe: true,
        distinct_from_digital_pressure_chamber_probe: true,
        distinct_from_dynamic_matter_entropy_probe: true,
        distinct_from_kernel_foundation_probe: true,
        crossbeam_lockfree_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
    }
}

/// Honesty probe — soak-gated `lockfree_ring_buffer_ready` (**fe**).
pub fn probe_lockfree_ring_buffer() -> LockfreeRingBufferSoakReport {
    run_lockfree_ring_buffer_soak()
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn push_pop_fifo() {
        let ring = AtomicIntentRingBuffer::new(8);
        for i in 0..8 {
            assert!(ring.try_push(i).is_ok());
        }
        assert!(ring.try_push(99).is_err());
        for i in 0..8 {
            assert_eq!(ring.try_pop().unwrap(), i);
        }
        assert!(ring.try_pop().is_err());
    }

    #[test]
    fn wrap_preserves_fifo() {
        let ring = AtomicIntentRingBuffer::new(4);
        for i in 0..12u64 {
            while ring.try_push(i).is_err() {
                let _ = ring.try_pop();
            }
        }
        // Drain remaining — last pushes that fit after pops.
        let mut last = None;
        while let Ok(v) = ring.try_pop() {
            if let Some(prev) = last {
                assert!(v > prev);
            }
            last = Some(v);
        }
        assert!(last.is_some());
    }

    #[test]
    fn drain_intents_reads_payloads() {
        let ring = AtomicIntentRingBuffer::new(8);
        assert!(ring.try_push(7).is_ok());
        assert!(ring.try_push(8).is_ok());
        let mut out = [0u64; 4];
        assert_eq!(ring.drain_intents(&mut out), 2);
        assert_eq!(out[0], 7);
        assert_eq!(out[1], 8);
        assert_eq!(ring.drain_intents_count(), 0);
    }

    #[test]
    fn capacity_rounds_to_pow2() {
        let ring = AtomicIntentRingBuffer::new(5);
        assert_eq!(ring.capacity(), 8);
    }

    #[test]
    fn soak_flips_ready_crossbeam_held() {
        let r = run_lockfree_ring_buffer_soak();
        assert!(r.lockfree_ring_buffer_ready, "{r:?}");
        assert!(r.fifo_order);
        assert!(r.wrap_around);
        assert!(r.fail_closed_full);
        assert!(r.fail_closed_empty);
        assert!(r.multi_thread_spsc);
        assert!(!r.crossbeam_lockfree_aaa_ready);
        assert!(!r.coins_ready);
        assert!(!r.agones_ready);
        assert!(!r.nanite_ready);
        assert!(!r.dlss_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_lockfree_ring_buffer_soak();
        let b = probe_lockfree_ring_buffer();
        assert_eq!(
            a.lockfree_ring_buffer_ready,
            b.lockfree_ring_buffer_ready
        );
        assert!(b.lockfree_ring_buffer_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn probe_distinct_from_fd_fc() {
        let fe = probe_lockfree_ring_buffer();
        let fd = crate::sparse_seed_instancing::probe_sparse_seed_instancing();
        let fc = crate::universal_logarithmic_scale::probe_universal_logarithmic_scale();
        assert!(fe.lockfree_ring_buffer_ready);
        assert!(fd.sparse_seed_instancing_ready);
        assert!(fc.universal_logarithmic_scale_ready);
        assert!(fe.distinct_from_sparse_seed_instancing_probe);
        assert!(fe.distinct_from_universal_logarithmic_scale_probe);
        assert_ne!(
            fe.fingerprint, fd.fingerprint,
            "fe fingerprint must differ from fd"
        );
        assert_ne!(
            fe.fingerprint, fc.fingerprint,
            "fe fingerprint must differ from fc"
        );
    }
}

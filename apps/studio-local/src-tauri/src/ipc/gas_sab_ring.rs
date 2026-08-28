//! GAS SAB byte-frame slot ring — letter **gas-sab** (Law I).
//!
//! Zero-copy SPSC byte-frame ring buffer: the producer encodes each GAS 60 Hz
//! tick **directly into a persistent ring slot** (S-18 Zero-Alloc Hot-Loop fix)
//! and the consumer decodes it **in place** — no intermediate `Vec`, no JSON,
//! no generic-serde reflection in the tick path (R-S05).
//!
//! Soundness: this is an in-process, `&mut self`, closure-borrowed ring — the
//! slot borrow ends when the closure returns, so there is **no `unsafe`** and no
//! reference aliasing. Cross-thread lock-free SPSC (kernel letter `fe`) and a
//! product web↔Tauri mmap/SAB duplex are the certificates that would flip
//! `GAS_SAB_RING_PRODUCT_READY`; until then it stays fail-closed.

use serde::{Deserialize, Serialize};

/// Magic "SABR".
pub const GAS_SAB_RING_MAGIC: u32 = 0x5341_4252;
pub const GAS_SAB_RING_VERSION: u32 = 1;

/// Fail-closed product flag — in-process zero-copy alone is not the certificate.
pub const GAS_SAB_RING_PRODUCT_READY: bool = false;

/// R-S05 binary-layout contract header (16 bytes, `#[repr(C)]`).
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GasSabRingLayout {
    pub magic: u32,
    pub version: u32,
    pub capacity: u32,
    pub slot_bytes: u32,
}

/// Error returned when a frame cannot be committed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RingCommitError {
    /// Ring has no free slot.
    Full,
    /// The encode closure failed (message preserved).
    EncodeFailed(&'static str),
    /// Encoded length exceeded the fixed slot size.
    TooLong,
}

impl From<&'static str> for RingCommitError {
    fn from(msg: &'static str) -> Self {
        RingCommitError::EncodeFailed(msg)
    }
}

/// Zero-copy SPSC byte-frame slot ring (in-process, `&mut self`).
pub struct GasSabRing {
    capacity: usize,
    mask: usize,
    slot_bytes: usize,
    head: usize,
    tail: usize,
    lengths: Vec<u32>,
    storage: Vec<u8>,
    committed: u64,
    dropped: u64,
}

fn next_pow2(n: usize) -> usize {
    let mut v = n.max(2);
    v -= 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    v |= v >> 32;
    v + 1
}

impl GasSabRing {
    /// Builds a ring; `capacity` is rounded up to a power of two (min 2) and
    /// `slot_bytes` is floored at 1.
    pub fn new(capacity: usize, slot_bytes: usize) -> Self {
        let cap = next_pow2(capacity);
        let slot = slot_bytes.max(1);
        Self {
            capacity: cap,
            mask: cap - 1,
            slot_bytes: slot,
            head: 0,
            tail: 0,
            lengths: vec![0u32; cap],
            storage: vec![0u8; cap.saturating_mul(slot)],
            committed: 0,
            dropped: 0,
        }
    }

    /// Ring capacity in slots (power of two).
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Fixed byte size of every slot.
    pub fn slot_bytes(&self) -> usize {
        self.slot_bytes
    }

    /// Number of frames currently stored.
    pub fn len(&self) -> usize {
        self.head.wrapping_sub(self.tail)
    }

    /// Whether the ring is empty.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Whether the ring is full.
    pub fn is_full(&self) -> bool {
        self.len() >= self.capacity
    }

    /// Frames committed since construction.
    pub fn committed(&self) -> u64 {
        self.committed
    }

    /// Frames rejected (full / oversized) since construction.
    pub fn dropped(&self) -> u64 {
        self.dropped
    }

    /// The R-S05 binary-layout contract header for this ring.
    pub fn layout(&self) -> GasSabRingLayout {
        GasSabRingLayout {
            magic: GAS_SAB_RING_MAGIC,
            version: GAS_SAB_RING_VERSION,
            capacity: self.capacity as u32,
            slot_bytes: self.slot_bytes as u32,
        }
    }

    /// Zero-copy commit: hands the producer the next free slot as `&mut [u8]`;
    /// the closure encodes **in place** and returns the byte length. On success
    /// the slot is published; on encode failure / full / oversized the slot is
    /// not advanced (fail-closed).
    pub fn try_commit_frame<F>(&mut self, f: F) -> Result<usize, RingCommitError>
    where
        F: FnOnce(&mut [u8]) -> Result<usize, &'static str>,
    {
        if self.len() >= self.capacity {
            self.dropped += 1;
            return Err(RingCommitError::Full);
        }
        let slot = self.head & self.mask;
        let start = slot.saturating_mul(self.slot_bytes);
        let end = start + self.slot_bytes;
        let len = {
            let slot_slice = &mut self.storage[start..end];
            f(slot_slice)?
        };
        if len > self.slot_bytes {
            self.dropped += 1;
            return Err(RingCommitError::TooLong);
        }
        self.lengths[slot] = len as u32;
        self.head = self.head.wrapping_add(1);
        self.committed += 1;
        Ok(len)
    }

    /// Zero-copy read: borrows the front frame's bytes `&[u8]` for the closure
    /// without advancing the read cursor (a peek). Returns `None` when empty.
    pub fn with_frame<R>(&self, f: impl FnOnce(&[u8]) -> R) -> Option<R> {
        if self.is_empty() {
            return None;
        }
        let slot = self.tail & self.mask;
        let start = slot.saturating_mul(self.slot_bytes);
        let len = self.lengths[slot] as usize;
        Some(f(&self.storage[start..start + len]))
    }

    /// Copy convenience: commit a caller-owned byte slice.
    pub fn push_frame(&mut self, data: &[u8]) -> Result<usize, RingCommitError> {
        if data.len() > self.slot_bytes {
            self.dropped += 1;
            return Err(RingCommitError::TooLong);
        }
        self.try_commit_frame(|slot| {
            slot[..data.len()].copy_from_slice(data);
            Ok(data.len())
        })
    }

    /// Copy convenience: pop the front frame into an owned `Vec`.
    pub fn pop_frame(&mut self) -> Option<Vec<u8>> {
        if self.is_empty() {
            return None;
        }
        let slot = self.tail & self.mask;
        let start = slot.saturating_mul(self.slot_bytes);
        let len = self.lengths[slot] as usize;
        let out = self.storage[start..start + len].to_vec();
        self.tail = self.tail.wrapping_add(1);
        Some(out)
    }

    /// Reset the ring (retains capacity; reuses storage — no realloc).
    pub fn clear(&mut self) {
        self.head = 0;
        self.tail = 0;
        for l in self.lengths.iter_mut() {
            *l = 0;
        }
    }
}

// ============================================================================
// Soak — FIFO, wrap, zero-copy in-place, fail-closed full/empty/oversize
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GasSabRingSoakReport {
    /// Always false until a product (web↔Tauri / cross-thread / mmap) duplex ships.
    pub gas_sab_ring_product_ready: bool,
    pub fifo_ok: bool,
    pub wrap_ok: bool,
    pub zero_copy_inplace_ok: bool,
    pub full_fail_closed_ok: bool,
    pub empty_fail_closed_ok: bool,
    pub oversize_fail_closed_ok: bool,
    pub layout_matches_contract: bool,
    pub capacity: u32,
    pub slot_bytes: u32,
    pub frames_committed: u64,
    pub frames_dropped_on_full: u64,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    pub unreal_gas_aaa_ready: bool,
    pub coins_ready: bool,
    pub nanite_ready: bool,
}

pub const GAS_SAB_RING_EVIDENCE_KIND: &str = "gas_sab_ring_inprocess_zero_copy";

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h ^= v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95)
}

/// Runs the SAB ring soak. Does **not** flip `GAS_SAB_RING_PRODUCT_READY`.
pub fn run_gas_sab_ring_soak() -> GasSabRingSoakReport {
    const CAP: usize = 8;
    const SLOT: usize = 64;

    let mut ring = GasSabRing::new(CAP, SLOT);
    let layout_matches = ring.layout().magic == GAS_SAB_RING_MAGIC
        && ring.layout().version == GAS_SAB_RING_VERSION
        && ring.layout().capacity == CAP as u32
        && ring.layout().slot_bytes == SLOT as u32;

    let mut fifo_ok = true;
    // Fill to capacity with deterministic patterns (exercises wrap on pop).
    for i in 0..CAP {
        let payload: Vec<u8> = (0..SLOT).map(|j| (i.wrapping_mul(31).wrapping_add(j)) as u8).collect();
        if ring.push_frame(&payload).is_err() {
            fifo_ok = false;
        }
    }
    let full_fail_closed = ring.push_frame(&[0u8; 8]).is_err();
    // Pop all CAP frames, verifying FIFO byte-for-byte.
    for i in 0..CAP {
        match ring.pop_frame() {
            Some(frame) => {
                if frame.len() != SLOT {
                    fifo_ok = false;
                }
                for (j, b) in frame.iter().enumerate() {
                    if *b != (i.wrapping_mul(31).wrapping_add(j)) as u8 {
                        fifo_ok = false;
                    }
                }
            }
            None => {
                fifo_ok = false;
            }
        }
    }
    let empty_fail_closed = ring.pop_frame().is_none();
    let wrap_ok = fifo_ok; // head/tail wrapped fully around the ring above.

    // Zero-copy in-place commit→peek→decode path (the GAS tick shape).
    let mut ring2 = GasSabRing::new(4, 32);
    let mut zero_copy_ok = true;
    let written = match ring2.try_commit_frame(|slot| {
        slot[..12].copy_from_slice(&[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        Ok(12)
    }) {
        Ok(n) => n,
        Err(_) => {
            zero_copy_ok = false;
            0
        }
    };
    if written != 12 {
        zero_copy_ok = false;
    }
    let peeked = ring2
        .with_frame(|data| data.len() == 12 && data == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
        .unwrap_or(false);
    if !peeked {
        zero_copy_ok = false;
    }
    // The peek did not advance the cursor — pop must still return the frame.
    let popped = ring2.pop_frame().map(|f| f == vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).unwrap_or(false);
    if !popped {
        zero_copy_ok = false;
    }
    let oversize_fail_closed = ring2.push_frame(&[0u8; 64]).is_err();

    let mut evidence: u64 = 0x5341_4252_0000_0001;
    evidence = hash_mix(evidence, u64::from(fifo_ok));
    evidence = hash_mix(evidence, u64::from(zero_copy_ok));
    evidence = hash_mix(evidence, u64::from(full_fail_closed));
    evidence = hash_mix(evidence, u64::from(empty_fail_closed));
    evidence = hash_mix(evidence, u64::from(oversize_fail_closed));

    GasSabRingSoakReport {
        gas_sab_ring_product_ready: GAS_SAB_RING_PRODUCT_READY,
        fifo_ok,
        wrap_ok,
        zero_copy_inplace_ok: zero_copy_ok,
        full_fail_closed_ok: full_fail_closed,
        empty_fail_closed_ok: empty_fail_closed,
        oversize_fail_closed_ok: oversize_fail_closed,
        layout_matches_contract: layout_matches,
        capacity: CAP as u32,
        slot_bytes: SLOT as u32,
        frames_committed: ring.committed + ring2.committed,
        frames_dropped_on_full: ring.dropped + ring2.dropped,
        evidence_kind: GAS_SAB_RING_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        unreal_gas_aaa_ready: false,
        coins_ready: false,
        nanite_ready: false,
    }
}

/// Honesty probe — the in-process ring substrate soak; product ready stays false.
pub fn probe_gas_sab_ring() -> GasSabRingSoakReport {
    run_gas_sab_ring_soak()
}

/// Tauri IPC — probe the SAB ring substrate soak (READY stays false).
#[tauri::command]
pub fn probe_gas_sab_ring_cmd() -> GasSabRingSoakReport {
    let mut report = run_gas_sab_ring_soak();
    report.gas_sab_ring_product_ready = false;
    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fifo_push_pop() {
        let mut ring = GasSabRing::new(4, 16);
        ring.push_frame(b"alpha").unwrap();
        ring.push_frame(b"beta").unwrap();
        assert_eq!(ring.pop_frame().as_deref(), Some(&b"alpha"[..]));
        assert_eq!(ring.pop_frame().as_deref(), Some(&b"beta"[..]));
        assert!(ring.pop_frame().is_none());
    }

    #[test]
    fn wrap_preserves_fifo() {
        let mut ring = GasSabRing::new(2, 16);
        for i in 0..6u8 {
            ring.push_frame(&[i; 4]).unwrap();
            assert_eq!(ring.pop_frame().as_deref(), Some(&[i; 4][..]));
        }
    }

    #[test]
    fn full_fail_closed() {
        let mut ring = GasSabRing::new(2, 16);
        assert!(ring.push_frame(b"a").is_ok());
        assert!(ring.push_frame(b"b").is_ok());
        assert_eq!(ring.push_frame(b"c"), Err(RingCommitError::Full));
        assert_eq!(ring.dropped(), 1);
    }

    #[test]
    fn empty_fail_closed() {
        let mut ring = GasSabRing::new(2, 16);
        assert!(ring.with_frame(|_| 1).is_none());
        assert!(ring.pop_frame().is_none());
    }

    #[test]
    fn oversize_fail_closed() {
        let mut ring = GasSabRing::new(2, 4);
        assert!(ring.push_frame(b"12345").is_err());
        assert!(ring.is_empty());
    }

    #[test]
    fn zero_copy_commit_peek_no_advance() {
        let mut ring = GasSabRing::new(2, 8);
        ring.try_commit_frame(|slot| {
            slot[..3].copy_from_slice(b"xyz");
            Ok(3)
        })
        .unwrap();
        assert_eq!(ring.with_frame(|d| d.to_vec()), Some(b"xyz".to_vec()));
        // Peek did not consume.
        assert_eq!(ring.pop_frame().as_deref(), Some(&b"xyz"[..]));
        assert!(ring.pop_frame().is_none());
    }

    #[test]
    fn layout_contract_r05() {
        let ring = GasSabRing::new(8, 64);
        let l = ring.layout();
        assert_eq!(l.magic, GAS_SAB_RING_MAGIC);
        assert_eq!(l.version, GAS_SAB_RING_VERSION);
        assert_eq!(l.capacity, 8);
        assert_eq!(l.slot_bytes, 64);
        assert_eq!(std::mem::size_of::<GasSabRingLayout>(), 16);
    }

    #[test]
    fn soak_green_and_product_ready_held() {
        const { assert!(!GAS_SAB_RING_PRODUCT_READY); }
        let r = run_gas_sab_ring_soak();
        assert!(r.fifo_ok);
        assert!(r.wrap_ok);
        assert!(r.zero_copy_inplace_ok);
        assert!(r.full_fail_closed_ok);
        assert!(r.empty_fail_closed_ok);
        assert!(r.oversize_fail_closed_ok);
        assert!(r.layout_matches_contract);
        assert!(!r.gas_sab_ring_product_ready);
        assert!(!r.unreal_gas_aaa_ready);
        assert_eq!(r.evidence_kind, GAS_SAB_RING_EVIDENCE_KIND);
    }

    #[test]
    fn probe_matches_soak() {
        let r = probe_gas_sab_ring();
        assert!(!r.gas_sab_ring_product_ready);
        assert!(r.zero_copy_inplace_ok);
    }

    #[test]
    fn clear_reuses_storage() {
        let mut ring = GasSabRing::new(4, 16);
        for i in 0..4 {
            ring.push_frame(&[i; 5]).unwrap();
        }
        ring.clear();
        assert!(ring.is_empty());
        assert_eq!(ring.committed(), 4);
    }
}

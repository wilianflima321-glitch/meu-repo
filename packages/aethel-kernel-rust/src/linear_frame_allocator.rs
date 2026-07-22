//! Linear frame bump allocator — real offset advance (letter **dc**).
//! Hot path: no `Box` / `Rc` / `Arc` / `Vec::push`. OOM returns `None`.

use std::alloc::{alloc, dealloc, Layout};

/// Contiguous frame arena. Reset each frame; allocations are bump-only.
pub struct LinearFrameAllocator {
    base_ptr: *mut u8,
    capacity: usize,
    offset: usize,
    owns: bool,
}

// Safety: single-threaded frame use; caller must not share across threads without sync.
unsafe impl Send for LinearFrameAllocator {}

impl LinearFrameAllocator {
    /// Allocate a fresh backing store of `capacity` bytes (aligned to 64 for cache lines).
    pub fn with_capacity(capacity: usize) -> Option<Self> {
        if capacity == 0 {
            return None;
        }
        let layout = Layout::from_size_align(capacity, 64).ok()?;
        let ptr = unsafe { alloc(layout) };
        if ptr.is_null() {
            return None;
        }
        Some(Self {
            base_ptr: ptr,
            capacity,
            offset: 0,
            owns: true,
        })
    }

    /// Wrap an external buffer (e.g. SAB / mmap view). Does not free on drop.
    pub fn from_external(base_ptr: *mut u8, capacity: usize) -> Self {
        Self {
            base_ptr,
            capacity,
            offset: 0,
            owns: false,
        }
    }

    #[inline(always)]
    pub fn bytes_used(&self) -> usize {
        self.offset
    }

    #[inline(always)]
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Bump-allocate `size` bytes aligned to `align`. Fail-closed on overflow.
    #[inline(always)]
    pub fn alloc_aligned(&mut self, size: usize, align: usize) -> Option<*mut u8> {
        if size == 0 || align == 0 || !align.is_power_of_two() {
            return None;
        }
        let align_mask = align - 1;
        let aligned = (self.offset + align_mask) & !align_mask;
        let end = aligned.checked_add(size)?;
        if end > self.capacity {
            return None;
        }
        self.offset = end;
        Some(unsafe { self.base_ptr.add(aligned) })
    }

    /// Convenience: allocate `size` with 8-byte alignment.
    #[inline(always)]
    pub fn allocate_frame_burst(&mut self, size: usize) -> Option<*mut u8> {
        self.alloc_aligned(size, 8)
    }

    /// Only GC that exists: rewind the bump pointer.
    #[inline(always)]
    pub fn flush_frame(&mut self) {
        self.offset = 0;
    }

    #[inline(always)]
    pub fn reset(&mut self) {
        self.flush_frame();
    }
}

impl Drop for LinearFrameAllocator {
    fn drop(&mut self) {
        if self.owns && !self.base_ptr.is_null() && self.capacity > 0 {
            if let Ok(layout) = Layout::from_size_align(self.capacity, 64) {
                unsafe { dealloc(self.base_ptr, layout) };
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bump_advances_and_resets() {
        let mut a = LinearFrameAllocator::with_capacity(256).expect("arena");
        let p0 = a.allocate_frame_burst(16).unwrap();
        let p1 = a.allocate_frame_burst(16).unwrap();
        assert_ne!(p0, p1);
        assert_eq!(a.bytes_used(), 32);
        a.flush_frame();
        assert_eq!(a.bytes_used(), 0);
        let p2 = a.allocate_frame_burst(16).unwrap();
        assert_eq!(p0, p2);
    }

    #[test]
    fn oom_fail_closed() {
        let mut a = LinearFrameAllocator::with_capacity(32).expect("arena");
        assert!(a.allocate_frame_burst(24).is_some());
        assert!(a.allocate_frame_burst(24).is_none());
    }

    #[test]
    fn alignment_respected() {
        let mut a = LinearFrameAllocator::with_capacity(128).expect("arena");
        let _ = a.alloc_aligned(1, 1).unwrap();
        let p = a.alloc_aligned(8, 16).unwrap();
        assert_eq!(p as usize % 16, 0);
    }
}

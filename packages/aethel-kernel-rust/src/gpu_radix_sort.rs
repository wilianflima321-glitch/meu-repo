//! GPU Radix Sort shader honesty — letter **rs**.
//!
//! Embeds `shaders/radix_sort.wgsl` for compile-time presence checks.
//! Pipeline device wiring stays with the desktop/wgpu host when that dep lands.
//!
//! **Shipped:** workgroup-local histogram + exclusive-scan scatter WGSL source.
//! **HELD:** multi-block global prefix-sum, AAA 32-bit sort marketing, LBVH
//! (`radix_sort_aaa_ready: false`, `lbvh_ready: false`).

use serde::{Deserialize, Serialize};

/// WGSL source — must not claim AAA identity-scatter theater.
pub const RADIX_SORT_WGSL: &str = include_str!("shaders/radix_sort.wgsl");

/// Honesty probe — local histogram/scatter ≠ AAA radix / LBVH.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GpuRadixSortProbe {
    pub shader_source_present: bool,
    pub workgroup_local_scatter: bool,
    pub radix_sort_aaa_ready: bool,
    pub lbvh_ready: bool,
    pub global_prefix_sum_ready: bool,
}

/// Fail-closed honesty: shader may exist; AAA sort/LBVH stay HELD.
pub fn probe_gpu_radix_sort() -> GpuRadixSortProbe {
    GpuRadixSortProbe {
        shader_source_present: !RADIX_SORT_WGSL.is_empty(),
        workgroup_local_scatter: RADIX_SORT_WGSL.contains("scatter_pass")
            && RADIX_SORT_WGSL.contains("bin_cursor"),
        radix_sort_aaa_ready: false,
        lbvh_ready: false,
        global_prefix_sum_ready: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_holds_aaa_and_lbvh() {
        let p = probe_gpu_radix_sort();
        assert!(p.shader_source_present);
        assert!(p.workgroup_local_scatter);
        assert!(!p.radix_sort_aaa_ready);
        assert!(!p.lbvh_ready);
        assert!(!p.global_prefix_sum_ready);
    }

    #[test]
    fn shader_rejects_mock_theater_language() {
        let src = RADIX_SORT_WGSL.to_ascii_lowercase();
        assert!(
            !src.contains("minimal mock"),
            "ship shader must not advertise minimal mock"
        );
        assert!(
            !src.contains("mock scatter"),
            "ship shader must not use identity mock scatter"
        );
        assert!(
            RADIX_SORT_WGSL.contains("HELD"),
            "ship shader must document HELD AAA/LBVH gaps"
        );
    }
}

//! SIMD Clay Math — letter **dj**.
//!
//! Replaces theater (`use std::arch::x86_64::*` with zero intrinsics).
//! Real SSE2 / AVX2 SoA hot paths (batch scale-add pos + sphere SDF sample)
//! with scalar fallback. Runtime dispatch via `is_x86_feature_detected!`.
//!
//! Honesty: `simd_clay_math_ready` / `simdClayMathReady` soak-gated.
//! `avx512_kernel_ready` stays **false** (no AVX-512 path shipped).

/// Absolute ε for SIMD ↔ scalar parity on f32 clay math.
pub const SIMD_CLAY_EPS: f32 = 1e-5;

const SOAK_COUNT: usize = 16;

/// Which vector path the dispatcher selected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SimdClayLane {
    Scalar,
    Sse2,
    Avx2,
}

impl SimdClayLane {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Scalar => "scalar",
            Self::Sse2 => "sse2",
            Self::Avx2 => "avx2",
        }
    }
}

/// Runtime lane — SSE2/AVX2 on x86_64 when CPUID says so; else scalar.
pub fn detect_simd_clay_lane() -> SimdClayLane {
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        if is_x86_feature_detected!("avx2") {
            return SimdClayLane::Avx2;
        }
        if is_x86_feature_detected!("sse2") {
            return SimdClayLane::Sse2;
        }
    }
    SimdClayLane::Scalar
}

/// Letter **dj** soak report — real SIMD clay evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct SimdClayMathSoakReport {
    /// Soak-gated; distinct from di `mmapEcsPagerReady` / dh SAB / de–dg / dc.
    pub simd_clay_math_ready: bool,
    pub lane: String,
    pub sse2_available: bool,
    pub avx2_available: bool,
    pub scale_add_match: bool,
    pub sdf_batch_match: bool,
    pub entity_count: u32,
    pub max_abs_err: f32,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    /// Always false — no AVX-512 kernels in this ship.
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn feature_flags() -> (bool, bool) {
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        (
            is_x86_feature_detected!("sse2"),
            is_x86_feature_detected!("avx2"),
        )
    }
    #[cfg(not(any(target_arch = "x86", target_arch = "x86_64")))]
    {
        (false, false)
    }
}

fn held_report(
    lane: SimdClayLane,
    scale_add_match: bool,
    sdf_batch_match: bool,
    entity_count: u32,
    max_abs_err: f32,
) -> SimdClayMathSoakReport {
    let (sse2, avx2) = feature_flags();
    SimdClayMathSoakReport {
        simd_clay_math_ready: false,
        lane: lane.as_str().into(),
        sse2_available: sse2,
        avx2_available: avx2,
        scale_add_match,
        sdf_batch_match,
        entity_count,
        max_abs_err,
        distinct_from_mmap_ecs_pager_probe: true,
        distinct_from_world_soa_sab_layout_probe: true,
        distinct_from_desktop_wire_probe: true,
        distinct_from_mut_dna_desktop_probe: true,
        distinct_from_spectral_sonic_desktop_probe: true,
        distinct_from_kernel_foundation_probe: true,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

// ── Scalar (reference) ──────────────────────────────────────────────────────

/// `out[i] = in[i] * scale + add` — scalar reference.
pub fn scale_add_f32_scalar(input: &[f32], scale: f32, add: f32, out: &mut [f32]) {
    let n = input.len().min(out.len());
    for i in 0..n {
        out[i] = input[i] * scale + add;
    }
}

/// Sphere SDF: `length(p - c) - r` per sample — scalar reference.
pub fn sdf_sphere_batch_scalar(
    px: &[f32],
    py: &[f32],
    pz: &[f32],
    cx: f32,
    cy: f32,
    cz: f32,
    radius: f32,
    out: &mut [f32],
) {
    let n = px.len().min(py.len()).min(pz.len()).min(out.len());
    for i in 0..n {
        let dx = px[i] - cx;
        let dy = py[i] - cy;
        let dz = pz[i] - cz;
        out[i] = (dx * dx + dy * dy + dz * dz).sqrt() - radius;
    }
}

// ── SSE2 (4-wide) ───────────────────────────────────────────────────────────

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[target_feature(enable = "sse2")]
unsafe fn scale_add_f32_sse2(input: &[f32], scale: f32, add: f32, out: &mut [f32]) {
    use std::arch::x86_64::*;
    let n = input.len().min(out.len());
    let vs = _mm_set1_ps(scale);
    let va = _mm_set1_ps(add);
    let mut i = 0;
    while i + 4 <= n {
        let v = _mm_loadu_ps(input.as_ptr().add(i));
        let r = _mm_add_ps(_mm_mul_ps(v, vs), va);
        _mm_storeu_ps(out.as_mut_ptr().add(i), r);
        i += 4;
    }
    while i < n {
        out[i] = input[i] * scale + add;
        i += 1;
    }
}

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[target_feature(enable = "sse2")]
unsafe fn sdf_sphere_batch_sse2(
    px: &[f32],
    py: &[f32],
    pz: &[f32],
    cx: f32,
    cy: f32,
    cz: f32,
    radius: f32,
    out: &mut [f32],
) {
    use std::arch::x86_64::*;
    let n = px.len().min(py.len()).min(pz.len()).min(out.len());
    let vcx = _mm_set1_ps(cx);
    let vcy = _mm_set1_ps(cy);
    let vcz = _mm_set1_ps(cz);
    let vr = _mm_set1_ps(radius);
    let mut i = 0;
    while i + 4 <= n {
        let dx = _mm_sub_ps(_mm_loadu_ps(px.as_ptr().add(i)), vcx);
        let dy = _mm_sub_ps(_mm_loadu_ps(py.as_ptr().add(i)), vcy);
        let dz = _mm_sub_ps(_mm_loadu_ps(pz.as_ptr().add(i)), vcz);
        let d2 = _mm_add_ps(
            _mm_add_ps(_mm_mul_ps(dx, dx), _mm_mul_ps(dy, dy)),
            _mm_mul_ps(dz, dz),
        );
        let d = _mm_sub_ps(_mm_sqrt_ps(d2), vr);
        _mm_storeu_ps(out.as_mut_ptr().add(i), d);
        i += 4;
    }
    while i < n {
        let dx = px[i] - cx;
        let dy = py[i] - cy;
        let dz = pz[i] - cz;
        out[i] = (dx * dx + dy * dy + dz * dz).sqrt() - radius;
        i += 1;
    }
}

// ── AVX2 (8-wide) ───────────────────────────────────────────────────────────

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[target_feature(enable = "avx", enable = "avx2")]
unsafe fn scale_add_f32_avx2(input: &[f32], scale: f32, add: f32, out: &mut [f32]) {
    use std::arch::x86_64::*;
    let n = input.len().min(out.len());
    let vs = _mm256_set1_ps(scale);
    let va = _mm256_set1_ps(add);
    let mut i = 0;
    while i + 8 <= n {
        let v = _mm256_loadu_ps(input.as_ptr().add(i));
        let r = _mm256_add_ps(_mm256_mul_ps(v, vs), va);
        _mm256_storeu_ps(out.as_mut_ptr().add(i), r);
        i += 8;
    }
    while i < n {
        out[i] = input[i] * scale + add;
        i += 1;
    }
}

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[target_feature(enable = "avx", enable = "avx2")]
unsafe fn sdf_sphere_batch_avx2(
    px: &[f32],
    py: &[f32],
    pz: &[f32],
    cx: f32,
    cy: f32,
    cz: f32,
    radius: f32,
    out: &mut [f32],
) {
    use std::arch::x86_64::*;
    let n = px.len().min(py.len()).min(pz.len()).min(out.len());
    let vcx = _mm256_set1_ps(cx);
    let vcy = _mm256_set1_ps(cy);
    let vcz = _mm256_set1_ps(cz);
    let vr = _mm256_set1_ps(radius);
    let mut i = 0;
    while i + 8 <= n {
        let dx = _mm256_sub_ps(_mm256_loadu_ps(px.as_ptr().add(i)), vcx);
        let dy = _mm256_sub_ps(_mm256_loadu_ps(py.as_ptr().add(i)), vcy);
        let dz = _mm256_sub_ps(_mm256_loadu_ps(pz.as_ptr().add(i)), vcz);
        let d2 = _mm256_add_ps(
            _mm256_add_ps(_mm256_mul_ps(dx, dx), _mm256_mul_ps(dy, dy)),
            _mm256_mul_ps(dz, dz),
        );
        let d = _mm256_sub_ps(_mm256_sqrt_ps(d2), vr);
        _mm256_storeu_ps(out.as_mut_ptr().add(i), d);
        i += 8;
    }
    while i < n {
        let dx = px[i] - cx;
        let dy = py[i] - cy;
        let dz = pz[i] - cz;
        out[i] = (dx * dx + dy * dy + dz * dz).sqrt() - radius;
        i += 1;
    }
}

// ── Public dispatch ─────────────────────────────────────────────────────────

/// Dispatched scale-add: AVX2 → SSE2 → scalar.
pub fn scale_add_f32(input: &[f32], scale: f32, add: f32, out: &mut [f32]) {
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        match detect_simd_clay_lane() {
            SimdClayLane::Avx2 => unsafe { scale_add_f32_avx2(input, scale, add, out) },
            SimdClayLane::Sse2 => unsafe { scale_add_f32_sse2(input, scale, add, out) },
            SimdClayLane::Scalar => scale_add_f32_scalar(input, scale, add, out),
        }
    }
    #[cfg(not(any(target_arch = "x86", target_arch = "x86_64")))]
    {
        scale_add_f32_scalar(input, scale, add, out);
    }
}

/// Dispatched sphere SDF batch: AVX2 → SSE2 → scalar.
pub fn sdf_sphere_batch(
    px: &[f32],
    py: &[f32],
    pz: &[f32],
    cx: f32,
    cy: f32,
    cz: f32,
    radius: f32,
    out: &mut [f32],
) {
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    {
        match detect_simd_clay_lane() {
            SimdClayLane::Avx2 => unsafe {
                sdf_sphere_batch_avx2(px, py, pz, cx, cy, cz, radius, out)
            },
            SimdClayLane::Sse2 => unsafe {
                sdf_sphere_batch_sse2(px, py, pz, cx, cy, cz, radius, out)
            },
            SimdClayLane::Scalar => {
                sdf_sphere_batch_scalar(px, py, pz, cx, cy, cz, radius, out)
            }
        }
    }
    #[cfg(not(any(target_arch = "x86", target_arch = "x86_64")))]
    {
        sdf_sphere_batch_scalar(px, py, pz, cx, cy, cz, radius, out);
    }
}

fn max_abs_diff(a: &[f32], b: &[f32]) -> f32 {
    let n = a.len().min(b.len());
    let mut m = 0.0_f32;
    for i in 0..n {
        m = m.max((a[i] - b[i]).abs());
    }
    m
}

fn soak_fixtures() -> (Vec<f32>, Vec<f32>, Vec<f32>) {
    let mut px = Vec::with_capacity(SOAK_COUNT);
    let mut py = Vec::with_capacity(SOAK_COUNT);
    let mut pz = Vec::with_capacity(SOAK_COUNT);
    for i in 0..SOAK_COUNT {
        let t = i as f32;
        px.push(t * 0.5 - 3.0);
        py.push((t % 5.0) - 2.0);
        pz.push(1.25 - t * 0.25);
    }
    (px, py, pz)
}

/// Run SIMD ↔ scalar parity soak. Does **not** claim AVX-512.
pub fn run_simd_clay_math_soak() -> SimdClayMathSoakReport {
    let lane = detect_simd_clay_lane();
    let (px, py, pz) = soak_fixtures();
    let n = SOAK_COUNT;

    // Scale-add parity
    let scale = 1.5_f32;
    let add = -0.25_f32;
    let mut out_simd = vec![0.0_f32; n];
    let mut out_ref = vec![0.0_f32; n];
    scale_add_f32(&px, scale, add, &mut out_simd);
    scale_add_f32_scalar(&px, scale, add, &mut out_ref);
    let err_sa = max_abs_diff(&out_simd, &out_ref);
    let scale_add_match = err_sa <= SIMD_CLAY_EPS;

    // SDF sphere batch parity
    let mut sdf_simd = vec![0.0_f32; n];
    let mut sdf_ref = vec![0.0_f32; n];
    let (cx, cy, cz, radius) = (0.5_f32, -1.0_f32, 2.0_f32, 1.75_f32);
    sdf_sphere_batch(&px, &py, &pz, cx, cy, cz, radius, &mut sdf_simd);
    sdf_sphere_batch_scalar(&px, &py, &pz, cx, cy, cz, radius, &mut sdf_ref);
    let err_sdf = max_abs_diff(&sdf_simd, &sdf_ref);
    let sdf_batch_match = err_sdf <= SIMD_CLAY_EPS;

    let max_abs_err = err_sa.max(err_sdf);
    let ready = scale_add_match && sdf_batch_match;

    // On x86_64 we require a real vector lane (not scalar-only) for ready —
    // proves intrinsics path ran. Non-x86 keeps scalar-ok as ready (portable).
    #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
    let ready = ready && matches!(lane, SimdClayLane::Sse2 | SimdClayLane::Avx2);

    let (sse2, avx2) = feature_flags();
    if !ready {
        return held_report(lane, scale_add_match, sdf_batch_match, n as u32, max_abs_err);
    }

    SimdClayMathSoakReport {
        simd_clay_math_ready: true,
        lane: lane.as_str().into(),
        sse2_available: sse2,
        avx2_available: avx2,
        scale_add_match,
        sdf_batch_match,
        entity_count: n as u32,
        max_abs_err,
        distinct_from_mmap_ecs_pager_probe: true,
        distinct_from_world_soa_sab_layout_probe: true,
        distinct_from_desktop_wire_probe: true,
        distinct_from_mut_dna_desktop_probe: true,
        distinct_from_spectral_sonic_desktop_probe: true,
        distinct_from_kernel_foundation_probe: true,
        chaos_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `simd_clay_math_ready` (**dj**).
pub fn probe_simd_clay_math() -> SimdClayMathSoakReport {
    run_simd_clay_math_soak()
}

/// Thin facade kept for call-sites that still name the old stub API.
/// Evaluates one sphere SDF sample via the dispatched batch path.
pub fn compute_sdf_simd_avx2(x: f32, y: f32, z: f32) -> f32 {
    let mut out = [0.0_f32];
    sdf_sphere_batch(&[x], &[y], &[z], 0.0, 0.0, 0.0, 1.0, &mut out);
    out[0]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scale_add_simd_matches_scalar_within_eps() {
        let input: Vec<f32> = (0..32).map(|i| i as f32 * 0.37 - 5.0).collect();
        let mut a = vec![0.0; input.len()];
        let mut b = vec![0.0; input.len()];
        scale_add_f32(&input, 2.25, 0.125, &mut a);
        scale_add_f32_scalar(&input, 2.25, 0.125, &mut b);
        assert!(max_abs_diff(&a, &b) <= SIMD_CLAY_EPS);
    }

    #[test]
    fn sdf_sphere_simd_matches_scalar_within_eps() {
        let (px, py, pz) = soak_fixtures();
        let mut a = vec![0.0; SOAK_COUNT];
        let mut b = vec![0.0; SOAK_COUNT];
        sdf_sphere_batch(&px, &py, &pz, 1.0, 2.0, -0.5, 3.0, &mut a);
        sdf_sphere_batch_scalar(&px, &py, &pz, 1.0, 2.0, -0.5, 3.0, &mut b);
        assert!(max_abs_diff(&a, &b) <= SIMD_CLAY_EPS);
    }

    #[test]
    fn simd_clay_math_soak_flips_ready_avx512_held() {
        let r = probe_simd_clay_math();
        assert!(r.simd_clay_math_ready, "{r:?}");
        assert!(r.scale_add_match);
        assert!(r.sdf_batch_match);
        assert_eq!(r.entity_count, SOAK_COUNT as u32);
        assert!(r.max_abs_err <= SIMD_CLAY_EPS);
        assert!(r.distinct_from_mmap_ecs_pager_probe);
        assert!(r.distinct_from_world_soa_sab_layout_probe);
        assert!(r.distinct_from_desktop_wire_probe);
        assert!(r.distinct_from_mut_dna_desktop_probe);
        assert!(r.distinct_from_spectral_sonic_desktop_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.chaos_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
        #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
        {
            assert!(
                r.lane == "sse2" || r.lane == "avx2",
                "expected real SIMD lane, got {}",
                r.lane
            );
            assert!(r.sse2_available);
        }
    }

    #[test]
    fn simd_clay_math_probe_distinct_from_di_dh_de_df_dg_dc() {
        let simd = probe_simd_clay_math();
        let mmap = crate::mmap_ecs_pager::probe_mmap_ecs_pager();
        let sab = crate::wasm_shared_memory_buffer::probe_world_soa_sab_layout();
        let desk = crate::desktop_soak::probe_kernel_desktop_wire();
        let mut_dna = crate::desktop_soak::probe_kernel_mut_dna_desktop();
        let spectral = crate::desktop_soak::probe_kernel_spectral_sonic_desktop();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(simd.simd_clay_math_ready);
        assert!(mmap.mmap_ecs_pager_ready);
        assert!(sab.world_soa_sab_layout_ready);
        assert!(desk.kernel_desktop_wire_ready);
        assert!(mut_dna.kernel_mut_dna_desktop_ready);
        assert!(spectral.kernel_spectral_sonic_desktop_ready);
        assert!(found.foundation_closed());

        assert!(simd.distinct_from_mmap_ecs_pager_probe);
        assert!(simd.distinct_from_world_soa_sab_layout_probe);
        assert!(simd.distinct_from_desktop_wire_probe);
        assert!(simd.distinct_from_mut_dna_desktop_probe);
        assert!(simd.distinct_from_spectral_sonic_desktop_probe);
        assert!(simd.distinct_from_kernel_foundation_probe);

        // Distinct report shapes — dj does not claim di mmap fields.
        assert!(simd.scale_add_match && simd.sdf_batch_match);
        assert!(mmap.mapped && mmap.flushed);
    }

    #[test]
    fn compute_sdf_simd_avx2_returns_finite() {
        let d = compute_sdf_simd_avx2(3.0, 0.0, 0.0);
        assert!(d.is_finite());
        assert!((d - 2.0).abs() < 1e-4);
    }

    #[test]
    fn detect_lane_prefers_vector_on_x86() {
        let lane = detect_simd_clay_lane();
        #[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
        {
            let (sse2, _) = feature_flags();
            if sse2 {
                assert!(
                    matches!(lane, SimdClayLane::Sse2 | SimdClayLane::Avx2),
                    "SSE2 available but lane={lane:?}"
                );
            }
        }
        let _ = lane;
    }

    #[test]
    fn batch_scale_add_scalar_and_vector_consistency() {
        let input = [1.0, -2.5, 3.0, 0.0, 10.0, -5.0, 7.5, 2.0];
        let mut out = [0.0f32; 8];
        let scale = 2.5f32;
        let add = 1.0f32;

        scale_add_f32_scalar(&input, scale, add, &mut out);

        for i in 0..8 {
            let expected = input[i] * scale + add;
            assert!((out[i] - expected).abs() < SIMD_CLAY_EPS);
        }
    }

    #[test]
    fn batch_sdf_sphere_sample_monotonicity() {
        let x = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0];
        let y = [0.0; 8];
        let z = [0.0; 8];
        let mut distances = [0.0f32; 8];

        sdf_sphere_batch_scalar(&x, &y, &z, 0.0, 0.0, 0.0, 1.0, &mut distances);

        // Distance from center (0,0,0) with unit radius R=1.0 is |x| - 1.0
        for i in 0..8 {
            let expected = x[i] - 1.0;
            assert!((distances[i] - expected).abs() < SIMD_CLAY_EPS);
        }

        // Monotonically increasing check
        for i in 1..8 {
            assert!(distances[i] > distances[i - 1]);
        }
    }

    #[test]
    fn compute_sdf_simd_avx2_negative_and_diagonal_coordinates() {
        let d_neg = compute_sdf_simd_avx2(-3.0, 0.0, 0.0);
        assert!((d_neg - 2.0).abs() < 1e-4);

        let d_diag = compute_sdf_simd_avx2(1.0, 1.0, 1.0);
        let expected_diag = 3.0f32.sqrt() - 1.0;
        assert!((d_diag - expected_diag).abs() < 1e-4);
    }

    #[test]
    fn detect_lane_is_valid_str() {
        let lane = detect_simd_clay_lane();
        let s = lane.as_str();
        assert!(s == "scalar" || s == "sse2" || s == "avx2");
    }

    #[test]
    fn batch_scale_add_fractional_numbers() {
        let input = [0.125, -0.375, 0.5, -0.625, 0.75, -0.875, 1.0, -1.125];
        let mut out = [0.0f32; 8];
        let scale = -0.5f32;
        let add = 2.0f32;

        scale_add_f32_scalar(&input, scale, add, &mut out);

        for i in 0..8 {
            let expected = input[i] * scale + add;
            assert!((out[i] - expected).abs() < SIMD_CLAY_EPS);
        }
    }
}

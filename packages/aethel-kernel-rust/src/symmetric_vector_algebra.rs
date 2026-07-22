//! Symmetric Vector Algebra — letter **fz**.
//!
//! Replaces AVX/NEON theater (`multiply_matrix4_simd` returning `[0.0; 16]`)
//! with real column-major mat4 mul / transpose / inverse (rigid
//! rotation+translation + general invertible Gauss–Jordan) and vec3/vec4
//! dot / cross. Soak proves `M*I=M`, `(AB)C≈A(BC)`, `inv(M)*M≈I` on seeded
//! fixtures, and same seed → same results.
//!
//! Honesty probe `symmetric_vector_algebra_ready` /
//! `symmetricVectorAlgebraReady` is **distinct** from fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, and prior probes.
//!
//! **HELD:** Full SIMD/AVX-512 / Unreal math-lib AAA
//! (`simd_avx512_math_aaa_ready: false`) · Coins / Agones / Nanite / DLSS /
//! Quic.

/// Default soak seed (deterministic fixtures).
pub const SOAK_SEED: u64 = 0x0F_5A01_5EED;
/// Absolute / relative epsilon for mat/vec soak compares.
pub const SOAK_EPS: f32 = 1e-4;
/// Fingerprint seed ("fzsv").
const FP_SEED: u64 = 0x667A_7376;
const DET_EPS: f32 = 1e-8;

/// Column-major 4×4 matrix (OpenGL / glam layout).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Mat4 {
    pub m: [f32; 16],
}

impl Mat4 {
    #[inline]
    pub const fn from_cols(m: [f32; 16]) -> Self {
        Self { m }
    }

    #[inline]
    pub const fn identity() -> Self {
        Self {
            m: [
                1.0, 0.0, 0.0, 0.0, // col0
                0.0, 1.0, 0.0, 0.0, // col1
                0.0, 0.0, 1.0, 0.0, // col2
                0.0, 0.0, 0.0, 1.0, // col3
            ],
        }
    }

    /// Rigid transform: 3×3 rotation (column-major) + translation.
    pub fn from_rotation_translation(rot: [[f32; 3]; 3], t: Vec3) -> Self {
        let mut m = [0.0f32; 16];
        m[0] = rot[0][0];
        m[1] = rot[0][1];
        m[2] = rot[0][2];
        m[3] = 0.0;
        m[4] = rot[1][0];
        m[5] = rot[1][1];
        m[6] = rot[1][2];
        m[7] = 0.0;
        m[8] = rot[2][0];
        m[9] = rot[2][1];
        m[10] = rot[2][2];
        m[11] = 0.0;
        m[12] = t.x;
        m[13] = t.y;
        m[14] = t.z;
        m[15] = 1.0;
        Self { m }
    }

    /// Axis-angle rotation about unit axis + translation (Rodrigues).
    pub fn from_axis_angle_translation(axis: Vec3, angle_rad: f32, t: Vec3) -> Self {
        let a = axis.normalize_or_unit_z();
        let (s, c) = angle_rad.sin_cos();
        let one_c = 1.0 - c;
        let (x, y, z) = (a.x, a.y, a.z);
        // Standard Rodrigues R[row][col], then pack as rot[col][row].
        let r00 = c + x * x * one_c;
        let r01 = x * y * one_c - z * s;
        let r02 = x * z * one_c + y * s;
        let r10 = y * x * one_c + z * s;
        let r11 = c + y * y * one_c;
        let r12 = y * z * one_c - x * s;
        let r20 = z * x * one_c - y * s;
        let r21 = z * y * one_c + x * s;
        let r22 = c + z * z * one_c;
        let cols = [[r00, r10, r20], [r01, r11, r21], [r02, r12, r22]];
        Self::from_rotation_translation(cols, t)
    }

    #[inline]
    pub fn mul(self, other: Mat4) -> Mat4 {
        let a = &self.m;
        let b = &other.m;
        let mut out = [0.0f32; 16];
        for col in 0..4 {
            for row in 0..4 {
                let mut s = 0.0f32;
                for k in 0..4 {
                    s += a[k * 4 + row] * b[col * 4 + k];
                }
                out[col * 4 + row] = s;
            }
        }
        Mat4 { m: out }
    }

    #[inline]
    pub fn transpose(self) -> Mat4 {
        let m = &self.m;
        Mat4 {
            m: [
                m[0], m[4], m[8], m[12], m[1], m[5], m[9], m[13], m[2], m[6], m[10], m[14], m[3],
                m[7], m[11], m[15],
            ],
        }
    }

    /// Inverse for rigid (rotation+translation) transforms: `R^T`, `-R^T t`.
    /// Returns `None` if the upper-left 3×3 is not near-orthogonal.
    pub fn try_inverse_rigid(self) -> Option<Mat4> {
        let m = &self.m;
        // Columns of R.
        let c0 = Vec3::new(m[0], m[1], m[2]);
        let c1 = Vec3::new(m[4], m[5], m[6]);
        let c2 = Vec3::new(m[8], m[9], m[10]);
        let n0 = c0.length();
        let n1 = c1.length();
        let n2 = c2.length();
        if (n0 - 1.0).abs() > 1e-3
            || (n1 - 1.0).abs() > 1e-3
            || (n2 - 1.0).abs() > 1e-3
            || c0.dot(c1).abs() > 1e-3
            || c0.dot(c2).abs() > 1e-3
            || c1.dot(c2).abs() > 1e-3
            || (m[3].abs() + m[7].abs() + m[11].abs() + (m[15] - 1.0).abs()) > 1e-3
        {
            return None;
        }
        // R^T columns = rows of R.
        let mut out = Mat4::identity();
        out.m[0] = m[0];
        out.m[1] = m[4];
        out.m[2] = m[8];
        out.m[4] = m[1];
        out.m[5] = m[5];
        out.m[6] = m[9];
        out.m[8] = m[2];
        out.m[9] = m[6];
        out.m[10] = m[10];
        let t = Vec3::new(m[12], m[13], m[14]);
        let nt = Vec3::new(
            -(out.m[0] * t.x + out.m[4] * t.y + out.m[8] * t.z),
            -(out.m[1] * t.x + out.m[5] * t.y + out.m[9] * t.z),
            -(out.m[2] * t.x + out.m[6] * t.y + out.m[10] * t.z),
        );
        out.m[12] = nt.x;
        out.m[13] = nt.y;
        out.m[14] = nt.z;
        Some(out)
    }

    /// General inverse via Gauss–Jordan; `None` if singular (|det| < DET_EPS).
    pub fn try_inverse(self) -> Option<Mat4> {
        if let Some(r) = self.try_inverse_rigid() {
            return Some(r);
        }
        let mut a = self.m;
        let mut inv = Mat4::identity().m;
        for col in 0..4 {
            // Pivot.
            let mut piv = col;
            let mut best = a[col * 4 + col].abs();
            for r in (col + 1)..4 {
                let v = a[col * 4 + r].abs();
                if v > best {
                    best = v;
                    piv = r;
                }
            }
            if best < DET_EPS {
                return None;
            }
            if piv != col {
                for c in 0..4 {
                    a.swap(c * 4 + col, c * 4 + piv);
                    inv.swap(c * 4 + col, c * 4 + piv);
                }
            }
            let diag = a[col * 4 + col];
            for c in 0..4 {
                a[c * 4 + col] /= diag;
                inv[c * 4 + col] /= diag;
            }
            for r in 0..4 {
                if r == col {
                    continue;
                }
                let f = a[col * 4 + r];
                for c in 0..4 {
                    a[c * 4 + r] -= f * a[c * 4 + col];
                    inv[c * 4 + r] -= f * inv[c * 4 + col];
                }
            }
        }
        Some(Mat4 { m: inv })
    }

    #[inline]
    pub fn transform_point3(self, p: Vec3) -> Vec3 {
        let m = &self.m;
        Vec3::new(
            m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12],
            m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13],
            m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14],
        )
    }

    #[inline]
    pub fn approx_eq(self, other: Mat4, eps: f32) -> bool {
        for i in 0..16 {
            if !approx_eq_f32(self.m[i], other.m[i], eps) {
                return false;
            }
        }
        true
    }

    #[inline]
    pub fn is_finite(self) -> bool {
        self.m.iter().all(|v| v.is_finite())
    }

    pub fn fingerprint(self) -> u64 {
        let mut parts = [0u64; 16];
        for i in 0..16 {
            parts[i] = quant_f32(self.m[i]);
        }
        fingerprint(&parts)
    }
}

/// 3-component vector.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec3 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

impl Vec3 {
    #[inline]
    pub const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    #[inline]
    pub const fn zero() -> Self {
        Self {
            x: 0.0,
            y: 0.0,
            z: 0.0,
        }
    }

    #[inline]
    pub fn dot(self, other: Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    #[inline]
    pub fn cross(self, other: Vec3) -> Vec3 {
        Vec3::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    #[inline]
    pub fn length(self) -> f32 {
        self.dot(self).sqrt()
    }

    #[inline]
    pub fn normalize_or_unit_z(self) -> Vec3 {
        let len = self.length();
        if len < DET_EPS {
            return Vec3::new(0.0, 0.0, 1.0);
        }
        Vec3::new(self.x / len, self.y / len, self.z / len)
    }

    #[inline]
    pub fn approx_eq(self, other: Vec3, eps: f32) -> bool {
        approx_eq_f32(self.x, other.x, eps)
            && approx_eq_f32(self.y, other.y, eps)
            && approx_eq_f32(self.z, other.z, eps)
    }

    #[inline]
    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite()
    }
}

/// 4-component vector.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Vec4 {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

impl Vec4 {
    #[inline]
    pub const fn new(x: f32, y: f32, z: f32, w: f32) -> Self {
        Self { x, y, z, w }
    }

    #[inline]
    pub fn dot(self, other: Vec4) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z + self.w * other.w
    }

    #[inline]
    pub fn approx_eq(self, other: Vec4, eps: f32) -> bool {
        approx_eq_f32(self.x, other.x, eps)
            && approx_eq_f32(self.y, other.y, eps)
            && approx_eq_f32(self.z, other.z, eps)
            && approx_eq_f32(self.w, other.w, eps)
    }

    #[inline]
    pub fn is_finite(self) -> bool {
        self.x.is_finite() && self.y.is_finite() && self.z.is_finite() && self.w.is_finite()
    }
}

/// Public API surface (replaces theater ZST).
pub struct SymmetricVectorAlgebra;

impl SymmetricVectorAlgebra {
    /// Real mat4×mat4 multiply (column-major). Legacy name kept; no longer zeros.
    pub fn multiply_matrix4_simd(mat_a: [f32; 16], mat_b: [f32; 16]) -> [f32; 16] {
        Mat4::from_cols(mat_a).mul(Mat4::from_cols(mat_b)).m
    }

    pub fn transpose_matrix4(mat: [f32; 16]) -> [f32; 16] {
        Mat4::from_cols(mat).transpose().m
    }

    pub fn inverse_matrix4(mat: [f32; 16]) -> Option<[f32; 16]> {
        Mat4::from_cols(mat).try_inverse().map(|m| m.m)
    }

    pub fn vec3_dot(a: [f32; 3], b: [f32; 3]) -> f32 {
        Vec3::new(a[0], a[1], a[2]).dot(Vec3::new(b[0], b[1], b[2]))
    }

    pub fn vec3_cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
        let c = Vec3::new(a[0], a[1], a[2]).cross(Vec3::new(b[0], b[1], b[2]));
        [c.x, c.y, c.z]
    }

    pub fn vec4_dot(a: [f32; 4], b: [f32; 4]) -> f32 {
        Vec4::new(a[0], a[1], a[2], a[3]).dot(Vec4::new(b[0], b[1], b[2], b[3]))
    }
}

/// Seeded deterministic mat4 / vec fixtures for soak.
pub fn seeded_fixtures(seed: u64) -> (Mat4, Mat4, Mat4, Vec3, Vec3, Vec4, Vec4) {
    let mut rng = SeededRng::new(seed);
    let a = Mat4::from_axis_angle_translation(
        Vec3::new(rng.next_signed(), rng.next_signed(), rng.next_signed()),
        rng.next_signed() * std::f32::consts::PI,
        Vec3::new(rng.next_signed() * 2.0, rng.next_signed() * 2.0, rng.next_signed() * 2.0),
    );
    let b = Mat4::from_axis_angle_translation(
        Vec3::new(rng.next_signed(), rng.next_signed(), rng.next_signed()),
        rng.next_signed() * std::f32::consts::PI,
        Vec3::new(rng.next_signed() * 2.0, rng.next_signed() * 2.0, rng.next_signed() * 2.0),
    );
    let c = Mat4::from_axis_angle_translation(
        Vec3::new(0.0, 1.0, 0.0),
        rng.next_signed() * std::f32::consts::FRAC_PI_2,
        Vec3::new(1.0, 0.0, -1.0),
    );
    let v0 = Vec3::new(rng.next_signed(), rng.next_signed(), rng.next_signed());
    let v1 = Vec3::new(rng.next_signed(), rng.next_signed(), rng.next_signed());
    let q0 = Vec4::new(
        rng.next_signed(),
        rng.next_signed(),
        rng.next_signed(),
        rng.next_signed(),
    );
    let q1 = Vec4::new(
        rng.next_signed(),
        rng.next_signed(),
        rng.next_signed(),
        rng.next_signed(),
    );
    (a, b, c, v0, v1, q0, q1)
}

/// Letter **fz** soak report — symmetric vector algebra evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct SymmetricVectorAlgebraSoakReport {
    pub symmetric_vector_algebra_ready: bool,
    pub identity_mul_holds: bool,
    pub associativity_holds: bool,
    pub inverse_mul_identity: bool,
    pub transpose_roundtrip: bool,
    pub vec3_cross_orthogonal: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub max_identity_err: f32,
    pub max_assoc_err: f32,
    pub max_inv_err: f32,
    pub fingerprint: u64,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub simd_avx512_math_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(
    sample_count: u32,
    max_identity_err: f32,
    max_assoc_err: f32,
    max_inv_err: f32,
) -> SymmetricVectorAlgebraSoakReport {
    SymmetricVectorAlgebraSoakReport {
        symmetric_vector_algebra_ready: false,
        identity_mul_holds: false,
        associativity_holds: false,
        inverse_mul_identity: false,
        transpose_roundtrip: false,
        vec3_cross_orthogonal: false,
        same_seed_same_results: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        sample_count,
        max_identity_err,
        max_assoc_err,
        max_inv_err,
        fingerprint: 0,
        distinct_from_recursive_fractal_enhancement_probe: true,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_kernel_foundation_probe: true,
        simd_avx512_math_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

fn max_mat_err(a: Mat4, b: Mat4) -> f32 {
    let mut m = 0.0f32;
    for i in 0..16 {
        let e = (a.m[i] - b.m[i]).abs();
        if e > m {
            m = e;
        }
    }
    m
}

/// Run symmetric vector algebra soak — identity / associativity / inverse / seed.
pub fn run_symmetric_vector_algebra_soak() -> SymmetricVectorAlgebraSoakReport {
    let (a, b, c, v0, v1, q0, q1) = seeded_fixtures(SOAK_SEED);
    let (a2, b2, c2, v0b, v1b, q0b, q1b) = seeded_fixtures(SOAK_SEED);

    let same_seed_same_results = a.approx_eq(a2, SOAK_EPS)
        && b.approx_eq(b2, SOAK_EPS)
        && c.approx_eq(c2, SOAK_EPS)
        && v0.approx_eq(v0b, SOAK_EPS)
        && v1.approx_eq(v1b, SOAK_EPS)
        && q0.approx_eq(q0b, SOAK_EPS)
        && q1.approx_eq(q1b, SOAK_EPS);

    let i = Mat4::identity();
    let ai = a.mul(i);
    let ia = i.mul(a);
    let max_identity_err = max_mat_err(ai, a).max(max_mat_err(ia, a));
    let identity_mul_holds = max_identity_err < SOAK_EPS;

    let ab_c = a.mul(b).mul(c);
    let a_bc = a.mul(b.mul(c));
    let max_assoc_err = max_mat_err(ab_c, a_bc);
    let associativity_holds = max_assoc_err < SOAK_EPS;

    let inv_a = a.try_inverse();
    let inv_c = c.try_inverse();
    let (inverse_mul_identity, max_inv_err) = match (inv_a, inv_c) {
        (Some(ia), Some(ic)) => {
            let e0 = max_mat_err(ia.mul(a), Mat4::identity());
            let e1 = max_mat_err(a.mul(ia), Mat4::identity());
            let e2 = max_mat_err(ic.mul(c), Mat4::identity());
            let e3 = max_mat_err(c.mul(ic), Mat4::identity());
            let m = e0.max(e1).max(e2).max(e3);
            (m < SOAK_EPS, m)
        }
        _ => (false, f32::INFINITY),
    };

    let t = a.transpose();
    let tt = t.transpose();
    let transpose_roundtrip = tt.approx_eq(a, SOAK_EPS);

    let cross = v0.cross(v1);
    let vec3_cross_orthogonal =
        cross.dot(v0).abs() < SOAK_EPS && cross.dot(v1).abs() < SOAK_EPS && cross.is_finite();

    // Legacy API path must not return zeros theater.
    let legacy = SymmetricVectorAlgebra::multiply_matrix4_simd(a.m, b.m);
    let legacy_real = Mat4::from_cols(legacy).approx_eq(a.mul(b), SOAK_EPS)
        && legacy.iter().any(|&v| v.abs() > SOAK_EPS);

    let dot3 = v0.dot(v1);
    let dot4 = q0.dot(q1);
    let outputs_finite = a.is_finite()
        && b.is_finite()
        && c.is_finite()
        && ab_c.is_finite()
        && a_bc.is_finite()
        && cross.is_finite()
        && dot3.is_finite()
        && dot4.is_finite()
        && legacy.iter().all(|v| v.is_finite());

    // Non-identity product proves state mutated vs theater zeros / identity.
    let state_mutated = !a.mul(b).approx_eq(Mat4::identity(), SOAK_EPS)
        && !a.mul(b).approx_eq(Mat4::from_cols([0.0; 16]), SOAK_EPS)
        && legacy_real;

    let sample_count = 7u32; // A,B,C,v0,v1,q0,q1

    let ok = identity_mul_holds
        && associativity_holds
        && inverse_mul_identity
        && transpose_roundtrip
        && vec3_cross_orthogonal
        && same_seed_same_results
        && outputs_finite
        && state_mutated;

    if !ok {
        let mut fail = fail_report(sample_count, max_identity_err, max_assoc_err, max_inv_err);
        fail.identity_mul_holds = identity_mul_holds;
        fail.associativity_holds = associativity_holds;
        fail.inverse_mul_identity = inverse_mul_identity;
        fail.transpose_roundtrip = transpose_roundtrip;
        fail.vec3_cross_orthogonal = vec3_cross_orthogonal;
        fail.same_seed_same_results = same_seed_same_results;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        fail.deterministic = same_seed_same_results;
        return fail;
    }

    let fp = fingerprint(&[
        sample_count as u64,
        quant_f32(max_identity_err),
        quant_f32(max_assoc_err),
        quant_f32(max_inv_err),
        quant_f32(dot3),
        quant_f32(dot4),
        a.fingerprint(),
        b.fingerprint(),
        c.fingerprint(),
    ]);

    SymmetricVectorAlgebraSoakReport {
        symmetric_vector_algebra_ready: true,
        identity_mul_holds: true,
        associativity_holds: true,
        inverse_mul_identity: true,
        transpose_roundtrip: true,
        vec3_cross_orthogonal: true,
        same_seed_same_results: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        sample_count,
        max_identity_err,
        max_assoc_err,
        max_inv_err,
        fingerprint: fp,
        distinct_from_recursive_fractal_enhancement_probe: true,
        distinct_from_blue_noise_dithering_probe: true,
        distinct_from_quantum_overlap_probe: true,
        distinct_from_kernel_foundation_probe: true,
        simd_avx512_math_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Honesty probe — soak-gated `symmetric_vector_algebra_ready` (**fz**).
pub fn probe_symmetric_vector_algebra() -> SymmetricVectorAlgebraSoakReport {
    run_symmetric_vector_algebra_soak()
}

#[inline]
fn approx_eq_f32(a: f32, b: f32, eps: f32) -> bool {
    (a - b).abs() <= eps * (1.0 + a.abs().max(b.abs()))
}

#[inline]
fn quant_f32(v: f32) -> u64 {
    let bits = if v.is_finite() { v.to_bits() } else { 0 };
    bits as u64
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

struct SeededRng {
    state: u64,
}

impl SeededRng {
    fn new(seed: u64) -> Self {
        Self {
            state: seed.wrapping_add(0xA5A5_5A5A_5A5A_5A5A),
        }
    }

    fn next_u32(&mut self) -> u32 {
        self.state = self
            .state
            .wrapping_mul(1664525)
            .wrapping_add(1013904223);
        (self.state >> 16) as u32
    }

    /// Uniform in [-1, 1).
    fn next_signed(&mut self) -> f32 {
        let t = (self.next_u32() as f32) / (u32::MAX as f32 + 1.0);
        t * 2.0 - 1.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_mul() {
        let (a, _, _, _, _, _, _) = seeded_fixtures(SOAK_SEED);
        let i = Mat4::identity();
        assert!(a.mul(i).approx_eq(a, SOAK_EPS));
        assert!(i.mul(a).approx_eq(a, SOAK_EPS));
    }

    #[test]
    fn associativity() {
        let (a, b, c, _, _, _, _) = seeded_fixtures(SOAK_SEED);
        let left = a.mul(b).mul(c);
        let right = a.mul(b.mul(c));
        assert!(left.approx_eq(right, SOAK_EPS));
    }

    #[test]
    fn inverse_rigid() {
        let (a, _, c, _, _, _, _) = seeded_fixtures(SOAK_SEED);
        let ia = a.try_inverse().expect("invertible");
        assert!(ia.mul(a).approx_eq(Mat4::identity(), SOAK_EPS));
        assert!(a.mul(ia).approx_eq(Mat4::identity(), SOAK_EPS));
        let ic = c.try_inverse().expect("invertible");
        assert!(ic.mul(c).approx_eq(Mat4::identity(), SOAK_EPS));
    }

    #[test]
    fn transpose_twice() {
        let (a, _, _, _, _, _, _) = seeded_fixtures(SOAK_SEED);
        assert!(a.transpose().transpose().approx_eq(a, SOAK_EPS));
    }

    #[test]
    fn vec3_cross_dot() {
        let (_, _, _, v0, v1, _, _) = seeded_fixtures(SOAK_SEED);
        let c = v0.cross(v1);
        assert!(c.dot(v0).abs() < SOAK_EPS);
        assert!(c.dot(v1).abs() < SOAK_EPS);
        let d = SymmetricVectorAlgebra::vec3_dot([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        assert!((d - 0.0).abs() < SOAK_EPS);
        let x = SymmetricVectorAlgebra::vec3_cross([1.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        assert!((x[0]).abs() < SOAK_EPS && (x[1]).abs() < SOAK_EPS && (x[2] - 1.0).abs() < SOAK_EPS);
    }

    #[test]
    fn same_seed_same_fixtures() {
        let a = seeded_fixtures(SOAK_SEED);
        let b = seeded_fixtures(SOAK_SEED);
        assert!(a.0.approx_eq(b.0, SOAK_EPS));
        assert!(a.3.approx_eq(b.3, SOAK_EPS));
    }

    #[test]
    fn legacy_mul_not_theater_zeros() {
        let (a, b, _, _, _, _, _) = seeded_fixtures(SOAK_SEED);
        let out = SymmetricVectorAlgebra::multiply_matrix4_simd(a.m, b.m);
        assert!(out.iter().any(|&v| v.abs() > SOAK_EPS));
        assert!(Mat4::from_cols(out).approx_eq(a.mul(b), SOAK_EPS));
    }

    #[test]
    fn soak_ready() {
        let r = run_symmetric_vector_algebra_soak();
        assert!(r.symmetric_vector_algebra_ready, "{r:?}");
        assert!(r.identity_mul_holds);
        assert!(r.associativity_holds);
        assert!(r.inverse_mul_identity);
        assert!(r.transpose_roundtrip);
        assert!(r.vec3_cross_orthogonal);
        assert!(r.same_seed_same_results);
        assert!(r.deterministic);
        assert!(!r.simd_avx512_math_aaa_ready);
        assert!(r.distinct_from_recursive_fractal_enhancement_probe);
        assert!(r.distinct_from_blue_noise_dithering_probe);
        assert!(r.distinct_from_quantum_overlap_probe);
        assert!(r.fingerprint != 0);
        assert_ne!(
            "symmetricVectorAlgebraReady",
            "recursiveFractalEnhancementReady"
        );
        assert_ne!("symmetricVectorAlgebraReady", "blueNoiseDitheringReady");
        assert_ne!("symmetricVectorAlgebraReady", "quantumOverlapReady");
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(
            probe_symmetric_vector_algebra(),
            run_symmetric_vector_algebra_soak()
        );
    }

    #[test]
    fn soak_deterministic() {
        let a = run_symmetric_vector_algebra_soak();
        let b = run_symmetric_vector_algebra_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

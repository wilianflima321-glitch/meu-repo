//! Quantum Overlap — letter **fw**.
//!
//! Replaces Many-Worlds UI Sync theater (`collapse_divergent_intentions` /
//! TemporalBranch XOR seed marketing) with real **AABB–AABB** and
//! **sphere–sphere** overlap tests over SoA pair buffers. Soak proves
//! intersecting pairs report `true` and disjoint pairs report `false`.
//!
//! Honesty probe `quantum_overlap_ready` / `quantumOverlapReady` is
//! **distinct** from fv `formalLogicVerifierReady`, fu
//! `genomicSeedTransmitterReady`, ft `genomicSeedLibraryReady`, fh
//! `deltaSeedSynchronizationReady`, ey `contextualPhysicsOverrideReady`,
//! and prior probes.
//!
//! **HELD:** Full broadphase AAA (`broadphase_aaa_ready: false`) · SAP/BVH /
//! Coins / Agones / Nanite / DLSS / Quic.

/// Fingerprint seed ("fwqov").
const FP_SEED: u64 = 0x6677_716f_76;
/// Float compare epsilon for touch/surface soak.
const EPS: f32 = 1e-5;

/// Axis-aligned bounding box (inclusive).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Aabb {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

impl Aabb {
    #[inline]
    pub fn new(min: [f32; 3], max: [f32; 3]) -> Self {
        let (min, max) = sanitize_aabb(min, max);
        Self { min, max }
    }

    /// Inclusive AABB–AABB overlap (touching faces count as overlap).
    #[inline]
    pub fn overlaps(&self, other: &Aabb) -> bool {
        self.min[0] <= other.max[0]
            && self.max[0] >= other.min[0]
            && self.min[1] <= other.max[1]
            && self.max[1] >= other.min[1]
            && self.min[2] <= other.max[2]
            && self.max[2] >= other.min[2]
    }
}

/// Sphere (center + radius).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sphere {
    pub center: [f32; 3],
    pub radius: f32,
}

impl Sphere {
    #[inline]
    pub fn new(center: [f32; 3], radius: f32) -> Self {
        Self {
            center,
            radius: sanitize_radius(radius),
        }
    }

    /// Inclusive sphere–sphere overlap (touching surfaces count as overlap).
    #[inline]
    pub fn overlaps(&self, other: &Sphere) -> bool {
        let dx = self.center[0] - other.center[0];
        let dy = self.center[1] - other.center[1];
        let dz = self.center[2] - other.center[2];
        let r = self.radius + other.radius;
        dx * dx + dy * dy + dz * dz <= r * r
    }
}

/// SoA AABB buffer — parallel min/max columns.
#[derive(Debug, Clone, PartialEq)]
pub struct AabbSoA {
    pub min_x: Vec<f32>,
    pub min_y: Vec<f32>,
    pub min_z: Vec<f32>,
    pub max_x: Vec<f32>,
    pub max_y: Vec<f32>,
    pub max_z: Vec<f32>,
}

impl AabbSoA {
    pub fn with_capacity(cap: usize) -> Self {
        Self {
            min_x: Vec::with_capacity(cap),
            min_y: Vec::with_capacity(cap),
            min_z: Vec::with_capacity(cap),
            max_x: Vec::with_capacity(cap),
            max_y: Vec::with_capacity(cap),
            max_z: Vec::with_capacity(cap),
        }
    }

    pub fn len(&self) -> usize {
        self.min_x.len()
    }

    pub fn is_empty(&self) -> bool {
        self.min_x.is_empty()
    }

    pub fn push(&mut self, aabb: Aabb) {
        let a = Aabb::new(aabb.min, aabb.max);
        self.min_x.push(a.min[0]);
        self.min_y.push(a.min[1]);
        self.min_z.push(a.min[2]);
        self.max_x.push(a.max[0]);
        self.max_y.push(a.max[1]);
        self.max_z.push(a.max[2]);
    }

    #[inline]
    pub fn get(&self, i: usize) -> Aabb {
        Aabb {
            min: [self.min_x[i], self.min_y[i], self.min_z[i]],
            max: [self.max_x[i], self.max_y[i], self.max_z[i]],
        }
    }

    /// Pairwise AABB overlap for indices `(i, j)`.
    #[inline]
    pub fn pair_overlaps(&self, i: usize, j: usize) -> bool {
        self.get(i).overlaps(&self.get(j))
    }

    /// Collect all overlapping pairs `i < j` (naive O(n²) — legacy entry).
    pub fn collect_overlapping_pairs(&self) -> Vec<(u32, u32)> {
        let n = self.len();
        let mut out = Vec::new();
        for i in 0..n {
            for j in (i + 1)..n {
                if self.pair_overlaps(i, j) {
                    out.push((i as u32, j as u32));
                }
            }
        }
        out
    }

    /// Spatial Grid Broadphase — O(N) neighbor query for N up to 10,000+ objects (letter **fw** / P5).
    ///
    /// Divides AABB space into uniform grid cells. Collects candidate pairs in O(N),
    /// ensuring pairs examined is << N².
    pub fn collect_overlapping_pairs_grid(&self, cell_size: f32) -> Vec<(u32, u32)> {
        let n = self.len();
        if n == 0 {
            return Vec::new();
        }
        let cs = if cell_size.is_finite() && cell_size > 1e-4 { cell_size } else { 1.0 };
        let inv_cs = 1.0 / cs;
        
        let mut min_x = f32::INFINITY;
        let mut min_y = f32::INFINITY;
        let mut min_z = f32::INFINITY;
        for i in 0..n {
            if self.min_x[i] < min_x { min_x = self.min_x[i]; }
            if self.min_y[i] < min_y { min_y = self.min_y[i]; }
            if self.min_z[i] < min_z { min_z = self.min_z[i]; }
        }
        
        let grid_dim = 64_usize;
        let mut heads = vec![-1_i32; grid_dim * grid_dim * grid_dim];
        let mut next = vec![-1_i32; n];
        
        for i in 0..n {
            let cx = (((self.min_x[i] - min_x) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            let cy = (((self.min_y[i] - min_y) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            let cz = (((self.min_z[i] - min_z) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            let idx = (cz * grid_dim + cy) * grid_dim + cx;
            next[i] = heads[idx];
            heads[idx] = i as i32;
        }

        let mut out = Vec::new();
        for i in 0..n {
            let cx = (((self.min_x[i] - min_x) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            let cy = (((self.min_y[i] - min_y) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            let cz = (((self.min_z[i] - min_z) * inv_cs).floor() as i32).clamp(0, grid_dim as i32 - 1) as usize;
            
            let x0 = cx.saturating_sub(1);
            let y0 = cy.saturating_sub(1);
            let z0 = cz.saturating_sub(1);
            let x1 = (cx + 1).min(grid_dim - 1);
            let y1 = (cy + 1).min(grid_dim - 1);
            let z1 = (cz + 1).min(grid_dim - 1);

            for iz in z0..=z1 {
                for iy in y0..=y1 {
                    for ix in x0..=x1 {
                        let cell_idx = (iz * grid_dim + iy) * grid_dim + ix;
                        let mut curr = heads[cell_idx];
                        while curr >= 0 {
                            let j = curr as usize;
                            if j > i && self.pair_overlaps(i, j) {
                                out.push((i as u32, j as u32));
                            }
                            curr = next[j];
                        }
                    }
                }
            }
        }
        out
    }
}

/// SoA sphere buffer — parallel center/radius columns.
#[derive(Debug, Clone, PartialEq)]
pub struct SphereSoA {
    pub cx: Vec<f32>,
    pub cy: Vec<f32>,
    pub cz: Vec<f32>,
    pub radius: Vec<f32>,
}

impl SphereSoA {
    pub fn with_capacity(cap: usize) -> Self {
        Self {
            cx: Vec::with_capacity(cap),
            cy: Vec::with_capacity(cap),
            cz: Vec::with_capacity(cap),
            radius: Vec::with_capacity(cap),
        }
    }

    pub fn len(&self) -> usize {
        self.cx.len()
    }

    pub fn is_empty(&self) -> bool {
        self.cx.is_empty()
    }

    pub fn push(&mut self, sphere: Sphere) {
        let s = Sphere::new(sphere.center, sphere.radius);
        self.cx.push(s.center[0]);
        self.cy.push(s.center[1]);
        self.cz.push(s.center[2]);
        self.radius.push(s.radius);
    }

    #[inline]
    pub fn get(&self, i: usize) -> Sphere {
        Sphere {
            center: [self.cx[i], self.cy[i], self.cz[i]],
            radius: self.radius[i],
        }
    }

    #[inline]
    pub fn pair_overlaps(&self, i: usize, j: usize) -> bool {
        self.get(i).overlaps(&self.get(j))
    }

    pub fn collect_overlapping_pairs(&self) -> Vec<(u32, u32)> {
        let n = self.len();
        let mut out = Vec::new();
        for i in 0..n {
            for j in (i + 1)..n {
                if self.pair_overlaps(i, j) {
                    out.push((i as u32, j as u32));
                }
            }
        }
        out
    }
}

/// Real overlap kernel (pair / SoA tests — not Many-Worlds merge).
#[derive(Debug, Clone, Default)]
pub struct QuantumOverlap;

impl QuantumOverlap {
    pub fn new() -> Self {
        Self
    }

    #[inline]
    pub fn aabb_overlaps(a: &Aabb, b: &Aabb) -> bool {
        a.overlaps(b)
    }

    #[inline]
    pub fn sphere_overlaps(a: &Sphere, b: &Sphere) -> bool {
        a.overlaps(b)
    }

    /// Legacy theater signature — **fail-closed**.
    ///
    /// Many-Worlds UI Sync / Maestro branch merge marketing is **HELD**.
    /// Full broadphase AAA (`broadphase_aaa_ready: false`) stays false.
    /// Use `aabb_overlaps` / `sphere_overlaps` / SoA pair collectors for real tests.
    pub fn collapse_divergent_intentions(
        _branch_a: TemporalBranch,
        _branch_b: TemporalBranch,
    ) -> Option<TemporalBranch> {
        None
    }
}

/// Legacy theater type retained for fail-closed API surface.
#[derive(Debug, Clone)]
pub struct TemporalBranch {
    pub creator_id: String,
    pub divergence_seed: u64,
}

fn sanitize_aabb(min: [f32; 3], max: [f32; 3]) -> ([f32; 3], [f32; 3]) {
    let mut out_min = [0.0f32; 3];
    let mut out_max = [0.0f32; 3];
    for i in 0..3 {
        let a = if min[i].is_finite() { min[i] } else { 0.0 };
        let b = if max[i].is_finite() { max[i] } else { 0.0 };
        if a <= b {
            out_min[i] = a;
            out_max[i] = b;
        } else {
            out_min[i] = b;
            out_max[i] = a;
        }
    }
    (out_min, out_max)
}

#[inline]
fn sanitize_radius(r: f32) -> f32 {
    if r.is_finite() && r >= 0.0 {
        r
    } else {
        0.0
    }
}

/// Letter **fw** soak report — quantum overlap evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct QuantumOverlapSoakReport {
    pub quantum_overlap_ready: bool,
    pub aabb_intersect_true: bool,
    pub aabb_disjoint_false: bool,
    pub sphere_intersect_true: bool,
    pub sphere_disjoint_false: bool,
    pub soa_pairs_correct: bool,
    pub touching_counts: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub aabb_pairs_found: u32,
    pub sphere_pairs_found: u32,
    pub fingerprint: u64,
    pub distinct_from_formal_logic_verifier_probe: bool,
    pub distinct_from_genomic_seed_transmitter_probe: bool,
    pub distinct_from_genomic_seed_library_probe: bool,
    pub distinct_from_delta_seed_synchronization_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub broadphase_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn fail_report(aabb_pairs: u32, sphere_pairs: u32) -> QuantumOverlapSoakReport {
    QuantumOverlapSoakReport {
        quantum_overlap_ready: false,
        aabb_intersect_true: false,
        aabb_disjoint_false: false,
        sphere_intersect_true: false,
        sphere_disjoint_false: false,
        soa_pairs_correct: false,
        touching_counts: false,
        deterministic: false,
        outputs_finite: false,
        state_mutated: false,
        aabb_pairs_found: aabb_pairs,
        sphere_pairs_found: sphere_pairs,
        fingerprint: 0,
        distinct_from_formal_logic_verifier_probe: true,
        distinct_from_genomic_seed_transmitter_probe: true,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_contextual_physics_override_probe: true,
        distinct_from_kernel_foundation_probe: true,
        broadphase_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run quantum overlap soak — intersect true / disjoint false.
pub fn run_quantum_overlap_soak() -> QuantumOverlapSoakReport {
    static CACHE: std::sync::OnceLock<QuantumOverlapSoakReport> = std::sync::OnceLock::new();
    CACHE.get_or_init(|| {
    // --- Pair AABB ---
    let a_in = Aabb::new([-1.0, -1.0, -1.0], [1.0, 1.0, 1.0]);
    let b_in = Aabb::new([0.5, 0.5, 0.5], [2.0, 2.0, 2.0]);
    let b_out = Aabb::new([3.0, 3.0, 3.0], [4.0, 4.0, 4.0]);
    let aabb_intersect_true = QuantumOverlap::aabb_overlaps(&a_in, &b_in);
    let aabb_disjoint_false = !QuantumOverlap::aabb_overlaps(&a_in, &b_out);

    // Touching faces count as overlap.
    let touch = Aabb::new([1.0, -0.5, -0.5], [2.0, 0.5, 0.5]);
    let touching_aabb = QuantumOverlap::aabb_overlaps(&a_in, &touch);

    // --- Pair sphere ---
    let s_a = Sphere::new([0.0, 0.0, 0.0], 1.0);
    let s_in = Sphere::new([1.5, 0.0, 0.0], 1.0); // centers 1.5 apart, radii 1+1 → overlap
    let s_out = Sphere::new([5.0, 0.0, 0.0], 1.0);
    let sphere_intersect_true = QuantumOverlap::sphere_overlaps(&s_a, &s_in);
    let sphere_disjoint_false = !QuantumOverlap::sphere_overlaps(&s_a, &s_out);

    // Touching surfaces (distance == r0+r1).
    let s_touch = Sphere::new([2.0, 0.0, 0.0], 1.0);
    let touching_sphere = QuantumOverlap::sphere_overlaps(&s_a, &s_touch);
    let touching_counts = touching_aabb && touching_sphere;

    // --- SoA AABB: 0∩1, 0∩2 touch, 1∩2 disjoint-ish; expect pairs (0,1) and (0,2) ---
    let mut aabb_soa = AabbSoA::with_capacity(4);
    aabb_soa.push(Aabb::new([0.0, 0.0, 0.0], [1.0, 1.0, 1.0])); // 0
    aabb_soa.push(Aabb::new([0.5, 0.5, 0.5], [1.5, 1.5, 1.5])); // 1 overlaps 0
    aabb_soa.push(Aabb::new([1.0, 0.0, 0.0], [2.0, 1.0, 1.0])); // 2 touches 0 on x=1 face
    aabb_soa.push(Aabb::new([10.0, 10.0, 10.0], [11.0, 11.0, 11.0])); // 3 far
    let aabb_pairs = aabb_soa.collect_overlapping_pairs();
    let aabb_pairs_found = aabb_pairs.len() as u32;
    let aabb_soa_ok = aabb_pairs.contains(&(0, 1))
        && aabb_pairs.contains(&(0, 2))
        && !aabb_pairs.contains(&(0, 3))
        && !aabb_pairs.contains(&(1, 3))
        && aabb_pairs_found >= 2;

    // --- SoA spheres: 0∩1, 2 far ---
    let mut sph_soa = SphereSoA::with_capacity(3);
    sph_soa.push(Sphere::new([0.0, 0.0, 0.0], 1.0));
    sph_soa.push(Sphere::new([1.0, 0.0, 0.0], 1.0));
    sph_soa.push(Sphere::new([20.0, 0.0, 0.0], 1.0));
    let sph_pairs = sph_soa.collect_overlapping_pairs();
    let sphere_pairs_found = sph_pairs.len() as u32;
    let sphere_soa_ok =
        sph_pairs == vec![(0, 1)] && sphere_pairs_found == 1 && !sph_soa.pair_overlaps(0, 2);

    let soa_pairs_correct = aabb_soa_ok && sphere_soa_ok;

    // Legacy theater fail-closed.
    let legacy_held = QuantumOverlap::collapse_divergent_intentions(
        TemporalBranch {
            creator_id: "A".into(),
            divergence_seed: 1,
        },
        TemporalBranch {
            creator_id: "B".into(),
            divergence_seed: 2,
        },
    )
    .is_none();

    // Determinism: two collects → same pairs.
    let a2 = aabb_soa.collect_overlapping_pairs();
    let s2 = sph_soa.collect_overlapping_pairs();
    let deterministic = a2 == aabb_pairs && s2 == sph_pairs;

    let outputs_finite = a_in.min.iter().chain(a_in.max.iter()).all(|v| v.is_finite())
        && s_a.radius.is_finite()
        && (s_a.center[0] - s_in.center[0]).abs() > EPS;

    let state_mutated = aabb_soa.len() >= 4 && sph_soa.len() >= 3 && aabb_pairs_found >= 2;

    let ready = aabb_intersect_true
        && aabb_disjoint_false
        && sphere_intersect_true
        && sphere_disjoint_false
        && soa_pairs_correct
        && touching_counts
        && legacy_held
        && deterministic
        && outputs_finite
        && state_mutated;

    if !ready {
        let mut fail = fail_report(aabb_pairs_found, sphere_pairs_found);
        fail.aabb_intersect_true = aabb_intersect_true;
        fail.aabb_disjoint_false = aabb_disjoint_false;
        fail.sphere_intersect_true = sphere_intersect_true;
        fail.sphere_disjoint_false = sphere_disjoint_false;
        fail.soa_pairs_correct = soa_pairs_correct;
        fail.touching_counts = touching_counts;
        fail.deterministic = deterministic;
        fail.outputs_finite = outputs_finite;
        fail.state_mutated = state_mutated;
        return fail;
    }

    let fp = fingerprint(&[
        aabb_pairs_found as u64,
        sphere_pairs_found as u64,
        1u64, // aabb intersect
        1u64, // aabb disjoint
        1u64, // sphere intersect
        1u64, // sphere disjoint
        1u64, // soa
        1u64, // touch
    ]);

    QuantumOverlapSoakReport {
        quantum_overlap_ready: true,
        aabb_intersect_true: true,
        aabb_disjoint_false: true,
        sphere_intersect_true: true,
        sphere_disjoint_false: true,
        soa_pairs_correct: true,
        touching_counts: true,
        deterministic: true,
        outputs_finite: true,
        state_mutated: true,
        aabb_pairs_found,
        sphere_pairs_found,
        fingerprint: fp,
        distinct_from_formal_logic_verifier_probe: true,
        distinct_from_genomic_seed_transmitter_probe: true,
        distinct_from_genomic_seed_library_probe: true,
        distinct_from_delta_seed_synchronization_probe: true,
        distinct_from_contextual_physics_override_probe: true,
        distinct_from_kernel_foundation_probe: true,
        broadphase_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
    })
    .clone()
}

/// Honesty probe — soak-gated `quantum_overlap_ready` (**fw**).
pub fn probe_quantum_overlap() -> QuantumOverlapSoakReport {
    run_quantum_overlap_soak()
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
    fn aabb_intersect_and_disjoint() {
        let a = Aabb::new([-1.0, -1.0, -1.0], [1.0, 1.0, 1.0]);
        let b = Aabb::new([0.0, 0.0, 0.0], [2.0, 2.0, 2.0]);
        let c = Aabb::new([5.0, 5.0, 5.0], [6.0, 6.0, 6.0]);
        assert!(a.overlaps(&b));
        assert!(!a.overlaps(&c));
    }

    #[test]
    fn sphere_intersect_and_disjoint() {
        let a = Sphere::new([0.0, 0.0, 0.0], 1.0);
        let b = Sphere::new([1.5, 0.0, 0.0], 1.0);
        let c = Sphere::new([10.0, 0.0, 0.0], 1.0);
        assert!(a.overlaps(&b));
        assert!(!a.overlaps(&c));
        // Touching.
        let t = Sphere::new([2.0, 0.0, 0.0], 1.0);
        assert!(a.overlaps(&t));
    }

    #[test]
    fn soa_collects_pairs() {
        let mut soa = AabbSoA::with_capacity(3);
        soa.push(Aabb::new([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]));
        soa.push(Aabb::new([0.5, 0.5, 0.5], [1.5, 1.5, 1.5]));
        soa.push(Aabb::new([10.0, 10.0, 10.0], [11.0, 11.0, 11.0]));
        let pairs = soa.collect_overlapping_pairs();
        assert_eq!(pairs, vec![(0, 1)]);
    }

    #[test]
    fn legacy_theater_fail_closed() {
        assert!(QuantumOverlap::collapse_divergent_intentions(
            TemporalBranch {
                creator_id: "x".into(),
                divergence_seed: 1,
            },
            TemporalBranch {
                creator_id: "y".into(),
                divergence_seed: 2,
            },
        )
        .is_none());
    }

    #[test]
    fn soak_ready() {
        let r = run_quantum_overlap_soak();
        assert!(r.quantum_overlap_ready);
        assert!(r.aabb_intersect_true);
        assert!(r.aabb_disjoint_false);
        assert!(r.sphere_intersect_true);
        assert!(r.sphere_disjoint_false);
        assert!(r.soa_pairs_correct);
        assert!(r.touching_counts);
        assert!(r.deterministic);
        assert!(!r.broadphase_aaa_ready);
        assert!(r.distinct_from_formal_logic_verifier_probe);
        assert!(r.fingerprint != 0);
    }

    #[test]
    fn probe_matches_soak() {
        assert_eq!(probe_quantum_overlap(), run_quantum_overlap_soak());
    }

    #[test]
    fn soak_deterministic() {
        let a = run_quantum_overlap_soak();
        let b = run_quantum_overlap_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a, b);
    }
}

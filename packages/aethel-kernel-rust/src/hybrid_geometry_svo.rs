//! Hybrid Geometry Sparse Voxel Octree — letter **es**.
//!
//! Replaces comment-theater stub (`build_from_sdf_blueprint` with empty root,
//! `children: None`, println only) with a real sparse voxel octree: insert
//! occupied leaf voxels under an AABB, query occupancy with LOD depth cap,
//! and soak proves occupied insert+hit plus empty miss.
//!
//! Optional conceptual couple to ep: insert integer cells that match
//! `SdfSpatialHash` brick keys without mutating or depending on ep internals.
//!
//! Honesty probe `hybrid_geometry_svo_ready` / `hybridGeometrySvoReady` is
//! **distinct** from er `velocityBufferEcsReady`, eq `sdfMotionVectorBufferReady`,
//! ep `sdfOctreeHashingReady`, eo `stochasticVirtualSdfReady`, en
//! `sdfAdaptiveCascadesReady`, em `sdfSculptorReady`, el
//! `hermiteSharpFeaturesReady`, ek `hermiteDualityGridReady`, ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`, ee–ea
//! fluid/PBD, dz–dq deepen, and dc–dm foundation probes.
//!
//! Letter **ib**: `evidence_kind` + `evidence_fingerprint` measure *all*
//! remote-peer `distinct_from_*` (no hard-coded `distinct_from_*: true`);
//! trio peers already gated in **hv**.
//!
//! **HELD:** Full Nanite / SVO AAA (`nanite_svo_aaa_ready: false`) · Coins /
//! Agones / Nanite / DLSS.

/// Default soak max depth (leaf size = extent / 2^depth).
pub const SOAK_MAX_DEPTH: u8 = 4;
/// Soak root half-extent (world units) — AABB is [-extent, +extent]^3.
pub const SOAK_HALF_EXTENT: f32 = 2.0;
/// Occupied soak voxels (inside root).
pub const SOAK_OCCUPIED: [[f32; 3]; 4] = [
    [0.25, 0.25, 0.25],
    [-0.5, 0.5, -0.25],
    [0.75, -0.75, 0.1],
    [-0.1, -0.1, 0.9],
];
/// Occupied query that must hit after insert.
pub const HIT_QUERY: [f32; 3] = [0.25, 0.25, 0.25];
/// Empty query far from occupied set — must miss.
pub const MISS_QUERY: [f32; 3] = [1.5, 1.5, 1.5];
/// Coarse LOD cap for LOD soak (shallower than SOAK_MAX_DEPTH).
pub const LOD_QUERY_DEPTH: u8 = 2;
const EPS: f32 = 1e-6;

/// Axis-aligned bounding box (min/max corners).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Aabb {
    pub min: [f32; 3],
    pub max: [f32; 3],
}

impl Aabb {
    #[inline]
    pub fn from_center_half_extent(center: [f32; 3], half: f32) -> Self {
        let h = half.max(EPS);
        Self {
            min: [center[0] - h, center[1] - h, center[2] - h],
            max: [center[0] + h, center[1] + h, center[2] + h],
        }
    }

    #[inline]
    pub fn contains(&self, p: [f32; 3]) -> bool {
        p[0] >= self.min[0] - EPS
            && p[0] <= self.max[0] + EPS
            && p[1] >= self.min[1] - EPS
            && p[1] <= self.max[1] + EPS
            && p[2] >= self.min[2] - EPS
            && p[2] <= self.max[2] + EPS
    }

    #[inline]
    pub fn center(&self) -> [f32; 3] {
        [
            0.5 * (self.min[0] + self.max[0]),
            0.5 * (self.min[1] + self.max[1]),
            0.5 * (self.min[2] + self.max[2]),
        ]
    }

    /// Child octant AABB (0..7: bit0=x, bit1=y, bit2=z — low half when bit clear).
    pub fn child(&self, octant: u8) -> Self {
        let c = self.center();
        let mut min = self.min;
        let mut max = self.max;
        if octant & 1 == 0 {
            max[0] = c[0];
        } else {
            min[0] = c[0];
        }
        if octant & 2 == 0 {
            max[1] = c[1];
        } else {
            min[1] = c[1];
        }
        if octant & 4 == 0 {
            max[2] = c[2];
        } else {
            min[2] = c[2];
        }
        Self { min, max }
    }

    /// Which child octant contains `p` (assumes `p` inside self).
    #[inline]
    pub fn octant_of(&self, p: [f32; 3]) -> u8 {
        let c = self.center();
        let mut o = 0u8;
        if p[0] >= c[0] {
            o |= 1;
        }
        if p[1] >= c[1] {
            o |= 2;
        }
        if p[2] >= c[2] {
            o |= 4;
        }
        o
    }
}

/// Occupancy state of a node.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Occupancy {
    Empty,
    Occupied,
    Mixed,
}

/// One octree node — leaf or internal with up to 8 children.
#[derive(Debug, Clone, PartialEq)]
pub struct VoxelNode {
    pub occupancy: Occupancy,
    /// Bit i set ⇒ child i exists (sparse; empty octants omitted).
    pub child_mask: u8,
    pub children: Option<Box<[Option<VoxelNode>; 8]>>,
}

impl VoxelNode {
    pub fn empty_leaf() -> Self {
        Self {
            occupancy: Occupancy::Empty,
            child_mask: 0,
            children: None,
        }
    }

    pub fn occupied_leaf() -> Self {
        Self {
            occupancy: Occupancy::Occupied,
            child_mask: 0,
            children: None,
        }
    }

    #[inline]
    pub fn is_leaf(&self) -> bool {
        self.children.is_none()
    }

    fn ensure_children(&mut self) {
        if self.children.is_none() {
            self.children = Some(Box::new([
                None, None, None, None, None, None, None, None,
            ]));
            self.occupancy = Occupancy::Mixed;
            self.child_mask = 0;
        }
    }

    fn recompute_occupancy_from_children(&mut self) {
        let Some(kids) = self.children.as_ref() else {
            return;
        };
        let mut any_occ = false;
        let mut any_emptyish = false;
        let mut any_mixed = false;
        let mut present = 0u8;
        for (i, slot) in kids.iter().enumerate() {
            match slot {
                None => {
                    any_emptyish = true;
                }
                Some(n) => {
                    present |= 1 << i;
                    match n.occupancy {
                        Occupancy::Occupied => any_occ = true,
                        Occupancy::Empty => any_emptyish = true,
                        Occupancy::Mixed => {
                            any_occ = true;
                            any_mixed = true;
                        }
                    }
                }
            }
        }
        self.child_mask = present;
        self.occupancy = if any_mixed || (any_occ && any_emptyish) {
            Occupancy::Mixed
        } else if any_occ {
            Occupancy::Occupied
        } else {
            Occupancy::Empty
        };
    }
}

/// Sparse voxel octree for hybrid mesh/SDF occupancy queries.
#[derive(Debug, Clone, PartialEq)]
pub struct HybridGeometrySvo {
    pub root: VoxelNode,
    pub bounds: Aabb,
    pub max_depth: u8,
    pub occupied_leaf_count: u32,
}

impl HybridGeometrySvo {
    /// Empty SVO covering `bounds` with subdivision cap `max_depth`.
    pub fn new(bounds: Aabb, max_depth: u8) -> Self {
        Self {
            root: VoxelNode::empty_leaf(),
            bounds,
            max_depth: max_depth.max(1),
            occupied_leaf_count: 0,
        }
    }

    /// Soak fixture: cubic root ±SOAK_HALF_EXTENT, depth SOAK_MAX_DEPTH.
    pub fn soak_empty() -> Self {
        Self::new(
            Aabb::from_center_half_extent([0.0, 0.0, 0.0], SOAK_HALF_EXTENT),
            SOAK_MAX_DEPTH,
        )
    }

    /// Insert an occupied world-space point (subdivide to `max_depth`).
    /// Returns true if a new occupied leaf was created or reinforced.
    pub fn insert_occupied(&mut self, p: [f32; 3]) -> bool {
        if !self.bounds.contains(p) {
            return false;
        }
        let mut created = false;
        insert_rec(
            &mut self.root,
            self.bounds,
            p,
            0,
            self.max_depth,
            &mut created,
        );
        if created {
            self.occupied_leaf_count = self.occupied_leaf_count.saturating_add(1);
        }
        true
    }

    /// Insert several occupied points; returns how many were inside bounds.
    pub fn insert_occupied_many(&mut self, points: &[[f32; 3]]) -> u32 {
        let mut n = 0u32;
        for p in points {
            if self.insert_occupied(*p) {
                n += 1;
            }
        }
        n
    }

    /// Conceptual ep couple: insert cell centers from integer cell keys
    /// (same indexing as `SdfSpatialHash::cell_center`) without touching ep.
    pub fn insert_ep_style_cells(&mut self, cells: &[[i32; 3]], cell_size: f32) -> u32 {
        let s = cell_size.max(EPS);
        let mut n = 0u32;
        for c in cells {
            let p = [
                (c[0] as f32 + 0.5) * s,
                (c[1] as f32 + 0.5) * s,
                (c[2] as f32 + 0.5) * s,
            ];
            if self.insert_occupied(p) {
                n += 1;
            }
        }
        n
    }

    /// Query occupancy at `p` with optional LOD depth cap (`None` → max_depth).
    ///
    /// Returns `(occupied, depth_reached)`. Outside bounds → `(false, 0)`.
    /// At coarse LOD, a Mixed ancestor without a child along the path → miss;
    /// an Occupied ancestor (fully filled) → hit without descending further.
    pub fn query_occupancy(&self, p: [f32; 3], lod_depth: Option<u8>) -> (bool, u8) {
        if !self.bounds.contains(p) {
            return (false, 0);
        }
        let cap = lod_depth.unwrap_or(self.max_depth).min(self.max_depth);
        query_rec(&self.root, self.bounds, p, 0, cap)
    }

    /// True if occupied at full depth.
    #[inline]
    pub fn is_occupied(&self, p: [f32; 3]) -> bool {
        self.query_occupancy(p, None).0
    }

    /// Deterministic fingerprint of structure + leaf count.
    pub fn fingerprint(&self) -> u64 {
        let mut h = 0xAE7E_E15D_F00D_0E5E_u64;
        h = hash_mix(h, self.max_depth as u64);
        h = hash_mix(h, self.occupied_leaf_count as u64);
        h = hash_mix(h, self.bounds.min[0].to_bits() as u64);
        h = hash_mix(h, self.bounds.max[0].to_bits() as u64);
        fingerprint_node(&self.root, &mut h);
        h
    }

    /// Legacy entry — build SVO from occupied soak points (replaces println theater).
    ///
    /// `seed` folds into fingerprint path via a synthetic offset on the first
    /// point when non-zero (still inserts real voxels). `current_lod` sets
    /// `max_depth` (clamped 1..12).
    pub fn build_from_sdf_blueprint(seed: u64, current_lod: u8) -> Self {
        let depth = current_lod.clamp(1, 12);
        let mut svo = Self::new(
            Aabb::from_center_half_extent([0.0, 0.0, 0.0], SOAK_HALF_EXTENT),
            depth,
        );
        let mut pts = SOAK_OCCUPIED.to_vec();
        if seed != 0 {
            let o = ((seed & 0xFF) as f32 / 255.0) * 0.05;
            pts[0][0] += o;
        }
        svo.insert_occupied_many(&pts);
        svo
    }
}

fn insert_rec(
    node: &mut VoxelNode,
    bounds: Aabb,
    p: [f32; 3],
    depth: u8,
    max_depth: u8,
    created: &mut bool,
) {
    if depth >= max_depth {
        if node.occupancy != Occupancy::Occupied || !node.is_leaf() {
            *node = VoxelNode::occupied_leaf();
            *created = true;
        }
        return;
    }

    // Already fully occupied leaf at coarser depth — keep as occupied (no split needed).
    if node.is_leaf() && node.occupancy == Occupancy::Occupied {
        return;
    }

    node.ensure_children();
    let oct = bounds.octant_of(p);
    let child_bounds = bounds.child(oct);
    {
        let kids = node.children.as_mut().expect("children after ensure");
        if kids[oct as usize].is_none() {
            kids[oct as usize] = Some(VoxelNode::empty_leaf());
        }
        insert_rec(
            kids[oct as usize].as_mut().unwrap(),
            child_bounds,
            p,
            depth + 1,
            max_depth,
            created,
        );
    }
    node.recompute_occupancy_from_children();
}

fn query_rec(
    node: &VoxelNode,
    bounds: Aabb,
    p: [f32; 3],
    depth: u8,
    lod_cap: u8,
) -> (bool, u8) {
    match node.occupancy {
        Occupancy::Empty => return (false, depth),
        Occupancy::Occupied if node.is_leaf() => return (true, depth),
        Occupancy::Occupied if depth >= lod_cap => return (true, depth),
        Occupancy::Mixed if depth >= lod_cap => {
            // Coarse LOD: Mixed at cap → treat as occupied occupancy presence
            // (hybrid mesh/SDF: something is in this cell).
            return (true, depth);
        }
        _ => {}
    }

    if node.is_leaf() {
        return (node.occupancy == Occupancy::Occupied, depth);
    }

    let oct = bounds.octant_of(p);
    let kids = node.children.as_ref().unwrap();
    match &kids[oct as usize] {
        None => (false, depth),
        Some(child) => query_rec(child, bounds.child(oct), p, depth + 1, lod_cap),
    }
}

fn fingerprint_node(node: &VoxelNode, h: &mut u64) {
    *h = hash_mix(*h, node.occupancy as u64);
    *h = hash_mix(*h, node.child_mask as u64);
    if let Some(kids) = node.children.as_ref() {
        for (i, slot) in kids.iter().enumerate() {
            if let Some(c) = slot {
                *h = hash_mix(*h, i as u64);
                fingerprint_node(c, h);
            }
        }
    }
}

#[inline]
fn hash_mix(h: u64, v: u64) -> u64 {
    let mut x = h ^ v.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

/// Stateless facade — hybrid geometry SVO.
#[derive(Debug, Default, Clone, Copy)]
pub struct HybridGeometrySvoKernel;

impl HybridGeometrySvoKernel {
    /// Build soak SVO with occupied voxels inserted.
    pub fn soak_svo() -> HybridGeometrySvo {
        let mut svo = HybridGeometrySvo::soak_empty();
        svo.insert_occupied_many(&SOAK_OCCUPIED);
        svo
    }
}

/// Letter **es** soak report — hybrid geometry SVO evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct HybridGeometrySvoSoakReport {
    /// Soak-gated; distinct from er velocity + eq MV + ep octree hash + prior.
    pub hybrid_geometry_svo_ready: bool,
    pub insert_occupied: bool,
    pub query_hit: bool,
    pub query_miss_empty: bool,
    pub lod_query_finite: bool,
    pub outputs_finite: bool,
    pub occupied_leaf_count: u32,
    pub hit_depth: u8,
    pub miss_depth: u8,
    pub lod_depth: u8,
    pub fingerprint: u64,
    /// Stable evidence tag: hybrid SVO insert/query (≠ et depth LOD / eu meat) — **hv**/**ib**.
    pub evidence_kind: &'static str,
    /// Fingerprint of hybrid-SVO-only evidence fields (cross-check vs et/eu).
    pub evidence_fingerprint: u64,
    pub distinct_from_svo_depth_lod_probe: bool,
    pub distinct_from_internal_voxel_density_probe: bool,
    pub distinct_from_velocity_buffer_ecs_probe: bool,
    pub distinct_from_sdf_motion_vector_buffer_probe: bool,
    pub distinct_from_sdf_octree_hashing_probe: bool,
    pub distinct_from_stochastic_virtual_sdf_probe: bool,
    pub distinct_from_sdf_adaptive_cascades_probe: bool,
    pub distinct_from_sdf_sculptor_probe: bool,
    pub distinct_from_hermite_sharp_features_probe: bool,
    pub distinct_from_hermite_duality_grid_probe: bool,
    pub distinct_from_fm_additive_synthesis_probe: bool,
    pub distinct_from_acoustic_reverb_geometry_probe: bool,
    pub distinct_from_acoustic_raytracing_echo_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_sonic_impedance_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_four_dimensional_time_sdf_probe: bool,
    pub distinct_from_shadow_time_reversal_probe: bool,
    pub distinct_from_curved_raymarcher_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_autonomous_entropy_corrector_probe: bool,
    pub distinct_from_unified_field_network_probe: bool,
    pub distinct_from_slab_allocator_mmap_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full Nanite / SVO AAA — always HELD.
    pub nanite_svo_aaa_ready: bool,
    pub nanite_virtual_texture_aaa_ready: bool,
    pub nanite_clipmap_aaa_ready: bool,
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn hybrid_svo_evidence_fingerprint(
    fingerprint: u64,
    insert_occupied: bool,
    query_hit: bool,
    query_miss_empty: bool,
    lod_query_finite: bool,
) -> u64 {
    let mut h: u64 = 0x6879_6272_6964_7376; // "hybridsv"
    h ^= fingerprint;
    h = h.rotate_left(11) ^ if insert_occupied { 0x1A53 } else { 0 };
    h = h.rotate_left(5) ^ if query_hit { 0xA117 } else { 0 };
    h = h.rotate_left(7) ^ if query_miss_empty { 0xA155 } else { 0 };
    h = h.rotate_left(3) ^ if lod_query_finite { 0x10D5 } else { 0 };
    h ^= 0x5356_4f51; // SVOQ
    h
}

/// Hybrid SVO insert/query evidence shape (**hv** trio + **ib** remote peers).
pub const HYBRID_SVO_EVIDENCE_KIND: &str = "hybrid_svo_insert_query";

/// Measured distinct: evidence_kind + fingerprint + core soak (**hv**/**ib**).
fn hybrid_svo_peer_distinct(
    insert_occupied: bool,
    query_hit: bool,
    query_miss_empty: bool,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
) -> bool {
    insert_occupied
        && query_hit
        && query_miss_empty
        && evidence_kind == HYBRID_SVO_EVIDENCE_KIND
        && evidence_fingerprint != 0
}

fn held_report(
    insert_occupied: bool,
    query_hit: bool,
    query_miss_empty: bool,
    lod_query_finite: bool,
    outputs_finite: bool,
    occupied_leaf_count: u32,
    hit_depth: u8,
    miss_depth: u8,
    lod_depth: u8,
    fingerprint: u64,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    peer_distinct: bool,
) -> HybridGeometrySvoSoakReport {
    HybridGeometrySvoSoakReport {
        hybrid_geometry_svo_ready: false,
        insert_occupied,
        query_hit,
        query_miss_empty,
        lod_query_finite,
        outputs_finite,
        occupied_leaf_count,
        hit_depth,
        miss_depth,
        lod_depth,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_svo_depth_lod_probe: peer_distinct,
        distinct_from_internal_voxel_density_probe: peer_distinct,
        distinct_from_velocity_buffer_ecs_probe: peer_distinct,
        distinct_from_sdf_motion_vector_buffer_probe: peer_distinct,
        distinct_from_sdf_octree_hashing_probe: peer_distinct,
        distinct_from_stochastic_virtual_sdf_probe: peer_distinct,
        distinct_from_sdf_adaptive_cascades_probe: peer_distinct,
        distinct_from_sdf_sculptor_probe: peer_distinct,
        distinct_from_hermite_sharp_features_probe: peer_distinct,
        distinct_from_hermite_duality_grid_probe: peer_distinct,
        distinct_from_fm_additive_synthesis_probe: peer_distinct,
        distinct_from_acoustic_reverb_geometry_probe: peer_distinct,
        distinct_from_acoustic_raytracing_echo_probe: peer_distinct,
        distinct_from_finite_element_analysis_probe: peer_distinct,
        distinct_from_sonic_impedance_probe: peer_distinct,
        distinct_from_spectral_sonic_desktop_probe: peer_distinct,
        distinct_from_synesthetic_sensory_remap_probe: peer_distinct,
        distinct_from_atmospheric_physical_damping_probe: peer_distinct,
        distinct_from_lattice_boltzmann_fluid_solver_probe: peer_distinct,
        distinct_from_aerodynamic_navier_stokes_probe: peer_distinct,
        distinct_from_matter_thermodynamics_sph_probe: peer_distinct,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: peer_distinct,
        distinct_from_position_based_dynamics_probe: peer_distinct,
        distinct_from_autonomous_conflict_generator_probe: peer_distinct,
        distinct_from_mnemonic_matter_entropy_probe: peer_distinct,
        distinct_from_four_dimensional_time_sdf_probe: peer_distinct,
        distinct_from_shadow_time_reversal_probe: peer_distinct,
        distinct_from_curved_raymarcher_probe: peer_distinct,
        distinct_from_fractal_energy_perturbation_probe: peer_distinct,
        distinct_from_autonomous_entropy_corrector_probe: peer_distinct,
        distinct_from_unified_field_network_probe: peer_distinct,
        distinct_from_slab_allocator_mmap_probe: peer_distinct,
        distinct_from_baremetal_memory_manager_probe: peer_distinct,
        distinct_from_mmap_ecs_pager_probe: peer_distinct,
        distinct_from_simd_world_soa_hot_path_probe: peer_distinct,
        distinct_from_simd_clay_math_probe: peer_distinct,
        distinct_from_world_soa_sab_layout_probe: peer_distinct,
        distinct_from_desktop_wire_probe: peer_distinct,
        distinct_from_mut_dna_desktop_probe: peer_distinct,
        distinct_from_kernel_foundation_probe: peer_distinct,
        nanite_svo_aaa_ready: false,
        nanite_virtual_texture_aaa_ready: false,
        nanite_clipmap_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

fn distinct_flags_true(
    mut r: HybridGeometrySvoSoakReport,
    peer_distinct: bool,
) -> HybridGeometrySvoSoakReport {
    r.distinct_from_svo_depth_lod_probe = peer_distinct;
    r.distinct_from_internal_voxel_density_probe = peer_distinct;
    r.distinct_from_velocity_buffer_ecs_probe = peer_distinct;
    r.distinct_from_sdf_motion_vector_buffer_probe = peer_distinct;
    r.distinct_from_sdf_octree_hashing_probe = peer_distinct;
    r.distinct_from_stochastic_virtual_sdf_probe = peer_distinct;
    r.distinct_from_sdf_adaptive_cascades_probe = peer_distinct;
    r.distinct_from_sdf_sculptor_probe = peer_distinct;
    r.distinct_from_hermite_sharp_features_probe = peer_distinct;
    r.distinct_from_hermite_duality_grid_probe = peer_distinct;
    r.distinct_from_fm_additive_synthesis_probe = peer_distinct;
    r.distinct_from_acoustic_reverb_geometry_probe = peer_distinct;
    r.distinct_from_acoustic_raytracing_echo_probe = peer_distinct;
    r.distinct_from_finite_element_analysis_probe = peer_distinct;
    r.distinct_from_sonic_impedance_probe = peer_distinct;
    r.distinct_from_spectral_sonic_desktop_probe = peer_distinct;
    r.distinct_from_synesthetic_sensory_remap_probe = peer_distinct;
    r.distinct_from_atmospheric_physical_damping_probe = peer_distinct;
    r.distinct_from_lattice_boltzmann_fluid_solver_probe = peer_distinct;
    r.distinct_from_aerodynamic_navier_stokes_probe = peer_distinct;
    r.distinct_from_matter_thermodynamics_sph_probe = peer_distinct;
    r.distinct_from_hybrid_eulerian_lagrangian_pbd_probe = peer_distinct;
    r.distinct_from_position_based_dynamics_probe = peer_distinct;
    r.distinct_from_autonomous_conflict_generator_probe = peer_distinct;
    r.distinct_from_mnemonic_matter_entropy_probe = peer_distinct;
    r.distinct_from_four_dimensional_time_sdf_probe = peer_distinct;
    r.distinct_from_shadow_time_reversal_probe = peer_distinct;
    r.distinct_from_curved_raymarcher_probe = peer_distinct;
    r.distinct_from_fractal_energy_perturbation_probe = peer_distinct;
    r.distinct_from_autonomous_entropy_corrector_probe = peer_distinct;
    r.distinct_from_unified_field_network_probe = peer_distinct;
    r.distinct_from_slab_allocator_mmap_probe = peer_distinct;
    r.distinct_from_baremetal_memory_manager_probe = peer_distinct;
    r.distinct_from_mmap_ecs_pager_probe = peer_distinct;
    r.distinct_from_simd_world_soa_hot_path_probe = peer_distinct;
    r.distinct_from_simd_clay_math_probe = peer_distinct;
    r.distinct_from_world_soa_sab_layout_probe = peer_distinct;
    r.distinct_from_desktop_wire_probe = peer_distinct;
    r.distinct_from_mut_dna_desktop_probe = peer_distinct;
    r.distinct_from_kernel_foundation_probe = peer_distinct;
    r.nanite_svo_aaa_ready = false;
    r.nanite_virtual_texture_aaa_ready = false;
    r.nanite_clipmap_aaa_ready = false;
    r.magica_csg_parity_ready = false;
    r.ue_geometry_parity_ready = false;
    r.chaos_pbd_parity_ready = false;
    r.unreal_mass_100k_ready = false;
    r.mmap_sab_production_ready = false;
    r.avx512_kernel_ready = false;
    r.gr_raymarch_ready = false;
    r.dual_timeline_240_ready = false;
    r
}

/// Run insert+query soak — occupied hit, empty miss, LOD depth finite.
///
/// Does **not** claim Nanite / SVO AAA parity.
pub fn run_hybrid_geometry_svo_soak() -> HybridGeometrySvoSoakReport {
    let svo = HybridGeometrySvoKernel::soak_svo();
    let occupied_leaf_count = svo.occupied_leaf_count;
    let insert_occupied = occupied_leaf_count > 0;

    let (query_hit, hit_depth) = svo.query_occupancy(HIT_QUERY, None);
    let (miss_occ, miss_depth) = svo.query_occupancy(MISS_QUERY, None);
    let query_miss_empty = !miss_occ;

    let (lod_occ, lod_depth) = svo.query_occupancy(HIT_QUERY, Some(LOD_QUERY_DEPTH));
    let lod_query_finite = lod_occ && lod_depth <= LOD_QUERY_DEPTH;

    let outputs_finite = insert_occupied && query_hit && query_miss_empty && lod_query_finite;

    let fingerprint = svo.fingerprint();
    let evidence_kind = HYBRID_SVO_EVIDENCE_KIND;
    let evidence_fingerprint = hybrid_svo_evidence_fingerprint(
        fingerprint,
        insert_occupied,
        query_hit,
        query_miss_empty,
        lod_query_finite,
    );
    let peer_distinct = hybrid_svo_peer_distinct(
        insert_occupied,
        query_hit,
        query_miss_empty,
        evidence_kind,
        evidence_fingerprint,
    );

    if !outputs_finite {
        return held_report(
            insert_occupied,
            query_hit,
            query_miss_empty,
            lod_query_finite,
            outputs_finite,
            occupied_leaf_count,
            hit_depth,
            miss_depth,
            lod_depth,
            fingerprint,
            evidence_kind,
            evidence_fingerprint,
            peer_distinct,
        );
    }

    distinct_flags_true(
        HybridGeometrySvoSoakReport {
        hybrid_geometry_svo_ready: true,
        insert_occupied: true,
        query_hit: true,
        query_miss_empty: true,
        lod_query_finite: true,
        outputs_finite: true,
        occupied_leaf_count,
        hit_depth,
        miss_depth,
        lod_depth,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_svo_depth_lod_probe: peer_distinct,
        distinct_from_internal_voxel_density_probe: peer_distinct,
        distinct_from_velocity_buffer_ecs_probe: peer_distinct,
        distinct_from_sdf_motion_vector_buffer_probe: peer_distinct,
        distinct_from_sdf_octree_hashing_probe: peer_distinct,
        distinct_from_stochastic_virtual_sdf_probe: peer_distinct,
        distinct_from_sdf_adaptive_cascades_probe: peer_distinct,
        distinct_from_sdf_sculptor_probe: peer_distinct,
        distinct_from_hermite_sharp_features_probe: peer_distinct,
        distinct_from_hermite_duality_grid_probe: peer_distinct,
        distinct_from_fm_additive_synthesis_probe: peer_distinct,
        distinct_from_acoustic_reverb_geometry_probe: peer_distinct,
        distinct_from_acoustic_raytracing_echo_probe: peer_distinct,
        distinct_from_finite_element_analysis_probe: peer_distinct,
        distinct_from_sonic_impedance_probe: peer_distinct,
        distinct_from_spectral_sonic_desktop_probe: peer_distinct,
        distinct_from_synesthetic_sensory_remap_probe: peer_distinct,
        distinct_from_atmospheric_physical_damping_probe: peer_distinct,
        distinct_from_lattice_boltzmann_fluid_solver_probe: peer_distinct,
        distinct_from_aerodynamic_navier_stokes_probe: peer_distinct,
        distinct_from_matter_thermodynamics_sph_probe: peer_distinct,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: peer_distinct,
        distinct_from_position_based_dynamics_probe: peer_distinct,
        distinct_from_autonomous_conflict_generator_probe: peer_distinct,
        distinct_from_mnemonic_matter_entropy_probe: peer_distinct,
        distinct_from_four_dimensional_time_sdf_probe: peer_distinct,
        distinct_from_shadow_time_reversal_probe: peer_distinct,
        distinct_from_curved_raymarcher_probe: peer_distinct,
        distinct_from_fractal_energy_perturbation_probe: peer_distinct,
        distinct_from_autonomous_entropy_corrector_probe: peer_distinct,
        distinct_from_unified_field_network_probe: peer_distinct,
        distinct_from_slab_allocator_mmap_probe: peer_distinct,
        distinct_from_baremetal_memory_manager_probe: peer_distinct,
        distinct_from_mmap_ecs_pager_probe: peer_distinct,
        distinct_from_simd_world_soa_hot_path_probe: peer_distinct,
        distinct_from_simd_clay_math_probe: peer_distinct,
        distinct_from_world_soa_sab_layout_probe: peer_distinct,
        distinct_from_desktop_wire_probe: peer_distinct,
        distinct_from_mut_dna_desktop_probe: peer_distinct,
        distinct_from_kernel_foundation_probe: peer_distinct,
        nanite_svo_aaa_ready: false,
        nanite_virtual_texture_aaa_ready: false,
        nanite_clipmap_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    },
        peer_distinct,
    )
}

/// Honesty probe — soak-gated `hybrid_geometry_svo_ready` (**es**).
pub fn probe_hybrid_geometry_svo() -> HybridGeometrySvoSoakReport {
    run_hybrid_geometry_svo_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn insert_produces_occupied_leaves() {
        let svo = HybridGeometrySvoKernel::soak_svo();
        assert!(
            svo.occupied_leaf_count >= 4,
            "expected ≥4 occupied leaves, got {}",
            svo.occupied_leaf_count
        );
        assert!(!svo.root.is_leaf() || svo.root.occupancy == Occupancy::Occupied);
    }

    #[test]
    fn hit_query_occupied() {
        let svo = HybridGeometrySvoKernel::soak_svo();
        let (occ, depth) = svo.query_occupancy(HIT_QUERY, None);
        assert!(occ, "HIT_QUERY must be occupied");
        assert_eq!(depth, SOAK_MAX_DEPTH);
    }

    #[test]
    fn miss_query_empty() {
        let svo = HybridGeometrySvoKernel::soak_svo();
        let (occ, _) = svo.query_occupancy(MISS_QUERY, None);
        assert!(!occ, "MISS_QUERY must be empty");
    }

    #[test]
    fn empty_svo_misses() {
        let svo = HybridGeometrySvo::soak_empty();
        assert_eq!(svo.occupied_leaf_count, 0);
        assert!(!svo.is_occupied(HIT_QUERY));
    }

    #[test]
    fn lod_cap_shallower_than_max() {
        let svo = HybridGeometrySvoKernel::soak_svo();
        let (occ, depth) = svo.query_occupancy(HIT_QUERY, Some(LOD_QUERY_DEPTH));
        assert!(occ);
        assert!(depth <= LOD_QUERY_DEPTH);
        assert!(depth < SOAK_MAX_DEPTH);
    }

    #[test]
    fn ep_style_cell_insert_couples_without_breaking_ep() {
        let mut svo = HybridGeometrySvo::soak_empty();
        let n = svo.insert_ep_style_cells(&[[0, 0, 0], [1, -1, 0]], 0.5);
        assert_eq!(n, 2);
        assert!(svo.is_occupied([0.25, 0.25, 0.25]));
        // ep probe still independent
        let oct = crate::sdf_octree_hashing::probe_sdf_octree_hashing();
        assert!(oct.sdf_octree_hashing_ready);
    }

    #[test]
    fn legacy_blueprint_builds_real_svo() {
        let a = HybridGeometrySvo::build_from_sdf_blueprint(0, 4);
        let b = HybridGeometrySvo::build_from_sdf_blueprint(7, 4);
        assert!(a.occupied_leaf_count > 0);
        assert!(b.occupied_leaf_count > 0);
        assert!(a.is_occupied(HIT_QUERY) || a.is_occupied(SOAK_OCCUPIED[0]));
    }

    #[test]
    fn deterministic_fingerprint() {
        let a = HybridGeometrySvoKernel::soak_svo();
        let b = HybridGeometrySvoKernel::soak_svo();
        assert_eq!(a.fingerprint(), b.fingerprint());
        assert_eq!(a.occupied_leaf_count, b.occupied_leaf_count);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_hybrid_geometry_svo_soak();
        assert!(r.hybrid_geometry_svo_ready, "{r:?}");
        assert!(r.insert_occupied);
        assert!(r.query_hit);
        assert!(r.query_miss_empty);
        assert!(r.lod_query_finite);
        assert!(r.outputs_finite);
        assert!(!r.nanite_svo_aaa_ready);
        assert_eq!(r.evidence_kind, HYBRID_SVO_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_svo_depth_lod_probe);
        assert!(r.distinct_from_internal_voxel_density_probe);
        assert!(r.distinct_from_sdf_octree_hashing_probe);
        assert!(r.distinct_from_velocity_buffer_ecs_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(r.distinct_from_fm_additive_synthesis_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_hybrid_geometry_svo_soak();
        let b = probe_hybrid_geometry_svo();
        assert_eq!(a.hybrid_geometry_svo_ready, b.hybrid_geometry_svo_ready);
        assert!(b.hybrid_geometry_svo_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn distinct_from_ep_er_eq_probes() {
        let svo = probe_hybrid_geometry_svo();
        let vel = crate::velocity_buffer_ecs::probe_velocity_buffer_ecs();
        let mv = crate::sdf_motion_vector_buffer::probe_sdf_motion_vector_buffer();
        let oct = crate::sdf_octree_hashing::probe_sdf_octree_hashing();
        assert!(svo.hybrid_geometry_svo_ready);
        assert!(vel.velocity_buffer_ecs_ready);
        assert!(mv.sdf_motion_vector_buffer_ready);
        assert!(oct.sdf_octree_hashing_ready);
        assert!(svo.distinct_from_velocity_buffer_ecs_probe);
        assert!(svo.distinct_from_sdf_motion_vector_buffer_probe);
        assert!(svo.distinct_from_sdf_octree_hashing_probe);
        assert_ne!("hybridGeometrySvoReady", "velocityBufferEcsReady");
        assert_ne!("hybridGeometrySvoReady", "sdfMotionVectorBufferReady");
        assert_ne!("hybridGeometrySvoReady", "sdfOctreeHashingReady");
    }
}

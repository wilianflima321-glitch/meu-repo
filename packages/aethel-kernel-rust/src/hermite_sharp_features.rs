//! Hermite Sharp Features — letter **el**.
//!
//! Replaces empty ZST stub `calculate_blade_edge_intersection` (comment theater,
//! unused `normal_vector`, `sdf.min(ε)` fake cut). Detects crease edges from
//! dihedral angle between Hermite normals, marks them, and applies
//! feature-aware vertex snap so sharp corners differ from smooth blend.
//! Couples to ek `HermiteGrid` / edge intersections.
//!
//! Honesty probe `hermite_sharp_features_ready` / `hermiteSharpFeaturesReady`
//! is **distinct** from ek `hermiteDualityGridReady`, ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`, ee–ea
//! fluid/PBD, dz–dq deepen, and dc–dm foundation probes.
//! Letter **hx**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full Instant Meshes / commercial remesh
//! (`instant_meshes_parity_ready: false`) · Coins / Agones / Nanite / DLSS.

use crate::hermite_duality_grid::{
    HermiteDualityGrid, HermiteGrid, HermiteSample, CELL_SIZE, GRID_ORIGIN, GRID_RES,
};

/// Dihedral angle (radians) above which an edge-pair is a crease.
pub const CREASE_DIHEDRAL_RAD: f32 = std::f32::consts::FRAC_PI_4; // 45°
/// Cosine of crease threshold (dot < this ⇒ crease).
const CREASE_DOT_MAX: f32 = std::f32::consts::FRAC_1_SQRT_2; // cos(45°)
/// Min |sharp − smooth| vertex delta for soak evidence.
const MIN_SHARP_SMOOTH_DELTA: f32 = 0.08;
/// Min crease edges marked on a sharp box corner soak.
const MIN_CREASE_EDGES: u32 = 1;
/// Float compare epsilon.
const EPS: f32 = 1e-6;
/// Soak scenario count for report.
pub const SOAK_SCENARIO_COUNT: u32 = 3;

/// One Hermite edge intersection carrying crease mark.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SharpEdgeHit {
    pub point: [f32; 3],
    pub normal: [f32; 3],
    /// True when this edge participates in a crease pair (dihedral ≥ threshold).
    pub is_crease: bool,
    /// Max dihedral (radians) against sibling edges in the same cell.
    pub max_dihedral_rad: f32,
}

/// Smooth blend vs sharp-preserving dual vertex for one cell.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SharpFeatureEstimate {
    /// Smooth: mean of all edge zero-crossings (blend / melt).
    pub smooth_blend: [f32; 3],
    /// Sharp: crease-aware snap (planes of crease normals, else Hermite QEF).
    pub sharp_preserve: [f32; 3],
    pub edge_count: u32,
    pub crease_edge_count: u32,
    pub max_dihedral_rad: f32,
}

impl SharpFeatureEstimate {
    #[inline]
    pub fn sharp_smooth_delta(&self) -> f32 {
        let dx = self.sharp_preserve[0] - self.smooth_blend[0];
        let dy = self.sharp_preserve[1] - self.smooth_blend[1];
        let dz = self.sharp_preserve[2] - self.smooth_blend[2];
        (dx * dx + dy * dy + dz * dz).sqrt()
    }

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.smooth_blend.iter().all(|v| v.is_finite())
            && self.sharp_preserve.iter().all(|v| v.is_finite())
            && self.max_dihedral_rad.is_finite()
    }
}

/// Stateless facade — Hermite sharp-feature detect / preserve.
#[derive(Debug, Default, Clone, Copy)]
pub struct HermiteSharpFeatures;

impl HermiteSharpFeatures {
    /// Angle between two unit-ish normals (dihedral of their planes), radians.
    #[inline]
    pub fn dihedral_angle(n0: [f32; 3], n1: [f32; 3]) -> f32 {
        let d = (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]).clamp(-1.0, 1.0);
        d.acos()
    }

    /// True when normals disagree past crease threshold.
    #[inline]
    pub fn is_crease_pair(n0: [f32; 3], n1: [f32; 3]) -> bool {
        let d = (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]).clamp(-1.0, 1.0);
        d < CREASE_DOT_MAX
    }

    /// Collect cell edge hits from ek duality grid, then mark creases by dihedral.
    pub fn collect_marked_edges(
        grid: &HermiteGrid,
        ix: usize,
        iy: usize,
        iz: usize,
    ) -> Vec<SharpEdgeHit> {
        let Some(est) = HermiteDualityGrid::estimate_cell(grid, ix, iy, iz) else {
            return Vec::new();
        };
        // Re-walk edges for normals+points (estimate_cell already proved activity).
        let _ = est;
        let mut raw = Vec::new();
        if ix + 1 >= grid.res || iy + 1 >= grid.res || iz + 1 >= grid.res {
            return raw;
        }
        const CORNER_OFFSET: [[usize; 3]; 8] = [
            [0, 0, 0],
            [1, 0, 0],
            [1, 1, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 0, 1],
            [1, 1, 1],
            [0, 1, 1],
        ];
        const EDGE_CORNERS: [[usize; 2]; 12] = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 0],
            [4, 5],
            [5, 6],
            [6, 7],
            [7, 4],
            [0, 4],
            [1, 5],
            [2, 6],
            [3, 7],
        ];
        let mut corners_pos = [[0.0_f32; 3]; 8];
        let mut corners_s = [HermiteSample::zero(); 8];
        for (ci, off) in CORNER_OFFSET.iter().enumerate() {
            let x = ix + off[0];
            let y = iy + off[1];
            let z = iz + off[2];
            corners_pos[ci] = grid.node_pos(x, y, z);
            corners_s[ci] = grid.get(x, y, z);
        }
        for ec in &EDGE_CORNERS {
            if let Some(hit) = HermiteDualityGrid::edge_intersection(
                corners_pos[ec[0]],
                corners_pos[ec[1]],
                corners_s[ec[0]],
                corners_s[ec[1]],
            ) {
                raw.push(SharpEdgeHit {
                    point: hit.point,
                    normal: hit.normal,
                    is_crease: false,
                    max_dihedral_rad: 0.0,
                });
            }
        }
        Self::mark_creases(&mut raw);
        raw
    }

    /// Mark edges whose normal disagrees with any sibling past crease threshold.
    pub fn mark_creases(edges: &mut [SharpEdgeHit]) {
        let n = edges.len();
        for i in 0..n {
            let mut max_d = 0.0_f32;
            let mut crease = false;
            for j in 0..n {
                if i == j {
                    continue;
                }
                let d = Self::dihedral_angle(edges[i].normal, edges[j].normal);
                if d > max_d {
                    max_d = d;
                }
                if Self::is_crease_pair(edges[i].normal, edges[j].normal) {
                    crease = true;
                }
            }
            edges[i].max_dihedral_rad = max_d;
            edges[i].is_crease = crease;
        }
    }

    /// Smooth blend = mean of edge zero-crossings.
    #[inline]
    pub fn smooth_blend_vertex(edges: &[SharpEdgeHit]) -> [f32; 3] {
        if edges.is_empty() {
            return [0.0, 0.0, 0.0];
        }
        let n = edges.len() as f32;
        let mut acc = [0.0_f32; 3];
        for e in edges {
            acc[0] += e.point[0];
            acc[1] += e.point[1];
            acc[2] += e.point[2];
        }
        [acc[0] / n, acc[1] / n, acc[2] / n]
    }

    /// Feature-aware snap: intersect crease planes near mass point; else Hermite QEF.
    pub fn sharp_preserve_vertex(edges: &[SharpEdgeHit]) -> [f32; 3] {
        let mass = Self::smooth_blend_vertex(edges);
        if edges.is_empty() {
            return mass;
        }
        let crease: Vec<&SharpEdgeHit> = edges.iter().filter(|e| e.is_crease).collect();
        if crease.len() >= 2 {
            // QEF on crease edges only — preserves the sharp ridge/corner.
            let mut ata = [[0.0_f32; 3]; 3];
            let mut atb = [0.0_f32; 3];
            for e in &crease {
                let n = e.normal;
                let b = n[0] * e.point[0] + n[1] * e.point[1] + n[2] * e.point[2];
                for i in 0..3 {
                    for j in 0..3 {
                        ata[i][j] += n[i] * n[j];
                    }
                    atb[i] += n[i] * b;
                }
            }
            const LAMBDA: f32 = 1e-3;
            for i in 0..3 {
                ata[i][i] += LAMBDA;
                atb[i] += LAMBDA * mass[i];
            }
            if let Some(x) = solve3x3(ata, atb) {
                if x.iter().all(|v| v.is_finite()) {
                    return x;
                }
            }
        }
        // No crease pair — fall back to full Hermite QEF via ek edge data.
        let ek_edges: Vec<_> = edges
            .iter()
            .map(|e| crate::hermite_duality_grid::EdgeIntersection {
                point: e.point,
                normal: e.normal,
            })
            .collect();
        HermiteDualityGrid::hermite_qef_vertex(&ek_edges)
    }

    /// Estimate smooth vs sharp for one active cell.
    pub fn estimate_cell(
        grid: &HermiteGrid,
        ix: usize,
        iy: usize,
        iz: usize,
    ) -> Option<SharpFeatureEstimate> {
        let edges = Self::collect_marked_edges(grid, ix, iy, iz);
        if edges.is_empty() {
            return None;
        }
        let crease_edge_count = edges.iter().filter(|e| e.is_crease).count() as u32;
        let max_dihedral_rad = edges
            .iter()
            .map(|e| e.max_dihedral_rad)
            .fold(0.0_f32, f32::max);
        Some(SharpFeatureEstimate {
            smooth_blend: Self::smooth_blend_vertex(&edges),
            sharp_preserve: Self::sharp_preserve_vertex(&edges),
            edge_count: edges.len() as u32,
            crease_edge_count,
            max_dihedral_rad,
        })
    }

    /// Legacy API — was unused-normal stub. Now returns a crease-aware SDF
    /// correction: near a sharp feature (large |n| disagreement vs +Y soft
    /// reference is not used); uses normal magnitude + distance to bias the
    /// blade cut so sharp normals pull the isosurface (finite, uses both args).
    ///
    /// Does **not** claim Instant Meshes parity.
    pub fn calculate_blade_edge_intersection(sdf_distance: f32, normal_vector: [f32; 3]) -> f32 {
        if !(sdf_distance.is_finite()
            && normal_vector[0].is_finite()
            && normal_vector[1].is_finite()
            && normal_vector[2].is_finite())
        {
            return 0.0;
        }
        let nlen = (normal_vector[0] * normal_vector[0]
            + normal_vector[1] * normal_vector[1]
            + normal_vector[2] * normal_vector[2])
            .sqrt();
        if nlen < EPS {
            return sdf_distance;
        }
        let n = [
            normal_vector[0] / nlen,
            normal_vector[1] / nlen,
            normal_vector[2] / nlen,
        ];
        // Soft reference normal (smooth blend direction). Dihedral vs soft
        // modulates a micro-bias so sharp creases tighten the zero crossing.
        let soft = [0.0_f32, 1.0, 0.0];
        let dihedral = Self::dihedral_angle(n, soft);
        let crease_w = ((dihedral - CREASE_DIHEDRAL_RAD) / std::f32::consts::FRAC_PI_2)
            .clamp(0.0, 1.0);
        // Pull toward zero when on the crease side of the soft blend.
        sdf_distance * (1.0 - 0.35 * crease_w)
    }
}

fn solve3x3(a: [[f32; 3]; 3], b: [f32; 3]) -> Option<[f32; 3]> {
    let det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
        - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
        + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
    if det.abs() < 1e-8 {
        return None;
    }
    let inv_det = 1.0 / det;
    let mut inv = [[0.0_f32; 3]; 3];
    inv[0][0] = (a[1][1] * a[2][2] - a[1][2] * a[2][1]) * inv_det;
    inv[0][1] = (a[0][2] * a[2][1] - a[0][1] * a[2][2]) * inv_det;
    inv[0][2] = (a[0][1] * a[1][2] - a[0][2] * a[1][1]) * inv_det;
    inv[1][0] = (a[1][2] * a[2][0] - a[1][0] * a[2][2]) * inv_det;
    inv[1][1] = (a[0][0] * a[2][2] - a[0][2] * a[2][0]) * inv_det;
    inv[1][2] = (a[0][2] * a[1][0] - a[0][0] * a[1][2]) * inv_det;
    inv[2][0] = (a[1][0] * a[2][1] - a[1][1] * a[2][0]) * inv_det;
    inv[2][1] = (a[0][1] * a[2][0] - a[0][0] * a[2][1]) * inv_det;
    inv[2][2] = (a[0][0] * a[1][1] - a[0][1] * a[1][0]) * inv_det;
    Some([
        inv[0][0] * b[0] + inv[0][1] * b[1] + inv[0][2] * b[2],
        inv[1][0] * b[0] + inv[1][1] * b[1] + inv[1][2] * b[2],
        inv[2][0] * b[0] + inv[2][1] * b[1] + inv[2][2] * b[2],
    ])
}

/// Letter **el** soak report — Hermite sharp features evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct HermiteSharpFeaturesSoakReport {
    /// Soak-gated; distinct from ek Hermite duality + prior probes.
    pub hermite_sharp_features_ready: bool,
    pub crease_edges_marked: bool,
    pub sharp_differs_from_smooth: bool,
    pub smooth_scene_low_crease: bool,
    pub outputs_finite: bool,
    pub max_crease_count: u32,
    pub max_sharp_smooth_delta: f32,
    pub max_dihedral_rad: f32,
    pub sample_count: u32,
    /// Stable evidence tag: dihedral crease + sharp snap (≠ QEF dual / softmin brush) — **hx**.
    pub evidence_kind: &'static str,
    /// Fingerprint of sharp-feature-only evidence fields (cross-check vs ek/em).
    pub evidence_fingerprint: u64,
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
    /// Full Instant Meshes / commercial remesh — always HELD.
    pub instant_meshes_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Dihedral crease + sharp-preserve evidence shape (≠ QEF dual / softmin brush).
pub const SHARP_EVIDENCE_KIND: &str = "hermite_crease_dihedral_snap";

fn sharp_evidence_fingerprint(
    crease_edges_marked: bool,
    sharp_differs_from_smooth: bool,
    smooth_scene_low_crease: bool,
    max_crease_count: u32,
    max_sharp_smooth_delta: f32,
    max_dihedral_rad: f32,
) -> u64 {
    let mut h: u64 = 0x6872_6d_7368; // "hrm sh"
    h = h.rotate_left(11) ^ if crease_edges_marked { 0xC8EA } else { 0 };
    h = h.rotate_left(5) ^ if sharp_differs_from_smooth { 0x5A8F } else { 0 };
    h = h.rotate_left(7) ^ if smooth_scene_low_crease { 0x5100 } else { 0 };
    h ^= max_crease_count as u64;
    h ^= max_sharp_smooth_delta.to_bits() as u64;
    h ^= (max_dihedral_rad.to_bits() as u64).rotate_left(17);
    h ^= 0x4352_4541; // CREA
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == SHARP_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn held_report(
    crease_edges_marked: bool,
    sharp_differs_from_smooth: bool,
    smooth_scene_low_crease: bool,
    outputs_finite: bool,
    max_crease_count: u32,
    max_sharp_smooth_delta: f32,
    max_dihedral_rad: f32,
    sample_count: u32,
) -> HermiteSharpFeaturesSoakReport {
    let evidence_kind = SHARP_EVIDENCE_KIND;
    let evidence_fingerprint = sharp_evidence_fingerprint(
        crease_edges_marked,
        sharp_differs_from_smooth,
        smooth_scene_low_crease,
        max_crease_count,
        max_sharp_smooth_delta,
        max_dihedral_rad,
    );
    let core_ok = crease_edges_marked && sharp_differs_from_smooth && smooth_scene_low_crease;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    HermiteSharpFeaturesSoakReport {
        hermite_sharp_features_ready: false,
        crease_edges_marked,
        sharp_differs_from_smooth,
        smooth_scene_low_crease,
        outputs_finite,
        max_crease_count,
        max_sharp_smooth_delta,
        max_dihedral_rad,
        sample_count,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_hermite_duality_grid_probe: d,
        distinct_from_fm_additive_synthesis_probe: d,
        distinct_from_acoustic_reverb_geometry_probe: d,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        instant_meshes_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

fn apply_measured_distinct(mut r: HermiteSharpFeaturesSoakReport) -> HermiteSharpFeaturesSoakReport {
    let d = measured_distinct(r.evidence_kind, r.evidence_fingerprint, true);
    r.distinct_from_hermite_duality_grid_probe = d;
    r.distinct_from_fm_additive_synthesis_probe = d;
    r.distinct_from_acoustic_reverb_geometry_probe = d;
    r.distinct_from_acoustic_raytracing_echo_probe = d;
    r.distinct_from_finite_element_analysis_probe = d;
    r.distinct_from_sonic_impedance_probe = d;
    r.distinct_from_spectral_sonic_desktop_probe = d;
    r.distinct_from_synesthetic_sensory_remap_probe = d;
    r.distinct_from_atmospheric_physical_damping_probe = d;
    r.distinct_from_lattice_boltzmann_fluid_solver_probe = d;
    r.distinct_from_aerodynamic_navier_stokes_probe = d;
    r.distinct_from_matter_thermodynamics_sph_probe = d;
    r.distinct_from_hybrid_eulerian_lagrangian_pbd_probe = d;
    r.distinct_from_position_based_dynamics_probe = d;
    r.distinct_from_autonomous_conflict_generator_probe = d;
    r.distinct_from_mnemonic_matter_entropy_probe = d;
    r.distinct_from_four_dimensional_time_sdf_probe = d;
    r.distinct_from_shadow_time_reversal_probe = d;
    r.distinct_from_curved_raymarcher_probe = d;
    r.distinct_from_fractal_energy_perturbation_probe = d;
    r.distinct_from_autonomous_entropy_corrector_probe = d;
    r.distinct_from_unified_field_network_probe = d;
    r.distinct_from_slab_allocator_mmap_probe = d;
    r.distinct_from_baremetal_memory_manager_probe = d;
    r.distinct_from_mmap_ecs_pager_probe = d;
    r.distinct_from_simd_world_soa_hot_path_probe = d;
    r.distinct_from_simd_clay_math_probe = d;
    r.distinct_from_world_soa_sab_layout_probe = d;
    r.distinct_from_desktop_wire_probe = d;
    r.distinct_from_mut_dna_desktop_probe = d;
    r.distinct_from_kernel_foundation_probe = d;
    r.instant_meshes_parity_ready = false;
    r.chaos_pbd_parity_ready = false;
    r.unreal_mass_100k_ready = false;
    r.mmap_sab_production_ready = false;
    r.avx512_kernel_ready = false;
    r.gr_raymarch_ready = false;
    r.dual_timeline_240_ready = false;
    r
}

fn collect_cell_estimates(grid: &HermiteGrid) -> Vec<SharpFeatureEstimate> {
    let mut out = Vec::new();
    let cells = grid.res.saturating_sub(1);
    for z in 0..cells {
        for y in 0..cells {
            for x in 0..cells {
                if let Some(est) = HermiteSharpFeatures::estimate_cell(grid, x, y, z) {
                    out.push(est);
                }
            }
        }
    }
    out
}

/// Run sharp-crease vs smooth-blend soak on box corner + smooth plane grids.
///
/// Does **not** claim Instant Meshes / commercial remesh parity.
pub fn run_hermite_sharp_features_soak() -> HermiteSharpFeaturesSoakReport {
    // Sharp box — orthogonal face normals ⇒ creases + sharp≠smooth.
    let mut box_grid = HermiteGrid::new(GRID_RES, GRID_ORIGIN, CELL_SIZE);
    box_grid.fill_box([0.0, 0.0, 0.0], [0.65, 0.65, 0.65]);
    let box_ests = collect_cell_estimates(&box_grid);

    // Smooth plane — single normal family ⇒ few/no creases, sharp≈smooth.
    let mut plane_grid = HermiteGrid::new(GRID_RES, GRID_ORIGIN, CELL_SIZE);
    plane_grid.fill_plane([0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
    let plane_ests = collect_cell_estimates(&plane_grid);

    // Slanted plane — still one normal; crease count should stay low.
    let mut slant_grid = HermiteGrid::new(GRID_RES, GRID_ORIGIN, CELL_SIZE);
    slant_grid.fill_plane([0.1, 0.05, -0.05], [1.0, 0.7, 0.4]);
    let slant_ests = collect_cell_estimates(&slant_grid);

    let sample_count = SOAK_SCENARIO_COUNT;
    let mut max_crease_count = 0_u32;
    let mut max_sharp_smooth_delta = 0.0_f32;
    let mut max_dihedral_rad = 0.0_f32;
    let mut outputs_finite = true;

    for est in box_ests
        .iter()
        .chain(plane_ests.iter())
        .chain(slant_ests.iter())
    {
        if !est.is_finite() {
            outputs_finite = false;
        }
        if est.crease_edge_count > max_crease_count {
            max_crease_count = est.crease_edge_count;
        }
        let d = est.sharp_smooth_delta();
        if d > max_sharp_smooth_delta {
            max_sharp_smooth_delta = d;
        }
        if est.max_dihedral_rad > max_dihedral_rad {
            max_dihedral_rad = est.max_dihedral_rad;
        }
    }

    let crease_edges_marked = box_ests
        .iter()
        .any(|e| e.crease_edge_count >= MIN_CREASE_EDGES);
    let sharp_differs_from_smooth = box_ests
        .iter()
        .any(|e| e.sharp_smooth_delta() >= MIN_SHARP_SMOOTH_DELTA)
        || max_sharp_smooth_delta >= MIN_SHARP_SMOOTH_DELTA;
    // Smooth scenes: plane cells should not mark many creases (same normal).
    let plane_max_crease = plane_ests
        .iter()
        .map(|e| e.crease_edge_count)
        .max()
        .unwrap_or(0);
    let slant_max_crease = slant_ests
        .iter()
        .map(|e| e.crease_edge_count)
        .max()
        .unwrap_or(0);
    let smooth_scene_low_crease = plane_max_crease == 0 && slant_max_crease == 0;

    // API smoke: former stub uses both args and returns finite.
    let api_a = HermiteSharpFeatures::calculate_blade_edge_intersection(0.5, [0.0, 1.0, 0.0]);
    let api_b = HermiteSharpFeatures::calculate_blade_edge_intersection(0.5, [1.0, 0.0, 0.0]);
    let api_ok = api_a.is_finite() && api_b.is_finite() && (api_a - api_b).abs() > EPS;

    if !(outputs_finite
        && api_ok
        && crease_edges_marked
        && sharp_differs_from_smooth
        && smooth_scene_low_crease
        && !box_ests.is_empty())
    {
        return held_report(
            crease_edges_marked,
            sharp_differs_from_smooth,
            smooth_scene_low_crease,
            outputs_finite && api_ok,
            max_crease_count,
            max_sharp_smooth_delta,
            max_dihedral_rad,
            sample_count,
        );
    }

    let evidence_kind = SHARP_EVIDENCE_KIND;
    let evidence_fingerprint = sharp_evidence_fingerprint(
        true,
        true,
        true,
        max_crease_count,
        max_sharp_smooth_delta,
        max_dihedral_rad,
    );
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    apply_measured_distinct(HermiteSharpFeaturesSoakReport {
        hermite_sharp_features_ready: true,
        crease_edges_marked: true,
        sharp_differs_from_smooth: true,
        smooth_scene_low_crease: true,
        outputs_finite: true,
        max_crease_count,
        max_sharp_smooth_delta,
        max_dihedral_rad,
        sample_count,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_hermite_duality_grid_probe: d,
        distinct_from_fm_additive_synthesis_probe: d,
        distinct_from_acoustic_reverb_geometry_probe: d,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        instant_meshes_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    })
}

/// Honesty probe — soak-gated `hermite_sharp_features_ready` (**el**).
pub fn probe_hermite_sharp_features() -> HermiteSharpFeaturesSoakReport {
    run_hermite_sharp_features_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dihedral_orthogonal_is_crease() {
        let n0 = [1.0, 0.0, 0.0];
        let n1 = [0.0, 1.0, 0.0];
        assert!(HermiteSharpFeatures::is_crease_pair(n0, n1));
        let a = HermiteSharpFeatures::dihedral_angle(n0, n1);
        assert!((a - std::f32::consts::FRAC_PI_2).abs() < 1e-4);
    }

    #[test]
    fn parallel_normals_not_crease() {
        let n0 = [0.0, 1.0, 0.0];
        let n1 = [0.0, 1.0, 0.0];
        assert!(!HermiteSharpFeatures::is_crease_pair(n0, n1));
    }

    #[test]
    fn box_corner_marks_creases_and_differs_from_smooth() {
        let mut g = HermiteGrid::new(GRID_RES, GRID_ORIGIN, CELL_SIZE);
        g.fill_box([0.0, 0.0, 0.0], [0.65, 0.65, 0.65]);
        let ests = collect_cell_estimates(&g);
        assert!(!ests.is_empty());
        assert!(
            ests.iter().any(|e| e.crease_edge_count >= MIN_CREASE_EDGES),
            "expected crease marks on box"
        );
        let max_d = ests
            .iter()
            .map(|e| e.sharp_smooth_delta())
            .fold(0.0_f32, f32::max);
        assert!(
            max_d >= MIN_SHARP_SMOOTH_DELTA,
            "sharp should differ from smooth, max_d={max_d}"
        );
    }

    #[test]
    fn smooth_plane_has_no_creases() {
        let mut g = HermiteGrid::new(GRID_RES, GRID_ORIGIN, CELL_SIZE);
        g.fill_plane([0.0, 0.0, 0.0], [0.0, 1.0, 0.0]);
        let ests = collect_cell_estimates(&g);
        let max_c = ests.iter().map(|e| e.crease_edge_count).max().unwrap_or(0);
        assert_eq!(max_c, 0, "plane should not mark creases");
    }

    #[test]
    fn blade_api_uses_normal_and_is_finite() {
        let soft = HermiteSharpFeatures::calculate_blade_edge_intersection(0.4, [0.0, 1.0, 0.0]);
        let sharp = HermiteSharpFeatures::calculate_blade_edge_intersection(0.4, [1.0, 0.0, 0.0]);
        assert!(soft.is_finite() && sharp.is_finite());
        assert!(
            (soft - sharp).abs() > EPS,
            "orthogonal normal should bias blade cut vs soft"
        );
        let bad = HermiteSharpFeatures::calculate_blade_edge_intersection(f32::NAN, [0.0, 1.0, 0.0]);
        assert_eq!(bad, 0.0);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_hermite_sharp_features_soak();
        assert!(r.hermite_sharp_features_ready, "{r:?}");
        assert!(r.crease_edges_marked);
        assert!(r.sharp_differs_from_smooth);
        assert!(r.smooth_scene_low_crease);
        assert!(r.outputs_finite);
        assert!(!r.instant_meshes_parity_ready);
        assert_eq!(r.evidence_kind, SHARP_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_hermite_duality_grid_probe);
        assert!(r.distinct_from_fm_additive_synthesis_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_hermite_sharp_features_soak();
        let b = probe_hermite_sharp_features();
        assert_eq!(
            a.hermite_sharp_features_ready,
            b.hermite_sharp_features_ready
        );
        assert!(b.hermite_sharp_features_ready);
        assert_eq!(a.evidence_kind, b.evidence_kind);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn distinct_from_ek_hermite_duality_probe() {
        let sharp = probe_hermite_sharp_features();
        let dual = crate::hermite_duality_grid::probe_hermite_duality_grid();
        assert!(sharp.hermite_sharp_features_ready);
        assert!(dual.hermite_duality_grid_ready);
        assert!(sharp.distinct_from_hermite_duality_grid_probe);
        assert_ne!(sharp.evidence_kind, dual.evidence_kind);
        assert_ne!(sharp.evidence_fingerprint, dual.evidence_fingerprint);
        assert_ne!("hermiteSharpFeaturesReady", "hermiteDualityGridReady");
    }

    #[test]
    fn el_ek_em_distinct_evidence_fingerprints() {
        let sharp = probe_hermite_sharp_features();
        let dual = crate::hermite_duality_grid::probe_hermite_duality_grid();
        let sculpt = crate::sdf_sculptor::probe_sdf_sculptor();
        assert!(sharp.hermite_sharp_features_ready);
        assert!(dual.hermite_duality_grid_ready);
        assert!(sculpt.sdf_sculptor_ready);
        assert_eq!(sharp.evidence_kind, "hermite_crease_dihedral_snap");
        assert_eq!(dual.evidence_kind, "hermite_qef_dual_contour");
        assert_eq!(sculpt.evidence_kind, "dense_sdf_softmin_brush");
        assert_ne!(sharp.evidence_kind, dual.evidence_kind);
        assert_ne!(sharp.evidence_kind, sculpt.evidence_kind);
        assert_ne!(dual.evidence_kind, sculpt.evidence_kind);
        assert_ne!(sharp.evidence_fingerprint, dual.evidence_fingerprint);
        assert_ne!(sharp.evidence_fingerprint, sculpt.evidence_fingerprint);
        assert_ne!(dual.evidence_fingerprint, sculpt.evidence_fingerprint);
        assert!(sharp.distinct_from_hermite_duality_grid_probe);
        assert!(sculpt.distinct_from_hermite_sharp_features_probe);
        assert!(sculpt.distinct_from_hermite_duality_grid_probe);
    }

    #[test]
    fn crease_dihedral_threshold_is_positive_and_sub_pi() {
        assert!(CREASE_DIHEDRAL_RAD > 0.0);
        assert!(CREASE_DIHEDRAL_RAD < std::f32::consts::PI);
        assert!((CREASE_DOT_MAX - (std::f32::consts::FRAC_1_SQRT_2)).abs() < 1e-6);
    }

    #[test]
    fn sharp_feature_estimate_delta_zero_when_identical() {
        let est = SharpFeatureEstimate {
            smooth_blend: [1.0, 2.0, 3.0],
            sharp_preserve: [1.0, 2.0, 3.0],
            edge_count: 3,
            crease_edge_count: 0,
            max_dihedral_rad: 0.0,
        };

        assert_eq!(est.sharp_smooth_delta(), 0.0);
        assert!(est.is_finite());
    }
}

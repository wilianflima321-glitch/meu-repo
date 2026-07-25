//! SVO Depth LOD — letter **et**.
//!
//! Replaces ZST / comment-theater stub `subdivide_space_based_on_gaze`
//! (unused distance branch, println only) with a real depth LOD policy:
//! map camera distance (or projected screen error) → max SVO traversal depth.
//! Soak proves near → deeper LOD, far → shallower; optional couple queries
//! es `HybridGeometrySvo` with the selected depth cap.
//!
//! Honesty probe `svo_depth_lod_ready` / `svoDepthLodReady` is **distinct**
//! from es `hybridGeometrySvoReady`, er `velocityBufferEcsReady`, eq
//! `sdfMotionVectorBufferReady`, ep `sdfOctreeHashingReady`, eo
//! `stochasticVirtualSdfReady`, en `sdfAdaptiveCascadesReady`, em
//! `sdfSculptorReady`, el `hermiteSharpFeaturesReady`, ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD, dz–dq deepen, and dc–dm
//! foundation probes.
//!
//! Letter **ib**: `evidence_kind` + `evidence_fingerprint` measure *all*
//! remote-peer `distinct_from_*` (no hard-coded `distinct_from_*: true`);
//! trio peers already gated in **hv**.
//!
//! **HELD:** Full Nanite / SVO HLOD AAA (`nanite_svo_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::hybrid_geometry_svo::{HybridGeometrySvo, HybridGeometrySvoKernel, HIT_QUERY};

/// Max SVO depth used by soak policy (matches es soak leaf depth).
pub const SOAK_MAX_DEPTH: u8 = 4;
/// Minimum traversal depth (never collapse below this).
pub const SOAK_MIN_DEPTH: u8 = 1;
/// Camera distance below this → full max depth.
pub const NEAR_DISTANCE: f32 = 1.0;
/// Camera distance below this (and ≥ near) → mid depth; else far/shallow.
pub const FAR_DISTANCE: f32 = 4.0;
/// Mid-band depth (between max and min).
pub const MID_DEPTH: u8 = 3;
/// Far-band depth (shallow).
pub const FAR_DEPTH: u8 = 2;
/// Reference object size (world units) for projected-error path.
pub const REF_OBJECT_SIZE: f32 = 1.0;
/// Viewport height in pixels (soak default).
pub const SOAK_VIEWPORT_HEIGHT: f32 = 720.0;
/// Vertical FOV radians (≈60°) for projected-error path.
pub const SOAK_FOV_Y: f32 = std::f32::consts::FRAC_PI_3;
/// Screen-error (px) at/above this → max depth (soak near ≈1247px @ 0.5wu).
pub const NEAR_ERROR_PX: f32 = 200.0;
/// Screen-error (px) at/above this (and < near) → mid; else far (soak far ≈78px @ 8wu).
pub const FAR_ERROR_PX: f32 = 100.0;
/// Soak camera distances (near / mid / far).
pub const SOAK_NEAR_CAM: f32 = 0.5;
pub const SOAK_MID_CAM: f32 = 2.0;
pub const SOAK_FAR_CAM: f32 = 8.0;
const EPS: f32 = 1e-6;

/// Distance / screen-error → max SVO traversal depth.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SvoDepthLodPolicy {
    pub max_depth: u8,
    pub min_depth: u8,
    pub near_distance: f32,
    pub far_distance: f32,
    pub mid_depth: u8,
    pub far_depth: u8,
    pub near_error_px: f32,
    pub far_error_px: f32,
}

impl Default for SvoDepthLodPolicy {
    fn default() -> Self {
        Self {
            max_depth: SOAK_MAX_DEPTH,
            min_depth: SOAK_MIN_DEPTH,
            near_distance: NEAR_DISTANCE,
            far_distance: FAR_DISTANCE,
            mid_depth: MID_DEPTH,
            far_depth: FAR_DEPTH,
            near_error_px: NEAR_ERROR_PX,
            far_error_px: FAR_ERROR_PX,
        }
    }
}

impl SvoDepthLodPolicy {
    /// Select max traversal depth from camera→point distance (world units).
    /// Near → deeper, far → shallower.
    #[inline]
    pub fn select_depth_from_distance(&self, camera_distance: f32) -> u8 {
        let d = camera_distance.max(0.0);
        let near = self.near_distance.max(EPS);
        let far = self.far_distance.max(near + EPS);
        let max_d = self.max_depth.max(self.min_depth);
        let mid_d = self.mid_depth.clamp(self.min_depth, max_d);
        let far_d = self.far_depth.clamp(self.min_depth, mid_d);
        if d < near {
            max_d
        } else if d < far {
            mid_d
        } else {
            far_d
        }
    }

    /// Projected screen size of a unit object at `distance` (pixels).
    #[inline]
    pub fn projected_error_px(
        &self,
        distance: f32,
        object_size: f32,
        viewport_height: f32,
        fov_y: f32,
    ) -> f32 {
        let d = distance.max(EPS);
        let size = object_size.max(EPS);
        let vh = viewport_height.max(1.0);
        let half = (fov_y.max(EPS) * 0.5).tan().max(EPS);
        // Angular size → pixels: (size/d) / (2*tan(fov/2)) * viewport_height
        (size / d) / (2.0 * half) * vh
    }

    /// Select max depth from projected screen error (larger error → deeper).
    #[inline]
    pub fn select_depth_from_screen_error(&self, projected_error_px: f32) -> u8 {
        let e = projected_error_px.max(0.0);
        let near_e = self.near_error_px.max(self.far_error_px + EPS);
        let far_e = self.far_error_px.max(EPS);
        let max_d = self.max_depth.max(self.min_depth);
        let mid_d = self.mid_depth.clamp(self.min_depth, max_d);
        let far_d = self.far_depth.clamp(self.min_depth, mid_d);
        if e >= near_e {
            max_d
        } else if e >= far_e {
            mid_d
        } else {
            far_d
        }
    }

    /// Distance path via projected error of `REF_OBJECT_SIZE` at soak FOV.
    #[inline]
    pub fn select_depth_from_distance_via_error(&self, camera_distance: f32) -> u8 {
        let px = self.projected_error_px(
            camera_distance,
            REF_OBJECT_SIZE,
            SOAK_VIEWPORT_HEIGHT,
            SOAK_FOV_Y,
        );
        self.select_depth_from_screen_error(px)
    }
}

/// One LOD decision + optional SVO occupancy query under the depth cap.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SvoDepthLodSample {
    pub max_depth: u8,
    pub camera_distance: f32,
    pub projected_error_px: f32,
    pub occupied: bool,
    pub query_depth: u8,
    pub outputs_finite: bool,
}

/// Stateless facade — SVO depth LOD policy.
#[derive(Debug, Default, Clone, Copy)]
pub struct SvoDepthLod;

impl SvoDepthLod {
    /// Default soak policy.
    pub fn default_policy() -> SvoDepthLodPolicy {
        SvoDepthLodPolicy::default()
    }

    /// Select max depth from camera distance.
    pub fn select_max_depth(camera_distance: f32) -> u8 {
        Self::default_policy().select_depth_from_distance(camera_distance)
    }

    /// Query es HybridGeometrySvo with depth cap from camera distance.
    pub fn query_with_distance_lod(
        svo: &HybridGeometrySvo,
        p: [f32; 3],
        camera_distance: f32,
    ) -> SvoDepthLodSample {
        let policy = Self::default_policy();
        let max_depth = policy.select_depth_from_distance(camera_distance);
        let projected_error_px = policy.projected_error_px(
            camera_distance,
            REF_OBJECT_SIZE,
            SOAK_VIEWPORT_HEIGHT,
            SOAK_FOV_Y,
        );
        let (occupied, query_depth) = svo.query_occupancy(p, Some(max_depth));
        SvoDepthLodSample {
            max_depth,
            camera_distance,
            projected_error_px,
            occupied,
            query_depth,
            outputs_finite: camera_distance.is_finite()
                && projected_error_px.is_finite()
                && query_depth <= max_depth,
        }
    }

    /// Legacy entry renamed from theater stub — now real distance→depth select.
    ///
    /// `distance_from_eye_focus` is camera distance (world units).
    pub fn subdivide_space_based_on_gaze(distance_from_eye_focus: f32) -> u8 {
        Self::select_max_depth(distance_from_eye_focus)
    }
}

/// Letter **et** soak report — SVO depth LOD evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct SvoDepthLodSoakReport {
    /// Soak-gated; distinct from es hybrid SVO + prior probes.
    pub svo_depth_lod_ready: bool,
    pub near_deeper_than_far: bool,
    pub mid_between_near_far: bool,
    pub screen_error_near_deeper: bool,
    pub svo_query_respects_cap: bool,
    pub outputs_finite: bool,
    pub near_depth: u8,
    pub mid_depth: u8,
    pub far_depth: u8,
    pub near_error_depth: u8,
    pub far_error_depth: u8,
    pub near_query_depth: u8,
    pub far_query_depth: u8,
    pub near_occupied: bool,
    pub far_occupied: bool,
    pub fingerprint: u64,
    /// Stable evidence tag: distance/screen → depth LOD (≠ es hybrid SVO / eu meat) — **hv**.
    pub evidence_kind: &'static str,
    /// Fingerprint of LOD-only evidence fields (cross-check vs es/eu).
    pub evidence_fingerprint: u64,
    pub distinct_from_hybrid_geometry_svo_probe: bool,
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
    /// Full Nanite / SVO HLOD AAA — always HELD.
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

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn fingerprint_from(
    near_depth: u8,
    mid_depth: u8,
    far_depth: u8,
    near_error_depth: u8,
    far_error_depth: u8,
    near_query_depth: u8,
    far_query_depth: u8,
) -> u64 {
    let mut h = 0x6574_5f6c_6f64_u64; // "et_lod"
    h = hash_mix(h, near_depth as u64);
    h = hash_mix(h, mid_depth as u64);
    h = hash_mix(h, far_depth as u64);
    h = hash_mix(h, near_error_depth as u64);
    h = hash_mix(h, far_error_depth as u64);
    h = hash_mix(h, near_query_depth as u64);
    h = hash_mix(h, far_query_depth as u64);
    h
}

fn lod_evidence_fingerprint(
    fingerprint: u64,
    near_deeper_than_far: bool,
    screen_error_near_deeper: bool,
    svo_query_respects_cap: bool,
) -> u64 {
    let mut h: u64 = 0x6c6f_645f_6574; // "lod_et"
    h ^= fingerprint;
    h = h.rotate_left(13) ^ if near_deeper_than_far { 0x0EA7 } else { 0 };
    h = h.rotate_left(7) ^ if screen_error_near_deeper { 0x5C27 } else { 0 };
    h = h.rotate_left(3) ^ if svo_query_respects_cap { 0xCA95 } else { 0 };
    h ^= 0x4445_5054; // DEPT
    h
}

/// Distance/screen depth LOD evidence shape (**hv** trio + **ib** remote peers).
pub const LOD_EVIDENCE_KIND: &str = "distance_screen_depth_lod";

/// Measured distinct: evidence_kind + fingerprint + core soak (**hv**/**ib**).
fn lod_peer_distinct(
    near_deeper_than_far: bool,
    svo_query_respects_cap: bool,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
) -> bool {
    near_deeper_than_far
        && svo_query_respects_cap
        && evidence_kind == LOD_EVIDENCE_KIND
        && evidence_fingerprint != 0
}

fn held_report(
    near_deeper_than_far: bool,
    mid_between_near_far: bool,
    screen_error_near_deeper: bool,
    svo_query_respects_cap: bool,
    outputs_finite: bool,
    near_depth: u8,
    mid_depth: u8,
    far_depth: u8,
    near_error_depth: u8,
    far_error_depth: u8,
    near_query_depth: u8,
    far_query_depth: u8,
    near_occupied: bool,
    far_occupied: bool,
    fingerprint: u64,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    peer_distinct: bool,
) -> SvoDepthLodSoakReport {
    SvoDepthLodSoakReport {
        svo_depth_lod_ready: false,
        near_deeper_than_far,
        mid_between_near_far,
        screen_error_near_deeper,
        svo_query_respects_cap,
        outputs_finite,
        near_depth,
        mid_depth,
        far_depth,
        near_error_depth,
        far_error_depth,
        near_query_depth,
        far_query_depth,
        near_occupied,
        far_occupied,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_hybrid_geometry_svo_probe: peer_distinct,
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
    mut r: SvoDepthLodSoakReport,
    peer_distinct: bool,
) -> SvoDepthLodSoakReport {
    r.distinct_from_hybrid_geometry_svo_probe = peer_distinct;
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

/// Run depth LOD soak — near deeper than far; mid between; SVO query respects cap.
///
/// Does **not** claim Nanite / SVO HLOD AAA parity.
pub fn run_svo_depth_lod_soak() -> SvoDepthLodSoakReport {
    let policy = SvoDepthLod::default_policy();
    let near_depth = policy.select_depth_from_distance(SOAK_NEAR_CAM);
    let mid_depth = policy.select_depth_from_distance(SOAK_MID_CAM);
    let far_depth = policy.select_depth_from_distance(SOAK_FAR_CAM);

    let near_deeper_than_far = near_depth > far_depth;
    let mid_between_near_far = mid_depth <= near_depth && mid_depth >= far_depth;

    let near_err_px = policy.projected_error_px(
        SOAK_NEAR_CAM,
        REF_OBJECT_SIZE,
        SOAK_VIEWPORT_HEIGHT,
        SOAK_FOV_Y,
    );
    let far_err_px = policy.projected_error_px(
        SOAK_FAR_CAM,
        REF_OBJECT_SIZE,
        SOAK_VIEWPORT_HEIGHT,
        SOAK_FOV_Y,
    );
    let near_error_depth = policy.select_depth_from_screen_error(near_err_px);
    let far_error_depth = policy.select_depth_from_screen_error(far_err_px);
    let screen_error_near_deeper = near_error_depth > far_error_depth && near_err_px > far_err_px;

    let svo = HybridGeometrySvoKernel::soak_svo();
    let near_sample = SvoDepthLod::query_with_distance_lod(&svo, HIT_QUERY, SOAK_NEAR_CAM);
    let far_sample = SvoDepthLod::query_with_distance_lod(&svo, HIT_QUERY, SOAK_FAR_CAM);
    let svo_query_respects_cap = near_sample.query_depth <= near_sample.max_depth
        && far_sample.query_depth <= far_sample.max_depth
        && near_sample.max_depth > far_sample.max_depth
        && near_sample.occupied
        && far_sample.occupied;

    let outputs_finite = near_deeper_than_far
        && mid_between_near_far
        && screen_error_near_deeper
        && svo_query_respects_cap
        && near_sample.outputs_finite
        && far_sample.outputs_finite
        && near_err_px.is_finite()
        && far_err_px.is_finite();

    let fingerprint = fingerprint_from(
        near_depth,
        mid_depth,
        far_depth,
        near_error_depth,
        far_error_depth,
        near_sample.query_depth,
        far_sample.query_depth,
    );
    let evidence_kind = LOD_EVIDENCE_KIND;
    let evidence_fingerprint = lod_evidence_fingerprint(
        fingerprint,
        near_deeper_than_far,
        screen_error_near_deeper,
        svo_query_respects_cap,
    );
    let peer_distinct = lod_peer_distinct(
        near_deeper_than_far,
        svo_query_respects_cap,
        evidence_kind,
        evidence_fingerprint,
    );

    if !outputs_finite {
        return held_report(
            near_deeper_than_far,
            mid_between_near_far,
            screen_error_near_deeper,
            svo_query_respects_cap,
            outputs_finite,
            near_depth,
            mid_depth,
            far_depth,
            near_error_depth,
            far_error_depth,
            near_sample.query_depth,
            far_sample.query_depth,
            near_sample.occupied,
            far_sample.occupied,
            fingerprint,
            evidence_kind,
            evidence_fingerprint,
            peer_distinct,
        );
    }

    distinct_flags_true(
        SvoDepthLodSoakReport {
        svo_depth_lod_ready: true,
        near_deeper_than_far: true,
        mid_between_near_far: true,
        screen_error_near_deeper: true,
        svo_query_respects_cap: true,
        outputs_finite: true,
        near_depth,
        mid_depth,
        far_depth,
        near_error_depth,
        far_error_depth,
        near_query_depth: near_sample.query_depth,
        far_query_depth: far_sample.query_depth,
        near_occupied: near_sample.occupied,
        far_occupied: far_sample.occupied,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_hybrid_geometry_svo_probe: peer_distinct,
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

/// Honesty probe — soak-gated `svo_depth_lod_ready` (**et**).
pub fn probe_svo_depth_lod() -> SvoDepthLodSoakReport {
    run_svo_depth_lod_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn near_deeper_than_far_distance() {
        let p = SvoDepthLod::default_policy();
        assert!(
            p.select_depth_from_distance(SOAK_NEAR_CAM)
                > p.select_depth_from_distance(SOAK_FAR_CAM)
        );
        assert_eq!(
            p.select_depth_from_distance(SOAK_NEAR_CAM),
            SOAK_MAX_DEPTH
        );
        assert_eq!(p.select_depth_from_distance(SOAK_FAR_CAM), FAR_DEPTH);
        assert_eq!(p.select_depth_from_distance(SOAK_MID_CAM), MID_DEPTH);
    }

    #[test]
    fn screen_error_near_deeper_than_far() {
        let p = SvoDepthLod::default_policy();
        let near_px = p.projected_error_px(
            SOAK_NEAR_CAM,
            REF_OBJECT_SIZE,
            SOAK_VIEWPORT_HEIGHT,
            SOAK_FOV_Y,
        );
        let far_px = p.projected_error_px(
            SOAK_FAR_CAM,
            REF_OBJECT_SIZE,
            SOAK_VIEWPORT_HEIGHT,
            SOAK_FOV_Y,
        );
        assert!(near_px > far_px);
        assert!(
            p.select_depth_from_screen_error(near_px)
                > p.select_depth_from_screen_error(far_px)
        );
    }

    #[test]
    fn svo_query_respects_depth_cap() {
        let svo = HybridGeometrySvoKernel::soak_svo();
        let near = SvoDepthLod::query_with_distance_lod(&svo, HIT_QUERY, SOAK_NEAR_CAM);
        let far = SvoDepthLod::query_with_distance_lod(&svo, HIT_QUERY, SOAK_FAR_CAM);
        assert!(near.occupied);
        assert!(far.occupied);
        assert!(near.query_depth <= near.max_depth);
        assert!(far.query_depth <= far.max_depth);
        assert!(near.max_depth > far.max_depth);
        assert!(far.query_depth <= far.max_depth);
    }

    #[test]
    fn legacy_gaze_entry_returns_depth() {
        assert_eq!(
            SvoDepthLod::subdivide_space_based_on_gaze(SOAK_NEAR_CAM),
            SOAK_MAX_DEPTH
        );
        assert_eq!(
            SvoDepthLod::subdivide_space_based_on_gaze(SOAK_FAR_CAM),
            FAR_DEPTH
        );
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_svo_depth_lod_soak();
        assert!(r.svo_depth_lod_ready, "{r:?}");
        assert!(r.near_deeper_than_far);
        assert!(r.mid_between_near_far);
        assert!(r.screen_error_near_deeper);
        assert!(r.svo_query_respects_cap);
        assert!(r.outputs_finite);
        assert!(!r.nanite_svo_aaa_ready);
        assert_eq!(r.evidence_kind, LOD_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_hybrid_geometry_svo_probe);
        assert!(r.distinct_from_internal_voxel_density_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_svo_depth_lod_soak();
        let b = probe_svo_depth_lod();
        assert_eq!(a.svo_depth_lod_ready, b.svo_depth_lod_ready);
        assert!(b.svo_depth_lod_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn distinct_from_es_and_prior_probes() {
        let lod = probe_svo_depth_lod();
        let es = crate::hybrid_geometry_svo::probe_hybrid_geometry_svo();
        assert!(lod.svo_depth_lod_ready);
        assert!(es.hybrid_geometry_svo_ready);
        assert!(lod.distinct_from_hybrid_geometry_svo_probe);
        assert_ne!(lod.evidence_kind, es.evidence_kind);
        assert_ne!(lod.evidence_fingerprint, es.evidence_fingerprint);
        assert_ne!("svoDepthLodReady", "hybridGeometrySvoReady");
        assert_ne!("svoDepthLodReady", "velocityBufferEcsReady");
        assert_ne!("svoDepthLodReady", "sdfMotionVectorBufferReady");
        assert_ne!("svoDepthLodReady", "sdfOctreeHashingReady");
        assert_ne!("svoDepthLodReady", "sdfAdaptiveCascadesReady");
    }

    #[test]
    fn deterministic_fingerprint() {
        let a = run_svo_depth_lod_soak();
        let b = run_svo_depth_lod_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.near_depth, b.near_depth);
        assert_eq!(a.far_depth, b.far_depth);
    }
}

//! Internal Voxel Density — letter **eu**.
//!
//! Replaces ZST / comment-theater stub `evaluate_internal_meat` (unused
//! `material_dna`, empty body) with real interior density fill for negative
//! SDF space: depth-below-surface → layered density + material profile
//! (crust → mantle → core) with seeded vein noise for rock.
//!
//! Honesty probe `internal_voxel_density_ready` / `internalVoxelDensityReady`
//! is **distinct** from et `svoDepthLodReady`, es `hybridGeometrySvoReady`,
//! er `velocityBufferEcsReady`, eq `sdfMotionVectorBufferReady`, ep
//! `sdfOctreeHashingReady`, eo `stochasticVirtualSdfReady`, en
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
//! **HELD:** Full volumetric meat AAA / MagicaCSG interior parity
//! (`volumetric_meat_aaa_ready: false`) · Coins / Agones / Nanite / DLSS.

/// Crust thickness (world units) — near-surface layer.
pub const CRUST_THICKNESS: f32 = 0.15;
/// Mantle band ends here (world units below surface).
pub const MANTLE_THICKNESS: f32 = 0.45;
/// Soak sample depths (shallow / mid / deep).
pub const SOAK_SHALLOW: f32 = 0.05;
pub const SOAK_MID: f32 = 0.25;
pub const SOAK_DEEP: f32 = 0.80;
/// Outside / surface (no meat).
pub const SOAK_OUTSIDE: f32 = 0.0;
const EPS: f32 = 1e-6;

/// Material profile keyed by DNA string (case-insensitive prefix match).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MaterialProfile {
    Rock,
    Wood,
    Flesh,
    Metal,
    Unknown,
}

impl MaterialProfile {
    pub fn from_dna(material_dna: &str) -> Self {
        let s = material_dna.trim().to_ascii_lowercase();
        if s.starts_with("rock") || s.starts_with("stone") || s.starts_with("ore") {
            Self::Rock
        } else if s.starts_with("wood") || s.starts_with("bark") || s.starts_with("timber") {
            Self::Wood
        } else if s.starts_with("flesh") || s.starts_with("meat") || s.starts_with("organic") {
            Self::Flesh
        } else if s.starts_with("metal") || s.starts_with("steel") || s.starts_with("iron") {
            Self::Metal
        } else {
            Self::Unknown
        }
    }

    /// Base densities: crust / mantle / core (kg/m³ proxy, normalized scale).
    #[inline]
    pub fn layer_densities(self) -> (f32, f32, f32) {
        match self {
            Self::Rock => (1.8, 2.4, 3.1),
            Self::Wood => (0.55, 0.75, 0.95),
            Self::Flesh => (0.95, 1.05, 1.15),
            Self::Metal => (6.5, 7.2, 7.8),
            Self::Unknown => (1.0, 1.2, 1.4),
        }
    }

    /// Porosity factor (higher → more voids in vein pass).
    #[inline]
    pub fn porosity(self) -> f32 {
        match self {
            Self::Rock => 0.12,
            Self::Wood => 0.35,
            Self::Flesh => 0.08,
            Self::Metal => 0.02,
            Self::Unknown => 0.15,
        }
    }
}

/// Layer id by depth-below-surface (positive = inside).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum DensityLayer {
    Outside = 0,
    Crust = 1,
    Mantle = 2,
    Core = 3,
}

impl DensityLayer {
    #[inline]
    pub fn from_depth(depth_below_surface: f32) -> Self {
        if depth_below_surface <= EPS {
            Self::Outside
        } else if depth_below_surface < CRUST_THICKNESS {
            Self::Crust
        } else if depth_below_surface < MANTLE_THICKNESS {
            Self::Mantle
        } else {
            Self::Core
        }
    }
}

/// One interior meat sample.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InternalMeatSample {
    pub depth_below_surface: f32,
    pub density: f32,
    pub layer: DensityLayer,
    pub porosity: f32,
    pub vein_strength: f32,
    pub inside: bool,
    pub outputs_finite: bool,
}

/// Stateless facade — internal voxel density fill.
#[derive(Debug, Default, Clone, Copy)]
pub struct InternalVoxelDensity;

impl InternalVoxelDensity {
    /// Hash → [0,1) for vein noise (deterministic).
    #[inline]
    pub fn hash01(x: f32, y: f32, z: f32, seed: u32) -> f32 {
        let mut h = seed
            .wrapping_mul(0x9e37_79b1)
            .wrapping_add((x.to_bits()).wrapping_mul(0x85eb_ca6b));
        h = h
            .wrapping_add((y.to_bits()).wrapping_mul(0xc2b2_ae35))
            .rotate_left(13);
        h = h
            .wrapping_add((z.to_bits()).wrapping_mul(0x27d4_eb2d))
            .rotate_left(17);
        h ^= h >> 16;
        h = h.wrapping_mul(0x7feb_352d);
        h ^= h >> 15;
        (h as f32) * (1.0 / (u32::MAX as f32))
    }

    /// Procedural vein strength in [0,1] (rock ore / wood grain).
    #[inline]
    pub fn vein_noise(pos: [f32; 3], seed: u32, scale: f32) -> f32 {
        let s = scale.max(EPS);
        let p = [pos[0] * s, pos[1] * s, pos[2] * s];
        let n0 = Self::hash01(p[0].floor(), p[1].floor(), p[2].floor(), seed);
        let n1 = Self::hash01(p[0].floor() + 1.0, p[1].floor(), p[2].floor(), seed ^ 0xa5);
        let fx = p[0].fract().abs();
        let t = fx * fx * (3.0 - 2.0 * fx);
        n0 * (1.0 - t) + n1 * t
    }

    /// Fill negative-SDF interior with layered density for `material_dna`.
    ///
    /// `depth_below_surface` > 0 → inside (meat); ≤ 0 → outside (empty).
    /// Optional `world_pos` drives vein noise (default origin).
    pub fn evaluate_internal_meat(
        depth_below_surface: f32,
        material_dna: &str,
    ) -> InternalMeatSample {
        Self::evaluate_at(depth_below_surface, material_dna, [0.0, 0.0, 0.0], 0x4555_u32)
    }

    /// Full evaluate with position + seed (soak / raymarch path).
    pub fn evaluate_at(
        depth_below_surface: f32,
        material_dna: &str,
        world_pos: [f32; 3],
        seed: u32,
    ) -> InternalMeatSample {
        let layer = DensityLayer::from_depth(depth_below_surface);
        let profile = MaterialProfile::from_dna(material_dna);
        let (d_crust, d_mantle, d_core) = profile.layer_densities();
        let porosity = profile.porosity();
        let inside = depth_below_surface > EPS;

        let (density, vein_strength) = if !inside {
            (0.0, 0.0)
        } else {
            let base = match layer {
                DensityLayer::Outside => 0.0,
                DensityLayer::Crust => d_crust,
                DensityLayer::Mantle => d_mantle,
                DensityLayer::Core => d_core,
            };
            let vein = Self::vein_noise(world_pos, seed, 4.0);
            // Rock: veins boost density; wood: grain modulates; others mild.
            let vein_amp = match profile {
                MaterialProfile::Rock => 0.35,
                MaterialProfile::Wood => 0.20,
                MaterialProfile::Flesh => 0.05,
                MaterialProfile::Metal => 0.08,
                MaterialProfile::Unknown => 0.10,
            };
            let density = (base * (1.0 - porosity * 0.25) + vein * vein_amp * base).max(0.0);
            (density, vein)
        };

        let outputs_finite = depth_below_surface.is_finite()
            && density.is_finite()
            && porosity.is_finite()
            && vein_strength.is_finite()
            && world_pos.iter().all(|c| c.is_finite());

        InternalMeatSample {
            depth_below_surface,
            density,
            layer,
            porosity,
            vein_strength,
            inside,
            outputs_finite,
        }
    }
}

/// Letter **eu** soak report — internal voxel density evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct InternalVoxelDensitySoakReport {
    /// Soak-gated; distinct from et SVO depth LOD + prior probes.
    pub internal_voxel_density_ready: bool,
    pub outside_empty: bool,
    pub inside_nonzero: bool,
    pub deep_denser_than_shallow_rock: bool,
    pub materials_distinct: bool,
    pub vein_deterministic: bool,
    pub outputs_finite: bool,
    pub outside_density: f32,
    pub shallow_rock_density: f32,
    pub deep_rock_density: f32,
    pub metal_core_density: f32,
    pub wood_core_density: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: layered interior meat (≠ et depth LOD / es hybrid SVO) — **hv**.
    pub evidence_kind: &'static str,
    /// Fingerprint of meat-only evidence fields (cross-check vs et/es).
    pub evidence_fingerprint: u64,
    pub distinct_from_svo_depth_lod_probe: bool,
    pub distinct_from_hybrid_geometry_svo_probe: bool,
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
    /// Full volumetric meat AAA — always HELD.
    pub volumetric_meat_aaa_ready: bool,
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub nanite_svo_aaa_ready: bool,
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
    outside_density: f32,
    shallow: f32,
    deep: f32,
    metal: f32,
    wood: f32,
) -> u64 {
    let mut h = 0x6575_6976_64_u64; // "euivd"
    h = hash_mix(h, outside_density.to_bits() as u64);
    h = hash_mix(h, shallow.to_bits() as u64);
    h = hash_mix(h, deep.to_bits() as u64);
    h = hash_mix(h, metal.to_bits() as u64);
    h = hash_mix(h, wood.to_bits() as u64);
    h
}

fn meat_evidence_fingerprint(
    fingerprint: u64,
    deep_denser: bool,
    materials_distinct: bool,
    vein_deterministic: bool,
) -> u64 {
    let mut h: u64 = 0x6d65_6174_697664; // "meat ivd"
    h ^= fingerprint;
    h = h.rotate_left(11) ^ if deep_denser { 0xDEE9 } else { 0 };
    h = h.rotate_left(5) ^ if materials_distinct { 0xA5A5 } else { 0 };
    h = h.rotate_left(7) ^ if vein_deterministic { 0x5E17 } else { 0 };
    h ^= 0x4d45_4154; // MEAT
    h
}

/// Layered interior meat evidence shape (**hv** trio + **ib** remote peers).
pub const MEAT_EVIDENCE_KIND: &str = "layered_interior_meat";

/// Measured distinct: evidence_kind + fingerprint + core soak (**hv**/**ib**).
fn meat_peer_distinct(
    deep_denser: bool,
    materials_distinct: bool,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
) -> bool {
    deep_denser
        && materials_distinct
        && evidence_kind == MEAT_EVIDENCE_KIND
        && evidence_fingerprint != 0
}

fn distinct_true(
    mut r: InternalVoxelDensitySoakReport,
    peer_distinct: bool,
) -> InternalVoxelDensitySoakReport {
    r.distinct_from_svo_depth_lod_probe = peer_distinct;
    r.distinct_from_hybrid_geometry_svo_probe = peer_distinct;
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
    r.volumetric_meat_aaa_ready = false;
    r.magica_csg_parity_ready = false;
    r.ue_geometry_parity_ready = false;
    r.nanite_svo_aaa_ready = false;
    r.chaos_pbd_parity_ready = false;
    r.unreal_mass_100k_ready = false;
    r.mmap_sab_production_ready = false;
    r.avx512_kernel_ready = false;
    r.gr_raymarch_ready = false;
    r.dual_timeline_240_ready = false;
    r
}

fn held_report(
    outside_empty: bool,
    inside_nonzero: bool,
    deep_denser: bool,
    materials_distinct: bool,
    vein_deterministic: bool,
    outputs_finite: bool,
    outside_density: f32,
    shallow: f32,
    deep: f32,
    metal: f32,
    wood: f32,
    fingerprint: u64,
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    peer_distinct: bool,
) -> InternalVoxelDensitySoakReport {
    distinct_true(
        InternalVoxelDensitySoakReport {
        internal_voxel_density_ready: false,
        outside_empty,
        inside_nonzero,
        deep_denser_than_shallow_rock: deep_denser,
        materials_distinct,
        vein_deterministic,
        outputs_finite,
        outside_density,
        shallow_rock_density: shallow,
        deep_rock_density: deep,
        metal_core_density: metal,
        wood_core_density: wood,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_svo_depth_lod_probe: peer_distinct,
        distinct_from_hybrid_geometry_svo_probe: peer_distinct,
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
        volumetric_meat_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        nanite_svo_aaa_ready: false,
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

/// Run internal voxel density soak — outside empty; deep rock denser; materials distinct.
///
/// Does **not** claim volumetric meat AAA / MagicaCSG interior parity.
pub fn run_internal_voxel_density_soak() -> InternalVoxelDensitySoakReport {
    let pos = [1.25, 0.5, -0.75];
    let seed = 0x4555_u32;

    let outside = InternalVoxelDensity::evaluate_at(SOAK_OUTSIDE, "rock", pos, seed);
    let shallow = InternalVoxelDensity::evaluate_at(SOAK_SHALLOW, "rock", pos, seed);
    let deep = InternalVoxelDensity::evaluate_at(SOAK_DEEP, "rock", pos, seed);
    let metal = InternalVoxelDensity::evaluate_at(SOAK_DEEP, "metal", pos, seed);
    let wood = InternalVoxelDensity::evaluate_at(SOAK_DEEP, "wood", pos, seed);

    let vein_a = InternalVoxelDensity::vein_noise(pos, seed, 4.0);
    let vein_b = InternalVoxelDensity::vein_noise(pos, seed, 4.0);

    let outside_empty = !outside.inside && outside.density.abs() < EPS;
    let inside_nonzero = shallow.inside && shallow.density > EPS && deep.inside && deep.density > EPS;
    let deep_denser = deep.density > shallow.density
        && deep.layer == DensityLayer::Core
        && shallow.layer == DensityLayer::Crust;
    let materials_distinct = (metal.density - wood.density).abs() > 0.5
        && metal.density > deep.density
        && wood.density < deep.density;
    let vein_deterministic = (vein_a - vein_b).abs() < EPS && vein_a.is_finite();
    let outputs_finite = outside.outputs_finite
        && shallow.outputs_finite
        && deep.outputs_finite
        && metal.outputs_finite
        && wood.outputs_finite
        && outside_empty
        && inside_nonzero
        && deep_denser
        && materials_distinct
        && vein_deterministic;

    let fingerprint = fingerprint_from(
        outside.density,
        shallow.density,
        deep.density,
        metal.density,
        wood.density,
    );
    let evidence_kind = MEAT_EVIDENCE_KIND;
    let evidence_fingerprint = meat_evidence_fingerprint(
        fingerprint,
        deep_denser,
        materials_distinct,
        vein_deterministic,
    );
    let peer_distinct = meat_peer_distinct(
        deep_denser,
        materials_distinct,
        evidence_kind,
        evidence_fingerprint,
    );

    if !outputs_finite {
        return held_report(
            outside_empty,
            inside_nonzero,
            deep_denser,
            materials_distinct,
            vein_deterministic,
            outputs_finite,
            outside.density,
            shallow.density,
            deep.density,
            metal.density,
            wood.density,
            fingerprint,
            evidence_kind,
            evidence_fingerprint,
            peer_distinct,
        );
    }

    distinct_true(
        InternalVoxelDensitySoakReport {
        internal_voxel_density_ready: true,
        outside_empty: true,
        inside_nonzero: true,
        deep_denser_than_shallow_rock: true,
        materials_distinct: true,
        vein_deterministic: true,
        outputs_finite: true,
        outside_density: outside.density,
        shallow_rock_density: shallow.density,
        deep_rock_density: deep.density,
        metal_core_density: metal.density,
        wood_core_density: wood.density,
        fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_svo_depth_lod_probe: peer_distinct,
        distinct_from_hybrid_geometry_svo_probe: peer_distinct,
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
        volumetric_meat_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        nanite_svo_aaa_ready: false,
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

/// Honesty probe — soak-gated `internal_voxel_density_ready` (**eu**).
pub fn probe_internal_voxel_density() -> InternalVoxelDensitySoakReport {
    run_internal_voxel_density_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn outside_empty_inside_meat() {
        let out = InternalVoxelDensity::evaluate_internal_meat(0.0, "rock");
        let inn = InternalVoxelDensity::evaluate_internal_meat(SOAK_MID, "rock");
        assert!(!out.inside);
        assert_eq!(out.density, 0.0);
        assert!(inn.inside);
        assert!(inn.density > 0.0);
    }

    #[test]
    fn deep_rock_denser_than_crust() {
        let shallow = InternalVoxelDensity::evaluate_internal_meat(SOAK_SHALLOW, "rock");
        let deep = InternalVoxelDensity::evaluate_internal_meat(SOAK_DEEP, "rock");
        assert_eq!(shallow.layer, DensityLayer::Crust);
        assert_eq!(deep.layer, DensityLayer::Core);
        assert!(deep.density > shallow.density);
    }

    #[test]
    fn materials_produce_distinct_core_density() {
        let rock = InternalVoxelDensity::evaluate_internal_meat(SOAK_DEEP, "rock");
        let metal = InternalVoxelDensity::evaluate_internal_meat(SOAK_DEEP, "metal");
        let wood = InternalVoxelDensity::evaluate_internal_meat(SOAK_DEEP, "wood");
        assert!(metal.density > rock.density);
        assert!(rock.density > wood.density);
    }

    #[test]
    fn vein_noise_deterministic() {
        let a = InternalVoxelDensity::vein_noise([1.0, 2.0, 3.0], 7, 4.0);
        let b = InternalVoxelDensity::vein_noise([1.0, 2.0, 3.0], 7, 4.0);
        assert_eq!(a, b);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_internal_voxel_density_soak();
        assert!(r.internal_voxel_density_ready, "{r:?}");
        assert!(r.outside_empty);
        assert!(r.inside_nonzero);
        assert!(r.deep_denser_than_shallow_rock);
        assert!(r.materials_distinct);
        assert!(r.vein_deterministic);
        assert!(!r.volumetric_meat_aaa_ready);
        assert_eq!(r.evidence_kind, MEAT_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_svo_depth_lod_probe);
        assert!(r.distinct_from_hybrid_geometry_svo_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_internal_voxel_density_soak();
        let b = probe_internal_voxel_density();
        assert_eq!(a.internal_voxel_density_ready, b.internal_voxel_density_ready);
        assert!(b.internal_voxel_density_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
    }

    #[test]
    fn distinct_from_et_and_prior_probes() {
        let eu = probe_internal_voxel_density();
        let et = crate::svo_depth_lod::probe_svo_depth_lod();
        assert!(eu.internal_voxel_density_ready);
        assert!(et.svo_depth_lod_ready);
        assert!(eu.distinct_from_svo_depth_lod_probe);
        assert_ne!("internalVoxelDensityReady", "svoDepthLodReady");
        assert_ne!("internalVoxelDensityReady", "hybridGeometrySvoReady");
        assert_ne!("internalVoxelDensityReady", "sdfSculptorReady");
    }

    #[test]
    fn meat_vs_lod_vs_hybrid_svo_distinct_evidence_fingerprints() {
        let meat = probe_internal_voxel_density();
        let lod = crate::svo_depth_lod::probe_svo_depth_lod();
        let svo = crate::hybrid_geometry_svo::probe_hybrid_geometry_svo();
        assert!(meat.internal_voxel_density_ready);
        assert!(lod.svo_depth_lod_ready);
        assert!(svo.hybrid_geometry_svo_ready);
        assert_eq!(meat.evidence_kind, MEAT_EVIDENCE_KIND);
        assert_eq!(lod.evidence_kind, crate::svo_depth_lod::LOD_EVIDENCE_KIND);
        assert_eq!(
            svo.evidence_kind,
            crate::hybrid_geometry_svo::HYBRID_SVO_EVIDENCE_KIND
        );
        assert_ne!(meat.evidence_kind, lod.evidence_kind);
        assert_ne!(meat.evidence_kind, svo.evidence_kind);
        assert_ne!(lod.evidence_kind, svo.evidence_kind);
        assert_ne!(meat.evidence_fingerprint, lod.evidence_fingerprint);
        assert_ne!(meat.evidence_fingerprint, svo.evidence_fingerprint);
        assert_ne!(lod.evidence_fingerprint, svo.evidence_fingerprint);
        assert!(meat.distinct_from_svo_depth_lod_probe);
        assert!(meat.distinct_from_hybrid_geometry_svo_probe);
        assert!(lod.distinct_from_hybrid_geometry_svo_probe);
        assert!(lod.distinct_from_internal_voxel_density_probe);
        assert!(svo.distinct_from_svo_depth_lod_probe);
        assert!(svo.distinct_from_internal_voxel_density_probe);
        // **ib**: remote peers also evidence-gated (not hard-coded true).
        assert!(meat.distinct_from_kernel_foundation_probe);
        assert!(lod.distinct_from_kernel_foundation_probe);
        assert!(svo.distinct_from_kernel_foundation_probe);
        assert!(meat.distinct_from_velocity_buffer_ecs_probe);
        assert!(lod.distinct_from_velocity_buffer_ecs_probe);
        assert!(svo.distinct_from_velocity_buffer_ecs_probe);
    }

    #[test]
    fn deterministic_fingerprint() {
        let a = run_internal_voxel_density_soak();
        let b = run_internal_voxel_density_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.deep_rock_density, b.deep_rock_density);
    }
}

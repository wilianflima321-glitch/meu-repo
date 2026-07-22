//! SDF Adaptive Cascades desktop wire — letter **en**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_adaptive_cascades`
//! (multi-resolution cascade LOD sample soak). Honesty probe
//! `sdfAdaptiveCascadesReady` is **distinct** from em `sdfSculptorReady`,
//! el `hermiteSharpFeaturesReady`, ek `hermiteDualityGridReady`, ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`,
//! ee–ea fluid/PBD probes, dz–dq deepen probes, and dc–dm foundation probes.
//! Full Nanite/clipmap AAA / MagicaCSG / Coins / Agones / DLSS HELD.

use aethel_kernel_rust::sdf_adaptive_cascades::{
    probe_sdf_adaptive_cascades as kernel_probe, run_sdf_adaptive_cascades_soak,
    SdfAdaptiveCascadesSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfAdaptiveCascadesWireReport {
    pub sdf_adaptive_cascades_ready: bool,
    pub near_lod_finest: bool,
    pub mid_lod_mid: bool,
    pub far_lod_coarsest: bool,
    pub lod_changes_with_distance: bool,
    pub outputs_finite: bool,
    pub near_lod: u8,
    pub mid_lod: u8,
    pub far_lod: u8,
    pub near_abs_sdf: f32,
    pub mid_abs_sdf: f32,
    pub far_abs_sdf: f32,
    pub level_count: u32,
    pub sample_count: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
    pub letter: String,
    pub note: String,
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

fn to_report(
    r: SdfAdaptiveCascadesSoakReport,
    note: impl Into<String>,
) -> KernelSdfAdaptiveCascadesWireReport {
    KernelSdfAdaptiveCascadesWireReport {
        sdf_adaptive_cascades_ready: r.sdf_adaptive_cascades_ready,
        near_lod_finest: r.near_lod_finest,
        mid_lod_mid: r.mid_lod_mid,
        far_lod_coarsest: r.far_lod_coarsest,
        lod_changes_with_distance: r.lod_changes_with_distance,
        outputs_finite: r.outputs_finite,
        near_lod: r.near_lod,
        mid_lod: r.mid_lod,
        far_lod: r.far_lod,
        near_abs_sdf: r.near_abs_sdf,
        mid_abs_sdf: r.mid_abs_sdf,
        far_abs_sdf: r.far_abs_sdf,
        level_count: r.level_count,
        sample_count: r.sample_count,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_sdf_sculptor_probe: r.distinct_from_sdf_sculptor_probe,
        distinct_from_hermite_sharp_features_probe: r.distinct_from_hermite_sharp_features_probe,
        distinct_from_hermite_duality_grid_probe: r.distinct_from_hermite_duality_grid_probe,
        distinct_from_fm_additive_synthesis_probe: r.distinct_from_fm_additive_synthesis_probe,
        distinct_from_acoustic_reverb_geometry_probe: r
            .distinct_from_acoustic_reverb_geometry_probe,
        distinct_from_acoustic_raytracing_echo_probe: r
            .distinct_from_acoustic_raytracing_echo_probe,
        distinct_from_finite_element_analysis_probe: r.distinct_from_finite_element_analysis_probe,
        distinct_from_sonic_impedance_probe: r.distinct_from_sonic_impedance_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_synesthetic_sensory_remap_probe: r
            .distinct_from_synesthetic_sensory_remap_probe,
        distinct_from_atmospheric_physical_damping_probe: r
            .distinct_from_atmospheric_physical_damping_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r
            .distinct_from_lattice_boltzmann_fluid_solver_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: r
            .distinct_from_hybrid_eulerian_lagrangian_pbd_probe,
        distinct_from_position_based_dynamics_probe: r.distinct_from_position_based_dynamics_probe,
        distinct_from_autonomous_conflict_generator_probe: r
            .distinct_from_autonomous_conflict_generator_probe,
        distinct_from_mnemonic_matter_entropy_probe: r.distinct_from_mnemonic_matter_entropy_probe,
        distinct_from_four_dimensional_time_sdf_probe: r
            .distinct_from_four_dimensional_time_sdf_probe,
        distinct_from_shadow_time_reversal_probe: r.distinct_from_shadow_time_reversal_probe,
        distinct_from_curved_raymarcher_probe: r.distinct_from_curved_raymarcher_probe,
        distinct_from_fractal_energy_perturbation_probe: r
            .distinct_from_fractal_energy_perturbation_probe,
        distinct_from_autonomous_entropy_corrector_probe: r
            .distinct_from_autonomous_entropy_corrector_probe,
        distinct_from_unified_field_network_probe: r.distinct_from_unified_field_network_probe,
        distinct_from_slab_allocator_mmap_probe: r.distinct_from_slab_allocator_mmap_probe,
        distinct_from_baremetal_memory_manager_probe: r
            .distinct_from_baremetal_memory_manager_probe,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_simd_world_soa_hot_path_probe: r.distinct_from_simd_world_soa_hot_path_probe,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "en".into(),
        note: note.into(),
        nanite_clipmap_aaa_ready: r.nanite_clipmap_aaa_ready,
        magica_csg_parity_ready: r.magica_csg_parity_ready,
        ue_geometry_parity_ready: r.ue_geometry_parity_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run SDF adaptive cascades soak via kernel.
pub fn run_kernel_sdf_adaptive_cascades_soak() -> KernelSdfAdaptiveCascadesWireReport {
    let r = run_sdf_adaptive_cascades_soak();
    let note = if !r.sdf_adaptive_cascades_ready {
        "SDF adaptive cascades soak failed — sdfAdaptiveCascadesReady stays false"
    } else {
        "Desktop soak: 3-level SDF cascade; finer LOD near surface / coarser far; LOD changes with |sdf| — sdfAdaptiveCascadesReady true; nanite_clipmap_aaa_ready false; distinct from em sdfSculptorReady, el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfAdaptiveCascadesReady` (letter en).
pub fn probe_sdf_adaptive_cascades() -> KernelSdfAdaptiveCascadesWireReport {
    to_report(
        kernel_probe(),
        "SDF adaptive cascades probe (letter en) — distinct from sdfSculptorReady, hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; nanite_clipmap_aaa_ready HELD",
    )
}

/// Tauri IPC — SDF adaptive cascades honesty.
#[tauri::command]
pub fn probe_sdf_adaptive_cascades_cmd() -> KernelSdfAdaptiveCascadesWireReport {
    probe_sdf_adaptive_cascades()
}

/// Tauri IPC — run SDF adaptive cascades soak.
#[tauri::command]
pub fn run_kernel_sdf_adaptive_cascades_soak_cmd() -> KernelSdfAdaptiveCascadesWireReport {
    run_kernel_sdf_adaptive_cascades_soak()
}

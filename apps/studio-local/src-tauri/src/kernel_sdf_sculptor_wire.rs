//! SDF Sculptor desktop wire — letter **em**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sdf_sculptor`
//! (dense SDF grid + sphere/box softmin carve/add soak). Honesty probe
//! `sdfSculptorReady` is **distinct** from el `hermiteSharpFeaturesReady`,
//! ek `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD probes, dz–dq deepen
//! probes, and dc–dm foundation probes.
//! Full MagicaCSG / UE Geometry / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::sdf_sculptor::{
    probe_sdf_sculptor as kernel_probe, run_sdf_sculptor_soak, SdfSculptorSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSdfSculptorWireReport {
    pub sdf_sculptor_ready: bool,
    pub sphere_carve_changed: bool,
    pub sphere_add_changed: bool,
    pub box_carve_changed: bool,
    pub outputs_finite: bool,
    pub max_mean_abs_delta: f32,
    pub max_touched_voxels: u32,
    pub sample_count: u32,
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
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(r: SdfSculptorSoakReport, note: impl Into<String>) -> KernelSdfSculptorWireReport {
    KernelSdfSculptorWireReport {
        sdf_sculptor_ready: r.sdf_sculptor_ready,
        sphere_carve_changed: r.sphere_carve_changed,
        sphere_add_changed: r.sphere_add_changed,
        box_carve_changed: r.box_carve_changed,
        outputs_finite: r.outputs_finite,
        max_mean_abs_delta: r.max_mean_abs_delta,
        max_touched_voxels: r.max_touched_voxels,
        sample_count: r.sample_count,
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
        letter: "em".into(),
        note: note.into(),
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

/// Run SDF sculptor soak via kernel.
pub fn run_kernel_sdf_sculptor_soak() -> KernelSdfSculptorWireReport {
    let r = run_sdf_sculptor_soak();
    let note = if !r.sdf_sculptor_ready {
        "SDF sculptor soak failed — sdfSculptorReady stays false"
    } else {
        "Desktop soak: dense SDF grid + sphere/box softmin carve/add; brush changes voxel SDF measurably — sdfSculptorReady true; magica_csg_parity_ready/ue_geometry_parity_ready false; distinct from el hermiteSharpFeaturesReady, ek hermiteDualityGridReady, ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sdfSculptorReady` (letter em).
pub fn probe_sdf_sculptor() -> KernelSdfSculptorWireReport {
    to_report(
        kernel_probe(),
        "SDF sculptor probe (letter em) — distinct from hermiteSharpFeaturesReady, hermiteDualityGridReady, fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; magica_csg_parity_ready / ue_geometry_parity_ready HELD",
    )
}

/// Tauri IPC — SDF sculptor honesty.
#[tauri::command]
pub fn probe_sdf_sculptor_cmd() -> KernelSdfSculptorWireReport {
    probe_sdf_sculptor()
}

/// Tauri IPC — run SDF sculptor soak.
#[tauri::command]
pub fn run_kernel_sdf_sculptor_soak_cmd() -> KernelSdfSculptorWireReport {
    run_kernel_sdf_sculptor_soak()
}

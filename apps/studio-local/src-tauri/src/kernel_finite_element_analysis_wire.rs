//! Finite Element Analysis desktop wire — letter **eh**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::finite_element_analysis_kernel`
//! (2D spring-truss assemble+solve soak). Honesty probe
//! `finiteElementAnalysisReady` is **distinct** from ea
//! `positionBasedDynamicsReady`, ef `acousticRaytracingEchoReady`,
//! ee–eb fluid/hybrid probes, dz–dq deepen probes, and dc–dm foundation
//! probes (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`,
//! `mmapEcsPagerReady`, `simdWorldSoaHotPathReady`, `simdClayMathReady`,
//! `worldSoaSabLayoutReady`, `kernelDesktopWireReady`,
//! `kernelMutDnaDesktopReady`, `kernelSpectralSonicDesktopReady`,
//! `probe_kernel_foundation`).
//! Full Ansys / Chaos FEA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::finite_element_analysis_kernel::{
    probe_finite_element_analysis as kernel_probe, run_finite_element_analysis_soak,
    FiniteElementAnalysisSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFiniteElementAnalysisWireReport {
    pub finite_element_analysis_ready: bool,
    pub residual_small: bool,
    pub tip_displaced: bool,
    pub free_dof_in_range: bool,
    pub stiffness_assembled: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub free_dof: usize,
    pub tip_displacement: f32,
    pub residual_norm: f32,
    pub relative_residual: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_acoustic_raytracing_echo_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
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
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub ansys_fea_parity_ready: bool,
    pub chaos_fea_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub metasounds_hrtf_aaa_ready: bool,
}

fn to_report(
    r: FiniteElementAnalysisSoakReport,
    note: impl Into<String>,
) -> KernelFiniteElementAnalysisWireReport {
    KernelFiniteElementAnalysisWireReport {
        finite_element_analysis_ready: r.finite_element_analysis_ready,
        residual_small: r.residual_small,
        tip_displaced: r.tip_displaced,
        free_dof_in_range: r.free_dof_in_range,
        stiffness_assembled: r.stiffness_assembled,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        free_dof: r.free_dof,
        tip_displacement: r.tip_displacement,
        residual_norm: r.residual_norm,
        relative_residual: r.relative_residual,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_position_based_dynamics_probe: r.distinct_from_position_based_dynamics_probe,
        distinct_from_acoustic_raytracing_echo_probe: r
            .distinct_from_acoustic_raytracing_echo_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r
            .distinct_from_lattice_boltzmann_fluid_solver_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: r
            .distinct_from_hybrid_eulerian_lagrangian_pbd_probe,
        distinct_from_atmospheric_physical_damping_probe: r
            .distinct_from_atmospheric_physical_damping_probe,
        distinct_from_autonomous_conflict_generator_probe: r
            .distinct_from_autonomous_conflict_generator_probe,
        distinct_from_synesthetic_sensory_remap_probe: r
            .distinct_from_synesthetic_sensory_remap_probe,
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
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "eh".into(),
        note: note.into(),
        ansys_fea_parity_ready: r.ansys_fea_parity_ready,
        chaos_fea_aaa_ready: r.chaos_fea_aaa_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
    }
}

/// Run finite element analysis soak via kernel.
pub fn run_kernel_finite_element_analysis_soak() -> KernelFiniteElementAnalysisWireReport {
    let r = run_finite_element_analysis_soak();
    let note = if !r.finite_element_analysis_ready {
        "Finite element analysis soak failed — finiteElementAnalysisReady stays false"
    } else {
        "Desktop soak: 2D spring-truss assemble K + dense free-DOF solve; tip displaces + residual small — finiteElementAnalysisReady true; ansys_fea_parity_ready / chaos_fea_aaa_ready false; distinct from ea positionBasedDynamicsReady, ef acousticRaytracingEchoReady, ee–eb fluid/hybrid, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `finiteElementAnalysisReady` (letter eh).
pub fn probe_finite_element_analysis() -> KernelFiniteElementAnalysisWireReport {
    to_report(
        kernel_probe(),
        "Finite element analysis probe (letter eh) — distinct from positionBasedDynamicsReady, acousticRaytracingEchoReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; ansys_fea_parity_ready / chaos_fea_aaa_ready HELD",
    )
}

/// Tauri IPC — finite element analysis honesty.
#[tauri::command]
pub fn probe_finite_element_analysis_cmd() -> KernelFiniteElementAnalysisWireReport {
    probe_finite_element_analysis()
}

/// Tauri IPC — run finite element analysis soak.
#[tauri::command]
pub fn run_kernel_finite_element_analysis_soak_cmd() -> KernelFiniteElementAnalysisWireReport {
    run_kernel_finite_element_analysis_soak()
}

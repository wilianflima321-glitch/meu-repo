//! Acoustic Raytracing Echo desktop wire — letter **ef**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::acoustic_raytracing_echo`
//! (specular/image-source echo delay+gain soak). Honesty probe
//! `acousticRaytracingEchoReady` is **distinct** from dc sonic impedance
//! `trace_acoustic_ray`, dg `kernelSpectralSonicDesktopReady`, dx
//! `synestheticSensoryRemapReady`, dz `atmosphericPhysicalDampingReady`, ee
//! `latticeBoltzmannFluidSolverReady`, ed `aerodynamicNavierStokesReady`, ec
//! `matterThermodynamicsSphReady`, eb `hybridEulerianLagrangianPbdReady`, ea
//! `positionBasedDynamicsReady`, and dc–dm foundation probes.
//! Full MetaSounds/HRTF AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::acoustic_raytracing_echo::{
    probe_acoustic_raytracing_echo as kernel_probe, run_acoustic_raytracing_echo_soak,
    AcousticRaytracingEchoSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAcousticRaytracingEchoWireReport {
    pub acoustic_raytracing_echo_ready: bool,
    pub walls_change_delay: bool,
    pub walls_change_gain: bool,
    pub vacuum_silent: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub near_delay_sec: f32,
    pub far_delay_sec: f32,
    pub high_reflect_gain: f32,
    pub low_reflect_gain: f32,
    pub vacuum_echo_gain: f32,
    pub max_delay_delta: f32,
    pub max_gain_delta: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
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
    pub metasounds_hrtf_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: AcousticRaytracingEchoSoakReport,
    note: impl Into<String>,
) -> KernelAcousticRaytracingEchoWireReport {
    KernelAcousticRaytracingEchoWireReport {
        acoustic_raytracing_echo_ready: r.acoustic_raytracing_echo_ready,
        walls_change_delay: r.walls_change_delay,
        walls_change_gain: r.walls_change_gain,
        vacuum_silent: r.vacuum_silent,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        near_delay_sec: r.near_delay_sec,
        far_delay_sec: r.far_delay_sec,
        high_reflect_gain: r.high_reflect_gain,
        low_reflect_gain: r.low_reflect_gain,
        vacuum_echo_gain: r.vacuum_echo_gain,
        max_delay_delta: r.max_delay_delta,
        max_gain_delta: r.max_gain_delta,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
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
        letter: "ef".into(),
        note: note.into(),
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run acoustic raytracing echo soak via kernel.
pub fn run_kernel_acoustic_raytracing_echo_soak() -> KernelAcousticRaytracingEchoWireReport {
    let r = run_acoustic_raytracing_echo_soak();
    let note = if !r.acoustic_raytracing_echo_ready {
        "Acoustic raytracing echo soak failed — acousticRaytracingEchoReady stays false"
    } else {
        "Desktop soak: specular/image-source echo delay+gain from wall distance/reflectivity; vacuum silent — acousticRaytracingEchoReady true; metasounds_hrtf_aaa_ready false; distinct from dc sonic impedance, dg kernelSpectralSonicDesktopReady, dx synestheticSensoryRemapReady, dz atmosphericPhysicalDampingReady, ee latticeBoltzmannFluidSolverReady, ed aerodynamicNavierStokesReady, ec matterThermodynamicsSphReady, eb hybridEulerianLagrangianPbdReady, ea positionBasedDynamicsReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `acousticRaytracingEchoReady` (letter ef).
pub fn probe_acoustic_raytracing_echo() -> KernelAcousticRaytracingEchoWireReport {
    to_report(
        kernel_probe(),
        "Acoustic raytracing echo probe (letter ef) — distinct from sonic impedance trace_acoustic_ray, kernelSpectralSonicDesktopReady, synestheticSensoryRemapReady, atmosphericPhysicalDampingReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, autonomousConflictGeneratorReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, and probe_kernel_foundation; metasounds_hrtf_aaa_ready HELD",
    )
}

/// Tauri IPC — acoustic raytracing echo honesty.
#[tauri::command]
pub fn probe_acoustic_raytracing_echo_cmd() -> KernelAcousticRaytracingEchoWireReport {
    probe_acoustic_raytracing_echo()
}

/// Tauri IPC — run acoustic raytracing echo soak.
#[tauri::command]
pub fn run_kernel_acoustic_raytracing_echo_soak_cmd() -> KernelAcousticRaytracingEchoWireReport {
    run_kernel_acoustic_raytracing_echo_soak()
}

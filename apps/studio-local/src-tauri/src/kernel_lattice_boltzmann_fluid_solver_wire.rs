//! Lattice-Boltzmann fluid solver desktop wire — letter **gw** + CW2.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::lattice_boltzmann_fluid_solver`
//! (D2Q9 bounce-back + dust/tool inject + CW2 N≥2048 cell soak). Honesty probe
//! `latticeBoltzmannFluidSolverReady` is **distinct** from dc gas
//! `lbmKernelReady`, ed `aerodynamicNavierStokesReady`, ec
//! `matterThermodynamicsSphReady`, eb `hybridEulerianLagrangianPbdReady`, ea
//! `positionBasedDynamicsReady`, dz `atmosphericPhysicalDampingReady`, dy
//! `autonomousConflictGeneratorReady`, dx `synestheticSensoryRemapReady`, dw
//! `mnemonicMatterEntropyReady`, dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`, dq
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes.
//! Full commercial LBM / Chaos fluid / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::lattice_boltzmann_fluid_solver::{
    probe_lattice_boltzmann_fluid_solver as kernel_probe,
    run_lattice_boltzmann_fluid_solver_soak, LatticeBoltzmannFluidSolverSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLatticeBoltzmannFluidSolverWireReport {
    pub lattice_boltzmann_fluid_solver_ready: bool,
    pub mass_conserved: bool,
    pub mass_drift: f64,
    pub dust_responded: bool,
    pub velocity_changed: bool,
    pub bounce_back_walls: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub cell_count: u32,
    pub mean_speed_before: f32,
    pub mean_speed_after: f32,
    pub mean_dust_before: f32,
    pub mean_dust_after: f32,
    pub max_speed: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
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
    pub distinct_from_gas_lbm_kernel_probe: bool,
    pub letter: String,
    pub note: String,
    pub full_lbm_parity_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub full_cfd_parity_ready: bool,
    pub dualsphysics_parity_ready: bool,
    pub flip_apic_parity_ready: bool,
    pub chaos_hybrid_fluid_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: LatticeBoltzmannFluidSolverSoakReport,
    note: impl Into<String>,
) -> KernelLatticeBoltzmannFluidSolverWireReport {
    KernelLatticeBoltzmannFluidSolverWireReport {
        lattice_boltzmann_fluid_solver_ready: r.lattice_boltzmann_fluid_solver_ready,
        mass_conserved: r.mass_conserved,
        mass_drift: r.mass_drift,
        dust_responded: r.dust_responded,
        velocity_changed: r.velocity_changed,
        bounce_back_walls: r.bounce_back_walls,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        cell_count: r.cell_count,
        mean_speed_before: r.mean_speed_before,
        mean_speed_after: r.mean_speed_after,
        mean_dust_before: r.mean_dust_before,
        mean_dust_after: r.mean_dust_after,
        max_speed: r.max_speed,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_aerodynamic_navier_stokes_probe: r
            .distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: r
            .distinct_from_hybrid_eulerian_lagrangian_pbd_probe,
        distinct_from_position_based_dynamics_probe: r.distinct_from_position_based_dynamics_probe,
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
        distinct_from_gas_lbm_kernel_probe: r.distinct_from_gas_lbm_kernel_probe,
        letter: "gw".into(),
        note: note.into(),
        full_lbm_parity_ready: r.full_lbm_parity_ready,
        chaos_fluid_aaa_ready: r.chaos_fluid_aaa_ready,
        full_cfd_parity_ready: r.full_cfd_parity_ready,
        dualsphysics_parity_ready: r.dualsphysics_parity_ready,
        flip_apic_parity_ready: r.flip_apic_parity_ready,
        chaos_hybrid_fluid_ready: r.chaos_hybrid_fluid_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run LBM fluid solver soak via kernel.
pub fn run_kernel_lattice_boltzmann_fluid_solver_soak() -> KernelLatticeBoltzmannFluidSolverWireReport
{
    let r = run_lattice_boltzmann_fluid_solver_soak();
    let note = if !r.lattice_boltzmann_fluid_solver_ready {
        "Lattice-Boltzmann fluid solver soak failed (CW2 N≥2048 cells / mass / dust / velocity) — latticeBoltzmannFluidSolverReady stays false; full_lbm_parity_ready / chaos_fluid_aaa_ready HELD"
    } else {
        "Desktop soak: D2Q9 bounce-back collide+stream + tool dust inject + letter gw/CW2 N≥2048 cells (46²=2116); mass conserved + dust/velocity respond — latticeBoltzmannFluidSolverReady true; full_lbm_parity_ready / chaos_fluid_aaa_ready false; distinct from dc lbmKernelReady (gas), ed aerodynamicNavierStokesReady, ec matterThermodynamicsSphReady, eb hybridEulerianLagrangianPbdReady, ea positionBasedDynamicsReady, dz atmosphericPhysicalDampingReady, dy autonomousConflictGeneratorReady, dx synestheticSensoryRemapReady, dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `latticeBoltzmannFluidSolverReady` (letter gw / CW2).
pub fn probe_lattice_boltzmann_fluid_solver() -> KernelLatticeBoltzmannFluidSolverWireReport {
    to_report(
        kernel_probe(),
        "Lattice-Boltzmann fluid solver probe (letter gw/CW2) — latticeBoltzmannFluidSolverReady (N≥2048 cells, mass conserved, dust/velocity respond, bounce-back); distinct from lbmKernelReady (gas), aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; full_lbm_parity_ready / chaos_fluid_aaa_ready HELD",
    )
}

/// Tauri IPC — LBM fluid solver honesty.
#[tauri::command]
pub fn probe_lattice_boltzmann_fluid_solver_cmd() -> KernelLatticeBoltzmannFluidSolverWireReport {
    probe_lattice_boltzmann_fluid_solver()
}

/// Tauri IPC — run LBM fluid solver soak.
#[tauri::command]
pub fn run_kernel_lattice_boltzmann_fluid_solver_soak_cmd()
-> KernelLatticeBoltzmannFluidSolverWireReport {
    run_kernel_lattice_boltzmann_fluid_solver_soak()
}

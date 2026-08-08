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
    pub distinct_from_peers_note: String,
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
        distinct_from_peers_note: r.distinct_from_peers_note,
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

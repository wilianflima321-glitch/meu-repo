//! Hermite Duality Grid desktop wire — letter **ek**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hermite_duality_grid`
//! (Hermite scalar+gradient grid + dual-contouring-lite soak). Honesty probe
//! `hermiteDualityGridReady` is **distinct** from ej
//! `fmAdditiveSynthesisReady`, ei `acousticReverbGeometryReady`, ef
//! `acousticRaytracingEchoReady`, eh `finiteElementAnalysisReady`, ee–ea
//! fluid/PBD probes, dz–dq deepen probes, and dc–dm foundation probes.
//! Full Instant Meshes / commercial remesh / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::hermite_duality_grid::{
    probe_hermite_duality_grid as kernel_probe, run_hermite_duality_grid_soak,
    HermiteDualityGridSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHermiteDualityGridWireReport {
    pub hermite_duality_grid_ready: bool,
    pub grid_samples_finite: bool,
    pub active_cells_found: bool,
    pub gradient_changes_vertex: bool,
    pub hermite_improves_residual: bool,
    pub outputs_finite: bool,
    pub active_cell_count: u32,
    pub max_vertex_delta: f32,
    pub max_residual_improvement: f32,
    pub sample_count: u32,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub instant_meshes_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: HermiteDualityGridSoakReport,
    note: impl Into<String>,
) -> KernelHermiteDualityGridWireReport {
    KernelHermiteDualityGridWireReport {
        hermite_duality_grid_ready: r.hermite_duality_grid_ready,
        grid_samples_finite: r.grid_samples_finite,
        active_cells_found: r.active_cells_found,
        gradient_changes_vertex: r.gradient_changes_vertex,
        hermite_improves_residual: r.hermite_improves_residual,
        outputs_finite: r.outputs_finite,
        active_cell_count: r.active_cell_count,
        max_vertex_delta: r.max_vertex_delta,
        max_residual_improvement: r.max_residual_improvement,
        sample_count: r.sample_count,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "ek".into(),
        note: note.into(),
        instant_meshes_parity_ready: r.instant_meshes_parity_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run Hermite duality grid soak via kernel.
pub fn run_kernel_hermite_duality_grid_soak() -> KernelHermiteDualityGridWireReport {
    let r = run_hermite_duality_grid_soak();
    let note = if !r.hermite_duality_grid_ready {
        "Hermite duality grid soak failed — hermiteDualityGridReady stays false"
    } else {
        "Desktop soak: Hermite scalar+gradient grid + dual-contouring-lite QEF; gradient changes vertex vs scalar-only + residual improves — hermiteDualityGridReady true; instant_meshes_parity_ready false; distinct from ej fmAdditiveSynthesisReady, ei acousticReverbGeometryReady, ef acousticRaytracingEchoReady, eh finiteElementAnalysisReady, ee–ea fluid/PBD, dz–dq deepen, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hermiteDualityGridReady` (letter ek).
pub fn probe_hermite_duality_grid() -> KernelHermiteDualityGridWireReport {
    to_report(
        kernel_probe(),
        "Hermite duality grid probe (letter ek) — distinct from fmAdditiveSynthesisReady, acousticReverbGeometryReady, acousticRaytracingEchoReady, finiteElementAnalysisReady, latticeBoltzmannFluidSolverReady, aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; instant_meshes_parity_ready HELD",
    )
}

/// Tauri IPC — Hermite duality grid honesty.
#[tauri::command]
pub fn probe_hermite_duality_grid_cmd() -> KernelHermiteDualityGridWireReport {
    probe_hermite_duality_grid()
}

/// Tauri IPC — run Hermite duality grid soak.
#[tauri::command]
pub fn run_kernel_hermite_duality_grid_soak_cmd() -> KernelHermiteDualityGridWireReport {
    run_kernel_hermite_duality_grid_soak()
}

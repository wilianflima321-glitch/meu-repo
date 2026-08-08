//! Lattice-Boltzmann gas fluid kernel desktop wire — letter **gx**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::lattice_boltzmann_gas_fluid`.
//! Probe `latticeBoltzmannGasFluidReady` is distinct.

use aethel_kernel_rust::lattice_boltzmann_gas_fluid::{
    probe_lattice_boltzmann_gas_fluid as kernel_probe,
    run_lattice_boltzmann_gas_fluid_soak, LatticeBoltzmannGasFluidSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLatticeBoltzmannGasFluidWireReport {
    pub lattice_boltzmann_gas_fluid_ready: bool,
    pub mass_conserved: bool,
    pub mass_drift: f64,
    pub temperature_diffused: bool,
    pub velocity_affected_by_temp: bool,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
}

fn to_report(
    r: LatticeBoltzmannGasFluidSoakReport,
    note: impl Into<String>,
) -> KernelLatticeBoltzmannGasFluidWireReport {
    KernelLatticeBoltzmannGasFluidWireReport {
        lattice_boltzmann_gas_fluid_ready: r.lattice_boltzmann_gas_fluid_ready,
        mass_conserved: r.mass_conserved,
        mass_drift: r.mass_drift,
        temperature_diffused: r.temperature_diffused,
        velocity_affected_by_temp: r.velocity_affected_by_temp,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "gx".into(),
        note: note.into(),
    }
}

/// Run LBM gas fluid soak via kernel.
pub fn run_kernel_lattice_boltzmann_gas_fluid_soak() -> KernelLatticeBoltzmannGasFluidWireReport {
    let r = run_lattice_boltzmann_gas_fluid_soak();
    let note = if !r.lattice_boltzmann_gas_fluid_ready {
        "Lattice-Boltzmann gas fluid soak failed — latticeBoltzmannGasFluidReady stays false"
    } else {
        "Desktop soak: D2Q9 thermodynamic coupling with ideal gas law lite; mass conserved + temperature diffuses + buoyancy affects velocity — latticeBoltzmannGasFluidReady true; distinct from aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `latticeBoltzmannGasFluidReady` (letter gx).
pub fn probe_lattice_boltzmann_gas_fluid() -> KernelLatticeBoltzmannGasFluidWireReport {
    to_report(
        kernel_probe(),
        "Lattice-Boltzmann gas fluid probe (letter gx) — distinct from aerodynamicNavierStokesReady, matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady",
    )
}

/// Tauri IPC — LBM gas fluid honesty.
#[tauri::command]
pub fn probe_lattice_boltzmann_gas_fluid_cmd() -> KernelLatticeBoltzmannGasFluidWireReport {
    probe_lattice_boltzmann_gas_fluid()
}

/// Tauri IPC — run LBM gas fluid soak.
#[tauri::command]
pub fn run_kernel_lattice_boltzmann_gas_fluid_soak_cmd() -> KernelLatticeBoltzmannGasFluidWireReport {
    run_kernel_lattice_boltzmann_gas_fluid_soak()
}

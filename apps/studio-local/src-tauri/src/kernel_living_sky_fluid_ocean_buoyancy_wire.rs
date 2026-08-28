//! R9 — Living-Sky Fluid + Ocean Buoyancy parity wire (S-25, letter jy).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::living_sky_fluid_ocean_buoyancy`]
//! — o acoplamento bidirecional céu/oceano (grid espectral de ondas 32×16 =
//! 512 pontos sobre `[0, 100]²`, grid de vento NS 16×16, Archimedes buoyancy
//! com densidade da água do mar, advecção de slope, drag aerodinâmico
//! quadrático e wakes bidirecionais corpo→oceano + corpo→vento) — expondo o
//! soak **fail-closed** na superfície IPC desktop. A wire espelha o report
//! completo do substrato e adiciona `wire_on_surface` (self-check do registro
//! ACL). Feed honesto do S-register S-25 — nunca afirma prontidão full-SPH /
//! GPU / full-spectrum FFT / Chaos / live-surface / neural physics (flags HELD
//! no kernel, espelhadas aqui).

use aethel_kernel_rust::living_sky_fluid_ocean_buoyancy::{
    probe_living_sky, run_living_sky_soak, LivingSkySoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Living-Sky — espelho camelCase do `LivingSkySoakReport` do
/// kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLivingSkyFluidOceanBuoyancyWireReport {
    pub living_sky_ready: bool,
    pub heavy_body_sinks: bool,
    pub light_body_floats: bool,
    pub body_rides_waves: bool,
    pub wind_drag_changes_trajectory: bool,
    pub ocean_wake_written: bool,
    pub wind_wake_written: bool,
    pub bidirectional_coupling: bool,
    pub deterministic_replay: bool,
    pub bodies_coupled: u32,
    pub max_buoyancy_accel: f32,
    pub mean_surface_height: f32,
    pub soak_steps: u32,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_procedural_muscle_locomotion_probe: bool,
    pub distinct_from_ocean_fourier_spectral_waves_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub full_sph_ocean_ready: bool,
    pub gpu_ocean_ready: bool,
    pub full_spectrum_fft_ready: bool,
    pub chaos_ocean_aaa_ready: bool,
    pub live_water_surface_ready: bool,
    pub neural_physics_aaa_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(r: LivingSkySoakReport, wire_on_surface: bool) -> KernelLivingSkyFluidOceanBuoyancyWireReport {
    KernelLivingSkyFluidOceanBuoyancyWireReport {
        living_sky_ready: r.living_sky_ready,
        heavy_body_sinks: r.heavy_body_sinks,
        light_body_floats: r.light_body_floats,
        body_rides_waves: r.body_rides_waves,
        wind_drag_changes_trajectory: r.wind_drag_changes_trajectory,
        ocean_wake_written: r.ocean_wake_written,
        wind_wake_written: r.wind_wake_written,
        bidirectional_coupling: r.bidirectional_coupling,
        deterministic_replay: r.deterministic_replay,
        bodies_coupled: r.bodies_coupled,
        max_buoyancy_accel: r.max_buoyancy_accel,
        mean_surface_height: r.mean_surface_height,
        soak_steps: r.soak_steps,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_procedural_muscle_locomotion_probe: r.distinct_from_procedural_muscle_locomotion_probe,
        distinct_from_ocean_fourier_spectral_waves_probe: r.distinct_from_ocean_fourier_spectral_waves_probe,
        distinct_from_aerodynamic_navier_stokes_probe: r.distinct_from_aerodynamic_navier_stokes_probe,
        distinct_from_matter_thermodynamics_sph_probe: r.distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_lattice_boltzmann_fluid_solver_probe: r.distinct_from_lattice_boltzmann_fluid_solver_probe,
        full_sph_ocean_ready: r.full_sph_ocean_ready,
        gpu_ocean_ready: r.gpu_ocean_ready,
        full_spectrum_fft_ready: r.full_spectrum_fft_ready,
        chaos_ocean_aaa_ready: r.chaos_ocean_aaa_ready,
        live_water_surface_ready: r.live_water_surface_ready,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R9 Living-Sky Fluid + Ocean Buoyancy (letter jy).
///
/// Roda o soak unificado do kernel (Archimedes + wave riding + wind drag +
/// wakes bidirecionais) e reporta a paridade completa. A wire também se
/// auto-verifica: `wire_on_surface` é `true` apenas quando os dois comandos
/// (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_living_sky_fluid_ocean_buoyancy_wire() -> KernelLivingSkyFluidOceanBuoyancyWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_living_sky_fluid_ocean_buoyancy_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_living_sky_fluid_ocean_buoyancy_soak_cmd")
                .is_some();
    to_report(probe_living_sky(), wire_on_surface)
}

/// Tauri IPC — R9 Living-Sky probe.
#[tauri::command]
pub fn probe_living_sky_fluid_ocean_buoyancy_cmd() -> KernelLivingSkyFluidOceanBuoyancyWireReport {
    probe_living_sky_fluid_ocean_buoyancy_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLivingSkyFluidOceanBuoyancySoakWireReport {
    pub living_sky_ready: bool,
    pub bidirectional_coupling: bool,
    pub deterministic_replay: bool,
    pub bodies_coupled: u32,
    pub max_buoyancy_accel: f32,
    pub mean_surface_height: f32,
    pub soak_steps: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub full_sph_ocean_ready: bool,
    pub gpu_ocean_ready: bool,
    pub full_spectrum_fft_ready: bool,
    pub chaos_ocean_aaa_ready: bool,
    pub live_water_surface_ready: bool,
    pub neural_physics_aaa_ready: bool,
}

fn soak_to_wire(r: LivingSkySoakReport) -> KernelLivingSkyFluidOceanBuoyancySoakWireReport {
    KernelLivingSkyFluidOceanBuoyancySoakWireReport {
        living_sky_ready: r.living_sky_ready,
        bidirectional_coupling: r.bidirectional_coupling,
        deterministic_replay: r.deterministic_replay,
        bodies_coupled: r.bodies_coupled,
        max_buoyancy_accel: r.max_buoyancy_accel,
        mean_surface_height: r.mean_surface_height,
        soak_steps: r.soak_steps,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        full_sph_ocean_ready: r.full_sph_ocean_ready,
        gpu_ocean_ready: r.gpu_ocean_ready,
        full_spectrum_fft_ready: r.full_spectrum_fft_ready,
        chaos_ocean_aaa_ready: r.chaos_ocean_aaa_ready,
        live_water_surface_ready: r.live_water_surface_ready,
        neural_physics_aaa_ready: r.neural_physics_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Living-Sky (mesma evidência medida
/// do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_living_sky_fluid_ocean_buoyancy_soak_cmd(
) -> KernelLivingSkyFluidOceanBuoyancySoakWireReport {
    soak_to_wire(run_living_sky_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_sky_honestly() {
        let r = probe_living_sky_fluid_ocean_buoyancy_wire();
        // Soak unificado green: Archimedes + wave riding + drag + wakes.
        assert!(r.living_sky_ready);
        assert!(r.heavy_body_sinks);
        assert!(r.light_body_floats);
        assert!(r.body_rides_waves);
        assert!(r.wind_drag_changes_trajectory);
        assert!(r.ocean_wake_written);
        assert!(r.wind_wake_written);
        assert!(r.bidirectional_coupling);
        assert!(r.deterministic_replay);
        // Accounting do soak: 600 steps @ 1/60 s = 10 s, 4 corpos acoplados.
        assert_eq!(r.soak_steps, 600);
        assert_eq!(r.bodies_coupled, 4);
        assert!(r.max_buoyancy_accel > 0.0);
        assert!(r.mean_surface_height.is_finite());
        assert_eq!(r.evidence_kind, "living_sky_spectral_ocean_buoyancy_wake");
        assert_ne!(r.evidence_fingerprint, 0);
        // Auto-referencial: a própria wire R9 está registrada na superfície.
        assert!(r.wire_on_surface);
        // Evidência distinta das sondas dos substratos (anti-tautologia).
        assert!(r.distinct_from_procedural_muscle_locomotion_probe);
        assert!(r.distinct_from_ocean_fourier_spectral_waves_probe);
        assert!(r.distinct_from_aerodynamic_navier_stokes_probe);
        assert!(r.distinct_from_matter_thermodynamics_sph_probe);
        assert!(r.distinct_from_lattice_boltzmann_fluid_solver_probe);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_living_sky_fluid_ocean_buoyancy_wire();
        assert!(
            !r.full_sph_ocean_ready,
            "honest wire must never claim full-SPH ocean AAA readiness"
        );
        assert!(
            !r.gpu_ocean_ready,
            "honest wire must never claim GPU ocean readiness"
        );
        assert!(
            !r.full_spectrum_fft_ready,
            "honest wire must never claim full-spectrum FFT readiness"
        );
        assert!(
            !r.chaos_ocean_aaa_ready,
            "honest wire must never claim Chaos ocean AAA readiness"
        );
        assert!(
            !r.live_water_surface_ready,
            "honest wire must never claim live water surface readiness"
        );
        assert!(
            !r.neural_physics_aaa_ready,
            "honest wire must never claim neural physics AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::living_sky_fluid_ocean_buoyancy::run_living_sky_soak(),
        );
        assert!(w.living_sky_ready);
        assert!(w.bidirectional_coupling);
        assert!(w.deterministic_replay);
        assert_eq!(w.bodies_coupled, 4);
        assert_eq!(w.soak_steps, 600);
        assert_eq!(w.evidence_kind, "living_sky_spectral_ocean_buoyancy_wake");
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.full_sph_ocean_ready
                && !w.gpu_ocean_ready
                && !w.full_spectrum_fft_ready
                && !w.chaos_ocean_aaa_ready
                && !w.live_water_surface_ready
                && !w.neural_physics_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_living_sky_fluid_ocean_buoyancy_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

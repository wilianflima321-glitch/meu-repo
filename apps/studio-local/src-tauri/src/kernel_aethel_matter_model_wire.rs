//! R8 — Aethel Matter Model parity wire (S-23, letter jv).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::aethel_matter_model`]
//! — o modelo unificado de matéria fase-consciente (SPH melt/flow, LBM gas
//! buoyancy, XPBD solid/soft, FEA stress, Voronoi fracture → Rapier debris)
//! com histerese direcional (soften 300 / melt 340 / boil 440.5 / hyst 0.5) —
//! expondo o soak **fail-closed** de transições de fase + roteamento de
//! solvers + cadeia de fratura na superfície IPC desktop. A wire espelha o
//! report completo do substrato e adiciona `wire_on_surface` (self-check do
//! registro ACL). Feed honesto do S-register S-23 — nunca afirma prontidão
//! Chaos/phase-field/MD/GPU AAA (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::aethel_matter_model::{
    probe_aethel_matter_model, run_aethel_matter_model_soak, AethelMatterModelSoakReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do modelo de matéria — espelho camelCase do
/// `AethelMatterModelSoakReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAethelMatterModelWireReport {
    pub aethel_matter_model_ready: bool,
    pub phase_transitions_ready: bool,
    pub solver_routing_ready: bool,
    pub fracture_debris_ready: bool,
    pub did_soften: bool,
    pub did_melt: bool,
    pub did_boil: bool,
    pub did_condense: bool,
    pub did_freeze: bool,
    pub soften_step: Option<u32>,
    pub melt_step: Option<u32>,
    pub boil_step: Option<u32>,
    pub condense_step: Option<u32>,
    pub freeze_step: Option<u32>,
    pub gas_temp_first: f32,
    pub gas_temp_max: f32,
    pub gas_temp_rose: bool,
    pub gas_condense_step: Option<u32>,
    pub gas_freeze_step: Option<u32>,
    pub gas_phase_seen: bool,
    pub sph_fluid_stepped: bool,
    pub gas_stepped: bool,
    pub xpbd_solid_stepped: bool,
    pub sph_density_delta: f32,
    pub sph_mass_drift: f32,
    pub gas_mass_drift: f64,
    pub gas_buoyancy: bool,
    pub xpbd_projected: bool,
    pub fea_solved: bool,
    pub fea_tip_displacement: f32,
    pub fea_failure_proxy: f32,
    pub fracture_fragments: u32,
    pub debris_bodies_spawned: u32,
    pub debris_mass_conserved: bool,
    pub debris_moved: bool,
    pub debris_ticks: u32,
    pub deterministic_replay: bool,
    pub body_count: u32,
    pub soak_steps: u32,
    pub mean_temperature: f32,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_physics_world_probe: bool,
    pub distinct_from_entropy_rapier_bridge_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_lattice_boltzmann_gas_fluid_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_voronoi_destruction_3d_probe: bool,
    pub chaos_matter_aaa_ready: bool,
    pub phase_field_full_aaa_ready: bool,
    pub molecular_dynamics_aaa_ready: bool,
    pub unified_matter_gpu_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(r: AethelMatterModelSoakReport, wire_on_surface: bool) -> KernelAethelMatterModelWireReport {
    KernelAethelMatterModelWireReport {
        aethel_matter_model_ready: r.aethel_matter_model_ready,
        phase_transitions_ready: r.phase_transitions_ready,
        solver_routing_ready: r.solver_routing_ready,
        fracture_debris_ready: r.fracture_debris_ready,
        did_soften: r.did_soften,
        did_melt: r.did_melt,
        did_boil: r.did_boil,
        did_condense: r.did_condense,
        did_freeze: r.did_freeze,
        soften_step: r.soften_step,
        melt_step: r.melt_step,
        boil_step: r.boil_step,
        condense_step: r.condense_step,
        freeze_step: r.freeze_step,
        gas_temp_first: r.gas_temp_first,
        gas_temp_max: r.gas_temp_max,
        gas_temp_rose: r.gas_temp_rose,
        gas_condense_step: r.gas_condense_step,
        gas_freeze_step: r.gas_freeze_step,
        gas_phase_seen: r.gas_phase_seen,
        sph_fluid_stepped: r.sph_fluid_stepped,
        gas_stepped: r.gas_stepped,
        xpbd_solid_stepped: r.xpbd_solid_stepped,
        sph_density_delta: r.sph_density_delta,
        sph_mass_drift: r.sph_mass_drift,
        gas_mass_drift: r.gas_mass_drift,
        gas_buoyancy: r.gas_buoyancy,
        xpbd_projected: r.xpbd_projected,
        fea_solved: r.fea_solved,
        fea_tip_displacement: r.fea_tip_displacement,
        fea_failure_proxy: r.fea_failure_proxy,
        fracture_fragments: r.fracture_fragments,
        debris_bodies_spawned: r.debris_bodies_spawned,
        debris_mass_conserved: r.debris_mass_conserved,
        debris_moved: r.debris_moved,
        debris_ticks: r.debris_ticks,
        deterministic_replay: r.deterministic_replay,
        body_count: r.body_count,
        soak_steps: r.soak_steps,
        mean_temperature: r.mean_temperature,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_physics_world_probe: r.distinct_from_physics_world_probe,
        distinct_from_entropy_rapier_bridge_probe: r.distinct_from_entropy_rapier_bridge_probe,
        distinct_from_matter_thermodynamics_sph_probe: r.distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_lattice_boltzmann_gas_fluid_probe: r.distinct_from_lattice_boltzmann_gas_fluid_probe,
        distinct_from_position_based_dynamics_probe: r.distinct_from_position_based_dynamics_probe,
        distinct_from_finite_element_analysis_probe: r.distinct_from_finite_element_analysis_probe,
        distinct_from_voronoi_destruction_3d_probe: r.distinct_from_voronoi_destruction_3d_probe,
        chaos_matter_aaa_ready: r.chaos_matter_aaa_ready,
        phase_field_full_aaa_ready: r.phase_field_full_aaa_ready,
        molecular_dynamics_aaa_ready: r.molecular_dynamics_aaa_ready,
        unified_matter_gpu_ready: r.unified_matter_gpu_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R8 Aethel Matter Model (letter jv).
///
/// Roda o soak unificado do kernel (transições de fase + roteamento de
/// solvers + cadeia de fratura) e reporta a paridade completa. A wire também
/// se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_aethel_matter_model_wire() -> KernelAethelMatterModelWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_aethel_matter_model_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_aethel_matter_model_soak_cmd").is_some();
    to_report(probe_aethel_matter_model(), wire_on_surface)
}

/// Tauri IPC — R8 Aethel Matter Model probe.
#[tauri::command]
pub fn probe_aethel_matter_model_cmd() -> KernelAethelMatterModelWireReport {
    probe_aethel_matter_model_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAethelMatterModelSoakWireReport {
    pub aethel_matter_model_ready: bool,
    pub phase_transitions_ready: bool,
    pub solver_routing_ready: bool,
    pub fracture_debris_ready: bool,
    pub deterministic_replay: bool,
    pub fracture_fragments: u32,
    pub debris_bodies_spawned: u32,
    pub debris_ticks: u32,
    pub body_count: u32,
    pub soak_steps: u32,
    pub mean_temperature: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub chaos_matter_aaa_ready: bool,
    pub phase_field_full_aaa_ready: bool,
    pub molecular_dynamics_aaa_ready: bool,
    pub unified_matter_gpu_ready: bool,
}

fn soak_to_wire(r: AethelMatterModelSoakReport) -> KernelAethelMatterModelSoakWireReport {
    KernelAethelMatterModelSoakWireReport {
        aethel_matter_model_ready: r.aethel_matter_model_ready,
        phase_transitions_ready: r.phase_transitions_ready,
        solver_routing_ready: r.solver_routing_ready,
        fracture_debris_ready: r.fracture_debris_ready,
        deterministic_replay: r.deterministic_replay,
        fracture_fragments: r.fracture_fragments,
        debris_bodies_spawned: r.debris_bodies_spawned,
        debris_ticks: r.debris_ticks,
        body_count: r.body_count,
        soak_steps: r.soak_steps,
        mean_temperature: r.mean_temperature,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        chaos_matter_aaa_ready: r.chaos_matter_aaa_ready,
        phase_field_full_aaa_ready: r.phase_field_full_aaa_ready,
        molecular_dynamics_aaa_ready: r.molecular_dynamics_aaa_ready,
        unified_matter_gpu_ready: r.unified_matter_gpu_ready,
    }
}

/// Tauri IPC — deterministic soak replay do modelo de matéria (mesma evidência
/// medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_aethel_matter_model_soak_cmd() -> KernelAethelMatterModelSoakWireReport {
    soak_to_wire(run_aethel_matter_model_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_matter_honestly() {
        let r = probe_aethel_matter_model_wire();
        // Soak unificado green: transições de fase + roteamento + fratura.
        assert!(r.aethel_matter_model_ready);
        assert!(r.phase_transitions_ready);
        assert!(r.solver_routing_ready);
        assert!(r.fracture_debris_ready);
        assert!(r.deterministic_replay);
        // Histerese direcional — steps exatos validados no substrato.
        assert_eq!(r.soften_step, Some(24));
        assert_eq!(r.melt_step, Some(12));
        assert_eq!(r.boil_step, Some(26));
        assert_eq!(r.condense_step, Some(3));
        assert_eq!(r.freeze_step, Some(9));
        // Gas telemetry (corpo 6: 395 → 450 K) e roteamento de solvers.
        assert!((r.gas_temp_first - 395.0).abs() < 1e-3);
        assert!((r.gas_temp_max - 450.0).abs() < 1e-3);
        assert!(r.gas_temp_rose);
        assert!(r.sph_fluid_stepped);
        assert!(r.gas_stepped);
        assert!(r.xpbd_solid_stepped);
        assert!(r.gas_buoyancy);
        assert!(r.xpbd_projected);
        assert!(r.fea_solved);
        assert!(r.sph_density_delta > 0.0);
        assert!(r.sph_mass_drift < 1e-3);
        assert!(r.gas_mass_drift < 1e-3);
        // Cadeia de fratura: Voronoi 5³ → 125 debris em Rapier, 45 ticks.
        assert_eq!(r.fracture_fragments, 125);
        assert_eq!(r.debris_bodies_spawned, 125);
        assert!(r.debris_mass_conserved);
        assert!(r.debris_moved);
        assert_eq!(r.debris_ticks, 45);
        // Accounting do soak.
        assert_eq!(r.body_count, 6);
        assert_eq!(r.soak_steps, 49);
        assert_eq!(r.evidence_kind, "aethel_matter_model_phase_solver_fracture");
        assert_ne!(r.evidence_fingerprint, 0);
        // Auto-referencial: a própria wire R8 está registrada na superfície.
        assert!(r.wire_on_surface);
        // Evidência distinta das sondas dos substratos (anti-tautologia).
        assert!(r.distinct_from_physics_world_probe);
        assert!(r.distinct_from_entropy_rapier_bridge_probe);
        assert!(r.distinct_from_matter_thermodynamics_sph_probe);
        assert!(r.distinct_from_lattice_boltzmann_gas_fluid_probe);
        assert!(r.distinct_from_position_based_dynamics_probe);
        assert!(r.distinct_from_finite_element_analysis_probe);
        assert!(r.distinct_from_voronoi_destruction_3d_probe);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_aethel_matter_model_wire();
        assert!(
            !r.chaos_matter_aaa_ready,
            "honest wire must never claim Chaos matter AAA readiness"
        );
        assert!(
            !r.phase_field_full_aaa_ready,
            "honest wire must never claim phase-field AAA readiness"
        );
        assert!(
            !r.molecular_dynamics_aaa_ready,
            "honest wire must never claim molecular-dynamics AAA readiness"
        );
        assert!(
            !r.unified_matter_gpu_ready,
            "honest wire must never claim unified-matter GPU readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(aethel_kernel_rust::aethel_matter_model::run_aethel_matter_model_soak());
        assert!(w.aethel_matter_model_ready);
        assert!(w.phase_transitions_ready);
        assert!(w.solver_routing_ready);
        assert!(w.fracture_debris_ready);
        assert_eq!(w.fracture_fragments, 125);
        assert_eq!(w.debris_bodies_spawned, 125);
        assert_eq!(w.debris_ticks, 45);
        assert_eq!(w.body_count, 6);
        assert_eq!(w.soak_steps, 49);
        assert_eq!(w.evidence_kind, "aethel_matter_model_phase_solver_fracture");
        assert!(
            !w.chaos_matter_aaa_ready
                && !w.phase_field_full_aaa_ready
                && !w.molecular_dynamics_aaa_ready
                && !w.unified_matter_gpu_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_aethel_matter_model_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

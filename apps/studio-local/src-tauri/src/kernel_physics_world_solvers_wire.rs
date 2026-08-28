//! R4 — PhysicsWorld solver-bank parity wire (S-17, letter s17).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::physics_world_solvers`]
//! (oito solvers — PBD/XPBD/SPH/SPH-hash/FEA/NS/LBM/softbody) sob o
//! `SimulationClock` 240 Hz compartilhado, expondo o soak **fail-closed** de
//! paridade golden×live na superfície IPC desktop. Cada row reporta
//! `golden_fingerprint` (substrato) vs `live_fingerprint` (estado clocked) com
//! `parity_holds` bit-identical. Feed honesto do S-register S-17 — nunca afirma
//! prontidão Chaos/GGPO/Euphoria AAA (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::physics_world_solvers::{
    probe_physics_world_solvers, run_physics_world_solvers_soak, PhysicsWorldSolversSoakReport,
    SolverParity, SolverKind,
};
use serde::{Deserialize, Serialize};

/// camelCase tag de [`SolverKind`] (espelho do `#[serde(rename_all = "camelCase")]`).
fn solver_kind_tag(k: SolverKind) -> String {
    match k {
        SolverKind::Pbd => "pbd".to_string(),
        SolverKind::Xpbd => "xpbd".to_string(),
        SolverKind::Sph => "sph".to_string(),
        SolverKind::SphHash => "sphHash".to_string(),
        SolverKind::Fea => "fea".to_string(),
        SolverKind::NavierStokes => "navierStokes".to_string(),
        SolverKind::LatticeBoltzmann => "latticeBoltzmann".to_string(),
        SolverKind::Softbody => "softbody".to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSolverParityRowReport {
    pub kind: String,
    pub golden_fingerprint: u64,
    pub live_fingerprint: u64,
    pub parity_holds: bool,
    pub golden_ready: bool,
    pub live_frames: u64,
    pub live_substeps: u64,
}

impl From<&SolverParity> for KernelSolverParityRowReport {
    fn from(p: &SolverParity) -> Self {
        Self {
            kind: solver_kind_tag(p.kind),
            golden_fingerprint: p.golden_fingerprint,
            live_fingerprint: p.live_fingerprint,
            parity_holds: p.parity_holds,
            golden_ready: p.golden_ready,
            live_frames: p.live_frames,
            live_substeps: p.live_substeps,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelPhysicsWorldSolversWireReport {
    pub physics_world_solvers_parity_ready: bool,
    pub pbd_wired_ready: bool,
    pub xpbd_wired_ready: bool,
    pub sph_wired_ready: bool,
    pub sph_hash_wired_ready: bool,
    pub fea_wired_ready: bool,
    pub navier_stokes_wired_ready: bool,
    pub lattice_boltzmann_wired_ready: bool,
    pub softbody_wired_ready: bool,
    pub solvers_parity_count: u32,
    pub solvers_total_count: u32,
    pub clock_frames: u64,
    pub clock_substeps: u64,
    pub clock_effective_hz: f32,
    pub fingerprint: u64,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub parity_rows: Vec<KernelSolverParityRowReport>,
    pub distinct_from_physics_world_authority_probe: bool,
    pub distinct_from_pbd_probe: bool,
    pub distinct_from_sph_probe: bool,
    pub distinct_from_fea_probe: bool,
    pub distinct_from_navier_stokes_probe: bool,
    pub distinct_from_lbm_probe: bool,
    pub distinct_from_softbody_probe: bool,
    pub chaos_physics_aaa_ready: bool,
    pub ggpo_live_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub physics_gas_duplex_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: PhysicsWorldSolversSoakReport,
    wire_on_surface: bool,
) -> KernelPhysicsWorldSolversWireReport {
    KernelPhysicsWorldSolversWireReport {
        physics_world_solvers_parity_ready: r.physics_world_solvers_parity_ready,
        pbd_wired_ready: r.pbd_wired_ready,
        xpbd_wired_ready: r.xpbd_wired_ready,
        sph_wired_ready: r.sph_wired_ready,
        sph_hash_wired_ready: r.sph_hash_wired_ready,
        fea_wired_ready: r.fea_wired_ready,
        navier_stokes_wired_ready: r.navier_stokes_wired_ready,
        lattice_boltzmann_wired_ready: r.lattice_boltzmann_wired_ready,
        softbody_wired_ready: r.softbody_wired_ready,
        solvers_parity_count: r.solvers_parity_count,
        solvers_total_count: r.solvers_total_count,
        clock_frames: r.clock_frames,
        clock_substeps: r.clock_substeps,
        clock_effective_hz: r.clock_effective_hz,
        fingerprint: r.fingerprint,
        soak_elapsed_ns: r.soak_elapsed_ns,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        parity_rows: r.parity_rows.iter().map(KernelSolverParityRowReport::from).collect(),
        distinct_from_physics_world_authority_probe: r.distinct_from_physics_world_authority_probe,
        distinct_from_pbd_probe: r.distinct_from_pbd_probe,
        distinct_from_sph_probe: r.distinct_from_sph_probe,
        distinct_from_fea_probe: r.distinct_from_fea_probe,
        distinct_from_navier_stokes_probe: r.distinct_from_navier_stokes_probe,
        distinct_from_lbm_probe: r.distinct_from_lbm_probe,
        distinct_from_softbody_probe: r.distinct_from_softbody_probe,
        chaos_physics_aaa_ready: r.chaos_physics_aaa_ready,
        ggpo_live_ready: r.ggpo_live_ready,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        physics_gas_duplex_ready: r.physics_gas_duplex_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 solver-bank parity (letter s17).
///
/// Roda o soak completo do banco no kernel e reporta a paridade golden×live
/// dos oito solvers sob o `SimulationClock` 240 Hz. A wire também se
/// auto-verifica: `wire_on_surface` é `true` apenas quando os dois comandos
/// (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_physics_world_solvers_wire() -> KernelPhysicsWorldSolversWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_physics_world_solvers_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_physics_world_solvers_soak_cmd").is_some();
    to_report(probe_physics_world_solvers(), wire_on_surface)
}

/// Tauri IPC — R4 solver-bank parity probe.
#[tauri::command]
pub fn probe_physics_world_solvers_cmd() -> KernelPhysicsWorldSolversWireReport {
    probe_physics_world_solvers_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelPhysicsWorldSolversSoakWireReport {
    pub physics_world_solvers_parity_ready: bool,
    pub solvers_parity_count: u32,
    pub solvers_total_count: u32,
    pub clock_frames: u64,
    pub clock_substeps: u64,
    pub clock_effective_hz: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub parity_rows: Vec<KernelSolverParityRowReport>,
    pub chaos_physics_aaa_ready: bool,
    pub ggpo_live_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub physics_gas_duplex_ready: bool,
}

fn soak_to_wire(r: PhysicsWorldSolversSoakReport) -> KernelPhysicsWorldSolversSoakWireReport {
    KernelPhysicsWorldSolversSoakWireReport {
        physics_world_solvers_parity_ready: r.physics_world_solvers_parity_ready,
        solvers_parity_count: r.solvers_parity_count,
        solvers_total_count: r.solvers_total_count,
        clock_frames: r.clock_frames,
        clock_substeps: r.clock_substeps,
        clock_effective_hz: r.clock_effective_hz,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        parity_rows: r.parity_rows.iter().map(KernelSolverParityRowReport::from).collect(),
        chaos_physics_aaa_ready: r.chaos_physics_aaa_ready,
        ggpo_live_ready: r.ggpo_live_ready,
        euphoria_full_aaa_ready: r.euphoria_full_aaa_ready,
        physics_gas_duplex_ready: r.physics_gas_duplex_ready,
    }
}

/// Tauri IPC — deterministic soak replay do banco de solvers (mesma evidência
/// medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_physics_world_solvers_soak_cmd() -> KernelPhysicsWorldSolversSoakWireReport {
    soak_to_wire(run_physics_world_solvers_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_parity_honestly() {
        let r = probe_physics_world_solvers_wire();
        // Banco completo com os oito solvers em paridade bit-identical.
        assert!(r.physics_world_solvers_parity_ready);
        assert_eq!(r.solvers_parity_count, 8);
        assert_eq!(r.solvers_total_count, 8);
        assert_eq!(r.parity_rows.len(), 8);
        // Toda row com paridade válida e substrate ready. As rows 0..7 (PBD..
        // LBM) têm fingerprint golden==live não-nulo (paridade bit-identical);
        // a row 7 (softbody) é probe-determinism only — sem clock e sem
        // fingerprint (golden==live==0), mas com parity_holds via determinismo.
        for (i, row) in r.parity_rows.iter().enumerate() {
            assert!(row.parity_holds);
            assert!(row.golden_ready);
            if i < 7 {
                assert!(row.golden_fingerprint != 0);
                assert!(row.live_fingerprint != 0);
                assert_eq!(row.golden_fingerprint, row.live_fingerprint);
            } else {
                assert_eq!(row.golden_fingerprint, 0);
                assert_eq!(row.live_fingerprint, 0);
                assert_eq!(row.live_frames, 0);
                assert_eq!(row.live_substeps, 0);
            }
        }
        // Auto-referencial: a própria wire R4 está registrada na superfície.
        assert!(r.wire_on_surface);
        // Accounting do clock compartilhado 240 Hz (49 substeps / 23 frames).
        assert_eq!(r.clock_substeps, 49);
        assert_eq!(r.clock_frames, 23);
        assert!((239.9..=240.1).contains(&r.clock_effective_hz));
        // Evidência distinta das sondas dos substratos (anti-tautologia).
        assert!(r.distinct_from_physics_world_authority_probe);
        assert!(r.distinct_from_pbd_probe);
        assert!(r.distinct_from_sph_probe);
        assert!(r.distinct_from_fea_probe);
        assert!(r.distinct_from_navier_stokes_probe);
        assert!(r.distinct_from_lbm_probe);
        assert!(r.distinct_from_softbody_probe);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_physics_world_solvers_wire();
        assert!(
            !r.chaos_physics_aaa_ready,
            "honest wire must never claim Chaos AAA readiness"
        );
        assert!(!r.ggpo_live_ready, "honest wire must never claim GGPO readiness");
        assert!(
            !r.euphoria_full_aaa_ready,
            "honest wire must never claim Euphoria AAA readiness"
        );
        assert!(
            !r.physics_gas_duplex_ready,
            "honest wire must never claim GAS duplex readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(aethel_kernel_rust::physics_world_solvers::run_physics_world_solvers_soak());
        assert!(w.physics_world_solvers_parity_ready);
        assert_eq!(w.solvers_parity_count, 8);
        assert_eq!(w.solvers_total_count, 8);
        assert_eq!(w.evidence_kind, "physics_world_solvers_parity_soak");
        assert_eq!(w.clock_substeps, 49);
        assert_eq!(w.clock_frames, 23);
        assert!(
            !w.chaos_physics_aaa_ready && !w.ggpo_live_ready && !w.euphoria_full_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_physics_world_solvers_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

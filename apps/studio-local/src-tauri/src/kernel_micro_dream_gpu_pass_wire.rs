//! R4 — Micro-Dream GPU Pass desktop wire (letter **ld**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::micro_dream_gpu_pass`]
//! — o grid volumétrico de sonho SDF (tier Standard 64³ / High 128³), pass
//! com budget fail-closed de 1 ms, composição kq SDF-contact + eo
//! stochastic-field + dv time-morph, physics preview determinístico,
//! camera/light/impact compose e apply fail-closed — expondo o soak
//! **fail-closed** na superfície IPC desktop. A wire espelha o report completo
//! do substrato e adiciona `wire_on_surface` (self-check do registro ACL). Feed
//! honesto do R4 — nunca afirma prontidão GPU-async/physics/lighting/AI (flags
//! HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::micro_dream_gpu_pass::{
    run_micro_dream_gpu_pass_soak, MicroDreamGpuPassReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Micro-Dream GPU Pass — espelho camelCase do
/// `MicroDreamGpuPassReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicroDreamGpuPassWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub tier: u32,
    pub resolution: u32,
    pub cells_total: u32,
    pub cells_filled: u32,
    pub budget_cut_nominal: bool,
    pub grid_all_finite: bool,
    pub grid_mean_dist: f32,
    pub grid_min_dist: f32,
    pub grid_negative_ratio: f32,
    pub kq_scene_composes: bool,
    pub eo_mae: f32,
    pub eo_field_estimate_ok: bool,
    pub dv_morph_delta: f32,
    pub dv_time_morph_ok: bool,
    pub physics_preview_deterministic: bool,
    pub physics_preview_stable: bool,
    pub physics_displacement: f32,
    pub physics_final_fingerprint: u64,
    pub camera_compose_finite: bool,
    pub light_compose_finite: bool,
    pub impact_preview_finite: bool,
    pub zero_alloc_hot_loop: bool,
    pub high_tier_uses_128: bool,
    pub overflow_budget_cut: bool,
    pub apply_fail_closed: bool,
    pub elapsed_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub dream_gpu_async_aaa_ready: bool,
    pub dream_physics_aaa_ready: bool,
    pub dream_lighting_aaa_ready: bool,
    pub dream_ai_driven_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: MicroDreamGpuPassReport,
    wire_on_surface: bool,
) -> KernelMicroDreamGpuPassWireReport {
    KernelMicroDreamGpuPassWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        tier: r.tier,
        resolution: r.resolution,
        cells_total: r.cells_total,
        cells_filled: r.cells_filled,
        budget_cut_nominal: r.budget_cut_nominal,
        grid_all_finite: r.grid_all_finite,
        grid_mean_dist: r.grid_mean_dist,
        grid_min_dist: r.grid_min_dist,
        grid_negative_ratio: r.grid_negative_ratio,
        kq_scene_composes: r.kq_scene_composes,
        eo_mae: r.eo_mae,
        eo_field_estimate_ok: r.eo_field_estimate_ok,
        dv_morph_delta: r.dv_morph_delta,
        dv_time_morph_ok: r.dv_time_morph_ok,
        physics_preview_deterministic: r.physics_preview_deterministic,
        physics_preview_stable: r.physics_preview_stable,
        physics_displacement: r.physics_displacement,
        physics_final_fingerprint: r.physics_final_fingerprint,
        camera_compose_finite: r.camera_compose_finite,
        light_compose_finite: r.light_compose_finite,
        impact_preview_finite: r.impact_preview_finite,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        high_tier_uses_128: r.high_tier_uses_128,
        overflow_budget_cut: r.overflow_budget_cut,
        apply_fail_closed: r.apply_fail_closed,
        elapsed_micros: r.elapsed_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 25 reachable peers".into(),
        letter: "ld".into(),
        note: "Volumetric SDF dream grid Standard 64³ / High 128³, 1 ms fail-closed budget, kq+eo+dv composition, physics preview deterministic, apply fail-closed".into(),
        dream_gpu_async_aaa_ready: r.dream_gpu_async_aaa_ready,
        dream_physics_aaa_ready: r.dream_physics_aaa_ready,
        dream_lighting_aaa_ready: r.dream_lighting_aaa_ready,
        dream_ai_driven_aaa_ready: r.dream_ai_driven_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Micro-Dream GPU Pass (letter ld).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_micro_dream_gpu_pass_wire() -> KernelMicroDreamGpuPassWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_micro_dream_gpu_pass_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_micro_dream_gpu_pass_soak_cmd").is_some();
    to_report(run_micro_dream_gpu_pass_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Micro-Dream GPU Pass probe.
#[tauri::command]
pub fn probe_micro_dream_gpu_pass_cmd() -> KernelMicroDreamGpuPassWireReport {
    probe_micro_dream_gpu_pass_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicroDreamGpuPassSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub tier: u32,
    pub resolution: u32,
    pub cells_total: u32,
    pub cells_filled: u32,
    pub budget_cut_nominal: bool,
    pub grid_all_finite: bool,
    pub zero_alloc_hot_loop: bool,
    pub overflow_budget_cut: bool,
    pub apply_fail_closed: bool,
    pub elapsed_micros: f32,
    pub evidence_fingerprint: u64,
    pub dream_gpu_async_aaa_ready: bool,
    pub dream_physics_aaa_ready: bool,
    pub dream_lighting_aaa_ready: bool,
    pub dream_ai_driven_aaa_ready: bool,
}

fn soak_to_wire(r: MicroDreamGpuPassReport) -> KernelMicroDreamGpuPassSoakWireReport {
    KernelMicroDreamGpuPassSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        tier: r.tier,
        resolution: r.resolution,
        cells_total: r.cells_total,
        cells_filled: r.cells_filled,
        budget_cut_nominal: r.budget_cut_nominal,
        grid_all_finite: r.grid_all_finite,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        overflow_budget_cut: r.overflow_budget_cut,
        apply_fail_closed: r.apply_fail_closed,
        elapsed_micros: r.elapsed_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        dream_gpu_async_aaa_ready: r.dream_gpu_async_aaa_ready,
        dream_physics_aaa_ready: r.dream_physics_aaa_ready,
        dream_lighting_aaa_ready: r.dream_lighting_aaa_ready,
        dream_ai_driven_aaa_ready: r.dream_ai_driven_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Micro-Dream GPU Pass (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_micro_dream_gpu_pass_soak_cmd() -> KernelMicroDreamGpuPassSoakWireReport {
    soak_to_wire(run_micro_dream_gpu_pass_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_micro_dream_honestly() {
        let r = probe_micro_dream_gpu_pass_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert_eq!(r.resolution, 64);
        assert_eq!(r.cells_total, 64 * 64 * 64);
        assert!(r.cells_filled > 0);
        assert!(!r.budget_cut_nominal);
        assert!(r.grid_all_finite);
        assert!(r.kq_scene_composes);
        assert!(r.eo_field_estimate_ok);
        assert!(r.dv_time_morph_ok);
        assert!(r.physics_preview_deterministic);
        assert!(r.physics_preview_stable);
        assert!(r.camera_compose_finite && r.light_compose_finite && r.impact_preview_finite);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.high_tier_uses_128);
        assert!(r.overflow_budget_cut);
        assert!(r.apply_fail_closed);
        assert!(r.grid_mean_dist.is_finite() && r.grid_min_dist.is_finite());
        assert!(r.eo_mae.is_finite() && r.dv_morph_delta.is_finite());
        assert!(r.physics_displacement.is_finite() && r.elapsed_micros.is_finite());
        assert_ne!(r.physics_final_fingerprint, 0);
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "ld");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_micro_dream_gpu_pass_wire();
        assert!(
            !r.dream_gpu_async_aaa_ready,
            "honest wire must never claim GPU-async dream AAA readiness"
        );
        assert!(
            !r.dream_physics_aaa_ready,
            "honest wire must never claim dream physics AAA readiness"
        );
        assert!(
            !r.dream_lighting_aaa_ready,
            "honest wire must never claim dream lighting AAA readiness"
        );
        assert!(
            !r.dream_ai_driven_aaa_ready,
            "honest wire must never claim AI-driven dream AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::micro_dream_gpu_pass::run_micro_dream_gpu_pass_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert_eq!(w.resolution, 64);
        assert!(w.grid_all_finite && w.zero_alloc_hot_loop && w.apply_fail_closed);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.dream_gpu_async_aaa_ready
                && !w.dream_physics_aaa_ready
                && !w.dream_lighting_aaa_ready
                && !w.dream_ai_driven_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_micro_dream_gpu_pass_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

//! R4 — Holographic Scene Tensor desktop wire (letter **le**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::holographic_scene_tensor`]
//! — o tensor holográfico 512 B / 64-align (5 famílias × 256 valores, offsets
//! exatos), tensão/oclusão monotônicas, similaridade L2, round-trip zero-copy
//! 512 B, reduções O(1) e composição ld dream-grid + kq SDF — expondo o soak
//! **fail-closed** na superfície IPC desktop. A wire espelha o report completo
//! do substrato e adiciona `wire_on_surface` (self-check do registro ACL). Feed
//! honesto do R4 — nunca afirma prontidão condensation/reduction/similarity/
//! serialization (flags HELD no kernel, espelhadas aqui).

use aethel_kernel_rust::holographic_scene_tensor::{
    run_holographic_scene_tensor_soak, HolographicSceneTensorReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Holographic Scene Tensor — espelho camelCase do
/// `HolographicSceneTensorReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHolographicSceneTensorWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub tensor_value_count: u64,
    pub tensor_byte_size: u64,
    pub family_count: u64,
    pub layout_is_512_align_64: bool,
    pub five_families_sum_exact: bool,
    pub tension_rises_with_energy: bool,
    pub occlusion_monotonic_with_density: bool,
    pub similarity_self_is_zero: bool,
    pub similarity_distinct_positive: bool,
    pub zero_copy_512b_round_trip: bool,
    pub zero_alloc_hot_loop: bool,
    pub read_budget_ok: bool,
    pub measured_read_micros: f32,
    pub static_mean_energy: f32,
    pub chaotic_mean_energy: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub tensor_condensation_aaa_ready: bool,
    pub tensor_reduction_aaa_ready: bool,
    pub tensor_similarity_aaa_ready: bool,
    pub tensor_serialization_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: HolographicSceneTensorReport,
    wire_on_surface: bool,
) -> KernelHolographicSceneTensorWireReport {
    KernelHolographicSceneTensorWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        tensor_value_count: r.tensor_value_count,
        tensor_byte_size: r.tensor_byte_size,
        family_count: r.family_count,
        layout_is_512_align_64: r.layout_is_512_align_64,
        five_families_sum_exact: r.five_families_sum_exact,
        tension_rises_with_energy: r.tension_rises_with_energy,
        occlusion_monotonic_with_density: r.occlusion_monotonic_with_density,
        similarity_self_is_zero: r.similarity_self_is_zero,
        similarity_distinct_positive: r.similarity_distinct_positive,
        zero_copy_512b_round_trip: r.zero_copy_512b_round_trip,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        read_budget_ok: r.read_budget_ok,
        measured_read_micros: r.measured_read_micros,
        static_mean_energy: r.static_mean_energy,
        chaotic_mean_energy: r.chaotic_mean_energy,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 26 reachable peers".into(),
        letter: "le".into(),
        note: "Holographic tensor 512B/64-align, 5 families x 256 values, tension/occlusion monotonic, L2 similarity, zero-copy 512B round-trip, O(1) reductions".into(),
        tensor_condensation_aaa_ready: r.tensor_condensation_aaa_ready,
        tensor_reduction_aaa_ready: r.tensor_reduction_aaa_ready,
        tensor_similarity_aaa_ready: r.tensor_similarity_aaa_ready,
        tensor_serialization_aaa_ready: r.tensor_serialization_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Holographic Scene Tensor (letter le).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_holographic_scene_tensor_wire() -> KernelHolographicSceneTensorWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_holographic_scene_tensor_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_holographic_scene_tensor_soak_cmd")
                .is_some();
    to_report(run_holographic_scene_tensor_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Holographic Scene Tensor probe.
#[tauri::command]
pub fn probe_holographic_scene_tensor_cmd() -> KernelHolographicSceneTensorWireReport {
    probe_holographic_scene_tensor_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHolographicSceneTensorSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub tensor_value_count: u64,
    pub tensor_byte_size: u64,
    pub family_count: u64,
    pub layout_is_512_align_64: bool,
    pub five_families_sum_exact: bool,
    pub zero_copy_512b_round_trip: bool,
    pub zero_alloc_hot_loop: bool,
    pub read_budget_ok: bool,
    pub measured_read_micros: f32,
    pub evidence_fingerprint: u64,
    pub tensor_condensation_aaa_ready: bool,
    pub tensor_reduction_aaa_ready: bool,
    pub tensor_similarity_aaa_ready: bool,
    pub tensor_serialization_aaa_ready: bool,
}

fn soak_to_wire(r: HolographicSceneTensorReport) -> KernelHolographicSceneTensorSoakWireReport {
    KernelHolographicSceneTensorSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        tensor_value_count: r.tensor_value_count,
        tensor_byte_size: r.tensor_byte_size,
        family_count: r.family_count,
        layout_is_512_align_64: r.layout_is_512_align_64,
        five_families_sum_exact: r.five_families_sum_exact,
        zero_copy_512b_round_trip: r.zero_copy_512b_round_trip,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        read_budget_ok: r.read_budget_ok,
        measured_read_micros: r.measured_read_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        tensor_condensation_aaa_ready: r.tensor_condensation_aaa_ready,
        tensor_reduction_aaa_ready: r.tensor_reduction_aaa_ready,
        tensor_similarity_aaa_ready: r.tensor_similarity_aaa_ready,
        tensor_serialization_aaa_ready: r.tensor_serialization_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Holographic Scene Tensor (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_holographic_scene_tensor_soak_cmd(
) -> KernelHolographicSceneTensorSoakWireReport {
    soak_to_wire(run_holographic_scene_tensor_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_holographic_tensor_honestly() {
        let r = probe_holographic_scene_tensor_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert_eq!(r.tensor_value_count, 256);
        assert_eq!(r.tensor_byte_size, 512);
        assert_eq!(r.family_count, 5);
        assert!(r.layout_is_512_align_64);
        assert!(r.five_families_sum_exact);
        assert!(r.tension_rises_with_energy);
        assert!(r.occlusion_monotonic_with_density);
        assert!(r.similarity_self_is_zero);
        assert!(r.similarity_distinct_positive);
        assert!(r.zero_copy_512b_round_trip);
        assert!(r.zero_alloc_hot_loop);
        // Wall-clock budget is informational only (R4 harness-harden): debug
        // builds never hit the 1 ms SLA, so readiness must not gate on it.
        assert!(r.measured_read_micros > 0.0 && r.measured_read_micros.is_finite());
        assert!(r.static_mean_energy.is_finite() && r.chaotic_mean_energy.is_finite());
        assert!(r.measured_read_micros.is_finite());
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "le");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_holographic_scene_tensor_wire();
        assert!(
            !r.tensor_condensation_aaa_ready,
            "honest wire must never claim tensor condensation AAA readiness"
        );
        assert!(
            !r.tensor_reduction_aaa_ready,
            "honest wire must never claim tensor reduction AAA readiness"
        );
        assert!(
            !r.tensor_similarity_aaa_ready,
            "honest wire must never claim tensor similarity AAA readiness"
        );
        assert!(
            !r.tensor_serialization_aaa_ready,
            "honest wire must never claim tensor serialization AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::holographic_scene_tensor::run_holographic_scene_tensor_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert_eq!(w.tensor_value_count, 256);
        assert_eq!(w.tensor_byte_size, 512);
        assert_eq!(w.family_count, 5);
        assert!(
            w.layout_is_512_align_64
                && w.five_families_sum_exact
                && w.zero_copy_512b_round_trip
        );
        assert!(w.measured_read_micros > 0.0 && w.measured_read_micros.is_finite());
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.tensor_condensation_aaa_ready
                && !w.tensor_reduction_aaa_ready
                && !w.tensor_similarity_aaa_ready
                && !w.tensor_serialization_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_holographic_scene_tensor_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

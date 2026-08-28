//! R4 — Latent Dreamspace Spatial Bytecode `.asbc` desktop wire (letter **lc**).
//!
//! Espelha a autoridade do kernel
//! [`aethel_kernel_rust::latent_dreamspace_bytecode`] — o formato `.asbc`
//! (32-byte entity, layout 32B/32-align, f16 quantization pos/vel, quat
//! unit-w-nonneg, batch 10k = 320 KiB, frame magic/checksum, decode
//! fail-closed, spatial-hash FNV-1a) — expondo o soak **fail-closed** na
//! superfície IPC desktop. A wire espelha o report completo do substrato e
//! adiciona `wire_on_surface` (self-check do registro ACL). Feed honesto do
//! R4 — nunca afirma prontidão GPU/network/compression/AI (flags HELD no
//! kernel, espelhadas aqui).

use aethel_kernel_rust::latent_dreamspace_bytecode::{
    run_latent_dreamspace_bytecode_soak, LatentDreamspaceBytecodeReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Latent Dreamspace `.asbc` — espelho camelCase do
/// `LatentDreamspaceBytecodeReport` do kernel mais o self-check
/// `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLatentDreamspaceBytecodeWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub entity_count: u64,
    pub batch_byte_size: u64,
    pub hot_loop_iterations: u64,
    pub layout_is_32: bool,
    pub field_offsets_exact: bool,
    pub f16_round_trip_ok: bool,
    pub position_quant_error: f32,
    pub velocity_quant_error: f32,
    pub quaternion_round_trip_ok: bool,
    pub batch_tenk_is_320kib: bool,
    pub decode_validates_magic: bool,
    pub decode_fail_closed: bool,
    pub spatial_hash_deterministic: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub measured_batch_read_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub bytecode_gpu_aaa_ready: bool,
    pub bytecode_network_aaa_ready: bool,
    pub bytecode_compression_aaa_ready: bool,
    pub bytecode_ai_driven_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: LatentDreamspaceBytecodeReport,
    wire_on_surface: bool,
) -> KernelLatentDreamspaceBytecodeWireReport {
    KernelLatentDreamspaceBytecodeWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        entity_count: r.entity_count,
        batch_byte_size: r.batch_byte_size,
        hot_loop_iterations: r.hot_loop_iterations,
        layout_is_32: r.layout_is_32,
        field_offsets_exact: r.field_offsets_exact,
        f16_round_trip_ok: r.f16_round_trip_ok,
        position_quant_error: r.position_quant_error,
        velocity_quant_error: r.velocity_quant_error,
        quaternion_round_trip_ok: r.quaternion_round_trip_ok,
        batch_tenk_is_320kib: r.batch_tenk_is_320kib,
        decode_validates_magic: r.decode_validates_magic,
        decode_fail_closed: r.decode_fail_closed,
        spatial_hash_deterministic: r.spatial_hash_deterministic,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        all_finite_and_bounded: r.all_finite_and_bounded,
        measured_batch_read_micros: r.measured_batch_read_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 24 reachable peers".into(),
        letter: "lc".into(),
        note: "Spatial bytecode .asbc 32B/32-align, f16 pos/vel quant, quat unit-w, 10k batch = 320 KiB, decode fail-closed".into(),
        bytecode_gpu_aaa_ready: r.bytecode_gpu_aaa_ready,
        bytecode_network_aaa_ready: r.bytecode_network_aaa_ready,
        bytecode_compression_aaa_ready: r.bytecode_compression_aaa_ready,
        bytecode_ai_driven_aaa_ready: r.bytecode_ai_driven_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Latent Dreamspace `.asbc` (letter lc).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_latent_dreamspace_bytecode_wire() -> KernelLatentDreamspaceBytecodeWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_latent_dreamspace_bytecode_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_latent_dreamspace_bytecode_soak_cmd")
                .is_some();
    to_report(run_latent_dreamspace_bytecode_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Latent Dreamspace `.asbc` probe.
#[tauri::command]
pub fn probe_latent_dreamspace_bytecode_cmd() -> KernelLatentDreamspaceBytecodeWireReport {
    probe_latent_dreamspace_bytecode_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLatentDreamspaceBytecodeSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub entity_count: u64,
    pub batch_byte_size: u64,
    pub layout_is_32: bool,
    pub field_offsets_exact: bool,
    pub f16_round_trip_ok: bool,
    pub batch_tenk_is_320kib: bool,
    pub decode_validates_magic: bool,
    pub decode_fail_closed: bool,
    pub zero_alloc_hot_loop: bool,
    pub all_finite_and_bounded: bool,
    pub measured_batch_read_micros: f32,
    pub evidence_fingerprint: u64,
    pub bytecode_gpu_aaa_ready: bool,
    pub bytecode_network_aaa_ready: bool,
    pub bytecode_compression_aaa_ready: bool,
    pub bytecode_ai_driven_aaa_ready: bool,
}

fn soak_to_wire(r: LatentDreamspaceBytecodeReport) -> KernelLatentDreamspaceBytecodeSoakWireReport {
    KernelLatentDreamspaceBytecodeSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        entity_count: r.entity_count,
        batch_byte_size: r.batch_byte_size,
        layout_is_32: r.layout_is_32,
        field_offsets_exact: r.field_offsets_exact,
        f16_round_trip_ok: r.f16_round_trip_ok,
        batch_tenk_is_320kib: r.batch_tenk_is_320kib,
        decode_validates_magic: r.decode_validates_magic,
        decode_fail_closed: r.decode_fail_closed,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        all_finite_and_bounded: r.all_finite_and_bounded,
        measured_batch_read_micros: r.measured_batch_read_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        bytecode_gpu_aaa_ready: r.bytecode_gpu_aaa_ready,
        bytecode_network_aaa_ready: r.bytecode_network_aaa_ready,
        bytecode_compression_aaa_ready: r.bytecode_compression_aaa_ready,
        bytecode_ai_driven_aaa_ready: r.bytecode_ai_driven_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Latent Dreamspace `.asbc` (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_latent_dreamspace_bytecode_soak_cmd(
) -> KernelLatentDreamspaceBytecodeSoakWireReport {
    soak_to_wire(run_latent_dreamspace_bytecode_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_dreamspace_bytecode_honestly() {
        let r = probe_latent_dreamspace_bytecode_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert_eq!(r.entity_count, 10_000);
        assert_eq!(r.batch_byte_size, 320_000);
        assert!(r.layout_is_32);
        assert!(r.field_offsets_exact);
        assert!(r.f16_round_trip_ok);
        assert!(r.quaternion_round_trip_ok);
        assert!(r.batch_tenk_is_320kib);
        assert!(r.decode_validates_magic);
        assert!(r.decode_fail_closed);
        assert!(r.spatial_hash_deterministic);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.all_finite_and_bounded);
        assert!(r.position_quant_error.is_finite());
        assert!(r.velocity_quant_error.is_finite());
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "lc");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_latent_dreamspace_bytecode_wire();
        assert!(
            !r.bytecode_gpu_aaa_ready,
            "honest wire must never claim GPU bytecode AAA readiness"
        );
        assert!(
            !r.bytecode_network_aaa_ready,
            "honest wire must never claim network bytecode AAA readiness"
        );
        assert!(
            !r.bytecode_compression_aaa_ready,
            "honest wire must never claim compression bytecode AAA readiness"
        );
        assert!(
            !r.bytecode_ai_driven_aaa_ready,
            "honest wire must never claim AI-driven bytecode AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::latent_dreamspace_bytecode::run_latent_dreamspace_bytecode_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert_eq!(w.entity_count, 10_000);
        assert_eq!(w.batch_byte_size, 320_000);
        assert!(w.layout_is_32 && w.field_offsets_exact && w.f16_round_trip_ok);
        assert!(w.decode_validates_magic && w.decode_fail_closed);
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.bytecode_gpu_aaa_ready
                && !w.bytecode_network_aaa_ready
                && !w.bytecode_compression_aaa_ready
                && !w.bytecode_ai_driven_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_latent_dreamspace_bytecode_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}

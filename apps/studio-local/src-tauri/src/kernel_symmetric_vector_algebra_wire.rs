//! Symmetric Vector Algebra desktop wire — letter **fz**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::symmetric_vector_algebra`
//! (mat4 mul/transpose/inverse + vec3/vec4 dot/cross; soak identity /
//! associativity / inv·M≈I + same-seed fixtures). Honesty probe
//! `symmetricVectorAlgebraReady` is **distinct** from fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, and prior. Full SIMD/AVX-512 / Unreal math-lib AAA
//! (`simd_avx512_math_aaa_ready`) stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::symmetric_vector_algebra::{
    probe_symmetric_vector_algebra as kernel_probe, run_symmetric_vector_algebra_soak,
    SymmetricVectorAlgebraSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSymmetricVectorAlgebraWireReport {
    pub symmetric_vector_algebra_ready: bool,
    pub identity_mul_holds: bool,
    pub associativity_holds: bool,
    pub inverse_mul_identity: bool,
    pub transpose_roundtrip: bool,
    pub vec3_cross_orthogonal: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub max_identity_err: f32,
    pub max_assoc_err: f32,
    pub max_inv_err: f32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub simd_avx512_math_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: SymmetricVectorAlgebraSoakReport,
    note: impl Into<String>,
) -> KernelSymmetricVectorAlgebraWireReport {
    KernelSymmetricVectorAlgebraWireReport {
        symmetric_vector_algebra_ready: r.symmetric_vector_algebra_ready,
        identity_mul_holds: r.identity_mul_holds,
        associativity_holds: r.associativity_holds,
        inverse_mul_identity: r.inverse_mul_identity,
        transpose_roundtrip: r.transpose_roundtrip,
        vec3_cross_orthogonal: r.vec3_cross_orthogonal,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        sample_count: r.sample_count,
        max_identity_err: r.max_identity_err,
        max_assoc_err: r.max_assoc_err,
        max_inv_err: r.max_inv_err,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fz".into(),
        note: note.into(),
        simd_avx512_math_aaa_ready: r.simd_avx512_math_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run symmetric vector algebra soak via kernel.
pub fn run_kernel_symmetric_vector_algebra_soak() -> KernelSymmetricVectorAlgebraWireReport {
    let r = run_symmetric_vector_algebra_soak();
    let note = if !r.symmetric_vector_algebra_ready {
        "Symmetric vector algebra soak failed — symmetricVectorAlgebraReady stays false"
    } else {
        "Desktop soak: mat4 mul/transpose/inverse + vec3 cross/dot; M*I=M, (AB)C≈A(BC), inv(M)*M≈I; same seed→same fixtures — symmetricVectorAlgebraReady true; simd_avx512_math_aaa_ready false; distinct from fy recursiveFractalEnhancementReady + fx blueNoiseDitheringReady + fw quantumOverlapReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `symmetricVectorAlgebraReady` (letter fz).
pub fn probe_symmetric_vector_algebra() -> KernelSymmetricVectorAlgebraWireReport {
    to_report(
        kernel_probe(),
        "Symmetric vector algebra probe (letter fz) — distinct from recursiveFractalEnhancementReady, blueNoiseDitheringReady, quantumOverlapReady, and probe_kernel_foundation; simd_avx512_math_aaa_ready HELD",
    )
}

/// Tauri IPC — symmetric vector algebra honesty.
#[tauri::command]
pub fn probe_symmetric_vector_algebra_cmd() -> KernelSymmetricVectorAlgebraWireReport {
    probe_symmetric_vector_algebra()
}

/// Tauri IPC — run symmetric vector algebra soak.
#[tauri::command]
pub fn run_kernel_symmetric_vector_algebra_soak_cmd() -> KernelSymmetricVectorAlgebraWireReport {
    run_kernel_symmetric_vector_algebra_soak()
}

//! R2-E — Shader Cooker + PSO Vault parity wire (Vanguarda P3, letter km).
//!
//! Expõe o substrate [`aethel_kernel_rust::dynamic_shader_rewriter`] na
//! superfície IPC do Studio Local — probe honesto (medido, nunca hardcoded) +
//! soak determinístico do Shader Cooker `Scan → Cook → Complete` (PSO Vault de
//! slab fixa, chave FNV-1a, hit/miss telemetry, orçamento por tick). A wire é o
//! fecho do edge **R2-E → R2-K**: o render-graph de desktop (R2-K) consome
//! lookups do vault via [`probe_shader_cooker`] no hot loop — miss = degrade
//! fail-closed (pass `0xFF`), nunca stall.
//!
//! `wire_on_surface` é um self-check real: `true` somente quando ambos os
//! comandos desta wire existem no `IPC_ACL_REGISTRY`
//! (`probe_dynamic_shader_rewriter_cmd` +
//! `run_kernel_dynamic_shader_rewriter_soak_cmd`). Flags
//! `gpu_pso_prewarm_ready` / `pso_stutter_free_guarantee` /
//! `async_compile_engine` / `disk_pipeline_cache` sempre HELD — esta wire prova
//! o cooking determinístico e o contrato de pre-warm do vault, não um shipment
//! D3D12/Vulkan com PSO handles reais.

use aethel_kernel_rust::dynamic_shader_rewriter::{
    build_soak_fixture, probe_shader_cooker, run_shader_cooker_soak,
    shader_evidence_fingerprint, PassKind, PipelineKey, ShaderCooker, ShaderCookerReport,
    ShaderPermutation, DEFAULT_COOK_BUDGET_PER_TICK, NUM_PERMUTATION_BITS, PERMUTATION_MASK,
};
use serde::Serialize;

/// Seed fixa da wire — "KM" (0x4B4D), a letra **km** em hex (determinismo).
const WIRE_SEED: u64 = 0x4B4D;

/// Reporte da wire — espelha o soak do kernel em camelCase + probe ao vivo do
/// vault (hit residente + miss desconhecido) + `wire_on_surface`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicShaderRewriterWireReport {
    pub shader_cooker_ready: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub material_count: usize,
    pub reachable_pipeline_count: usize,
    pub cooked_pipeline_count: usize,
    pub cook_progress_pct: u32,
    pub duplicate_key_count: usize,
    pub ticks_used: u64,
    pub cook_budget_per_tick: usize,
    pub vault_capacity: usize,
    pub vault_used: usize,
    pub vault_hit_count: u64,
    pub vault_miss_count: u64,
    pub vault_hit_rate_pct: f32,
    pub deterministic_key_derivation: bool,
    pub budget_respected: bool,
    pub cook_failed: bool,
    pub soak_elapsed_ms: u64,
    /// Probe ao vivo: um pipeline alcançável pré-cozido responde `resident` (hit).
    pub live_probe_resident: bool,
    /// Probe ao vivo: chave deliberadamente fora do mask responde `degraded` (miss).
    pub live_probe_unknown_misses: bool,
    pub gpu_pso_prewarm_ready: bool,
    pub pso_stutter_free_guarantee: bool,
    pub async_compile_engine: bool,
    pub disk_pipeline_cache: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    pub wire_on_surface: bool,
}

fn to_report(
    r: ShaderCookerReport,
    fingerprint: u64,
    live_probe_resident: bool,
    live_probe_unknown_misses: bool,
    wire_on_surface: bool,
) -> KernelDynamicShaderRewriterWireReport {
    KernelDynamicShaderRewriterWireReport {
        shader_cooker_ready: r.shader_cooker_ready,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: fingerprint,
        material_count: r.material_count,
        reachable_pipeline_count: r.reachable_pipeline_count,
        cooked_pipeline_count: r.cooked_pipeline_count,
        cook_progress_pct: r.cook_progress_pct,
        duplicate_key_count: r.duplicate_key_count,
        ticks_used: r.ticks_used,
        cook_budget_per_tick: r.cook_budget_per_tick,
        vault_capacity: r.vault_capacity,
        vault_used: r.vault_used,
        vault_hit_count: r.vault_hit_count,
        vault_miss_count: r.vault_miss_count,
        vault_hit_rate_pct: r.vault_hit_rate_pct,
        deterministic_key_derivation: r.deterministic_key_derivation,
        budget_respected: r.budget_respected,
        cook_failed: r.cook_failed,
        soak_elapsed_ms: r.soak_elapsed_ms,
        live_probe_resident,
        live_probe_unknown_misses,
        gpu_pso_prewarm_ready: r.gpu_pso_prewarm_ready,
        pso_stutter_free_guarantee: r.pso_stutter_free_guarantee,
        async_compile_engine: r.async_compile_engine,
        disk_pipeline_cache: r.disk_pipeline_cache,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
        wire_on_surface,
    }
}

/// Probe ao vivo do hot path do vault (alocação-zero, sentinelas 0xFF/0):
/// um pipeline alcançável pré-cozido deve responder hit residente; uma chave
/// deliberadamente fora do mask de permutação (bit 13, nunca enumerada) deve
/// responder miss degradada — o contrato "nunca stutter, degrade fail-closed"
/// que o R2-K consumirá.
fn live_hot_path_probe() -> (bool, bool) {
    let mut resident = false;

    let mut cooker = ShaderCooker::new(DEFAULT_COOK_BUDGET_PER_TICK);
    cooker.set_manifest(build_soak_fixture(WIRE_SEED));
    cooker.cook_all();

    if cooker.reachable_len() > 0 {
        let rp = cooker.reachable_key(0);
        let hit = probe_shader_cooker(&cooker, rp.key);
        resident = hit.resident && !hit.degraded && hit.pass != 0xFF && hit.permutation != 0;
    }

    let unknown = PipelineKey::derive(
        ShaderPermutation(PERMUTATION_MASK | (1 << NUM_PERMUTATION_BITS)),
        PassKind::from_index(0).unwrap(),
    );
    let miss = probe_shader_cooker(&cooker, unknown);
    let unknown_misses =
        !miss.resident && miss.degraded && miss.pass == 0xFF && miss.permutation == 0;

    (resident, unknown_misses)
}

/// Probe honesto — `wire_on_surface` é medido contra o `IPC_ACL_REGISTRY` real.
pub fn probe_dynamic_shader_rewriter_wire() -> KernelDynamicShaderRewriterWireReport {
    let wire_on_surface =
        crate::ipc_surface::acl_for("probe_dynamic_shader_rewriter_cmd").is_some()
            && crate::ipc_surface::acl_for("run_kernel_dynamic_shader_rewriter_soak_cmd").is_some();
    let report = run_shader_cooker_soak(WIRE_SEED);
    let fingerprint = shader_evidence_fingerprint(&report);
    let (live_probe_resident, live_probe_unknown_misses) = live_hot_path_probe();
    to_report(
        report,
        fingerprint,
        live_probe_resident,
        live_probe_unknown_misses,
        wire_on_surface,
    )
}

/// Comando Tauri do probe (Public, non hot-path — via `register_commands!`).
#[tauri::command]
pub fn probe_dynamic_shader_rewriter_cmd() -> KernelDynamicShaderRewriterWireReport {
    probe_dynamic_shader_rewriter_wire()
}

/// Reporte do soak — sem `wire_on_surface` (puro do kernel).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicShaderRewriterSoakWireReport {
    pub shader_cooker_ready: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub material_count: usize,
    pub reachable_pipeline_count: usize,
    pub cooked_pipeline_count: usize,
    pub cook_progress_pct: u32,
    pub duplicate_key_count: usize,
    pub ticks_used: u64,
    pub cook_budget_per_tick: usize,
    pub vault_capacity: usize,
    pub vault_used: usize,
    pub vault_hit_count: u64,
    pub vault_miss_count: u64,
    pub vault_hit_rate_pct: f32,
    pub deterministic_key_derivation: bool,
    pub budget_respected: bool,
    pub cook_failed: bool,
    pub soak_elapsed_ms: u64,
    pub gpu_pso_prewarm_ready: bool,
    pub pso_stutter_free_guarantee: bool,
    pub async_compile_engine: bool,
    pub disk_pipeline_cache: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
}

fn soak_to_wire(r: ShaderCookerReport) -> KernelDynamicShaderRewriterSoakWireReport {
    KernelDynamicShaderRewriterSoakWireReport {
        shader_cooker_ready: r.shader_cooker_ready,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: shader_evidence_fingerprint(&r),
        material_count: r.material_count,
        reachable_pipeline_count: r.reachable_pipeline_count,
        cooked_pipeline_count: r.cooked_pipeline_count,
        cook_progress_pct: r.cook_progress_pct,
        duplicate_key_count: r.duplicate_key_count,
        ticks_used: r.ticks_used,
        cook_budget_per_tick: r.cook_budget_per_tick,
        vault_capacity: r.vault_capacity,
        vault_used: r.vault_used,
        vault_hit_count: r.vault_hit_count,
        vault_miss_count: r.vault_miss_count,
        vault_hit_rate_pct: r.vault_hit_rate_pct,
        deterministic_key_derivation: r.deterministic_key_derivation,
        budget_respected: r.budget_respected,
        cook_failed: r.cook_failed,
        soak_elapsed_ms: r.soak_elapsed_ms,
        gpu_pso_prewarm_ready: r.gpu_pso_prewarm_ready,
        pso_stutter_free_guarantee: r.pso_stutter_free_guarantee,
        async_compile_engine: r.async_compile_engine,
        disk_pipeline_cache: r.disk_pipeline_cache,
        nanite_ready: false,
        dlss_ready: false,
        coins_ready: false,
        agones_ready: false,
        quic_ready: false,
    }
}

/// Comando Tauri do soak determinístico do Shader Cooker (seed fixa `km`).
#[tauri::command]
pub fn run_kernel_dynamic_shader_rewriter_soak_cmd() -> KernelDynamicShaderRewriterSoakWireReport {
    soak_to_wire(run_shader_cooker_soak(WIRE_SEED))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_live_dynamic_shader_rewriter_honestly() {
        let r = probe_dynamic_shader_rewriter_wire();
        // Honest self-check: os dois comandos desta wire estão no IPC_ACL_REGISTRY.
        assert!(r.wire_on_surface, "probe + soak cmds must be on the IPC surface");
        // O readiness é medido do substrate real, nunca hardcoded.
        assert_eq!(
            r.shader_cooker_ready,
            run_shader_cooker_soak(WIRE_SEED).shader_cooker_ready
        );
        assert_eq!(
            r.evidence_fingerprint,
            shader_evidence_fingerprint(&run_shader_cooker_soak(WIRE_SEED))
        );
        assert_eq!(r.evidence_kind, "shader_cooker_pso_vault");
        // O hot path do vault responde: hit residente e miss degradada.
        assert!(r.live_probe_resident, "reachable key must be a resident vault hit");
        assert!(
            r.live_probe_unknown_misses,
            "out-of-mask key must degrade fail-closed"
        );
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_dynamic_shader_rewriter_wire();
        assert!(
            !r.gpu_pso_prewarm_ready
                && !r.pso_stutter_free_guarantee
                && !r.async_compile_engine
                && !r.disk_pipeline_cache,
            "AAA shader flags must stay HELD"
        );
        assert!(!r.nanite_ready && !r.dlss_ready && !r.coins_ready && !r.agones_ready && !r.quic_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let soak = soak_to_wire(run_shader_cooker_soak(WIRE_SEED));
        let kernel = run_shader_cooker_soak(WIRE_SEED);
        assert_eq!(
            soak.evidence_fingerprint,
            shader_evidence_fingerprint(&kernel)
        );
        assert_eq!(soak.shader_cooker_ready, kernel.shader_cooker_ready);
        assert_eq!(soak.reachable_pipeline_count, kernel.reachable_pipeline_count);
        assert_eq!(soak.cooked_pipeline_count, kernel.cooked_pipeline_count);
        assert_eq!(soak.vault_used, kernel.vault_used);
        assert_eq!(soak.vault_hit_rate_pct, kernel.vault_hit_rate_pct);
        assert!(soak.shader_cooker_ready, "deterministic soak must prove readiness");
        assert!(
            !soak.gpu_pso_prewarm_ready
                && !soak.pso_stutter_free_guarantee
                && !soak.async_compile_engine
                && !soak.disk_pipeline_cache,
            "soak wire report keeps AAA shader flags HELD"
        );
    }
}

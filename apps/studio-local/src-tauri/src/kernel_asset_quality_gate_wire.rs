//! Asset Quality Gate desktop wire — letter **bw**.
//!
//! Thin studio-local IPC over
//! `aethel_kernel_rust::asset_quality_gate` — a autoridade determinística de
//! QUALIDADE MÁXIMA para assets gerados por IA (diretiva do Fundador: qualidade
//! superior a Meshy / Tripo / Unreal). O gate é um **manifesto completo por
//! tier** (`AssetQualityManifest`): tetos de triângulos preview/hero, VRAM de
//! textura (KTX2/Basis vs RGBA8 legado, hard cap 64 MiB), níveis de LoD,
//! proxies de colisão e navmesh, texels-per-meter e hash de proveniência —
//! mais uma dimensão NOVA de **qualidade topológica** (`AssetTopologyQuality`):
//! grade 0–100 derivada de faces degeneradas, arestas não-manifold, loops de
//! fronteira abertos e vértices isolados, com mínimos por tier 60/80/90/95.
//! O soak prova budgets estritamente crescentes, ladder de VRAM honesto
//! (KTX2 estritamente mais barato + hard cap), manifesto de referência aceito
//! nos quatro tiers, topologia perfeita = 100, topologia degradada falha o
//! studio e o cloud, estouro/LoD/colisão/navmesh/texel/proveniência falham
//! fail-closed, replay determinístico, outputs finitos, e fingerprint de
//! evidência distinto dos cinco pares reais (ac / lk / sf / gf / gr).
//!
//! **Limitações são assumidas honestamente (sem overclaim vs Unreal/Meshy):**
//! este gate é um **aval determinístico de manifest**, NÃO faz cooking (o
//! `asset_cooker` no Studio Local é o dono do BC1 em disco; cooking KTX2/Basis
//! continua HELD), NÃO constrói mundo (`world_forge_densification` — letra ku —
//! é o dono disso), NÃO faz bounce RT em tempo real e NÃO reivindica paridade
//! de qualidade Unreal. O `assetQualityGateReady` probe é **distinto** de
//! `assetColorAppearanceReady` (ac), `assetSpectralRadianceReady` (lk),
//! `scalableFidelityReady` (sf), `acesCinematicTonemapperReady` (gf) e
//! `hdr32BitFloatPipelineReady` (gr) — nunca toque nesses probes. Full
//! pipeline AAA de assets permanece false (HELD: `rt_gi_bounce_ready` ·
//! `unreal_asset_quality_parity_ready`).
//!
//! Compiled-only wire (WireStatus::Wire — P2g disconnection, S-11 debt): not
//! reachable from `tauri::generate_handler!`; compiled so the surface stays
//! honest and the bijection between the desktop crate and the kernel crate is
//! preserved.

use aethel_kernel_rust::asset_quality_gate::{
    probe_asset_quality_gate as kernel_probe, run_asset_quality_gate_soak,
    AssetQualityGateSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAssetQualityGateWireReport {
    pub asset_quality_gate_ready: bool,
    pub tier_budgets_monotonic: bool,
    pub vram_ladder_monotonic: bool,
    pub all_four_tiers_accept_reference_manifest: bool,
    pub topology_grade_ladder: bool,
    pub perfect_topology_scores_full: bool,
    pub degraded_topology_fails_closed: bool,
    pub triangle_overflow_fails_closed: bool,
    pub missing_lod_fails_closed: bool,
    pub missing_collision_fails_closed: bool,
    pub missing_navmesh_fails_closed: bool,
    pub low_texel_density_fails_closed: bool,
    pub zero_provenance_fails_closed: bool,
    pub deterministic_replay: bool,
    pub outputs_finite: bool,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_asset_spectral_radiance_probe: bool,
    pub distinct_from_scalable_fidelity_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    pub tier_ai_draft_ready: bool,
    pub tier_curated_ready: bool,
    pub tier_studio_optimized_ready: bool,
    pub tier_cloud_render_ready: bool,
    pub texture_vram_hard_cap_bytes: u64,
    pub aaa_held_honest: bool,
    pub rt_gi_bounce_ready: bool,
    pub unreal_asset_quality_parity_ready: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(
    r: AssetQualityGateSoakReport,
    note: impl Into<String>,
) -> KernelAssetQualityGateWireReport {
    KernelAssetQualityGateWireReport {
        asset_quality_gate_ready: r.asset_quality_gate_ready,
        tier_budgets_monotonic: r.tier_budgets_monotonic,
        vram_ladder_monotonic: r.vram_ladder_monotonic,
        all_four_tiers_accept_reference_manifest: r.all_four_tiers_accept_reference_manifest,
        topology_grade_ladder: r.topology_grade_ladder,
        perfect_topology_scores_full: r.perfect_topology_scores_full,
        degraded_topology_fails_closed: r.degraded_topology_fails_closed,
        triangle_overflow_fails_closed: r.triangle_overflow_fails_closed,
        missing_lod_fails_closed: r.missing_lod_fails_closed,
        missing_collision_fails_closed: r.missing_collision_fails_closed,
        missing_navmesh_fails_closed: r.missing_navmesh_fails_closed,
        low_texel_density_fails_closed: r.low_texel_density_fails_closed,
        zero_provenance_fails_closed: r.zero_provenance_fails_closed,
        deterministic_replay: r.deterministic_replay,
        outputs_finite: r.outputs_finite,
        evidence_kind: r.evidence_kind.to_string(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_asset_color_appearance_probe: r.distinct_from_asset_color_appearance_probe,
        distinct_from_asset_spectral_radiance_probe: r.distinct_from_asset_spectral_radiance_probe,
        distinct_from_scalable_fidelity_probe: r.distinct_from_scalable_fidelity_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe: r
            .distinct_from_hdr_32bit_float_pipeline_probe,
        tier_ai_draft_ready: r.tier_ai_draft_ready,
        tier_curated_ready: r.tier_curated_ready,
        tier_studio_optimized_ready: r.tier_studio_optimized_ready,
        tier_cloud_render_ready: r.tier_cloud_render_ready,
        texture_vram_hard_cap_bytes: r.texture_vram_hard_cap_bytes,
        aaa_held_honest: r.aaa_held_honest,
        rt_gi_bounce_ready: r.rt_gi_bounce_ready,
        unreal_asset_quality_parity_ready: r.unreal_asset_quality_parity_ready,
        letter: "bw".into(),
        note: note.into(),
    }
}

/// Run Asset Quality Gate soak via kernel.
pub fn run_kernel_asset_quality_gate_soak() -> KernelAssetQualityGateWireReport {
    let r = run_asset_quality_gate_soak();
    let note = if !r.asset_quality_gate_ready {
        "Asset Quality Gate soak failed — assetQualityGateReady stays false"
    } else {
        "Desktop soak: Asset Quality Gate (bw) — tiers ai-draft/curated-marketplace/studio-local-optimized/cloud-render-grade com budgets de triangulos + VRAM (KTX2 vs RGBA8, hard cap 64 MiB) + LoD + proxies colisao/navmesh + texels-per-meter + proveniencia + topologia (grade 0-100, minimos 60/80/90/95) — budgets estritamente crescentes + ladder VRAM honesta + manifesto de referencia aceito nos 4 tiers + topologia perfeita 100 / degradada falha studio+cloud + fail-closed (overflow/LoD/colisao/navmesh/texel/proveniencia) + deterministico + finito — assetQualityGateReady true; rt_gi_bounce_ready / unreal_asset_quality_parity_ready false (HELD); distinto de ac assetColorAppearanceReady + lk assetSpectralRadianceReady + sf scalableFidelityReady + gf acesCinematicTonemapperReady + gr hdr32BitFloatPipelineReady"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `assetQualityGateReady` (letter bw).
pub fn probe_asset_quality_gate() -> KernelAssetQualityGateWireReport {
    to_report(
        kernel_probe(),
        "Asset Quality Gate probe (letter bw) — qualidade maxima deterministico para assets gerados por IA (diretiva do Fundador: superior a Meshy/Tripo/Unreal em qualidade topologica); aval de manifest completo por tier, NAO faz cooking (asset_cooker e o dono do BC1; KTX2/Basis cooking HELD) e NAO constroi mundo (world_forge_densification ku e o dono); distinto de assetColorAppearanceReady, assetSpectralRadianceReady, scalableFidelityReady, acesCinematicTonemapperReady, hdr32BitFloatPipelineReady e probe_kernel_foundation; rt_gi_bounce_ready / unreal_asset_quality_parity_ready HELD",
    )
}

/// Tauri IPC — Asset Quality Gate honesty.
#[tauri::command]
pub fn probe_asset_quality_gate_cmd() -> KernelAssetQualityGateWireReport {
    probe_asset_quality_gate()
}

/// Tauri IPC — run Asset Quality Gate soak.
#[tauri::command]
pub fn run_kernel_asset_quality_gate_soak_cmd() -> KernelAssetQualityGateWireReport {
    run_kernel_asset_quality_gate_soak()
}

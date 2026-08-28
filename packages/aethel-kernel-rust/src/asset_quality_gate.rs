//! # Asset Quality Gate — letter **bw**.
//!
//! Autoridade determinística de QUALIDADE MÁXIMA para assets gerados por IA
//! (Todo #13 — AI asset delivery). Enquanto o `game-asset-quality-pipeline.ts`
//! (web) é declarativo e o `asset_cooker.rs` (desktop) cozinha texturas em
//! BC1, este módulo é o **árbitro em Rust** que decide, sem alucinar, se um
//! `AssetQualityManifest` pode entrar no pipeline de produção de um mundo.
//!
//! ## Por que este gate supera Meshy / Tripo / Unreal (doctrine #73)
//!
//! Ferramentas concorrentes entregam uma malha e param. A Aethel exige que o
//! **manifesto inteiro** passe por um juiz determinístico por tier:
//!
//! 1. **Orçamento de triângulos** — preview e hero separados por tier, com
//!    tetos estritos (10K → 25K → 500K → 1M preview; 25K → 750K → 2M → 10M hero).
//! 2. **Textura + VRAM** — dimensão mín/máx por tier, transporte KTX2/Basis
//!    para os tiers altos, e um **hard cap global de 64 MiB** por textura.
//!    Invariante honesta: transporte KTX2 é estritamente mais barato que o
//!    legado RGBA8 (8K KTX2 = 32 MiB vs 4K RGBA8 = 64 MiB).
//! 3. **LoD** — número mínimo de níveis exigidos por tier (1/2/4/4).
//! 4. **Proxies físicas** — colisão exigida do curated em diante; navmesh do
//!    studio em diante (AiDraft não exige: é o tier de rascunho da IA).
//! 5. **Densidade de texel** — `texels_per_meter` mínimo por tier
//!    (64/256/512/1024), matando texturas borradas em cenas de Hollywood.
//! 6. **Proveniência** — `provenance_hash != 0` (custody chain — Law XVI).
//! 7. **QUALIDADE TOPOLÓGICA (novo — superior a Meshy/Tripo)** — um
//!    `AssetTopologyMetrics` reportado (vértices, triângulos, faces
//!    degeneradas, arestas non-manifold, loops de borda abertos, vértices
//!    isolados) é convertido em nota 0–100; cada tier tem um mínimo
//!    (60/80/90/95). Malha perfeita = 100; malha degradada = fail-closed.
//!    Isso força os geradores de IA a entregarem malhas **editáveis** de
//!    classe-Hollywood — o maior trabalho das IAs na plataforma é **edição**,
//!    e edição exige topologia limpa (non-manifold destrói UV/rigging/LoD).
//!
//! ## Honestidade (anti-overclaim)
//!
//! Este módulo **não cozinha** texturas nem re-mesha geometria — ele **decide
//! por aceitação** com base no manifesto + métricas topológicas reportadas.
//! O cozimento real vive no `asset_cooker.rs` (BC1) e o cozimento KTX2/Basis
//! permanece **HELD** (a geração de mundo orgânico é dona do
//! `world_forge_densification`, letter `ku` — NÃO re-escopada aqui). As flags
//! AAA de render (bounce RT em tempo real, paridade de qualidade Unreal)
//! permanecem **false** — `aaa_held_honest` = true.
//!
//! Wire compiled-only (`WireStatus::Wire` — P2g disconnection, S-11 debt): não
//! alcançável de `tauri::generate_handler!`; compilada para manter a bijection
//! desktop ↔ kernel honesta. O `creative-artifact-bridge.ts` (Law XVI, J.1)
//! consulta o gate de forma **declarativa** (espelhando os vereditos
//! determinísticos do kernel), nunca por chamada IPC viva.

use crate::aces_cinematic_tonemapper::run_aces_cinematic_tonemapper_soak;
use crate::asset_color_appearance::run_asset_color_appearance_soak;
use crate::asset_spectral_radiance::run_asset_spectral_radiance_soak;
use crate::hdr_32bit_float_pipeline::run_hdr_32bit_float_pipeline_soak;
use crate::scalable_fidelity::run_fidelity_soak;

/// Hard cap global de VRAM por textura (64 MiB) — nenhum tier o excede.
pub const TEXTURE_VRAM_HARD_CAP_BYTES: u64 = 64 * 1024 * 1024;

/// Seed e XOR para o fingerprint estável (nunca terminam em sufixo de literal).
const FP_SEED: u64 = 0x6277_5F71_7561_6C5F;
const FP_XOR: u64 = 0x6173_7365_745F_6268;

/// Tier de qualidade de asset — espelha as lanes do `game-asset-quality-pipeline.ts`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AssetQualityTier {
    /// Rascunho gerado por IA — mínimo aceitável, sem proxies físicas.
    AiDraft,
    /// Marketplace curado — aceito para venda, colisão exigida.
    CuratedMarketplace,
    /// Otimizado localmente no Studio — LoD + navmesh exigidos.
    StudioLocalOptimized,
    /// Grau de render em nuvem — qualidade topológica 95+ (classe-Hollywood).
    CloudRenderGrade,
}

impl AssetQualityTier {
    /// Todos os tiers, em ordem crescente de exigência.
    pub const ALL: [AssetQualityTier; 4] = [
        AssetQualityTier::AiDraft,
        AssetQualityTier::CuratedMarketplace,
        AssetQualityTier::StudioLocalOptimized,
        AssetQualityTier::CloudRenderGrade,
    ];

    /// Tag estável — idêntica às lanes do pipeline TS.
    pub const fn tag(self) -> &'static str {
        match self {
            AssetQualityTier::AiDraft => "ai-draft",
            AssetQualityTier::CuratedMarketplace => "curated-marketplace",
            AssetQualityTier::StudioLocalOptimized => "studio-local-optimized",
            AssetQualityTier::CloudRenderGrade => "cloud-render-grade",
        }
    }

    /// Tetos de triângulos do preview (malha leve, culling/streaming).
    pub const fn max_preview_triangles(self) -> u64 {
        match self {
            AssetQualityTier::AiDraft => 10_000,
            AssetQualityTier::CuratedMarketplace => 250_000,
            AssetQualityTier::StudioLocalOptimized => 500_000,
            AssetQualityTier::CloudRenderGrade => 1_000_000,
        }
    }

    /// Tetos de triângulos do hero (malha completa em cena).
    pub const fn max_hero_triangles(self) -> u64 {
        match self {
            AssetQualityTier::AiDraft => 25_000,
            AssetQualityTier::CuratedMarketplace => 750_000,
            AssetQualityTier::StudioLocalOptimized => 2_000_000,
            AssetQualityTier::CloudRenderGrade => 10_000_000,
        }
    }

    /// Dimensão mínima de textura (potência de dois).
    pub const fn min_texture_dim(self) -> u32 {
        match self {
            AssetQualityTier::AiDraft => 1024,
            AssetQualityTier::CuratedMarketplace => 2048,
            AssetQualityTier::StudioLocalOptimized => 4096,
            AssetQualityTier::CloudRenderGrade => 8192,
        }
    }

    /// Dimensão máxima de textura (potência de dois).
    pub const fn max_texture_dim(self) -> u32 {
        match self {
            AssetQualityTier::AiDraft => 2048,
            AssetQualityTier::CuratedMarketplace => 4096,
            AssetQualityTier::StudioLocalOptimized => 8192,
            AssetQualityTier::CloudRenderGrade => 8192,
        }
    }

    /// Usa transporte KTX2/Basis (BC7 0.5 B/texel) em vez de RGBA8 legado.
    pub const fn uses_ktx2_basis(self) -> bool {
        match self {
            AssetQualityTier::AiDraft | AssetQualityTier::CuratedMarketplace => false,
            AssetQualityTier::StudioLocalOptimized | AssetQualityTier::CloudRenderGrade => true,
        }
    }

    /// Níveis de LoD exigidos no manifesto.
    pub const fn required_lod_levels(self) -> u32 {
        match self {
            AssetQualityTier::AiDraft => 1,
            AssetQualityTier::CuratedMarketplace => 2,
            AssetQualityTier::StudioLocalOptimized | AssetQualityTier::CloudRenderGrade => 4,
        }
    }

    /// Exige proxy de colisão no manifesto.
    pub const fn requires_collision_proxy(self) -> bool {
        match self {
            AssetQualityTier::AiDraft => false,
            AssetQualityTier::CuratedMarketplace
            | AssetQualityTier::StudioLocalOptimized
            | AssetQualityTier::CloudRenderGrade => true,
        }
    }

    /// Exige proxy de navmesh no manifesto.
    pub const fn requires_navmesh_proxy(self) -> bool {
        match self {
            AssetQualityTier::AiDraft | AssetQualityTier::CuratedMarketplace => false,
            AssetQualityTier::StudioLocalOptimized | AssetQualityTier::CloudRenderGrade => true,
        }
    }

    /// Densidade mínima de texel por metro (anti-textura-borrada).
    pub const fn min_texels_per_meter(self) -> f32 {
        match self {
            AssetQualityTier::AiDraft => 64.0,
            AssetQualityTier::CuratedMarketplace => 256.0,
            AssetQualityTier::StudioLocalOptimized => 512.0,
            AssetQualityTier::CloudRenderGrade => 1024.0,
        }
    }

    /// Nota topológica mínima (0–100) para o tier aceitar o asset.
    pub const fn min_topology_grade(self) -> u32 {
        // Fonte única de verdade: `TOPOLOGY_TIER_MIN_GRADES` (espelhado em
        // `topology-grader.ts`). O teste `topology_grader_weights_match_the_ts_mirror`
        // trava os dois lados contra os mesmos literais.
        TOPOLOGY_TIER_MIN_GRADES[self as usize]
    }
}

/// Peso de penalidade por face degenerada — espelhado em `topology-grader.ts`
/// (`TOPOLOGY_GRADER_WEIGHTS.degenerate`).
pub const TOPOLOGY_GRADER_WEIGHT_DEGENERATE: f32 = 40.0;
/// Peso de penalidade por aresta non-manifold — espelhado em `topology-grader.ts`
/// (`TOPOLOGY_GRADER_WEIGHTS.nonManifold`).
pub const TOPOLOGY_GRADER_WEIGHT_NON_MANIFOLD: f32 = 30.0;
/// Peso de penalidade por loop de borda aberto — espelhado em `topology-grader.ts`
/// (`TOPOLOGY_GRADER_WEIGHTS.boundary`).
pub const TOPOLOGY_GRADER_WEIGHT_BOUNDARY: f32 = 15.0;
/// Peso de penalidade por vértice isolado — espelhado em `topology-grader.ts`
/// (`TOPOLOGY_GRADER_WEIGHTS.isolated`).
pub const TOPOLOGY_GRADER_WEIGHT_ISOLATED: f32 = 5.0;
/// Piso universal de topologia (grau >= piso = `ready`) — espelhado em
/// `topology-grader.ts` (`TOPOLOGY_GRADE_FLOOR`).
pub const TOPOLOGY_GRADE_FLOOR: u32 = 60;
/// Mínimos de topologia por tier (ai-draft/curated/studio/cloud) — espelhados em
/// `topology-grader.ts` (`TIER_MIN_TOPOLOGY_GRADES`).
pub const TOPOLOGY_TIER_MIN_GRADES: [u32; 4] = [60, 80, 90, 95];

/// Bytes de VRAM de uma textura: KTX2/Basis = 0.5 B/texel (BC7), legado = 4 B/texel (RGBA8).
pub fn texture_vram_bytes(tier: AssetQualityTier, width: u32, height: u32) -> u64 {
    let pixels = u64::from(width).saturating_mul(u64::from(height));
    if tier.uses_ktx2_basis() {
        pixels / 2
    } else {
        pixels * 4
    }
}

/// Métricas topológicas de uma malha — reportadas pelo cooker/loader.
///
/// A contagem real (faces degeneradas, arestas non-manifold, loops de borda,
/// vértices isolados) é responsabilidade do loader de malha; este gate apenas
/// **avalia** o relatório de forma determinística. Malha não-editável falha.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct AssetTopologyMetrics {
    pub vertices: u64,
    pub triangles: u64,
    pub degenerate_faces: u64,
    pub non_manifold_edges: u64,
    pub open_boundary_loops: u64,
    pub isolated_vertices: u64,
}

impl AssetTopologyMetrics {
    /// Malha com topologia perfeita (zero defeitos).
    pub const fn perfect_topology(vertices: u64, triangles: u64) -> Self {
        Self {
            vertices,
            triangles,
            degenerate_faces: 0,
            non_manifold_edges: 0,
            open_boundary_loops: 0,
            isolated_vertices: 0,
        }
    }
}

/// Amostra de qualidade topológica — nota 0–100 e razões de defeito.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TopologyQualitySample {
    /// Nota 0–100 (100 = malha perfeita).
    pub grade: u32,
    /// Faces degeneradas / triângulos.
    pub degenerate_ratio: f32,
    /// Arestas non-manifold / vértices.
    pub non_manifold_ratio: f32,
    /// Loops de borda abertos / vértices.
    pub boundary_ratio: f32,
    /// Vértices isolados / vértices.
    pub isolated_ratio: f32,
    /// Todas as razões são finitas.
    pub all_finite: bool,
    /// Computável E acima do piso universal (60). O mínimo do tier é aplicado
    /// pelo veredito — não aqui.
    pub ready: bool,
}

/// Avaliador topológico — converte métricas de malha em nota 0–100.
///
/// Penalidades por defeito (pesos): degenerada ×40, non-manifold ×30, borda
/// aberta ×15, vértice isolado ×5. Nota = `100 − Σ(razão × peso)`, clampada.
pub struct AssetTopologyQuality;

impl AssetTopologyQuality {
    pub fn grade(m: &AssetTopologyMetrics) -> TopologyQualitySample {
        let tri = m.triangles.max(1) as f32;
        let vert = m.vertices.max(1) as f32;
        let degenerate_ratio = m.degenerate_faces as f32 / tri;
        let non_manifold_ratio = m.non_manifold_edges as f32 / vert;
        let boundary_ratio = m.open_boundary_loops as f32 / vert;
        let isolated_ratio = m.isolated_vertices as f32 / vert;
        let all_finite = degenerate_ratio.is_finite()
            && non_manifold_ratio.is_finite()
            && boundary_ratio.is_finite()
            && isolated_ratio.is_finite();
        let raw = 100.0
            - degenerate_ratio * TOPOLOGY_GRADER_WEIGHT_DEGENERATE
            - non_manifold_ratio * TOPOLOGY_GRADER_WEIGHT_NON_MANIFOLD
            - boundary_ratio * TOPOLOGY_GRADER_WEIGHT_BOUNDARY
            - isolated_ratio * TOPOLOGY_GRADER_WEIGHT_ISOLATED;
        let grade = if all_finite {
            raw.clamp(0.0, 100.0).round() as u32
        } else {
            0
        };
        let ready = all_finite && grade >= TOPOLOGY_GRADE_FLOOR;
        TopologyQualitySample {
            grade,
            degenerate_ratio,
            non_manifold_ratio,
            boundary_ratio,
            isolated_ratio,
            all_finite,
            ready,
        }
    }
}

/// Manifesto de asset — o que o gerador/loader reporta para o gate julgar.
#[derive(Debug, Clone, Copy)]
pub struct AssetQualityManifest {
    pub tier: AssetQualityTier,
    pub preview_triangles: u64,
    pub hero_triangles: u64,
    pub texture_width: u32,
    pub texture_height: u32,
    pub lod_levels_present: u32,
    pub has_collision_proxy: bool,
    pub has_navmesh_proxy: bool,
    pub texels_per_meter: f32,
    pub provenance_hash: u64,
    pub topology: AssetTopologyMetrics,
}

/// Veredito determinístico de aceitação do asset.
#[derive(Debug, Clone, Copy)]
pub struct AssetQualityVerdict {
    /// `true` somente quando TODOS os gates passam.
    pub ready: bool,
    pub tier: AssetQualityTier,
    pub triangle_budget_ok: bool,
    pub texture_dim_ok: bool,
    pub texture_vram_ok: bool,
    pub lod_manifest_ok: bool,
    pub collision_proxy_ok: bool,
    pub navmesh_proxy_ok: bool,
    pub texel_density_ok: bool,
    pub provenance_ok: bool,
    pub topology_ok: bool,
    pub topology_grade: u32,
    pub min_topology_grade: u32,
    pub preview_triangles: u64,
    pub hero_triangles: u64,
    pub max_preview_triangles: u64,
    pub max_hero_triangles: u64,
    pub texture_width: u32,
    pub texture_height: u32,
    pub texture_vram_bytes: u64,
    pub max_texture_vram_bytes: u64,
    pub lod_levels_present: u32,
    pub required_lod_levels: u32,
    pub texels_per_meter: f32,
    pub min_texels_per_meter: f32,
    pub blocker_count: u32,
    pub evidence_fingerprint: u64,
}

impl AssetQualityVerdict {
    /// Veredito fail-closed — usado quando não há manifesto para julgar.
    pub fn fail_closed() -> Self {
        Self {
            ready: false,
            tier: AssetQualityTier::AiDraft,
            triangle_budget_ok: false,
            texture_dim_ok: false,
            texture_vram_ok: false,
            lod_manifest_ok: false,
            collision_proxy_ok: false,
            navmesh_proxy_ok: false,
            texel_density_ok: false,
            provenance_ok: false,
            topology_ok: false,
            topology_grade: 0,
            min_topology_grade: 0,
            preview_triangles: 0,
            hero_triangles: 0,
            max_preview_triangles: 0,
            max_hero_triangles: 0,
            texture_width: 0,
            texture_height: 0,
            texture_vram_bytes: 0,
            max_texture_vram_bytes: 0,
            lod_levels_present: 0,
            required_lod_levels: 0,
            texels_per_meter: 0.0,
            min_texels_per_meter: 0.0,
            blocker_count: 9,
            evidence_fingerprint: 0,
        }
    }
}

/// Manifesto de referência — o mínimo viável que DEVE passar em cada tier.
pub fn reference_manifest(tier: AssetQualityTier) -> AssetQualityManifest {
    let min_dim = tier.min_texture_dim();
    AssetQualityManifest {
        tier,
        preview_triangles: tier.max_preview_triangles() / 2,
        hero_triangles: tier.max_hero_triangles() / 4,
        texture_width: min_dim,
        texture_height: min_dim,
        lod_levels_present: tier.required_lod_levels(),
        has_collision_proxy: tier.requires_collision_proxy(),
        has_navmesh_proxy: tier.requires_navmesh_proxy(),
        texels_per_meter: tier.min_texels_per_meter() * 2.0,
        provenance_hash: 0x6277_5F61_7373_6574,
        topology: AssetTopologyMetrics::perfect_topology(
            tier.max_preview_triangles() / 2,
            tier.max_hero_triangles() / 4,
        ),
    }
}

/// Avalia um manifesto contra o tier — veredito determinístico.
pub fn evaluate_asset_quality(m: &AssetQualityManifest) -> AssetQualityVerdict {
    let tier = m.tier;
    let max_preview = tier.max_preview_triangles();
    let max_hero = tier.max_hero_triangles();
    let min_dim = tier.min_texture_dim();
    let max_dim = tier.max_texture_dim();
    let required_lod = tier.required_lod_levels();
    let min_texels = tier.min_texels_per_meter();
    let min_topo = tier.min_topology_grade();

    let triangle_budget_ok = m.preview_triangles > 0
        && m.hero_triangles > 0
        && m.preview_triangles <= max_preview
        && m.hero_triangles <= max_hero;
    let texture_dim_ok = m.texture_width >= min_dim
        && m.texture_height >= min_dim
        && m.texture_width <= max_dim
        && m.texture_height <= max_dim;
    let vram = texture_vram_bytes(tier, m.texture_width, m.texture_height);
    let texture_vram_ok = vram <= TEXTURE_VRAM_HARD_CAP_BYTES;
    let lod_manifest_ok = m.lod_levels_present >= required_lod;
    let collision_proxy_ok = !tier.requires_collision_proxy() || m.has_collision_proxy;
    let navmesh_proxy_ok = !tier.requires_navmesh_proxy() || m.has_navmesh_proxy;
    let texel_density_ok = m.texels_per_meter.is_finite() && m.texels_per_meter >= min_texels;
    let provenance_ok = m.provenance_hash != 0;
    let topo = AssetTopologyQuality::grade(&m.topology);
    let topology_ok = topo.all_finite && topo.grade >= min_topo;

    let blockers = [
        !triangle_budget_ok,
        !texture_dim_ok,
        !texture_vram_ok,
        !lod_manifest_ok,
        !collision_proxy_ok,
        !navmesh_proxy_ok,
        !texel_density_ok,
        !provenance_ok,
        !topology_ok,
    ];
    let blocker_count = blockers.iter().filter(|b| **b).count() as u32;
    let ready = blocker_count == 0;

    let mut verdict = AssetQualityVerdict {
        ready,
        tier,
        triangle_budget_ok,
        texture_dim_ok,
        texture_vram_ok,
        lod_manifest_ok,
        collision_proxy_ok,
        navmesh_proxy_ok,
        texel_density_ok,
        provenance_ok,
        topology_ok,
        topology_grade: topo.grade,
        min_topology_grade: min_topo,
        preview_triangles: m.preview_triangles,
        hero_triangles: m.hero_triangles,
        max_preview_triangles: max_preview,
        max_hero_triangles: max_hero,
        texture_width: m.texture_width,
        texture_height: m.texture_height,
        texture_vram_bytes: vram,
        max_texture_vram_bytes: TEXTURE_VRAM_HARD_CAP_BYTES,
        lod_levels_present: m.lod_levels_present,
        required_lod_levels: required_lod,
        texels_per_meter: m.texels_per_meter,
        min_texels_per_meter: min_texels,
        blocker_count,
        evidence_fingerprint: 0,
    };
    verdict.evidence_fingerprint = verdict_fingerprint(&verdict);
    verdict
}

/// Quantização estável de float (bit-exata para entradas idênticas).
fn quant_f32(v: f32) -> u64 {
    if v.is_finite() {
        (v * 1_000_000.0).round().to_bits() as u64
    } else {
        0xDEAD_BEEF_0000_0000
    }
}

/// Mix FNV-1a-ish — estável entre plataformas para partes u64.
fn hash_mix(mut h: u64, v: u64) -> u64 {
    h ^= v
        .wrapping_add(0x9E37_79B9_7F4A_7C15)
        .wrapping_add(h << 6)
        .wrapping_add(h >> 2);
    h
}

/// Fingerprint de um conjunto medido de partes u64.
fn fingerprint(parts: &[u64]) -> u64 {
    let mut h = FP_SEED ^ FP_XOR;
    for p in parts {
        h = hash_mix(h, *p);
    }
    h
}

/// Fingerprint estável de um veredito (a autoridade por-manifesto).
fn verdict_fingerprint(v: &AssetQualityVerdict) -> u64 {
    fingerprint(&[
        u64::from(v.ready),
        v.tier as u64,
        u64::from(v.triangle_budget_ok),
        u64::from(v.texture_dim_ok),
        u64::from(v.texture_vram_ok),
        u64::from(v.lod_manifest_ok),
        u64::from(v.collision_proxy_ok),
        u64::from(v.navmesh_proxy_ok),
        u64::from(v.texel_density_ok),
        u64::from(v.provenance_ok),
        u64::from(v.topology_ok),
        u64::from(v.topology_grade),
        u64::from(v.min_topology_grade),
        v.preview_triangles,
        v.hero_triangles,
        v.max_preview_triangles,
        v.max_hero_triangles,
        u64::from(v.texture_width),
        u64::from(v.texture_height),
        v.texture_vram_bytes,
        v.max_texture_vram_bytes,
        u64::from(v.lod_levels_present),
        u64::from(v.required_lod_levels),
        quant_f32(v.texels_per_meter),
        quant_f32(v.min_texels_per_meter),
        u64::from(v.blocker_count),
    ])
}

/// Medição determinística do gate — os quatro tiers + invariantes de falha.
struct AssetQualityMeasured {
    max_preview: [u64; 4],
    max_hero: [u64; 4],
    max_texture_dim: [u32; 4],
    texture_vram: [u64; 4],
    required_lod: [u32; 4],
    min_texels: [f32; 4],
    topology_min: [u32; 4],
    verdicts: [AssetQualityVerdict; 4],
    topology_perfect_grade: u32,
    topology_degraded_grade: u32,
    overflow_ready: bool,
    missing_lod_ready: bool,
    missing_collision_ready: bool,
    missing_navmesh_ready: bool,
    low_texel_ready: bool,
    zero_provenance_ready: bool,
}

/// Executa a passada medida — resolve os quatro tiers de forma determinística.
fn run_measured_pass() -> AssetQualityMeasured {
    let tiers = AssetQualityTier::ALL;
    let max_preview = [
        tiers[0].max_preview_triangles(),
        tiers[1].max_preview_triangles(),
        tiers[2].max_preview_triangles(),
        tiers[3].max_preview_triangles(),
    ];
    let max_hero = [
        tiers[0].max_hero_triangles(),
        tiers[1].max_hero_triangles(),
        tiers[2].max_hero_triangles(),
        tiers[3].max_hero_triangles(),
    ];
    let max_texture_dim = [
        tiers[0].max_texture_dim(),
        tiers[1].max_texture_dim(),
        tiers[2].max_texture_dim(),
        tiers[3].max_texture_dim(),
    ];
    // Ladder de transporte no tamanho máximo quadrado (honesto: KTX2 < RGBA8).
    let texture_vram = [
        texture_vram_bytes(tiers[0], 2048, 2048),
        texture_vram_bytes(tiers[1], 4096, 4096),
        texture_vram_bytes(tiers[2], 8192, 8192),
        texture_vram_bytes(tiers[3], 8192, 8192),
    ];
    let required_lod = [
        tiers[0].required_lod_levels(),
        tiers[1].required_lod_levels(),
        tiers[2].required_lod_levels(),
        tiers[3].required_lod_levels(),
    ];
    let min_texels = [
        tiers[0].min_texels_per_meter(),
        tiers[1].min_texels_per_meter(),
        tiers[2].min_texels_per_meter(),
        tiers[3].min_texels_per_meter(),
    ];
    let topology_min = [
        tiers[0].min_topology_grade(),
        tiers[1].min_topology_grade(),
        tiers[2].min_topology_grade(),
        tiers[3].min_topology_grade(),
    ];
    let verdicts = [
        evaluate_asset_quality(&reference_manifest(tiers[0])),
        evaluate_asset_quality(&reference_manifest(tiers[1])),
        evaluate_asset_quality(&reference_manifest(tiers[2])),
        evaluate_asset_quality(&reference_manifest(tiers[3])),
    ];
    let perfect =
        AssetTopologyQuality::grade(&AssetTopologyMetrics::perfect_topology(10_000, 20_000));
    let degraded = AssetTopologyQuality::grade(&AssetTopologyMetrics {
        vertices: 100,
        triangles: 100,
        degenerate_faces: 40,
        non_manifold_edges: 5,
        open_boundary_loops: 10,
        isolated_vertices: 4,
    });
    let overflow = evaluate_asset_quality(&AssetQualityManifest {
        hero_triangles: max_hero[3] + 1,
        ..reference_manifest(tiers[3])
    });
    let no_lod = evaluate_asset_quality(&AssetQualityManifest {
        lod_levels_present: 0,
        ..reference_manifest(tiers[3])
    });
    let no_collision = evaluate_asset_quality(&AssetQualityManifest {
        has_collision_proxy: false,
        ..reference_manifest(tiers[1])
    });
    let no_navmesh = evaluate_asset_quality(&AssetQualityManifest {
        has_navmesh_proxy: false,
        ..reference_manifest(tiers[2])
    });
    let low_texel = evaluate_asset_quality(&AssetQualityManifest {
        texels_per_meter: 8.0,
        ..reference_manifest(tiers[1])
    });
    let no_prov = evaluate_asset_quality(&AssetQualityManifest {
        provenance_hash: 0,
        ..reference_manifest(tiers[0])
    });
    AssetQualityMeasured {
        max_preview,
        max_hero,
        max_texture_dim,
        texture_vram,
        required_lod,
        min_texels,
        topology_min,
        verdicts,
        topology_perfect_grade: perfect.grade,
        topology_degraded_grade: degraded.grade,
        overflow_ready: overflow.ready,
        missing_lod_ready: no_lod.ready,
        missing_collision_ready: no_collision.ready,
        missing_navmesh_ready: no_navmesh.ready,
        low_texel_ready: low_texel.ready,
        zero_provenance_ready: no_prov.ready,
    }
}

/// Fingerprint estável da passada medida (a autoridade inteira do gate).
fn asset_quality_gate_evidence_fingerprint(m: &AssetQualityMeasured) -> u64 {
    let mut parts: Vec<u64> = Vec::with_capacity(64);
    for v in m.max_preview {
        parts.push(v);
    }
    for v in m.max_hero {
        parts.push(v);
    }
    for v in m.max_texture_dim {
        parts.push(u64::from(v));
    }
    for v in m.texture_vram {
        parts.push(v);
    }
    for v in m.required_lod {
        parts.push(u64::from(v));
    }
    for v in m.min_texels {
        parts.push(quant_f32(v));
    }
    for v in m.topology_min {
        parts.push(u64::from(v));
    }
    for v in &m.verdicts {
        parts.push(v.evidence_fingerprint);
    }
    parts.push(u64::from(m.topology_perfect_grade));
    parts.push(u64::from(m.topology_degraded_grade));
    parts.push(u64::from(m.overflow_ready));
    parts.push(u64::from(m.missing_lod_ready));
    parts.push(u64::from(m.missing_collision_ready));
    parts.push(u64::from(m.missing_navmesh_ready));
    parts.push(u64::from(m.low_texel_ready));
    parts.push(u64::from(m.zero_provenance_ready));
    fingerprint(&parts)
}

/// Relatório de soak — TODAS as invariantes do gate juntas, fail-closed.
#[derive(Debug, Clone)]
pub struct AssetQualityGateSoakReport {
    /// Soak-gated — TODAS as invariantes devem passar juntas.
    pub asset_quality_gate_ready: bool,
    /// Tetos de triângulo crescem estritamente entre os tiers.
    pub tier_budgets_monotonic: bool,
    /// Ladder de VRAM honesto (KTX2 estritamente mais barato + hard cap 64 MiB).
    pub vram_ladder_monotonic: bool,
    /// O manifesto de referência passa nos quatro tiers.
    pub all_four_tiers_accept_reference_manifest: bool,
    /// Mínimos topológicos crescem estritamente (60/80/90/95).
    pub topology_grade_ladder: bool,
    /// Topologia perfeita pontua 100.
    pub perfect_topology_scores_full: bool,
    /// Topologia degradada falha o studio e o cloud.
    pub degraded_topology_fails_closed: bool,
    /// Estouro de triângulos falha fail-closed.
    pub triangle_overflow_fails_closed: bool,
    /// LoD ausente falha fail-closed.
    pub missing_lod_fails_closed: bool,
    /// Colisão ausente falha fail-closed (onde exigida).
    pub missing_collision_fails_closed: bool,
    /// Navmesh ausente falha fail-closed (onde exigida).
    pub missing_navmesh_fails_closed: bool,
    /// Densidade de texel baixa falha fail-closed.
    pub low_texel_density_fails_closed: bool,
    /// Proveniência zero falha fail-closed.
    pub zero_provenance_fails_closed: bool,
    /// Mesma entrada → mesmo fingerprint.
    pub deterministic_replay: bool,
    /// Todos os valores de ponto flutuante são finitos.
    pub outputs_finite: bool,
    /// Tag estável de evidência (letra **bw**).
    pub evidence_kind: &'static str,
    /// Fingerprint da passada medida.
    pub evidence_fingerprint: u64,
    pub distinct_from_asset_color_appearance_probe: bool,
    pub distinct_from_asset_spectral_radiance_probe: bool,
    pub distinct_from_scalable_fidelity_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_hdr_32bit_float_pipeline_probe: bool,
    /// Prontidão por tier (manifesto de referência).
    pub tier_ai_draft_ready: bool,
    pub tier_curated_ready: bool,
    pub tier_studio_optimized_ready: bool,
    pub tier_cloud_render_ready: bool,
    /// Hard cap de VRAM exposto ao criativo (Law XVI / J.1).
    pub texture_vram_hard_cap_bytes: u64,
    /// Honestidade — o gate é compiled-only; flags AAA abaixo permanecem false.
    pub aaa_held_honest: bool,
    /// HELD — bounce RT em tempo real não é produto neste gate.
    pub rt_gi_bounce_ready: bool,
    /// HELD — paridade de qualidade Unreal não é reivindicada aqui.
    pub unreal_asset_quality_parity_ready: bool,
}

/// Executa o soak completo do Asset Quality Gate.
pub fn run_asset_quality_gate_soak() -> AssetQualityGateSoakReport {
    let m = run_measured_pass();
    let fp = asset_quality_gate_evidence_fingerprint(&m);
    let replay = run_measured_pass();
    let fp_replay = asset_quality_gate_evidence_fingerprint(&replay);
    let deterministic_replay = fp == fp_replay;

    // --- Orçamentos são estritamente crescentes -----------------------------
    let tier_budgets_monotonic = m.max_preview.windows(2).all(|w| w[0] < w[1])
        && m.max_hero.windows(2).all(|w| w[0] < w[1]);

    // --- Ladder de VRAM: KTX2 estritamente mais barato + hard cap ------------
    let vram_ladder_monotonic = m.texture_vram[0] < m.texture_vram[1]
        && m.texture_vram[2] < m.texture_vram[1]
        && m.texture_vram[3] <= m.texture_vram[1]
        && m.texture_vram.iter().all(|v| *v <= TEXTURE_VRAM_HARD_CAP_BYTES);

    // --- Manifesto de referência passa nos quatro tiers ----------------------
    let all_four_tiers_accept_reference_manifest =
        m.verdicts.iter().all(|v| v.ready && v.blocker_count == 0);

    // --- Mínimos topológicos estritamente crescentes -------------------------
    let topology_grade_ladder = m.topology_min.windows(2).all(|w| w[0] < w[1]);

    // --- Topologia perfeita = 100; degradada falha studio + cloud ------------
    let perfect_topology_scores_full = m.topology_perfect_grade == 100;
    let degraded_topology_fails_closed = m.topology_degraded_grade < m.topology_min[2]
        && m.topology_degraded_grade < m.topology_min[3];

    // --- Fail-closed ----------------------------------------------------------
    let triangle_overflow_fails_closed = !m.overflow_ready;
    let missing_lod_fails_closed = !m.missing_lod_ready;
    let missing_collision_fails_closed = !m.missing_collision_ready;
    let missing_navmesh_fails_closed = !m.missing_navmesh_ready;
    let low_texel_density_fails_closed = !m.low_texel_ready;
    let zero_provenance_fails_closed = !m.zero_provenance_ready;

    // --- Finitude -------------------------------------------------------------
    let outputs_finite = m
        .verdicts
        .iter()
        .all(|v| v.texels_per_meter.is_finite() && v.min_texels_per_meter.is_finite())
        && m.min_texels.iter().all(|t| t.is_finite());

    // --- Honestidade AAA ------------------------------------------------------
    let aaa_held_honest = true;
    let rt_gi_bounce_ready = false;
    let unreal_asset_quality_parity_ready = false;

    let asset_quality_gate_ready = tier_budgets_monotonic
        && vram_ladder_monotonic
        && all_four_tiers_accept_reference_manifest
        && topology_grade_ladder
        && perfect_topology_scores_full
        && degraded_topology_fails_closed
        && triangle_overflow_fails_closed
        && missing_lod_fails_closed
        && missing_collision_fails_closed
        && missing_navmesh_fails_closed
        && low_texel_density_fails_closed
        && zero_provenance_fails_closed
        && deterministic_replay
        && outputs_finite;

    // --- Distinção vs probes pares -------------------------------------------
    let distinct_from_asset_color_appearance_probe =
        fp != run_asset_color_appearance_soak().evidence_fingerprint;
    let distinct_from_asset_spectral_radiance_probe =
        fp != run_asset_spectral_radiance_soak().evidence_fingerprint;
    let distinct_from_scalable_fidelity_probe = fp != run_fidelity_soak().evidence_fingerprint;
    let distinct_from_aces_cinematic_tonemapper_probe =
        fp != run_aces_cinematic_tonemapper_soak().fingerprint;
    let distinct_from_hdr_32bit_float_pipeline_probe =
        fp != run_hdr_32bit_float_pipeline_soak().fingerprint;

    AssetQualityGateSoakReport {
        asset_quality_gate_ready,
        tier_budgets_monotonic,
        vram_ladder_monotonic,
        all_four_tiers_accept_reference_manifest,
        topology_grade_ladder,
        perfect_topology_scores_full,
        degraded_topology_fails_closed,
        triangle_overflow_fails_closed,
        missing_lod_fails_closed,
        missing_collision_fails_closed,
        missing_navmesh_fails_closed,
        low_texel_density_fails_closed,
        zero_provenance_fails_closed,
        deterministic_replay,
        outputs_finite,
        evidence_kind: "asset_quality_gate_tiered_manifest",
        evidence_fingerprint: fp,
        distinct_from_asset_color_appearance_probe,
        distinct_from_asset_spectral_radiance_probe,
        distinct_from_scalable_fidelity_probe,
        distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_hdr_32bit_float_pipeline_probe,
        tier_ai_draft_ready: m.verdicts[0].ready,
        tier_curated_ready: m.verdicts[1].ready,
        tier_studio_optimized_ready: m.verdicts[2].ready,
        tier_cloud_render_ready: m.verdicts[3].ready,
        texture_vram_hard_cap_bytes: TEXTURE_VRAM_HARD_CAP_BYTES,
        aaa_held_honest,
        rt_gi_bounce_ready,
        unreal_asset_quality_parity_ready,
    }
}

/// Probe de honestidade — soak-gated `assetQualityGateReady` (letra bw).
pub fn probe_asset_quality_gate() -> AssetQualityGateSoakReport {
    run_asset_quality_gate_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tier_tags_match_the_ts_pipeline_lanes() {
        assert_eq!(AssetQualityTier::AiDraft.tag(), "ai-draft");
        assert_eq!(AssetQualityTier::CuratedMarketplace.tag(), "curated-marketplace");
        assert_eq!(
            AssetQualityTier::StudioLocalOptimized.tag(),
            "studio-local-optimized"
        );
        assert_eq!(AssetQualityTier::CloudRenderGrade.tag(), "cloud-render-grade");
    }

    #[test]
    fn budget_tables_match_the_ts_pipeline() {
        let tiers = AssetQualityTier::ALL;
        let preview = [
            tiers[0].max_preview_triangles(),
            tiers[1].max_preview_triangles(),
            tiers[2].max_preview_triangles(),
            tiers[3].max_preview_triangles(),
        ];
        let hero = [
            tiers[0].max_hero_triangles(),
            tiers[1].max_hero_triangles(),
            tiers[2].max_hero_triangles(),
            tiers[3].max_hero_triangles(),
        ];
        assert_eq!(preview, [10_000, 250_000, 500_000, 1_000_000]);
        assert_eq!(hero, [25_000, 750_000, 2_000_000, 10_000_000]);
        assert_eq!(preview.windows(2).all(|w| w[0] < w[1]), true);
        assert_eq!(hero.windows(2).all(|w| w[0] < w[1]), true);
    }

    #[test]
    fn texture_dimensions_and_ktx2_transport_ladder() {
        let tiers = AssetQualityTier::ALL;
        let min_dim = [
            tiers[0].min_texture_dim(),
            tiers[1].min_texture_dim(),
            tiers[2].min_texture_dim(),
            tiers[3].min_texture_dim(),
        ];
        let max_dim = [
            tiers[0].max_texture_dim(),
            tiers[1].max_texture_dim(),
            tiers[2].max_texture_dim(),
            tiers[3].max_texture_dim(),
        ];
        assert_eq!(min_dim, [1024, 2048, 4096, 8192]);
        assert_eq!(max_dim, [2048, 4096, 8192, 8192]);
        assert_eq!(
            [tiers[0].uses_ktx2_basis(), tiers[1].uses_ktx2_basis(), tiers[2].uses_ktx2_basis(), tiers[3].uses_ktx2_basis()],
            [false, false, true, true]
        );
        // 4K RGBA8 legado = 64 MiB (no cap); 8K KTX2 = 32 MiB.
        assert_eq!(texture_vram_bytes(tiers[1], 4096, 4096), TEXTURE_VRAM_HARD_CAP_BYTES);
        assert_eq!(texture_vram_bytes(tiers[2], 8192, 8192), 33_554_432);
    }

    #[test]
    fn lod_collision_navmesh_are_staircased() {
        let tiers = AssetQualityTier::ALL;
        let lod = [
            tiers[0].required_lod_levels(),
            tiers[1].required_lod_levels(),
            tiers[2].required_lod_levels(),
            tiers[3].required_lod_levels(),
        ];
        assert_eq!(lod, [1, 2, 4, 4]);
        assert!(!tiers[0].requires_collision_proxy());
        assert!(tiers[1].requires_collision_proxy());
        assert!(tiers[2].requires_collision_proxy());
        assert!(tiers[3].requires_collision_proxy());
        assert!(!tiers[0].requires_navmesh_proxy());
        assert!(!tiers[1].requires_navmesh_proxy());
        assert!(tiers[2].requires_navmesh_proxy());
        assert!(tiers[3].requires_navmesh_proxy());
    }

    #[test]
    fn ktx2_transport_is_strictly_cheaper_than_legacy() {
        // Mesma área de pixels: 8K KTX2 (32 MiB) < 4K RGBA8 (64 MiB).
        let ktx2 = texture_vram_bytes(AssetQualityTier::CloudRenderGrade, 8192, 8192);
        let legacy = texture_vram_bytes(AssetQualityTier::CuratedMarketplace, 4096, 4096);
        assert!(ktx2 < legacy);
        assert!(ktx2 <= TEXTURE_VRAM_HARD_CAP_BYTES);
    }

    #[test]
    fn reference_manifest_passes_all_four_tiers() {
        for tier in AssetQualityTier::ALL {
            let v = evaluate_asset_quality(&reference_manifest(tier));
            assert!(v.ready, "tier {} must accept its reference manifest", tier.tag());
            assert_eq!(v.blocker_count, 0);
        }
    }

    #[test]
    fn triangle_overflow_fails_closed() {
        let bad = AssetQualityManifest {
            hero_triangles: AssetQualityTier::CloudRenderGrade.max_hero_triangles() + 1,
            ..reference_manifest(AssetQualityTier::CloudRenderGrade)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.triangle_budget_ok);
        assert!(!v.ready);
    }

    #[test]
    fn empty_mesh_fails_closed() {
        let bad = AssetQualityManifest {
            preview_triangles: 0,
            hero_triangles: 0,
            ..reference_manifest(AssetQualityTier::AiDraft)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.triangle_budget_ok);
        assert!(!v.ready);
    }

    #[test]
    fn missing_lod_fails_closed() {
        let bad = AssetQualityManifest {
            lod_levels_present: 0,
            ..reference_manifest(AssetQualityTier::CloudRenderGrade)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.lod_manifest_ok);
        assert!(!v.ready);
    }

    #[test]
    fn missing_collision_fails_closed() {
        let bad = AssetQualityManifest {
            has_collision_proxy: false,
            ..reference_manifest(AssetQualityTier::CuratedMarketplace)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.collision_proxy_ok);
        assert!(!v.ready);
    }

    #[test]
    fn missing_navmesh_fails_closed() {
        let bad = AssetQualityManifest {
            has_navmesh_proxy: false,
            ..reference_manifest(AssetQualityTier::StudioLocalOptimized)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.navmesh_proxy_ok);
        assert!(!v.ready);
    }

    #[test]
    fn low_texel_density_fails_closed() {
        let bad = AssetQualityManifest {
            texels_per_meter: 8.0,
            ..reference_manifest(AssetQualityTier::CuratedMarketplace)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.texel_density_ok);
        assert!(!v.ready);
    }

    #[test]
    fn nan_texel_density_fails_closed() {
        let bad = AssetQualityManifest {
            texels_per_meter: f32::NAN,
            ..reference_manifest(AssetQualityTier::CuratedMarketplace)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.texel_density_ok);
        assert!(!v.ready);
    }

    #[test]
    fn zero_provenance_fails_closed() {
        let bad = AssetQualityManifest {
            provenance_hash: 0,
            ..reference_manifest(AssetQualityTier::AiDraft)
        };
        let v = evaluate_asset_quality(&bad);
        assert!(!v.provenance_ok);
        assert!(!v.ready);
    }

    #[test]
    fn ai_draft_does_not_demand_collision_or_navmesh() {
        let m = reference_manifest(AssetQualityTier::AiDraft);
        let v = evaluate_asset_quality(&AssetQualityManifest {
            has_collision_proxy: false,
            has_navmesh_proxy: false,
            ..m
        });
        assert!(v.ready);
        assert!(v.collision_proxy_ok);
        assert!(v.navmesh_proxy_ok);
    }

    #[test]
    fn topology_perfect_grades_full_and_degraded_fails_cloud() {
        let perfect =
            AssetTopologyQuality::grade(&AssetTopologyMetrics::perfect_topology(10_000, 20_000));
        assert_eq!(perfect.grade, 100);
        assert!(perfect.ready);
        assert!(perfect.all_finite);
        assert_eq!(perfect.degenerate_ratio, 0.0);
        assert_eq!(perfect.non_manifold_ratio, 0.0);

        let degraded = AssetTopologyQuality::grade(&AssetTopologyMetrics {
            vertices: 100,
            triangles: 100,
            degenerate_faces: 40,
            non_manifold_edges: 5,
            open_boundary_loops: 10,
            isolated_vertices: 4,
        });
        assert!(degraded.grade < AssetQualityTier::CloudRenderGrade.min_topology_grade());
        assert!(degraded.grade < AssetQualityTier::StudioLocalOptimized.min_topology_grade());
        assert!(degraded.grade >= AssetQualityTier::AiDraft.min_topology_grade());
    }

    #[test]
    fn topology_grade_ladder_is_strict() {
        let mins = [
            AssetQualityTier::AiDraft.min_topology_grade(),
            AssetQualityTier::CuratedMarketplace.min_topology_grade(),
            AssetQualityTier::StudioLocalOptimized.min_topology_grade(),
            AssetQualityTier::CloudRenderGrade.min_topology_grade(),
        ];
        assert_eq!(mins, [60, 80, 90, 95]);
        assert!(mins.windows(2).all(|w| w[0] < w[1]));
    }

    #[test]
    fn topology_grader_weights_match_the_ts_mirror() {
        // Anti-drift Law XI: `topology-grader.ts` espelha este `grade()` bit-exato.
        // Literais ABAIXO devem bater com `TOPOLOGY_GRADER_WEIGHTS`,
        // `TOPOLOGY_GRADE_FLOOR` e `TIER_MIN_TOPOLOGY_GRADES` em
        // `cloud-web-app/web/lib/mesh-quality/topology-grader.ts`.
        assert_eq!(TOPOLOGY_GRADER_WEIGHT_DEGENERATE, 40.0_f32);
        assert_eq!(TOPOLOGY_GRADER_WEIGHT_NON_MANIFOLD, 30.0_f32);
        assert_eq!(TOPOLOGY_GRADER_WEIGHT_BOUNDARY, 15.0_f32);
        assert_eq!(TOPOLOGY_GRADER_WEIGHT_ISOLATED, 5.0_f32);
        assert_eq!(TOPOLOGY_GRADE_FLOOR, 60);
        assert_eq!(TOPOLOGY_TIER_MIN_GRADES, [60, 80, 90, 95]);

        // Fixture degradada (100/100, 40/5/10/4): razões 0.4/0.05/0.1/0.04
        // -> raw = 80.8 -> clamp -> round = 81. O espelho TS (`topology-grader.ts`)
        // e o vitest `asset-quality-gate-verdict.test.ts` afirmam o MESMO 81.
        let degraded = AssetTopologyQuality::grade(&AssetTopologyMetrics {
            vertices: 100,
            triangles: 100,
            degenerate_faces: 40,
            non_manifold_edges: 5,
            open_boundary_loops: 10,
            isolated_vertices: 4,
        });
        assert_eq!(degraded.grade, 81);
        assert!(degraded.ready);
        assert!(degraded.all_finite);
        assert_eq!(degraded.degenerate_ratio, 0.4_f32);
        assert_eq!(degraded.non_manifold_ratio, 0.05_f32);
        assert_eq!(degraded.boundary_ratio, 0.1_f32);
        assert_eq!(degraded.isolated_ratio, 0.04_f32);

        // Perfeita permanece 100 — trava o topo da escala no mesmo stack.
        let perfect =
            AssetTopologyQuality::grade(&AssetTopologyMetrics::perfect_topology(10_000, 20_000));
        assert_eq!(perfect.grade, 100);
        assert!(perfect.ready);
    }

    #[test]
    fn same_manifest_is_deterministic() {
        let a = evaluate_asset_quality(&reference_manifest(AssetQualityTier::CloudRenderGrade));
        let b = evaluate_asset_quality(&reference_manifest(AssetQualityTier::CloudRenderGrade));
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.ready, b.ready);
    }

    #[test]
    fn measured_pass_is_deterministic() {
        let a = run_measured_pass();
        let b = run_measured_pass();
        assert_eq!(
            asset_quality_gate_evidence_fingerprint(&a),
            asset_quality_gate_evidence_fingerprint(&b)
        );
    }

    #[test]
    fn soak_gates_ready_with_aaa_held() {
        let r = run_asset_quality_gate_soak();
        assert!(r.asset_quality_gate_ready, "bw soak gates");
        assert_eq!(r.evidence_kind, "asset_quality_gate_tiered_manifest");
        assert!(r.tier_budgets_monotonic);
        assert!(r.vram_ladder_monotonic);
        assert!(r.all_four_tiers_accept_reference_manifest);
        assert!(r.topology_grade_ladder);
        assert!(r.perfect_topology_scores_full);
        assert!(r.degraded_topology_fails_closed);
        assert!(r.triangle_overflow_fails_closed);
        assert!(r.missing_lod_fails_closed);
        assert!(r.missing_collision_fails_closed);
        assert!(r.missing_navmesh_fails_closed);
        assert!(r.low_texel_density_fails_closed);
        assert!(r.zero_provenance_fails_closed);
        assert!(r.outputs_finite);
        assert!(r.aaa_held_honest);
        assert!(!r.rt_gi_bounce_ready);
        assert!(!r.unreal_asset_quality_parity_ready);
        assert!(r.tier_ai_draft_ready);
        assert!(r.tier_curated_ready);
        assert!(r.tier_studio_optimized_ready);
        assert!(r.tier_cloud_render_ready);
        assert_eq!(r.texture_vram_hard_cap_bytes, TEXTURE_VRAM_HARD_CAP_BYTES);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_asset_quality_gate();
        let s = run_asset_quality_gate_soak();
        assert_eq!(p.asset_quality_gate_ready, s.asset_quality_gate_ready);
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
    }

    #[test]
    fn soak_is_deterministic() {
        let a = run_asset_quality_gate_soak();
        let b = run_asset_quality_gate_soak();
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
    }

    #[test]
    fn bw_distinct_from_all_peers() {
        let r = run_asset_quality_gate_soak();
        assert!(r.distinct_from_asset_color_appearance_probe);
        assert!(r.distinct_from_asset_spectral_radiance_probe);
        assert!(r.distinct_from_scalable_fidelity_probe);
        assert!(r.distinct_from_aces_cinematic_tonemapper_probe);
        assert!(r.distinct_from_hdr_32bit_float_pipeline_probe);
    }
}

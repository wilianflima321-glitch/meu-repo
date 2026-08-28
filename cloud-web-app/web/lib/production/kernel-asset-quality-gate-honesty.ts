/**
 * Asset Quality Gate honesty catalog (web-side declarative consult — letter **bw**).
 *
 * The authoritative soak lives in `packages/aethel-kernel-rust/src/asset_quality_gate.rs`
 * (Rust, 21 tests, cargo test green). The tier budget tables and the deterministic
 * 9-blocker verdict mirror live in `asset-quality-gate-verdict.ts` (canonical web
 * source — this module depends on it, never the reverse). This module is the
 * DECLARATIVE consult that:
 *
 *  1. Mirrors the kernel tier budget tables EXACTLY (re-exported from the verdict
 *     mirror — max preview/hero triangles, min/max texture dims, KTX2/Basis
 *     transport, LoD levels, collision/navmesh proxies, texels-per-meter, min
 *     topology grade) so the web and the kernel can never drift — the kernel test
 *     `budget_tables_match_the_ts_pipeline` asserts the Rust side against these same
 *     tags/lanes.
 *  2. Cross-links `GameAssetQualityTier` from `game-asset-quality-pipeline.ts`
 *     (identical 4 tags — this IS the renderer asset manifest quality gate).
 *  3. When a `manifest` is supplied to the consult, computes the SAME deterministic
 *     `AssetQualityVerdictMirror` the kernel would (9 blockers) — fail-closed when
 *     no manifest is provided.
 *  4. Follows the same honesty rule as `kernel-load-scale-honesty.ts`: the web catalog
 *     does NOT re-run Rust soaks, so `assetQualityGateReady` stays `false` and all
 *     AAA flags stay HELD until desktop Tauri IPC evidence is wired.
 *
 * The `consultAssetQualityGateForDispatch` helper is the J.1 choke entry point: every
 * creative/LLM dispatch for mesh/texture/world-layout domains consults the gate and
 * appends ledger evidence BEFORE the provider runs — without faking readiness.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildGameAssetQualityPipeline,
  evaluateGameAssetQualityReadiness,
  type GameAssetQualityTier,
} from './game-asset-quality-pipeline'
import {
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from './task-evidence-ledger'
import {
  ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
  assetTextureVramBytes,
  evaluateAssetQualityManifest,
  failClosedAssetQualityVerdict,
  KERNEL_ASSET_QUALITY_TIER_CATALOG,
  type AssetQualityManifestInput,
  type AssetQualityVerdictMirror,
  type KernelAssetQualityTierCatalog,
} from './asset-quality-gate-verdict'

// Re-export da fonte canônica (as tabelas vivem no mirror do veredito) — compatibilidade.
export {
  ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
  assetTextureVramBytes,
  KERNEL_ASSET_QUALITY_TIER_CATALOG,
} from './asset-quality-gate-verdict'
export type { KernelAssetQualityTierCatalog } from './asset-quality-gate-verdict'

const log = createComponentLogger('kernel-asset-quality-gate-honesty')

export type KernelAssetQualityGateReport = {
  letter: 'bw'
  overallStatus: 'COMPILED_ONLY'
  /** Compiled-only wire (P2g disconnection, S-11 debt) — não alcançável via IPC. */
  assetQualityGateReady: false
  tierCatalog: readonly KernelAssetQualityTierCatalog[]
  textureVramHardCapBytes: typeof ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES
  /** Sobak real vive no kernel Rust — web não pode re-provar sem IPC desktop. */
  aaaHeldHonest: true
  rtGiBounceReady: false
  unrealAssetQualityParityReady: false
  marketingAllowed: false
  heldReason: 'bw_compiled_only_ipc_evidence_open'
  notes: string[]
}

/** Static catalog alinhado com o kernel `asset_quality_gate.rs` (R30). */
export function probeKernelAssetQualityGate(): KernelAssetQualityGateReport {
  const pipeline = buildGameAssetQualityPipeline()
  const notes = [
    'Kernel soak real em packages/aethel-kernel-rust/src/asset_quality_gate.rs (21 testes, cargo test green).',
    'Web não re-executa soaks Rust — evidência IPC desktop Tauri necessária para flip de ready.',
    'Tier tags idênticas às lanes GameAssetQualityTier (game-asset-quality-pipeline.ts) — sem drift.',
    'KTX2/Basis é estritamente mais barato que RGBA8 (0.5 vs 4 B/texel) — invariante vram_ladder_monotonic.',
    'Topologia mínima 60/80/90/95 (ai-draft → cloud) — superior a Meshy/Tripo em gate topológico.',
    'O mirror determinístico do veredito (asset-quality-gate-verdict.ts) é usado pelo consult quando há manifesto.',
    'rt_gi_bounce_ready e unreal_asset_quality_parity_ready permanecem HELD (honestidade).',
  ]
  log.info('kernel_asset_quality_gate_probed', {
    tiers: KERNEL_ASSET_QUALITY_TIER_CATALOG.length,
    pipelineStages: pipeline.stages.length,
    vramHardCapBytes: ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
  })
  return {
    letter: 'bw',
    overallStatus: 'COMPILED_ONLY',
    assetQualityGateReady: false,
    tierCatalog: KERNEL_ASSET_QUALITY_TIER_CATALOG,
    textureVramHardCapBytes: ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
    aaaHeldHonest: true,
    rtGiBounceReady: false,
    unrealAssetQualityParityReady: false,
    marketingAllowed: false,
    heldReason: 'bw_compiled_only_ipc_evidence_open',
    notes,
  }
}

export type AssetQualityGateConsultInput = {
  domain: 'mesh' | 'texture' | 'world-layout'
  targetTier: GameAssetQualityTier
  /** Evidências já anexadas ao pipeline de qualidade (IDs de refs no ledger). */
  evidenceRefs?: string[]
  /** Para claim final (não-draft): exige aprovação humana + evidência completa. */
  finalClaim?: boolean
  /**
   * Manifesto do asset (reportado pelo cooker/loader). Quando presente, o consult
   * computa o veredito determinístico do mirror bw — os MESMOS 9 blockers do kernel.
   * Ausente → veredito fail-closed (bloqueado até o manifesto existir).
   */
  manifest?: AssetQualityManifestInput
}

export type AssetQualityGateConsult = {
  gate: KernelAssetQualityGateReport
  tier: KernelAssetQualityTierCatalog
  vramHardCapBytes: number
  /** fail-closed: gate compiled-only → nenhum tier é declarado pronto via web. */
  tierReady: false
  finalClaimHeld: boolean
  qualityReadiness: ReturnType<typeof evaluateGameAssetQualityReadiness>
  /** Veredito determinístico do mirror bw — fail-closed quando nenhum manifesto é fornecido. */
  declarativeVerdict: AssetQualityVerdictMirror
  consultNote: string
}

/**
 * J.1 choke consult — registra evidência do gate NO LEDGER antes do dispatch do provider.
 * NUNCA declara readiness (compiled-only); apenas documenta o gate e bloqueia claims
 * finais de ai-draft (fail-closed até evidência IPC desktop + pipeline completo).
 * Quando um `manifest` é fornecido, computa o veredito determinístico do mirror bw.
 */
export function consultAssetQualityGateForDispatch(
  input: AssetQualityGateConsultInput,
  ledger: TaskEvidenceLedger,
): { consult: AssetQualityGateConsult; ledger: TaskEvidenceLedger } {
  const gate = probeKernelAssetQualityGate()
  const tier = KERNEL_ASSET_QUALITY_TIER_CATALOG.find((candidate) => candidate.tag === input.targetTier)
  if (!tier) {
    const failed = {
      gate,
      tier: KERNEL_ASSET_QUALITY_TIER_CATALOG[0],
      vramHardCapBytes: ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
      tierReady: false as const,
      finalClaimHeld: true,
      qualityReadiness: evaluateGameAssetQualityReadiness({
        tier: 'ai-draft',
        evidenceRefs: [],
      }),
      declarativeVerdict: failClosedAssetQualityVerdict(),
      consultNote: 'tier_desconhecido_fail_closed',
    }
    const nextLedger = appendTaskEvidence(ledger, {
      kind: 'validation',
      title: 'Asset Quality Gate consult (letter bw) — tier desconhecido',
      summary: `targetTier=${input.targetTier} não existe no catálogo do gate — fail closed`,
      refs: [`asset-quality-gate:bw`],
      actor: 'KernelAssetQualityGate',
    })
    return { consult: failed, ledger: nextLedger }
  }

  const finalClaimHeld =
    input.finalClaim === true && (input.targetTier === 'ai-draft' || (input.evidenceRefs?.length ?? 0) === 0)

  const qualityReadiness = evaluateGameAssetQualityReadiness({
    tier: input.targetTier,
    evidenceRefs: input.evidenceRefs ?? [],
  })

  const declarativeVerdict = input.manifest
    ? evaluateAssetQualityManifest(input.manifest)
    : failClosedAssetQualityVerdict()

  const vramForReference = assetTextureVramBytes(input.targetTier, tier.minTextureDim, tier.minTextureDim)
  const consultNote = [
    `gate=${gate.letter} compiled-only (ready=false até IPC desktop)`,
    `tier=${tier.tag} hero≤${tier.maxHeroTriangles} preview≤${tier.maxPreviewTriangles}`,
    `texture ${tier.minTextureDim}²→${tier.maxTextureDim}² ${tier.usesKtx2Basis ? 'KTX2/Basis 0.5B/texel' : 'RGBA8 4B/texel'}`,
    `LoD=${tier.requiredLodLevels} colisão=${tier.requiresCollisionProxy} navmesh=${tier.requiresNavmeshProxy}`,
    `texels/m=${tier.minTexelsPerMeter} gradeTopológica mín=${tier.minTopologyGrade}`,
    `vramRef=${vramForReference}B cap=${ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES}B`,
    input.manifest
      ? `verdict(manifest)=ready:${declarativeVerdict.ready} blockers:${declarativeVerdict.blockerCount} topo:${declarativeVerdict.topologyGrade}/${declarativeVerdict.minTopologyGrade}`
      : 'verdict=fail_closed (nenhum manifesto fornecido)',
    finalClaimHeld ? 'FINAL CLAIM HELD (draft ou evidência incompleta)' : 'claim final não exigido neste dispatch',
  ].join(' | ')

  const consult: AssetQualityGateConsult = {
    gate,
    tier,
    vramHardCapBytes: ASSET_QUALITY_GATE_VRAM_HARD_CAP_BYTES,
    tierReady: false,
    finalClaimHeld,
    qualityReadiness,
    declarativeVerdict,
    consultNote,
  }

  const nextLedger = appendTaskEvidence(ledger, {
    kind: 'validation',
    title: `Asset Quality Gate consult (letter bw) — ${input.domain}/${input.targetTier}`,
    summary: consultNote,
    refs: [
      `asset-quality-gate:bw`,
      `asset-quality-gate:tier:${input.targetTier}`,
      ...(input.evidenceRefs ?? []).map((ref) => `evidence:${ref}`),
    ],
    actor: 'KernelAssetQualityGate',
  })

  return { consult, ledger: nextLedger }
}

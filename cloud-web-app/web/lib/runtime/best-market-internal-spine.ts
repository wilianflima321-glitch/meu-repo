import { buildAgentRuntimeSpinePlan, validateAgentRuntimeSpinePlan } from '@/lib/agents/agent-runtime-spine'
import { buildExportPipelinePlan, validateExportPipelinePlan } from '@/lib/export/export-pipeline-spine'
import { type GovernedRuntimeState } from '@/lib/product/workspace-blueprint'
import { buildContextMemorySpinePlan, validateContextMemorySpinePlan } from '@/lib/production/context-memory-spine'
import {
  buildGameAssetQualityPipeline,
  evaluateAssetFinalClaimReadiness,
} from '@/lib/production/game-asset-quality-pipeline'
import { buildResearchRuntimeSpinePlan, validateResearchRuntimeSpinePlan } from '@/lib/research/research-runtime-spine'
import {
  buildAethelToolchainReadinessSnapshot,
} from '@/lib/runtime/runtime-toolchain-readiness-snapshot'
import type { AethelToolchainLaneId } from '@/lib/runtime/runtime-toolchain-dependency-map'
import { buildRuntimeFailureSmokePackReport } from '@/lib/runtime/runtime-failure-smoke-pack'
import { buildRuntimeResilienceBudgetReport } from '@/lib/runtime/runtime-resilience-budget'
import { buildV29ForensicRuntimeBacklogReport } from '@/lib/runtime/v29-forensic-runtime-backlog'
export type BestMarketInternalDomainId =
  | 'apps'
  | 'research'
  | 'agents'
  | 'games'
  | 'films'
  | 'viewport'
  | 'studio-local'
  | 'cloud-render'
  | 'export'
  | 'marketplace'
  | 'context-memory'
  | 'browser-operator'
export type BestMarketInternalSeverity = 'p0' | 'p1' | 'p2'
export type BestMarketInternalDomain = {
  id: BestMarketInternalDomainId
  label: string
  state: GovernedRuntimeState
  maxHonestClaim: string
  lanes: AethelToolchainLaneId[]
  requiredEvidence: string[]
  blockers: string[]
  nextAction: string
}
export type BestMarketInternalGap = {
  id: string
  domainId: BestMarketInternalDomainId
  severity: BestMarketInternalSeverity
  blocker: string
  nextAction: string
}
export type BestMarketInternalSpineInput = {
  mission?: string
  env?: Record<string, string | undefined>
  evidenceRefs?: string[]
  installedNativeToolIds?: string[]
  approvedHumanProcessIds?: string[]
  browserReplayEnabled?: boolean
  artifactPersistenceEnabled?: boolean
  sourceCount?: number
  confidenceScores?: number[]
  costEstimateUsd?: number | null
  finalAnswerReady?: boolean
  humanReviewed?: boolean
  toolRegistryAvailable?: boolean
  sandboxProvider?: 'none' | 'local-script-sandbox' | 'vercel-sandbox' | 'studio-local'
  vectorStoreProvider?: 'none' | 'local-index' | 'cloud-index'
  roleEvalSuiteAvailable?: boolean
  studioLocalAvailable?: boolean
  cloudRenderAvailable?: boolean
  privacyMaskEnabled?: boolean
}
export type BestMarketInternalSpineReport = {
  version: 1
  generatedAt: string
  capability: 'AETHEL_BEST_MARKET_INTERNAL_SPINE'
  state: GovernedRuntimeState
  domainCount: number
  availableDomainCount: number
  heldOrBlockedDomainCount: number
  p0GapCount: number
  p1GapCount: number
  p2GapCount: number
  domains: BestMarketInternalDomain[]
  gaps: BestMarketInternalGap[]
  noFakeSuccessRules: string[]
  forensicRuntimeBacklog: {
    blockCount: number
    p0Count: number
    heldOrBlockedCount: number
    nextExecutionBlock: string
  }
  runtimeResilienceBudgets: {
    budgetCount: number
    heldOrBlockedBudgetCount: number
    p0BlockerCount: number
    nextAction: string
  }
  runtimeFailureSmokePack: {
    scenarioCount: number
    governedFailureCount: number
    recoveredWithReceiptsCount: number
    blockedForReviewCount: number
    marketClaimAllowed: false
  }
  nextAction: string
}
export type BestMarketInternalSearchParams = {
  get(name: string): string | null
}
const DOMAIN_ORDER: BestMarketInternalDomainId[] = [
  'apps',
  'research',
  'agents',
  'games',
  'films',
  'viewport',
  'studio-local',
  'cloud-render',
  'export',
  'marketplace',
  'context-memory',
  'browser-operator',
]
export const BEST_MARKET_INTERNAL_NO_FAKE_SUCCESS_RULES = [
  'Apps need route, auth, billing, observability, rollback, validation, and human release approval evidence before production claims.',
  'Research needs source receipts, browser replay, artifacts, confidence, cost, contradiction handling, and review before verified claims.',
  'Agents need scoped tools, selected memory, sandboxing, browser replay, role evals, receipts, and approval gates before autonomy claims.',
  'Games and films need provenance, license, LOD/PBR, rig/collision/navmesh, performance, playtest/playback, and human approval before final claims.',
  'Browser preview is for review and annotation; final render, cooking, native export, and heavy indexing require Studio Local or Cloud Render evidence.',
  'Cloud Stream and signed installers remain held unless session URL, cost cap, teardown, signing, updater, and rollback receipts exist.',
  'Runtime resilience needs crash-state-receipt, rollback-receipt, teardown-receipt, takeover-control-receipt, and human-review-receipt before stronger reliability claims.',
]
function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}
function mergeState(states: GovernedRuntimeState[]): GovernedRuntimeState {
  if (states.includes('blocked')) return 'blocked'
  if (states.includes('provider_unavailable')) return 'provider_unavailable'
  if (states.includes('human_review_required')) return 'human_review_required'
  if (states.includes('held')) return 'held'
  if (states.includes('needs-review')) return 'needs-review'
  return 'available'
}
function missingEvidence(requiredEvidence: string[], evidenceRefs: string[]): string[] {
  const normalizedRefs = evidenceRefs.map((ref) => ref.toLowerCase())
  return requiredEvidence.filter((item) => !normalizedRefs.some((ref) => ref.includes(item.toLowerCase())))
}
function stateFrom(blockers: string[], fallback: GovernedRuntimeState = 'needs-review'): GovernedRuntimeState {
  if (blockers.some((item) => /not available|missing dependency|no sandbox|blocked|final/i.test(item))) return 'blocked'
  if (blockers.some((item) => /provider|daemon|cloud/i.test(item))) return 'provider_unavailable'
  if (blockers.some((item) => /human|approval|review/i.test(item))) return 'human_review_required'
  if (blockers.length > 0) return fallback
  return 'available'
}
function severityFor(blocker: string): BestMarketInternalSeverity {
  if (/final|approval|license|provenance|autonomous|browser replay|sandbox|native|cloud|signed|installer|publish/i.test(blocker)) {
    return 'p0'
  }
  if (/cost|rollback|performance|context|memory|evidence|playtest|playback/i.test(blocker)) return 'p1'
  return 'p2'
}
function domain(input: Omit<BestMarketInternalDomain, 'state'> & { state?: GovernedRuntimeState }): BestMarketInternalDomain {
  return {
    ...input,
    state: input.state ?? stateFrom(input.blockers),
    requiredEvidence: unique(input.requiredEvidence),
    blockers: unique(input.blockers),
  }
}
function splitCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return unique(value.split(','))
}
function readBoolean(value: string | null | undefined): boolean | undefined {
  if (value == null) return undefined
  if (/^(1|true|yes|on)$/i.test(value)) return true
  if (/^(0|false|no|off)$/i.test(value)) return false
  return undefined
}
function readNumber(value: string | null | undefined): number | undefined {
  if (value == null || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
function readSandboxProvider(value: string | null | undefined): BestMarketInternalSpineInput['sandboxProvider'] {
  if (value === 'local-script-sandbox' || value === 'vercel-sandbox' || value === 'studio-local') return value
  if (value === 'none') return 'none'
  return undefined
}
function readVectorStoreProvider(value: string | null | undefined): BestMarketInternalSpineInput['vectorStoreProvider'] {
  if (value === 'local-index' || value === 'cloud-index') return value
  if (value === 'none') return 'none'
  return undefined
}
export function coerceBestMarketInternalSpineInputFromSearchParams(
  searchParams: BestMarketInternalSearchParams,
  env: Record<string, string | undefined> = process.env,
): BestMarketInternalSpineInput {
  return {
    mission: searchParams.get('mission') ?? undefined,
    env,
    evidenceRefs: splitCsv(searchParams.get('evidenceRefs')),
    installedNativeToolIds: splitCsv(searchParams.get('installedNativeToolIds')),
    approvedHumanProcessIds: splitCsv(searchParams.get('approvedHumanProcessIds')),
    browserReplayEnabled: readBoolean(searchParams.get('browserReplayEnabled') ?? searchParams.get('browserReplay')),
    artifactPersistenceEnabled: readBoolean(searchParams.get('artifactPersistenceEnabled') ?? searchParams.get('artifacts')),
    sourceCount: readNumber(searchParams.get('sourceCount')),
    confidenceScores: splitCsv(searchParams.get('confidenceScores')).map(Number).filter(Number.isFinite),
    costEstimateUsd: readNumber(searchParams.get('costEstimateUsd')) ?? null,
    finalAnswerReady: readBoolean(searchParams.get('finalAnswerReady')),
    humanReviewed: readBoolean(searchParams.get('humanReviewed')),
    toolRegistryAvailable: readBoolean(searchParams.get('toolRegistryAvailable')),
    sandboxProvider: readSandboxProvider(searchParams.get('sandboxProvider')),
    vectorStoreProvider: readVectorStoreProvider(searchParams.get('vectorStoreProvider')),
    roleEvalSuiteAvailable: readBoolean(searchParams.get('roleEvalSuiteAvailable')),
    studioLocalAvailable: readBoolean(searchParams.get('studioLocalAvailable')),
    cloudRenderAvailable: readBoolean(searchParams.get('cloudRenderAvailable')),
    privacyMaskEnabled: readBoolean(searchParams.get('privacyMaskEnabled')),
  }
}
export function buildBestMarketInternalSpineReport(input: BestMarketInternalSpineInput = {}): BestMarketInternalSpineReport {
  const evidenceRefs = input.evidenceRefs ?? []
  const toolchain = buildAethelToolchainReadinessSnapshot({
    env: input.env,
    installedNativeToolIds: input.installedNativeToolIds,
    approvedHumanProcessIds: input.approvedHumanProcessIds,
  })
  const contextMemory = buildContextMemorySpinePlan({
    mission: input.mission ?? 'Build a governed Aethel workspace',
    surface: 'ide',
    retrievalPlan: null,
    indexingPlan: null,
    runtime: null,
    evidenceRefs,
    readReceiptRefs: evidenceRefs.filter((ref) => /read|receipt|shard/i.test(ref)),
    humanReviewApproved: input.humanReviewed,
  })
  const agentRuntime = buildAgentRuntimeSpinePlan({
    memoryPlan: contextMemory,
    toolRegistryAvailable: input.toolRegistryAvailable,
    sandboxProvider: input.sandboxProvider ?? 'none',
    browserReplayEnabled: input.browserReplayEnabled,
    vectorStoreProvider: input.vectorStoreProvider ?? 'none',
    roleEvalSuiteAvailable: input.roleEvalSuiteAvailable,
    humanApprovalRequired: !input.humanReviewed,
    evidenceRefs,
  })
  const researchRuntime = buildResearchRuntimeSpinePlan({
    query: input.mission,
    sourceCount: input.sourceCount,
    browserReplayEnabled: input.browserReplayEnabled,
    artifactPersistenceEnabled: input.artifactPersistenceEnabled,
    confidenceScores: input.confidenceScores,
    costEstimateUsd: input.costEstimateUsd,
    finalAnswerReady: input.finalAnswerReady,
    humanReviewed: input.humanReviewed,
    evidenceRefs,
  })
  const gameAssetQuality = buildGameAssetQualityPipeline()
  const finalAsset = evaluateAssetFinalClaimReadiness({
    currentTier: 'ai-draft',
    evidenceRefs,
    humanApproved: input.humanReviewed,
  })
  const exportPlan = buildExportPipelinePlan({
    format: 'zip',
    runtimeLane: input.studioLocalAvailable ? 'studio-local' : input.cloudRenderAvailable ? 'cloud-render' : 'browser-preview',
    studioLocalAvailable: input.studioLocalAvailable,
    cloudRenderAvailable: input.cloudRenderAvailable,
    assetQualityLedger: null,
    humanApproved: input.humanReviewed,
    evidenceRefs,
  })
  const appsEvidence = ['route contracts pass', 'typecheck pass', 'lint pass', 'rollback plan', 'human release approval']
  const researchEvidence = ['source', 'browser', 'replay', 'artifact', 'confidence', 'cost', 'final']
  const marketplaceEvidence = ['permission manifest', 'license', 'provenance', 'rollback plan', 'creator payout readiness', 'risk review']
  const cloudEvidence = ['session URL', 'cost per minute', 'session teardown', 'playback evidence']
  const studioEvidence = ['3-OS CI build', 'signed installer evidence', 'updater signature', 'rollback plan']
  const domains = [
    domain({
      id: 'apps',
      label: 'Apps and SaaS',
      maxHonestClaim: 'governed app workflow until release receipts and human approval are attached',
      lanes: ['apps-production'],
      requiredEvidence: appsEvidence,
      blockers: missingEvidence(appsEvidence, evidenceRefs).map((item) => `Missing app release evidence: ${item}`),
      nextAction: 'Attach validation, rollback, observability, billing, and release approval receipts.',
    }),
    domain({
      id: 'research',
      label: 'Research and intelligence',
      maxHonestClaim: 'auditable research workspace, not verified research unless receipts are complete',
      lanes: ['research-intelligence'],
      requiredEvidence: researchEvidence,
      blockers: validateResearchRuntimeSpinePlan(researchRuntime).concat(researchRuntime.blockers),
      nextAction: researchRuntime.nextAction,
    }),
    domain({
      id: 'agents',
      label: 'Agent workforce',
      maxHonestClaim: 'governed agent squad while tools, memory, sandbox, browser replay, and approvals are explicit',
      lanes: ['apps-production', 'research-intelligence'],
      requiredEvidence: ['tool receipt', 'memory receipt', 'sandbox receipt', 'browser replay', 'approval receipt'],
      blockers: validateAgentRuntimeSpinePlan(agentRuntime).concat(agentRuntime.blockers),
      nextAction: agentRuntime.nextAction,
    }),
    domain({
      id: 'games',
      label: 'Games and interactive worlds',
      maxHonestClaim: 'playable prototype or governed vertical slice; never final/full game without production evidence',
      lanes: ['game-prototype', 'game-vertical-slice', 'complete-game-plan', 'asset-finalization'],
      requiredEvidence: [...gameAssetQuality.stages.flatMap((stage) => stage.evidence), 'bot playtest replay'],
      blockers: finalAsset.blockers.concat(
        toolchain.matrix.lanes
          .filter((lane) => ['game-prototype', 'game-vertical-slice', 'complete-game-plan', 'asset-finalization'].includes(lane.laneId))
          .flatMap((lane) => lane.blockers),
      ),
      nextAction: 'Resolve asset quality, native/cloud runtime, playtest, performance, and approval evidence before stronger game claims.',
    }),
    domain({
      id: 'films',
      label: 'Films and cinematic packets',
      maxHonestClaim: 'cinematic review packet until render, playback, audio, and approval evidence are complete',
      lanes: ['film-cinematic', 'asset-finalization', 'cloud-stream'],
      requiredEvidence: ['shot list', 'storyboard frames', 'audio cue sheet', 'performance report', 'playback evidence'],
      blockers: finalAsset.blockers.concat(
        input.cloudRenderAvailable || input.studioLocalAvailable ? ['Playback/render receipts still required.'] : ['Cinematic rendering needs Studio Local or Cloud Render evidence.'],
      ),
      nextAction: 'Keep browser as storyboard/review until render backend and playback evidence exist.',
    }),
    domain({
      id: 'viewport',
      label: 'Viewport and canvas runtime',
      maxHonestClaim: 'canonical preview/editing surface; final render only after runtime evidence',
      lanes: ['game-prototype', 'game-vertical-slice'],
      requiredEvidence: ['runtime capability', 'performance trace', 'rollback plan', 'asset quality ledger'],
      blockers: ['Viewport requires render contract, asset quality ledger, performance trace, proposal diff, and rollback evidence before final claims.'],
      nextAction: 'Keep selection, gizmo, outliner, inspector, timeline, and proposals inside the canonical runtime surface.',
    }),
    domain({
      id: 'studio-local',
      label: 'Studio Local native runtime',
      maxHonestClaim: 'held/beta native runtime until signed installer, updater, daemon, and job evidence exist',
      lanes: ['studio-local-release', 'asset-finalization'],
      requiredEvidence: studioEvidence,
      blockers: input.studioLocalAvailable ? missingEvidence(studioEvidence, evidenceRefs).map((item) => `Missing Studio Local evidence: ${item}`) : ['Studio Local daemon capability is not available.'],
      nextAction: 'Probe daemon, sign jobs, hash tools, and store receipts before native work.',
    }),
    domain({
      id: 'cloud-render',
      label: 'Cloud Render and Stream',
      maxHonestClaim: 'held cloud lane until session URL, cost cap, teardown, and playback receipts exist',
      lanes: ['cloud-stream', 'film-cinematic'],
      requiredEvidence: cloudEvidence,
      blockers: input.cloudRenderAvailable ? missingEvidence(cloudEvidence, evidenceRefs).map((item) => `Missing cloud render evidence: ${item}`) : ['Cloud Render/Stream provider is not configured.'],
      nextAction: 'Provision only governed sessions with URL, cost cap, teardown, and playback evidence.',
    }),
    domain({
      id: 'export',
      label: 'Export and publishing',
      maxHonestClaim: 'reviewable export plan until runtime, quality ledger, rollback, and approval are complete',
      lanes: ['apps-production', 'asset-finalization', 'studio-local-release'],
      requiredEvidence: exportPlan.requiredEvidence,
      blockers: validateExportPipelinePlan(exportPlan).concat(exportPlan.blockers),
      nextAction: exportPlan.nextAction,
    }),
    domain({
      id: 'marketplace',
      label: 'Marketplace and provenance',
      maxHonestClaim: 'reviewable package until license, permissions, payout, risk, and rollback evidence are complete',
      lanes: ['marketplace-provenance'],
      requiredEvidence: marketplaceEvidence,
      blockers: missingEvidence(marketplaceEvidence, evidenceRefs).map((item) => `Missing marketplace evidence: ${item}`),
      nextAction: 'Verify license, provenance, permissions, creator rights, payout readiness, risk, and rollback.',
    }),
    domain({
      id: 'context-memory',
      label: 'Context and memory',
      maxHonestClaim: 'governed selected memory; never broad context without budgets, shards, receipts, and device controls',
      lanes: ['research-intelligence', 'apps-production'],
      requiredEvidence: ['selected shards', 'read receipts', 'context budget', 'device controls'],
      blockers: validateContextMemorySpinePlan(contextMemory).concat(contextMemory.blockers),
      nextAction: contextMemory.nextAction,
    }),
    domain({
      id: 'browser-operator',
      label: 'Browser operator',
      maxHonestClaim: 'browser replay workspace when URL, DOM, screenshot, step log, and takeover controls exist',
      lanes: ['research-intelligence'],
      requiredEvidence: ['url receipt', 'dom receipt', 'screenshot receipt', 'replay receipt', 'takeover control'],
      blockers: input.browserReplayEnabled ? [] : ['Browser replay is held; operator cannot claim navigation proof.'],
      nextAction: 'Attach URL, DOM, screenshot, step log, replay, stop, and takeover receipts.',
    }),
  ].sort((a, b) => DOMAIN_ORDER.indexOf(a.id) - DOMAIN_ORDER.indexOf(b.id))
  const gaps = domains.flatMap((item) =>
    item.blockers.map((blocker, index) => ({
      id: `${item.id}:gap:${index + 1}`,
      domainId: item.id,
      severity: severityFor(blocker),
      blocker,
      nextAction: item.nextAction,
    })),
  )
  const state = mergeState(domains.map((item) => item.state))
  const p0GapCount = gaps.filter((gap) => gap.severity === 'p0').length
  const p1GapCount = gaps.filter((gap) => gap.severity === 'p1').length
  const p2GapCount = gaps.filter((gap) => gap.severity === 'p2').length
  const forensic = buildV29ForensicRuntimeBacklogReport()
  const resilience = buildRuntimeResilienceBudgetReport({
    evidenceRefs,
    ideRegionBoundariesReady: evidenceRefs.some((ref) => /ide|error boundary|region/i.test(ref)),
    previewFallbackReady: evidenceRefs.some((ref) => /preview|fallback|viewport/i.test(ref)),
    agentSandboxReady: input.sandboxProvider != null && input.sandboxProvider !== 'none',
    researchTakeoverReady: input.browserReplayEnabled,
    studioLocalCrashManifestReady: input.studioLocalAvailable,
    cloudTeardownReady: input.cloudRenderAvailable,
    publishRollbackReady: evidenceRefs.some((ref) => /rollback|publish/i.test(ref)),
    humanReviewed: input.humanReviewed,
  })
  const smokePack = buildRuntimeFailureSmokePackReport()
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    capability: 'AETHEL_BEST_MARKET_INTERNAL_SPINE',
    state,
    domainCount: domains.length,
    availableDomainCount: domains.filter((item) => item.state === 'available').length,
    heldOrBlockedDomainCount: domains.filter((item) => item.state !== 'available').length,
    p0GapCount,
    p1GapCount,
    p2GapCount,
    domains,
    gaps,
    noFakeSuccessRules: [...BEST_MARKET_INTERNAL_NO_FAKE_SUCCESS_RULES],
    forensicRuntimeBacklog: {
      blockCount: forensic.blockCount,
      p0Count: forensic.p0Count,
      heldOrBlockedCount: forensic.heldOrBlockedCount,
      nextExecutionBlock: forensic.nextExecutionBlock,
    },
    runtimeResilienceBudgets: {
      budgetCount: resilience.budgetCount,
      heldOrBlockedBudgetCount: resilience.heldOrBlockedBudgetCount,
      p0BlockerCount: resilience.p0BlockerCount,
      nextAction: resilience.nextAction,
    },
    runtimeFailureSmokePack: {
      scenarioCount: smokePack.scenarioCount,
      governedFailureCount: smokePack.governedFailureCount,
      recoveredWithReceiptsCount: smokePack.recoveredWithReceiptsCount,
      blockedForReviewCount: smokePack.blockedForReviewCount,
      marketClaimAllowed: smokePack.marketClaimAllowed,
    },
    nextAction:
      p0GapCount > 0
        ? 'Resolve P0 evidence/toolchain/runtime gaps before claiming best-in-market execution.'
        : state === 'available'
          ? 'All modeled domains can proceed with receipts and human review.'
          : 'Resolve held domains and keep claims bounded by maxHonestClaim.',
  }
}
export function validateBestMarketInternalSpineReport(report: BestMarketInternalSpineReport): string[] {
  const failures: string[] = []
  const ids = new Set(report.domains.map((item) => item.id))
  for (const id of DOMAIN_ORDER) {
    if (!ids.has(id)) failures.push(`missing domain: ${id}`)
  }
  if (report.domainCount !== DOMAIN_ORDER.length) failures.push(`expected domainCount ${DOMAIN_ORDER.length}`)
  if (report.domainCount !== report.domains.length) failures.push('domainCount does not match domains length')
  if (report.heldOrBlockedDomainCount !== report.domains.filter((item) => item.state !== 'available').length) {
    failures.push('heldOrBlockedDomainCount does not match domains')
  }
  if (report.p0GapCount !== report.gaps.filter((gap) => gap.severity === 'p0').length) failures.push('p0GapCount mismatch')
  if (report.p1GapCount !== report.gaps.filter((gap) => gap.severity === 'p1').length) failures.push('p1GapCount mismatch')
  if (report.p2GapCount !== report.gaps.filter((gap) => gap.severity === 'p2').length) failures.push('p2GapCount mismatch')
  if (report.domains.length !== DOMAIN_ORDER.length) failures.push(`expected ${DOMAIN_ORDER.length} domains`)
  if (report.noFakeSuccessRules.length < 6) failures.push('no-fake-success matrix is too thin')
  if (report.forensicRuntimeBacklog.blockCount < 9) failures.push('forensic runtime backlog is too thin')
  if (report.forensicRuntimeBacklog.p0Count < 6) failures.push('forensic runtime backlog must track P0 runtime debt')
  if (report.runtimeResilienceBudgets.budgetCount < 7) failures.push('runtime resilience budgets are too thin')
  if (report.runtimeResilienceBudgets.p0BlockerCount < 5) failures.push('runtime resilience budgets must expose P0 blockers')
  if (report.runtimeFailureSmokePack.scenarioCount < 7) failures.push('runtime failure smoke pack is too thin')
  if (report.runtimeFailureSmokePack.marketClaimAllowed !== false) failures.push('runtime failure smoke pack cannot allow market claims')
  for (const item of report.domains) {
    if (item.requiredEvidence.length === 0) failures.push(`${item.id}: required evidence is empty`)
    if (item.maxHonestClaim.length < 24) failures.push(`${item.id}: maxHonestClaim is too vague`)
    if (item.state === 'available' && item.blockers.length > 0) failures.push(`${item.id}: available domain cannot have blockers`)
  }
  const games = report.domains.find((item) => item.id === 'games')
  const films = report.domains.find((item) => item.id === 'films')
  const browser = report.domains.find((item) => item.id === 'browser-operator')
  const studioLocal = report.domains.find((item) => item.id === 'studio-local')
  const cloudRender = report.domains.find((item) => item.id === 'cloud-render')
  if (!games?.requiredEvidence.some((item) => item.includes('playtest'))) failures.push('games must require playtest evidence')
  if (!films?.requiredEvidence.some((item) => item.includes('playback'))) failures.push('films must require playback evidence')
  if (!browser?.requiredEvidence.some((item) => item.includes('takeover'))) failures.push('browser operator must require takeover control')
  if (!studioLocal?.maxHonestClaim.includes('held/beta')) failures.push('studio local must stay held/beta by default')
  if (!cloudRender?.maxHonestClaim.includes('held')) failures.push('cloud render must stay held by default')
  return failures
}

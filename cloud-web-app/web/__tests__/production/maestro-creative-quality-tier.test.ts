/**
 * Maestro creative pulse + CapScore quality-tier binding (backend contracts).
 * J.12 OrchestratorProd remains STOPPED; Mini-IA allowlist-only; no UE mesh claim.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  evaluateMaestroCreativePulse,
  isMiniIaToolAllowed,
  isMiniIaToolForbidden,
  MINI_IA_ALLOWED_TOOLS,
  ORCHESTRATOR_PROD_STOPPED,
  J12_ORCHESTRATOR_PROD_SHIPPED,
  probeMaestroCreativePulseReadiness,
} from '@/lib/production/maestro-creative-pulse'
import {
  bindCreativeQualityTier,
  scaleCreativeTokenWeightForFidelity,
  UE_MESH_QUALITY_CLAIM,
  MESHY_TRIPO_CLAY_PARITY_CLAIM,
  NANITE_MESH_QUALITY_CLAIM,
  probeCreativeQualityTierReadiness,
} from '@/lib/production/creative-quality-tier-binding'

describe('creative-quality-tier-binding (CapScore)', () => {
  it('maps CapScore bands honestly and refuses missing score', () => {
    const draft = bindCreativeQualityTier({ capabilityScore: 12, domain: 'mesh' })
    expect(draft.ok).toBe(true)
    if (draft.ok) {
      expect(draft.fidelityBand).toBe('draft')
      expect(draft.cook.maxTrisHint).toBe(8_000)
      expect(draft.ueMeshQualityClaim).toBe(false)
      expect(draft.meshyTripoClayParityClaim).toBe(false)
      expect(draft.gameReadyRefinePath).toBe(true)
    }

    const standard = bindCreativeQualityTier({ capabilityScore: 30, domain: 'texture' })
    expect(standard.ok && standard.fidelityBand).toBe('standard')

    const high = bindCreativeQualityTier({ capabilityScore: 55, domain: 'mesh' })
    expect(high.ok && high.fidelityBand).toBe('high')
    if (high.ok) {
      expect(high.cook.cookPasses).toBe(3)
      expect(high.renderTier).toBe('discrete')
    }

    const missing = bindCreativeQualityTier({ capabilityScore: null, domain: 'mesh' })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.rejectCode).toBe('missing_capability_score')
  })

  it('preferCloudCook selects cloud_max without inventing UE/Meshy claims', () => {
    const cloud = bindCreativeQualityTier({
      capabilityScore: null,
      preferCloudCook: true,
      domain: 'mesh',
    })
    expect(cloud.ok).toBe(true)
    if (cloud.ok) {
      expect(cloud.fidelityBand).toBe('cloud_max')
      expect(cloud.executionLane).toBe('cloud')
      expect(cloud.cook.textureEdgePx).toBe(4096)
    }
    expect(UE_MESH_QUALITY_CLAIM).toBe(false)
    expect(MESHY_TRIPO_CLAY_PARITY_CLAIM).toBe(false)
    expect(NANITE_MESH_QUALITY_CLAIM).toBe(false)
  })

  it('scales token weight by fidelity multiplier', () => {
    const high = bindCreativeQualityTier({ capabilityScore: 50, domain: 'mesh' })
    expect(high.ok).toBe(true)
    if (high.ok) {
      expect(scaleCreativeTokenWeightForFidelity(100, high)).toBe(140)
    }
  })

  it('probe reports ready with held marketing claims', () => {
    const probe = probeCreativeQualityTierReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.ueMeshQualityClaim).toBe(false)
    expect(probe.meshyTripoClayParityClaim).toBe(false)
  })
})

describe('maestro-creative-pulse', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
  })

  it('routes game/film/app intent → CostGuard → squad → Fusion scopes', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 10_000)

    const pulse = await evaluateMaestroCreativePulse(
      {
        projectId: 'proj_game',
        userId: 'u1',
        intent: 'Generate a behavior tree scaffold for stealth AI',
        creationKind: 'game',
        domain: 'bt-graph',
        capabilityScore: 52,
        costGuard: { estimatedTokenWeight: 200, planId: 'pro', usageBucketId: 'bucket_1' },
        riskScore: 60,
      },
      ledger,
    )

    expect(pulse.ok).toBe(true)
    if (pulse.ok) {
      expect(pulse.value.allowed).toBe(true)
      expect(pulse.value.fusionScopes).toContain('behavior-tree')
      expect(pulse.value.requiresFusionWrite).toBe(true)
      expect(pulse.value.fidelityBand).toBe('high')
      expect(pulse.value.miniIaMayOrchestrate).toBe(false)
      expect(pulse.value.miniIaMaySubmitBroker).toBe(false)
      expect(pulse.value.orchestratorProdShipped).toBe(false)
      expect(pulse.value.j12Stopped).toBe(true)
      expect(pulse.value.squad.dispatched).toBe(true)
      expect(pulse.value.quality.ok).toBe(true)
      // Conveyor nucleus (Creative #1): preflight HOLDS the reservation — balance stays debited
      // until dispatch settles or release refunds it. No reserve→cancel→re-reserve TOCTOU.
      expect(pulse.value.reservationPreflightOk).toBe(true)
      expect(pulse.value.reservationId.length).toBeGreaterThan(0)
      expect(pulse.value.reservationFunding).toBe('usage_bucket')
      expect(ledger.balances.get('u1')).toBe(10_000 - 200)
    }
  })

  it('fail-closes when OrchestratorProd is requested (J.12 STOPPED)', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5_000)
    const pulse = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'Build film beat sheet',
        creationKind: 'film',
        domain: 'cinematic-beat',
        capabilityScore: 40,
        costGuard: { estimatedTokenWeight: 100, planId: 'pro' },
        requestOrchestratorProd: true,
      },
      ledger,
    )
    expect(pulse.ok).toBe(false)
    if (!pulse.ok) expect(pulse.code).toBe('orchestrator_prod_stopped')
    expect(ORCHESTRATOR_PROD_STOPPED).toBe(true)
    expect(J12_ORCHESTRATOR_PROD_SHIPPED).toBe(false)
  })

  it('fail-closes on credits missing / free tier without BYOK', async () => {
    const ledger = createMemoryCostGuardLedger()
    const free = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'free_user',
        intent: 'Make an app splash mesh',
        creationKind: 'app',
        domain: 'mesh',
        capabilityScore: 40,
        costGuard: { estimatedTokenWeight: 100, planId: 'free' },
      },
      ledger,
    )
    expect(free.ok).toBe(false)
    if (!free.ok) {
      expect(free.code).toBe('credits_missing')
      expect(free.blockedReason).toBe('free_tier_platform_pay_forbidden')
    }

    ledger.grant('broke', 10)
    const exhausted = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'broke',
        intent: 'High poly prop',
        creationKind: 'asset',
        domain: 'mesh',
        capabilityScore: 40,
        costGuard: { estimatedTokenWeight: 500, planId: 'pro' },
      },
      ledger,
    )
    expect(exhausted.ok).toBe(false)
    if (!exhausted.ok) expect(exhausted.code).toBe('credits_missing')
  })

  it('Mini-IA allowlist only — rejects host PTY, live broker, forbidden tools', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5_000)
    ledger.enableByok('u1')

    expect(isMiniIaToolAllowed('creative.intent.classify')).toBe(true)
    expect(isMiniIaToolForbidden('orchestrator.prod.dispatch')).toBe(true)
    expect(MINI_IA_ALLOWED_TOOLS).not.toContain('host.pty')

    const host = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'mesh draft',
        creationKind: 'asset',
        domain: 'mesh',
        capabilityScore: 25,
        costGuard: { estimatedTokenWeight: 50, byokProfileId: 'byok_1', planId: 'free' },
        miniIaAttemptHostPty: true,
      },
      ledger,
    )
    expect(host.ok).toBe(false)
    if (!host.ok) expect(host.code).toBe('mini_ia_host_pty_forbidden')

    const broker = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'mesh draft',
        creationKind: 'asset',
        domain: 'mesh',
        capabilityScore: 25,
        costGuard: { estimatedTokenWeight: 50, byokProfileId: 'byok_1', planId: 'free' },
        miniIaAttemptLiveBroker: true,
      },
      ledger,
    )
    expect(broker.ok).toBe(false)
    if (!broker.ok) expect(broker.code).toBe('mini_ia_live_broker_forbidden')

    const tool = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'mesh draft',
        creationKind: 'asset',
        domain: 'mesh',
        capabilityScore: 25,
        costGuard: { estimatedTokenWeight: 50, byokProfileId: 'byok_1', planId: 'free' },
        miniIaTool: 'orchestrator.prod.dispatch',
      },
      ledger,
    )
    expect(tool.ok).toBe(false)
    if (!tool.ok) expect(tool.code).toBe('mini_ia_tool_forbidden')

    const okTool = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'mesh draft',
        creationKind: 'asset',
        domain: 'mesh',
        capabilityScore: 25,
        costGuard: { estimatedTokenWeight: 50, byokProfileId: 'byok_1', planId: 'free' },
        miniIaTool: 'quality.tier.read',
        preferCloudCook: false,
      },
      ledger,
    )
    expect(okTool.ok).toBe(true)
  })

  it('refuse quality tier when CapScore missing without cloud', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5_000)
    const pulse = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'film lighting plate',
        creationKind: 'film',
        domain: 'image',
        capabilityScore: null,
        costGuard: { estimatedTokenWeight: 80, planId: 'pro' },
      },
      ledger,
    )
    expect(pulse.ok).toBe(false)
    if (!pulse.ok) expect(pulse.code).toBe('quality_tier_refused')
  })

  it('probe readiness stays PARTIAL with J.12 stopped', () => {
    const probe = probeMaestroCreativePulseReadiness()
    expect(probe.ready).toBe(true)
    expect(probe.status).toBe('PARTIAL')
    expect(probe.orchestratorProdShipped).toBe(false)
    expect(probe.j12Stopped).toBe(true)
    expect(probe.miniIaMayOrchestrate).toBe(false)
  })
})

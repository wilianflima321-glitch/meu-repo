/**
 * Letter cx — Community publish AAA audit helper.
 * Fail-closed suggestions via CreativeBridge + CostGuard (Trava I).
 * Elevator offer: light/mesh audit — never invent Coins or fake AAA pass.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  reserveCreativeCost,
  settleCreativeCostZero,
  settleCreativeCost,
  type CostGuardLedgerAdapter,
  type CreativeCostReservation,
} from '@/lib/production/creative-cost-guard'
import { evaluateBakedLightingPublishGate } from '@/lib/production/publish-arcade-honesty'
import { inspectLazyPatch } from '@/lib/production/lazy-inspector'

const log = createComponentLogger('community-publish-aaa-audit')

export const COMMUNITY_AAA_AUDIT_LETTER = 'cx' as const
export const COMMUNITY_AAA_AUDIT_WIRED = true as const

export type AaaAuditSuggestionSeverity = 'blocker' | 'warn' | 'info'

export interface AaaAuditSuggestion {
  id: string
  severity: AaaAuditSuggestionSeverity
  surface: 'lighting' | 'mesh' | 'lazy' | 'cost' | 'honesty'
  message: string
  /** Fail-closed — suggestion never claims auto-pass AAA */
  autoPassForbidden: true
}

export interface CommunityPublishAaaAuditInput {
  userId: string
  projectId: string
  planId?: string
  byokProfileId?: string
  adapter: CostGuardLedgerAdapter
  bakedLightingEvidencePresent?: boolean
  bakedLightingEvidenceRef?: string | null
  /** Optional mesh topology summary from mesh-quality honesty */
  meshManifoldOk?: boolean
  meshHasLods?: boolean
  triangleCount?: number
  /** Optional patch/text to LazyInspector before suggesting CreativeBridge polish */
  polishPatchText?: string
  estimatedTokenWeight?: number
  /** Offer CreativeBridge AAA polish call — still CostGuard gated */
  offerCreativeBridgePolish?: boolean
}

export interface CommunityPublishAaaAuditResult {
  letter: typeof COMMUNITY_AAA_AUDIT_LETTER
  ok: boolean
  allowPublishSuccessArtifact: boolean
  suggestions: AaaAuditSuggestion[]
  reservation?: CreativeCostReservation
  settledZero: boolean
  creativeBridgePolishOffered: boolean
  /** Always false — do not invent Unreal AAA parity pass */
  unrealAaaParityPass: false
  coinsInvented: false
}

/**
 * Fail-closed community publish AAA light/mesh audit.
 * CostGuard reserve when polish offered; settle:0 when audit blocks or lazy rejects.
 */
export async function runCommunityPublishAaaAudit(
  input: CommunityPublishAaaAuditInput,
): Promise<CommunityPublishAaaAuditResult> {
  const suggestions: AaaAuditSuggestion[] = []
  const gate = evaluateBakedLightingPublishGate({
    evidencePresent: input.bakedLightingEvidencePresent,
    evidenceRef: input.bakedLightingEvidenceRef,
  })

  if (gate.status !== 'PASS') {
    suggestions.push({
      id: 'baked-lighting-missing',
      severity: 'blocker',
      surface: 'lighting',
      message:
        'Law XV: baked-lighting evidence required before publish success artifact — CreativeBridge bake offer available with BYOK/credits',
      autoPassForbidden: true,
    })
  }

  if (input.meshManifoldOk === false) {
    suggestions.push({
      id: 'mesh-non-manifold',
      severity: 'blocker',
      surface: 'mesh',
      message: 'Mesh non-manifold — refuse AAA publish claim; run mesh-quality conveyor (bw/bz) before Hub list',
      autoPassForbidden: true,
    })
  }

  if (input.meshHasLods === false) {
    suggestions.push({
      id: 'mesh-lod-missing',
      severity: 'warn',
      surface: 'mesh',
      message: 'LOD0/1/2 missing — suggest game-ready refine; not an automatic Unreal parity pass',
      autoPassForbidden: true,
    })
  }

  if (typeof input.triangleCount === 'number' && input.triangleCount > 500_000) {
    suggestions.push({
      id: 'mesh-tri-budget',
      severity: 'warn',
      surface: 'mesh',
      message: `Triangle count ${input.triangleCount} exceeds indie web demo budget — CapScore degrade expected; Nanite cinema HELD`,
      autoPassForbidden: true,
    })
  }

  let settledZero = false
  let reservation: CreativeCostReservation | undefined
  let creativeBridgePolishOffered = false

  const blockers = suggestions.filter((s) => s.severity === 'blocker')
  const allowPublishSuccessArtifact = blockers.length === 0 && gate.allowSuccessArtifact

  if (input.offerCreativeBridgePolish === true) {
    const reserve = await reserveCreativeCost(
      {
        userId: input.userId,
        projectId: input.projectId,
        domain: 'community-publish-aaa-audit',
        estimatedTokenWeight: Math.max(1, input.estimatedTokenWeight ?? 2_000),
        planId: input.planId,
        byokProfileId: input.byokProfileId,
      },
      input.adapter,
    )

    if (!reserve.ok) {
      suggestions.push({
        id: 'cost-guard-deny',
        severity: 'blocker',
        surface: 'cost',
        message: `CostGuard denied AAA polish offer: ${reserve.reason} — settle:0 posture (no platform free-tier pay)`,
        autoPassForbidden: true,
      })
      log.warn('community_aaa_audit_cost_denied', { reason: reserve.reason })
      return {
        letter: COMMUNITY_AAA_AUDIT_LETTER,
        ok: false,
        allowPublishSuccessArtifact: false,
        suggestions,
        settledZero: false,
        creativeBridgePolishOffered: false,
        unrealAaaParityPass: false,
        coinsInvented: false,
      }
    }

    reservation = reserve.reservation

    if (input.polishPatchText) {
      const lazy = inspectLazyPatch(input.polishPatchText)
      if (lazy.verdict === 'REJECT') {
        await settleCreativeCostZero(reservation.reservationId, input.adapter)
        settledZero = true
        suggestions.push({
          id: 'lazy-polish-reject',
          severity: 'blocker',
          surface: 'lazy',
          message: `LazyInspector REJECT (${lazy.matchedPatterns.join(',')}) — settle:0; no CreativeBridge polish`,
          autoPassForbidden: true,
        })
        return {
          letter: COMMUNITY_AAA_AUDIT_LETTER,
          ok: false,
          allowPublishSuccessArtifact: false,
          suggestions,
          reservation,
          settledZero,
          creativeBridgePolishOffered: false,
          unrealAaaParityPass: false,
          coinsInvented: false,
        }
      }
    }

    if (!allowPublishSuccessArtifact) {
      // Offer is recorded but success artifact still fail-closed — settle:0 until user fixes blockers
      await settleCreativeCostZero(reservation.reservationId, input.adapter)
      settledZero = true
      creativeBridgePolishOffered = true
      suggestions.push({
        id: 'polish-offer-held',
        severity: 'info',
        surface: 'honesty',
        message:
          'CreativeBridge AAA light/mesh audit offer recorded; publish success still HELD until blockers clear (settle:0 this leg)',
        autoPassForbidden: true,
      })
    } else {
      await settleCreativeCost(reservation.reservationId, 0, input.adapter)
      creativeBridgePolishOffered = true
      suggestions.push({
        id: 'polish-offer-ready',
        severity: 'info',
        surface: 'honesty',
        message: 'Gates green — CreativeBridge polish offer may proceed under Trava I (still not Unreal AAA parity)',
        autoPassForbidden: true,
      })
    }
  }

  const ok = allowPublishSuccessArtifact
  log.info('community_aaa_audit_done', {
    ok,
    blockers: blockers.length,
    letter: COMMUNITY_AAA_AUDIT_LETTER,
    settledZero,
  })

  return {
    letter: COMMUNITY_AAA_AUDIT_LETTER,
    ok,
    allowPublishSuccessArtifact,
    suggestions,
    reservation,
    settledZero,
    creativeBridgePolishOffered,
    unrealAaaParityPass: false,
    coinsInvented: false,
  }
}

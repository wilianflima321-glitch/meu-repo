/**
 * AI-v1-e / J.6 — Video → BT/SM scaffold via CreativeBridge + FusionTx.
 * Sole mechanic path: video-to-scaffold-extractor (Trava III). Not playable AAA.
 */

import { NextRequest, NextResponse } from 'next/server'

import { requireAuth, type AuthUser } from '@/lib/auth-server'
import {
  AI_EXPENSIVE_VIDEO_RATE_LIMIT,
  enforceAiCoreRateLimit,
} from '@/lib/server/ai-core-rate-limit'
import { createComponentLogger } from '@/lib/observability/logger'
import { createCreativeWalletCostGuardAdapter } from '@/lib/production/creative-cost-guard-creative-wallet-adapter'
import { ensureProjectFusionYjsStore } from '@/lib/production/fusion-scope-registry'
import {
  buildClipsFromVideoJob,
  runVideoToMechanicOperator,
  VIDEO_TO_MECHANIC_HONESTY,
} from '@/lib/production/video-to-mechanic-operator'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import type { VideoScaffoldClipMeta } from '@/lib/production/video-to-scaffold-extractor'

const log = createComponentLogger('api/ai/video/scaffold')

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: 'VIDEO_SCAFFOLD_INVALID', message }, { status: 400 })
}

async function hasByok(_userId: string, byokProfileId?: string): Promise<boolean> {
  return Boolean(byokProfileId?.trim())
}

export async function POST(req: NextRequest) {
  let user: AuthUser
  try {
    user = requireAuth(req)
  } catch {
    return unauthorized()
  }

  const rateLimitResponse = enforceAiCoreRateLimit({
    req,
    capability: 'ai.video.scaffold',
    route: '/api/ai/video/scaffold',
    config: AI_EXPENSIVE_VIDEO_RATE_LIMIT,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await req.json()) as {
      projectId?: string
      missionLabel?: string
      clips?: VideoScaffoldClipMeta[]
      /** Optional: derive clips from a prior generate/video taskId */
      videoTaskId?: string
      durationSeconds?: number
      beatLabels?: string[]
      byokProfileId?: string
    }

    const projectId = body.projectId?.trim()
    if (!projectId) return badRequest('projectId is required')

    const clips =
      body.clips?.length
        ? body.clips
        : body.videoTaskId
          ? buildClipsFromVideoJob({
              taskId: body.videoTaskId,
              durationSeconds: body.durationSeconds,
              beatLabels: body.beatLabels,
            })
          : []

    if (!clips.length) {
      return badRequest('Provide clips[] or videoTaskId to derive scaffold beats')
    }

    const entitlements = await requireEntitlementsForUser(user.userId)
    const adapter = createCreativeWalletCostGuardAdapter({
      hasByok,
      modality: 'video-to-scaffold',
    })
    // Trava II: Yjs-backed store (not a throwaway Map) so in-process abort/revert is real.
    const store = ensureProjectFusionYjsStore(projectId)

    const result = await runVideoToMechanicOperator({
      projectId,
      userId: user.userId,
      clips,
      missionLabel: body.missionLabel ?? 'Video-to-design scaffold',
      planId: entitlements.plan.id,
      byokProfileId: body.byokProfileId,
      adapter,
      store,
    })

    if (!result.success) {
      const status =
        result.blockedReason === 'marketing_claim_rejected' ||
        result.blockedReason === 'invalid_clip'
          ? 422
          : result.blockedReason === 'cost_guard'
            ? 402
            : 409
      return NextResponse.json(
        {
          success: false,
          blockedReason: result.blockedReason,
          message: result.message,
          honesty: result.honesty,
          evidenceReceiptId: result.ledger.events[result.ledger.events.length - 1]?.id ?? null,
        },
        { status },
      )
    }

    return NextResponse.json({
      success: true,
      scaffoldId: result.scaffold.scaffoldId,
      stateMachine: result.scaffold.stateMachine,
      behaviorTree: result.scaffold.behaviorTree,
      visualScriptStubs: result.visualScriptStubs,
      physicsWiringRequired: true,
      autoPhysics: false,
      fusionTransactionId: result.fusionTransactionId,
      snapshotHashBefore: result.snapshotHashBefore,
      snapshotHashAfter: result.snapshotHashAfter,
      evidenceReceiptId: result.evidenceReceiptId,
      honesty: result.honesty,
      copyGuard: [
        VIDEO_TO_MECHANIC_HONESTY.productLabel,
        VIDEO_TO_MECHANIC_HONESTY.notPlayableAaa,
        VIDEO_TO_MECHANIC_HONESTY.userWiringRequired,
      ],
    })
  } catch (error) {
    log.error('video_scaffold.failed', error)
    const message = error instanceof Error ? error.message : 'Video scaffold failed'
    return NextResponse.json({ error: 'VIDEO_SCAFFOLD_FAILED', message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    capability: 'ai.video.scaffold',
    productLabel: VIDEO_TO_MECHANIC_HONESTY.productLabel,
    honesty: VIDEO_TO_MECHANIC_HONESTY,
    usage: {
      post: 'POST { projectId, clips[] | videoTaskId, missionLabel? } — Trava III scaffold only',
    },
    guardrails: [
      VIDEO_TO_MECHANIC_HONESTY.notPlayableAaa,
      VIDEO_TO_MECHANIC_HONESTY.userWiringRequired,
      VIDEO_TO_MECHANIC_HONESTY.marketingForbidden,
      'Writes go through CreativeBridge + CreativeFusionTransaction only',
    ],
  })
}

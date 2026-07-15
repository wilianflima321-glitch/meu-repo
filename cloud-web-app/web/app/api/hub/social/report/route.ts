import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  createReport,
  listReportsByReporter,
  REPORT_REASONS,
} from '@/lib/hub/social-moderation-authority'
import { evaluateSocialSafetyActionGate } from '@/lib/hub/coppa-age-gate'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/report/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_REPORT'

/**
 * I.4 — User report create + list (own reports only).
 * Empty-honest when none. Fail-closed until moderation store writable.
 */
export async function GET(req: NextRequest) {
  const auth = getUserFromRequest(req)
  const userId = auth?.userId
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', capability: CAPABILITY, capabilityStatus: 'IMPLEMENTED' },
      { status: 401 },
    )
  }

  const honesty = await probeSocialModerationHonesty()
  if (!honesty.socialModerationReady) {
    return NextResponse.json(
      {
        error: 'SOCIAL_MODERATION_HELD',
        reason: honesty.claim,
        mock: false,
        capability: CAPABILITY,
        capabilityStatus: 'HELD',
        reports: [],
        count: 0,
        reasons: REPORT_REASONS,
      },
      { status: 503 },
    )
  }

  const reports = await listReportsByReporter(userId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    reports,
    count: reports.length,
    reasons: REPORT_REASONS,
  })
}

export async function POST(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    const safety = evaluateSocialSafetyActionGate({ actorUserId: userId })
    if (!safety.allowed || !userId) {
      return NextResponse.json(
        {
          error: safety.code ?? 'Unauthorized',
          reason: safety.reason,
          capability: CAPABILITY,
          capabilityStatus: 'IMPLEMENTED',
        },
        { status: 401 },
      )
    }

    const honesty = await probeSocialModerationHonesty()
    if (!honesty.socialModerationReady) {
      return NextResponse.json(
        {
          error: 'SOCIAL_MODERATION_HELD',
          reason: honesty.claim,
          mock: false,
          capability: CAPABILITY,
          capabilityStatus: 'HELD',
        },
        { status: 503 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const targetUserId = String(body?.targetUserId || body?.userId || '').trim()
    if (!targetUserId) {
      return NextResponse.json({ error: 'TARGET_USER_REQUIRED' }, { status: 400 })
    }

    const report = await createReport({
      reporterId: userId,
      targetUserId,
      reason: body?.reason,
      details: body?.details,
      gameId: body?.gameId,
    })

    log.info('report_post_accepted', {
      reporterId: userId,
      targetUserId,
      reason: report.reason,
    })

    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      report,
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (
      code === 'REPORT_SELF_FORBIDDEN' ||
      code === 'REPORT_IDENTITY_REQUIRED' ||
      code === 'REPORT_REASON_INVALID'
    ) {
      return NextResponse.json({ error: code }, { status: 400 })
    }
    log.error('report_post_failed', { error })
    return NextResponse.json(
      { error: 'REPORT_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}

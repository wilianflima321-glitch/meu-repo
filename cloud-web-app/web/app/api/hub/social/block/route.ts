import { NextRequest, NextResponse } from 'next/server'

import { getUserFromRequest } from '@/lib/auth-server'
import {
  listBlocksForUser,
  removeBlock,
  upsertBlock,
} from '@/lib/hub/social-moderation-authority'
import { evaluateSocialSafetyActionGate } from '@/lib/hub/coppa-age-gate'
import { probeSocialModerationHonesty } from '@/lib/hub/social-moderation-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/hub/social/block/route')

export const dynamic = 'force-dynamic'

const CAPABILITY = 'HUB_SOCIAL_BLOCK'

/**
 * I.4 — Block list + upsert + remove.
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
        blocks: [],
        count: 0,
      },
      { status: 503 },
    )
  }

  const blocks = await listBlocksForUser(userId)
  return NextResponse.json({
    mock: false,
    capability: CAPABILITY,
    capabilityStatus: 'IMPLEMENTED',
    blocks,
    count: blocks.length,
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
    const blockedId = String(body?.blockedId || body?.targetUserId || '').trim()
    if (!blockedId) {
      return NextResponse.json({ error: 'BLOCKED_ID_REQUIRED' }, { status: 400 })
    }

    const block = await upsertBlock({
      blockerId: userId,
      blockedId,
      reason: body?.reason,
    })

    log.info('block_post_accepted', { blockerId: userId, blockedId })
    return NextResponse.json({
      success: true,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      block,
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'BLOCK_SELF_FORBIDDEN' || code === 'BLOCK_IDENTITY_REQUIRED') {
      return NextResponse.json({ error: code }, { status: 400 })
    }
    log.error('block_post_failed', { error })
    return NextResponse.json(
      { error: 'BLOCK_POST_FAILED', capability: CAPABILITY },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req)
    const userId = auth?.userId
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const honesty = await probeSocialModerationHonesty()
    if (!honesty.socialModerationReady) {
      return NextResponse.json(
        {
          error: 'SOCIAL_MODERATION_HELD',
          capability: CAPABILITY,
          capabilityStatus: 'HELD',
        },
        { status: 503 },
      )
    }

    const sp = req.nextUrl.searchParams
    const body = await req.json().catch(() => ({}))
    const blockedId = String(
      sp.get('blockedId') || body?.blockedId || body?.targetUserId || '',
    ).trim()
    if (!blockedId) {
      return NextResponse.json({ error: 'BLOCKED_ID_REQUIRED' }, { status: 400 })
    }

    const removed = await removeBlock(userId, blockedId)
    return NextResponse.json({
      success: removed,
      mock: false,
      capability: CAPABILITY,
      capabilityStatus: 'IMPLEMENTED',
      removed,
    })
  } catch (error) {
    log.error('block_delete_failed', { error })
    return NextResponse.json({ error: 'BLOCK_DELETE_FAILED' }, { status: 500 })
  }
}

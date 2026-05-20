import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { applyAiChanges } from '@/lib/server/ai-change-apply/executor'
import type { ApplyBody } from '@/lib/server/ai-change-apply/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as ApplyBody | null
    return await applyAiChanges({ request, userId: user.userId, body })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    return NextResponse.json(
      {
        error: 'APPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process apply request',
      },
      { status: 500 }
    )
  }
}

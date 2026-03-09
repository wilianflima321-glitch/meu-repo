import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { buildMentionContextPreview } from '@/lib/server/mention-context'

export const dynamic = 'force-dynamic'

type MentionContextRequest = {
  message?: unknown
  projectId?: unknown
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const body = (await request.json().catch(() => null)) as MentionContextRequest | null
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const projectId = typeof body?.projectId === 'string' && body.projectId.trim() ? body.projectId.trim() : undefined

    if (!message) {
      return NextResponse.json(
        {
          error: 'MESSAGE_REQUIRED',
          message: 'message is required',
        },
        { status: 400 }
      )
    }

    const preview = await buildMentionContextPreview(message, {
      userId: auth.userId,
      projectId,
    })

    return NextResponse.json({
      success: true,
      tags: preview.tags,
      blocks: preview.blocks,
    })
  } catch (error) {
    return apiErrorToResponse(error)
  }
}

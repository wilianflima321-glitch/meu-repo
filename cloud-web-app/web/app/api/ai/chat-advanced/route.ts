import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { createComponentLogger } from '@/lib/observability/logger'
import { handleAdvancedChatRequest } from '@/lib/server/ai-chat-advanced/orchestrator'
import { getAdvancedChatMetadata } from '@/lib/server/ai-chat-advanced/agent-and-streaming'
import type { AdvancedChatRequest } from '@/lib/server/ai-chat-advanced/types'
import '@/lib/ai-web-tools'

const logger = createComponentLogger('api.ai.chat-advanced')

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const rateLimited = enforceAiCoreRateLimit({
      req: request,
      capability: 'AI_CHAT_ADVANCED',
      route: '/api/ai/chat-advanced',
      config: AI_CORE_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const body = (await request.json()) as AdvancedChatRequest
    return await handleAdvancedChatRequest({ userId: auth.userId, body })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped

    logger.error('Advanced chat API error', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return getAdvancedChatMetadata()
}

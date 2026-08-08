import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { createComponentLogger } from '@/lib/observability/logger'
import { handleAdvancedChatRequest } from '@/lib/server/ai-chat-advanced/orchestrator'

import type { AdvancedChatRequest } from '@/lib/server/ai-chat-advanced/types'
import {
  auditByokUsage,
  byokMissingCredentialResponse,
  enforceByokProxyRateLimit,
  parseByokFromRequest,
} from '@/lib/ai/byok-request'
import '@/lib/ai-web-tools'

const logger = createComponentLogger('api.ai.chat-advanced')

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = requireAuth(request)
    const byokParsed = parseByokFromRequest(request)
    if (request.headers.get('x-aethel-byok-active') === '1' && !byokParsed.active) {
      return NextResponse.json(byokMissingCredentialResponse(), { status: 400 })
    }

    const rateLimitedByok = enforceByokProxyRateLimit(request, '/api/ai/chat-advanced')
    if (rateLimitedByok) return rateLimitedByok

    if (!byokParsed.active) {
      const rateLimited = enforceAiCoreRateLimit({
        req: request,
        capability: 'AI_CHAT_ADVANCED',
        route: '/api/ai/chat-advanced',
        config: AI_CORE_RATE_LIMIT,
      })
      if (rateLimited) return rateLimited
    }

    const body = (await request.json()) as AdvancedChatRequest
    if (byokParsed.active) {
      auditByokUsage({
        userId: auth.userId,
        route: '/api/ai/chat-advanced',
        modelId: body.model,
        provider: byokParsed.provider,
      })
    }

    return await handleAdvancedChatRequest({
      userId: auth.userId,
      body,
      abortSignal: request.signal,
      byok: byokParsed.active,
      byokProvider: byokParsed.active ? byokParsed.provider : undefined,
      byokApiKey: byokParsed.active ? byokParsed.apiKey : undefined,
    })
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
  return NextResponse.json({ capability: 'AI_CHAT_ADVANCED', status: 'IMPLEMENTED' })
}

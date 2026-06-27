import { NextRequest, NextResponse } from 'next/server'
import { enforceQuota, addRateLimitHeaders } from '@/lib/server/quota-middleware'
import { getUserFromRequest } from '@/lib/auth-server'
import { logger } from '@/lib/observability/logger'
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'

export async function POST(req: NextRequest) {
  try {
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.voice.realtime-session',
      route: '/api/ai/voice/realtime-session',
      config: AI_CORE_RATE_LIMIT,
    })
    if (rateLimited) return rateLimited

    const quotaCheck = await enforceQuota(req, 'ai_request')
    if (!quotaCheck.allowed) {
      return quotaCheck.response
    }

    const user = getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      logger.warn('api.ai.voice.realtime-session.not_configured', { userId: user.userId })
      const response = NextResponse.json(
        {
          error: 'VOICE_REALTIME_NOT_CONFIGURED',
          message: 'Live voice requires OPENAI_API_KEY. Use transcribe mode or configure a provider.',
          capabilityStatus: 'PARTIAL',
        },
        { status: 503 },
      )
      return addRateLimitHeaders(response, quotaCheck.quota)
    }

    const oaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        modalities: ['audio', 'text'],
      }),
    })

    if (!oaiResponse.ok) {
      const errorText = await oaiResponse.text()
      logger.error('api.ai.voice.realtime-session.openai_error', new Error(errorText))
      const response = NextResponse.json(
        {
          error: 'VOICE_REALTIME_PROVIDER_ERROR',
          message: 'Voice session could not be created. Try again or use transcribe mode.',
          capabilityStatus: 'PARTIAL',
        },
        { status: 502 },
      )
      return addRateLimitHeaders(response, quotaCheck.quota)
    }

    const data = await oaiResponse.json()
    const secret = data.client_secret?.value
    if (!secret) {
      const response = NextResponse.json(
        {
          error: 'VOICE_REALTIME_INVALID_RESPONSE',
          message: 'Provider returned an invalid voice session payload.',
        },
        { status: 502 },
      )
      return addRateLimitHeaders(response, quotaCheck.quota)
    }

    logger.info('api.ai.voice.realtime-session.issued', { userId: user.userId })
    const successResponse = NextResponse.json({ client_secret: { value: secret } })
    return addRateLimitHeaders(successResponse, quotaCheck.quota)
  } catch (error) {
    logger.error('api.ai.voice.realtime-session.fatal', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

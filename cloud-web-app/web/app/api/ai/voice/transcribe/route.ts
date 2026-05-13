import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { checkRateLimit } from '@/lib/rate-limit'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  normalizeTranscriptionLanguage,
  transcribeVoiceWithOpenAI,
  validateVoiceTranscriptionFile,
} from '@/lib/server/voice-transcription'

const log = createComponentLogger('api/ai/voice/transcribe/route')
const VOICE_TRANSCRIBE_RATE_LIMIT = { windowMs: 60 * 60 * 1000, maxRequests: 120 }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimit = checkRateLimit(request, VOICE_TRANSCRIBE_RATE_LIMIT)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMIT_EXCEEDED', remaining: rateLimit.remaining },
      { status: 429 },
    )
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'TRANSCRIPTION_PROVIDER_NOT_CONFIGURED',
        message: 'Set OPENAI_API_KEY to enable server-side voice transcription fallback.',
      },
      { status: 503 },
    )
  }

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')
    const file = audio instanceof File ? audio : null
    const validation = validateVoiceTranscriptionFile(file)

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status ?? 400 },
      )
    }
    if (!file) {
      return NextResponse.json({ error: 'AUDIO_FILE_REQUIRED' }, { status: 400 })
    }

    const language = normalizeTranscriptionLanguage(formData.get('language'))
    const result = await transcribeVoiceWithOpenAI({ file, apiKey, language })

    log.info('voice_transcription.completed', {
      bytes: result.bytes,
      durationMs: result.durationMs,
      language: result.language,
      model: result.model,
      textLength: result.text.length,
    })

    return NextResponse.json({
      success: true,
      text: result.text,
      provider: result.provider,
      model: result.model,
      language: result.language,
      metadata: {
        bytes: result.bytes,
        durationMs: result.durationMs,
      },
    })
  } catch (error) {
    log.error('voice_transcription.failed', error)
    return NextResponse.json({ error: 'VOICE_TRANSCRIPTION_FAILED' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    requireAuth(request)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    provider: 'openai',
    model: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
    maxBytes: 25 * 1024 * 1024,
    formats: ['webm', 'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'ogg'],
  })
}

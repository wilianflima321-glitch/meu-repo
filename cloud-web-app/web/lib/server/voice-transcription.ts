import OpenAI from 'openai'

export const VOICE_TRANSCRIPTION_MAX_BYTES = 25 * 1024 * 1024

export type VoiceTranscriptionProvider = 'openai'

export interface VoiceTranscriptionValidationResult {
  ok: boolean
  error?: string
  status?: number
}

export interface VoiceTranscriptionResult {
  text: string
  provider: VoiceTranscriptionProvider
  model: string
  language: string | null
  durationMs: number
  bytes: number
}

export function normalizeTranscriptionLanguage(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(normalized)) return null
  return normalized
}

export function validateVoiceTranscriptionFile(file: File | null): VoiceTranscriptionValidationResult {
  if (!file) {
    return { ok: false, error: 'AUDIO_FILE_REQUIRED', status: 400 }
  }

  if (file.size <= 0) {
    return { ok: false, error: 'AUDIO_FILE_EMPTY', status: 400 }
  }

  if (file.size > VOICE_TRANSCRIPTION_MAX_BYTES) {
    return { ok: false, error: 'AUDIO_FILE_TOO_LARGE', status: 413 }
  }

  const lowerName = file.name.toLowerCase()
  const contentType = file.type.toLowerCase()
  const isSupportedMime = contentType.startsWith('audio/') || contentType === 'video/webm'
  const isSupportedExtension = /\.(webm|mp3|mp4|mpeg|mpga|m4a|wav|ogg|oga)$/i.test(lowerName)

  if (!isSupportedMime && !isSupportedExtension) {
    return { ok: false, error: 'AUDIO_FILE_UNSUPPORTED', status: 415 }
  }

  return { ok: true }
}

export async function transcribeVoiceWithOpenAI(params: {
  file: File
  apiKey: string
  language?: string | null
  model?: string
}): Promise<VoiceTranscriptionResult> {
  const startedAt = Date.now()
  const model = params.model || process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
  const openai = new OpenAI({ apiKey: params.apiKey })

  const response = await openai.audio.transcriptions.create({
    file: params.file,
    model,
    language: params.language ?? undefined,
    response_format: 'json',
    temperature: 0,
  })

  return {
    text: response.text.trim(),
    provider: 'openai',
    model,
    language: params.language ?? null,
    durationMs: Date.now() - startedAt,
    bytes: params.file.size,
  }
}

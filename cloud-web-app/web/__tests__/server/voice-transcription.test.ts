import {
  normalizeTranscriptionLanguage,
  validateVoiceTranscriptionFile,
  VOICE_TRANSCRIPTION_MAX_BYTES,
} from '@/lib/server/voice-transcription'

describe('voice transcription helpers', () => {
  it('normalizes safe language hints and rejects noisy values', () => {
    expect(normalizeTranscriptionLanguage('PT-br')).toBe('pt-br')
    expect(normalizeTranscriptionLanguage('en')).toBe('en')
    expect(normalizeTranscriptionLanguage('')).toBeNull()
    expect(normalizeTranscriptionLanguage('../secret')).toBeNull()
  })

  it('accepts supported audio files within the size budget', () => {
    const file = new File(['voice'], 'voice.webm', { type: 'audio/webm' })

    expect(validateVoiceTranscriptionFile(file)).toEqual({ ok: true })
  })

  it('blocks missing, empty, oversized, and unsupported files', () => {
    expect(validateVoiceTranscriptionFile(null)).toMatchObject({ ok: false, error: 'AUDIO_FILE_REQUIRED' })
    expect(validateVoiceTranscriptionFile(new File([], 'empty.webm', { type: 'audio/webm' }))).toMatchObject({
      ok: false,
      error: 'AUDIO_FILE_EMPTY',
    })
    expect(
      validateVoiceTranscriptionFile(new File(['x'], 'notes.txt', { type: 'text/plain' })),
    ).toMatchObject({ ok: false, error: 'AUDIO_FILE_UNSUPPORTED' })

    const huge = new File(['x'], 'huge.webm', { type: 'audio/webm' })
    Object.defineProperty(huge, 'size', { value: VOICE_TRANSCRIPTION_MAX_BYTES + 1 })
    expect(validateVoiceTranscriptionFile(huge)).toMatchObject({ ok: false, error: 'AUDIO_FILE_TOO_LARGE' })
  })
})

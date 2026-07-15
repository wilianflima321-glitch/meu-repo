/**
 * Block 8 — Audio honesty capability surface.
 * Never market play-log MetaSounds or silent generateVoice as shipped.
 */

import { PLAY_LOG_ONLY_FORBIDDEN, METASOUNDS_COMPILER_VERSION } from '@/lib/audio/metasounds-compiler'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('audio-honesty-capability')

export type AudioCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'

export interface AudioSurfaceReport {
  surface: string
  status: AudioCapabilityStatus
  notes: string[]
  heldReason?: string
}

export interface AudioHonestyReport {
  generatedAt: string
  metasoundsCompiler: AudioSurfaceReport
  playLogOnly: AudioSurfaceReport
  voiceGenerateAudible: AudioSurfaceReport
  neuralTtsBridge: AudioSurfaceReport
  libraryFirstFoley: AudioSurfaceReport
  spatialReverbWet: AudioSurfaceReport
  fullHrtfAaa: AudioSurfaceReport
  marketingMetaSoundsAaaAllowed: false
  claim: string
  productCopy: string
}

function envVoiceProviderConfigured(): boolean {
  return Boolean(
    process.env.ELEVENLABS_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.AZURE_SPEECH_KEY?.trim(),
  )
}

export function evaluateAudioHonesty(input: {
  neuralTtsConfigured?: boolean
  spatialReverbWetWired?: boolean
} = {}): AudioHonestyReport {
  const ttsConfigured = input.neuralTtsConfigured ?? envVoiceProviderConfigured()
  const reverbWired = input.spatialReverbWetWired !== false

  const report: AudioHonestyReport = {
    generatedAt: new Date().toISOString(),
    metasoundsCompiler: {
      surface: `MetaSounds ${METASOUNDS_COMPILER_VERSION}`,
      status: 'IMPLEMENTED',
      notes: ['Graph → Web Audio recipe (wave_player + envelope + output)', 'DAG hash for GATE-GOLDEN-AUDIO'],
    },
    playLogOnly: {
      surface: 'SoundCue play-log',
      status: 'HELD',
      notes: [
        PLAY_LOG_ONLY_FORBIDDEN
          ? 'Play-log-only is forbidden as production audio'
          : 'Play-log still present',
      ],
      heldReason: 'play_log_forbidden_as_ship',
    },
    voiceGenerateAudible: {
      surface: 'generateVoice audible waveform',
      status: 'IMPLEMENTED',
      notes: ['Local formant fill + RMS fail-closed; silence is not a success artifact'],
    },
    neuralTtsBridge: {
      surface: 'Neural TTS (ElevenLabs/OpenAI/Azure)',
      status: ttsConfigured ? 'IMPLEMENTED' : 'PARTIAL',
      notes: ttsConfigured
        ? ['Provider key present — Bridge + CostGuard path live for speech Plan B']
        : ['No TTS provider key — local audible preview only; Bridge path ready when keyed'],
      heldReason: ttsConfigured ? undefined : 'tts_provider_key_missing',
    },
    libraryFirstFoley: {
      surface: 'Library-first Foley (#64)',
      status: 'IMPLEMENTED',
      notes: ['Treasury/Freesound search + foley router; gen SFX default forbidden'],
    },
    spatialReverbWet: {
      surface: 'Spatial reverb wet send (AUDIO-001)',
      status: reverbWired ? 'IMPLEMENTED' : 'HELD',
      notes: reverbWired
        ? ['play() routes gain → convolver wet chain']
        : ['Wet chain not wired'],
      heldReason: reverbWired ? undefined : 'reverb_wet_unwired',
    },
    fullHrtfAaa: {
      surface: 'Full HRTF AAA / occlusion suite',
      status: 'HELD',
      notes: ['Panner HRTF exists; Rapier occlusion + 10-layer combat mix remain S4.1+'],
      heldReason: 's4_1_spatial_depth',
    },
    marketingMetaSoundsAaaAllowed: false,
    claim: 'MetaSounds S4.0 Web Audio + library Foley live — AAA HRTF / neural TTS keys optional — play-log [HELD]',
    productCopy:
      'SFX defaults to Treasury/Freesound + MetaSounds. Voice preview is audible locally; neural TTS is Plan B via Bridge. Full HRTF AAA remains [HELD].',
  }

  log.info('audio_honesty_evaluated', {
    metasounds: report.metasoundsCompiler.status,
    voice: report.voiceGenerateAudible.status,
    foley: report.libraryFirstFoley.status,
    hrtf: report.fullHrtfAaa.status,
  })

  return report
}

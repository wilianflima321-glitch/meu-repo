/**
 * Block 8 / #64 — Foley vs generative Plan B router.
 * Foley → library + MetaSounds. Score/speech → CreativeBridge + CostGuard only.
 */

import {
  resolveFoleyProviderLane,
  searchAudioLibrary,
  type AudioLibrarySearchResult,
} from '@/lib/audio/audio-library-search'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('audio-foley-router')

export type AudioTaskDomain = 'audio.foley' | 'audio.score' | 'audio.speech'

export type AudioRouteDecision =
  | {
      domain: 'audio.foley'
      path: 'library-metasounds'
      allowGenerativeDefault: false
      genCredits: 0
      library: AudioLibrarySearchResult
      honesty: 'library-first'
    }
  | {
      domain: 'audio.score' | 'audio.speech'
      path: 'generative-plan-b'
      allowGenerativeDefault: true
      requiresCostGuard: true
      requiresCreativeBridge: true
      honesty: 'plan-b-gen'
      note: string
    }

const FOLEY_HINT =
  /\b(foley|footstep|gunshot|rain|sword|roar|impact|whoosh|ui\s*click|monster|ambient\s*sfx|sfx)\b/i
const SPEECH_HINT = /\b(speech|voice|dialogue|say\s|tts|narrat|vo\b|eleven)\b/i
const SCORE_HINT = /\b(ost|score|sung|lyrics|suno|udio|music\s*track)\b/i

export function resolveAudioTaskDomain(prompt: string): AudioTaskDomain {
  if (SPEECH_HINT.test(prompt)) return 'audio.speech'
  if (SCORE_HINT.test(prompt)) return 'audio.score'
  if (FOLEY_HINT.test(prompt)) return 'audio.foley'
  return 'audio.foley'
}

export function routeAudioIntent(input: {
  prompt: string
  domain?: AudioTaskDomain
  tags?: string[]
}): AudioRouteDecision {
  const domain = input.domain ?? resolveAudioTaskDomain(input.prompt)

  if (domain === 'audio.foley') {
    const library = searchAudioLibrary({ query: input.prompt, tags: input.tags })
    const lane = resolveFoleyProviderLane('foley')
    log.info('audio_route_foley_library', { hits: library.hits.length, lane: lane.lane })
    return {
      domain: 'audio.foley',
      path: 'library-metasounds',
      allowGenerativeDefault: false,
      genCredits: 0,
      library,
      honesty: 'library-first',
    }
  }

  log.info('audio_route_plan_b', { domain })
  return {
    domain,
    path: 'generative-plan-b',
    allowGenerativeDefault: true,
    requiresCostGuard: true,
    requiresCreativeBridge: true,
    honesty: 'plan-b-gen',
    note:
      domain === 'audio.speech'
        ? 'Speech/VO → ElevenLabs/OpenAI TTS via CreativeBridge + CostGuard only'
        : 'Exclusive sung score → Suno/Udio via CreativeBridge + CostGuard only',
  }
}

export function mustRefuseGenerativeFoley(prompt: string): boolean {
  return resolveAudioTaskDomain(prompt) === 'audio.foley'
}

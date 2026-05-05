import { describe, expect, it } from 'vitest'

import {
  estimateExpensiveAiGenerationCost,
  meteringHeaders,
} from '@/lib/server/ai-expensive-generation-guard'

describe('ai expensive generation guard', () => {
  it('prices media generations high enough to block free-plan abuse before provider calls', () => {
    expect(estimateExpensiveAiGenerationCost({
      kind: 'image',
      prompt: 'cinematic key art',
      units: 2,
      quality: 'hd',
    })).toBeGreaterThanOrEqual(40_000)

    expect(estimateExpensiveAiGenerationCost({
      kind: 'model3d',
      prompt: 'AAA boss arena prop',
      quality: 'high',
    })).toBeGreaterThanOrEqual(60_000)
  })

  it('keeps voice and music costs tied to duration or text size', () => {
    const shortVoice = estimateExpensiveAiGenerationCost({
      kind: 'voice',
      prompt: 'hello',
      units: 20,
    })
    const longVoice = estimateExpensiveAiGenerationCost({
      kind: 'voice',
      prompt: 'hello',
      units: 8_000,
    })
    const music = estimateExpensiveAiGenerationCost({
      kind: 'music',
      prompt: 'tense boss fight theme',
      units: 60,
    })

    expect(shortVoice).toBeGreaterThanOrEqual(3_000)
    expect(longVoice).toBeGreaterThan(shortVoice)
    expect(music).toBeGreaterThanOrEqual(54_000)
  })

  it('builds compact quota headers for UI cost transparency', () => {
    expect(meteringHeaders(
      {
        allowed: true,
        remaining: {
          requestsPerHour: 10,
          tokensPerDay: 20_000,
          tokensPerMonth: 300_000,
        },
      },
      12_000,
    )).toEqual({
      'X-Aethel-Estimated-Cost-Tokens': '12000',
      'X-Usage-Remaining-RequestsPerHour': '10',
      'X-Usage-Remaining-TokensPerDay': '20000',
      'X-Usage-Remaining-TokensPerMonth': '300000',
    })
  })
})

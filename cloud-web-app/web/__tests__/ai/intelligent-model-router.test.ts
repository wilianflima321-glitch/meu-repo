import { describe, expect, it } from 'vitest'

import {
  getModelCandidate,
  rankModelsForTask,
  selectModelForTask,
} from '@/lib/ai/intelligent-model-router'

describe('getModelCandidate', () => {
  it('resolves a direct MODEL_INFO model', () => {
    const candidate = getModelCandidate('gpt-4o')
    expect(candidate).not.toBeNull()
    expect(candidate?.family).toBe('openai-gpt')
    expect(candidate?.supportsTools).toBe(true)
  })

  it('returns null for unknown models', () => {
    expect(getModelCandidate('totally-unknown-model')).toBeNull()
  })
})

describe('rankModelsForTask hard filters', () => {
  it('only returns tool-capable models when tools are required', () => {
    const ranked = rankModelsForTask({ kind: 'tool-use', needsTools: true })
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked.every((entry) => entry.candidate.supportsTools)).toBe(true)
  })

  it('enforces minimum context window', () => {
    const ranked = rankModelsForTask({ kind: 'planning', minContextTokens: 500000 })
    expect(ranked.every((entry) => entry.candidate.contextWindow >= 500000)).toBe(true)
  })
})

describe('selectModelForTask economy vs max-quality', () => {
  const pool = ['openai/gpt-5.4-pro', 'google/gemini-2.5-flash-lite']

  it('prefers the cheap model under an economy budget for simple chat', () => {
    const decision = selectModelForTask({
      kind: 'simple-chat',
      budget: 'economy',
      availableModelIds: pool,
    })
    expect(decision?.model).toBe('google/gemini-2.5-flash-lite')
  })

  it('escalates to the stronger model under max-quality for deep reasoning', () => {
    const decision = selectModelForTask({
      kind: 'deep-reasoning',
      complexity: 'high',
      budget: 'max-quality',
      availableModelIds: pool,
    })
    expect(decision?.model).toBe('openai/gpt-5.4-pro')
  })
})

describe('selectModelForTask fallback chain', () => {
  it('builds a non-empty fallback chain that excludes the primary', () => {
    const decision = selectModelForTask({ kind: 'code', complexity: 'medium' })
    expect(decision).not.toBeNull()
    expect(decision?.fallbackChain.length).toBeGreaterThan(0)
    expect(decision?.fallbackChain).not.toContain(decision?.model)
  })

  it('returns null when no candidate satisfies hard requirements', () => {
    const decision = selectModelForTask({
      kind: 'vision',
      needsVision: true,
      availableModelIds: ['o1-mini'], // tools/vision-less reasoning model
    })
    expect(decision).toBeNull()
  })

  it('is deterministic for identical requests', () => {
    const a = selectModelForTask({ kind: 'code', complexity: 'high', budget: 'balanced' })
    const b = selectModelForTask({ kind: 'code', complexity: 'high', budget: 'balanced' })
    expect(a?.model).toBe(b?.model)
    expect(a?.fallbackChain).toEqual(b?.fallbackChain)
  })
})

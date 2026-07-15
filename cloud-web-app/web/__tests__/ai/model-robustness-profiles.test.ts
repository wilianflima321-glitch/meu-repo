import { describe, expect, it } from 'vitest'

import {
  applyModelRobustnessHardening,
  clampTemperatureForModel,
  detectModelFamily,
  getModelRobustnessProfile,
} from '@/lib/ai/model-robustness-profiles'

describe('detectModelFamily', () => {
  it('identifies gemini across provider prefixes', () => {
    expect(detectModelFamily('gemini-1.5-pro')).toBe('gemini')
    expect(detectModelFamily('google/gemini-3.1-flash-lite-preview')).toBe('gemini')
    expect(detectModelFamily('gemma-2-9b')).toBe('gemini')
  })

  it('separates openai reasoning models from gpt chat models', () => {
    expect(detectModelFamily('gpt-4o')).toBe('openai-gpt')
    expect(detectModelFamily('openai/gpt-4o-mini')).toBe('openai-gpt')
    expect(detectModelFamily('o1-preview')).toBe('openai-reasoning')
    expect(detectModelFamily('o3-mini')).toBe('openai-reasoning')
  })

  it('identifies open and frontier families', () => {
    expect(detectModelFamily('claude-3-5-sonnet-20241022')).toBe('claude')
    expect(detectModelFamily('deepseek/deepseek-chat')).toBe('deepseek')
    expect(detectModelFamily('meta-llama/llama-3.1-70b')).toBe('llama')
    expect(detectModelFamily('qwen/qwen-2.5-72b')).toBe('qwen')
    expect(detectModelFamily('mistralai/mixtral-8x7b')).toBe('mistral')
    expect(detectModelFamily('x-ai/grok-2')).toBe('grok')
  })

  it('falls back to generic for unknown ids', () => {
    expect(detectModelFamily('')).toBe('generic')
    expect(detectModelFamily('some-private-model-v9')).toBe('generic')
  })
})

describe('clampTemperatureForModel', () => {
  it('caps hallucination-prone gemini below its ceiling', () => {
    expect(clampTemperatureForModel('gemini-1.5-flash', 1.2)).toBe(0.4)
  })

  it('leaves safe temperatures unchanged', () => {
    expect(clampTemperatureForModel('gpt-4o', 0.3)).toBe(0.3)
  })

  it('preserves undefined so provider defaults apply', () => {
    expect(clampTemperatureForModel('gpt-4o', undefined)).toBeUndefined()
  })
})

describe('getModelRobustnessProfile', () => {
  it('flags gemini hallucination and grounding requirement', () => {
    const profile = getModelRobustnessProfile('gemini-1.5-pro')
    expect(profile.weaknesses.hallucination).toBeGreaterThan(0.6)
    expect(profile.requireGrounding).toBe(true)
    expect(profile.systemPromptHardening).toContain('MODEL RELIABILITY DIRECTIVE')
  })

  it('allows more repair attempts for fragile open models', () => {
    expect(getModelRobustnessProfile('meta-llama/llama-3.1-8b').toolArgRepairAttempts).toBeGreaterThanOrEqual(3)
  })
})

describe('applyModelRobustnessHardening', () => {
  it('appends hardening to an existing system message', () => {
    const messages = [
      { role: 'system', content: 'Base prompt.' },
      { role: 'user', content: 'hi' },
    ]
    const result = applyModelRobustnessHardening(messages, 'gemini-1.5-pro')
    expect(result[0].content).toContain('Base prompt.')
    expect(result[0].content).toContain('MODEL RELIABILITY DIRECTIVE')
    expect(result[1]).toEqual(messages[1])
  })

  it('prepends a system message when none exists', () => {
    const messages = [{ role: 'user', content: 'hi' }]
    const result = applyModelRobustnessHardening(messages, 'gpt-4o')
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('system')
    expect(result[0].content).toContain('MODEL RELIABILITY DIRECTIVE')
  })

  it('is idempotent and does not double-inject', () => {
    const messages = [{ role: 'system', content: 'Base.' }]
    const once = applyModelRobustnessHardening(messages, 'gpt-4o')
    const twice = applyModelRobustnessHardening(once, 'gpt-4o')
    const occurrences = twice[0].content.split('MODEL RELIABILITY DIRECTIVE').length - 1
    expect(occurrences).toBe(1)
  })
})

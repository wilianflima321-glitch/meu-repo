/**
 * Block 6E — BYOK request parse + audit unit tests.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/server/ai-core-rate-limit', () => ({
  AI_BYOK_RATE_LIMIT: { windowMs: 60_000, maxRequests: 10 },
  enforceAiCoreRateLimit: vi.fn(() => null),
}))

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

import {
  auditByokUsage,
  isByokActive,
  parseByokFromRequest,
} from '@/lib/ai/byok-request'
import { buildByokRequestHeaders, setByokEnabledFlag } from '@/lib/ai/byok-idb-store'

function req(headers: Record<string, string>) {
  return new NextRequest('http://localhost/api/ai/chat', {
    method: 'POST',
    headers,
  })
}

describe('byok-request (6E)', () => {
  it('parses header-only BYOK with provider key', () => {
    const parsed = parseByokFromRequest(
      req({
        'x-aethel-byok-active': '1',
        'x-aethel-byok-provider': 'openai',
        'x-aethel-byok-openai': 'sk-test-key',
      }),
    )
    expect(parsed.active).toBe(true)
    if (parsed.active) {
      expect(parsed.provider).toBe('openai')
      expect(parsed.apiKey).toBe('sk-test-key')
    }
  })

  it('ignores active flag without credential (no fake BYOK)', () => {
    const parsed = parseByokFromRequest(req({ 'x-aethel-byok-active': '1' }))
    expect(parsed.active).toBe(false)
    expect(isByokActive(req({ 'x-aethel-byok-active': '1' }))).toBe(false)
  })

  it('auditByokUsage never throws and accepts billingMode contract', () => {
    expect(() =>
      auditByokUsage({
        userId: 'u1',
        route: '/api/ai/chat',
        modelId: 'openai/gpt-4o-mini',
        provider: 'openai',
        estimatedTokens: 100,
      }),
    ).not.toThrow()
  })
})

describe('byok-idb-store headers (6E.1)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('buildByokRequestHeaders emits active + provider headers when enabled with key', () => {
    setByokEnabledFlag(true)
    localStorage.setItem('aethel_byok_openai', 'sk-live')
    const headers = buildByokRequestHeaders()
    expect(headers['x-aethel-byok-active']).toBe('1')
    expect(headers['x-aethel-byok-openai']).toBe('sk-live')
    expect(headers['x-aethel-billing-mode']).toBe('byok')
  })

  it('returns empty when no keys configured', () => {
    setByokEnabledFlag(false)
    expect(buildByokRequestHeaders()).toEqual({})
  })
})

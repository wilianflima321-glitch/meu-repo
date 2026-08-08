import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DAP_SESSION_UNAVAILABLE,
  isDapMockExplicitlyAllowed,
} from '@/lib/dap/dap-adapter-base'
import { createNodeJSDAPAdapter } from '@/lib/dap/adapters/nodejs-dap'

const originalEnv = { ...process.env }

describe('P2b BLOCKER 11 — DAP adapter honesty (fail-closed)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
    delete process.env.AETHEL_DAP_ALLOW_MOCK
    process.env.LOG_LEVEL = 'fatal'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = originalEnv
  })

  it('does not allow mock by default', () => {
    expect(isDapMockExplicitlyAllowed()).toBe(false)
  })

  it('start() fails closed when /api/dap session cannot be created (no ready theater)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ success: false }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createNodeJSDAPAdapter('/workspace')
    const readySpy = vi.fn()
    adapter.on('ready', readySpy)

    await expect(adapter.start()).rejects.toThrow(/DAP_SESSION_UNAVAILABLE/)
    expect(readySpy).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dap/session/start',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sendRequest never returns success:true mock bodies when API is unavailable', async () => {
    const adapter = createNodeJSDAPAdapter('/workspace')
    // Force the no-session path without calling start()
    await expect(
      // initialize → sendRequest('initialize', ...)
      adapter.initialize(),
    ).rejects.toThrow(DAP_SESSION_UNAVAILABLE)
  })

  it('API success:false body is not treated as a successful DAP result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sessionId: 'dap_test_1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          message: 'adapter refused initialize',
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const adapter = createNodeJSDAPAdapter('/workspace')
    await adapter.start()
    await expect(adapter.initialize()).rejects.toThrow(/adapter refused initialize/)
  })

  it('regression: source must not contain silent mock success:true fallback', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const source = await fs.readFile(
      path.join(process.cwd(), 'lib/dap/dap-adapter-base.ts'),
      'utf8',
    )
    expect(source).toContain('DAP_SESSION_UNAVAILABLE')
    expect(source).toContain('isDapMockExplicitlyAllowed')
    // The old silent fallback path must stay gone
    expect(source).not.toMatch(/using mock:/)
    expect(source).not.toMatch(/compatibility response mode/)
  })
})

import { describe, it, expect, vi } from 'vitest'
import {
  acquireLspFarmSession,
  describeUniversalLspFarmHonesty,
  LSP_FARM_ACCEPTANCE_LANGUAGES,
  releaseLspFarmSession,
  resolveUniversalLspEndpoint,
} from '@/lib/server/universal-lsp-relay'

vi.mock('@/lib/server/lsp-runtime', () => ({
  getOrCreateLspSession: vi.fn(async (opts: { userId: string; language: string; workspaceRoot: string }) => ({
    key: `${opts.userId}:${opts.language}:${opts.workspaceRoot}`,
    language: opts.language,
    workspaceRoot: opts.workspaceRoot,
    createdAt: Date.now(),
    lastUsedAt: Date.now(),
    rpc: {},
    stop: vi.fn(),
  })),
}))

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('L.13 UniversalLspFarm (cloud relay core)', () => {
  it('resolves HTTP relay paths and never claims Tauri sidecar live / Monaco acceptance', () => {
    const endpoint = resolveUniversalLspEndpoint({
      AETHEL_LSP_WS_URL: 'ws://lsp.example/farm',
      AETHEL_LSP_WS_FARM_LIVE: '1',
    })
    expect(endpoint.requestPath).toBe('/api/lsp/request')
    expect(endpoint.httpRelayPath).toBe('/api/lsp')
    expect(endpoint.wsUrl).toBe('ws://lsp.example/farm')
    expect(endpoint.wsFarmLive).toBe(true)
    // First-light desktop farm exists; refuse env uplift to marketing `live`.
    expect(endpoint.tauriSidecar).toBe('partial')
    expect(resolveUniversalLspEndpoint({ AETHEL_LSP_TAURI_SIDECAR: 'live' }).tauriSidecar).toBe(
      'partial',
    )

    const honesty = describeUniversalLspFarmHonesty()
    expect(honesty.cloudRelayCore).toBe(true)
    expect(honesty.tauriSidecarSpawn).toBe('partial')
    expect(honesty.marketingAllowed).toBe(false)
    expect(honesty.monacoDesktopHoverDefinition).toBe('partial')
    expect(endpoint.monacoDesktopHoverDefinition).toBe('partial')
  })

  it('defaults WS placeholder without claiming farm live', () => {
    const endpoint = resolveUniversalLspEndpoint({})
    expect(endpoint.wsUrl).toBe('ws://localhost:3001/lsp')
    expect(endpoint.wsFarmLive).toBe(false)
  })

  it('lists TS + Rust + Python as acceptance-critical languages', () => {
    expect(LSP_FARM_ACCEPTANCE_LANGUAGES).toEqual(['typescript', 'rust', 'python'])
  })

  it('honesty mentions python matrix and never allows marketing', () => {
    const honesty = describeUniversalLspFarmHonesty()
    expect(honesty.marketingAllowed).toBe(false)
    expect(honesty.message.toLowerCase()).toContain('python')
    expect(honesty.message).toContain('AETHEL_LSP_PYTHON')
  })

  it('acquires farm sessions fail-closed on unsupported language', async () => {
    const bad = await acquireLspFarmSession({
      userId: 'u1',
      language: 'cobol',
      workspaceRoot: process.cwd(),
    })
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.code).toBe('UNSUPPORTED_LANGUAGE')
    }
  })

  it('acquires and releases a mocked typescript farm session', async () => {
    const acquired = await acquireLspFarmSession({
      userId: 'u1',
      language: 'typescriptreact',
      workspaceRoot: process.cwd(),
    })
    expect(acquired.ok).toBe(true)
    if (!acquired.ok) return
    expect(acquired.language).toBe('typescript')
    expect(acquired.sessionKey).toContain('typescript')

    const released = releaseLspFarmSession(acquired.sessionKey)
    expect(released.ok).toBe(true)
  })
})

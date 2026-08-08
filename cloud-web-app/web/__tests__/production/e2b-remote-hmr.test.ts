import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canClaimE2BRemoteHmr,
  detectE2BRemoteHmr,
  detectNextWebpackHmrEndpoint,
  describeE2BRemoteHmrHonesty,
} from '@/lib/production/e2b-remote-hmr'
import * as forgeSandbox from '@/lib/production/forge-sandbox-executor'
import { syncAndRefreshPreviewSession } from '@/lib/production/preview-session-hot-update'

describe('L.8 E2B remote HMR detection', () => {
  const originalKey = process.env.E2B_API_KEY
  let projectRootPath = ''

  const e2bHandle = {
    files: {
      exists: async () => true,
      write: async () => undefined,
      writeFiles: async () => undefined,
    },
    commands: { run: async () => undefined },
    getHost: (port: number) => `${port}-abc.e2b.dev`,
  }

  beforeEach(() => {
    forgeSandbox.__resetForgeSandboxExecutorForTests()
    delete process.env.E2B_API_KEY
    projectRootPath = mkdtempSync(path.join(tmpdir(), 'aethel-e2b-hmr-'))
  })

  afterEach(() => {
    forgeSandbox.__resetForgeSandboxExecutorForTests()
    if (originalKey === undefined) delete process.env.E2B_API_KEY
    else process.env.E2B_API_KEY = originalKey
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    try {
      rmSync(projectRootPath, { recursive: true, force: true })
    } catch {
      // ignore cleanup races on Windows
    }
  })

  it('describeE2BRemoteHmrHonesty is env_gated when key missing (not permanent block)', () => {
    const honesty = describeE2BRemoteHmrHonesty()
    expect(honesty.e2bApiKeyPresent).toBe(false)
    expect(honesty.status).toBe('env_gated')
    expect(honesty.reason).toBe('e2b_api_key_missing')
    expect(honesty.remoteHmrConfirmed).toBe(false)
    expect(honesty.message).toMatch(/env-gated/)
  })

  it('detectE2BRemoteHmr fails closed when E2B_API_KEY missing', async () => {
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'e2b-nokey',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      e2bHandle,
      previewPort: 3000,
      previewUrl: 'https://3000-abc.e2b.dev',
    })

    const detected = await detectE2BRemoteHmr({ sessionId: 'e2b-nokey' })
    expect(detected.remoteHmrConfirmed).toBe(false)
    expect(detected.reason).toBe('e2b_api_key_missing')
    expect(detected.message).toMatch(/E2B_API_KEY missing/)
  })

  it('detectE2BRemoteHmr confirms Vite surface when key + getHost + /@vite/client', async () => {
    process.env.E2B_API_KEY = 'test-key-not-real'
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'e2b-vite',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      e2bHandle,
      previewPort: 5173,
      previewUrl: 'https://5173-abc.e2b.dev',
    })

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/javascript' },
      text: async () =>
        `export const createHotContext = () => ({});\nimport.meta.hot;\nconst __HMR_TOKEN__ = "tok99";`,
    })

    const detected = await detectE2BRemoteHmr({
      sessionId: 'e2b-vite',
      port: 5173,
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(detected.remoteHmrConfirmed).toBe(true)
    expect(detected.reason).toBe('ready')
    expect(detected.engine).toBe('vite')
    expect(detected.viteClientPresent).toBe(true)
    expect(detected.previewUrl).toBe('https://5173-abc.e2b.dev')
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://5173-abc.e2b.dev/@vite/client',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(describeE2BRemoteHmrHonesty(detected).status).toBe('ready')
  })

  it('detectE2BRemoteHmr fails closed when host HMR surface unreachable', async () => {
    process.env.E2B_API_KEY = 'test-key-not-real'
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'e2b-dead',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      e2bHandle: { ...e2bHandle, getHost: () => '3000-dead.e2b.dev' },
      previewPort: 3000,
      previewUrl: 'https://3000-dead.e2b.dev',
    })

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: async () => '',
    })

    const detected = await detectE2BRemoteHmr({
      sessionId: 'e2b-dead',
      fetchImpl: fetchImpl as typeof fetch,
    })

    expect(detected.remoteHmrConfirmed).toBe(false)
    expect(detected.reason).toBe('hmr_surface_unreachable')
    expect(detected.engine).toBe('unknown')
  })

  it('detectNextWebpackHmrEndpoint accepts 400 upgrade-style responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'text/plain' },
      text: async () => 'Expected websocket upgrade for HMR',
    })
    const next = await detectNextWebpackHmrEndpoint('https://3000-x.e2b.dev', {
      fetchImpl: fetchImpl as typeof fetch,
    })
    expect(next.present).toBe(true)
  })

  it('canClaimE2BRemoteHmr requires client bridge AND remote confirmation', () => {
    expect(
      canClaimE2BRemoteHmr({
        preferHmr: true,
        clientHmrConnected: true,
        remote: { remoteHmrConfirmed: true },
      }),
    ).toBe(true)
    expect(
      canClaimE2BRemoteHmr({
        preferHmr: true,
        clientHmrConnected: true,
        remote: { remoteHmrConfirmed: false },
      }),
    ).toBe(false)
    expect(
      canClaimE2BRemoteHmr({
        preferHmr: true,
        clientHmrConnected: false,
        remote: { remoteHmrConfirmed: true },
      }),
    ).toBe(false)
  })

  it('hot-update e2b: key missing → hmr:false reload (never claims remote HMR)', async () => {
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'hot-nokey',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      projectRootPath,
      e2bHandle,
      previewPort: 3000,
      previewUrl: 'https://3000-abc.e2b.dev',
    })

    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'hot-nokey',
      files: [{ path: 'src/App.tsx', content: 'export default 1\n' }],
      clientHmrConnected: true,
      preferHmr: true,
    })

    expect(result.ok).toBe(true)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(true)
    expect(result.mode).toBe('reload')
    expect(result.remoteHmrConfirmed).toBe(false)
    expect(result.remoteHmrReason).toBe('e2b_api_key_missing')
    expect(result.remoteHmrHonesty?.status).toBe('env_gated')
    expect(result.message).toMatch(/e2b_api_key_missing/)
  })

  it('hot-update e2b: key + reachable Vite + client bridge → hmr:true', async () => {
    process.env.E2B_API_KEY = 'test-key-not-real'
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'hot-vite',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      projectRootPath,
      e2bHandle: { ...e2bHandle, getHost: () => '5173-live.e2b.dev' },
      previewPort: 5173,
      previewUrl: 'https://5173-live.e2b.dev',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/javascript' },
        text: async () => `export const createHotContext = () => ({});\nimport.meta.hot`,
      }),
    )

    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'hot-vite',
      files: [{ path: 'src/App.tsx', content: 'export default 1\n' }],
      clientHmrConnected: true,
      preferHmr: true,
    })

    expect(result.ok).toBe(true)
    expect(result.hmr).toBe(true)
    expect(result.reload).toBe(false)
    expect(result.mode).toBe('hmr')
    expect(result.strategy).toBe('e2b')
    expect(result.remoteHmrConfirmed).toBe(true)
    expect(result.remoteHmrReason).toBe('ready')
    expect(result.message).toMatch(/remote vite HMR confirmed/i)
  })

  it('hot-update e2b: client bridge alone without remote surface → hmr:false', async () => {
    process.env.E2B_API_KEY = 'test-key-not-real'
    forgeSandbox.__injectForgeSandboxSessionForTests({
      session: {
        sessionId: 'hot-no-surface',
        provider: 'e2b',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'r1',
        evidenceLedgerId: 'l1',
        createdAt: 'now',
      },
      projectRootPath,
      e2bHandle: { ...e2bHandle, getHost: () => '3000-nosurf.e2b.dev' },
      previewPort: 3000,
      previewUrl: 'https://3000-nosurf.e2b.dev',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: { get: () => null },
        text: async () => '',
      }),
    )

    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'hot-no-surface',
      files: [{ path: 'src/App.tsx', content: 'export default 1\n' }],
      clientHmrConnected: true,
      preferHmr: true,
    })

    expect(result.ok).toBe(true)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(true)
    expect(result.remoteHmrConfirmed).toBe(false)
    expect(result.remoteHmrReason).toBe('hmr_surface_unreachable')
  })
})

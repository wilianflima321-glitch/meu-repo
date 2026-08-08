import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  orchestratePreviewSession,
  syncAndRefreshPreviewSession,
  teardownPreviewSession,
} from '@/lib/production/preview-orchestrator'
import * as forgeSandbox from '@/lib/production/forge-sandbox-executor'
import * as previewRuntime from '@/lib/server/preview-runtime'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'
import { extractPreviewSandboxId } from '@/components/preview/previewRuntimeState'

describe('PreviewOrchestrator (L.8)', () => {
  const mockCostAdapter = createMemoryCostGuardLedger()
  mockCostAdapter.grant('u1', 100_000)
  mockCostAdapter.enableByok('u1')

  beforeEach(() => {
    vi.clearAllMocks()
    forgeSandbox.__resetForgeSandboxExecutorForTests()
    vi.spyOn(previewRuntime, 'probeRuntimeUrl').mockResolvedValue({
      url: 'http://localhost:5173',
      status: 'reachable',
      reachable: true,
      httpStatus: 200,
      latencyMs: 12,
    })
  })

  it('returns inline strategy immediately if requested (no remote URL claim)', async () => {
    const result = await orchestratePreviewSession({
      userId: 'u1',
      projectId: 'p1',
      projectRootPath: '/mock',
      preferredStrategy: 'inline',
      costAdapter: mockCostAdapter,
    })
    expect(result.ok).toBe(true)
    expect(result.strategy).toBe('inline')
    expect(result.url).toBeUndefined()
    expect(result.ready).toBe(false)
  })

  it('provisions local-dev-server only when URL is probe-reachable', async () => {
    vi.spyOn(forgeSandbox, 'resolveForgeSandboxAvailability').mockResolvedValue({
      provider: 'local-isolated',
      available: true,
      reason: 'ready',
      message: 'mock',
    })

    const createSpy = vi.spyOn(forgeSandbox, 'createForgeSandboxSession').mockResolvedValue({
      ok: true,
      session: {
        sessionId: 'sess-1',
        provider: 'local-isolated',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'res-1',
        evidenceLedgerId: 'ledger-1',
        createdAt: 'now',
      },
    })

    const execSpy = vi.spyOn(forgeSandbox, 'execInForgeSandbox').mockResolvedValue({
      ok: true,
      exitCode: 0,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: 10,
    })

    const result = await orchestratePreviewSession({
      userId: 'u1',
      projectId: 'p1',
      projectRootPath: '/mock',
      preferredStrategy: 'local-dev-server',
      costAdapter: mockCostAdapter,
      readyWaitMs: 0,
      manifest: {
        name: 'test',
        image: 'node',
        forwardPorts: [5173],
      } as any,
    })

    expect(result.ok).toBe(true)
    expect(result.strategy).toBe('local-dev-server')
    expect(result.url).toBe('http://localhost:5173')
    expect(result.sandboxSessionId).toBe('sess-1')
    expect(result.sandboxId).toBe('sess-1')
    expect(result.ready).toBe(true)
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ provider: 'local-isolated' }))
    expect(execSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        background: true,
        command: 'npm',
        extraEnv: expect.objectContaining({ PORT: '5173' }),
      }),
    )
  })

  it('fails closed when sandbox provisioning fails (no fake preview ready)', async () => {
    vi.spyOn(forgeSandbox, 'resolveForgeSandboxAvailability').mockResolvedValue({
      provider: 'local-isolated',
      available: true,
      reason: 'ready',
      message: 'mock',
    })

    vi.spyOn(forgeSandbox, 'createForgeSandboxSession').mockResolvedValue({
      ok: false,
      reason: 'e2b_api_key_missing',
      message: 'Failed to create',
    })

    const result = await orchestratePreviewSession({
      userId: 'u1',
      projectId: 'p1',
      projectRootPath: '/mock',
      preferredStrategy: 'local-dev-server',
      costAdapter: mockCostAdapter,
    })

    expect(result.ok).toBe(false)
    expect(result.url).toBeUndefined()
    expect(result.message).toMatch(/Failed to provision/)
  })

  it('fails closed when preferred e2b is unavailable (no silent local claim as e2b)', async () => {
    vi.spyOn(forgeSandbox, 'resolveForgeSandboxAvailability').mockResolvedValue({
      provider: 'e2b',
      available: false,
      reason: 'e2b_api_key_missing',
      message: 'E2B_API_KEY missing',
    })
    const createSpy = vi.spyOn(forgeSandbox, 'createForgeSandboxSession')

    const result = await orchestratePreviewSession({
      userId: 'u1',
      projectId: 'p1',
      projectRootPath: '/mock',
      preferredStrategy: 'e2b',
      costAdapter: mockCostAdapter,
    })

    expect(result.ok).toBe(false)
    expect(result.strategy).toBe('e2b')
    expect(result.url).toBeUndefined()
    expect(result.message).toMatch(/E2B preview unavailable/)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it('fails closed when URL never becomes reachable and tears down session', async () => {
    vi.spyOn(forgeSandbox, 'resolveForgeSandboxAvailability').mockResolvedValue({
      provider: 'local-isolated',
      available: true,
      reason: 'ready',
      message: 'mock',
    })
    vi.spyOn(forgeSandbox, 'createForgeSandboxSession').mockResolvedValue({
      ok: true,
      session: {
        sessionId: 'sess-unready',
        provider: 'local-isolated',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'res-1',
        evidenceLedgerId: 'ledger-1',
        createdAt: 'now',
      },
    })
    vi.spyOn(forgeSandbox, 'execInForgeSandbox').mockResolvedValue({
      ok: true,
      exitCode: 0,
      stdout: '',
      stderr: '',
      truncated: false,
      durationMs: 10,
    })
    vi.spyOn(previewRuntime, 'probeRuntimeUrl').mockResolvedValue({
      url: 'http://localhost:3000',
      status: 'unreachable',
      reachable: false,
      reason: 'network',
    })
    const teardownSpy = vi.spyOn(forgeSandbox, 'teardownForgeSandboxSession').mockResolvedValue({
      session: {
        sessionId: 'sess-unready',
        provider: 'local-isolated',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'res-1',
        evidenceLedgerId: 'ledger-1',
        createdAt: 'now',
        teardownAt: 'later',
      },
      ledger: {} as any,
    })

    const result = await orchestratePreviewSession({
      userId: 'u1',
      projectId: 'p1',
      projectRootPath: '/mock',
      preferredStrategy: 'local-dev-server',
      costAdapter: mockCostAdapter,
      readyWaitMs: 0,
    })

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/never became reachable/)
    expect(teardownSpy).toHaveBeenCalledWith('sess-unready', 1)
  })

  it('extractPreviewSandboxId prefers L.8 metadata aliases for IDE consumers', () => {
    expect(
      extractPreviewSandboxId({
        metadata: { sandboxSessionId: 'forge-sbx-1' },
      }),
    ).toBe('forge-sbx-1')
    expect(
      extractPreviewSandboxId({
        sandboxId: 'top-level',
        metadata: { sandboxSessionId: 'nested' },
      }),
    ).toBe('top-level')
  })

  it('teardownPreviewSession settles an active session', async () => {
    vi.spyOn(forgeSandbox, 'getForgeSandboxSession').mockReturnValue({
      sessionId: 'sess-tear',
      provider: 'local-isolated',
      projectId: 'p1',
      agentMode: 'Builder',
      networkPolicy: 'none',
      costGuardReservationId: 'res-1',
      evidenceLedgerId: 'ledger-1',
      createdAt: 'now',
    })
    const teardownSpy = vi.spyOn(forgeSandbox, 'teardownForgeSandboxSession').mockResolvedValue({
      session: {
        sessionId: 'sess-tear',
        provider: 'local-isolated',
        projectId: 'p1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'res-1',
        evidenceLedgerId: 'ledger-1',
        createdAt: 'now',
        teardownAt: 'later',
      },
      ledger: {} as any,
    })

    const result = await teardownPreviewSession('sess-tear')
    expect(result.ok).toBe(true)
    expect(teardownSpy).toHaveBeenCalledWith('sess-tear', 1)
  })

  it('hot-update fails closed when no live session (no HMR theater)', async () => {
    vi.spyOn(forgeSandbox, 'getForgeSandboxSession').mockReturnValue(undefined)

    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'missing',
      paths: ['src/App.tsx'],
    })

    expect(result.ok).toBe(false)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(false)
    expect(result.mode).toBe('denied')
    expect(result.reusedSession).toBe(false)
    expect(result.message).toMatch(/No live preview session/)
  })

  it('hot-update fails closed when sandboxSessionId is empty', async () => {
    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: '   ',
      paths: ['src/App.tsx'],
    })
    expect(result.ok).toBe(false)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(false)
    expect(result.mode).toBe('denied')
  })

  it('hot-update syncs paths and returns honesty reload flags (hmr:false)', async () => {
    vi.spyOn(forgeSandbox, 'getForgeSandboxSession').mockReturnValue({
      sessionId: 'sess-hot',
      provider: 'local-isolated',
      projectId: 'p1',
      agentMode: 'Builder',
      networkPolicy: 'none',
      costGuardReservationId: 'res-1',
      evidenceLedgerId: 'ledger-1',
      createdAt: 'now',
    })
    vi.spyOn(forgeSandbox, 'verifyFilesInForgeSandbox').mockResolvedValue({
      ok: true,
      sessionId: 'sess-hot',
      provider: 'local-isolated',
      filesWritten: 2,
      projectRootPath: '/mock',
    })

    const result = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-hot',
      paths: ['src/a.tsx', 'src/b.tsx'],
    })

    expect(result.ok).toBe(true)
    expect(result.filesSynced).toBe(2)
    expect(result.hmr).toBe(false)
    expect(result.reload).toBe(true)
    expect(result.mode).toBe('reload')
    expect(result.reusedSession).toBe(true)
    expect(result.strategy).toBe('local-dev-server')
    expect(result.message).toMatch(/full preview reload required/)
  })

  it('hot-update claims hmr only when client bridge is connected and preferHmr', async () => {
    vi.spyOn(forgeSandbox, 'getForgeSandboxSession').mockReturnValue({
      sessionId: 'sess-hmr',
      provider: 'local-isolated',
      projectId: 'p1',
      agentMode: 'Builder',
      networkPolicy: 'none',
      costGuardReservationId: 'res-1',
      evidenceLedgerId: 'ledger-1',
      createdAt: 'now',
    })
    vi.spyOn(forgeSandbox, 'writeFilesToForgeSandbox').mockResolvedValue({
      ok: true,
      sessionId: 'sess-hmr',
      provider: 'local-isolated',
      filesWritten: 1,
      projectRootPath: '/mock',
    })

    const denied = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-hmr',
      files: [{ path: 'src/a.tsx', content: 'export const a = 1\n' }],
      preferHmr: true,
      clientHmrConnected: false,
    })
    expect(denied.hmr).toBe(false)
    expect(denied.reload).toBe(true)
    expect(denied.mode).toBe('reload')

    const claimed = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-hmr',
      files: [{ path: 'src/a.tsx', content: 'export const a = 1\n' }],
      preferHmr: true,
      clientHmrConnected: true,
    })
    expect(claimed.ok).toBe(true)
    expect(claimed.hmr).toBe(true)
    expect(claimed.reload).toBe(false)
    expect(claimed.mode).toBe('hmr')
    expect(claimed.message).toMatch(/HMR bridge connected/)
  })

  it('hot-update defaults preferHmr=true when omitted but still requires client bridge', async () => {
    vi.spyOn(forgeSandbox, 'getForgeSandboxSession').mockReturnValue({
      sessionId: 'sess-default-hmr',
      provider: 'local-isolated',
      projectId: 'p1',
      agentMode: 'Builder',
      networkPolicy: 'none',
      costGuardReservationId: 'res-1',
      evidenceLedgerId: 'ledger-1',
      createdAt: 'now',
    })
    vi.spyOn(forgeSandbox, 'writeFilesToForgeSandbox').mockResolvedValue({
      ok: true,
      sessionId: 'sess-default-hmr',
      provider: 'local-isolated',
      filesWritten: 1,
      projectRootPath: '/mock',
    })

    const withoutBridge = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-default-hmr',
      files: [{ path: 'src/a.tsx', content: 'export const a = 1\n' }],
      clientHmrConnected: false,
    })
    expect(withoutBridge.hmr).toBe(false)
    expect(withoutBridge.reload).toBe(true)
    expect(withoutBridge.mode).toBe('reload')

    const withBridge = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-default-hmr',
      files: [{ path: 'src/a.tsx', content: 'export const a = 1\n' }],
      clientHmrConnected: true,
    })
    expect(withBridge.hmr).toBe(true)
    expect(withBridge.reload).toBe(false)
    expect(withBridge.mode).toBe('hmr')

    const forcedReload = await syncAndRefreshPreviewSession({
      sandboxSessionId: 'sess-default-hmr',
      files: [{ path: 'src/a.tsx', content: 'export const a = 1\n' }],
      clientHmrConnected: true,
      preferHmr: false,
    })
    expect(forcedReload.hmr).toBe(false)
    expect(forcedReload.reload).toBe(true)
    expect(forcedReload.mode).toBe('reload')
  })
})

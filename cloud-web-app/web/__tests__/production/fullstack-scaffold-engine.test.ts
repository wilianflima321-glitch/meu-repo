import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scaffoldAndPreviewProject } from '@/lib/production/fullstack-scaffold-engine'
import * as devcontainerManifest from '@/lib/production/devcontainer-manifest'
import * as sandboxExecutor from '@/lib/production/forge-sandbox-executor'
import * as previewOrchestrator from '@/lib/production/preview-orchestrator'

// Mock dependencies
vi.mock('@/lib/production/devcontainer-manifest')
vi.mock('@/lib/production/forge-sandbox-executor')
vi.mock('@/lib/production/preview-orchestrator')
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))

describe('FullStackScaffoldEngine (L.9)', () => {
  const mockCostAdapter = {
    checkBalance: vi.fn(),
    deduct: vi.fn(),
    userId: 'test-user'
  } as any

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(devcontainerManifest.resolveDevContainerTemplate).mockReturnValue({
      id: 'nextjs-14',
      description: 'Test template',
      manifest: { name: 'next', forwardPorts: [3000] }
    })

    vi.mocked(sandboxExecutor.resolveForgeSandboxAvailability).mockResolvedValue({
      provider: 'e2b',
      available: true,
      reason: 'ready',
      message: 'OK'
    })

    vi.mocked(sandboxExecutor.createForgeSandboxSession).mockResolvedValue({
      ok: true,
      session: {
        sessionId: 'test-session-123',
        provider: 'e2b',
        projectId: 'proj-1',
        agentMode: 'Builder',
        networkPolicy: 'none',
        costGuardReservationId: 'res-1',
        evidenceLedgerId: 'ledger-1',
        createdAt: new Date().toISOString()
      },
      ledger: {} as any
    })

    vi.mocked(sandboxExecutor.execInForgeSandbox).mockResolvedValue({
      ok: true,
      exitCode: 0,
      stdout: 'Scaffolded',
      stderr: '',
      truncated: false,
      durationMs: 100
    })

    vi.mocked(previewOrchestrator.orchestratePreviewSession).mockResolvedValue({
      ok: true,
      strategy: 'e2b',
      url: 'https://3000-test-session-123.e2b.dev',
      sandboxSessionId: 'test-session-123'
    })
  })

  it('provisions sandbox, executes scaffolding, and hands off to preview orchestrator', async () => {
    const result = await scaffoldAndPreviewProject({
      userId: 'test-user',
      projectId: 'proj-1',
      projectRootPath: '/test/path',
      templateId: 'nextjs-14',
      preferredStrategy: 'e2b',
      costAdapter: mockCostAdapter
    })

    expect(result.ok).toBe(true)
    expect(result.preview?.url).toBe('https://3000-test-session-123.e2b.dev')

    // Verify session creation called
    expect(sandboxExecutor.createForgeSandboxSession).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'e2b',
      estimatedMinutes: 5
    }))

    // Verify execute scaffolding called
    expect(sandboxExecutor.execInForgeSandbox).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'test-session-123',
      command: 'npx',
      args: expect.arrayContaining(['create-next-app@latest'])
    }))

    // Verify handoff to preview orchestrator with EXISTING session id
    expect(previewOrchestrator.orchestratePreviewSession).toHaveBeenCalledWith(expect.objectContaining({
      existingSandboxSessionId: 'test-session-123'
    }))
  })

  it('handles scaffolding failure', async () => {
    vi.mocked(sandboxExecutor.execInForgeSandbox).mockResolvedValueOnce({
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Failed to create next app',
      truncated: false,
      durationMs: 100
    })

    const result = await scaffoldAndPreviewProject({
      userId: 'test-user',
      projectId: 'proj-1',
      projectRootPath: '/test/path',
      templateId: 'nextjs-14',
      costAdapter: mockCostAdapter
    })

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Failed to create next app')
    expect(previewOrchestrator.orchestratePreviewSession).not.toHaveBeenCalled()
  })

  it('fails closed when L.8 preview orchestration fails after scaffold', async () => {
    vi.mocked(previewOrchestrator.orchestratePreviewSession).mockResolvedValueOnce({
      ok: false,
      strategy: 'local-dev-server',
      message: 'Preview URL started but never became reachable',
    })

    const result = await scaffoldAndPreviewProject({
      userId: 'test-user',
      projectId: 'proj-1',
      projectRootPath: '/test/path',
      templateId: 'nextjs-14',
      preferredStrategy: 'local-dev-server',
      costAdapter: mockCostAdapter,
    })

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/never became reachable|preview orchestration failed/i)
    expect(result.preview?.ok).toBe(false)
  })
})

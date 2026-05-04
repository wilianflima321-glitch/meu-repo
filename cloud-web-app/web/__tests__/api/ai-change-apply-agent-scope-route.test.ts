import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const fsRuntimeMocks = vi.hoisted(() => ({
  runtime: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
  getFileSystemRuntime: vi.fn(),
}))

const workspaceScopeMocks = vi.hoisted(() => ({
  getScopedProjectId: vi.fn(),
  resolveScopedWorkspacePath: vi.fn(),
  toVirtualWorkspacePath: vi.fn(),
}))

const ledgerMocks = vi.hoisted(() => ({
  appendChangeRunLedgerEvent: vi.fn(),
}))

const dependencyMocks = vi.hoisted(() => ({
  analyzeDependencyImpact: vi.fn(),
}))

const validationMocks = vi.hoisted(() => ({
  validateAiChange: vi.fn(),
}))

const rollbackMocks = vi.hoisted(() => ({
  createRollbackSnapshot: vi.fn(),
  hashContent: vi.fn((value: string) => `hash:${value.length}`),
}))

const fullAccessMocks = vi.hoisted(() => ({
  findActiveFullAccessGrant: vi.fn(),
}))

const qaMocks = vi.hoisted(() => ({
  runQaGate: vi.fn(),
}))

const handoffMocks = vi.hoisted(() => ({
  loadAgentHandoffContext: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/server/filesystem-runtime', () => fsRuntimeMocks)
vi.mock('@/lib/server/workspace-scope', () => workspaceScopeMocks)
vi.mock('@/lib/server/change-run-ledger', () => ledgerMocks)
vi.mock('@/lib/server/dependency-impact-guard', () => dependencyMocks)
vi.mock('@/lib/server/change-validation', () => validationMocks)
vi.mock('@/lib/server/change-rollback-store', () => rollbackMocks)
vi.mock('@/lib/server/full-access-ledger', () => fullAccessMocks)
vi.mock('@/lib/server/qa-gate', () => qaMocks)
vi.mock('@/lib/production/agent-handoff-context', () => handoffMocks)

import { POST } from '@/app/api/ai/change/apply/route'

describe('api/ai/change/apply agent scope enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    fsRuntimeMocks.getFileSystemRuntime.mockReturnValue(fsRuntimeMocks.runtime)
    fsRuntimeMocks.runtime.readFile.mockResolvedValue({ content: 'old content', language: 'typescript' })
    workspaceScopeMocks.getScopedProjectId.mockReturnValue('project-1')
    workspaceScopeMocks.resolveScopedWorkspacePath.mockImplementation(({ requestedPath }: { requestedPath: string }) => ({
      absolutePath: `C:/workspace/${requestedPath.replace(/^\/+/, '')}`,
      root: 'C:/workspace',
    }))
    workspaceScopeMocks.toVirtualWorkspacePath.mockImplementation((absolutePath: string) =>
      `/${absolutePath.replace('C:/workspace/', '').replace(/\\/g, '/')}`
    )
    validationMocks.validateAiChange.mockReturnValue({
      canApply: true,
      verdict: 'APPLY_ALLOWED',
      checks: [],
      dependencyImpact: { localImports: [], externalImports: [] },
    })
    dependencyMocks.analyzeDependencyImpact.mockResolvedValue({
      targetPath: 'src/app.ts',
      scannedFiles: 1,
      directImports: [],
      reverseDependents: [],
      impactedTests: [],
      impactedEndpoints: [],
      depth: 0,
      truncated: false,
      risk: 'low',
    })
    handoffMocks.loadAgentHandoffContext.mockResolvedValue({
      agent: 'Software Engineer Agent',
      context: '',
      packet: null,
      hasManifest: false,
      projectFound: true,
    })
    ledgerMocks.appendChangeRunLedgerEvent.mockResolvedValue(undefined)
    qaMocks.runQaGate.mockResolvedValue({ ok: true, checks: [], durationMs: 1 })
  })

  it('blocks broad multi-file apply when Repository Cartography is missing', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/ai/change/apply', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          changes: [
            { filePath: 'src/app.ts', modified: 'new content' },
            { filePath: 'src/other.ts', modified: 'new content' },
          ],
        }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(428)
    expect(payload.error).toBe('AGENT_SCOPE_MANIFEST_REQUIRED')
    expect(qaMocks.runQaGate).not.toHaveBeenCalled()
    expect(fsRuntimeMocks.runtime.writeFile).not.toHaveBeenCalled()
    expect(ledgerMocks.appendChangeRunLedgerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'apply_blocked',
        outcome: 'blocked',
        metadata: expect.objectContaining({ reason: 'AGENT_SCOPE_MANIFEST_REQUIRED' }),
      })
    )
  })
})

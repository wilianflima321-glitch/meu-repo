import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY } from '@/lib/production/repository-context-budget-execution'
import { REPOSITORY_CARTOGRAPHY_SETTINGS_KEY } from '@/lib/production/repository-cartography'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { POST } from '@/app/api/projects/[id]/production-state/cartography/route'

let baseRoot: string

async function writeWorkspaceFile(relativePath: string, content: string): Promise<void> {
  const target = path.join(baseRoot, '.aethel', 'workspaces', 'user-1', 'project-1', relativePath)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content)
}

describe('api/projects/[id]/production-state/cartography route', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    baseRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-production-cartography-'))
    process.env.AETHEL_WORKSPACE_ROOT = baseRoot
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight prototype',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  afterEach(async () => {
    delete process.env.AETHEL_WORKSPACE_ROOT
    if (baseRoot.startsWith(os.tmpdir())) {
      await fs.rm(baseRoot, { recursive: true, force: true })
    }
  })

  it('scans the scoped workspace and merges cartography into durable production state', async () => {
    await writeWorkspaceFile('.aethelrules', 'rules')
    await writeWorkspaceFile('package.json', '{"scripts":{"test":"vitest"}}')
    await writeWorkspaceFile('docs/story-bible.md', '# Story')
    await writeWorkspaceFile('tests/playtest/loop.spec.ts', 'it("plays", () => {})')

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/cartography', {
        method: 'POST',
        body: JSON.stringify({ maxHashBytes: 2048 }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.manifest.totals.totalFiles).toBe(4)
    expect(payload.scan.files).toBe(4)
    expect(payload.state.ledger[0].id).toBe('repo-cartography')
    expect(payload.contextBudgetExecution.batches.map((batch: { id: string }) => batch.id)).toContain('read-canonical-contracts')
    expect(payload.readiness.evidenceCount).toBeGreaterThanOrEqual(1)
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([expect.objectContaining({ id: 'repo-cartography' })]),
            }),
            [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: expect.objectContaining({
              id: expect.stringContaining('repo-cartography-project-1'),
              surfaces: expect.arrayContaining([expect.objectContaining({ path: '.aethelrules' })]),
            }),
            [REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]: expect.objectContaining({
              manifestId: expect.stringContaining('repo-cartography-project-1'),
              batches: expect.arrayContaining([expect.objectContaining({ id: 'read-canonical-contracts' })]),
            }),
          }),
        }),
      })
    )
  })

  it('rejects viewer-only collaborators before scanning or mutating', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Viewer mission',
      template: 'web',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/cartography', { method: 'POST' }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})

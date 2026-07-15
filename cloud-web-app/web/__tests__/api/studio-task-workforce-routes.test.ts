import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)

describe('studio task workforce planning', () => {
  let taskRoot = ''
  let sessionRoot = ''

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-task-workforce-'))
    sessionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-session-workforce-'))
    process.env.AETHEL_TASK_ROOT = taskRoot
    process.env.AETHEL_STUDIO_SESSION_ROOT = sessionRoot
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({
      plan: { id: 'pro', limits: { concurrent: 8 } },
      source: 'subscription',
    })
  })

  afterEach(async () => {
    delete process.env.AETHEL_TASK_ROOT
    delete process.env.AETHEL_STUDIO_SESSION_ROOT
    await fs.rm(taskRoot, { recursive: true, force: true })
    await fs.rm(sessionRoot, { recursive: true, force: true })
  })

  it('attaches game-production workforce evidence to studio task plans', async () => {
    const { POST: planTask } = await import('@/app/api/studio/tasks/plan/route')
    const response = await planTask(
      new NextRequest('http://localhost:3000/api/studio/tasks/plan', {
        method: 'POST',
        body: JSON.stringify({
          goal: 'Create a God of War quality boss fight with gameplay, render, assets and playtest validation',
          projectId: 'project-game',
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.metadata.workforcePlan.missionType).toBe('game-production')
    expect(payload.metadata.workforcePlan.selectedSquads).toEqual(expect.arrayContaining(['game-production', 'release-trust']))
    expect(payload.metadata.task.planning.workforcePlan.requiredEvidence.join(' ')).toContain('playtest replay')
    expect(payload.metadata.task.status).toBe('planned')
  })

  it('creates blocked task plans for human-held investment/account missions', async () => {
    const { POST: planTask } = await import('@/app/api/studio/tasks/plan/route')
    const response = await planTask(
      new NextRequest('http://localhost:3000/api/studio/tasks/plan', {
        method: 'POST',
        body: JSON.stringify({
          goal: 'Use Chrome to invest in a brokerage account and submit the stock trade',
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.message).toContain('held for human approval')
    expect(payload.metadata.workforcePlan.executionMode).toBe('human-held')
    expect(payload.metadata.task.status).toBe('blocked')
    expect(payload.metadata.task.planning.workforcePlan.requiredApprovals.join(' ')).toContain('signed human approval')
  })

  it('holds run-wave before spawning tasks for high-risk browser investment actions', async () => {
    const { POST: runWave } = await import('@/app/api/studio/tasks/run-wave/route')
    const response = await runWave(
      new NextRequest('http://localhost:3000/api/studio/tasks/run-wave', {
        method: 'POST',
        body: JSON.stringify({
          goal: 'Use Chrome to invest in stocks from the user brokerage account',
          agents: [{ role: 'Browser Operator' }, { role: 'Security Auditor' }],
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(423)
    expect(payload.status).toBe('held')
    expect(payload.taskCount).toBe(0)
    expect(payload.workforcePlan.executionMode).toBe('human-held')
    expect(payload.error).toBe('WORKFORCE_HUMAN_APPROVAL_REQUIRED')
  })

  it('adds workforce planning metadata to safe parallel waves', async () => {
    const { POST: runWave } = await import('@/app/api/studio/tasks/run-wave/route')
    const response = await runWave(
      new NextRequest('http://localhost:3000/api/studio/tasks/run-wave', {
        method: 'POST',
        body: JSON.stringify({
          goal: 'Build app platform feature with API tests and release review',
          agents: [
            { role: 'Engineer', surface: 'api' },
            { role: 'QA', surface: 'tests' },
          ],
        }),
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe('planned')
    expect(payload.workforcePlan.selectedSquads).toEqual(expect.arrayContaining(['software-platform', 'release-trust']))
    expect(payload.tasks).toHaveLength(2)
    expect(payload.tasks[0].planning.workforcePlan.requiredApprovals.join(' ')).toContain('release approval')
    expect(payload.tasks[0].planning.wave).toEqual(expect.objectContaining({ index: 0, totalAgents: 2 }))
  })
})

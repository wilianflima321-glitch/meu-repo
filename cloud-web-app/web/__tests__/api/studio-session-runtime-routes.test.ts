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

describe('studio session runtime routes', () => {
  let sessionRoot = ''
  let taskRoot = ''

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    sessionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-studio-session-route-'))
    taskRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-studio-task-route-'))
    process.env.AETHEL_STUDIO_SESSION_ROOT = sessionRoot
    process.env.AETHEL_TASK_ROOT = taskRoot
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' }, source: 'subscription' })
  })

  afterEach(async () => {
    delete process.env.AETHEL_STUDIO_SESSION_ROOT
    delete process.env.AETHEL_TASK_ROOT
    await fs.rm(sessionRoot, { recursive: true, force: true })
    await fs.rm(taskRoot, { recursive: true, force: true })
  })

  it('starts, reads, stops, and blocks waves after a Studio session is stopped', async () => {
    const { POST: startSession } = await import('@/app/api/studio/session/start/route')
    const startResponse = await startSession(
      new NextRequest('http://localhost:3000/api/studio/session/start', {
        method: 'POST',
        body: JSON.stringify({
          mission: 'Ship a playable combat prototype',
          mode: 'game',
          runtimeTarget: 'local-worker',
          projectId: 'project-1',
        }),
      })
    )
    const startPayload = await startResponse.json()
    const sessionId = startPayload.session.id

    expect(startResponse.status).toBe(200)
    expect(startPayload.session.status).toBe('active')
    expect(startPayload.session.mode).toBe('game')

    const { GET: getSession } = await import('@/app/api/studio/session/[id]/route')
    const getResponse = await getSession(new NextRequest(`http://localhost:3000/api/studio/session/${sessionId}`), {
      params: { id: sessionId },
    })
    const getPayload = await getResponse.json()
    expect(getPayload.session.id).toBe(sessionId)

    const { POST: stopSession } = await import('@/app/api/studio/session/[id]/stop/route')
    const stopResponse = await stopSession(
      new NextRequest(`http://localhost:3000/api/studio/session/${sessionId}/stop`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'manual pause before expensive render' }),
      }),
      { params: { id: sessionId } }
    )
    const stopPayload = await stopResponse.json()
    expect(stopPayload.session.status).toBe('stopped')

    const { POST: runWave } = await import('@/app/api/studio/tasks/run-wave/route')
    const waveResponse = await runWave(
      new NextRequest('http://localhost:3000/api/studio/tasks/run-wave', {
        method: 'POST',
        body: JSON.stringify({ sessionId, goal: 'Run parallel agent wave' }),
      })
    )
    const wavePayload = await waveResponse.json()
    expect(waveResponse.status).toBe(409)
    expect(wavePayload.error).toBe('STUDIO_SESSION_STOPPED')
  })

  it('creates a bounded parallel task wave and attaches it to the Mission Ledger session', async () => {
    const { POST: startSession } = await import('@/app/api/studio/session/start/route')
    const startResponse = await startSession(
      new NextRequest('http://localhost:3000/api/studio/session/start', {
        method: 'POST',
        body: JSON.stringify({ mission: 'Coordinate game, film, and release agents', projectId: 'project-2' }),
      })
    )
    const sessionId = (await startResponse.json()).session.id

    const { POST: runWave } = await import('@/app/api/studio/tasks/run-wave/route')
    const waveResponse = await runWave(
      new NextRequest('http://localhost:3000/api/studio/tasks/run-wave', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          goal: 'Prepare evidence for release',
          agents: [
            { role: 'Producer', surface: 'mission-ledger' },
            { role: 'QA', goal: 'Validate playtest blockers', surface: 'validation-graph' },
          ],
        }),
      })
    )
    const wavePayload = await waveResponse.json()
    expect(waveResponse.status).toBe(200)
    expect(wavePayload.taskCount).toBe(2)
    expect(wavePayload.tasks[0].goal).toContain('Producer')

    const { GET: getSession } = await import('@/app/api/studio/session/[id]/route')
    const getResponse = await getSession(new NextRequest(`http://localhost:3000/api/studio/session/${sessionId}`), {
      params: { id: sessionId },
    })
    const sessionPayload = await getResponse.json()
    expect(sessionPayload.session.activeTaskIds).toHaveLength(2)
    expect(sessionPayload.session.evidenceRefs[0]).toContain('mission-ledger://')
  })
})

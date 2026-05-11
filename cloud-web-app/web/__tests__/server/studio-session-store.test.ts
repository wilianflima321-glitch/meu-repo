import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let tempRoot = ''

async function loadStore() {
  vi.resetModules()
  process.env.AETHEL_STUDIO_SESSION_ROOT = tempRoot
  return import('@/lib/server/studio-session-store')
}

describe('studio-session-store', () => {
  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-studio-session-'))
  })

  afterEach(async () => {
    delete process.env.AETHEL_STUDIO_SESSION_ROOT
    await fs.rm(tempRoot, { recursive: true, force: true })
  })

  it('creates, loads, attaches tasks, and stops a durable Studio session', async () => {
    const store = await loadStore()
    const session = await store.createStudioSession({
      userId: 'user-1',
      projectId: 'project-1',
      mission: 'Build a cinematic game intro with render evidence',
      mode: 'film',
      runtimeTarget: 'local-worker',
    })

    expect(session.status).toBe('active')
    expect(session.mode).toBe('film')
    expect(session.runtimeTarget).toBe('local-worker')

    const loaded = await store.loadStudioSession('user-1', session.id)
    expect(loaded?.mission).toContain('cinematic game intro')

    await store.attachStudioSessionTask(session, 'task-1', 'mission-ledger://session/task-1')
    expect(session.activeTaskIds).toEqual(['task-1'])
    expect(session.evidenceRefs).toContain('mission-ledger://session/task-1')

    const stopped = await store.stopStudioSession(session, { reason: 'operator pause' })
    expect(stopped.status).toBe('stopped')
    expect(stopped.stopReason).toBe('operator pause')
  })
})

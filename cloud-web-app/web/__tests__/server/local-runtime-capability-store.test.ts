import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  loadLatestLocalRuntimeCapabilitySnapshot,
  saveLocalRuntimeCapabilitySnapshot,
} from '@/lib/server/local-runtime-capability-store'

describe('local runtime capability store', () => {
  const createdRoots: string[] = []

  afterEach(async () => {
    delete process.env.AETHEL_LOCAL_RUNTIME_STORE_ROOT

    await Promise.all(
      createdRoots.splice(0).map(async (root) => {
        await fs.rm(root, { recursive: true, force: true })
      })
    )
  })

  it('persists and reloads the latest device snapshot for a user', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-runtime-store-'))
    createdRoots.push(root)
    process.env.AETHEL_LOCAL_RUNTIME_STORE_ROOT = root

    await saveLocalRuntimeCapabilitySnapshot({
      userId: 'user-1',
      deviceId: 'device-a',
      report: {
        version: 1,
        hostKind: 'desktop-app',
        transport: 'custom-event',
        os: 'windows',
        receivedAt: '2026-05-02T16:00:00.000Z',
        preferredExecutor: 'local-native',
        npuAvailable: true,
      },
    })

    const snapshot = await loadLatestLocalRuntimeCapabilitySnapshot('user-1')

    expect(snapshot).not.toBeNull()
    expect(snapshot?.deviceId).toBe('device-a')
    expect(snapshot?.report.preferredExecutor).toBe('local-native')
  })

  it('keeps the freshest report as the latest snapshot across devices', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aethel-runtime-store-'))
    createdRoots.push(root)
    process.env.AETHEL_LOCAL_RUNTIME_STORE_ROOT = root

    await saveLocalRuntimeCapabilitySnapshot({
      userId: 'user-1',
      deviceId: 'device-a',
      report: {
        version: 1,
        hostKind: 'desktop-app',
        transport: 'custom-event',
        os: 'windows',
        receivedAt: '2026-05-02T16:00:00.000Z',
        preferredExecutor: 'local-worker',
      },
    })

    await saveLocalRuntimeCapabilitySnapshot({
      userId: 'user-1',
      deviceId: 'device-b',
      report: {
        version: 1,
        hostKind: 'desktop-app',
        transport: 'postmessage',
        os: 'windows',
        receivedAt: '2026-05-02T16:04:00.000Z',
        preferredExecutor: 'local-native',
        gpuComputeAvailable: true,
      },
    })

    const snapshot = await loadLatestLocalRuntimeCapabilitySnapshot('user-1')

    expect(snapshot?.deviceId).toBe('device-b')
    expect(snapshot?.report.gpuComputeAvailable).toBe(true)
  })
})

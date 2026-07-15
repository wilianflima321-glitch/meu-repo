import { describe, expect, it } from 'vitest'

import type { DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'
import {
  DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
  readDeepContextMemorySnapshotFromSettings,
  SettingsDeepContextPersistenceAdapter,
  writeDeepContextMemorySnapshotToSettings,
} from '@/lib/production/deep-context-settings-persistence'

const snapshot: DeepContextMemorySnapshot = {
  version: 1,
  projectId: 'project-1',
  updatedAt: '2026-05-26T12:00:00.000Z',
  chunks: [
    {
      id: 'chunk-1',
      projectId: 'project-1',
      category: 'world',
      title: 'World rule',
      content: 'Magic consumes heat and changes faction behavior.',
      tags: ['magic', 'world'],
      sourceRefs: ['docs/world.md'],
      evidenceRefs: ['evidence://world-rule'],
      importance: 0.9,
      tokenEstimate: 12,
      createdAt: '2026-05-26T11:00:00.000Z',
      updatedAt: '2026-05-26T12:00:00.000Z',
    },
  ],
}

describe('deep context settings persistence', () => {
  it('writes and reads sanitized project memory from settings', () => {
    const settings = writeDeepContextMemorySnapshotToSettings({ theme: 'dark' }, snapshot)
    const restored = readDeepContextMemorySnapshotFromSettings(settings, 'project-1')

    expect(settings.theme).toBe('dark')
    expect(settings[DEEP_CONTEXT_MEMORY_SETTINGS_KEY]).toEqual(expect.objectContaining({ projectId: 'project-1' }))
    expect(restored).toEqual(snapshot)
  })

  it('rejects mismatched projects and malformed chunks', () => {
    const settings = {
      [DEEP_CONTEXT_MEMORY_SETTINGS_KEY]: {
        version: 1,
        projectId: 'project-1',
        updatedAt: 'not-a-date',
        chunks: [
          snapshot.chunks[0],
          { id: 'bad', category: 'made-up', content: 'invalid' },
          { id: '', category: 'world', content: 'missing id' },
        ],
      },
    }

    expect(readDeepContextMemorySnapshotFromSettings(settings, 'other-project')).toBeNull()
    expect(readDeepContextMemorySnapshotFromSettings(settings, 'project-1')?.chunks).toHaveLength(1)
  })

  it('adapts settings to the DeepContext persistence contract', async () => {
    let persisted: DeepContextMemorySnapshot | null = null
    const adapter = new SettingsDeepContextPersistenceAdapter(
      () => writeDeepContextMemorySnapshotToSettings({}, snapshot),
      (nextSnapshot) => {
        persisted = nextSnapshot
      },
      'project-1'
    )

    await expect(adapter.load('project-1')).resolves.toEqual(snapshot)
    await adapter.save('project-1', snapshot)
    expect(persisted).toEqual(snapshot)
    await expect(adapter.save('other-project', snapshot)).rejects.toThrow('DeepContext project mismatch')
  })
})

import { describe, expect, it } from 'vitest'

import {
  buildRepositoryContextBudgetExecutionState,
  mergeRepositoryContextBudgetExecutionPatch,
  readRepositoryContextBudgetExecutionStateFromSettings,
  REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY,
  writeRepositoryContextBudgetExecutionStateToSettings,
} from '@/lib/production/repository-context-budget-execution'
import { buildRepositoryCartographyManifest } from '@/lib/production/repository-cartography'

const now = '2026-05-04T23:45:00.000Z'

function buildManifest() {
  return buildRepositoryCartographyManifest({
    projectId: 'project-1',
    generatedAt: now,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 800 },
      { path: 'README.md', sizeBytes: 4_000 },
      { path: 'docs/story-bible.md', sizeBytes: 8_000 },
      { path: 'assets/hero.glb', sizeBytes: 90 * 1024 * 1024, license: 'internal' },
    ],
  })
}

describe('repository context budget execution', () => {
  it('creates durable execution batches from a context budget manifest', () => {
    const manifest = buildManifest()
    const execution = buildRepositoryContextBudgetExecutionState({
      projectId: 'project-1',
      manifest,
      now,
    })

    expect(execution.version).toBe(1)
    expect(execution.manifestId).toBe(manifest.id)
    expect(execution.batches.map((batch) => batch.id)).toEqual(
      expect.arrayContaining(['read-canonical-contracts', 'index-heavy-surfaces'])
    )
    expect(execution.batches.every((batch) => batch.status === 'pending')).toBe(true)
  })

  it('updates one batch without losing prior evidence or surface counts', () => {
    const manifest = buildManifest()
    const execution = buildRepositoryContextBudgetExecutionState({
      projectId: 'project-1',
      manifest,
      now,
    })
    const updated = mergeRepositoryContextBudgetExecutionPatch(
      execution,
      {
        batchId: 'index-heavy-surfaces',
        status: 'running',
        completedSurfaceCount: 1,
        evidenceRefs: ['context-budget:index-heavy-surfaces:preview'],
      },
      '2026-05-05T00:00:00.000Z'
    )
    const batch = updated.batches.find((candidate) => candidate.id === 'index-heavy-surfaces')

    expect(batch).toMatchObject({
      status: 'running',
      completedSurfaceCount: 1,
      evidenceRefs: ['context-budget:index-heavy-surfaces:preview'],
      updatedAt: '2026-05-05T00:00:00.000Z',
    })
  })

  it('preserves matching manifest execution state and resets when manifest changes', () => {
    const manifest = buildManifest()
    const execution = mergeRepositoryContextBudgetExecutionPatch(
      buildRepositoryContextBudgetExecutionState({ projectId: 'project-1', manifest, now }),
      { batchId: 'read-canonical-contracts', status: 'complete' },
      now
    )
    const preserved = buildRepositoryContextBudgetExecutionState({
      projectId: 'project-1',
      manifest,
      previous: execution,
      now,
    })
    const nextManifest = buildRepositoryCartographyManifest({
      projectId: 'project-1',
      generatedAt: '2026-05-05T00:10:00.000Z',
      artifacts: [{ path: 'package.json', sizeBytes: 1_200 }],
    })
    const reset = buildRepositoryContextBudgetExecutionState({
      projectId: 'project-1',
      manifest: nextManifest,
      previous: execution,
      now,
    })

    expect(preserved.batches.find((batch) => batch.id === 'read-canonical-contracts')?.status).toBe('complete')
    expect(reset.batches.every((batch) => batch.status === 'pending')).toBe(true)
  })

  it('persists and reads execution state from project settings', () => {
    const manifest = buildManifest()
    const execution = buildRepositoryContextBudgetExecutionState({ projectId: 'project-1', manifest, now })
    const settings = writeRepositoryContextBudgetExecutionStateToSettings({}, execution)

    expect(settings[REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]).toMatchObject({ manifestId: manifest.id })
    expect(readRepositoryContextBudgetExecutionStateFromSettings(settings)).toMatchObject({
      manifestId: manifest.id,
      batches: expect.arrayContaining([expect.objectContaining({ id: 'read-canonical-contracts' })]),
    })
    expect(readRepositoryContextBudgetExecutionStateFromSettings({ [REPOSITORY_CONTEXT_BUDGET_EXECUTION_SETTINGS_KEY]: { version: 1 } })).toBeNull()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildAgentReadReceiptState, writeAgentReadReceiptStateToSettings } from '@/lib/production/agent-read-receipts'
import type { DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'
import { writeDeepContextMemorySnapshotToSettings } from '@/lib/production/deep-context-settings-persistence'
import {
  buildRepositoryCartographyManifest,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => prismaMocks)
vi.mock('@/lib/server/mention-context', () => ({
  buildMentionContextBlock: vi.fn(async () => ({ context: '', tags: [] })),
}))
vi.mock('@/lib/server/project-rules', () => ({
  loadProjectRulesContext: vi.fn(async () => ''),
}))

import { buildAdvancedChatContext } from '@/lib/server/ai-chat-advanced/context'

const generatedAt = '2026-05-26T13:00:00.000Z'

function buildSettingsWithMemory() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'project-memory',
    generatedAt,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 1_000 },
      { path: 'README.md', sizeBytes: 5_000 },
      { path: 'src/app/page.tsx', sizeBytes: 16_000, symbols: ['HomePage'] },
      { path: 'tests/playtest/smoke.spec.ts', sizeBytes: 10_000 },
    ],
  })
  const receiptState = buildAgentReadReceiptState({
    projectId: 'project-memory',
    now: generatedAt,
    receipts: [
      {
        agent: 'Producer Agent',
        kind: 'repository-cartography',
        ref: manifest.id,
        evidenceRefs: ['repo-cartography:project-memory'],
      },
    ],
  })
  return writeAgentReadReceiptStateToSettings(writeRepositoryCartographyManifestToSettings({}, manifest), receiptState)
}

function buildSettingsWithDeepContext() {
  const snapshot: DeepContextMemorySnapshot = {
    version: 1,
    projectId: 'project-memory',
    updatedAt: generatedAt,
    chunks: [
      {
        id: 'gameplay-release-rule',
        projectId: 'project-memory',
        category: 'gameplay',
        title: 'Release quality rule',
        content: 'Every release candidate needs playtest evidence, performance trace and human approval before final claims.',
        tags: ['release', 'playtest', 'performance'],
        sourceRefs: ['docs/release.md'],
        evidenceRefs: ['evidence://release-rule'],
        importance: 0.95,
        tokenEstimate: 24,
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
      {
        id: 'draft-boss-fight',
        projectId: 'project-memory',
        category: 'gameplay',
        title: 'Draft boss fight',
        content: 'Boss fight idea exists but has no evidence or playtest yet.',
        tags: ['boss', 'draft'],
        sourceRefs: [],
        evidenceRefs: [],
        importance: 0.7,
        tokenEstimate: 16,
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
    ],
  }

  return writeDeepContextMemorySnapshotToSettings(buildSettingsWithMemory(), snapshot)
}

describe('advanced chat context memory spine integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds a blocked context-memory instruction when project memory is missing', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-empty',
      name: 'Empty project',
      template: 'app',
      settings: {},
      files: [{ path: 'src/app/page.tsx' }],
    })

    const context = await buildAdvancedChatContext({
      userId: 'user-1',
      projectId: 'project-empty',
      messages: [
        { role: 'user', content: 'Build the whole app from the repo context' },
      ],
      qualityMode: 'delivery',
      enableWebResearch: false,
    })

    expect(context.contextMemoryPlan?.status).toBe('blocked')
    expect(context.enhancedSystemMessage).toContain('CONTEXT MEMORY SPINE')
    expect(context.enhancedSystemMessage).toContain('Build or refresh project memory')
    expect(context.enhancedSystemMessage).toContain('do not claim broad autonomous edits')
  })

  it('injects available memory lane, evidence and read-receipt controls when project memory exists', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-memory',
      name: 'Memory project',
      template: 'game',
      settings: buildSettingsWithMemory(),
      files: [{ path: 'src/app/page.tsx' }, { path: 'tests/playtest/smoke.spec.ts' }],
    })

    const context = await buildAdvancedChatContext({
      userId: 'user-1',
      projectId: 'project-memory',
      messages: [
        { role: 'user', content: 'Improve app page and validate playtest evidence' },
      ],
      qualityMode: 'studio',
      enableWebResearch: false,
    })

    expect(context.contextMemoryPlan?.status).toBe('available')
    expect(context.contextMemoryPlan?.requiresReadReceipts).toBe(false)
    expect(context.enhancedSystemMessage).toContain('Read receipts: satisfied or not required')
    expect(context.enhancedSystemMessage).toContain('Never index GB-scale projects on the UI thread')
  })

  it('injects a governed deep-context pack for model-aware agent prompts', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-memory',
      name: 'Memory project',
      template: 'game',
      settings: buildSettingsWithDeepContext(),
      files: [{ path: 'src/app/page.tsx' }, { path: 'tests/playtest/smoke.spec.ts' }],
    })

    const context = await buildAdvancedChatContext({
      userId: 'user-1',
      projectId: 'project-memory',
      messages: [
        { role: 'user', content: 'Prepare release plan for boss fight with playtest evidence' },
      ],
      qualityMode: 'delivery',
      enableWebResearch: false,
      model: 'claude-opus-4.5',
    })

    expect(context.deepContextPack?.status).toBe('held')
    expect(context.deepContextPack?.mode).toBe('release')
    expect(context.enhancedSystemMessage).toContain('DEEP CONTEXT PACK')
    expect(context.enhancedSystemMessage).toContain('gameplay-release-rule')
    expect(context.enhancedSystemMessage).toContain('held:no-evidence')
    expect(context.enhancedSystemMessage).toContain('do not invent missing facts')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildAgentReadReceiptState, writeAgentReadReceiptStateToSettings } from '@/lib/production/agent-read-receipts'
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
})

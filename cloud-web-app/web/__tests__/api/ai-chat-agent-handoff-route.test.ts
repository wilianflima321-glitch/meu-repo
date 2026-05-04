import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { buildDefaultAgenticProductionState, writeAgenticProductionStateToSettings } from '@/lib/production/agentic-production-state'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const aiMocks = vi.hoisted(() => ({
  aiService: {
    getAvailableProviders: vi.fn(),
    chat: vi.fn(),
  },
}))

const meteringMocks = vi.hoisted(() => ({
  acquireConcurrencyLease: vi.fn(),
  estimateTokensFromText: vi.fn(),
  consumeMeteredUsage: vi.fn(),
  releaseConcurrencyLease: vi.fn(),
}))

const planLimitMocks = vi.hoisted(() => ({
  checkModelAccess: vi.fn(),
}))

const projectRulesMocks = vi.hoisted(() => ({
  loadProjectRulesContext: vi.fn(),
  applyProjectRulesToMessages: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/ai-service', () => aiMocks)
vi.mock('@/lib/metering', () => meteringMocks)
vi.mock('@/lib/plan-limits', () => planLimitMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/server/project-rules', () => projectRulesMocks)
vi.mock('@/lib/server/simulation-guard', () => ({
  blockIfSimulationDisabled: vi.fn(() => null),
}))
vi.mock('@/lib/server/ai-demo-mode', () => ({
  AI_DEMO_MODEL: 'demo',
  AI_DEMO_PROVIDER: 'openai',
  buildDemoChatContent: vi.fn(() => 'demo'),
  demoRouteMetadata: vi.fn(() => ({})),
  isAiDemoModeEnabled: vi.fn(() => false),
}))
vi.mock('@/lib/server/ai-demo-usage', () => ({
  consumeAiDemoUsage: vi.fn(),
}))
vi.mock('@/lib/server/ai-core-rate-limit', () => ({
  AI_CORE_RATE_LIMIT: {},
  enforceAiCoreRateLimit: vi.fn(() => null),
}))

import { POST } from '@/app/api/ai/chat/route'

const now = '2026-05-04T20:30:00.000Z'

describe('api/ai/chat agent handoff context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { limits: { concurrent: 2 } } })
    meteringMocks.acquireConcurrencyLease.mockResolvedValue({ leaseId: 'lease-1' })
    meteringMocks.estimateTokensFromText.mockReturnValue(42)
    meteringMocks.consumeMeteredUsage.mockResolvedValue({ remaining: {} })
    meteringMocks.releaseConcurrencyLease.mockResolvedValue(undefined)
    planLimitMocks.checkModelAccess.mockResolvedValue({ allowed: true })
    aiMocks.aiService.getAvailableProviders.mockReturnValue(['openai'])
    aiMocks.aiService.chat.mockResolvedValue({
      content: 'Use the scoped gameplay surfaces first.',
      provider: 'openai',
      model: 'gpt-test',
      tokensUsed: 88,
      latencyMs: 12,
    })
    projectRulesMocks.loadProjectRulesContext.mockResolvedValue('Project rules: no fake success.')
    projectRulesMocks.applyProjectRulesToMessages.mockImplementation((messages: Array<{ role: string; content: string }>, rules: string) => {
      if (!rules.trim()) return messages
      const [first, ...rest] = messages
      if (first?.role === 'system') return [{ ...first, content: `${first.content}\n\n${rules}` }, ...rest]
      return [{ role: 'system', content: rules }, ...messages]
    })
  })

  it('injects Project Brain and Repository Cartography into the model request', async () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'project-1',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1000 },
        { path: 'src/game/combat/BossController.ts', sizeBytes: 35_000 },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 9000 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
      manifest
    )
    const settings = writeRepositoryCartographyManifestToSettings(writeAgenticProductionStateToSettings({}, state), manifest)

    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      settings,
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'project-1',
          messages: [{ role: 'user', content: 'Improve combat feel without inventing files.' }],
        }),
        headers: { 'content-type': 'application/json' },
      })
    )
    const payload = await response.json()
    const chatCall = aiMocks.aiService.chat.mock.calls[0]?.[0] as { messages: Array<{ role: string; content: string }> }
    const systemPrompt = chatCall.messages[0]?.content ?? ''

    expect(response.status).toBe(200)
    expect(systemPrompt).toContain('Aethel Agent Handoff Packet')
    expect(systemPrompt).toContain('Gameplay Engineer Agent')
    expect(systemPrompt).toContain('BossController.ts')
    expect(systemPrompt).toContain('Project rules: no fake success.')
    expect(payload.agentHandoff).toEqual(
      expect.objectContaining({
        agent: 'Gameplay Engineer Agent',
        lane: 'gameplay',
        scopeMode: 'diff-only',
        hasManifest: true,
        manifestId: manifest.id,
      })
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}))

const cartographyMocks = vi.hoisted(() => ({
  readRepositoryCartographyManifestFromSettings: vi.fn(),
}))

const searchMocks = vi.hoisted(() => ({
  searchSemanticCodebase: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMocks.prisma }))
vi.mock('@/lib/production/repository-cartography', () => cartographyMocks)
vi.mock('@/lib/server/semantic-code-search', () => searchMocks)

import { assembleAgentContext } from '@/lib/server/agent-context/assemble-agent-context'

function searchResult(filePath: string) {
  return {
    id: filePath,
    filePath,
    score: 0.81,
    excerpt: `// ${filePath}\nexport const x = 1`,
    startLine: 1,
    endLine: 2,
    language: 'typescript',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMocks.prisma.project.findFirst.mockResolvedValue({ settings: {} })
  cartographyMocks.readRepositoryCartographyManifestFromSettings.mockReturnValue(null)
  searchMocks.searchSemanticCodebase.mockResolvedValue({
    readiness: { status: 'ready' },
    results: [],
    stats: {},
  })
})

describe('assembleAgentContext', () => {
  it('returns empty context without userId/projectId', async () => {
    const result = await assembleAgentContext({ userId: '', projectId: '', query: 'x' })
    expect(result.text).toBe('')
    expect(result.semanticReady).toBe(false)
  })

  it('combines mustReadFirst cartography with semantic results', async () => {
    cartographyMocks.readRepositoryCartographyManifestFromSettings.mockReturnValue({
      contextPlan: { mustReadFirst: ['/src/app.ts', '.aethelrules'] },
    })
    searchMocks.searchSemanticCodebase.mockResolvedValue({
      readiness: { status: 'ready' },
      results: [searchResult('/src/combat/Boss.ts')],
      stats: {},
    })

    const result = await assembleAgentContext({ userId: 'u1', projectId: 'p1', query: 'boss fight' })

    expect(result.mustReadFirst).toEqual(['/src/app.ts', '.aethelrules'])
    expect(result.retrievedFiles).toEqual(['/src/combat/Boss.ts'])
    expect(result.text).toContain('Repository map')
    expect(result.text).toContain('/src/combat/Boss.ts:1-2')
    expect(result.semanticReady).toBe(true)
  })

  it('degrades to empty when nothing is retrieved', async () => {
    const result = await assembleAgentContext({ userId: 'u1', projectId: 'p1', query: 'nothing' })
    expect(result.text).toBe('')
  })

  it('survives semantic search failures (best-effort)', async () => {
    cartographyMocks.readRepositoryCartographyManifestFromSettings.mockReturnValue({
      contextPlan: { mustReadFirst: ['/src/only.ts'] },
    })
    searchMocks.searchSemanticCodebase.mockRejectedValue(new Error('vector db down'))

    const result = await assembleAgentContext({ userId: 'u1', projectId: 'p1', query: 'x' })
    expect(result.mustReadFirst).toEqual(['/src/only.ts'])
    expect(result.retrievedFiles).toEqual([])
    expect(result.text).toContain('/src/only.ts')
  })
})

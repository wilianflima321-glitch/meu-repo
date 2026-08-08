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

const ragMocks = vi.hoisted(() => ({
  queryRepoGraphRAG: vi.fn(),
}))

const workspaceMocks = vi.hoisted(() => ({
  getScopedWorkspaceRoot: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: prismaMocks.prisma }))
vi.mock('@/lib/production/repository-cartography', () => cartographyMocks)
vi.mock('@/lib/server/repo-graph-rag/repo-graph-rag', () => ragMocks)
vi.mock('@/lib/server/workspace-scope', () => workspaceMocks)

import { assembleAgentContext } from '@/lib/server/agent-context/assemble-agent-context'

function graphResult(filePath: string) {
  return {
    filePath,
    content: `// ${filePath}\nexport const x = 1`
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMocks.prisma.project.findFirst.mockResolvedValue({ settings: {} })
  cartographyMocks.readRepositoryCartographyManifestFromSettings.mockReturnValue(null)
  ragMocks.queryRepoGraphRAG.mockResolvedValue({
    query: 'test',
    neighborhoodFiles: [],
    semanticHits: [],
  })
  workspaceMocks.getScopedWorkspaceRoot.mockResolvedValue('/fake/root')
})

describe('assembleAgentContext', () => {
  it('returns empty context without userId/projectId', async () => {
    const result = await assembleAgentContext({ userId: '', projectId: '', query: 'x' })
    expect(result.text).toBe('')
    expect(result.semanticReady).toBe(false)
  })

  it('combines mustReadFirst cartography with AST semantic results', async () => {
    cartographyMocks.readRepositoryCartographyManifestFromSettings.mockReturnValue({
      contextPlan: { mustReadFirst: ['/src/app.ts', '.aethelrules'] },
    })
    ragMocks.queryRepoGraphRAG.mockResolvedValue({
      query: 'boss fight',
      neighborhoodFiles: [graphResult('/src/combat/Boss.ts')],
      semanticHits: [{ filePath: '/src/combat/Boss.ts', score: 0.9, excerpt: 'a' }],
    })

    const result = await assembleAgentContext({ userId: 'u1', projectId: 'p1', query: 'boss fight' })

    expect(result.mustReadFirst).toEqual(['/src/app.ts', '.aethelrules'])
    expect(result.retrievedFiles).toEqual(['/src/combat/Boss.ts'])
    expect(result.text).toContain('Repository map')
    expect(result.text).toContain('/src/combat/Boss.ts')
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
    ragMocks.queryRepoGraphRAG.mockRejectedValue(new Error('vector db down'))

    const result = await assembleAgentContext({ userId: 'u1', projectId: 'p1', query: 'x' })
    expect(result.mustReadFirst).toEqual(['/src/only.ts'])
    expect(result.retrievedFiles).toEqual([])
    expect(result.text).toContain('/src/only.ts')
  })
})

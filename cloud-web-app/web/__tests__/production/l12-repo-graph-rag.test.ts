import { describe, it, expect } from 'vitest'
import { buildRepositoryImportGraph } from '@/lib/server/repo-graph-rag/repo-graph-builder'
import { extractNeighborhoodSlice } from '@/lib/server/repo-graph-rag/neighborhood-slicer'
import type { RepositoryCartographyManifest, RepositorySurface } from '@/lib/production/repository-cartography-contracts'

describe('L.12 RepoGraphRAG - AST Supreme Edition', () => {
  it('resolves specific imported symbols with startLine/endLine precision', async () => {
    const rootPath = process.cwd()

    const surfaces: RepositorySurface[] = [
      {
        id: 'surface-1',
        path: 'lib/server/repo-graph-rag/repo-graph-builder.ts',
        basename: 'repo-graph-builder.ts',
        extension: 'ts',
        sizeBytes: 1000,
        sizeClass: 'small',
        sourceKind: 'local-workspace',
        domain: 'app-code',
        layer: 'application',
        strategy: 'direct-read',
        priority: 'high',
        ownerAgents: [],
        risks: [],
        symbols: [],
        dependencies: []
      },
      {
        id: 'surface-2',
        path: 'lib/server/repo-graph-rag/neighborhood-slicer.ts',
        basename: 'neighborhood-slicer.ts',
        extension: 'ts',
        sizeBytes: 1000,
        sizeClass: 'small',
        sourceKind: 'local-workspace',
        domain: 'app-code',
        layer: 'application',
        strategy: 'direct-read',
        priority: 'high',
        ownerAgents: [],
        risks: [],
        symbols: [],
        dependencies: []
      },
      {
        id: 'surface-3',
        path: 'lib/server/repo-graph-rag/repo-graph-rag.ts',
        basename: 'repo-graph-rag.ts',
        extension: 'ts',
        sizeBytes: 1000,
        sizeClass: 'small',
        sourceKind: 'local-workspace',
        domain: 'app-code',
        layer: 'application',
        strategy: 'direct-read',
        priority: 'high',
        ownerAgents: [],
        risks: [],
        symbols: [],
        dependencies: []
      }
    ]

    const manifest: RepositoryCartographyManifest = {
      version: 1,
      id: 'test-manifest',
      generatedAt: new Date().toISOString(),
      projectId: 'test-project',
      sourceKinds: ['local-workspace'],
      totals: {
        totalFiles: 3,
        totalBytes: 3000,
        domainCounts: { 'app-code': 3 } as any,
        strategyCounts: { 'direct-read': 3 } as any,
        largestSurfaces: []
      },
      surfaces,
      duplicateGroups: [],
      criticalGaps: [],
      contextPlan: { mustReadFirst: [], doNotInvent: [], indexingPolicy: [] },
      contextBudget: { version: 1, directReadBytes: 3000, summarizeFirstBytes: 0, indexOnlyBytes: 0, externalMirrorBytes: 0, manualReviewBytes: 0, estimatedChunkCount: 1, retrievalBatches: [], largestContextRisks: [], guardrails: [] },
      agentHandoffs: []
    }

    const graph = await buildRepositoryImportGraph(manifest, rootPath)
    
    // Normalize paths to absolute
    const builderPath = `${rootPath}/lib/server/repo-graph-rag/repo-graph-builder.ts`.replace(/\\/g, '/')
    const slicerPath = `${rootPath}/lib/server/repo-graph-rag/neighborhood-slicer.ts`.replace(/\\/g, '/')
    const ragPath = `${rootPath}/lib/server/repo-graph-rag/repo-graph-rag.ts`.replace(/\\/g, '/')

    const ragNode = graph.nodes.get(ragPath)
    expect(ragNode).toBeDefined()
    expect(ragNode!.imports.some(i => i.resolvedPath === builderPath)).toBe(true)

    // Verify Slicer behavior
    const sliceResult = extractNeighborhoodSlice(graph, ragPath, 1, 5)
    
    // It should include the main target entirely
    expect(sliceResult.surfaces.some(s => s.filePath === ragPath && s.startLine === undefined)).toBe(true)

    // It should include ONLY the requested symbols from dependencies, not the full files
    const builderSlice = sliceResult.surfaces.find(s => s.filePath === builderPath && s.startLine !== undefined)
    expect(builderSlice).toBeDefined()
    expect(builderSlice!.startLine).toBeGreaterThan(0)
    expect(builderSlice!.endLine).toBeGreaterThanOrEqual(builderSlice!.startLine!)
  })
})

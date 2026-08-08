import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildRepositoryImportGraph } from '@/lib/server/repo-graph-rag/repo-graph-builder'
import { extractNeighborhoodSlice } from '@/lib/server/repo-graph-rag/neighborhood-slicer'
import {
  L12_IMPORT_PRECISION_GATE,
  measureImportPrecisionSoak,
  resolveWhoImports,
} from '@/lib/server/repo-graph-rag/import-precision-soak'
import type { RepositoryCartographyManifest, RepositorySurface } from '@/lib/production/repository-cartography-contracts'

function absPosix(...parts: string[]): string {
  return path.resolve(...parts).replace(/\\/g, '/')
}

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
        dependencies: [],
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
        dependencies: [],
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
        dependencies: [],
      },
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
        domainCounts: { 'app-code': 3 } as RepositoryCartographyManifest['totals']['domainCounts'],
        strategyCounts: { 'direct-read': 3 } as RepositoryCartographyManifest['totals']['strategyCounts'],
        largestSurfaces: [],
      },
      surfaces,
      duplicateGroups: [],
      criticalGaps: [],
      contextPlan: { mustReadFirst: [], doNotInvent: [], indexingPolicy: [] },
      contextBudget: {
        version: 1,
        directReadBytes: 3000,
        summarizeFirstBytes: 0,
        indexOnlyBytes: 0,
        externalMirrorBytes: 0,
        manualReviewBytes: 0,
        estimatedChunkCount: 1,
        retrievalBatches: [],
        largestContextRisks: [],
        guardrails: [],
      },
      agentHandoffs: [],
    }

    const graph = await buildRepositoryImportGraph(manifest, rootPath)

    const builderPath = absPosix(rootPath, 'lib/server/repo-graph-rag/repo-graph-builder.ts')
    const slicerPath = absPosix(rootPath, 'lib/server/repo-graph-rag/neighborhood-slicer.ts')
    const ragPath = absPosix(rootPath, 'lib/server/repo-graph-rag/repo-graph-rag.ts')

    const ragNode = graph.nodes.get(ragPath)
    expect(ragNode).toBeDefined()
    expect(ragNode!.imports.some((i) => i.resolvedPath === builderPath)).toBe(true)

    const sliceResult = extractNeighborhoodSlice(graph, ragPath, 1, 5)

    expect(sliceResult.surfaces.some((s) => s.filePath === ragPath && s.startLine === undefined)).toBe(
      true
    )

    const builderSlice = sliceResult.surfaces.find(
      (s) => s.filePath === builderPath && s.startLine !== undefined
    )
    expect(builderSlice).toBeDefined()
    expect(builderSlice!.startLine).toBeGreaterThan(0)
    expect(builderSlice!.endLine).toBeGreaterThanOrEqual(builderSlice!.startLine!)

    // slicer itself is a forward dep of rag — should appear
    expect(sliceResult.surfaces.some((s) => s.filePath === slicerPath)).toBe(true)
  })

  it('adversarial fixture: never maps node crypto / basename collisions onto local files', async () => {
    const fixtureRoot = absPosix(process.cwd(), '__tests__/fixtures/l12-monorepo')
    const soak = await measureImportPrecisionSoak({ rootPath: fixtureRoot })

    expect(soak.files).toBeGreaterThanOrEqual(6)
    expect(soak.edgeFalsePositives).toBe(0)
    expect(soak.whoImportsPrecision).toBeGreaterThanOrEqual(L12_IMPORT_PRECISION_GATE)
    expect(soak.neighborhoodPrecision).toBeGreaterThanOrEqual(L12_IMPORT_PRECISION_GATE)
    expect(soak.meetsGate).toBe(true)

    const { manifestFromAbsoluteFiles } = await import(
      '@/lib/server/repo-graph-rag/import-precision-soak'
    )
    const fs = await import('node:fs/promises')
    const entries = await fs.readdir(fixtureRoot, { recursive: true })
    const files = entries
      .map((e) => String(e).replace(/\\/g, '/'))
      .filter((rel) => /\.(ts|tsx)$/.test(rel))
      .map((rel) => absPosix(fixtureRoot, rel))

    const graph = await buildRepositoryImportGraph(
      manifestFromAbsoluteFiles(fixtureRoot, files),
      fixtureRoot
    )
    const cryptoLocal = absPosix(fixtureRoot, 'packages/core/crypto.ts')
    const utilsLogger = absPosix(fixtureRoot, 'packages/utils/logger.ts')
    const appLogger = absPosix(fixtureRoot, 'packages/app/logger.ts')
    const mainPath = absPosix(fixtureRoot, 'packages/app/main.ts')

    const mainImports = graph.nodes.get(mainPath)?.imports.map((i) => i.resolvedPath) ?? []
    expect(mainImports).toContain(cryptoLocal)
    expect(mainImports).toContain(utilsLogger)
    expect(mainImports).toContain(appLogger)
    // Bare `crypto` package must not resolve to local crypto.ts as a second edge
    expect(mainImports.filter((p) => p === cryptoLocal)).toHaveLength(1)

    const cryptoImporters = resolveWhoImports(graph, cryptoLocal)
    expect(cryptoImporters).toContain(mainPath)
    expect(cryptoImporters).toContain(absPosix(fixtureRoot, 'packages/core/index.ts'))
  })

  it('L-ACC-05 soak: who-imports + neighborhood precision ≥90% on Aethel monorepo slice', async () => {
    const rootPath = process.cwd()
    const soak = await measureImportPrecisionSoak({
      rootPath,
      sliceDirs: [
        path.join(rootPath, 'lib/server'),
        path.join(rootPath, 'lib/production'),
        path.join(rootPath, 'lib/observability'),
        path.join(rootPath, 'lib/ai'),
      ],
    })

    // Honest telemetry for Progress (printed via expect message on failure)
    const summary = {
      files: soak.files,
      whoImportsPrecisionPct: +(soak.whoImportsPrecision * 100).toFixed(2),
      neighborhoodPrecisionPct: +(soak.neighborhoodPrecision * 100).toFixed(2),
      edgePrecisionPct: +(soak.edgePrecision * 100).toFixed(2),
      edgeFp: soak.edgeFalsePositives,
      whoFp: soak.whoImportsFalsePositives,
      neighFp: soak.neighborhoodFalsePositives,
      sampleFp: soak.sampleFalsePositives.slice(0, 8),
    }

    expect(soak.files, JSON.stringify(summary)).toBeGreaterThan(100)
    expect(soak.whoImportsPrecision, JSON.stringify(summary)).toBeGreaterThanOrEqual(
      L12_IMPORT_PRECISION_GATE
    )
    expect(soak.neighborhoodPrecision, JSON.stringify(summary)).toBeGreaterThanOrEqual(
      L12_IMPORT_PRECISION_GATE
    )
    expect(soak.meetsGate, JSON.stringify(summary)).toBe(true)
  }, 120_000)
})

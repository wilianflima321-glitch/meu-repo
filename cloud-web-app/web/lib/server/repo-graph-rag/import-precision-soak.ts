import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
import type { RepositoryCartographyManifest, RepositorySurface } from '@/lib/production/repository-cartography-contracts'
import { buildRepositoryImportGraph, type RepoGraph } from './repo-graph-builder'
import { extractNeighborhoodSlice } from './neighborhood-slicer'

export const L12_IMPORT_PRECISION_GATE = 0.9

export interface ImportPrecisionSoakResult {
  files: number
  edgeTruePositives: number
  edgeFalsePositives: number
  edgeFalseNegatives: number
  /** Predicted import edges that are true / all predicted edges */
  edgePrecision: number
  edgeRecall: number
  whoImportsTruePositives: number
  whoImportsFalsePositives: number
  whoImportsFalseNegatives: number
  /** Reverse-dependent predictions vs oracle (L-ACC-05) */
  whoImportsPrecision: number
  whoImportsRecall: number
  neighborhoodTruePositives: number
  neighborhoodFalsePositives: number
  neighborhoodPrecision: number
  meetsGate: boolean
  sampleFalsePositives: string[]
  sampleFalseNegatives: string[]
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

async function walkSourceFiles(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
      await walkSourceFiles(abs, out)
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue
    if (entry.name.endsWith('.d.ts')) continue
    out.push(abs)
  }
  return out
}

function resolveOracleTarget(
  specifier: string,
  fromAbs: string,
  rootPath: string,
  valid: Set<string>
): string | null {
  const tryBase = (base: string): string | null => {
    const normalized = toPosix(base)
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '']) {
      const candidate = ext ? `${normalized}${ext}` : normalized
      if (valid.has(candidate)) return candidate
    }
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']) {
      const idx = `${normalized}/index${ext}`
      if (valid.has(idx)) return idx
    }
    return null
  }

  if (specifier.startsWith('.')) {
    return tryBase(path.resolve(path.dirname(fromAbs), specifier))
  }
  if (specifier.startsWith('@/') || specifier.startsWith('~/')) {
    return tryBase(path.resolve(rootPath, specifier.slice(2)))
  }
  return null
}

/** Strict AST oracle: relative + `@/` / `~/` only — never package fuzzy matches. */
export async function buildOracleImportEdges(
  rootPath: string,
  absoluteFiles: string[]
): Promise<Set<string>> {
  const root = toPosix(path.resolve(rootPath))
  const valid = new Set(absoluteFiles.map((f) => toPosix(path.resolve(f))))
  const edges = new Set<string>()

  for (const abs of absoluteFiles) {
    const absN = toPosix(path.resolve(abs))
    const content = await fs.readFile(abs, 'utf8').catch(() => '')
    if (!content) continue
    const sf = ts.createSourceFile(abs, content, ts.ScriptTarget.Latest, true)
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const resolved = resolveOracleTarget(node.moduleSpecifier.text, absN, root, valid)
        if (resolved && resolved !== absN) edges.add(`${absN}->${resolved}`)
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const resolved = resolveOracleTarget(node.moduleSpecifier.text, absN, root, valid)
        if (resolved && resolved !== absN) edges.add(`${absN}->${resolved}`)
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const resolved = resolveOracleTarget(node.arguments[0].text, absN, root, valid)
        if (resolved && resolved !== absN) edges.add(`${absN}->${resolved}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  return edges
}

export function manifestFromAbsoluteFiles(
  rootPath: string,
  absoluteFiles: string[]
): RepositoryCartographyManifest {
  const root = toPosix(path.resolve(rootPath))
  const surfaces: RepositorySurface[] = absoluteFiles.map((abs, i) => {
    const rel = toPosix(path.relative(root, abs))
    const ext = path.extname(rel).slice(1) || 'ts'
    return {
      id: `l12-${i}`,
      path: rel,
      basename: path.basename(rel),
      extension: ext,
      sizeBytes: 1,
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
    }
  })

  return {
    version: 1,
    id: 'l12-import-precision-soak',
    generatedAt: new Date().toISOString(),
    projectId: 'l12-soak',
    sourceKinds: ['local-workspace'],
    totals: {
      totalFiles: surfaces.length,
      totalBytes: surfaces.length,
      domainCounts: { 'app-code': surfaces.length } as RepositoryCartographyManifest['totals']['domainCounts'],
      strategyCounts: { 'direct-read': surfaces.length } as RepositoryCartographyManifest['totals']['strategyCounts'],
      largestSurfaces: [],
    },
    surfaces,
    duplicateGroups: [],
    criticalGaps: [],
    contextPlan: { mustReadFirst: [], doNotInvent: [], indexingPolicy: [] },
    contextBudget: {
      version: 1,
      directReadBytes: 0,
      summarizeFirstBytes: 0,
      indexOnlyBytes: 0,
      externalMirrorBytes: 0,
      manualReviewBytes: 0,
      estimatedChunkCount: 0,
      retrievalBatches: [],
      largestContextRisks: [],
      guardrails: [],
    },
    agentHandoffs: [],
  }
}

function predictedEdges(graph: RepoGraph): Set<string> {
  const edges = new Set<string>()
  for (const [abs, node] of graph.nodes) {
    for (const imp of node.imports) {
      edges.add(`${abs}->${imp.resolvedPath}`)
    }
  }
  return edges
}

function whoImportsSets(edges: Set<string>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const edge of edges) {
    const [importer, target] = edge.split('->')
    if (!map.has(target)) map.set(target, new Set())
    map.get(target)!.add(importer)
  }
  return map
}

function relSample(root: string, edge: string): string {
  const [a, b] = edge.split('->')
  return `${toPosix(path.relative(root, a))} -> ${toPosix(path.relative(root, b))}`
}

/**
 * L-ACC-05 soak: measure RepoGraphRAG import / who-imports / neighborhood precision
 * against a strict AST oracle on a monorepo slice (or fixture root).
 */
export async function measureImportPrecisionSoak(params: {
  rootPath: string
  /** Absolute dirs to walk; defaults to rootPath itself */
  sliceDirs?: string[]
  maxDegrees?: number
  maxFiles?: number
}): Promise<ImportPrecisionSoakResult> {
  const root = toPosix(path.resolve(params.rootPath))
  const dirs = (params.sliceDirs ?? [root]).map((d) =>
    path.isAbsolute(d) ? d : path.resolve(root, d)
  )

  const files: string[] = []
  for (const dir of dirs) {
    await walkSourceFiles(dir, files)
  }
  const absoluteFiles = [...new Set(files.map((f) => toPosix(path.resolve(f))))]

  const oracle = await buildOracleImportEdges(root, absoluteFiles)
  const manifest = manifestFromAbsoluteFiles(root, absoluteFiles)
  const graph = await buildRepositoryImportGraph(manifest, root)
  const predicted = predictedEdges(graph)

  let edgeTp = 0
  let edgeFp = 0
  let edgeFn = 0
  const sampleFp: string[] = []
  const sampleFn: string[] = []

  for (const edge of predicted) {
    if (oracle.has(edge)) edgeTp++
    else {
      edgeFp++
      if (sampleFp.length < 24) sampleFp.push(relSample(root, edge))
    }
  }
  for (const edge of oracle) {
    if (!predicted.has(edge)) {
      edgeFn++
      if (sampleFn.length < 24) sampleFn.push(relSample(root, edge))
    }
  }

  const oracleWho = whoImportsSets(oracle)
  const predWho = whoImportsSets(predicted)
  let whoTp = 0
  let whoFp = 0
  let whoFn = 0

  const allTargets = new Set([...oracleWho.keys(), ...predWho.keys()])
  for (const target of allTargets) {
    const truth = oracleWho.get(target) ?? new Set()
    const pred = predWho.get(target) ?? new Set()
    for (const importer of pred) {
      if (truth.has(importer)) whoTp++
      else whoFp++
    }
    for (const importer of truth) {
      if (!pred.has(importer)) whoFn++
    }
  }

  let neighTp = 0
  let neighFp = 0
  const maxDegrees = params.maxDegrees ?? 1
  const maxFiles = params.maxFiles ?? 40

  for (const target of absoluteFiles) {
    const trueNeighbors = new Set<string>([target])
    for (const edge of oracle) {
      const [a, b] = edge.split('->')
      if (a === target) trueNeighbors.add(b)
      if (b === target) trueNeighbors.add(a)
    }
    if (trueNeighbors.size <= 1) continue

    const slice = extractNeighborhoodSlice(graph, target, maxDegrees, maxFiles)
    const sliceFiles = new Set(slice.surfaces.map((s) => s.filePath))
    for (const file of sliceFiles) {
      if (trueNeighbors.has(file)) neighTp++
      else neighFp++
    }
  }

  const edgePrecision = edgeTp + edgeFp === 0 ? 1 : edgeTp / (edgeTp + edgeFp)
  const edgeRecall = edgeTp + edgeFn === 0 ? 1 : edgeTp / (edgeTp + edgeFn)
  const whoImportsPrecision = whoTp + whoFp === 0 ? 1 : whoTp / (whoTp + whoFp)
  const whoImportsRecall = whoTp + whoFn === 0 ? 1 : whoTp / (whoTp + whoFn)
  const neighborhoodPrecision = neighTp + neighFp === 0 ? 1 : neighTp / (neighTp + neighFp)

  // Gate uses who-imports precision (L-ACC-05) with neighborhood as supporting signal
  const meetsGate =
    whoImportsPrecision >= L12_IMPORT_PRECISION_GATE &&
    neighborhoodPrecision >= L12_IMPORT_PRECISION_GATE

  return {
    files: absoluteFiles.length,
    edgeTruePositives: edgeTp,
    edgeFalsePositives: edgeFp,
    edgeFalseNegatives: edgeFn,
    edgePrecision,
    edgeRecall,
    whoImportsTruePositives: whoTp,
    whoImportsFalsePositives: whoFp,
    whoImportsFalseNegatives: whoFn,
    whoImportsPrecision,
    whoImportsRecall,
    neighborhoodTruePositives: neighTp,
    neighborhoodFalsePositives: neighFp,
    neighborhoodPrecision,
    meetsGate,
    sampleFalsePositives: sampleFp,
    sampleFalseNegatives: sampleFn,
  }
}

/** Convenience: resolve who-imports-X from a built graph (normalized absolute paths). */
export function resolveWhoImports(graph: RepoGraph, targetPath: string): string[] {
  const key = toPosix(targetPath)
  return [...(graph.dependents.get(key) ?? [])]
}

import fs from 'node:fs/promises'
import path from 'node:path'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']
const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage'])
const GRAPH_CACHE_TTL_MS = 60_000
const MAX_SCANNED_FILES = 5000
const MAX_DEPENDENTS = 300

type DependencyGraph = {
  importsByFile: Map<string, Set<string>>
  dependentsByFile: Map<string, Set<string>>
  scannedFiles: number
}

type CachedDependencyGraph = {
  expiresAt: number
  graph: DependencyGraph
}

export type DependencyImpactAnalysis = {
  targetPath: string
  scannedFiles: number
  directImports: string[]
  reverseDependents: string[]
  impactedTests: string[]
  impactedEndpoints: string[]
  depth: number
  truncated: boolean
  risk: 'low' | 'medium' | 'high'
}

const graphCache = new Map<string, CachedDependencyGraph>()

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

function isSourceFile(filePath: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => filePath.endsWith(ext))
}

async function walkSourceFiles(root: string, out: string[]): Promise<void> {
  if (out.length >= MAX_SCANNED_FILES) return
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    if (out.length >= MAX_SCANNED_FILES) return
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue
    const absolute = path.join(root, entry.name)
    if (entry.isDirectory()) {
      await walkSourceFiles(absolute, out)
      continue
    }
    if (!entry.isFile()) continue
    if (!isSourceFile(absolute)) continue
    out.push(absolute)
  }
}

function parseImportSpecifiers(source: string): string[] {
  const specs = new Set<string>()
  const importRegex = /\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  const exportRegex = /\bexport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g
  const dynamicImportRegex = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g
  const requireRegex = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g

  for (const regex of [importRegex, exportRegex, dynamicImportRegex, requireRegex]) {
    let match: RegExpExecArray | null
    while ((match = regex.exec(source)) !== null) {
      const spec = String(match[1] || '').trim()
      if (!spec) continue
      specs.add(spec)
    }
  }

  return [...specs]
}

function buildResolutionCandidates(baseAbsolutePath: string): string[] {
  return [
    baseAbsolutePath,
    ...SOURCE_EXTENSIONS.map((ext) => `${baseAbsolutePath}${ext}`),
    ...SOURCE_EXTENSIONS.map((ext) => path.join(baseAbsolutePath, `index${ext}`)),
  ]
}

async function resolveLocalImport(params: {
  specifier: string
  importerAbsolutePath: string
  workspaceRoot: string
}): Promise<string | null> {
  const { specifier, importerAbsolutePath, workspaceRoot } = params
  const isRelative = specifier.startsWith('.')
  const isAlias = specifier.startsWith('@/') || specifier.startsWith('@\\')
  if (!isRelative && !isAlias) return null

  const candidateBases: string[] = []
  if (isRelative) {
    candidateBases.push(path.resolve(path.dirname(importerAbsolutePath), specifier))
  }
  if (isAlias) {
    candidateBases.push(path.resolve(workspaceRoot, specifier.slice(2)))
  }

  for (const base of candidateBases) {
    for (const candidate of buildResolutionCandidates(base)) {
      const stat = await fs.stat(candidate).catch(() => null)
      if (!stat?.isFile()) continue
      if (!candidate.startsWith(workspaceRoot)) continue
      return toPosix(path.relative(workspaceRoot, candidate))
    }
  }

  return null
}

async function buildDependencyGraph(workspaceRoot: string): Promise<DependencyGraph> {
  const files: string[] = []
  await walkSourceFiles(workspaceRoot, files)

  const importsByFile = new Map<string, Set<string>>()
  const dependentsByFile = new Map<string, Set<string>>()

  for (const absoluteFile of files) {
    const relativeFile = toPosix(path.relative(workspaceRoot, absoluteFile))
    importsByFile.set(relativeFile, new Set())
    dependentsByFile.set(relativeFile, new Set())
  }

  for (const absoluteFile of files) {
    const relativeFile = toPosix(path.relative(workspaceRoot, absoluteFile))
    const source = await fs.readFile(absoluteFile, 'utf8').catch(() => '')
    if (!source) continue

    const importSpecifiers = parseImportSpecifiers(source)
    for (const specifier of importSpecifiers) {
      const resolved = await resolveLocalImport({
        specifier,
        importerAbsolutePath: absoluteFile,
        workspaceRoot,
      })
      if (!resolved) continue
      importsByFile.get(relativeFile)?.add(resolved)
      if (!dependentsByFile.has(resolved)) {
        dependentsByFile.set(resolved, new Set())
      }
      dependentsByFile.get(resolved)?.add(relativeFile)
    }
  }

  return {
    importsByFile,
    dependentsByFile,
    scannedFiles: files.length,
  }
}

async function getDependencyGraph(workspaceRoot: string): Promise<DependencyGraph> {
  const now = Date.now()
  const cached = graphCache.get(workspaceRoot)
  if (cached && cached.expiresAt > now) {
    return cached.graph
  }

  const graph = await buildDependencyGraph(workspaceRoot)
  graphCache.set(workspaceRoot, {
    graph,
    expiresAt: now + GRAPH_CACHE_TTL_MS,
  })
  return graph
}

function toEndpointPath(relativeFile: string): string | null {
  const normalized = `/${relativeFile}`
  const marker = '/app/api/'
  const idx = normalized.indexOf(marker)
  if (idx < 0) return null
  if (!/\/route\.[tj]sx?$/.test(normalized)) return null
  const routeSuffix = normalized
    .slice(idx + '/app'.length)
    .replace(/\/route\.[tj]sx?$/, '')
  return routeSuffix || null
}

function computeRisk(params: {
  targetPath: string
  endpointPaths: string[]
  dependentCount: number
}): 'low' | 'medium' | 'high' {
  const target = params.targetPath.toLowerCase()
  const highPath =
    target.includes('/app/api/auth/') ||
    target.includes('/app/api/billing/') ||
    target.includes('/app/admin/')
  const highEndpoint = params.endpointPaths.some(
    (endpoint) => endpoint.startsWith('/api/auth') || endpoint.startsWith('/api/billing')
  )
  if (highPath || highEndpoint) return 'high'
  if (params.dependentCount >= 80) return 'high'
  if (params.dependentCount >= 30) return 'medium'
  return 'low'
}

export async function analyzeDependencyImpact(params: {
  workspaceRoot: string
  absolutePath: string
}): Promise<DependencyImpactAnalysis> {
  const workspaceRoot = path.resolve(params.workspaceRoot)
  const absolutePath = path.resolve(params.absolutePath)
  const targetPath = toPosix(path.relative(workspaceRoot, absolutePath))
  const graph = await getDependencyGraph(workspaceRoot)

  const directImports = [...(graph.importsByFile.get(targetPath) ?? new Set())].sort()

  const visited = new Set<string>()
  const queue: Array<{ file: string; depth: number }> = []
  for (const dependent of graph.dependentsByFile.get(targetPath) ?? []) {
    queue.push({ file: dependent, depth: 1 })
  }

  let maxDepth = 0
  let truncated = false
  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) continue
    if (visited.has(next.file)) continue
    visited.add(next.file)
    maxDepth = Math.max(maxDepth, next.depth)

    if (visited.size >= MAX_DEPENDENTS) {
      truncated = true
      break
    }

    for (const parent of graph.dependentsByFile.get(next.file) ?? []) {
      if (!visited.has(parent)) {
        queue.push({ file: parent, depth: next.depth + 1 })
      }
    }
  }

  const reverseDependents = [...visited].sort()
  const impactedTests = reverseDependents
    .filter((entry) => /\.test\.[tj]sx?$|\.spec\.[tj]sx?$/i.test(entry))
    .sort()

  const endpointSet = new Set<string>()
  const endpointTarget = toEndpointPath(targetPath)
  if (endpointTarget) endpointSet.add(endpointTarget)
  for (const dependent of reverseDependents) {
    const endpoint = toEndpointPath(dependent)
    if (endpoint) endpointSet.add(endpoint)
  }
  const impactedEndpoints = [...endpointSet].sort()

  return {
    targetPath,
    scannedFiles: graph.scannedFiles,
    directImports,
    reverseDependents,
    impactedTests,
    impactedEndpoints,
    depth: maxDepth,
    truncated,
    risk: computeRisk({
      targetPath,
      endpointPaths: impactedEndpoints,
      dependentCount: reverseDependents.length,
    }),
  }
}

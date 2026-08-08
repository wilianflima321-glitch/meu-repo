import { RepoGraph } from './repo-graph-builder'

export interface SymbolSlice {
  filePath: string
  /** If undefined, the whole file should be included (e.g. the target file itself) */
  startLine?: number
  endLine?: number
}

export interface NeighborhoodSlice {
  targetPath: string
  surfaces: SymbolSlice[]
  truncated: boolean
}

type QueueItem = {
  path: string
  degree: number
  requiredSymbols?: string[]
  /** Reverse edge (who-imports) — do not fan out further; keeps neighborhood precise */
  reverseEdge?: boolean
}

/**
 * Extracts a neighborhood slice around a target file using the AST-powered import/call graph.
 * Traverses up to `maxDegrees`. For dependencies, extracts *only* the specific symbols imported,
 * rather than the full file, dramatically reducing token context noise.
 */
export function extractNeighborhoodSlice(
  graph: RepoGraph,
  targetPath: string,
  maxDegrees: number = 2,
  maxFiles: number = 20
): NeighborhoodSlice {
  const visited = new Set<string>()
  const queue: QueueItem[] = [{ path: targetPath, degree: 0 }]
  const result: SymbolSlice[] = []
  let truncated = false

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    const visitKey = current.requiredSymbols
      ? `${current.path}:${[...current.requiredSymbols].sort().join(',')}:${current.reverseEdge ? 'r' : 'f'}`
      : `${current.path}:${current.reverseEdge ? 'r' : 'f'}`
    if (visited.has(visitKey)) continue
    visited.add(visitKey)

    const node = graph.nodes.get(current.path)
    if (!node) continue

    if (!current.requiredSymbols || current.requiredSymbols.includes('*')) {
      result.push({ filePath: current.path })
    } else {
      let matchedAny = false
      for (const reqSym of current.requiredSymbols) {
        const exported = node.exports.find(
          (e) => e.name === reqSym || (reqSym === 'default' && e.name === 'default')
        )
        if (exported) {
          matchedAny = true
          result.push({
            filePath: current.path,
            startLine: exported.startLine,
            endLine: exported.endLine,
          })
        }
      }
      // Fail closed to full file when symbol bounds missing (still a true neighbor)
      if (!matchedAny) {
        result.push({ filePath: current.path })
      }
    }

    if (result.length >= maxFiles) {
      truncated = true
      break
    }

    if (current.degree >= maxDegrees) continue
    // Reverse dependents are leaves — including them answers "who imports X" without graph explosion
    if (current.reverseEdge) continue

    for (const imp of node.imports) {
      queue.push({
        path: imp.resolvedPath,
        degree: current.degree + 1,
        requiredSymbols: imp.importedNames,
      })
    }

    const dependents = graph.dependents.get(current.path) || []
    for (const dep of dependents) {
      // Prefer symbol-aware slice when the dependent named what it imported from us
      const depNode = graph.nodes.get(dep)
      const edge = depNode?.imports.find((i) => i.resolvedPath === current.path)
      queue.push({
        path: dep,
        degree: current.degree + 1,
        // Dependent file itself (not its other deps) — full file for call-site context
        requiredSymbols: edge?.importedNames?.includes('*') ? ['*'] : undefined,
        reverseEdge: true,
      })
    }
  }

  // Prefer whole-file slices over symbol slices for the same path (whole file supersedes)
  const byFile = new Map<string, SymbolSlice[]>()
  for (const s of result) {
    const list = byFile.get(s.filePath) ?? []
    list.push(s)
    byFile.set(s.filePath, list)
  }

  const uniqueSurfaces: SymbolSlice[] = []
  for (const [, slices] of byFile) {
    const whole = slices.find((s) => s.startLine === undefined)
    if (whole) {
      uniqueSurfaces.push(whole)
      continue
    }
    const seen = new Set<string>()
    for (const s of slices) {
      const key = `${s.startLine || 0}:${s.endLine || 0}`
      if (seen.has(key)) continue
      seen.add(key)
      uniqueSurfaces.push(s)
    }
  }

  return {
    targetPath,
    surfaces: uniqueSurfaces.slice(0, maxFiles),
    truncated: truncated || uniqueSurfaces.length > maxFiles,
  }
}

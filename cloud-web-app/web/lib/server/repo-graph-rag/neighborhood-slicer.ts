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
  const queue: Array<{ path: string; degree: number; requiredSymbols?: string[] }> = [
    { path: targetPath, degree: 0 }
  ]
  const result: SymbolSlice[] = []
  let truncated = false

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    
    // We allow visiting a file multiple times if different symbols are requested,
    // but to avoid infinite loops, we track `visited:path:symbols` roughly.
    const visitKey = current.requiredSymbols ? `${current.path}:${current.requiredSymbols.sort().join(',')}` : current.path
    if (visited.has(visitKey)) continue
    
    visited.add(visitKey)
    
    const node = graph.nodes.get(current.path)
    if (!node) continue

    // If it's the root target or we need the whole file
    if (!current.requiredSymbols || current.requiredSymbols.includes('*')) {
      result.push({ filePath: current.path })
    } else {
      // Find the specific symbol bounds in the exports
      for (const reqSym of current.requiredSymbols) {
        const exported = node.exports.find(e => e.name === reqSym || reqSym === 'default')
        if (exported) {
          result.push({
            filePath: current.path,
            startLine: exported.startLine,
            endLine: exported.endLine
          })
        }
      }
    }
    
    if (result.length >= maxFiles) {
      truncated = true
      break
    }
    
    if (current.degree < maxDegrees) {
      // Traverse dependencies
      for (const imp of node.imports) {
        queue.push({
          path: imp.resolvedPath,
          degree: current.degree + 1,
          requiredSymbols: imp.importedNames
        })
      }
      
      // Traverse dependents
      const dependents = graph.dependents.get(current.path) || []
      for (const dep of dependents) {
        // Dependents are pulling us in, we don't know exactly what they used, so we just
        // include them entirely or maybe limit to degree 1. For simplicity, include full file.
        queue.push({
          path: dep,
          degree: current.degree + 1
        })
      }
    }
  }

  // Deduplicate slices
  const uniqueSurfaces: SymbolSlice[] = []
  const seenSlices = new Set<string>()
  for (const s of result) {
    const key = `${s.filePath}:${s.startLine || 0}:${s.endLine || 0}`
    if (!seenSlices.has(key)) {
      seenSlices.add(key)
      uniqueSurfaces.push(s)
    }
  }

  return {
    targetPath,
    surfaces: uniqueSurfaces,
    truncated
  }
}


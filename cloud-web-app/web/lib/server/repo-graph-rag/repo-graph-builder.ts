import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import type { RepositoryCartographyManifest } from '@/lib/production/repository-cartography-contracts'
import { extractAstSymbols, SymbolBounds } from './ast-symbol-extractor'

const log = createComponentLogger('repo-graph-builder')

export interface GraphNode {
  absolutePath: string
  /** The files and specific symbols this file imports */
  imports: Array<{
    resolvedPath: string
    importedNames: string[]
  }>
  /** The symbols exported by this file, with line bounds */
  exports: SymbolBounds[]
}

export interface RepoGraph {
  /** Maps an absolute normalized file path to its Node (which contains imports and exports) */
  nodes: Map<string, GraphNode>
  /** Maps an absolute normalized file path to a list of absolute paths that import it */
  dependents: Map<string, string[]>
}

// Fallback for Rust regex since we don't have a Rust AST parser in node
const RUST_USE_REGEX = /use\s+([^;]+);/g
const RUST_MOD_REGEX = /mod\s+([^;]+);/g

export async function buildRepositoryImportGraph(
  manifest: RepositoryCartographyManifest,
  rootPath: string
): Promise<RepoGraph> {
  const nodes = new Map<string, GraphNode>()
  const dependents = new Map<string, string[]>()

  const surfaceAbsolutePaths = new Set<string>()
  const surfaceBySuffix = new Map<string, string>()

  for (const surface of manifest.surfaces) {
    if (surface.sourceKind !== 'local-workspace') continue
    const absolutePath = path.resolve(rootPath, surface.path).replace(/\\/g, '/')
    surfaceAbsolutePaths.add(absolutePath)
    
    const withoutExt = absolutePath.replace(/\.[^/.]+$/, '')
    const segments = withoutExt.split('/')
    
    for (let i = 1; i <= Math.min(segments.length, 5); i++) {
      const suffix = segments.slice(-i).join('/')
      if (!surfaceBySuffix.has(suffix)) {
        surfaceBySuffix.set(suffix, absolutePath)
      }
    }
    if (segments[segments.length - 1] === 'index') {
      const dirSuffix = segments.slice(-2, -1).join('/')
      if (!surfaceBySuffix.has(dirSuffix)) {
        surfaceBySuffix.set(dirSuffix, absolutePath)
      }
    }
  }

  for (const absPath of surfaceAbsolutePaths) {
    nodes.set(absPath, { absolutePath: absPath, imports: [], exports: [] })
    dependents.set(absPath, [])
  }

  for (const surface of manifest.surfaces) {
    if (surface.sourceKind !== 'local-workspace') continue
    const absolutePath = path.resolve(rootPath, surface.path).replace(/\\/g, '/')
    
    try {
      const content = await fs.readFile(absolutePath, 'utf8')
      const nodeImports: GraphNode['imports'] = []
      let nodeExports: SymbolBounds[] = []

      if (surface.extension.startsWith('ts') || surface.extension.startsWith('js')) {
        const astResult = extractAstSymbols(content, absolutePath)
        nodeExports = astResult.exportedSymbols
        
        for (const imp of astResult.imports) {
          const resolved = resolveImportTarget(imp.moduleSpecifier, absolutePath, surfaceAbsolutePaths, surfaceBySuffix)
          if (resolved && resolved !== absolutePath) {
            nodeImports.push({ resolvedPath: resolved, importedNames: imp.importedNames })
          }
        }
      } else if (surface.extension === 'rs') {
        const rawImports = new Set<string>()
        let match
        while ((match = RUST_USE_REGEX.exec(content)) !== null) {
          const uses = match[1].split('{')
          if (uses.length > 0) rawImports.add(uses[0].replace(/::$/, '').trim())
        }
        while ((match = RUST_MOD_REGEX.exec(content)) !== null) rawImports.add(match[1].trim())
        
        for (const raw of Array.from(rawImports)) {
          const resolved = resolveImportTarget(raw, absolutePath, surfaceAbsolutePaths, surfaceBySuffix)
          if (resolved && resolved !== absolutePath) {
            nodeImports.push({ resolvedPath: resolved, importedNames: ['*'] })
          }
        }
      }

      nodes.set(absolutePath, { absolutePath, imports: nodeImports, exports: nodeExports })
      
      for (const imp of nodeImports) {
        const existingDependents = dependents.get(imp.resolvedPath) || []
        existingDependents.push(absolutePath)
        dependents.set(imp.resolvedPath, existingDependents)
      }
      
    } catch (err) {
      log.warn('repo_graph_read_failed', { path: surface.path, error: String(err) })
    }
  }

  return { nodes, dependents }
}

function resolveImportTarget(
  rawImport: string,
  sourcePath: string,
  validAbsolutePaths: Set<string>,
  surfaceBySuffix: Map<string, string>
): string | null {
  if (rawImport.startsWith('.')) {
    const dir = path.dirname(sourcePath)
    const resolvedBase = path.resolve(dir, rawImport).replace(/\\/g, '/')
    
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.rs']) {
      if (validAbsolutePaths.has(`${resolvedBase}${ext}`)) return `${resolvedBase}${ext}`
    }
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      if (validAbsolutePaths.has(`${resolvedBase}/index${ext}`)) return `${resolvedBase}/index${ext}`
    }
    if (validAbsolutePaths.has(resolvedBase)) return resolvedBase
  }
  
  const cleanRaw = rawImport.replace(/^@\//, '').replace(/^~\//, '').replace(/^crate::/, '').replace(/^super::/, '')
  const match = surfaceBySuffix.get(cleanRaw)
  if (match) return match
  
  const segments = cleanRaw.split(/[/\\]/)
  const lastSegment = segments[segments.length - 1]
  const fuzzyMatch = surfaceBySuffix.get(lastSegment)
  if (fuzzyMatch) return fuzzyMatch
  
  return null
}

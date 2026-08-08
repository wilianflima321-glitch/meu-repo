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

const RUST_USE_REGEX = /use\s+([^;]+);/g
const RUST_MOD_REGEX = /mod\s+([^;]+);/g

function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

function tryResolveFilesystemBase(
  resolvedBase: string,
  validAbsolutePaths: Set<string>
): string | null {
  const base = toPosix(resolvedBase)
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.rs']) {
    const withExt = `${base}${ext}`
    if (validAbsolutePaths.has(withExt)) return withExt
  }
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']) {
    const indexPath = `${base}/index${ext}`
    if (validAbsolutePaths.has(indexPath)) return indexPath
  }
  if (validAbsolutePaths.has(base)) return base
  return null
}

/**
 * Resolve a local import to a workspace file.
 * Relative + `@/` + `~/` only for TS/JS. Bare npm/node package names are never
 * fuzzy-matched onto local basenames (that was the L.12 precision FP source).
 */
export function resolveImportTarget(
  rawImport: string,
  sourcePath: string,
  rootPath: string,
  validAbsolutePaths: Set<string>,
  surfaceBySuffix: Map<string, string>
): string | null {
  const source = toPosix(sourcePath)
  const root = toPosix(rootPath)

  if (rawImport.startsWith('.')) {
    const resolvedBase = path.resolve(path.dirname(source), rawImport)
    return tryResolveFilesystemBase(resolvedBase, validAbsolutePaths)
  }

  if (rawImport.startsWith('@/') || rawImport.startsWith('~/')) {
    const rel = rawImport.slice(2)
    const resolvedBase = path.resolve(root, rel)
    return tryResolveFilesystemBase(resolvedBase, validAbsolutePaths)
  }

  // Rust `use crate::foo::bar` — require `::` so bare npm names never fuzzy-match.
  if (rawImport.includes('::')) {
    const cleanRaw = rawImport
      .replace(/^crate::/, '')
      .replace(/^super::/, '')
      .replace(/::/g, '/')
      .trim()
    if (!cleanRaw) return null

    const exact = surfaceBySuffix.get(cleanRaw)
    if (exact) return exact

    if (cleanRaw.includes('/')) {
      const segments = cleanRaw.split('/')
      for (let n = segments.length; n >= 2; n--) {
        const suffix = segments.slice(-n).join('/')
        const hit = surfaceBySuffix.get(suffix)
        if (hit) return hit
      }
    }
  }

  // Rust `mod foo` — sibling `foo.rs` / `foo/mod.rs` only (never basename map).
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawImport) && source.endsWith('.rs')) {
    const sibling = tryResolveFilesystemBase(
      path.resolve(path.dirname(source), rawImport),
      validAbsolutePaths
    )
    if (sibling) return sibling
    const modRs = tryResolveFilesystemBase(
      path.resolve(path.dirname(source), rawImport, 'mod'),
      validAbsolutePaths
    )
    if (modRs) return modRs
  }

  return null
}

export async function buildRepositoryImportGraph(
  manifest: RepositoryCartographyManifest,
  rootPath: string
): Promise<RepoGraph> {
  const nodes = new Map<string, GraphNode>()
  const dependents = new Map<string, string[]>()
  const root = toPosix(path.resolve(rootPath))

  const surfaceAbsolutePaths = new Set<string>()
  const surfaceBySuffix = new Map<string, string>()

  for (const surface of manifest.surfaces) {
    if (surface.sourceKind !== 'local-workspace') continue
    const absolutePath = toPosix(path.resolve(root, surface.path))
    surfaceAbsolutePaths.add(absolutePath)

    const withoutExt = absolutePath.replace(/\.[^/.]+$/, '')
    const segments = withoutExt.split('/')

    for (let i = 1; i <= Math.min(segments.length, 6); i++) {
      const suffix = segments.slice(-i).join('/')
      // Prefer first registration; multi-segment keys are unique enough for rust paths
      if (!surfaceBySuffix.has(suffix)) {
        surfaceBySuffix.set(suffix, absolutePath)
      }
    }
    if (segments[segments.length - 1] === 'index') {
      const dirSuffix = segments.slice(-2, -1).join('/')
      if (dirSuffix && !surfaceBySuffix.has(dirSuffix)) {
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
    const absolutePath = toPosix(path.resolve(root, surface.path))

    try {
      const content = await fs.readFile(absolutePath, 'utf8')
      const nodeImports: GraphNode['imports'] = []
      let nodeExports: SymbolBounds[] = []

      if (surface.extension.startsWith('ts') || surface.extension.startsWith('js') || surface.extension === 'mjs' || surface.extension === 'cjs') {
        const astResult = extractAstSymbols(content, absolutePath)
        nodeExports = astResult.exportedSymbols

        for (const imp of astResult.imports) {
          const resolved = resolveImportTarget(
            imp.moduleSpecifier,
            absolutePath,
            root,
            surfaceAbsolutePaths,
            surfaceBySuffix
          )
          if (resolved && resolved !== absolutePath) {
            nodeImports.push({ resolvedPath: resolved, importedNames: imp.importedNames })
          }
        }
      } else if (surface.extension === 'rs') {
        const rawImports = new Set<string>()
        let match: RegExpExecArray | null
        RUST_USE_REGEX.lastIndex = 0
        RUST_MOD_REGEX.lastIndex = 0
        while ((match = RUST_USE_REGEX.exec(content)) !== null) {
          const uses = match[1].split('{')
          if (uses.length > 0) rawImports.add(uses[0].replace(/::$/, '').trim())
        }
        while ((match = RUST_MOD_REGEX.exec(content)) !== null) {
          rawImports.add(match[1].trim())
        }

        for (const raw of Array.from(rawImports)) {
          const resolved = resolveImportTarget(
            raw,
            absolutePath,
            root,
            surfaceAbsolutePaths,
            surfaceBySuffix
          )
          if (resolved && resolved !== absolutePath) {
            nodeImports.push({ resolvedPath: resolved, importedNames: ['*'] })
          }
        }
      }

      // Merge duplicate import edges (same resolved path, union symbols)
      const merged = new Map<string, string[]>()
      for (const imp of nodeImports) {
        const existing = merged.get(imp.resolvedPath) ?? []
        for (const name of imp.importedNames) {
          if (!existing.includes(name)) existing.push(name)
        }
        merged.set(imp.resolvedPath, existing)
      }
      const dedupedImports = [...merged.entries()].map(([resolvedPath, importedNames]) => ({
        resolvedPath,
        importedNames: importedNames.length > 0 ? importedNames : ['*'],
      }))

      nodes.set(absolutePath, {
        absolutePath,
        imports: dedupedImports,
        exports: nodeExports,
      })

      for (const imp of dedupedImports) {
        const existingDependents = dependents.get(imp.resolvedPath) || []
        if (!existingDependents.includes(absolutePath)) {
          existingDependents.push(absolutePath)
          dependents.set(imp.resolvedPath, existingDependents)
        }
      }
    } catch (err) {
      log.warn('repo_graph_read_failed', { path: surface.path, error: String(err) })
    }
  }

  return { nodes, dependents }
}

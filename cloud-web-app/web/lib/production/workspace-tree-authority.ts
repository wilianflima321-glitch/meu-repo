/**
 * Focus 1B — Workspace tree authority
 * Agent allowedPaths must resolve inside real scoped workspace — no mock trees.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'

const log = createComponentLogger('workspace-tree-authority')

export interface WorkspaceTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
  children?: WorkspaceTreeNode[]
}

export interface AllowedPathsCheck {
  ok: boolean
  missing: string[]
  outsideScope: string[]
  resolved: Array<{ virtualPath: string; absolutePath: string; exists: boolean; type?: string }>
}

const DEFAULT_IGNORE = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  'coverage',
])

/**
 * List real directory entries under scoped workspace (disk truth).
 */
export async function listRealWorkspaceChildren(input: {
  userId: string
  projectId: string
  virtualPath?: string
  includeHidden?: boolean
}): Promise<{ root: string; virtualPath: string; children: WorkspaceTreeNode[] }> {
  const { absolutePath, root } = resolveScopedWorkspacePath({
    userId: input.userId,
    projectId: input.projectId,
    requestedPath: input.virtualPath || '/',
  })

  await fs.mkdir(absolutePath, { recursive: true })
  const entries = await fs.readdir(absolutePath, { withFileTypes: true })
  const children: WorkspaceTreeNode[] = []

  for (const entry of entries) {
    if (!input.includeHidden && entry.name.startsWith('.')) continue
    if (DEFAULT_IGNORE.has(entry.name)) continue
    const abs = path.join(absolutePath, entry.name)
    const st = await fs.stat(abs).catch(() => null)
    children.push({
      name: entry.name,
      path: toVirtualWorkspacePath(abs, root),
      type: entry.isDirectory() ? 'directory' : 'file',
      size: st && entry.isFile() ? st.size : undefined,
      modified: st?.mtime.toISOString(),
    })
  }

  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return {
    root,
    virtualPath: toVirtualWorkspacePath(absolutePath, root),
    children,
  }
}

/**
 * Enforce Maestro/MoA allowedPaths against real disk under scoped root.
 * Fail-closed for agent write jobs (Focus 1B).
 */
export async function enforceAgentTargetPathsOrDeny(input: {
  userId: string
  projectId: string
  targetPaths: string[]
  requireExists?: boolean
}): Promise<
  | { ok: true; check: AllowedPathsCheck }
  | { ok: false; code: 'AGENT_PATHS_OUTSIDE_TREE' | 'AGENT_PATHS_MISSING'; check: AllowedPathsCheck }
> {
  if (!input.targetPaths.length) {
    return {
      ok: false,
      code: 'AGENT_PATHS_MISSING',
      check: { ok: false, missing: [], outsideScope: [], resolved: [] },
    }
  }
  const check = await assertAllowedPathsOnDisk({
    userId: input.userId,
    projectId: input.projectId,
    allowedPaths: input.targetPaths,
    requireExists: input.requireExists,
  })
  if (!check.ok) {
    return {
      ok: false,
      code: check.outsideScope.length > 0 ? 'AGENT_PATHS_OUTSIDE_TREE' : 'AGENT_PATHS_MISSING',
      check,
    }
  }
  return { ok: true, check }
}

/**
 * Enforce Maestro/MoA allowedPaths against real disk under scoped root.
 */
export async function assertAllowedPathsOnDisk(input: {
  userId: string
  projectId: string
  allowedPaths: string[]
  /** If true, path must already exist; if false, parent dir must exist for creates */
  requireExists?: boolean
}): Promise<AllowedPathsCheck> {
  const requireExists = input.requireExists !== false
  const missing: string[] = []
  const outsideScope: string[] = []
  const resolved: AllowedPathsCheck['resolved'] = []

  for (const raw of input.allowedPaths) {
    try {
      const { absolutePath, root } = resolveScopedWorkspacePath({
        userId: input.userId,
        projectId: input.projectId,
        requestedPath: raw,
      })
      const virtualPath = toVirtualWorkspacePath(absolutePath, root)
      let exists = false
      let type: string | undefined
      try {
        const st = await fs.stat(absolutePath)
        exists = true
        type = st.isDirectory() ? 'directory' : 'file'
      } catch {
        exists = false
        if (!requireExists) {
          const parent = path.dirname(absolutePath)
          try {
            await fs.stat(parent)
          } catch {
            missing.push(virtualPath)
          }
        } else {
          missing.push(virtualPath)
        }
      }
      resolved.push({ virtualPath, absolutePath, exists, type })
    } catch {
      outsideScope.push(raw)
    }
  }

  const ok = missing.length === 0 && outsideScope.length === 0
  if (!ok) {
    log.warn('allowed_paths_rejected', { missing, outsideScope })
  }
  return { ok, missing, outsideScope, resolved }
}

/**
 * Build a shallow real tree for agent context (not a mock list).
 */
export async function buildRealWorkspaceTree(input: {
  userId: string
  projectId: string
  maxDepth?: number
}): Promise<WorkspaceTreeNode> {
  const maxDepth = input.maxDepth ?? 3
  const { root } = resolveScopedWorkspacePath({
    userId: input.userId,
    projectId: input.projectId,
    requestedPath: '/',
  })
  await fs.mkdir(root, { recursive: true })

  async function walk(dir: string, depth: number): Promise<WorkspaceTreeNode[]> {
    if (depth >= maxDepth) return []
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const nodes: WorkspaceTreeNode[] = []
    for (const entry of entries) {
      if (entry.name.startsWith('.') || DEFAULT_IGNORE.has(entry.name)) continue
      const abs = path.join(dir, entry.name)
      const node: WorkspaceTreeNode = {
        name: entry.name,
        path: toVirtualWorkspacePath(abs, root),
        type: entry.isDirectory() ? 'directory' : 'file',
      }
      if (entry.isDirectory()) {
        node.children = await walk(abs, depth + 1)
      }
      nodes.push(node)
    }
    return nodes
  }

  return {
    name: path.basename(root) || 'workspace',
    path: '/',
    type: 'directory',
    children: await walk(root, 0),
    expanded: true,
  } as WorkspaceTreeNode & { expanded: true }
}

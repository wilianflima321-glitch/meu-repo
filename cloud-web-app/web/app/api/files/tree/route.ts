import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import {
  getScopedProjectId,
  getScopedWorkspaceRoot,
  resolveScopedWorkspacePath,
  toVirtualWorkspacePath,
} from '@/lib/server/workspace-scope'
import * as fs from 'fs/promises'
import * as path from 'path'

interface FileTreeEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  expanded?: boolean
  children?: FileTreeEntry[]
  size?: number
  modified?: string
}

const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.turbo',
  '.vercel',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'venv',
  '.venv',
  'env',
  '.env.local',
  '.DS_Store',
  'Thumbs.db',
  '*.pyc',
  '*.pyo',
  '.coverage',
  'coverage',
  '.nyc_output',
]

function isIgnored(name: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => {
    if (!pattern.includes('*')) return name === pattern
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`)
    return regex.test(name)
  })
}

async function buildTree(params: {
  dirPath: string
  scopedRoot: string
  maxDepth: number
  currentDepth: number
}): Promise<FileTreeEntry[]> {
  const { dirPath, scopedRoot, maxDepth, currentDepth } = params
  if (currentDepth >= maxDepth) return []

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

    const result: FileTreeEntry[] = []

    for (const entry of entries) {
      if (isIgnored(entry.name)) continue
      const fullPath = path.join(dirPath, entry.name)
      const isDirectory = entry.isDirectory()

      const treeEntry: FileTreeEntry = {
        name: entry.name,
        path: toVirtualWorkspacePath(fullPath, scopedRoot),
        type: isDirectory ? 'directory' : 'file',
      }

      if (isDirectory) {
        treeEntry.expanded = false
        treeEntry.children = currentDepth < 2 ? await buildTree({ dirPath: fullPath, scopedRoot, maxDepth, currentDepth: currentDepth + 1 }) : []
      } else {
        try {
          const stats = await fs.stat(fullPath)
          treeEntry.size = stats.size
          treeEntry.modified = stats.mtime.toISOString()
        } catch {
          // ignore per-file stat errors
        }
      }

      result.push(treeEntry)
    }

    return result
  } catch (error) {
    console.error('[files/tree] read error:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const body = await request.json()
    const projectId = getScopedProjectId(request, body)
    const scopedRoot = getScopedWorkspaceRoot(user.userId, projectId)
    const maxDepth = Number(body?.maxDepth || 5)

    await fs.mkdir(scopedRoot, { recursive: true })

    const { absolutePath: targetDirectory } = resolveScopedWorkspacePath({
      userId: user.userId,
      projectId,
      requestedPath: body?.path || '/',
    })

    const stats = await fs.stat(targetDirectory).catch(() => null)
    if (!stats) {
      return NextResponse.json({ error: 'Path does not exist or is not accessible' }, { status: 404 })
    }
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 })
    }

    const children = await buildTree({
      dirPath: targetDirectory,
      scopedRoot,
      maxDepth: Number.isFinite(maxDepth) ? Math.max(1, Math.min(maxDepth, 10)) : 5,
      currentDepth: 0,
    })

    return NextResponse.json({
      name: path.basename(targetDirectory) || projectId,
      path: toVirtualWorkspacePath(targetDirectory, scopedRoot),
      type: 'directory',
      expanded: true,
      children,
      projectId,
      source: 'filesystem-runtime',
      authority: 'canonical',
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json(
      {
        error: 'Failed to build file tree',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

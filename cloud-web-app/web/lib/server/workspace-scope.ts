import path from 'node:path'
import type { NextRequest } from 'next/server'

const SCOPE_ROOT_DIR = '.aethel/workspaces'

function sanitizeSegment(input: string | undefined | null, fallback: string): string {
  const value = String(input || '').trim()
  if (!value) return fallback
  const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || fallback
}

function getBaseRoot(): string {
  return process.env.AETHEL_WORKSPACE_ROOT
    ? path.resolve(process.env.AETHEL_WORKSPACE_ROOT)
    : path.resolve(process.cwd())
}

export function getScopedProjectId(request: NextRequest, body?: Record<string, unknown>): string {
  const header = request.headers.get('x-project-id')
  const query = new URL(request.url).searchParams.get('projectId')
  const raw = (body?.projectId as string | undefined) || header || query
  return sanitizeSegment(raw, 'default')
}

export function getScopedWorkspaceRoot(userId: string, projectId: string): string {
  return path.resolve(
    getBaseRoot(),
    SCOPE_ROOT_DIR,
    sanitizeSegment(userId, 'anonymous'),
    sanitizeSegment(projectId, 'default')
  )
}

function assertWithinRoot(root: string, candidate: string): void {
  const relative = path.relative(root, candidate)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw Object.assign(new Error('WORKSPACE_ROOT_OUT_OF_BOUNDS'), { code: 'WORKSPACE_ROOT_OUT_OF_BOUNDS' })
  }
}

export function resolveScopedWorkspacePath(params: {
  userId: string
  projectId: string
  requestedPath: string | undefined | null
}): { absolutePath: string; root: string } {
  const root = getScopedWorkspaceRoot(params.userId, params.projectId)
  const rawPath = String(params.requestedPath || '').trim()

  if (!rawPath || rawPath === '/' || rawPath === '/workspace') {
    return { absolutePath: root, root }
  }

  const normalizedInput = rawPath.startsWith('file://') ? rawPath.replace(/^file:\/\//, '') : rawPath

  // Compatibility: if callers pass absolute scoped path, keep it.
  if (path.isAbsolute(normalizedInput)) {
    const absolutePath = path.resolve(normalizedInput)
    assertWithinRoot(root, absolutePath)
    return { absolutePath, root }
  }

  const relativePath = normalizedInput.replace(/^[\\/]+/, '')
  const absolutePath = path.resolve(root, relativePath)
  assertWithinRoot(root, absolutePath)
  return { absolutePath, root }
}

export function toVirtualWorkspacePath(absolutePath: string, scopedRoot: string): string {
  const normalizedAbsolute = path.resolve(absolutePath)
  const normalizedRoot = path.resolve(scopedRoot)
  assertWithinRoot(normalizedRoot, normalizedAbsolute)
  const relative = path.relative(normalizedRoot, normalizedAbsolute).replace(/\\/g, '/')
  return relative ? `/${relative}` : '/'
}

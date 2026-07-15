/**
 * Block 2A.2 — Collab channel naming (Critique #9).
 * Yjs document truth is scoped by project + branch hash + surface.
 * Switching Git branch MUST NOT share the same Yjs doc (no overwrite).
 */

export type CollabSurfaceScope = 'workbench' | 'scene' | 'visual-script' | 'manifest'

export interface CollabChannelInput {
  projectId: string
  /** Git branch name or head SHA — required for isolation */
  branchId: string
  scope?: CollabSurfaceScope
  /** Optional VS graph / scene id */
  scopeId?: string
}

export interface ParsedCollabChannel {
  projectId: string
  branchId: string
  scope: CollabSurfaceScope
  scopeId?: string
  documentName: string
  persistenceName: string
}

const DEFAULT_BRANCH = 'main'
const DEFAULT_SCOPE: CollabSurfaceScope = 'workbench'

function sanitizeSegment(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/[/\\:#\s]+/g, '-').replace(/-+/g, '-')
  return trimmed.length > 0 ? trimmed.slice(0, 128) : fallback
}

/**
 * Canonical Yjs document / WS room name.
 * Shape: `{projectId}:branch:{branchId}:scope:{scope}[:{scopeId}]`
 */
export function resolveCollabDocumentName(input: CollabChannelInput): string {
  const projectId = sanitizeSegment(input.projectId, 'unknown-project')
  const branchId = sanitizeSegment(input.branchId || DEFAULT_BRANCH, DEFAULT_BRANCH)
  const scope = input.scope ?? DEFAULT_SCOPE
  const base = `${projectId}:branch:${branchId}:scope:${scope}`
  if (input.scopeId?.trim()) {
    return `${base}:${sanitizeSegment(input.scopeId, 'id')}`
  }
  return base
}

export function resolveCollabPersistenceName(input: CollabChannelInput): string {
  return `idb:${resolveCollabDocumentName(input)}`
}

/** Legacy workbench name → migrate to branch-scoped form */
export function upgradeLegacyWorkbenchDocumentName(
  legacyName: string,
  branchId: string = DEFAULT_BRANCH,
): string {
  const match = /^project:([^:]+):workbench$/.exec(legacyName.trim())
  if (!match) return legacyName
  return resolveCollabDocumentName({
    projectId: match[1],
    branchId,
    scope: 'workbench',
  })
}

export function parseCollabDocumentName(documentName: string): ParsedCollabChannel | null {
  const parts = documentName.split(':')
  // projectId:branch:branchId:scope:scope[:scopeId]
  if (parts.length < 5 || parts[1] !== 'branch' || parts[3] !== 'scope') {
    // Legacy: project:id:workbench
    const legacy = /^project:([^:]+):workbench$/.exec(documentName)
    if (legacy) {
      const projectId = legacy[1]
      const branchId = DEFAULT_BRANCH
      const scope: CollabSurfaceScope = 'workbench'
      const name = resolveCollabDocumentName({ projectId, branchId, scope })
      return {
        projectId,
        branchId,
        scope,
        documentName: name,
        persistenceName: resolveCollabPersistenceName({ projectId, branchId, scope }),
      }
    }
    return null
  }

  const projectId = parts[0]
  const branchId = parts[2]
  const scope = parts[4] as CollabSurfaceScope
  const scopeId = parts.length > 5 ? parts.slice(5).join(':') : undefined
  const name = resolveCollabDocumentName({ projectId, branchId, scope, scopeId })
  return {
    projectId,
    branchId,
    scope,
    scopeId,
    documentName: name,
    persistenceName: resolveCollabPersistenceName({ projectId, branchId, scope, scopeId }),
  }
}

/** Same project, different branches → different documents (Critique #9) */
export function collabChannelsAreIsolated(a: CollabChannelInput, b: CollabChannelInput): boolean {
  return resolveCollabDocumentName(a) !== resolveCollabDocumentName(b)
}

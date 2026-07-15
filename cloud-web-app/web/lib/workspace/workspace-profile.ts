/**
 * Block 7A.4 — Workspace profiles Code / Research / Game.
 * Code pauses the 3D frameloop (wired via isCodeWorkspaceProfileActive / forcePause).
 */

import type { ViewportFrameloopMode } from '@/lib/viewport/use-viewport-render-activity'

export const WORKSPACE_PROFILE_STORAGE_KEY = 'aethel.workspace.profile'
export const WORKSPACE_PROFILE_EVENT = 'aethel.workspace.profile.changed'

export type WorkspaceProfileId = 'code' | 'research' | 'game'

export type WorkspaceProfileDefinition = {
  id: WorkspaceProfileId
  label: string
  description: string
  /** When true, R3F frameloop must be `never` (GT730 / ENG-023). */
  pauseViewport: boolean
}

export const WORKSPACE_PROFILES: readonly WorkspaceProfileDefinition[] = [
  {
    id: 'code',
    label: 'Code',
    description: 'Editor-first. 3D viewport paused to save GPU.',
    pauseViewport: true,
  },
  {
    id: 'research',
    label: 'Research',
    description: 'Docs + agents with optional preview.',
    pauseViewport: false,
  },
  {
    id: 'game',
    label: 'Game',
    description: 'Viewport + playtest surfaces active.',
    pauseViewport: false,
  },
] as const

export function isWorkspaceProfileId(value: unknown): value is WorkspaceProfileId {
  return value === 'code' || value === 'research' || value === 'game'
}

export function normalizeWorkspaceProfile(value: unknown): WorkspaceProfileId {
  return isWorkspaceProfileId(value) ? value : 'game'
}

export function resolveWorkspaceProfileFrameloop(
  profile: WorkspaceProfileId,
): ViewportFrameloopMode {
  const def = WORKSPACE_PROFILES.find((p) => p.id === profile)
  return def?.pauseViewport ? 'never' : 'always'
}

export function readWorkspaceProfile(): WorkspaceProfileId {
  if (typeof window === 'undefined') return 'game'
  try {
    const fromAttr = window.document.documentElement.getAttribute('data-workspace-profile')
    if (isWorkspaceProfileId(fromAttr)) return fromAttr
    return normalizeWorkspaceProfile(window.localStorage.getItem(WORKSPACE_PROFILE_STORAGE_KEY))
  } catch {
    return 'game'
  }
}

export function writeWorkspaceProfile(profile: WorkspaceProfileId): void {
  if (typeof window === 'undefined') return
  const next = normalizeWorkspaceProfile(profile)
  try {
    window.localStorage.setItem(WORKSPACE_PROFILE_STORAGE_KEY, next)
    window.document.documentElement.setAttribute('data-workspace-profile', next)
    window.dispatchEvent(new CustomEvent(WORKSPACE_PROFILE_EVENT, { detail: { profile: next } }))
  } catch {
    // Persistence is optional; profile still applies for the session via attribute when possible.
  }
}

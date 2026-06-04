import type { PlayableGameGenre, PlayableGameScope, StudioMode, StudioSessionStatus } from './StudioMissionControl.types'

export const STUDIO_SESSION_STORAGE_KEY = 'aethel:last-studio-session-id'

export const MODE_OPTIONS: Array<{ value: StudioMode; label: string }> = [
  { value: 'mission', label: 'Mission' },
  { value: 'app', label: 'App' },
  { value: 'game', label: 'Game' },
  { value: 'film', label: 'Film' },
  { value: 'audio', label: 'Audio' },
  { value: 'research', label: 'Research' },
  { value: 'release', label: 'Release' },
]

export const GAME_SCOPE_OPTIONS: Array<{ value: PlayableGameScope; label: string; helper: string }> = [
  { value: 'prototype', label: 'Prototype', helper: 'Smallest playable loop.' },
  { value: 'demo', label: 'Demo', helper: 'Polished short demo.' },
  { value: 'vertical-slice', label: 'Vertical slice', helper: 'Production-quality chapter.' },
  { value: 'complete-game-plan', label: 'Full plan', helper: 'Milestones, budget, bible.' },
]

export const GAME_GENRE_OPTIONS: Array<{ value: PlayableGameGenre; label: string }> = [
  { value: 'custom', label: 'Custom' },
  { value: 'rpg', label: 'RPG' },
  { value: 'action-adventure', label: 'Action adventure' },
  { value: 'moba', label: 'MOBA' },
  { value: 'platformer', label: 'Platformer' },
  { value: 'shooter', label: 'Shooter' },
  { value: 'racing', label: 'Racing' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'visual-novel', label: 'Visual novel' },
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'strategy', label: 'Strategy' },
]

export function statusClass(status?: StudioSessionStatus): string {
  if (status === 'active') {
    return 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
  }
  if (status === 'stopped') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  }
  return 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] text-[var(--aethel-text-secondary)]'
}

export async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string }
  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed with ${response.status}`)
  }
  return payload
}

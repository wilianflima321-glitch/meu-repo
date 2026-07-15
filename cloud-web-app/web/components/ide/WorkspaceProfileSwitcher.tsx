'use client'

/**
 * Block 7A.4 — Workspace profile switcher (Code / Research / Game).
 * Code profile pauses viewport via existing frameloop bridge.
 */

import { useEffect, useState } from 'react'
import {
  WORKSPACE_PROFILE_EVENT,
  WORKSPACE_PROFILES,
  readWorkspaceProfile,
  writeWorkspaceProfile,
  type WorkspaceProfileId,
} from '@/lib/workspace/workspace-profile'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('WorkspaceProfileSwitcher')

export function WorkspaceProfileSwitcher({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<WorkspaceProfileId>('game')

  useEffect(() => {
    setProfile(readWorkspaceProfile())
    const sync = () => setProfile(readWorkspaceProfile())
    window.addEventListener('storage', sync)
    window.addEventListener(WORKSPACE_PROFILE_EVENT, sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(WORKSPACE_PROFILE_EVENT, sync as EventListener)
    }
  }, [])

  const onSelect = (next: WorkspaceProfileId) => {
    writeWorkspaceProfile(next)
    setProfile(next)
    log.info('workspace.profile.set', { profile: next })
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-1 ${
        compact ? '' : 'shadow-[var(--aethel-shadow-sm)]'
      }`}
      role="radiogroup"
      aria-label="Workspace profile"
    >
      {WORKSPACE_PROFILES.map((item) => {
        const active = profile === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={item.description}
            onClick={() => onSelect(item.id)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
              active
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export default WorkspaceProfileSwitcher

'use client'

import type { StudioSession } from './studio-home.types'

type StudioHomeHeaderProps = {
  busy: boolean
  session: StudioSession | null
  projectId: string
  legacyDashboardEnabled: boolean
  onOpenIde: () => void
  onCopySessionLink: () => void
  onOpenSettings: () => void
  onOpenProjectSettings: () => void
  onOpenLegacyDashboard: () => void
}

export function StudioHomeHeader({
  busy,
  session,
  projectId,
  legacyDashboardEnabled,
  onOpenIde,
  onCopySessionLink,
  onOpenSettings,
  onOpenProjectSettings,
  onOpenLegacyDashboard,
}: StudioHomeHeaderProps) {
  return (
    <div className="studio-panel mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Studio Home</h1>
        <p className="text-xs text-slate-400">
          Chat/preview-first mission control with deterministic apply/rollback and full handoff to IDE.
        </p>
        {session && (
          <div className="mt-2 inline-flex items-center rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300">
            Session {session.status.toUpperCase()} - {session.id.slice(0, 8)}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {busy && (
          <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200">
            Running...
          </span>
        )}
        <button
          onClick={onOpenIde}
          className="studio-action-primary"
        >
          Open IDE
        </button>
        <button
          onClick={onCopySessionLink}
          disabled={!session}
          className="studio-action-secondary"
        >
          Copy Session Link
        </button>
        <details className="relative">
          <summary className="studio-action-secondary studio-popover-summary cursor-pointer px-2 py-1">
            More
          </summary>
          <div className="studio-popover-panel absolute right-0 top-8 z-30 min-w-[180px] p-1">
            <button
              onClick={onOpenSettings}
              className="w-full rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            >
              Settings
            </button>
            <button
              onClick={onOpenProjectSettings}
              className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
            >
              Project Settings ({projectId})
            </button>
            {legacyDashboardEnabled && (
              <button
                onClick={onOpenLegacyDashboard}
                className="mt-1 w-full rounded px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-slate-800"
              >
                Legacy dashboard
              </button>
            )}
          </div>
        </details>
      </div>
    </div>
  )
}

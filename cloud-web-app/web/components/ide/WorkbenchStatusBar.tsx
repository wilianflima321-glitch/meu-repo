'use client'

export function WorkbenchStatusBar({
  statusMessage,
  projectId,
  workspaceRoot,
  activePath,
  isActiveDirty,
  unsavedCount,
  studioSessionId,
}: {
  statusMessage: string | null
  projectId: string
  workspaceRoot: string
  activePath: string | null
  isActiveDirty: boolean
  unsavedCount: number
  studioSessionId: string | null
}) {
  const fallbackSegments = [
    `Project: ${projectId}`,
    `Workspace: ${workspaceRoot}`,
    activePath ? `${activePath}${isActiveDirty ? ' (unsaved)' : ''}` : null,
    unsavedCount > 0 ? `Unsaved: ${unsavedCount}` : null,
    studioSessionId ? `Studio: ${studioSessionId.slice(0, 8)}` : null,
  ].filter(Boolean)

  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="truncate" aria-live="polite">
        {statusMessage || fallbackSegments.join(' | ')}
      </span>
      <span className="hidden sm:inline text-slate-400">
        Ctrl+Shift+P commands | Ctrl+` terminal | Ctrl+Alt+P switch project
      </span>
    </div>
  )
}


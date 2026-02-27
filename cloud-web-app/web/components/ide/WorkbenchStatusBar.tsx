'use client'

import { ExecutionTarget, getExecutionTargetBadge } from '@/lib/execution-target'

export function WorkbenchStatusBar({
  statusMessage,
  projectId,
  workspaceRoot,
  activePath,
  isActiveDirty,
  unsavedCount,
  studioSessionId,
  executionTarget,
}: {
  statusMessage: string | null
  projectId: string
  workspaceRoot: string
  activePath: string | null
  isActiveDirty: boolean
  unsavedCount: number
  studioSessionId: string | null
  executionTarget: ExecutionTarget
}) {
  const fallbackSegments = [
    {
      label: 'Target',
      value: getExecutionTargetBadge(executionTarget),
      tone: executionTarget === 'local' ? 'text-emerald-300' : 'text-sky-200',
    },
    { label: 'Project', value: projectId, tone: 'text-slate-300' },
    { label: 'Workspace', value: workspaceRoot, tone: 'text-slate-400' },
    activePath
      ? {
          label: 'File',
          value: `${activePath}${isActiveDirty ? ' (unsaved)' : ''}`,
          tone: isActiveDirty ? 'text-amber-300' : 'text-slate-300',
        }
      : null,
    unsavedCount > 0 ? { label: 'Unsaved', value: String(unsavedCount), tone: 'text-amber-300' } : null,
    studioSessionId ? { label: 'Studio', value: studioSessionId.slice(0, 8), tone: 'text-cyan-300' } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; tone: string }>
  const primarySegments = fallbackSegments.slice(0, 3)
  const secondarySegments = fallbackSegments.slice(3)

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-[11px]">
      <div className="studio-scroll flex min-w-0 items-center gap-2 whitespace-nowrap">
        {statusMessage ? (
          <span
            aria-live="polite"
            className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-100"
            title={statusMessage}
          >
            {statusMessage}
          </span>
        ) : (
          <>
            {primarySegments.map((segment) => (
              <span
                key={segment.label}
                className={`rounded border border-slate-700 bg-slate-900/70 px-2 py-0.5 text-[10px] ${segment.tone}`}
                title={`${segment.label}: ${segment.value}`}
              >
                <span className="text-slate-500">{segment.label}:</span> {segment.value}
              </span>
            ))}
            {secondarySegments.length > 0 ? (
              <details className="relative">
                <summary className="studio-action-secondary studio-popover-summary cursor-pointer px-2 py-0.5 text-[10px]">
                  More
                </summary>
                <div className="studio-popover-panel absolute left-0 top-6 z-30 min-w-[180px] p-1">
                  {secondarySegments.map((segment) => (
                    <div
                      key={segment.label}
                      className={`rounded px-2 py-1 text-[10px] ${segment.tone}`}
                      title={`${segment.label}: ${segment.value}`}
                    >
                      <span className="text-slate-500">{segment.label}:</span> {segment.value}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        )}
      </div>
      <details className="hidden xl:block relative">
        <summary className="studio-popover-summary cursor-pointer text-slate-500">Shortcuts</summary>
        <div className="studio-popover-panel absolute right-0 top-5 z-30 min-w-[260px] px-2 py-1 text-[10px] text-slate-300">
          Ctrl+Shift+P Command Palette | Ctrl+` Terminal | Ctrl+Alt+P Project
        </div>
      </details>
    </div>
  )
}

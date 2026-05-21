'use client'

import { RefreshCw, ShieldCheck } from 'lucide-react'

import { BrowserOperatorReplay } from '@/components/agents/BrowserOperatorReplay'
import { cn } from '@/lib/utils'

import type { BrowserOperatorRunSummary } from './types'

type AgentReplayPanelProps = {
  replayRunId: string
  setReplayRunId: (runId: string) => void
  replayRuns?: BrowserOperatorRunSummary[]
  replayRunsError?: unknown
  replayRunsLoading: boolean
  refreshReplayRuns: () => void
  focusClass: string
}

export function AgentReplayPanel({
  replayRunId,
  setReplayRunId,
  replayRuns,
  replayRunsError,
  replayRunsLoading,
  refreshReplayRuns,
  focusClass,
}: AgentReplayPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Browser Operator Replay</p>
        <h3 className="mt-1 text-base font-semibold text-[var(--aethel-text-primary)]">Evidence-first autonomous browsing</h3>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">
          Aethel loads the latest Browser Operator run for this project first, then lets operators inspect screenshots, policy blockers, approvals, and replay evidence before trusting autonomous browser work.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]" htmlFor="browser-replay-run-id">
              Run id
            </label>
            <input
              id="browser-replay-run-id"
              value={replayRunId}
              onChange={(event) => setReplayRunId(event.target.value.trim())}
              placeholder={replayRunsLoading ? 'Loading latest run...' : 'bor_...'}
              className={cn(
                'mt-2 w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)]',
                focusClass,
              )}
            />
          </div>
          <button
            type="button"
            onClick={refreshReplayRuns}
            className={cn('inline-flex items-center justify-center gap-2 self-end rounded-xl border border-[var(--aethel-border-primary)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]', focusClass)}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh runs
          </button>
        </div>
        {replayRuns && replayRuns.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {replayRuns.slice(0, 4).map((run) => (
              <button
                key={run.runId}
                type="button"
                onClick={() => setReplayRunId(run.runId)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] transition',
                  focusClass,
                  replayRunId === run.runId
                    ? 'border-[color-mix(in_srgb,var(--aethel-info)_38%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                    : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
                )}
                title={`${run.mission} - ${run.stepCount} steps`}
              >
                {run.status} - {run.stepCount} steps - {run.timelineHash.slice(0, 8)}
              </button>
            ))}
          </div>
        ) : null}
        {replayRunsError ? (
          <p className="mt-3 text-xs text-[var(--aethel-warning-light)]">
            Recent runs could not be listed. Manual run id lookup still works.
          </p>
        ) : null}
      </div>

      {replayRunId ? (
        <BrowserOperatorReplay runId={replayRunId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-[var(--aethel-primary-light)]" />
          <p className="mt-3 text-sm font-semibold text-[var(--aethel-text-primary)]">Replay is ready when evidence exists</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--aethel-text-tertiary)]">
            Browser Operator should never be a black box. This view keeps pause, approval, takeover, and policy evidence in the same cockpit as the agent fleet.
          </p>
        </div>
      )}
    </div>
  )
}
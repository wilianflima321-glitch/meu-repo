'use client'

import type { ReactNode } from 'react'
import type { StudioAgentRun, StudioMessage, StudioSession } from './studio-home.types'
import { formatRunCost, roleLabel, runStatusTone } from './studio-home.utils'

type StudioHomeTeamChatProps = {
  session: StudioSession | null
  recentAgentRuns: StudioAgentRun[]
  variableUsageBlocked: boolean
  showAgentWorkspace: boolean
  onToggleAgentWorkspace: () => void
  agentWorkspaceNode: ReactNode
}

function MessageList({ messages }: { messages: StudioMessage[] }) {
  const MAX_RENDERED_MESSAGES = 80
  const hiddenCount = messages.length > MAX_RENDERED_MESSAGES ? messages.length - MAX_RENDERED_MESSAGES : 0
  const visibleMessages = hiddenCount > 0 ? messages.slice(-MAX_RENDERED_MESSAGES) : messages

  return (
    <div
      aria-live="polite"
      aria-label="Team chat event stream"
      role="log"
      className="studio-scroll max-h-72 space-y-2"
    >
      {hiddenCount > 0 && (
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-500">
          Showing latest {MAX_RENDERED_MESSAGES} messages ({hiddenCount} older hidden for performance).
        </div>
      )}
      {visibleMessages.map((message) => (
        <div key={message.id} className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  message.role === 'assistant'
                    ? 'bg-sky-400'
                    : message.role === 'user'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                }`}
              />
              {message.role.toUpperCase()}
              {message.agentRole ? ` / ${roleLabel(message.agentRole)}` : ''}
            </span>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
          <p className="whitespace-pre-wrap text-slate-200">{message.content}</p>
        </div>
      ))}
      {messages.length === 0 && (
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
          Session messages will appear here.
        </div>
      )}
    </div>
  )
}

function AgentRunList({ runs }: { runs: StudioAgentRun[] }) {
  return (
    <div className="space-y-1">
      {runs.map((run) => (
        <div key={run.id} className={`rounded border px-2 py-1 text-[11px] ${runStatusTone(run.status)}`}>
          <div className="flex items-center justify-between gap-2 text-slate-100">
            <span>
              {roleLabel(run.role)} - {run.model}
            </span>
            <span>{run.latencyMs}ms</span>
          </div>
          <div className="text-slate-300">
            tokens {run.tokensIn}/{run.tokensOut} - cost {formatRunCost(run.cost)}
          </div>
        </div>
      ))}
      {runs.length === 0 && (
        <div className="rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-500">
          No agent runs yet.
        </div>
      )}
    </div>
  )
}

export function StudioHomeTeamChat({
  session,
  recentAgentRuns,
  variableUsageBlocked,
  showAgentWorkspace,
  onToggleAgentWorkspace,
  agentWorkspaceNode,
}: StudioHomeTeamChatProps) {
  const workspaceDisabledReason =
    !session
      ? 'Start a Studio session first.'
      : session.status !== 'active'
        ? `Session is ${session.status}.`
        : variableUsageBlocked
          ? 'Variable usage is blocked for this account.'
          : null

  const canOpenWorkspace = !workspaceDisabledReason

  return (
    <>
      <div className="studio-panel p-4">
        <div className="studio-panel-header">
          <span>Team Chat Live</span>
          <span className="studio-chip">Auto feed</span>
        </div>
        {!session && (
          <div className="studio-muted-block mb-2 text-xs text-slate-500">
            Start a Studio session to populate the live agent feed and reviewer checkpoints.
          </div>
        )}
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={onToggleAgentWorkspace}
            disabled={!canOpenWorkspace}
            title={workspaceDisabledReason || undefined}
            className="studio-action-secondary px-2 py-1 text-[11px]"
          >
            {showAgentWorkspace ? 'Hide Agent Workspace' : 'Open Agent Workspace'}
          </button>
        </div>
        {workspaceDisabledReason ? (
          <div className="studio-muted-block mb-2 text-slate-500">
            Agent Workspace unavailable: {workspaceDisabledReason}
          </div>
        ) : null}

        <MessageList messages={session?.messages || []} />

        <details className="studio-muted-block mt-3 px-2 py-2" open={recentAgentRuns.length > 0}>
          <summary className="studio-popover-summary cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Agent Runs ({recentAgentRuns.length})
          </summary>
          <div className="mt-2">
            <AgentRunList runs={recentAgentRuns} />
          </div>
        </details>
      </div>

      {showAgentWorkspace ? (
        <div className="studio-panel p-2">{agentWorkspaceNode}</div>
      ) : (
        <div className="studio-panel px-3 py-2 text-xs text-slate-400">
          Agent Workspace is collapsed to keep this surface responsive. Open it only when needed for deeper actions.
        </div>
      )}
    </>
  )
}

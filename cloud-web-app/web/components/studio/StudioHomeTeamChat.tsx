'use client'

import type { ReactNode } from 'react'
import type { StudioAgentRun, StudioMessage, StudioSession } from './studio-home.types'
import { roleLabel, runStatusTone } from './studio-home.utils'

type StudioHomeTeamChatProps = {
  session: StudioSession | null
  recentAgentRuns: StudioAgentRun[]
  showAgentWorkspace: boolean
  onToggleAgentWorkspace: () => void
  agentWorkspaceNode: ReactNode
}

function MessageList({ messages }: { messages: StudioMessage[] }) {
  return (
    <div aria-live="polite" className="max-h-64 space-y-2 overflow-auto pr-1">
      {messages.map((message) => (
        <div key={message.id} className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              {message.role}
              {message.agentRole ? `/${message.agentRole}` : ''}
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
            tokens {run.tokensIn}/{run.tokensOut} - cost {run.cost}
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
  showAgentWorkspace,
  onToggleAgentWorkspace,
  agentWorkspaceNode,
}: StudioHomeTeamChatProps) {
  return (
    <>
      <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Team Chat Live</div>
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={onToggleAgentWorkspace}
            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            {showAgentWorkspace ? 'Hide Agent Workspace' : 'Open Agent Workspace'}
          </button>
        </div>

        <MessageList messages={session?.messages || []} />

        <div className="mt-3 rounded border border-slate-800 bg-slate-950 px-2 py-2">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agent Runs</div>
          <AgentRunList runs={recentAgentRuns} />
        </div>
      </div>

      {showAgentWorkspace ? (
        <div className="rounded border border-slate-800 bg-slate-900/60 p-2">{agentWorkspaceNode}</div>
      ) : (
        <div className="rounded border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
          Agent workspace is collapsed to keep the home surface responsive. Use the button above when you need deep
          chat actions.
        </div>
      )}
    </>
  )
}

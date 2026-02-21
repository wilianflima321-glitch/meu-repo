'use client'

import type { FormEvent } from 'react'
import type { MissionDomain, MissionDomainSelection, StudioSession } from './studio-home.types'
import { missionDomainLabel } from './studio-home.utils'

type StudioHomeMissionPanelProps = {
  mission: string
  projectId: string
  budgetCap: number
  qualityMode: 'standard' | 'delivery' | 'studio'
  missionDomainSelection: MissionDomainSelection
  trimmedMission: string
  busy: boolean
  variableUsageBlocked: boolean
  session: StudioSession | null
  onMissionChange: (value: string) => void
  onProjectIdChange: (value: string) => void
  onBudgetCapChange: (value: number) => void
  onMissionDomainChange: (value: MissionDomainSelection) => void
  onQualityModeChange: (value: 'standard' | 'delivery' | 'studio') => void
  onApplyDomainPreset: (domain: MissionDomain) => void
  onStartSession: (event: FormEvent) => void | Promise<void>
}

export function StudioHomeMissionPanel({
  mission,
  projectId,
  budgetCap,
  qualityMode,
  missionDomainSelection,
  trimmedMission,
  busy,
  variableUsageBlocked,
  session,
  onMissionChange,
  onProjectIdChange,
  onBudgetCapChange,
  onMissionDomainChange,
  onQualityModeChange,
  onApplyDomainPreset,
  onStartSession,
}: StudioHomeMissionPanelProps) {
  const startDisabled = busy || variableUsageBlocked || !trimmedMission
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mission</div>
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          Studio Mode
        </div>
      </div>
      <form onSubmit={onStartSession} className="space-y-3">
        <label className="sr-only" htmlFor="studio-mission">
          Mission description
        </label>
        <textarea
          id="studio-mission"
          value={mission}
          onChange={(event) => onMissionChange(event.target.value)}
          placeholder="Describe mission: what to build, quality target, constraints, and expected output."
          required
          className="h-32 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="studio-project-id">
            Project id
          </label>
          <input
            id="studio-project-id"
            value={projectId}
            onChange={(event) => onProjectIdChange(event.target.value)}
            placeholder="projectId"
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <label className="sr-only" htmlFor="studio-budget-cap">
            Budget cap
          </label>
          <input
            id="studio-budget-cap"
            value={budgetCap}
            onChange={(event) => onBudgetCapChange(Number(event.target.value))}
            type="number"
            min={5}
            max={100000}
            step={1}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="mission-domain">
            Mission domain
          </label>
          <select
            id="mission-domain"
            value={missionDomainSelection}
            onChange={(event) => onMissionDomainChange(event.target.value as MissionDomainSelection)}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="auto">auto</option>
            <option value="games">games</option>
            <option value="films">films</option>
            <option value="apps">apps</option>
            <option value="general">general</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400" htmlFor="quality-mode">
            Quality mode
          </label>
          <select
            id="quality-mode"
            value={qualityMode}
            onChange={(event) => onQualityModeChange(event.target.value as 'standard' | 'delivery' | 'studio')}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <option value="standard">standard</option>
            <option value="delivery">delivery</option>
            <option value="studio">studio</option>
          </select>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-2 py-2">
          <div className="mb-1 text-[11px] text-slate-500">Quick mission presets</div>
          <div className="flex flex-wrap gap-1.5">
            {(['games', 'films', 'apps', 'general'] as MissionDomain[]).map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => onApplyDomainPreset(domain)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {missionDomainLabel(domain)}
              </button>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Domain strategy: {missionDomainLabel(missionDomainSelection)}.{' '}
            {missionDomainSelection === 'auto'
              ? 'The backend infers domain from mission text.'
              : 'Domain is locked for this session to keep checklist and validation aligned.'}
          </div>
        </div>
        <button
          type="submit"
          disabled={startDisabled}
          className="w-full rounded border border-blue-500/40 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-100 hover:bg-blue-500/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Start Studio Session
        </button>
        {startDisabled ? (
          <div className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
            {busy
              ? 'A session action is already running.'
              : variableUsageBlocked
                ? 'Variable AI usage is blocked for this account at the moment.'
                : 'Describe the mission to start the session.'}
          </div>
        ) : null}
        <div className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
          Shortcuts: <code>Ctrl/Cmd+Enter</code> start session, <code>Ctrl/Cmd+Shift+P</code> super plan,{' '}
          <code>Ctrl/Cmd+Shift+R</code> run wave, <code>Ctrl/Cmd+.</code> stop, <code>Ctrl/Cmd+I</code> open IDE,{' '}
          <code>Ctrl/Cmd+,</code> settings.
        </div>
      </form>
      {session?.missionDomain && (
        <div className="mt-3 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-300">
          <div className="font-semibold uppercase tracking-wide text-slate-400">Domain: {session.missionDomain}</div>
          <div className="mt-1 text-slate-400">Quality checklist</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-300">
            {(session.qualityChecklist || []).map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

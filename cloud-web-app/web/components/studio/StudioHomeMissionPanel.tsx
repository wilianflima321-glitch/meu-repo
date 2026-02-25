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
  const sessionLocked = session?.status === 'active'
  const startDisabled = busy || variableUsageBlocked || !trimmedMission || sessionLocked
  const missionQualityChecks = [
    { label: 'Scope', pass: /scope|build|implement|create/i.test(trimmedMission) },
    { label: 'Constraints', pass: /limit|constraint|budget|without|must/i.test(trimmedMission) },
    { label: 'Acceptance', pass: /acceptance|done|success|criteria|validate/i.test(trimmedMission) },
    { label: 'Output', pass: /deliver|output|result|artifact/i.test(trimmedMission) },
  ]
  const missionQualityScore = missionQualityChecks.filter((check) => check.pass).length
  const missionQualityLabel = missionQualityScore >= 4 ? 'strong' : missionQualityScore >= 2 ? 'medium' : 'weak'
  const missionLength = mission.length

  return (
    <div className="studio-panel p-4">
      <div className="studio-panel-header">
        <div>Mission</div>
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
          aria-describedby="studio-mission-hint studio-mission-quality"
          required
          disabled={sessionLocked}
          className="h-32 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <div id="studio-mission-hint" className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Include scope, constraints, acceptance criteria and output format.</span>
          <span>{missionLength} chars</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="studio-project-id">
            Project id
          </label>
          <input
            id="studio-project-id"
            value={projectId}
            onChange={(event) => onProjectIdChange(event.target.value)}
            placeholder="projectId"
            disabled={sessionLocked}
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
            disabled={sessionLocked}
            className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
          <span>Project context for Studio + IDE handoff.</span>
          <span>Budget cap in credits. Variable usage pauses when exhausted.</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400" htmlFor="mission-domain">
              Mission domain
            </label>
            <select
              id="mission-domain"
              value={missionDomainSelection}
              onChange={(event) => onMissionDomainChange(event.target.value as MissionDomainSelection)}
              disabled={sessionLocked}
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
              disabled={sessionLocked}
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="standard">standard</option>
              <option value="delivery">delivery</option>
              <option value="studio">studio</option>
            </select>
          </div>
        </div>
        <div className="studio-muted-block px-2 py-2">
          <div className="mb-1 text-[11px] text-slate-500">Quick mission presets</div>
          <div className="flex flex-wrap gap-1.5">
            {(['games', 'films', 'apps', 'general'] as MissionDomain[]).map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => onApplyDomainPreset(domain)}
                disabled={sessionLocked}
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
        <div id="studio-mission-quality" className="studio-muted-block px-2 py-2">
          <div className="mb-1 text-[11px] text-slate-500">
            Mission quality score: <span className="font-semibold text-slate-300">{missionQualityLabel}</span> (
            {missionQualityScore}/4)
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${missionQualityScore * 25}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missionQualityChecks.map((check) => (
              <span
                key={check.label}
                className={`rounded border px-2 py-0.5 text-[10px] ${
                  check.pass
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-700 bg-slate-900 text-slate-400'
                }`}
              >
                {check.label}
              </span>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={startDisabled}
          className="studio-action-primary w-full py-2"
        >
          Start Studio Session
        </button>
        {startDisabled ? (
          <div className="studio-muted-block px-2 py-1">
            {busy
              ? 'A session action is already running.'
              : session?.status === 'active'
                ? 'Stop the current session before starting a new mission.'
              : variableUsageBlocked
                ? 'Variable AI usage is blocked for this account at the moment.'
                : 'Describe the mission to start the session.'}
          </div>
        ) : null}
        <details className="studio-muted-block px-2 py-1">
          <summary className="studio-popover-summary cursor-pointer text-slate-400">Keyboard shortcuts</summary>
          <div className="mt-1 text-slate-400">
            <code>Ctrl/Cmd+Enter</code> start session, <code>Ctrl/Cmd+Shift+P</code> super plan,{' '}
            <code>Ctrl/Cmd+Shift+R</code> run wave, <code>Ctrl/Cmd+.</code> stop, <code>Ctrl/Cmd+I</code> open IDE,{' '}
            <code>Ctrl/Cmd+,</code> settings.
          </div>
        </details>
      </form>
      {session?.missionDomain && (
        <div className="studio-muted-block mt-3 text-[11px] text-slate-300">
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

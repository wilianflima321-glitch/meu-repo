'use client'

import type { ReactNode } from 'react'
import type {
  FullAccessPolicySummary,
  FullAccessScope,
  StudioSession,
  UsageSummary,
  WalletSummary,
} from './studio-home.types'
import type { ExecutionTarget, ExecutionTargetProfile } from '@/lib/execution-target'
import { fullAccessScopeLabel } from './studio-home.utils'

type BudgetProgress = {
  percent: number
  pressure: 'normal' | 'medium' | 'high' | 'critical'
}

type BudgetAlert = {
  level: 'normal' | 'warning_50' | 'warning_80' | 'hard_stop_100'
  percentUsed: number
  thresholdReached: 0 | 50 | 80 | 100
  nextThreshold: 50 | 80 | 100 | null
  message: string
}

type StudioHomePreviewPanelProps = {
  showRuntimePreview: boolean
  onToggleRuntimePreview: () => void
  previewContent: string
  previewRuntimeNode: ReactNode
}

type StudioHomeOpsBarProps = {
  session: StudioSession | null
  usage: UsageSummary | null
  wallet: WalletSummary | null
  executionTarget: ExecutionTarget
  executionProfiles: ExecutionTargetProfile[]
  budgetCap: number
  budgetProgress: BudgetProgress
  busy: boolean
  liveCost?: {
    cost?: StudioSession['cost']
    budgetAlert?: BudgetAlert
    runsByRole?: Record<string, number>
    totalRuns?: number
    budgetExceeded?: boolean
    updatedAt?: string
  } | null
  liveCostError?: string | null
  fullAccessPolicy: FullAccessPolicySummary
  activeGrant: { id: string; scope: FullAccessScope; expiresAt: string } | null
  fullAccessScope: FullAccessScope
  allowedFullAccessScopes: FullAccessScope[]
  onStopSession: () => void | Promise<void>
  onToggleFullAccess: () => void | Promise<void>
  onFullAccessScopeChange: (value: FullAccessScope) => void
  onRefreshTelemetry: () => void | Promise<void>
}

function PressureLabel({ pressure }: { pressure: BudgetProgress['pressure'] }) {
  if (pressure === 'critical') return <span>critical</span>
  if (pressure === 'high') return <span>high</span>
  if (pressure === 'medium') return <span>medium</span>
  return <span>normal</span>
}

function PressureBar({ budgetProgress }: { budgetProgress: BudgetProgress }) {
  const toneClass =
    budgetProgress.pressure === 'critical'
      ? 'bg-rose-500'
      : budgetProgress.pressure === 'high'
        ? 'bg-amber-500'
        : budgetProgress.pressure === 'medium'
          ? 'bg-yellow-500'
          : 'bg-emerald-500'

  return (
    <div className="h-1.5 overflow-hidden rounded bg-slate-800">
      <div className={`h-full transition-all ${toneClass}`} style={{ width: `${budgetProgress.percent}%` }} />
    </div>
  )
}

export function StudioHomePreviewPanel({
  showRuntimePreview,
  onToggleRuntimePreview,
  previewContent,
  previewRuntimeNode,
}: StudioHomePreviewPanelProps) {
  return (
    <div className="studio-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interactive Preview</div>
        <button
          onClick={onToggleRuntimePreview}
          className="studio-action-secondary px-2 py-1 text-[11px]"
        >
          {showRuntimePreview ? 'Use Text Preview' : 'Enable Runtime Preview'}
        </button>
      </div>
      {showRuntimePreview ? (
        <div className="h-[460px]">{previewRuntimeNode}</div>
      ) : (
        <div className="h-[460px] overflow-auto p-3">
          <pre className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{previewContent}</pre>
        </div>
      )}
    </div>
  )
}

export function StudioHomeOpsBar({
  session,
  usage,
  wallet,
  executionTarget,
  executionProfiles,
  budgetCap,
  budgetProgress,
  busy,
  liveCost,
  liveCostError,
  fullAccessPolicy,
  activeGrant,
  fullAccessScope,
  allowedFullAccessScopes,
  onStopSession,
  onToggleFullAccess,
  onFullAccessScopeChange,
  onRefreshTelemetry,
}: StudioHomeOpsBarProps) {
  const pressureLabel = budgetProgress.pressure
  const pressureText =
    pressureLabel === 'critical'
      ? 'critical'
      : pressureLabel === 'high'
        ? 'high'
        : pressureLabel === 'medium'
          ? 'medium'
          : 'normal'
  const allowedScopesLabel = allowedFullAccessScopes.length
    ? allowedFullAccessScopes.map(fullAccessScopeLabel).join(', ')
    : 'none'
  const grantExpiryLabel = activeGrant
    ? new Date(activeGrant.expiresAt).toLocaleTimeString()
    : ''
  const costSnapshot = liveCost?.cost || session?.cost || null
  const usedCredits = costSnapshot?.usedCredits
  const remainingCredits = costSnapshot?.remainingCredits
  const budgetCapValue = costSnapshot?.budgetCap ?? budgetCap
  const liveRuns = liveCost?.totalRuns ?? 0
  const liveUpdatedAt = liveCost?.updatedAt ? new Date(liveCost.updatedAt).toLocaleTimeString() : null
  const liveUpdatedTimestamp = liveCost?.updatedAt ? new Date(liveCost.updatedAt).getTime() : null
  const telemetryStale = typeof liveUpdatedTimestamp === 'number' && Date.now() - liveUpdatedTimestamp > 30000
  const liveByRole = liveCost?.runsByRole || {}
  const liveBudgetAlert = liveCost?.budgetAlert || null
  const formatValue = (value?: number | null) => (Number.isFinite(value as number) ? String(value) : '-')
  const alerts: Array<{ tone: 'warning' | 'error' | 'success'; message: string }> = []
  if (budgetProgress.pressure === 'critical') {
    alerts.push({
      tone: 'error',
      message: 'Budget is almost exhausted. Finish validation/apply now or stop session to prevent forced blocking.',
    })
  }
  if (liveBudgetAlert?.level === 'warning_50' || liveBudgetAlert?.level === 'warning_80') {
    alerts.push({ tone: 'warning', message: liveBudgetAlert.message })
  }
  if (liveBudgetAlert?.level === 'hard_stop_100') {
    alerts.push({ tone: 'error', message: liveBudgetAlert.message })
  }
  if (liveCostError) {
    alerts.push({ tone: 'warning', message: `Live telemetry warning: ${liveCostError}` })
  }
  if (liveCost?.budgetExceeded) {
    alerts.push({
      tone: 'error',
      message: 'Live telemetry indicates budget is exhausted. Variable operations are blocked until credits are restored.',
    })
  }
  if (telemetryStale) {
    alerts.push({
      tone: 'warning',
      message: 'Telemetry is stale (30s+). Use refresh before making cost-sensitive decisions.',
    })
  }
  if (usage?.usageEntitlement && !usage.usageEntitlement.variableUsageAllowed) {
    alerts.push({
      tone: 'error',
      message: `Variable AI usage is blocked (${usage.usageEntitlement.blockedReason || 'CREDITS_EXHAUSTED'}). Premium interface features remain active until cycle end.`,
    })
  }
  const alertToneClass = (tone: 'warning' | 'error' | 'success') => {
    if (tone === 'error') return 'border-rose-500/30 bg-rose-500/10 text-rose-100'
    if (tone === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    return 'border-amber-500/30 bg-amber-500/10 text-amber-100'
  }

  return (
    <div className="studio-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ops Bar</div>
        <button
          type="button"
          disabled={!session || busy}
          onClick={onRefreshTelemetry}
          className="studio-action-secondary px-2 py-1 text-[11px]"
        >
          Refresh telemetry
        </button>
      </div>
      {!session && (
        <div className="studio-muted-block mb-3">
          No active Studio session yet. Start a mission to unlock live telemetry and apply controls.
        </div>
      )}
      <div className="mb-3 space-y-2 rounded border border-slate-800 bg-slate-950 p-3 text-[11px]">
        <div className="text-slate-500">Execution profile</div>
        <div className="font-semibold text-slate-100">
          Active target: {executionTarget === 'local' ? 'Local Studio' : 'Web Studio'}
        </div>
        {executionProfiles.map((profile) => (
          <div
            key={profile.id}
            className={`rounded border px-2 py-1.5 ${
              profile.status === 'active'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-slate-800 bg-slate-900/60 text-slate-300'
            }`}
          >
            <div className="font-medium">
              {profile.label} {profile.status === 'active' ? '(active)' : '(planned)'}
            </div>
            <div className="text-[10px] opacity-90">{profile.summary}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Plan</div>
          <div className="font-semibold text-slate-100">{usage?.plan || '-'}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Wallet</div>
          <div className="font-semibold text-slate-100">
            {wallet ? `${wallet.balance.toLocaleString()} ${wallet.currency}` : '-'}
          </div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Budget cap</div>
          <div className="font-semibold text-slate-100">{budgetCapValue}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Used credits</div>
          <div className="font-semibold text-slate-100">{formatValue(usedCredits)}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Remaining credits</div>
          <div className="font-semibold text-slate-100">{formatValue(remainingCredits)}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Cost pressure</div>
          <div className="font-semibold text-slate-100">{pressureText}</div>
        </div>
      </div>

      <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-400">
        <div className="mb-1 flex items-center justify-between">
          <span>Budget usage: {budgetProgress.percent}%</span>
          <PressureLabel pressure={budgetProgress.pressure} />
        </div>
        <PressureBar budgetProgress={budgetProgress} />
      </div>
      {alerts.map((alert, index) => (
        <div key={`${alert.tone}-${index}`} className={`mt-2 rounded border px-3 py-2 text-[11px] ${alertToneClass(alert.tone)}`}>
          {alert.message}
        </div>
      ))}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!session || busy || session.status !== 'active'}
          onClick={onStopSession}
          className="studio-action-danger"
        >
          Stop
        </button>
        <button
          disabled={!session || busy || session.status !== 'active'}
          onClick={onToggleFullAccess}
          className="studio-action-warn"
        >
          {activeGrant ? 'Revoke Full Access' : `Full Access (${fullAccessScopeLabel(fullAccessScope)})`}
        </button>
        <label className="sr-only" htmlFor="studio-full-access-scope">
          Full access scope
        </label>
        <select
          id="studio-full-access-scope"
          value={fullAccessScope}
          onChange={(event) => onFullAccessScopeChange(event.target.value as FullAccessScope)}
          disabled={!session || busy || session.status !== 'active' || Boolean(activeGrant)}
          className="studio-action-secondary bg-slate-950 px-2 py-1.5 text-xs disabled:opacity-40"
        >
          <option value="project">Project</option>
          <option value="workspace" disabled={!allowedFullAccessScopes.includes('workspace')}>
            Workspace
          </option>
          <option value="web_tools" disabled={!allowedFullAccessScopes.includes('web_tools')}>
            Web + Tools
          </option>
        </select>
      </div>

      {activeGrant && (
        <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
          Active grant: {fullAccessScopeLabel(activeGrant.scope)} until {grantExpiryLabel}
        </div>
      )}

      <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        Allowed scopes for current plan: {allowedScopesLabel}.
      </div>
      <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        Live telemetry: {liveRuns} runs
        {liveUpdatedAt ? ` | updated ${liveUpdatedAt}` : ''}.
        <span className="ml-1">
          Planner {Math.round(Number(liveByRole.planner || 0))} | Coder {Math.round(Number(liveByRole.coder || 0))} |
          Reviewer {Math.round(Number(liveByRole.reviewer || 0))}
        </span>
      </div>
      <details className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        <summary className="studio-popover-summary cursor-pointer text-slate-300">Full Access policy details</summary>
        <div className="mt-2">
          Policy scope: {fullAccessScopeLabel(fullAccessPolicy.scope)} | allowed actions:{' '}
          {fullAccessPolicy.allowedActionClasses.length} | manual confirm:{' '}
          {fullAccessPolicy.manualConfirmActionClasses.length} | blocked high-risk:{' '}
          {fullAccessPolicy.blockedActionClasses.length}.
        </div>
        <div className="mt-1">Blocked classes: {fullAccessPolicy.blockedActionClasses.join(', ')}.</div>
      </details>
      <div className="mt-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-400">
        Note: Studio Home apply/rollback controls manage mission checkpoints. File-level patch apply remains in `/ide`
        deterministic flows.
      </div>
    </div>
  )
}


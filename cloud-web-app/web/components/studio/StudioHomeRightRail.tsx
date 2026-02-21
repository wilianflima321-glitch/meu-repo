'use client'

import type { ReactNode } from 'react'
import type { FullAccessScope, StudioSession, UsageSummary, WalletSummary } from './studio-home.types'
import { fullAccessScopeLabel } from './studio-home.utils'

type BudgetProgress = {
  percent: number
  pressure: 'normal' | 'medium' | 'high' | 'critical'
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
  budgetCap: number
  budgetProgress: BudgetProgress
  busy: boolean
  activeGrant: { id: string; scope: FullAccessScope; expiresAt: string } | null
  fullAccessScope: FullAccessScope
  allowedFullAccessScopes: FullAccessScope[]
  onStopSession: () => void | Promise<void>
  onToggleFullAccess: () => void | Promise<void>
  onFullAccessScopeChange: (value: FullAccessScope) => void
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
    <div className="overflow-hidden rounded border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interactive Preview</div>
        <button
          onClick={onToggleRuntimePreview}
          className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
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
  budgetCap,
  budgetProgress,
  busy,
  activeGrant,
  fullAccessScope,
  allowedFullAccessScopes,
  onStopSession,
  onToggleFullAccess,
  onFullAccessScopeChange,
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

  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Ops Bar</div>
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
          <div className="font-semibold text-slate-100">{session?.cost.budgetCap ?? budgetCap}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Used credits</div>
          <div className="font-semibold text-slate-100">{session?.cost.usedCredits ?? 0}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-slate-500">Remaining credits</div>
          <div className="font-semibold text-slate-100">{session?.cost.remainingCredits ?? '-'}</div>
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

      {budgetProgress.pressure === 'critical' && (
        <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
          Budget is almost exhausted. Finish validation/apply now or stop session to prevent forced blocking.
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!session || busy || session.status !== 'active'}
          onClick={onStopSession}
          className="rounded border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          Stop
        </button>
        <button
          disabled={!session || busy || session.status !== 'active'}
          onClick={onToggleFullAccess}
          className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
          className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-40"
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
        Note: Studio Home apply/rollback controls manage mission checkpoints. File-level patch apply remains in `/ide`
        deterministic flows.
      </div>

      {usage?.usageEntitlement && !usage.usageEntitlement.variableUsageAllowed && (
        <div className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
          Variable AI usage is blocked (<code>{usage.usageEntitlement.blockedReason || 'CREDITS_EXHAUSTED'}</code>).
          Premium interface features remain active until cycle end.
        </div>
      )}
    </div>
  )
}

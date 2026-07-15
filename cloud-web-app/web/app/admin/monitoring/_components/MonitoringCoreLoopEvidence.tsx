import { Activity, AlertTriangle, Clock, Shield } from 'lucide-react'

import { AdminMetricCard } from '@/components/admin/AdminMetricCard'
import { Badge } from '@/components/ui/Badge'

import type { CoreLoopPromotionSnapshot } from './monitoring-types'

function pct(value?: number) {
  return value !== undefined ? `${(value * 100).toFixed(1)}%` : 'n/a'
}

export function MonitoringCoreLoopEvidence({ coreLoop }: { coreLoop: CoreLoopPromotionSnapshot | null }) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">L4 operational evidence</h2>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">Shows what has been proven in production and what still blocks a stronger autonomous Studio story.</p>
        </div>
        <Badge variant={coreLoop?.promotionEligible ? 'success' : 'warning'} size="sm">{coreLoop?.promotionEligible ? 'Partially promotion-ready' : 'Still blocked'}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <AdminMetricCard icon={Activity} label="Sample size" value={`${coreLoop?.production?.sampleSize ?? 0}`} subValue="Production core-loop runs" />
        <AdminMetricCard icon={Shield} label="Apply success" value={pct(coreLoop?.production?.applySuccessRate)} subValue="Successful apply rate" />
        <AdminMetricCard icon={Clock} label="Feedback coverage" value={pct(coreLoop?.production?.learnFeedbackCoverage)} subValue="Structured feedback coverage" />
        <AdminMetricCard icon={AlertTriangle} label="Workspace coverage" value={pct(coreLoop?.production?.workspaceCoverage)} subValue="Apps validated outside sandbox" trend={coreLoop?.production?.workspaceCoverage ? 'up' : 'down'} trendTone="negative" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-4">
          <h3 className="text-sm font-semibold">Current blockers</h3>
          <div className="mt-3 space-y-2">
            {coreLoop?.blockers?.length ? coreLoop.blockers.map((blocker) => (
              <div key={blocker} className="rounded-md border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">{blocker}</div>
            )) : (
              <div className="rounded-md border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">No operational blocker returned by core-loop promotion.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-4">
          <h3 className="text-sm font-semibold">Critical coverage</h3>
          <div className="mt-3 space-y-3 text-sm text-[var(--aethel-text-secondary)]">
            <CoverageRow label="Sandbox coverage" value={pct(coreLoop?.production?.sandboxCoverage)} />
            <CoverageRow label="Workspace coverage" value={pct(coreLoop?.production?.workspaceCoverage)} />
            <CoverageRow label="Regression rate" value={pct(coreLoop?.production?.regressionRate)} />
            <CoverageRow label="Reviewed apply runs" value={coreLoop?.production?.reviewedApplyRuns !== undefined ? `${coreLoop.production.reviewedApplyRuns} reviewed runs` : 'n/a'} />
            {coreLoop?.updatedAt ? <div className="pt-2 text-xs text-[var(--aethel-text-tertiary)]">Updated at {new Date(coreLoop.updatedAt).toLocaleString()}</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function CoverageRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className="font-medium text-[var(--aethel-text-primary)]">{value}</span></div>
}

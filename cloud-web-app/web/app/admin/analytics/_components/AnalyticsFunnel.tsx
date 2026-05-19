import type { AnalyticsWindowDays, PerformanceBaselineResponse } from './analytics-types'

type AnalyticsFunnelProps = {
  baseline: PerformanceBaselineResponse | null
  windowDays: AnalyticsWindowDays
  firstValueCompletionRate: number | null
  firstValueFromProjectRate: number | null
}

export function AnalyticsFunnel({ baseline, windowDays, firstValueCompletionRate, firstValueFromProjectRate }: AnalyticsFunnelProps) {
  const funnel = baseline?.funnel
  const conversions = baseline?.funnelConversions

  return (
    <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-secondary)]">Funnel ({windowDays}d)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <FunnelCard label="Landing views" value={funnel?.landingViews || 0} />
        <FunnelCard label="Signups" value={funnel?.signups || 0} />
        <FunnelCard label="Logins" value={funnel?.logins || 0} />
        <FunnelCard label="Dashboard views" value={funnel?.dashboardViews || 0} />
        <FunnelCard label="Project creates" value={funnel?.projectCreates || 0} />
        <FunnelCard label="AI chats" value={funnel?.aiChats || 0} />
        <FunnelCard label="IDE opens" value={funnel?.ideOpens || 0} />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FunnelCard label="First value: project" value={funnel?.firstValueProjectCreated || 0} />
        <FunnelCard label="First value: AI success" value={funnel?.firstValueAiSuccess || 0} />
        <FunnelCard label="First value: IDE open" value={funnel?.firstValueIdeOpen || 0} />
        <FunnelCard
          label="First value completed"
          value={funnel?.firstValueCompleted || 0}
          details={[
            `signup conversion: ${firstValueCompletionRate === null ? '--' : `${firstValueCompletionRate.toFixed(1)}%`}`,
            `project to complete: ${firstValueFromProjectRate === null ? '--' : `${firstValueFromProjectRate.toFixed(1)}%`}`,
          ]}
        />
      </div>
      {conversions ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ConversionCard label="signup to project" value={conversions.signupToProjectCreate} />
          <ConversionCard label="signup to AI chat" value={conversions.signupToAiChat} />
          <ConversionCard label="signup to IDE open" value={conversions.signupToIdeOpen} />
          <ConversionCard label="signup to first value" value={conversions.signupToFirstValueComplete} />
          <ConversionCard label="project to first value" value={conversions.projectCreateToFirstValueComplete} />
        </div>
      ) : null}
    </div>
  )
}

function FunnelCard({ label, value, details = [] }: { label: string; value: number; details?: string[] }) {
  return (
    <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
      <p className="text-xs text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {details.map((detail) => (
        <p key={detail} className="text-xs text-[var(--aethel-text-tertiary)]">
          {detail}
        </p>
      ))}
    </div>
  )
}

function ConversionCard({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
      <p className="text-xs text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--aethel-text-primary)]">
        {value === null ? '--' : `${value.toFixed(1)}%`}
      </p>
    </div>
  )
}

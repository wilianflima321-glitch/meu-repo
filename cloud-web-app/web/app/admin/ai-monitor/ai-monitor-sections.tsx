import React from 'react';
import type {
  AIMetrics,
  AIReadiness,
  ChangeRunGroup,
  ChangeRunSummary,
  CoreLoopMetricsResponse,
  CoreLoopMetricsWindow,
  CoreLoopPromotionResponse,
  FullAccessAuditResponse,
  L4ReadinessDossierResponse,
  LedgerIntegrityResponse,
} from './types';

interface SurfaceStatProps {
  label: string;
  value: React.ReactNode;
}

function SurfaceStat({ label, value }: SurfaceStatProps) {
  return (
    <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] p-3">
      <p className="text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  );
}

interface InlineSummaryCardProps {
  accentClassName?: string;
  body: React.ReactNode;
  title: string;
}

function InlineSummaryCard({ accentClassName, body, title }: InlineSummaryCardProps) {
  return (
    <div
      className={`rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 ${accentClassName ?? ''}`}
    >
      <p className="text-[var(--aethel-text-secondary)]">{title}</p>
      <div className="mt-1">{body}</div>
    </div>
  );
}

interface CountPillGroupProps {
  entries: Array<[string, number]>;
  limit?: number;
  title: string;
}

function CountPillGroup({ entries, limit = 6, title }: CountPillGroupProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
      <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">{title}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {entries.slice(0, limit).map(([key, count]) => (
          <span
            key={key}
            className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[var(--aethel-text-secondary)]"
          >
            {key}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

interface ReadinessSectionProps {
  readiness: AIReadiness;
}

export function ReadinessSection({ readiness }: ReadinessSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Core Loop Readiness (L4 gate)</h3>
        <span
          className={`rounded px-2 py-1 text-xs ${
            readiness.promotionEligible
              ? 'bg-[var(--aethel-success)]/20 text-[var(--aethel-success-light)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
          }`}
        >
          {readiness.promotionEligible ? 'PROMOTION ELIGIBLE' : 'PARTIAL'}
        </span>
      </div>
      {readiness.samplePolicy && (
        <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">Policy: {readiness.samplePolicy}</p>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
        <SurfaceStat label="Success Rate" value={`${(readiness.metrics.applySuccessRate * 100).toFixed(1)}%`} />
        <SurfaceStat label="Regression Rate" value={`${(readiness.metrics.regressionRate * 100).toFixed(1)}%`} />
        <SurfaceStat label="Sandbox Coverage" value={`${(readiness.metrics.sandboxCoverage * 100).toFixed(1)}%`} />
        <SurfaceStat label="Learn Coverage" value={`${((readiness.metrics.learnFeedbackCoverage || 0) * 100).toFixed(1)}%`} />
        <SurfaceStat label="Sample Size" value={readiness.metrics.sampleSize} />
      </div>
      {(typeof readiness.metrics.reviewedApplyRuns === 'number' ||
        typeof readiness.metrics.unreviewedApplyRuns === 'number') && (
        <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          reviewed={readiness.metrics.reviewedApplyRuns || 0} | unreviewed=
          {readiness.metrics.unreviewedApplyRuns || 0} | target learn coverage=
          {((readiness.thresholds?.feedbackCoverageMin || 0.6) * 100).toFixed(0)}%
        </p>
      )}
      {readiness.runtimeReadiness && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-[var(--aethel-text-secondary)]">Production runtime preflight</p>
            <span
              className={`rounded px-2 py-1 ${
                readiness.runtimeReadiness.probeReady
                  ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]'
                  : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]'
              }`}
            >
              {readiness.runtimeReadiness.probeReady ? 'PROBE READY' : 'BLOCKED'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-8">
            <SurfaceStat label=".env.local" value={readiness.runtimeReadiness.envLocalPresent ? 'present' : 'missing'} />
            <SurfaceStat label="Database" value={readiness.runtimeReadiness.databaseConfigured ? 'configured' : 'missing'} />
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
              <p className="text-[var(--aethel-text-tertiary)]">DB reachability</p>
              <p className="mt-1 text-[var(--aethel-text-secondary)]">
                {readiness.runtimeReadiness.databaseReachable ? 'reachable' : 'unreachable'}
              </p>
              {readiness.runtimeReadiness.databaseTarget && (
                <p className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                  {readiness.runtimeReadiness.databaseTarget}
                </p>
              )}
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
              <p className="text-[var(--aethel-text-tertiary)]">App runtime</p>
              <p className="mt-1 text-[var(--aethel-text-secondary)]">
                {readiness.runtimeReadiness.appRuntimeReachable ? 'reachable' : 'unreachable'}
              </p>
              {readiness.runtimeReadiness.appBaseUrl && (
                <p className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">
                  {readiness.runtimeReadiness.appBaseUrl}
                </p>
              )}
            </div>
            <SurfaceStat label="JWT" value={readiness.runtimeReadiness.jwtConfigured ? 'configured' : 'missing'} />
            <SurfaceStat label="CSRF" value={readiness.runtimeReadiness.csrfConfigured ? 'configured' : 'missing'} />
            <SurfaceStat label="Docker CLI" value={readiness.runtimeReadiness.dockerCliPresent ? 'present' : 'missing'} />
            <SurfaceStat label="Docker daemon" value={readiness.runtimeReadiness.dockerDaemonReady ? 'ready' : 'blocked'} />
          </div>
          <p className="mt-2 text-[var(--aethel-text-tertiary)]">
            authReady={String(readiness.runtimeReadiness.authReady)} | probeReady={String(readiness.runtimeReadiness.probeReady)}
          </p>
          {readiness.runtimeReadiness.blockers.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--aethel-warning-light)]">
              {readiness.runtimeReadiness.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
          {readiness.runtimeReadiness.instructions.length > 0 && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-3">
              <p className="font-medium text-[var(--aethel-text-secondary)]">Proximas acoes</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--aethel-text-secondary)]">
                {readiness.runtimeReadiness.instructions.map((instruction) => (
                  <li key={instruction}>{instruction}</li>
                ))}
              </ul>
              {readiness.runtimeReadiness.recommendedCommands.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {readiness.runtimeReadiness.recommendedCommands.map((command) => (
                    <code
                      key={command}
                      className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-2 py-1 text-[11px] text-[var(--aethel-info-light)]"
                    >
                      {command}
                    </code>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {(readiness.metricsAll || readiness.rehearsalMetrics) && (
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          {readiness.metricsAll && (
            <InlineSummaryCard
              title="All samples"
              body={
                <p className="text-[var(--aethel-text-secondary)]">
                  sample={readiness.metricsAll.sampleSize} | success=
                  {(readiness.metricsAll.applySuccessRate * 100).toFixed(1)}%
                </p>
              }
            />
          )}
          {readiness.rehearsalMetrics && (
            <InlineSummaryCard
              title="Rehearsal samples"
              accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
              body={
                <p className="text-[var(--aethel-info-light)]">
                  sample={readiness.rehearsalMetrics.sampleSize} | success=
                  {(readiness.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                </p>
              }
            />
          )}
        </div>
      )}
      {readiness.blockers && readiness.blockers.length > 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]">
          <p className="mb-1 font-medium">Promotion blockers</p>
          <ul className="list-disc space-y-1 pl-4">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}
      {readiness.windows && readiness.windows.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {readiness.windows.map((window) => (
            <div
              key={window.hours}
              className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)] p-3 text-xs"
            >
              <p className="text-[var(--aethel-text-secondary)]">Window {window.hours}h</p>
              <p className="mt-1 text-[var(--aethel-text-secondary)]">
                Success: {(window.metrics.applySuccessRate * 100).toFixed(1)}%
              </p>
              <p className="text-[var(--aethel-text-secondary)]">
                Regression: {(window.metrics.regressionRate * 100).toFixed(1)}%
              </p>
              <p className="text-[var(--aethel-text-secondary)]">
                Sandbox: {(window.metrics.sandboxCoverage * 100).toFixed(1)}%
              </p>
              <p className="text-[var(--aethel-text-secondary)]">
                Learn: {((window.metrics.learnFeedbackCoverage || 0) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PromotionSectionProps {
  promotion: CoreLoopPromotionResponse;
}

export function PromotionSection({ promotion }: PromotionSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Promotion Verdict (Policy Scope)</h3>
        <span
          className={`rounded px-2 py-1 text-xs ${
            promotion.promotionEligible
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
          }`}
        >
          {promotion.promotionEligible ? 'ELIGIBLE' : 'BLOCKED'}
        </span>
      </div>
      <p className="text-xs text-[var(--aethel-text-tertiary)]">Policy: {promotion.samplePolicy}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
        <InlineSummaryCard
          title="Production"
          body={
            <p className="text-[var(--aethel-text-secondary)]">
              sample={promotion.production.sampleSize} | success=
              {(promotion.production.applySuccessRate * 100).toFixed(1)}% | regression=
              {(promotion.production.regressionRate * 100).toFixed(1)}%
            </p>
          }
        />
        <InlineSummaryCard
          title="Rehearsal"
          accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
          body={
            <p className="text-[var(--aethel-info-light)]">
              sample={promotion.rehearsal.sampleSize} | success=
              {(promotion.rehearsal.applySuccessRate * 100).toFixed(1)}% | regression=
              {(promotion.rehearsal.regressionRate * 100).toFixed(1)}%
            </p>
          }
        />
      </div>
      {promotion.blockers.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-[var(--aethel-error-light)]">
          {promotion.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface DossierSectionProps {
  dossier: L4ReadinessDossierResponse;
  unmetCriteria: Array<[string, NonNullable<L4ReadinessDossierResponse['exitCriteria']>[string]]>;
}

export function DossierSection({ dossier, unmetCriteria }: DossierSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">L4 readiness dossier</h3>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            Estado consolidado para evitar narrativa otimista demais no admin.
          </p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs ${
            dossier.status === 'COMPLETE' || dossier.status === 'ACTIVE'
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]'
          }`}
        >
          {dossier.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <SurfaceStat label="Production sample" value={dossier.metrics?.production?.sampleSize ?? 0} />
        <SurfaceStat
          label="Success rate"
          value={
            typeof dossier.metrics?.production?.successRate === 'number'
              ? `${(dossier.metrics.production.successRate * 100).toFixed(1)}%`
              : 'n/a'
          }
        />
        <SurfaceStat
          label="Feedback coverage"
          value={
            typeof dossier.metrics?.production?.feedbackCoverage === 'number'
              ? `${(dossier.metrics.production.feedbackCoverage * 100).toFixed(1)}%`
              : 'n/a'
          }
        />
        <SurfaceStat
          label="Overall score"
          value={typeof dossier.scores?.overall === 'number' ? dossier.scores.overall.toFixed(1) : 'n/a'}
        />
      </div>

      {unmetCriteria.length > 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--aethel-warning-light)]">Criteria still not met</p>
          <div className="space-y-2 text-xs text-[var(--aethel-text-secondary)]">
            {unmetCriteria.slice(0, 6).map(([key, criterion]) => (
              <div
                key={key}
                className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--aethel-text-primary)]">{key}</span>
                  <span>
                    target={String(criterion.target)} | actual={String(criterion.actual)}
                  </span>
                </div>
                {criterion.note && <p className="mt-1 text-[var(--aethel-text-tertiary)]">{criterion.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {dossier.blockers?.length > 0 && (
        <div className="mt-3 grid gap-2">
          {dossier.blockers.map((blocker) => (
            <div
              key={blocker}
              className="rounded border border-[color-mix(in_srgb,var(--aethel-error)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-secondary)]"
            >
              {blocker}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CoreLoopMetricsSectionProps {
  capabilityStatus?: CoreLoopMetricsResponse['capabilityStatus'];
  latest: CoreLoopMetricsWindow;
  reasonPlaybook: NonNullable<CoreLoopMetricsResponse['reasonPlaybook']>;
  samplePolicy?: string;
  trend: CoreLoopMetricsResponse['trend'];
}

export function CoreLoopMetricsSection({
  capabilityStatus,
  latest,
  reasonPlaybook,
  samplePolicy,
  trend,
}: CoreLoopMetricsSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Core-loop Operational Metrics (7d)</h3>
        <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
          {capabilityStatus || 'PARTIAL'}
        </span>
      </div>
      {samplePolicy && <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">Policy: {samplePolicy}</p>}
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <SurfaceStat label="Apply runs" value={latest.metrics.sampleSize} />
        <SurfaceStat label="Successful applies" value={latest.metrics.successfulApplyRuns} />
        <SurfaceStat label="Failed applies" value={latest.metrics.failedApplyRuns} />
        <SurfaceStat label="Blocked applies" value={latest.metrics.blockedApplyRuns} />
      </div>
      {(latest.metricsAll || latest.rehearsalMetrics) && (
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          {latest.metricsAll && (
            <InlineSummaryCard
              title="All samples"
              body={
                <p className="text-[var(--aethel-text-secondary)]">
                  sample={latest.metricsAll.sampleSize} | success=
                  {(latest.metricsAll.applySuccessRate * 100).toFixed(1)}%
                </p>
              }
            />
          )}
          {latest.rehearsalMetrics && (
            <InlineSummaryCard
              title="Rehearsal samples"
              accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
              body={
                <p className="text-[var(--aethel-info-light)]">
                  sample={latest.rehearsalMetrics.sampleSize} | success=
                  {(latest.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                </p>
              }
            />
          )}
        </div>
      )}
      {trend && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 text-xs">
          <p className="mb-2 font-medium text-[var(--aethel-text-secondary)]">Trend (7d vs 30d baseline)</p>
          <div className="flex flex-wrap gap-2 text-[var(--aethel-text-secondary)]">
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">sample: {trend.sampleSize}</span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">success: {trend.applySuccessRate}</span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">regression: {trend.regressionRate}</span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">sandbox: {trend.sandboxCoverage}</span>
          </div>
        </div>
      )}
      <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
        Last event: {latest.lastEventAt ? new Date(latest.lastEventAt).toLocaleString() : 'none'}
      </div>
      {latest.metrics.sampleSize === 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]">
          No apply-run evidence in this window. L4 promotion remains evidence-blocked.
        </div>
      )}
      {latest.metrics.sampleSize === 0 && (latest.rehearsalMetrics?.sampleSize || 0) > 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3 text-xs text-[var(--aethel-info-light)]">
          Rehearsal evidence exists, but production evidence is still zero. Promotion remains blocked by policy.
        </div>
      )}
      <CountPillGroup title="Top block/failure reasons" entries={Object.entries(latest.reasonCounts)} />
      <CountPillGroup title="Dependency risk distribution" entries={Object.entries(latest.riskCounts)} />
      <CountPillGroup title="Most impacted API surfaces" entries={Object.entries(latest.impactedEndpointCounts)} limit={8} />
      {latest.recommendations.length > 0 && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
          <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">Learning recommendations</p>
          <ul className="space-y-1 text-xs">
            {latest.recommendations.map((recommendation) => (
              <li key={recommendation.id} className="text-[var(--aethel-text-secondary)]">
                <span
                  className={`mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                    recommendation.severity === 'critical'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
                      : recommendation.severity === 'warning'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]'
                        : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]'
                  }`}
                >
                  {recommendation.severity.toUpperCase()}
                </span>
                {recommendation.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {reasonPlaybook.length > 0 && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
          <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">Reason playbook</p>
          <ul className="space-y-1 text-xs text-[var(--aethel-text-secondary)]">
            {reasonPlaybook.map((item) => (
              <li key={item.reason}>
                <span className="mr-2 rounded bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--aethel-text-secondary)]">
                  {item.reason} ({item.count})
                </span>
                {item.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface LedgerIntegritySectionProps {
  ledgerIntegrity: LedgerIntegrityResponse;
}

export function LedgerIntegritySection({ ledgerIntegrity }: LedgerIntegritySectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Ledger integrity</h3>
        <span
          className={`rounded px-2 py-1 text-xs ${
            ledgerIntegrity.integrityOk
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
          }`}
        >
          {ledgerIntegrity.integrityOk ? 'OK' : 'ISSUES'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
        <SurfaceStat label="files" value={ledgerIntegrity.report.filesChecked} />
        <SurfaceStat label="rows" value={ledgerIntegrity.report.rowsChecked} />
        <SurfaceStat label="valid" value={ledgerIntegrity.report.validRows} />
        <SurfaceStat label="legacy" value={ledgerIntegrity.report.legacyRows} />
        <SurfaceStat label="invalid" value={ledgerIntegrity.report.invalidRows} />
      </div>
      {ledgerIntegrity.report.invalidRows > 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-xs text-[var(--aethel-error-light)]">
          <p className="mb-2 font-medium">First integrity issues</p>
          <ul className="space-y-1">
            {ledgerIntegrity.report.issues.slice(0, 8).map((issue) => (
              <li key={`${issue.file}:${issue.line}:${issue.reason}`}>
                {issue.file}:{issue.line} - {issue.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface FullAccessAuditSectionProps {
  audit: FullAccessAuditResponse;
}

export function FullAccessAuditSection({ audit }: FullAccessAuditSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Full Access audit</h3>
        <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
          {audit.capabilityStatus}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <SurfaceStat label="total" value={audit.summary.total} />
        <SurfaceStat label="active" value={audit.summary.active} />
        <SurfaceStat label="revoked" value={audit.summary.revoked} />
        <SurfaceStat label="expired" value={audit.summary.expired} />
      </div>
    </div>
  );
}

interface RunLedgerSectionProps {
  capabilityStatus?: string;
  runGroups: ChangeRunGroup[];
  runSampleClass: 'all' | 'production' | 'rehearsal';
  runSummary: ChangeRunSummary;
  runSummaryAll: ChangeRunSummary | null;
  sampleClassLabel?: 'all' | 'production' | 'rehearsal';
}

export function RunLedgerSection({
  capabilityStatus,
  runGroups,
  runSampleClass,
  runSummary,
  runSummaryAll,
  sampleClassLabel,
}: RunLedgerSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Apply/Rollback Ledger (72h)</h3>
        <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
          capability: {capabilityStatus || 'PARTIAL'}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span>sampleClass: {sampleClassLabel || runSampleClass}</span>
        {runSummaryAll && (
          <span>
            all.apply={runSummaryAll.apply} all.blocked={runSummaryAll.applyBlocked} all.rollback={runSummaryAll.rollback}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 xl:grid-cols-6">
        <SurfaceStat label="Apply success rate" value={`${(runSummary.applySuccessRate * 100).toFixed(1)}%`} />
        <SurfaceStat label="Blocked rate" value={`${(runSummary.blockedRate * 100).toFixed(1)}%`} />
        <SurfaceStat label="Regression rate" value={`${(runSummary.regressionRate * 100).toFixed(1)}%`} />
        <SurfaceStat label="Sandbox coverage" value={`${(runSummary.sandboxCoverage * 100).toFixed(1)}%`} />
        <SurfaceStat label="Workspace coverage" value={`${(runSummary.workspaceCoverage * 100).toFixed(1)}%`} />
        <SurfaceStat label="Events tracked" value={runSummary.total} />
      </div>

      {runGroups.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--aethel-border-primary)] text-[var(--aethel-text-tertiary)]">
                <th className="px-2 py-1 text-left">Run</th>
                <th className="px-2 py-1 text-left">Events</th>
                <th className="px-2 py-1 text-left">Window</th>
                <th className="px-2 py-1 text-left">Types</th>
                <th className="px-2 py-1 text-left">Outcomes</th>
                <th className="px-2 py-1 text-left">Paths</th>
              </tr>
            </thead>
            <tbody>
              {runGroups.slice(0, 8).map((group) => (
                <tr
                  key={group.runId}
                  className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]"
                >
                  <td className="px-2 py-1 font-mono text-[var(--aethel-text-secondary)]">{group.runId}</td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.eventCount}</td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {new Date(group.firstAt || group.firstTimestamp || '').toLocaleTimeString()} -{' '}
                    {new Date(group.lastAt || group.lastTimestamp || '').toLocaleTimeString()}
                  </td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.eventTypes.join(', ')}</td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.outcomes.join(', ')}</td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {(group.paths || group.files || []).slice(0, 2).join(', ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ModelBreakdownSectionProps {
  metrics: AIMetrics;
}

export function ModelBreakdownSection({ metrics }: ModelBreakdownSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <h3 className="mb-3 text-sm font-medium text-[var(--aethel-text-secondary)]">Uso por modelo</h3>
      <div className="flex flex-wrap gap-4">
        {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
          <div
            key={model}
            className="flex items-center gap-3 rounded-lg bg-[var(--aethel-surface-tertiary)] px-4 py-2"
          >
            <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{model}</span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{data.calls} chamadas</span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">${data.cost.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

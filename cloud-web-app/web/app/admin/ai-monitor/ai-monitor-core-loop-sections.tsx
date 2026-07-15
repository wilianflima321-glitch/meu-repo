'use client';

import type {
  ChangeRunGroup,
  ChangeRunSummary,
  CoreLoopMetricsResponse,
  CoreLoopMetricsWindow,
} from './types';
import {
  CountPillGroup,
  InlineSummaryCard,
  SurfaceStat,
} from './ai-monitor-section-primitives';

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
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Core-loop Operational Metrics (7d)
        </h3>
        <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
          {capabilityStatus || 'PARTIAL'}
        </span>
      </div>
      {samplePolicy && (
        <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">
          Policy: {samplePolicy}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
        <SurfaceStat label="Apply runs" value={latest.metrics.sampleSize} />
        <SurfaceStat
          label="Successful applies"
          value={latest.metrics.successfulApplyRuns}
        />
        <SurfaceStat label="Failed applies" value={latest.metrics.failedApplyRuns} />
        <SurfaceStat label="Blocked applies" value={latest.metrics.blockedApplyRuns} />
      </div>
      {(latest.metricsAll || latest.rehearsalMetrics) && (
        <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          {latest.metricsAll && (
            <InlineSummaryCard
              title="All samples"
              body={(
                <p className="text-[var(--aethel-text-secondary)]">
                  sample={latest.metricsAll.sampleSize} | success=
                  {(latest.metricsAll.applySuccessRate * 100).toFixed(1)}%
                </p>
              )}
            />
          )}
          {latest.rehearsalMetrics && (
            <InlineSummaryCard
              title="Rehearsal samples"
              accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
              body={(
                <p className="text-[var(--aethel-info-light)]">
                  sample={latest.rehearsalMetrics.sampleSize} | success=
                  {(latest.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                </p>
              )}
            />
          )}
        </div>
      )}
      {trend && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 text-xs">
          <p className="mb-2 font-medium text-[var(--aethel-text-secondary)]">
            Trend (7d vs 30d baseline)
          </p>
          <div className="flex flex-wrap gap-2 text-[var(--aethel-text-secondary)]">
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">
              sample: {trend.sampleSize}
            </span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">
              success: {trend.applySuccessRate}
            </span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">
              regression: {trend.regressionRate}
            </span>
            <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">
              sandbox: {trend.sandboxCoverage}
            </span>
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
      {latest.metrics.sampleSize === 0 &&
        (latest.rehearsalMetrics?.sampleSize || 0) > 0 && (
          <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3 text-xs text-[var(--aethel-info-light)]">
            Rehearsal evidence exists, but production evidence is still zero. Promotion remains blocked by policy.
          </div>
        )}
      <CountPillGroup
        title="Top block/failure reasons"
        entries={Object.entries(latest.reasonCounts)}
      />
      <CountPillGroup
        title="Dependency risk distribution"
        entries={Object.entries(latest.riskCounts)}
      />
      <CountPillGroup
        title="Most impacted API surfaces"
        entries={Object.entries(latest.impactedEndpointCounts)}
        limit={8}
      />
      {latest.recommendations.length > 0 && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
          <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">
            Learning recommendations
          </p>
          <ul className="space-y-1 text-xs">
            {latest.recommendations.map((recommendation) => (
              <li
                key={recommendation.id}
                className="text-[var(--aethel-text-secondary)]"
              >
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
          <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">
            Reason playbook
          </p>
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
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Apply/Rollback Ledger (72h)
        </h3>
        <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
          capability: {capabilityStatus || 'PARTIAL'}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs text-[var(--aethel-text-tertiary)]">
        <span>sampleClass: {sampleClassLabel || runSampleClass}</span>
        {runSummaryAll && (
          <span>
            all.apply={runSummaryAll.apply} all.blocked={runSummaryAll.applyBlocked}{' '}
            all.rollback={runSummaryAll.rollback}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 xl:grid-cols-6">
        <SurfaceStat
          label="Apply success rate"
          value={`${(runSummary.applySuccessRate * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Blocked rate"
          value={`${(runSummary.blockedRate * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Regression rate"
          value={`${(runSummary.regressionRate * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Sandbox coverage"
          value={`${(runSummary.sandboxCoverage * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Workspace coverage"
          value={`${(runSummary.workspaceCoverage * 100).toFixed(1)}%`}
        />
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
                  <td className="px-2 py-1 font-mono text-[var(--aethel-text-secondary)]">
                    {group.runId}
                  </td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {group.eventCount}
                  </td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {new Date(group.firstAt || group.firstTimestamp || '').toLocaleTimeString()} -{' '}
                    {new Date(group.lastAt || group.lastTimestamp || '').toLocaleTimeString()}
                  </td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {group.eventTypes.join(', ')}
                  </td>
                  <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                    {group.outcomes.join(', ')}
                  </td>
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

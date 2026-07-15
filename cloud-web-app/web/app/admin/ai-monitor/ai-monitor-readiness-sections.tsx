'use client';

import type {
  AIReadiness,
  CoreLoopPromotionResponse,
  L4ReadinessDossierResponse,
} from './types';
import {
  InlineSummaryCard,
  SurfaceStat,
} from './ai-monitor-section-primitives';

interface ReadinessSectionProps {
  readiness: AIReadiness;
}

export function ReadinessSection({ readiness }: ReadinessSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Core Loop Readiness (L4 gate)
        </h3>
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
        <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">
          Policy: {readiness.samplePolicy}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-5">
        <SurfaceStat
          label="Success Rate"
          value={`${(readiness.metrics.applySuccessRate * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Regression Rate"
          value={`${(readiness.metrics.regressionRate * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Sandbox Coverage"
          value={`${(readiness.metrics.sandboxCoverage * 100).toFixed(1)}%`}
        />
        <SurfaceStat
          label="Learn Coverage"
          value={`${((readiness.metrics.learnFeedbackCoverage || 0) * 100).toFixed(1)}%`}
        />
        <SurfaceStat label="Sample Size" value={readiness.metrics.sampleSize} />
      </div>
      {(typeof readiness.metrics.reviewedApplyRuns === 'number' ||
        typeof readiness.metrics.unreviewedApplyRuns === 'number') && (
        <p className="mt-2 text-[11px] text-[var(--aethel-text-tertiary)]">
          reviewed={readiness.metrics.reviewedApplyRuns || 0} |
          {' '}unreviewed={readiness.metrics.unreviewedApplyRuns || 0} |
          {' '}target learn coverage=
          {((readiness.thresholds?.feedbackCoverageMin || 0.6) * 100).toFixed(0)}%
        </p>
      )}
      {readiness.runtimeReadiness && (
        <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-[var(--aethel-text-secondary)]">
              Production runtime preflight
            </p>
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
            <SurfaceStat
              label=".env.local"
              value={readiness.runtimeReadiness.envLocalPresent ? 'present' : 'missing'}
            />
            <SurfaceStat
              label="Database"
              value={readiness.runtimeReadiness.databaseConfigured ? 'configured' : 'missing'}
            />
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
            <SurfaceStat
              label="JWT"
              value={readiness.runtimeReadiness.jwtConfigured ? 'configured' : 'missing'}
            />
            <SurfaceStat
              label="CSRF"
              value={readiness.runtimeReadiness.csrfConfigured ? 'configured' : 'missing'}
            />
            <SurfaceStat
              label="Docker CLI"
              value={readiness.runtimeReadiness.dockerCliPresent ? 'present' : 'missing'}
            />
            <SurfaceStat
              label="Docker daemon"
              value={readiness.runtimeReadiness.dockerDaemonReady ? 'ready' : 'blocked'}
            />
          </div>
          <p className="mt-2 text-[var(--aethel-text-tertiary)]">
            authReady={String(readiness.runtimeReadiness.authReady)} | probeReady=
            {String(readiness.runtimeReadiness.probeReady)}
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
              <p className="font-medium text-[var(--aethel-text-secondary)]">
                Proximas acoes
              </p>
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
              body={(
                <p className="text-[var(--aethel-text-secondary)]">
                  sample={readiness.metricsAll.sampleSize} | success=
                  {(readiness.metricsAll.applySuccessRate * 100).toFixed(1)}%
                </p>
              )}
            />
          )}
          {readiness.rehearsalMetrics && (
            <InlineSummaryCard
              title="Rehearsal samples"
              accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
              body={(
                <p className="text-[var(--aethel-info-light)]">
                  sample={readiness.rehearsalMetrics.sampleSize} | success=
                  {(readiness.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                </p>
              )}
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
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Promotion Verdict (Policy Scope)
        </h3>
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
      <p className="text-xs text-[var(--aethel-text-tertiary)]">
        Policy: {promotion.samplePolicy}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
        <InlineSummaryCard
          title="Production"
          body={(
            <p className="text-[var(--aethel-text-secondary)]">
              sample={promotion.production.sampleSize} | success=
              {(promotion.production.applySuccessRate * 100).toFixed(1)}% | regression=
              {(promotion.production.regressionRate * 100).toFixed(1)}%
            </p>
          )}
        />
        <InlineSummaryCard
          title="Rehearsal"
          accentClassName="border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]"
          body={(
            <p className="text-[var(--aethel-info-light)]">
              sample={promotion.rehearsal.sampleSize} | success=
              {(promotion.rehearsal.applySuccessRate * 100).toFixed(1)}% | regression=
              {(promotion.rehearsal.regressionRate * 100).toFixed(1)}%
            </p>
          )}
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
  unmetCriteria: Array<
    [string, NonNullable<L4ReadinessDossierResponse['exitCriteria']>[string]]
  >;
}

export function DossierSection({
  dossier,
  unmetCriteria,
}: DossierSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
            L4 readiness dossier
          </h3>
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
        <SurfaceStat
          label="Production sample"
          value={dossier.metrics?.production?.sampleSize ?? 0}
        />
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
          value={
            typeof dossier.scores?.overall === 'number'
              ? dossier.scores.overall.toFixed(1)
              : 'n/a'
          }
        />
      </div>

      {unmetCriteria.length > 0 && (
        <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3">
          <p className="mb-2 text-xs font-medium text-[var(--aethel-warning-light)]">
            Criteria still not met
          </p>
          <div className="space-y-2 text-xs text-[var(--aethel-text-secondary)]">
            {unmetCriteria.slice(0, 6).map(([key, criterion]) => (
              <div
                key={key}
                className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--aethel-text-primary)]">
                    {key}
                  </span>
                  <span>
                    target={String(criterion.target)} | actual={String(criterion.actual)}
                  </span>
                </div>
                {criterion.note && (
                  <p className="mt-1 text-[var(--aethel-text-tertiary)]">
                    {criterion.note}
                  </p>
                )}
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

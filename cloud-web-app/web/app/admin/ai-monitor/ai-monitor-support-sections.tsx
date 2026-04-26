'use client';

import type {
  AIMetrics,
  FullAccessAuditResponse,
  LedgerIntegrityResponse,
} from './types';
import { SurfaceStat } from './ai-monitor-section-primitives';

interface LedgerIntegritySectionProps {
  ledgerIntegrity: LedgerIntegrityResponse;
}

export function LedgerIntegritySection({
  ledgerIntegrity,
}: LedgerIntegritySectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Ledger integrity
        </h3>
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
        <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">
          Full Access audit
        </h3>
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

interface ModelBreakdownSectionProps {
  metrics: AIMetrics;
}

export function ModelBreakdownSection({
  metrics,
}: ModelBreakdownSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
      <h3 className="mb-3 text-sm font-medium text-[var(--aethel-text-secondary)]">
        Uso por modelo
      </h3>
      <div className="flex flex-wrap gap-4">
        {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
          <div
            key={model}
            className="flex items-center gap-3 rounded-lg bg-[var(--aethel-surface-tertiary)] px-4 py-2"
          >
            <span className="text-sm font-medium text-[var(--aethel-text-primary)]">
              {model}
            </span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">
              {data.calls} chamadas
            </span>
            <span className="text-xs text-[var(--aethel-text-tertiary)]">
              ${data.cost.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

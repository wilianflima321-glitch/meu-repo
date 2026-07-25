'use client'

import type { ReceiptCompletenessReport } from '@/lib/production/agents-receipt-completeness'

interface ReceiptCompletenessStripProps {
  report: ReceiptCompletenessReport
  className?: string
}

/**
 * CW6 — compact receipt completeness chrome for Agents / Nexus.
 * Fail-closed: never implies supremacy when fields are missing/held.
 */
export function ReceiptCompletenessStrip({
  report,
  className,
}: ReceiptCompletenessStripProps) {
  const tone = report.complete
    ? 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]'
    : 'border-[var(--aethel-warning)]/40 text-[var(--aethel-warning-light)]'

  return (
    <div
      role="status"
      data-aethel-cw6="receipt-completeness"
      data-complete={report.complete ? '1' : '0'}
      className={
        className ??
        `mx-4 mb-2 rounded-md border px-2.5 py-1.5 text-[10px] ${tone} bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)]`
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
          Receipt
        </span>
        <span className="font-medium">{report.summary}</span>
        <span className="text-[var(--aethel-text-quaternary)]">
          {report.presentCount} ok · {report.missingCount} missing · {report.heldCount} held
        </span>
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-1">
        {report.fields.map((field) => (
          <li
            key={field.id}
            className={
              field.status === 'present'
                ? 'rounded border border-[var(--aethel-border-secondary)] px-1.5 py-0.5 text-[var(--aethel-text-tertiary)]'
                : field.status === 'held'
                  ? 'rounded border border-[var(--aethel-warning)]/35 px-1.5 py-0.5 text-[var(--aethel-warning-light)]'
                  : 'rounded border border-[var(--aethel-error)]/35 px-1.5 py-0.5 text-[var(--aethel-error-light)]'
            }
            title={field.status}
          >
            {field.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

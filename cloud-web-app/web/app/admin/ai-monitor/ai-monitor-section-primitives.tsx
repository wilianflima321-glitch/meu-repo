'use client';

import type { ReactNode } from 'react';

interface SurfaceStatProps {
  label: string;
  value: ReactNode;
}

export function SurfaceStat({ label, value }: SurfaceStatProps) {
  return (
    <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] p-3">
      <p className="text-[var(--aethel-text-tertiary)]">{label}</p>
      <p className="font-semibold text-[var(--aethel-text-primary)]">{value}</p>
    </div>
  );
}

interface InlineSummaryCardProps {
  accentClassName?: string;
  body: ReactNode;
  title: string;
}

export function InlineSummaryCard({
  accentClassName,
  body,
  title,
}: InlineSummaryCardProps) {
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

export function CountPillGroup({
  entries,
  limit = 6,
  title,
}: CountPillGroupProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
      <p className="mb-2 text-xs font-medium text-[var(--aethel-text-secondary)]">
        {title}
      </p>
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

'use client';

import { Bot, DollarSign, Gauge, ShieldAlert, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIMarginSnapshot {
  periodRevenue: number;
  periodAiCost: number;
  grossMarginAfterAi: number;
  grossMarginAfterAiPercent: number;
  aiCostRatio: number;
  avgAiCostPerCall: number;
  projectedMonthlyAiCost: number;
  highRiskModelCount: number;
  topRiskModel: string | null;
  status: 'healthy' | 'watch' | 'risk';
}

interface AIMarginSnapshotPanelProps {
  snapshot: AIMarginSnapshot;
}

const statusCopy: Record<AIMarginSnapshot['status'], { label: string; tone: string; icon: LucideIcon }> = {
  healthy: {
    label: 'Healthy',
    tone: 'text-[var(--aethel-success)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]',
    icon: ShieldCheck,
  },
  watch: {
    label: 'Watch',
    tone: 'text-[var(--aethel-warning)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
    icon: Gauge,
  },
  risk: {
    label: 'Risk',
    tone: 'text-[var(--aethel-error)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]',
    icon: ShieldAlert,
  },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function MetricPill({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_45%,transparent)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">{label}</span>
        <Icon className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
      </div>
      <div className="text-lg font-semibold text-[var(--aethel-text-primary)]">{value}</div>
      {subValue && <div className="mt-1 truncate text-xs text-[var(--aethel-text-tertiary)]">{subValue}</div>}
    </div>
  );
}

export function AIMarginSnapshotPanel({ snapshot }: AIMarginSnapshotPanelProps) {
  const status = statusCopy[snapshot.status];
  const StatusIcon = status.icon;

  return (
    <section className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 shadow-[var(--aethel-shadow-sm)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
            <Bot className="h-4 w-4 text-[var(--aethel-primary)]" />
            AI margin control
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            Revenue, token cost, and model concentration for this admin range.
          </p>
        </div>
        <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium', status.tone)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricPill
          icon={TrendingUp}
          label="After AI"
          value={formatCurrency(snapshot.grossMarginAfterAi)}
          subValue={`${snapshot.grossMarginAfterAiPercent.toFixed(1)}% gross margin`}
        />
        <MetricPill
          icon={Gauge}
          label="AI ratio"
          value={`${snapshot.aiCostRatio.toFixed(1)}%`}
          subValue={`${formatCurrency(snapshot.periodAiCost)} of ${formatCurrency(snapshot.periodRevenue)}`}
        />
        <MetricPill
          icon={DollarSign}
          label="Projected"
          value={formatCurrency(snapshot.projectedMonthlyAiCost)}
          subValue="30-day AI run-rate"
        />
        <MetricPill
          icon={Bot}
          label="Top model"
          value={snapshot.topRiskModel ?? 'No usage'}
          subValue={`${snapshot.highRiskModelCount} concentrated model${snapshot.highRiskModelCount === 1 ? '' : 's'}`}
        />
      </div>

      <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
        Avg AI cost/call: <span className="text-[var(--aethel-text-secondary)]">{formatCurrency(snapshot.avgAiCostPerCall)}</span>
      </div>
    </section>
  );
}

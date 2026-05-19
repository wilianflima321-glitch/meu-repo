'use client';

import { AlertTriangle, Bot, CheckCircle2, ShieldAlert, Sparkles, UserRound, Workflow, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIMarginRecommendation {
  id: string;
  priority: 'critical' | 'warning' | 'info';
  scope: 'global' | 'user' | 'workspace' | 'model';
  target: string;
  title: string;
  rationale: string;
  action: string;
  expectedImpact: string;
}

interface AIMarginRecommendationsPanelProps {
  recommendations: AIMarginRecommendation[];
}

const priorityStyles: Record<AIMarginRecommendation['priority'], { label: string; className: string; icon: LucideIcon }> = {
  critical: {
    label: 'Critical',
    className: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error)]',
    icon: ShieldAlert,
  },
  warning: {
    label: 'Watch',
    className: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning)]',
    icon: AlertTriangle,
  },
  info: {
    label: 'Healthy',
    className: 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success)]',
    icon: CheckCircle2,
  },
};

const scopeIcon: Record<AIMarginRecommendation['scope'], LucideIcon> = {
  global: Sparkles,
  user: UserRound,
  workspace: Workflow,
  model: Bot,
};

export function AIMarginRecommendationsPanel({ recommendations }: AIMarginRecommendationsPanelProps) {
  return (
    <section className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 shadow-[var(--aethel-shadow-sm)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--aethel-primary)]" />
            AI margin next actions
          </div>
          <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
            Operator recommendations generated from revenue, token cost, attribution, and model concentration.
          </p>
        </div>
        <span className="rounded-full border border-[var(--aethel-border-secondary)] px-3 py-1 text-xs text-[var(--aethel-text-tertiary)]">
          {recommendations.length} action{recommendations.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {recommendations.map((item) => {
          const PriorityIcon = priorityStyles[item.priority].icon;
          const ScopeIcon = scopeIcon[item.scope];

          return (
            <article key={item.id} className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_45%,transparent)] p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
                    <ScopeIcon className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-[var(--aethel-text-tertiary)]">{item.scope}: {item.target}</div>
                </div>
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]', priorityStyles[item.priority].className)}>
                  <PriorityIcon className="h-3 w-3" />
                  {priorityStyles[item.priority].label}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[var(--aethel-text-secondary)]">{item.rationale}</p>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Action</div>
                  <p className="text-[var(--aethel-text-primary)]">{item.action}</p>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Expected impact</div>
                  <p className="text-[var(--aethel-text-secondary)]">{item.expectedImpact}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

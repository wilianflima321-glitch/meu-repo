'use client';

import { AlertTriangle, FolderKanban, Gauge, UserRound, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AIMarginDrilldown {
  topUsers: Array<{
    userId: string;
    userEmail: string;
    plan: string;
    revenue: number;
    cost: number;
    marginAfterAi: number;
    aiCostRatio: number;
    calls: number;
    tokens: number;
    percentage: number;
    status: 'healthy' | 'watch' | 'risk';
  }>;
  topWorkspaces: Array<{
    workspaceId: string;
    cost: number;
    calls: number;
    tokens: number;
    percentage: number;
    topModel: string | null;
    status: 'healthy' | 'watch' | 'risk';
  }>;
}

interface AIMarginDrilldownPanelProps {
  drilldown: AIMarginDrilldown;
}

const statusTone: Record<'healthy' | 'watch' | 'risk', string> = {
  healthy: 'text-[var(--aethel-success)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]',
  watch: 'text-[var(--aethel-warning)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
  risk: 'text-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  });
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString('en-US');
}

function StatusBadge({ status }: { status: 'healthy' | 'watch' | 'risk' }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]', statusTone[status])}>
      {status}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
          <Icon className="h-4 w-4 text-[var(--aethel-primary)]" />
          {title}
        </div>
        <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--aethel-border-secondary)] p-4 text-center text-xs text-[var(--aethel-text-tertiary)]">
      {label}
    </div>
  );
}

export function AIMarginDrilldownPanel({ drilldown }: AIMarginDrilldownPanelProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 shadow-[var(--aethel-shadow-sm)]">
        <SectionHeader
          icon={UserRound}
          title="AI margin by user"
          subtitle="Find power users whose AI usage is ahead of revenue."
        />
        {drilldown.topUsers.length === 0 ? (
          <EmptyState label="No AI usage in this range." />
        ) : (
          <div className="space-y-2">
            {drilldown.topUsers.map((user) => (
              <div key={user.userId} className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_45%,transparent)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--aethel-text-primary)]">{user.userEmail}</div>
                    <div className="text-xs text-[var(--aethel-text-tertiary)]">{user.plan} · {user.calls} calls · {formatTokens(user.tokens)} tokens</div>
                  </div>
                  <StatusBadge status={user.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">Revenue</div>
                    <div className="font-medium text-[var(--aethel-text-primary)]">{formatCurrency(user.revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">AI cost</div>
                    <div className="font-medium text-[var(--aethel-warning)]">{formatCurrency(user.cost)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">After AI</div>
                    <div className={cn('font-medium', user.marginAfterAi >= 0 ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]')}>
                      {formatCurrency(user.marginAfterAi)}
                    </div>
                  </div>
                </div>
                {user.status !== 'healthy' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--aethel-warning)]">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {user.aiCostRatio.toFixed(1)}% of user revenue consumed by AI.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] p-4 shadow-[var(--aethel-shadow-sm)]">
        <SectionHeader
          icon={FolderKanban}
          title="AI margin by workspace"
          subtitle="Spot projects with concentrated or unattributed token spend."
        />
        {drilldown.topWorkspaces.length === 0 ? (
          <EmptyState label="No workspace AI usage in this range." />
        ) : (
          <div className="space-y-2">
            {drilldown.topWorkspaces.map((workspace) => (
              <div key={workspace.workspaceId} className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_45%,transparent)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-[var(--aethel-text-primary)]">{workspace.workspaceId}</div>
                    <div className="text-xs text-[var(--aethel-text-tertiary)]">{workspace.calls} calls · {formatTokens(workspace.tokens)} tokens</div>
                  </div>
                  <StatusBadge status={workspace.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">AI cost</div>
                    <div className="font-medium text-[var(--aethel-warning)]">{formatCurrency(workspace.cost)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">Share</div>
                    <div className="font-medium text-[var(--aethel-text-primary)]">{workspace.percentage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[var(--aethel-text-tertiary)]">Top model</div>
                    <div className="truncate font-medium text-[var(--aethel-text-primary)]">{workspace.topModel ?? 'none'}</div>
                  </div>
                </div>
                {workspace.workspaceId === 'unattributed' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--aethel-warning)]">
                    <Gauge className="h-3.5 w-3.5" />
                    Add project/workspace metadata to every AI ledger event.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

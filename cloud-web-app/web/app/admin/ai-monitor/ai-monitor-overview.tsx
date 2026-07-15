import React from 'react';
import {
  AlertTriangle,
  Brain,
  Clock,
  DollarSign,
  Filter,
  Pause,
  Play,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { OPENROUTER_MODEL_OPTIONS } from '@/lib/ai/openrouter-models';
import type { AIMetrics, CoreLoopMetricsWindow, EmergencyResponse } from './types';

interface MonitorHeroSectionProps {
  headerDescription: string;
  headerTitle: string;
  isPaused: boolean;
  isRunningDrill: boolean;
  isRunningProductionProbe: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void | Promise<unknown>;
  onRunCoreLoopDrill: () => void | Promise<unknown>;
  onRunProductionProbe: () => void | Promise<unknown>;
  onTogglePause: () => void;
  strategicGaps: string[];
}

export function MonitorHeroSection({
  headerDescription,
  headerTitle,
  isPaused,
  isRunningDrill,
  isRunningProductionProbe,
  lastUpdated,
  onRefresh,
  onRunCoreLoopDrill,
  onRunProductionProbe,
  onTogglePause,
  strategicGaps,
}: MonitorHeroSectionProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent))] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Monitor de agentes de IA
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">{headerTitle}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
              {headerDescription}
            </p>
            {lastUpdated && (
              <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
                Atualizado em {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTogglePause}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                isPaused
                  ? 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]'
                  : 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]'
              }`}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Retomar' : 'Pausar stream'}
            </button>
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)]"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => void onRunCoreLoopDrill()}
              disabled={isRunningDrill}
              aria-label="Executar drill do core loop"
              className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] px-3 py-1.5 text-[var(--aethel-info-light)] disabled:opacity-60"
            >
              <Zap className="h-4 w-4" />
              {isRunningDrill ? 'Rodando drill...' : 'Run Drill'}
            </button>
            <button
              type="button"
              onClick={() => void onRunProductionProbe()}
              disabled={isRunningProductionProbe}
              className="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] px-3 py-1.5 text-[var(--aethel-success)] disabled:opacity-60"
            >
              <Zap className="h-4 w-4" />
              {isRunningProductionProbe ? 'Rodando probe...' : 'Run Production Probe'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
          Proxima melhor acao
        </p>
        <div className="mt-4 space-y-3">
          {(strategicGaps.length > 0
            ? strategicGaps
            : ['Sem gap critico novo nesta leitura; priorize validacao E2E de preview, billing e onboarding real.']
          )
            .slice(0, 4)
            .map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-secondary)]"
              >
                {item}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

interface OperatorNoticeBannerProps {
  notice: { tone: 'success' | 'error'; text: string };
}

export function OperatorNoticeBanner({ notice }: OperatorNoticeBannerProps) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        notice.tone === 'success'
          ? 'border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
          : 'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
      }`}
    >
      {notice.text}
    </div>
  );
}

interface MonitorHighlightsSectionProps {
  coreLoopLatest: CoreLoopMetricsWindow | null;
  operatorBlockersCount: number;
}

export function MonitorHighlightsSection({
  coreLoopLatest,
  operatorBlockersCount,
}: MonitorHighlightsSectionProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        icon={Brain}
        label="Promotion blockers"
        value={`${operatorBlockersCount}`}
        subValue="Blockers agregados de readiness + dossier"
        trend={operatorBlockersCount === 0 ? 'up' : 'down'}
      />
      <AdminMetricCard
        icon={Zap}
        label="Sample size"
        value={`${coreLoopLatest?.metrics.sampleSize ?? 0}`}
        subValue="Runs do ultimo recorte operacional"
        trend={(coreLoopLatest?.metrics.sampleSize ?? 0) >= 100 ? 'up' : 'down'}
      />
      <AdminMetricCard
        icon={AlertTriangle}
        label="Workspace coverage"
        value={
          typeof coreLoopLatest?.metrics.workspaceCoverage === 'number'
            ? `${(coreLoopLatest.metrics.workspaceCoverage * 100).toFixed(1)}%`
            : 'n/a'
        }
        subValue="Prova fora de sandbox"
        trend={(coreLoopLatest?.metrics.workspaceCoverage ?? 0) > 0 ? 'up' : 'down'}
        trendTone="negative"
      />
      <AdminMetricCard
        icon={RefreshCw}
        label="Rollback evidence"
        value={`${coreLoopLatest?.metrics.rollbackSuccessCount ?? 0}`}
        subValue="Rollbacks confirmados no recorte atual"
        trend={(coreLoopLatest?.metrics.rollbackSuccessCount ?? 0) > 0 ? 'up' : 'down'}
        trendTone="negative"
      />
    </section>
  );
}

interface EmergencyBannerProps {
  emergencyState: EmergencyResponse['data'];
}

export function EmergencyBanner({ emergencyState }: EmergencyBannerProps) {
  if (!emergencyState || emergencyState.level === 'normal') {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-4 ${
        emergencyState.level === 'shutdown'
          ? 'border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)] bg-[var(--aethel-error)]/20'
          : 'border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--aethel-error)]" />
        <div>
          <p className="font-medium text-[var(--aethel-text-primary)]">
            Modo de emergencia: {String(emergencyState.level).toUpperCase()}
          </p>
          <p className="text-sm text-[var(--aethel-text-secondary)]">{emergencyState.reason}</p>
        </div>
      </div>
      <a
        href="/admin/security?legacy=emergency"
        className="rounded-lg bg-[var(--aethel-error-dark)] px-4 py-2 text-sm text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-error)]"
      >
        Gerenciar
      </a>
    </div>
  );
}

interface MetricsOverviewSectionProps {
  metrics: AIMetrics;
}

export function MetricsOverviewSection({ metrics }: MetricsOverviewSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AdminMetricCard icon={Brain} label="Total de chamadas (24h)" value={metrics.totalCalls.toLocaleString()} />
      <AdminMetricCard icon={Zap} label="Total de tokens" value={`${(metrics.totalTokens / 1000).toFixed(1)}K`} />
      <AdminMetricCard icon={DollarSign} label="Cost total" value={`$${metrics.totalCost.toFixed(2)}`} alert={metrics.totalCost > 50} />
      <AdminMetricCard icon={Clock} label="Latencia media" value={`${metrics.avgLatency}ms`} alert={metrics.avgLatency > 3000} />
      <AdminMetricCard icon={AlertTriangle} label="Error rate" value={`${(metrics.errorRate * 100).toFixed(1)}%`} alert={metrics.errorRate > 0.05} />
    </div>
  );
}

interface MonitorFiltersBarProps {
  modelFilter: string;
  onModelFilterChange: (value: string) => void;
  onRunSampleClassChange: (value: 'all' | 'production' | 'rehearsal') => void;
  onStatusFilterChange: (value: string) => void;
  runSampleClass: 'all' | 'production' | 'rehearsal';
  statusFilter: string;
}

export function MonitorFiltersBar({
  modelFilter,
  onModelFilterChange,
  onRunSampleClassChange,
  onStatusFilterChange,
  runSampleClass,
  statusFilter,
}: MonitorFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
        <span className="text-sm text-[var(--aethel-text-tertiary)]">Filtros:</span>
      </div>

      <select
        value={modelFilter}
        onChange={(event) => onModelFilterChange(event.target.value)}
        className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
      >
        <option value="all">Todos os modelos</option>
        {OPENROUTER_MODEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
      >
        <option value="all">Todos os status</option>
        <option value="success">Sucesso</option>
        <option value="error">Error</option>
        <option value="timeout">Tempo esgotado</option>
      </select>

      <select
        value={runSampleClass}
        onChange={(event) => onRunSampleClassChange(event.target.value as 'all' | 'production' | 'rehearsal')}
        className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-primary)]"
      >
        <option value="production">Runs: Production</option>
        <option value="rehearsal">Runs: Rehearsal</option>
        <option value="all">Runs: All</option>
      </select>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Eye,
  EyeOff,
  Filter,
  Pause,
  Play,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getToken } from '@/lib/auth';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { OPENROUTER_MODEL_OPTIONS } from '@/lib/ai/openrouter-models';
import type {
  AICall,
  AICallsResponse,
  L4ReadinessDossierResponse,
  AIMetrics,
  AIMetricsResponse,
  AIReadiness,
  ChangeRunGroup,
  ChangeRunSummary,
  ChangeRunsResponse,
  CoreLoopDrillResponse,
  CoreLoopMetricsResponse,
  CoreLoopMetricsWindow,
  CoreLoopPromotionResponse,
  EmergencyResponse,
  FullAccessAuditResponse,
  LedgerIntegrityResponse,
  ProductionProbeResponse,
} from './types';

async function fetchWithAuth<T>(url: string): Promise<T> {
  const token = getToken();
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
  }

  return payload;
}

function AICallRow({
  call,
  expanded,
  onToggle,
}: {
  call: AICall;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);

  const statusColors = {
    success: 'text-[var(--aethel-success)]',
    error: 'text-[var(--aethel-error)]',
    timeout: 'text-[var(--aethel-warning)]',
  } as const;

  const getModelBadgeClass = (modelId: string) => {
    const value = modelId || '';
    if (value.includes('gpt-5.4-pro') || value.includes('gpt-5-pro')) {
      return 'bg-[var(--aethel-warning)]/20 text-[var(--aethel-warning)]';
    }
    if (value.includes('gpt-5.4') || value.includes('gpt-5')) {
      return 'bg-[var(--aethel-primary)]/20 text-[var(--aethel-primary-light)]';
    }
    if (value.includes('codex')) {
      return 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info)]';
    }
    if (value.includes('claude')) {
      return 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]';
    }
    if (value.includes('gemini')) {
      return 'bg-[color-mix(in_srgb,var(--aethel-primary-dark)_20%,transparent)] text-[var(--aethel-primary-light)]';
    }
    if (value.includes('o3') || value.includes('o4')) {
      return 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]';
    }
    return 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]';
  };

  return (
    <div className="border-b border-[var(--aethel-border-primary)] last:border-0">
      <div className="flex items-center gap-4 p-3 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] cursor-pointer" onClick={onToggle}>
        <button className="text-[var(--aethel-text-tertiary)]" type="button" aria-label="Expand call row">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <span className={`text-xs ${statusColors[call.status]}`} aria-label={`status-${call.status}`}>
          ●
        </span>

        <span className="text-xs text-[var(--aethel-text-tertiary)] w-20">{new Date(call.timestamp).toLocaleTimeString()}</span>

        <span className={`text-xs px-2 py-0.5 rounded ${getModelBadgeClass(call.model)}`}>
          {call.model}
        </span>

        <span className="text-sm text-[var(--aethel-text-secondary)] truncate flex-1">{call.userEmail}</span>

        <span className="text-xs text-[var(--aethel-text-tertiary)] w-24 text-right">{call.inputTokens + call.outputTokens} tokens</span>
        <span className="text-xs text-[var(--aethel-text-tertiary)] w-20 text-right">{call.latencyMs}ms</span>

        <span className={`text-xs font-mono w-16 text-right ${call.cost > 0.01 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-text-tertiary)]'}`}>
          ${call.cost.toFixed(4)}
        </span>
      </div>

      {expanded && (
        <div className="px-10 pb-4 space-y-3 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
          <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
            <span>User: {call.userId}</span>
            <span>Operation: {call.operation}</span>
            {call.projectId && <span>Project: {call.projectId}</span>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">Prompt ({call.inputTokens} tokens)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowPrompt((prev) => !prev);
                  }}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                >
                  {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigator.clipboard.writeText(call.prompt);
                  }}
                  className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <pre
              className={`
                text-xs bg-[var(--aethel-surface-primary)] rounded p-2 overflow-auto max-h-40
                ${showPrompt ? 'text-[var(--aethel-text-secondary)]' : 'text-[var(--aethel-text-tertiary)] blur-sm select-none'}
              `}
            >
              {call.prompt.slice(0, 500)}
              {call.prompt.length > 500 && '...'}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--aethel-text-secondary)]">Response ({call.outputTokens} tokens)</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard.writeText(call.response);
                }}
                className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs bg-[var(--aethel-surface-primary)] rounded p-2 text-[var(--aethel-text-secondary)] overflow-auto max-h-40">
              {call.response.slice(0, 500)}
              {call.response.length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AgentMonitorPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRunningDrill, setIsRunningDrill] = useState(false);
  const [isRunningProductionProbe, setIsRunningProductionProbe] = useState(false);
  const [operatorNotice, setOperatorNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [runSampleClass, setRunSampleClass] = useState<'all' | 'production' | 'rehearsal'>('production');

  const { data: metricsData } = useSWR<AIMetricsResponse>('/api/admin/ai/metrics', fetchWithAuth, {
    refreshInterval: isPaused ? 0 : 10000,
  });

  const { data: readinessData, mutate: refreshReadiness } = useSWR<AIReadiness>('/api/admin/ai/readiness', fetchWithAuth, {
    refreshInterval: isPaused ? 0 : 15000,
  });
  const { data: coreLoopMetricsData, mutate: refreshCoreLoopMetrics } = useSWR<CoreLoopMetricsResponse>(
    '/api/admin/ai/core-loop-metrics',
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 15000,
    }
  );
  const { data: ledgerIntegrityData, mutate: refreshLedgerIntegrity } = useSWR<LedgerIntegrityResponse>(
    '/api/admin/ai/ledger-integrity?days=30',
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 15000,
    }
  );
  const { data: promotionData, mutate: refreshPromotion } = useSWR<CoreLoopPromotionResponse>(
    '/api/admin/ai/core-loop-promotion',
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 15000,
    }
  );
  const { data: fullAccessAuditData, mutate: refreshFullAccessAudit } = useSWR<FullAccessAuditResponse>(
    '/api/admin/ai/full-access?includeInactive=true',
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 15000,
    }
  );
  const { data: dossierData, mutate: refreshDossier } = useSWR<L4ReadinessDossierResponse>(
    '/api/admin/ai/l4-readiness-dossier',
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 20000,
    }
  );

  const { data: callsData, mutate: refreshCalls } = useSWR<AICallsResponse>(
    `/api/admin/ai/calls?limit=50&model=${modelFilter}&status=${statusFilter}`,
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 5000,
    }
  );

  const { data: emergencyData } = useSWR<EmergencyResponse>('/api/admin/emergency', fetchWithAuth, {
    refreshInterval: isPaused ? 0 : 10000,
  });
  const { data: runsData, mutate: refreshRuns } = useSWR<ChangeRunsResponse>(
    `/api/ai/change/runs?hours=72&limit=120&sampleClass=${runSampleClass}`,
    fetchWithAuth,
    {
      refreshInterval: isPaused ? 0 : 15000,
    }
  );

  const metrics: AIMetrics | null = metricsData?.metrics || null;
  const calls: AICall[] = callsData?.calls || [];
  const readiness: AIReadiness | null = readinessData || null;
  const coreLoopLatest = coreLoopMetricsData?.latest || null;
  const coreLoopTrend = coreLoopMetricsData?.trend || null;
  const reasonPlaybook = coreLoopMetricsData?.reasonPlaybook || [];
  const ledgerIntegrity = ledgerIntegrityData || null;
  const dossier = dossierData || null;
  const emergencyState = emergencyData?.data;
  const runSummary = runsData?.metadata?.summary || null;
  const runSummaryAll = runsData?.metadata?.summaryAll || null;
  const runGroups = runsData?.metadata?.runGroups || [];
  const unmetDossierCriteria = dossier?.exitCriteria
    ? Object.entries(dossier.exitCriteria).filter(([, criterion]) => criterion && criterion.met === false)
    : [];
  const operatorBlockers = Array.from(
    new Set([
      ...(readiness?.blockers || []),
      ...(promotionData?.blockers || []),
      ...(dossier?.blockers || []),
    ])
  );
  const strategicGaps = [
    coreLoopLatest?.metrics.workspaceCoverage === 0
      ? 'Workspace coverage continua zerado: a prova atual ainda depende demais de sandbox.'
      : null,
    (coreLoopLatest?.metrics.rollbackSuccessCount || 0) === 0
      ? 'Rollback ainda sem evidencia suficiente para sustentar narrativa forte de recuperacao.'
      : null,
    readiness?.runtimeReadiness && !readiness.runtimeReadiness.probeReady
      ? 'Production runtime preflight segue bloqueado por ambiente ou credenciais.'
      : null,
    operatorBlockers.length > 0
      ? `Existem ${operatorBlockers.length} blockers ativos impedindo promotion completa do core loop.`
      : null,
  ].filter(Boolean) as string[];
  const headerTone =
    emergencyState && emergencyState.level !== 'normal'
      ? 'emergency'
      : operatorBlockers.length > 0 || strategicGaps.length > 0
        ? 'partial'
        : 'healthy';
  const headerTitle =
    headerTone === 'healthy'
      ? 'Core loop monitorado com sinais fortes'
      : headerTone === 'emergency'
        ? 'Monitor em estado de emergencia operacional'
        : 'Monitor ainda com lacunas para narrativa L4 forte';
  const headerDescription =
    headerTone === 'healthy'
      ? 'A superficie esta organizada para operar, revisar custo, readiness e evidencia de producao com mais clareza.'
      : headerTone === 'emergency'
        ? 'Antes de qualquer refinamento, precisamos estabilizar o modo de emergencia e preservar governanca operacional.'
        : 'A base esta viva, mas preview, rollback, workspace coverage e runtime preflight ainda impedem um discurso de confiabilidade completa.';

  React.useEffect(() => {
    if (metrics || calls.length > 0) {
      setLastUpdated(new Date());
    }
  }, [metrics, calls.length]);

  const runCoreLoopDrill = React.useCallback(async () => {
    try {
      setIsRunningDrill(true);
      setOperatorNotice(null);
      const token = getToken();
      const response = await fetch('/api/admin/ai/core-loop-drill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ runs: 12 }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
      }
      const payload = (await response.json().catch(() => ({}))) as CoreLoopDrillResponse;
      await Promise.all([
        refreshCalls(),
        refreshPromotion(),
        refreshReadiness(),
        refreshCoreLoopMetrics(),
        refreshLedgerIntegrity(),
        refreshDossier(),
        refreshFullAccessAudit(),
        refreshRuns(),
      ]);
      const runs = payload?.totals?.runs || 0;
      const applySuccess = payload?.totals?.applySuccess || 0;
      const applyBlocked = payload?.totals?.applyBlocked || 0;
      setOperatorNotice({
        tone: 'success',
        text: `Drill concluido: runs=${runs}, success=${applySuccess}, blocked=${applyBlocked}.`,
      });
    } catch (error) {
      console.error('[ai-monitor] core loop drill failed', error);
      setOperatorNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha ao executar core-loop drill.',
      });
    } finally {
      setIsRunningDrill(false);
    }
  }, [refreshCalls, refreshPromotion, refreshReadiness, refreshCoreLoopMetrics, refreshLedgerIntegrity, refreshDossier, refreshFullAccessAudit, refreshRuns]);

  const runProductionProbe = React.useCallback(async () => {
    try {
      setIsRunningProductionProbe(true);
      setOperatorNotice(null);
      const token = getToken();
      const response = await fetch('/api/admin/ai/core-loop-production-probe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ runs: 6 }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
        throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
      }
      const payload = (await response.json().catch(() => ({}))) as ProductionProbeResponse;
      await Promise.all([
        refreshCalls(),
        refreshPromotion(),
        refreshReadiness(),
        refreshCoreLoopMetrics(),
        refreshLedgerIntegrity(),
        refreshDossier(),
        refreshFullAccessAudit(),
        refreshRuns(),
      ]);
      const runs = payload?.metadata?.runs || 0;
      const applySuccess = payload?.metadata?.totals?.applySuccess || 0;
      const applyBlocked = payload?.metadata?.totals?.applyBlocked || 0;
      const applyFailed = payload?.metadata?.totals?.applyFailed || 0;
      const selectedFile = payload?.metadata?.selectedFile || 'n/a';
      setOperatorNotice({
        tone: 'success',
        text: `Production probe concluido: runs=${runs}, success=${applySuccess}, blocked=${applyBlocked}, failed=${applyFailed}, file=${selectedFile}.`,
      });
    } catch (error) {
      console.error('[ai-monitor] production probe failed', error);
      setOperatorNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha ao executar production probe.',
      });
    } finally {
      setIsRunningProductionProbe(false);
    }
  }, [refreshCalls, refreshPromotion, refreshReadiness, refreshCoreLoopMetrics, refreshLedgerIntegrity, refreshDossier, refreshFullAccessAudit, refreshRuns]);

  return (
    <div className="p-6 space-y-6">
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
              <button type="button"
                onClick={() => setIsPaused((prev) => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                  isPaused ? 'border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]' : 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/10 text-[var(--aethel-success)]'
                }`}
                type="button"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {isPaused ? 'Retomar' : 'Pausar stream'}
              </button>
              <button type="button"
                onClick={() => void refreshCalls()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--aethel-border-secondary)] text-[var(--aethel-text-secondary)]"
                type="button"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <button type="button"
                onClick={() => void runCoreLoopDrill()}
                disabled={isRunningDrill}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] text-[var(--aethel-info-light)] disabled:opacity-60"
                type="button"
              >
                <Zap className="w-4 h-4" />
                {isRunningDrill ? 'Rodando drill...' : 'Run Drill'}
              </button>
              <button type="button"
                onClick={() => void runProductionProbe()}
                disabled={isRunningProductionProbe}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] text-[var(--aethel-success)] disabled:opacity-60"
                type="button"
              >
                <Zap className="w-4 h-4" />
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

      {operatorNotice && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            operatorNotice.tone === 'success'
              ? 'border-[color-mix(in_srgb,var(--aethel-success)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
              : 'border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
          }`}
        >
          {operatorNotice.text}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={Brain}
          label="Promotion blockers"
          value={`${operatorBlockers.length}`}
          subValue="Blockers agregados de readiness + dossier"
          trend={operatorBlockers.length === 0 ? 'up' : 'down'}
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

      {emergencyState && emergencyState.level !== 'normal' && (
        <div
          className={`
            flex items-center justify-between p-4 rounded-xl border
            ${
              emergencyState.level === 'shutdown'
                ? 'bg-[var(--aethel-error)]/20 border-[color-mix(in_srgb,var(--aethel-error)_50%,transparent)]'
                : emergencyState.level === 'critical'
                  ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]'
                  : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_50%,transparent)]'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--aethel-error)]" />
            <div>
              <p className="font-medium text-[var(--aethel-text-primary)]">Modo de emergencia: {String(emergencyState.level).toUpperCase()}</p>
              <p className="text-sm text-[var(--aethel-text-secondary)]">{emergencyState.reason}</p>
            </div>
          </div>
          <a href="/admin/emergency" className="px-4 py-2 bg-[var(--aethel-error-dark)] hover:bg-[var(--aethel-error)] rounded-lg text-sm text-[var(--aethel-text-primary)]">
            Gerenciar
          </a>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <AdminMetricCard icon={Brain} label="Total de chamadas (24h)" value={metrics.totalCalls.toLocaleString()} />
          <AdminMetricCard icon={Zap} label="Total de tokens" value={`${(metrics.totalTokens / 1000).toFixed(1)}K`} />
          <AdminMetricCard icon={DollarSign} label="Custo total" value={`$${metrics.totalCost.toFixed(2)}`} alert={metrics.totalCost > 50} />
          <AdminMetricCard icon={Clock} label="Latencia media" value={`${metrics.avgLatency}ms`} alert={metrics.avgLatency > 3000} />
          <AdminMetricCard icon={AlertTriangle} label="Taxa de erro" value={`${(metrics.errorRate * 100).toFixed(1)}%`} alert={metrics.errorRate > 0.05} />
        </div>
      )}

      {readiness && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Core Loop Readiness (L4 gate)</h3>
            <span
              className={`text-xs px-2 py-1 rounded ${
                readiness.promotionEligible ? 'bg-[var(--aethel-success)]/20 text-[var(--aethel-success-light)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
              }`}
            >
              {readiness.promotionEligible ? 'PROMOTION ELIGIBLE' : 'PARTIAL'}
            </span>
          </div>
          {readiness.samplePolicy && (
            <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">Policy: {readiness.samplePolicy}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Success Rate</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{(readiness.metrics.applySuccessRate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Regression Rate</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{(readiness.metrics.regressionRate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Sandbox Coverage</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{(readiness.metrics.sandboxCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Learn Coverage</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">
                {((readiness.metrics.learnFeedbackCoverage || 0) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Sample Size</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{readiness.metrics.sampleSize}</p>
            </div>
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
              <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">.env.local</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.envLocalPresent ? 'present' : 'missing'}</p>
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">Database</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.databaseConfigured ? 'configured' : 'missing'}</p>
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">DB reachability</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">
                    {readiness.runtimeReadiness.databaseReachable ? 'reachable' : 'unreachable'}
                  </p>
                  {readiness.runtimeReadiness.databaseTarget && (
                    <p className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">{readiness.runtimeReadiness.databaseTarget}</p>
                  )}
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">App runtime</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">
                    {readiness.runtimeReadiness.appRuntimeReachable ? 'reachable' : 'unreachable'}
                  </p>
                  {readiness.runtimeReadiness.appBaseUrl && (
                    <p className="mt-1 text-[10px] text-[var(--aethel-text-tertiary)]">{readiness.runtimeReadiness.appBaseUrl}</p>
                  )}
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">JWT</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.jwtConfigured ? 'configured' : 'missing'}</p>
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">CSRF</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.csrfConfigured ? 'configured' : 'missing'}</p>
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">Docker CLI</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.dockerCliPresent ? 'present' : 'missing'}</p>
                </div>
                <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-2">
                  <p className="text-[var(--aethel-text-tertiary)]">Docker daemon</p>
                  <p className="mt-1 text-[var(--aethel-text-secondary)]">{readiness.runtimeReadiness.dockerDaemonReady ? 'ready' : 'blocked'}</p>
                </div>
              </div>
              <p className="mt-2 text-[var(--aethel-text-tertiary)]">
                authReady={String(readiness.runtimeReadiness.authReady)} | probeReady={String(readiness.runtimeReadiness.probeReady)}
              </p>
              {readiness.runtimeReadiness.blockers.length > 0 && (
                <ul className="mt-2 list-disc pl-4 space-y-1 text-[var(--aethel-warning-light)]">
                  {readiness.runtimeReadiness.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              )}
              {readiness.runtimeReadiness.instructions.length > 0 && (
                <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] p-3">
                    <p className="font-medium text-[var(--aethel-text-secondary)]">Proximas acoes</p>
                  <ul className="mt-2 list-disc pl-4 space-y-1 text-[var(--aethel-text-secondary)]">
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
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {readiness.metricsAll && (
                <div className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
                  <p className="text-[var(--aethel-text-secondary)]">All samples</p>
                  <p className="text-[var(--aethel-text-secondary)] mt-1">
                    sample={readiness.metricsAll.sampleSize} | success={(readiness.metricsAll.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {readiness.rehearsalMetrics && (
                <div className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3">
                  <p className="text-[var(--aethel-info-light)]">Rehearsal samples</p>
                  <p className="text-[var(--aethel-info-light)] mt-1">
                    sample={readiness.rehearsalMetrics.sampleSize} | success={(readiness.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
          {readiness.blockers && readiness.blockers.length > 0 && (
            <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]">
              <p className="font-medium mb-1">Promotion blockers</p>
              <ul className="list-disc pl-4 space-y-1">
                {readiness.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}
          {readiness.windows && readiness.windows.length > 0 && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              {readiness.windows.map((window) => (
                <div key={window.hours} className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_40%,transparent)] p-3 text-xs">
                  <p className="text-[var(--aethel-text-secondary)]">Window {window.hours}h</p>
                  <p className="text-[var(--aethel-text-secondary)] mt-1">Success: {(window.metrics.applySuccessRate * 100).toFixed(1)}%</p>
                  <p className="text-[var(--aethel-text-secondary)]">Regression: {(window.metrics.regressionRate * 100).toFixed(1)}%</p>
                  <p className="text-[var(--aethel-text-secondary)]">Sandbox: {(window.metrics.sandboxCoverage * 100).toFixed(1)}%</p>
                  <p className="text-[var(--aethel-text-secondary)]">Learn: {((window.metrics.learnFeedbackCoverage || 0) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {promotionData && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Promotion Verdict (Policy Scope)</h3>
            <span
              className={`rounded px-2 py-1 text-xs ${
                promotionData.promotionEligible
                  ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]'
                  : 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
              }`}
            >
              {promotionData.promotionEligible ? 'ELIGIBLE' : 'BLOCKED'}
            </span>
          </div>
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Policy: {promotionData.samplePolicy}</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
              <p className="text-[var(--aethel-text-secondary)]">Production</p>
              <p className="text-[var(--aethel-text-secondary)] mt-1">
                sample={promotionData.production.sampleSize} | success={(promotionData.production.applySuccessRate * 100).toFixed(1)}% | regression={(promotionData.production.regressionRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3">
              <p className="text-[var(--aethel-info-light)]">Rehearsal</p>
              <p className="text-[var(--aethel-info-light)] mt-1">
                sample={promotionData.rehearsal.sampleSize} | success={(promotionData.rehearsal.applySuccessRate * 100).toFixed(1)}% | regression={(promotionData.rehearsal.regressionRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          {promotionData.blockers.length > 0 && (
            <ul className="mt-3 list-disc pl-4 text-xs text-[var(--aethel-error-light)] space-y-1">
              {promotionData.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {dossier && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
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

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
            <div className="rounded p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
              <p className="text-[var(--aethel-text-tertiary)]">Production sample</p>
              <p className="font-semibold text-[var(--aethel-text-primary)]">{dossier.metrics?.production?.sampleSize ?? 0}</p>
            </div>
            <div className="rounded p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
              <p className="text-[var(--aethel-text-tertiary)]">Success rate</p>
              <p className="font-semibold text-[var(--aethel-text-primary)]">
                {typeof dossier.metrics?.production?.successRate === 'number'
                  ? `${(dossier.metrics.production.successRate * 100).toFixed(1)}%`
                  : 'n/a'}
              </p>
            </div>
            <div className="rounded p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
              <p className="text-[var(--aethel-text-tertiary)]">Feedback coverage</p>
              <p className="font-semibold text-[var(--aethel-text-primary)]">
                {typeof dossier.metrics?.production?.feedbackCoverage === 'number'
                  ? `${(dossier.metrics.production.feedbackCoverage * 100).toFixed(1)}%`
                  : 'n/a'}
              </p>
            </div>
            <div className="rounded p-3 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)]">
              <p className="text-[var(--aethel-text-tertiary)]">Overall score</p>
              <p className="font-semibold text-[var(--aethel-text-primary)]">
                {typeof dossier.scores?.overall === 'number' ? dossier.scores.overall.toFixed(1) : 'n/a'}
              </p>
            </div>
          </div>

          {unmetDossierCriteria.length > 0 && (
            <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3">
              <p className="mb-2 text-xs font-medium text-[var(--aethel-warning-light)]">Criteria still not met</p>
              <div className="space-y-2 text-xs text-[var(--aethel-text-secondary)]">
                {unmetDossierCriteria.slice(0, 6).map(([key, criterion]) => (
                  <div key={key} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-primary)_50%,transparent)] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-[var(--aethel-text-primary)]">{key}</span>
                      <span>target={String(criterion.target)} | actual={String(criterion.actual)}</span>
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
      )}

      {coreLoopLatest && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Core-loop Operational Metrics (7d)</h3>
            <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
              {coreLoopMetricsData?.capabilityStatus || 'PARTIAL'}
            </span>
          </div>
          {coreLoopMetricsData?.samplePolicy && (
            <p className="mb-3 text-xs text-[var(--aethel-text-tertiary)]">Policy: {coreLoopMetricsData.samplePolicy}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Apply runs</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{coreLoopLatest.metrics.sampleSize}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Successful applies</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{coreLoopLatest.metrics.successfulApplyRuns}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Failed applies</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{coreLoopLatest.metrics.failedApplyRuns}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Blocked applies</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{coreLoopLatest.metrics.blockedApplyRuns}</p>
            </div>
          </div>
          {(coreLoopLatest.metricsAll || coreLoopLatest.rehearsalMetrics) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {coreLoopLatest.metricsAll && (
                <div className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
                  <p className="text-[var(--aethel-text-secondary)]">All samples</p>
                  <p className="text-[var(--aethel-text-secondary)] mt-1">
                    sample={coreLoopLatest.metricsAll.sampleSize} | success={(coreLoopLatest.metricsAll.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {coreLoopLatest.rehearsalMetrics && (
                <div className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3">
                  <p className="text-[var(--aethel-info-light)]">Rehearsal samples</p>
                  <p className="text-[var(--aethel-info-light)] mt-1">
                    sample={coreLoopLatest.rehearsalMetrics.sampleSize} | success={(coreLoopLatest.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
          {coreLoopTrend && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3 text-xs">
              <p className="text-[var(--aethel-text-secondary)] font-medium mb-2">Trend (7d vs 30d baseline)</p>
              <div className="flex flex-wrap gap-2 text-[var(--aethel-text-secondary)]">
                <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">sample: {coreLoopTrend.sampleSize}</span>
                <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">success: {coreLoopTrend.applySuccessRate}</span>
                <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">regression: {coreLoopTrend.regressionRate}</span>
                <span className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1">sandbox: {coreLoopTrend.sandboxCoverage}</span>
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">
            Last event: {coreLoopLatest.lastEventAt ? new Date(coreLoopLatest.lastEventAt).toLocaleString() : 'none'}
          </div>
          {coreLoopLatest.metrics.sampleSize === 0 && (
            <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]">
              No apply-run evidence in this window. L4 promotion remains evidence-blocked.
            </div>
          )}
          {coreLoopLatest.metrics.sampleSize === 0 &&
            (coreLoopLatest.rehearsalMetrics?.sampleSize || 0) > 0 && (
              <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] p-3 text-xs text-[var(--aethel-info-light)]">
                Rehearsal evidence exists, but production evidence is still zero. Promotion remains blocked by policy.
              </div>
            )}
          {Object.keys(coreLoopLatest.reasonCounts).length > 0 && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-2">Top block/failure reasons</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.reasonCounts)
                  .slice(0, 6)
                  .map(([reason, count]) => (
                    <span key={reason} className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[var(--aethel-text-secondary)]">
                      {reason}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.keys(coreLoopLatest.riskCounts).length > 0 && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-2">Dependency risk distribution</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.riskCounts)
                  .slice(0, 6)
                  .map(([risk, count]) => (
                    <span key={risk} className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[var(--aethel-text-secondary)]">
                      {risk}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.keys(coreLoopLatest.impactedEndpointCounts).length > 0 && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-2">Most impacted API surfaces</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.impactedEndpointCounts)
                  .slice(0, 8)
                  .map(([endpoint, count]) => (
                    <span key={endpoint} className="rounded bg-[var(--aethel-surface-tertiary)] px-2 py-1 text-[var(--aethel-text-secondary)]">
                      {endpoint}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {coreLoopLatest.recommendations.length > 0 && (
            <div className="mt-3 rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)]/30 p-3">
              <p className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-2">Learning recommendations</p>
              <ul className="space-y-1 text-xs">
                {coreLoopLatest.recommendations.map((recommendation) => (
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
              <p className="text-xs font-medium text-[var(--aethel-text-secondary)] mb-2">Reason playbook</p>
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
      )}

      {ledgerIntegrity && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">files</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{ledgerIntegrity.report.filesChecked}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">rows</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{ledgerIntegrity.report.rowsChecked}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">valid</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{ledgerIntegrity.report.validRows}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">legacy</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{ledgerIntegrity.report.legacyRows}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">invalid</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{ledgerIntegrity.report.invalidRows}</p>
            </div>
          </div>
          {ledgerIntegrity.report.invalidRows > 0 && (
            <div className="mt-3 rounded border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-xs text-[var(--aethel-error-light)]">
              <p className="font-medium mb-2">First integrity issues</p>
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
      )}

      {fullAccessAuditData && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Full Access audit</h3>
            <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
              {fullAccessAuditData.capabilityStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">total</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{fullAccessAuditData.summary.total}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">active</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{fullAccessAuditData.summary.active}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">revoked</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{fullAccessAuditData.summary.revoked}</p>
            </div>
            <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] rounded p-3">
              <p className="text-[var(--aethel-text-tertiary)]">expired</p>
              <p className="text-[var(--aethel-text-primary)] font-semibold">{fullAccessAuditData.summary.expired}</p>
            </div>
          </div>
        </div>
      )}

      {runSummary && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)]">Apply/Rollback Ledger (72h)</h3>
            <span className="rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_60%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
              capability: {runsData?.capabilityStatus || 'PARTIAL'}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-[var(--aethel-text-tertiary)]">
            <span>sampleClass: {runsData?.metadata?.sampleClass || runSampleClass}</span>
            {runSummaryAll && (
              <span>
                all.apply={runSummaryAll.apply} all.blocked={runSummaryAll.applyBlocked} all.rollback={runSummaryAll.rollback}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 text-xs">
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Apply success rate</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{(runSummary.applySuccessRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Blocked rate</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{(runSummary.blockedRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Regression rate</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{(runSummary.regressionRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Sandbox coverage</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{(runSummary.sandboxCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Workspace coverage</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{(runSummary.workspaceCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] p-3">
              <p className="text-[var(--aethel-text-tertiary)]">Events tracked</p>
              <p className="text-[var(--aethel-text-primary)] text-lg font-semibold">{runSummary.total}</p>
            </div>
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
                    <tr key={group.runId} className="border-b border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]">
                      <td className="px-2 py-1 font-mono text-[var(--aethel-text-secondary)]">{group.runId}</td>
                      <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.eventCount}</td>
                      <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">
                        {new Date(group.firstAt || group.firstTimestamp || '').toLocaleTimeString()} - {new Date(group.lastAt || group.lastTimestamp || '').toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.eventTypes.join(', ')}</td>
                      <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{group.outcomes.join(', ')}</td>
                      <td className="px-2 py-1 text-[var(--aethel-text-secondary)]">{(group.paths || group.files || []).slice(0, 2).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {metrics?.modelBreakdown && (
        <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] p-4">
          <h3 className="text-sm font-medium text-[var(--aethel-text-secondary)] mb-3">Uso por modelo</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
              <div key={model} className="flex items-center gap-3 px-4 py-2 bg-[var(--aethel-surface-tertiary)] rounded-lg">
                <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{model}</span>
                <span className="text-xs text-[var(--aethel-text-tertiary)]">{data.calls} chamadas</span>
                <span className="text-xs text-[var(--aethel-text-tertiary)]">${data.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
          <span className="text-sm text-[var(--aethel-text-tertiary)]">Filtros:</span>
        </div>

        <select
          value={modelFilter}
          onChange={(event) => setModelFilter(event.target.value)}
          className="px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg text-sm text-[var(--aethel-text-primary)]"
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
          onChange={(event) => setStatusFilter(event.target.value)}
          className="px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg text-sm text-[var(--aethel-text-primary)]"
        >
          <option value="all">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="error">Erro</option>
          <option value="timeout">Tempo esgotado</option>
        </select>

        <select
          value={runSampleClass}
          onChange={(event) => setRunSampleClass(event.target.value as 'all' | 'production' | 'rehearsal')}
          className="px-3 py-1.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded-lg text-sm text-[var(--aethel-text-primary)]"
        >
          <option value="production">Runs: Production</option>
          <option value="rehearsal">Runs: Rehearsal</option>
          <option value="all">Runs: All</option>
        </select>
      </div>

      <div className="bg-[var(--aethel-surface-secondary)] rounded-xl border border-[var(--aethel-border-primary)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aethel-border-primary)]">
          <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">Chamadas recentes de IA</h3>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{calls.length} chamadas</span>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] text-xs text-[var(--aethel-text-tertiary)] font-medium">
          <span className="w-8"></span>
          <span className="w-4"></span>
          <span className="w-20">Hora</span>
          <span className="w-32">Modelo</span>
          <span className="flex-1">Usuario</span>
          <span className="w-24 text-right">Tokens</span>
          <span className="w-20 text-right">Latencia</span>
          <span className="w-16 text-right">Custo</span>
        </div>

        <div className="max-h-[500px] overflow-auto">
          {calls.map((call) => (
            <AICallRow
              key={call.id}
              call={call}
              expanded={expandedId === call.id}
              onToggle={() => setExpandedId(expandedId === call.id ? null : call.id)}
            />
          ))}

          {calls.length === 0 && (
            <div className="p-8 text-center text-[var(--aethel-text-tertiary)]">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chamada de IA no periodo selecionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

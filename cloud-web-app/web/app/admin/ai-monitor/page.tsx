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
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getToken } from '@/lib/auth';

type AICall = {
  id: string;
  userId: string;
  userEmail: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  status: 'success' | 'error' | 'timeout';
  prompt: string;
  response: string;
  timestamp: string;
  projectId?: string;
  operation: string;
};

type AIMetrics = {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }>;
};

type AIReadinessMetrics = {
  providerConfigured: boolean;
  sampleSize: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  workspaceCoverage?: number;
  workspaceApplyRuns?: number;
};

type AIReadiness = {
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  promotionEligible: boolean;
  samplePolicy?: string;
  thresholds: {
    minSample: number;
    successRate: number;
    regressionRateMax: number;
    sandboxCoverage: number;
  };
  metrics: AIReadinessMetrics;
  metricsAll?: AIReadinessMetrics;
  rehearsalMetrics?: AIReadinessMetrics;
  blockers?: string[];
  windows?: Array<{
    hours: number;
    sinceIso: string;
    metrics: AIReadinessMetrics & {
      promotionEligible: boolean;
      blockers: string[];
    };
  }>;
  updatedAt: string;
};

type CoreLoopWindowMetrics = {
  sampleSize: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  workspaceCoverage: number;
  workspaceApplyRuns: number;
  sandboxApplyRuns: number;
  successfulApplyRuns: number;
  failedApplyRuns: number;
  blockedApplyRuns: number;
  promotionEligible: boolean;
  blockers: string[];
};

type CoreLoopMetricsWindow = {
  hours: number;
  sinceIso: string;
  metrics: CoreLoopWindowMetrics;
  metricsAll?: CoreLoopWindowMetrics;
  rehearsalMetrics?: CoreLoopWindowMetrics;
  reasonCounts: Record<string, number>;
  allReasonCounts?: Record<string, number>;
  executionModeCounts: Record<string, number>;
  riskCounts: Record<string, number>;
  impactedEndpointCounts: Record<string, number>;
  recommendations: Array<{
    id: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
  }>;
  lastEventAt: string | null;
};

type CoreLoopMetricsResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  samplePolicy?: string;
  providerConfigured: boolean;
  trend?: {
    sampleSize: 'up' | 'down' | 'flat';
    applySuccessRate: 'up' | 'down' | 'flat';
    regressionRate: 'up' | 'down' | 'flat';
    sandboxCoverage: 'up' | 'down' | 'flat';
  } | null;
  reasonPlaybook?: Array<{
    reason: string;
    count: number;
    action: string;
  }>;
  latest?: CoreLoopMetricsWindow;
  windows?: CoreLoopMetricsWindow[];
  updatedAt: string;
};

type LedgerIntegrityResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  integrityOk: boolean;
  daysLookback: number;
  report: {
    filesChecked: number;
    rowsChecked: number;
    validRows: number;
    invalidRows: number;
    legacyRows: number;
    issues: Array<{ file: string; line: number; reason: string }>;
  };
  updatedAt: string;
};

type CoreLoopPromotionResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  samplePolicy: string;
  promotionEligible: boolean;
  blockers: string[];
  production: CoreLoopWindowMetrics;
  rehearsal: CoreLoopWindowMetrics;
  updatedAt: string;
  sinceIso: string;
};

type FullAccessAuditResponse = {
  success: boolean;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  message: string;
  summary: {
    total: number;
    active: number;
    revoked: number;
    expired: number;
  };
  updatedAt: string;
};

type ChangeRunSummary = {
  total: number;
  apply: number;
  applyBlocked: number;
  applyFailed: number;
  rollback: number;
  rollbackBlocked: number;
  rollbackFailed: number;
  applySuccessRate: number;
  regressionRate: number;
  blockedRate: number;
  sandboxCoverage: number;
  workspaceCoverage: number;
  workspaceApplyRuns: number;
};

type ChangeRunGroup = {
  runId: string;
  eventCount: number;
  firstAt: string;
  lastAt: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  projectIds: string[];
  outcomes: Array<'success' | 'blocked' | 'failed'>;
  eventTypes: Array<'apply' | 'rollback' | 'apply_blocked' | 'rollback_blocked'>;
  paths: string[];
  rollbackTokens: string[];
  files?: string[];
};

type ChangeRunsResponse = {
  error: string;
  message: string;
  capability: string;
  capabilityStatus: 'PARTIAL' | 'IMPLEMENTED' | 'UNAVAILABLE';
  metadata?: {
    sampleClass?: 'all' | 'production' | 'rehearsal';
    summary?: ChangeRunSummary;
    summaryAll?: ChangeRunSummary;
    runGroups?: ChangeRunGroup[];
  };
};

type AIMetricsResponse = {
  metrics: AIMetrics;
};

type AICallsResponse = {
  calls: AICall[];
};

type EmergencyResponse = {
  data?: {
    level?: string;
    reason?: string;
  };
};

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

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down';
  alert?: boolean;
}) {
  return (
    <div
      className={`
        p-4 rounded-xl border
        ${alert ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-800/50 border-zinc-700'}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${alert ? 'text-red-400' : 'text-zinc-400'}`} />
        {trend && (
          <span className={trend === 'up' ? 'text-red-400' : 'text-green-400'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {subValue && <p className="text-xs text-zinc-600 mt-1">{subValue}</p>}
    </div>
  );
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
    success: 'text-green-400',
    error: 'text-red-400',
    timeout: 'text-amber-400',
  } as const;

  const modelColors: Record<string, string> = {
    'gpt-4o': 'bg-green-500/20 text-green-400',
    'gpt-4o-mini': 'bg-blue-500/20 text-blue-400',
    'gpt-4-turbo': 'bg-blue-500/20 text-blue-400',
    'claude-3-5-sonnet': 'bg-amber-500/20 text-amber-400',
    'claude-3-5-haiku': 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className="border-b border-zinc-800 last:border-0">
      <div className="flex items-center gap-4 p-3 hover:bg-zinc-800/50 cursor-pointer" onClick={onToggle}>
        <button className="text-zinc-500" type="button" aria-label="Expand call row">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <span className={`text-xs ${statusColors[call.status]}`} aria-label={`status-${call.status}`}>
          ●
        </span>

        <span className="text-xs text-zinc-500 w-20">{new Date(call.timestamp).toLocaleTimeString()}</span>

        <span className={`text-xs px-2 py-0.5 rounded ${modelColors[call.model] || 'bg-zinc-700 text-zinc-300'}`}>
          {call.model}
        </span>

        <span className="text-sm text-zinc-400 truncate flex-1">{call.userEmail}</span>

        <span className="text-xs text-zinc-500 w-24 text-right">{call.inputTokens + call.outputTokens} tokens</span>
        <span className="text-xs text-zinc-500 w-20 text-right">{call.latencyMs}ms</span>

        <span className={`text-xs font-mono w-16 text-right ${call.cost > 0.01 ? 'text-amber-400' : 'text-zinc-500'}`}>
          ${call.cost.toFixed(4)}
        </span>
      </div>

      {expanded && (
        <div className="px-10 pb-4 space-y-3 bg-zinc-900/50">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>User: {call.userId}</span>
            <span>Operation: {call.operation}</span>
            {call.projectId && <span>Project: {call.projectId}</span>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-400">Prompt ({call.inputTokens} tokens)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowPrompt((prev) => !prev);
                  }}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigator.clipboard.writeText(call.prompt);
                  }}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <pre
              className={`
                text-xs bg-zinc-950 rounded p-2 overflow-auto max-h-40
                ${showPrompt ? 'text-zinc-300' : 'text-zinc-600 blur-sm select-none'}
              `}
            >
              {call.prompt.slice(0, 500)}
              {call.prompt.length > 500 && '...'}
            </pre>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-400">Response ({call.outputTokens} tokens)</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard.writeText(call.response);
                }}
                className="text-xs text-zinc-500 hover:text-white"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs bg-zinc-950 rounded p-2 text-zinc-300 overflow-auto max-h-40">
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
  const coreLoopLatest = coreLoopMetricsData?.latest ?? null;
  const coreLoopTrend = coreLoopMetricsData?.trend ?? null;
  const reasonPlaybook = coreLoopMetricsData?.reasonPlaybook ?? [];
  const ledgerIntegrity = ledgerIntegrityData ?? null;
  const emergencyState = emergencyData?.data;
  const runSummary = runsData?.metadata?.summary ?? null;
  const runSummaryAll = runsData?.metadata?.summaryAll ?? null;
  const runGroups = runsData?.metadata?.runGroups ?? [];

  React.useEffect(() => {
    if (metrics || calls.length > 0) {
      setLastUpdated(new Date());
    }
  }, [metrics, calls.length]);

  const runCoreLoopDrill = React.useCallback(async () => {
    try {
      setIsRunningDrill(true);
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
      await Promise.all([
        refreshCalls(),
        refreshPromotion(),
        refreshReadiness(),
        refreshCoreLoopMetrics(),
        refreshLedgerIntegrity(),
        refreshFullAccessAudit(),
        refreshRuns(),
      ]);
    } catch (error) {
      console.error('[ai-monitor] core loop drill failed', error);
    } finally {
      setIsRunningDrill(false);
    }
  }, [refreshCalls, refreshPromotion, refreshReadiness, refreshCoreLoopMetrics, refreshLedgerIntegrity, refreshFullAccessAudit, refreshRuns]);

  const runProductionProbe = React.useCallback(async () => {
    try {
      setIsRunningProductionProbe(true);
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
      await Promise.all([
        refreshCalls(),
        refreshPromotion(),
        refreshReadiness(),
        refreshCoreLoopMetrics(),
        refreshLedgerIntegrity(),
        refreshFullAccessAudit(),
        refreshRuns(),
      ]);
    } catch (error) {
      console.error('[ai-monitor] production probe failed', error);
    } finally {
      setIsRunningProductionProbe(false);
    }
  }, [refreshCalls, refreshPromotion, refreshReadiness, refreshCoreLoopMetrics, refreshLedgerIntegrity, refreshFullAccessAudit, refreshRuns]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Monitor de Agentes de IA</h1>
          <p className="text-sm text-zinc-500">Telemetria operacional em tempo real</p>
          {lastUpdated && <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
              isPaused ? 'border-zinc-700 text-zinc-400' : 'border-green-500/30 bg-green-500/10 text-green-400'
            }`}
            type="button"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Retomar' : 'Pausar stream'}
          </button>
          <button
            onClick={() => void refreshCalls()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300"
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => void runCoreLoopDrill()}
            disabled={isRunningDrill}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 disabled:opacity-60"
            type="button"
          >
            <Zap className="w-4 h-4" />
            {isRunningDrill ? 'Rodando drill...' : 'Run Drill'}
          </button>
          <button
            onClick={() => void runProductionProbe()}
            disabled={isRunningProductionProbe}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 disabled:opacity-60"
            type="button"
          >
            <Zap className="w-4 h-4" />
            {isRunningProductionProbe ? 'Rodando probe...' : 'Run Production Probe'}
          </button>
        </div>
      </div>

      {emergencyState && emergencyState.level !== 'normal' && (
        <div
          className={`
            flex items-center justify-between p-4 rounded-xl border
            ${
              emergencyState.level === 'shutdown'
                ? 'bg-red-500/20 border-red-500/50'
                : emergencyState.level === 'critical'
                  ? 'bg-orange-500/20 border-orange-500/50'
                  : 'bg-amber-500/20 border-amber-500/50'
            }
          `}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-medium text-white">Modo de emergencia: {String(emergencyState.level).toUpperCase()}</p>
              <p className="text-sm text-zinc-400">{emergencyState.reason}</p>
            </div>
          </div>
          <a href="/admin/emergency" className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white">
            Gerenciar
          </a>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Brain} label="Total de chamadas (24h)" value={metrics.totalCalls.toLocaleString()} />
          <MetricCard icon={Zap} label="Total de tokens" value={`${(metrics.totalTokens / 1000).toFixed(1)}K`} />
          <MetricCard icon={DollarSign} label="Custo total" value={`$${metrics.totalCost.toFixed(2)}`} alert={metrics.totalCost > 50} />
          <MetricCard icon={Clock} label="Latencia media" value={`${metrics.avgLatency}ms`} alert={metrics.avgLatency > 3000} />
          <MetricCard icon={AlertTriangle} label="Taxa de erro" value={`${(metrics.errorRate * 100).toFixed(1)}%`} alert={metrics.errorRate > 0.05} />
        </div>
      )}

      {readiness && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-300">Core Loop Readiness (L4 gate)</h3>
            <span
              className={`text-xs px-2 py-1 rounded ${
                readiness.promotionEligible ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {readiness.promotionEligible ? 'PROMOTION ELIGIBLE' : 'PARTIAL'}
            </span>
          </div>
          {readiness.samplePolicy && (
            <p className="mb-3 text-xs text-zinc-500">Policy: {readiness.samplePolicy}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Success Rate</p>
              <p className="text-white font-semibold">{(readiness.metrics.applySuccessRate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Regression Rate</p>
              <p className="text-white font-semibold">{(readiness.metrics.regressionRate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Sandbox Coverage</p>
              <p className="text-white font-semibold">{(readiness.metrics.sandboxCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Sample Size</p>
              <p className="text-white font-semibold">{readiness.metrics.sampleSize}</p>
            </div>
          </div>
          {(readiness.metricsAll || readiness.rehearsalMetrics) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {readiness.metricsAll && (
                <div className="rounded border border-zinc-700 bg-zinc-800/30 p-3">
                  <p className="text-zinc-400">All samples</p>
                  <p className="text-zinc-200 mt-1">
                    sample={readiness.metricsAll.sampleSize} | success={(readiness.metricsAll.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {readiness.rehearsalMetrics && (
                <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p className="text-cyan-100">Rehearsal samples</p>
                  <p className="text-cyan-200 mt-1">
                    sample={readiness.rehearsalMetrics.sampleSize} | success={(readiness.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
          {readiness.blockers && readiness.blockers.length > 0 && (
            <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
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
                <div key={window.hours} className="rounded border border-zinc-700 bg-zinc-800/40 p-3 text-xs">
                  <p className="text-zinc-400">Window {window.hours}h</p>
                  <p className="text-zinc-200 mt-1">Success: {(window.metrics.applySuccessRate * 100).toFixed(1)}%</p>
                  <p className="text-zinc-200">Regression: {(window.metrics.regressionRate * 100).toFixed(1)}%</p>
                  <p className="text-zinc-200">Sandbox: {(window.metrics.sandboxCoverage * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {promotionData && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Promotion Verdict (Policy Scope)</h3>
            <span
              className={`rounded px-2 py-1 text-xs ${
                promotionData.promotionEligible
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-rose-500/20 text-rose-200'
              }`}
            >
              {promotionData.promotionEligible ? 'ELIGIBLE' : 'BLOCKED'}
            </span>
          </div>
          <p className="text-xs text-zinc-500">Policy: {promotionData.samplePolicy}</p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-zinc-400">Production</p>
              <p className="text-zinc-200 mt-1">
                sample={promotionData.production.sampleSize} | success={(promotionData.production.applySuccessRate * 100).toFixed(1)}% | regression={(promotionData.production.regressionRate * 100).toFixed(1)}%
              </p>
            </div>
            <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-3">
              <p className="text-cyan-100">Rehearsal</p>
              <p className="text-cyan-200 mt-1">
                sample={promotionData.rehearsal.sampleSize} | success={(promotionData.rehearsal.applySuccessRate * 100).toFixed(1)}% | regression={(promotionData.rehearsal.regressionRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          {promotionData.blockers.length > 0 && (
            <ul className="mt-3 list-disc pl-4 text-xs text-rose-100 space-y-1">
              {promotionData.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {coreLoopLatest && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Core-loop Operational Metrics (7d)</h3>
            <span className="rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300">
              {coreLoopMetricsData?.capabilityStatus ?? 'PARTIAL'}
            </span>
          </div>
          {coreLoopMetricsData?.samplePolicy && (
            <p className="mb-3 text-xs text-zinc-500">Policy: {coreLoopMetricsData.samplePolicy}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Apply runs</p>
              <p className="text-white font-semibold">{coreLoopLatest.metrics.sampleSize}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Successful applies</p>
              <p className="text-white font-semibold">{coreLoopLatest.metrics.successfulApplyRuns}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Failed applies</p>
              <p className="text-white font-semibold">{coreLoopLatest.metrics.failedApplyRuns}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">Blocked applies</p>
              <p className="text-white font-semibold">{coreLoopLatest.metrics.blockedApplyRuns}</p>
            </div>
          </div>
          {(coreLoopLatest.metricsAll || coreLoopLatest.rehearsalMetrics) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {coreLoopLatest.metricsAll && (
                <div className="rounded border border-zinc-700 bg-zinc-800/30 p-3">
                  <p className="text-zinc-400">All samples</p>
                  <p className="text-zinc-200 mt-1">
                    sample={coreLoopLatest.metricsAll.sampleSize} | success={(coreLoopLatest.metricsAll.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
              {coreLoopLatest.rehearsalMetrics && (
                <div className="rounded border border-cyan-500/30 bg-cyan-500/10 p-3">
                  <p className="text-cyan-100">Rehearsal samples</p>
                  <p className="text-cyan-200 mt-1">
                    sample={coreLoopLatest.rehearsalMetrics.sampleSize} | success={(coreLoopLatest.rehearsalMetrics.applySuccessRate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
          {coreLoopTrend && (
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3 text-xs">
              <p className="text-zinc-300 font-medium mb-2">Trend (7d vs 30d baseline)</p>
              <div className="flex flex-wrap gap-2 text-zinc-200">
                <span className="rounded bg-zinc-800 px-2 py-1">sample: {coreLoopTrend.sampleSize}</span>
                <span className="rounded bg-zinc-800 px-2 py-1">success: {coreLoopTrend.applySuccessRate}</span>
                <span className="rounded bg-zinc-800 px-2 py-1">regression: {coreLoopTrend.regressionRate}</span>
                <span className="rounded bg-zinc-800 px-2 py-1">sandbox: {coreLoopTrend.sandboxCoverage}</span>
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-zinc-500">
            Last event: {coreLoopLatest.lastEventAt ? new Date(coreLoopLatest.lastEventAt).toLocaleString() : 'none'}
          </div>
          {coreLoopLatest.metrics.sampleSize === 0 && (
            <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              No apply-run evidence in this window. L4 promotion remains evidence-blocked.
            </div>
          )}
          {coreLoopLatest.metrics.sampleSize === 0 &&
            (coreLoopLatest.rehearsalMetrics?.sampleSize || 0) > 0 && (
              <div className="mt-3 rounded border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                Rehearsal evidence exists, but production evidence is still zero. Promotion remains blocked by policy.
              </div>
            )}
          {Object.keys(coreLoopLatest.reasonCounts).length > 0 && (
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">Top block/failure reasons</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.reasonCounts)
                  .slice(0, 6)
                  .map(([reason, count]) => (
                    <span key={reason} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                      {reason}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.keys(coreLoopLatest.riskCounts).length > 0 && (
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">Dependency risk distribution</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.riskCounts)
                  .slice(0, 6)
                  .map(([risk, count]) => (
                    <span key={risk} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                      {risk}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.keys(coreLoopLatest.impactedEndpointCounts).length > 0 && (
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">Most impacted API surfaces</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(coreLoopLatest.impactedEndpointCounts)
                  .slice(0, 8)
                  .map(([endpoint, count]) => (
                    <span key={endpoint} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                      {endpoint}: {count}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {coreLoopLatest.recommendations.length > 0 && (
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">Learning recommendations</p>
              <ul className="space-y-1 text-xs">
                {coreLoopLatest.recommendations.map((recommendation) => (
                  <li key={recommendation.id} className="text-zinc-200">
                    <span
                      className={`mr-2 inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                        recommendation.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-200'
                          : recommendation.severity === 'warning'
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-zinc-700 text-zinc-200'
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
            <div className="mt-3 rounded border border-zinc-700 bg-zinc-800/30 p-3">
              <p className="text-xs font-medium text-zinc-300 mb-2">Reason playbook</p>
              <ul className="space-y-1 text-xs text-zinc-200">
                {reasonPlaybook.map((item) => (
                  <li key={item.reason}>
                    <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Ledger integrity</h3>
            <span
              className={`rounded px-2 py-1 text-xs ${
                ledgerIntegrity.integrityOk
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-rose-500/20 text-rose-200'
              }`}
            >
              {ledgerIntegrity.integrityOk ? 'OK' : 'ISSUES'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">files</p>
              <p className="text-white font-semibold">{ledgerIntegrity.report.filesChecked}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">rows</p>
              <p className="text-white font-semibold">{ledgerIntegrity.report.rowsChecked}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">valid</p>
              <p className="text-white font-semibold">{ledgerIntegrity.report.validRows}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">legacy</p>
              <p className="text-white font-semibold">{ledgerIntegrity.report.legacyRows}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">invalid</p>
              <p className="text-white font-semibold">{ledgerIntegrity.report.invalidRows}</p>
            </div>
          </div>
          {ledgerIntegrity.report.invalidRows > 0 && (
            <div className="mt-3 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-100">
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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Full Access audit</h3>
            <span className="rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300">
              {fullAccessAuditData.capabilityStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">total</p>
              <p className="text-white font-semibold">{fullAccessAuditData.summary.total}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">active</p>
              <p className="text-white font-semibold">{fullAccessAuditData.summary.active}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">revoked</p>
              <p className="text-white font-semibold">{fullAccessAuditData.summary.revoked}</p>
            </div>
            <div className="bg-zinc-800/60 rounded p-3">
              <p className="text-zinc-500">expired</p>
              <p className="text-white font-semibold">{fullAccessAuditData.summary.expired}</p>
            </div>
          </div>
        </div>
      )}

      {runSummary && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-zinc-300">Apply/Rollback Ledger (72h)</h3>
            <span className="rounded border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300">
              capability: {runsData?.capabilityStatus ?? 'PARTIAL'}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-zinc-500">
            <span>sampleClass: {runsData?.metadata?.sampleClass ?? runSampleClass}</span>
            {runSummaryAll && (
              <span>
                all.apply={runSummaryAll.apply} all.blocked={runSummaryAll.applyBlocked} all.rollback={runSummaryAll.rollback}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6 text-xs">
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Apply success rate</p>
              <p className="text-zinc-100 text-lg font-semibold">{(runSummary.applySuccessRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Blocked rate</p>
              <p className="text-zinc-100 text-lg font-semibold">{(runSummary.blockedRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Regression rate</p>
              <p className="text-zinc-100 text-lg font-semibold">{(runSummary.regressionRate * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Sandbox coverage</p>
              <p className="text-zinc-100 text-lg font-semibold">{(runSummary.sandboxCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Workspace coverage</p>
              <p className="text-zinc-100 text-lg font-semibold">{(runSummary.workspaceCoverage * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded bg-zinc-800/50 p-3">
              <p className="text-zinc-500">Events tracked</p>
              <p className="text-zinc-100 text-lg font-semibold">{runSummary.total}</p>
            </div>
          </div>

          {runGroups.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
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
                    <tr key={group.runId} className="border-b border-zinc-800/70">
                      <td className="px-2 py-1 font-mono text-zinc-300">{group.runId}</td>
                      <td className="px-2 py-1 text-zinc-300">{group.eventCount}</td>
                      <td className="px-2 py-1 text-zinc-400">
                        {new Date(group.firstAt || group.firstTimestamp || '').toLocaleTimeString()} - {new Date(group.lastAt || group.lastTimestamp || '').toLocaleTimeString()}
                      </td>
                      <td className="px-2 py-1 text-zinc-300">{group.eventTypes.join(', ')}</td>
                      <td className="px-2 py-1 text-zinc-300">{group.outcomes.join(', ')}</td>
                      <td className="px-2 py-1 text-zinc-400">{(group.paths || group.files || []).slice(0, 2).join(', ') || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {metrics?.modelBreakdown && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Uso por modelo</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
              <div key={model} className="flex items-center gap-3 px-4 py-2 bg-zinc-800 rounded-lg">
                <span className="text-sm font-medium text-white">{model}</span>
                <span className="text-xs text-zinc-500">{data.calls} chamadas</span>
                <span className="text-xs text-zinc-500">${data.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-500">Filtros:</span>
        </div>

        <select
          value={modelFilter}
          onChange={(event) => setModelFilter(event.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value="all">Todos os modelos</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value="all">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="error">Erro</option>
          <option value="timeout">Tempo esgotado</option>
        </select>

        <select
          value={runSampleClass}
          onChange={(event) => setRunSampleClass(event.target.value as 'all' | 'production' | 'rehearsal')}
          className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white"
        >
          <option value="production">Runs: Production</option>
          <option value="rehearsal">Runs: Rehearsal</option>
          <option value="all">Runs: All</option>
        </select>
      </div>

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h3 className="text-sm font-medium text-white">Chamadas recentes de IA</h3>
          <span className="text-xs text-zinc-500">{calls.length} chamadas</span>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 bg-zinc-800/50 text-xs text-zinc-500 font-medium">
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
            <div className="p-8 text-center text-zinc-500">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chamada de IA no periodo selecionado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

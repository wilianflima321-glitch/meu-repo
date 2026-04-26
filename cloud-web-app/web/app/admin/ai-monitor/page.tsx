'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { getToken } from '@/lib/auth';
import { createComponentLogger } from '@/lib/observability/logger';
import { RecentCallsSection } from './ai-monitor-calls';
import {
  EmergencyBanner,
  MetricsOverviewSection,
  MonitorFiltersBar,
  MonitorHeroSection,
  MonitorHighlightsSection,
  OperatorNoticeBanner,
} from './ai-monitor-overview';
import {
  CoreLoopMetricsSection,
  DossierSection,
  FullAccessAuditSection,
  LedgerIntegritySection,
  ModelBreakdownSection,
  PromotionSection,
  ReadinessSection,
  RunLedgerSection,
} from './ai-monitor-sections';
import type {
  AICall,
  AICallsResponse,
  AIMetrics,
  AIMetricsResponse,
  AIReadiness,
  ChangeRunsResponse,
  CoreLoopDrillResponse,
  CoreLoopMetricsResponse,
  CoreLoopPromotionResponse,
  EmergencyResponse,
  FullAccessAuditResponse,
  L4ReadinessDossierResponse,
  LedgerIntegrityResponse,
  ProductionProbeResponse,
} from './types';

type OperatorNotice = { tone: 'success' | 'error'; text: string };
type RequestErrorPayload = { error?: string; message?: string };
type RunSampleClass = 'all' | 'production' | 'rehearsal';

const logger = createComponentLogger('admin-ai-monitor');

async function requestWithAuth<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & RequestErrorPayload;
  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed: ${response.status}`);
  }

  return payload;
}

function fetchWithAuth<T>(url: string): Promise<T> {
  return requestWithAuth<T>(url);
}

function postWithAuth<T>(url: string, body: unknown): Promise<T> {
  return requestWithAuth<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export default function AgentMonitorPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRunningDrill, setIsRunningDrill] = useState(false);
  const [isRunningProductionProbe, setIsRunningProductionProbe] = useState(false);
  const [operatorNotice, setOperatorNotice] = useState<OperatorNotice | null>(null);
  const [runSampleClass, setRunSampleClass] = useState<RunSampleClass>('production');

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
    new Set([...(readiness?.blockers || []), ...(promotionData?.blockers || []), ...(dossier?.blockers || [])])
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

  useEffect(() => {
    if (metrics || calls.length > 0) {
      setLastUpdated(new Date());
    }
  }, [metrics, calls.length]);

  const refreshAllMonitorData = useCallback(async () => {
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
  }, [
    refreshCalls,
    refreshCoreLoopMetrics,
    refreshDossier,
    refreshFullAccessAudit,
    refreshLedgerIntegrity,
    refreshPromotion,
    refreshReadiness,
    refreshRuns,
  ]);

  const runCoreLoopDrill = useCallback(async () => {
    try {
      setIsRunningDrill(true);
      setOperatorNotice(null);

      const payload = await postWithAuth<CoreLoopDrillResponse>('/api/admin/ai/core-loop-drill', { runs: 12 });
      await refreshAllMonitorData();

      setOperatorNotice({
        tone: 'success',
        text: `Drill concluido: runs=${payload?.totals?.runs || 0}, success=${payload?.totals?.applySuccess || 0}, blocked=${payload?.totals?.applyBlocked || 0}.`,
      });
    } catch (error) {
      logger.error('Core loop drill failed', error);
      setOperatorNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha ao executar core-loop drill.',
      });
    } finally {
      setIsRunningDrill(false);
    }
  }, [refreshAllMonitorData]);

  const runProductionProbe = useCallback(async () => {
    try {
      setIsRunningProductionProbe(true);
      setOperatorNotice(null);

      const payload = await postWithAuth<ProductionProbeResponse>('/api/admin/ai/core-loop-production-probe', {
        runs: 6,
      });
      await refreshAllMonitorData();

      setOperatorNotice({
        tone: 'success',
        text: `Production probe concluido: runs=${payload?.metadata?.runs || 0}, success=${payload?.metadata?.totals?.applySuccess || 0}, blocked=${payload?.metadata?.totals?.applyBlocked || 0}, failed=${payload?.metadata?.totals?.applyFailed || 0}, file=${payload?.metadata?.selectedFile || 'n/a'}.`,
      });
    } catch (error) {
      logger.error('Production probe failed', error);
      setOperatorNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Falha ao executar production probe.',
      });
    } finally {
      setIsRunningProductionProbe(false);
    }
  }, [refreshAllMonitorData]);

  const handleToggleExpanded = useCallback((callId: string) => {
    setExpandedId((currentValue) => (currentValue === callId ? null : callId));
  }, []);

  return (
    <div className="space-y-6 p-6">
      <MonitorHeroSection
        headerDescription={headerDescription}
        headerTitle={headerTitle}
        isPaused={isPaused}
        isRunningDrill={isRunningDrill}
        isRunningProductionProbe={isRunningProductionProbe}
        lastUpdated={lastUpdated}
        onRefresh={refreshCalls}
        onRunCoreLoopDrill={runCoreLoopDrill}
        onRunProductionProbe={runProductionProbe}
        onTogglePause={() => setIsPaused((previousValue) => !previousValue)}
        strategicGaps={strategicGaps}
      />

      {operatorNotice && <OperatorNoticeBanner notice={operatorNotice} />}

      <MonitorHighlightsSection
        coreLoopLatest={coreLoopLatest}
        operatorBlockersCount={operatorBlockers.length}
      />

      <EmergencyBanner emergencyState={emergencyState} />

      {metrics && <MetricsOverviewSection metrics={metrics} />}
      {readiness && <ReadinessSection readiness={readiness} />}
      {promotionData && <PromotionSection promotion={promotionData} />}
      {dossier && <DossierSection dossier={dossier} unmetCriteria={unmetDossierCriteria} />}
      {coreLoopLatest && (
        <CoreLoopMetricsSection
          capabilityStatus={coreLoopMetricsData?.capabilityStatus}
          latest={coreLoopLatest}
          reasonPlaybook={reasonPlaybook}
          samplePolicy={coreLoopMetricsData?.samplePolicy}
          trend={coreLoopTrend}
        />
      )}
      {ledgerIntegrity && <LedgerIntegritySection ledgerIntegrity={ledgerIntegrity} />}
      {fullAccessAuditData && <FullAccessAuditSection audit={fullAccessAuditData} />}
      {runSummary && (
        <RunLedgerSection
          capabilityStatus={runsData?.capabilityStatus}
          runGroups={runGroups}
          runSampleClass={runSampleClass}
          runSummary={runSummary}
          runSummaryAll={runSummaryAll}
          sampleClassLabel={runsData?.metadata?.sampleClass}
        />
      )}
      {metrics?.modelBreakdown && <ModelBreakdownSection metrics={metrics} />}

      <MonitorFiltersBar
        modelFilter={modelFilter}
        onModelFilterChange={setModelFilter}
        onRunSampleClassChange={setRunSampleClass}
        onStatusFilterChange={setStatusFilter}
        runSampleClass={runSampleClass}
        statusFilter={statusFilter}
      />

      <RecentCallsSection calls={calls} expandedId={expandedId} onToggleExpanded={handleToggleExpanded} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
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
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

interface AICall {
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
}

interface AIMetrics {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }>;
}

type EmergencyState = {
  level: 'normal' | 'warning' | 'critical' | 'shutdown';
  reason?: string;
};
type MetricsResponse = { metrics?: AIMetrics };
type CallsResponse = { calls?: AICall[] };
type EmergencyResponse = { data?: EmergencyState };

const authFetcher = adminJsonFetch;

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
      className={`rounded-xl border p-4 ${
        alert ? 'border-rose-500/30 bg-rose-500/10' : 'border-zinc-700 bg-zinc-900/70'
      }`}
    >
      <div className='mb-2 flex items-center justify-between'>
        <Icon className={`h-5 w-5 ${alert ? 'text-rose-300' : 'text-zinc-400'}`} />
        {trend ? (
          <span className={trend === 'up' ? 'text-rose-300' : 'text-emerald-300'}>
            {trend === 'up' ? <TrendingUp className='h-4 w-4' /> : <TrendingDown className='h-4 w-4' />}
          </span>
        ) : null}
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-rose-200' : 'text-zinc-100'}`}>{value}</p>
      <p className='text-sm text-zinc-500'>{label}</p>
      {subValue ? <p className='mt-1 text-xs text-zinc-600'>{subValue}</p> : null}
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
    success: 'text-emerald-300',
    error: 'text-rose-300',
    timeout: 'text-amber-300',
  } as const;

  const modelColors: Record<string, string> = {
    'gpt-4o': 'bg-emerald-500/20 text-emerald-300',
    'gpt-4o-mini': 'bg-sky-500/20 text-sky-300',
    'gpt-4-turbo': 'bg-sky-500/20 text-sky-300',
    'claude-3-5-sonnet': 'bg-amber-500/20 text-amber-300',
    'claude-3-5-haiku': 'bg-cyan-500/20 text-cyan-300',
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text).catch(() => undefined);
  };

  return (
    <div className='border-b border-zinc-800 last:border-0'>
      <button
        type='button'
        className='flex w-full cursor-pointer items-center gap-4 p-3 text-left hover:bg-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
        onClick={onToggle}
      >
        <span className='text-zinc-500'>{expanded ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}</span>
        <span className={`text-xs ${statusColors[call.status]}`}>?</span>
        <span className='w-20 text-xs text-zinc-500'>{new Date(call.timestamp).toLocaleTimeString()}</span>
        <span className={`rounded px-2 py-0.5 text-xs ${modelColors[call.model] || 'bg-zinc-700 text-zinc-300'}`}>
          {call.model}
        </span>
        <span className='flex-1 truncate text-sm text-zinc-400'>{call.userEmail}</span>
        <span className='w-24 text-right text-xs text-zinc-500'>{call.inputTokens + call.outputTokens} tokens</span>
        <span className='w-20 text-right text-xs text-zinc-500'>{call.latencyMs}ms</span>
        <span className={`w-16 text-right text-xs font-mono ${call.cost > 0.01 ? 'text-amber-300' : 'text-zinc-500'}`}>
          ${call.cost.toFixed(4)}
        </span>
      </button>

      {expanded ? (
        <div className='space-y-3 bg-zinc-900/50 px-10 pb-4'>
          <div className='flex flex-wrap items-center gap-4 text-xs text-zinc-500'>
            <span>Usuario: {call.userId}</span>
            <span>Operacao: {call.operation}</span>
            {call.projectId ? <span>Projeto: {call.projectId}</span> : null}
          </div>

          <div>
            <div className='mb-1 flex items-center justify-between'>
              <span className='text-xs font-medium text-zinc-400'>Prompt ({call.inputTokens} tokens)</span>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowPrompt((current) => !current);
                  }}
                  className='text-xs text-zinc-500 hover:text-zinc-100'
                >
                  {showPrompt ? <EyeOff className='h-3 w-3' /> : <Eye className='h-3 w-3' />}
                </button>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    copyText(call.prompt);
                  }}
                  className='text-xs text-zinc-500 hover:text-zinc-100'
                >
                  <Copy className='h-3 w-3' />
                </button>
              </div>
            </div>
            <pre
              className={`max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-xs ${
                showPrompt ? 'text-zinc-300' : 'select-none text-zinc-600 blur-sm'
              }`}
            >
              {call.prompt.slice(0, 500)}
              {call.prompt.length > 500 ? '...' : ''}
            </pre>
          </div>

          <div>
            <div className='mb-1 flex items-center justify-between'>
              <span className='text-xs font-medium text-zinc-400'>Resposta ({call.outputTokens} tokens)</span>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation();
                  copyText(call.response);
                }}
                className='text-xs text-zinc-500 hover:text-zinc-100'
              >
                <Copy className='h-3 w-3' />
              </button>
            </div>
            <pre className='max-h-40 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-300'>
              {call.response.slice(0, 500)}
              {call.response.length > 500 ? '...' : ''}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AgentMonitorPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const {
    data: metricsData,
    error: metricsError,
    isLoading: metricsLoading,
  } = useSWR<MetricsResponse>('/api/admin/ai/metrics', authFetcher, {
    refreshInterval: isPaused ? 0 : 10000,
  });

  const {
    data: callsData,
    error: callsError,
    mutate: refreshCalls,
    isLoading: callsLoading,
  } = useSWR<CallsResponse>(`/api/admin/ai/calls?limit=50&model=${modelFilter}&status=${statusFilter}`, authFetcher, {
    refreshInterval: isPaused ? 0 : 5000,
  });

  const { data: emergencyData } = useSWR<EmergencyResponse>('/api/admin/emergency', authFetcher, {
    refreshInterval: isPaused ? 0 : 10000,
  });

  const metrics: AIMetrics | null = metricsData?.metrics || null;
  const calls: AICall[] = callsData?.calls || [];
  const emergencyState: EmergencyState | undefined = emergencyData?.data;

  useEffect(() => {
    if (metrics || calls.length > 0) {
      setLastUpdated(new Date());
    }
  }, [metrics, calls.length]);

  const hasError = metricsError || callsError;
  const isLoading = metricsLoading || callsLoading;

  const headerActions = (
    <>
      <AdminPrimaryButton
        onClick={() => setIsPaused((current) => !current)}
        className={isPaused ? '' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}
      >
        <span className='inline-flex items-center gap-2'>
          {isPaused ? <Play className='h-4 w-4' /> : <Pause className='h-4 w-4' />}
          {isPaused ? 'Retomar' : 'Pausar'}
        </span>
      </AdminPrimaryButton>
      <AdminPrimaryButton onClick={() => refreshCalls()}>
        <span className='inline-flex items-center gap-2'>
          <RefreshCw className='h-4 w-4' />
          Atualizar
        </span>
      </AdminPrimaryButton>
    </>
  );

  return (
    <AdminPageShell
      title='Monitor de Agentes de IA'
      description='Visao operacional em tempo real de chamadas, custo, latencia e erros.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={headerActions}
    >
      {hasError ? (
        <div className='mb-6'>
          <AdminStatusBanner tone='danger'>
            {(metricsError as Error)?.message || (callsError as Error)?.message || 'Falha ao carregar monitor de IA.'}
          </AdminStatusBanner>
        </div>
      ) : null}

      {emergencyState && emergencyState.level !== 'normal' ? (
        <div className='mb-6'>
          <AdminStatusBanner tone={emergencyState.level === 'shutdown' ? 'danger' : 'warning'}>
            Modo de emergencia: <strong>{emergencyState.level.toUpperCase()}</strong>
            {emergencyState.reason ? ` • ${emergencyState.reason}` : ''}
            <Link
              href='/admin/emergency'
              className='ml-3 inline-flex rounded bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300'
            >
              Gerenciar
            </Link>
          </AdminStatusBanner>
        </div>
      ) : null}

      {metrics ? (
        <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-5'>
          <MetricCard icon={Brain} label='Chamadas (24h)' value={metrics.totalCalls.toLocaleString()} />
          <MetricCard icon={Zap} label='Tokens' value={`${(metrics.totalTokens / 1000).toFixed(1)}K`} />
          <MetricCard icon={DollarSign} label='Custo total' value={`$${metrics.totalCost.toFixed(2)}`} alert={metrics.totalCost > 50} />
          <MetricCard icon={Clock} label='Latencia media' value={`${metrics.avgLatency}ms`} alert={metrics.avgLatency > 3000} />
          <MetricCard
            icon={AlertTriangle}
            label='Taxa de erro'
            value={`${(metrics.errorRate * 100).toFixed(1)}%`}
            alert={metrics.errorRate > 0.05}
            trend={metrics.errorRate > 0.05 ? 'up' : 'down'}
          />
        </div>
      ) : null}

      {metrics?.modelBreakdown ? (
        <AdminSection title='Uso por modelo' className='mb-6'>
          <div className='flex flex-wrap gap-3'>
            {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
              <div key={model} className='flex items-center gap-3 rounded-lg bg-zinc-800 px-4 py-2'>
                <span className='text-sm font-medium text-zinc-100'>{model}</span>
                <span className='text-xs text-zinc-500'>{data.calls} chamadas</span>
                <span className='text-xs text-zinc-500'>${data.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </AdminSection>
      ) : null}

      <AdminSection className='mb-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2 text-zinc-500'>
            <Filter className='h-4 w-4' />
            <span className='text-sm'>Filtros</span>
          </div>

          <select
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
            className='rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>Todos os modelos</option>
            <option value='gpt-4o'>GPT-4o</option>
            <option value='gpt-4o-mini'>GPT-4o Mini</option>
            <option value='claude-3-5-sonnet'>Claude 3.5 Sonnet</option>
            <option value='claude-3-5-haiku'>Claude 3.5 Haiku</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className='rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>Todos os status</option>
            <option value='success'>Sucesso</option>
            <option value='error'>Erro</option>
            <option value='timeout'>Tempo esgotado</option>
          </select>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='flex items-center justify-between border-b border-zinc-800 px-4 py-3'>
          <h3 className='text-sm font-medium text-zinc-100'>Chamadas recentes de IA</h3>
          <span className='text-xs text-zinc-500'>{calls.length} chamadas</span>
        </div>

        <div className='flex items-center gap-4 bg-zinc-800/50 px-4 py-2 text-xs font-medium text-zinc-500'>
          <span className='w-8' />
          <span className='w-4' />
          <span className='w-20'>Hora</span>
          <span className='w-32'>Modelo</span>
          <span className='flex-1'>Usuario</span>
          <span className='w-24 text-right'>Tokens</span>
          <span className='w-20 text-right'>Latencia</span>
          <span className='w-16 text-right'>Custo</span>
        </div>

        <div className='max-h-[500px] overflow-auto'>
          {isLoading ? (
            <table className='w-full'>
              <tbody>
                <AdminTableStateRow colSpan={1} message='Carregando chamadas de IA...' />
              </tbody>
            </table>
          ) : calls.length === 0 ? (
            <div className='p-8 text-center text-zinc-500'>
              <Brain className='mx-auto mb-2 h-8 w-8 opacity-50' />
              <p>Nenhuma chamada de IA no periodo selecionado.</p>
            </div>
          ) : (
            calls.map((call) => (
              <AICallRow
                key={call.id}
                call={call}
                expanded={expandedId === call.id}
                onToggle={() => setExpandedId(expandedId === call.id ? null : call.id)}
              />
            ))
          )}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}


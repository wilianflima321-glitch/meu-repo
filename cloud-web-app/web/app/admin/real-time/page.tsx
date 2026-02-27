'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type Metrics = {
  usersOnline: number;
  apiRequests: number;
  cpuUsage: number;
  memoryUsage: number;
};

type AuditLog = {
  id: string;
  action: string | null;
  resource: string | null;
  createdAt: string;
};

type QuickStatsResponse = {
  stats?: {
    activeUsers?: number;
    requestsPerMinute?: number;
  };
};

type InfraResponse = {
  resources?: {
    cpu?: { usage?: number };
    memory?: { usage?: number };
  };
};

type AuditResponse = {
  logs?: AuditLog[];
};

export default function RealTimePage() {
  const [metrics, setMetrics] = useState<Metrics>({
    usersOnline: 0,
    apiRequests: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [quickStats, infra, audit] = await Promise.all([
        adminJsonFetch<QuickStatsResponse>('/api/admin/quick-stats'),
        adminJsonFetch<InfraResponse>('/api/admin/infrastructure/status'),
        adminJsonFetch<AuditResponse>('/api/admin/audit?limit=20'),
      ]);

      setMetrics({
        usersOnline: quickStats?.stats?.activeUsers ?? 0,
        apiRequests: quickStats?.stats?.requestsPerMinute ?? 0,
        cpuUsage: infra?.resources?.cpu?.usage ?? 0,
        memoryUsage: infra?.resources?.memory?.usage ?? 0,
      });
      setLogs(Array.isArray(audit?.logs) ? audit.logs : []);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const term = search.trim().toLowerCase();
        return !term || `${log.action || ''} ${log.resource || ''}`.toLowerCase().includes(term);
      }),
    [logs, search],
  );

  return (
    <AdminPageShell
      title='Monitoramento em tempo real'
      description='Telemetria operacional de uso, infraestrutura e auditoria.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={
        <>
          <AdminPrimaryButton
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={autoRefresh ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : ''}
          >
            {autoRefresh ? 'Auto: ativado' : 'Auto: desativado'}
          </AdminPrimaryButton>
          <AdminPrimaryButton onClick={fetchMetrics}>Atualizar</AdminPrimaryButton>
        </>
      }
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Usuarios online' value={loading ? '...' : metrics.usersOnline} tone='sky' />
          <AdminStatCard label='Requisicoes API/min' value={loading ? '...' : metrics.apiRequests} tone='emerald' />
          <AdminStatCard label='Uso de CPU' value={loading ? '...' : `${metrics.cpuUsage.toFixed(0)}%`} tone='rose' />
          <AdminStatCard label='Uso de memoria' value={loading ? '...' : `${metrics.memoryUsage.toFixed(0)}%`} tone='amber' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Logs recentes'>
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Buscar logs por acao/recurso'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full max-w-sm rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
        </div>

        <div className='h-64 overflow-y-auto rounded bg-zinc-800/70 p-3'>
          {loading ? (
            <table className='w-full'>
              <tbody>
                <AdminTableStateRow colSpan={1} message='Carregando logs...' />
              </tbody>
            </table>
          ) : filteredLogs.length === 0 ? (
            <p className='text-sm text-zinc-500'>Sem logs recentes.</p>
          ) : (
            filteredLogs.map((log) => (
              <p key={log.id} className='text-sm text-zinc-200'>
                [{new Date(log.createdAt).toLocaleString()}] {log.action || 'acao'} {log.resource ? `(${log.resource})` : ''}
              </p>
            ))
          )}
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}


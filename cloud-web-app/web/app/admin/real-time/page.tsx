'use client';

import React, { useCallback, useEffect, useState } from 'react';

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
      const [quickStatsRes, infraRes, auditRes] = await Promise.all([
        fetch('/api/admin/quick-stats'),
        fetch('/api/admin/infrastructure/status'),
        fetch('/api/admin/audit?limit=20'),
      ]);

      if (!quickStatsRes.ok) throw new Error('Falha ao carregar estatísticas rápidas');
      if (!infraRes.ok) throw new Error('Falha ao carregar infraestrutura');
      if (!auditRes.ok) throw new Error('Falha ao carregar logs de auditoria');

      const quickStats = await quickStatsRes.json();
      const infra = await infraRes.json();
      const audit = await auditRes.json();

      setMetrics({
        usersOnline: quickStats?.stats?.activeUsers || 0,
        apiRequests: quickStats?.stats?.requestsPerMinute || 0,
        cpuUsage: infra?.resources?.cpu?.usage || 0,
        memoryUsage: infra?.resources?.memory?.usage || 0,
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

  const filteredLogs = logs.filter((log) => {
    const term = search.trim().toLowerCase();
    return !term || `${log.action || ''} ${log.resource || ''}`.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento em tempo real</h1>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`px-3 py-2 rounded text-sm ${
              autoRefresh ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
            }`}
          >
            {autoRefresh ? 'Auto: ativado' : 'Auto: desativado'}
          </button>
          <button
            onClick={fetchMetrics}
            className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow text-center">
            {loading ? (
              <div className="h-12 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] rounded animate-pulse" />
            ) : (
              <>
                {index === 0 && (
                  <>
                    <h3 className="text-lg font-semibold">Usuários online</h3>
                    <p className="text-2xl font-bold text-[var(--aethel-primary)]">{metrics.usersOnline}</p>
                  </>
                )}
                {index === 1 && (
                  <>
                    <h3 className="text-lg font-semibold">Requisições de API/min</h3>
                    <p className="text-2xl font-bold text-[var(--aethel-success)]">{metrics.apiRequests}</p>
                  </>
                )}
                {index === 2 && (
                  <>
                    <h3 className="text-lg font-semibold">Uso de CPU</h3>
                    <p className="text-2xl font-bold text-[var(--aethel-error)]">{metrics.cpuUsage.toFixed(0)}%</p>
                  </>
                )}
                {index === 3 && (
                  <>
                    <h3 className="text-lg font-semibold">Uso de memória</h3>
                    <p className="text-2xl font-bold text-[var(--aethel-primary)]">{metrics.memoryUsage.toFixed(0)}%</p>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Logs recentes</h2>
          <input
            type="text"
            placeholder="Buscar logs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded text-sm"
          />
        </div>
        <div className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] p-4 rounded h-64 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <p className="text-sm text-[var(--aethel-text-tertiary)]">Sem logs recentes.</p>
          ) : (
            filteredLogs.map((log) => (
              <p key={log.id} className="text-sm">
                [{new Date(log.createdAt).toLocaleString()}] {log.action || 'ação'} {log.resource ? `(${log.resource})` : ''}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

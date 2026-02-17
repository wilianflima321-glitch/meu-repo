'use client';

import React, { useCallback, useEffect, useState } from 'react';

type AuditLog = {
  id: string;
  adminEmail?: string | null;
  userId?: string | null;
  action?: string | null;
  category?: string | null;
  severity?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  resource?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState({
    adminEmail: '',
    action: '',
    severity: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const severityLabels: Record<string, string> = {
    info: 'informação',
    warning: 'aviso',
    critical: 'crítico',
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filter.adminEmail) params.set('adminEmail', filter.adminEmail);
      if (filter.action) params.set('action', filter.action);
      if (filter.severity !== 'all') params.set('severity', filter.severity);
      if (filter.dateFrom) params.set('startDate', filter.dateFrom);
      if (filter.dateTo) params.set('endDate', filter.dateTo);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar logs');
      const data = await res.json();
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters: filter,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = {
    total: logs.length,
    critical: logs.filter((log) => log.severity === 'critical').length,
    warning: logs.filter((log) => log.severity === 'warning').length,
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Logs de auditoria avançados</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm"
          >
            Exportar
          </button>
          <button
            onClick={fetchLogs}
            className="px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm"
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Avisos</h3>
          <p className="text-2xl font-bold text-yellow-600">{summary.warning}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Críticos</h3>
          <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
        </div>
      </div>
      
      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Admin (e-mail)"
            value={filter.adminEmail}
            onChange={(e) => setFilter({ ...filter, adminEmail: e.target.value })}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Ação"
            value={filter.action}
            onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="border p-2"
          />
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            className="border p-2"
          >
            <option value="all">Severidade</option>
            <option value="info">Informação</option>
            <option value="warning">Aviso</option>
            <option value="critical">Crítico</option>
          </select>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
            className="border p-2"
          />
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
            className="border p-2"
          />
        </div>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Logs de Auditoria</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-10 bg-zinc-800/70 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum log encontrado.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b text-xs text-zinc-500">
                <th className="text-left p-2">Admin</th>
                <th className="text-left p-2">Ação</th>
                <th className="text-left p-2">Categoria</th>
                <th className="text-left p-2">Severidade</th>
                <th className="text-left p-2">Alvo</th>
                <th className="text-left p-2">Data/Hora</th>
                <th className="text-left p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-zinc-900/60 text-sm">
                  <td className="p-2">{log.adminEmail || log.userId || '—'}</td>
                  <td className="p-2">{log.action || '—'}</td>
                  <td className="p-2">{log.category || '—'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.severity === 'critical'
                        ? 'bg-rose-500/15 text-rose-300'
                        : log.severity === 'warning'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-zinc-800/70 text-zinc-400'
                    }`}>
                      {severityLabels[log.severity || 'info'] ?? log.severity ?? 'informação'}
                    </span>
                  </td>
                  <td className="p-2">
                    {log.targetType ? `${log.targetType}:${log.targetId?.slice(0, 8) || ''}` : '—'}
                  </td>
                  <td className="p-2">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="p-2">{log.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

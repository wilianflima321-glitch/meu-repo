'use client';

import { useCallback, useEffect, useState } from 'react';

type SecurityLog = {
  id: string;
  adminEmail?: string | null;
  action?: string | null;
  severity?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

type SecurityOverview = {
  settings: {
    enforce2FA: boolean;
    blockSuspiciousIps: boolean;
  };
  stats: { total: number; warning: number; critical: number };
  logs: SecurityLog[];
};

export default function AdminSecurity() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const severityLabels: Record<string, string> = {
    critical: 'crítico',
    warning: 'aviso',
    info: 'informação',
  };

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security/overview');
      if (!res.ok) throw new Error('Falha ao carregar segurança');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar segurança');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const filteredLogs = (data?.logs || []).filter((log) => {
    const term = search.trim().toLowerCase();
    return !term ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.adminEmail || '').toLowerCase().includes(term) ||
      (log.ipAddress || '').toLowerCase().includes(term);
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Segurança e Logs</h1>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchSecurity}
          className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Eventos</h3>
          <p className='text-2xl font-bold text-blue-600'>{data?.stats.total ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Avisos</h3>
          <p className='text-2xl font-bold text-yellow-600'>{data?.stats.warning ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Críticos</h3>
          <p className='text-2xl font-bold text-red-600'>{data?.stats.critical ?? 0}</p>
        </div>
      </div>

      <div className='mb-6 bg-white rounded-lg shadow p-4'>
        <h2 className='text-xl font-semibold mb-4'>Configurações de Segurança</h2>
        {loading ? (
          <p className='text-sm text-gray-500'>Carregando configurações...</p>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>2FA obrigatório</p>
                <p className='text-xs text-gray-500'>Configurado via variável de ambiente</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                data?.settings.enforce2FA ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {data?.settings.enforce2FA ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Bloqueio de IP suspeito</p>
                <p className='text-xs text-gray-500'>Configurado via variável de ambiente</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                data?.settings.blockSuspiciousIps ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {data?.settings.blockSuspiciousIps ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className='bg-white rounded-lg shadow p-4'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Logs de Auditoria</h2>
          <input
            type='text'
            placeholder='Buscar logs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='border p-2 rounded text-sm'
          />
        </div>
        <table className='w-full'>
          <thead>
            <tr className='bg-gray-100 text-sm'>
              <th className='p-3 text-left'>Ação</th>
              <th className='p-3 text-left'>Admin</th>
              <th className='p-3 text-left'>Severidade</th>
              <th className='p-3 text-left'>Data/Hora</th>
              <th className='p-3 text-left'>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-3 text-sm text-gray-500' colSpan={5}>Carregando logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td className='p-3 text-sm text-gray-500' colSpan={5}>Nenhum log encontrado.</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className='border-t'>
                  <td className='p-3'>{log.action || '—'}</td>
                  <td className='p-3'>{log.adminEmail || '—'}</td>
                  <td className='p-3'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.severity === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : log.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {severityLabels[log.severity || 'info'] ?? log.severity ?? 'informação'}
                    </span>
                  </td>
                  <td className='p-3'>{new Date(log.createdAt).toLocaleString()}</td>
                  <td className='p-3'>{log.ipAddress || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

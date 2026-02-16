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
    critical: 'critico',
    warning: 'aviso',
    info: 'informacao',
  };

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security/overview');
      if (!res.ok) throw new Error('Falha ao carregar seguranca');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar seguranca');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const filteredLogs = (data?.logs || []).filter((log) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.adminEmail || '').toLowerCase().includes(term) ||
      (log.ipAddress || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Seguranca e Logs</h1>
          <p className='text-zinc-400'>Visao operacional de hardening, eventos criticos e trilha de auditoria.</p>
          {lastUpdated && <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <button
          onClick={fetchSecurity}
          className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm hover:bg-zinc-700/80'
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className='mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Eventos</h3>
          <p className='text-2xl font-bold text-blue-300'>{data?.stats.total ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Avisos</h3>
          <p className='text-2xl font-bold text-amber-300'>{data?.stats.warning ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Criticos</h3>
          <p className='text-2xl font-bold text-rose-300'>{data?.stats.critical ?? 0}</p>
        </div>
      </div>

      <div className='mb-6 bg-zinc-900/70 rounded-lg shadow p-4'>
        <h2 className='text-xl font-semibold mb-4'>Configuracoes de Seguranca</h2>
        {loading ? (
          <p className='text-sm text-zinc-500'>Carregando configuracoes...</p>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>2FA obrigatorio</p>
                <p className='text-xs text-zinc-500'>Controlado por ambiente e politica global de autenticacao.</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  data?.settings.enforce2FA ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {data?.settings.enforce2FA ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Bloqueio de IP suspeito</p>
                <p className='text-xs text-zinc-500'>Controlado por regras server-side e observabilidade de rede.</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  data?.settings.blockSuspiciousIps ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {data?.settings.blockSuspiciousIps ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow p-4'>
        <div className='flex items-center justify-between mb-4 gap-3'>
          <h2 className='text-xl font-semibold'>Logs de Auditoria</h2>
          <input
            type='text'
            placeholder='Buscar por acao, admin ou IP'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='border border-zinc-700 bg-zinc-950/60 p-2 rounded text-sm text-zinc-100 placeholder:text-zinc-500'
          />
        </div>
        <table className='w-full'>
          <thead>
            <tr className='bg-zinc-800/70 text-sm'>
              <th className='p-3 text-left'>Acao</th>
              <th className='p-3 text-left'>Admin</th>
              <th className='p-3 text-left'>Severidade</th>
              <th className='p-3 text-left'>Data/Hora</th>
              <th className='p-3 text-left'>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-3 text-sm text-zinc-500' colSpan={5}>Carregando logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td className='p-3 text-sm text-zinc-500' colSpan={5}>Nenhum log encontrado.</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className='border-t border-zinc-800/70'>
                  <td className='p-3'>{log.action || '?'}</td>
                  <td className='p-3'>{log.adminEmail || '?'}</td>
                  <td className='p-3'>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        log.severity === 'critical'
                          ? 'bg-rose-500/15 text-rose-300'
                          : log.severity === 'warning'
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-zinc-800/70 text-zinc-400'
                      }`}
                    >
                      {severityLabels[log.severity || 'info'] ?? log.severity ?? 'informacao'}
                    </span>
                  </td>
                  <td className='p-3'>{new Date(log.createdAt).toLocaleString()}</td>
                  <td className='p-3'>{log.ipAddress || '?'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

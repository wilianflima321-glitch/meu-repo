'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ShieldAlert } from 'lucide-react';

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';
import { getToken } from '@/lib/auth';

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

  const getAuthHeaders = useCallback(() => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/security/overview', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || 'Falha ao carregar seguranca');
      }
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar seguranca');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

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
          <p className='text-[var(--aethel-text-secondary)]'>Visao operacional de hardening, eventos criticos e trilha de auditoria.</p>
          {lastUpdated && <p className='text-xs text-[var(--aethel-text-tertiary)]'>Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <button
          onClick={fetchSecurity}
          className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_80%,transparent)]'
        >
          Atualizar
        </button>
      </div>

      {error && (
        <div className='mb-4 rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-error)]'>
          {error}
        </div>
      )}

      <AdminSummaryGrid
        className='mb-6'
        columns={3}
        items={[
          {
            icon: Activity,
            label: 'Eventos',
            value: data?.stats.total ?? 0,
          },
          {
            icon: AlertTriangle,
            label: 'Avisos',
            value: data?.stats.warning ?? 0,
            tone: 'warning',
          },
          {
            icon: ShieldAlert,
            label: 'Cr??ticos',
            value: data?.stats.critical ?? 0,
            tone: 'error',
          },
        ]}
      />
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Avisos</h3>
          <p className='text-2xl font-bold text-[var(--aethel-warning)]'>{data?.stats.warning ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Criticos</h3>
          <p className='text-2xl font-bold text-[var(--aethel-error)]'>{data?.stats.critical ?? 0}</p>
        </div>
      </div>

      <div className='mb-6 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow p-4'>
        <h2 className='text-xl font-semibold mb-4'>Configuracoes de Seguranca</h2>
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Carregando configuracoes...</p>
        ) : (
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>2FA obrigatorio</p>
                <p className='text-xs text-[var(--aethel-text-tertiary)]'>Controlado por ambiente e politica global de autenticacao.</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  data?.settings.enforce2FA ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                }`}
              >
                {data?.settings.enforce2FA ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-medium'>Bloqueio de IP suspeito</p>
                <p className='text-xs text-[var(--aethel-text-tertiary)]'>Controlado por regras server-side e observabilidade de rede.</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  data?.settings.blockSuspiciousIps ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                }`}
              >
                {data?.settings.blockSuspiciousIps ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow p-4'>
        <div className='flex items-center justify-between mb-4 gap-3'>
          <h2 className='text-xl font-semibold'>Logs de Auditoria</h2>
          <input
            type='text'
            placeholder='Buscar por acao, admin ou IP'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-2 rounded text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)]'
          />
        </div>
        <table className='w-full'>
          <thead>
            <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm'>
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
                <td className='p-3 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Carregando logs...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td className='p-3 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Nenhum log encontrado.</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className='border-t border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]'>
                  <td className='p-3'>{log.action || '?'}</td>
                  <td className='p-3'>{log.adminEmail || '?'}</td>
                  <td className='p-3'>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        log.severity === 'critical'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
                          : log.severity === 'warning'
                            ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                            : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
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

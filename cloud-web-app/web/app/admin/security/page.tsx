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
    critical: 'Critico',
    warning: 'Aviso',
    info: 'Informacao',
  };

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<SecurityOverview>('/api/admin/security/overview');
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

  const filteredLogs = useMemo(
    () =>
      (data?.logs || []).filter((log) => {
        const term = search.trim().toLowerCase();
        return (
          !term ||
          (log.action || '').toLowerCase().includes(term) ||
          (log.adminEmail || '').toLowerCase().includes(term) ||
          (log.ipAddress || '').toLowerCase().includes(term)
        );
      }),
    [data?.logs, search],
  );

  return (
    <AdminPageShell
      title='Seguranca e Logs'
      description='Visao operacional de hardening, eventos criticos e trilha de auditoria.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchSecurity}>Atualizar</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Eventos' value={data?.stats.total ?? 0} tone='sky' />
          <AdminStatCard label='Avisos' value={data?.stats.warning ?? 0} tone='amber' />
          <AdminStatCard label='Criticos' value={data?.stats.critical ?? 0} tone='rose' />
          <AdminStatCard label='2FA obrigatorio' value={data?.settings.enforce2FA ? 'Ativo' : 'Inativo'} tone={data?.settings.enforce2FA ? 'emerald' : 'neutral'} />
        </AdminStatGrid>
      </div>

      <AdminSection title='Configuracoes de Seguranca' className='mb-6'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Carregando configuracoes...</p>
        ) : (
          <div className='space-y-3'>
            <AdminStatusBanner tone='info'>
              Controles nesta superficie refletem politicas server-side. Ajustes sao aplicados via ambiente/ops.
            </AdminStatusBanner>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='font-medium'>2FA obrigatorio</p>
                <p className='text-xs text-zinc-500'>Controlado por ambiente e politica global de autenticacao.</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  data?.settings.enforce2FA ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {data?.settings.enforce2FA ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <p className='font-medium'>Bloqueio de IP suspeito</p>
                <p className='text-xs text-zinc-500'>Controlado por regras server-side e observabilidade de rede.</p>
              </div>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  data?.settings.blockSuspiciousIps ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {data?.settings.blockSuspiciousIps ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection title='Logs de Auditoria'>
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Buscar por acao, admin ou IP'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Acao</th>
                <th className='p-3 text-left'>Admin</th>
                <th className='p-3 text-left'>Severidade</th>
                <th className='p-3 text-left'>Data/Hora</th>
                <th className='p-3 text-left'>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Carregando logs...' />
              ) : filteredLogs.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='Nenhum log encontrado.' />
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>{log.action || '?'}</td>
                    <td className='p-3'>{log.adminEmail || '?'}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          log.severity === 'critical'
                            ? 'bg-rose-500/15 text-rose-300'
                            : log.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-zinc-800/70 text-zinc-400'
                        }`}
                      >
                        {severityLabels[log.severity || 'info'] ?? log.severity ?? 'Informacao'}
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
      </AdminSection>
    </AdminPageShell>
  );
}


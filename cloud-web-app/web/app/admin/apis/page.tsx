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

type Integration = {
  id: string;
  name: string;
  envKey: string;
  configured: boolean;
};

type CompatibilityRouteMetric = {
  route: string;
  replacement: string;
  status: 'deprecated' | 'compatibility-wrapper';
  hits: number;
  lastHitAt: string;
  deprecatedSince?: string;
  removalCycleTarget?: string;
  deprecationPolicy?: string;
  candidateForRemoval?: boolean;
  silenceDays?: number;
};

export default function APIs() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [compatRoutes, setCompatRoutes] = useState<CompatibilityRouteMetric[]>([]);
  const [removalCandidates, setRemovalCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'missing'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<{ integrations?: Integration[] }>('/api/admin/apis');
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar integracoes');
    }

    try {
      const compatData = await adminJsonFetch<{
        routes?: CompatibilityRouteMetric[];
        removalCandidates?: string[];
      }>('/api/admin/compatibility-routes');
      setCompatRoutes(Array.isArray(compatData?.routes) ? compatData.routes : []);
      setRemovalCandidates(Array.isArray(compatData?.removalCandidates) ? compatData.removalCandidates : []);
      setCompatError(null);
    } catch (err) {
      setCompatError(err instanceof Error ? err.message : 'Erro ao carregar rotas de compatibilidade');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = useMemo(
    () =>
      integrations.filter((integration) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          integration.name.toLowerCase().includes(term) ||
          integration.envKey.toLowerCase().includes(term);
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'configured' ? integration.configured : !integration.configured);
        return matchesSearch && matchesStatus;
      }),
    [integrations, search, statusFilter],
  );

  const summary = {
    total: integrations.length,
    configured: integrations.filter((integration) => integration.configured).length,
    missing: integrations.filter((integration) => !integration.configured).length,
  };

  return (
    <AdminPageShell
      title='Gerenciamento de APIs'
      description='Status real de integracao com provedores externos e chaves de ambiente.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchIntegrations}>Atualizar</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total' value={summary.total} tone='sky' />
          <AdminStatCard label='Configuradas' value={summary.configured} tone='emerald' />
          <AdminStatCard label='Ausentes' value={summary.missing} tone='amber' />
          <AdminStatCard label='Cutoff candidates' value={removalCandidates.length} tone='emerald' />
        </AdminStatGrid>
      </div>
      {summary.missing > 0 ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='warning'>
            Existem integracoes ausentes. Recursos dependentes (IA, render, externos) retornarao erro explicito ate que as
            chaves de ambiente estejam configuradas.
          </AdminStatusBanner>
        </div>
      ) : null}

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Buscar por nome ou ambiente'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <div className='flex items-center gap-2'>
            {(['all', 'configured', 'missing'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                  statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {status === 'all' ? 'Todas' : status === 'configured' ? 'Configuradas' : 'Ausentes'}
              </button>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection className='mb-4 p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Nome</th>
                <th className='p-3 text-left'>Chave</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Ambiente</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={4} message='Carregando integracoes...' />
              ) : filteredIntegrations.length === 0 ? (
                <AdminTableStateRow colSpan={4} message='Nenhuma integracao encontrada com os filtros atuais.' />
              ) : (
                filteredIntegrations.map((integration) => (
                  <tr key={integration.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>{integration.name}</td>
                    <td className='p-3 text-xs text-zinc-400'>
                      {integration.configured ? 'configured (masked)' : 'not configured'}
                    </td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          integration.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {integration.configured ? 'Configurada' : 'Ausente'}
                      </span>
                    </td>
                    <td className='p-3 text-xs text-zinc-500'>{integration.envKey}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <p className='mb-6 text-xs text-zinc-500'>
        Operacao esperada: status configurado deve refletir chave valida no ambiente de execucao e disponibilidade do provedor.
      </p>

      <AdminSection title='Deprecacao de Rotas (2 ciclos)' subtitle='Telemetria operacional'>
        {compatError ? (
          <AdminStatusBanner tone='danger'>{compatError}</AdminStatusBanner>
        ) : loading ? (
          <p className='text-sm text-zinc-500'>Carregando metricas de deprecacao...</p>
        ) : compatRoutes.length === 0 ? (
          <p className='text-sm text-zinc-500'>Sem eventos de rota legada registrados no periodo atual.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-zinc-800/80 text-zinc-400'>
                  <th className='p-2 text-left'>Rota</th>
                  <th className='p-2 text-left'>Replacement</th>
                  <th className='p-2 text-left'>Hits</th>
                  <th className='p-2 text-left'>Ultimo hit</th>
                  <th className='p-2 text-left'>Ciclo alvo</th>
                  <th className='p-2 text-left'>Ready for cutoff</th>
                </tr>
              </thead>
              <tbody>
                {compatRoutes.map((route) => (
                  <tr key={`${route.status}:${route.route}`} className='border-b border-zinc-800/60'>
                    <td className='p-2 font-mono text-xs text-zinc-300'>{route.route}</td>
                    <td className='p-2 text-zinc-400'>{route.replacement}</td>
                    <td className='p-2 text-zinc-300'>{route.hits}</td>
                    <td className='p-2 text-zinc-500'>
                      {route.lastHitAt ? new Date(route.lastHitAt).toLocaleString() : 'never'}
                    </td>
                    <td className='p-2 text-zinc-500'>{route.removalCycleTarget || 'n/a'}</td>
                    <td className='p-2'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          route.candidateForRemoval ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {route.candidateForRemoval ? 'candidate' : 'monitor'}
                      </span>
                      {typeof route.silenceDays === 'number' ? (
                        <span className='ml-2 text-[11px] text-zinc-500'>{route.silenceDays}d silence</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {removalCandidates.length > 0 ? (
          <div className='mt-3'>
            <AdminStatusBanner tone='success'>
              Candidates ready for cutoff (subject to PM approval): {removalCandidates.join(', ')}
            </AdminStatusBanner>
          </div>
        ) : null}

        <p className='mt-3 text-xs text-zinc-500'>
          Regra de corte: remover rota legada somente com 0 hits por 14 dias consecutivos e 0 uso frontend confirmado por scanner.
        </p>
      </AdminSection>
    </AdminPageShell>
  );
}


'use client';

import { useCallback, useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

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

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/apis', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Falha ao carregar integracoes');
      const data = await res.json();
      setIntegrations(Array.isArray(data?.integrations) ? data.integrations : []);
      setLastUpdated(new Date());
      setError(null);

      const compatRes = await fetch('/api/admin/compatibility-routes', { headers: getAuthHeaders() });
      if (!compatRes.ok) throw new Error('Falha ao carregar rotas de compatibilidade');
      const compatData = await compatRes.json();
      setCompatRoutes(Array.isArray(compatData?.routes) ? compatData.routes : []);
      setRemovalCandidates(Array.isArray(compatData?.removalCandidates) ? compatData.removalCandidates : []);
      setCompatError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar integracoes';
      if (message.includes('compatibilidade')) {
        setCompatError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filteredIntegrations = integrations.filter((integration) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      integration.name.toLowerCase().includes(term) ||
      integration.envKey.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'configured' ? integration.configured : !integration.configured);
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: integrations.length,
    configured: integrations.filter((integration) => integration.configured).length,
    missing: integrations.filter((integration) => !integration.configured).length,
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Gerenciamento de APIs</h1>
          <p className='text-zinc-400'>Status real de integracao com provedores externos e chaves de ambiente.</p>
          {lastUpdated && (
            <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchIntegrations}
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

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Total</h3>
          <p className='text-2xl font-bold text-blue-300'>{summary.total}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Configuradas</h3>
          <p className='text-2xl font-bold text-emerald-300'>{summary.configured}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Ausentes</h3>
          <p className='text-2xl font-bold text-amber-300'>{summary.missing}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Cutoff candidates</h3>
          <p className='text-2xl font-bold text-emerald-300'>{removalCandidates.length}</p>
        </div>
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar por nome ou ambiente'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border border-zinc-700 bg-zinc-950/60 p-2 rounded w-full md:max-w-sm text-zinc-100 placeholder:text-zinc-500'
        />
        <div className='flex items-center gap-2'>
          {(['all', 'configured', 'missing'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-400'
              }`}
            >
              {status === 'all' ? 'Todas' : status === 'configured' ? 'Configuradas' : 'Ausentes'}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full table-auto bg-zinc-900/70 rounded-lg shadow overflow-hidden'>
        <thead>
          <tr className='bg-zinc-800/70 text-sm'>
            <th className='p-2 text-left'>Nome</th>
            <th className='p-2 text-left'>Chave</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Ambiente</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-zinc-500' colSpan={4}>Carregando integracoes...</td>
            </tr>
          ) : filteredIntegrations.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-zinc-500' colSpan={4}>Nenhuma integracao encontrada com os filtros atuais.</td>
            </tr>
          ) : (
            filteredIntegrations.map((integration) => (
              <tr key={integration.id} className='border-t border-zinc-800/70'>
                <td className='p-2'>{integration.name}</td>
                <td className='p-2 text-xs text-zinc-400'>
                  {integration.configured ? 'configured (masked)' : 'not configured'}
                </td>
                <td className='p-2'>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      integration.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                    }`}
                  >
                    {integration.configured ? 'Configurada' : 'Ausente'}
                  </span>
                </td>
                <td className='p-2 text-xs text-zinc-500'>{integration.envKey}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className='mt-4 text-xs text-zinc-500'>
        Operacao esperada: status configurado deve refletir chave valida no ambiente de execucao e disponibilidade do provedor.
      </p>

      <div className='mt-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-base font-semibold'>Deprecacao de Rotas (2 ciclos)</h2>
          <span className='text-xs text-zinc-500'>Telemetria operacional</span>
        </div>
        {compatError ? (
          <div className='rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'>{compatError}</div>
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
                    <td className='p-2 text-zinc-500'>{route.lastHitAt ? new Date(route.lastHitAt).toLocaleString() : 'never'}</td>
                    <td className='p-2 text-zinc-500'>{route.removalCycleTarget || 'n/a'}</td>
                    <td className='p-2'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          route.candidateForRemoval
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {route.candidateForRemoval ? 'candidate' : 'monitor'}
                      </span>
                      {typeof route.silenceDays === 'number' && (
                        <span className='ml-2 text-[11px] text-zinc-500'>{route.silenceDays}d silence</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {removalCandidates.length > 0 && (
          <div className='mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200'>
            Candidates ready for cutoff (subject to PM approval): {removalCandidates.join(', ')}
          </div>
        )}
        <p className='mt-3 text-xs text-zinc-500'>
          Regra de corte: remover rota legada somente com 0 hits por 14 dias consecutivos e 0 uso frontend confirmado por scanner.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type OnboardingStats = {
  totalActions: number;
  uniqueUsers: number;
  lastActivity: string | null;
  actionCounts: Record<string, number>;
};

export default function Onboarding() {
  const [stats, setStats] = useState<OnboardingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/onboarding/stats');
      if (!res.ok) throw new Error('Falha ao carregar estatísticas de onboarding');
      const data = await res.json();
      setStats(data?.stats ?? null);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar onboarding');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredActions = Object.entries(stats?.actionCounts || {}).filter(([action]) => {
    const term = search.trim().toLowerCase();
    return !term || action.toLowerCase().includes(term);
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Onboarding de usuários</h1>
          <p className='text-zinc-400'>Resumo das ações registradas no onboarding.</p>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchStats}
          className="px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Carregando estatísticas...</p>
        ) : error ? (
          <p className='text-sm text-red-500'>{error}</p>
        ) : !stats ? (
          <p className='text-sm text-zinc-500'>Sem dados disponíveis.</p>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='text-center'>
              <p className='text-sm font-semibold'>Ações registradas</p>
              <p className='text-2xl font-bold text-blue-600'>{stats.totalActions}</p>
            </div>
            <div className='text-center'>
              <p className='text-sm font-semibold'>Usuários únicos</p>
              <p className='text-2xl font-bold text-green-600'>{stats.uniqueUsers}</p>
            </div>
            <div className='text-center'>
              <p className='text-sm font-semibold'>Última atividade</p>
              <p className='text-sm text-zinc-400'>
                {stats.lastActivity ? new Date(stats.lastActivity).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow'>
        <div className="flex items-center justify-between mb-4">
          <h2 className='text-lg font-semibold'>Ações por tipo</h2>
          <input
            type="text"
            placeholder="Buscar ação"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded text-sm"
          />
        </div>
        {filteredActions.length > 0 ? (
          <ul>
            {filteredActions.map(([action, count]) => (
              <li key={action} className='flex justify-between border-b p-2'>
                <span>{action}</span>
                <span className='text-sm text-zinc-400'>{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-zinc-500'>Nenhuma ação registrada.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type AdminAnalyticsMetrics = {
  activeUsers: number;
  dailyRevenue: number;
  aiTokens: number;
  requestsPerMinute: number;
  aiCostToday: number;
};

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const [quickStatsRes, financeRes, aiRes] = await Promise.all([
        fetch('/api/admin/quick-stats'),
        fetch('/api/admin/finance/metrics?range=today'),
        fetch('/api/admin/ai/metrics'),
      ]);

      if (!quickStatsRes.ok) throw new Error('Falha ao carregar estatísticas rápidas');
      if (!financeRes.ok) throw new Error('Falha ao carregar métricas financeiras');
      if (!aiRes.ok) throw new Error('Falha ao carregar métricas de IA');

      const quickStats = await quickStatsRes.json();
      const finance = await financeRes.json();
      const ai = await aiRes.json();

      setMetrics({
        activeUsers: quickStats?.stats?.activeUsers ?? 0,
        dailyRevenue: finance?.dailyRevenue ?? 0,
        aiTokens: ai?.metrics?.totalTokens ?? 0,
        requestsPerMinute: quickStats?.stats?.requestsPerMinute ?? 0,
        aiCostToday: quickStats?.stats?.aiCostToday ?? 0,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleExport = useCallback(() => {
    if (!metrics) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      metrics,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [metrics]);

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Análises e relatórios</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className='bg-blue-500 text-white px-4 py-2 rounded' onClick={handleExport}>
            Exportar Relatório
          </button>
          <button className='bg-zinc-800/70 text-zinc-300 px-4 py-2 rounded' onClick={fetchMetrics}>
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4">
          {error}
          <button className='ml-3 text-sm underline' onClick={fetchMetrics}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        {(loading ? Array.from({ length: 3 }) : [1, 2, 3]).map((_, index) => (
          <div key={index} className='bg-zinc-900/70 p-4 rounded-lg shadow'>
            {loading ? (
              <div className="h-16 bg-zinc-800/70 rounded animate-pulse" />
            ) : (
              <>
                {index === 0 && (
                  <>
                    <h3 className='text-lg font-semibold'>Usuários Ativos (1h)</h3>
                    <p className='text-2xl'>{metrics?.activeUsers ?? 0}</p>
                    <p className='text-xs text-zinc-500'>Req/min: {metrics?.requestsPerMinute ?? 0}</p>
                  </>
                )}
                {index === 1 && (
                  <>
                    <h3 className='text-lg font-semibold'>Receita diária (US$)</h3>
                    <p className='text-2xl'>{(metrics?.dailyRevenue ?? 0).toFixed(2)}</p>
                    <p className='text-xs text-zinc-500'>Custo de IA hoje: ${(metrics?.aiCostToday ?? 0).toFixed(2)}</p>
                  </>
                )}
                {index === 2 && (
                  <>
                    <h3 className='text-lg font-semibold'>Uso de IA (tokens/24h)</h3>
                    <p className='text-2xl'>{metrics?.aiTokens?.toLocaleString() ?? '0'}</p>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

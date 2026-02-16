'use client';

import { useCallback, useEffect, useState } from 'react';

type FinanceMetrics = {
  dailyRevenue: number;
  dailyAICost: number;
  dailyInfraCost: number;
  dailyProfit: number;
  profitMargin: number;
  burnRate: number;
  runway: number;
  alerts: { type: 'warning' | 'critical'; message: string; metric: string }[];
};

export default function CostOptimization() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/finance/metrics?range=30d');
      if (!res.ok) throw new Error('Falha ao carregar métricas financeiras');
      const data = await res.json();
      setMetrics({
        dailyRevenue: data?.dailyRevenue ?? 0,
        dailyAICost: data?.dailyAICost ?? 0,
        dailyInfraCost: data?.dailyInfraCost ?? 0,
        dailyProfit: data?.dailyProfit ?? 0,
        profitMargin: data?.profitMargin ?? 0,
        burnRate: data?.burnRate ?? 0,
        runway: data?.runway ?? 0,
        alerts: Array.isArray(data?.alerts) ? data.alerts : [],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar custos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className='p-6 max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6'>Otimização de Custos</h1>
        <p className='text-sm text-zinc-500'>Carregando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-6 max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6'>Otimização de Custos</h1>
        <p className='text-sm text-red-500'>{error}</p>
        <button className='mt-4 bg-blue-500 text-white px-4 py-2 rounded' onClick={fetchMetrics}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const dailyInfra = metrics?.dailyInfraCost ?? 0;
  const dailyAI = metrics?.dailyAICost ?? 0;
  const dailyRevenue = metrics?.dailyRevenue ?? 0;
  const dailyProfit = metrics?.dailyProfit ?? 0;

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Otimização de Custos</h1>
      <p className='mb-4 text-zinc-400'>Custos e margem baseados em dados financeiros reais.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Resumo de Custos (30 dias)</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='p-4 bg-zinc-900/70 rounded-lg shadow'>
            <h3 className='font-semibold'>IA (diário)</h3>
            <p className='text-2xl'>${dailyAI.toFixed(2)}</p>
            <p className='text-sm text-zinc-400'>Custo médio diário de IA</p>
          </div>
          <div className='p-4 bg-zinc-900/70 rounded-lg shadow'>
            <h3 className='font-semibold'>Infra (diário)</h3>
            <p className='text-2xl'>${dailyInfra.toFixed(2)}</p>
            <p className='text-sm text-zinc-400'>Infra configurada por ambiente</p>
          </div>
          <div className='p-4 bg-zinc-900/70 rounded-lg shadow'>
            <h3 className='font-semibold'>Receita (diária)</h3>
            <p className='text-2xl'>${dailyRevenue.toFixed(2)}</p>
            <p className='text-sm text-zinc-400'>Baseada em pagamentos confirmados</p>
          </div>
          <div className={`p-4 rounded-lg shadow ${dailyProfit >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
            <h3 className='font-semibold'>Lucro (diário)</h3>
            <p className='text-2xl'>${dailyProfit.toFixed(2)}</p>
            <p className='text-sm text-zinc-400'>Margem: {metrics?.profitMargin?.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Queima diária e fôlego</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='p-4 bg-zinc-900/70 rounded-lg shadow'>
            <h3 className='font-semibold'>Queima diária</h3>
            <p className='text-2xl'>${(metrics?.burnRate ?? 0).toFixed(2)}/dia</p>
            <p className='text-sm text-zinc-400'>Diferença custo - receita</p>
          </div>
          <div className='p-4 bg-zinc-900/70 rounded-lg shadow'>
            <h3 className='font-semibold'>Fôlego</h3>
            <p className='text-2xl'>{metrics?.runway ?? 0} meses</p>
            <p className='text-sm text-zinc-400'>Baseado em caixa configurado</p>
          </div>
        </div>
      </div>

      <div className='mt-6 p-4 bg-sky-500/15 rounded-lg'>
        <h3 className='font-semibold'>Recomendações</h3>
        {metrics?.alerts?.length ? (
          <ul className='list-disc ml-5'>
            {metrics.alerts.map((alert, index) => (
              <li key={`${alert.metric}-${index}`}>{alert.message}</li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-zinc-300'>Nenhuma recomendação crítica no momento.</p>
        )}
      </div>
    </div>
  );
}

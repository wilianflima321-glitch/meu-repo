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
      if (!res.ok) throw new Error('Failed to load financial metrics');
      const data = await res.json();
      setMetrics({
        dailyRevenue: data?.dailyRevenue || 0,
        dailyAICost: data?.dailyAICost || 0,
        dailyInfraCost: data?.dailyInfraCost || 0,
        dailyProfit: data?.dailyProfit || 0,
        profitMargin: data?.profitMargin || 0,
        burnRate: data?.burnRate || 0,
        runway: data?.runway || 0,
        alerts: Array.isArray(data?.alerts) ? data.alerts : [],
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading custos');
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
        <h1 className='text-3xl font-bold mb-6'>Optimization de Costs</h1>
        <p className='text-sm text-[var(--aethel-text-tertiary)]'>Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-6 max-w-4xl mx-auto'>
        <h1 className='text-3xl font-bold mb-6'>Optimization de Costs</h1>
        <p className='text-sm text-[var(--aethel-error)]'>{error}</p>
        <button type="button" className='mt-4 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] px-4 py-2 rounded' onClick={fetchMetrics}>
          Tentar novamente
        </button>
      </div>
    );
  }

  const dailyInfra = metrics?.dailyInfraCost || 0;
  const dailyAI = metrics?.dailyAICost || 0;
  const dailyRevenue = metrics?.dailyRevenue || 0;
  const dailyProfit = metrics?.dailyProfit || 0;

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-6'>Optimization de Costs</h1>
      <p className='mb-4 text-[var(--aethel-text-secondary)]'>Costs e margem baseados em dados financeiros reais.</p>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Resumo de Costs (30 dias)</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
            <h3 className='font-semibold'>AI (daily)</h3>
            <p className='text-2xl'>${dailyAI.toFixed(2)}</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Average daily AI cost</p>
          </div>
          <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
            <h3 className='font-semibold'>Infra (daily)</h3>
            <p className='text-2xl'>${dailyInfra.toFixed(2)}</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Infra configurada por ambiente</p>
          </div>
          <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
            <h3 className='font-semibold'>Revenue (daily)</h3>
            <p className='text-2xl'>${dailyRevenue.toFixed(2)}</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Baseada em pagamentos confirmados</p>
          </div>
          <div className={`p-4 rounded-lg shadow ${dailyProfit >= 0 ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)]' : 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)]'}`}>
            <h3 className='font-semibold'>Profit (daily)</h3>
            <p className='text-2xl'>${dailyProfit.toFixed(2)}</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Margem: {metrics?.profitMargin?.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      <div className='mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Daily burn and runway</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
            <h3 className='font-semibold'>Daily burn</h3>
            <p className='text-2xl'>${(metrics?.burnRate || 0).toFixed(2)}/dia</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Cost - revenue difference</p>
          </div>
          <div className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
            <h3 className='font-semibold'>Runway</h3>
            <p className='text-2xl'>{metrics?.runway || 0} meses</p>
            <p className='text-sm text-[var(--aethel-text-secondary)]'>Baseado em caixa configurado</p>
          </div>
        </div>
      </div>

      <div className='mt-6 p-4 bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] rounded-lg'>
        <h3 className='font-semibold'>Recommendations</h3>
        {metrics?.alerts?.length ? (
          <ul className='list-disc ml-5'>
            {metrics.alerts.map((alert, index) => (
              <li key={`${alert.metric}-${index}`}>{alert.message}</li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-[var(--aethel-text-secondary)]'>No critical recommendation at the moment.</p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

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

function currency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CostOptimization() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<Partial<FinanceMetrics>>('/api/admin/finance/metrics?range=30d');
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
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cost metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const kpis = useMemo(() => {
    const current = metrics ?? {
      dailyRevenue: 0,
      dailyAICost: 0,
      dailyInfraCost: 0,
      dailyProfit: 0,
      profitMargin: 0,
      burnRate: 0,
      runway: 0,
      alerts: [],
    };

    return {
      ...current,
      totalDailyCost: current.dailyAICost + current.dailyInfraCost,
    };
  }, [metrics]);

  return (
    <AdminPageShell
      title='Cost Optimization'
      description='Track AI and infrastructure cost against revenue with explicit margin and runway signals.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchMetrics}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Revenue / day' value={currency(kpis.dailyRevenue)} tone='sky' />
          <AdminStatCard label='AI cost / day' value={currency(kpis.dailyAICost)} tone='amber' />
          <AdminStatCard label='Infra cost / day' value={currency(kpis.dailyInfraCost)} tone='rose' />
          <AdminStatCard label='Profit / day' value={currency(kpis.dailyProfit)} tone={kpis.dailyProfit >= 0 ? 'emerald' : 'rose'} />
        </AdminStatGrid>
      </div>

      <AdminSection title='Operational economics' className='mb-6'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Loading financial metrics...</p>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/50 p-4'>
              <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>Total cost / day</p>
              <p className='mt-2 text-2xl font-semibold text-zinc-100'>{currency(kpis.totalDailyCost)}</p>
              <p className='mt-1 text-xs text-zinc-500'>AI + infrastructure spend</p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/50 p-4'>
              <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>Profit margin</p>
              <p className='mt-2 text-2xl font-semibold text-zinc-100'>{kpis.profitMargin.toFixed(1)}%</p>
              <p className='mt-1 text-xs text-zinc-500'>Based on current daily revenue</p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/50 p-4'>
              <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>Burn rate</p>
              <p className='mt-2 text-2xl font-semibold text-zinc-100'>{currency(kpis.burnRate)} / day</p>
              <p className='mt-1 text-xs text-zinc-500'>Net daily deficit after revenue</p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/50 p-4'>
              <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>Runway</p>
              <p className='mt-2 text-2xl font-semibold text-zinc-100'>{kpis.runway} months</p>
              <p className='mt-1 text-xs text-zinc-500'>Estimated with configured reserves</p>
            </div>
          </div>
        )}
      </AdminSection>

      <AdminSection title='Recommendations'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Waiting for recommendations...</p>
        ) : kpis.alerts.length > 0 ? (
          <ul className='space-y-2'>
            {kpis.alerts.map((alert, index) => (
              <li
                key={`${alert.metric}-${index}`}
                className={`rounded border px-3 py-2 text-sm ${
                  alert.type === 'critical'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                }`}
              >
                {alert.message}
              </li>
            ))}
          </ul>
        ) : (
          <AdminStatusBanner tone='success'>No critical cost recommendations right now.</AdminStatusBanner>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}

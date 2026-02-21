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
  mrr: number;
  activeSubscriptions: number;
  churnRate: number;
};

export default function ArpuChurnPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<Partial<FinanceMetrics>>('/api/admin/finance/metrics?range=30d');
      setMetrics({
        mrr: data?.mrr ?? 0,
        activeSubscriptions: data?.activeSubscriptions ?? 0,
        churnRate: data?.churnRate ?? 0,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ARPU/churn metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const computed = useMemo(() => {
    const current = metrics ?? { mrr: 0, activeSubscriptions: 0, churnRate: 0 };
    const arpu = current.activeSubscriptions > 0 ? current.mrr / current.activeSubscriptions : 0;
    const retentionRate = Math.max(0, 100 - current.churnRate);
    return { ...current, arpu, retentionRate };
  }, [metrics]);

  return (
    <AdminPageShell
      title='ARPU and Churn'
      description='Track monetization efficiency and retention risk from real subscription metrics.'
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
          <AdminStatCard label='ARPU (30d)' value={`$${computed.arpu.toFixed(2)}`} tone='emerald' />
          <AdminStatCard label='Churn rate' value={`${computed.churnRate.toFixed(1)}%`} tone='rose' />
          <AdminStatCard label='Retention rate' value={`${computed.retentionRate.toFixed(1)}%`} tone='sky' />
          <AdminStatCard label='Active subs' value={computed.activeSubscriptions} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Data availability'>
        {loading ? (
          <p className='text-sm text-zinc-500'>Loading financial historical baseline...</p>
        ) : (
          <p className='text-sm text-zinc-500'>No consolidated long-term ARPU/churn time series is currently exposed in this panel.</p>
        )}
      </AdminSection>
    </AdminPageShell>
  );
}

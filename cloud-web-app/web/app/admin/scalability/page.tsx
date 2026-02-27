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

type InfrastructurePayload = {
  resources?: {
    cpu?: { usage?: number };
    memory?: { percentage?: number };
    network?: { in?: number; out?: number };
  };
  metrics?: {
    activeConnections?: number;
    errorRate?: number;
  };
};

type BillingPayload = {
  data?: {
    plan?: { name?: string };
    usage?: {
      aiTokens?: { used?: number; limit?: number };
      storage?: { used?: number; limit?: number };
      buildMinutes?: { used?: number; limit?: number };
    };
  };
};

export default function ScalabilityPage() {
  const [infra, setInfra] = useState<InfrastructurePayload>({});
  const [billing, setBilling] = useState<BillingPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [infraPayload, billingPayload] = await Promise.all([
        adminJsonFetch<InfrastructurePayload>('/api/admin/infrastructure/status'),
        adminJsonFetch<BillingPayload>('/api/billing/usage'),
      ]);
      setInfra(infraPayload ?? {});
      setBilling(billingPayload ?? {});
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scalability data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const usage = billing.data?.usage;
  const planName = billing.data?.plan?.name || '-';

  const aiPercent = useMemo(() => {
    const used = usage?.aiTokens?.used ?? 0;
    const limit = usage?.aiTokens?.limit ?? 1;
    return limit > 0 ? (used / limit) * 100 : 0;
  }, [usage?.aiTokens?.limit, usage?.aiTokens?.used]);

  return (
    <AdminPageShell
      title='Scalability'
      description='Cross-check infrastructure pressure and plan usage to keep scaling decisions predictable.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchData}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Plan' value={planName} tone='sky' />
          <AdminStatCard label='CPU Usage' value={`${(infra.resources?.cpu?.usage ?? 0).toFixed(1)}%`} tone='amber' />
          <AdminStatCard label='Memory Usage' value={`${(infra.resources?.memory?.percentage ?? 0).toFixed(1)}%`} tone='neutral' />
          <AdminStatCard label='AI Tokens Used' value={`${aiPercent.toFixed(1)}%`} tone='emerald' />
        </AdminStatGrid>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Runtime Indicators'>
          {loading ? (
            <p className='text-sm text-zinc-500'>Loading infrastructure indicators...</p>
          ) : (
            <div className='space-y-2 text-sm text-zinc-300'>
              <p>Active connections: {infra.metrics?.activeConnections ?? 0}</p>
              <p>Error rate: {(infra.metrics?.errorRate ?? 0).toFixed(2)}%</p>
              <p>Network in: {(infra.resources?.network?.in ?? 0).toLocaleString()} Bps</p>
              <p>Network out: {(infra.resources?.network?.out ?? 0).toLocaleString()} Bps</p>
            </div>
          )}
        </AdminSection>

        <AdminSection title='Quota Consumption'>
          {loading ? (
            <p className='text-sm text-zinc-500'>Loading usage indicators...</p>
          ) : (
            <div className='space-y-2 text-sm text-zinc-300'>
              <p>
                AI Tokens: {(usage?.aiTokens?.used ?? 0).toLocaleString()} / {(usage?.aiTokens?.limit ?? 0).toLocaleString()}
              </p>
              <p>
                Storage: {(usage?.storage?.used ?? 0).toLocaleString()}MB / {(usage?.storage?.limit ?? 0).toLocaleString()}MB
              </p>
              <p>
                Build Minutes: {(usage?.buildMinutes?.used ?? 0).toLocaleString()} / {(usage?.buildMinutes?.limit ?? 0).toLocaleString()}
              </p>
            </div>
          )}
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

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

type ServiceHealth = {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  details?: string;
};

type QueueItem = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
};

type InfrastructurePayload = {
  services?: ServiceHealth[];
  resources?: {
    cpu?: { usage?: number; cores?: number };
    memory?: { used?: number; total?: number; percentage?: number };
    disk?: { used?: number; total?: number; percentage?: number };
  };
  queues?: QueueItem[];
  metrics?: {
    activeConnections?: number;
    requestsPerMinute?: number;
    errorRate?: number;
  };
};

export default function InfrastructurePage() {
  const [payload, setPayload] = useState<InfrastructurePayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminJsonFetch<InfrastructurePayload>('/api/admin/infrastructure/status');
      setPayload(response ?? {});
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load infrastructure status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const services = useMemo(() => payload.services ?? [], [payload.services]);
  const queues = useMemo(() => payload.queues ?? [], [payload.queues]);
  const healthyCount = useMemo(() => services.filter((service) => service.status === 'healthy').length, [services]);

  return (
    <AdminPageShell
      title='Infrastructure'
      description='Operational health for services, queues, and infrastructure resource utilization.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchStatus}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Services Healthy' value={`${healthyCount}/${services.length || 0}`} tone='emerald' />
          <AdminStatCard label='CPU Usage' value={`${(payload.resources?.cpu?.usage ?? 0).toFixed(1)}%`} tone='amber' />
          <AdminStatCard label='Memory Usage' value={`${(payload.resources?.memory?.percentage ?? 0).toFixed(1)}%`} tone='sky' />
          <AdminStatCard label='Active Connections' value={payload.metrics?.activeConnections ?? 0} tone='neutral' />
        </AdminStatGrid>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Service Health' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Service</th>
                  <th className='p-3 text-left'>Status</th>
                  <th className='p-3 text-left'>Latency</th>
                  <th className='p-3 text-left'>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading service health...' />
                ) : services.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No service data available.' />
                ) : (
                  services.map((service) => (
                    <tr key={service.name} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{service.name}</td>
                      <td className='p-3'>{service.status}</td>
                      <td className='p-3'>{service.latency ?? 0}ms</td>
                      <td className='p-3 text-zinc-500'>{service.details || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title='Queue Activity' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Queue</th>
                  <th className='p-3 text-left'>Waiting</th>
                  <th className='p-3 text-left'>Active</th>
                  <th className='p-3 text-left'>Failed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading queue metrics...' />
                ) : queues.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No queue metrics available.' />
                ) : (
                  queues.map((queue) => (
                    <tr key={queue.name} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{queue.name}</td>
                      <td className='p-3'>{queue.waiting}</td>
                      <td className='p-3'>{queue.active}</td>
                      <td className='p-3'>{queue.failed}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

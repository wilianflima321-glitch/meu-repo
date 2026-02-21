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

type Tenant = {
  id: string;
  domain: string;
  users: number;
  storageBytes: number;
  lastActiveAt: string | null;
  status: 'active' | 'inactive';
};

type TenantPayload = {
  tenants?: Tenant[];
};

function formatStorage(bytes: number) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

export default function MultiTenancyPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminJsonFetch<TenantPayload>('/api/admin/tenants');
      setTenants(Array.isArray(data?.tenants) ? data.tenants : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const summary = useMemo(() => {
    const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.users, 0);
    const totalStorage = tenants.reduce((sum, tenant) => sum + tenant.storageBytes, 0);
    return { totalUsers, totalStorage };
  }, [tenants]);

  return (
    <AdminPageShell
      title='Multi-tenancy'
      description='Domain-level tenancy overview derived from real user and storage activity.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchTenants}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Detected tenants' value={tenants.length} tone='sky' />
          <AdminStatCard label='Total users' value={summary.totalUsers} tone='neutral' />
          <AdminStatCard label='Aggregate storage' value={formatStorage(summary.totalStorage)} tone='emerald' />
          <AdminStatCard label='Active tenants' value={tenants.filter((tenant) => tenant.status === 'active').length} tone='amber' />
        </AdminStatGrid>
      </div>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Domain</th>
                <th className='p-3 text-left'>Users</th>
                <th className='p-3 text-left'>Storage</th>
                <th className='p-3 text-left'>Last activity</th>
                <th className='p-3 text-left'>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading tenants...' />
              ) : tenants.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No tenants found.' />
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{tenant.domain}</td>
                    <td className='p-3'>{tenant.users}</td>
                    <td className='p-3'>{formatStorage(tenant.storageBytes)}</td>
                    <td className='p-3 text-zinc-500'>
                      {tenant.lastActiveAt ? new Date(tenant.lastActiveAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          tenant.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {tenant.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className='mt-6'>
        <AdminStatusBanner tone='info'>Tenant creation and manual management are intentionally disabled in this phase.</AdminStatusBanner>
      </div>
    </AdminPageShell>
  );
}

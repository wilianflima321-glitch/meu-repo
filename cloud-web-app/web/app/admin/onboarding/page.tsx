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

type OnboardingStats = {
  totalActions: number;
  uniqueUsers: number;
  lastActivity: string | null;
  actionCounts: Record<string, number>;
};

type OnboardingPayload = {
  stats?: OnboardingStats;
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
      const data = await adminJsonFetch<OnboardingPayload>('/api/admin/onboarding/stats');
      setStats(data?.stats ?? null);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load onboarding statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredActions = useMemo(() => {
    const entries = Object.entries(stats?.actionCounts || {});
    const term = search.trim().toLowerCase();
    return entries.filter(([action]) => !term || action.toLowerCase().includes(term));
  }, [search, stats?.actionCounts]);

  return (
    <AdminPageShell
      title='Onboarding'
      description='Inspect onboarding action telemetry and unique user activation footprint.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchStats}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Actions' value={stats?.totalActions ?? 0} tone='sky' />
          <AdminStatCard label='Unique users' value={stats?.uniqueUsers ?? 0} tone='emerald' />
          <AdminStatCard label='Action types' value={Object.keys(stats?.actionCounts || {}).length} tone='neutral' />
          <AdminStatCard
            label='Last activity'
            value={stats?.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : '-'}
            tone='amber'
          />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <input
          type='text'
          placeholder='Search onboarding action type'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
        />
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Action</th>
                <th className='p-3 text-left'>Count</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={2} message='Loading action counts...' />
              ) : filteredActions.length === 0 ? (
                <AdminTableStateRow colSpan={2} message='No onboarding actions found.' />
              ) : (
                filteredActions.map(([action, count]) => (
                  <tr key={action} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{action}</td>
                    <td className='p-3'>{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}

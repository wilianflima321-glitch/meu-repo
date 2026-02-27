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

type UpdateItem = {
  id: string;
  type: string;
  description: string | null;
  resource: string | null;
  status: 'approved' | 'review' | 'blocked';
  createdAt: string;
};

type UpdatesPayload = {
  items: UpdateItem[];
  summary: { total: number; approved: number; review: number; blocked: number };
};

export default function Updates() {
  const [data, setData] = useState<UpdatesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'approved' | 'review' | 'blocked'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    approved: 'Approved',
    review: 'In review',
    blocked: 'Blocked',
  };

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<UpdatesPayload>('/api/admin/updates');
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load updates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.items || []).filter((item) => {
      const matchesTerm =
        !term ||
        item.type.toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term) ||
        (item.resource || '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || item.status === status;
      return matchesTerm && matchesStatus;
    });
  }, [data?.items, search, status]);

  const exportJson = useCallback(() => {
    const payload = data?.items || [];
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `updates-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data?.items]);

  return (
    <AdminPageShell
      title='Update intelligence'
      description='AI-monitored release and version-change stream with operational triage.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={
        <>
          <AdminPrimaryButton onClick={fetchUpdates}>Refresh</AdminPrimaryButton>
          <AdminPrimaryButton onClick={exportJson}>Export JSON</AdminPrimaryButton>
        </>
      }
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total' value={data?.summary.total ?? 0} tone='sky' />
          <AdminStatCard label='Approved' value={data?.summary.approved ?? 0} tone='emerald' />
          <AdminStatCard label='In review' value={data?.summary.review ?? 0} tone='amber' />
          <AdminStatCard label='Blocked' value={data?.summary.blocked ?? 0} tone='rose' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Update history'>
        <div className='mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by type, description, or resource'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>All</option>
            <option value='approved'>Approved</option>
            <option value='review'>In review</option>
            <option value='blocked'>Blocked</option>
          </select>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-2 text-left'>Type</th>
                <th className='p-2 text-left'>Description</th>
                <th className='p-2 text-left'>Resource</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading updates...' />
              ) : filteredItems.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No updates found.' />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-2'>{item.type}</td>
                    <td className='p-2 text-zinc-300'>{item.description || '-'}</td>
                    <td className='p-2 text-zinc-400'>{item.resource || '-'}</td>
                    <td className='p-2'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          item.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : item.status === 'review'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-rose-500/15 text-rose-300'
                        }`}
                      >
                        {statusLabels[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className='p-2 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
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

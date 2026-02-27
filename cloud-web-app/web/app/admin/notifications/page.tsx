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

type NotificationItem = {
  id: string;
  userEmail: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
};

type Totals = {
  total: number;
  read: number;
  unread: number;
};

type NotificationsPayload = {
  items?: NotificationItem[];
  totals?: Totals;
};

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('read', readFilter === 'all' ? 'all' : readFilter === 'read' ? 'true' : 'false');
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }

      const data = await adminJsonFetch<NotificationsPayload>(`/api/admin/notifications?${params.toString()}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals ?? { total: 0, read: 0, unread: 0 });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const types = useMemo(() => Array.from(new Set(items.map((item) => item.type))).sort(), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = search.trim().toLowerCase();
      return (
        !term ||
        (item.userEmail || '').toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term) ||
        (item.message || '').toLowerCase().includes(term)
      );
    });
  }, [items, search]);

  return (
    <AdminPageShell
      title='Notifications'
      description='Track delivery state and read status for user and admin notifications.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchNotifications}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total' value={totals.total} tone='sky' />
          <AdminStatCard label='Read' value={totals.read} tone='emerald' />
          <AdminStatCard label='Unread' value={totals.unread} tone='amber' />
          <AdminStatCard label='Filtered' value={filteredItems.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search title, message, or user email'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <div className='flex items-center gap-2 flex-wrap'>
            {(['all', 'read', 'unread'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setReadFilter(status)}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  readFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {status === 'all' ? 'All' : status === 'read' ? 'Read' : 'Unread'}
              </button>
            ))}
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-1 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              <option value='all'>All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Type</th>
                <th className='p-3 text-left'>Title</th>
                <th className='p-3 text-left'>User</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading notifications...' />
              ) : filteredItems.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No notifications found for current filters.' />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>{item.type}</td>
                    <td className='p-3 text-zinc-100'>{item.title}</td>
                    <td className='p-3'>{item.userEmail || '-'}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          item.read ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {item.read ? 'Read' : 'Unread'}
                      </span>
                    </td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
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

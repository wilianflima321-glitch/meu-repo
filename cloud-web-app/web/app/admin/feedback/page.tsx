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

type FeedbackItem = {
  id: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
};

type FeedbackResponse = {
  feedback?: FeedbackItem[];
};

export default function FeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<FeedbackResponse>('/api/admin/feedback');
      setItems(Array.isArray(payload?.feedback) ? payload.feedback : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const statuses = useMemo(() => Array.from(new Set(items.map((item) => item.status))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatches = statusFilter === 'all' || item.status === statusFilter;
      const categoryMatches = categoryFilter === 'all' || item.category === categoryFilter;
      const searchMatches =
        !term ||
        item.email.toLowerCase().includes(term) ||
        item.subject.toLowerCase().includes(term) ||
        item.message.toLowerCase().includes(term);
      return statusMatches && categoryMatches && searchMatches;
    });
  }, [categoryFilter, items, search, statusFilter]);

  return (
    <AdminPageShell
      title='Feedback Inbox'
      description='Audit user-reported issues and product feedback across support categories.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchFeedback}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total Feedback' value={items.length} tone='sky' />
          <AdminStatCard label='Filtered' value={filtered.length} tone='neutral' />
          <AdminStatCard label='Open States' value={statuses.length} tone='amber' />
          <AdminStatCard label='Categories' value={categories.length} tone='emerald' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search email, subject or message'
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 lg:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <div className='flex flex-wrap items-center gap-2'>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              <option value='all'>All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              <option value='all'>All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
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
                <th className='p-3 text-left'>Subject</th>
                <th className='p-3 text-left'>User</th>
                <th className='p-3 text-left'>Category</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading feedback...' />
              ) : filtered.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No feedback items for current filters.' />
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70 align-top'>
                    <td className='p-3'>
                      <p className='text-zinc-100'>{item.subject}</p>
                      <p className='mt-1 text-xs text-zinc-500'>{item.message}</p>
                    </td>
                    <td className='p-3'>{item.email}</td>
                    <td className='p-3'>{item.category}</td>
                    <td className='p-3'>{item.status}</td>
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

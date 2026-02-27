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

type MarketplaceItem = {
  id: string;
  title: string;
  category: string;
  price: number;
  downloads: number;
  rating: number;
  authorId: string;
  createdAt: string;
};

type MarketplacePayload = {
  items?: MarketplaceItem[];
};

export default function AdminMarketplace() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [message, setMessage] = useState<string>('');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setMessage('Loading marketplace items...');
    try {
      const data = await adminJsonFetch<MarketplacePayload>('/api/admin/marketplace');
      setItems(Array.isArray(data?.items) ? data.items : []);
      setStatus('ok');
      setMessage('');
      setLastUpdated(new Date());
    } catch (err) {
      setItems([]);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to load marketplace items.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category))).sort(), [items]);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || String(item.title).toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const summary = useMemo(
    () => ({
      total: items.length,
      paid: items.filter((item) => item.price > 0).length,
      free: items.filter((item) => item.price === 0).length,
      filtered: filteredItems.length,
    }),
    [items, filteredItems.length],
  );

  return (
    <AdminPageShell
      title='Marketplace'
      description='Review extension catalog quality, pricing footprint, and category distribution.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={load}>Refresh</AdminPrimaryButton>}
    >
      {status === 'error' ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{message}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total items' value={summary.total} tone='sky' />
          <AdminStatCard label='Paid items' value={summary.paid} tone='emerald' />
          <AdminStatCard label='Free items' value={summary.free} tone='neutral' />
          <AdminStatCard label='Filtered items' value={summary.filtered} tone='amber' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by title'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
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
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Item</th>
                <th className='p-3 text-left'>Category</th>
                <th className='p-3 text-left'>Price</th>
                <th className='p-3 text-left'>Downloads</th>
                <th className='p-3 text-left'>Rating</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' ? (
                <AdminTableStateRow colSpan={6} message='Loading marketplace items...' />
              ) : filteredItems.length === 0 ? (
                <AdminTableStateRow colSpan={6} message='No marketplace items found for current filters.' />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{item.title}</td>
                    <td className='p-3'>{item.category}</td>
                    <td className='p-3'>{item.price > 0 ? `$${item.price.toFixed(2)}` : 'Free'}</td>
                    <td className='p-3'>{item.downloads}</td>
                    <td className='p-3'>{Number(item.rating || 0).toFixed(1)}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleDateString()}</td>
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

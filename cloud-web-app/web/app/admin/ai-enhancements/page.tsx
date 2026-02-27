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

type EnhancementItem = {
  id: string;
  name: string;
  status: string;
  description?: string | null;
  applied: boolean;
  createdAt: string;
};

type EnhancementsResponse = {
  items?: EnhancementItem[];
};

export default function AIEnhancements() {
  const [items, setItems] = useState<EnhancementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | string>('all');
  const [form, setForm] = useState({ name: '', status: 'planned', description: '' });

  const fetchEnhancements = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<EnhancementsResponse>('/api/admin/ai/enhancements');
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load enhancements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnhancements();
  }, [fetchEnhancements]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const statusMatches = status === 'all' || item.status === status;
      const searchMatches = !term || item.name.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
      return statusMatches && searchMatches;
    });
  }, [items, search, status]);

  const statuses = useMemo(() => Array.from(new Set(items.map((item) => item.status))).sort(), [items]);

  const createEnhancement = useCallback(async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/ai/enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          status: form.status,
          description: form.description.trim() || null,
        }),
      });
      setForm({ name: '', status: 'planned', description: '' });
      setMessage('Enhancement created.');
      setError(null);
      await fetchEnhancements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create enhancement');
    } finally {
      setSaving(false);
    }
  }, [fetchEnhancements, form]);

  const updateEnhancement = useCallback(
    async (id: string, updates: { applied?: boolean; status?: string }) => {
      try {
        await adminJsonFetch('/api/admin/ai/enhancements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates }),
        });
        setError(null);
        setMessage('Enhancement updated.');
        await fetchEnhancements();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update enhancement');
      }
    },
    [fetchEnhancements],
  );

  return (
    <AdminPageShell
      title='AI Enhancements'
      description='Track planned improvements and transition only validated enhancements into applied state.'
      actions={<AdminPrimaryButton onClick={fetchEnhancements}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {message ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{message}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total Items' value={items.length} tone='sky' />
          <AdminStatCard label='Applied' value={items.filter((item) => item.applied).length} tone='emerald' />
          <AdminStatCard label='Planned' value={items.filter((item) => item.status === 'planned').length} tone='amber' />
          <AdminStatCard label='Filtered' value={filtered.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Register Enhancement' className='mb-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder='Enhancement name'
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={form.status}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='planned'>planned</option>
            <option value='partial'>partial</option>
            <option value='missing'>missing</option>
            <option value='applied'>applied</option>
          </select>
          <AdminPrimaryButton onClick={createEnhancement} disabled={saving}>
            {saving ? 'Saving...' : 'Create'}
          </AdminPrimaryButton>
          <textarea
            rows={2}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder='Description'
            className='md:col-span-3 rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
        </div>
      </AdminSection>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search enhancements'
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>All statuses</option>
            {statuses.map((itemStatus) => (
              <option key={itemStatus} value={itemStatus}>
                {itemStatus}
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
                <th className='p-3 text-left'>Name</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Applied</th>
                <th className='p-3 text-left'>Created</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading enhancements...' />
              ) : filtered.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No enhancements found.' />
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>
                      <p className='text-zinc-100'>{item.name}</p>
                      {item.description ? <p className='text-xs text-zinc-500'>{item.description}</p> : null}
                    </td>
                    <td className='p-3'>{item.status}</td>
                    <td className='p-3'>{item.applied ? 'yes' : 'no'}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
                    <td className='p-3'>
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          onClick={() => updateEnhancement(item.id, { applied: !item.applied })}
                          className='rounded bg-zinc-800/80 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700/80'
                        >
                          {item.applied ? 'Mark unapplied' : 'Mark applied'}
                        </button>
                        <button
                          type='button'
                          onClick={() => updateEnhancement(item.id, { status: item.status === 'applied' ? 'planned' : 'applied' })}
                          className='rounded bg-blue-600/80 px-2 py-1 text-xs text-white hover:bg-blue-500/90'
                        >
                          Toggle status
                        </button>
                      </div>
                    </td>
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

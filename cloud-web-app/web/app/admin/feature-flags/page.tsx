'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  type: string;
  percentage?: number | null;
}

type FlagsPayload = {
  items?: FeatureFlag[];
};

export default function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [form, setForm] = useState({
    key: '',
    name: '',
    type: 'boolean',
    percentage: 50,
    description: '',
    enabled: true,
  });

  const typeLabels: Record<string, string> = {
    boolean: 'Boolean',
    percentage: 'Percentage',
    rule_based: 'Rule based',
    variant: 'Variant',
  };

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<FlagsPayload>('/api/admin/feature-flags');
      setFlags(Array.isArray(json.items) ? json.items : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return flags.filter(
      (flag) => !term || flag.key.toLowerCase().includes(term) || flag.name.toLowerCase().includes(term),
    );
  }, [flags, search]);

  const toggleFlag = useCallback(
    async (key: string, enabled: boolean) => {
      try {
        await adminJsonFetch('/api/admin/feature-flags/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, enabled: !enabled }),
        });
        await fetchFlags();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to toggle feature flag');
      }
    },
    [fetchFlags],
  );

  const createFlag = useCallback(async () => {
    try {
      setSaving(true);
      await adminJsonFetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ key: '', name: '', type: 'boolean', percentage: 50, description: '', enabled: true });
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature flag');
    } finally {
      setSaving(false);
    }
  }, [fetchFlags, form]);

  return (
    <AdminPageShell
      title='Feature Flags'
      description='Controlled rollout and activation by environment.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchFlags}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <AdminSection title='Create new flag' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <input
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500'
            placeholder='Key'
            value={form.key}
            onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
          />
          <input
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500'
            placeholder='Name'
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <select
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100'
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value='boolean'>Boolean</option>
            <option value='percentage'>Percentage</option>
            <option value='rule_based'>Rule based</option>
            <option value='variant'>Variant</option>
          </select>
          <input
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500'
            placeholder='Description'
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          {form.type === 'percentage' ? (
            <input
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500'
              type='number'
              value={form.percentage}
              onChange={(event) => setForm((prev) => ({ ...prev, percentage: Number(event.target.value) }))}
            />
          ) : null}
          <AdminPrimaryButton
            onClick={createFlag}
            disabled={saving || !form.key.trim() || !form.name.trim()}
            className='bg-blue-600 text-white hover:bg-blue-500'
          >
            {saving ? 'Saving...' : 'Create flag'}
          </AdminPrimaryButton>
        </div>
      </AdminSection>

      <AdminSection title='Active flags'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm'
            placeholder='Search by key or name'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-2 text-left'>Key</th>
                <th className='p-2 text-left'>Name</th>
                <th className='p-2 text-left'>Type</th>
                <th className='p-2 text-left'>Distribution</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={6} message='Loading flags...' />
              ) : filtered.length === 0 ? (
                <AdminTableStateRow colSpan={6} message='No feature flags found.' />
              ) : (
                filtered.map((flag) => (
                  <tr key={flag.id} className='border-t border-zinc-800/70'>
                    <td className='p-2'>{flag.key}</td>
                    <td className='p-2 text-zinc-200'>{flag.name}</td>
                    <td className='p-2'>{typeLabels[flag.type] ?? flag.type}</td>
                    <td className='p-2'>{flag.type === 'percentage' ? `${flag.percentage ?? 0}%` : '-'}</td>
                    <td className='p-2'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>
                        {flag.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='p-2'>
                      <button
                        onClick={() => toggleFlag(flag.key, flag.enabled)}
                        className='rounded bg-zinc-900 px-2 py-1 text-sm text-white hover:bg-zinc-800'
                        type='button'
                      >
                        {flag.enabled ? 'Disable' : 'Enable'}
                      </button>
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

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminProductLegacyDrawers } from './AdminProductLegacyDrawers';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  type: string;
  percentage?: number | null;
  environments?: unknown;
}

export default function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    key: '',
    name: '',
    type: 'boolean',
    percentage: 50,
    description: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const typeLabels: Record<string, string> = {
    boolean: 'Boolean',
    percentage: 'Percentage',
    rule_based: 'Baseado em regras',
    variant: 'Variante',
  };

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feature-flags');
      if (!res.ok) throw new Error('Failed to load flags');
      const json = await res.json();
      setFlags(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return flags.filter((flag) => !term || flag.key.toLowerCase().includes(term) || flag.name.toLowerCase().includes(term));
  }, [flags, search]);

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/feature-flags/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: !enabled }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating flag');
    }
  };

  const createFlag = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create flag');
      setForm({ key: '', name: '', type: 'boolean', percentage: 50, description: '', enabled: true });
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Flags de recursos</h1>
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Distribution control and enablement by environment.</p>
        </div>
        <button type="button" onClick={fetchFlags} className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'>Refresh</button>
      </div>

      <AdminProductLegacyDrawers />

      {error && (
        <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Nova flag</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Key'
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
          />
          <input
            className='border p-2 rounded text-sm'
            placeholder='Name'
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className='border p-2 rounded text-sm'
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value='boolean'>Boolean</option>
            <option value='percentage'>Percentage</option>
            <option value='rule_based'>Rule based</option>
            <option value='variant'>Variante</option>
          </select>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Description'
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          {form.type === 'percentage' && (
            <input
              className='border p-2 rounded text-sm'
              type='number'
              value={form.percentage}
              onChange={(e) => setForm((prev) => ({ ...prev, percentage: Number(e.target.value) }))}
            />
          )}
          <button type="button"
            onClick={createFlag}
            disabled={saving || !form.key.trim() || !form.name.trim()}
            className='px-4 py-2 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] rounded disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Create flag'}
          </button>
        </div>
      </div>

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Flags ativas</h2>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Loading flags...</p>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>No flags found.</p>
        ) : (
          <table className='w-full table-auto'>
            <thead>
              <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'>
                <th className='p-2 text-left'>Key</th>
                <th className='p-2 text-left'>Name</th>
                <th className='p-2 text-left'>Tipo</th>
                <th className='p-2 text-left'>Distribution</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((flag) => (
                <tr key={flag.id} className='border-t'>
                  <td className='p-2'>{flag.key}</td>
                  <td className='p-2'>{flag.name}</td>
                  <td className='p-2'>{typeLabels[flag.type] ?? flag.type}</td>
                  <td className='p-2'>
                    {flag.type === 'percentage' ? `${flag.percentage || 0}%` : '—'}
                  </td>
                  <td className='p-2'>
                    <span className='text-xs px-2 py-1 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'>
                      {flag.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className='p-2'>
                    <button type="button"
                      onClick={() => toggleFlag(flag.key, flag.enabled)}
                      aria-label={flag.enabled ? `Disable flag ${flag.key}` : `Enable flag ${flag.key}`}
                      className='px-2 py-1 bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] rounded text-sm'
                    >
                      {flag.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

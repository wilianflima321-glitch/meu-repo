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

type RateLimitConfig = {
  name: string;
  algorithm: string;
  limit: number;
  window: number;
  identifier: string;
};

type RateLimitPayload = {
  success?: boolean;
  configs?: RateLimitConfig[];
  diagnostics?: {
    provider?: string;
    enabled?: boolean;
    strategy?: string;
  };
  notes?: string[];
};

export default function RateLimitingPage() {
  const [limits, setLimits] = useState<RateLimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [providerInfo, setProviderInfo] = useState<string>('unknown');
  const [notes, setNotes] = useState<string[]>([]);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<RateLimitPayload>('/api/admin/rate-limits');
      setLimits(Array.isArray(data?.configs) ? data.configs : []);
      setProviderInfo(data?.diagnostics?.provider || data?.diagnostics?.strategy || 'unknown');
      setNotes(Array.isArray(data?.notes) ? data.notes : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rate-limit configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const filteredLimits = useMemo(() => {
    return limits.filter((limit) => {
      const term = search.trim().toLowerCase();
      return !term || limit.name.toLowerCase().includes(term) || limit.identifier.toLowerCase().includes(term);
    });
  }, [limits, search]);

  return (
    <AdminPageShell
      title='Rate Limiting'
      description='Inspect active API throttling policy and runtime limiter metadata.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchLimits}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Rules' value={limits.length} tone='sky' />
          <AdminStatCard label='Filtered rules' value={filteredLimits.length} tone='neutral' />
          <AdminStatCard label='Provider' value={providerInfo} tone='amber' />
          <AdminStatCard label='Notes' value={notes.length} tone='emerald' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <input
          type='text'
          placeholder='Search by rule name or identifier'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
        />
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Rule</th>
                <th className='p-3 text-left'>Algorithm</th>
                <th className='p-3 text-left'>Window</th>
                <th className='p-3 text-left'>Identifier</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading rate-limit rules...' />
              ) : filteredLimits.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No rate-limit rules found for current filters.' />
              ) : (
                filteredLimits.map((limit) => (
                  <tr key={limit.name} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{limit.name}</td>
                    <td className='p-3'>{limit.algorithm}</td>
                    <td className='p-3'>{limit.limit} requests / {limit.window}s</td>
                    <td className='p-3 text-zinc-400'>{limit.identifier}</td>
                    <td className='p-3'>
                      <button
                        onClick={() => navigator.clipboard.writeText(limit.identifier)}
                        className='rounded bg-zinc-800/70 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700/80'
                        type='button'
                      >
                        Copy ID
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      {notes.length > 0 ? (
        <div className='mt-6'>
          <AdminStatusBanner tone='info'>{notes.join(' | ')}</AdminStatusBanner>
        </div>
      ) : null}
    </AdminPageShell>
  );
}

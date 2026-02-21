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

type AutomationItem = {
  id: string;
  action: string | null;
  category: string | null;
  severity: string | null;
  resource: string | null;
  createdAt: string;
};

type AutomationPayload = {
  items?: AutomationItem[];
  summary?: { total: number; warning: number; critical: number };
};

const severityLabels: Record<string, string> = {
  warning: 'Warning',
  critical: 'Critical',
  info: 'Info',
};

export default function Automation() {
  const [data, setData] = useState<AutomationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<'all' | 'warning' | 'critical'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAutomation = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<AutomationPayload>('/api/admin/automation');
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomation();
  }, [fetchAutomation]);

  const filteredItems = useMemo(() => {
    return (data?.items || []).filter((item) => {
      const term = search.trim().toLowerCase();
      const matchesTerm =
        !term ||
        (item.action || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term) ||
        (item.resource || '').toLowerCase().includes(term);
      const matchesSeverity = severity === 'all' || item.severity === severity;
      return matchesTerm && matchesSeverity;
    });
  }, [data?.items, search, severity]);

  const summary = data?.summary ?? {
    total: filteredItems.length,
    warning: filteredItems.filter((item) => item.severity === 'warning').length,
    critical: filteredItems.filter((item) => item.severity === 'critical').length,
  };

  return (
    <AdminPageShell
      title='Automation'
      description='Review automation-triggered operational events derived from audit telemetry.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchAutomation}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Events' value={summary.total} tone='sky' />
          <AdminStatCard label='Warnings' value={summary.warning} tone='amber' />
          <AdminStatCard label='Critical' value={summary.critical} tone='rose' />
          <AdminStatCard label='Filtered' value={filteredItems.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by action, category, or resource'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as typeof severity)}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>All severities</option>
            <option value='warning'>Warning</option>
            <option value='critical'>Critical</option>
          </select>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Action</th>
                <th className='p-3 text-left'>Category</th>
                <th className='p-3 text-left'>Severity</th>
                <th className='p-3 text-left'>Resource</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading automation events...' />
              ) : filteredItems.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No automation events found for current filters.' />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{item.action || '-'}</td>
                    <td className='p-3'>{item.category || '-'}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          item.severity === 'critical'
                            ? 'bg-rose-500/15 text-rose-300'
                            : item.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {severityLabels[item.severity || 'info'] ?? item.severity ?? 'Info'}
                      </span>
                    </td>
                    <td className='p-3'>{item.resource || '-'}</td>
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

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

type AuditLog = {
  id: string;
  adminEmail?: string | null;
  userId?: string | null;
  action?: string | null;
  category?: string | null;
  severity?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  resource?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

type AuditPayload = {
  logs?: AuditLog[];
};

type FilterState = {
  adminEmail: string;
  action: string;
  severity: 'all' | 'info' | 'warning' | 'critical';
  dateFrom: string;
  dateTo: string;
};

const severityLabels: Record<string, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const emptyFilters: FilterState = {
  adminEmail: '',
  action: '',
  severity: 'all',
  dateFrom: '',
  dateTo: '',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<FilterState>(emptyFilters);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filter.adminEmail) {
        params.set('adminEmail', filter.adminEmail);
      }
      if (filter.action) {
        params.set('action', filter.action);
      }
      if (filter.severity !== 'all') {
        params.set('severity', filter.severity);
      }
      if (filter.dateFrom) {
        params.set('startDate', filter.dateFrom);
      }
      if (filter.dateTo) {
        params.set('endDate', filter.dateTo);
      }

      const data = await adminJsonFetch<AuditPayload>(`/api/admin/audit?${params.toString()}`);
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const summary = useMemo(
    () => ({
      total: logs.length,
      warning: logs.filter((log) => log.severity === 'warning').length,
      critical: logs.filter((log) => log.severity === 'critical').length,
    }),
    [logs],
  );

  const handleExport = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters: filter,
      logs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filter, logs]);

  return (
    <AdminPageShell
      title='Audit Logs'
      description='Inspect admin actions with explicit filtering for actor, severity, and time range.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={
        <>
          <AdminPrimaryButton onClick={handleExport} disabled={logs.length === 0}>
            Export JSON
          </AdminPrimaryButton>
          <AdminPrimaryButton onClick={fetchLogs}>Refresh</AdminPrimaryButton>
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
          <AdminStatCard label='Total logs' value={summary.total} tone='sky' />
          <AdminStatCard label='Warnings' value={summary.warning} tone='amber' />
          <AdminStatCard label='Critical' value={summary.critical} tone='rose' />
          <AdminStatCard label='Filtered' value={logs.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Filters' className='mb-6'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-5'>
          <input
            type='text'
            placeholder='Admin email'
            value={filter.adminEmail}
            onChange={(event) => setFilter((prev) => ({ ...prev, adminEmail: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <input
            type='text'
            placeholder='Action'
            value={filter.action}
            onChange={(event) => setFilter((prev) => ({ ...prev, action: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <select
            value={filter.severity}
            onChange={(event) => setFilter((prev) => ({ ...prev, severity: event.target.value as FilterState['severity'] }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <option value='all'>All severities</option>
            <option value='info'>Info</option>
            <option value='warning'>Warning</option>
            <option value='critical'>Critical</option>
          </select>
          <input
            type='date'
            value={filter.dateFrom}
            onChange={(event) => setFilter((prev) => ({ ...prev, dateFrom: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <input
            type='date'
            value={filter.dateTo}
            onChange={(event) => setFilter((prev) => ({ ...prev, dateTo: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
        </div>
      </AdminSection>

      <AdminSection title='Events' className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Admin</th>
                <th className='p-3 text-left'>Action</th>
                <th className='p-3 text-left'>Category</th>
                <th className='p-3 text-left'>Severity</th>
                <th className='p-3 text-left'>Target</th>
                <th className='p-3 text-left'>Timestamp</th>
                <th className='p-3 text-left'>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={7} message='Loading audit logs...' />
              ) : logs.length === 0 ? (
                <AdminTableStateRow colSpan={7} message='No audit logs found for current filters.' />
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>{log.adminEmail || log.userId || '-'}</td>
                    <td className='p-3 text-zinc-100'>{log.action || '-'}</td>
                    <td className='p-3'>{log.category || '-'}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          log.severity === 'critical'
                            ? 'bg-rose-500/15 text-rose-300'
                            : log.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {severityLabels[log.severity || 'info'] ?? log.severity ?? 'Info'}
                      </span>
                    </td>
                    <td className='p-3'>
                      {log.targetType ? `${log.targetType}:${log.targetId?.slice(0, 8) || ''}` : '-'}
                    </td>
                    <td className='p-3 text-zinc-500'>{new Date(log.createdAt).toLocaleString()}</td>
                    <td className='p-3'>{log.ipAddress || '-'}</td>
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

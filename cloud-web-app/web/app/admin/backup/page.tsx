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

type BackupItem = {
  id: string;
  date: string;
  size: number;
  status: string;
  type: string;
  description?: string | null;
  storageUrl?: string | null;
};

type BackupPayload = {
  items?: BackupItem[];
};

function formatSize(size: number) {
  const gb = size / (1024 * 1024 * 1024);
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export default function Backup() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const json = await adminJsonFetch<BackupPayload>('/api/admin/backup');
      setBackups(Array.isArray(json?.items) ? json.items : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const requestBackup = useCallback(async () => {
    try {
      setWorking(true);
      setSuccess(null);
      await adminJsonFetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() || undefined }),
      });
      setDescription('');
      setSuccess('Manual backup requested successfully.');
      await fetchBackups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request backup');
    } finally {
      setWorking(false);
    }
  }, [description, fetchBackups]);

  const requestRestore = useCallback(async (backupId: string) => {
    try {
      setWorking(true);
      setSuccess(null);
      await adminJsonFetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId }),
      });
      setSuccess(`Restore request queued for backup ${backupId.slice(0, 8)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request restore');
    } finally {
      setWorking(false);
    }
  }, []);

  const summary = useMemo(
    () => ({
      total: backups.length,
      ready: backups.filter((item) => item.status === 'completed').length,
      pending: backups.filter((item) => item.status === 'pending').length,
      totalSize: backups.reduce((sum, item) => sum + item.size, 0),
    }),
    [backups],
  );

  return (
    <AdminPageShell
      title='Backup and Restore'
      description='Manage manual backup requests and controlled restore operations.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchBackups}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {success ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{success}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Backups' value={summary.total} tone='sky' />
          <AdminStatCard label='Completed' value={summary.ready} tone='emerald' />
          <AdminStatCard label='Pending' value={summary.pending} tone='amber' />
          <AdminStatCard label='Stored size' value={formatSize(summary.totalSize)} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Manual backup request' className='mb-6'>
        <div className='flex flex-col gap-3 md:flex-row'>
          <input
            className='flex-1 rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            placeholder='Optional description'
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <AdminPrimaryButton onClick={requestBackup} disabled={working} className='bg-blue-600 text-white hover:bg-blue-500'>
            {working ? 'Processing...' : 'Start manual backup'}
          </AdminPrimaryButton>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>ID</th>
                <th className='p-3 text-left'>Created</th>
                <th className='p-3 text-left'>Size</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading backups...' />
              ) : backups.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No backups available.' />
              ) : (
                backups.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-400'>{item.id.slice(0, 8)}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.date).toLocaleString()}</td>
                    <td className='p-3'>{formatSize(item.size)}</td>
                    <td className='p-3'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>{item.status}</span>
                    </td>
                    <td className='p-3'>
                      <div className='flex items-center gap-2'>
                        {item.storageUrl ? (
                          <a
                            href={item.storageUrl}
                            className='rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500'
                          >
                            Download
                          </a>
                        ) : (
                          <span className='text-xs text-zinc-500'>No file</span>
                        )}
                        <button
                          onClick={() => requestRestore(item.id)}
                          className='rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60'
                          disabled={working}
                          type='button'
                        >
                          Restore
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

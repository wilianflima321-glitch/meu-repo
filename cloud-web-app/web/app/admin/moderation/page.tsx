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

type ModerationItem = {
  id: string;
  type: string;
  status: string;
  priority: string;
  reason?: string;
  reporterEmail?: string;
  targetOwnerEmail?: string;
  createdAt: string;
};

type ModerationPayload = {
  items?: ModerationItem[];
  stats?: {
    pending?: number;
    urgent?: number;
    todayProcessed?: number;
    avgResponseTime?: number;
  };
};

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, urgent: 0, todayProcessed: 0, avgResponseTime: 0 });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'urgent' | 'all'>('pending');

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<ModerationPayload>(`/api/admin/moderation/queue?filter=${filter}`);
      setItems(Array.isArray(payload?.items) ? payload.items : []);
      setStats({
        pending: payload?.stats?.pending ?? 0,
        urgent: payload?.stats?.urgent ?? 0,
        todayProcessed: payload?.stats?.todayProcessed ?? 0,
        avgResponseTime: payload?.stats?.avgResponseTime ?? 0,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const runAction = useCallback(
    async (id: string, action: 'approve' | 'reject' | 'escalate' | 'skip') => {
      try {
        setActingId(id);
        await adminJsonFetch(`/api/admin/moderation/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        setMessage(`Action '${action}' applied.`);
        setError(null);
        await fetchQueue();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to apply action '${action}'`);
      } finally {
        setActingId(null);
      }
    },
    [fetchQueue],
  );

  const priorityTone = useMemo(() => (stats.urgent > 0 ? 'rose' : 'emerald'), [stats.urgent]);

  return (
    <AdminPageShell
      title='Moderation Queue'
      description='Triage moderation items with explicit action workflow and auditable queue status.'
      actions={<AdminPrimaryButton onClick={fetchQueue}>Refresh</AdminPrimaryButton>}
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

      <div className='mb-4 flex gap-2'>
        {(['pending', 'urgent', 'all'] as const).map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => setFilter(value)}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              filter === value ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Pending' value={stats.pending} tone='amber' />
          <AdminStatCard
            label='Urgent'
            value={stats.urgent}
            tone={priorityTone as 'neutral' | 'sky' | 'emerald' | 'amber' | 'rose'}
          />
          <AdminStatCard label='Processed Today' value={stats.todayProcessed} tone='sky' />
          <AdminStatCard label='Avg Response (min)' value={stats.avgResponseTime} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Type</th>
                <th className='p-3 text-left'>Priority</th>
                <th className='p-3 text-left'>Reporter</th>
                <th className='p-3 text-left'>Reason</th>
                <th className='p-3 text-left'>Created</th>
                <th className='p-3 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={6} message='Loading moderation queue...' />
              ) : items.length === 0 ? (
                <AdminTableStateRow colSpan={6} message='No moderation items for selected filter.' />
              ) : (
                items.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70 align-top'>
                    <td className='p-3'>{item.type}</td>
                    <td className='p-3'>{item.priority}</td>
                    <td className='p-3'>{item.reporterEmail || '-'}</td>
                    <td className='p-3 text-zinc-400'>{item.reason || '-'}</td>
                    <td className='p-3 text-zinc-500'>{new Date(item.createdAt).toLocaleString()}</td>
                    <td className='p-3'>
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          disabled={actingId === item.id}
                          onClick={() => runAction(item.id, 'approve')}
                          className='rounded bg-emerald-600/80 px-2 py-1 text-xs text-white hover:bg-emerald-500/90 disabled:opacity-60'
                        >
                          Approve
                        </button>
                        <button
                          type='button'
                          disabled={actingId === item.id}
                          onClick={() => runAction(item.id, 'reject')}
                          className='rounded bg-rose-600/80 px-2 py-1 text-xs text-white hover:bg-rose-500/90 disabled:opacity-60'
                        >
                          Reject
                        </button>
                        <button
                          type='button'
                          disabled={actingId === item.id}
                          onClick={() => runAction(item.id, 'escalate')}
                          className='rounded bg-amber-600/80 px-2 py-1 text-xs text-white hover:bg-amber-500/90 disabled:opacity-60'
                        >
                          Escalate
                        </button>
                        <button
                          type='button'
                          disabled={actingId === item.id}
                          onClick={() => runAction(item.id, 'skip')}
                          className='rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-100 hover:bg-zinc-600 disabled:opacity-60'
                        >
                          Skip
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

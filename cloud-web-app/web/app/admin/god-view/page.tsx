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

type LiveSession = {
  id: string;
  userEmail?: string;
  userName?: string;
  projectName?: string;
  currentPage?: string;
  currentTool?: string;
  aiCallsCount?: number;
  aiTokensUsed?: number;
  aiCostIncurred?: number;
  startedAt?: string;
  lastPingAt?: string;
};

type GodViewResponse = {
  sessions?: LiveSession[];
  stats?: {
    totalActive?: number;
    totalAICalls?: number;
    totalAICost?: number;
    totalTokens?: number;
  };
};

export default function GodViewPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [stats, setStats] = useState({ totalActive: 0, totalAICalls: 0, totalAICost: 0, totalTokens: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<GodViewResponse>('/api/admin/god-view/sessions');
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions : []);
      setStats({
        totalActive: payload?.stats?.totalActive ?? 0,
        totalAICalls: payload?.stats?.totalAICalls ?? 0,
        totalAICost: payload?.stats?.totalAICost ?? 0,
        totalTokens: payload?.stats?.totalTokens ?? 0,
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load live sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const avgCostPerSession = useMemo(() => {
    if (stats.totalActive <= 0) return 0;
    return stats.totalAICost / stats.totalActive;
  }, [stats.totalAICost, stats.totalActive]);

  return (
    <AdminPageShell
      title='God View'
      description='Observe active user sessions, AI usage load, and project activity in real time.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchSessions}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Active Sessions' value={stats.totalActive} tone='sky' />
          <AdminStatCard label='AI Calls' value={stats.totalAICalls} tone='neutral' />
          <AdminStatCard label='AI Cost' value={`$${stats.totalAICost.toFixed(2)}`} tone='amber' />
          <AdminStatCard label='Avg Cost / Session' value={`$${avgCostPerSession.toFixed(2)}`} tone='emerald' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Live Sessions' className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>User</th>
                <th className='p-3 text-left'>Project</th>
                <th className='p-3 text-left'>Page</th>
                <th className='p-3 text-left'>Tool</th>
                <th className='p-3 text-left'>AI usage</th>
                <th className='p-3 text-left'>Last ping</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={6} message='Loading live sessions...' />
              ) : sessions.length === 0 ? (
                <AdminTableStateRow colSpan={6} message='No active sessions in the current window.' />
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className='border-t border-zinc-800/70'>
                    <td className='p-3'>
                      <p className='text-zinc-100'>{session.userName || 'Unknown'}</p>
                      <p className='text-xs text-zinc-500'>{session.userEmail || '-'}</p>
                    </td>
                    <td className='p-3'>{session.projectName || '-'}</td>
                    <td className='p-3'>{session.currentPage || '-'}</td>
                    <td className='p-3'>{session.currentTool || '-'}</td>
                    <td className='p-3'>
                      {(session.aiCallsCount || 0).toLocaleString()} calls / {(session.aiTokensUsed || 0).toLocaleString()} tokens
                    </td>
                    <td className='p-3 text-zinc-500'>
                      {session.lastPingAt ? new Date(session.lastPingAt).toLocaleString() : '-'}
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

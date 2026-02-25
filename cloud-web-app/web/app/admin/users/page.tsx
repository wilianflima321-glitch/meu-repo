'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminBadge,
  AdminFilterPill,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSearchInput,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  plan: string | null;
  createdAt: string;
  projects: number;
  sessions: number;
};

type UsersPayload = {
  users?: Array<{
    id: string;
    name: string | null;
    email: string;
    plan: string | null;
    createdAt: string;
    _count?: { projects?: number; sessions?: number };
  }>;
};

const planLabels: Record<string, string> = {
  starter: 'Starter',
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
  enterprise: 'Enterprise',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<UsersPayload>('/api/admin/users');
      const nextUsers = Array.isArray(data?.users) ? data.users : [];
      setUsers(
        nextUsers.map((user) => ({
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          plan: user.plan ?? null,
          createdAt: user.createdAt,
          projects: user._count?.projects ?? 0,
          sessions: user._count?.sessions ?? 0,
        })),
      );
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = search.trim().toLowerCase();
      const matchesSearch = !term || user.email.toLowerCase().includes(term) || (user.name || '').toLowerCase().includes(term);
      const plan = (user.plan || 'starter').toLowerCase();
      const matchesPlan = planFilter === 'all' || plan === planFilter;
      return matchesSearch && matchesPlan;
    });
  }, [users, search, planFilter]);

  const summary = useMemo(
    () => ({
      total: users.length,
      activePlans: users.filter((user) => !String(user.plan || '').includes('trial')).length,
      trials: users.filter((user) => String(user.plan || '').includes('trial')).length,
    }),
    [users],
  );

  return (
    <AdminPageShell
      title='User Management'
      description='Manage account plans, project footprint, and active session volume.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchUsers}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total users' value={summary.total} tone='sky' />
          <AdminStatCard label='Active plans' value={summary.activePlans} tone='emerald' />
          <AdminStatCard label='Trial users' value={summary.trials} tone='amber' />
          <AdminStatCard label='Filtered users' value={filteredUsers.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <AdminSearchInput
            type='text'
            placeholder='Search by name or email'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className='flex items-center gap-2 flex-wrap'>
            {(['all', 'starter', 'basic', 'pro', 'studio', 'enterprise'] as const).map((plan) => (
              <AdminFilterPill
                key={plan}
                onClick={() => setPlanFilter(plan)}
                active={planFilter === plan}
              >
                {plan === 'all' ? 'All' : (planLabels[plan] ?? plan)}
              </AdminFilterPill>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Name</th>
                <th className='p-3 text-left'>Email</th>
                <th className='p-3 text-left'>Plan</th>
                <th className='p-3 text-left'>Projects</th>
                <th className='p-3 text-left'>Sessions</th>
                <th className='p-3 text-left'>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={6} message='Loading users...' />
              ) : filteredUsers.length === 0 ? (
                <AdminTableStateRow colSpan={6} message='No users found for current filters.' />
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{user.name || '-'}</td>
                    <td className='p-3'>
                      <div className='flex items-center gap-2'>
                        <span>{user.email}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(user.email)}
                          className='text-xs text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded px-1 py-0.5'
                          type='button'
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className='p-3'>
                      <AdminBadge
                        tone={
                          (user.plan || 'starter') === 'enterprise'
                            ? 'emerald'
                            : (user.plan || 'starter') === 'pro' || (user.plan || 'starter') === 'studio'
                              ? 'sky'
                              : 'neutral'
                        }
                      >
                        {planLabels[user.plan || 'starter'] ?? (user.plan || 'starter')}
                      </AdminBadge>
                    </td>
                    <td className='p-3'>{user.projects}</td>
                    <td className='p-3'>{user.sessions}</td>
                    <td className='p-3 text-zinc-500'>{new Date(user.createdAt).toLocaleDateString()}</td>
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

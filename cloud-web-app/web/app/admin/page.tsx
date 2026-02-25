'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE } from '@/lib/api';
import {
  AdminBadge,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type UserRow = {
  id: string;
  name?: string | null;
  email: string;
  plan: string;
  createdAt: string;
  _count?: { projects?: number };
};

const fetcher = async (url: string) => {
  return adminJsonFetch<{ users: UserRow[] }>(url);
};

const planLabels: Record<string, string> = {
  enterprise: 'Enterprise',
  pro: 'Pro',
  free: 'Free',
};

const cards = [
  {
    href: '/admin/users',
    title: 'Manage users',
    description: 'Review profile state, permissions, and account governance.',
  },
  {
    href: '/admin/payments',
    title: 'Payments and gateway',
    description: 'Operate checkout flow, active gateway, and transaction reconciliation.',
  },
  {
    href: '/admin/apis',
    title: 'API integrations',
    description: 'Verify configured providers and runtime environment keys.',
  },
  {
    href: '/admin/security',
    title: 'Security and audit',
    description: 'Track critical events and operational hardening posture.',
  },
];

export default function Admin() {
  const { data, error, isLoading, mutate } = useSWR<{ users: UserRow[] }>(`${API_BASE}/admin/users`, fetcher);
  const users = Array.isArray(data?.users) ? data.users : [];

  const enterpriseCount = users.filter((user) => user.plan === 'enterprise').length;
  const proCount = users.filter((user) => user.plan === 'pro').length;
  const freeCount = users.filter((user) => user.plan === 'free').length;

  return (
    <AdminPageShell
      title='Admin Enterprise Console'
      description='Central operations for users, billing, security, and integrations.'
      actions={<AdminPrimaryButton onClick={() => mutate()}>Refresh</AdminPrimaryButton>}
    >
      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Users' value={users.length} />
          <AdminStatCard label='Enterprise' value={enterpriseCount} tone='emerald' />
          <AdminStatCard label='Pro' value={proCount} tone='sky' />
          <AdminStatCard label='Free' value={freeCount} />
        </AdminStatGrid>
      </div>

      <AdminSection title='Recent users' subtitle='Source: /admin/users' className='mb-8 p-0'>
        {error ? (
          <div className='p-4'>
            <AdminStatusBanner tone='danger'>{error.message}</AdminStatusBanner>
          </div>
        ) : null}
        <div className='overflow-x-auto'>
          <table className='min-w-full text-left text-sm'>
            <thead>
              <tr className='border-b border-zinc-800/80 text-zinc-400'>
                <th className='p-3'>Name</th>
                <th className='p-3'>Email</th>
                <th className='p-3'>Plan</th>
                <th className='p-3'>Projects</th>
                <th className='p-3'>Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <AdminTableStateRow colSpan={5} message='Loading users...' />
              ) : users.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No users returned at this moment.' />
              ) : (
                users.map((user) => (
                  <tr key={user.id} className='border-b border-zinc-800/60 hover:bg-zinc-900/60'>
                    <td className='p-3 font-medium'>{user.name || 'No name'}</td>
                    <td className='p-3 text-zinc-400'>{user.email}</td>
                    <td className='p-3'>
                      <AdminBadge
                        tone={
                          user.plan === 'enterprise'
                            ? 'emerald'
                            : user.plan === 'pro'
                              ? 'sky'
                              : 'neutral'
                        }
                      >
                        {planLabels[user.plan] ?? user.plan}
                      </AdminBadge>
                    </td>
                    <td className='p-3'>{user._count?.projects ?? 0}</td>
                    <td className='p-3 text-zinc-500'>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className='block rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4 shadow transition hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          >
            <h2 className='text-base font-semibold'>{card.title}</h2>
            <p className='mt-2 text-sm text-zinc-400'>{card.description}</p>
          </Link>
        ))}
      </div>
    </AdminPageShell>
  );
}

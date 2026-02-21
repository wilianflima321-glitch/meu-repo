"use client"

import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';

type UserRow = {
  id: string;
  name?: string | null;
  email: string;
  plan: string;
  createdAt: string;
  _count?: { projects?: number };
};

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || payload?.error || 'Falha ao carregar painel admin');
  }
  return response.json();
};

export default function Admin() {
  const { data, error, isLoading, mutate } = useSWR<{ users: UserRow[] }>(`${API_BASE}/admin/users`, fetcher);
  const users = Array.isArray(data?.users) ? data.users : [];

  const planLabels: Record<string, string> = {
    enterprise: 'Empresarial',
    pro: 'Pro',
    free: 'Gratuito',
  };

  const enterpriseCount = users.filter((user) => user.plan === 'enterprise').length;
  const proCount = users.filter((user) => user.plan === 'pro').length;
  const freeCount = users.filter((user) => user.plan === 'free').length;

  const cards = [
    {
      href: '/admin/users',
      title: 'Gerenciar usuarios',
      description: 'Editar perfis, funcoes, acesso e governanca de contas.',
    },
    {
      href: '/admin/payments',
      title: 'Pagamentos e Gateway',
      description: 'Operar checkout web, gateway ativo e conciliacao transacional.',
    },
    {
      href: '/admin/apis',
      title: 'Integracoes API',
      description: 'Verificar providers configurados e chaves de ambiente.',
    },
    {
      href: '/admin/security',
      title: 'Seguranca e Auditoria',
      description: 'Acompanhar eventos criticos e hardening operacional.',
    },
  ];

  return (
    <AdminPageShell
      title='Admin Enterprise Console'
      description='Operação central de usuários, billing, segurança e integrações.'
      actions={<AdminPrimaryButton onClick={() => mutate()}>Recarregar</AdminPrimaryButton>}
    >
      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Usuários' value={users.length} />
          <AdminStatCard label='Enterprise' value={enterpriseCount} tone='emerald' />
          <AdminStatCard label='Pro' value={proCount} tone='sky' />
          <AdminStatCard label='Free' value={freeCount} />
        </AdminStatGrid>
      </div>

      <AdminSection title='Usuários recentes' subtitle='Fonte: /admin/users' className='mb-8 p-0'>
        {error ? (
          <div className='p-4'>
            <AdminStatusBanner tone='danger'>{error.message}</AdminStatusBanner>
          </div>
        ) : null}
        <div className='overflow-x-auto'>
          <table className='min-w-full text-left text-sm'>
            <thead>
              <tr className='border-b border-zinc-800/80 text-zinc-400'>
                <th className='p-3'>Nome</th>
                <th className='p-3'>Email</th>
                <th className='p-3'>Plano</th>
                <th className='p-3'>Projetos</th>
                <th className='p-3'>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <AdminTableStateRow colSpan={5} message='Carregando usuários...' />
              ) : users.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='Nenhum usuário retornado no momento.' />
              ) : (
                users.map((user) => (
                  <tr key={user.id} className='border-b border-zinc-800/60 hover:bg-zinc-900/60'>
                    <td className='p-3 font-medium'>{user.name || 'Sem nome'}</td>
                    <td className='p-3 text-zinc-400'>{user.email}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          user.plan === 'enterprise'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : user.plan === 'pro'
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {planLabels[user.plan] ?? user.plan}
                      </span>
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

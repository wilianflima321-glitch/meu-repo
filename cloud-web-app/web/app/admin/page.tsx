"use client"

import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

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
      title: 'Gerenciar usuários',
      description: 'Editar perfis, funções, acesso e governanca de contas.',
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
      title: 'Segurança e Auditoria',
      description: 'Acompanhar eventos criticos e hardening operacional.',
    },
  ];

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <AdminPageHeader
        className='mb-6'
        eyebrow='Admin Control Center'
        title='Admin Enterprise Console'
        subtitle='Operação central de usuários, billing, segurança e integrações.'
        actions={(
          <button type="button"
            onClick={() => mutate()}
            className='rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]'
          >
            Recarregar
          </button>
        )}
      />

      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Stat title='Usuarios' value={users.length} />
        <Stat title='Enterprise' value={enterpriseCount} tone='emerald' />
        <Stat title='Pro' value={proCount} tone='sky' />
        <Stat title='Free' value={freeCount} tone='slate' />
      </div>

      <div className='mb-8 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] shadow-[0_18px_45px_rgba(0,0,0,0.35)]'>
        <div className='flex items-center justify-between border-b border-[var(--aethel-border-subtle)] px-4 py-3'>
          <h2 className='text-lg font-semibold'>Usuarios recentes</h2>
          <p className='text-xs text-[var(--aethel-text-tertiary)]'>Fonte: /admin/users</p>
        </div>

        {isLoading ? (
          <div className='p-4 text-sm text-[var(--aethel-text-tertiary)]'>Carregando usu?rios...</div>
        ) : error ? (
          <div className='p-4 text-sm text-[var(--aethel-error)]'>{error.message}</div>
        ) : users.length === 0 ? (
          <div className='p-4 text-sm text-[var(--aethel-text-tertiary)]'>Nenhum usuario retornado no momento.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-[var(--aethel-border-subtle)] text-[var(--aethel-text-secondary)]'>
                  <th className='p-2'>Nome</th>
                  <th className='p-2'>Email</th>
                  <th className='p-2'>Plano</th>
                  <th className='p-2'>Projetos</th>
                  <th className='p-2'>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className='border-b border-[var(--aethel-border-subtle)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]'>
                    <td className='p-2 font-medium'>{user.name || 'Sem nome'}</td>
                    <td className='p-2 text-[var(--aethel-text-secondary)]'>{user.email}</td>
                    <td className='p-2'>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
 user.plan === 'enterprise'
 ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
 : user.plan === 'pro'
 ? 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info)]'
 : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-secondary)]'
 }`}
                      >
                        {planLabels[user.plan] ?? user.plan}
                      </span>
                    </td>
                    <td className='p-2'>{user._count?.projects || 0}</td>
                    <td className='p-2 text-[var(--aethel-text-tertiary)]'>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className='block rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_30%,transparent)] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] transition hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]'
          >
            <h2 className='text-base font-semibold'>{card.title}</h2>
            <p className='mt-2 text-sm text-[var(--aethel-text-secondary)]'>{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  tone = 'sky',
}: {
  title: string;
  value: number;
  tone?: 'sky' | 'emerald' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-[var(--aethel-success)]'
      : tone === 'slate'
        ? 'text-[var(--aethel-text-secondary)]'
        : 'text-[var(--aethel-info)]';

  return (
    <div className='rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4'>
      <p className='text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]'>{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

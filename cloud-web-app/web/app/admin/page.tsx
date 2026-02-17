"use client"

import Link from 'next/link';
import useSWR from 'swr';
import { API_BASE } from '@/lib/api';
import { getToken } from '@/lib/auth';

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
    <div className='p-6 max-w-7xl mx-auto'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Admin Enterprise Console</h1>
          <p className='mt-1 text-zinc-400'>Operacao central de usuarios, billing, seguranca e integracoes.</p>
        </div>
        <button
          onClick={() => mutate()}
          className='rounded bg-zinc-800/70 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/80'
        >
          Recarregar
        </button>
      </div>

      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
        <Stat title='Usuarios' value={users.length} />
        <Stat title='Enterprise' value={enterpriseCount} tone='emerald' />
        <Stat title='Pro' value={proCount} tone='sky' />
        <Stat title='Free' value={freeCount} tone='slate' />
      </div>

      <div className='mb-8 rounded-lg border border-zinc-800/80 bg-zinc-900/70 shadow'>
        <div className='flex items-center justify-between border-b border-zinc-800/80 px-4 py-3'>
          <h2 className='text-lg font-semibold'>Usuarios recentes</h2>
          <p className='text-xs text-zinc-500'>Fonte: /admin/users</p>
        </div>

        {isLoading ? (
          <div className='p-4 text-sm text-zinc-500'>Carregando usuarios...</div>
        ) : error ? (
          <div className='p-4 text-sm text-rose-300'>{error.message}</div>
        ) : users.length === 0 ? (
          <div className='p-4 text-sm text-zinc-500'>Nenhum usuario retornado no momento.</div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-zinc-800/80 text-zinc-400'>
                  <th className='p-2'>Nome</th>
                  <th className='p-2'>Email</th>
                  <th className='p-2'>Plano</th>
                  <th className='p-2'>Projetos</th>
                  <th className='p-2'>Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className='border-b border-zinc-800/60 hover:bg-zinc-900/60'>
                    <td className='p-2 font-medium'>{user.name || 'Sem nome'}</td>
                    <td className='p-2 text-zinc-400'>{user.email}</td>
                    <td className='p-2'>
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
                    <td className='p-2'>{user._count?.projects ?? 0}</td>
                    <td className='p-2 text-zinc-500'>{new Date(user.createdAt).toLocaleDateString()}</td>
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
            className='block rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4 shadow transition hover:border-zinc-700 hover:bg-zinc-900'
          >
            <h2 className='text-base font-semibold'>{card.title}</h2>
            <p className='mt-2 text-sm text-zinc-400'>{card.description}</p>
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
      ? 'text-emerald-300'
      : tone === 'slate'
        ? 'text-zinc-300'
        : 'text-sky-300';

  return (
    <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
      <p className='text-xs uppercase tracking-[0.08em] text-zinc-500'>{title}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

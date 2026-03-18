'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Users as UsersIcon } from 'lucide-react';
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

/**
 * Admin Users - Gerenciamento de usuários
 * Planos alinhados com estratégia 2025 (sem Free)
 */
export default function AdminUsers() {
  const [users, setUsers] = useState<Array<{
    id: string;
    name: string | null;
    email: string;
    plan: string | null;
    createdAt: string;
    projects: number;
    sessions: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const planLabels: Record<string, string> = {
    starter: 'Inicial',
    basic: 'Básico',
    pro: 'Pro',
    studio: 'Estúdio',
    enterprise: 'Empresarial',
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      const data = await res.json();
      const nextUsers = Array.isArray(data?.users) ? data.users : [];
      setUsers(nextUsers.map((user: any) => ({
        id: user.id,
        name: user.name ?? null,
        email: user.email,
        plan: user.plan ?? null,
        createdAt: user.createdAt,
        projects: user._count?.projects ?? 0,
        sessions: user._count?.sessions ?? 0,
      })));
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      user.email.toLowerCase().includes(term) ||
      (user.name || '').toLowerCase().includes(term);
    const plan = (user.plan || 'starter').toLowerCase();
    const matchesPlan = planFilter === 'all' || plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const summary = {
    total: users.length,
    activePlans: users.filter((user) => !String(user.plan || '').includes('trial')).length,
    trials: users.filter((user) => String(user.plan || '').includes('trial')).length,
  };

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Gerenciar Usuários</h1>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchUsers}
          className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
        >
          Atualizar
        </button>
      </div>

      <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          { icon: UsersIcon, label: 'Total', value: summary.total },
          { icon: CheckCircle, label: 'Planos ativos', value: summary.activePlans, tone: 'success' },
          { icon: Clock, label: 'Testes', value: summary.trials, tone: 'warning' },
        ]}
      />

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'starter', 'basic', 'pro', 'studio', 'enterprise'] as const).map((plan) => (
            <button
              key={plan}
              onClick={() => setPlanFilter(plan)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                planFilter === plan ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              {plan === 'all' ? 'Todos' : (planLabels[plan] ?? plan)}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
        <thead>
          <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'>
            <th className='p-3'>Nome</th>
            <th className='p-3'>E-mail</th>
            <th className='p-3'>Plano</th>
            <th className='p-3'>Projetos</th>
            <th className='p-3'>Sessões</th>
            <th className='p-3'>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-3 text-sm text-[var(--aethel-text-tertiary)]' colSpan={6}>Carregando usuários...</td>
            </tr>
          ) : error ? (
            <tr>
              <td className='p-3 text-sm text-[var(--aethel-error)]' colSpan={6}>{error}</td>
            </tr>
          ) : filteredUsers.length === 0 ? (
            <tr>
              <td className='p-3 text-sm text-[var(--aethel-text-tertiary)]' colSpan={6}>Nenhum usuário encontrado.</td>
            </tr>
          ) : (
            filteredUsers.map(user => (
              <tr key={user.id} className='border-t'>
                <td className='p-3'>{user.name || '—'}</td>
                <td className='p-3'>
                  <div className="flex items-center gap-2">
                    <span>{user.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(user.email)}
                      className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
                    >
                      Copiar
                    </button>
                  </div>
                </td>
                <td className='p-3'>{planLabels[user.plan || 'starter'] ?? (user.plan || 'starter')}</td>
                <td className='p-3'>{user.projects}</td>
                <td className='p-3'>{user.sessions}</td>
                <td className='p-3'>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle, Mail } from 'lucide-react';
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

type NotificationItem = {
  id: string;
  userEmail: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
};

type Totals = {
  total: number;
  read: number;
  unread: number;
};

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('read', readFilter === 'all' ? 'all' : readFilter === 'read' ? 'true' : 'false');
      if (typeFilter !== 'all') params.set('type', typeFilter);
      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar notificações');
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals ?? { total: 0, read: 0, unread: 0 });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações');
    } finally {
      setLoading(false);
    }
  }, [readFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const types = Array.from(new Set(items.map((item) => item.type))).sort();
  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term ||
      (item.userEmail || '').toLowerCase().includes(term) ||
      item.title.toLowerCase().includes(term) ||
      (item.message || '').toLowerCase().includes(term);
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Notificações</h1>
          <p className='text-[var(--aethel-text-secondary)]'>Notificações reais para usuários e administradores.</p>
          {lastUpdated && (
            <p className='text-xs text-[var(--aethel-text-tertiary)]'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchNotifications}
          className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'
        >
          Atualizar
        </button>
      </div>

            <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          { icon: Bell, label: 'Total', value: totals.total },
          { icon: CheckCircle, label: 'Lidas', value: totals.read, tone: 'success' },
          { icon: Mail, label: 'Nao lidas', value: totals.unread, tone: 'warning' },
        ]}
      />

<div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar por título, mensagem ou e-mail'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border p-2 rounded w-full md:max-w-sm'
        />
        <div className='flex items-center gap-2 flex-wrap'>
          {(['all', 'read', 'unread'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setReadFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                readFilter === status ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              {status === 'all' ? 'Todas' : status === 'read' ? 'Lidas' : 'Não lidas'}
            </button>
          ))}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className='border p-1 rounded text-xs'
          >
            <option value='all'>Todos os tipos</option>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow overflow-hidden'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm'>
              <th className='p-2'>Tipo</th>
              <th className='p-2'>Título</th>
              <th className='p-2'>Usuário</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Carregando notificações...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-error)]' colSpan={5}>{error}</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Nenhuma notificação encontrada.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2'>{item.type}</td>
                  <td className='p-2'>{item.title}</td>
                  <td className='p-2'>{item.userEmail || '—'}</td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.read ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                    }`}>
                      {item.read ? 'Lida' : 'Não lida'}
                    </span>
                  </td>
                  <td className='p-2'>{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

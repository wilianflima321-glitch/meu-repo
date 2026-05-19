'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

type Ticket = {
  id: string;
  email: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  messageCount: number;
  createdAt: string;
};

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'resolved' | 'closed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'normal' | 'high' | 'urgent'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    open: 'Aberto',
    pending: 'Pendente',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Baixa',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente',
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/support/tickets');
      if (!res.ok) throw new Error('Failed to load chamados');
      const data = await res.json();
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading chamados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter((ticket) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      ticket.email.toLowerCase().includes(term) ||
      ticket.subject.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const summary = {
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    pending: tickets.filter((ticket) => ticket.status === 'pending').length,
    urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length,
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Suporte ao user</h1>
          <p className='text-[var(--aethel-text-secondary)]'>Chamados reais do system de suporte.</p>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button type="button"
          onClick={fetchTickets}
          className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
        >
          Atualizar
        </button>
      </div>

            <AdminSummaryGrid
        className="mb-6"
        columns={4}
        items={[
          { icon: Activity, label: 'Total', value: summary.total },
          { icon: CheckCircle, label: 'Abertos', value: summary.open, tone: 'success' },
          { icon: Clock, label: 'Pendentes', value: summary.pending, tone: 'warning' },
          { icon: AlertTriangle, label: 'Urgentes', value: summary.urgent, tone: 'error' },
        ]}
      />

<div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por e-mail ou assunto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
            <button type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              {status === 'all' ? 'Todos' : (statusLabels[status] || status)}
            </button>
          ))}
          {(['all', 'low', 'normal', 'high', 'urgent'] as const).map((priority) => (
            <button type="button"
              key={priority}
              onClick={() => setPriorityFilter(priority)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                priorityFilter === priority ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              {priority === 'all' ? 'All prioridades' : (priorityLabels[priority] || priority)}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full table-auto bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
        <thead>
          <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'>
            <th className='p-2'>ID</th>
            <th className='p-2'>User</th>
            <th className='p-2'>Assunto</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Prioridade</th>
            <th className='p-2'>Mensagens</th>
            <th className='p-2'>Data</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={7}>Loading tickets...</td>
            </tr>
          ) : error ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-error)]' colSpan={7}>{error}</td>
            </tr>
          ) : filteredTickets.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={7}>Nenhum chamado encontrado.</td>
            </tr>
          ) : (
            filteredTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className='p-2'>{ticket.id.slice(-6)}</td>
                <td className='p-2'>
                  <div className="flex items-center gap-2">
                    <span>{ticket.email}</span>
                    <button type="button"
                      onClick={() => navigator.clipboard.writeText(ticket.email)}
                      className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
                    >
                      Copiar
                    </button>
                  </div>
                </td>
                <td className='p-2'>{ticket.subject}</td>
                <td className='p-2'>
                  <span className="px-2 py-1 rounded text-xs bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]">
                    {statusLabels[ticket.status] || ticket.status}
                  </span>
                </td>
                <td className='p-2'>
                  <span className={`px-2 py-1 rounded text-xs ${
                    ticket.priority === 'urgent'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
                      : ticket.priority === 'high'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                      : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                  }`}>
                    {priorityLabels[ticket.priority] || ticket.priority}
                  </span>
                </td>
                <td className='p-2'>{ticket.messageCount}</td>
                <td className='p-2'>{new Date(ticket.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

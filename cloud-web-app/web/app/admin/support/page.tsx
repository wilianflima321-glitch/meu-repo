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

type TicketsPayload = {
  tickets?: Ticket[];
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
    open: 'Open',
    pending: 'Pending',
    resolved: 'Resolved',
    closed: 'Closed',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<TicketsPayload>('/api/admin/support/tickets');
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          ticket.email.toLowerCase().includes(term) ||
          ticket.subject.toLowerCase().includes(term);
        const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      }),
    [tickets, search, statusFilter, priorityFilter],
  );

  const summary = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === 'open').length,
      pending: tickets.filter((ticket) => ticket.status === 'pending').length,
      urgent: tickets.filter((ticket) => ticket.priority === 'urgent').length,
    }),
    [tickets],
  );

  return (
    <AdminPageShell
      title='Support Operations'
      description='Track and triage real support tickets from production users.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchTickets}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total tickets' value={summary.total} tone='sky' />
          <AdminStatCard label='Open' value={summary.open} tone='emerald' />
          <AdminStatCard label='Pending' value={summary.pending} tone='amber' />
          <AdminStatCard label='Urgent' value={summary.urgent} tone='rose' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by email or subject'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <div className='flex items-center gap-2 flex-wrap'>
            {(['all', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {status === 'all' ? 'All statuses' : (statusLabels[status] ?? status)}
              </button>
            ))}
            {(['all', 'low', 'normal', 'high', 'urgent'] as const).map((priority) => (
              <button
                key={priority}
                onClick={() => setPriorityFilter(priority)}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  priorityFilter === priority ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {priority === 'all' ? 'All priorities' : (priorityLabels[priority] ?? priority)}
              </button>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-2 text-left'>ID</th>
                <th className='p-2 text-left'>User</th>
                <th className='p-2 text-left'>Subject</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Priority</th>
                <th className='p-2 text-left'>Messages</th>
                <th className='p-2 text-left'>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={7} message='Loading tickets...' />
              ) : filteredTickets.length === 0 ? (
                <AdminTableStateRow colSpan={7} message='No tickets found for current filters.' />
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className='border-t border-zinc-800/70'>
                    <td className='p-2 text-zinc-500'>{ticket.id.slice(-6)}</td>
                    <td className='p-2'>
                      <div className='flex items-center gap-2'>
                        <span>{ticket.email}</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(ticket.email)}
                          className='text-xs text-zinc-500 hover:text-zinc-200'
                          type='button'
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className='p-2 text-zinc-200'>{ticket.subject}</td>
                    <td className='p-2'>
                      <span className='rounded bg-zinc-800/70 px-2 py-1 text-xs text-zinc-300'>
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className='p-2'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          ticket.priority === 'urgent'
                            ? 'bg-rose-500/15 text-rose-300'
                            : ticket.priority === 'high'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {priorityLabels[ticket.priority] ?? ticket.priority}
                      </span>
                    </td>
                    <td className='p-2'>{ticket.messageCount}</td>
                    <td className='p-2 text-zinc-500'>{new Date(ticket.createdAt).toLocaleDateString()}</td>
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

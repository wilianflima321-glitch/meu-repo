'use client';

import { useCallback, useEffect, useState } from 'react';

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
      if (!res.ok) throw new Error('Falha ao carregar chamados');
      const data = await res.json();
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar chamados');
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
          <h1 className='text-3xl font-bold'>Suporte ao usuário</h1>
          <p className='text-gray-600'>Chamados reais do sistema de suporte.</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchTickets}
          className="px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <h3 className="text-sm font-semibold">Total</h3>
          <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Abertos</h3>
          <p className="text-2xl font-bold text-green-600">{summary.open}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Pendentes</h3>
          <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-semibold">Urgentes</h3>
          <p className="text-2xl font-bold text-red-600">{summary.urgent}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por e-mail ou assunto"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'open', 'pending', 'resolved', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status === 'all' ? 'Todos' : (statusLabels[status] ?? status)}
            </button>
          ))}
          {(['all', 'low', 'normal', 'high', 'urgent'] as const).map((priority) => (
            <button
              key={priority}
              onClick={() => setPriorityFilter(priority)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                priorityFilter === priority ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {priority === 'all' ? 'Todas prioridades' : (priorityLabels[priority] ?? priority)}
            </button>
          ))}
        </div>
      </div>

      <table className='w-full table-auto bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2'>ID</th>
            <th className='p-2'>Usuário</th>
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
              <td className='p-2 text-sm text-gray-500' colSpan={7}>Carregando chamados...</td>
            </tr>
          ) : error ? (
            <tr>
              <td className='p-2 text-sm text-red-500' colSpan={7}>{error}</td>
            </tr>
          ) : filteredTickets.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={7}>Nenhum chamado encontrado.</td>
            </tr>
          ) : (
            filteredTickets.map((ticket) => (
              <tr key={ticket.id}>
                <td className='p-2'>{ticket.id.slice(-6)}</td>
                <td className='p-2'>
                  <div className="flex items-center gap-2">
                    <span>{ticket.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(ticket.email)}
                      className="text-xs text-gray-500 hover:text-gray-800"
                    >
                      Copiar
                    </button>
                  </div>
                </td>
                <td className='p-2'>{ticket.subject}</td>
                <td className='p-2'>
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                    {statusLabels[ticket.status] ?? ticket.status}
                  </span>
                </td>
                <td className='p-2'>
                  <span className={`px-2 py-1 rounded text-xs ${
                    ticket.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : ticket.priority === 'high'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {priorityLabels[ticket.priority] ?? ticket.priority}
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

type FeedbackItem = {
  id: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
};

export default function Feedback() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'resolved' | 'closed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const statusLabels: Record<string, string> = {
    open: 'Aberto',
    pending: 'Pendente',
    resolved: 'Resolvido',
    closed: 'Fechado',
  };

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feedback');
      if (!res.ok) throw new Error('Falha ao carregar feedbacks');
      const data = await res.json();
      setFeedbacks(Array.isArray(data?.feedback) ? data.feedback : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar feedbacks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const categories = Array.from(
    new Set(feedbacks.map((item) => item.category).filter(Boolean))
  ).sort();

  const filteredFeedbacks = feedbacks.filter((feedback) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      feedback.email.toLowerCase().includes(term) ||
      feedback.subject.toLowerCase().includes(term) ||
      feedback.message.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || feedback.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || feedback.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const summary = {
    total: feedbacks.length,
    open: feedbacks.filter((item) => item.status === 'open').length,
    resolved: feedbacks.filter((item) => item.status === 'resolved').length,
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className='text-3xl font-bold'>Coleta de feedback</h1>
          <p className='text-[var(--aethel-text-secondary)]'>Analise feedbacks reais enviados via tickets de suporte.</p>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchFeedbacks}
          className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
        >
          Atualizar
        </button>
      </div>

            <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          { icon: MessageSquare, label: 'Total', value: summary.total },
          { icon: AlertTriangle, label: 'Abertos', value: summary.open, tone: 'warning' },
          { icon: CheckCircle, label: 'Resolvidos', value: summary.resolved, tone: 'success' },
        ]}
      />

<div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <input
          type="text"
          placeholder="Buscar por usuário, assunto ou comentário"
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
                statusFilter === status ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
              }`}
            >
              {status === 'all' ? 'Todos' : statusLabels[status] ?? status}
            </button>
          ))}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border p-1 rounded text-xs"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table className='w-full table-auto bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
        <thead>
          <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'>
            <th className='p-2'>Usuário</th>
            <th className='p-2'>Assunto</th>
            <th className='p-2'>Comentário</th>
            <th className='p-2'>Categoria</th>
            <th className='p-2'>Status</th>
            <th className='p-2'>Data</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={6}>Carregando feedbacks...</td>
            </tr>
          ) : error ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-error)]' colSpan={6}>{error}</td>
            </tr>
          ) : filteredFeedbacks.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={6}>Nenhum feedback encontrado.</td>
            </tr>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <tr key={feedback.id}>
                <td className='p-2'>
                  <div className="flex items-center gap-2">
                    <span>{feedback.email}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(feedback.email)}
                      className="text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]"
                    >
                      Copiar
                    </button>
                  </div>
                </td>
                <td className='p-2'>{feedback.subject}</td>
                <td className='p-2'>{feedback.message}</td>
                <td className='p-2'>{feedback.category}</td>
                <td className='p-2'>
                  <span className="px-2 py-1 rounded text-xs bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]">
                    {statusLabels[feedback.status] ?? feedback.status}
                  </span>
                </td>
                <td className='p-2'>{new Date(feedback.createdAt).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

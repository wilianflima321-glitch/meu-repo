'use client';

import React, { useCallback, useEffect, useState } from 'react';

type BiasItem = {
  id: string;
  text: string;
  status: string;
  autoScore?: number | null;
  autoFlags?: string[];
  createdAt: string;
};

type BiasStats = {
  total: number;
  highBias: number;
  mediumBias: number;
  lowBias: number;
  pending: number;
};

const emptyStats: BiasStats = {
  total: 0,
  highBias: 0,
  mediumBias: 0,
  lowBias: 0,
  pending: 0,
};

function getBiasLabel(score?: number | null) {
  if (score === null || score === undefined) return 'Sem score';
  if (score >= 0.7) return 'Viés alto';
  if (score >= 0.4) return 'Viés médio';
  return 'Viés baixo';
}

function getBiasColor(score?: number | null) {
  if (score === null || score === undefined) return 'bg-gray-200 text-zinc-300';
  if (score >= 0.7) return 'bg-rose-500/15 text-rose-300';
  if (score >= 0.4) return 'bg-amber-500/15 text-amber-300';
  return 'bg-emerald-500/15 text-emerald-300';
}

export default function BiasDetectionPage() {
  const [items, setItems] = useState<BiasItem[]>([]);
  const [stats, setStats] = useState<BiasStats>(emptyStats);
  const [newOutput, setNewOutput] = useState('');
  const [newScore, setNewScore] = useState('');
  const [newFlags, setNewFlags] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [biasFilter, setBiasFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'none'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    pending: 'pendente',
    resolved: 'resolvido',
  };

  const fetchItems = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/bias-detection');
      if (!res.ok) {
        throw new Error('Falha ao carregar auditorias');
      }
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setStats(data?.stats || emptyStats);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAnalyze = async () => {
    if (!newOutput.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/bias-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newOutput,
          score: newScore ? Number(newScore) : undefined,
          flags: newFlags,
          reason: newReason,
          priority: newPriority,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha ao registrar auditoria');
      }

      setNewOutput('');
      setNewScore('');
      setNewFlags('');
      setNewReason('');
      setNewPriority('normal');
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerationAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`/api/admin/moderation/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao atualizar item');
      }

      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    }
  };

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || item.text.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending'
        ? item.status === 'pending'
        : item.status !== 'pending');
    const matchesBias =
      biasFilter === 'all' ||
      (biasFilter === 'none'
        ? item.autoScore === null || item.autoScore === undefined
        : biasFilter === 'high'
        ? (item.autoScore ?? 0) >= 0.7
        : biasFilter === 'medium'
        ? (item.autoScore ?? 0) >= 0.4 && (item.autoScore ?? 0) < 0.7
        : (item.autoScore ?? 0) < 0.4);
    return matchesSearch && matchesStatus && matchesBias;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Detecção de viés e ética</h1>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={fetchItems}
          className="px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm"
        >
          Atualizar
        </button>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Auditar Output da IA</h2>
        <div className="space-y-4">
          <textarea
            placeholder="Cole a saída da IA aqui para auditoria"
            value={newOutput}
            onChange={(e) => setNewOutput(e.target.value)}
            className="border p-2 w-full"
            rows={5}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="Score de viés (0-1, opcional)"
              value={newScore}
              onChange={(e) => setNewScore(e.target.value)}
              className="border p-2 w-full"
            />
            <input
              type="text"
              placeholder="Flags (separadas por vírgula)"
              value={newFlags}
              onChange={(e) => setNewFlags(e.target.value)}
              className="border p-2 w-full"
            />
            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="border p-2 w-full"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as 'low' | 'normal' | 'high' | 'urgent')}
              className="border p-2 w-full"
            >
              <option value="low">Prioridade baixa</option>
              <option value="normal">Prioridade normal</option>
              <option value="high">Prioridade alta</option>
              <option value="urgent">Prioridade urgente</option>
            </select>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={submitting || !newOutput.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {submitting ? 'Registrando...' : 'Registrar Auditoria'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Relatórios Éticos</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <h3 className="text-sm font-semibold">Total de auditorias</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold">Viés alto</h3>
            <p className="text-2xl font-bold text-red-600">{stats.highBias}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold">Viés médio</h3>
            <p className="text-2xl font-bold text-yellow-600">{stats.mediumBias}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold">Viés baixo</h3>
            <p className="text-2xl font-bold text-green-600">{stats.lowBias}</p>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold">Pendentes</h3>
            <p className="text-2xl font-bold text-zinc-400">{stats.pending}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/70 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Outputs Auditados</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por conteúdo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded w-full md:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'pending', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : 'Resolvidos'}
              </button>
            ))}
            {(['all', 'high', 'medium', 'low', 'none'] as const).map((bias) => (
              <button
                key={bias}
                onClick={() => setBiasFilter(bias)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  biasFilter === bias
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800/70 text-zinc-400'
                }`}
              >
                {bias === 'all'
                  ? 'Todos scores'
                  : bias === 'high'
                  ? 'Alto'
                  : bias === 'medium'
                  ? 'Médio'
                  : bias === 'low'
                  ? 'Baixo'
                  : 'Sem score'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-20 bg-zinc-800/70 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhuma auditoria registrada.</p>
        ) : (
          <ul>
            {filteredItems.map((item) => (
              <li key={item.id} className="p-4 border-b">
                <p className="mb-2 text-sm text-zinc-200">{item.text}</p>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <span>
                      Score de viés:{' '}
                      {item.autoScore === null || item.autoScore === undefined
                        ? 'N/D'
                        : `${(item.autoScore * 100).toFixed(1)}%`}
                    </span>
                    <span>Status: {statusLabels[item.status] ?? item.status}</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getBiasColor(item.autoScore)}`}>
                    {getBiasLabel(item.autoScore)}
                  </span>
                </div>
                {item.autoFlags && item.autoFlags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.autoFlags.map((flag) => (
                      <span
                        key={flag}
                        className="text-xs bg-zinc-800/70 text-zinc-400 px-2 py-1 rounded"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleModerationAction(item.id, 'approve')}
                    className="px-3 py-1 rounded text-xs bg-emerald-500/15 text-emerald-300"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleModerationAction(item.id, 'reject')}
                    className="px-3 py-1 rounded text-xs bg-rose-500/15 text-rose-300"
                  >
                    Rejeitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

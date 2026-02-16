'use client';

import { useCallback, useEffect, useState } from 'react';

type TrainingJob = {
  id: string;
  model: string;
  status: string;
  cost: number;
  efficiency: number;
  filters?: string | null;
  auxAI?: string | null;
  optimization?: string | null;
  createdAt: string;
};

export default function AITraining() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    model: 'Aethel-GPT',
    auxAI: 'GPT-4 para dados sintéticos',
    optimization: 'Quantização + transferência de aprendizado',
    filters: 'Detecção de viés habilitada',
  });
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    queued: 'na fila',
    running: 'em execução',
    completed: 'concluído',
    failed: 'falhou',
    paused: 'pausado',
  };

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/training');
      if (!res.ok) throw new Error('Falha ao carregar tarefas');
      const json = await res.json();
      setJobs(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/ai/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao iniciar treinamento');
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar treinamento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Treinamento de IA</h1>
          <p className='text-sm text-zinc-500'>Crie tarefas e acompanhe status, custos e eficiência.</p>
        </div>
        <button onClick={fetchJobs} className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 bg-zinc-900/70 p-6 rounded-lg shadow'>
        <h2 className='text-xl font-semibold mb-4'>Nova tarefa de treinamento</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium'>Modelo</label>
            <input
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              className='mt-1 block w-full p-2 border rounded'
            />
          </div>
          <div>
            <label className='block text-sm font-medium'>IA Auxiliar</label>
            <input
              value={form.auxAI}
              onChange={(e) => setForm((prev) => ({ ...prev, auxAI: e.target.value }))}
              className='mt-1 block w-full p-2 border rounded'
            />
          </div>
          <div>
            <label className='block text-sm font-medium'>Otimização</label>
            <input
              value={form.optimization}
              onChange={(e) => setForm((prev) => ({ ...prev, optimization: e.target.value }))}
              className='mt-1 block w-full p-2 border rounded'
            />
          </div>
          <div>
            <label className='block text-sm font-medium'>Filtros</label>
            <input
              value={form.filters}
              onChange={(e) => setForm((prev) => ({ ...prev, filters: e.target.value }))}
              className='mt-1 block w-full p-2 border rounded'
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving}
          className='mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50'
        >
          {saving ? 'Iniciando...' : 'Iniciar treinamento'}
        </button>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Tarefas recentes</h2>
        {loading ? (
          <p className='text-sm text-zinc-500'>Carregando tarefas...</p>
        ) : jobs.length === 0 ? (
          <p className='text-sm text-zinc-500'>Nenhuma tarefa encontrada.</p>
        ) : (
          <div className='space-y-4'>
            {jobs.map((job) => (
              <div key={job.id} className='p-4 bg-zinc-900/70 rounded-lg shadow'>
                <h3 className='text-lg font-semibold'>{job.model}</h3>
                <p className='text-sm text-zinc-400'>Status: {statusLabels[job.status] ?? job.status} • Custo: ${job.cost.toFixed(2)} • Eficiência: {job.efficiency.toFixed(0)}%</p>
                <p className='text-sm text-zinc-400'>Auxiliar: {job.auxAI || '—'} • Otimização: {job.optimization || '—'}</p>
                <p className='text-sm text-zinc-400'>Filtros: {job.filters || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

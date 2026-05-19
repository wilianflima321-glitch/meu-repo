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
    auxAI: 'GPT-4 for synthetic data',
    optimization: 'Quantization + transfer learning',
    filters: 'Bias detection enabled',
  });
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    queued: 'na fila',
    running: 'running',
    completed: 'completed',
    failed: 'falhou',
    paused: 'pausado',
  };

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/training');
      if (!res.ok) throw new Error('Failed to load tarefas');
      const json = await res.json();
      setJobs(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading tarefas');
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
      if (!res.ok) throw new Error('Failed to start treinamento');
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error starting treinamento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-6 max-w-4xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Treinamento de IA</h1>
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Create tasks and track status, costs, and efficiency.</p>
        </div>
        <button type="button" onClick={fetchJobs} className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-6 rounded-lg shadow'>
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
            <label className='block text-sm font-medium'>IA Assistant</label>
            <input
              value={form.auxAI}
              onChange={(e) => setForm((prev) => ({ ...prev, auxAI: e.target.value }))}
              className='mt-1 block w-full p-2 border rounded'
            />
          </div>
          <div>
            <label className='block text-sm font-medium'>Optimization</label>
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
        <button type="button"
          onClick={handleCreate}
          disabled={saving}
          className='mt-4 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] px-4 py-2 rounded disabled:opacity-50'
        >
          {saving ? 'Iniciando...' : 'Iniciar treinamento'}
        </button>
      </div>

      <div>
        <h2 className='text-xl font-semibold mb-4'>Tarefas recentes</h2>
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Loading tasks...</p>
        ) : jobs.length === 0 ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Nenhuma tarefa encontrada.</p>
        ) : (
          <div className='space-y-4'>
            {jobs.map((job) => (
              <div key={job.id} className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
                <h3 className='text-lg font-semibold'>{job.model}</h3>
                <p className='text-sm text-[var(--aethel-text-secondary)]'>Status: {statusLabels[job.status] || job.status} • Cost: ${job.cost.toFixed(2)} • Efficiency: {job.efficiency.toFixed(0)}%</p>
                <p className='text-sm text-[var(--aethel-text-secondary)]'>Assistant: {job.auxAI || '—'} • Optimization: {job.optimization || '—'}</p>
                <p className='text-sm text-[var(--aethel-text-secondary)]'>Filtros: {job.filters || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

type Pipeline = {
  id: string;
  name: string;
  status: string;
  provider: string;
  lastRunAt?: string | null;
};

export default function Deploy() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', provider: 'internal' });
  const [saving, setSaving] = useState(false);

  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/deploy');
      if (!res.ok) throw new Error('Failed to load pipelines');
      const json = await res.json();
      setPipelines(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const createPipeline = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create pipeline');
      setForm({ name: '', provider: 'internal' });
      await fetchPipelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating pipeline');
    } finally {
      setSaving(false);
    }
  };

  const runPipeline = async (id: string) => {
    try {
      const res = await fetch('/api/admin/deploy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'run' }),
      });
      if (!res.ok) throw new Error('Failed to run pipeline');
      await fetchPipelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error running pipeline');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>CI/CD and deployment</h1>
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Auditable pipelines for build and release.</p>
        </div>
        <button type="button" onClick={fetchPipelines} className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'>Atualizar</button>
      </div>

      {error && (
        <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow'>
        <h2 className='text-xl font-semibold mb-4'>Novo Pipeline</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Nome do pipeline'
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className='border p-2 rounded text-sm'
            value={form.provider}
            onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
          >
            <option value='internal'>Interno</option>
            <option value='github'>GitHub Actions</option>
            <option value='gitlab'>GitLab CI</option>
          </select>
          <button type="button"
            onClick={createPipeline}
            disabled={saving || !form.name.trim()}
            className='px-4 py-2 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] rounded disabled:opacity-50'
          >
            {saving ? 'Creating...' : 'Criar pipeline'}
          </button>
        </div>
      </div>

      <table className='w-full table-auto bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow'>
        <thead>
          <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]'>
            <th className='p-2 text-left'>Nome</th>
            <th className='p-2 text-left'>Provedor</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Last Run</th>
            <th className='p-2 text-left'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Loading pipelines...</td>
            </tr>
          ) : pipelines.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={5}>Nenhum pipeline encontrado.</td>
            </tr>
          ) : (
            pipelines.map((d) => (
              <tr key={d.id} className='border-t'>
                <td className='p-2'>{d.name}</td>
                <td className='p-2'>{d.provider}</td>
                <td className='p-2'>
                  <span className='text-xs px-2 py-1 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'>{d.status}</span>
                </td>
                <td className='p-2'>
                  {d.lastRunAt ? new Date(d.lastRunAt).toLocaleString() : '—'}
                </td>
                <td className='p-2'>
                  <button type="button" onClick={() => runPipeline(d.id)} className='px-2 py-1 bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)] rounded mr-2 text-sm'>Executar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

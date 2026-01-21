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
      if (!res.ok) throw new Error('Falha ao carregar pipelines');
      const json = await res.json();
      setPipelines(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pipelines');
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
      if (!res.ok) throw new Error('Falha ao criar pipeline');
      setForm({ name: '', provider: 'internal' });
      await fetchPipelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pipeline');
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
      if (!res.ok) throw new Error('Falha ao executar pipeline');
      await fetchPipelines();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao executar pipeline');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>CI/CD e implantação</h1>
          <p className='text-sm text-gray-500'>Pipelines auditáveis para build e lançamento.</p>
        </div>
        <button onClick={fetchPipelines} className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'>Atualizar</button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='mb-6 bg-white p-4 rounded-lg shadow'>
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
          <button
            onClick={createPipeline}
            disabled={saving || !form.name.trim()}
            className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
          >
            {saving ? 'Criando...' : 'Criar pipeline'}
          </button>
        </div>
      </div>

      <table className='w-full table-auto bg-white rounded-lg shadow'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='p-2 text-left'>Nome</th>
            <th className='p-2 text-left'>Provedor</th>
            <th className='p-2 text-left'>Status</th>
            <th className='p-2 text-left'>Última Execução</th>
            <th className='p-2 text-left'>Ações</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Carregando pipelines...</td>
            </tr>
          ) : pipelines.length === 0 ? (
            <tr>
              <td className='p-2 text-sm text-gray-500' colSpan={5}>Nenhum pipeline encontrado.</td>
            </tr>
          ) : (
            pipelines.map((d) => (
              <tr key={d.id} className='border-t'>
                <td className='p-2'>{d.name}</td>
                <td className='p-2'>{d.provider}</td>
                <td className='p-2'>
                  <span className='text-xs px-2 py-1 rounded bg-gray-100 text-gray-600'>{d.status}</span>
                </td>
                <td className='p-2'>
                  {d.lastRunAt ? new Date(d.lastRunAt).toLocaleString() : '—'}
                </td>
                <td className='p-2'>
                  <button onClick={() => runPipeline(d.id)} className='px-2 py-1 bg-yellow-500 text-white rounded mr-2 text-sm'>Executar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

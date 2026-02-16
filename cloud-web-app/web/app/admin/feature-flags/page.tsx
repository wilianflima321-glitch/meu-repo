'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  type: string;
  percentage?: number | null;
  environments?: any;
}

export default function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    key: '',
    name: '',
    type: 'boolean',
    percentage: 50,
    description: '',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const typeLabels: Record<string, string> = {
    boolean: 'Booleano',
    percentage: 'Percentual',
    rule_based: 'Baseado em regras',
    variant: 'Variante',
  };

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/feature-flags');
      if (!res.ok) throw new Error('Falha ao carregar flags');
      const json = await res.json();
      setFlags(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar flags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return flags.filter((flag) => !term || flag.key.toLowerCase().includes(term) || flag.name.toLowerCase().includes(term));
  }, [flags, search]);

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      const res = await fetch('/api/admin/feature-flags/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: !enabled }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar flag');
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar flag');
    }
  };

  const createFlag = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao criar flag');
      setForm({ key: '', name: '', type: 'boolean', percentage: 50, description: '', enabled: true });
      await fetchFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar flag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Flags de recursos</h1>
          <p className='text-sm text-zinc-500'>Controle de distribuição e habilitação por ambiente.</p>
        </div>
        <button onClick={fetchFlags} className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'>Atualizar</button>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Nova flag</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Chave'
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
          />
          <input
            className='border p-2 rounded text-sm'
            placeholder='Nome'
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className='border p-2 rounded text-sm'
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            <option value='boolean'>Booleano</option>
            <option value='percentage'>Percentual</option>
            <option value='rule_based'>Baseado em regras</option>
            <option value='variant'>Variante</option>
          </select>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Descrição'
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          {form.type === 'percentage' && (
            <input
              className='border p-2 rounded text-sm'
              type='number'
              value={form.percentage}
              onChange={(e) => setForm((prev) => ({ ...prev, percentage: Number(e.target.value) }))}
            />
          )}
          <button
            onClick={createFlag}
            disabled={saving || !form.key.trim() || !form.name.trim()}
            className='px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50'
          >
            {saving ? 'Salvando...' : 'Criar flag'}
          </button>
        </div>
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-semibold'>Flags ativas</h2>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Buscar'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className='text-sm text-zinc-500'>Carregando flags...</p>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-zinc-500'>Nenhuma flag encontrada.</p>
        ) : (
          <table className='w-full table-auto'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-2 text-left'>Chave</th>
                <th className='p-2 text-left'>Nome</th>
                <th className='p-2 text-left'>Tipo</th>
                <th className='p-2 text-left'>Distribuição</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((flag) => (
                <tr key={flag.id} className='border-t'>
                  <td className='p-2'>{flag.key}</td>
                  <td className='p-2'>{flag.name}</td>
                  <td className='p-2'>{typeLabels[flag.type] ?? flag.type}</td>
                  <td className='p-2'>
                    {flag.type === 'percentage' ? `${flag.percentage ?? 0}%` : '—'}
                  </td>
                  <td className='p-2'>
                    <span className='text-xs px-2 py-1 rounded bg-zinc-800/70 text-zinc-400'>
                      {flag.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className='p-2'>
                    <button
                      onClick={() => toggleFlag(flag.key, flag.enabled)}
                      className='px-2 py-1 bg-zinc-900 text-white rounded text-sm'
                    >
                      {flag.enabled ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

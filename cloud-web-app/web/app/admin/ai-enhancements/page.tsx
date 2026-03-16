'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type EnhancementItem = {
  id: string;
  name: string;
  status: string;
  description?: string | null;
  applied: boolean;
  createdAt: string;
};

export default function AIEnhancements() {
  const [items, setItems] = useState<EnhancementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [form, setForm] = useState({ name: '', status: 'planned', description: '' });
  const [saving, setSaving] = useState(false);

  const statusLabels: Record<string, string> = {
    planned: 'Planejado',
    partial: 'Parcial',
    missing: 'Faltando',
    applied: 'Aplicado',
  };

  const fetchEnhancements = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ai/enhancements');
      if (!res.ok) throw new Error('Falha ao carregar melhorias');
      const json = await res.json();
      setItems(json.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar melhorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnhancements();
  }, [fetchEnhancements]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesTerm = !term || item.name.toLowerCase().includes(term) || (item.description || '').toLowerCase().includes(term);
      const matchesStatus = status === 'all' || item.status === status;
      return matchesTerm && matchesStatus;
    });
  }, [items, search, status]);

  const toggleApplied = async (item: EnhancementItem) => {
    try {
      const res = await fetch('/api/admin/ai/enhancements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, applied: !item.applied, status: item.applied ? item.status : 'applied' }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar melhoria');
      await fetchEnhancements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar melhoria');
    }
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/ai/enhancements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Falha ao criar melhoria');
      setForm({ name: '', status: 'planned', description: '' });
      await fetchEnhancements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar melhoria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Melhorias Avançadas de IA</h1>
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Roadmap operacional com controle de status e aprovação.</p>
        </div>
        <button onClick={fetchEnhancements} className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)] p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-6'>
        <h2 className='text-xl font-semibold mb-4'>Criar nova melhoria</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Nome'
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <select
            className='border p-2 rounded text-sm'
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value='planned'>Planejado</option>
            <option value='partial'>Parcial</option>
            <option value='missing'>Faltando</option>
            <option value='applied'>Aplicado</option>
          </select>
          <input
            className='border p-2 rounded text-sm'
            placeholder='Descrição'
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !form.name.trim()}
          className='mt-4 px-4 py-2 rounded bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] text-sm disabled:opacity-50'
        >
          {saving ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
          <h2 className='text-xl font-semibold'>Pipeline de melhorias</h2>
          <div className='flex gap-2'>
            <input
              className='border p-2 rounded text-sm'
              placeholder='Buscar por nome'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className='border p-2 rounded text-sm'
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value='all'>Todos</option>
              <option value='planned'>Planejado</option>
              <option value='partial'>Parcial</option>
              <option value='missing'>Faltando</option>
              <option value='applied'>Aplicado</option>
            </select>
          </div>
        </div>
        {loading ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Carregando melhorias...</p>
        ) : filteredItems.length === 0 ? (
          <p className='text-sm text-[var(--aethel-text-tertiary)]'>Nenhuma melhoria encontrada.</p>
        ) : (
          <div className='space-y-4'>
            {filteredItems.map((item) => (
              <div key={item.id} className='p-4 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg border'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-lg font-semibold'>{item.name}</h3>
                    <p className='text-sm text-[var(--aethel-text-tertiary)]'>{item.description || 'Sem descrição'}</p>
                  </div>
                  <span className='text-xs px-2 py-1 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'>
                    {statusLabels[item.status] ?? item.status}
                  </span>
                </div>
                <button
                  onClick={() => toggleApplied(item)}
                  className='mt-3 px-3 py-2 rounded bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] text-sm'
                >
                  {item.applied ? 'Reverter' : 'Aplicar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

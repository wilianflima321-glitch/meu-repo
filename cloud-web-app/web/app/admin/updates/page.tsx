'use client';

import { useCallback, useEffect, useState } from 'react';

type UpdateItem = {
  id: string;
  type: string;
  description: string | null;
  resource: string | null;
  status: 'approved' | 'review' | 'blocked';
  createdAt: string;
};

type UpdatesPayload = {
  items: UpdateItem[];
  summary: { total: number; approved: number; review: number; blocked: number };
};

export default function Updates() {
  const [data, setData] = useState<UpdatesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'approved' | 'review' | 'blocked'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    approved: 'Aprovada',
    review: 'Em revisão',
    blocked: 'Bloqueada',
  };

  const fetchUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/updates');
      if (!res.ok) throw new Error('Falha ao carregar atualizações');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atualizações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const filteredItems = (data?.items || []).filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesTerm = !term ||
      item.type.toLowerCase().includes(term) ||
      (item.description || '').toLowerCase().includes(term) ||
      (item.resource || '').toLowerCase().includes(term);
    const matchesStatus = status === 'all' || item.status === status;
    return matchesTerm && matchesStatus;
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Pesquisa de Atualizações</h1>
          <p className='text-sm text-zinc-500'>A IA monitora lançamentos e mudanças de versão detectadas por logs.</p>
          {lastUpdated && (
            <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className='flex gap-2'>
          <button
            onClick={fetchUpdates}
            className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'
          >
            Buscar atualizações
          </button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(data?.items || [], null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `updates-${new Date().toISOString()}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className='px-3 py-2 rounded bg-black text-white text-sm'
          >
            Exportar JSON
          </button>
        </div>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 text-rose-300 p-3 rounded mb-4'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Total</h3>
          <p className='text-2xl font-bold text-blue-600'>{data?.summary.total ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Aprovadas</h3>
          <p className='text-2xl font-bold text-green-600'>{data?.summary.approved ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Revisão</h3>
          <p className='text-2xl font-bold text-yellow-600'>{data?.summary.review ?? 0}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Bloqueadas</h3>
          <p className='text-2xl font-bold text-red-600'>{data?.summary.blocked ?? 0}</p>
        </div>
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow p-4'>
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4'>
          <h2 className='text-xl font-semibold'>Histórico de Atualizações</h2>
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='Buscar por tipo, descrição ou recurso'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border p-2 rounded text-sm'
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className='border p-2 rounded text-sm'
            >
              <option value='all'>Todos</option>
              <option value='approved'>Aprovadas</option>
              <option value='review'>Em revisão</option>
              <option value='blocked'>Bloqueadas</option>
            </select>
          </div>
        </div>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-zinc-800/70 text-sm'>
              <th className='p-2 text-left'>Tipo</th>
              <th className='p-2 text-left'>Descrição</th>
              <th className='p-2 text-left'>Recurso</th>
              <th className='p-2 text-left'>Status</th>
              <th className='p-2 text-left'>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Carregando atualizações...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Nenhuma atualização encontrada.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2'>{item.type}</td>
                  <td className='p-2'>{item.description || '—'}</td>
                  <td className='p-2'>{item.resource || '—'}</td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : item.status === 'review'
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'bg-rose-500/15 text-rose-300'
                    }`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className='p-2'>{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

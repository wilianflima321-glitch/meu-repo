'use client';

import { useCallback, useEffect, useState } from 'react';

export default function AdminMarketplace() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ok'>('idle');
  const [message, setMessage] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setMessage('Carregando itens do marketplace...');
    try {
      const res = await fetch('/api/admin/marketplace', { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && typeof data === 'object' && (data as any).message) ||
          (data && typeof data === 'object' && (data as any).error) ||
          `Falha ao carregar marketplace (HTTP ${res.status}).`;
        throw new Error(String(msg));
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
      setStatus('ok');
      setMessage('');
      setLastUpdated(new Date());
    } catch (err) {
      setItems([]);
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Falha ao carregar marketplace.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!cancelled) load();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const categories = Array.from(new Set(items.map((item) => item.category))).sort();
  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || String(item.title).toLowerCase().includes(term);
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const summary = {
    total: items.length,
    paid: items.filter((item) => item.price > 0).length,
    free: items.filter((item) => item.price === 0).length,
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Gerenciar marketplace</h1>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button
          onClick={load}
          className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
        >
          Atualizar
        </button>
      </div>

      <div className='bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Total</h3>
          <p className='text-2xl font-bold text-blue-600'>{summary.total}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Pagos</h3>
          <p className='text-2xl font-bold text-green-600'>{summary.paid}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Gratuitos</h3>
          <p className='text-2xl font-bold text-gray-600'>{summary.free}</p>
        </div>
      </div>

      {status === 'loading' ? (
        <div className='text-sm text-slate-600'>{message}</div>
      ) : status === 'error' ? (
        <div className='bg-white rounded-lg shadow p-4'>
          <div className='font-semibold'>Marketplace indisponível</div>
          <div className='mt-1 text-sm text-slate-600'>{message}</div>
        </div>
      ) : items.length === 0 ? (
        <div className='bg-white rounded-lg shadow p-4'>
          <div className='font-semibold'>Nenhuma extensão</div>
          <div className='mt-1 text-sm text-slate-600'>Ainda não há extensões registradas.</div>
        </div>
      ) : (
        <>
          <div className='bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
            <input
              type='text'
              placeholder='Buscar por título'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border p-2 rounded w-full md:max-w-sm'
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className='border p-2 rounded text-sm'
            >
              <option value='all'>Todas as categorias</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <table className='w-full bg-white rounded-lg shadow'>
            <thead>
              <tr className='bg-gray-100 text-sm'>
                <th className='p-3'>Item</th>
                <th className='p-3'>Categoria</th>
                <th className='p-3'>Preço</th>
                <th className='p-3'>Downloads</th>
                <th className='p-3'>Avaliação</th>
                <th className='p-3'>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={String(item.id)} className='border-t'>
                  <td className='p-3'>{String(item.title ?? '')}</td>
                  <td className='p-3'>{String(item.category ?? '')}</td>
                  <td className='p-3'>{item.price > 0 ? `$${item.price.toFixed(2)}` : 'Grátis'}</td>
                  <td className='p-3'>{String(item.downloads ?? 0)}</td>
                  <td className='p-3'>{Number(item.rating || 0).toFixed(1)}</td>
                  <td className='p-3'>{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

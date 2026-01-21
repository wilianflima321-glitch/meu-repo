'use client';

import { useCallback, useEffect, useState } from 'react';

type PaymentItem = {
  id: string;
  userEmail: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type Totals = {
  total: number;
  succeeded: number;
  pending: number;
  failed: number;
};

export default function Payments() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, succeeded: 0, pending: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'succeeded' | 'pending' | 'failed'>('all');
  const [search, setSearch] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const statusLabels: Record<string, string> = {
    succeeded: 'Aprovado',
    pending: 'Pendente',
    failed: 'Falhou',
  };

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar pagamentos');
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotals(data?.totals ?? { total: 0, succeeded: 0, pending: 0, failed: 0 });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || (item.userEmail || '').toLowerCase().includes(term) || item.id.includes(term);
  });

  const handleExport = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      statusFilter,
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Pagamentos e Faturamento</h1>
          <p className='text-gray-600'>Últimas transações registradas no sistema.</p>
          {lastUpdated && (
            <p className='text-xs text-gray-500'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleExport}
            className='px-3 py-2 rounded bg-blue-600 text-white text-sm'
          >
            Exportar
          </button>
          <button
            onClick={fetchPayments}
            className='px-3 py-2 rounded bg-gray-100 text-gray-700 text-sm'
          >
            Atualizar
          </button>
        </div>
      </div>

      <div className='bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Total</h3>
          <p className='text-2xl font-bold text-blue-600'>US${totals.total.toFixed(2)}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Aprovados</h3>
          <p className='text-2xl font-bold text-green-600'>US${totals.succeeded.toFixed(2)}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Pendentes</h3>
          <p className='text-2xl font-bold text-yellow-600'>US${totals.pending.toFixed(2)}</p>
        </div>
        <div className='text-center'>
          <h3 className='text-sm font-semibold'>Falhas</h3>
          <p className='text-2xl font-bold text-red-600'>US${totals.failed.toFixed(2)}</p>
        </div>
      </div>

      <div className='bg-white p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar por e-mail ou ID'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border p-2 rounded w-full md:max-w-sm'
        />
        <div className='flex items-center gap-2'>
          {(['all', 'succeeded', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status === 'all' ? 'Todos' : (statusLabels[status] ?? status)}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-white rounded-lg shadow overflow-hidden'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-gray-100 text-sm'>
              <th className='p-2'>ID</th>
              <th className='p-2'>Usuário</th>
              <th className='p-2'>Valor</th>
              <th className='p-2'>Status</th>
              <th className='p-2'>Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-gray-500' colSpan={5}>Carregando pagamentos...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className='p-2 text-sm text-red-500' colSpan={5}>{error}</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-gray-500' colSpan={5}>Nenhum pagamento encontrado.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2 text-xs text-gray-500'>{item.id.slice(-6)}</td>
                  <td className='p-2'>
                    <div className='flex items-center gap-2'>
                      <span>{item.userEmail || '—'}</span>
                      {item.userEmail && (
                        <button
                          onClick={() => navigator.clipboard.writeText(item.userEmail || '')}
                          className='text-xs text-gray-500 hover:text-gray-800'
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                  </td>
                  <td className='p-2'>
                    {item.currency.toUpperCase()} {item.amount.toFixed(2)}
                  </td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'succeeded'
                        ? 'bg-green-100 text-green-700'
                        : item.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {statusLabels[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className='p-2'>{new Date(item.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

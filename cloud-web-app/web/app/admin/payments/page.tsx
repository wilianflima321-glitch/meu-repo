'use client';

import { useCallback, useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

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

type GatewayConfig = {
  activeGateway: 'stripe' | 'disabled';
  checkoutEnabled: boolean;
  allowLocalIdeRedirect: boolean;
  checkoutOrigin: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

const DEFAULT_GATEWAY: GatewayConfig = {
  activeGateway: 'stripe',
  checkoutEnabled: true,
  allowLocalIdeRedirect: true,
  checkoutOrigin: null,
  updatedBy: null,
  updatedAt: null,
};

export default function Payments() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ total: 0, succeeded: 0, pending: 0, failed: 0 });
  const [gateway, setGateway] = useState<GatewayConfig>(DEFAULT_GATEWAY);
  const [savingGateway, setSavingGateway] = useState(false);
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

  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchGateway = useCallback(async () => {
    const res = await fetch('/api/admin/payments/gateway', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao carregar configuração de gateway');
    const data = await res.json();
    setGateway(data?.config || DEFAULT_GATEWAY);
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
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
    fetchGateway().catch((err) => {
      setError(err instanceof Error ? err.message : 'Falha ao carregar gateway');
    });
  }, [fetchGateway, fetchPayments]);

  const saveGateway = useCallback(async () => {
    try {
      setSavingGateway(true);
      const res = await fetch('/api/admin/payments/gateway', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(gateway),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || 'Falha ao salvar gateway');
      }
      setGateway(payload?.config || gateway);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar gateway');
    } finally {
      setSavingGateway(false);
    }
  }, [gateway]);

  const filteredItems = items.filter((item) => {
    const term = search.trim().toLowerCase();
    return !term || (item.userEmail || '').toLowerCase().includes(term) || item.id.includes(term);
  });

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Pagamentos e Checkout</h1>
          <p className='text-zinc-400'>Gateway controlado por admin e transações reais registradas.</p>
          {lastUpdated && <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <button onClick={fetchPayments} className='px-3 py-2 rounded bg-zinc-800/70 text-zinc-300 text-sm'>
          Atualizar
        </button>
      </div>

      {error && (
        <div className='mb-4 rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'>
          {error}
        </div>
      )}

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6'>
        <h2 className='text-lg font-semibold mb-4'>Gateway de pagamento (admin)</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <label className='text-sm'>
            <span className='block mb-1 text-zinc-400'>Gateway ativo</span>
            <select
              value={gateway.activeGateway}
              onChange={(e) => setGateway((prev) => ({ ...prev, activeGateway: e.target.value as 'stripe' | 'disabled' }))}
              className='border border-zinc-700 bg-zinc-950/60 p-2 rounded w-full'
            >
              <option value='stripe'>Stripe</option>
              <option value='disabled'>Desabilitado</option>
            </select>
          </label>

          <label className='text-sm'>
            <span className='block mb-1 text-zinc-400'>Origem web do checkout</span>
            <input
              value={gateway.checkoutOrigin || ''}
              onChange={(e) => setGateway((prev) => ({ ...prev, checkoutOrigin: e.target.value.trim() || null }))}
              placeholder='https://seu-dominio.com'
              className='border border-zinc-700 bg-zinc-950/60 p-2 rounded w-full'
            />
          </label>
        </div>

        <div className='flex flex-wrap items-center gap-4 mt-4'>
          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={gateway.checkoutEnabled}
              onChange={(e) => setGateway((prev) => ({ ...prev, checkoutEnabled: e.target.checked }))}
            />
            Checkout habilitado
          </label>

          <label className='inline-flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              checked={gateway.allowLocalIdeRedirect}
              onChange={(e) => setGateway((prev) => ({ ...prev, allowLocalIdeRedirect: e.target.checked }))}
            />
            Permitir redirecionamento da IDE local para web
          </label>

          <button
            onClick={saveGateway}
            disabled={savingGateway}
            className='px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-60'
          >
            {savingGateway ? 'Salvando...' : 'Salvar configuração'}
          </button>
        </div>

        <div className='mt-4 rounded border border-zinc-800/70 bg-zinc-950/50 p-3 text-xs text-zinc-400'>
          Estado operacional: gateway <span className='text-zinc-200'>{gateway.activeGateway}</span>, checkout{' '}
          <span className='text-zinc-200'>{gateway.checkoutEnabled ? 'habilitado' : 'desabilitado'}</span>, redirecionamento da IDE local{' '}
          <span className='text-zinc-200'>{gateway.allowLocalIdeRedirect ? 'habilitado' : 'desabilitado'}</span>.
        </div>
      </div>

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4'>
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

      <div className='bg-zinc-900/70 p-4 rounded-lg shadow mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'>
        <input
          type='text'
          placeholder='Buscar por e-mail ou ID'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='border border-zinc-700 bg-zinc-950/60 p-2 rounded w-full md:max-w-sm text-zinc-100 placeholder:text-zinc-500'
        />
        <div className='flex items-center gap-2'>
          {(['all', 'succeeded', 'pending', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-400'
              }`}
            >
              {status === 'all' ? 'Todos' : statusLabels[status] ?? status}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-zinc-900/70 rounded-lg shadow overflow-hidden'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-zinc-800/70 text-sm'>
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
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Carregando pagamentos...</td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-zinc-500' colSpan={5}>Nenhum pagamento encontrado.</td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className='border-t'>
                  <td className='p-2 text-xs text-zinc-500'>{item.id.slice(-6)}</td>
                  <td className='p-2'>{item.userEmail || '—'}</td>
                  <td className='p-2'>{item.currency.toUpperCase()} {item.amount.toFixed(2)}</td>
                  <td className='p-2'>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.status === 'succeeded'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : item.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
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

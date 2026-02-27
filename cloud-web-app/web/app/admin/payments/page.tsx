'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminBadge,
  AdminFilterPill,
  AdminPageShell,
  AdminPrimaryButton,
  AdminSearchInput,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

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

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
}

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

  const fetchGateway = useCallback(async () => {
    const data = await adminJsonFetch<{ config?: GatewayConfig }>('/api/admin/payments/gateway');
    setGateway(data?.config || DEFAULT_GATEWAY);
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('status', statusFilter);
      const data = await adminJsonFetch<{ items?: PaymentItem[]; totals?: Totals }>(`/api/admin/payments?${params.toString()}`);
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
      const payload = await adminJsonFetch<{ config?: GatewayConfig }>('/api/admin/payments/gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gateway),
      });
      setGateway(payload?.config || gateway);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar gateway');
    } finally {
      setSavingGateway(false);
    }
  }, [gateway]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const term = search.trim().toLowerCase();
        return !term || (item.userEmail || '').toLowerCase().includes(term) || item.id.includes(term);
      }),
    [items, search],
  );

  const gatewayOperationalNote =
    gateway.activeGateway === 'disabled'
      ? 'Gateway desabilitado por administracao. Checkout web retorna status explicito sem sucesso falso.'
      : gateway.checkoutEnabled
        ? 'Gateway ativo com checkout habilitado.'
        : 'Gateway ativo com checkout bloqueado por politica operacional.';
  const originNote = gateway.checkoutOrigin
    ? `Checkout origin configurado: ${gateway.checkoutOrigin}`
    : 'Checkout origin nao definido. O sistema usara o dominio principal configurado em ambiente.';

  return (
    <AdminPageShell
      title='Pagamentos e Checkout'
      description='Gateway controlado por admin e transacoes reais registradas.'
      subtitle={lastUpdated ? `Atualizado em ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchPayments}>Atualizar</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <AdminSection title='Gateway de pagamento (admin)' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Gateway ativo</span>
            <select
              value={gateway.activeGateway}
              onChange={(e) => setGateway((prev) => ({ ...prev, activeGateway: e.target.value as 'stripe' | 'disabled' }))}
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              <option value='stripe'>Stripe</option>
              <option value='disabled'>Desabilitado</option>
            </select>
          </label>

          <label className='text-sm'>
            <span className='mb-1 block text-zinc-400'>Origem web do checkout</span>
            <AdminSearchInput
              value={gateway.checkoutOrigin || ''}
              onChange={(e) => setGateway((prev) => ({ ...prev, checkoutOrigin: e.target.value.trim() || null }))}
              placeholder='https://seu-dominio.com'
              className='max-w-none'
            />
          </label>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-4'>
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

          <AdminPrimaryButton onClick={saveGateway} disabled={savingGateway} className='bg-blue-600 text-white hover:bg-blue-500'>
            {savingGateway ? 'Salvando...' : 'Salvar configuracao'}
          </AdminPrimaryButton>
        </div>

        <div className='mt-4'>
          <AdminStatusBanner tone={gateway.activeGateway === 'disabled' ? 'warning' : 'info'}>
            {gatewayOperationalNote}
          </AdminStatusBanner>
          <div className='mt-2'>
            <AdminStatusBanner tone={gateway.checkoutOrigin ? 'neutral' : 'warning'}>
              {originNote}
            </AdminStatusBanner>
          </div>
        </div>
      </AdminSection>

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total' value={formatCurrency(totals.total)} tone='sky' />
          <AdminStatCard label='Aprovados' value={formatCurrency(totals.succeeded)} tone='emerald' />
          <AdminStatCard label='Pendentes' value={formatCurrency(totals.pending)} tone='amber' />
          <AdminStatCard label='Falhas' value={formatCurrency(totals.failed)} tone='rose' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <AdminSearchInput
            type='text'
            placeholder='Buscar por e-mail ou ID'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className='flex items-center gap-2'>
            {(['all', 'succeeded', 'pending', 'failed'] as const).map((status) => (
              <AdminFilterPill
                key={status}
                onClick={() => setStatusFilter(status)}
                active={statusFilter === status}
              >
                {status === 'all' ? 'Todos' : statusLabels[status] ?? status}
              </AdminFilterPill>
            ))}
          </div>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto'>
            <thead>
              <tr className='bg-zinc-800/70 text-sm'>
                <th className='p-3 text-left'>ID</th>
                <th className='p-3 text-left'>Usuario</th>
                <th className='p-3 text-left'>Valor</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Carregando pagamentos...' />
              ) : filteredItems.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='Nenhum pagamento encontrado.' />
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-xs text-zinc-500'>{item.id.slice(-6)}</td>
                    <td className='p-3'>{item.userEmail || '-'}</td>
                    <td className='p-3'>{formatCurrency(item.amount, item.currency)}</td>
                    <td className='p-3'>
                      <AdminBadge
                        tone={
                          item.status === 'succeeded'
                            ? 'emerald'
                            : item.status === 'pending'
                              ? 'amber'
                              : 'rose'
                        }
                      >
                        {statusLabels[item.status] ?? item.status}
                      </AdminBadge>
                    </td>
                    <td className='p-3'>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}


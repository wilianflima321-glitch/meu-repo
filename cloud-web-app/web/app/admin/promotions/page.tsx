'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgePercent, CheckCircle, XCircle } from 'lucide-react';
import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

type Promotion = {
  id: string;
  name: string;
  code: string | null;
  discount: number | null;
  type: 'percentage' | 'fixed' | 'other';
  active: boolean;
  timesRedeemed: number | null;
  expiresAt: string | null;
};

function formatDiscount(promo: Promotion) {
  if (promo.discount == null) return 'N/D';
  if (promo.type === 'percentage') return `${promo.discount}%`;
  if (promo.type === 'fixed') return `US$${promo.discount.toFixed(2)}`;
  return `${promo.discount}`;
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newPromo, setNewPromo] = useState({
    name: '',
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    discount: '',
    maxRedemptions: '',
    expiresAt: '',
    currency: 'usd',
  });

  const fetchPromotions = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/promotions');
      if (!res.ok) {
        throw new Error('Falha ao carregar promoções');
      }
      const data = await res.json();
      setPromotions(Array.isArray(data?.promotions) ? data.promotions : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleCreate = async () => {
    if (creating) return;
    setFormError(null);
    setCreating(true);

    try {
      const payload = {
        name: newPromo.name.trim(),
        code: newPromo.code.trim(),
        type: newPromo.type,
        discount: Number(newPromo.discount),
        maxRedemptions: newPromo.maxRedemptions ? Number(newPromo.maxRedemptions) : undefined,
        expiresAt: newPromo.expiresAt || undefined,
        currency: newPromo.currency,
      };

      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao criar promoção');
      }

      setNewPromo({
        name: '',
        code: '',
        type: 'percentage',
        discount: '',
        maxRedemptions: '',
        expiresAt: '',
        currency: 'usd',
      });
      await fetchPromotions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promo.id, active: !promo.active }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Falha ao atualizar promoção');
      }

      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    }
  };

  const filteredPromotions = promotions.filter((promo) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      promo.name.toLowerCase().includes(term) ||
      (promo.code || '').toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' ? promo.active : !promo.active);
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: promotions.length,
    active: promotions.filter((promo) => promo.active).length,
    inactive: promotions.filter((promo) => !promo.active).length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Promoções e cupons</h1>
          <p className="text-sm text-[var(--aethel-text-secondary)]">
            Gestão completa via Stripe diretamente no painel admin.
          </p>
          {lastUpdated && (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button type="button"
          onClick={fetchPromotions}
          className="px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm"
        >
          Atualizar
        </button>
      </div>

            <AdminSummaryGrid
        className="mb-6"
        columns={3}
        items={[
          { icon: BadgePercent, label: 'Total', value: summary.total },
          { icon: CheckCircle, label: 'Ativas', value: summary.active, tone: 'success' },
          { icon: XCircle, label: 'Inativas', value: summary.inactive, tone: 'warning' },
        ]}
      />

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Nome"
            value={newPromo.name}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, name: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Código (ex: BF2026)"
            value={newPromo.code}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, code: e.target.value }))}
            className="border p-2 rounded"
          />
          <select
            value={newPromo.type}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, type: e.target.value as 'percentage' | 'fixed' }))}
            className="border p-2 rounded"
          >
            <option value="percentage">Percentual (%)</option>
            <option value="fixed">Valor fixo (US$)</option>
          </select>
          <input
            type="number"
            placeholder="Desconto"
            value={newPromo.discount}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, discount: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Máx. resgates (opcional)"
            value={newPromo.maxRedemptions}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, maxRedemptions: e.target.value }))}
            className="border p-2 rounded"
          />
          <input
            type="date"
            placeholder="Expiração"
            value={newPromo.expiresAt}
            onChange={(e) => setNewPromo((prev) => ({ ...prev, expiresAt: e.target.value }))}
            className="border p-2 rounded"
          />
          {newPromo.type === 'fixed' && (
            <input
              type="text"
              placeholder="Moeda (ex: USD)"
              value={newPromo.currency}
              onChange={(e) => setNewPromo((prev) => ({ ...prev, currency: e.target.value }))}
              className="border p-2 rounded"
            />
          )}
        </div>
        {formError && <p className="text-sm text-[var(--aethel-error)] mt-2">{formError}</p>}
        <button type="button"
          onClick={handleCreate}
          disabled={creating}
          className="mt-4 bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)] px-4 py-2 rounded disabled:opacity-60"
        >
          {creating ? 'Criando...' : 'Criar promoção'}
        </button>
      </div>

      <div className="bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Promoções</h2>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            type="text"
            placeholder="Buscar por nome ou código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border p-2 rounded w-full md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button type="button"
                aria-label="Set status filter"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-xs font-semibold ${
 statusFilter === status
 ? 'bg-[var(--aethel-primary-dark)] text-[var(--aethel-text-primary)]'
 : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
 }`}
              >
                {status === 'all' ? 'Todas' : status === 'active' ? 'Ativas' : 'Inativas'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--aethel-error)]">{error}</p>
        ) : filteredPromotions.length === 0 ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhuma promoção encontrada no Stripe.</p>
        ) : (
          <ul>
            {filteredPromotions.map((promo) => (
              <li key={promo.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b">
                <div>
                  <h3 className="font-semibold">{promo.name}</h3>
                  <p className="text-sm text-[var(--aethel-text-secondary)]">
                    Código: {promo.code || 'N/D'} | Desconto: {formatDiscount(promo)}
                  </p>
                  <p className="text-xs text-[var(--aethel-text-tertiary)]">
                    Resgates: {promo.timesRedeemed || 0} | Expira em:{' '}
                    {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'Sem expiração'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
 promo.active ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]' : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
 }`}
                  >
                    {promo.active ? 'Ativa' : 'Inativa'}
                  </span>
                  <button type="button"
                    onClick={() => handleToggle(promo)}
                    className="px-3 py-1 rounded text-xs bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)]"
                  >
                    {promo.active ? 'Desativar' : 'Ativar'}
                  </button>
                  {promo.code && (
                    <button type="button"
                      onClick={() => navigator.clipboard.writeText(promo.code || '')}
                      className="px-3 py-1 rounded text-xs bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]"
                    >
                      Copiar código
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

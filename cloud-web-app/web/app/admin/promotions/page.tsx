'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

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

type PromotionsPayload = {
  promotions?: Promotion[];
};

function formatDiscount(promo: Promotion) {
  if (promo.discount == null) return 'N/A';
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
      setLoading(true);
      const data = await adminJsonFetch<PromotionsPayload>('/api/admin/promotions');
      setPromotions(Array.isArray(data?.promotions) ? data.promotions : []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleCreate = useCallback(async () => {
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

      await adminJsonFetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
      setFormError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setCreating(false);
    }
  }, [creating, fetchPromotions, newPromo]);

  const handleToggle = useCallback(
    async (promo: Promotion) => {
      try {
        await adminJsonFetch('/api/admin/promotions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: promo.id, active: !promo.active }),
        });
        await fetchPromotions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      }
    },
    [fetchPromotions],
  );

  const filteredPromotions = useMemo(() => {
    return promotions.filter((promo) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term || promo.name.toLowerCase().includes(term) || (promo.code || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? promo.active : !promo.active);
      return matchesSearch && matchesStatus;
    });
  }, [promotions, search, statusFilter]);

  const summary = {
    total: promotions.length,
    active: promotions.filter((promo) => promo.active).length,
    inactive: promotions.filter((promo) => !promo.active).length,
  };

  return (
    <AdminPageShell
      title='Promotions and coupons'
      description='Stripe-backed promotion lifecycle management in admin operations.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchPromotions}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total' value={summary.total} tone='sky' />
          <AdminStatCard label='Active' value={summary.active} tone='emerald' />
          <AdminStatCard label='Inactive' value={summary.inactive} tone='neutral' />
          <AdminStatCard label='Filtered' value={filteredPromotions.length} tone='amber' />
        </AdminStatGrid>
      </div>

      <AdminSection title='Create promotion' className='mb-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <input
            type='text'
            placeholder='Name'
            value={newPromo.name}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, name: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500'
          />
          <input
            type='text'
            placeholder='Code (e.g. BF2026)'
            value={newPromo.code}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, code: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500'
          />
          <select
            value={newPromo.type}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, type: event.target.value as 'percentage' | 'fixed' }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100'
          >
            <option value='percentage'>Percentage (%)</option>
            <option value='fixed'>Fixed value (US$)</option>
          </select>
          <input
            type='number'
            placeholder='Discount'
            value={newPromo.discount}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, discount: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500'
          />
          <input
            type='number'
            placeholder='Max redemptions (optional)'
            value={newPromo.maxRedemptions}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, maxRedemptions: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500'
          />
          <input
            type='date'
            value={newPromo.expiresAt}
            onChange={(event) => setNewPromo((prev) => ({ ...prev, expiresAt: event.target.value }))}
            className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100'
          />
          {newPromo.type === 'fixed' ? (
            <input
              type='text'
              placeholder='Currency (USD)'
              value={newPromo.currency}
              onChange={(event) => setNewPromo((prev) => ({ ...prev, currency: event.target.value }))}
              className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500'
            />
          ) : null}
        </div>

        {formError ? <p className='mt-2 text-sm text-rose-300'>{formError}</p> : null}

        <AdminPrimaryButton
          onClick={handleCreate}
          disabled={creating}
          className='mt-4 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60'
        >
          {creating ? 'Creating...' : 'Create promotion'}
        </AdminPrimaryButton>
      </AdminSection>

      <AdminSection title='Promotions'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by name or code'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-zinc-100 placeholder:text-zinc-500 md:max-w-sm'
          />
          <div className='flex items-center gap-2'>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  statusFilter === status ? 'bg-blue-600 text-white' : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700/80'
                }`}
              >
                {status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-2 text-left'>Name</th>
                <th className='p-2 text-left'>Code</th>
                <th className='p-2 text-left'>Discount</th>
                <th className='p-2 text-left'>Redeemed</th>
                <th className='p-2 text-left'>Expires</th>
                <th className='p-2 text-left'>Status</th>
                <th className='p-2 text-left'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={7} message='Loading promotions...' />
              ) : filteredPromotions.length === 0 ? (
                <AdminTableStateRow colSpan={7} message='No promotions found.' />
              ) : (
                filteredPromotions.map((promo) => (
                  <tr key={promo.id} className='border-t border-zinc-800/70'>
                    <td className='p-2 text-zinc-100'>{promo.name}</td>
                    <td className='p-2 text-zinc-300'>{promo.code || 'N/A'}</td>
                    <td className='p-2'>{formatDiscount(promo)}</td>
                    <td className='p-2'>{promo.timesRedeemed ?? 0}</td>
                    <td className='p-2 text-zinc-500'>
                      {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : 'No expiration'}
                    </td>
                    <td className='p-2'>
                      <span className={`rounded px-2 py-1 text-xs ${promo.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800/70 text-zinc-300'}`}>
                        {promo.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='p-2'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => handleToggle(promo)}
                          className='rounded bg-amber-500/15 px-3 py-1 text-xs text-amber-200 hover:bg-amber-500/25'
                          type='button'
                        >
                          {promo.active ? 'Disable' : 'Enable'}
                        </button>
                        {promo.code ? (
                          <button
                            onClick={() => navigator.clipboard.writeText(promo.code || '')}
                            className='rounded bg-zinc-800/70 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700/80'
                            type='button'
                          >
                            Copy code
                          </button>
                        ) : null}
                      </div>
                    </td>
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

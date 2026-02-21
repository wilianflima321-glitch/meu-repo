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

type PlanSummary = {
  id: string;
  name: string;
  priceUSD: number;
  users: number;
  mrr: number;
  isTrial: boolean;
};

type SubscriptionPayload = {
  plans?: PlanSummary[];
  totals?: {
    users?: number;
    mrr?: number;
  };
};

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showTrials, setShowTrials] = useState(false);
  const [search, setSearch] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<SubscriptionPayload>('/api/admin/subscriptions');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (!showTrials && plan.isTrial) {
        return false;
      }
      const term = search.trim().toLowerCase();
      return !term || plan.name.toLowerCase().includes(term) || plan.id.toLowerCase().includes(term);
    });
  }, [plans, showTrials, search]);

  const summary = useMemo(
    () => ({
      totalUsers: plans.reduce((sum, plan) => sum + plan.users, 0),
      totalMRR: plans.reduce((sum, plan) => sum + plan.mrr, 0),
      trialUsers: plans.filter((plan) => plan.isTrial).reduce((sum, plan) => sum + plan.users, 0),
    }),
    [plans],
  );

  return (
    <AdminPageShell
      title='Subscriptions'
      description='Review active plans, trial distribution, and recurring revenue by tier.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchPlans}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Total users' value={summary.totalUsers} tone='sky' />
          <AdminStatCard label='Total MRR (USD)' value={`$${summary.totalMRR.toFixed(2)}`} tone='emerald' />
          <AdminStatCard label='Trial users' value={summary.trialUsers} tone='amber' />
          <AdminStatCard label='Visible plans' value={filteredPlans.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='mb-4'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <input
            type='text'
            placeholder='Search by plan name or id'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 md:max-w-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
          />
          <label className='flex items-center gap-2 text-sm text-zinc-300'>
            <input
              type='checkbox'
              checked={showTrials}
              onChange={(event) => setShowTrials(event.target.checked)}
              className='h-4 w-4 rounded border-zinc-700 bg-zinc-950/60 text-blue-500 focus:ring-sky-400'
            />
            Include trial plans
          </label>
        </div>
      </AdminSection>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Plan</th>
                <th className='p-3 text-left'>Price (USD)</th>
                <th className='p-3 text-left'>Users</th>
                <th className='p-3 text-left'>MRR</th>
                <th className='p-3 text-left'>Type</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={5} message='Loading plans...' />
              ) : filteredPlans.length === 0 ? (
                <AdminTableStateRow colSpan={5} message='No plans found for current filters.' />
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 font-medium text-zinc-100'>{plan.name}</td>
                    <td className='p-3'>${plan.priceUSD.toFixed(2)}</td>
                    <td className='p-3'>{plan.users}</td>
                    <td className='p-3'>${plan.mrr.toFixed(2)}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          plan.isTrial ? 'bg-amber-500/15 text-amber-200' : 'bg-emerald-500/15 text-emerald-200'
                        }`}
                      >
                        {plan.isTrial ? 'Trial' : 'Paid'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className='mt-6'>
        <AdminStatusBanner tone='warning'>
          Plan pricing and identifiers are sourced from backend billing configuration. This page is read-only.
        </AdminStatusBanner>
      </div>
    </AdminPageShell>
  );
}

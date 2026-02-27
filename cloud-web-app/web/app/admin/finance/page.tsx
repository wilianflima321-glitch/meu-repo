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

type FinanceAlert = {
  type: 'warning' | 'critical';
  message: string;
  metric: string;
};

type FinanceModelCost = {
  model: string;
  cost: number;
  calls: number;
  percentage: number;
};

type RevenueByPlan = {
  plan: string;
  users: number;
  revenue: number;
  percentage: number;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  userId: string;
  userEmail: string;
  description: string;
  createdAt: string;
};

type FinanceMetrics = {
  mrr: number;
  arr: number;
  profitMargin: number;
  runway: number;
  dailyRevenue: number;
  dailyAICost: number;
  dailyInfraCost: number;
  dailyProfit: number;
  activeSubscriptions: number;
  churnRate: number;
  aiCostBreakdown: FinanceModelCost[];
  revenueByPlan: RevenueByPlan[];
  recentTransactions: Transaction[];
  alerts: FinanceAlert[];
};

const defaults: FinanceMetrics = {
  mrr: 0,
  arr: 0,
  profitMargin: 0,
  runway: 0,
  dailyRevenue: 0,
  dailyAICost: 0,
  dailyInfraCost: 0,
  dailyProfit: 0,
  activeSubscriptions: 0,
  churnRate: 0,
  aiCostBreakdown: [],
  revenueByPlan: [],
  recentTransactions: [],
  alerts: [],
};

export default function FinancePage() {
  const [metrics, setMetrics] = useState<FinanceMetrics>(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await adminJsonFetch<Partial<FinanceMetrics>>('/api/admin/finance/metrics');
      setMetrics({
        ...defaults,
        ...payload,
        aiCostBreakdown: Array.isArray(payload?.aiCostBreakdown) ? payload.aiCostBreakdown : [],
        revenueByPlan: Array.isArray(payload?.revenueByPlan) ? payload.revenueByPlan : [],
        recentTransactions: Array.isArray(payload?.recentTransactions) ? payload.recentTransactions : [],
        alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const marginTone = useMemo(
    () => (metrics.profitMargin < 0 ? 'rose' : metrics.profitMargin < 20 ? 'amber' : 'emerald'),
    [metrics.profitMargin],
  );

  return (
    <AdminPageShell
      title='Finance Operations'
      description='Track recurring revenue, AI cost pressure, and margin sustainability from live admin metrics.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchMetrics}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='MRR' value={`$${metrics.mrr.toFixed(2)}`} tone='sky' />
          <AdminStatCard label='ARR' value={`$${metrics.arr.toFixed(2)}`} tone='neutral' />
          <AdminStatCard
            label='Profit Margin'
            value={`${metrics.profitMargin.toFixed(1)}%`}
            tone={marginTone as 'neutral' | 'sky' | 'emerald' | 'amber' | 'rose'}
          />
          <AdminStatCard label='Runway (months)' value={metrics.runway.toFixed(1)} tone='amber' />
        </AdminStatGrid>
      </div>

      {metrics.alerts.length > 0 ? (
        <div className='mb-4 space-y-2'>
          {metrics.alerts.map((alert, index) => (
            <AdminStatusBanner key={`${alert.metric}-${index}`} tone={alert.type === 'critical' ? 'danger' : 'warning'}>
              {alert.metric}: {alert.message}
            </AdminStatusBanner>
          ))}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Daily Economics'>
          <div className='space-y-2 text-sm text-zinc-300'>
            <p>Revenue: ${metrics.dailyRevenue.toFixed(2)}</p>
            <p>AI Cost: ${metrics.dailyAICost.toFixed(2)}</p>
            <p>Infrastructure Cost: ${metrics.dailyInfraCost.toFixed(2)}</p>
            <p className='font-semibold text-zinc-100'>Daily Profit: ${metrics.dailyProfit.toFixed(2)}</p>
            <p>Active Subscriptions: {metrics.activeSubscriptions}</p>
            <p>Churn Rate: {metrics.churnRate.toFixed(2)}%</p>
          </div>
        </AdminSection>

        <AdminSection title='AI Cost Breakdown' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Model</th>
                  <th className='p-3 text-left'>Calls</th>
                  <th className='p-3 text-left'>Cost</th>
                  <th className='p-3 text-left'>Share</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading model breakdown...' />
                ) : metrics.aiCostBreakdown.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No AI cost breakdown available.' />
                ) : (
                  metrics.aiCostBreakdown.map((item) => (
                    <tr key={item.model} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{item.model}</td>
                      <td className='p-3'>{item.calls}</td>
                      <td className='p-3'>${item.cost.toFixed(2)}</td>
                      <td className='p-3'>{item.percentage.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Revenue by Plan' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Plan</th>
                  <th className='p-3 text-left'>Users</th>
                  <th className='p-3 text-left'>Revenue</th>
                  <th className='p-3 text-left'>Share</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading plan revenue...' />
                ) : metrics.revenueByPlan.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No plan revenue data available.' />
                ) : (
                  metrics.revenueByPlan.map((row) => (
                    <tr key={row.plan} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{row.plan}</td>
                      <td className='p-3'>{row.users}</td>
                      <td className='p-3'>${row.revenue.toFixed(2)}</td>
                      <td className='p-3'>{row.percentage.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title='Recent Transactions' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Type</th>
                  <th className='p-3 text-left'>User</th>
                  <th className='p-3 text-left'>Amount</th>
                  <th className='p-3 text-left'>Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading transactions...' />
                ) : metrics.recentTransactions.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No recent transactions.' />
                ) : (
                  metrics.recentTransactions.map((tx) => (
                    <tr key={tx.id} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{tx.type}</td>
                      <td className='p-3'>{tx.userEmail}</td>
                      <td className='p-3'>${tx.amount.toFixed(2)}</td>
                      <td className='p-3 text-zinc-500'>{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}

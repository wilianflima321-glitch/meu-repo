'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid';

type Policy = {
  id: string;
  name: string;
  status: 'active' | 'review' | 'inactive';
  lastAuditAt: string | null;
  incidents: number;
};

export default function Compliance() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/compliance');
      if (!res.ok) throw new Error('Failed to load conformidade');
      const data = await res.json();
      setPolicies(Array.isArray(data?.policies) ? data.policies : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading conformidade');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const summary = {
    total: policies.length,
    incidents: policies.reduce((sum, policy) => sum + policy.incidents, 0),
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-3xl font-bold'>Compliance e Privacidade</h1>
          <p className='text-[var(--aethel-text-secondary)]'>Policys legais e audits de conformidade.</p>
          {lastUpdated && (
            <p className='text-xs text-[var(--aethel-text-tertiary)]'>Atualizado em {lastUpdated.toLocaleString()}</p>
          )}
        </div>
        <button type="button"
          onClick={fetchPolicies}
          className='px-3 py-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)] text-sm'
        >
          Atualizar
        </button>
      </div>

      <AdminSummaryGrid
        className='mb-6'
        columns={2}
        items={[
          {
            icon: ShieldCheck,
            label: 'Pol?ticas monitoradas',
            value: summary.total,
          },
          {
            icon: AlertTriangle,
            label: 'Incidentes cr?ticos',
            value: summary.incidents,
            tone: 'error',
          },
        ]}
      />

      <div className='bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] rounded-lg shadow overflow-hidden'>
        <table className='w-full table-auto'>
          <thead>
            <tr className='bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm'>
              <th className='p-2 text-left'>Policy</th>
              <th className='p-2 text-left'>Status</th>
              <th className='p-2 text-left'>Last audit</th>
              <th className='p-2 text-left'>Incidentes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={4}>Loading policies...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-error)]' colSpan={4}>{error}</td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td className='p-2 text-sm text-[var(--aethel-text-tertiary)]' colSpan={4}>No policy configured.</td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id} className='border-t'>
                  <td className='p-2'>{policy.name}</td>
                  <td className='p-2'>
                    <span className={`px-2 py-1 rounded text-xs ${
                      policy.status === 'active'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
                        : policy.status === 'review'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                        : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                    }`}>
                      {policy.status === 'active'
                        ? 'Ativa'
                        : policy.status === 'review'
                        ? 'Review'
                        : 'Inativa'}
                    </span>
                  </td>
                  <td className='p-2'>
                    {policy.lastAuditAt ? new Date(policy.lastAuditAt).toLocaleString() : '—'}
                  </td>
                  <td className='p-2'>{policy.incidents}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className='mt-6 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] border border-[var(--aethel-border-secondary)] rounded-lg p-4 text-sm text-[var(--aethel-text-secondary)]'>
        Limitation: policies are calculated from audit logs. For complete legal automations,
        integrate external compliance services.
      </div>
    </div>
  );
}

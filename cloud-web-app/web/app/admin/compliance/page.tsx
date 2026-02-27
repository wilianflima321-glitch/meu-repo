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

type Policy = {
  id: string;
  name: string;
  status: 'active' | 'review' | 'inactive';
  lastAuditAt: string | null;
  incidents: number;
};

type CompliancePayload = {
  policies?: Policy[];
};

const statusLabel: Record<Policy['status'], string> = {
  active: 'Active',
  review: 'In review',
  inactive: 'Inactive',
};

export default function Compliance() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminJsonFetch<CompliancePayload>('/api/admin/compliance');
      setPolicies(Array.isArray(data?.policies) ? data.policies : []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const summary = useMemo(
    () => ({
      total: policies.length,
      active: policies.filter((policy) => policy.status === 'active').length,
      incidents: policies.reduce((sum, policy) => sum + policy.incidents, 0),
    }),
    [policies],
  );

  return (
    <AdminPageShell
      title='Compliance'
      description='Track policy status and incident counts for legal and security readiness.'
      subtitle={lastUpdated ? `Updated at ${lastUpdated.toLocaleString()}` : undefined}
      actions={<AdminPrimaryButton onClick={fetchPolicies}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Policies' value={summary.total} tone='sky' />
          <AdminStatCard label='Active policies' value={summary.active} tone='emerald' />
          <AdminStatCard label='Critical incidents' value={summary.incidents} tone='rose' />
          <AdminStatCard label='Last pull count' value={policies.length} tone='neutral' />
        </AdminStatGrid>
      </div>

      <AdminSection className='p-0'>
        <div className='overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='bg-zinc-800/70'>
                <th className='p-3 text-left'>Policy</th>
                <th className='p-3 text-left'>Status</th>
                <th className='p-3 text-left'>Last audit</th>
                <th className='p-3 text-left'>Incidents</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <AdminTableStateRow colSpan={4} message='Loading policies...' />
              ) : policies.length === 0 ? (
                <AdminTableStateRow colSpan={4} message='No compliance policies configured.' />
              ) : (
                policies.map((policy) => (
                  <tr key={policy.id} className='border-t border-zinc-800/70'>
                    <td className='p-3 text-zinc-100'>{policy.name}</td>
                    <td className='p-3'>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          policy.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : policy.status === 'review'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-zinc-800/70 text-zinc-300'
                        }`}
                      >
                        {statusLabel[policy.status]}
                      </span>
                    </td>
                    <td className='p-3 text-zinc-500'>
                      {policy.lastAuditAt ? new Date(policy.lastAuditAt).toLocaleString() : '-'}
                    </td>
                    <td className='p-3'>{policy.incidents}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <div className='mt-6'>
        <AdminStatusBanner tone='warning'>
          Compliance policy data is derived from audit log telemetry. External legal automation remains out of scope in this phase.
        </AdminStatusBanner>
      </div>
    </AdminPageShell>
  );
}

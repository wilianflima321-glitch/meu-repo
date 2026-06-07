'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

type Policy = {
  id: string
  name: string
  status: 'active' | 'review' | 'inactive'
  lastAuditAt: string | null
  incidents: number
}

export function AdminCompliancePanel() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/compliance')
      if (!res.ok) throw new Error('Failed to load compliance policies')
      const data = await res.json()
      setPolicies(Array.isArray(data?.policies) ? data.policies : [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading compliance policies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPolicies()
  }, [fetchPolicies])

  const summary = {
    total: policies.length,
    incidents: policies.reduce((sum, policy) => sum + policy.incidents, 0),
  }

  return (
    <section className="rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Compliance posture</h2>
          <p className="text-sm text-[var(--aethel-text-secondary)]">Policies, audits, and incident exposure.</p>
          {lastUpdated ? (
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Updated {lastUpdated.toLocaleString()}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void fetchPolicies()}
          className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
        >
          Refresh
        </button>
      </div>

      <AdminSummaryGrid
        className="mb-4"
        columns={2}
        items={[
          { icon: ShieldCheck, label: 'Monitored policies', value: summary.total },
          { icon: AlertTriangle, label: 'Critical incidents', value: summary.incidents, tone: 'error' },
        ]}
      />

      <div className="overflow-hidden rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)]">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-sm">
              <th className="p-2 text-left">Policy</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Last audit</th>
              <th className="p-2 text-left">Incidents</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-2 text-sm text-[var(--aethel-text-tertiary)]" colSpan={4}>Loading policies...</td>
              </tr>
            ) : error ? (
              <tr>
                <td className="p-2 text-sm text-[var(--aethel-error)]" colSpan={4}>{error}</td>
              </tr>
            ) : policies.length === 0 ? (
              <tr>
                <td className="p-2 text-sm text-[var(--aethel-text-tertiary)]" colSpan={4}>No policy configured.</td>
              </tr>
            ) : (
              policies.map((policy) => (
                <tr key={policy.id} className="border-t border-[var(--aethel-border-subtle)]">
                  <td className="p-2">{policy.name}</td>
                  <td className="p-2">
                    <span className={`rounded px-2 py-1 text-xs ${
                      policy.status === 'active'
                        ? 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success)]'
                        : policy.status === 'review'
                          ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                          : 'bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-[var(--aethel-text-secondary)]'
                    }`}>
                      {policy.status === 'active' ? 'Active' : policy.status === 'review' ? 'Review' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-2">{policy.lastAuditAt ? new Date(policy.lastAuditAt).toLocaleString() : '-'}</td>
                  <td className="p-2">{policy.incidents}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] p-3 text-sm text-[var(--aethel-text-secondary)]">
        Limitation: policies are calculated from audit logs. Complete legal automation requires external compliance evidence.
      </p>
    </section>
  )
}

export default AdminCompliancePanel

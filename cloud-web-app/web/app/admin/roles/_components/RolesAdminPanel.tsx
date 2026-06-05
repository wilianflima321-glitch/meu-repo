'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Users } from 'lucide-react'

import { AdminSummaryGrid } from '@/components/admin/AdminSummaryGrid'

type RoleSummary = { role: string | null; count: number }

export function RolesAdminPanel() {
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [adminRoles, setAdminRoles] = useState<RoleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/roles')
      if (!res.ok) throw new Error('Failed to load roles')
      const data = await res.json()
      setRoles(Array.isArray(data?.roles) ? data.roles : [])
      setAdminRoles(Array.isArray(data?.adminRoles) ? data.adminRoles : [])
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const summary = {
    totalUsers: roles.reduce((sum, role) => sum + role.count, 0),
    totalAdmins: adminRoles.reduce((sum, role) => sum + role.count, 0),
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">Roles and permissions</h2>
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Audit access distribution without leaving the people console.</p>
          {lastUpdated ? (
            <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">Updated {lastUpdated.toLocaleString()}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={fetchRoles}
          className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-tertiary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] transition hover:text-[var(--aethel-text-primary)]"
        >
          Refresh
        </button>
      </div>

      <AdminSummaryGrid
        columns={2}
        items={[
          {
            icon: Users,
            label: 'Total users',
            value: summary.totalUsers,
          },
          {
            icon: Shield,
            label: 'Administrators',
            value: summary.totalAdmins,
            tone: 'warning',
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <RoleList title="Role distribution" items={roles} loading={loading} error={error} emptyLabel="No roles found." />
        <RoleList title="Administrative roles" items={adminRoles} loading={loading} emptyLabel="No administrative roles defined." />
      </div>
    </section>
  )
}

function RoleList({
  title,
  items,
  loading,
  error,
  emptyLabel,
}: {
  title: string
  items: RoleSummary[]
  loading: boolean
  error?: string | null
  emptyLabel: string
}) {
  return (
    <div className="rounded-xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4">
      <h3 className="mb-4 text-sm font-semibold text-[var(--aethel-text-primary)]">{title}</h3>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded bg-[var(--aethel-surface-tertiary)]" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-[var(--aethel-error)]">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--aethel-text-tertiary)]">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-[var(--aethel-border-secondary)]">
          {items.map((role) => (
            <li key={role.role || 'unknown'} className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--aethel-text-secondary)]">{role.role || 'No role'}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">{role.count} users</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

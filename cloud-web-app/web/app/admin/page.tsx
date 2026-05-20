"use client"

import useSWR from 'swr'

import {
  AdminOperatingSpine,
  AdminRecentUsersTable,
  AdminSectionGrid,
  AdminStatsGrid,
  type AdminUserRow,
} from '@/components/admin/AdminCommandCenterSections'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { API_BASE } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { getAdminRouteCoverage } from '@/lib/admin/admin-consolidation'

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(payload?.message || payload?.error || 'Failed to load the admin console')
  }
  return response.json()
}

const coverage = getAdminRouteCoverage()

export default function Admin() {
  const { data, error, isLoading, mutate } = useSWR<{ users: AdminUserRow[] }>(`${API_BASE}/admin/users`, fetcher)
  const users = Array.isArray(data?.users) ? data.users : []

  return (
    <div className="mx-auto max-w-7xl p-6">
      <AdminPageHeader
        className="mb-6"
        eyebrow="Admin Control Center"
        title="Admin Command Center"
        subtitle="A dense six-area operating model: every route has one owner, one purpose, and a clear escalation path."
        actions={(
          <button
            type="button"
            onClick={() => mutate()}
            className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]"
          >
            Refresh
          </button>
        )}
      />

      <AdminStatsGrid users={users} />
      <AdminOperatingSpine coverage={coverage} />
      <AdminSectionGrid coverage={coverage} />
      <AdminRecentUsersTable users={users} isLoading={isLoading} errorMessage={error?.message} />
    </div>
  )
}

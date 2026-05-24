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
import { SurfaceQualityShell } from '@/components/product/SurfaceQualityShell'
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
        className="sr-only"
        eyebrow="Admin Control Center"
        title="Admin Command Center"
        subtitle="Six premium areas with compatibility routes held behind the sidebar drawer."
      />

      <SurfaceQualityShell
        eyebrow="Admin command center"
        title="Operate by risk, owner, and next action."
        subtitle="Six areas stay visible; legacy routes remain compatible but no longer behave like primary navigation."
        status={[
          { label: 'Areas', value: String(coverage.sections), tone: 'available' },
          { label: 'Legacy', value: `${coverage.legacyCompatibleRoutes} hidden`, tone: 'held' },
          { label: 'Privacy', value: 'masked', tone: 'available' },
        ]}
        primaryAction={(
          <button
            type="button"
            onClick={() => mutate()}
            className="rounded-full bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-[0_14px_32px_rgba(56,189,248,0.18)]"
          >
            Refresh
          </button>
        )}
        density="compact"
      >
        <AdminStatsGrid users={users} />
        <AdminOperatingSpine coverage={coverage} />
        <AdminSectionGrid coverage={coverage} />
        <AdminRecentUsersTable users={users} isLoading={isLoading} errorMessage={error?.message} />
      </SurfaceQualityShell>
    </div>
  )
}

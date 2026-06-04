"use client"

import useSWR from 'swr'

import {
  AdminCoverageDisclosure,
  AdminRecentUsersTable,
  AdminSectionGrid,
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
        eyebrow="Admin"
        title="Run the operation."
        subtitle="Six areas stay visible. Legacy routes stay searchable, not primary."
        status={[
          { label: 'Areas', value: String(coverage.sections), tone: 'available' },
          { label: 'Legacy', value: `${coverage.legacyCompatibleRoutes} hidden`, tone: 'held' },
          { label: 'Privacy', value: 'masked', tone: 'available' },
        ]}
        primaryAction={(
          <button
            type="button"
            onClick={() => mutate()}
            className="rounded-full bg-[var(--aethel-text-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)]"
          >
            Refresh
          </button>
        )}
        density="compact"
      >
        <AdminSectionGrid coverage={coverage} />
        <AdminCoverageDisclosure users={users} coverage={coverage} />
        <AdminRecentUsersTable users={users} isLoading={isLoading} errorMessage={error?.message} />
      </SurfaceQualityShell>
    </div>
  )
}

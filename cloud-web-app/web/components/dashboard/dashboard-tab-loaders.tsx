'use client'

import dynamic from 'next/dynamic'

const TabLoading = () => (
  <div className="mx-6 my-6 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_18%,transparent)] px-4 py-4 text-xs text-[var(--aethel-text-secondary)]">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-primary)]">Carregando modulo...</p>
  </div>
)

export const DashboardContentCreationTab = dynamic(
  () => import('./DashboardContentCreationTab').then((mod) => mod.DashboardContentCreationTab),
  { ssr: false, loading: TabLoading }
)
export const DashboardUnrealTab = dynamic(
  () => import('./DashboardUnrealTab').then((mod) => mod.DashboardUnrealTab),
  { ssr: false, loading: TabLoading }
)
export const BillingTab = dynamic(() => import('./tabs/BillingTab'), { ssr: false, loading: TabLoading })
export const DownloadTab = dynamic(() => import('./tabs/DownloadTab'), { ssr: false, loading: TabLoading })
export const TemplatesTab = dynamic(() => import('./tabs/TemplatesTab'), { ssr: false, loading: TabLoading })
export const UseCasesTab = dynamic(() => import('./tabs/UseCasesTab'), { ssr: false, loading: TabLoading })
export const AdminTab = dynamic(() => import('./tabs/AdminTab'), { ssr: false, loading: TabLoading })
export const AgentCanvasTab = dynamic(() => import('./tabs/AgentCanvasTab'), { ssr: false, loading: TabLoading })

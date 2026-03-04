'use client'

import dynamic from 'next/dynamic'

const TabLoading = () => (
  <div className="aethel-state aethel-state-loading aethel-m-6 aethel-text-xs">
    <p className="aethel-state-title">Carregando modulo...</p>
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

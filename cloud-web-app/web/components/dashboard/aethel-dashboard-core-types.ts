import type { ActiveTab, DashboardSettings } from './aethel-dashboard-model'
import { resolveStoredActiveTab } from './aethel-dashboard-model'

export const DASHBOARD_DEFAULT_SETTINGS: DashboardSettings = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
}

export const PREVIEW_RUNTIME_URL_STORAGE_KEY = 'aethel.workbench.preview.runtimeUrl'

export type Point3 = {
  x: number
  y: number
  z: number
}

export type FullAccessGrant = {
  id: string
  userId: string
  projectId?: string | null
  scope: string[]
  reason: string
  durationMinutes: number
  createdAt: string
  expiresAt: string
  revokedAt?: string | null
  status: 'active' | 'expired' | 'revoked'
}

export type FullAccessResponse = {
  error?: string
  message?: string
  capability?: string
  capabilityStatus?: string
  metadata?: {
    grants?: FullAccessGrant[]
    activeCount?: number
  }
}

export function coerceActiveTab(raw: string | null): ActiveTab {
  if (raw === 'chat') return 'ai-chat'
  return resolveStoredActiveTab(raw)
}

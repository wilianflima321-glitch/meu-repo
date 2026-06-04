import type React from 'react'
import type { AdminEvidenceStatus, AdminRouteRiskLane } from '@/lib/admin/admin-consolidation'

export interface SystemStatus {
  api: 'healthy' | 'degraded' | 'down'
  database: 'healthy' | 'degraded' | 'down'
  redis: 'healthy' | 'degraded' | 'down'
  ai: 'healthy' | 'degraded' | 'down'
  websocket: 'healthy' | 'degraded' | 'down'
}

export interface QuickStats {
  activeUsers: number
  requestsPerMinute: number
  aiCostToday: number
  emergencyLevel: 'normal' | 'warning' | 'critical' | 'shutdown'
}

export interface AdminRouteNavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
}

export interface NavGroup {
  label: string
  href: string
  description: string
  owner: string
  intent: string
  riskLane: AdminRouteRiskLane
  evidenceStatus: AdminEvidenceStatus
  routeCount: number
  icon: React.ElementType
  items: AdminRouteNavItem[]
  primaryItems: AdminRouteNavItem[]
  legacyItems: AdminRouteNavItem[]
}

export type LegacyRouteItem = AdminRouteNavItem & {
  sectionLabel: string
  owner: string
  riskLane: AdminRouteRiskLane
  evidenceStatus: AdminEvidenceStatus
}

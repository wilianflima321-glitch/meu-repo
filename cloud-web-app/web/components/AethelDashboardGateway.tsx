'use client';

/**
 * @deprecated Route-level dashboard entry should use
 * `@/components/dashboard/DashboardPageClient`.
 * This gateway wrapper remains only for compatibility.
 */
/**
 * @deprecated The dashboard route now mounts `DashboardPageClient` directly.
 * Keep this file only for backward-compatible imports while references are removed.
 */

import DashboardPageClient from './dashboard/DashboardPageClient'

export default function AethelDashboardGateway() {
  return <DashboardPageClient />
}

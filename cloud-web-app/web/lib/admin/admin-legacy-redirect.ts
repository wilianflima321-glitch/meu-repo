/**
 * Block 7B.3 — Thin honest admin pages for orphan legacy routes.
 * Redirects via ADMIN_LEGACY_ROUTE_REDIRECTS — no fake panels.
 */

import { redirect } from 'next/navigation'
import { ADMIN_LEGACY_ROUTE_REDIRECTS } from '@/lib/admin/admin-consolidation'

export function redirectAdminLegacyRoute(fromPath: string): never {
  const target = ADMIN_LEGACY_ROUTE_REDIRECTS[fromPath]
  if (!target) {
    redirect('/admin')
  }
  redirect(target)
}

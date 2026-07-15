import { redirectAdminLegacyRoute } from '@/lib/admin/admin-legacy-redirect'

/** Block 7B.3 — thin honest redirect (critique #23). */
export default function AdminCollaborationPage() {
  redirectAdminLegacyRoute('/admin/collaboration')
}

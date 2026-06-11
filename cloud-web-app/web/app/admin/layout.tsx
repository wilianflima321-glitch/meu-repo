import type { ReactNode } from 'react'
import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

// Silent skeleton — no text, no labels, just a loading boundary
function AdminLayoutFallback() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center bg-[var(--aethel-surface-primary)]"
    >
      <div
        className="h-8 w-8 animate-pulse rounded-full bg-[var(--aethel-surface-secondary)]"
        aria-hidden="true"
      />
      <span className="sr-only">Loading admin area</span>
    </div>
  )
}

const AdminOpsLayoutClient = nextDynamic(() => import('./admin-ops-layout-client'), {
  ssr: false,
  loading: () => <AdminLayoutFallback />,
})

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminOpsLayoutClient>{children}</AdminOpsLayoutClient>
}

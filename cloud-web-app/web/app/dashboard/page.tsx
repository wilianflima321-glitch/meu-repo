import { Suspense } from 'react'
import DashboardPageClient from '../../components/dashboard/DashboardPageClient'

export const metadata = {
  title: 'Aethel Studio - Dashboard',
  description: 'Studio Home da plataforma Aethel Engine.',
}

/**
 * SSR fallback while the client dashboard hydrates.
 *
 * Uses role="status" + aria-live="polite" so screen readers announce the
 * loading state without stealing focus, per WCAG 4.1.3.
 */
function DashboardHydrationFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-[var(--aethel-bg)] px-6 text-sm text-[var(--aethel-text-tertiary)]"
    >
      <span className="sr-only">Carregando Studio Home...</span>
      <span aria-hidden="true">Carregando Studio Home...</span>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHydrationFallback />}>
      <DashboardPageClient />
    </Suspense>
  )
}

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EvidenceCenter } from '@/components/evidence/EvidenceCenter'

export const metadata: Metadata = {
  title: 'Evidence Center | Aethel',
  description: 'Protected project evidence, readiness, blockers, and next actions.',
}

export default function EvidencePage({
  searchParams,
}: {
  searchParams?: { projectId?: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--aethel-surface-primary)] px-6 py-10 text-[var(--aethel-text-secondary)]">
          Loading evidence center...
        </div>
      }
    >
      <EvidenceCenter initialProjectId={searchParams?.projectId} />
    </Suspense>
  )
}

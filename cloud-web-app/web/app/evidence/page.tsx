import { Suspense } from 'react'
import type { Metadata } from 'next'
import { EvidenceCenter } from '@/components/evidence/EvidenceCenter'
import PremiumLoadingState from '@/components/ui/PremiumLoadingState'

export const metadata: Metadata = {
  title: 'Evidence | Aethel',
  description: 'Project evidence, blockers, and next actions.',
}

export default function EvidencePage({
  searchParams,
}: {
  searchParams?: { projectId?: string }
}) {
  return (
    <Suspense fallback={<PremiumLoadingState variant="route" />}>
      <EvidenceCenter initialProjectId={searchParams?.projectId} />
    </Suspense>
  )
}

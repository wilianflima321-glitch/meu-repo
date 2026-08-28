'use client'

import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import GamePublishWizard from '@/components/hub/GamePublishWizard'

export default function StudioPublishPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <main id="main-content" className="relative z-10 pb-20 pt-8">
        <GamePublishWizard />
      </main>
      <PublicFooter />
    </div>
  )
}

import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { HelpPageClient } from './_components/HelpPageClient'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]">
      <PublicHeader />
      <HelpPageClient />
      <PublicFooter />
    </div>
  )
}

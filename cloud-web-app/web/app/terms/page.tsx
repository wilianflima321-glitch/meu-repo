import PublicHeader from '@/components/ui/PublicHeader'
import PublicFooter from '@/components/ui/PublicFooter'
import { TermsHubClient } from './TermsHubClient'

const LAST_UPDATED_LABEL = 'June 25, 2026'

export const metadata = {
  title: 'Terms & Agreements | Aethel Studio',
  description:
    'Full platform agreement hub covering Aethel Engine royalties, subscription plans, system requirements, and legal terms of service.',
}

export default function TermsPage() {
  return (
    <>
      <PublicHeader />
      <div className="hidden" data-terms-surface="compact">
        <span>Open terms</span>
        <span>Open acceptable-use rules</span>
      </div>
      <TermsHubClient lastUpdated={LAST_UPDATED_LABEL} />
      <PublicFooter />
    </>
  )
}

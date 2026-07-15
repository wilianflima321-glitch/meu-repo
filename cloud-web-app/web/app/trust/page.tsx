import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'
import { TrustCenterPageShell } from '../security/trust-center-shared'
import { trustActions, trustFaqs, trustMetrics, trustResources, trustSections } from './trustContent'

export const metadata: Metadata = {
  title: 'Trust Center | Aethel Studio',
  description:
    'Aethel Studio public trust center: security, compliance, status, privacy, responsible disclosure, and clear limits.',
}

export default function TrustPage() {
  return (
    <TrustCenterPageShell
      badge="Trust Center"
      heroIcon={ShieldCheck}
      title="Trust, without the maze."
      description="Security, status, privacy, and compliance in one compact review path."
      summaryTitle="Trust posture"
      summaryBody="Start here. Open deeper pages only when the review needs them."
      summaryPoints={[
        'Security, compliance, status, privacy, and terms stay findable.',
        'Disclosure stays separate from sales copy.',
        'SOC 2 remains preparation until formal scope and date exist.',
      ]}
      metrics={trustMetrics}
      sections={trustSections}
      resources={trustResources}
      faqs={trustFaqs}
      actions={trustActions}
    />
  )
}

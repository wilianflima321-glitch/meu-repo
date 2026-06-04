import type { Metadata } from 'next'
import { Activity } from 'lucide-react'

import { TrustCenterPageShell } from '../security/trust-center-shared'
import {
  reliabilityActions,
  reliabilityFaqs,
  reliabilityMetrics,
  reliabilityResources,
  reliabilitySections,
} from './reliabilityContent'

export const metadata: Metadata = {
  title: 'Reliability | Aethel Studio',
  description:
    'Aethel Studio reliability and incident response: public status, Sev 1-3, response targets, and limits without unsupported SLA claims.',
}

export default function ReliabilityPage() {
  return (
    <TrustCenterPageShell
      badge="Reliability"
      heroIcon={Activity}
      title="Reliability, with limits visible."
      description="Current status, incident language, and response targets without unsupported SLA claims."
      summaryTitle="Reliability posture"
      summaryBody="Status comes first. Targets guide triage; contracts define guarantees."
      summaryPoints={[
        '/status shows checks users can follow.',
        'Sev 1, Sev 2, and Sev 3 define incident severity.',
        'Response targets are operational guidance, not a contractual SLA.',
        'Rolling uptime and public incident history remain open gaps.',
      ]}
      metrics={reliabilityMetrics}
      sections={reliabilitySections}
      resources={reliabilityResources}
      faqs={reliabilityFaqs}
      actions={reliabilityActions}
    />
  )
}

import type { Metadata } from 'next'
import { FileCheck2 } from 'lucide-react'

import { TrustCenterPageShell } from '../security/trust-center-shared'
import {
  complianceActions,
  complianceFaqs,
  complianceMetrics,
  complianceResources,
  complianceSections,
} from './complianceContent'

export const metadata: Metadata = {
  title: 'Compliance | Aethel Studio',
  description:
    'Aethel Studio public compliance posture with honest language about controls, audits, buyer review, and roadmap.',
}

export default function CompliancePage() {
  return (
    <TrustCenterPageShell
      badge="Compliance"
      heroIcon={FileCheck2}
      title="Compliance, stated carefully."
      description="Current controls are visible. Formal certifications and self-serve enterprise rollout are not claimed early."
      summaryTitle="What is true today"
      summaryBody="Show the base, name the gaps, and only promote claims when evidence exists."
      summaryPoints={[
        'Public status and current limits are already visible.',
        'Internal audits keep the roadmap honest.',
        'SOC 2, GDPR, and SSO/SAML remain scoped with caution.',
        'The starter pack gives buyers a clean first read.',
      ]}
      metrics={complianceMetrics}
      sections={complianceSections}
      resources={complianceResources}
      faqs={complianceFaqs}
      actions={complianceActions}
    />
  )
}

import type { Metadata } from 'next'
import { LockKeyhole } from 'lucide-react'
import { TrustCenterPageShell } from './trust-center-shared'
import { securityActions, securityFaqs, securityMetrics, securityResources, securitySections } from './securityContent'

export const metadata: Metadata = {
  title: 'Security | Aethel Studio',
  description:
    'Aethel Studio public security center with honest language about MFA, passkeys, status, and enterprise roadmap.',
}

export default function SecurityPage() {
  return (
    <TrustCenterPageShell
      badge="Security Center"
      heroIcon={LockKeyhole}
      title="Security posture, clearly scoped."
      description="MFA is live. Passkeys in technical rollout; enterprise identity stays assisted until support is complete."
      summaryTitle="Security posture"
      summaryBody="What is live stays visible. What is still assisted stays named."
      summaryPoints={[
        'MFA/TOTP with backup codes is in product.',
        'Passkeys are in technical rollout, not enterprise GA.',
        'Public status measures real endpoints without uptime cosmetics.',
        'SSO/SAML remains assisted until docs, support, and rollout are complete.',
      ]}
      metrics={securityMetrics}
      sections={securitySections}
      resources={securityResources}
      faqs={securityFaqs}
      actions={securityActions}
    />
  )
}

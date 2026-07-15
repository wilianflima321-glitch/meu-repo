import type { Metadata } from 'next'
import { ShieldCheck } from 'lucide-react'

import DocsResourcePage from '@/app/docs/docs-resource-page'

export const metadata: Metadata = {
  title: 'Security Policy | Aethel Studio',
  description:
    'Aethel Studio responsible disclosure policy with safe harbor, testing scope, reporting rules, and current program limits.',
}

const cards = [
  {
    eyebrow: 'Contact',
    title: 'Responsible disclosure',
    description:
      'Use security@aethel.dev. Include impact, reproduction steps, affected page or route, and minimal triage evidence.',
    links: [
      {
        label: 'Send email',
        href: 'mailto:security@aethel.dev',
        external: true,
      },
    ],
  },
  {
    eyebrow: 'Safe harbor',
    title: 'Good-faith coordinated testing',
    description:
      'Testing is authorized when it follows this policy, avoids third-party data, avoids disruption, and is coordinated responsibly.',
  },
  {
    eyebrow: 'Scope',
    title: 'Public pages and your own account',
    description:
      'In scope: public pages, your own authenticated flows, public APIs, Studio Web, billing, auth, deploy, marketplace, and previews you control.',
  },
  {
    eyebrow: 'Out of scope',
    title: 'No abuse, exfiltration, spam, or operational impact',
    description:
      'Do not perform DoS, brute force, social engineering, spam, scraping, cross-account access, destructive changes, or payment bypass attempts.',
  },
  {
    eyebrow: 'AI / agents',
    title: 'Use extra care when testing agents',
    description:
      'Agent, browser, memory, runtime, tool, prompt, file, and approval issues need safe steps and no irreversible actions.',
  },
  {
    eyebrow: 'Expectation',
    title: 'Response targets, not a contractual SLA',
    description:
      'Targets: acknowledgment within 48 business hours, first triage within 5 business days, and severity-appropriate updates.',
  },
  {
    eyebrow: 'Credit',
    title: 'Acknowledgment only after real remediation',
    description:
      'Validated reports can be credited from this policy flow when triage, remediation, and safe disclosure are complete.',
  },
]

export default function SecurityPolicyPage() {
  return (
    <DocsResourcePage
      eyebrow="Security policy"
      title="Responsible disclosure, clearly scoped."
      description="Report safely. Test within scope. Keep claims earned."
      icon={ShieldCheck}
      accentClassName="text-[var(--aethel-success-light)]"
      summary="Coordinated disclosure, good-faith safe harbor, predictable triage, and honest scope."
      cards={cards}
      calloutTitle="Report or review security"
      calloutDescription="For vulnerabilities, start with security@aethel.dev. For due diligence, read this with trust, compliance, status, and procurement docs."
      calloutLinks={[
        { label: 'Trust center', href: '/trust' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Status', href: '/status' },
        {
          label: 'Procurement starter pack',
          href: '/docs/procurement-starter-pack',
        },
      ]}
    />
  )
}

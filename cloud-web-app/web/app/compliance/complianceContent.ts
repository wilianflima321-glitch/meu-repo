import type { TrustAction, TrustFaq, TrustMetric, TrustResource, TrustSection } from '../security/trust-center-shared'

export const complianceMetrics: TrustMetric[] = [
  {
    label: 'SOC 2',
    value: 'Planned',
    detail: 'SOC 2 is planned, not published as a certification.',
    tone: 'planned',
  },
  {
    label: 'GDPR',
    value: 'Target',
    detail: 'GDPR remains a maturity target, not a blanket claim.',
    tone: 'planned',
  },
  {
    label: 'Audits',
    value: 'Canonical',
    detail: 'Audits and execution maps keep roadmap claims grounded.',
    tone: 'live',
  },
]

export const complianceSections: TrustSection[] = [
  {
    eyebrow: 'Current base',
    title: 'Signals that support review today.',
    description: 'Verifiable controls start the conversation; they do not close every enterprise requirement.',
    cards: [
      {
        eyebrow: 'Status',
        title: 'Public operational checks',
        tone: 'live',
        description: '/status organizes liveness, setup, dependencies, blockers, and measurement limits.',
        bullets: [
          'No simulated incident history.',
          'No placeholder becomes a public claim.',
          'Technical procurement gets real signals first.',
        ],
      },
      {
        eyebrow: 'Operations',
        title: 'Logs and admin controls',
        tone: 'partial',
        description: 'Internal security and compliance controls help operations before the buyer pack is complete.',
        bullets: [
          'Administrative trails support review.',
          'Operators benefit before self-serve buyers do.',
          'The next step is clearer public packaging.',
        ],
      },
      {
        eyebrow: 'Execution',
        title: 'Audits correct drift',
        tone: 'live',
        description: 'Execution maps keep code, docs, and public copy aligned over time.',
        bullets: [
          'Gaps stay named instead of hidden.',
          'Stale claims are corrected when reality changes.',
          'Product maturity leads marketing maturity.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Not promised early',
    title: 'Open gaps for the enterprise package.',
    description: 'Compliance needs technical, commercial, and legal artifacts before stronger claims are public.',
    cards: [
      {
        eyebrow: 'Certifications',
        title: 'No formal seal yet',
        tone: 'planned',
        description: 'SOC 2, ISO 27001, and equivalent certifications are not presented as complete.',
        bullets: [
          'Targets stay separate from issued certification.',
          'Future claims must show scope and date.',
          'The expectation today is roadmap, not attestation.',
        ],
      },
      {
        eyebrow: 'Corporate identity',
        title: 'SSO / SAML needs rollout',
        tone: 'partial',
        description: 'OIDC/SAML setup exists, but public enterprise self-serve rollout is not complete.',
        bullets: [
          'Technical setup is not commercial rollout.',
          'Docs and onboarding are still needed.',
          'The current path remains assisted.',
        ],
      },
      {
        eyebrow: 'Procurement',
        title: 'Public material starts review',
        tone: 'planned',
        description: 'This page does not replace questionnaires, legal alignment, or formal procurement packages.',
        bullets: [
          'More dedicated artifacts remain needed.',
          'Public incident history remains open.',
          'Human review remains part of enterprise evaluation.',
        ],
      },
    ],
  },
]

export const complianceFaqs: TrustFaq[] = [
  {
    question: 'Is Aethel SOC 2 certified today?',
    answer: 'No. The current state is planning and preparation, not a published certification.',
  },
  {
    question: 'Is GDPR complete as a marketing claim?',
    answer: 'No. GDPR is treated as a maturity target, not a phrase that ends due diligence.',
  },
  {
    question: 'How should enterprise review start?',
    answer: 'Read /security and /status first, then use /contact-sales for rollout, procurement, or contracts.',
  },
  {
    question: 'Is there a public procurement kit?',
    answer: 'Yes. /docs/procurement-starter-pack organizes the current public review trail.',
  },
]

export const complianceResources: TrustResource[] = [
  {
    eyebrow: 'Procurement',
    title: 'Evaluation starter pack',
    description: 'Public material for buyers before a sales call.',
    href: '/docs/procurement-starter-pack',
  },
  {
    eyebrow: 'Trust',
    title: 'Security and controls',
    description: 'MFA, status, and delivered setup against open rollout work.',
    href: '/security',
  },
  {
    eyebrow: 'Commercial',
    title: 'Enterprise contact',
    description: 'Handoff for questionnaires, rollout, and contracts.',
    href: '/contact-sales',
  },
]

export const complianceActions: TrustAction[] = [
  { label: 'View security', href: '/security', tone: 'primary' },
  { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
  { label: 'View public status', href: '/status' },
  { label: 'Talk to sales', href: '/contact-sales' },
]

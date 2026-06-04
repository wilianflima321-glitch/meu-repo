import type { TrustAction, TrustFaq, TrustMetric, TrustResource, TrustSection } from '../security/trust-center-shared'

export const reliabilityMetrics: TrustMetric[] = [
  {
    label: 'Status checks',
    value: 'Live',
    detail: '/status shows runtime and dependency checks without unsupported uptime claims.',
    tone: 'live',
  },
  {
    label: 'Incident grammar',
    value: 'Sev 1-3',
    detail: 'Severity labels separate blocking incidents, degradation, and coverage gaps.',
    tone: 'live',
  },
  {
    label: 'SLO/SLA',
    value: 'Targets',
    detail: 'Targets guide response; contracts define guarantees.',
    tone: 'partial',
  },
]

export const reliabilitySections: TrustSection[] = [
  {
    eyebrow: 'Verifiable',
    title: 'Reliability starts with live checks.',
    description: 'Public health and incident language live here so the product can stay focused.',
    cards: [
      {
        eyebrow: 'Public status',
        title: 'Live checks in /status',
        tone: 'live',
        description: 'Runtime, AI, database, cache, storage, Stripe, and billing are separated for clearer triage.',
        bullets: [
          'Runtime and setup checks are separate.',
          'Critical dependencies stay visible.',
          'Refresh cadence is usable for support and operators.',
        ],
      },
      {
        eyebrow: 'Incident response',
        title: 'Sev 1 / Sev 2 / Sev 3',
        tone: 'live',
        description: 'Incidents should name scope, impact, mitigation, owner, and next update.',
        bullets: [
          'Sev 1: broad blocking issue or essential-service loss.',
          'Sev 2: degraded service with workaround or limited scope.',
          'Sev 3: incomplete coverage, monitoring, or prevention work.',
        ],
      },
      {
        eyebrow: 'Setup checks',
        title: 'Runtime, billing, preview, operator',
        tone: 'partial',
        description: 'Setup checks prevent partial areas from looking finished too early.',
        bullets: [
          'Billing checks separate Stripe setup from billing UI.',
          'Preview checks avoid treating partial runtime as deploy proof.',
          'Operator checks keep browser work controlled.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Limits',
    title: 'Unproven guarantees stay offstage.',
    description: 'Uptime, incident history, and SLA claims need real telemetry and contracts.',
    cards: [
      {
        eyebrow: 'History',
        title: 'No rolling uptime yet',
        tone: 'planned',
        description: 'Rolling uptime should come from component telemetry, not copywriting.',
        bullets: [
          'No unsupported availability percentage.',
          'No extreme promise without contract and history.',
          'Next step: component-level history.',
        ],
      },
      {
        eyebrow: 'Incidents',
        title: 'Incident history remains incomplete',
        tone: 'planned',
        description: 'A mature log needs postmortems, timelines, owners, root cause, and prevention follow-ups.',
        bullets: [
          'Postmortems need timeline, impact, mitigation, and follow-up.',
          'AI/runtime incidents should name agent, permission, data, and environment.',
          'Resolved incidents should not disappear for cosmetics.',
        ],
      },
      {
        eyebrow: 'Contract',
        title: 'Targets are not SLA',
        tone: 'partial',
        description: 'Formal SLA belongs in enterprise contracts with scope, regions, exclusions, and credits.',
        bullets: [
          'Targets guide operations, not legal guarantees.',
          'Enterprise SLA still needs review.',
          'Future SLO/SLA should derive from production history.',
        ],
      },
    ],
  },
]

export const reliabilityResources: TrustResource[] = [
  {
    eyebrow: 'Status',
    title: 'Operational status',
    description: 'Runtime and dependency checks.',
    href: '/status',
  },
  {
    eyebrow: 'Trust',
    title: 'Trust center',
    description: 'Security, compliance, status, privacy, and disclosure map.',
    href: '/trust',
  },
  {
    eyebrow: 'Security',
    title: 'Security policy',
    description: 'Responsible disclosure, scope, and testing limits.',
    href: '/security-policy',
  },
  {
    eyebrow: 'Procurement',
    title: 'Procurement starter pack',
    description: 'First trail for risk and rollout review.',
    href: '/docs/procurement-starter-pack',
  },
  {
    eyebrow: 'Enterprise',
    title: 'Contact sales',
    description: 'SLA, SSO/SAML, compliance, and contract handoff.',
    href: '/contact-sales',
  },
]

export const reliabilityFaqs: TrustFaq[] = [
  {
    question: 'Does Aethel guarantee availability here?',
    answer: 'No. This page explains response targets and incident language; it is not a contractual SLA.',
  },
  {
    question: 'Where is current product health?',
    answer: '/status shows runtime and dependency health. /reliability explains the operating language.',
  },
  {
    question: 'How should Sev 1, Sev 2, and Sev 3 be used?',
    answer: 'Sev 1 is blocking, Sev 2 is degraded, and Sev 3 is incomplete coverage or preventive work.',
  },
  {
    question: 'When will public incident history be complete?',
    answer: 'It remains open. The mature version needs postmortems, timelines, follow-ups, and owners.',
  },
]

export const reliabilityActions: TrustAction[] = [
  { label: 'View status', href: '/status', tone: 'primary' },
  { label: 'Trust center', href: '/trust' },
  { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
  { label: 'Talk to sales', href: '/contact-sales' },
]

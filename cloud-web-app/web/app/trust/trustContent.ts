import type { TrustAction, TrustFaq, TrustMetric, TrustResource, TrustSection } from '../security/trust-center-shared'

export const trustMetrics: TrustMetric[] = [
  {
    label: 'MFA',
    value: 'Live',
    detail: 'TOTP setup and backup codes are live account-hardening paths.',
    tone: 'live',
  },
  {
    label: 'Status',
    value: 'Public',
    detail: 'Runtime, billing, preview, and dependency checks are public.',
    tone: 'live',
  },
  {
    label: 'SOC 2',
    value: 'Preparation',
    detail: 'Preparation stays separate from any formal certification claim.',
    tone: 'planned',
  },
]

export const trustSections: TrustSection[] = [
  {
    eyebrow: 'One read',
    title: 'A single front door for review.',
    description: 'Start here, then open a focused page only when needed.',
    cards: [
      {
        eyebrow: 'Security',
        title: 'Controls in product',
        tone: 'live',
        description: 'MFA/TOTP, backup codes, status, and policy are findable today.',
        bullets: [
          'MFA is a delivered control, not a roadmap badge.',
          'Audit activity stays scoped to the right product areas.',
          'Disclosure paths are public and separate from sales.',
        ],
      },
      {
        eyebrow: 'Operations',
        title: 'Live checks, plain states',
        tone: 'live',
        description: 'Status shows what works, what is partial, and what still needs setup.',
        bullets: [
          'Runtime, billing, preview, and operator checks stay visible.',
          'Partial states are not hidden behind generic copy.',
          'Setup gaps do not become enterprise proof.',
        ],
      },
      {
        eyebrow: 'Compliance',
        title: 'Preparation, not theater',
        tone: 'planned',
        description: 'SOC 2 and GDPR language stays cautious until formal evidence exists.',
        bullets: [
          'No SOC 2 or ISO seal without scope and date.',
          'Buyer review starts with public material, then moves to sales.',
          'Compliance is tied to real limits, not a logo wall.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Due diligence',
    title: 'Summary first. Details on demand.',
    description: '/trust is the map; deeper pages carry the details.',
    cards: [
      {
        eyebrow: 'Disclosure',
        title: 'Researchers have a path',
        tone: 'partial',
        description: 'Security policy handles reporting and credit without turning disclosure into marketing.',
        bullets: [
          'Responsible disclosure stays public.',
          'Credit stays validated and inside the disclosure flow.',
          'A formal program still needs fuller safe-harbor material.',
        ],
      },
      {
        eyebrow: 'Privacy',
        title: 'Legal links in one map',
        tone: 'partial',
        description: 'Privacy, terms, and compliance are visible without forcing users through footer hunting.',
        bullets: [
          'Privacy and Terms are primary trust artifacts.',
          'Legal claims avoid absolutes that depend on contracts.',
          'Enterprise review still belongs in a scoped conversation.',
        ],
      },
      {
        eyebrow: 'AI controls',
        title: 'Cost, audit, and action scope',
        tone: 'partial',
        description: 'Agent trust covers memory, cost, approval, and runtime limits.',
        bullets: [
          'Cost appears near AI usage without becoming finance noise.',
          'Admin finance tracks AI margin risk.',
          'Heavy runtime stays capability-gated before public claims.',
        ],
      },
    ],
  },
]

export const trustResources: TrustResource[] = [
  {
    eyebrow: 'Security',
    title: 'Public security',
    description: 'MFA, status, identity roadmap, and current posture.',
    href: '/security',
  },
  {
    eyebrow: 'Compliance',
    title: 'Compliance',
    description: 'SOC 2 preparation, GDPR targets, audits, and buyer review.',
    href: '/compliance',
  },
  {
    eyebrow: 'Status',
    title: 'Operational status',
    description: 'Live checks, blockers, and in-progress areas.',
    href: '/status',
  },
  {
    eyebrow: 'Reliability',
    title: 'Reliability',
    description: 'Incidents, response targets, and SLO/SLA limits.',
    href: '/reliability',
  },
  {
    eyebrow: 'Disclosure',
    title: 'Security policy',
    description: 'Responsible disclosure, scope, and safe-harbor limits.',
    href: '/security-policy',
  },
  {
    eyebrow: 'Privacy',
    title: 'Privacy',
    description: 'Privacy and data-handling read for users and buyers.',
    href: '/privacy',
  },
  {
    eyebrow: 'Legal',
    title: 'Terms',
    description: 'Use terms and contractual boundaries.',
    href: '/terms',
  },
]

export const trustFaqs: TrustFaq[] = [
  {
    question: 'Why does /trust exist?',
    answer: 'It is the compact map. Security, compliance, status, privacy, and terms remain the deeper pages.',
  },
  {
    question: 'Is Aethel declaring formal certifications here?',
    answer: 'No. SOC 2 is preparation until a future certification can show scope, date, and review material.',
  },
  {
    question: 'Where should someone report a vulnerability?',
    answer: 'Use /security-policy. Credit stays separate from commercial narrative.',
  },
  {
    question: 'Does this make the product heavier?',
    answer: 'No. Trust lives here so the main product can stay task-first.',
  },
]

export const trustActions: TrustAction[] = [
  { label: 'View security', href: '/security', tone: 'primary' },
  { label: 'View status', href: '/status' },
  { label: 'Reliability', href: '/reliability' },
  { label: 'Security policy', href: '/security-policy' },
  { label: 'Compliance', href: '/compliance' },
  { label: 'Talk to sales', href: '/contact-sales' },
]

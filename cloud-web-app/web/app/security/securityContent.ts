import type { TrustAction, TrustFaq, TrustMetric, TrustResource, TrustSection } from './trust-center-shared'

export const securityMetrics: TrustMetric[] = [
  {
    label: 'Account MFA',
    value: 'Active',
    detail: 'TOTP, QR/manual setup, and backup codes are in product.',
    tone: 'live',
  },
  {
    label: 'Public status',
    value: '/status',
    detail: 'Runtime and dependency checks are public without uptime cosmetics.',
    tone: 'live',
  },
  {
    label: 'SSO / SAML',
    value: 'Assisted',
    detail: 'Provider plumbing exists; self-serve enterprise GA is not claimed.',
    tone: 'partial',
  },
]

export const securitySections: TrustSection[] = [
  {
    eyebrow: 'Live today',
    title: 'Proven controls first.',
    description: 'Delivered security stays separate from rollout work.',
    cards: [
      {
        eyebrow: 'Account',
        title: 'Authenticator MFA',
        tone: 'live',
        description: 'Users can set up TOTP, validate it, disable it safely, and regenerate backup codes.',
        bullets: [
          'QR and manual setup live in one flow.',
          'Backup codes can be regenerated after activation.',
          '2FA remains the canonical account-hardening path.',
        ],
      },
      {
        eyebrow: 'Operations',
        title: 'Public status',
        tone: 'live',
        description: '/status reports runtime, database, cache, storage, AI, Stripe, and billing checks.',
        bullets: [
          'No unsupported rolling uptime number.',
          'In-progress areas stay labeled as in-progress.',
          'Public blockers remain visible when checks fail.',
        ],
      },
      {
        eyebrow: 'Controls',
        title: 'Operational controls',
        tone: 'partial',
        description: 'Admin areas cover audit logs, 2FA enforcement, and suspicious-IP controls before the public pack is complete.',
        bullets: [
          'Useful for operators and review.',
          'Not yet a complete self-serve procurement package.',
          'Public copy must stay as clear as internal controls.',
        ],
      },
    ],
  },
  {
    eyebrow: 'Rolling out',
    title: 'Important, but not oversold.',
    description: 'Signals in code still need docs, support, and rollout before GA language.',
    cards: [
      {
        eyebrow: 'Corporate identity',
        title: 'SSO / SAML stays assisted',
        tone: 'partial',
        description: 'OIDC and SAML setup exists, but public self-serve enterprise rollout is not complete.',
        bullets: [
          'Configuration signal is not commercial rollout.',
          'Docs and operational closure are still required.',
          'The right sale today is assisted evaluation.',
        ],
      },
      {
        eyebrow: 'Modern credentials',
        title: 'Passkeys in technical rollout',
        tone: 'partial',
        description: 'API, storage, and registration UI exist; recovery and support still need closure.',
        bullets: [
          'WebAuthn uses short-lived one-time challenges.',
          'Settings can register a passkey on supported devices.',
          'Recovery and support must ship before enterprise GA copy.',
        ],
      },
      {
        eyebrow: 'Formal programs',
        title: 'Certification scope is explicit',
        tone: 'planned',
        description: 'SOC 2, ISO 27001, and equivalent seals are not published as complete today.',
        bullets: [
          'SOC 2 appears as planned, not issued.',
          'GDPR appears as a target, not a slogan.',
          'Enterprise review still needs human alignment.',
        ],
      },
    ],
  },
]

export const securityFaqs: TrustFaq[] = [
  {
    question: 'Does Aethel have MFA today?',
    answer: 'Yes. TOTP setup, manual setup, backup codes, and account maintenance exist in product.',
  },
  {
    question: 'Do passkeys exist?',
    answer: 'Yes, in technical rollout. We do not call it enterprise GA until recovery and support docs are complete.',
  },
  {
    question: 'Is SSO / SAML self-serve today?',
    answer: 'Not yet. Provider plumbing exists, but the public product treats rollout as assisted.',
  },
  {
    question: 'Where is operational health?',
    answer: '/status is the public health page for runtime and dependency checks.',
  },
  {
    question: 'How should procurement start?',
    answer: 'Start with /docs/procurement-starter-pack, then use /contact-sales for rollout or requirements review.',
  },
]

export const securityResources: TrustResource[] = [
  {
    eyebrow: 'Procurement',
    title: 'Buyer starter pack',
    description: 'Reading order, due-diligence prompts, and review links.',
    href: '/docs/procurement-starter-pack',
  },
  {
    eyebrow: 'Operations',
    title: 'Operational status',
    description: 'Runtime and dependency health before security review.',
    href: '/status',
  },
  {
    eyebrow: 'Customers',
    title: 'Current fit',
    description: 'Who can evaluate Aethel today without inflated claims.',
    href: '/trust',
  },
  {
    eyebrow: 'Policy',
    title: 'Security policy',
    description: 'Disclosure, scope, and acknowledgment paths.',
    href: '/security-policy',
  },
]

export const securityActions: TrustAction[] = [
  { label: 'View public status', href: '/status', tone: 'primary' },
  { label: 'Procurement pack', href: '/docs/procurement-starter-pack' },
  { label: 'Security policy', href: '/security-policy' },
  { label: 'Read compliance', href: '/compliance' },
  { label: 'Talk to sales', href: '/contact-sales' },
]

import type { HelpCategory, HelpQuickLink } from './help-types'

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    name: 'Getting started',
    icon: 'zap',
    faqs: [
      {
        question: 'How do I create my first account?',
        answer: 'Open registration, create the account, and start from the guided first project.',
      },
      {
        question: 'Do I need to install anything?',
        answer: 'No. Aethel runs in the browser. Local tools are optional for heavier jobs.',
      },
      {
        question: 'Which languages are supported?',
        answer: 'The IDE supports common app languages. Agents inspect the repo before proposing changes.',
      },
      {
        question: 'Can I import existing projects?',
        answer: 'Yes. Import through GitHub or ZIP; Aethel detects the stack before setup.',
      },
    ],
  },
  {
    name: 'Plans and billing',
    icon: 'credit-card',
    faqs: [
      {
        question: 'What is the difference between plans?',
        answer: 'Plans vary by limits, AI usage, collaboration, deploy, and governance.',
      },
      {
        question: 'Do I need a credit card to start?',
        answer: 'No. The free plan lets you validate the core studio flow before upgrading.',
      },
      {
        question: 'How does billing work?',
        answer: 'Billing is monthly or annual. Plan changes happen in the billing portal.',
      },
      {
        question: 'What happens when I exceed quota?',
        answer: 'Aethel warns before limits. Write-heavy AI actions pause when quota is exhausted.',
      },
    ],
  },
  {
    name: 'Product features',
    icon: 'settings',
    faqs: [
      {
        question: 'How does Aethel AI work?',
        answer: 'Agents review the repo, propose changes, run checks, and show the result before you accept.',
      },
      {
        question: 'Is real-time collaboration available?',
        answer: 'Yes. Collaboration is available with plan-based limits. Advanced multiplayer stress tests and governance are reserved for higher tiers.',
      },
      {
        question: 'Can I integrate with CI/CD?',
        answer: 'Yes. Aethel integrates with GitHub workflows and compatible deployment providers. One-click deploy is guarded by status checks.',
      },
      {
        question: 'Is preview running in a real sandbox?',
        answer: 'Preview opens through one shared viewer. Managed sandbox execution is used when the runtime and token are configured.',
      },
    ],
  },
  {
    name: 'Security and privacy',
    icon: 'shield',
    faqs: [
      {
        question: 'Is my code safe in Aethel?',
        answer: 'Traffic is protected with TLS and enterprise controls are designed around audit logs, scope enforcement, and clear activity logs.',
      },
      {
        question: 'Does AI train on my code?',
        answer: 'No. Project content is only sent to a provider when you request an AI action, and it is not used to train models without explicit consent.',
      },
      {
        question: 'Do you have security certifications?',
        answer: 'Aethel is preparing formal SOC 2 materials. Public controls are published as they become reviewable.',
      },
      {
        question: 'Where is my data hosted?',
        answer: 'Workspace data can be operated in specific cloud regions for enterprise requirements. Region commitments are handled through the commercial process.',
      },
    ],
  },
  {
    name: 'Teams and collaboration',
    icon: 'users',
    faqs: [
      {
        question: 'How do I add teammates?',
        answer: 'Open workspace settings, invite people by email, and assign roles based on the access they need.',
      },
      {
        question: 'Which permission levels are available?',
        answer: 'Viewer, Editor, and Admin are available by default. Advanced RBAC and custom roles are available in higher tiers.',
      },
      {
        question: 'Can I have private and public projects?',
        answer: 'Yes. Project visibility and member access are controlled by the project owner or workspace admin.',
      },
      {
        question: 'Is billing seat-based?',
        answer: 'Most paid plans scale by seats plus usage. Exact details appear on the pricing page and in the billing portal.',
      },
    ],
  },
]

export const HELP_QUICK_LINKS: HelpQuickLink[] = [
  { href: '/docs', title: 'Documentation', description: 'Guides and technical reference', icon: 'book', tone: 'primary' },
  { href: '/docs/support', title: 'Support', description: 'Find the right support path', icon: 'message', tone: 'success' },
  { href: '/status', title: 'Status', description: 'Live service checks', icon: 'zap', tone: 'warning' },
  { href: '/docs/community', title: 'Community', description: 'Public GitHub and design-partner feedback', icon: 'users', tone: 'info' },
]

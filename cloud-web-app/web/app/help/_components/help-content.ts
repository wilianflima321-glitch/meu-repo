import type { HelpCategory, HelpQuickLink } from './help-types'

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    name: 'Getting started',
    icon: 'zap',
    faqs: [
      {
        question: 'How do I create my first account?',
        answer: 'Open the registration page and follow the guided flow. Signup takes only a few minutes and starts you with project templates that are safe to explore.',
      },
      {
        question: 'Do I need to install anything?',
        answer: 'No. Aethel runs in the browser. Optional local runtime tools are only used for heavier jobs when the user explicitly enables them.',
      },
      {
        question: 'Which languages are supported?',
        answer: 'The IDE supports JavaScript, TypeScript, Python, Java, C#, Go, Rust, PHP, and more. Agents inspect the repository before proposing changes.',
      },
      {
        question: 'Can I import existing projects?',
        answer: 'Yes. You can import projects through GitHub or ZIP upload. The workspace detects the stack and prepares the environment from project evidence.',
      },
    ],
  },
  {
    name: 'Plans and billing',
    icon: 'credit-card',
    faqs: [
      {
        question: 'What is the difference between plans?',
        answer: 'Plans vary by project limits, AI tokens, collaboration, preview runtime, RAG, deployment, and enterprise governance. The pricing page shows the current tiers.',
      },
      {
        question: 'Do I need a credit card to start?',
        answer: 'No. The free plan lets you validate the core studio flow before upgrading.',
      },
      {
        question: 'How does billing work?',
        answer: 'Billing is monthly or annual through Stripe when checkout is enabled. Plan changes and cancellation are handled through the customer portal.',
      },
      {
        question: 'What happens when I exceed quota?',
        answer: 'Aethel warns before limits are reached. When quota is exhausted, write-heavy AI actions are paused until the next cycle or an upgrade.',
      },
    ],
  },
  {
    name: 'Product features',
    icon: 'settings',
    faqs: [
      {
        question: 'How does Aethel AI work?',
        answer: 'Aethel uses specialized agents with scope locks, read receipts, evidence, tests, and rollback plans. A change is not treated as successful without proof.',
      },
      {
        question: 'Is real-time collaboration available?',
        answer: 'Yes. Collaboration is available with plan-based limits. Advanced multiplayer stress tests and governance are reserved for higher tiers.',
      },
      {
        question: 'Can I integrate with CI/CD?',
        answer: 'Yes. Aethel integrates with GitHub workflows and compatible deployment providers. One-click deploy is guarded by readiness checks.',
      },
      {
        question: 'Is preview running in a real sandbox?',
        answer: 'Preview is unified behind the canonical preview surface. Managed sandbox execution is used when the runtime and token are configured.',
      },
    ],
  },
  {
    name: 'Security and privacy',
    icon: 'shield',
    faqs: [
      {
        question: 'Is my code safe in Aethel?',
        answer: 'Traffic is protected with TLS and enterprise controls are designed around audit logs, scope enforcement, and explicit evidence trails.',
      },
      {
        question: 'Does AI train on my code?',
        answer: 'No. Project content is only sent to a provider when you request an AI action, and it is not used to train models without explicit consent.',
      },
      {
        question: 'Do you have security certifications?',
        answer: 'Aethel is preparing formal SOC 2 and compliance evidence. Public controls are published as they become reviewable.',
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
  { href: '/contact', title: 'Support', description: 'Talk to the Aethel team', icon: 'message', tone: 'success' },
  { href: '/status', title: 'Status', description: 'Public checks in real time', icon: 'zap', tone: 'warning' },
  { href: 'https://discord.gg/aethel', title: 'Community', description: 'Official Discord', icon: 'users', tone: 'info', external: true },
]

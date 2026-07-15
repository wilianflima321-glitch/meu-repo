export type DocLink = {
  title: string
  href: string
  summary: string
}

export type DocIcon = 'book' | 'code' | 'rocket' | 'layers' | 'terminal' | 'puzzle' | 'shield'

export type DocSection = {
  title: string
  description: string
  icon: DocIcon
  color: string
  bgColor: string
  href: string
  items: DocLink[]
}

export const DOC_SECTIONS: DocSection[] = [
  {
    title: 'Getting started',
    description: 'Official entry point for setup, the first project, and the Studio shell.',
    icon: 'rocket',
    color: 'text-[var(--aethel-success)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]',
    href: '/docs/getting-started',
    items: [
      {
        title: 'Start in Studio',
        href: '/docs/getting-started',
        summary: 'Initial flow for onboarding, runtime, and first value.',
      },
    ],
  },
  {
    title: 'API reference',
    description: 'Contracts for main routes, status checks, and public integrations.',
    icon: 'code',
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/api',
    items: [
      {
        title: 'Endpoints and contracts',
        href: '/docs/api',
        summary: 'Public API overview and the most important operational routes.',
      },
    ],
  },
  {
    title: 'Trust and buyers',
    description: 'Procurement starter pack, public trust center, and compliance posture with visible limits.',
    icon: 'shield',
    color: 'text-[var(--aethel-info-light)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/procurement-starter-pack',
    items: [
      {
        title: 'Procurement starter pack',
        href: '/docs/procurement-starter-pack',
        summary: 'Public reading order for due diligence, technical champions, and enterprise conversations.',
      },
      {
        title: 'Security trust center',
        href: '/security',
        summary: 'Separates what is live, partial, and planned without dressing up maturity.',
      },
      {
        title: 'Compare Aethel with the market',
        href: '/compare',
        summary: 'Honest comparison against Cursor, Windsurf, Replit, Vercel, Linear, and Notion.',
      },
      {
        title: 'Compliance overview',
        href: '/compliance',
        summary: 'Explains current controls, public limits, and what remains a target.',
      },
    ],
  },
  {
    title: 'IDE and agents',
    description: 'How editor, chat, preview, and operations share one focused flow.',
    icon: 'layers',
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/ide',
    items: [
      {
        title: 'Product editor',
        href: '/docs/ide',
        summary: 'Editor context, preview runtime, shell structure, and agent flow.',
      },
    ],
  },
  {
    title: 'Games',
    description: 'Current Games scope, supported paths, and gaps before maturity promotion.',
    icon: 'terminal',
    color: 'text-[var(--aethel-warning)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]',
    href: '/docs/games',
    items: [
      {
        title: 'Games module status',
        href: '/docs/games',
        summary: 'Current limits, runtime, and next steps before L3.',
      },
    ],
  },
  {
    title: 'Films',
    description: 'Timeline, story flow, and real Films roadmap with clear limits.',
    icon: 'puzzle',
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)]',
    href: '/docs/films',
    items: [
      {
        title: 'Films module status',
        href: '/docs/films',
        summary: 'How the film system is organized today and what still depends on external integrations.',
      },
    ],
  },
  {
    title: 'Operations and support',
    description: 'Public changes, support, and community loops for following product evolution.',
    icon: 'book',
    color: 'text-[var(--aethel-primary-light)]',
    bgColor: 'bg-[var(--aethel-primary)]/10',
    href: '/docs/support',
    items: [
      {
        title: 'Public changelog',
        href: '/docs/changelog',
        summary: 'Published releases and adjustments for tracking product deltas.',
      },
      {
        title: 'Support',
        href: '/docs/support',
        summary: 'Product support channels and flow.',
      },
      {
        title: 'Community',
        href: '/docs/community',
        summary: 'Public spaces and feedback loops.',
      },
    ],
  },
]

export const DOC_QUICK_LINKS: DocLink[] = [
  {
    title: 'First value in the dashboard',
    href: '/docs/getting-started',
    summary: 'How the Studio entry was organized to avoid an empty dashboard without context.',
  },
  {
    title: 'API and status',
    href: '/docs/api',
    summary: 'Where to inspect endpoints, health checks, and stable public contracts.',
  },
  {
    title: 'IDE and agents',
    href: '/docs/ide',
    summary: 'How chat, editor, and preview coexist in one product shell.',
  },
  {
    title: 'Procurement starter pack',
    href: '/docs/procurement-starter-pack',
    summary: 'How buyers can review security, compliance, and rollout using real public artifacts.',
  },
  {
    title: 'Market comparison',
    href: '/compare',
    summary: 'Helps buyers and technical champions understand where Aethel wins and where the market still leads.',
  },
  {
    title: 'Product changelog',
    href: '/docs/changelog',
    summary: 'Recent product receipts and shipped deltas without turning audits into false promises.',
  },
  {
    title: 'Games roadmap',
    href: '/docs/games',
    summary: 'Current Games module status without inflated claims.',
  },
  {
    title: 'Films roadmap',
    href: '/docs/films',
    summary: 'Real Films module scope and external dependencies.',
  },
  {
    title: 'Changelog and support',
    href: '/docs/changelog',
    summary: 'Where to follow recent changes and official support paths.',
  },
]

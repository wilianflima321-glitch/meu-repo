export type AdminSectionId = 'users' | 'billing' | 'ops' | 'security' | 'ai' | 'marketplace'

export type AdminSectionLink = {
  label: string
  href: string
  badge?: string
}

export type AdminConsolidatedSection = {
  id: AdminSectionId
  label: string
  href: string
  description: string
  primaryLinks: AdminSectionLink[]
  routes: string[]
}

export const ADMIN_CONSOLIDATED_SECTIONS: AdminConsolidatedSection[] = [
  {
    id: 'users',
    label: 'Users & Access',
    href: '/admin/users',
    description: 'Accounts, roles, onboarding, support, and human access reviews.',
    primaryLinks: [
      { label: 'Users', href: '/admin/users' },
      { label: 'Roles', href: '/admin/roles' },
      { label: 'Support', href: '/admin/support' },
      { label: 'Onboarding', href: '/admin/onboarding' },
    ],
    routes: ['/admin/users', '/admin/roles', '/admin/support', '/admin/onboarding'],
  },
  {
    id: 'billing',
    label: 'Billing & Revenue',
    href: '/admin/finance',
    description: 'Subscriptions, payments, churn, promotions, finance, and AI margin pressure.',
    primaryLinks: [
      { label: 'Finance', href: '/admin/finance', badge: 'MRR' },
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Subscriptions', href: '/admin/subscriptions' },
      { label: 'Cost Optimization', href: '/admin/cost-optimization' },
    ],
    routes: [
      '/admin/subscriptions',
      '/admin/payments',
      '/admin/arpu-churn',
      '/admin/finance',
      '/admin/promotions',
      '/admin/cost-optimization',
      '/admin/analytics',
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    href: '/admin/monitoring',
    description: 'Infrastructure, deploys, backups, realtime health, emergency mode, and scale posture.',
    primaryLinks: [
      { label: 'Monitoring', href: '/admin/monitoring' },
      { label: 'Infrastructure', href: '/admin/infrastructure' },
      { label: 'Deploys', href: '/admin/deploy' },
      { label: 'Emergency', href: '/admin/emergency', badge: 'Critical' },
    ],
    routes: [
      '/admin/monitoring',
      '/admin/deploy',
      '/admin/infrastructure',
      '/admin/scalability',
      '/admin/real-time',
      '/admin/emergency',
      '/admin/backup',
      '/admin/updates',
      '/admin/multi-tenancy',
    ],
  },
  {
    id: 'security',
    label: 'Security & Trust',
    href: '/admin/security',
    description: 'Audit logs, compliance posture, rate limits, moderation, IP licensing, and abuse controls.',
    primaryLinks: [
      { label: 'Security', href: '/admin/security' },
      { label: 'Audit Logs', href: '/admin/audit-logs' },
      { label: 'Compliance', href: '/admin/compliance' },
      { label: 'Rate Limits', href: '/admin/rate-limiting' },
    ],
    routes: [
      '/admin/audit-logs',
      '/admin/compliance',
      '/admin/rate-limiting',
      '/admin/bias-detection',
      '/admin/moderation',
      '/admin/ip-registry',
      '/admin/security',
    ],
  },
  {
    id: 'ai',
    label: 'AI Operations',
    href: '/admin/ai-monitor',
    description: 'Models, agents, training, indexing, automation, ledger health, and production AI readiness.',
    primaryLinks: [
      { label: 'AI Monitor', href: '/admin/ai-monitor', badge: 'Live' },
      { label: 'Agents', href: '/admin/ai-agents' },
      { label: 'Fine-tuning', href: '/admin/fine-tuning' },
      { label: 'Indexing', href: '/admin/indexing' },
    ],
    routes: [
      '/admin/ai',
      '/admin/ai-agents',
      '/admin/ai-enhancements',
      '/admin/ai-monitor',
      '/admin/ai-training',
      '/admin/ai-upgrades',
      '/admin/fine-tuning',
      '/admin/indexing',
      '/admin/automation',
    ],
  },
  {
    id: 'marketplace',
    label: 'Product Surfaces',
    href: '/admin/marketplace',
    description: 'Marketplace, feature flags, IDE settings, APIs, collaboration, notifications, and customer feedback.',
    primaryLinks: [
      { label: 'Marketplace', href: '/admin/marketplace' },
      { label: 'Feature Flags', href: '/admin/feature-flags' },
      { label: 'IDE Settings', href: '/admin/ide-settings' },
      { label: 'APIs', href: '/admin/apis' },
    ],
    routes: [
      '/admin/marketplace',
      '/admin/feature-flags',
      '/admin/ide-settings',
      '/admin/apis',
      '/admin/chat',
      '/admin/collaboration',
      '/admin/feedback',
      '/admin/notifications',
      '/admin/god-view',
    ],
  },
]

export function findAdminSectionForRoute(route: string): AdminConsolidatedSection | undefined {
  return ADMIN_CONSOLIDATED_SECTIONS.find((section) => section.routes.includes(route) || section.href === route)
}

export function getCoveredAdminRoutes(): string[] {
  return Array.from(new Set(ADMIN_CONSOLIDATED_SECTIONS.flatMap((section) => section.routes))).sort()
}

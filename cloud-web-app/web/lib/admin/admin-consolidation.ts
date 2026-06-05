export type AdminSectionId = 'people' | 'money' | 'ai' | 'platform' | 'trust' | 'product'
export type AdminRouteRiskLane = 'low' | 'medium' | 'high' | 'critical'
export type AdminEvidenceStatus = 'live' | 'review' | 'legacy-compatible'

export type AdminRouteOwnership = {
  owner: string
  intent: string
  riskLane: AdminRouteRiskLane
  evidenceStatus: AdminEvidenceStatus
}

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
  operatorQuestion: string
  owner: string
  intent: string
  riskLane: AdminRouteRiskLane
  evidenceStatus: AdminEvidenceStatus
  primaryLinks: AdminSectionLink[]
  routes: string[]
}

export const ADMIN_ROUTE_LABELS: Record<string, string> = {
  '/admin/ai': 'AI overview',
  '/admin/ai-agents': 'Agent fleet',
  '/admin/ai-enhancements': 'Enhancements',
  '/admin/ai-monitor': 'Live monitor',
  '/admin/ai-training': 'Training',
  '/admin/ai-upgrades': 'Upgrades',
  '/admin/analytics': 'Analytics',
  '/admin/apis': 'API posture',
  '/admin/arpu-churn': 'ARPU and churn',
  '/admin/audit-logs': 'Audit logs',
  '/admin/automation': 'Automation',
  '/admin/backup': 'Backups',
  '/admin/bias-detection': 'Bias review',
  '/admin/chat': 'Chat operations',
  '/admin/collaboration': 'Collaboration',
  '/admin/compliance': 'Compliance',
  '/admin/cost-optimization': 'Cost optimization',
  '/admin/deploy': 'Deploys',
  '/admin/emergency': 'Emergency mode',
  '/admin/feature-flags': 'Feature flags',
  '/admin/feedback': 'Feedback',
  '/admin/finance': 'Finance',
  '/admin/fine-tuning': 'Fine-tuning',
  '/admin/god-view': 'God view',
  '/admin/ide-settings': 'IDE settings',
  '/admin/indexing': 'Indexing',
  '/admin/infrastructure': 'Infrastructure',
  '/admin/ip-registry': 'IP registry',
  '/admin/marketplace': 'Marketplace',
  '/admin/moderation': 'Moderation',
  '/admin/monitoring': 'Monitoring',
  '/admin/multi-tenancy': 'Multi-tenancy',
  '/admin/notifications': 'Notifications',
  '/admin/onboarding': 'Onboarding',
  '/admin/payments': 'Payments',
  '/admin/promotions': 'Promotions',
  '/admin/rate-limiting': 'Rate limiting',
  '/admin/real-time': 'Realtime',
  '/admin/roles': 'Roles',
  '/admin/scalability': 'Scalability',
  '/admin/security': 'Security',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/support': 'Support',
  '/admin/updates': 'Updates',
  '/admin/users': 'Users',
}

export const ADMIN_LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  '/admin/god-view': '/admin/security?legacy=god-view',
  '/admin/ip-registry': '/admin/security?legacy=ip-registry',
  '/admin/ai-enhancements': '/admin/ai?legacy=ai-enhancements',
  '/admin/ai-upgrades': '/admin/ai?legacy=ai-upgrades',
  '/admin/arpu-churn': '/admin/finance?legacy=arpu-churn',
  '/admin/cost-optimization': '/admin/finance?legacy=cost-optimization',
  '/admin/multi-tenancy': '/admin/feature-flags?legacy=multi-tenancy',
  '/admin/rate-limiting': '/admin/security?legacy=rate-limiting',
  '/admin/real-time': '/admin/monitoring?legacy=real-time',
  '/admin/scalability': '/admin/monitoring?legacy=scalability',

  '/admin/feedback': '/admin/support?legacy=feedback',
  '/admin/onboarding': '/admin/users?legacy=onboarding',
  '/admin/analytics': '/admin/finance?legacy=analytics',
  '/admin/subscriptions': '/admin/finance?legacy=subscriptions',
  '/admin/promotions': '/admin/finance?legacy=promotions',
  '/admin/fine-tuning': '/admin/ai-training?legacy=fine-tuning',
  '/admin/bias-detection': '/admin/ai-monitor?legacy=bias-detection',
  '/admin/indexing': '/admin/ai?legacy=indexing',
  '/admin/automation': '/admin/ai?legacy=automation',
  '/admin/backup': '/admin/infrastructure?legacy=backup',
  '/admin/deploy': '/admin/infrastructure?legacy=deploy',
  '/admin/updates': '/admin/monitoring?legacy=updates',
  '/admin/chat': '/admin/collaboration?legacy=chat',
  '/admin/notifications': '/admin/feature-flags?legacy=notifications',
}

export function getAdminLegacyRedirectTarget(route: string): string | undefined {
  return ADMIN_LEGACY_ROUTE_REDIRECTS[route]
}

export function getAdminRouteNavigationHref(route: string): string {
  return getAdminLegacyRedirectTarget(route) || route
}

export const ADMIN_CONSOLIDATED_SECTIONS: AdminConsolidatedSection[] = [
  {
    id: 'people',
    label: 'People & Access',
    href: '/admin/users',
    description: 'Users, roles, onboarding, support, feedback, and workspace access reviews.',
    operatorQuestion: 'Who can access production surfaces, and what changed recently?',
    owner: 'People Ops',
    intent: 'Keep access, support, onboarding, and accountability in one operational lane.',
    riskLane: 'medium',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'Users', href: '/admin/users' },
      { label: 'Roles', href: '/admin/roles' },
      { label: 'Support', href: '/admin/support' },
    ],
    routes: [
      '/admin/users',
      '/admin/roles',
      '/admin/support',
      '/admin/feedback',
      '/admin/onboarding',
    ],
  },
  {
    id: 'money',
    label: 'Money',
    href: '/admin/finance',
    description: 'Revenue, payments, subscriptions, promotions, marketplace economics, and cost control.',
    operatorQuestion: 'Where is revenue moving, and what spend or churn needs action?',
    owner: 'Revenue Ops',
    intent: 'Turn billing, marketplace, subscriptions, churn, and spend into one board of truth.',
    riskLane: 'high',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'Finance', href: '/admin/finance', badge: 'MRR' },
      { label: 'Payments', href: '/admin/payments' },
      { label: 'Marketplace', href: '/admin/marketplace' },
    ],
    routes: [
      '/admin/finance',
      '/admin/payments',
      '/admin/subscriptions',
      '/admin/promotions',
      '/admin/arpu-churn',
      '/admin/marketplace',
      '/admin/cost-optimization',
      '/admin/analytics',
    ],
  },
  {
    id: 'ai',
    label: 'AI Operations',
    href: '/admin/ai',
    description: 'Agent fleet, model quality, training, fine-tuning, indexing, automation, and safety bias review.',
    operatorQuestion: 'Which agents are working, what did they cost, and where is quality drifting?',
    owner: 'AI Operations',
    intent: 'Govern agent work, model quality, training, cost, and safety from a single cockpit.',
    riskLane: 'high',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'AI overview', href: '/admin/ai' },
      { label: 'Agents', href: '/admin/ai-agents' },
      { label: 'Monitor', href: '/admin/ai-monitor', badge: 'Live' },
      { label: 'Training', href: '/admin/ai-training' },
    ],
    routes: [
      '/admin/ai',
      '/admin/ai-agents',
      '/admin/ai-enhancements',
      '/admin/ai-monitor',
      '/admin/ai-training',
      '/admin/ai-upgrades',
      '/admin/fine-tuning',
      '/admin/bias-detection',
      '/admin/indexing',
      '/admin/automation',
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    href: '/admin/monitoring',
    description: 'Infrastructure, observability, deploys, backups, realtime systems, API posture, and scale readiness.',
    operatorQuestion: 'Is the platform healthy enough to accept traffic and production writes?',
    owner: 'Platform Engineering',
    intent: 'Keep deploys, APIs, observability, backup, rate limits, realtime, and scale evidence together.',
    riskLane: 'critical',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'Monitoring', href: '/admin/monitoring' },
      { label: 'Infrastructure', href: '/admin/infrastructure' },
      { label: 'APIs', href: '/admin/apis' },
    ],
    routes: [
      '/admin/infrastructure',
      '/admin/monitoring',
      '/admin/scalability',
      '/admin/backup',
      '/admin/deploy',
      '/admin/updates',
      '/admin/rate-limiting',
      '/admin/apis',
      '/admin/real-time',
    ],
  },
  {
    id: 'trust',
    label: 'Trust & Safety',
    href: '/admin/security',
    description: 'Audit logs, compliance, security, moderation, emergency controls, IP registry, and governance views.',
    operatorQuestion: 'What risk needs containment before it becomes customer-visible?',
    owner: 'Trust & Safety',
    intent: 'Contain security, compliance, moderation, emergency, audit, and IP risk before it leaks to customers.',
    riskLane: 'critical',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'Security', href: '/admin/security' },
      { label: 'Compliance', href: '/admin/compliance' },
      { label: 'Moderation', href: '/admin/moderation' },
    ],
    routes: [
      '/admin/audit-logs',
      '/admin/compliance',
      '/admin/security',
      '/admin/moderation',
      '/admin/ip-registry',
      '/admin/emergency',
      '/admin/god-view',
    ],
  },
  {
    id: 'product',
    label: 'Product Surfaces',
    href: '/admin/feature-flags',
    description: 'Feature flags, chat, collaboration, IDE settings, notifications, multi-tenancy, and product operations.',
    operatorQuestion: 'Which product surfaces are shipping, gated, or creating support load?',
    owner: 'Product Ops',
    intent: 'Track flags, collaboration, chat, notifications, tenancy, and IDE surfaces without route sprawl.',
    riskLane: 'medium',
    evidenceStatus: 'live',
    primaryLinks: [
      { label: 'Feature flags', href: '/admin/feature-flags' },
      { label: 'Collaboration', href: '/admin/collaboration' },
      { label: 'IDE settings', href: '/admin/ide-settings' },
    ],
    routes: [
      '/admin/feature-flags',
      '/admin/chat',
      '/admin/collaboration',
      '/admin/ide-settings',
      '/admin/multi-tenancy',
      '/admin/notifications',
    ],
  },
]

export function findAdminSectionForRoute(route: string): AdminConsolidatedSection | undefined {
  return ADMIN_CONSOLIDATED_SECTIONS.find((section) => section.routes.includes(route) || section.href === route)
}

export function getAdminRouteLabel(route: string): string {
  return ADMIN_ROUTE_LABELS[route] || route.replace('/admin/', '').replace(/-/g, ' ')
}

export function getCoveredAdminRoutes(): string[] {
  return Array.from(new Set(ADMIN_CONSOLIDATED_SECTIONS.flatMap((section) => section.routes))).sort()
}

export function getAdminRouteCoverage() {
  const routes = getCoveredAdminRoutes()
  return {
    sections: ADMIN_CONSOLIDATED_SECTIONS.length,
    routes: routes.length,
    primaryLinks: ADMIN_CONSOLIDATED_SECTIONS.reduce((total, section) => total + section.primaryLinks.length, 0),
    criticalSections: ADMIN_CONSOLIDATED_SECTIONS.filter((section) => section.riskLane === 'critical').length,
    legacyCompatibleRoutes: routes.length,
  }
}

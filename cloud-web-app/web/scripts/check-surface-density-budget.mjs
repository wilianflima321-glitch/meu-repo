#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const PRODUCT_SURFACE_DIRS = ['app', 'components']
const DEPRECATED_SURFACE_TOKENS = [
  'GlassmorphismUI',
  'GlassCard',
  'GlassButton',
  'GlassInput',
  'AnimatedBadge',
  'variant="premium"',
  "variant='premium'",
  'variant="glow"',
  "variant='glow'",
  'variant="gradient"',
  "variant='gradient'",
]
const DEPRECATED_SURFACE_ALLOWLIST = new Set([
])
const CHECKS = [
  {
    id: 'dashboard-first-value-strip',
    file: 'components/dashboard/FirstValueGuide.tsx',
    required: ['data-first-value-strip', '<details', 'Setup details'],
    maxCards: 18,
  },
  {
    id: 'studio-runboard-shell',
    file: 'app/studio/page.tsx',
    required: [
      'SurfaceQualityShell',
      'Studio runboard',
      'Open editor',
      'Validate plan',
      '<details',
      'data-studio-surface-board="operator-density"',
    ],
    forbidden: ['bg-[linear-gradient', 'bg-[radial-gradient'],
    maxCards: 28,
  },
  {
    id: 'studio-mission-runboard',
    file: 'app/studio/StudioMissionControl.tsx',
    extraFiles: [
      'app/studio/StudioMissionControlView.tsx',
      'app/studio/StudioRunboardActions.tsx',
      'app/studio/StudioRuntimeTruthPanel.tsx',
    ],
    required: [
      'data-studio-mission-runboard="compact"',
      'Review receipts',
      'Validate plan',
      'Runtime state',
    ],
    forbidden: [
      'Run 3-agent wave',
      'Cloud held by capability',
      'Heavy runtime gated',
    ],
    maxCards: 24,
  },
  {
    id: 'admin-operations-board',
    file: 'components/admin/AdminCommandCenterSections.tsx',
    required: [
      'Operations board',
      'Compatibility map',
      'data-privacy="masked"',
    ],
    maxCards: 24,
  },
  {
    id: 'research-runboard',
    file: 'components/nexus/AethelResearch.tsx',
    required: [
      'Research runboard',
      'Review-first research package',
      'Open in IDE',
      'Copy prompt',
      'Take over',
      'data-research-control="takeover"',
    ],
    maxCards: 22,
  },
  {
    id: 'status-compact-trust-surface',
    file: 'app/status/_components/StatusPageClient.tsx',
    extraFiles: ['app/status/_components/StatusPageSections.tsx'],
    required: [
      'data-status-surface="compact"',
      'Operational truth.',
      'Trust grammar',
      'Current posture',
      'Public checks',
      'Notes and next actions',
    ],
    forbidden: [
      'radial-gradient',
      'blur-[',
      'Operational truth, not uptime theater.',
      'No optional surface',
      'mandatory surface',
    ],
    maxCards: 16,
  },
  {
    id: 'evidence-center-compact-release',
    file: 'components/evidence/EvidenceCenter.tsx',
    extraFiles: [
      'components/evidence/EvidenceCenter.parts.tsx',
      'components/evidence/EvidenceCenterReadySurface.tsx',
    ],
    required: [
      'data-evidence-center-surface="compact"',
      'Show review checks',
      'held for review',
      'Project receipts, blockers, review status',
    ],
    forbidden: [
      'bg-[linear-gradient',
      'Project Brain, Mission Ledger, graph readiness',
    ],
    maxCards: 44,
  },
  {
    id: 'studio-mobile-nav-compression',
    file: 'components/studio/StudioGlobalNav.tsx',
    required: [
      'hidden flex-wrap items-center gap-2 md:flex',
      'hidden overflow-x-auto pb-1 md:block',
      'Studio primary navigation',
    ],
    forbidden: ['Navegacao'],
    maxCards: 14,
  },
  {
    id: 'public-compare-compact-benchmark',
    file: 'app/compare/page.tsx',
    extraFiles: ['app/compare/CompareHero.tsx'],
    required: [
      'data-compare-hero="compact"',
      'The clean read by category.',
      'Details',
    ],
    forbidden: [
      'The goal is not to diminish',
      'Compare Aethel with the tools your team already takes seriously.',
    ],
    maxCards: 0,
  },
  {
    id: 'public-docs-search-first',
    file: 'app/docs/docs-content.tsx',
    required: [
      'data-docs-hero="search-first"',
      'Find the right guide. Then act.',
      'Procurement pack',
    ],
    forbidden: [
      'Quick access',
      'No inflated index full of ghost pages',
      'Find the live surface. Then act.',
    ],
    maxCards: 24,
  },
  {
    id: 'api-reference-compact-contract-map',
    file: 'app/docs/api/page.tsx',
    required: [
      'data-api-reference-surface="compact"',
      'API reference',
      'The public contract map',
      '<details',
    ],
    forbidden: [
      'Complete REST API documentation',
      'API Reference',
      'Readiness probe',
    ],
    maxCards: 18,
  },
  {
    id: 'auth-entry-compact-door',
    file: 'app/(auth)/login/login-v2.tsx',
    extraFiles: ['components/auth/AuthExperiencePanel.tsx'],
    required: [
      'data-auth-experience="compact"',
      'Resume your workspace with context intact.',
      'Passkey or magic link first.',
    ],
    forbidden: [
      'product door, not a billboard',
      'Guided, not noisy.',
      'bg-[linear-gradient',
      'radial-gradient',
    ],
    maxCards: 8,
  },
  {
    id: 'register-entry-compact-door',
    file: 'app/(auth)/register/register-v2.tsx',
    required: [
      'Create the workspace and open the first useful action.',
      'Project setup and onboarding stay connected.',
    ],
    forbidden: [
      'radial-gradient',
      'Registration should prepare the first useful action',
    ],
    maxCards: 8,
  },
  {
    id: 'pricing-hero-compact-fit-guide',
    file: 'app/pricing/_components/PricingHero.tsx',
    required: [
      'data-pricing-hero="compact"',
      'Simple plans for real work.',
      'Open plan fit guide',
    ],
    forbidden: [
      'Clear plans for builders and teams.',
      "['Studio', 'Editor', 'Status']",
    ],
    maxCards: 4,
  },
  {
    id: 'trust-center-progressive-disclosure',
    file: 'app/security/trust-center-shared.tsx',
    required: [
      'data-trust-center-surface="compact"',
      'Open posture notes',
      'Open controls',
      'Open answer',
    ],
    maxCards: 8,
  },
  {
    id: 'privacy-compact-legal',
    file: 'app/privacy/page.tsx',
    required: ['data-privacy-surface="compact"', 'Data use, plainly.'],
    maxCards: 0,
  },
  {
    id: 'contact-sales-compact-briefing',
    file: 'app/contact-sales/contact-sales-content.tsx',
    required: [
      'data-contact-sales-surface="compact"',
      '<ContactSalesHero />',
      '<ContactSalesAside />',
    ],
    forbidden: [
      'Talk with sales and design the right rollout',
      'How to write a better briefing',
      'Signals for the conversation',
      'bg-[linear-gradient',
      'radial-gradient',
      'blur-[',
    ],
    maxCards: 2,
  },
  {
    id: 'contact-sales-disclosure-copy',
    file: 'app/contact-sales/contact-sales.parts.tsx',
    required: [
      'Design the right enterprise rollout.',
      'Next step',
      'Procurement pack',
      'Public status',
    ],
    forbidden: [
      'Talk with sales and design the right rollout',
      'How to write a better briefing',
      'Signals for the conversation',
      'Signals and buyer FAQ',
      'Recommended starter pack',
      'bg-[linear-gradient',
      'radial-gradient',
      'blur-[',
    ],
    maxCards: 4,
  },

  {
    id: 'marketplace-review-hero',
    file: 'app/marketplace/MarketplaceHero.tsx',
    required: ['Review before install.', 'Review policy'],
    forbidden: [
      'Install capabilities with permissions, provenance, and risk visible first.',
    ],
    maxCards: 0,
  },
  {
    id: 'marketplace-review-card-disclosure',
    file: 'app/marketplace/MarketplaceCard.tsx',
    required: ['Review permissions and provenance'],
    forbidden: ['Internal preview', 'Telemetry pending'],
    maxCards: 0,
  },
  {
    id: 'docs-directory-compact-index',
    file: 'app/docs/docs-directory-client.tsx',
    required: [
      'data-docs-directory="compact"',
      'Useful now',
      'No placeholders',
    ],
    forbidden: [
      'Most useful reads right now',
      'Short links to the pages that actually exist today.',
      'public sections organized for onboarding',
    ],
    maxCards: 4,
  },
  {
    id: 'docs-resource-progressive-disclosure',
    file: 'app/docs/docs-resource-page.tsx',
    required: [
      'data-docs-resource-surface="compact"',
      'Open details',
      'Open callout details',
    ],
    forbidden: ['bg-[linear-gradient', 'bg-[radial-gradient', 'blur-['],
    maxCards: 24,
  },
  {
    id: 'docs-support-compact-help',
    file: 'app/docs/support/page.tsx',
    required: [
      'data-docs-support-surface="compact"',
      'Get help fast.',
      'Open request checklist',
    ],
    forbidden: [
      'Ask for help without landing in the wrong queue',
      'bg-[linear-gradient',
      'bg-[radial-gradient',
      'blur-[',
    ],
    maxCards: 0,
  },
  {
    id: 'docs-community-compact-proof',
    file: 'app/docs/community/page.tsx',
    required: [
      'data-docs-community-surface="compact"',
      'Community, sized honestly.',
      'Open community limits',
    ],
    forbidden: [
      'The community we have today, and the one we will not pretend to have.',
      'bg-[linear-gradient',
      'bg-[radial-gradient',
      'blur-[',
    ],
    maxCards: 4,
  },
  {
    id: 'docs-changelog-compact-proof',
    file: 'app/docs/changelog/page.tsx',
    required: [
      'data-docs-changelog-surface="compact"',
      'Recent product receipts.',
      'Open shipped details',
    ],
    forbidden: [
      'What actually changed in the product recently',
      'bg-[linear-gradient',
      'bg-[radial-gradient',
      'blur-[',
    ],
    maxCards: 0,
  },
  {
    id: 'reset-password-compact-recovery',
    file: 'app/reset-password/reset-password-content.tsx',
    required: ['data-reset-password-surface="compact"', 'Reset password'],
    forbidden: ['bg-gradient-to-br', 'blur-['],
    maxCards: 4,
  },
  {
    id: 'help-community-claim-consistency',
    file: 'app/help/_components/help-content.ts',
    extraFiles: [
      'app/help/_components/HelpPageClient.tsx',
      'app/help/_components/HelpFaqSections.tsx',
      'app/help/_components/HelpQuickLinks.tsx',
      'app/help/page.tsx',
    ],
    required: [
      '/docs/community',
      'Community notes',
      'Public GitHub and design-partner feedback',
    ],
    forbidden: [
      'discord.gg/aethel',
      'Official Discord',
      'email or community',
      'blur-[',
      'border-slate-',
      'bg-slate-',
      'text-sky-',
      'border-sky-',
      'text-emerald-',
      'border-emerald-',
      'text-cyan-',
      'border-cyan-',
      'text-amber-',
      'border-amber-',
      'min-h-32',
    ],
    maxCards: 0,
  },
  {
    id: 'login-return-destination-context',
    file: 'app/(auth)/login/login-v2.tsx',
    required: [
      "searchParams.get('from')",
      'window.location.assign(nextTarget)',
      'More sign-in options',
    ],
    forbidden: ['radial-gradient', 'bg-[linear-gradient'],
    maxCards: 8,
  },
  {
    id: 'forgot-password-compact-recovery',
    file: 'app/forgot-password/forgot-password-content.tsx',
    required: [
      'data-forgot-password-surface="compact"',
      'Forgot your password?',
    ],
    forbidden: ['bg-[linear-gradient', 'bg-gradient-to', 'blur-['],
    maxCards: 4,
  },
  {
    id: 'verify-email-compact-recovery',
    file: 'app/verify-email/verify-email-content.tsx',
    required: ['data-verify-email-surface="compact"', 'Verifying email'],
    forbidden: ['bg-[linear-gradient', 'bg-gradient-to', 'blur-['],
    maxCards: 4,
  },
  {
    id: 'terms-compact-legal',
    file: 'app/terms/page.tsx',
    required: [
      'data-terms-surface="compact"',
      'Open terms',
      'Open acceptable-use rules',
    ],
    forbidden: ['bg-[linear-gradient', 'bg-[radial-gradient', 'blur-['],
    maxCards: 4,
  },

  {
    id: 'download-compact-runtime-proof',
    file: 'app/download/page.tsx',
    extraFiles: ['app/download/download-page.parts.tsx'],
    required: [
      'Desktop beta',
      'Desktop safety details',
      'Desktop beta first. Signed installers next.',
    ],
    forbidden: [
      'bg-[linear-gradient',
      'bg-[radial-gradient',
      'blur-[',
      'Depth options',
      'Large projects',
      'Heavy handoff',
    ],
    maxCards: 4,
  },
  {
    id: 'procurement-compact-buyer-pack',
    file: 'app/docs/procurement-starter-pack/page.tsx',
    extraFiles: [
      'app/docs/procurement-starter-pack/procurement-starter-pack.parts.tsx',
    ],
    required: [
      'data-procurement-surface="compact"',
      'Open step details',
      'Open buyer questions',
    ],
    forbidden: ['bg-[linear-gradient', 'bg-[radial-gradient', 'blur-['],
    maxCards: 0,
  },
]

const CRITICAL_PUBLIC_ROUTE_BOUNDARIES = [
  '(auth)',
  'compare',
  'contact-sales',
  'docs',
  'download',
  'evidence',
  'forgot-password',
  'help',
  'privacy',
  'reset-password',
  'security',
  'status',
  'terms',
  'verify-email',
]

const failures = []

function collectTsxFiles(dir) {
  const abs = path.join(ROOT, dir)
  if (!fs.existsSync(abs)) return []
  const entries = fs.readdirSync(abs, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectTsxFiles(rel)
    return entry.isFile() && rel.endsWith('.tsx') ? [rel] : []
  })
}

for (const check of CHECKS) {
  const abs = path.join(ROOT, check.file)
  if (!fs.existsSync(abs)) {
    failures.push(`${check.id}: missing ${check.file}`)
    continue
  }
  const extraContent = (check.extraFiles ?? [])
    .map((file) => {
      const extraAbs = path.join(ROOT, file)
      return fs.existsSync(extraAbs) ? fs.readFileSync(extraAbs, 'utf8') : ''
    })
    .join('\n')
  const content = `${fs.readFileSync(abs, 'utf8')}\n${extraContent}`
  const missing = check.required.filter((token) => !content.includes(token))
  if (missing.length > 0)
    failures.push(`${check.id}: missing ${missing.join(', ')}`)
  const forbidden = (check.forbidden ?? []).filter((token) =>
    content.includes(token),
  )
  if (forbidden.length > 0)
    failures.push(`${check.id}: forbidden ${forbidden.join(', ')}`)
  if (typeof check.maxCards === 'number') {
    const cardCount = (
      content.match(/rounded-\[|rounded-xl|rounded-2xl|rounded-\(?/g) ?? []
    ).length
    if (cardCount > check.maxCards)
      failures.push(
        `${check.id}: visual-card markers ${cardCount} > ${check.maxCards}`,
      )
  }
}

for (const file of PRODUCT_SURFACE_DIRS.flatMap(collectTsxFiles)) {
  const normalized = file.replace(/\\/g, '/')
  if (DEPRECATED_SURFACE_ALLOWLIST.has(normalized)) continue
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
  const deprecated = DEPRECATED_SURFACE_TOKENS.filter((token) =>
    content.includes(token),
  )
  if (deprecated.length > 0) {
    failures.push(
      `deprecated-product-surface-style: ${normalized} uses ${deprecated.join(', ')}`,
    )
  }
}

for (const route of CRITICAL_PUBLIC_ROUTE_BOUNDARIES) {
  for (const boundary of ['loading.tsx', 'error.tsx']) {
    const file = path.join('app', route, boundary)
    const abs = path.join(ROOT, file)
    if (!fs.existsSync(abs)) {
      failures.push(`critical-public-route-boundary: missing ${file}`)
      continue
    }
    const content = fs.readFileSync(abs, 'utf8')
    const expected = boundary === 'loading.tsx' ? 'RouteLoading' : 'RouteError'
    if (!content.includes(expected)) {
      failures.push(
        `critical-public-route-boundary: ${file} must use ${expected}`,
      )
    }
  }
}

if (failures.length > 0) {
  console.error(`[surface-density-budget] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[surface-density-budget] PASS checks=${CHECKS.length}`)

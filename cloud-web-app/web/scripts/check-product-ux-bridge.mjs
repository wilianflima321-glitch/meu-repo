#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, '.next', 'aethel-audits')
const REPORT_PATH = path.join(OUT_DIR, 'PRODUCT_UX_BRIDGE_REPORT.md')
const JSON_PATH = path.join(OUT_DIR, 'product-ux-bridge.json')

const REQUIRED_QA_SCRIPTS = [
  'qa:ux-market-standard',
  'qa:surface-density-budget',
  'qa:public-first-fold-budget',
  'qa:navigation-compression',
  'qa:preview-surface-canonical',
  'qa:firebase-like-journey',
  'qa:product-screenshot-evidence',
]

const SURFACES = [
  {
    id: 'marketplace-filters',
    file: 'app/marketplace/MarketplaceFilters.tsx',
    expectations: ['<details', 'Category filters', 'trustFilter'],
    forbiddenBeforeDetails: ['<select'],
    why: 'Marketplace should open like v0: search first, filters on demand.',
  },
  {
    id: 'download-release-details',
    file: 'app/download/download-page.parts.tsx',
    expectations: ['Open release details'],
    why: 'Download must present one primary action, with runtime details collapsed.',
  },
  {
    id: 'pricing-plan-fit-guide',
    file: 'app/pricing/_components/PricingHero.tsx',
    expectations: ['Open plan fit guide'],
    why: 'Pricing should sell the plan first, not expose internal readiness text first.',
  },

  {
    id: 'auth-context-disclosures',
    file: 'components/auth/AuthExperiencePanel.tsx',
    expectations: ['Workspace context', 'Session signals'],
    why: 'Auth should feel premium, not like a technical dashboard.',
  },
  {
    id: 'viewport-clean-toolbar',
    file: 'components/viewport/ViewportTopToolbar.tsx',
    expectations: ['<details'],
    forbidden: ['gizmoSummary.chips'],
    why: 'Viewport chrome should keep editing tools close, with advanced context hidden.',
  },
  {
    id: 'evidence-center-refactor-candidate',
    file: 'components/evidence/EvidenceCenter.tsx',
    expectations: ['EvidenceCenter'],
    warningOnly: true,
    why: 'Evidence is valuable but still dense; split into Summary, Timeline, Graph, Receipts.',
  },
  {
    id: 'ai-chat-header-refactor-candidate',
    file: 'components/ai-chat/AIChatHeader.tsx',
    expectations: ['AIChatHeader'],
    warningOnly: true,
    why: 'Copilot header should stay compact: mode, model, one primary action, overflow for the rest.',
  },
  {
    id: 'ide-workspace-first-preview',
    file: 'components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx',
    expectations: [
      'data-workspace-runtime-preview="workspace-first"',
      'WorkspaceRuntimePreview',
      'previewRuntimeUrl && !forceInlinePreviewFallback',
    ],
    why: 'Generated workspaces should render the live preview even before a file is selected.',
  },
]

const SCREENSHOT_EVIDENCE = [
  'public/screenshots/dashboard.png',
  'public/screenshots/editor.png',
  'public/screenshots/mobile.png',
  'public/product-proof/studio-home.png',
  'public/product-proof/studio-home.webp',
]

const JARGON_PATTERN =
  /\b(readiness|surface|cockpit|capabilityStatus|capability|missionLedger|ledger|Cloud held|Cloud Stream|Studio Local|runtime|evidence)\b/gi

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!existsSync(absolutePath)) return null
  return readFileSync(absolutePath, 'utf8')
}

function walkFiles(dir, predicate, output = []) {
  if (!existsSync(dir)) return output
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walkFiles(fullPath, predicate, output)
    } else if (predicate(fullPath)) {
      output.push(fullPath)
    }
  }
  return output
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length
}

function surfaceMetrics(relativePath, content) {
  return {
    file: relativePath,
    lines: content.split('\n').length,
    details: countMatches(content, /<details/g),
    buttons: countMatches(content, /<button|<Button/g),
    links: countMatches(content, /<Link|<a\b/g),
    selects: countMatches(content, /<select/g),
    jargon: countMatches(content, JARGON_PATTERN),
  }
}

const failures = []
const warnings = []

const packageJson = JSON.parse(readText('package.json') ?? '{}')
const scripts = packageJson.scripts ?? {}
for (const scriptName of REQUIRED_QA_SCRIPTS) {
  if (!scripts[scriptName]) failures.push(`Missing package script: ${scriptName}`)
}

const surfaceResults = SURFACES.map((surface) => {
  const content = readText(surface.file)
  if (!content) {
    const message = `Missing surface file: ${surface.file}`
    if (surface.warningOnly) warnings.push(message)
    else failures.push(message)
    return { ...surface, missing: true }
  }

  const missingTokens = (surface.expectations ?? []).filter(
    (token) => !content.includes(token),
  )
  const forbiddenTokens = (surface.forbidden ?? []).filter((token) =>
    content.includes(token),
  )
  const beforeDetails = content.split('<details')[0] ?? content
  const forbiddenBeforeDetails = (surface.forbiddenBeforeDetails ?? []).filter(
    (token) => beforeDetails.includes(token),
  )

  for (const token of missingTokens) {
    const message = `${surface.id}: expected token "${token}" in ${surface.file}`
    if (surface.warningOnly) warnings.push(message)
    else failures.push(message)
  }
  for (const token of forbiddenTokens) {
    const message = `${surface.id}: forbidden token "${token}" in ${surface.file}`
    if (surface.warningOnly) warnings.push(message)
    else failures.push(message)
  }
  for (const token of forbiddenBeforeDetails) {
    const message = `${surface.id}: "${token}" appears before disclosure in ${surface.file}`
    if (surface.warningOnly) warnings.push(message)
    else failures.push(message)
  }

  const metrics = surfaceMetrics(surface.file, content)
  if (metrics.jargon >= 25) {
    warnings.push(
      `${surface.id}: high jargon count (${metrics.jargon}) in ${surface.file}`,
    )
  }

  return {
    ...surface,
    metrics,
    missingTokens,
    forbiddenTokens,
    forbiddenBeforeDetails,
  }
})

const pageFiles = walkFiles(path.join(ROOT, 'app'), (file) =>
  file.endsWith(`${path.sep}page.tsx`),
)
const relativePageFiles = pageFiles.map((file) =>
  path.relative(ROOT, file).replaceAll(path.sep, '/'),
)
const routeMetrics = {
  totalPages: relativePageFiles.length,
  adminPages: relativePageFiles.filter((file) => file.startsWith('app/admin/'))
    .length,
  studioPages: relativePageFiles.filter((file) => file.startsWith('app/studio/'))
    .length,
}

const screenshotResults = SCREENSHOT_EVIDENCE.map((relativePath) => {
  const absolutePath = path.join(ROOT, relativePath)
  if (!existsSync(absolutePath)) {
    return { file: relativePath, exists: false, sizeKb: 0 }
  }
  const stats = statSync(absolutePath)
  return {
    file: relativePath,
    exists: true,
    sizeKb: Math.round(stats.size / 1024),
  }
})

const nextCuts = [
  'Split EvidenceCenter into Summary, Timeline, Graph, and Receipts without changing data contracts.',
  'Keep Marketplace search visible and filters collapsed; add thumbnails only when real assets exist.',
  'Compress AIChatHeader to mode, model, one primary action, and overflow for voice/tools/cost/history.',
  'Keep Studio and Admin physical routes for compatibility, but show only 5 Studio groups and 6 Admin areas.',
  'Run authenticated screenshots after each visual cut; screenshots must show real product, not logos.',
]

const report = [
  '# Product UX Bridge Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Route Load',
  '',
  `- Total App Router pages: ${routeMetrics.totalPages}`,
  `- Admin physical pages: ${routeMetrics.adminPages}`,
  `- Studio physical pages: ${routeMetrics.studioPages}`,
  '',
  '## Surface Checks',
  '',
  ...surfaceResults.flatMap((result) => {
    const status = result.missing
      ? 'missing'
      : result.missingTokens?.length ||
          result.forbiddenTokens?.length ||
          result.forbiddenBeforeDetails?.length
        ? 'needs-work'
        : result.warningOnly
          ? 'watch'
          : 'pass'
    const metrics = result.metrics
      ? `lines=${result.metrics.lines}, details=${result.metrics.details}, buttons=${result.metrics.buttons}, links=${result.metrics.links}, selects=${result.metrics.selects}, jargon=${result.metrics.jargon}`
      : 'no metrics'
    return [
      `- ${status}: ${result.id} (${result.file})`,
      `  - ${metrics}`,
      `  - ${result.why}`,
    ]
  }),
  '',
  '## Screenshot Evidence',
  '',
  ...screenshotResults.map((shot) =>
    shot.exists
      ? `- present: ${shot.file} (${shot.sizeKb} KB)`
      : `- missing: ${shot.file}`,
  ),
  '',
  '## Next Safe Cuts',
  '',
  ...nextCuts.map((item) => `- ${item}`),
  '',
  '## Gate Result',
  '',
  failures.length
    ? `FAILED with ${failures.length} issue(s).`
    : 'PASS: bridge checks are aligned.',
  '',
  ...failures.map((failure) => `- FAIL: ${failure}`),
  ...warnings.map((warning) => `- WARN: ${warning}`),
  '',
].join('\n')

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(REPORT_PATH, report)
writeFileSync(
  JSON_PATH,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      routeMetrics,
      surfaceResults,
      screenshotResults,
      failures,
      warnings,
      nextCuts,
    },
    null,
    2,
  )}\n`,
)

if (failures.length) {
  console.error(
    `[product-ux-bridge] FAIL ${failures.length} issue(s). report=${path.relative(
      ROOT,
      REPORT_PATH,
    )}`,
  )
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[product-ux-bridge] PASS report=${path.relative(
    ROOT,
    REPORT_PATH,
  )} pages=${routeMetrics.totalPages} surfaces=${surfaceResults.length} warnings=${warnings.length}`,
)

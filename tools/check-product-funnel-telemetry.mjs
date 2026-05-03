#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const args = new Set(process.argv.slice(2))
const jsonOutput = args.has('--json')
const checks = []

function fullPath(file) {
  return path.join(ROOT, file)
}

function exists(file) {
  return fs.existsSync(fullPath(file))
}

function read(file) {
  return exists(file) ? fs.readFileSync(fullPath(file), 'utf8') : ''
}

function has(file, marker) {
  const content = read(file)
  return marker instanceof RegExp ? marker.test(content) : content.includes(marker)
}

function addCheck(id, label, pass, evidence = '') {
  checks.push({ id, label, pass: Boolean(pass), evidence })
}

const telemetryContracts = [
  {
    id: 'root-telemetry-mounted',
    label: 'Root layout mounts ProductTelemetry once for route-level page load capture',
    markers: [
      ['cloud-web-app/web/app/layout.tsx', 'ProductTelemetry'],
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', "analytics?.track('performance', 'page_load'"],
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', 'getRouteSurface'],
    ],
  },
  {
    id: 'delegated-cta-telemetry',
    label: 'ProductTelemetry captures delegated CTA clicks without adding handlers to every link',
    markers: [
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', 'TRACKABLE_SELECTOR'],
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', 'data-analytics-action'],
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', 'document.addEventListener'],
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', 'data-analytics-category'],
    ],
  },
  {
    id: 'public-header-funnel-anchors',
    label: 'Public header exposes measurable top-funnel navigation and conversion intent',
    markers: [
      ['cloud-web-app/web/components/ui/PublicHeader.tsx', 'data-analytics-action="cta_click"'],
      ['cloud-web-app/web/components/ui/PublicHeader.tsx', 'data-analytics-action="auth_intent"'],
      ['cloud-web-app/web/components/ui/PublicHeader.tsx', 'data-analytics-action="onboarding_start"'],
      ['cloud-web-app/web/components/ui/PublicHeader.tsx', 'data-analytics-action="contact_sales_start"'],
    ],
  },
  {
    id: 'landing-mission-funnel',
    label: 'Landing mission intake tracks submit, handoff, onboarding, and real workspace creation',
    markers: [
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', "'mission_submit'"],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', "'mission_handoff'"],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', "'workspace_create'"],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', "'onboarding_start'"],
    ],
  },
  {
    id: 'pricing-funnel',
    label: 'Pricing page tracks views, billing-cycle changes, checkout intent, and sales intent',
    markers: [
      ['cloud-web-app/web/components/telemetry/ProductTelemetry.tsx', "'pricing_view'"],
      ['cloud-web-app/web/app/pricing/page.tsx', "'pricing_cycle_change'"],
      ['cloud-web-app/web/app/pricing/page.tsx', "data-analytics-action={plan.id === 'free' ? 'onboarding_start' : 'checkout_start'}"],
      ['cloud-web-app/web/app/pricing/page.tsx', 'data-analytics-action="contact_sales_start"'],
    ],
  },
  {
    id: 'auth-funnel',
    label: 'Auth surfaces track successful login/register and OAuth provider starts',
    markers: [
      ['cloud-web-app/web/app/(auth)/login/login-v2.tsx', "'oauth_start'"],
      ['cloud-web-app/web/app/(auth)/login/login-v2.tsx', "'login'"],
      ['cloud-web-app/web/app/(auth)/register/register-v2.tsx', "'oauth_start'"],
      ['cloud-web-app/web/app/(auth)/register/register-v2.tsx', "'register'"],
    ],
  },
  {
    id: 'deploy-funnel',
    label: 'Deploy button tracks click, accepted deployment, and failure paths',
    markers: [
      ['cloud-web-app/web/components/deploy/DeployButton.tsx', "'deploy_click'"],
      ['cloud-web-app/web/components/deploy/DeployButton.tsx', "'deploy_success'"],
      ['cloud-web-app/web/components/deploy/DeployButton.tsx', "'deploy_failure'"],
    ],
  },
  {
    id: 'analytics-schema-accepts-funnel-actions',
    label: 'Analytics action union includes the commercial funnel actions used by UI surfaces',
    markers: [
      ['cloud-web-app/web/lib/analytics.ts', "| 'mission_submit'"],
      ['cloud-web-app/web/lib/analytics.ts', "| 'pricing_view'"],
      ['cloud-web-app/web/lib/analytics.ts', "| 'oauth_start'"],
      ['cloud-web-app/web/lib/analytics.ts', "| 'deploy_success'"],
      ['cloud-web-app/web/lib/analytics.ts', "| 'contact_sales_start'"],
    ],
  },
  {
    id: 'analytics-batch-no-console',
    label: 'Analytics persistence route uses structured logger instead of console error',
    markers: [
      ['cloud-web-app/web/app/api/analytics/batch/route.ts', 'createComponentLogger'],
      ['cloud-web-app/web/app/api/analytics/batch/route.ts', 'routeLogger.error'],
    ],
    banned: [
      ['cloud-web-app/web/app/api/analytics/batch/route.ts', /console\.error\(/],
    ],
  },
]

for (const contract of telemetryContracts) {
  const missing = contract.markers.filter(([file, marker]) => !has(file, marker))
  const banned = (contract.banned || []).filter(([file, marker]) => has(file, marker))
  addCheck(
    contract.id,
    contract.label,
    missing.length === 0 && banned.length === 0,
    [
      ...missing.map(([file, marker]) => `missing: ${file} -> ${marker}`),
      ...banned.map(([file, marker]) => `banned: ${file} -> ${marker}`),
    ].join('; ')
  )
}

const analyticsCalls = [
  'cloud-web-app/web/app/landing-v3-mission-box.tsx',
  'cloud-web-app/web/app/(auth)/login/login-v2.tsx',
  'cloud-web-app/web/app/(auth)/register/register-v2.tsx',
  'cloud-web-app/web/app/pricing/page.tsx',
  'cloud-web-app/web/components/deploy/DeployButton.tsx',
  'cloud-web-app/web/components/telemetry/ProductTelemetry.tsx',
].reduce((count, file) => {
  const matches = read(file).match(/analytics\?\.track/g)
  return count + (matches?.length ?? 0)
}, 0)

addCheck(
  'analytics-call-density',
  'Critical funnel surfaces contain at least 14 real analytics.track calls',
  analyticsCalls >= 14,
  `${analyticsCalls} calls found`
)

const packageJson = read('package.json')
addCheck(
  'package-script-wired',
  'Root QA includes product funnel telemetry gate in product quality progress',
  packageJson.includes('qa:product-funnel-telemetry') && packageJson.includes('check-product-funnel-telemetry.mjs'),
  'package.json scripts'
)

const failures = checks.filter((check) => !check.pass)
const result = {
  generatedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  analyticsCalls,
  checks,
}

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else {
  console.log('=== AETHEL PRODUCT FUNNEL TELEMETRY ===')
  console.log(`Generated: ${result.generatedAt}`)
  console.log(`Checks: ${result.passed}/${result.total}`)
  console.log(`Analytics calls: ${analyticsCalls}`)
  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.id} - ${check.label}`)
    if (!check.pass && check.evidence) {
      console.log(`  ${check.evidence}`)
    }
  }
}

if (failures.length > 0) {
  process.exit(1)
}

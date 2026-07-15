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

const contracts = [
  {
    id: 'canonical-free-plan',
    label: 'Canonical plans expose a real no-card Free tier with useful first-value limits',
    markers: [
      ['cloud-web-app/web/lib/plans.ts', "id: 'free'"],
      ['cloud-web-app/web/lib/plans.ts', '100_000'],
      ['cloud-web-app/web/lib/plans.ts', 'projects: 10'],
      ['cloud-web-app/web/lib/plans.ts', 'cardRequired: false'],
      ['cloud-web-app/web/lib/plans.ts', 'isPlanId'],
    ],
  },
  {
    id: 'entitlements-free-fallback',
    label: 'Entitlements never hard-paywall the core app after an expired or missing paid subscription',
    markers: [
      ['cloud-web-app/web/lib/entitlements.ts', "source: 'subscription' | 'trial' | 'free'"],
      ['cloud-web-app/web/lib/entitlements.ts', 'trialEndsAt'],
      ['cloud-web-app/web/lib/entitlements.ts', '14 * 24 * 60 * 60 * 1000'],
      ['cloud-web-app/web/lib/entitlements.ts', "requirePlan('free')"],
      ['cloud-web-app/web/lib/entitlements.ts', 'return freeEntitlement()'],
    ],
    banned: [
      ['cloud-web-app/web/lib/entitlements.ts', /PAYMENT_REQUIRED/],
      ['cloud-web-app/web/lib/entitlements.ts', /TRIAL_EXPIRED/],
    ],
  },
  {
    id: 'register-trial-14-days',
    label: 'Register creates a factual 14-day Starter trial and avoids any/console drift',
    markers: [
      ['cloud-web-app/web/app/api/auth/register/route.ts', 'trialEndsAt'],
      ['cloud-web-app/web/app/api/auth/register/route.ts', '14 * 24 * 60 * 60 * 1000'],
      ['cloud-web-app/web/app/api/auth/register/route.ts', 'createComponentLogger'],
      ['cloud-web-app/web/app/api/auth/register/route.ts', 'routeLogger.error'],
    ],
    banned: [
      ['cloud-web-app/web/app/api/auth/register/route.ts', /console\.error\(/],
      ['cloud-web-app/web/app/api/auth/register/route.ts', /\(user as any\)/],
    ],
  },
  {
    id: 'runtime-plan-limits-free',
    label: 'Runtime quota service understands Free limits instead of falling through to Starter trial',
    markers: [
      ['cloud-web-app/web/lib/plan-limits.ts', "'free':"],
      ['cloud-web-app/web/lib/plan-limits.ts', 'tokensPerMonth: 100_000'],
      ['cloud-web-app/web/lib/plan-limits.ts', 'requestsPerDay: 100'],
      ['cloud-web-app/web/lib/plan-limits.ts', "PLAN_LIMITS['free']"],
    ],
  },
  {
    id: 'billing-usage-normalizes-trial-to-free-capable-plan',
    label: 'Billing usage uses canonical getPlanById normalization and no console error',
    markers: [
      ['cloud-web-app/web/app/api/billing/usage/route.ts', 'getPlanById'],
      ['cloud-web-app/web/app/api/billing/usage/route.ts', "String(user.plan || 'free').replace('_trial', '')"],
      ['cloud-web-app/web/app/api/billing/usage/route.ts', "getPlanById('free')"],
      ['cloud-web-app/web/app/api/billing/usage/route.ts', 'routeLogger.error'],
    ],
    banned: [
      ['cloud-web-app/web/app/api/billing/usage/route.ts', /console\.error\(/],
      ['cloud-web-app/web/app/api/billing/usage/route.ts', /PLANS\.find/],
    ],
  },
  {
    id: 'asset-policies-free-aware',
    label: 'Asset intake/source policies explicitly support Free as a stricter trust lane',
    markers: [
      ['cloud-web-app/web/lib/server/asset-source-policy.ts', "'subscription' | 'trial' | 'free'"],
      ['cloud-web-app/web/lib/server/asset-source-policy.ts', "case 'free':"],
      ['cloud-web-app/web/lib/server/asset-source-policy.ts', 'return 80'],
      ['cloud-web-app/web/lib/server/asset-intake-policy.ts', "'subscription' | 'trial' | 'free'"],
      ['cloud-web-app/web/lib/server/asset-intake-policy.ts', "case 'free':"],
      ['cloud-web-app/web/lib/server/asset-intake-policy.ts', 'return 65'],
    ],
  },
  {
    id: 'premium-lock-free-aware',
    label: 'PremiumLock compares Free correctly and does not pretend expired users are Starter',
    markers: [
      ['cloud-web-app/web/components/billing/PremiumLock.tsx', "'free' | 'starter'"],
      ['cloud-web-app/web/components/billing/PremiumLock.tsx', 'free: 0'],
      ['cloud-web-app/web/components/billing/PremiumLock.tsx', "free: 'Free'"],
      ['cloud-web-app/web/components/billing/PremiumLock.tsx', "|| 'free'"],
      ['cloud-web-app/web/app/pricing/page.tsx', "plan.id === 'free' ? '/register?plan=free&intent=studio'"],
      ['cloud-web-app/web/app/pricing/page.tsx', "plan.id === 'free' ? 'Comecar gratis'"],
    ],
  },
  {
    id: 'commercial-gate-documented-and-wired',
    label: 'Commercial access gate is documented and wired into product quality progress',
    markers: [
      ['docs/master/99_COMMERCIAL_ACCESS_GATE_2026-05-03.md', 'Free tier'],
      ['docs/master/99_COMMERCIAL_ACCESS_GATE_2026-05-03.md', '14-day Starter trial'],
      ['package.json', 'qa:commercial-access'],
      ['package.json', 'check-commercial-access-gate.mjs'],
      ['tools/measure-product-quality.mjs', 'commercialAccessConfigured'],
    ],
  },
]

for (const contract of contracts) {
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

const failures = checks.filter((check) => !check.pass)
const result = {
  generatedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  checks,
}

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}
`)
} else {
  console.log('=== AETHEL COMMERCIAL ACCESS GATE ===')
  console.log(`Generated: ${result.generatedAt}`)
  console.log(`Checks: ${result.passed}/${result.total}`)
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

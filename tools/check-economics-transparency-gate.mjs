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
    id: 'chat-cost-meter-compact',
    label: 'Chat has a compact always-visible cost meter instead of hiding economics in advanced panels only',
    markers: [
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', 'getStudioCostLive'],
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', 'currentRunEstimate'],
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', 'selectedModelName'],
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', 'onOpenEconomics'],
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', 'Live cost'],
    ],
    banned: [
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', /console\./],
      ['cloud-web-app/web/components/ai-chat/AIChatCostMeter.tsx', /#[0-9a-fA-F]{3,8}\b/],
    ],
  },
  {
    id: 'chat-cost-meter-wired',
    label: 'AI chat panel renders the cost meter with the current run estimate and economics handoff',
    markers: [
      ['cloud-web-app/web/components/ide/AIChatPanelPro.tsx', 'AIChatCostMeter'],
      ['cloud-web-app/web/components/ide/AIChatPanelPro.tsx', 'currentRunEstimate={estimatedCost}'],
      ['cloud-web-app/web/components/ide/AIChatPanelPro.tsx', 'selectedModelName={resolvedModel.name}'],
      ['cloud-web-app/web/components/ide/AIChatPanelPro.tsx', 'onOpenEconomics={handleOpenEconomics}'],
    ],
  },
  {
    id: 'deep-economics-panel-preserved',
    label: 'Detailed economics panel remains available for budget, wallet, billing readiness, and policy guidance',
    markers: [
      ['cloud-web-app/web/components/ai-chat/AIChatEconomicsPanel.tsx', 'Economics plane'],
      ['cloud-web-app/web/components/ai-chat/AIChatEconomicsPanel.tsx', 'wallet.balance'],
      ['cloud-web-app/web/components/ai-chat/AIChatEconomicsPanel.tsx', 'data.billing'],
      ['cloud-web-app/web/components/ai-chat/AIChatOpsSidebar.tsx', "opsTab === 'economics'"],
    ],
  },
  {
    id: 'auth-me-exposes-trial',
    label: '/api/auth/me exposes factual trial state without console errors or as-any drift',
    markers: [
      ['cloud-web-app/web/app/api/auth/me/route.ts', 'trialStatus'],
      ['cloud-web-app/web/app/api/auth/me/route.ts', 'trialEndsAt'],
      ['cloud-web-app/web/app/api/auth/me/route.ts', 'daysRemaining'],
      ['cloud-web-app/web/app/api/auth/me/route.ts', 'createComponentLogger'],
      ['cloud-web-app/web/app/api/auth/me/route.ts', 'routeLogger.error'],
    ],
    banned: [
      ['cloud-web-app/web/app/api/auth/me/route.ts', /console\.error\(/],
      ['cloud-web-app/web/app/api/auth/me/route.ts', /as any/],
    ],
  },
  {
    id: 'stripe-portal-structured-logging',
    label: 'Stripe customer portal route uses structured logger and typed config errors',
    markers: [
      ['cloud-web-app/web/app/api/billing/portal/route.ts', 'createComponentLogger'],
      ['cloud-web-app/web/app/api/billing/portal/route.ts', 'routeLogger.error'],
      ['cloud-web-app/web/app/api/billing/portal/route.ts', 'STRIPE_NOT_CONFIGURED'],
      ['cloud-web-app/web/app/api/billing/portal/route.ts', 'canAccessPortal'],
      ['cloud-web-app/web/app/api/billing/portal/route.ts', 'daysRemaining'],
    ],
    banned: [
      ['cloud-web-app/web/app/api/billing/portal/route.ts', /console\.error\(/],
      ['cloud-web-app/web/app/api/billing/portal/route.ts', /as any/],
    ],
  },
  {
    id: 'trial-banner-no-mojibake',
    label: 'Trial banner is short, factual, and free of mojibake/corrupted copy',
    markers: [
      ['cloud-web-app/web/components/dashboard/TrialBanner.tsx', 'Pro trial:'],
      ['cloud-web-app/web/components/dashboard/TrialBanner.tsx', 'upgrade for full access'],
    ],
    banned: [
      ['cloud-web-app/web/components/dashboard/TrialBanner.tsx', /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\uFFFD)/],
      ['cloud-web-app/web/components/dashboard/TrialBanner.tsx', /faÃ/],
    ],
  },
  {
    id: 'cost-meter-tested',
    label: 'Cost meter has focused component coverage for live data and economics handoff',
    markers: [
      ['cloud-web-app/web/__tests__/ai-chat/AIChatCostMeter.test.tsx', 'AIChatCostMeter'],
      ['cloud-web-app/web/__tests__/ai-chat/AIChatCostMeter.test.tsx', 'getStudioCostLive'],
      ['cloud-web-app/web/__tests__/ai-chat/AIChatCostMeter.test.tsx', 'onOpenEconomics'],
      ['cloud-web-app/web/__tests__/ai-chat/AIChatCostMeter.test.tsx', '$0.420'],
    ],
  },
  {
    id: 'economics-gate-documented-and-wired',
    label: 'Economics transparency gate is documented and part of product quality progress',
    markers: [
      ['docs/master/100_ECONOMICS_TRANSPARENCY_GATE_2026-05-03.md', 'AIChatCostMeter'],
      ['docs/master/100_ECONOMICS_TRANSPARENCY_GATE_2026-05-03.md', 'cost transparency'],
      ['package.json', 'qa:economics-transparency'],
      ['package.json', 'check-economics-transparency-gate.mjs'],
      ['tools/measure-product-quality.mjs', 'economicsTransparencyConfigured'],
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
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else {
  console.log('=== AETHEL ECONOMICS TRANSPARENCY GATE ===')
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

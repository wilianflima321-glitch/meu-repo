#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const ROUTE_EXPECTATIONS = [
  { file: 'app/api/auth/login/route.ts', scope: 'auth-login' },
  { file: 'app/api/auth/register/route.ts', scope: 'auth-register' },
  { file: 'app/api/ai/complete/route.ts', scope: 'ai-complete' },
  { file: 'app/api/ai/chat-advanced/route.ts', scope: 'ai-chat-advanced' },
  { file: 'app/api/billing/checkout/route.ts', scope: 'billing-checkout' },
  { file: 'app/api/billing/checkout-link/route.ts', scope: 'billing-checkout-link' },
  { file: 'app/api/studio/session/start/route.ts', scope: 'studio-session-start' },
]

const failures = []

for (const target of ROUTE_EXPECTATIONS) {
  const abs = path.join(ROOT, target.file)
  if (!fs.existsSync(abs)) {
    failures.push(`${target.file}: file not found`)
    continue
  }

  const content = fs.readFileSync(abs, 'utf8')
  if (!content.includes('await enforceRateLimit(')) {
    failures.push(`${target.file}: missing awaited enforceRateLimit`)
    continue
  }

  const scopePattern = new RegExp(`scope\\s*:\\s*['"\`]${target.scope}['"\`]`)
  if (!scopePattern.test(content)) {
    failures.push(`${target.file}: scope ${target.scope} not found`)
  }
}

if (failures.length > 0) {
  console.error('[critical-rate-limit] FAIL')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log(`[critical-rate-limit] PASS files=${ROUTE_EXPECTATIONS.length}`)

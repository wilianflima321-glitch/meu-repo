#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const ROUTE_EXPECTATIONS = [
  { file: 'app/api/auth/login/route.ts', scope: 'auth-login' },
  { file: 'app/api/auth/register/route.ts', scope: 'auth-register' },
  { file: 'app/api/auth/2fa/setup/route.ts', scope: 'auth-2fa-setup' },
  { file: 'app/api/auth/2fa/verify/route.ts', scope: 'auth-2fa-verify' },
  { file: 'app/api/auth/2fa/validate/route.ts', scope: 'auth-2fa-validate' },
  { file: 'app/api/auth/2fa/disable/route.ts', scope: 'auth-2fa-disable' },
  { file: 'app/api/auth/2fa/backup-codes/route.ts', scope: 'auth-2fa-backup-codes' },
  { file: 'app/api/auth/2fa/status/route.ts', scope: 'auth-2fa-status' },
  { file: 'app/api/auth/me/route.ts', scope: 'auth-me' },
  { file: 'app/api/auth/profile/route.ts', scope: 'auth-profile-read' },
  { file: 'app/api/auth/profile/route.ts', scope: 'auth-profile-update' },
  { file: 'app/api/auth/delete-account/route.ts', scope: 'auth-delete-account' },
  { file: 'app/api/ai/chat/route.ts', scope: 'ai-chat' },
  { file: 'app/api/ai/query/route.ts', scope: 'ai-query' },
  { file: 'app/api/ai/stream/route.ts', scope: 'ai-stream' },
  { file: 'app/api/ai/complete/route.ts', scope: 'ai-complete' },
  { file: 'app/api/ai/chat-advanced/route.ts', scope: 'ai-chat-advanced' },
  { file: 'app/api/ai/action/route.ts', scope: 'ai-action' },
  { file: 'app/api/ai/inline-edit/route.ts', scope: 'ai-inline-edit' },
  { file: 'app/api/ai/inline-completion/route.ts', scope: 'ai-inline-completion' },
  { file: 'app/api/billing/checkout/route.ts', scope: 'billing-checkout' },
  { file: 'app/api/billing/checkout-link/route.ts', scope: 'billing-checkout-link' },
  { file: 'app/api/studio/session/start/route.ts', scope: 'studio-session-start' },
  { file: 'app/api/studio/session/[id]/route.ts', scope: 'studio-session-read' },
  { file: 'app/api/studio/session/[id]/stop/route.ts', scope: 'studio-session-stop' },
  { file: 'app/api/studio/cost/live/route.ts', scope: 'studio-cost-live' },
  { file: 'app/api/studio/tasks/plan/route.ts', scope: 'studio-task-plan' },
  { file: 'app/api/studio/tasks/[id]/run/route.ts', scope: 'studio-task-run' },
  { file: 'app/api/studio/tasks/[id]/validate/route.ts', scope: 'studio-task-validate' },
  { file: 'app/api/studio/tasks/[id]/apply/route.ts', scope: 'studio-task-apply' },
  { file: 'app/api/studio/tasks/[id]/rollback/route.ts', scope: 'studio-task-rollback' },
  { file: 'app/api/studio/access/full/route.ts', scope: 'studio-full-access-grant' },
  { file: 'app/api/studio/access/full/[id]/route.ts', scope: 'studio-full-access-revoke' },
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

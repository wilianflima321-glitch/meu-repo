#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

const files = [
  'lib/agents/runtime/index.ts',
  'lib/agents/runtime/types.ts',
  'lib/agents/runtime/tool-registry.ts',
  'lib/agents/runtime/receipts.ts',
  'lib/agents/runtime/sandbox-provider.ts',
  'lib/agents/runtime/role-eval-suite.ts',
  'lib/agents/runtime/orchestrator.ts',
  '__tests__/agents/agent-runtime-tools.test.ts',
]
for (const file of files) read(file)

requireToken('lib/agents/runtime/types.ts', 'AGENT_RUNTIME_FORBIDDEN_CLAIMS', 'forbidden claims')
requireToken('lib/agents/runtime/tool-registry.ts', 'requiresApproval', 'tool approval scope')
requireToken('lib/agents/runtime/receipts.ts', 'buildMissingReceipt', 'missing receipt builder')
requireToken('lib/agents/runtime/sandbox-provider.ts', 'provider_unavailable', 'sandbox unavailable state')
requireToken('lib/agents/runtime/role-eval-suite.ts', 'minimumCasesPerRole', 'role eval budget')
requireToken('lib/agents/runtime/orchestrator.ts', 'buildAgentRuntimeExecutionPlan', 'execution plan builder')
requireToken('lib/agents/runtime/orchestrator.ts', 'must not mark autonomy available', 'autonomy hold validator')
requireToken('lib/runtime/v29-forensic-runtime-backlog.ts', 'cloud-web-app/web/lib/agents/runtime/index.ts', 'forensic runtime evidence ref')

const pkg = JSON.parse(read('package.json'))
if (pkg.scripts?.['qa:v29-agent-runtime-tools'] !== 'node scripts/check-v29-agent-runtime-tools.mjs') failures.push('package.json: missing qa:v29-agent-runtime-tools')
if (!read('scripts/check-v29-total-spine.mjs').includes('check-v29-agent-runtime-tools.mjs')) failures.push('v29 total spine must include agent runtime tools')

const forbiddenReady = /autonomous execution ready|apply without approval|production ready/i
for (const file of files.filter((candidate) => candidate.endsWith('.ts'))) {
  const content = read(file)
  if (file.endsWith('types.ts')) continue
  if (forbiddenReady.test(content)) failures.push(`${file}: contains forbidden readiness claim`)
}

if (failures.length) {
  console.error('[v29-agent-runtime-tools] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-agent-runtime-tools] PASS scoped-tools=true receipts=true autonomy-held=true')

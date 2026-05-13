#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

const orchestrator = read('lib/agent-orchestrator.ts')
const profileBlock = orchestrator.match(/export const AGENT_ROLE_PROFILES = \{[\s\S]+?\n\} as const/)?.[0] ?? ''
const roleKeys = Array.from(profileBlock.matchAll(/^\s*(?:'[^']+'|[a-zA-Z][\w-]*):\s*\{/gm)).map((match) =>
  match[0].replace(/[:{\s]/g, '').replaceAll("'", '')
)

if (roleKeys.length < 20) {
  failures.push(`lib/agent-orchestrator.ts: expected at least 20 specialist roles, found ${roleKeys.length}`)
}

for (const role of [
  'browser-operator',
  'fact-checker',
  'huggingface-curator',
  'github-cartographer',
  'security-auditor',
  'performance-engineer',
  'gameplay-engineer',
  'cinematic-director',
  'asset-pipeline',
  'cost-governor',
]) {
  if (!roleKeys.includes(role)) failures.push(`lib/agent-orchestrator.ts: missing wide-fleet role "${role}"`)
}

requirePattern('lib/agent-orchestrator.ts', /AGENT_ROLE_PROFILES/, 'roles must come from canonical profiles')
requirePattern('lib/agent-orchestrator.ts', /buildRoleScope\(agent: AgentType\)/, 'every role needs explicit scope')
requirePattern('lib/agent-orchestrator.ts', /executionOrder: SUPPORTED_AGENT_TYPES/, 'coordination policy must schedule the full fleet')
requirePattern('app/api/agents/stream/route.ts', /SUPPORTED_AGENT_TYPES\.length/, 'stream route must size concurrency from supported roles')
requirePattern('app/api/agents/stream/route.ts', /buildRoleScope\(agent\)/, 'stream route must expose scope receipts')
requirePattern('components/nexus/MultiAgentOrchestrator.tsx', /SUPPORTED_AGENT_TYPES/, 'Nexus orchestrator UI must surface the canonical fleet')
requirePattern('components/nexus/MultiAgentOrchestrator.tsx', /Full fleet/, 'Nexus orchestrator UI must expose a full-fleet preset')
requirePattern('__tests__/production/agent-orchestrator-scale.test.ts', /wide specialist fleet/, 'wide fleet contract test must exist')

if (failures.length > 0) {
  console.error('[agent-orchestrator-scale] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[agent-orchestrator-scale] PASS ${roleKeys.length} governed specialist roles are available`)

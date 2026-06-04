#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function mustInclude(relativePath, tokens) {
  const content = read(relativePath)
  for (const token of tokens) {
    if (!content.includes(token)) failures.push(`${relativePath}: missing ${token}`)
  }
  return content
}

const spine = mustInclude('lib/agents/agent-runtime-spine.ts', [
  'AgentRuntimeCapabilityId',
  'buildAgentRuntimeSpinePlan',
  'validateAgentRuntimeSpinePlan',
  'AGENT_RUNTIME_NO_FAKE_SUCCESS_RULES',
  "'tool-calling'",
  "'project-memory'",
  "'code-sandbox'",
  "'browser-replay'",
  "'vector-store'",
  "'role-evals'",
  "'multi-agent-squad'",
  "'approval-gate'",
  'human_review_required',
  'provider_unavailable',
])

mustInclude('lib/agent-orchestrator.ts', [
  'AGENT_ROLE_PROFILES',
  'SUPPORTED_AGENT_TYPES',
  'ORCHESTRATOR_CAPABILITY_STATUS',
  'ORCHESTRATOR_DISCLAIMER',
])

mustInclude('lib/production/context-memory-spine.ts', [
  'ContextMemorySpinePlan',
  'buildContextMemorySpinePlan',
  'hallucinationControls',
  'deviceControls',
  'requiresReadReceipts',
])

mustInclude('app/api/agents/stream/route.ts', [
  'buildAgentRuntimeSpinePlan',
  'agentRuntimeSpine',
  'inferMissionRuntimeFlags',
  'humanApprovalRequired',
])

const capabilityIds = [...spine.matchAll(/capability\(\s*'([^']+)'/g)].map((match) => match[1])
const expected = [
  'tool-calling',
  'project-memory',
  'code-sandbox',
  'browser-replay',
  'vector-store',
  'role-evals',
  'multi-agent-squad',
  'approval-gate',
]
for (const id of expected) {
  if (!capabilityIds.includes(id)) failures.push(`lib/agents/agent-runtime-spine.ts: missing capability construction ${id}`)
}

if (!/browser-replay[\s\S]*Research/.test(spine) && !spine.includes('Manus-grade research')) {
  failures.push('lib/agents/agent-runtime-spine.ts: browser replay must guard Manus-grade research claims')
}
if (!/apply\/deploy\/destructive|apply, deploy, purchase, delete, or publish/i.test(spine)) {
  failures.push('lib/agents/agent-runtime-spine.ts: approval gate must block mutating actions')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'AGENT_RUNTIME_SPINE.md'),
  `# Agent Runtime Spine

- Capabilities: ${expected.join(', ')}
- Capability constructions found: ${capabilityIds.length}
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error(`[agent-runtime-spine] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[agent-runtime-spine] PASS capabilities=${expected.length}`)

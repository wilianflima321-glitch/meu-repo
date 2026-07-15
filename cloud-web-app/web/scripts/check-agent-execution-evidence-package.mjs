#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const packageFile = 'lib/agents/agent-execution-evidence-package.ts'
const routeFile = 'app/api/projects/[id]/production-state/agent-run-ledger/route.ts'
const packageJson = JSON.parse(read('package.json'))

requireToken(packageFile, 'AETHEL_AGENT_EXECUTION_EVIDENCE_PACKAGE', 'capability marker')
requireToken(packageFile, 'buildAgentExecutionEvidencePackage', 'package builder')
requireToken(packageFile, 'verifyAgentExecutionEvidencePackage', 'package verifier')
requireToken(packageFile, 'buildAgentRuntimeSpinePlan', 'runtime spine integration')
requireToken(packageFile, 'validateAgentRuntimeSpinePlan', 'runtime spine validation')
requireToken(packageFile, 'readReceiptCount', 'read receipt count')
requireToken(packageFile, 'toolReceiptCount', 'tool receipt count')
requireToken(packageFile, 'sandboxReceiptCount', 'sandbox receipt count')
requireToken(packageFile, 'browserReplayReceiptCount', 'browser replay receipt count')
requireToken(packageFile, 'reviewArtifactCount', 'review artifact count')
requireToken(packageFile, 'autonomousExecutionReady: false', 'autonomous execution hold')
requireToken(packageFile, 'releaseReady: false', 'release hold')
requireToken(packageFile, 'humanApprovalRequired: true', 'human approval required')
requireToken(packageFile, 'manualApplyRequired: true', 'manual apply required')
requireToken(packageFile, 'Autonomous agent execution cannot be marked ready automatically.', 'no fake autonomous blocker')
requireToken(packageFile, 'Agent execution package cannot set autonomousExecutionReady=true.', 'autonomous verifier guard')
requireToken(packageFile, 'Agent execution package must require manual apply.', 'manual apply verifier guard')
requirePattern(packageFile, /prohibitedClaims:[\s\S]*'autonomous execution ready'[\s\S]*'agent completed without review'[\s\S]*'production ready'[\s\S]*'releaseReady=true'[\s\S]*'apply without approval'/, 'prohibited agent claim matrix')

requireToken(routeFile, 'readAgentReadReceiptStateFromSettings', 'route read receipt state')
requireToken(routeFile, 'buildAgentExecutionEvidencePackage', 'route evidence package builder')
requireToken(routeFile, 'verifyAgentExecutionEvidencePackage', 'route evidence package verifier')
requireToken(routeFile, 'agentExecutionEvidencePackageGenerated', 'route generated flag')
requireToken(routeFile, 'autonomousExecutionReady: false', 'route autonomous execution hold')
requireToken(routeFile, 'releaseReady: false', 'route release hold')

if (packageJson.scripts?.['qa:agent-execution-evidence-package'] !== 'node scripts/check-agent-execution-evidence-package.mjs') {
  failures.push('package.json: missing qa:agent-execution-evidence-package script')
}
if (!packageJson.scripts?.['qa:internal-runtime-priority-gate']?.includes('qa:agent-execution-evidence-package')) {
  failures.push('package.json: qa:internal-runtime-priority-gate must include qa:agent-execution-evidence-package')
}
if (!packageJson.scripts?.['qa:enterprise-gate']?.includes('qa:agent-execution-evidence-package')) {
  failures.push('package.json: qa:enterprise-gate must include qa:agent-execution-evidence-package')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'AGENT_EXECUTION_EVIDENCE_PACKAGE.md'),
  `# Agent Execution Evidence Package\n\n- Capability: AETHEL_AGENT_EXECUTION_EVIDENCE_PACKAGE\n- Run ledger: required\n- Read receipts: required before broad context/apply claims\n- Tool/sandbox/browser evidence: required before autonomy claims\n- Human approval: required\n- Manual apply: required\n- Failures: ${failures.length}\n`,
)

if (failures.length > 0) {
  console.error('[agent-execution-evidence-package] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[agent-execution-evidence-package] PASS ledger=true receiptsGoverned=true autonomyHeld=true')

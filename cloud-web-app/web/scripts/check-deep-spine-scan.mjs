#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
}

requireFile('lib/production/deep-spine-scan.ts', 'Deep Spine Scan needs a production contract')
requirePattern('lib/production/deep-spine-scan.ts', /export interface DeepSpineScanManifest/, 'manifest shape must be exported')
requirePattern('lib/production/deep-spine-scan.ts', /scanId[\s\S]*projectId[\s\S]*mode[\s\S]*scope[\s\S]*budget/, 'manifest must include required identity and budget fields')
requirePattern('lib/production/deep-spine-scan.ts', /findings[\s\S]*readReceipts[\s\S]*evidenceRefs[\s\S]*nextActions[\s\S]*blockedActions[\s\S]*handoffPrompt/, 'manifest must include evidence, findings, and handoff fields')
requirePattern('lib/production/deep-spine-scan.ts', /buildDeepSpineScanManifest/, 'scanner must build manifests from artifacts')
requirePattern('lib/production/deep-spine-scan.ts', /scanWorkspaceForRepositoryArtifacts|buildRepositoryCartographyManifest/, 'scanner must reuse repository cartography concepts')
requirePattern('lib/production/deep-spine-scan.ts', /buildMultiResolutionProjectMemory/, 'scanner must connect to multi-resolution memory')
requirePattern('lib/production/deep-spine-scan.ts', /appendDeepSpineScanEvidence/, 'scanner must write evidence through the task ledger contract')
requirePattern('lib/production/deep-spine-scan.ts', /mergeDeepSpineScanIntoProductionState/, 'scanner must merge work packets into production state')
requirePattern('lib/production/deep-spine-scan.ts', /readDeepSpineScanManifestFromSettings/, 'scanner must be readable from project settings')
requirePattern('lib/production/deep-spine-scan.ts', /writeDeepSpineScanManifestToSettings/, 'scanner must be writable to project settings')
requirePattern('lib/production/deep-spine-scan.ts', /safeAutofix:\s*false/, 'scan findings must not enable auto-fix')
requirePattern('lib/production/deep-spine-scan.ts', /metadata-first/, 'external sources must stay metadata-first')
requirePattern('lib/production/deep-spine-scan.ts', /browser main thread/, 'heavy jobs must be blocked from the browser main thread')

requirePattern('lib/production/parallel-agent-work-contract.ts', /'deep-spine-scan'/, 'agent work tools must declare deep-spine-scan')
requirePattern('lib/production/parallel-agent-work-contract.ts', /deep-spine-scan[\s\S]*context-budget/, 'deep scan must be available before context-heavy work')

requirePattern('lib/production/agent-tool-bus.ts', /tool\('deep-spine-scan'/, 'tool bus must govern deep-spine-scan')
requirePattern('lib/production/agent-tool-bus.ts', /label:\s*'Deep Spine Scan'[\s\S]*requiresIdempotencyKey:\s*true/, 'deep scan must require idempotency')
requirePattern('lib/production/agent-tool-bus.ts', /label:\s*'Deep Spine Scan'[\s\S]*requiresReadReceipts:\s*true/, 'deep scan must require read receipts')
requirePattern('lib/production/agent-tool-bus.ts', /label:\s*'Deep Spine Scan'[\s\S]*maxPayloadBytes/, 'deep scan must cap payload size')
requirePattern('lib/production/agent-tool-bus.ts', /label:\s*'Deep Spine Scan'[\s\S]*rollbackStrategy:\s*'artifact-delete'/, 'deep scan evidence artifacts must have a cleanup strategy')
requirePattern('lib/production/agent-tool-bus.ts', /metadata-first external sources/, 'tool bus must require metadata-first external evidence')

requireFile('scripts/deep-spine-scan.mjs', 'local command must exist')
requirePattern('scripts/deep-spine-scan.mjs', /--mode[\s\S]*quick[\s\S]*deep[\s\S]*aaa[\s\S]*external/, 'command must expose fixed scan modes')
requirePattern('scripts/deep-spine-scan.mjs', /ignoredDirectories/, 'command must skip heavy generated folders')
requirePattern('scripts/deep-spine-scan.mjs', /scopeValues[\s\S]*argv\[cursor\]\.startsWith\('--'\)/, 'command must accept multiple --scope paths without silently dropping later scopes')
requirePattern('scripts/deep-spine-scan.mjs', /safeAutofix:\s*false/, 'command findings must not auto-fix')
requirePattern('scripts/deep-spine-scan.mjs', /Do not download internet packages/, 'command must block silent downloads')
requirePattern('scripts/deep-spine-scan.mjs', /hasAaaRendererEvidence/, 'command must distinguish renderer evidence from facade line-count guesses')
requireFile('app/api/projects/[id]/production-state/deep-spine-scan/route.ts', 'project production-state route must expose deep spine scan')
requirePattern('app/api/projects/[id]/production-state/deep-spine-scan/route.ts', /scanWorkspaceForRepositoryArtifacts/, 'route must reuse repository cartography scanner')
requirePattern('app/api/projects/[id]/production-state/deep-spine-scan/route.ts', /buildDeepSpineScanManifest/, 'route must build deep scan manifests')
requirePattern('app/api/projects/[id]/production-state/deep-spine-scan/route.ts', /buildDeepSpineScanReadReceipts/, 'route must persist generated read receipts')
requirePattern('app/api/projects/[id]/production-state/deep-spine-scan/route.ts', /writeDeepSpineScanManifestToSettings/, 'route must persist manifest to project settings')

if (exists('scripts/deep-spine-scan.mjs')) {
  const script = read('scripts/deep-spine-scan.mjs')
  const forbiddenNetwork = /\b(fetch|curl|Invoke-WebRequest|wget|git clone|https\.get|http\.get)\b/i
  if (forbiddenNetwork.test(script)) {
    failures.push('scripts/deep-spine-scan.mjs: contains network/download primitive; v1 must stay local and metadata-first')
  }
}

requirePattern('package.json', /"spine:scan":\s*"node scripts\/deep-spine-scan\.mjs"/, 'package scripts must expose spine:scan')
requirePattern('package.json', /"qa:deep-spine-scan":\s*"node scripts\/check-deep-spine-scan\.mjs"/, 'package scripts must expose qa:deep-spine-scan')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:deep-spine-scan/, 'enterprise gate must include deep spine scan QA')
requirePattern('scripts/check-internal-spine.mjs', /qa:deep-spine-scan|deep-spine-scan/, 'internal spine gate must require deep spine scan readiness')
requireFile('__tests__/production/deep-spine-scan.test.ts', 'deep spine scan tests must exist')
requirePattern('__tests__/production/deep-spine-scan.test.ts', /external[\s\S]*license[\s\S]*checksum/, 'tests must cover external provenance')
requirePattern('__tests__/production/deep-spine-scan.test.ts', /safeAutofix/, 'tests must cover no-auto-fix findings')
requirePattern('__tests__/production/internal-spine-tool-bus.test.ts', /deep-spine-scan/, 'tool bus tests must cover deep-spine-scan')

if (failures.length > 0) {
  console.error('[deep-spine-scan] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[deep-spine-scan] PASS')

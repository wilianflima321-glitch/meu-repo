#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function expectToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

const jobSpec = read('lib/render-farm/queue/job-spec.ts')
const dispatcher = read('lib/render-farm/queue/dispatcher.ts')
const receipts = read('lib/render-farm/queue/receipts.ts')
const index = read('lib/render-farm/index.ts')
const test = read('__tests__/render-farm/render-farm-queue.test.ts')
const exportSpine = read('lib/export/export-pipeline-spine.ts')
const forensicBacklog = read('lib/runtime/v29-forensic-runtime-backlog.ts')
const packageJson = JSON.parse(read('package.json') || '{}')
const totalSpine = read('scripts/check-v29-total-spine.mjs')
const tsconfig = read('tsconfig.typecheck-runtime-spine.json')

for (const token of [
  'RenderFarmJobSpec',
  'RenderFarmProviderCapability',
  'RENDER_FARM_REQUIRED_RECEIPTS',
  'costCapUsd',
  'cancelSupported',
  'teardownConfigured',
  'artifactPrefix',
  'rollbackPlan',
  'human_review_required',
  'provider_unavailable',
  'validateRenderFarmJobSpec',
]) {
  expectToken('render farm job spec', jobSpec, token)
}

for (const token of [
  'buildRenderFarmDispatchDecision',
  'canDispatch',
  'buildRuntimeJobReceiptState',
  'evaluateRenderFarmReceiptCoverage',
  'queued',
  'provider_unavailable',
]) {
  expectToken('render farm dispatcher', dispatcher, token)
}

for (const token of [
  'buildRenderFarmReceiptInputs',
  'evaluateRenderFarmReceiptCoverage',
  'dispatch',
  'capability-probe',
  'cost-meter',
  'artifact',
  'validation',
  'teardown',
  'rollback',
  'Human review is required before final/public render claims.',
]) {
  expectToken('render farm receipts', receipts, token)
}

for (const token of ['buildRenderFarmJobSpec', 'buildRenderFarmDispatchDecision', 'buildRenderFarmReceiptInputs']) {
  expectToken('render farm index', index, token)
}

for (const token of ['buildExportPipelinePlan', 'cloud-render', 'Cloud render is required for this export lane but is not available.']) {
  expectToken('export pipeline spine', exportSpine, token)
}

for (const token of [
  'keeps cloud render provider_unavailable',
  'blocks dispatch when cost exceeds cap',
  'keeping public release held for human review',
]) {
  expectToken('render farm tests', test, token)
}

for (const token of [
  'cloud-render-export',
  'cloud-web-app/web/lib/render-farm/index.ts',
  'qa:v29-cloud-render-export',
]) {
  expectToken('forensic backlog cloud render evidence', forensicBacklog, token)
}

if (!tsconfig.includes('lib/render-farm/**/*.ts')) {
  failures.push('tsconfig.typecheck-runtime-spine.json: missing lib/render-farm/**/*.ts')
}
if (packageJson.scripts?.['qa:v29-cloud-render-export'] !== 'node scripts/check-v29-cloud-render-export.mjs') {
  failures.push('package.json: missing qa:v29-cloud-render-export')
}
if (!totalSpine.includes('check-v29-cloud-render-export.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: missing check-v29-cloud-render-export.mjs')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_CLOUD_RENDER_EXPORT.md'),
  `# V29 Cloud Render Export

- Job spec: lib/render-farm/queue/job-spec.ts
- Dispatcher: lib/render-farm/queue/dispatcher.ts
- Receipts: dispatch, capability, cost, artifact, validation, teardown, rollback
- Release policy: human review required
- Failures: ${failures.length}
`,
)

if (failures.length) {
  console.error('[v29-cloud-render-export] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-cloud-render-export] PASS receipts=7 release=held')

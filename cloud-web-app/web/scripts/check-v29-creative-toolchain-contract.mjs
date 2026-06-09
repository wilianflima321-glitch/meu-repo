#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
function exists(relativePath) { return fs.existsSync(path.join(ROOT, relativePath)) }
function read(relativePath) { return exists(relativePath) ? fs.readFileSync(path.join(ROOT, relativePath), 'utf8') : '' }

const contract = read('lib/runtime/v29-internal-spine.ts')
for (const token of ['CreativeToolchainContract', 'V29_CREATIVE_TOOLCHAIN_CONTRACT', 'CreativeStudioShell', 'CreativeWorkbenchShell', 'ViewportChrome', 'SceneViewportInspector', 'SceneViewportOutliner', 'TimelineOverlay', 'EngineContentBrowser', 'human-review-required']) {
  if (!contract.includes(token)) failures.push(`v29 contract missing ${token}`)
}
for (const required of [
  'app/studio/CreativeStudioShell.tsx',
  'components/studio/CreativeWorkbenchShell.tsx',
  'components/viewport/ViewportChrome.tsx',
  'components/viewport/SceneViewportInspector.tsx',
  'components/viewport/SceneViewportOutliner.tsx',
  'components/viewport/TimelineOverlay.tsx',
  'components/engine/EngineContentBrowser.tsx',
  'components/sequencer/SequencerTimeline.tsx',
  'lib/production/asset-quality-job-runner.ts',
  'lib/production/studio-local-cook-queue.ts',
  'lib/production/release-evidence-readiness.ts',
]) {
  if (!exists(required)) failures.push(`missing creative toolchain evidence: ${required}`)
}

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts?.['qa:v29-creative-toolchain-contract']) failures.push('package.json: missing qa:v29-creative-toolchain-contract')

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_CREATIVE_TOOLCHAIN_CONTRACT.md'), `# V29 Creative Toolchain Contract\n\nHub shell: CreativeStudioShell\nWorkbench shell: CreativeWorkbenchShell\nPolicy: human-review-required\nFailures: ${failures.length}\n`)

if (failures.length) {
  console.error('[v29-creative-toolchain-contract] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('[v29-creative-toolchain-contract] PASS shell=CreativeWorkbenchShell hub=CreativeStudioShell')

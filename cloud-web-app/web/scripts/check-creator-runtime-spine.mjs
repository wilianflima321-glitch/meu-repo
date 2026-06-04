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

mustInclude('components/timeline/CanonicalSequencer.tsx', [
  'data-canonical-sequencer="true"',
  "dynamic(() => import('@/components/sequencer/SequencerTimeline')",
  'Camera, animation, dialogue, audio, FX, gameplay',
])

mustInclude('components/sequencer/SequencerTimeline.tsx', [
  'SequencerTimeline',
  'onKeyframeAdd',
  'onTrackAdd',
  'onSequenceUpdate',
])

mustInclude('lib/product/v28-runtime-contracts.ts', [
  'SequencerTrack',
  'ExportJob',
  'HumanApprovalGate',
])

mustInclude('lib/export/export-pipeline-spine.ts', [
  'ExportPipelineFormat',
  'ExportRuntimeLane',
  'buildExportPipelinePlan',
  'validateExportPipelinePlan',
  "'mp4'",
  "'glb'",
  "'gltf'",
  "'wav'",
  "'zip'",
  "'studio-local'",
  "'cloud-render'",
  'Asset quality ledger is required before final export.',
  'Browser preview cannot claim final video/GPU export quality.',
])

mustInclude('components/preview/useViewportExport.ts', [
  'buildExportPipelinePlan',
  'assetQualityLedger',
  'exportPipeline',
  'exportPipeline.state ===',
])

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'CREATOR_RUNTIME_SPINE.md'),
  `# Creator Runtime Spine

- Canonical sequencer: yes
- Export pipeline formats: mp4, glb, gltf, wav, zip
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error(`[creator-runtime-spine] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[creator-runtime-spine] PASS sequencer=canonical export=formats-5')

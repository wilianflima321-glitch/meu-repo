#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []
const file = 'lib/runtime/v29-forensic-runtime-backlog.ts'
const full = path.join(ROOT, file)
const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''

if (!content) failures.push(`${file}: missing`)

const requiredTokens = [
  'V29ForensicRuntimeBlock',
  'V29ForensicRuntimeBacklogReport',
  'V29_FORENSIC_RUNTIME_BLOCKS',
  'V29_FORENSIC_FORBIDDEN_PROMOTIONS',
  'buildV29ForensicRuntimeBacklogReport',
  'validateV29ForensicRuntimeBacklog',
  'webgpu-render-kernel',
  'sequencer-kernel',
  'agent-runtime-tools',
  'mcp-plugin-host',
  'studio-local-native-kernel',
  'cloud-render-export',
  'asset-library-quality',
  'physics-ai-ondevice-photogrammetry',
  'i18n-single-source',
]

for (const token of requiredTokens) {
  if (!content.includes(token)) failures.push(`${file}: missing ${token}`)
}

const weakFraming = new RegExp(`\\b(${'proto'}${'type'}|${'simp'}${'le'}|${'bas'}${'ic'})\\b`, 'i')
if (weakFraming.test(content)) failures.push(`${file}: contains weak-market framing`)

const fakePromotionTokens = [
  'AAA ready',
  'Unreal-grade',
  'Nanite ready',
  'Lumen-like ready',
  'autonomous execution ready',
  'native renderer ready',
  'signed installer ready',
  'final asset',
  'research verified',
  'production ready',
]

for (const token of fakePromotionTokens) {
  if (!content.includes(token)) failures.push(`${file}: missing forbidden promotion guard ${token}`)
}

const blockCount = (content.match(/id: '/g) ?? []).length
if (blockCount < 9) failures.push(`${file}: expected at least 9 forensic runtime blocks, found ${blockCount}`)

const evidenceRefs = [...content.matchAll(/currentEvidence:\s*\[([^\]]+)\]/g)]
if (evidenceRefs.length < 9) failures.push(`${file}: each block must declare currentEvidence`)
for (const match of evidenceRefs) {
  const refs = match[1].match(/'[^']+'/g) ?? []
  if (refs.length === 0) failures.push(`${file}: found block with empty currentEvidence`)
  for (const quoted of refs) {
    const rawPath = quoted.slice(1, -1)
    const webRelativePath = rawPath.replace(/^cloud-web-app\/web\//, '')
    const existsInWeb = fs.existsSync(path.join(ROOT, webRelativePath))
    const existsInRepo = fs.existsSync(path.join(REPO_ROOT, rawPath))
    if (!existsInWeb && !existsInRepo) failures.push(`${file}: currentEvidence does not exist: ${rawPath}`)
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
if (packageJson.scripts?.['qa:v29-forensic-runtime-backlog'] !== 'node scripts/check-v29-forensic-runtime-backlog.mjs') {
  failures.push('package.json: missing qa:v29-forensic-runtime-backlog script')
}
const totalSpineScript = fs.readFileSync(path.join(ROOT, 'scripts/check-v29-total-spine.mjs'), 'utf8')
if (!totalSpineScript.includes('check-v29-forensic-runtime-backlog.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-forensic-runtime-backlog.mjs')
}
if (!totalSpineScript.includes('check-v29-sequencer-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-sequencer-kernel.mjs')
}
if (!totalSpineScript.includes('check-v29-mcp-host-contract.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-mcp-host-contract.mjs')
}
if (!totalSpineScript.includes('check-v29-agent-runtime-tools.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-agent-runtime-tools.mjs')
}
if (!totalSpineScript.includes('check-v29-studio-local-native-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-studio-local-native-kernel.mjs')
}
if (!totalSpineScript.includes('check-v29-cloud-render-export.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-cloud-render-export.mjs')
}
if (!totalSpineScript.includes('check-v29-webgpu-render-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-webgpu-render-kernel.mjs')
}
if (!totalSpineScript.includes('check-v29-asset-library-quality.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-asset-library-quality.mjs')
}
if (!totalSpineScript.includes('check-v29-physics-ai-ondevice-photogrammetry.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-physics-ai-ondevice-photogrammetry.mjs')
}
if (!totalSpineScript.includes('check-v29-i18n-single-source.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: must include check-v29-i18n-single-source.mjs')
}
if (!packageJson.scripts?.['qa:enterprise-gate']?.includes('qa:v29-total-spine')) {
  failures.push('package.json: qa:enterprise-gate must include qa:v29-total-spine')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_FORENSIC_RUNTIME_BACKLOG.md'),
  `# V29 Forensic Runtime Backlog

- Blocks: ${blockCount}
- Forbidden promotion guards: ${fakePromotionTokens.length}
- Source audit: AETHEL_ENGINE_FORENSIC_RUNTIME_AUDIT_4037ac8
- Failures: ${failures.length}

This gate converts the forensic audit into executable backlog contracts. It protects Aethel from promoting WebGPU, Sequencer, Agent Runtime, MCP, Studio Local, Cloud Render, Export, Asset Library, AI-on-device, Photogrammetry, or i18n work before evidence exists.
`,
)

if (failures.length) {
  console.error('[v29-forensic-runtime-backlog] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v29-forensic-runtime-backlog] PASS blocks=${blockCount} guards=${fakePromotionTokens.length}`)

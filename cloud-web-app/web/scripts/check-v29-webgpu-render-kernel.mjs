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

const deferred = read('lib/render/webgpu/deferred.ts')
const forwardPlus = read('lib/render/webgpu/forward-plus.ts')
const receipts = read('lib/render/webgpu/performance-receipts.ts')
const index = read('lib/render/webgpu/index.ts')
const test = read('__tests__/render/webgpu-render-kernel.test.ts')
const forensicBacklog = read('lib/runtime/v29-forensic-runtime-backlog.ts')
const packageJson = JSON.parse(read('package.json') || '{}')
const totalSpine = read('scripts/check-v29-total-spine.mjs')
const tsconfig = read('tsconfig.typecheck-runtime-spine.json')

for (const token of [
  'WebGPUDeferredPassContract',
  'WEBGPU_DEFERRED_REQUIRED_ATTACHMENTS',
  'g-buffer attachments',
  'depth prepass',
  'material preflight',
  'lighting resolve',
  'structured WebGPU performance trace',
  'finalRenderReady: false',
]) expectToken('deferred pass contract', deferred, token)

for (const token of [
  'WebGPUForwardPlusPassContract',
  'WebGPUComputeReadinessSnapshot',
  'meshlet culling lane',
  'light culling lane',
  'tile size budget',
  'finalRenderReady: false',
]) expectToken('forward plus pass contract', forwardPlus, token)

for (const token of [
  'WebGPURenderKernelReceipt',
  'WEBGPU_RENDER_KERNEL_REQUIRED_EVIDENCE',
  'fallbackRenderer',
  'Browser WebGPU render kernel is preview evidence only',
  'native-or-cloud-plus-human-review',
  'validateWebGPURenderKernelReceipt',
  'finalRenderReady !== false',
]) expectToken('performance receipts contract', receipts, token)

for (const token of [
  'buildWebGPUDeferredPassContract',
  'buildWebGPUForwardPlusPassContract',
  'buildWebGPURenderKernelReceipt',
]) expectToken('webgpu render index', index, token)

for (const token of [
  'holds deferred pass when G-buffer or trace evidence is missing',
  'holds Forward+ when compute/culling evidence is incomplete',
  'keeping final render claims blocked behind native/cloud receipts',
]) expectToken('webgpu render tests', test, token)

for (const token of [
  'webgpu-render-kernel',
  'cloud-web-app/web/lib/render/webgpu/index.ts',
  'qa:v29-webgpu-render-kernel',
]) expectToken('forensic backlog webgpu evidence', forensicBacklog, token)

if (!tsconfig.includes('lib/render/**/*.ts')) failures.push('tsconfig.typecheck-runtime-spine.json: missing lib/render/**/*.ts')
if (packageJson.scripts?.['qa:v29-webgpu-render-kernel'] !== 'node scripts/check-v29-webgpu-render-kernel.mjs') {
  failures.push('package.json: missing qa:v29-webgpu-render-kernel')
}
if (!totalSpine.includes('check-v29-webgpu-render-kernel.mjs')) {
  failures.push('scripts/check-v29-total-spine.mjs: missing check-v29-webgpu-render-kernel.mjs')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_WEBGPU_RENDER_KERNEL.md'),
  `# V29 WebGPU Render Kernel

- Deferred pass: lib/render/webgpu/deferred.ts
- Forward+ pass: lib/render/webgpu/forward-plus.ts
- Performance receipts: lib/render/webgpu/performance-receipts.ts
- Release policy: browser preview only; final requires native/cloud plus human review
- Failures: ${failures.length}
`,
)

if (failures.length) {
  console.error('[v29-webgpu-render-kernel] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-webgpu-render-kernel] PASS pipelines=deferred+forward-plus final=native-or-cloud')

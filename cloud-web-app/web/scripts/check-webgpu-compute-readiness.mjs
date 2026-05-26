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

function requireToken(file, token, reason = token) {
  const content = sources[file] ?? ''
  if (!content.includes(token)) failures.push(`${file}: missing ${reason}`)
}

function requirePattern(file, pattern, reason) {
  const content = sources[file] ?? ''
  if (!pattern.test(content)) failures.push(`${file}: missing ${reason}`)
}

const sources = {
  'lib/runtime/webgpu-compute-readiness.ts': read('lib/runtime/webgpu-compute-readiness.ts'),
  '__tests__/runtime/webgpu-compute-readiness.test.ts': read('__tests__/runtime/webgpu-compute-readiness.test.ts'),
  'lib/aaa-renderer-webgpu.ts': read('lib/aaa-renderer-webgpu.ts'),
  'package.json': read('package.json'),
}

requireToken('lib/runtime/webgpu-compute-readiness.ts', 'navigator.gpu', 'browser WebGPU feature probe')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'GPUAdapter', 'adapter evidence')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'GPUDevice', 'device evidence')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'GPUSupportedLimits', 'supported limits evidence')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'WGSL shader validation', 'WGSL validation evidence')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'core-features-and-limits', 'core feature-level detection')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'browserPreviewOnly: true', 'browser compute must stay preview-only')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'finalRenderRequiresNativeOrCloud: true', 'final render must require native/cloud')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'meshlet-culling-preview', 'meshlet compute lane')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'light-culling-preview', 'light culling compute lane')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'Do not claim AAA, Unreal-grade, or final output', 'honest claim warning')
requireToken('lib/runtime/webgpu-compute-readiness.ts', 'probeBrowserWebGPUComputeReadiness', 'runtime probe entrypoint')
requireToken('lib/aaa-renderer-webgpu.ts', 'WebGPURenderer', 'WebGPU renderer fallback foundation')
requireToken('lib/aaa-renderer-webgpu.ts', 'WebGLRenderer', 'WebGL2 fallback foundation')

requirePattern('__tests__/runtime/webgpu-compute-readiness.test.ts', /navigator\.gpu is unavailable/, 'fallback test')
requirePattern('__tests__/runtime/webgpu-compute-readiness.test.ts', /adapter, device, limits and WGSL evidence/, 'available evidence test')
requirePattern('__tests__/runtime/webgpu-compute-readiness.test.ts', /shader validation or supported limits are missing/, 'held evidence test')

requireToken('package.json', 'qa:webgpu-compute-readiness', 'package QA script')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:webgpu-compute-readiness/, 'enterprise gate must include WebGPU compute readiness')

if (failures.length > 0) {
  console.error(`[webgpu-compute-readiness] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[webgpu-compute-readiness] PASS compute=preview-only final=native-or-cloud evidence=adapter+device+limits+wgsl')

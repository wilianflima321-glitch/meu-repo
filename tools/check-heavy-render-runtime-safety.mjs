#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const checks = []
const failures = []

function read(file) {
  if (!existsSync(file)) {
    failures.push(`${file}: missing`)
    return ''
  }
  return readFileSync(file, 'utf8')
}

function expectIncludes(file, phrases) {
  const source = read(file)
  for (const phrase of phrases) {
    checks.push(`${file} includes ${phrase}`)
    if (!source.includes(phrase)) {
      failures.push(`${file}: expected ${phrase}`)
    }
  }
}

expectIncludes('cloud-web-app/web/lib/viewport/viewport-render-readiness.ts', [
  'ViewportRenderReadinessReport',
  'estimateViewportRenderResources',
  'estimatedMemoryMb',
  'estimatedVramMb',
  'recommendedLane',
  'shouldHold',
  'shouldUseCloud',
  'Review/final viewport renders must not run on the browser main thread.',
  'local-native GPU/NPU helpers or cloud-sandbox',
])

expectIncludes('cloud-web-app/web/lib/viewport/viewport-render-backend.ts', [
  'buildViewportRenderReadinessReport',
  'readiness',
  'Render readiness:',
  'performance-report.json',
  'validation-report.json',
])

expectIncludes('cloud-web-app/web/__tests__/viewport/viewport-render-readiness.test.ts', [
  'keeps draft renders ready',
  'Thermal pressure is critical.',
  'routes final browser-worker pressure to cloud/native',
  'estimates frames, memory, vram, and risk deterministically',
])

expectIncludes('cloud-web-app/web/__tests__/viewport/viewport-render-backend.test.ts', [
  'performance-report.json',
  'readiness',
  'estimatedMemoryMb',
])

expectIncludes('docs/master/110_HEAVY_RENDER_RUNTIME_SAFETY_2026-05-11.md', [
  'Heavy Render Runtime Safety',
  'No main-thread heavy render',
  'GPU/NPU/native helpers',
  'cloud-sandbox',
  'evidence',
  'estimatedMemoryMb',
  'estimatedVramMb',
  'human approval',
])

expectIncludes('package.json', [
  'qa:heavy-render-runtime-safety',
  'check-heavy-render-runtime-safety.mjs',
])

expectIncludes('tools/measure-product-quality.mjs', [
  'heavyRenderRuntimeSafetyConfigured',
  'heavy_render_runtime_safety',
])

if (failures.length > 0) {
  console.error('Heavy render runtime safety gate failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Heavy render runtime safety gate passed (${checks.length} checks).`)

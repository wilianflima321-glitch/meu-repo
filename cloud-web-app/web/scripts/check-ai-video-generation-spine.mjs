#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(ROOT, rel))
const failures = []

function requireFile(rel) {
  if (!exists(rel)) {
    failures.push(`Missing ${rel}`)
    return ''
  }
  return read(rel)
}

function mustContain(rel, text, label = text) {
  const content = requireFile(rel)
  if (content && !content.includes(text)) failures.push(`${rel} must contain ${label}`)
}

function mustNotContain(rel, pattern, label) {
  const content = requireFile(rel)
  if (content && pattern.test(content)) failures.push(`${rel} must not contain ${label}`)
}

const spine = requireFile('lib/server/ai-video-generation.ts')
for (const token of [
  'AiVideoProviderUnavailableError',
  'getAiVideoProviderStatuses',
  'normalizeAiVideoGenerateRequest',
  'generateAiVideo',
  'getAiVideoStatus',
  'AETHEL_VIDEO_GENERATION_WEBHOOK_URL',
  'AETHEL_VIDEO_STATUS_WEBHOOK_URL',
  'RUNWAY_API_URL',
  'SORA_API_URL',
  'PIKA_API_URL',
  'draftAssetsAreNotFinal',
  'humanReviewRequired',
  'costApplies',
]) {
  if (!spine.includes(token)) failures.push(`lib/server/ai-video-generation.ts must include ${token}`)
}

mustNotContain('lib/server/ai-video-generation.ts', /success\s*:\s*true/, 'success=true in provider spine')
mustNotContain('lib/server/ai-video-generation.ts', /api\.openai\.com\/v1\/video|api\.runwayml\.com|pika\.art\/api/i, 'hard-coded vendor video endpoint')

const generateRoute = requireFile('app/api/ai/video/generate/route.ts')
for (const token of [
  'requireAuth',
  'AI_EXPENSIVE_VIDEO_RATE_LIMIT',
  "capability: 'ai.video.generate'",
  "route: '/api/ai/video/generate'",
  'enforceExpensiveAiGenerationUsage',
  "kind: 'video'",
  'AI_VIDEO_PROVIDER_UNAVAILABLE',
  'draftAssetsAreNotFinal',
  'humanReviewRequired',
  'cloudVideoCostApplies',
]) {
  if (!generateRoute.includes(token)) failures.push(`app/api/ai/video/generate/route.ts must include ${token}`)
}

const statusRoute = requireFile('app/api/ai/video/status/route.ts')
for (const token of [
  'AI_STATUS_RATE_LIMIT',
  "capability: 'ai.status.video'",
  "route: '/api/ai/video/status'",
  'getVideoStatusOrProviders',
]) {
  if (!statusRoute.includes(token)) failures.push(`app/api/ai/video/status/route.ts must include ${token}`)
}

mustContain('lib/server/ai-core-rate-limit.ts', 'AI_EXPENSIVE_VIDEO_RATE_LIMIT')
mustContain('lib/server/ai-core-rate-limit.ts', 'video: AI_EXPENSIVE_VIDEO_RATE_LIMIT')
mustContain('lib/server/ai-expensive-generation-guard.ts', "'video'")
mustContain('scripts/check-ai-limits-spine.mjs', 'app/api/ai/video/generate/route.ts')
mustContain('scripts/check-ai-limits-spine.mjs', 'app/api/ai/video/status/route.ts')
mustContain('docs/AI_VIDEO_GENERATION_SPINE_V22.md', 'No fake success')
mustContain('docs/AI_VIDEO_GENERATION_SPINE_V22.md', 'Draft videos are not final')

if (failures.length) {
  console.error('[ai-video-generation-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[ai-video-generation-spine] PASS')

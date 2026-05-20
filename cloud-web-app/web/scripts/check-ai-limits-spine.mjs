#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(webRoot, rel))

const spineFile = 'lib/server/ai-core-rate-limit.ts'
const expensiveRoutes = [
  {
    rel: 'app/api/ai/3d/generate/route.ts',
    config: 'AI_EXPENSIVE_3D_RATE_LIMIT',
    capability: 'ai.model3d.generate',
    usageKind: "kind: 'model3d'",
  },
  {
    rel: 'app/api/ai/image/generate/route.ts',
    config: 'AI_EXPENSIVE_IMAGE_RATE_LIMIT',
    capability: 'ai.image.generate',
    usageKind: "kind: 'image'",
  },
  {
    rel: 'app/api/ai/music/generate/route.ts',
    config: 'AI_EXPENSIVE_MUSIC_RATE_LIMIT',
    capability: 'ai.music.generate',
    usageKind: "kind: 'music'",
  },
  {
    rel: 'app/api/ai/voice/generate/route.ts',
    config: 'AI_EXPENSIVE_VOICE_RATE_LIMIT',
    capability: 'ai.voice.generate',
    usageKind: "kind: 'voice'",
  },
]
const meteredRoutes = [
  ...expensiveRoutes,
  {
    rel: 'app/api/ai/voice/transcribe/route.ts',
    config: 'AI_VOICE_TRANSCRIBE_RATE_LIMIT',
    capability: 'ai.voice.transcribe',
  },
]

const failures = []

if (!exists(spineFile)) {
  failures.push(`Missing ${spineFile}`)
} else {
  const spine = read(spineFile)
  for (const config of [
    'AI_CORE_RATE_LIMIT',
    'AI_INLINE_RATE_LIMIT',
    'AI_EXPENSIVE_IMAGE_RATE_LIMIT',
    'AI_EXPENSIVE_3D_RATE_LIMIT',
    'AI_EXPENSIVE_MUSIC_RATE_LIMIT',
    'AI_EXPENSIVE_VOICE_RATE_LIMIT',
    'AI_VOICE_TRANSCRIBE_RATE_LIMIT',
    'AI_GENERATION_RATE_LIMITS',
  ]) {
    if (!spine.includes(`export const ${config}`)) {
      failures.push(`${spineFile} must export ${config}`)
    }
  }
  if (!spine.includes('enforceAiCoreRateLimit')) {
    failures.push(`${spineFile} must own enforceAiCoreRateLimit`)
  }
}

for (const route of meteredRoutes) {
  if (!exists(route.rel)) {
    failures.push(`Missing ${route.rel}`)
    continue
  }

  const text = read(route.rel)
  if (text.includes("@/lib/rate-limit")) {
    failures.push(`${route.rel} must not import the raw rate-limit helper directly`)
  }
  if (/checkRateLimit\s*\(/.test(text)) {
    failures.push(`${route.rel} must delegate rate limiting through ai-core-rate-limit`)
  }
  if (!text.includes('enforceAiCoreRateLimit')) {
    failures.push(`${route.rel} must call enforceAiCoreRateLimit`)
  }
  if (!text.includes(route.config)) {
    failures.push(`${route.rel} must use ${route.config}`)
  }
  if (!text.includes(`capability: '${route.capability}'`)) {
    failures.push(`${route.rel} must provide capability ${route.capability}`)
  }
}

for (const route of expensiveRoutes) {
  const text = exists(route.rel) ? read(route.rel) : ''
  if (!text.includes('enforceExpensiveAiGenerationUsage')) {
    failures.push(`${route.rel} must still enforce per-user expensive generation usage`)
  }
  if (!text.includes(route.usageKind)) {
    failures.push(`${route.rel} must keep usage kind ${route.usageKind}`)
  }
}

const report = [
  '# AI Limits Spine Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Central spine: ${spineFile}`,
  `- Metered routes checked: ${meteredRoutes.length}`,
  `- Expensive usage guarded routes checked: ${expensiveRoutes.length}`,
  `- Failures: ${failures.length}`,
  ...failures.map((failure) => `- ${failure}`),
  '',
].join('\n')

fs.writeFileSync(path.join(webRoot, 'docs/AI_LIMITS_SPINE_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}

console.log('AI limits spine gate passed')

#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8')
const exists = (rel) => fs.existsSync(path.join(webRoot, rel))
const normalize = (value) => value.replace(/\\/g, '/')

const spineFile = 'lib/server/ai-core-rate-limit.ts'

function route(rel, category, config, capability, apiRoute, extra = {}) {
  return { rel, category, config, capability, route: apiRoute, ...extra }
}

const expensiveRoutes = [
  route('app/api/ai/3d/generate/route.ts', 'expensiveMetered', 'AI_EXPENSIVE_3D_RATE_LIMIT', 'ai.model3d.generate', '/api/ai/3d/generate', {
    usageKind: "kind: 'model3d'",
  }),
  route('app/api/ai/image/generate/route.ts', 'expensiveMetered', 'AI_EXPENSIVE_IMAGE_RATE_LIMIT', 'ai.image.generate', '/api/ai/image/generate', {
    usageKind: "kind: 'image'",
  }),
  route('app/api/ai/music/generate/route.ts', 'expensiveMetered', 'AI_EXPENSIVE_MUSIC_RATE_LIMIT', 'ai.music.generate', '/api/ai/music/generate', {
    usageKind: "kind: 'music'",
  }),
  route('app/api/ai/video/generate/route.ts', 'expensiveMetered', 'AI_EXPENSIVE_VIDEO_RATE_LIMIT', 'ai.video.generate', '/api/ai/video/generate', {
    usageKind: "kind: 'video'",
  }),
  route('app/api/ai/voice/generate/route.ts', 'expensiveMetered', 'AI_EXPENSIVE_VOICE_RATE_LIMIT', 'ai.voice.generate', '/api/ai/voice/generate', {
    usageKind: "kind: 'voice'",
  }),
  route('app/api/ai/voice/transcribe/route.ts', 'expensiveMetered', 'AI_VOICE_TRANSCRIBE_RATE_LIMIT', 'ai.voice.transcribe', '/api/ai/voice/transcribe', {
    usageKind: "kind: 'voiceTranscribe'",
  }),
]

const coreLimitedRoutes = [
  route('app/api/ai/action/route.ts', 'coreLimited', 'AI_CORE_RATE_LIMIT', 'AI_ACTION', '/api/ai/action'),
  route('app/api/ai/agent/route.ts', 'coreLimited', 'AI_AGENT_RATE_LIMIT', 'ai.agent.execute', '/api/ai/agent'),
  route('app/api/ai/change/apply/route.ts', 'coreLimited', 'AI_CHANGE_MUTATION_RATE_LIMIT', 'ai.change.apply', '/api/ai/change/apply'),
  route('app/api/ai/change/rollback/route.ts', 'coreLimited', 'AI_CHANGE_MUTATION_RATE_LIMIT', 'ai.change.rollback', '/api/ai/change/rollback'),
  route('app/api/ai/change/validate/route.ts', 'coreLimited', 'AI_CHANGE_MUTATION_RATE_LIMIT', 'ai.change.validate', '/api/ai/change/validate'),
  route('app/api/ai/chat/route.ts', 'coreLimited', 'AI_CORE_RATE_LIMIT', 'AI_CHAT', '/api/ai/chat'),
  route('app/api/ai/chat-advanced/route.ts', 'coreLimited', 'AI_CORE_RATE_LIMIT', 'AI_CHAT_ADVANCED', '/api/ai/chat-advanced'),
  route('app/api/ai/complete/route.ts', 'coreLimited', 'AI_INLINE_RATE_LIMIT', 'AI_COMPLETE', '/api/ai/complete'),
  route('app/api/ai/context/mentions/route.ts', 'coreLimited', 'AI_CONTEXT_RATE_LIMIT', 'ai.context.mentions', '/api/ai/context/mentions'),
  route('app/api/ai/context/search/route.ts', 'coreLimited', 'AI_CONTEXT_RATE_LIMIT', 'ai.context.search', '/api/ai/context/search'),
  route('app/api/ai/director/[projectId]/action/route.ts', 'coreLimited', 'AI_DIRECTOR_ACTION_RATE_LIMIT', 'ai.director.action', '/api/ai/director/[projectId]/action'),
  route('app/api/ai/inline-completion/route.ts', 'coreLimited', 'AI_INLINE_RATE_LIMIT', 'AI_INLINE_COMPLETION', '/api/ai/inline-completion'),
  route('app/api/ai/inline-edit/route.ts', 'coreLimited', 'AI_INLINE_RATE_LIMIT', 'AI_INLINE_EDIT', '/api/ai/inline-edit'),
  route('app/api/ai/query/route.ts', 'coreLimited', 'AI_QUERY_RATE_LIMIT', 'ai.query', '/api/ai/query'),
  route('app/api/ai/stream/route.ts', 'coreLimited', 'AI_CORE_RATE_LIMIT', 'AI_STREAM', '/api/ai/stream'),
  route('app/api/ai/voice/realtime-session/route.ts', 'coreLimited', 'AI_CORE_RATE_LIMIT', 'ai.voice.realtime-session', '/api/ai/voice/realtime-session'),
]

const statusLimitedRoutes = [
  route('app/api/ai/3d/status/route.ts', 'statusLimited', 'AI_STATUS_RATE_LIMIT', 'ai.status.3d', '/api/ai/3d/status'),
  route('app/api/ai/music/status/route.ts', 'statusLimited', 'AI_STATUS_RATE_LIMIT', 'ai.status.music', '/api/ai/music/status'),
  route('app/api/ai/provider-status/route.ts', 'statusLimited', 'AI_STATUS_RATE_LIMIT', 'ai.status.provider', '/api/ai/provider-status'),
  route('app/api/ai/video/status/route.ts', 'statusLimited', 'AI_STATUS_RATE_LIMIT', 'ai.status.video', '/api/ai/video/status'),
]

const readLimitedRoutes = [
  route('app/api/ai/agents/route.ts', 'readLimited', 'AI_AGENT_READ_RATE_LIMIT', 'ai.agent.overview', '/api/ai/agents'),
  route('app/api/ai/agents/executions/route.ts', 'readLimited', 'AI_AGENT_READ_RATE_LIMIT', 'ai.agent.executions', '/api/ai/agents/executions'),
  route('app/api/ai/agents/metrics/route.ts', 'readLimited', 'AI_AGENT_READ_RATE_LIMIT', 'ai.agent.metrics', '/api/ai/agents/metrics'),
  route('app/api/ai/change/readiness/route.ts', 'readLimited', 'AI_CHANGE_READ_RATE_LIMIT', 'ai.change.readiness', '/api/ai/change/readiness'),
  route('app/api/ai/change/runs/route.ts', 'readLimited', 'AI_CHANGE_READ_RATE_LIMIT', 'ai.change.runs', '/api/ai/change/runs'),
  route('app/api/ai/director/[projectId]/route.ts', 'readLimited', 'AI_DIRECTOR_READ_RATE_LIMIT', 'ai.director.read', '/api/ai/director/[projectId]'),
  route('app/api/ai/models/registry/route.ts', 'readLimited', 'AI_AGENT_READ_RATE_LIMIT', 'ai.models.registry', '/api/ai/models/registry'),
  route('app/api/ai/suggestions/route.ts', 'readLimited', 'AI_SUGGESTIONS_RATE_LIMIT', 'ai.suggestions.read', '/api/ai/suggestions'),
  route('app/api/ai/thinking/[sessionId]/route.ts', 'readLimited', 'AI_THINKING_RATE_LIMIT', 'ai.thinking.session', '/api/ai/thinking/[sessionId]'),
  route('app/api/ai/trace/[traceId]/route.ts', 'readLimited', 'AI_TRACE_RATE_LIMIT', 'ai.trace.read', '/api/ai/trace/[traceId]'),
]

const feedbackLimitedRoutes = [
  route('app/api/ai/change/feedback/route.ts', 'feedbackLimited', 'AI_CHANGE_FEEDBACK_RATE_LIMIT', 'ai.change.feedback', '/api/ai/change/feedback'),
  route('app/api/ai/core-loop/feedback/route.ts', 'feedbackLimited', 'AI_CORE_LOOP_FEEDBACK_RATE_LIMIT', 'ai.core_loop.feedback', '/api/ai/core-loop/feedback'),
  route('app/api/ai/suggestions/[id]/action/route.ts', 'feedbackLimited', 'AI_SUGGESTIONS_RATE_LIMIT', 'ai.suggestions.action', '/api/ai/suggestions/[id]/action'),
  route('app/api/ai/suggestions/feedback/route.ts', 'feedbackLimited', 'AI_SUGGESTIONS_RATE_LIMIT', 'ai.suggestions.feedback', '/api/ai/suggestions/feedback'),
]

const classifiedRoutes = [
  ...coreLimitedRoutes,
  ...expensiveRoutes,
  ...statusLimitedRoutes,
  ...readLimitedRoutes,
  ...feedbackLimitedRoutes,
]

const usageGuardedRoutes = expensiveRoutes
const failures = []

function listAiRouteFiles(dir = path.join(webRoot, 'app/api/ai'), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listAiRouteFiles(full, out)
    if (entry.isFile() && entry.name === 'route.ts') {
      out.push(normalize(path.relative(webRoot, full)))
    }
  }
  return out
}

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
    'AI_EXPENSIVE_VIDEO_RATE_LIMIT',
    'AI_EXPENSIVE_VOICE_RATE_LIMIT',
    'AI_VOICE_TRANSCRIBE_RATE_LIMIT',
    'AI_AGENT_RATE_LIMIT',
    'AI_CHANGE_MUTATION_RATE_LIMIT',
    'AI_CONTEXT_RATE_LIMIT',
    'AI_DIRECTOR_ACTION_RATE_LIMIT',
    'AI_DIRECTOR_READ_RATE_LIMIT',
    'AI_QUERY_RATE_LIMIT',
    'AI_STATUS_RATE_LIMIT',
    'AI_AGENT_READ_RATE_LIMIT',
    'AI_CHANGE_READ_RATE_LIMIT',
    'AI_CHANGE_FEEDBACK_RATE_LIMIT',
    'AI_SUGGESTIONS_RATE_LIMIT',
    'AI_TRACE_RATE_LIMIT',
    'AI_THINKING_RATE_LIMIT',
    'AI_CORE_LOOP_FEEDBACK_RATE_LIMIT',
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

const discoveredRoutes = listAiRouteFiles().sort()
const classifiedSet = new Set(classifiedRoutes.map((item) => item.rel))
for (const discovered of discoveredRoutes) {
  if (!classifiedSet.has(discovered)) {
    failures.push(`${discovered} is not classified by the AI limits spine gate`)
  }
}
for (const classified of classifiedRoutes) {
  if (!discoveredRoutes.includes(classified.rel)) {
    failures.push(`${classified.rel} is classified but no route file exists`)
  }
}

for (const routeInfo of classifiedRoutes) {
  if (!exists(routeInfo.rel)) continue

  const text = read(routeInfo.rel)
  if (text.includes("@/lib/rate-limit")) {
    failures.push(`${routeInfo.rel} must not import the raw rate-limit helper directly`)
  }
  if (/checkRateLimit\s*\(/.test(text)) {
    failures.push(`${routeInfo.rel} must delegate rate limiting through ai-core-rate-limit`)
  }
  if (!text.includes('enforceAiCoreRateLimit')) {
    failures.push(`${routeInfo.rel} must call enforceAiCoreRateLimit`)
  }
  if (!text.includes(routeInfo.config)) {
    failures.push(`${routeInfo.rel} must use ${routeInfo.config}`)
  }
  if (!text.includes(`capability: '${routeInfo.capability}'`)) {
    failures.push(`${routeInfo.rel} must provide capability ${routeInfo.capability}`)
  }
  if (!text.includes(`route: '${routeInfo.route}'`)) {
    failures.push(`${routeInfo.rel} must provide route metadata ${routeInfo.route}`)
  }
}

for (const routeInfo of usageGuardedRoutes) {
  const text = exists(routeInfo.rel) ? read(routeInfo.rel) : ''
  if (!text.includes('enforceExpensiveAiGenerationUsage')) {
    failures.push(`${routeInfo.rel} must enforce per-user expensive AI usage`)
  }
  if (!text.includes(routeInfo.usageKind)) {
    failures.push(`${routeInfo.rel} must keep usage kind ${routeInfo.usageKind}`)
  }
}

const groupedCounts = classifiedRoutes.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] ?? 0) + 1
  return acc
}, {})

const report = [
  '# AI Limits Spine Audit',
  '',
  'Generated: deterministic local scan',
  '',
  `- Central spine: ${spineFile}`,
  `- All AI routes discovered: ${discoveredRoutes.length}`,
  `- Classified routes checked: ${classifiedRoutes.length}`,
  `- coreLimited: ${groupedCounts.coreLimited ?? 0}`,
  `- expensiveMetered: ${groupedCounts.expensiveMetered ?? 0}`,
  `- statusLimited: ${groupedCounts.statusLimited ?? 0}`,
  `- readLimited: ${groupedCounts.readLimited ?? 0}`,
  `- feedbackLimited: ${groupedCounts.feedbackLimited ?? 0}`,
  `- Expensive usage guarded routes checked: ${usageGuardedRoutes.length}`,
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

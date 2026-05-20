#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const MAX_ROUTE_LINES = 300

const ROUTES = [
  {
    label: 'chat-advanced',
    route: 'app/api/ai/chat-advanced/route.ts',
    moduleRoot: 'lib/server/ai-chat-advanced',
    requiredModules: ['types.ts', 'model-policy.ts', 'context.ts', 'orchestrator.ts', 'agent-and-streaming.ts'],
    forbidden: ['handleStreamingResponse', 'handleAgentRequest', 'normalizeModelName'],
  },
  {
    label: 'change-apply',
    route: 'app/api/ai/change/apply/route.ts',
    moduleRoot: 'lib/server/ai-change-apply',
    requiredModules: ['types.ts', 'request.ts', 'preflight.ts', 'agent-guards.ts', 'executor.ts'],
    forbidden: ['buildPreparedChange', 'normalizeExecutionMode', 'RollbackSnapshotRecord', 'createRollbackSnapshot'],
  },
]

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function countLines(text) {
  return text.split(/\r?\n/).length
}

const failures = []

for (const item of ROUTES) {
  const routeText = read(item.route)
  const routeLines = countLines(routeText)
  if (routeLines > MAX_ROUTE_LINES) {
    failures.push(`${item.route}: ${routeLines} lines exceeds ${MAX_ROUTE_LINES}`)
  }

  const moduleImportNeedle = `@/${item.moduleRoot}`
  if (!routeText.includes(moduleImportNeedle)) {
    failures.push(`${item.route}: does not delegate to ${moduleImportNeedle}`)
  }

  for (const forbidden of item.forbidden) {
    if (routeText.includes(forbidden)) {
      failures.push(`${item.route}: contains inline orchestration marker ${forbidden}`)
    }
  }

  const moduleRootAbs = path.join(ROOT, item.moduleRoot)
  if (!fs.existsSync(moduleRootAbs)) failures.push(`${item.moduleRoot}: missing split module directory`)

  for (const moduleName of item.requiredModules) {
    const modulePath = path.join(moduleRootAbs, moduleName)
    if (!fs.existsSync(modulePath)) {
      failures.push(`${item.moduleRoot}/${moduleName}: missing required split module`)
    }
  }
}

const chatOrchestrator = read('lib/server/ai-chat-advanced/orchestrator.ts')
if (!chatOrchestrator.includes("from './context'") || !chatOrchestrator.includes("from './model-policy'")) {
  failures.push('lib/server/ai-chat-advanced/orchestrator.ts: must use context and model-policy split modules')
}

const applyExecutor = read('lib/server/ai-change-apply/executor.ts')
if (!applyExecutor.includes("from './preflight'") || !applyExecutor.includes("from './agent-guards'")) {
  failures.push('lib/server/ai-change-apply/executor.ts: must use preflight and agent-guards split modules')
}

if (failures.length) {
  console.error('[ai-route-split] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[ai-route-split] PASS critical AI routes are thin and delegated')

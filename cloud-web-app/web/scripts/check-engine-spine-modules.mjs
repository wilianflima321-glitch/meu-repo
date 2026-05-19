#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const SOURCE_PATH = path.join(ROOT, 'lib', 'studio', 'engine-spine-modules.ts')

const REQUIRED_IDS = [
  'aaa-render-system',
  'post-processing-system',
  'pixel-streaming',
  'studio-local-runtime',
  'behavior-tree-system',
  'world-streaming',
  'quest-system',
  'save-manager',
  'inventory-system',
  'multiplayer-system',
  'cutscene-system',
  'dialogue-cutscene-system',
  'capture-system',
  'aaa-asset-pipeline',
]

const VALID_LOAD_STRATEGIES = new Set([
  'already-visible',
  'dynamic-client-only',
  'summary-adapter',
  'worker-or-sidecar',
  'native-or-cloud',
])

function extractObjectBlocks(source) {
  const blocks = []
  let depth = 0
  let start = -1

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') {
      if (depth === 0) start = index
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && start !== -1) {
        blocks.push(source.slice(start, index + 1))
        start = -1
      }
    }
  }

  return blocks
}

function getStringProperty(block, propertyName) {
  const match = block.match(new RegExp(`${propertyName}:\\s*'([^']+)'`))
  return match?.[1] ?? null
}

function resolveModulePath(modulePath) {
  if (modulePath.startsWith('apps/')) return path.join(REPO_ROOT, modulePath)
  return path.join(ROOT, modulePath)
}

if (!fs.existsSync(SOURCE_PATH)) {
  console.error('[engine-spine-modules] FAIL missing lib/studio/engine-spine-modules.ts')
  process.exit(1)
}

const source = fs.readFileSync(SOURCE_PATH, 'utf8')
const modules = extractObjectBlocks(source)
  .map((block) => ({
    id: getStringProperty(block, 'id'),
    modulePath: getStringProperty(block, 'modulePath'),
    status: getStringProperty(block, 'status'),
    loadStrategy: getStringProperty(block, 'loadStrategy'),
    limitation: getStringProperty(block, 'limitation'),
    risk: getStringProperty(block, 'risk'),
  }))
  .filter((item) => item.id && item.modulePath)

const byId = new Map(modules.map((module) => [module.id, module]))
const failures = []

for (const id of REQUIRED_IDS) {
  if (!byId.has(id)) failures.push(`${id}: missing from ENGINE_SPINE_MODULES`)
}

for (const module of modules) {
  if (!module.status) failures.push(`${module.id}: missing status`)
  if (!module.limitation || module.limitation.length < 24) failures.push(`${module.id}: missing actionable limitation`)
  if (!VALID_LOAD_STRATEGIES.has(module.loadStrategy)) failures.push(`${module.id}: invalid loadStrategy=${module.loadStrategy}`)
  if (!fs.existsSync(resolveModulePath(module.modulePath))) failures.push(`${module.id}: modulePath does not exist (${module.modulePath})`)
  if (module.risk === 'high' && module.loadStrategy === 'already-visible') {
    failures.push(`${module.id}: high-risk modules cannot be marked already-visible without a boundary`)
  }
}

if (!source.includes('heavyHeld')) failures.push('getEngineSpineSummary must expose heavyHeld')

if (failures.length > 0) {
  console.error(`[engine-spine-modules] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[engine-spine-modules] PASS modules=${modules.length} required=${REQUIRED_IDS.length}`)

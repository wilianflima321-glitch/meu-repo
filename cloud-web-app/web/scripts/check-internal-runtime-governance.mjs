#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE_PATH = path.join(ROOT, 'lib/production/internal-runtime-governance.ts')

const REQUIRED_MODULES = [
  'components/dashboard/useDashboardActions.ts',
  'lib/debug/profiler-system.tsx',
  'lib/debug/object-inspector.tsx',
  'hooks/useAethelGateway.ts',
  'lib/aaa-render-system.ts',
  'lib/plugins/plugin-system.tsx',
  'lib/localization/localization-system.tsx',
  'lib/feature-flags.ts',
  'lib/sandbox/script-sandbox.ts',
  'lib/production/agent-tool-bus.ts',
  'lib/hot-reload/hot-reload-server.ts',
  'lib/input/input-manager-runtime/manager.ts',
  'lib/test/systems-integration.test.ts',
  'lib/debug/debug-adapter.ts',
  'lib/debug/real-debug-adapter.ts',
  'lib/ai/advanced-ai-provider.ts',
  'lib/ai-content-generation.ts',
  'lib/monaco-lsp-bridge.ts',
  'lib/backup-system.ts',
  'lib/scene/scene-serializer-runtime/serializer.ts',
  'lib/engine/scene-graph.ts',
  'lib/networking/multiplayer-runtime/lobby-manager.ts',
  'lib/asset-pipeline.ts',
  'lib/blueprint-system.ts',
  'lib/ui/tooltip-system.tsx',
  'components/animation/AnimationBlueprintEditorPanels.tsx',
  'components/agents/AgentsWindow.tsx',
  'app/settings/page.tsx',
  'components/ide/DebugPanel.tsx',
  'lib/git/git-service.ts',
  'components/ide/AIChatPanelPro.tsx',
]

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

function getArrayPropertyItems(block, propertyName) {
  const match = block.match(new RegExp(`${propertyName}:\\s*\\[([\\s\\S]*?)\\]`))
  if (!match) return []
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1])
}

if (!fs.existsSync(SOURCE_PATH)) {
  console.error('[internal-runtime-governance] FAIL missing lib/production/internal-runtime-governance.ts')
  process.exit(1)
}

const source = fs.readFileSync(SOURCE_PATH, 'utf8')
const decisions = extractObjectBlocks(source)
  .map((block) => ({
    modulePath: getStringProperty(block, 'modulePath'),
    decision: getStringProperty(block, 'decision'),
    ownerSurface: getStringProperty(block, 'ownerSurface'),
    boundary: getStringProperty(block, 'boundary'),
    risks: getArrayPropertyItems(block, 'risks'),
    evidenceSignals: getArrayPropertyItems(block, 'evidenceSignals'),
  }))
  .filter((item) => item.modulePath && item.decision)

const failures = []
const paths = new Set(decisions.map((item) => item.modulePath))

for (const modulePath of REQUIRED_MODULES) {
  if (!paths.has(modulePath)) failures.push(`${modulePath}: missing governance decision`)
  if (!fs.existsSync(path.join(ROOT, modulePath))) failures.push(`${modulePath}: source file missing`)
}

for (const item of decisions) {
  if (!item.ownerSurface) failures.push(`${item.modulePath}: missing owner surface`)
  if (!item.boundary) failures.push(`${item.modulePath}: missing boundary`)
  if (item.evidenceSignals.length < 2) failures.push(`${item.modulePath}: needs evidence signals`)
  if (item.risks.includes('privacy-risk') && !['admin-only', 'server-only', 'ide-only', 'user-action-required'].includes(item.boundary)) {
    failures.push(`${item.modulePath}: privacy-risk needs protected boundary`)
  }
}

for (const forbidden of [
  "from '@/lib/debug/",
  "from '@/lib/plugins/plugin-system'",
  "from '@/lib/sandbox/script-sandbox'",
  "from '@/lib/monaco-lsp-bridge'",
]) {
  if (source.includes(forbidden)) failures.push(`governance file must not import heavy runtime: ${forbidden}`)
}

if (!source.includes('validateInternalRuntimeGovernance')) failures.push('missing validation helper')
if (!source.includes('getInternalRuntimeGovernanceSummary')) failures.push('missing summary helper')
if (decisions.length < 30) failures.push(`expected at least 30 governed modules, found ${decisions.length}`)

if (failures.length > 0) {
  console.error(`[internal-runtime-governance] FAIL failures=${failures.length}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[internal-runtime-governance] PASS modules=${decisions.length} required=${REQUIRED_MODULES.length}`)

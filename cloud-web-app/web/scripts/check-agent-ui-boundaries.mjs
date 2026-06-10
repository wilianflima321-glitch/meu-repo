#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
const IMPORT_RE = /['"]@\/components\/ai-chat\/|['"].*components\/ai-chat\//g

const SKIP_DIRS = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'storybook-static',
])

const ALLOWED_EXTERNAL_IMPORTERS = new Set([
  'components/agents/AgentEvidenceCard.tsx',
  'components/agents/evidence.ts',
  'components/agents/presets.ts',
  'components/agents/chat/composer.ts',
  'components/agents/chat/panels.ts',
  'components/agents/AgentsWorkspaceContainer.tsx',
])

const FORBIDDEN_PREFIXES = [
  'app/',
  'components/admin/',
  'components/dashboard/',
  'components/studio/',
  'components/preview/',
  'components/viewport/',
]

function normalize(filePath) {
  return filePath.split(path.sep).join('/')
}

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), files)
      continue
    }
    if (/\.(ts|tsx)$/.test(entry.name)) files.push(path.join(dir, entry.name))
  }
  return files
}

const files = walk(ROOT)
const externalImporters = []
const forbiddenImporters = []
const nonAgentExternalImporters = []

for (const file of files) {
  const relative = normalize(path.relative(ROOT, file))
  const content = fs.readFileSync(file, 'utf8')
  if (!IMPORT_RE.test(content)) continue
  IMPORT_RE.lastIndex = 0

  const isInternalAiChat = relative.startsWith('components/ai-chat/')
  const isTestOrConfig =
    relative.startsWith('__tests__/') ||
    relative === 'jest.config.ts' ||
    relative === 'vitest.config.ts'

  if (!isInternalAiChat && !isTestOrConfig) {
    externalImporters.push(relative)
    if (!relative.startsWith('components/agents/')) nonAgentExternalImporters.push(relative)
    if (!ALLOWED_EXTERNAL_IMPORTERS.has(relative)) {
      failures.push(`${relative}: direct ai-chat import must be routed through components/agents or a documented compatibility file`)
    }
  }

  if (FORBIDDEN_PREFIXES.some((prefix) => relative.startsWith(prefix))) {
    forbiddenImporters.push(relative)
  }
}

if (externalImporters.length > ALLOWED_EXTERNAL_IMPORTERS.size) {
  failures.push(`external ai-chat importers exceeded ${ALLOWED_EXTERNAL_IMPORTERS.size}: ${externalImporters.length}`)
}

if (nonAgentExternalImporters.length > 0) {
  failures.push(`non-agent ai-chat importers exceeded 0: ${nonAgentExternalImporters.length} (${nonAgentExternalImporters.join(', ')})`)
}

for (const importer of forbiddenImporters) {
  failures.push(`${importer}: product surfaces must not import components/ai-chat directly`)
}

const agentsIndex = read('components/agents/index.ts')
if (agentsIndex) {
  if (!/AgentsWorkspaceContainer/.test(agentsIndex)) failures.push('components/agents/index.ts: missing AgentsWorkspaceContainer export')
  if (!/AgentsWindow/.test(agentsIndex)) failures.push('components/agents/index.ts: missing AgentsWindow export')
}

const aiChatCompatibility = read('components/ide/AIChatPanelContainer.tsx')
if (aiChatCompatibility && !/@\/components\/agents['"]/.test(aiChatCompatibility)) {
  failures.push('components/ide/AIChatPanelContainer.tsx: compatibility wrapper must import from components/agents barrel')
}

const workbench = read('components/ide/fullscreen/FullscreenIDEWorkspace.tsx')
if (workbench) {
  if (!/@\/components\/agents['"]/.test(workbench)) {
    failures.push('components/ide/fullscreen/FullscreenIDEWorkspace.tsx: workbench must import agents through components/agents barrel')
  }
  if (/AIChatPanelContainer/.test(workbench)) {
    failures.push('components/ide/fullscreen/FullscreenIDEWorkspace.tsx: must not import legacy AIChatPanelContainer')
  }
}

const proPanel = read('components/ide/AIChatPanelPro.tsx')
if (proPanel) {
  if (!/@\/components\/agents\/chat['"]/.test(proPanel)) {
    failures.push('components/ide/AIChatPanelPro.tsx: chat panel must import legacy pieces through components/agents/chat')
  }
  if (IMPORT_RE.test(proPanel)) {
    failures.push('components/ide/AIChatPanelPro.tsx: must not import components/ai-chat directly')
    IMPORT_RE.lastIndex = 0
  }
}

const legacyChatPanel = read('components/agents/legacy-chat-panel.ts')
if (legacyChatPanel) {
  if (!/export \* from ['"]\.\/chat['"]/.test(legacyChatPanel.trim())) {
    failures.push('components/agents/legacy-chat-panel.ts: must stay a thin alias to ./chat')
  }
  if (IMPORT_RE.test(legacyChatPanel)) {
    failures.push('components/agents/legacy-chat-panel.ts: must not import components/ai-chat directly')
    IMPORT_RE.lastIndex = 0
  }
}

if (failures.length) {
  console.error('[agent-ui-boundaries] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[agent-ui-boundaries] PASS externalAiChatImporters=${externalImporters.length} nonAgentImporters=${nonAgentExternalImporters.length} canonical=components/agents`)

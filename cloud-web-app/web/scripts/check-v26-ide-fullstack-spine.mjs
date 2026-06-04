#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const WEB_ROOT = process.cwd()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const failures = []
const warnings = []

function webPath(relativePath) {
  return path.join(WEB_ROOT, relativePath)
}

function repoPath(relativePath) {
  return path.join(REPO_ROOT, relativePath)
}

function exists(fullPath) {
  return fs.existsSync(fullPath)
}

function readWeb(relativePath) {
  const fullPath = webPath(relativePath)
  if (!exists(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function readRepo(relativePath) {
  const fullPath = repoPath(relativePath)
  if (!exists(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requireWebPattern(relativePath, pattern, reason) {
  const content = readWeb(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

function rejectWebPattern(relativePath, pattern, reason) {
  const content = readWeb(relativePath)
  if (content && pattern.test(content)) failures.push(`${relativePath}: ${reason}`)
}

function requireRepoPattern(relativePath, pattern, reason) {
  const content = readRepo(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

function lineCount(fullPath) {
  return fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length
}

function walk(dir, predicate, acc = []) {
  if (!exists(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, predicate, acc)
    } else if (predicate(fullPath)) {
      acc.push(fullPath)
    }
  }
  return acc
}

const requiredWebFiles = [
  'components/ide/fullscreen/useFullscreenIDEWorkspaceProps.tsx',
  'components/ide/fullscreen/stores/workbenchUiStore.ts',
  'components/ide/fullscreen/stores/workbenchEditorStore.ts',
  'components/ide/fullscreen/stores/workbenchRuntimeStore.ts',
  'components/ide/fullscreen/stores/index.ts',
  'components/agents/AgentsWindow.tsx',
]

for (const file of requiredWebFiles) readWeb(file)

const requiredRepoFiles = [
  'packages/aethel-ide-shared/package.json',
  'packages/aethel-ide-shared/src/index.ts',
  'packages/aethel-ide-shared/src/runtime-adapter/types.ts',
  'packages/aethel-ide-shared/src/runtime-adapter/web-adapter.ts',
  'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts',
]

for (const file of requiredRepoFiles) readRepo(file)

requireWebPattern(
  'components/ide/FullscreenIDE.tsx',
  /useFullscreenIDEOrchestrator[\s\S]*useFullscreenIDEWorkspaceProps[\s\S]*<FullscreenIDEWorkspace \{\.\.\.workspaceProps\}/,
  'canonical workspace wiring without the old bridge render',
)
rejectWebPattern(
  'components/ide/FullscreenIDE.tsx',
  /FullscreenIDEWorkspaceBridge/,
  'route shell must not import or render the legacy bridge',
)
requireWebPattern(
  'components/ide/fullscreen/useFullscreenIDEWorkspaceProps.tsx',
  /FullscreenIDEWorkspaceBridgeProps[\s\S]*FullscreenIDEWorkspaceProps[\s\S]*WorkbenchEntryNotice/,
  'workspace adapter hook must own bridge-to-shell translation',
)
requireWebPattern(
  'components/ide/fullscreen/stores/workbenchUiStore.ts',
  /create<WorkbenchUiState>[\s\S]*activeBottomPanel[\s\S]*previewMode[\s\S]*commandPaletteMode/,
  'UI Zustand store must track chrome, panels, and command palette',
)
requireWebPattern(
  'components/ide/fullscreen/stores/workbenchEditorStore.ts',
  /create<WorkbenchEditorState>[\s\S]*activeFile[\s\S]*dirtyPaths[\s\S]*markDirty/,
  'editor Zustand store must track open files and dirty state',
)
requireWebPattern(
  'components/ide/fullscreen/stores/workbenchRuntimeStore.ts',
  /create<WorkbenchRuntimeState>[\s\S]*previewRuntimeUrl[\s\S]*runtimeStatus[\s\S]*markSynced/,
  'runtime Zustand store must track preview and sync state',
)
requireRepoPattern(
  'packages/aethel-ide-shared/src/runtime-adapter/types.ts',
  /RuntimeAdapter[\s\S]*FileSystemAdapter[\s\S]*TerminalAdapter[\s\S]*RuntimeAPIAdapter/,
  'shared adapter package must define web/desktop runtime contracts',
)
requireRepoPattern(
  'packages/aethel-ide-shared/src/runtime-adapter/web-adapter.ts',
  /createWebRuntimeAdapter[\s\S]*\/api\/files\/fs[\s\S]*\/api\/runtime\/local-capabilities/,
  'web adapter must route through governed HTTP endpoints',
)
requireRepoPattern(
  'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts',
  /createDesktopAdapter[\s\S]*fs_read[\s\S]*terminal_create[\s\S]*local_runtime_health/,
  'desktop adapter must map the same contract to native commands',
)
requireWebPattern(
  'components/agents/AgentsWindow.tsx',
  /Agent window shows scope locks, replay receipts, read receipts, and cost posture/,
  'Agents Window accessible copy must be human-facing and compact',
)

const ideFiles = walk(webPath('components/ide'), (file) => /\.(ts|tsx)$/.test(file))
const oversizedIdeFiles = ideFiles
  .map((file) => ({ file, lines: lineCount(file) }))
  .filter(({ lines }) => lines > 500)

for (const item of oversizedIdeFiles) {
  failures.push(`${path.relative(WEB_ROOT, item.file)}: ${item.lines} lines exceeds V26 IDE 500-line ceiling`)
}

const aiFiles = walk(webPath('components/ai'), (file) => /\.(ts|tsx)$/.test(file))
const oversizedAiFiles = aiFiles
  .map((file) => ({ file, lines: lineCount(file) }))
  .filter(({ lines }) => lines > 500)

if (oversizedAiFiles.length > 0) {
  failures.push(`components/ai: ${oversizedAiFiles.length} files exceed 500 lines; V26 ratchet requires oversized=0`)
}

const agentsWindowLines = lineCount(webPath('components/agents/AgentsWindow.tsx'))
if (agentsWindowLines > 180) {
  failures.push(`components/agents/AgentsWindow.tsx: ${agentsWindowLines} lines exceeds 180`)
}

if (failures.length) {
  console.error('[v26-ide-fullstack-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  for (const warning of warnings) console.warn(`! ${warning}`)
  process.exit(1)
}

for (const warning of warnings) console.warn(`! ${warning}`)
console.log(
  `[v26-ide-fullstack-spine] PASS ideFiles=${ideFiles.length} ideOversized=0 agentsWindow=${agentsWindowLines} sharedAdapter=true desktopAdapter=true`,
)

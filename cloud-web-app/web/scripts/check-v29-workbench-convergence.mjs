#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
function exists(relativePath) { return fs.existsSync(path.join(ROOT, relativePath)) }
function read(relativePath) { return exists(relativePath) ? fs.readFileSync(path.join(ROOT, relativePath), 'utf8') : '' }

const contract = read('lib/runtime/v29-internal-spine.ts')
for (const token of ['V29_WORKBENCH_CONVERGENCE', 'ModernIDEShell', 'commandRegistry', 'taskLane', 'agentLane', 'previewRuntimePane', 'diffReviewCenter', 'noNewShellRule']) {
  if (!contract.includes(token)) failures.push(`v29 contract missing ${token}`)
}

if (!exists('components/ide/ModernIDEShell.tsx')) failures.push('ModernIDEShell canonical shell is missing')
if (!exists('lib/commands/command-registry.tsx')) failures.push('canonical command registry is missing')
if (!exists('components/ide/TaskOpsPanel.tsx')) failures.push('canonical task lane is missing')
if (!exists('components/ide/AIChatPanelPro.tsx')) failures.push('canonical agent lane is missing')
if (!exists('components/ide/fullscreen/WorkbenchPreviewPane.tsx')) failures.push('canonical preview/runtime pane is missing')
if (exists('components/ide/IDELayout.tsx')) failures.push('IDELayout.tsx must stay deleted or redirect-only outside components/ide')

const topLevelIde = fs.readdirSync(path.join(ROOT, 'components/ide')).filter((name) => /Shell|IDELayout|FullscreenIDE|WorkbenchRedirect/.test(name))
const allowed = new Set(['ModernIDEShell.tsx', 'FullscreenIDE.tsx', 'WorkbenchRedirect.tsx'])
for (const name of topLevelIde) {
  if (!allowed.has(name) && !fs.statSync(path.join(ROOT, 'components/ide', name)).isDirectory()) {
    failures.push(`unexpected top-level IDE shell candidate: ${name}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts?.['qa:v29-workbench-convergence']) failures.push('package.json: missing qa:v29-workbench-convergence')

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_WORKBENCH_CONVERGENCE.md'), `# V29 Workbench Convergence\n\nTop-level shell candidates: ${topLevelIde.join(', ')}\nFailures: ${failures.length}\n`)

if (failures.length) {
  console.error('[v29-workbench-convergence] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('[v29-workbench-convergence] PASS canonical=ModernIDEShell')

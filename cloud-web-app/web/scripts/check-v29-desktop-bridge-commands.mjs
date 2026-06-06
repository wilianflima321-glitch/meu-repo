#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing file: ${relativePath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function expectToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

const main = read('../../apps/studio-local/src-tauri/src/main.rs')
const adapter = read('../../apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts')
const sharedTypes = read('../../packages/aethel-ide-shared/src/runtime-adapter/types.ts')
const webAdapter = read('../../packages/aethel-ide-shared/src/runtime-adapter/web-adapter.ts')
const contract = read('lib/runtime/v29-internal-spine.ts')
const packageJson = JSON.parse(read('package.json') || '{}')

const commands = [
  'fs_read',
  'fs_write',
  'fs_list',
  'terminal_create',
  'terminal_write',
  'terminal_close',
  'ai_complete',
  'notify_native',
  'window_minimize',
  'window_toggle_maximize',
  'window_close',
  'local_runtime_probe',
  'local_runtime_probe_report',
  'local_runtime_sidecars',
  'jobs_route',
  'jobs_list',
  'jobs_cancel',
]

for (const command of commands) {
  expectToken('tauri main', main, command)
  expectToken('v29 desktop bridge contract', contract, command)
}

for (const token of [
  'RuntimeJobStore',
  'Mutex',
  'tauri::State',
  'desktop_commands::fs_read',
  'desktop_commands::fs_write',
  'desktop_commands::fs_list',
  'desktop_commands::terminal_create',
  'desktop_commands::terminal_write',
  'desktop_commands::terminal_close',
  'desktop_commands::ai_complete',
  'desktop_commands::notify_native',
  'desktop_commands::window_minimize',
  'resolve_runtime_target',
  'build_sidecar_capability_manifest',
  'parse_job_lane',
  'target_lane',
]) {
  expectToken('tauri main', main, token)
}

for (const token of [
  "invoke<string>('fs_read'",
  "invoke<void>('fs_write'",
  "invoke<Array<{ path: string; type: 'file' | 'folder' }>>('fs_list'",
  "invoke<{ id: string }>('terminal_create'",
  "invoke<void>('terminal_write'",
  "invoke<void>('terminal_close'",
  "invoke('ai_complete'",
  "invoke<RuntimeProbe>('local_runtime_probe')",
  "invoke<StudioLocalRouteJobResult>('jobs_route'",
  'RuntimeLane',
  'requiresHumanApproval',
]) {
  expectToken('desktop adapter', adapter, token)
}

for (const token of ["'held'", "'local-worker'", 'RuntimeLane']) {
  expectToken('shared runtime types', sharedTypes, token)
}
for (const token of ['RuntimeLane', 'jsonFetch<{ lane?: RuntimeLane; reason?: string }']) {
  expectToken('web runtime adapter', webAdapter, token)
}

for (const token of [
  'V29DesktopBridgeCommandContract',
  'V29_DESKTOP_BRIDGE_COMMAND_CONTRACT',
  'held-targets-stay-held',
  "command: 'terminal_create'",
  "command: 'terminal_write'",
  "command: 'terminal_close'",
  "command: 'ai_complete'",
  "state: 'held'",
  "state: 'provider_unavailable'",
  'Desktop adapter must not coerce held/native runtime decisions',
]) {
  expectToken('v29 desktop bridge contract', contract, token)
}

if (!packageJson.scripts?.['qa:v29-desktop-bridge-commands']) {
  failures.push('package.json: missing qa:v29-desktop-bridge-commands')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_DESKTOP_BRIDGE_COMMANDS.md'),
  `# V29 Desktop Bridge Commands\n\nCommands: ${commands.join(', ')}\nGuarded filesystem: fs_read/fs_write/fs_list\nHeld terminal: terminal_create/terminal_write/terminal_close\nProvider unavailable: ai_complete/notify_native\nFailures: ${failures.length}\n`,
)

if (failures.length) {
  console.error('[v29-desktop-bridge-commands] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v29-desktop-bridge-commands] PASS commands=${commands.length} held=preserved`)

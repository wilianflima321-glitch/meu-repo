#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
function exists(relativePath) { return fs.existsSync(path.join(ROOT, relativePath)) }
function read(relativePath) { return exists(relativePath) ? fs.readFileSync(path.join(ROOT, relativePath), 'utf8') : '' }

const contract =
  read('lib/runtime/v29-internal-spine.ts') ||
  read('../packages/runtime/v29-internal-spine.ts')
const desktopManifest = read('../../apps/studio-local/src/desktop-capability-manifest.ts')

for (const token of ['DesktopCapabilityManifest', 'DesktopSidecarCapability', 'tauri-web-shell', 'quarantined-not-ship-path', 'native renderer ready', 'signed installer']) {
  if (!contract.includes(token)) failures.push(`v29 contract missing ${token}`)
}
for (const token of [
  'STUDIO_LOCAL_DESKTOP_MANIFEST',
  'tauri-web-shell',
  'quarantined-not-ship-path',
  'machine-probe',
  'sidecar-manager',
  'native-renderer',
  'signed-installer',
  'electron ship path',
]) {
  if (!desktopManifest.includes(token)) failures.push(`desktop manifest missing ${token}`)
}
if (desktopManifest.includes('absorbed-by-studio-local')) {
  failures.push('desktop manifest must not claim absorbed-by-studio-local — Electron templates are quarantined')
}
for (const required of [
  '../../apps/studio-local/index.html',
  '../../apps/studio-local/src/main.tsx',
  '../../apps/studio-local/src/StudioLocalApp.tsx',
  '../../apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts',
  '../../apps/studio-local/src-tauri/src/probe.rs',
  '../../apps/studio-local/src-tauri/src/policy.rs',
  '../../apps/studio-local/src-tauri/src/sidecars.rs',
  '../../runtime-templates/QUARANTINED.md',
  '../../runtime-templates/linux',
  '../../runtime-templates/macos',
  '../../runtime-templates/windows',
]) {
  if (!exists(required)) failures.push(`missing desktop evidence: ${required}`)
}

const quarantine = read('../../runtime-templates/QUARANTINED.md')
if (!/NOT a ship path/i.test(quarantine)) {
  failures.push('runtime-templates/QUARANTINED.md must declare NOT a ship path')
}

const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts?.['qa:v29-desktop-capability-manifest']) failures.push('package.json: missing qa:v29-desktop-capability-manifest')
if (!packageJson.scripts?.['qa:agent-shell-policy']) failures.push('package.json: missing qa:agent-shell-policy')

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_DESKTOP_CAPABILITY_MANIFEST.md'),
  `# V29 Desktop Capability Manifest\n\nTarget: tauri-web-shell\nRuntime templates: quarantined-not-ship-path\nFailures: ${failures.length}\n`,
)

if (failures.length) {
  console.error('[v29-desktop-capability-manifest] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('[v29-desktop-capability-manifest] PASS target=tauri-web-shell templates=quarantined')

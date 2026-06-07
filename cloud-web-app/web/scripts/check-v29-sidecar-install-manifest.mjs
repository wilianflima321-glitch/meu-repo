#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function readWeb(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function readRepo(relativePath) {
  const absolutePath = path.join(REPO_ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

function parseJsonRepo(relativePath) {
  try {
    return JSON.parse(readRepo(relativePath))
  } catch {
    failures.push(`${relativePath}: invalid JSON`)
    return {}
  }
}

const contract = readWeb('lib/runtime/v29-sidecar-install-manifest.ts')
const test = readWeb('__tests__/runtime/v29-sidecar-install-manifest.test.ts')
const releaseManifest = readWeb('lib/studio-local/release-manifest.ts')
const desktopManifest = readRepo('apps/studio-local/src/desktop-capability-manifest.ts')
const totalSpine = readWeb('scripts/check-v29-total-spine.mjs')
const sidecarLifecycleGate = readWeb('scripts/check-v29-sidecar-lifecycle.mjs')
const bootstrapGate = readWeb('scripts/check-v29-bootstrap-reproducibility.mjs')
const browserRunnerStateGate = readWeb('scripts/check-v29-runtime-failure-smoke-browser-runner-state.mjs')
const packageJson = JSON.parse(readWeb('package.json') || '{}')

for (const token of [
  'AETHEL_V29_SIDECAR_INSTALL_MANIFEST',
  'V29SidecarInstallManifest',
  'V29SidecarInstallArtifact',
  'V29_REQUIRED_INSTALL_OS_TARGETS',
  'buildV29SidecarInstallManifest',
  'validateV29SidecarInstallManifest',
  'buildV29SidecarInstallArtifact',
  'checksumRef',
  'signatureRef',
  'smokeTestRef',
  'rollbackRef',
  'public download ready',
  'signed installer',
]) {
  requireToken('sidecar install contract', contract, token)
}

for (const token of [
  'accepts complete install/update evidence',
  'keeps template-only OS artifacts blocked',
  'rejects manifests missing OS targets',
  'windows: checksum receipt is missing',
]) {
  requireToken('sidecar install tests', test, token)
}

for (const token of [
  'signedInstallers',
  'windows-installer',
  'macos-notarized-dmg',
  'linux-appimage-deb',
  'auto-updater',
  'sidecar-health',
  'checksum',
  'rollback',
]) {
  requireToken('studio local release manifest', releaseManifest, token)
}

for (const token of [
  'runtimeTemplatesPolicy',
  'absorbed-by-studio-local',
  'updateChannels',
  'signed-installer',
]) {
  requireToken('desktop manifest', desktopManifest, token)
}

const templates = {
  windows: parseJsonRepo('runtime-templates/windows/package.json'),
  macos: parseJsonRepo('runtime-templates/macos/package.json'),
  linux: parseJsonRepo('runtime-templates/linux/package.json'),
}

const requiredBuildScripts = {
  windows: ['build', 'build:portable'],
  macos: ['build', 'build:dmg', 'build:universal'],
  linux: ['build', 'build:deb', 'build:appimage'],
}

for (const [os, manifest] of Object.entries(templates)) {
  if (!manifest.name) failures.push(`runtime-templates/${os}/package.json: missing name`)
  if (!manifest.version) failures.push(`runtime-templates/${os}/package.json: missing version`)
  if (!manifest.dependencies?.three) failures.push(`runtime-templates/${os}/package.json: missing three dependency`)
  if (!manifest.dependencies?.['@dimforge/rapier3d-compat']) {
    failures.push(`runtime-templates/${os}/package.json: missing rapier dependency`)
  }
  for (const script of requiredBuildScripts[os]) {
    if (!manifest.scripts?.[script]) failures.push(`runtime-templates/${os}/package.json: missing ${script} script`)
  }
}

requireToken('v29 total gate', totalSpine, 'check-v29-sidecar-install-manifest.mjs')
requireToken('v29 total gate', totalSpine, 'gates=33')
requireToken('sidecar lifecycle gate count', sidecarLifecycleGate, 'gates=33')
requireToken('bootstrap gate count', bootstrapGate, 'gates=33')
requireToken('browser runner gate count', browserRunnerStateGate, 'gates=33')

if (packageJson.scripts?.['qa:v29-sidecar-install-manifest'] !== 'node scripts/check-v29-sidecar-install-manifest.mjs') {
  failures.push('package.json: missing qa:v29-sidecar-install-manifest script')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_SIDECAR_INSTALL_MANIFEST.md'),
  `# V29 Sidecar Install Manifest

- Capability: AETHEL_V29_SIDECAR_INSTALL_MANIFEST
- OS templates: windows=${templates.windows.version ?? 'missing'}, macos=${templates.macos.version ?? 'missing'}, linux=${templates.linux.version ?? 'missing'}
- Required release receipts: checksum, signature, install smoke, rollback, update feed
- Release ready: false
- Claims blocked: signed installer, public download ready, desktop ready, native renderer ready
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[v29-sidecar-install-manifest] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-sidecar-install-manifest] PASS os=3 templates=true receipts=checksum+signature+smoke+rollback releaseHeld=true')

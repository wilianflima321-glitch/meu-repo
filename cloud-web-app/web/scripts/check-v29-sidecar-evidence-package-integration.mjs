#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(label, content, token) {
  if (!content.includes(token)) failures.push(`${label}: missing ${token}`)
}

const evidencePackage = read('lib/production/runtime-execution-evidence-package.ts')
const packageGate = read('scripts/check-runtime-execution-evidence-package.mjs')
const packageRoute = read('app/api/projects/[id]/production-state/runtime-execution-evidence-package/route.ts')
const receiptsRoute = read('app/api/projects/[id]/production-state/runtime-job-receipts/route.ts')
const lifecycleContract = read('lib/runtime/v29-sidecar-lifecycle.ts')
const installContract = read('lib/runtime/v29-sidecar-install-manifest.ts')
const test = read('__tests__/runtime/runtime-execution-evidence-package-sidecars.test.ts')
const totalSpine = read('scripts/check-v29-total-spine.mjs')
const packageJson = JSON.parse(read('package.json') || '{}')

for (const token of [
  'V29SidecarLifecycleReport',
  'V29SidecarInstallManifest',
  'sidecarLifecycleReport',
  'sidecarInstallManifest',
  'Sidecar lifecycle report is missing from the evidence package.',
  'Sidecar install manifest is missing from the evidence package.',
  'Runtime execution package must include sidecar lifecycle report.',
  'Runtime execution package must include sidecar install manifest.',
  'sidecar-lifecycle-report:',
  'sidecar-install-manifest:',
  'native renderer ready',
  'signed installer',
  'public download ready',
]) {
  requireToken('runtime execution evidence package', evidencePackage, token)
}

for (const token of [
  'V29_SIDECAR_LIFECYCLE_REPORT_SETTINGS_KEY',
  'readV29SidecarLifecycleReportFromSettings',
  'writeV29SidecarLifecycleReportToSettings',
]) {
  requireToken('sidecar lifecycle contract', lifecycleContract, token)
}

for (const token of [
  'V29_SIDECAR_INSTALL_MANIFEST_SETTINGS_KEY',
  'readV29SidecarInstallManifestFromSettings',
  'writeV29SidecarInstallManifestToSettings',
]) {
  requireToken('sidecar install contract', installContract, token)
}

for (const token of [
  'v29-sidecar-lifecycle-report',
  'v29-sidecar-install-manifest',
  'writeV29SidecarLifecycleReportToSettings',
  'writeV29SidecarInstallManifestToSettings',
  'readV29SidecarLifecycleReportFromSettings',
  'readV29SidecarInstallManifestFromSettings',
]) {
  requireToken('runtime evidence package route', packageRoute, token)
}

for (const token of [
  'readV29SidecarLifecycleReportFromSettings',
  'readV29SidecarInstallManifestFromSettings',
  'sidecarLifecycleReport',
  'sidecarInstallManifest',
]) {
  requireToken('runtime job receipts route', receiptsRoute, token)
}

for (const token of [
  'runtime execution evidence package sidecar integration',
  'blocks package review when sidecar lifecycle or install manifest is missing',
  'attaches sidecar refs and keeps installer/native claims prohibited',
  'Runtime execution package must include sidecar lifecycle report.',
  'Claim policy must prohibit public download ready.',
]) {
  requireToken('sidecar evidence package integration test', test, token)
}

for (const token of [
  'sidecarLifecycleReport',
  'sidecarInstallManifest',
  'sidecar-lifecycle-report:',
  'sidecar-install-manifest:',
  'sidecars=true',
]) {
  requireToken('runtime execution package gate', packageGate, token)
}

requireToken('v29 total spine gate', totalSpine, 'check-v29-sidecar-evidence-package-integration.mjs')
requireToken('v29 total spine gate', totalSpine, 'gates=33')

if (
  packageJson.scripts?.['qa:v29-sidecar-evidence-package-integration'] !==
  'node scripts/check-v29-sidecar-evidence-package-integration.mjs'
) {
  failures.push('package.json: missing qa:v29-sidecar-evidence-package-integration script')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_SIDECAR_EVIDENCE_PACKAGE_INTEGRATION.md'),
  `# V29 Sidecar Evidence Package Integration

- Runtime package requires sidecar lifecycle report: yes
- Runtime package requires sidecar install manifest: yes
- Routes can persist sidecar lifecycle/install evidence: yes
- Receipts route attaches sidecar evidence to generated packages: yes
- Claims blocked: native renderer ready, signed installer, public download ready
- Release ready: false
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[v29-sidecar-evidence-package-integration] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-sidecar-evidence-package-integration] PASS package=true routes=true claimsHeld=true')

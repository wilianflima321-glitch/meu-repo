#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const file = 'lib/runtime/v29-internal-spine.ts'
const full = path.join(ROOT, file)
const failures = []
const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
if (!content) failures.push(`${file}: missing`)

const tokens = [
  'V29SubsystemOwnership',
  'V29BaselineInventory',
  'WorkbenchConvergenceReport',
  'DesktopCapabilityManifest',
  'DesktopSidecarCapability',
  'CreativeToolchainContract',
  'PrismaModelCoverageMatrix',
  'V29_SUBSYSTEM_OWNERSHIP',
  'ide-workbench',
  'agents-execution',
  'research-evidence',
  'runtime-production',
  'desktop-studio-local',
  'creative-tools',
  'data-prisma-tenancy',
  'qa-observability',
  'validateV29SubsystemOwnership',
]
for (const token of tokens) if (!content.includes(token)) failures.push(`${file}: missing ${token}`)

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts ?? {}
for (const name of ['qa:v29-subsystem-ownership', 'qa:v29-total-spine']) {
  if (!script[name]) failures.push(`package.json: missing ${name}`)
}
if (!script['qa:internal-runtime-priority-gate']?.includes('qa:v29-total-spine')) {
  failures.push('package.json: qa:internal-runtime-priority-gate must include qa:v29-total-spine')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_SUBSYSTEM_OWNERSHIP.md'), `# V29 Subsystem Ownership\n\nFailures: ${failures.length}\n`)

if (failures.length) {
  console.error('[v29-subsystem-ownership] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('[v29-subsystem-ownership] PASS subsystems=8')

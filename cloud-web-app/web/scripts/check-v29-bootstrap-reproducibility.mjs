#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function existsFromRepo(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath))
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

const contractFile = 'lib/runtime/v29-bootstrap-reproducibility.ts'
const testFile = '__tests__/runtime/v29-bootstrap-reproducibility.test.ts'
const totalSpineGate = 'scripts/check-v29-total-spine.mjs'
const packageJson = JSON.parse(read('package.json'))

for (const token of [
  'AETHEL_V29_BOOTSTRAP_REPRODUCIBILITY',
  'V29BootstrapReproducibilityReport',
  'V29BootstrapWorkspace',
  'V29BootstrapDependency',
  'buildV29BootstrapReproducibilityReport',
  'validateV29BootstrapReproducibilityReport',
  'buildV29BootstrapDependency',
  'desktop ready',
  'native renderer ready',
  'releaseReady=true',
  'Human review is required before claiming reproducible setup',
]) {
  requireToken(contractFile, token, `bootstrap contract token: ${token}`)
}

for (const token of [
  'records missing lockfiles as blockers',
  'web: lockfile is missing, reproducible bootstrap is not proven',
  'ffmpeg: required dependency is missing',
  'rejects structurally incomplete reports',
]) {
  requireToken(testFile, token, `bootstrap test token: ${token}`)
}

requireToken(totalSpineGate, 'check-v29-bootstrap-reproducibility.mjs', 'v29 total gate inclusion')
requireToken(totalSpineGate, 'gates=33', 'v29 gate count')

if (packageJson.scripts?.['qa:v29-bootstrap-reproducibility'] !== 'node scripts/check-v29-bootstrap-reproducibility.mjs') {
  failures.push('package.json: missing qa:v29-bootstrap-reproducibility script')
}

const lockfiles = [
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'cloud-web-app/web/package-lock.json',
  'cloud-web-app/web/pnpm-lock.yaml',
  'cloud-web-app/web/yarn.lock',
  'cloud-web-app/web/bun.lockb',
  'apps/studio-local/package-lock.json',
  'apps/studio-local/pnpm-lock.yaml',
  'apps/studio-local/yarn.lock',
  'apps/studio-local/bun.lockb',
  'apps/studio-local/src-tauri/Cargo.lock',
]
const presentLockfiles = lockfiles.filter(existsFromRepo)
const workspaces = [
  {
    id: 'web',
    path: 'cloud-web-app/web',
    lockfilePresent: lockfiles.slice(4, 8).some(existsFromRepo),
  },
  {
    id: 'studio-local',
    path: 'apps/studio-local',
    lockfilePresent: lockfiles.slice(8, 12).some(existsFromRepo),
  },
  {
    id: 'studio-local-tauri',
    path: 'apps/studio-local/src-tauri',
    lockfilePresent: existsFromRepo('apps/studio-local/src-tauri/Cargo.lock'),
  },
]
const toolchains = [
  { id: 'ffmpeg', status: 'held', evidence: existsFromRepo('apps/studio-local/src-tauri/src/sidecars.rs') },
  { id: 'onnxruntime', status: 'held', evidence: existsFromRepo('apps/studio-local/src-tauri/src/sidecars.rs') },
  { id: 'tauri-kernel', status: existsFromRepo('apps/studio-local/src-tauri/Cargo.toml') ? 'available' : 'missing', evidence: existsFromRepo('apps/studio-local/src-tauri/Cargo.toml') },
  { id: 'runtime-templates', status: existsFromRepo('runtime-templates/windows/package.json') ? 'needs-review' : 'missing', evidence: existsFromRepo('runtime-templates/windows/package.json') },
]
const blockers = [
  ...workspaces.filter((workspace) => !workspace.lockfilePresent).map((workspace) => `${workspace.id}: lockfile is missing, reproducible bootstrap is not proven`),
  ...toolchains.filter((toolchain) => toolchain.status === 'missing').map((toolchain) => `${toolchain.id}: required dependency is missing`),
  ...toolchains.filter((toolchain) => toolchain.status === 'held').map((toolchain) => `${toolchain.id}: dependency is held and cannot support release claims`),
  'Human review is required before claiming reproducible setup, desktop readiness, or native runtime readiness.',
]

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V29_BOOTSTRAP_REPRODUCIBILITY.md'),
  `# V29 Bootstrap Reproducibility

- Capability: AETHEL_V29_BOOTSTRAP_REPRODUCIBILITY
- Present lockfiles: ${presentLockfiles.length ? presentLockfiles.join(', ') : 'none'}
- Web lockfile: ${workspaces[0].lockfilePresent ? 'present' : 'missing'}
- Studio Local lockfile: ${workspaces[1].lockfilePresent ? 'present' : 'missing'}
- Tauri Cargo lockfile: ${workspaces[2].lockfilePresent ? 'present' : 'missing'}
- Toolchains: ${toolchains.map((toolchain) => `${toolchain.id}:${toolchain.status}`).join(', ')}
- Release ready: false
- Blockers:
${blockers.map((blocker) => `  - ${blocker}`).join('\n')}
`,
)

if (failures.length > 0) {
  console.error('[v29-bootstrap-reproducibility] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[v29-bootstrap-reproducibility] PASS lockfiles=${presentLockfiles.length} webLock=${workspaces[0].lockfilePresent} tauriLock=${workspaces[2].lockfilePresent} releaseHeld=true`,
)

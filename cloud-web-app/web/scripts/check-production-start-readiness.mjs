#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []
const warnings = []

function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) return null
  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
}

const pkg = readJson('package.json') ?? {}
const build = String(pkg.scripts?.build ?? '')
const productionBuild = String(pkg.scripts?.['build:production'] ?? '')

if (!build.includes('--experimental-build-mode compile')) {
  warnings.push('npm run build is not the fast compile gate; local CI may become slow on this Windows workspace')
}
if (!productionBuild.includes('next build')) {
  failures.push('missing npm run build:production')
}
if (productionBuild.includes('--experimental-build-mode compile')) {
  failures.push('build:production must not use compile-only mode')
}

const startReadyFiles = [
  '.next/BUILD_ID',
  '.next/server/app-paths-manifest.json',
  '.next/server/pages-manifest.json',
  '.next/prerender-manifest.json',
]
const missingStartFiles = startReadyFiles.filter((file) => !fs.existsSync(path.join(ROOT, file)))
const state = missingStartFiles.length === 0 ? 'available' : 'held'
if (state === 'held') {
  warnings.push(`next start evidence held; missing ${missingStartFiles.join(', ')}`)
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'PRODUCTION_START_READINESS_AUDIT.md'),
  `# Production Start Readiness Audit

- Default build: ${build}
- Production build: ${productionBuild}
- State: ${state}
- Missing start files: ${missingStartFiles.length ? missingStartFiles.join(', ') : 'none'}
- Warnings: ${warnings.length}
- Failures: ${failures.length}

## Notes

The fast local/CI build can remain compile-only, but any release, screenshot capture, or local production smoke test must run \`npm run build:production\` first and then \`next start\`.
`,
)

if (failures.length > 0) {
  console.error(`[production-start-readiness] FAIL state=${state}`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn(`[production-start-readiness] WARN state=${state}`)
  for (const warning of warnings) console.warn(`- ${warning}`)
}

console.log(`[production-start-readiness] PASS state=${state}`)

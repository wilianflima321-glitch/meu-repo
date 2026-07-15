#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(process.cwd(), '../..')
const failures = []

function read(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

const readme = read('README.md')
const statusDoc = read('docs/master/100_AUDITORIA_V22_EXECUTION_STATUS_2026-05-25.md')

if (/AUDITORIA_V5|V5_AETHEL|2026-04-19/.test(readme)) {
  failures.push('README.md still points to stale V5-era audit docs')
}

if (!/100_AUDITORIA_V22_EXECUTION_STATUS_2026-05-25\.md/.test(readme)) {
  failures.push('README.md must point to V22 execution status')
}

if (!/DEEP_GAME_PRODUCTION_BIBLE_V22\.md/.test(readme)) {
  failures.push('README.md must point to deep production bible docs')
}

if (!/supersedes older README pointers to V5-era audits/.test(statusDoc)) {
  failures.push('V22 execution status must explicitly supersede stale V5 pointers')
}

if (!/No autonomous AAA claim/.test(statusDoc) || !/No raw text-to-3D mesh as final hero asset/.test(statusDoc)) {
  failures.push('V22 execution status must keep honest claims and asset quality guardrails')
}

if (/aethel\.studio/.test(readme)) {
  failures.push('README.md must not point product identity to aethel.studio')
}

if (failures.length) {
  console.error('[canonical-docs-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[canonical-docs-spine] PASS canonical=V22 stale=blocked')

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: ${reason}`)
}

requirePattern(
  'lib/ai-tools-registry.ts',
  /getProjectFileStore\(\)/,
  'agent file tools must route through ProjectFileStore',
)

requirePattern(
  'lib/server/ai-change-apply/mirror-canonical-store.ts',
  /getProjectFileStore/,
  'apply mirror must use ProjectFileStore',
)

const registry = read('lib/ai-tools-registry.ts')
if (/prisma\.file\.(create|update|upsert)/.test(registry)) {
  failures.push('lib/ai-tools-registry.ts: direct prisma.file writes bypass ProjectFileStore')
}

if (failures.length > 0) {
  console.error('[phase-a-store-coverage] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[phase-a-store-coverage] PASS')

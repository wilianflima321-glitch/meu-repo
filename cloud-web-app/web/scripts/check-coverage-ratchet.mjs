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
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${pattern} (${reason})`)
}

function requireThresholds(relativePath) {
  for (const metric of ['statements', 'branches', 'functions', 'lines']) {
    requirePattern(
      relativePath,
      new RegExp(`${metric}:\\s*(7[0-9]|8[0-9]|9[0-9]|100)\\b`),
      `${metric} coverage threshold must be at least 70%`
    )
  }
}

const pkg = JSON.parse(read('package.json'))
const vitest = pkg.devDependencies?.vitest ?? ''
const coverage = pkg.devDependencies?.['@vitest/coverage-v8'] ?? ''

requireThresholds('vitest.config.ts')
requireThresholds('jest.config.ts')
requirePattern('vitest.config.ts', /provider:\s*'v8'/, 'Vitest coverage provider must be configured')
requirePattern('package.json', /"test:coverage":\s*"vitest run --coverage"/, 'coverage command must remain executable')

if (!/\^?4\.1\./.test(vitest) || !/\^?4\.1\./.test(coverage)) {
  failures.push(`package.json: vitest (${vitest}) and @vitest/coverage-v8 (${coverage}) must stay on the same 4.1.x line`)
}

if (failures.length) {
  console.error('[coverage-ratchet] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[coverage-ratchet] PASS vitest=${vitest} coverage=${coverage} thresholds>=70`)

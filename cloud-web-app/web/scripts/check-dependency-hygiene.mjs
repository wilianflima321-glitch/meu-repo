#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const pkgPath = path.join(ROOT, 'package.json')
const failures = []

if (!fs.existsSync(pkgPath)) {
  console.error('[dependency-hygiene] FAIL missing package.json')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const dependencies = pkg.dependencies ?? {}
const devDependencies = pkg.devDependencies ?? {}

const forbiddenRuntimePackages = [
  '@testing-library/dom',
  '@testing-library/jest-dom',
  '@testing-library/react',
  '@types/pako',
  'openapi-types',
  'jest',
  'vitest',
  'storybook',
]

for (const name of forbiddenRuntimePackages) {
  if (dependencies[name]) failures.push(`${name} must stay in devDependencies, not dependencies`)
}

if (Object.keys(devDependencies).length < 40) {
  failures.push(`devDependencies unexpectedly low (${Object.keys(devDependencies).length}); dependency split may have regressed`)
}

for (const required of ['@testing-library/dom', '@types/pako', 'openapi-types']) {
  if (!devDependencies[required]) failures.push(`${required} must be present in devDependencies`)
}

const openApiSpec = fs.readFileSync(path.join(ROOT, 'lib/openapi-spec.ts'), 'utf8')
if (!/import type \{ OpenAPIV3 \} from 'openapi-types'/.test(openApiSpec)) {
  failures.push('lib/openapi-spec.ts must import openapi-types as type-only')
}

if (failures.length) {
  console.error('[dependency-hygiene] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[dependency-hygiene] PASS deps=${Object.keys(dependencies).length} devDeps=${Object.keys(devDependencies).length}`)

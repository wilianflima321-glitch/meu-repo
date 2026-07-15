#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

const scannedRoots = [
  'app',
  'components/dashboard',
  'components/admin',
  'components/product',
]

const allowedAppPrefixes = [
  'app/ide/',
  'app/studio/',
  'app/nexus/',
  'app/api/',
]

const heavyPackages = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@monaco-editor/react',
  'monaco-editor',
]

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, results)
    } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      results.push(toPosix(path.relative(ROOT, full)))
    }
  }
  return results
}

const files = scannedRoots.flatMap((root) => walk(path.join(ROOT, root)))

function packageRegex(pkg) {
  const escaped = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?:from\\s+['"]${escaped}['"]|import\\(['"]${escaped}['"]\\))`)
}

for (const file of files) {
  if (allowedAppPrefixes.some((prefix) => file.startsWith(prefix))) continue
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8')
  for (const pkg of heavyPackages) {
    if (packageRegex(pkg).test(content)) {
      failures.push(`${file}: public/dashboard/admin/product shell must not import ${pkg} directly`)
    }
  }
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_HEAVY_RUNTIME_BOUNDARIES.md'),
  [
    '# V30 Heavy Runtime Boundaries',
    '',
    `Scanned roots: ${scannedRoots.join(', ')}`,
    `Allowed app prefixes: ${allowedAppPrefixes.join(', ')}`,
    `Forbidden direct packages: ${heavyPackages.join(', ')}`,
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-heavy-runtime-boundaries] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v30-heavy-runtime-boundaries] PASS scanned=${files.length} packages=${heavyPackages.length}`)

#!/usr/bin/env node
/**
 * scripts/codemod-three-imports.mjs
 *
 * Safe inventory for direct `from 'three'` value imports.
 *
 * This file intentionally does not rewrite source. Moving Three.js value imports
 * to `loadThree()` requires call-site refactors because the enclosing functions
 * must become async or cross an existing dynamic/runtime boundary.
 *
 * Usage:
 *   node scripts/codemod-three-imports.mjs
 *   node scripts/codemod-three-imports.mjs --verify --max=132
 *   node scripts/codemod-three-imports.mjs --report reports/three-imports.json
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { dirname, extname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const root = join(scriptDir, '..')
const verify = process.argv.includes('--verify')
const writeRequested = process.argv.includes('--write')
const reportIndex = process.argv.indexOf('--report')
const inlineReportArg = process.argv.find((arg) => arg.startsWith('--report='))
const reportPath = inlineReportArg
  ? inlineReportArg.slice('--report='.length)
  : reportIndex >= 0
    ? process.argv[reportIndex + 1]
    : null
const maxIndex = process.argv.indexOf('--max')
const inlineMaxArg = process.argv.find((arg) => arg.startsWith('--max='))
const parsedMaxAllowedDirectValueImports = Number.parseInt(
  inlineMaxArg
    ? inlineMaxArg.slice('--max='.length)
    : maxIndex >= 0
      ? process.argv[maxIndex + 1]
      : '132',
  10,
)

const scanDirs = ['app', 'components', 'lib', 'pages', 'hooks']
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx'])
// Current V30 ratchet after converting type-only Three namespace imports.
// Lower this number as value imports move behind `loadThree()` async boundaries.
const maxAllowedDirectValueImports = Number.isFinite(parsedMaxAllowedDirectValueImports)
  ? parsedMaxAllowedDirectValueImports
  : 132

const allowlistPatterns = [
  /lib[/\\]three[/\\]index\.ts$/,
  /\.stories\.tsx?$/,
  /\.test\.tsx?$/,
  /\.spec\.tsx?$/,
  /__tests__[/\\]/,
  /vitest\.setup/,
]

const importFromThreeRe = /^\s*import\s+([^;]+?)\s+from\s+['"]three['"]/gm
const typeImportRe = /^\s*import\s+type\s+/m

function walk(dir, files = []) {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, files)
    else if (extensions.has(extname(entry))) files.push(full)
  }
  return files
}

function isAllowed(filePath) {
  const rel = relative(root, filePath).replace(/\\/g, '/')
  return allowlistPatterns.some((pattern) => pattern.test(rel))
}

function classifyFile(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const imports = [...source.matchAll(importFromThreeRe)].map((match) => match[0])
  const typeImports = imports.filter((line) => typeImportRe.test(line)).length
  const valueImports = imports.length - typeImports
  return {
    file: relative(root, filePath).replace(/\\/g, '/'),
    totalImports: imports.length,
    typeImports,
    valueImports,
    allowed: isAllowed(filePath),
  }
}

function main() {
  if (writeRequested) {
    console.error('[three-imports] FAIL --write is disabled. This audit is intentionally non-mutating.')
    console.error('[three-imports] Refactor each value import to loadThree() at an async runtime boundary.')
    process.exit(2)
  }

  const files = scanDirs.flatMap((dir) => walk(join(root, dir)))
  const records = files.map(classifyFile).filter((record) => record.totalImports > 0)
  const blocked = records.filter((record) => record.valueImports > 0 && !record.allowed)
  const allowedValueImports = records.filter((record) => record.valueImports > 0 && record.allowed)
  const totalBlockedValueImports = blocked.reduce((sum, record) => sum + record.valueImports, 0)

  const payload = {
    generatedAt: new Date().toISOString(),
    root: relative(process.cwd(), root) || '.',
    maxAllowedDirectValueImports,
    totalBlockedValueImports,
    filesRequiringMigration: blocked.length,
    allowedValueImportFiles: allowedValueImports.length,
    blocked,
  }

  console.log('[three-imports] direct value imports:', totalBlockedValueImports)
  console.log('[three-imports] files requiring migration:', blocked.length)
  for (const record of blocked.slice(0, 40)) {
    console.log(`${String(record.valueImports).padStart(3)}  ${record.file}`)
  }
  if (blocked.length > 40) console.log(`... and ${blocked.length - 40} more`)

  if (reportPath) {
    const absoluteReportPath = join(process.cwd(), reportPath)
    mkdirSync(dirname(absoluteReportPath), { recursive: true })
    writeFileSync(absoluteReportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    console.log('[three-imports] report:', reportPath)
  }

  if (verify && totalBlockedValueImports > maxAllowedDirectValueImports) {
    console.error(`[three-imports] FAIL ${totalBlockedValueImports} direct value imports > ${maxAllowedDirectValueImports}`)
    process.exit(1)
  }

  if (verify) console.log('[three-imports] PASS')
}

main()

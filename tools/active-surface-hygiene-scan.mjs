#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnIssues = args.includes('--fail-on-issues')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null

const repoRoot = process.cwd()
const scanRoots = [
  'cloud-web-app/web/app',
  'cloud-web-app/web/components',
  'cloud-web-app/web/lib',
  'cloud-web-app/web/hooks',
]

function isIgnored(name) {
  return name === '.next' || name === 'node_modules' || name === '.git'
}

function listEmptyDirectories(rootRelative) {
  const rootAbsolute = path.resolve(repoRoot, rootRelative)
  if (!fs.existsSync(rootAbsolute)) return []
  const empties = []
  const stack = [rootAbsolute]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .filter((entry) => !isIgnored(entry.name))

    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name))
      }
    }

    if (entries.length === 0 && current !== rootAbsolute) {
      const relative = path.relative(repoRoot, current).replace(/\\/g, '/')
      empties.push(relative)
    }
  }

  return empties.sort((a, b) => a.localeCompare(b))
}

const emptyByRoot = scanRoots.map((root) => ({
  root,
  empties: listEmptyDirectories(root),
}))
const emptyTotal = emptyByRoot.reduce((acc, item) => acc + item.empties.length, 0)

function buildReport() {
  const generatedAt = new Date().toISOString()
  const lines = []
  lines.push('# 37_ACTIVE_SURFACE_HYGIENE_MATRIX_2026-02-22')
  lines.push('Status: GENERATED ACTIVE SURFACE HYGIENE SWEEP')
  lines.push(`Generated: ${generatedAt}`)
  lines.push('')
  lines.push('## Summary')
  lines.push(`- Scan roots: ${scanRoots.length}`)
  lines.push(`- Empty directories in active surfaces: ${emptyTotal}`)
  lines.push('')

  for (const item of emptyByRoot) {
    lines.push(`## Root: \`${item.root}\``)
    if (item.empties.length === 0) {
      lines.push('- none')
      lines.push('')
      continue
    }
    lines.push('| Directory |')
    lines.push('| --- |')
    for (const dir of item.empties) {
      lines.push(`| \`${dir}\` |`)
    }
    lines.push('')
  }

  lines.push('## Policy')
  lines.push('1. Empty directories in active product surfaces must be removed or explicitly justified.')
  lines.push('2. `_deprecated` empty folders should be cleaned to reduce repository noise.')
  lines.push('3. This scan is informational unless `--fail-on-issues` is used.')
  lines.push('')
  return lines.join('\n')
}

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, `${buildReport()}\n`, 'utf8')
}

const output = {
  generatedAt: new Date().toISOString(),
  scanRoots: scanRoots.length,
  emptyDirectories: emptyTotal,
}

console.log(JSON.stringify(output, null, 2))

if (failOnIssues && emptyTotal > 0) {
  process.exit(1)
}

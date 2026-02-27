#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnGrowth = args.includes('--fail-on-growth')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null
const lineThresholdIndex = args.findIndex((arg) => arg === '--line-threshold')
const lineThreshold =
  lineThresholdIndex >= 0 && args[lineThresholdIndex + 1]
    ? Number.parseInt(args[lineThresholdIndex + 1], 10)
    : 900
const maxFilesIndex = args.findIndex((arg) => arg === '--max-files')
const maxFiles =
  maxFilesIndex >= 0 && args[maxFilesIndex + 1]
    ? Number.parseInt(args[maxFilesIndex + 1], 10)
    : null

const repoRoot = process.cwd()
const targets = [
  'cloud-web-app/web/app',
  'cloud-web-app/web/components',
  'cloud-web-app/web/lib',
  'cloud-web-app/web/hooks',
  'cloud-web-app/web/scripts',
]

const textExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.css',
  '.html',
  '.sh',
  '.ps1',
])

const skipDirs = new Set(['node_modules', '.next', '.git', '.venv', 'dist', 'build'])

function walkFiles(baseDir, out = []) {
  let entries = []
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    const absolute = path.join(baseDir, entry.name)
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      walkFiles(absolute, out)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!textExtensions.has(ext)) continue
    out.push(absolute)
  }
  return out
}

function countLines(content) {
  if (!content) return 0
  return content.split(/\r?\n/).length
}

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
}

const allFiles = []
for (const target of targets) {
  const absolute = path.resolve(repoRoot, target)
  if (!fs.existsSync(absolute)) continue
  walkFiles(absolute, allFiles)
}

const largeFiles = []
for (const file of allFiles) {
  let content = ''
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (content.includes('\u0000')) continue
  const lines = countLines(content)
  if (lines >= lineThreshold) {
    largeFiles.push({
      path: toRepoRelative(file),
      lines,
    })
  }
}

largeFiles.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))

const summary = {
  generatedAt: new Date().toISOString(),
  lineThreshold,
  scannedFiles: allFiles.length,
  largeFileCount: largeFiles.length,
  maxFiles: Number.isFinite(maxFiles) && maxFiles !== null ? maxFiles : null,
  growthExceeded:
    Number.isFinite(maxFiles) && maxFiles !== null ? largeFiles.length > maxFiles : false,
}

const markdown = [
  '# 41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25',
  'Status: GENERATED ACTIVE LARGE FILE PRESSURE SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Scanned files: ${summary.scannedFiles}`,
  `- Line threshold: ${summary.lineThreshold}`,
  `- Files above threshold: ${summary.largeFileCount}`,
  ...(summary.maxFiles !== null ? [`- Hard limit: ${summary.maxFiles}`] : []),
  ...(summary.growthExceeded ? [`- Hard limit exceeded: ${summary.largeFileCount} > ${summary.maxFiles}`] : []),
  '',
  '## Top Large Files',
  '| File | Lines |',
  '| --- | ---: |',
  ...largeFiles.slice(0, 200).map((entry) => `| \`${entry.path}\` | ${entry.lines} |`),
  '',
  '## Policy',
  '1. This metric tracks maintainability pressure in active product surfaces.',
  '2. If `--max-files` is configured, count growth above the baseline is blocking.',
  '3. Reductions should be delivered by modular decomposition, not by disabling checks.',
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

console.log(JSON.stringify(summary, null, 2))

if (failOnGrowth && summary.growthExceeded) {
  process.exit(1)
}

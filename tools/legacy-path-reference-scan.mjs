#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnActive = args.includes('--fail-on-active')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null
const maxActiveHitsIndex = args.findIndex((arg) => arg === '--max-active-hits')
const maxActiveHits =
  maxActiveHitsIndex >= 0 && args[maxActiveHitsIndex + 1]
    ? Number.parseInt(args[maxActiveHitsIndex + 1], 10)
    : null

const repoRoot = process.cwd()
const scanExtensions = new Set([
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.sh',
  '.ps1',
  '.txt',
])

const skipDirs = new Set(['.git', 'node_modules', '.next', '.venv', 'dist', 'build'])
const maxFileBytes = 5 * 1024 * 1024

const legacyPatterns = [
  {
    id: 'CLOUD_IDE_DESKTOP_ABSENT',
    regex: /cloud-ide-desktop\/aethel_theia_fork/g,
  },
  {
    id: 'EXAMPLES_BROWSER_IDE_ABSENT',
    regex: /examples\/browser-ide-app/g,
  },
]

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
}

function classifyPath(relativePath) {
  if (relativePath.startsWith('audit dicas do emergent usar/')) return 'CANONICAL_DOC'
  if (relativePath.startsWith('cloud-web-app/web/')) return 'ACTIVE_PRODUCT'
  if (relativePath.startsWith('.github/workflows/')) return 'ACTIVE_CI'
  if (relativePath === 'package.json' || relativePath.startsWith('tools/')) return 'ACTIVE_GOVERNANCE'
  if (relativePath.startsWith('docs/') || relativePath.startsWith('diagnostics/')) return 'HISTORICAL_DOC'
  if (relativePath.endsWith('.md')) return 'HISTORICAL_DOC'
  return 'OTHER'
}

function walkFiles(baseDir, out = []) {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(baseDir, entry.name)
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue
      walkFiles(absolute, out)
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (!scanExtensions.has(ext)) continue
    out.push(absolute)
  }
  return out
}

function fileHasBinaryNulls(content) {
  return content.includes('\u0000')
}

const files = walkFiles(repoRoot)
const fileHits = []

for (const file of files) {
  let stat
  try {
    stat = fs.statSync(file)
  } catch {
    continue
  }
  if (stat.size > maxFileBytes) continue

  let content
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (!content || fileHasBinaryNulls(content)) continue

  const rel = toRepoRelative(file)
  const perPattern = []
  let total = 0

  for (const pattern of legacyPatterns) {
    const matches = content.match(pattern.regex)
    const count = matches ? matches.length : 0
    if (count > 0) {
      perPattern.push({ id: pattern.id, count })
      total += count
    }
  }

  if (total > 0) {
    fileHits.push({
      path: rel,
      classification: classifyPath(rel),
      total,
      perPattern,
    })
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  scannedFiles: files.length,
  matchedFiles: fileHits.length,
  totalMentions: fileHits.reduce((sum, row) => sum + row.total, 0),
}

const mentionsByPattern = new Map(legacyPatterns.map((pattern) => [pattern.id, 0]))
for (const row of fileHits) {
  for (const entry of row.perPattern) {
    mentionsByPattern.set(entry.id, (mentionsByPattern.get(entry.id) || 0) + entry.count)
  }
}

const mentionsByClassification = new Map()
for (const row of fileHits) {
  mentionsByClassification.set(
    row.classification,
    (mentionsByClassification.get(row.classification) || 0) + row.total
  )
}

const activeClasses = new Set(['ACTIVE_PRODUCT', 'ACTIVE_CI', 'ACTIVE_GOVERNANCE'])
const activeRows = fileHits.filter((row) => activeClasses.has(row.classification))
const activeMentions = activeRows.reduce((sum, row) => sum + row.total, 0)
const activeLimitExceeded =
  Number.isFinite(maxActiveHits) && maxActiveHits !== null ? activeMentions > maxActiveHits : false

const markdown = [
  '# 39_LEGACY_PATH_REFERENCE_MATRIX_2026-02-25',
  'Status: GENERATED LEGACY PATH REFERENCE SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Scanned files: ${summary.scannedFiles}`,
  `- Files with legacy references: ${summary.matchedFiles}`,
  `- Total legacy-path mentions: ${summary.totalMentions}`,
  `- Active-surface mentions: ${activeMentions}`,
  ...(Number.isFinite(maxActiveHits) && maxActiveHits !== null
    ? [`- Active-surface hard limit: ${maxActiveHits}`]
    : []),
  ...(activeLimitExceeded
    ? [`- Active-surface limit exceeded: ${activeMentions} > ${maxActiveHits}`]
    : []),
  '',
  '## Mentions by Pattern',
  '| Pattern | Mentions |',
  '| --- | ---: |',
  ...[...mentionsByPattern.entries()].map(([id, count]) => `| \`${id}\` | ${count} |`),
  '',
  '## Mentions by Classification',
  '| Classification | Mentions |',
  '| --- | ---: |',
  ...[...mentionsByClassification.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => `| \`${name}\` | ${count} |`),
  '',
  '## Active Surface Hits',
  '| File | Classification | Mentions |',
  '| --- | --- | ---: |',
  ...(activeRows.length > 0
    ? activeRows
        .sort((a, b) => b.total - a.total || a.path.localeCompare(b.path))
        .map((row) => `| \`${row.path}\` | \`${row.classification}\` | ${row.total} |`)
    : ['| none | - | 0 |']),
  '',
  '## Top Files (All Classifications)',
  '| File | Classification | Mentions |',
  '| --- | --- | ---: |',
  ...fileHits
    .sort((a, b) => b.total - a.total || a.path.localeCompare(b.path))
    .slice(0, 100)
    .map((row) => `| \`${row.path}\` | \`${row.classification}\` | ${row.total} |`),
  '',
  '## Policy',
  '1. Legacy-path mentions are allowed only in historical docs or explicitly guarded compatibility contexts.',
  '2. Active-surface mentions (`ACTIVE_PRODUCT`, `ACTIVE_CI`, `ACTIVE_GOVERNANCE`) must trend downward.',
  '3. If `--max-active-hits` is set, the active-surface mention count cannot exceed that limit.',
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

const output = {
  ...summary,
  activeMentions,
  maxActiveHits: Number.isFinite(maxActiveHits) && maxActiveHits !== null ? maxActiveHits : null,
  activeLimitExceeded,
  mentionsByPattern: Object.fromEntries(mentionsByPattern),
  mentionsByClassification: Object.fromEntries(mentionsByClassification),
}

console.log(JSON.stringify(output, null, 2))

if (failOnActive && activeLimitExceeded) {
  process.exit(1)
}

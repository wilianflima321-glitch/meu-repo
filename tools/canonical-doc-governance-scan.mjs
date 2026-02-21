#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnIssues = args.includes('--fail-on-issues')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null

const repoRoot = process.cwd()
const canonicalDirRelative = 'audit dicas do emergent usar'
const canonicalDir = path.resolve(repoRoot, canonicalDirRelative)
const canonicalIndexRelative = `${canonicalDirRelative}/00_FONTE_CANONICA.md`
const canonicalIndexPath = path.resolve(repoRoot, canonicalIndexRelative)

function walkMarkdownFiles(baseDir) {
  const files = []
  const stack = [baseDir]
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) continue
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') continue
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(absolute)
        continue
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(absolute)
      }
    }
  }
  return files
}

function parseCanonicalNames(markdown) {
  const names = []
  const lines = markdown.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('- ')) continue
    const match = trimmed.match(/- `?([^`\s]+\.md)`?\b/)
    if (!match) continue
    names.push(match[1])
  }
  return names
}

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/')
}

const canonicalIndexExists = fs.existsSync(canonicalIndexPath)
const canonicalIndexContent = canonicalIndexExists ? fs.readFileSync(canonicalIndexPath, 'utf8') : ''
const canonicalListedNames = canonicalIndexExists ? parseCanonicalNames(canonicalIndexContent) : []
const canonicalNameSet = new Set(canonicalListedNames)
const allowedUnindexedCanonicalDocs = new Set([
  '00_FONTE_CANONICA.md',
  '11_WEB_USER_OWNER_TRIAGE_2026-02-11.md',
  '12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md',
])

const missingListedCanonicalDocs = canonicalListedNames
  .map((name) => ({
    name,
    path: `${canonicalDirRelative}/${name}`,
  }))
  .filter((entry) => !fs.existsSync(path.resolve(repoRoot, entry.path)))

const allMarkdownFiles = walkMarkdownFiles(repoRoot)
const canonicalMarkdownFiles = allMarkdownFiles.filter((file) => file.startsWith(canonicalDir))
const historicalMarkdownFiles = allMarkdownFiles.filter((file) => !file.startsWith(canonicalDir))

const conflictsOutsideCanonical = historicalMarkdownFiles
  .map((file) => ({
    file,
    basename: path.basename(file),
  }))
  .filter((entry) => canonicalNameSet.has(entry.basename))
  .map((entry) => ({
    basename: entry.basename,
    path: toRepoRelative(entry.file),
  }))
  .sort((a, b) => a.path.localeCompare(b.path))

const unindexedCanonicalMarkdown = canonicalMarkdownFiles
  .map((file) => path.basename(file))
  .filter((name) => !canonicalNameSet.has(name))
  .filter((name) => !allowedUnindexedCanonicalDocs.has(name))
  .sort((a, b) => a.localeCompare(b))

const historicalTopLevel = new Map()
for (const file of historicalMarkdownFiles) {
  const rel = toRepoRelative(file)
  const slashIndex = rel.indexOf('/')
  const top = slashIndex === -1 ? '(repo-root)' : rel.slice(0, slashIndex)
  historicalTopLevel.set(top, (historicalTopLevel.get(top) || 0) + 1)
}

const topHistoricalRoots = [...historicalTopLevel.entries()]
  .map(([root, count]) => ({ root, count }))
  .sort((a, b) => b.count - a.count || a.root.localeCompare(b.root))
const TOP_ROOT_LIMIT = 25
const displayedHistoricalRoots = topHistoricalRoots.slice(0, TOP_ROOT_LIMIT)
const hiddenHistoricalRoots = Math.max(0, topHistoricalRoots.length - TOP_ROOT_LIMIT)

const summary = {
  generatedAt: new Date().toISOString(),
  canonicalIndexExists,
  canonicalListedDocs: canonicalListedNames.length,
  canonicalMarkdownFiles: canonicalMarkdownFiles.length,
  historicalMarkdownFiles: historicalMarkdownFiles.length,
  missingListedCanonicalDocs: missingListedCanonicalDocs.length,
  canonicalNameConflictsOutside: conflictsOutsideCanonical.length,
  unindexedCanonicalMarkdown: unindexedCanonicalMarkdown.length,
}

const markdown = [
  '# 29_CANONICAL_DOC_GOVERNANCE_MATRIX_2026-02-20',
  'Status: GENERATED CANONICAL DOC GOVERNANCE SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Canonical index exists: ${summary.canonicalIndexExists ? 'yes' : 'no'}`,
  `- Canonical listed docs: ${summary.canonicalListedDocs}`,
  `- Markdown files in canonical folder: ${summary.canonicalMarkdownFiles}`,
  `- Markdown files outside canonical folder: ${summary.historicalMarkdownFiles}`,
  `- Missing listed canonical docs: ${summary.missingListedCanonicalDocs}`,
  `- Canonical filename conflicts outside canonical folder: ${summary.canonicalNameConflictsOutside}`,
  `- Unindexed markdown files inside canonical folder: ${summary.unindexedCanonicalMarkdown}`,
  '',
  '## Missing Listed Canonical Docs',
  '| File | Expected Path |',
  '| --- | --- |',
  ...(missingListedCanonicalDocs.length
    ? missingListedCanonicalDocs.map((entry) => `| \`${entry.name}\` | \`${entry.path}\` |`)
    : ['| none | - |']),
  '',
  '## Canonical Filename Conflicts Outside Canonical Folder',
  '| File | Location |',
  '| --- | --- |',
  ...(conflictsOutsideCanonical.length
    ? conflictsOutsideCanonical.map((entry) => `| \`${entry.basename}\` | \`${entry.path}\` |`)
    : ['| none | - |']),
  '',
  '## Top Historical Markdown Roots',
  '| Root | Markdown Files |',
  '| --- | ---: |',
  ...(displayedHistoricalRoots.length
    ? displayedHistoricalRoots.map((entry) => `| \`${entry.root}\` | ${entry.count} |`)
    : ['| none | 0 |']),
  ...(hiddenHistoricalRoots > 0 ? [`| \`...\` | +${hiddenHistoricalRoots} additional roots omitted |`] : []),
  '',
  '## Unindexed Markdown Inside Canonical Folder',
  '| File |',
  '| --- |',
  ...(unindexedCanonicalMarkdown.length
    ? unindexedCanonicalMarkdown.map((file) => `| \`${file}\` |`)
    : ['| none |']),
  '',
  '## Policy',
  '1. Any missing file listed in `00_FONTE_CANONICA.md` is blocking.',
  '2. Any canonical filename conflict outside canonical folder is blocking.',
  '3. Unindexed markdown inside canonical folder is informational and must be triaged in the master contract.',
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

console.log(JSON.stringify(summary, null, 2))

if (!canonicalIndexExists && failOnIssues) {
  process.exit(1)
}
if (missingListedCanonicalDocs.length > 0 && failOnIssues) {
  process.exit(1)
}
if (conflictsOutsideCanonical.length > 0 && failOnIssues) {
  process.exit(1)
}

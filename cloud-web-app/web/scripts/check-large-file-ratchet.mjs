import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'docs', 'LARGE_FILE_RATCHET_PLAN.md')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const IGNORED_PARTS = new Set(['node_modules', '.next', 'coverage', 'dist', 'build', '.git'])

const WATCH_LINE_LIMIT = 800
const WATCH_FILE_BUDGET = 108
const MAX_LINE_BUDGET = 993
const LOW_IMPORT_HINT_LIMIT = 1
const LOW_IMPORT_LARGE_BUDGET = 0

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_PARTS.has(entry.name)) continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(absolutePath, files)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(absolutePath)
  }
  return files
}

function rel(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, '/')
}

function classify(relativePath) {
  if (relativePath.startsWith('components/')) return 'ui'
  if (relativePath.startsWith('app/')) return 'route'
  if (relativePath.startsWith('lib/server/')) return 'server'
  if (relativePath.startsWith('server/')) return 'server'
  if (relativePath.includes('/workers/')) return 'worker'
  if (relativePath.startsWith('lib/production/')) return 'production-spine'
  if (relativePath.startsWith('lib/runtime/')) return 'runtime-spine'
  if (relativePath.startsWith('lib/')) return 'runtime'
  return 'other'
}

function buildNeedles(relativePath) {
  const withoutExtension = relativePath.replace(/\.[^.]+$/, '')
  const stem = path.basename(withoutExtension)
  const needles = new Set([
    `@/${withoutExtension}`,
    relativePath,
    withoutExtension,
  ])
  if (/^[A-Z]/.test(stem)) needles.add(stem)
  return [...needles]
}

function countImportHints(entry, allEntries) {
  const needles = buildNeedles(entry.file)
  return allEntries.filter((candidate) => (
    candidate.file !== entry.file && needles.some((needle) => candidate.source.includes(needle))
  )).length
}

function isLowImportExempt(entry) {
  return entry.category === 'route' || entry.category === 'server' || entry.category === 'worker'
}

function recommendation(entry) {
  if (entry.file === 'lib/server/websocket-server.ts') return 'Continue extracting protocol-specific handlers; event bus, transport, auth, rooms, and presence are already split.'
  if (entry.file === 'lib/translations.ts') return 'Move remaining compatibility reads behind next-i18next and delete after one release.'
  if (entry.file.includes('DesignSystem')) return 'Split into primitives, tokens, examples, and compatibility barrel.'
  if (entry.importHints <= LOW_IMPORT_HINT_LIMIT && !isLowImportExempt(entry)) return 'Choose one outcome before growth: wire through a visible adapter, archive, or mark held with owner/evidence.'
  if (entry.file.includes('cutscene') || entry.file.includes('dialogue')) return 'Split planning, timeline, playback, and serialization before adding film features.'
  if (entry.file.includes('prefab') || entry.file.includes('inventory') || entry.file.includes('quest')) return 'Split data model, runtime, persistence, and editor adapter.'
  if (entry.file.includes('post-processing')) return 'Split effects into bloom, tone mapping, AA, color, and runtime adapter.'
  if (entry.file.includes('aethel-sdk')) return 'Split public SDK into auth, projects, agents, assets, and billing clients.'
  return 'Assign owner and extract one cohesive subsystem before feature growth.'
}

const sourceEntries = walk(ROOT)
  .map((absolutePath) => {
    const source = fs.readFileSync(absolutePath, 'utf8')
    const file = rel(absolutePath)
    return {
      file,
      source,
      lines: source.split(/\r?\n/).length,
      category: classify(file),
    }
  })

const files = sourceEntries
  .filter((entry) => entry.lines > WATCH_LINE_LIMIT)
  .map((entry) => ({
    ...entry,
    importHints: countImportHints(entry, sourceEntries),
  }))
  .map((entry) => ({
    ...entry,
    recommendation: recommendation(entry),
  }))
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file))

const lowImportLarge = files.filter((entry) => entry.importHints <= LOW_IMPORT_HINT_LIMIT && !isLowImportExempt(entry))

const failures = []
if (files.length > WATCH_FILE_BUDGET) {
  failures.push(`filesOver${WATCH_LINE_LIMIT}=${files.length} exceeds ratchet budget ${WATCH_FILE_BUDGET}`)
}
if ((files[0]?.lines ?? 0) > MAX_LINE_BUDGET) {
  failures.push(`maxLines=${files[0].lines} exceeds ratchet budget ${MAX_LINE_BUDGET} at ${files[0].file}`)
}
if (lowImportLarge.length > LOW_IMPORT_LARGE_BUDGET) {
  failures.push(`lowImportLarge=${lowImportLarge.length} exceeds ratchet budget ${LOW_IMPORT_LARGE_BUDGET}`)
}

const categoryCounts = files.reduce((acc, entry) => {
  acc[entry.category] = (acc[entry.category] ?? 0) + 1
  return acc
}, {})

const report = [
  '# Large File Ratchet Plan',
  '',
  'Generated: deterministic local scan',
  '',
  `- Watch line limit: ${WATCH_LINE_LIMIT}`,
  `- Files above watch limit: ${files.length} / ${WATCH_FILE_BUDGET}`,
  `- Max file lines: ${files[0]?.lines ?? 0} / ${MAX_LINE_BUDGET}`,
  `- Low-import large modules: ${lowImportLarge.length} / ${LOW_IMPORT_LARGE_BUDGET}`,
  `- Low-import threshold: <= ${LOW_IMPORT_HINT_LIMIT} import hint`,
  `- Failures: ${failures.length}`,
  '',
  '## Category Counts',
  ...Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => `- \`${category}\`: ${count}`),
  '',
  '## Top Refactor Queue',
  '',
  '| File | Lines | Import hints | Category | Next action |',
  '| --- | ---: | ---: | --- | --- |',
  ...files.slice(0, 30).map((entry) => `| \`${entry.file}\` | ${entry.lines} | ${entry.importHints} | ${entry.category} | ${entry.recommendation} |`),
  '',
  '## Low-Import Large Modules',
  '',
  'These are the most suspicious modules: large enough to affect maintainability, but with little evidence that product surfaces depend on them directly.',
  '',
  '| File | Lines | Import hints | Category | Required decision |',
  '| --- | ---: | ---: | --- | --- |',
  ...lowImportLarge.slice(0, 30).map((entry) => `| \`${entry.file}\` | ${entry.lines} | ${entry.importHints} | ${entry.category} | Wire visibly, archive, or keep held with owner/evidence. |`),
  '',
  '## Ratchet Policy',
  '',
  '- Do not add new files above 800 lines.',
  `- Do not let any file exceed ${MAX_LINE_BUDGET} lines without an explicit ratchet update.`,
  `- Do not increase low-import large modules above ${LOW_IMPORT_LARGE_BUDGET}; new large modules need product wiring, adapter evidence, or archive decision.`,
  '- Split UI surfaces before adding features.',
  '- Runtime kernels may stay large only with an owner, adapter strategy, and dedicated gate.',
  '',
  '## Failures',
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ['- none']),
  '',
].join('\n')

fs.writeFileSync(OUTPUT, report)

if (failures.length > 0) {
  console.error(report)
  process.exit(1)
}

console.log(`[large-file-ratchet] PASS filesOver${WATCH_LINE_LIMIT}=${files.length}/${WATCH_FILE_BUDGET} max=${files[0]?.lines ?? 0}/${MAX_LINE_BUDGET} lowImportLarge=${lowImportLarge.length}/${LOW_IMPORT_LARGE_BUDGET}`)

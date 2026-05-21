import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'docs', 'LARGE_FILE_RATCHET_PLAN.md')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const IGNORED_PARTS = new Set(['node_modules', '.next', 'coverage', 'dist', 'build', '.git'])

const WATCH_LINE_LIMIT = 800
const WATCH_FILE_BUDGET = 132
const MAX_LINE_BUDGET = 1171

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
  if (relativePath.startsWith('lib/')) return 'runtime'
  return 'other'
}

function recommendation(relativePath) {
  if (relativePath === 'lib/translations.ts') return 'Move remaining compatibility reads behind next-i18next and delete after one release.'
  if (relativePath.includes('DesignSystem')) return 'Split into primitives, tokens, examples, and compatibility barrel.'
  if (relativePath.includes('cutscene') || relativePath.includes('dialogue')) return 'Split planning, timeline, playback, and serialization before adding film features.'
  if (relativePath.includes('prefab') || relativePath.includes('inventory') || relativePath.includes('quest')) return 'Split data model, runtime, persistence, and editor adapter.'
  if (relativePath.includes('post-processing')) return 'Split effects into bloom, tone mapping, AA, color, and runtime adapter.'
  if (relativePath.includes('aethel-sdk')) return 'Split public SDK into auth, projects, agents, assets, and billing clients.'
  return 'Assign owner and extract one cohesive subsystem before feature growth.'
}

const files = walk(ROOT)
  .map((absolutePath) => {
    const source = fs.readFileSync(absolutePath, 'utf8')
    return {
      file: rel(absolutePath),
      lines: source.split(/\r?\n/).length,
    }
  })
  .filter((entry) => entry.lines > WATCH_LINE_LIMIT)
  .map((entry) => ({
    ...entry,
    category: classify(entry.file),
    recommendation: recommendation(entry.file),
  }))
  .sort((a, b) => b.lines - a.lines || a.file.localeCompare(b.file))

const failures = []
if (files.length > WATCH_FILE_BUDGET) {
  failures.push(`filesOver${WATCH_LINE_LIMIT}=${files.length} exceeds ratchet budget ${WATCH_FILE_BUDGET}`)
}
if ((files[0]?.lines ?? 0) > MAX_LINE_BUDGET) {
  failures.push(`maxLines=${files[0].lines} exceeds ratchet budget ${MAX_LINE_BUDGET} at ${files[0].file}`)
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
  `- Failures: ${failures.length}`,
  '',
  '## Category Counts',
  ...Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => `- \`${category}\`: ${count}`),
  '',
  '## Top Refactor Queue',
  '',
  '| File | Lines | Category | Next action |',
  '| --- | ---: | --- | --- |',
  ...files.slice(0, 30).map((entry) => `| \`${entry.file}\` | ${entry.lines} | ${entry.category} | ${entry.recommendation} |`),
  '',
  '## Ratchet Policy',
  '',
  '- Do not add new files above 800 lines.',
  '- Do not let any file exceed 1,200 lines.',
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

console.log(`[large-file-ratchet] PASS filesOver${WATCH_LINE_LIMIT}=${files.length}/${WATCH_FILE_BUDGET} max=${files[0]?.lines ?? 0}/${MAX_LINE_BUDGET}`)

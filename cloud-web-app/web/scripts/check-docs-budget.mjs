import fs from 'node:fs'
import path from 'node:path'

const WEB_ROOT = process.cwd()
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..')
const OUTPUT = path.join(WEB_ROOT, 'docs', 'DOCS_BUDGET_AUDIT.md')

const BUDGETS = {
  repoMarkdown: 336,
  rootDocs: 200,
  rootMaster: 134,
  rootArchive: 0,
  interfaceBlueprints: 20,
  webDocs: 67,
}

const IGNORED_PARTS = new Set(['node_modules', '.next', '.git', 'coverage', 'dist', 'build'])

function countMarkdown(dir, recursive = true) {
  if (!fs.existsSync(dir)) return 0
  let count = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_PARTS.has(entry.name)) continue
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory() && recursive) count += countMarkdown(absolutePath, recursive)
    else if (entry.isFile() && entry.name.endsWith('.md')) count += 1
  }
  return count
}

const counts = {
  repoMarkdown: countMarkdown(REPO_ROOT),
  rootDocs: countMarkdown(path.join(REPO_ROOT, 'docs')),
  rootMaster: countMarkdown(path.join(REPO_ROOT, 'docs', 'master')),
  rootArchive: countMarkdown(path.join(REPO_ROOT, 'docs', 'archive')),
  interfaceBlueprints: countMarkdown(path.join(REPO_ROOT, 'AETHEL_INTERFACE_BLUEPRINTS')),
  webDocs: countMarkdown(path.join(WEB_ROOT, 'docs')),
}

const failures = []
for (const [key, budget] of Object.entries(BUDGETS)) {
  if (counts[key] > budget) failures.push(`${key}=${counts[key]} exceeds budget ${budget}`)
}

if (counts.interfaceBlueprints !== BUDGETS.interfaceBlueprints) {
  failures.push(`interfaceBlueprints=${counts.interfaceBlueprints} must stay exactly ${BUDGETS.interfaceBlueprints}`)
}

const report = [
  '# DOCS_BUDGET_AUDIT.md',
  'Generated: deterministic local scan',
  '',
  'This is a hard documentation budget. Historical archive markdown was removed from the live tree and remains recoverable from Git history.',
  '',
  '| Scope | Count | Budget |',
  '| --- | ---: | ---: |',
  ...Object.keys(BUDGETS).map((key) => `| ${key} | ${counts[key]} | ${BUDGETS[key]} |`),
  '',
  '## Collapse Targets',
  '',
  '- Root `docs/archive`: must stay empty; historical bulk docs live in Git history, not the active tree.',
  '- Root `docs/master`: reduce to about 40 active canonical docs with explicit status.',
  '- `AETHEL_INTERFACE_BLUEPRINTS`: keep intact; these remain high-value product architecture docs.',
  '- Web `docs`: keep generated QA evidence, but do not let gates become a second archive.',
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

console.log(`[docs-budget] PASS repoMarkdown=${counts.repoMarkdown}/${BUDGETS.repoMarkdown} rootDocs=${counts.rootDocs}/${BUDGETS.rootDocs} webDocs=${counts.webDocs}/${BUDGETS.webDocs}`)

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPORT_DIR = path.join(ROOT, '.next', 'aethel-audits')

const SOURCE_ROOTS = ['app', 'components', 'lib', 'hooks', 'scripts', 'server']
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mjs'])
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', 'out', '.git'])

const BUDGETS = {
  physicalPages: 68,
  adminChildPages: 14,
  studioChildPages: 7,
  sourceFilesAtOrAbove750Lines: 0,
  directHeavyImportsInComponents: 0,
  coreAnyFiles: 0,
  runtimeMockDebtFiles: 0,
}

const NEXT_TARGETS = {
  physicalPages: 67,
  adminChildPages: 14,
  studioChildPages: 5,
  sourceFilesAtOrAbove750Lines: 0,
  directHeavyImportsInComponents: 0,
  coreAnyFiles: 0,
  runtimeMockDebtFiles: 0,
}

function toPosix(filePath) {
  return filePath.replaceAll(path.sep, '/')
}

function listFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue

    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listFiles(absolutePath, predicate, out)
    } else if (predicate(absolutePath)) {
      out.push(absolutePath)
    }
  }
  return out
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function collectSourceFiles() {
  const files = []
  for (const root of SOURCE_ROOTS) {
    listFiles(path.join(ROOT, root), (absolutePath) => SOURCE_EXTENSIONS.has(path.extname(absolutePath)), files)
  }

  return files.map((absolutePath) => {
    const relativePath = toPosix(path.relative(ROOT, absolutePath))
    const content = fs.readFileSync(absolutePath, 'utf8')
    return {
      relativePath,
      content,
      lineCount: content.split(/\r?\n/).length,
    }
  })
}

function isRuntimeMockDebt(file) {
  if (/(^|\/)(__tests__|tests?|fixtures?|mocks?|scripts)\//.test(file.relativePath)) return false
  return /(mock implementation|For now, mock|Not implemented|Mode not implemented|mock mode|deprecated adapter)/i.test(file.content)
}

function hasCoreAnyDebt(file) {
  if (!/\bany\b/.test(file.content)) return false
  return /^lib\/(ai|agents|api|api-client|telemetry|production|product|research|routes|workspace|server|runtime|device|sandbox)/.test(
    file.relativePath,
  )
}

function hasDirectHeavyComponentImport(file) {
  if (!file.relativePath.startsWith('components/')) return false
  return /^import\s+(?!\s*type\b)[^\r\n;]*?\sfrom\s+['"](?:three|@react-three\/fiber|@react-three\/drei|monaco-editor|@monaco-editor\/react|framer-motion)['"]/m.test(
    file.content,
  )
}

function collectRoutes() {
  const routePages = listFiles(path.join(ROOT, 'app'), (absolutePath) => {
    if (!absolutePath.endsWith(`${path.sep}page.tsx`)) return false
    const rel = toPosix(path.relative(path.join(ROOT, 'app'), absolutePath))
    return !rel.startsWith('api/')
  }).map((absolutePath) => toPosix(path.relative(ROOT, absolutePath)))

  const adminChildPages = routePages.filter(
    (relativePath) => relativePath.startsWith('app/admin/') && relativePath !== 'app/admin/page.tsx',
  )
  const studioChildPages = routePages.filter(
    (relativePath) => relativePath.startsWith('app/studio/') && relativePath !== 'app/studio/page.tsx',
  )

  return {
    routePages,
    adminChildPages,
    studioChildPages,
  }
}

function assertBudget(failures, name, actual, budget) {
  if (actual > budget) {
    failures.push(`${name}: ${actual} > ${budget}`)
  }
}

const failures = []
const sourceFiles = collectSourceFiles()
const routes = collectRoutes()

const nearLargeFiles = sourceFiles.filter((file) => file.lineCount >= 750).sort((a, b) => b.lineCount - a.lineCount)
const heavyComponentImports = sourceFiles.filter(hasDirectHeavyComponentImport)
const coreAnyFiles = sourceFiles.filter(hasCoreAnyDebt)
const runtimeMockDebtFiles = sourceFiles.filter(isRuntimeMockDebt)

const metrics = {
  physicalPages: routes.routePages.length,
  adminChildPages: routes.adminChildPages.length,
  studioChildPages: routes.studioChildPages.length,
  sourceFilesAtOrAbove750Lines: nearLargeFiles.length,
  directHeavyImportsInComponents: heavyComponentImports.length,
  coreAnyFiles: coreAnyFiles.length,
  runtimeMockDebtFiles: runtimeMockDebtFiles.length,
}

for (const [name, budget] of Object.entries(BUDGETS)) {
  assertBudget(failures, name, metrics[name], budget)
}

const report = `# V28 Internal Debt Ratchets

These budgets are intentionally set at the current measured ceiling. The next target column shows the next market-quality cut.

| Metric | Current | Budget | Next target |
| --- | ---: | ---: | ---: |
${Object.keys(BUDGETS)
  .map((name) => `| ${name} | ${metrics[name]} | ${BUDGETS[name]} | ${NEXT_TARGETS[name]} |`)
  .join('\n')}

## Runtime Mock Debt

${runtimeMockDebtFiles.map((file) => `- ${file.relativePath}`).join('\n') || '- None'}

## Core any Debt

${coreAnyFiles.map((file) => `- ${file.relativePath}`).join('\n') || '- None'}

## Component Heavy Imports

${heavyComponentImports.map((file) => `- ${file.relativePath}`).join('\n') || '- None'}

## Files At Or Above 750 Lines

${nearLargeFiles
  .slice(0, 40)
  .map((file) => `- ${file.relativePath} (${file.lineCount})`)
  .join('\n') || '- None'}
`

fs.mkdirSync(REPORT_DIR, { recursive: true })
fs.writeFileSync(path.join(REPORT_DIR, 'V28_INTERNAL_DEBT_RATCHETS.md'), report)

if (failures.length > 0) {
  console.error('[v28-internal-debt-ratchets] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[v28-internal-debt-ratchets] PASS pages=${metrics.physicalPages}/${BUDGETS.physicalPages} admin=${metrics.adminChildPages}/${BUDGETS.adminChildPages} studio=${metrics.studioChildPages}/${BUDGETS.studioChildPages} large=${metrics.sourceFilesAtOrAbove750Lines}/${BUDGETS.sourceFilesAtOrAbove750Lines} heavy=${metrics.directHeavyImportsInComponents}/${BUDGETS.directHeavyImportsInComponents} mocks=${metrics.runtimeMockDebtFiles}/${BUDGETS.runtimeMockDebtFiles} coreAny=${metrics.coreAnyFiles}/${BUDGETS.coreAnyFiles}`,
)

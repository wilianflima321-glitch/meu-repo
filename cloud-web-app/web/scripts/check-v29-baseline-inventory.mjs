#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []
const skip = new Set(['node_modules', '.next', 'coverage', '.git', 'dist', 'build'])

function walk(base) {
  const out = []
  const stack = [path.join(ROOT, base)]
  while (stack.length) {
    const current = stack.pop()
    if (!current || !fs.existsSync(current)) continue
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else out.push(full)
    }
  }
  return out
}

function rel(full) {
  return path.relative(ROOT, full).replace(/\\/g, '/')
}

function countLines(full) {
  const content = fs.readFileSync(full, 'utf8')
  if (!content) return 0
  return content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0)
}

function countMatches(files, pattern) {
  let total = 0
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    total += content.match(pattern)?.length ?? 0
  }
  return total
}

const appFiles = walk('app')
const webFiles = walk('.')
const appComponentLibFiles = [...walk('app'), ...walk('components'), ...walk('lib')].filter((file) => /\.(ts|tsx|js|jsx|mjs|mdx?)$/.test(file))
const tsFiles = webFiles.filter((file) => /\.(ts|tsx)$/.test(file))
const bigFiles = tsFiles.map((file) => ({ file: rel(file), lines: countLines(file) })).filter((item) => item.lines > 500)
const shellCandidates = walk('components/ide')
  .filter((file) => /\.(ts|tsx)$/.test(file) && /(IDELayout|FullscreenIDE|ModernIDEShell|WorkbenchRedirect|Shell)/.test(path.basename(file)))
  .map(rel)
  .sort()

const inventory = {
  version: 1,
  routeCounts: {
    pages: appFiles.filter((file) => path.basename(file) === 'page.tsx').length,
    apiRoutes: walk('app/api').filter((file) => path.basename(file) === 'route.ts').length,
    adminPages: walk('app/admin').filter((file) => path.basename(file) === 'page.tsx').length,
    studioPages: walk('app/studio').filter((file) => path.basename(file) === 'page.tsx').length,
  },
  codeCounts: {
    componentTsxFiles: walk('components').filter((file) => file.endsWith('.tsx')).length,
    libTsFiles: walk('lib').filter((file) => /\.(ts|tsx)$/.test(file)).length,
    storyFiles: webFiles.filter((file) => /\.stories\.(ts|tsx)$/.test(file)).length,
    testFiles: walk('__tests__').filter((file) => /\.(test|spec)\.(ts|tsx)$/.test(file)).length,
    filesOver500Lines: bigFiles.length,
    filesOver800Lines: bigFiles.filter((item) => item.lines > 800).length,
  },
  riskCounts: {
    ptBrMatches: countMatches(appComponentLibFiles, /\b(Arquivo|Editar|Executar|Configuracoes|Configurar|Basico|Estudio|Pronto|Ajustes|Abrir)\b/gi),
    placeholderMatches: countMatches(appComponentLibFiles, /\b(stub|placeholder|mock|not implemented|coming soon)\b/gi),
    todoMatches: countMatches(appComponentLibFiles, /\bTODO\b/g),
    deprecatedMatches: countMatches(appComponentLibFiles, /\bdeprecated\b/gi),
  },
  shellCandidates,
  largestFiles: bigFiles.sort((a, b) => b.lines - a.lines).slice(0, 40),
}

const limits = {
  pages: 57,
  apiRoutes: 391,
  adminPages: 7,
  studioPages: 6,
    filesOver500Lines: 215,
  storyFiles: 30,
  testFiles: 206,
  filesOver800Lines: 0,
}

if (inventory.routeCounts.pages > limits.pages) failures.push(`pages exceeded V29 baseline: ${inventory.routeCounts.pages}/${limits.pages}`)
if (inventory.routeCounts.apiRoutes > limits.apiRoutes) failures.push(`api routes exceeded V29 baseline: ${inventory.routeCounts.apiRoutes}/${limits.apiRoutes}`)
if (inventory.routeCounts.adminPages > limits.adminPages) failures.push(`admin pages exceeded V29 baseline: ${inventory.routeCounts.adminPages}/${limits.adminPages}`)
if (inventory.routeCounts.studioPages > limits.studioPages) failures.push(`studio pages exceeded V29 baseline: ${inventory.routeCounts.studioPages}/${limits.studioPages}`)
if (inventory.codeCounts.filesOver500Lines > limits.filesOver500Lines) failures.push(`files >500 lines exceeded V29 baseline: ${inventory.codeCounts.filesOver500Lines}/${limits.filesOver500Lines}`)
if (inventory.codeCounts.filesOver800Lines > limits.filesOver800Lines) failures.push(`files >800 lines must stay zero: ${inventory.codeCounts.filesOver800Lines}`)
if (inventory.codeCounts.storyFiles < limits.storyFiles) failures.push(`story files below V29 baseline: ${inventory.codeCounts.storyFiles}/${limits.storyFiles}`)
if (inventory.codeCounts.testFiles < limits.testFiles) failures.push(`test files below V29 baseline: ${inventory.codeCounts.testFiles}/${limits.testFiles}`)

for (const requiredLock of ['package-lock.json', 'cloud-web-app/web/package-lock.json', 'apps/studio-local/src-tauri/Cargo.lock']) {
  if (!fs.existsSync(path.join(REPO_ROOT, requiredLock))) failures.push(`missing required lockfile: ${requiredLock}`)
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(path.join(reportDir, 'V29_BASELINE_INVENTORY.json'), JSON.stringify({ inventory, failures }, null, 2))

if (failures.length) {
  console.error('[v29-baseline-inventory] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v29-baseline-inventory] PASS pages=${inventory.routeCounts.pages} admin=${inventory.routeCounts.adminPages} studio=${inventory.routeCounts.studioPages} big=${inventory.codeCounts.filesOver500Lines}`)

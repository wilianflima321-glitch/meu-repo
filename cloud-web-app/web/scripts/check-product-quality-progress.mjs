#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const failures = []

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'storybook-static', 'dist', 'build'].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, predicate, out)
    } else if (predicate(abs)) {
      out.push(abs)
    }
  }
  return out
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
  }
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) {
    failures.push(`${relativePath}: missing pattern ${pattern} (${reason})`)
  }
}

const storyFiles = walk(
  path.join(ROOT, 'components'),
  (file) => file.endsWith('.stories.tsx')
)
if (storyFiles.length < 30) {
  failures.push(`Storybook catalogue too small: expected >=30 stories, found ${storyFiles.length}`)
}

requireFile('.storybook/main.ts', 'Storybook config must exist')
requirePattern('.storybook/main.ts', /viteFinal/, 'Storybook must resolve app aliases in Vite builds')
requirePattern('.storybook/main.ts', /'@'\s*:\s*resolve\(__dirname,\s*'\.\.'\)/, 'Storybook must resolve @ to the web root')
requirePattern('../../.gitignore', /\*\*\/storybook-static\//, 'generated Storybook output must stay out of git')

requireFile('../../.github/workflows/lighthouse-ci.yml', 'Lighthouse CI workflow must exist at repo root')
requireFile('lighthouserc.js', 'Lighthouse CI config must exist')

requirePattern('app/layout.tsx', /GlobalCommandSurface/, 'global command surface must wrap app routes')
requirePattern('components/ide/GlobalCommandSurface.tsx', /KeyboardShortcutsDialog/, 'global shortcuts dialog must be wired')
requirePattern('components/ide/GlobalCommandSurface.tsx', /event\.key === '\?'/, 'question-mark shortcut must open help')
requirePattern('components/ide/fullscreen/types.ts', /'research'/, 'Workbench sidebar must expose a research tab')
requirePattern('components/ide/fullscreen/WorkbenchSidebar.tsx', /AethelResearch/, 'agentic research must be available inside the IDE sidebar')

const sourceFiles = walk(
  ROOT,
  (file) =>
    /\.(ts|tsx)$/.test(file) &&
    /[\\\/](components|lib)[\\\/]/.test(file) &&
    !/[\\\/]__tests__[\\\/]/.test(file) &&
    !file.endsWith('.stories.tsx')
)
const forbiddenConsole = /\bconsole\.(log|info|debug)\s*\(/
for (const file of sourceFiles) {
  const content = fs.readFileSync(file, 'utf8')
  if (forbiddenConsole.test(content)) {
    failures.push(`${rel(file)}: console.log/info/debug is not allowed; use logger or an intentional warn/error`)
  }
}

if (failures.length) {
  console.error('[product-quality-progress] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[product-quality-progress] PASS stories=${storyFiles.length}, sourceFiles=${sourceFiles.length}`
)

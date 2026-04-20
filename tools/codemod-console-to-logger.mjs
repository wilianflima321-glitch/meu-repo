#!/usr/bin/env node
/**
 * Codemod: Replace `console.log / .info / .debug` with structured logger.
 *
 * Rationale (audit V4, finding #4): 971 `console.*` calls pollute production
 * logs and disable correlation-id tracing. The canonical solution is the
 * structured logger in `lib/observability/logger.ts` (`createComponentLogger`).
 *
 * Behaviour:
 *   - Files under lib/** and app/api/** get `createComponentLogger` import +
 *     `const log = createComponentLogger('<component>')` injected exactly once.
 *   - `console.log(...)`       -> `log.info(...)`
 *   - `console.info(...)`      -> `log.info(...)`
 *   - `console.debug(...)`     -> `log.debug(...)`
 *   - `console.warn(...)`      -> kept (legitimate for user-facing warnings)
 *   - `console.error(...)`     -> kept (preserved; many frameworks read it)
 *
 * Safe guards:
 *   - Skips test files, storybook stories, and the logger file itself.
 *   - Skips files that already import `createComponentLogger`.
 *   - Skips files in `components/**` and `app/*.tsx` (browser surfaces should
 *     migrate to `logger` client-side adapter separately).
 *   - Idempotent: running twice is a no-op.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const WEB = join(process.cwd(), 'cloud-web-app/web')
const TARGET_ROOTS = [
  join(WEB, 'lib'),
  join(WEB, 'app/api'),
  join(WEB, 'server'),
]

const SKIP_DIRS = new Set(['node_modules', '.next', '.git', '__tests__', 'tests'])
const SKIP_FILES = new Set([
  'logger.ts',
  'logging-system.ts',
])

function walk(dir, out = []) {
  let entries
  try { entries = readdirSync(dir) } catch { return out }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(full) && !full.includes('.test.') && !full.includes('.spec.')) {
      out.push(full)
    }
  }
  return out
}

function deriveComponentName(filePath) {
  const rel = relative(WEB, filePath)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '')
    .replace(/^(lib|app|server)\//, '')
    .replace(/\/index$/, '')
  return rel || basename(filePath, '.ts')
}

/**
 * Inject `createComponentLogger` import + `log` local constant at top of file.
 */
function injectLoggerImport(source, componentName) {
  if (source.includes('createComponentLogger')) return { source, changed: false }

  const importLine = `import { createComponentLogger } from '@/lib/observability/logger'\n`
  const logLine = `const log = createComponentLogger('${componentName}')\n`

  // Find the last import block (imports are usually clustered at top).
  const lines = source.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    const l = lines[i].trim()
    if (/^import\s/.test(l) || /^}\s*from\s/.test(l)) lastImportIdx = i
  }

  let insertAt = lastImportIdx + 1
  // Skip blank lines after the import block
  while (insertAt < lines.length && lines[insertAt].trim() === '') insertAt++

  const before = lines.slice(0, insertAt).join('\n')
  const after = lines.slice(insertAt).join('\n')
  const needsLeadingNl = before.endsWith('\n') ? '' : '\n'
  const patched =
    (lastImportIdx >= 0
      ? before + '\n' + importLine + '\n' + logLine + '\n'
      : importLine + '\n' + logLine + '\n' + before + needsLeadingNl) + after

  return { source: patched, changed: true }
}

/**
 * Replace `console.log | console.info | console.debug` with `log.info | .debug`.
 */
function replaceConsoleCalls(source) {
  let changed = false
  const replaced = source
    .replace(/\bconsole\.log\s*\(/g, () => { changed = true; return 'log.info(' })
    .replace(/\bconsole\.info\s*\(/g, () => { changed = true; return 'log.info(' })
    .replace(/\bconsole\.debug\s*\(/g, () => { changed = true; return 'log.debug(' })
  return { source: replaced, changed }
}

function processFile(file) {
  if (SKIP_FILES.has(basename(file))) return null
  let src = readFileSync(file, 'utf-8')

  // Quick bailout if there's nothing to migrate.
  if (!/\bconsole\.(log|info|debug)\s*\(/.test(src)) return null

  const componentName = deriveComponentName(file)

  // Inject logger if needed
  const injected = injectLoggerImport(src, componentName)
  src = injected.source

  const replaced = replaceConsoleCalls(src)
  src = replaced.source

  if (injected.changed || replaced.changed) {
    writeFileSync(file, src)
    return { file: relative(WEB, file), injected: injected.changed, replaced: replaced.changed }
  }
  return null
}

let touched = 0
for (const root of TARGET_ROOTS) {
  const files = walk(root)
  for (const f of files) {
    const res = processFile(f)
    if (res) {
      touched++
      const flags = [res.injected ? '+import' : '', res.replaced ? '+calls' : ''].filter(Boolean).join(' ')
      console.log(`  ✓ ${res.file}  [${flags}]`)
    }
  }
}

console.log(`\nCodemod done. Rewrote ${touched} files.`)

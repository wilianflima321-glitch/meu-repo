#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const MAX_WARN_ERROR = 0
const failures = []

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'storybook-static', 'dist', 'build', '__tests__'].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, out)
    } else if (/\.(ts|tsx)$/.test(abs) && /[\\\/](components|lib)[\\\/]/.test(abs) && !abs.endsWith('.stories.tsx')) {
      out.push(abs)
    }
  }
  return out
}

let warnErrorCount = 0
let logInfoDebugCount = 0

for (const file of walk(ROOT)) {
  if (file.endsWith(path.join('lib', 'observability', 'logger.ts'))) continue
  const content = fs.readFileSync(file, 'utf8')
  logInfoDebugCount += content.match(/\bconsole\.(log|info|debug)\s*\(/g)?.length ?? 0
  warnErrorCount += content.match(/\bconsole\.(warn|error)\s*\(/g)?.length ?? 0
}

if (logInfoDebugCount !== 0) {
  failures.push(`console.log/info/debug must remain zero, found ${logInfoDebugCount}`)
}
if (warnErrorCount > MAX_WARN_ERROR) {
  failures.push(`console.warn/error ratchet exceeded: max ${MAX_WARN_ERROR}, found ${warnErrorCount}`)
}

if (failures.length) {
  console.error('[console-ratchet] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[console-ratchet] PASS log/info/debug=0 warn/error=${warnErrorCount}/${MAX_WARN_ERROR} target=0`)

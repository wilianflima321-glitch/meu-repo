/**
 * Anti-hex design system gate.
 *
 * Ensures no raw hexadecimal colour values appear in component files
 * (components/**\/*.tsx, app/**\/*.tsx).
 *
 * Allowed exceptions:
 *  - Lines that start with // (JS comments)
 *  - Tailwind config / globals.css (not scanned)
 *  - color-mix() expressions that reference a hex fallback for browser compat
 *    (those can include a `/* hex-allowed *\/` inline comment)
 *
 * Usage:
 *   node scripts/check-no-hex-in-components.mjs
 *
 * Exit 0 → clean. Exit 1 → violations found.
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_DIRS = ['components', 'app']

// Raw hex pattern — 3 or 6 hex digits after '#', word boundary
const HEX_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g

// Lines we explicitly allow (design-system-internal expressions)
const ALLOWLIST_PATTERNS = [
  /hex-allowed/,          // inline /* hex-allowed */ annotation
  /^\s*\/\//,             // JS comment lines
  /^\s*\*/,               // JSDoc/block comment lines
]

function walk(dir) {
  const entries = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      entries.push(...walk(full))
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      entries.push(full)
    }
  }
  return entries
}

let violations = 0

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir)
  let files
  try {
    files = walk(absDir)
  } catch {
    continue
  }

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      // Skip allowed patterns
      if (ALLOWLIST_PATTERNS.some((p) => p.test(line))) return

      const matches = [...line.matchAll(HEX_RE)]
      if (matches.length > 0) {
        const rel = relative(ROOT, file)
        const hexList = matches.map((m) => m[0]).join(', ')
        console.error(`[hex-drift] ${rel}:${idx + 1} — ${hexList}`)
        violations++
      }
    })
  }
}

if (violations > 0) {
  console.error(`\n✖ ${violations} hex colour violation(s) found.`)
  console.error('  Replace all raw hex values with --aethel-* design tokens.')
  console.error('  To suppress a specific line add: /* hex-allowed */')
  process.exit(1)
} else {
  console.log(`✔ No raw hex colours found in components or app directories.`)
}

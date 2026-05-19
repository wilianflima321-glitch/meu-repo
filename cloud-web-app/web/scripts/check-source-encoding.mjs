#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const SKIP_DIRS = new Set(['.next', 'node_modules', 'dist', 'build', 'coverage'])
const failures = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs)
      continue
    }
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue
    const bytes = fs.readFileSync(abs)
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      failures.push(path.relative(ROOT, abs).replace(/\\/g, '/'))
    }
  }
}

walk(ROOT)

if (failures.length > 0) {
  console.error(`[source-encoding] FAIL bomFiles=${failures.length}`)
  for (const file of failures.slice(0, 100)) console.error(`- ${file}`)
  process.exit(1)
}

console.log('[source-encoding] PASS bomFiles=0')

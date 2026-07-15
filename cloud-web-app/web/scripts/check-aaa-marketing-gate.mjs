#!/usr/bin/env node
/**
 * Block 3A.2 — Gate Nanite / Lumen / RT / VT marketing names in product UI.
 * Allow honesty disclosures that include [HELD] on the same line.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components']
const EXTENSIONS = new Set(['.ts', '.tsx', '.mdx'])
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build', '__tests__', 'tests'])

const BLOCKED = [
  {
    id: 'nanite-claim',
    pattern: /\bNanite\b/,
    reason: 'Nanite marketing name blocked in product UI until meshlet evidence (3C).',
  },
  {
    id: 'lumen-claim',
    pattern: /\bLumen\b/,
    reason: 'Lumen marketing name blocked until GI evidence.',
  },
  {
    id: 'path-trace-claim',
    pattern: /\bPath[- ]?Trac(e|ing)\b/i,
    reason: 'Path tracing marketing blocked on WebGL preview.',
  },
  {
    id: 'virtual-texture-claim',
    pattern: /\bVirtual Texture\b/i,
    reason: 'Virtual Texture marketing blocked until VT feedback path ships.',
  },
]

const ALLOWLIST = [
  /check-aaa-marketing-gate\.mjs$/,
  /renderer-honesty-capability\.ts$/,
  /viewport-fidelity\.ts$/,
  /block3a-render-honesty\.test\.ts$/,
  /aaa-renderer-impl\.ts$/,
  /engine-spine-modules/,
  /nanite-virtualized-geometry/,
  /nanite-meshlet/,
  /nanite-worker/,
  /virtual-texture-system/,
  /lumen-gi/,
  /ray-tracing/,
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(abs)
  }
  return out
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+\/\/.*$/gm, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function isAllowlisted(file) {
  return ALLOWLIST.some((re) => re.test(rel(file)))
}

const findings = []
const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))

for (const file of files) {
  if (isAllowlisted(file)) continue
  const content = stripComments(fs.readFileSync(file, 'utf8'))
  const lines = content.split(/\r?\n/)
  lines.forEach((line, index) => {
    // Honest hold disclosures are OK
    if (/\[HELD\]/i.test(line)) return
    // Negative / gated language OK
    if (/\b(not|never|no|gated|blocked|do not|don't|without)\b/i.test(line) && /\b(Nanite|Lumen|Ray Tracing|Virtual Texture)\b/i.test(line)) {
      return
    }
    for (const rule of BLOCKED) {
      if (!rule.pattern.test(line)) continue
      findings.push({
        file: rel(file),
        line: index + 1,
        id: rule.id,
        reason: rule.reason,
        snippet: line.trim().slice(0, 160),
      })
    }
  })
}

if (findings.length > 0) {
  console.error('AAA-MK FAIL — Nanite/Lumen/RT/VT marketing gate:')
  for (const f of findings) {
    console.error(`  [${f.id}] ${f.file}:${f.line} — ${f.reason}`)
    console.error(`    ${f.snippet}`)
  }
  process.exit(1)
}

console.log('AAA-MK PASS — no ungated Nanite/Lumen/RT/VT marketing claims in app/components.')
process.exit(0)

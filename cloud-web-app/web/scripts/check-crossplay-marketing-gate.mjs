#!/usr/bin/env node
/**
 * Block 2B.5 / MK-G2 — Cross-play marketing gate.
 * Fails CI when app/components claim cross-play / console multiplayer
 * without the G.2 unlock marker, or when simulated dedicated is marketed as live.
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components', 'lib']
const EXTENSIONS = new Set(['.ts', '.tsx', '.mdx'])
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build', '__tests__', 'tests'])
const UNLOCK = path.join(ROOT, 'docs', 'gates', 'G2_CROSSPLAY_MARKETING_UNLOCK')

const BLOCKED = [
  {
    id: 'cross-play-claim',
    pattern: /\b(cross[- ]play|crossplay)\b/i,
    reason: 'Cross-play marketing blocked until G.2 unlock file exists.',
  },
  {
    id: 'console-mp-claim',
    pattern: /\b(PlayStation|Xbox|Nintendo)\s+(multiplayer|cross[- ]play|online)\b/i,
    reason: 'Console multiplayer marketing blocked until G.2.',
  },
  {
    id: 'simulated-as-live',
    pattern: /simulated-dedicated\.aethel\.local/i,
    reason: 'Simulated dedicated host must never appear in product UI/copy as a live endpoint.',
  },
  {
    id: 'agones-live-claim',
    pattern: /\b(live Agones fleet|Agones (is )?live|dedicated servers? (are )?live)\b/i,
    reason: 'Do not claim Agones/dedicated live without allocator + G.2 evidence.',
  },
]

/** Allowlisted paths that document the hold (honesty modules, gate itself, comments in authority). */
const ALLOWLIST = [
  /multiplayer-honesty-capability\.ts$/,
  /deterministic-rollback-replay\.ts$/,
  /dedicated-server-authority\.ts$/,
  /check-crossplay-marketing-gate\.mjs$/,
  /MultiplayerHonestyBadge\.tsx$/,
  /multiplayer-honesty\/route\.ts$/,
  /block2b-netcode-honesty\.test\.ts$/,
  /cross-play-capability\.ts$/,
  /hub-honesty-capability\.ts$/,
  /hub-honesty\/route\.ts$/,
  /ShowcaseHonestyPanels\.tsx$/,
  /HubHonestyBadge\.tsx$/,
  /plans\.ts$/, // may contain [HELD] copy
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
  const r = rel(file)
  return ALLOWLIST.some((re) => re.test(r))
}

const unlocked = fs.existsSync(UNLOCK)
const findings = []

if (!unlocked) {
  const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
  for (const file of files) {
    if (isAllowlisted(file)) continue
    const content = stripComments(fs.readFileSync(file, 'utf8'))
    const lines = content.split(/\r?\n/)
    lines.forEach((line, index) => {
      // Honest [HELD] disclosure lines are OK
      if (/\[HELD\]/i.test(line) && /dedicated|cross[- ]play|agones/i.test(line)) return
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
}

if (findings.length > 0) {
  console.error('MK-G2 FAIL — cross-play / dedicated marketing gate:')
  for (const f of findings) {
    console.error(`  [${f.id}] ${f.file}:${f.line} — ${f.reason}`)
    console.error(`    ${f.snippet}`)
  }
  console.error(
    '\nTo unlock after G.2 evidence: create docs/gates/G2_CROSSPLAY_MARKETING_UNLOCK'
  )
  process.exit(1)
}

console.log(
  unlocked
    ? 'MK-G2 PASS — G.2 unlock present; cross-play marketing gate open.'
    : 'MK-G2 PASS — no blocked cross-play / simulated-dedicated marketing claims found.'
)
process.exit(0)

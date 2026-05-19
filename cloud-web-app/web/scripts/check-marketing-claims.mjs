#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const TARGET_DIRS = ['app', 'components']
const OUT = path.join(ROOT, 'docs', 'MARKETING_CLAIMS_AUDIT.md')
const EXTENSIONS = new Set(['.ts', '.tsx'])
const ignoreDirs = new Set(['node_modules', '.next', 'dist', 'build'])

const BLOCKED_PATTERNS = [
  {
    id: 'god-of-war',
    pattern: /\bGod of War\b/i,
    reason: 'Do not compare browser creative tooling to a specific AAA title as a capability claim.',
  },
  {
    id: 'red-dead',
    pattern: /\bRed Dead\b/i,
    reason: 'Do not compare browser creative tooling to a specific AAA title as a capability claim.',
  },
  {
    id: 'hollywood-quality',
    pattern: /\bHollywood[- ]quality\b/i,
    reason: 'Film surfaces are alpha/beta and need maturity disclosure.',
  },
  {
    id: 'production-ready-studio',
    pattern: /\bproduction[- ]ready (creative )?studio\b/i,
    reason: 'Studio surfaces are mixed GA/BETA/ALPHA and must not be over-claimed.',
  },
  {
    id: 'unreal-in-browser',
    pattern: /\bUnreal (in|inside|for) the browser\b/i,
    reason: 'Aethel is a web creative IDE with hybrid runtime, not Unreal replicated in-browser.',
  },
  {
    id: 'aaa-browser-claim',
    pattern: /\b(AAA graphics|AAA online|AAA web studio|AAA games? in your browser|make AAA)\b/i,
    reason: 'Use high-fidelity/prototype language unless render evidence and maturity badges support the claim.',
  },
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

const files = TARGET_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
const findings = []

for (const file of files) {
  const content = stripComments(fs.readFileSync(file, 'utf8'))
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    for (const rule of BLOCKED_PATTERNS) {
      if (!rule.pattern.test(line)) continue
      findings.push({
        file: rel(file),
        line: index + 1,
        id: rule.id,
        reason: rule.reason,
        sample: line.trim().slice(0, 220),
      })
    }
  })
}

const report = []
report.push('# MARKETING_CLAIMS_AUDIT.md')
report.push('Generated: deterministic local scan')
report.push('')
report.push(`- Files scanned: ${files.length}`)
report.push(`- Findings: ${findings.length}`)
report.push('')
report.push('## Findings')
if (findings.length === 0) {
  report.push('- none')
} else {
  for (const finding of findings) {
    report.push(`- ${finding.file}:${finding.line} [${finding.id}] ${finding.sample}`)
    report.push(`  - ${finding.reason}`)
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${report.join('\n')}\n`, 'utf8')

if (findings.length > 0) {
  console.error(`[marketing-claims] FAIL findings=${findings.length} report=${rel(OUT)}`)
  process.exitCode = 1
} else {
  console.log(`[marketing-claims] PASS report=${rel(OUT)}`)
}

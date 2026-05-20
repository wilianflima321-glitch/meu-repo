#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const scanRoots = ['app', 'components']
const highRiskPatterns = [
  { name: 'addEventListener', regex: /\.addEventListener\s*\(/ },
  { name: 'setInterval', regex: /\bsetInterval\s*\(/ },
  { name: 'requestAnimationFrame', regex: /\brequestAnimationFrame\s*\(/ },
  { name: 'WebSocket', regex: /new\s+WebSocket\s*\(/ },
  { name: 'EventSource', regex: /new\s+EventSource\s*\(/ },
  { name: 'ResizeObserver', regex: /new\s+ResizeObserver\s*\(/ },
  { name: 'MutationObserver', regex: /new\s+MutationObserver\s*\(/ },
  { name: 'WebGLRenderer', regex: /new\s+THREE\.WebGLRenderer\s*\(/ },
]
const cleanupPatterns = [
  /return\s*\(\)\s*=>/,
  /return\s+function/,
  /removeEventListener\s*\(/,
  /clearInterval\s*\(/,
  /cancelAnimationFrame\s*\(/,
  /\.close\s*\(/,
  /\.disconnect\s*\(/,
  /\.dispose\s*\(/,
]

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) out.push(full)
  }
  return out
}

function extractUseEffectBlocks(text) {
  const blocks = []
  let index = 0
  while (true) {
    const start = text.indexOf('useEffect', index)
    if (start === -1) break
    const openParen = text.indexOf('(', start)
    if (openParen === -1) break
    let depth = 0
    let end = -1
    for (let i = openParen; i < text.length; i++) {
      const ch = text[i]
      if (ch === '(') depth++
      if (ch === ')') depth--
      if (depth === 0) {
        end = i
        break
      }
    }
    if (end === -1) break
    const line = text.slice(0, start).split(/\r?\n/).length
    blocks.push({ line, body: text.slice(start, end + 1) })
    index = end + 1
  }
  return blocks
}

const findings = []
let riskyEffects = 0
for (const root of scanRoots) {
  for (const file of walk(path.join(webRoot, root))) {
    const rel = path.relative(webRoot, file).replace(/\\/g, '/')
    const text = fs.readFileSync(file, 'utf8')
    for (const block of extractUseEffectBlocks(text)) {
      const risks = highRiskPatterns.filter((pattern) => pattern.regex.test(block.body)).map((pattern) => pattern.name)
      if (!risks.length) continue
      riskyEffects++
      const hasCleanup = cleanupPatterns.some((pattern) => pattern.test(block.body))
      if (!hasCleanup) findings.push({ file: rel, line: block.line, risks })
    }
  }
}

const report = [
  '# Effect Cleanup Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Risky useEffect blocks: ${riskyEffects}`,
  `- Missing cleanup findings: ${findings.length}`,
  '',
  '## Findings',
  ...(findings.length ? findings.map((item) => `- ${item.file}:${item.line} (${item.risks.join(', ')})`) : ['- None']),
  '',
].join('\n')
fs.writeFileSync(path.join(webRoot, 'docs/EFFECT_CLEANUP_AUDIT.md'), report)

if (findings.length) {
  console.error(report)
  process.exit(1)
}
console.log(`Effect cleanup gate passed (${riskyEffects} risky effects checked)`)

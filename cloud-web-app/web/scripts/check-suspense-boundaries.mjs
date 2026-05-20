#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const roots = ['app', 'components']
const minSuspense = 30
let count = 0
const files = []

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.isFile() && full.endsWith('.tsx')) {
      const text = fs.readFileSync(full, 'utf8')
      const matches = text.match(/<Suspense\b/g) || []
      if (matches.length) {
        count += matches.length
        files.push({ file: path.relative(webRoot, full).replace(/\\/g, '/'), count: matches.length })
      }
    }
  }
}

for (const root of roots) walk(path.join(webRoot, root))

const failures = []
if (count < minSuspense) failures.push(`Suspense boundaries below target: ${count}/${minSuspense}`)

const report = [
  '# Suspense Boundaries Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  `- Suspense boundaries: ${count}`,
  `- Target: ${minSuspense}`,
  `- Failures: ${failures.length}`,
  '',
  '## Files',
  ...files.map((item) => `- ${item.file}: ${item.count}`),
  '',
  ...failures.map((failure) => `- ${failure}`),
].join('\n')
fs.writeFileSync(path.join(webRoot, 'docs/SUSPENSE_BOUNDARIES_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}
console.log(`Suspense boundary gate passed (${count})`)

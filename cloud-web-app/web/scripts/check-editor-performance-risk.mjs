#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const targets = [
  { file: 'components/engine/WorldOutliner.tsx', maxMapCalls: 8 },
  { file: 'components/engine/EngineContentBrowser.tsx', maxMapCalls: 8 },
  { file: 'components/animation/KeyframeSystem.tsx', maxMapCalls: 4 },
  { file: 'components/engine/DetailsPanel.tsx', maxMapCalls: 8 },
  { file: 'components/assets/ContentBrowserConnected.tsx', maxMapCalls: 10 },
]

const failures = []
const rows = []
for (const target of targets) {
  const full = path.join(webRoot, target.file)
  if (!fs.existsSync(full)) {
    failures.push(`Missing editor risk target: ${target.file}`)
    continue
  }
  const text = fs.readFileSync(full, 'utf8')
  const mapCalls = (text.match(/\.map\s*\(/g) || []).length
  const hasMemo = /useMemo|React\.memo|memo\(/.test(text)
  const hasCallbacks = /useCallback/.test(text)
  rows.push({ ...target, mapCalls, hasMemo, hasCallbacks })
  if (mapCalls > target.maxMapCalls) failures.push(`${target.file} has ${mapCalls} map calls (max ${target.maxMapCalls})`)
  if (!hasMemo) failures.push(`${target.file} lacks memoization evidence`)
  if (!hasCallbacks) failures.push(`${target.file} lacks callback stability evidence`)
}

const report = [
  '# Editor Performance Risk Audit',
  '',
  'Generated: deterministic local scan',
  '',
  `- Target files: ${targets.length}`,
  `- Failures: ${failures.length}`,
  '',
  '| File | map() calls | Max | Memo evidence | Callback evidence |',
  '| --- | ---: | ---: | --- | --- |',
  ...rows.map((row) => `| ${row.file} | ${row.mapCalls} | ${row.maxMapCalls} | ${row.hasMemo ? 'yes' : 'no'} | ${row.hasCallbacks ? 'yes' : 'no'} |`),
  '',
  ...failures.map((failure) => `- ${failure}`),
].join('\n')
fs.writeFileSync(path.join(webRoot, 'docs/EDITOR_PERFORMANCE_RISK_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}
console.log('Editor performance risk gate passed')

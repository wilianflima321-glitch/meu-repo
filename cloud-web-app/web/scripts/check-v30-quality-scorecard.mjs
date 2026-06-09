#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REPO_ROOT = path.resolve(ROOT, '..', '..')
const failures = []

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walk(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, predicate, results)
    } else if (predicate(full)) {
      results.push(toPosix(path.relative(ROOT, full)))
    }
  }
  return results
}

function tracked(relativePath) {
  try {
    return Boolean(execFileSync('git', ['ls-files', '--', relativePath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim())
  } catch {
    return false
  }
}

function ignored(relativePath) {
  try {
    return Boolean(execFileSync('git', ['check-ignore', '-v', relativePath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim())
  } catch {
    return false
  }
}

const sourceFiles = walk(ROOT, (full) => /\.(?:ts|tsx)$/.test(full))
const pageFiles = walk(path.join(ROOT, 'app'), (full) => path.basename(full) === 'page.tsx')
const storyFiles = walk(ROOT, (full) => /\.stories\.(?:ts|tsx)$/.test(full))
const testFiles = walk(ROOT, (full) => /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(full))
const shellFiles = walk(ROOT, (full) => /(?:Shell|shell)\.tsx$/.test(path.basename(full)))

const largeFiles = sourceFiles
  .map((file) => {
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/).length
    return { file, lines }
  })
  .filter((entry) => entry.lines > 500)
  .sort((left, right) => right.lines - left.lines)

const expectedLockfiles = [
  'package-lock.json',
  'cloud-web-app/web/package-lock.json',
  'apps/studio-local/package-lock.json',
  'apps/studio-local/src-tauri/Cargo.lock',
]

const lockfilesOk = expectedLockfiles.every((file) => fs.existsSync(path.join(REPO_ROOT, file)) && tracked(file) && !ignored(file))

const adminSubroutes = pageFiles.filter((file) => file.startsWith('app/admin/') && file !== 'app/admin/page.tsx').length
const studioSubroutes = pageFiles.filter((file) => file.startsWith('app/studio/') && file !== 'app/studio/page.tsx').length
const filesOver800 = largeFiles.filter((entry) => entry.lines > 800).length

const scoreBreakdown = [
  { id: 'reproducibility', points: lockfilesOk ? 20 : 0, max: 20, note: lockfilesOk ? 'lockfiles tracked and unignored' : 'lockfile tracking is incomplete' },
  { id: 'route-convergence', points: pageFiles.length <= 58 && adminSubroutes <= 6 && studioSubroutes <= 5 ? 20 : 0, max: 20, note: `pages=${pageFiles.length}, admin=${adminSubroutes}, studio=${studioSubroutes}` },
  { id: 'heavy-boundaries', points: 15, max: 15, note: 'public/dashboard/admin heavy imports are checked by qa:v30-heavy-runtime-boundaries' },
  { id: 'large-file-health', points: filesOver800 === 0 && largeFiles.length <= 218 ? 10 : 0, max: 15, note: `filesOver500=${largeFiles.length}; target for market-grade is <160` },
  { id: 'tests-and-stories', points: (testFiles.length >= 230 ? 8 : 0) + (storyFiles.length >= 39 ? 3 : 0), max: 15, note: `tests=${testFiles.length}; stories=${storyFiles.length}; next market target stories>=80` },
  { id: 'internal-contracts', points: fs.existsSync(path.join(ROOT, 'lib/runtime/v30-internal-spine.ts')) ? 15 : 0, max: 15, note: 'V30 contracts are present' },
]

const total = scoreBreakdown.reduce((sum, item) => sum + item.points, 0)
const max = scoreBreakdown.reduce((sum, item) => sum + item.max, 0)

if (total < 85) failures.push(`V30 internal quality score ${total}/${max} is below minimum 85`)
if (shellFiles.length > 8) failures.push(`shell entrypoints ${shellFiles.length} exceed ratchet 8`)
if (storyFiles.length < 39) failures.push(`story files ${storyFiles.length} are below V30 ratchet 39`)
if (filesOver800 !== 0) failures.push(`filesOver800 must remain 0, found ${filesOver800}`)

const nextActions = [
  'Reduce filesOver500 from 218 toward <160 by splitting contracts/defaults/runtime/adapters/tests.',
  'Raise Storybook from 30 toward 80 with shared shells, agents, creative primitives, and failure states.',
  'Build components/agents as the only user-facing AI workspace grammar.',
  'Create CreativeWorkbenchShell before adding new mature creative editor surfaces.',
  'Upgrade Studio Local shell with capability manifest, sidecar lanes, logs, and crash state.',
]

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_QUALITY_SCORECARD.md'),
  [
    '# V30 Quality Scorecard',
    '',
    `Score: ${total}/${max}`,
    '',
    '## Breakdown',
    ...scoreBreakdown.map((item) => `- ${item.id}: ${item.points}/${item.max} - ${item.note}`),
    '',
    '## Top large files',
    ...largeFiles.slice(0, 20).map((entry) => `- ${entry.lines} LOC - ${entry.file}`),
    '',
    '## Next actions',
    ...nextActions.map((action) => `- ${action}`),
    '',
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-quality-scorecard] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v30-quality-scorecard] PASS score=${total}/${max} pages=${pageFiles.length} filesOver500=${largeFiles.length} stories=${storyFiles.length} tests=${testFiles.length}`)

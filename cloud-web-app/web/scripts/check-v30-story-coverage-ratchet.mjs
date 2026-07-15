#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/')
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.turbo') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, results)
    } else if (/\.stories\.(?:ts|tsx|mdx)$/.test(entry.name)) {
      results.push(toPosix(path.relative(ROOT, full)))
    }
  }
  return results
}

const stories = walk(path.join(ROOT, 'components'))
const groups = {
  agents: stories.filter((story) => story.startsWith('components/agents/')).length,
  preview: stories.filter((story) => story.startsWith('components/preview/')).length,
  studio: stories.filter((story) => story.startsWith('components/studio/')).length,
  ui: stories.filter((story) => story.startsWith('components/ui/')).length,
}

const ratchets = {
  total: 39,
  agents: 4,
  preview: 2,
  studio: 3,
}

if (stories.length < ratchets.total) failures.push(`stories total ${stories.length} is below ratchet ${ratchets.total}`)
if (groups.agents < ratchets.agents) failures.push(`agent stories ${groups.agents} is below ratchet ${ratchets.agents}`)
if (groups.preview < ratchets.preview) failures.push(`preview stories ${groups.preview} is below ratchet ${ratchets.preview}`)
if (groups.studio < ratchets.studio) failures.push(`studio stories ${groups.studio} is below ratchet ${ratchets.studio}`)

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'V30_STORY_COVERAGE_RATCHET.md'),
  [
    '# V30 Story Coverage Ratchet',
    '',
    `Total stories: ${stories.length}/${ratchets.total}`,
    `Agents: ${groups.agents}/${ratchets.agents}`,
    `Preview: ${groups.preview}/${ratchets.preview}`,
    `Studio: ${groups.studio}/${ratchets.studio}`,
    `UI: ${groups.ui}`,
    `Failures: ${failures.length}`,
    '',
  ].join('\n'),
)

if (failures.length) {
  console.error('[v30-story-coverage-ratchet] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[v30-story-coverage-ratchet] PASS stories=${stories.length} agents=${groups.agents} preview=${groups.preview} studio=${groups.studio}`)

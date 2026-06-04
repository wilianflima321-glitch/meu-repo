#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const abs = path.join(ROOT, relativePath)
  if (!fs.existsSync(abs)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(abs, 'utf8')
}

function requireToken(relativePath, token, label = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${label}`)
}

requireToken('lib/research/research-runtime-spine.ts', 'buildResearchRuntimeSpinePlan', 'research runtime planner')
requireToken('lib/research/research-runtime-spine.ts', 'validateResearchRuntimeSpinePlan', 'research runtime validator')
requireToken('lib/research/research-runtime-spine.ts', "'browser-replay'", 'browser replay step')
requireToken('lib/research/research-runtime-spine.ts', "'artifacts'", 'artifact step')
requireToken('lib/research/research-runtime-spine.ts', "'confidence'", 'confidence step')
requireToken('lib/research/research-runtime-spine.ts', "'final-answer'", 'final answer step')
requireToken('lib/research/research-runtime-spine.ts', 'Research cannot be marked verified without source receipts', 'no fake research rule')
requireToken('components/nexus/AethelResearch.tsx', 'buildResearchRuntimeSpinePlan', 'research UI consumes runtime spine')
requireToken('components/nexus/AethelResearch.tsx', 'data-research-state={researchRuntimeSpine.state}', 'research UI exposes governed state')
requireToken('components/nexus/AethelResearch.tsx', 'researchRuntimeSpine.steps.slice(0, 5)', 'research runboard is driven by spine')

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'RESEARCH_RUNTIME_SPINE.md'),
  `# Research Runtime Spine

- Planner: lib/research/research-runtime-spine.ts
- UI: components/nexus/AethelResearch.tsx
- Required lanes: plan, sources, browser replay, artifacts, confidence, cost, final answer
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[research-runtime-spine] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[research-runtime-spine] PASS lanes=7')

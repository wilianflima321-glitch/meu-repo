#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function requireToken(relativePath, token, reason = token) {
  const content = read(relativePath)
  if (!content.includes(token)) failures.push(`${relativePath}: missing ${reason}`)
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const blueprint = read('lib/product/workspace-blueprint.ts')
for (const token of [
  'WorkspaceBlueprint',
  'PreviewAnnotation',
  'AgentEvidenceReceipt',
  'ResearchArtifact',
  'AssetQualityLedger',
  'RuntimeCapability',
  'ContextPackBudget',
  'prompt',
  'blueprint',
  'workspace',
  'preview',
  'annotate',
  'code',
  'publish-evidence',
]) {
  if (!blueprint.includes(token)) failures.push(`lib/product/workspace-blueprint.ts: missing ${token}`)
}

requireToken('components/dashboard/dashboard-launch-handoff.ts', 'buildWorkspaceBlueprint', 'dashboard handoff blueprint builder')
requireToken('components/dashboard/dashboard-launch-handoff.ts', 'summarizeWorkspaceBlueprint', 'dashboard handoff blueprint summary')
requireToken('components/dashboard/dashboard-launch-handoff.ts', 'Firebase-like journey contract', 'copilot journey contract copy')
requireToken('components/dashboard/DashboardWorkspaceLaunch.tsx', 'data-firebase-like-journey', 'dashboard visible journey marker')
requireToken('app/api/workspace/blueprint/route.ts', 'buildWorkspaceBlueprint', 'workspace blueprint API builder')
requireToken('app/api/workspace/blueprint/route.ts', 'MISSION_REQUIRED', 'workspace blueprint API validation')
requirePattern(
  'components/dashboard/DashboardWorkspaceLaunch.tsx',
  /Prompt[\s\S]*Blueprint[\s\S]*Workspace[\s\S]*Preview[\s\S]*Evidence/,
  'ordered Firebase-like journey stages'
)
requireToken('components/preview/previewSurfaceRegistry.ts', "'annotate'", 'preview annotation action')
requireToken('components/preview/previewSurfaceRegistry.ts', "'apply-proposal'", 'preview proposal action')
requireToken('components/preview/CanonicalPreviewSurface.tsx', 'Ask the agent to improve the selected area', 'preview annotation composer')

if (/AAA pronto|Unreal-grade|final asset|Pixel Streaming disponivel|installer signed|research verified|production ready/.test(blueprint)) {
  failures.push('lib/product/workspace-blueprint.ts: contains prohibited unproven market claim')
}

const reportDir = path.join(ROOT, '.next', 'aethel-audits')
fs.mkdirSync(reportDir, { recursive: true })
fs.writeFileSync(
  path.join(reportDir, 'FIREBASE_LIKE_JOURNEY_AUDIT.md'),
  `# Firebase-like Journey Audit

- Blueprint contract: ${blueprint.includes('WorkspaceBlueprint') ? 'present' : 'missing'}
- Visible dashboard marker: ${read('components/dashboard/DashboardWorkspaceLaunch.tsx').includes('data-firebase-like-journey') ? 'present' : 'missing'}
- Preview annotate/apply proposal: ${read('components/preview/previewSurfaceRegistry.ts').includes("'apply-proposal'") ? 'present' : 'missing'}
- Failures: ${failures.length}
`,
)

if (failures.length > 0) {
  console.error('[firebase-like-journey] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[firebase-like-journey] PASS prompt->blueprint->workspace->preview->annotate->code->evidence')

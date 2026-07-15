#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const reportPath = path.join(ROOT, 'docs', 'RUNTIME_MODE_SIMPLIFICATION_AUDIT.md')
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
  return content
}

const model = requirePattern(
  'lib/runtime/runtime-mode-view-model.ts',
  /buildRuntimeModeViewModels/,
  'shared RuntimeModeViewModel builder',
)
const viewport = requirePattern(
  'components/viewport/AethelViewport3D.tsx',
  /buildRuntimeModeViewModels/,
  'viewport must use shared runtime modes',
)
const studio = requirePattern(
  'app/studio/StudioMissionControl.tsx',
  /runtimeModeForTarget/,
  'Studio Mission Control must map session targets through shared runtime modes',
)

for (const label of ['Browser', 'Studio Local', 'Cloud Stream']) {
  if (!model.includes(label)) failures.push(`lib/runtime/runtime-mode-view-model.ts: missing ${label}`)
}

if (!model.includes("selectable: cloudConfigured")) {
  failures.push('lib/runtime/runtime-mode-view-model.ts: Cloud Stream must be selectable only when configured')
}
if (!model.includes("runtimeTarget: cloudConfigured ? 'cloud-sandbox' : 'held'")) {
  failures.push('lib/runtime/runtime-mode-view-model.ts: Cloud Stream must fall back to held when env is missing')
}
if (/AAA|Unreal-quality/.test(viewport + studio)) {
  failures.push('runtime surfaces must not claim AAA/Unreal quality in the product UI')
}

const report = `# Runtime Mode Simplification Audit

- Shared runtime model: \`lib/runtime/runtime-mode-view-model.ts\`
- Viewport uses shared model: ${viewport.includes('buildRuntimeModeViewModels') ? 'yes' : 'no'}
- Studio Mission Control uses shared model: ${studio.includes('buildRuntimeModeViewModels') ? 'yes' : 'no'}
- Cloud Stream held without env: ${model.includes("runtimeTarget: cloudConfigured ? 'cloud-sandbox' : 'held'") ? 'yes' : 'no'}

Status: ${failures.length ? 'FAIL' : 'PASS'}
`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, report)

if (failures.length) {
  console.error('[runtime-mode-simplification] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[runtime-mode-simplification] PASS')

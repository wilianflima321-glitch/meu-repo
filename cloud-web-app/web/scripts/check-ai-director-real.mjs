#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const webRoot = process.cwd()
const checks = [
  'app/api/ai/director/[projectId]/route.ts',
  'app/api/ai/director/[projectId]/action/route.ts',
  'lib/server/ai-director/service.ts',
  'lib/server/ai-director/actions.ts',
  'lib/server/ai-director/types.ts',
]

const read = (rel) => fs.readFileSync(path.join(webRoot, rel), 'utf8')
const failures = []
for (const rel of checks) {
  if (!fs.existsSync(path.join(webRoot, rel))) failures.push(`Missing ${rel}`)
}

const directorText = checks.filter((rel) => fs.existsSync(path.join(webRoot, rel))).map(read).join('\n')
const route = fs.existsSync(path.join(webRoot, checks[0])) ? read(checks[0]) : ''
const action = fs.existsSync(path.join(webRoot, checks[1])) ? read(checks[1]) : ''
const service = fs.existsSync(path.join(webRoot, checks[2])) ? read(checks[2]) : ''
const actions = fs.existsSync(path.join(webRoot, checks[3])) ? read(checks[3]) : ''

if (/DIRECTOR_HEURISTIC_PREVIEW|heuristic_preview/.test(directorText)) {
  failures.push('Director still exposes legacy heuristic preview contract text.')
}
if (!service.includes('advancedAI.complete')) failures.push('Director service must call advancedAI.complete for real provider analysis.')
if (!service.includes("analysisMode: 'real_llm'")) failures.push('Director service must emit analysisMode real_llm on provider success.')
if (!service.includes("analysisMode: 'provider_unavailable'")) failures.push('Director service must emit provider_unavailable fallback when no provider is ready.')
if (!service.includes("analysisMode: 'legacy_heuristic_dev_only'")) failures.push('Director service must keep legacy heuristic limited to explicit dev-only mode.')
if (/blockIfSimulationDisabled/.test(directorText)) failures.push('Director route must not block honest provider_unavailable responses via simulation guard.')
if (!route.includes('getDirectorSessionPayload')) failures.push('Director GET route must delegate to lib/server/ai-director service.')
if (!action.includes('handleDirectorAction')) failures.push('Director action route must delegate to lib/server/ai-director actions.')
if (!actions.includes('No automatic file changes were made')) failures.push('Director apply action must not claim destructive auto-apply.')

const routeLines = route.split(/\r?\n/).length
const actionLines = action.split(/\r?\n/).length
if (routeLines > 120) failures.push(`Director route is too large (${routeLines} lines > 120).`)
if (actionLines > 130) failures.push(`Director action route is too large (${actionLines} lines > 130).`)

const report = [
  '# AI Director Real Audit',
  '',
  'Generated: deterministic local scan',
  '',
  `- Director route lines: ${routeLines}`,
  `- Director action route lines: ${actionLines}`,
  '- Required modes: real_llm, provider_unavailable, legacy_heuristic_dev_only',
  `- Failures: ${failures.length}`,
  ...failures.map((failure) => `- ${failure}`),
  '',
].join('\n')
fs.writeFileSync(path.join(webRoot, 'docs/AI_DIRECTOR_REAL_AUDIT.md'), report)

if (failures.length) {
  console.error(report)
  process.exit(1)
}
console.log('AI Director real gate passed')

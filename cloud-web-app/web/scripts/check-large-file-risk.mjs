#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(SCRIPT_DIR, '..')
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'])
const IGNORED_PARTS = new Set(['node_modules', '.next', 'coverage', 'dist', 'build', '.git'])
const LINE_LIMIT = 1000
const HARD_MAX_LINES = 1800
const UI_MAX_LINES = 1200
const API_MAX_LINES = 1200
const REPORT_PATH = path.join(ROOT, 'docs', 'LARGE_FILE_RISK_AUDIT.md')
const P1_DECISIONS = new Set(['wire', 'archive', 'held', 'adapter-needed'])

const ARCHIVE_CANDIDATE_PATTERNS = [
  /lib\/ui\/ui-framework\.tsx$/,
  /lib\/hot-reload-system\.ts$/,
  /lib\/onboarding-system\.ts$/,
  /lib\/debug\/debug-console\.tsx$/,
  /lib\/cache-system\.ts$/,
  /lib\/settings\/settings-system\.tsx$/,
  /lib\/translations\.ts$/,
]

const CREATIVE_ADAPTER_PATTERNS = [
  /dialogue/,
  /cutscene/,
  /capture/,
  /animation/,
  /save/,
  /inventory/,
  /quest/,
  /world/,
  /state/,
  /input/,
  /physics/,
  /terrain/,
  /materials/,
  /engine/,
  /visual-script/,
  /audio/,
  /asset/,
  /particle/,
  /volumetric/,
  /nanite/,
  /ecs/,
  /extensions/,
  /sdk/,
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_PARTS.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, files)
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(abs)
  }
  return files
}

function toRelative(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/')
}

function classify(relativePath) {
  if (relativePath.startsWith('app/api/')) return 'api-route'
  if (relativePath.startsWith('server/') || relativePath.startsWith('lib/server/')) return 'server-runtime'
  if (relativePath.includes('/workers/')) return 'worker-runtime'
  if (relativePath.startsWith('components/')) return 'ui-surface'
  if (relativePath.startsWith('lib/production/') || relativePath.includes('repository-cartography')) return 'agent-spine'
  if (relativePath.startsWith('lib/mcp/')) return 'mcp-tooling'
  if (relativePath.startsWith('lib/viewport/')) return 'viewport-runtime'
  if (relativePath.startsWith('lib/ui/')) return 'ui-runtime'
  if (/lib\/(ai|animation|audio|capture|cutscene|dialogue|ecs|engine|events|input|materials|networking|particles|physics|postprocessing|save|scene|state|terrain|visual-script|world)\//.test(relativePath)) return 'creative-runtime'
  if (/(advanced-input|ai-audio|ai-tools|behavior-tree|ecs-dots|particle|volumetric|render|ray|shader|asset|pixel|video|fluid|cloth|facial|motion|nanite|webxr|terrain|quest|inventory|dialogue|cache|settings|debug|extension|sdk|translation|hot-reload|level|onboarding|yjs-collaboration)/.test(relativePath)) return 'foundation-runtime'
  return 'uncategorized-runtime'
}

function buildSearchNeedles(relativePath) {
  const noExt = relativePath.replace(/\.[^.]+$/, '')
  const stem = path.basename(noExt)
  const needles = new Set([
    `@/${noExt}`,
    relativePath,
    noExt,
  ])
  if (/^[A-Z]/.test(stem)) needles.add(stem)
  return [...needles]
}

function countImportHints(target, sourceFiles) {
  const needles = buildSearchNeedles(target.relativePath)
  let count = 0
  for (const source of sourceFiles) {
    if (source.relativePath === target.relativePath) continue
    const content = source.content
    if (needles.some((needle) => content.includes(needle))) count += 1
  }
  return count
}

function riskFor(entry) {
  if (entry.lines > HARD_MAX_LINES) return 'P0 hard ceiling'
  if (entry.category === 'ui-surface' && entry.lines > UI_MAX_LINES) return 'P0 UI monolith'
  if (entry.category === 'api-route' && entry.lines > API_MAX_LINES) return 'P0 route monolith'
  if (entry.lines >= 1500) return 'P0 runtime monolith'
  if (entry.importHints <= 1 && !['api-route', 'server-runtime', 'worker-runtime'].includes(entry.category)) return 'P1 low-import large module'
  return 'P2 tracked large module'
}

function recommendationFor(entry) {
  if (entry.risk.startsWith('P0') && entry.category === 'ui-surface') return 'Split into shell, toolbar, inspector, canvas, and hooks before adding features.'
  if (entry.risk.startsWith('P0') && entry.category === 'api-route') return 'Move orchestration, validation, persistence, and response mapping into tested lib modules.'
  if (entry.risk.startsWith('P0')) return 'Extract protocol, persistence, lifecycle, and telemetry modules with contract tests.'
  if (entry.risk.includes('low-import')) return 'Decision is mandatory: wire visibly, archive, hold, or expose through a safe adapter.'
  return 'Keep stable; only allow growth with adjacent tests and an extraction note.'
}

function triageFor(entry) {
  if (!entry.risk.startsWith('P1')) return null

  if (ARCHIVE_CANDIDATE_PATTERNS.some((pattern) => pattern.test(entry.relativePath))) {
    return {
      decision: 'archive',
      target: 'Legacy compatibility boundary',
      loadStrategy: 'not-loaded',
      rationale: 'Low-import legacy surface; preserve compatibility evidence before deletion or redirect.',
    }
  }

  if (entry.category === 'creative-runtime' || CREATIVE_ADAPTER_PATTERNS.some((pattern) => pattern.test(entry.relativePath))) {
    return {
      decision: 'adapter-needed',
      target: 'Studio engine adapter',
      loadStrategy: 'dynamic-client-only or worker/sidecar',
      rationale: 'Expose as read-only capability evidence before enabling writes or heavy execution.',
    }
  }

  if (entry.category === 'foundation-runtime' || entry.category === 'viewport-runtime') {
    return {
      decision: 'held',
      target: 'Runtime/toolchain evidence',
      loadStrategy: 'worker-or-sidecar',
      rationale: 'Needs capability, cost, license, and safety evidence before runtime activation.',
    }
  }

  if (entry.category === 'ui-runtime') {
    return {
      decision: 'archive',
      target: 'Design-system consolidation',
      loadStrategy: 'not-loaded',
      rationale: 'Low-import UI runtime must be merged into canonical primitives or archived.',
    }
  }

  return {
    decision: 'held',
    target: 'Owner review',
    loadStrategy: 'blocked-until-owner-decision',
    rationale: 'Large low-import module is intentionally held until a surface, owner, and tests are assigned.',
  }
}

function loadInventory() {
  const sourceFiles = walk(ROOT).map((abs) => ({
    abs,
    relativePath: toRelative(abs),
    content: fs.readFileSync(abs, 'utf8'),
  }))
  const large = sourceFiles
    .map((source) => ({
      relativePath: source.relativePath,
      lines: source.content.split(/\r?\n/).length,
      category: classify(source.relativePath),
    }))
    .filter((entry) => entry.lines >= LINE_LIMIT)
    .map((entry) => ({
      ...entry,
      importHints: countImportHints(entry, sourceFiles),
    }))
    .map((entry) => ({
      ...entry,
      risk: riskFor(entry),
    }))
    .map((entry) => ({
      ...entry,
      recommendation: recommendationFor(entry),
    }))
    .map((entry) => ({
      ...entry,
      triage: triageFor(entry),
    }))
    .sort((a, b) => b.lines - a.lines || a.relativePath.localeCompare(b.relativePath))

  return large
}

function buildReport(inventory) {
  const p0 = inventory.filter((entry) => entry.risk.startsWith('P0'))
  const p1 = inventory.filter((entry) => entry.risk.startsWith('P1'))
  const categories = new Map()
  for (const entry of inventory) categories.set(entry.category, (categories.get(entry.category) ?? 0) + 1)
  const categorySummary = [...categories.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([category, count]) => `- \`${category}\`: ${count}`)
    .join('\n')

  const topRiskRows = [...p0, ...p1].slice(0, 25).map((entry) => (
    `| \`${entry.relativePath}\` | ${entry.lines} | ${entry.category} | ${entry.risk} | ${entry.importHints} | ${entry.recommendation} |`
  )).join('\n')

  const triageRows = p1.map((entry) => (
    `| \`${entry.relativePath}\` | ${entry.triage?.decision ?? 'missing'} | ${entry.triage?.target ?? '-'} | ${entry.triage?.loadStrategy ?? '-'} | ${entry.triage?.rationale ?? '-'} |`
  )).join('\n')

  const inventoryRows = inventory.map((entry) => (
    `| \`${entry.relativePath}\` | ${entry.lines} | ${entry.category} | ${entry.risk} | ${entry.importHints} |`
  )).join('\n')

  return `# Large File Risk Audit\n\nGenerated: deterministic local scan\n\nThis audit tracks source files with at least ${LINE_LIMIT} lines. The goal is not to blindly split working systems; it is to stop silent god-file regression, identify low-import aspirational modules, and force extraction plans before future growth.\n\n## Executive Summary\n\n- Large source files: ${inventory.length}\n- P0 files: ${p0.length}\n- P1 low-import large modules: ${p1.length}\n- P1 modules with explicit triage: ${p1.filter((entry) => entry.triage).length}\n- Hard ceiling: ${HARD_MAX_LINES} lines\n- UI ceiling: ${UI_MAX_LINES} lines\n- API route ceiling: ${API_MAX_LINES} lines\n\n## Categories\n\n${categorySummary}\n\n## Owner Decisions\n\n- Keep large runtime kernels only when they are protocol-heavy and covered by gates.\n- UI surfaces above ${UI_MAX_LINES} lines must be split before new feature work.\n- API routes above ${API_MAX_LINES} lines must move business logic to \`lib/**\` modules.\n- Low-import creative/runtime modules must be wired into visible editors or archived; they cannot remain ambiguous forever.\n- Every P1 low-import module must have an explicit \`wire\`, \`archive\`, \`held\`, or \`adapter-needed\` decision in this report.\n- Engine-spine modules must state a load strategy and limitation so hidden systems do not slow public/product routes by accident.\n- New files over ${LINE_LIMIT} lines are allowed only with a test, category, and explicit extraction plan.\n\n## Highest-Risk Files\n\n| File | Lines | Category | Risk | Import hints | Recommendation |\n| --- | ---: | --- | --- | ---: | --- |\n${topRiskRows || '| _None_ | 0 | - | - | 0 | - |'}\n\n## P1 Triage Decisions\n\n| File | Decision | Target surface | Load strategy | Rationale |\n| --- | --- | --- | --- | --- |\n${triageRows || '| _None_ | - | - | - | - |'}\n\n## Full Inventory\n\n| File | Lines | Category | Risk | Import hints |\n| --- | ---: | --- | --- | ---: |\n${inventoryRows}\n\n## Next Refactor Queue\n\n1. \`lib/server/ai-chat-advanced/**\` and \`lib/server/ai-change-apply/**\`: keep critical AI route orchestration split and enforced by \`qa:ai-route-split\`.\n2. \`lib/level-serialization/**\`: keep the canonical serializer/format/manager/history split enforced by \`qa:level-serialization-split\`.\n3. \`lib/mcp/aethel/**\`: keep the tool definitions, auth policy, handlers, response schemas, resources, and prompts split enforced by \`qa:mcp-server-split\`.\n4. \`lib/server/extension-host/**\`: keep the runtime/API/types split enforced by \`qa:extension-host-split\`.\n5. \`lib/pixel-streaming/**\`: keep the new signaling/session/codec/cost split enforced by \`qa:pixel-streaming-split\`.\n6. \`lib/server/websocket/**\`: keep the transport/auth/rooms/presence split enforced by \`qa:websocket-runtime-split\`.\n\n## Validation\n\nRun \`npm run qa:large-file-risk\` to fail on unbounded file growth or new untracked monoliths.\nRun \`npm run qa:engine-spine-modules\` to ensure V18-V20 engine assets have explicit load strategies before wiring.\n`
}

const inventory = loadInventory()
const failures = []
for (const entry of inventory) {
  if (entry.lines > HARD_MAX_LINES) failures.push(`${entry.relativePath}: ${entry.lines} lines exceeds hard ceiling ${HARD_MAX_LINES}`)
  if (entry.category === 'ui-surface' && entry.lines > UI_MAX_LINES) failures.push(`${entry.relativePath}: ${entry.lines} lines exceeds UI ceiling ${UI_MAX_LINES}`)
  if (entry.category === 'api-route' && entry.lines > API_MAX_LINES) failures.push(`${entry.relativePath}: ${entry.lines} lines exceeds API route ceiling ${API_MAX_LINES}`)
  if (entry.category === 'uncategorized-runtime') failures.push(`${entry.relativePath}: large file is uncategorized`)
  if (entry.risk.startsWith('P1') && (!entry.triage || !P1_DECISIONS.has(entry.triage.decision))) {
    failures.push(`${entry.relativePath}: P1 large module missing explicit triage decision`)
  }
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true })
fs.writeFileSync(REPORT_PATH, buildReport(inventory))

if (failures.length) {
  console.error('[large-file-risk] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const p0 = inventory.filter((entry) => entry.risk.startsWith('P0')).length
const p1 = inventory.filter((entry) => entry.risk.startsWith('P1')).length
console.log(`[large-file-risk] PASS largeFiles=${inventory.length}, p0=${p0}, p1=${p1}, report=${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`)

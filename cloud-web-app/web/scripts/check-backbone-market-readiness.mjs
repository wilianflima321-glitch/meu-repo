#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const DOMAINS = [
  {
    id: 'apps-production-memory',
    standard: 'Apps need project brain, mission ledger, evidence graphs, rollback, readiness, and next action before agents mutate work.',
    files: [
      'lib/production/agentic-production-state.ts',
      'lib/production/task-evidence-ledger.ts',
      'lib/production/repository-cartography.ts',
      'lib/production/multi-resolution-project-memory.ts',
      'lib/production/evidence-ref-coverage.ts',
      'app/api/projects/[id]/production-state/route.ts',
      'app/api/projects/[id]/production-state/evidence-coverage/route.ts',
      'components/evidence/EvidenceCenter.tsx',
    ],
    tokens: [
      'ProjectBrainMemory',
      'MissionLedgerEntry',
      'evidenceRefs',
      'rollbackPlan',
      'buildProductionReadinessSummary',
      'enforceProductionReleaseGuard',
      'Human release approval evidence is required before release can be marked ready.',
      'AETHEL_EVIDENCE_REF_COVERAGE',
      'evidence-ref-coverage',
      'nextAction',
    ],
  },
  {
    id: 'research-evidence-bridge',
    standard: 'Research needs sources, confidence, contradictions, browser replay, repo links, safe tool plans, and human approval for weak claims.',
    files: [
      'lib/production/research-intelligence-bridge.ts',
      'lib/production/research-navigation-mesh.ts',
      'lib/research/research-agent.ts',
      'app/api/research/route.ts',
      'app/api/research/navigation-mesh/route.ts',
      'app/api/projects/[id]/production-state/research-intelligence/route.ts',
      'app/api/projects/[id]/production-state/research-navigation/route.ts',
      'components/nexus/AethelResearch.tsx',
    ],
    tokens: [
      'ResearchSourceRecord',
      'confidence',
      'requiresBrowserReplay',
      'requiresHumanApproval',
      'conflicts-with-repo',
      'externalToolPlan',
      'AETHEL_RESEARCH_NAVIGATION_MESH',
      'RESEARCH_NAVIGATION_MESH_SETTINGS_KEY',
      'mergeResearchNavigationMeshIntoProductionState',
      'user-chrome-extension',
      'local-chrome-devtools',
      'pause/takeover before consequence-bearing actions',
      'source URLs/dates captured',
    ],
  },
  {
    id: 'agent-workforce-governance',
    standard: 'Agents need roles, scope locks, handoff packets, read receipts, tool permissions, cost/risk classes, and visible execution state.',
    files: [
      'lib/production/agent-workforce-topology.ts',
      'lib/production/agent-scope-enforcement.ts',
      'lib/production/agent-handoff-packet.ts',
      'lib/production/agent-read-receipts.ts',
      'lib/production/agent-tool-bus.ts',
      'lib/server/agent-run-ledger.ts',
      'components/agents/AgentsWindow.tsx',
      'app/api/projects/[id]/production-state/agent-fleet/route.ts',
      'app/api/projects/[id]/production-state/agent-run-ledger/route.ts',
    ],
    tokens: [
      'scope locks',
      'readReceipt',
      'evidenceRefs',
      'riskLevel',
      'costClass',
      'AgentFleet',
      'AgentRunLedger',
      'AGENT_RUN_LEDGER_SETTINGS_KEY',
      'mergeAgentRunLedgerIntoProductionState',
      'handoff',
    ],
  },
  {
    id: 'game-film-production-spine',
    standard: 'Game/film generation needs scope selection, deep bibles, genre packs, cinematic evidence, playtest, release hold, and no fake complete-game claim.',
    files: [
      'lib/production/game-scope-orchestrator.ts',
      'lib/production/game-production-spine.ts',
      'lib/production/game-production-bible.ts',
      'lib/production/deep-game-production-bible.ts',
      'lib/production/game-genre-packs.ts',
      'lib/production/cinematic-evidence-spine.ts',
      'lib/production/game-playtest-spine.ts',
      'app/api/projects/[id]/production-state/game-spine/route.ts',
    ],
    tokens: [
      'prototype',
      'demo',
      'vertical-slice',
      'complete-game-plan',
      'notFullGameClaim: true',
      'releaseState',
      'humanReviewRequired: true',
      'playtest',
    ],
  },
  {
    id: 'asset-quality-gates',
    standard: 'Creative assets need draft blocking, curated sourcing, Studio Local optimization, provenance/license, LOD/PBR/collision/navmesh, perf trace, and human approval.',
    files: [
      'lib/production/ai-quality-orchestrator.ts',
      'lib/production/game-asset-quality-pipeline.ts',
      'lib/production/curated-asset-sourcing.ts',
      'lib/production/asset-import-production-state.ts',
      'lib/production/governed-runtime-jobs.ts',
      'lib/production/asset-quality-job-runner.ts',
      'lib/production/studio-local-cook-queue.ts',
      'lib/production/studio-local-cook-dispatch.ts',
      'app/api/projects/[id]/production-state/asset-quality-job/route.ts',
      'app/api/projects/[id]/production-state/studio-local-cook-job/route.ts',
      'app/api/projects/[id]/production-state/studio-local-cook-dispatch/route.ts',
      'components/viewport/ViewportAssetQualityCard.tsx',
    ],
    tokens: [
      'Draft assets are not final',
      'Studio Local required',
      'Cloud Stream cost applies',
      'license/provenance receipt',
      'LOD0/LOD1/LOD2/LOD3 manifest',
      'collision/navmesh proxy report',
      'viewport performance trace',
      'human art-direction approval',
      'QualityUpgradeJob',
      'RuntimeJobRequest',
      'asset-quality-job-runner',
      'studio-local-cook-queue',
      'studio-local-cook-dispatch',
      'signed Studio Local daemon dispatch',
      'dispatchAllowed',
      'executionAllowed',
    ],
  },
  {
    id: 'runtime-depth-routing',
    standard: 'Runtime must route Browser preview, Studio Local sidecars, cloud sandbox/stream, pixel stream, and local daemon states without pretending held capabilities are available.',
    files: [
      'lib/runtime/runtime-mode-view-model.ts',
      'lib/runtime/runtime-engine-spine.ts',
      'lib/runtime/runtime-toolchain-dependency-map.ts',
      'lib/runtime/runtime-toolchain-readiness-snapshot.ts',
      'lib/runtime/local-wgpu-sidecar.ts',
      'lib/runtime/runtime-renderer-adapter.ts',
      'lib/production/governed-runtime-jobs.ts',
      'lib/pixel-streaming/session.ts',
      'app/api/runtime/toolchain-readiness/route.ts',
      'app/studio/cinematic/CloudStreamStudioClient.tsx',
      '../../apps/studio-local/src-tauri/src/policy.rs',
      '../../apps/studio-local/src-tauri/src/sidecars.rs',
      '../../apps/studio-local/src-tauri/src/runtime_engine.rs',
    ],
    tokens: [
      'Browser',
      'Studio Local',
      'Cloud Stream',
      'held',
      'sidecar',
      'pixel',
      'policy',
      'buildAethelToolchainDependencyMatrix',
      'buildAethelToolchainReadinessSnapshot',
      'AETHEL_RUNTIME_TOOLCHAIN_READINESS',
      'x-aethel-capability-status',
      'complete-game-plan',
      'LOD0/LOD1/LOD2/LOD3 manifest',
      'mergeGovernedRuntimeJobIntoProductionState',
    ],
  },
  {
    id: 'api-cost-safety',
    standard: 'AI and generation APIs need rate limits, expensive-generation guards, provider status, no fake success, and marketing claim gates.',
    files: [
      'lib/server/ai-core-rate-limit.ts',
      'lib/production/high-risk-action-firewall.ts',
      'scripts/check-ai-limits-spine.mjs',
      'scripts/check-no-fake-success.mjs',
      'scripts/check-marketing-claims.mjs',
      'app/api/ai/provider-status/route.ts',
    ],
    tokens: [
      'enforceAiCoreRateLimit',
      'AI_RATE_LIMIT_EXCEEDED',
      'HighRiskAction',
      'not_configured',
      'fake success',
      'MARKETING_CLAIMS_AUDIT',
    ],
  },
  {
    id: 'enterprise-qa-spine',
    standard: 'Enterprise quality needs a single gate that protects build safety, bundle, i18n, accessibility, runtime, game quality, research, evidence, and no-console/no-mojibake policy.',
    files: ['package.json'],
    tokens: [
      'qa:enterprise-gate',
      'qa:ai-quality-orchestrator',
      'qa:game-scope-orchestrator',
      'qa:research-intelligence',
      'qa:research-navigation-mesh',
      'qa:evidence-ref-coverage',
      'qa:asset-final-evidence-gate',
      'qa:asset-quality-job-runner',
      'qa:studio-local-cook-queue',
      'qa:studio-local-cook-dispatch',
      'qa:production-release-guard',
      'qa:runtime-engine-spine',
      'qa:runtime-toolchain-dependency-map',
      'qa:runtime-toolchain-readiness-snapshot',
      'qa:no-fake-success',
      'qa:mojibake',
    ],
  },
]

function read(file) {
  const abs = path.resolve(ROOT, file)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf8')
}

function rel(file) {
  return file.replace(/\\/g, '/')
}

const failures = []
const rows = []

for (const domain of DOMAINS) {
  const contents = []
  const missingFiles = []

  for (const file of domain.files) {
    const content = read(file)
    if (content === null) {
      missingFiles.push(rel(file))
    } else {
      contents.push(content)
    }
  }

  const combined = contents.join('\n')
  const missingTokens = domain.tokens.filter((token) => !combined.includes(token))

  if (missingFiles.length > 0 || missingTokens.length > 0) {
    failures.push({
      id: domain.id,
      missingFiles,
      missingTokens,
    })
  }

  rows.push({
    id: domain.id,
    files: domain.files.length - missingFiles.length,
    expectedFiles: domain.files.length,
    tokens: domain.tokens.length - missingTokens.length,
    expectedTokens: domain.tokens.length,
    standard: domain.standard,
  })
}

console.log('[backbone-market-readiness] domain matrix')
for (const row of rows) {
  console.log(
    `- ${row.id}: files=${row.files}/${row.expectedFiles} tokens=${row.tokens}/${row.expectedTokens} :: ${row.standard}`,
  )
}

if (failures.length > 0) {
  console.error('[backbone-market-readiness] FAIL')
  for (const failure of failures) {
    console.error(`\n${failure.id}`)
    if (failure.missingFiles.length > 0) console.error(`  missing files: ${failure.missingFiles.join(', ')}`)
    if (failure.missingTokens.length > 0) console.error(`  missing tokens: ${failure.missingTokens.join(', ')}`)
  }
  process.exit(1)
}

console.log('[backbone-market-readiness] PASS domains=8')

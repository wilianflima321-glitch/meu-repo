#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const args = new Set(process.argv.slice(2))
const jsonOutput = args.has('--json')

const checks = []

function fullPath(file) {
  return path.join(ROOT, file)
}

function exists(file) {
  return fs.existsSync(fullPath(file))
}

function read(file) {
  return exists(file) ? fs.readFileSync(fullPath(file), 'utf8') : ''
}

function has(file, matcher) {
  const content = read(file)
  return matcher instanceof RegExp ? matcher.test(content) : content.includes(matcher)
}

function addCheck(id, label, pass, evidence = '') {
  checks.push({ id, label, pass: Boolean(pass), evidence })
}

const requiredFiles = [
  'cloud-web-app/web/app/landing-v3.tsx',
  'cloud-web-app/web/app/landing-v3-mission-box.tsx',
  'cloud-web-app/web/components/dashboard/DashboardHeader.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMainContent.tsx',
  'cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx',
  'cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx',
  'cloud-web-app/web/components/device/DeviceRuntimeGuardCard.tsx',
  'cloud-web-app/web/components/ai/AgentModePanel.tsx',
  'cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  'cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx',
  'cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx',
  'cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx',
  'cloud-web-app/web/components/preview/PreviewLifecycleChrome.tsx',
  'cloud-web-app/web/lib/device/browser-operator-tool-guard.ts',
  'cloud-web-app/web/lib/device/runtime-execution-router.ts',
  'cloud-web-app/web/lib/device/runtime-lane-scheduler.ts',
  'cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md',
  'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md',
  'docs/master/95_DEVICE_RUNTIME_AND_LOCAL_AI_STRATEGY_2026-05-02.md',
]

for (const file of requiredFiles) {
  addCheck(`file:${file}`, `required product surface exists: ${file}`, exists(file))
}

const markerChecks = [
  {
    id: 'web-entry-mission-first',
    label: 'Web entry keeps one mission-first protagonist and Studio handoff',
    markers: [
      ['cloud-web-app/web/app/landing-v3.tsx', 'LandingMissionBox'],
      ['cloud-web-app/web/app/landing-v3.tsx', 'START_MODES.slice(0, 3)'],
      ['cloud-web-app/web/app/landing-v3.tsx', 'Open Studio'],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', 'Mission intake'],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', '/api/workspace/create'],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', 'Start a mission'],
    ],
  },
  {
    id: 'studio-home-continuity',
    label: 'Studio Home preserves mission, project brain, evidence, and device policy',
    markers: [
      ['cloud-web-app/web/components/dashboard/DashboardHeader.tsx', 'Studio Home'],
      ['cloud-web-app/web/components/dashboard/DashboardMainContent.tsx', 'current mission'],
      ['cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx', 'Project Brain'],
      ['cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx', 'Mission Ledger'],
      ['cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx', 'Evidence'],
      ['cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx', 'DeviceRuntimeGuardCard'],
    ],
  },
  {
    id: 'ide-professional-shell',
    label: 'IDE shell keeps VS Code-grade primitives without hiding the internal Studio',
    markers: [
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx', 'CommandPaletteProvider'],
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx', 'WorkbenchSidebar'],
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx', 'WorkbenchEditorPane'],
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx', 'WorkbenchPreviewPane'],
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx', 'MultiTerminalPanel'],
      ['cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx', 'CollaboratorsBar'],
    ],
  },
  {
    id: 'preview-review-truth',
    label: 'Preview and review expose artifact truth, proposal preview, apply, and reject',
    markers: [
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', 'WorkbenchPreviewProposalOverlay'],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', 'handleApplyProposal'],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', 'handleRejectProposal'],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', 'CanonicalPreviewSurface'],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx', 'PreviewRuntimeToolbar'],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx', 'usePreviewDeployTrust'],
    ],
  },
  {
    id: 'browser-operator-governed',
    label: 'Browser operator work is permissioned, lane-aware, and blockable',
    markers: [
      ['cloud-web-app/web/lib/device/browser-operator-tool-guard.ts', 'BROWSER_OPERATOR_CONFIRMATION_REQUIRED'],
      ['cloud-web-app/web/lib/device/browser-operator-tool-guard.ts', 'BROWSER_OPERATOR_LANE_BLOCKED'],
      ['cloud-web-app/web/components/ai/AgentModePanel.tsx', 'useRuntimeLanePolicy'],
      ['cloud-web-app/web/components/ai/AgentModePanel.tsx', 'pendingApproval'],
      ['cloud-web-app/web/components/ai/AgentModePanel.tsx', 'browserOperatorApprovalNotice'],
      ['cloud-web-app/web/components/ai/AgentModePanel.tsx', 'buildBrowserOperatorRuntimePayload'],
    ],
  },
  {
    id: 'device-runtime-safe-routing',
    label: 'Device runtime routes NPU/GPU/CPU work without freezing the user device',
    markers: [
      ['cloud-web-app/web/components/device/DeviceRuntimeGuardCard.tsx', 'WebNN present'],
      ['cloud-web-app/web/components/device/DeviceRuntimeGuardCard.tsx', 'WebGPU available'],
      ['cloud-web-app/web/components/device/DeviceRuntimeGuardCard.tsx', 'Lane scheduler'],
      ['cloud-web-app/web/lib/device/runtime-lane-scheduler.ts', 'safe-mode'],
      ['cloud-web-app/web/lib/device/runtime-lane-scheduler.ts', 'cloud-isolated'],
      ['cloud-web-app/web/lib/device/runtime-lane-scheduler.ts', 'memory-indexing'],
      ['cloud-web-app/web/lib/device/runtime-execution-router.ts', 'local-native'],
      ['cloud-web-app/web/lib/device/runtime-execution-router.ts', 'cloud-sandbox'],
      ['cloud-web-app/web/lib/device/runtime-execution-router.ts', 'held'],
    ],
  },
  {
    id: 'game-film-mode-not-default-clutter',
    label: 'Game and film depth is mode-specific instead of default web clutter',
    markers: [
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', "previewMode === 'viewport3d'"],
      ['cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx', "previewMode === 'canvas'"],
      ['cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md', 'Game/film tools should load by mode, not all at once.'],
      ['cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md', 'Viewport should be large when the user is editing worlds, scenes, animation, or films.'],
    ],
  },
  {
    id: 'benchmark-contract-documented',
    label: 'Benchmark contract is documented without copying competitor limitations',
    markers: [
      ['cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md', 'Market Benchmark Lens'],
      ['cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md', 'Aethel Experience Contract'],
      ['cloud-web-app/web/docs/GAP_ANALYSIS_VS_VSCODE_UNREAL.md', 'Manus Browser Operator'],
      ['docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md', 'One primary action per surface'],
      ['docs/master/95_DEVICE_RUNTIME_AND_LOCAL_AI_STRATEGY_2026-05-02.md', 'NPU'],
    ],
  },
]

for (const check of markerChecks) {
  const missing = check.markers.filter(([file, marker]) => !has(file, marker))
  addCheck(
    check.id,
    check.label,
    missing.length === 0,
    missing.length === 0 ? `${check.markers.length} anchors present` : `missing: ${missing.map(([file, marker]) => `${file} -> ${marker}`).join('; ')}`
  )
}

const highSignalSurfaceFiles = [
  'cloud-web-app/web/app/landing-v3.tsx',
  'cloud-web-app/web/app/landing-v3-mission-box.tsx',
  'cloud-web-app/web/components/dashboard/DashboardHeader.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMainContent.tsx',
  'cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx',
  'cloud-web-app/web/components/dashboard/DashboardMissionLedgerCard.tsx',
  'cloud-web-app/web/components/dashboard/DashboardProjectBrainCard.tsx',
  'cloud-web-app/web/components/device/DeviceRuntimeGuardCard.tsx',
  'cloud-web-app/web/components/ai/AgentModePanel.tsx',
  'cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx',
  'cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx',
  'cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx',
]

const bannedDemoCopy = /\b(?:lorem ipsum|demo only|fake success|not implemented|coming soon)\b/i
const copyFindings = highSignalSurfaceFiles
  .filter(exists)
  .flatMap((file) => {
    return read(file)
      .split(/\r?\n/)
      .map((line, index) => ({ file, line: index + 1, text: line.trim() }))
      .filter((entry) => bannedDemoCopy.test(entry.text))
  })

addCheck(
  'no-demo-copy-in-primary-surfaces',
  'Primary user surfaces do not expose demo/stub/fake-success language',
  copyFindings.length === 0,
  copyFindings.length === 0 ? '0 findings' : copyFindings.map((entry) => `${entry.file}:${entry.line}`).join(', ')
)

const failures = checks.filter((check) => !check.pass)
const result = {
  generatedAt: new Date().toISOString(),
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  checks,
}

if (jsonOutput) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else {
  console.log('=== AETHEL PRODUCT EXPERIENCE COHESION ===')
  console.log(`Generated: ${result.generatedAt}`)
  console.log(`Checks: ${result.passed}/${result.total}`)
  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.id} - ${check.label}`)
    if (!check.pass && check.evidence) {
      console.log(`  ${check.evidence}`)
    }
  }
}

if (failures.length > 0) {
  process.exit(1)
}

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

function has(file, marker) {
  const content = read(file)
  return marker instanceof RegExp ? marker.test(content) : content.includes(marker)
}

function addCheck(id, label, pass, evidence = '') {
  checks.push({ id, label, pass: Boolean(pass), evidence })
}

const routeContracts = [
  {
    id: 'root-to-web-entry',
    label: 'Root route renders the mission-first Web Entry, not a generic dashboard',
    markers: [
      ['cloud-web-app/web/app/page.tsx', "import LandingPageV3 from './landing-v3'"],
      ['cloud-web-app/web/app/page.tsx', '<LandingPageV3 />'],
      ['cloud-web-app/web/app/landing-v3.tsx', 'LandingMissionBox'],
    ],
  },
  {
    id: 'mission-box-to-real-intake',
    label: 'Mission box calls a real intake route and handles auth/project handoff',
    markers: [
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', "/api/workspace/create"],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', 'handoffUrl'],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', 'workspaceId'],
      ['cloud-web-app/web/app/landing-v3-mission-box.tsx', 'pushMissionFallback'],
    ],
  },
  {
    id: 'workspace-create-persists-or-handoffs',
    label: 'Workspace create route persists authenticated projects or returns explicit auth handoff',
    markers: [
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'getUserFromRequest'],
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'requiresAuth'],
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'buildMissionHandoffUrl'],
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'requireEntitlementsForUser'],
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'prisma.project.create'],
      ['cloud-web-app/web/app/api/workspace/create/route.ts', 'buildMissionProjectSettings'],
    ],
  },
  {
    id: 'dashboard-studio-home-route',
    label: 'Dashboard route hydrates Studio Home and preserves mission params',
    markers: [
      ['cloud-web-app/web/app/dashboard/page.tsx', 'DashboardPageClient'],
      ['cloud-web-app/web/components/dashboard/useDashboardEntryIntent.ts', 'getMissionFromLocation'],
      ['cloud-web-app/web/components/dashboard/DashboardShell.tsx', 'entryMission'],
      ['cloud-web-app/web/components/dashboard/DashboardOverviewTab.tsx', 'DeviceRuntimeGuardCard'],
    ],
  },
  {
    id: 'ide-route-loads-internal-workbench',
    label: 'IDE route loads the internal Studio workbench without server-side bundle weight',
    markers: [
      ['cloud-web-app/web/app/ide/page.tsx', "dynamic(() => import('@/components/ide/FullscreenIDE')"],
      ['cloud-web-app/web/app/ide/page.tsx', 'ssr: false'],
      ['cloud-web-app/web/components/ide/FullscreenIDE.tsx', 'FullscreenIDEWorkspaceBridge'],
    ],
  },
  {
    id: 'preview-runtime-route-family',
    label: 'Preview runtime has discover/provision/health/readiness/sync route coverage',
    markers: [
      ['cloud-web-app/web/app/api/preview/runtime-discover/route.ts', 'GET'],
      ['cloud-web-app/web/app/api/preview/runtime-provision/route.ts', 'POST'],
      ['cloud-web-app/web/app/api/preview/runtime-health/route.ts', 'GET'],
      ['cloud-web-app/web/app/api/preview/runtime-readiness/route.ts', 'GET'],
      ['cloud-web-app/web/app/api/preview/runtime-sync/route.ts', 'POST'],
    ],
  },
  {
    id: 'runtime-device-continuity',
    label: 'Local runtime capability snapshots connect Studio Local to web routing',
    markers: [
      ['cloud-web-app/web/app/api/runtime/local-capabilities/route.ts', 'sanitizeLocalRuntimeCapabilityReport'],
      ['cloud-web-app/web/app/api/runtime/local-capabilities/route.ts', 'saveLocalRuntimeCapabilitySnapshot'],
      ['cloud-web-app/web/hooks/useRuntimeCapabilityProfile.ts', 'localBridge'],
      ['cloud-web-app/web/lib/device/runtime-execution-router.ts', 'local-native'],
      ['cloud-web-app/web/lib/device/runtime-execution-router.ts', 'cloud-sandbox'],
    ],
  },
  {
    id: 'jobs-respect-runtime-target',
    label: 'Background jobs preserve runtime target and reject held work',
    markers: [
      ['cloud-web-app/web/app/api/jobs/route.ts', 'runtimeRoute'],
      ['cloud-web-app/web/app/api/jobs/route.ts', 'runtimeTarget'],
      ['cloud-web-app/web/app/api/jobs/route.ts', 'shouldHoldRuntimeRoute'],
      ['cloud-web-app/web/app/api/jobs/route.ts', 'RUNTIME_ROUTE_HELD'],
    ],
  },
  {
    id: 'download-studio-local-is-depth-unlock',
    label: 'Download route positions Studio Local as continuity/depth, not a separate product',
    markers: [
      ['cloud-web-app/web/app/download/page.tsx', 'Aethel Studio'],
      ['cloud-web-app/web/app/download/page.tsx', 'Politica local/cloud'],
      ['cloud-web-app/web/app/download/page.tsx', 'mesma conta, missao e continuidade'],
      ['AETHEL_INTERFACE_BLUEPRINTS/17_STUDIO_LOCAL.md', 'removes browser ceilings without creating a second product'],
    ],
  },
  {
    id: 'mobile-companion-not-full-ide',
    label: 'Mobile companion remains approval/preview/prompt continuity instead of full IDE parity',
    markers: [
      ['AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md', 'The Mobile Companion is not a full IDE.'],
      ['AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md', 'approve or reject changes'],
      ['AETHEL_INTERFACE_BLUEPRINTS/15_MOBILE_COMPANION.md', 'Cross-Device Continuity Contract'],
      ['cloud-web-app/web/components/ide/modern-shell/chromeMobileBottomBar.tsx', 'Mobile IDE controls'],
      ['cloud-web-app/web/components/ui/MobileResponsiveLayout.tsx', 'Mobile'],
    ],
  },
]

for (const contract of routeContracts) {
  const missing = contract.markers.filter(([file, marker]) => !has(file, marker))
  addCheck(
    contract.id,
    contract.label,
    missing.length === 0,
    missing.length === 0 ? `${contract.markers.length} anchors present` : `missing: ${missing.map(([file, marker]) => `${file} -> ${marker}`).join('; ')}`
  )
}

const workspaceRoute = read('cloud-web-app/web/app/api/workspace/create/route.ts')
const bannedWorkspacePatterns = [
  /\bSimular\b/i,
  /\bsimulate\b/i,
  /\bMath\.random\b/,
  /\bsetTimeout\b/,
  /\bconsole\./,
]
const bannedHits = bannedWorkspacePatterns.filter((pattern) => pattern.test(workspaceRoute))
addCheck(
  'workspace-intake-no-fake-success',
  'Workspace mission intake route has no simulation/random/fake-success behavior',
  bannedHits.length === 0,
  bannedHits.length === 0 ? '0 findings' : `${bannedHits.length} banned patterns found`
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
  console.log('=== AETHEL CORE EXPERIENCE ROUTES ===')
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

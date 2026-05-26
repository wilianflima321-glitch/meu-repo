#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const fullPath = path.join(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

const mesh = 'lib/production/research-navigation-mesh.ts'
const route = 'app/api/research/navigation-mesh/route.ts'
const productionStateRoute = 'app/api/projects/[id]/production-state/research-navigation/route.ts'
const unitTest = '__tests__/production/research-navigation-mesh.test.ts'
const routeTest = '__tests__/api/research-navigation-mesh-route.test.ts'
const productionStateRouteTest = '__tests__/api/production-state-research-navigation-route.test.ts'

requirePattern(mesh, /AETHEL_RESEARCH_NAVIGATION_MESH/, 'canonical capability id')
requirePattern(mesh, /RESEARCH_NAVIGATION_MESH_SETTINGS_KEY/, 'canonical persisted settings key')
requirePattern(mesh, /headless-browser-worker/, 'headless public research lane')
requirePattern(mesh, /cloud-virtual-browser/, 'cloud observable browser lane')
requirePattern(mesh, /user-chrome-extension/, 'user Chrome lane')
requirePattern(mesh, /local-chrome-devtools/, 'local Chrome DevTools lane')
requirePattern(mesh, /desktop-computer-use/, 'desktop computer-use lane')
requirePattern(mesh, /mobile-companion/, 'mobile companion lane')
requirePattern(mesh, /evaluateBrowserOperatorPolicy/, 'browser policy integration')
requirePattern(mesh, /mergeResearchNavigationMeshIntoProductionState/, 'Project Brain and Mission Ledger merge')
requirePattern(mesh, /readResearchNavigationMeshFromSettings/, 'persisted mesh reader')
requirePattern(mesh, /writeResearchNavigationMeshToSettings/, 'persisted mesh writer')
requirePattern(mesh, /decision-research-navigation-mesh/, 'Project Brain decision tracking')
requirePattern(mesh, /research-navigation-mesh-evidenceGraph/, 'evidence graph node')
requirePattern(mesh, /research-navigation-mesh-validationGraph/, 'validation graph node')
requirePattern(mesh, /No autonomous credential entry/, 'credential-entry honesty')
requirePattern(mesh, /Prompt-injection pages block navigation/, 'prompt injection blocker')
requirePattern(mesh, /pause\/takeover before consequence-bearing actions/, 'market parity safety coverage')
requirePattern(mesh, /source-grounded research evidence/, 'research evidence coverage')

requirePattern(route, /requireAuth/, 'route auth guard')
requirePattern(route, /requireEntitlementsForUser/, 'entitlement guard')
requirePattern(route, /x-aethel-capability-status/, 'capability status header')
requirePattern(route, /AETHEL_CHROME_CDP_URL/, 'local Chrome DevTools env readiness')
requirePattern(route, /BROWSER_OPERATOR_REPLAY_ENABLED/, 'replay capture env readiness')
requirePattern(route, /AETHEL_BROWSER_NETWORK_ISOLATION_ENABLED/, 'network isolation env readiness')

requirePattern(productionStateRoute, /requireAuth/, 'production-state route auth guard')
requirePattern(productionStateRoute, /requireEntitlementsForUser/, 'production-state entitlement guard')
requirePattern(productionStateRoute, /readAgenticProductionStateFromSettings/, 'production-state read integration')
requirePattern(productionStateRoute, /writeAgenticProductionStateToSettings/, 'production-state write integration')
requirePattern(productionStateRoute, /writeResearchNavigationMeshToSettings/, 'persisted research navigation settings')
requirePattern(productionStateRoute, /buildProductionReadinessSummary/, 'readiness summary after merge')
requirePattern(productionStateRoute, /canWriteResearchNavigation/, 'viewer mutation guard')

requirePattern(unitTest, /headless worker for public research/, 'public research lane regression')
requirePattern(unitTest, /logged-in account operations/, 'Chrome/takeover regression')
requirePattern(unitTest, /prompt-injection pages/, 'prompt injection regression')
requirePattern(unitTest, /Project Brain, Mission Ledger, and evidence graphs/, 'production-state merge regression')
requirePattern(unitTest, /persists the latest navigation mesh/, 'settings persistence regression')
requirePattern(routeTest, /without exposing connector env values/, 'route secret redaction regression')
requirePattern(routeTest, /no browser lane is configured/, 'held route regression')
requirePattern(productionStateRouteTest, /persists navigation mesh into Project Brain/, 'production-state route persistence regression')
requirePattern(productionStateRouteTest, /reads the latest persisted navigation mesh/, 'production-state route read regression')
requirePattern(productionStateRouteTest, /viewer-only collaborators/, 'production-state viewer guard regression')

requirePattern('components/agents/window/AgentNavigationPanel.tsx', /Research navigation mesh/, 'AgentsWindow navigation panel')
requirePattern('components/agents/window/AgentNavigationPanel.tsx', /marketParityCoverage/, 'navigation panel parity evidence')
requirePattern('components/agents/window/AgentWindowTabs.tsx', /Navigation/, 'AgentsWindow navigation tab')
requirePattern('components/agents/AgentsWindow.tsx', /fetchResearchNavigationMesh/, 'AgentsWindow fetches navigation mesh')
requirePattern('components/agents/AgentsWindow.tsx', /activeView === 'navigation'/, 'AgentsWindow renders navigation mesh panel')
requirePattern('components/evidence/EvidenceCenter.tsx', /\/api\/research\/navigation-mesh\?missionKind=advanced-research/, 'Evidence Center fetches navigation mesh')
requirePattern('components/evidence/EvidenceCenter.tsx', /data-evidence-source="research-navigation-mesh"/, 'Evidence Center surfaces navigation evidence')

requirePattern('package.json', /"qa:research-navigation-mesh"/, 'package script')
requirePattern('package.json', /qa:research-intelligence && npm run qa:research-navigation-mesh && npm run qa:evidence-ref-coverage && npm run qa:release-evidence-readiness && npm run qa:agent-read-receipts/, 'enterprise gate ordering')
requirePattern('scripts/check-backbone-market-readiness.mjs', /research-navigation-mesh/, 'backbone coverage')
requirePattern('scripts/check-backbone-market-readiness.mjs', /AETHEL_RESEARCH_NAVIGATION_MESH/, 'backbone capability token')

if (failures.length) {
  console.error('[research-navigation-mesh] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[research-navigation-mesh] PASS lanes=6 chrome=true takeover=true replay=true')

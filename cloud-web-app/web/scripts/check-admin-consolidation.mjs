#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function requireFile(relativePath, reason) {
  if (!exists(relativePath)) failures.push(`${relativePath}: missing (${reason})`)
}

function requirePattern(relativePath, pattern, reason) {
  if (!exists(relativePath)) {
    failures.push(`${relativePath}: missing (${reason})`)
    return
  }
  const content = read(relativePath)
  if (!pattern.test(content)) failures.push(`${relativePath}: missing ${pattern} (${reason})`)
}

function requirePatternAcross(relativePaths, pattern, reason) {
  const missingFiles = relativePaths.filter((relativePath) => !exists(relativePath))
  if (missingFiles.length) {
    failures.push(`${missingFiles.join(', ')}: missing (${reason})`)
    return
  }
  const content = relativePaths.map((relativePath) => read(relativePath)).join('\n')
  if (!pattern.test(content)) failures.push(`${relativePaths.join(' + ')}: missing ${pattern} (${reason})`)
}

function listAdminRoutes() {
  const adminRoot = path.join(ROOT, 'app', 'admin')
  return fs
    .readdirSync(adminRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => `/admin/${entry.name}`)
    .sort()
}

requireFile('lib/admin/admin-consolidation.ts', 'admin route consolidation registry must exist')
const adminShellFiles = [
  'app/admin/admin-ops-layout-client.tsx',
  'app/admin/admin-ops-layout.parts.tsx',
  'app/admin/admin-ops-layout.sidebar.tsx',
  'app/admin/admin-ops-layout.header.tsx',
  'app/admin/admin-ops-layout.model.tsx',
]
requirePatternAcross(adminShellFiles, /ADMIN_CONSOLIDATED_SECTIONS/, 'sidebar must read the 6-section registry')
requirePatternAcross(adminShellFiles, /findAdminSectionForRoute/, 'admin shell breadcrumb must resolve consolidated ownership')
requirePatternAcross(adminShellFiles, /Command center/, 'admin shell must expose the consolidated command center')
requirePatternAcross(adminShellFiles, /Legacy map/, 'admin shell must hide legacy route sprawl behind an explicit compatibility disclosure')
requirePatternAcross(adminShellFiles, /Global Legacy compatibility map/, 'legacy compatibility disclosure must be one global searchable drawer')
requirePattern('app/admin/admin-ops-layout-client.tsx', /id="admin-main-content"/, 'admin shell must expose a stable main landmark target for skip links and keyboard focus')
requirePatternAcross(adminShellFiles, /riskLane/, 'admin shell must expose risk lanes for each visible area')
requirePatternAcross(adminShellFiles, /evidenceStatus/, 'admin shell must expose evidence status for each visible area')
requireFile('components/admin/AdminCommandCenterSections.tsx', 'admin command center sections must stay extracted from the route page')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /Operations board/, 'admin home must expose the consolidated operating model')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /Six areas/, 'admin home must frame sections around operator intent')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /data-admin-operator-board="linear-density"/, 'admin home must render the six areas as a dense operator board, not a card wall')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /Health/, 'admin operator board must expose health status')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /Owner/, 'admin operator board must expose owner metadata')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /data-admin-coverage-disclosure/, 'coverage and stats must stay behind disclosure after the command board')
requirePattern('components/admin/AdminCommandCenterSections.tsx', /legacy routes remain compatible|legacy routes stay searchable|legacy-compatible/i, 'admin home must keep legacy compatibility explicit')
requirePattern('app/admin/page.tsx', /AdminSectionGrid[\s\S]*AdminCoverageDisclosure[\s\S]*AdminRecentUsersTable/, 'admin page must show operator board before diagnostics and users')
requirePattern('app/admin/page.tsx', /bg-\[var\(--aethel-text-primary\)\]/, 'admin primary action should use solid product chrome instead of gradient CTA')
requirePattern('lib/admin/admin-consolidation.ts', /ADMIN_ROUTE_LABELS/, 'all legacy admin routes need professional labels')
requirePattern('lib/admin/admin-consolidation.ts', /operatorQuestion/, 'each section must explain the operator question it answers')
requirePattern('lib/admin/admin-consolidation.ts', /AdminRouteOwnership/, 'each section must expose explicit ownership metadata')
requirePattern('lib/admin/admin-consolidation.ts', /riskLane/, 'each section must expose operational risk lane metadata')
requirePattern('lib/admin/admin-consolidation.ts', /evidenceStatus/, 'each section must expose evidence status metadata')

const registry = read('lib/admin/admin-consolidation.ts')
const sectionCount = (registry.match(/id:\s*'/g) || []).length
if (sectionCount !== 6) {
  failures.push(`lib/admin/admin-consolidation.ts: expected exactly 6 admin sections, found ${sectionCount}`)
}

const requiredSectionIds = ['people', 'money', 'ai', 'platform', 'trust', 'product']
for (const id of requiredSectionIds) {
  if (!registry.includes(`id: '${id}'`)) {
    failures.push(`lib/admin/admin-consolidation.ts: missing V18 operating section id '${id}'`)
  }
}

const routes = listAdminRoutes()
for (const route of routes) {
  if (!registry.includes(`'${route}'`)) {
    failures.push(`lib/admin/admin-consolidation.ts: route ${route} is not mapped to a consolidated section`)
  }
}

if (failures.length) {
  console.error('[admin-consolidation] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[admin-consolidation] PASS sections=6, routes=${routes.length}`)

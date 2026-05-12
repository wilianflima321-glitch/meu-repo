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

function listAdminRoutes() {
  const adminRoot = path.join(ROOT, 'app', 'admin')
  return fs
    .readdirSync(adminRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `/admin/${entry.name}`)
    .sort()
}

requireFile('lib/admin/admin-consolidation.ts', 'admin route consolidation registry must exist')
requirePattern('app/admin/admin-ops-layout-client.tsx', /ADMIN_CONSOLIDATED_SECTIONS/, 'sidebar must read the 6-section registry')
requirePattern('app/admin/page.tsx', /Admin consolidation/, 'admin home must explain the consolidated operating model')

const registry = read('lib/admin/admin-consolidation.ts')
const sectionCount = (registry.match(/id:\s*'/g) || []).length
if (sectionCount !== 6) {
  failures.push(`lib/admin/admin-consolidation.ts: expected exactly 6 admin sections, found ${sectionCount}`)
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

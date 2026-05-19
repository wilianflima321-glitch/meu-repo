#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const APP_DIR = path.join(ROOT, 'app')
const DOCS_DIR = path.join(ROOT, 'docs')
const REPORT_FILE = path.join(DOCS_DIR, 'ROUTE_EXPERIENCE_SPINE.md')
// Ratchet this downward as the largest App Router pages are split. Do not raise
// without explicitly accepting route UX debt.
const MAX_PAGE_LINES = 300
const MAX_ADMIN_ROUTES = 46

const REQUIRED_BOUNDARY_SEGMENTS = [
  'admin',
  'billing',
  'deploy',
  'ide',
  'marketplace',
  'pricing',
  'profile',
  'studio',
]

const REQUIRED_ROUTES = [
  '/',
  '/dashboard',
  '/ide',
  '/nexus',
  '/studio',
  '/marketplace',
  '/marketplace/creator/onboarding',
  '/pricing',
  '/billing',
  '/settings',
  '/trust',
  '/security',
  '/compliance',
  '/reliability',
  '/docs',
  '/status',
]

const REQUIRED_STUDIO_ROUTES = [
  '/studio/level',
  '/studio/scene',
  '/studio/material',
  '/studio/animation',
  '/studio/vfx',
  '/studio/film',
  '/studio/audio',
  '/studio/terrain',
  '/studio/landscape',
  '/studio/cloth',
  '/studio/facial',
  '/studio/fluid',
  '/studio/foliage',
  '/studio/hair',
  '/studio/rig',
  '/studio/water',
  '/studio/sprite',
  '/studio/quest',
]

const FORBIDDEN_PAGE_PATTERNS = [
  { pattern: /NOT_IMPLEMENTED|TODO_NOT_IMPLEMENTED|coming soon/gi, label: 'unfinished user-facing route copy' },
  { pattern: /[\u00c2\u00c3\ufffd]/u, label: 'mojibake route copy' },
  { pattern: /alert\s*\(/g, label: 'blocking browser alert in route UI' },
]

const skipDirs = new Set(['node_modules', '.next', 'dist', 'build'])

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(abs, predicate, out)
      continue
    }
    if (predicate(abs)) out.push(abs)
  }
  return out
}

function normalizeRoute(pagePath) {
  const rel = path.relative(APP_DIR, pagePath).replace(/\\/g, '/')
  const base = rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '')
  const segments = base
    .split('/')
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
  return `/${segments.join('/')}`.replace(/\/+/g, '/')
}

function classifyRoute(route) {
  if (route === '/') return 'home'
  if (route === '/admin' || route.startsWith('/admin/')) return 'admin'
  if (route === '/studio' || route.startsWith('/studio/')) return 'studio'
  if (route === '/docs' || route.startsWith('/docs/')) return 'docs'
  if (route === '/billing' || route.startsWith('/billing/')) return 'billing'
  if (route === '/marketplace' || route.startsWith('/marketplace/')) return 'marketplace'
  if (['/trust', '/security', '/security-policy', '/security-acknowledgments', '/compliance', '/reliability'].includes(route)) return 'trust'
  if (['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(route)) return 'auth'
  if (['/dashboard', '/ide', '/nexus', '/settings', '/profile', '/project-settings'].includes(route)) return 'core-workspace'
  if (['/pricing', '/compare', '/customers', '/roadmap', '/contact-sales', '/download'].includes(route)) return 'marketing'
  return 'product'
}

function countLines(content) {
  return content.split(/\r?\n/).length
}

function main() {
  const pageFiles = walk(APP_DIR, (abs) => abs.endsWith(`${path.sep}page.tsx`) && !abs.includes(`${path.sep}api${path.sep}`))
  const routeEntries = pageFiles
    .map((file) => {
      const content = fs.readFileSync(file, 'utf8')
      const route = normalizeRoute(file)
      return {
        route,
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        group: classifyRoute(route),
        lines: countLines(content),
        isClient: /^['"]use client['"];?/.test(content.trimStart()),
        hasMetadata: /export\s+const\s+metadata|generateMetadata/.test(content),
        hasDynamicImport: /dynamic\s*\(/.test(content),
        findings: [],
      }
    })
    .sort((a, b) => a.route.localeCompare(b.route))

  const failures = []
  const routeSet = new Set(routeEntries.map((entry) => entry.route))

  for (const route of REQUIRED_ROUTES) {
    if (!routeSet.has(route)) failures.push(`missing critical route ${route}`)
  }
  for (const route of REQUIRED_STUDIO_ROUTES) {
    if (!routeSet.has(route)) failures.push(`missing creative studio route ${route}`)
  }

  if (!fs.existsSync(path.join(APP_DIR, 'error.tsx'))) failures.push('missing global app/error.tsx')
  if (!fs.existsSync(path.join(APP_DIR, 'loading.tsx'))) failures.push('missing global app/loading.tsx')
  for (const segment of REQUIRED_BOUNDARY_SEGMENTS) {
    if (!fs.existsSync(path.join(APP_DIR, segment, 'error.tsx'))) failures.push(`missing route error boundary app/${segment}/error.tsx`)
    if (!fs.existsSync(path.join(APP_DIR, segment, 'loading.tsx'))) failures.push(`missing route loading state app/${segment}/loading.tsx`)
  }

  const adminRoutes = routeEntries.filter((entry) => entry.group === 'admin')
  if (adminRoutes.length > MAX_ADMIN_ROUTES) {
    failures.push(`admin route count regressed: ${adminRoutes.length} > ${MAX_ADMIN_ROUTES}`)
  }

  for (const entry of routeEntries) {
    const content = fs.readFileSync(path.join(ROOT, entry.file), 'utf8')
    if (entry.lines > MAX_PAGE_LINES) failures.push(`${entry.route}: page is too large (${entry.lines} > ${MAX_PAGE_LINES} lines)`)
    for (const { pattern, label } of FORBIDDEN_PAGE_PATTERNS) {
      pattern.lastIndex = 0
      if (pattern.test(content)) failures.push(`${entry.route}: ${label}`)
    }
  }

  const byGroup = new Map()
  for (const entry of routeEntries) byGroup.set(entry.group, (byGroup.get(entry.group) ?? 0) + 1)
  const largeRoutes = [...routeEntries].sort((a, b) => b.lines - a.lines).slice(0, 20)
  const clientRoutes = routeEntries.filter((entry) => entry.isClient)
  const metadataRoutes = routeEntries.filter((entry) => entry.hasMetadata)
  const studioRoutes = routeEntries.filter((entry) => entry.group === 'studio')

  fs.mkdirSync(DOCS_DIR, { recursive: true })
  const report = []
  report.push('# Route Experience Spine')
  report.push('')
  report.push('Generated by `npm run qa:route-experience-spine`. This report is deterministic so CI does not create timestamp churn.')
  report.push('')
  report.push('## Summary')
  report.push(`- Page routes: ${routeEntries.length}`)
  report.push(`- Studio routes: ${studioRoutes.length}/${REQUIRED_STUDIO_ROUTES.length + 1} including hub`)
  report.push(`- Admin routes: ${adminRoutes.length}/${MAX_ADMIN_ROUTES} ratchet`)
  report.push(`- Client page routes: ${clientRoutes.length}`)
  report.push(`- Routes with route-local metadata: ${metadataRoutes.length}`)
  report.push(`- Max page size: ${Math.max(...routeEntries.map((entry) => entry.lines), 0)} lines (limit ${MAX_PAGE_LINES})`)
  report.push('')
  report.push('## Route Groups')
  for (const [group, count] of [...byGroup.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    report.push(`- ${group}: ${count}`)
  }
  report.push('')
  report.push('## Largest Page Routes')
  for (const entry of largeRoutes) {
    report.push(`- ${entry.route}: ${entry.lines} lines (${entry.file})`)
  }
  report.push('')
  report.push('## Required Studio Routes')
  for (const route of REQUIRED_STUDIO_ROUTES) report.push(`- ${route}: ${routeSet.has(route) ? 'wired' : 'missing'}`)
  report.push('')
  report.push('## Quality Ratchets')
  report.push(`- No route page above ${MAX_PAGE_LINES} lines.`)
  report.push('- No route page may contain mojibake, blocking browser alerts, or unfinished placeholder markers.')
  report.push(`- Admin routes may not increase above ${MAX_ADMIN_ROUTES} until they are consolidated behind canonical sections.`)
  report.push('- Critical user journeys and all studio surfaces must stay routable.')
  report.push('- Critical route groups must ship both loading.tsx and error.tsx boundaries.')
  fs.writeFileSync(REPORT_FILE, `${report.join('\n')}\n`, 'utf8')

  if (failures.length > 0) {
    console.error('[route-experience-spine] FAIL')
    for (const failure of failures) console.error(`- ${failure}`)
    console.error(`report=${path.relative(ROOT, REPORT_FILE).replace(/\\/g, '/')}`)
    process.exit(1)
  }

  console.log(`[route-experience-spine] PASS routes=${routeEntries.length} studio=${studioRoutes.length} admin=${adminRoutes.length} maxPageLines=${Math.max(...routeEntries.map((entry) => entry.lines), 0)}`)
}

main()

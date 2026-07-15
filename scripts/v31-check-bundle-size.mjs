#!/usr/bin/env node
/**
 * V31: Bundle size budget check
 *
 * Runs after `next build` (ANALYZE=1 npm run build).
 * Fails CI if any route exceeds its size budget.
 *
 * Usage: node scripts/v31-check-bundle-size.mjs
 *
 * Add to CI:
 *   - run: ANALYZE=1 npm --prefix cloud-web-app/web run build
 *   - run: node scripts/v31-check-bundle-size.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.join(__dirname, '..', 'cloud-web-app', 'web')
const NEXT = path.join(WEB, '.next')

// ── Budgets ─────────────────────────────────────────────────────────────────
// V31 targets — tighten these each sprint as bundle shrinks
const ROUTE_BUDGETS = {
  '/_app':          { gzip: 250 * 1024, label: 'App shell' },
  '/':              { gzip: 150 * 1024, label: 'Landing' },
  '/pricing':       { gzip: 100 * 1024, label: 'Pricing' },
  '/login':         { gzip: 80  * 1024, label: 'Login' },
  '/dashboard':     { gzip: 400 * 1024, label: 'Dashboard' },
  '/ide':           { gzip: 1024 * 1024, label: 'IDE (allows Monaco/Yjs)' },
  '/studio':        { gzip: 200 * 1024, label: 'Studio hub' },
  '/evidence':      { gzip: 200 * 1024, label: 'Evidence' },
}

// Global checks (applies to landing, pricing, login, dashboard pages)
const PUBLIC_FORBIDDEN_IMPORTS = ['three', '@react-three', 'monaco-editor', '@monaco-editor']

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

function getFileSizeGzip(filePath) {
  try {
    // Next.js outputs gzip variants as .gz alongside originals
    const gzPath = filePath + '.gz'
    if (fs.existsSync(gzPath)) {
      return fs.statSync(gzPath).size
    }
    // Fallback: raw size (overestimates gzip by ~3x)
    return Math.round(fs.statSync(filePath).size / 3)
  } catch {
    return 0
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
console.log('\n📦  V31 Bundle Budget Check\n')

if (!fs.existsSync(NEXT)) {
  console.error(`❌  .next/ not found at ${NEXT}`)
  console.error('    Run: cd cloud-web-app/web && npm run build')
  process.exit(1)
}

// Read Next.js build manifest
const manifestPath = path.join(NEXT, 'build-manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('❌  build-manifest.json not found — run next build first')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
let failed = false

// ── Per-route budget check ────────────────────────────────────────────────────
console.log('Route budgets:')
for (const [route, budget] of Object.entries(ROUTE_BUDGETS)) {
  const files = manifest.pages?.[route] ?? []
  const totalSize = files.reduce((sum, f) => {
    const full = path.join(NEXT, f)
    return sum + getFileSizeGzip(full)
  }, 0)

  const pct = budget.gzip > 0 ? Math.round((totalSize / budget.gzip) * 100) : 0
  const bar = '█'.repeat(Math.min(Math.round(pct / 5), 20))
  const status = totalSize > budget.gzip ? '🔴 OVER' : pct > 85 ? '🟡 near' : '🟢'

  console.log(
    `  ${status}  ${route.padEnd(20)} ${formatBytes(totalSize).padStart(8)} / ${formatBytes(budget.gzip).padEnd(8)}  (${pct}%)  ${budget.label}`
  )

  if (totalSize > budget.gzip) {
    failed = true
  }
}

// ── Forbidden heavy import check in public chunks ─────────────────────────────
console.log('\nHeavy import boundary (public/login/pricing/dashboard):')
const publicRoutes = ['/', '/pricing', '/login', '/(auth)/login', '/dashboard']
const publicChunks = new Set()
for (const route of publicRoutes) {
  for (const f of manifest.pages?.[route] ?? []) {
    publicChunks.add(f)
  }
}

let heavyViolations = 0
for (const chunkRelPath of publicChunks) {
  const chunkPath = path.join(NEXT, chunkRelPath)
  if (!fs.existsSync(chunkPath)) continue
  const content = fs.readFileSync(chunkPath, 'utf8')
  for (const forbidden of PUBLIC_FORBIDDEN_IMPORTS) {
    // Simple string check — good enough for CI
    if (content.includes(forbidden)) {
      console.log(`  🔴  ${forbidden} found in public chunk: ${chunkRelPath.slice(-60)}`)
      heavyViolations++
      failed = true
    }
  }
}
if (heavyViolations === 0) {
  console.log('  🟢  No heavy imports (Three/Monaco/R3F) in public bundles')
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('')
if (failed) {
  console.error('❌  Bundle budget check FAILED')
  console.error('    To fix: tree-shake heavy imports, use next/dynamic, check lib/three/index.ts gateway')
  process.exit(1)
} else {
  console.log('✅  All route budgets within limits')
  process.exit(0)
}

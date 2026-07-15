#!/usr/bin/env node
/**
 * V31: API route security audit
 *
 * Scans all /api/**.ts route handlers for:
 *   - Missing authentication check
 *   - Missing Zod/schema validation on POST/PUT/PATCH
 *   - Missing rate limiting
 *
 * Usage: node scripts/v31-audit-api-routes.mjs
 *
 * This is a STATIC scan — not a runtime test. It catches obvious gaps.
 * Always supplement with Snyk/Semgrep for deeper analysis.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_DIR = path.join(__dirname, '..', 'cloud-web-app', 'web', 'app', 'api')

if (!fs.existsSync(API_DIR)) {
  console.error(`❌  API dir not found: ${API_DIR}`)
  process.exit(1)
}

// ── Patterns ──────────────────────────────────────────────────────────────────
const AUTH_PATTERNS = [
  /getSession/,
  /requireAuth/,
  /authMiddleware/,
  /cookies\(\)/,
  /getServerSession/,
  /verifyToken/,
  /auth\(/,
]

const ZOD_PATTERNS = [
  /z\.object/,
  /zod/i,
  /\.parse\(/,
  /\.safeParse\(/,
  /schema\./i,
  /validateBody/,
  /parseRequest/,
]

const RATE_LIMIT_PATTERNS = [
  /rateLimit/i,
  /@upstash\/ratelimit/,
  /ratelimiter/i,
  /limiter\./,
  /rateLimiter/,
]

const MUTATION_VERBS = ['POST', 'PUT', 'PATCH', 'DELETE']

// ── Scanner ───────────────────────────────────────────────────────────────────
function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) walk(full, results)
    else if (entry === 'route.ts' || entry === 'route.tsx') results.push(full)
  }
  return results
}

function check(content, patterns) {
  return patterns.some((p) => p.test(content))
}

function exportedVerbs(content) {
  return MUTATION_VERBS.filter((v) => new RegExp(`export\\s+(async\\s+)?function\\s+${v}\\b`).test(content))
}

// ── Run ───────────────────────────────────────────────────────────────────────
const routes = walk(API_DIR)
console.log(`\n🔐  V31 API Security Audit — ${routes.length} route handlers\n`)

const results = {
  noAuth: [],
  noZod: [],
  noRateLimit: [],
  ok: 0,
}

// Routes that are intentionally public (no auth needed)
const PUBLIC_ALLOW = [
  'auth/login/route.ts',
  'auth/register/route.ts',
  'auth/forgot-password/route.ts',
  'auth/reset-password/route.ts',
  'auth/verify-email/route.ts',
  'auth/callback/route.ts',
  'billing/webhook/route.ts', // Stripe webhook uses signature verification
  'health/route.ts',
  'status/route.ts',
]

for (const routePath of routes) {
  const rel = routePath.replace(API_DIR + path.sep, '').replace(/\\/g, '/')
  const content = fs.readFileSync(routePath, 'utf8')
  const isPublicRoute = PUBLIC_ALLOW.some((p) => rel.endsWith(p))
  const hasMutations = exportedVerbs(content).length > 0

  if (isPublicRoute) {
    results.ok++
    continue
  }

  let routeOk = true

  if (!check(content, AUTH_PATTERNS)) {
    results.noAuth.push(rel)
    routeOk = false
  }

  if (hasMutations && !check(content, ZOD_PATTERNS)) {
    results.noZod.push(rel)
    routeOk = false
  }

  if (!check(content, RATE_LIMIT_PATTERNS)) {
    results.noRateLimit.push(rel)
    // Don't flag routeOk for rate limit — it's important but not critical for every route
  }

  if (routeOk) results.ok++
}

// ── Report ────────────────────────────────────────────────────────────────────
const total = routes.length
const okPct = Math.round((results.ok / total) * 100)

console.log(`Summary: ${results.ok}/${total} routes OK (${okPct}%)\n`)

if (results.noAuth.length > 0) {
  console.log(`🔴  No auth check (${results.noAuth.length} routes):`)
  results.noAuth.slice(0, 15).forEach((r) => console.log(`    - ${r}`))
  if (results.noAuth.length > 15) console.log(`    ... and ${results.noAuth.length - 15} more`)
  console.log()
}

if (results.noZod.length > 0) {
  console.log(`🟡  No Zod validation on mutation routes (${results.noZod.length} routes):`)
  results.noZod.slice(0, 10).forEach((r) => console.log(`    - ${r}`))
  if (results.noZod.length > 10) console.log(`    ... and ${results.noZod.length - 10} more`)
  console.log()
}

if (results.noRateLimit.length > 0) {
  console.log(`⚠️   No rate limit (${results.noRateLimit.length} routes) — review manually:`)
  results.noRateLimit.slice(0, 5).forEach((r) => console.log(`    - ${r}`))
  if (results.noRateLimit.length > 5) console.log(`    ... and ${results.noRateLimit.length - 5} more`)
  console.log()
}

// ── Write JSON report ─────────────────────────────────────────────────────────
const reportPath = path.join(__dirname, '..', 'cloud-web-app', 'web', 'docs', 'v31-api-security-audit.json')
fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalRoutes: total,
  okRoutes: results.ok,
  noAuth: results.noAuth,
  noZodOnMutations: results.noZod,
  noRateLimit: results.noRateLimit,
}, null, 2))
console.log(`📄  Full report: cloud-web-app/web/docs/v31-api-security-audit.json`)

if (results.noAuth.length > 0) {
  console.log('\n❌  FAILED: unauthenticated route handlers found')
  process.exit(1)
} else {
  console.log('\n✅  No unauthenticated routes found')
  process.exit(0)
}

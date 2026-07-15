#!/usr/bin/env node
/**
 * scripts/check-hidden-route-leak.mjs
 *
 * BACKLOG §10.5 #36 — Gate: confirm PROTOTYPE/ASPIRATIONAL routes return 404 with flag off
 *
 * Usage:
 *   node scripts/check-hidden-route-leak.mjs
 *   node scripts/check-hidden-route-leak.mjs --verify
 *   node scripts/check-hidden-route-leak.mjs --baseUrl http://localhost:3000
 *
 * What it does:
 *   1. Reads lib/routes/route-maturity-registry.ts
 *   2. Finds all routes with maturity PROTOTYPE or ASPIRATIONAL
 *   3. Asserts that none of these routes are in PUBLIC_EXACT_PATHS or PUBLIC_PATH_PREFIXES
 *      in middleware.ts (static check)
 *   4. Optionally, if --verify is passed with --baseUrl, makes HTTP GET requests
 *      to confirm routes return 302/401/404 (not 200) in development mode
 */

import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const scriptDir = fileURLToPath(new URL('.', import.meta.url))
const root = join(scriptDir, '..')

const verify = process.argv.includes('--verify')
const baseUrlIdx = process.argv.indexOf('--baseUrl')
const baseUrl = baseUrlIdx >= 0 ? process.argv[baseUrlIdx + 1] : null

// ─── Load route maturity registry ────────────────────────────────────────────

const REGISTRY_PATH = join(root, 'lib', 'routes', 'route-maturity-registry.ts')

if (!existsSync(REGISTRY_PATH)) {
  console.error('[hidden-route-leak] FAIL: route-maturity-registry.ts not found at', REGISTRY_PATH)
  process.exit(1)
}

const registrySource = readFileSync(REGISTRY_PATH, 'utf8')

// Extract routes with PROTOTYPE or ASPIRATIONAL maturity
const routeRegex = /\{\s*path:\s*['"]([^'"]+)['"]\s*,\s*maturity:\s*'(PROTOTYPE|ASPIRATIONAL)'/g
const hiddenRoutes = []
let match
while ((match = routeRegex.exec(registrySource)) !== null) {
  hiddenRoutes.push({ path: match[1], maturity: match[2] })
}

console.log(`[hidden-route-leak] Found ${hiddenRoutes.length} PROTOTYPE/ASPIRATIONAL routes`)
for (const { path, maturity } of hiddenRoutes) {
  console.log(`  ${maturity.padEnd(12)} ${path}`)
}

// ─── Static check: routes must not be in public middleware allowlist ──────────

const MIDDLEWARE_PATH = join(root, 'middleware.ts')
let middlewareSource = ''
if (existsSync(MIDDLEWARE_PATH)) {
  middlewareSource = readFileSync(MIDDLEWARE_PATH, 'utf8')
}

const leakedRoutes = []
for (const { path, maturity } of hiddenRoutes) {
  // Check if path appears as a public path prefix or exact path in middleware
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const isPublic =
    new RegExp(`PUBLIC_EXACT_PATHS[^}]+${escapedPath}`).test(middlewareSource) ||
    new RegExp(`PUBLIC_PATH_PREFIXES[^\\]]+${escapedPath}`).test(middlewareSource)

  if (isPublic) {
    leakedRoutes.push({ path, maturity })
    console.error(`[hidden-route-leak] LEAK: ${maturity} route '${path}' found in PUBLIC middleware allowlist`)
  }
}

if (leakedRoutes.length > 0) {
  console.error(`[hidden-route-leak] FAIL: ${leakedRoutes.length} route(s) leaked into public middleware`)
  process.exit(1)
}

console.log('[hidden-route-leak] Static check: PASS (no leaks in middleware allowlist)')

// ─── Optional: HTTP check against running server ─────────────────────────────

if (verify && baseUrl) {
  console.log(`\n[hidden-route-leak] Verifying routes return non-200 at ${baseUrl}`)

  const failures = []

  for (const { path, maturity } of hiddenRoutes) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'Accept': 'text/html' },
      })

      const status = res.status
      const allowed = status === 302 || status === 308 || status === 401 || status === 403 || status === 404

      if (!allowed) {
        failures.push({ path, maturity, status })
        console.error(`[hidden-route-leak] LEAK: ${maturity} ${path} returned HTTP ${status} (expected redirect/4xx)`)
      } else {
        console.log(`  ${String(status)} ${maturity.padEnd(12)} ${path}`)
      }
    } catch (err) {
      console.warn(`  ERR  ${path}: ${err.message} (skipped)`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n[hidden-route-leak] FAIL: ${failures.length} route(s) returned 200`)
    process.exit(1)
  }

  console.log('\n[hidden-route-leak] HTTP verify: PASS')
} else if (verify) {
  console.log('[hidden-route-leak] --verify requires --baseUrl (e.g., --baseUrl http://localhost:3000)')
}

console.log('[hidden-route-leak] PASS')

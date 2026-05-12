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

function requireManifestIcon(manifest, size) {
  const icon = manifest.icons?.find((candidate) => String(candidate.sizes || '').includes(size))
  if (!icon) {
    failures.push(`manifest: missing install icon ${size}`)
    return
  }
  const src = String(icon.src || '').replace(/^\//, '')
  if (!exists(`public/${src}`)) failures.push(`public/${src}: missing icon asset referenced by manifest`)
}

requireFile('app/manifest.ts', 'Next manifest route must exist')
requirePattern('app/manifest.ts', /display:\s*'standalone'/, 'PWA must be installable')
requirePattern('app/manifest.ts', /start_url:\s*'\/ide'/, 'installed app should open the product workspace')
requirePattern('app/manifest.ts', /theme_color/, 'manifest must define browser chrome color')
requirePattern('app/manifest.ts', /screenshots:/, 'PWA install prompt needs screenshots')
requireFile('app/offline/page.tsx', 'offline route must exist for service worker navigation fallback')
requireFile('public/sw.js', 'service worker must exist')
requirePattern('public/sw.js', /'\/offline'/, 'service worker must precache offline route')
requirePattern('public/sw.js', /request\.mode === 'navigate'/, 'service worker must fallback navigations offline')
requirePattern('public/sw.js', /self\.clients\.claim\(\)/, 'service worker must claim clients after activation')
requireFile('../../.github/workflows/lighthouse-ci.yml', 'Lighthouse workflow must run in PRs')
requireFile('lighthouserc.js', 'Lighthouse config must exist')
requirePattern('lighthouserc.js', /'categories:pwa'/, 'Lighthouse must assert the PWA category')
requirePattern('lighthouserc.js', /minScore:\s*0\.8/, 'PWA threshold must be explicit')

if (exists('public/manifest.json')) {
  const manifest = JSON.parse(read('public/manifest.json'))
  if (manifest.display !== 'standalone') failures.push('public/manifest.json: display must be standalone')
  if (!manifest.start_url) failures.push('public/manifest.json: start_url is required')
  if (!manifest.scope) failures.push('public/manifest.json: scope is required')
  requireManifestIcon(manifest, '192x192')
  requireManifestIcon(manifest, '512x512')
}

if (failures.length) {
  console.error('[mobile-pwa-readiness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[mobile-pwa-readiness] PASS installable=true, offlineRoute=true, lighthousePwaGate=true')
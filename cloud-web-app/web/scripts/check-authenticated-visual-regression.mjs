#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const report = path.join(ROOT, 'docs', 'AUTHENTICATED_UX_SURFACE_AUDIT.md')
const outputDir = path.join(ROOT, 'output', 'playwright', 'v22-authenticated')
const requiredRoutes = ['/dashboard', '/ide', '/studio', '/studio/level', '/admin', '/evidence', '/billing', '/settings']
const requiredShots = ['desktop-ide.png', 'desktop-dashboard.png', 'desktop-studio.png', 'desktop-admin.png', 'mobile-ide.png']
const indexPath = path.join(outputDir, 'index.json')
const strict = process.env.AUTH_VISUAL_REGRESSION_STRICT === '1'
const failures = []
const warnings = []

if (!fs.existsSync(report)) failures.push('missing AUTHENTICATED_UX_SURFACE_AUDIT.md')
const content = fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : ''
for (const route of requiredRoutes) {
  if (!content.includes(`| desktop | ${route} | 200 |`) && !content.includes(`| mobile | ${route} | 200 |`)) failures.push(`missing captured route ${route}`)
}
if (/\| [1-9][0-9]* \| [1-9][0-9]* \|/.test(content)) {
  const message = 'network/console error evidence present'
  if (strict) failures.push(message)
  else warnings.push(message)
}

if (!fs.existsSync(indexPath)) {
  failures.push('missing authenticated screenshot index.json')
} else {
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  for (const result of index) {
    if (!Array.isArray(result.matchedSignals) || !Array.isArray(result.missingSignals) || !Array.isArray(result.forbiddenSignals)) {
      failures.push(`missing route signal evidence for ${result.viewport} ${result.route}`)
      continue
    }
    if (result.missingSignals.length > 0) {
      const message = `missing route-specific signals for ${result.viewport} ${result.route}: ${result.missingSignals.join(', ')}`
      if (strict) failures.push(message)
      else warnings.push(message)
    }
    if (result.forbiddenSignals.length > 0) failures.push(`auth chrome leaked into ${result.viewport} ${result.route}: ${result.forbiddenSignals.join(', ')}`)
  }
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

for (const viewport of ['desktop', 'mobile']) {
  if (!fs.existsSync(outputDir)) continue
  const shots = fs
    .readdirSync(outputDir)
    .filter((name) => name.startsWith(`${viewport}-`) && name.endsWith('.png'))
    .map((name) => path.join(outputDir, name))
    .filter((file) => fs.statSync(file).size > 0)
  const hashes = new Map()
  for (const shot of shots) {
    const hash = hashFile(shot)
    hashes.set(hash, [...(hashes.get(hash) ?? []), path.basename(shot)])
  }
  for (const duplicates of hashes.values()) {
    if (duplicates.length >= 3) {
      const message = `${viewport} screenshots are duplicated across routes: ${duplicates.slice(0, 8).join(', ')}`
      if (strict) failures.push(message)
      else warnings.push(message)
    }
  }
}

if (strict) {
  for (const shot of requiredShots) {
    if (!fs.existsSync(path.join(outputDir, shot))) failures.push(`missing screenshot ${shot}`)
  }
}

if (failures.length > 0) {
  console.error(`[authenticated-visual-regression] FAIL strict=${strict}\n${failures.join('\n')}`)
  process.exit(1)
}

if (warnings.length > 0) {
  console.warn(`[authenticated-visual-regression] WARN strict=${strict}\n${warnings.join('\n')}`)
}

console.log(`[authenticated-visual-regression] PASS strict=${strict}`)

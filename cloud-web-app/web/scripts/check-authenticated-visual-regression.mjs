#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const report = path.join(ROOT, 'docs', 'AUTHENTICATED_UX_SURFACE_AUDIT.md')
const outputDir = path.join(ROOT, 'output', 'playwright', 'v22-authenticated')
const requiredRoutes = ['/dashboard', '/ide', '/studio', '/studio/level', '/admin', '/evidence', '/billing', '/settings']
const requiredShots = ['desktop-ide.png', 'desktop-dashboard.png', 'desktop-studio.png', 'desktop-admin.png', 'mobile-ide.png']
const strict = process.env.AUTH_VISUAL_REGRESSION_STRICT === '1'
const failures = []

if (!fs.existsSync(report)) failures.push('missing AUTHENTICATED_UX_SURFACE_AUDIT.md')
const content = fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : ''
for (const route of requiredRoutes) {
  if (!content.includes(`| desktop | ${route} | 200 |`) && !content.includes(`| mobile | ${route} | 200 |`)) failures.push(`missing captured route ${route}`)
}
if (/\| [1-9][0-9]* \| [1-9][0-9]* \|/.test(content)) failures.push('network/console error evidence present')

if (strict) {
  for (const shot of requiredShots) {
    if (!fs.existsSync(path.join(outputDir, shot))) failures.push(`missing screenshot ${shot}`)
  }
}

if (failures.length > 0) {
  console.error(`[authenticated-visual-regression] FAIL strict=${strict}\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[authenticated-visual-regression] PASS strict=${strict}`)

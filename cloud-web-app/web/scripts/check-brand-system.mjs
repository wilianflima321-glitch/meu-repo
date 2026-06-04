#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const BRAND_DIR = path.join(ROOT, 'public', 'branding')
const SOURCE_DIRS = ['app', 'components']
const failures = []

const requiredAssets = [
  { file: 'aethel-mark.svg', maxBytes: 9000, requiredTokens: ['Aethel mark', 'monochrome', '#0A0A0A', '#FAFAFA'] },
  { file: 'aethel-wordmark.svg', maxBytes: 12000, requiredTokens: ['Aethel wordmark', 'AI WORKFORCE IDE', '#FAFAFA'] },
]

for (const asset of requiredAssets) {
  const abs = path.join(BRAND_DIR, asset.file)
  if (!fs.existsSync(abs)) {
    failures.push(`missing brand asset: public/branding/${asset.file}`)
    continue
  }

  const stat = fs.statSync(abs)
  if (stat.size > asset.maxBytes) {
    failures.push(`brand asset too heavy: public/branding/${asset.file} ${stat.size} > ${asset.maxBytes}`)
  }

  const content = fs.readFileSync(abs, 'utf8')
  for (const token of asset.requiredTokens) {
    if (!content.includes(token)) failures.push(`brand asset ${asset.file} missing token: ${token}`)
  }
  if (/linearGradient|radialGradient|url\(#|filter id=/.test(content)) {
    failures.push(`brand asset ${asset.file} must stay monochrome without decorative gradients or SVG filters`)
  }
}

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'output') continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(abs))
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) files.push(abs)
  }
  return files
}

const sourceFiles = SOURCE_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
let oldLogoRefs = 0
let markRefs = 0

for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  const content = fs.readFileSync(file, 'utf8')

  const legacyRefs = content.match(/\/branding\/aethel-(icon-source|brand-wide)\.png/g) ?? []
  if (legacyRefs.length > 0) {
    oldLogoRefs += legacyRefs.length
    failures.push(`${rel}: legacy raster logo references=${legacyRefs.length}`)
  }

  markRefs += (content.match(/\/branding\/aethel-mark\.svg/g) ?? []).length
}

const layout = fs.readFileSync(path.join(ROOT, 'app', 'layout.tsx'), 'utf8')
const manifest = fs.readFileSync(path.join(ROOT, 'app', 'manifest.ts'), 'utf8')

if (!layout.includes('/branding/aethel-mark.svg')) failures.push('app/layout.tsx does not expose the SVG mark as an icon')
if (!manifest.includes('/branding/aethel-mark.svg')) failures.push('app/manifest.ts does not expose the SVG mark')
if (markRefs < 8) failures.push(`not enough visible mark references migrated: ${markRefs} < 8`)

if (failures.length > 0) {
  console.error(`[brand-system] FAIL oldLogoRefs=${oldLogoRefs} markRefs=${markRefs}\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(`[brand-system] PASS markRefs=${markRefs} legacyRasterRefs=${oldLogoRefs}`)

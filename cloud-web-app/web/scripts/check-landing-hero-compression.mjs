#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LANDING_FILE = path.join(ROOT, 'app', 'landing-v3.tsx')
const HEADER_FILE = path.join(ROOT, 'components', 'ui', 'PublicHeader.tsx')

const landing = fs.readFileSync(LANDING_FILE, 'utf8')
const header = fs.readFileSync(HEADER_FILE, 'utf8')

const REQUIRED_LANDING = [
  'data-landing-minimal-hero',
  'data-landing-product-proof',
  'PRIMARY_START_MODES',
  'SECONDARY_START_MODES',
  'More modes',
  '/product-proof/studio-home.webp',
]

const FORBIDDEN_LANDING = [
  'Why trust this run?',
  'Product proof',
  'Studio depth',
  'Download Studio Local beta',
  'CONNECTED_TOOLS',
  'OPERATION_SIGNALS',
  'STUDIO_SIGNALS',
  'circle_at_top',
  'blur-[180px]',
  'xl:grid-cols-[minmax(0,1.18fr)_360px]',
]

const FORBIDDEN_HEADER = [
  '>Studio</span>',
  'linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))',
]

const failures = []

for (const token of REQUIRED_LANDING) {
  if (!landing.includes(token)) failures.push(`landing missing required token: ${token}`)
}

for (const token of FORBIDDEN_LANDING) {
  if (landing.includes(token)) failures.push(`landing still contains forbidden dense hero token: ${token}`)
}

for (const token of FORBIDDEN_HEADER) {
  if (header.includes(token)) failures.push(`public header still contains forbidden chrome token: ${token}`)
}

const heroSection = landing.match(/<section[\s\S]*?data-landing-minimal-hero[\s\S]*?<\/section>/)?.[0] ?? ''
const heroLinkCount = (heroSection.match(/<Link\b/g) ?? []).length
const heroRoundedCount = (heroSection.match(/rounded-\[/g) ?? []).length

if (heroLinkCount > 1) {
  failures.push(`hero has ${heroLinkCount} Link components; keep only one secondary link because LandingMissionBox owns the primary action`)
}

if (heroRoundedCount > 6) {
  failures.push(`hero has ${heroRoundedCount} rounded card markers; keep first fold below cockpit density`)
}

if (failures.length > 0) {
  console.error(`[landing-hero-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[landing-hero-compression] PASS hero=compressed proof=visible chrome=solid')

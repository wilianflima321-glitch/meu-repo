#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LANDING_FILE = path.join(ROOT, 'app', 'landing-v3.tsx')
const MISSION_BOX_FILE = path.join(ROOT, 'app', 'landing-v3-mission-box.tsx')
const HEADER_FILE = path.join(ROOT, 'components', 'ui', 'PublicHeader.tsx')
const MIDDLEWARE_FILE = path.join(ROOT, 'middleware.ts')

const landing = fs.readFileSync(LANDING_FILE, 'utf8')
const missionBox = fs.readFileSync(MISSION_BOX_FILE, 'utf8')
const header = fs.readFileSync(HEADER_FILE, 'utf8')
const middleware = fs.readFileSync(MIDDLEWARE_FILE, 'utf8')

const REQUIRED_LANDING = [
  'data-landing-minimal-hero',
  'data-landing-product-proof',
  'START_MODES',
  '/product-proof/studio-home.webp',
]

const REQUIRED_MISSION_BOX = [
  'landing-mission-input',
  'Describe one mission for Aethel',
  'Start a mission',
]

const FORBIDDEN_LANDING = [
  'Why trust this run?',
  'Product proof',
  'Studio depth',
  'Download Studio Local beta',
  'CONNECTED_TOOLS',
  'OPERATION_SIGNALS',
  'STUDIO_SIGNALS',
  'SECONDARY_START_MODES',
  'PRIMARY_START_MODES',
  'More modes',
  'See readiness',
  'No AAA claims',
  'circle_at_top',
  'blur-[180px]',
  'xl:grid-cols-[minmax(0,1.18fr)_360px]',
]

const FORBIDDEN_MISSION_BOX = [
  'GENERATION_STEPS',
  'QUICK_CHIPS',
  'generationProgress',
  'generationStep',
  'setTimeout(resolve',
  'Open Studio',
  'bg-[linear-gradient',
  'bg-gradient-to-r',
]

const FORBIDDEN_HEADER = [
  '>Studio</span>',
  'linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))',
]

const failures = []

for (const token of REQUIRED_LANDING) {
  if (!landing.includes(token)) failures.push(`landing missing required token: ${token}`)
}

for (const token of REQUIRED_MISSION_BOX) {
  if (!missionBox.includes(token)) failures.push(`mission box missing required token: ${token}`)
}

if (!middleware.includes("'/product-proof'")) {
  failures.push('middleware must expose /product-proof as public proof media')
}

for (const token of FORBIDDEN_LANDING) {
  if (landing.includes(token)) failures.push(`landing still contains forbidden dense hero token: ${token}`)
}

for (const token of FORBIDDEN_MISSION_BOX) {
  if (missionBox.includes(token)) failures.push(`mission box still contains forbidden fake/dense token: ${token}`)
}

for (const token of FORBIDDEN_HEADER) {
  if (header.includes(token)) failures.push(`public header still contains forbidden chrome token: ${token}`)
}

const heroSection = landing.match(/<section[\s\S]*?data-landing-minimal-hero[\s\S]*?<\/section>/)?.[0] ?? ''
const heroLinkCount = (heroSection.match(/<Link\b/g) ?? []).length
const heroRoundedCount = (heroSection.match(/rounded-\[/g) ?? []).length

if (heroLinkCount > 0) {
  failures.push(`hero has ${heroLinkCount} Link components; keep zero secondary links because LandingMissionBox owns the primary action`)
}

if (heroRoundedCount > 6) {
  failures.push(`hero has ${heroRoundedCount} rounded card markers; keep first fold below cockpit density`)
}

if (failures.length > 0) {
  console.error(`[landing-hero-compression] FAIL\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('[landing-hero-compression] PASS hero=compressed proof=visible chrome=solid')

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function fail(message, details = '') {
  const suffix = details ? `\n${details}` : ''
  throw new Error(`[navigation-compression] ${message}${suffix}`)
}

function countMatches(source, pattern) {
  return (source.match(pattern) || []).length
}

function countPageFiles(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += countPageFiles(path)
    } else if (entry.name === 'page.tsx') {
      total += 1
    }
  }
  return total
}

function extractBetween(source, start, end) {
  const startIndex = source.indexOf(start)
  if (startIndex === -1) fail(`missing marker: ${start}`)
  const contentStart = startIndex + start.length
  const endIndex = source.indexOf(end, contentStart)
  if (endIndex === -1) fail(`missing marker after ${start}: ${end}`)
  return source.slice(contentStart, endIndex)
}

const surfaces = read('lib/navigation/surfaces.ts')
const publicHeader = read('components/ui/PublicHeader.tsx')
const publicFooter = read('components/ui/PublicFooter.tsx')
const creativeRoutes = read('app/studio/creative-studio-routes.ts')
const adminConsolidation = read('lib/admin/admin-consolidation.ts')

const publicLinksBlock = extractBetween(
  surfaces,
  'export const PUBLIC_NAV_LINKS: NavigationLink[] = [',
  'export const STUDIO_PRIMARY_LINKS',
)
const studioPrimaryBlock = extractBetween(
  surfaces,
  'export const STUDIO_PRIMARY_LINKS: NavigationLink[] = [',
  'export const STUDIO_SECONDARY_LINKS',
)
const studioSecondaryBlock = extractBetween(
  surfaces,
  'export const STUDIO_SECONDARY_LINKS: NavigationLink[] = [',
  'export function isNavLinkActive',
)

const publicLinks = countMatches(publicLinksBlock, /href:\s*['"]/g)
const studioPrimaryLinks = countMatches(studioPrimaryBlock, /href:\s*['"]/g)
const studioSecondaryLinks = countMatches(studioSecondaryBlock, /href:\s*['"]/g)
const creativeGroups = countMatches(
  extractBetween(
    creativeRoutes,
    'export const CREATIVE_STUDIO_GROUPS: ReadonlyArray<',
    'export const PRIMARY_CREATIVE_HREFS',
  ),
  /\n\s*id:\s*['"]/g,
)
const primaryCreativeLanes = countMatches(
  extractBetween(
    creativeRoutes,
    'export const PRIMARY_CREATIVE_HREFS = new Set([',
    '])',
  ),
  /['"]\/studio\//g,
)
const adminSections = countMatches(
  extractBetween(
    adminConsolidation,
    'export const ADMIN_CONSOLIDATED_SECTIONS: AdminConsolidatedSection[] = [',
    'export function findAdminSectionForRoute',
  ),
  /\n\s*id:\s*['"]/g,
)
const footerSections = countMatches(
  extractBetween(publicFooter, 'const FOOTER_SECTIONS = [', 'const TRUST_SIGNALS'),
  /\n\s*title:\s*['"]/g,
)

const routeCounts = {
  totalPages: countPageFiles(join(root, 'app')),
  adminPages: countPageFiles(join(root, 'app/admin')),
  studioPages: countPageFiles(join(root, 'app/studio')),
}

if (publicLinks > 6) fail('public nav registry must stay compact', `found ${publicLinks}, max 6`)
if (studioPrimaryLinks > 4) fail('authenticated primary nav must stay at four lanes or fewer', `found ${studioPrimaryLinks}`)
if (studioSecondaryLinks > 4) fail('authenticated secondary nav must stay at four lanes or fewer', `found ${studioSecondaryLinks}`)
if (creativeGroups !== 5) fail('studio must expose exactly five creative groups', `found ${creativeGroups}`)
if (primaryCreativeLanes !== 5) fail('studio hub must expose exactly five primary creative lanes', `found ${primaryCreativeLanes}`)
if (adminSections !== 6) fail('admin must expose exactly six consolidated sections', `found ${adminSections}`)
if (footerSections > 4) fail('footer must stay to four columns or fewer', `found ${footerSections}`)

if (!publicHeader.includes('PRIMARY_HREFS')) {
  fail('public header must choose visible links through PRIMARY_HREFS, not ad-hoc slices')
}
if (publicHeader.includes('PUBLIC_NAV_LINKS.slice')) {
  fail('public header cannot hide routes with brittle array slicing')
}
for (const href of ['/pricing', '/compare', '/docs']) {
  if (!publicHeader.includes(href)) fail(`missing primary public header href ${href}`)
}
if (!/lg:flex[\s\S]*<details[\s\S]*More[\s\S]*SECONDARY_LINKS\.map/.test(publicHeader)) {
  fail('public header must expose secondary links through a desktop More menu')
}
for (const required of ['Trust center', "href: '/trust'", "href: '/reliability'"]) {
  if (!publicFooter.includes(required)) fail(`footer must keep ${required} accessible`)
}

console.log('[navigation-compression] OK')
console.table({
  publicLinks,
  studioPrimaryLinks,
  studioSecondaryLinks,
  creativeGroups,
  primaryCreativeLanes,
  adminSections,
  footerSections,
  ...routeCounts,
})

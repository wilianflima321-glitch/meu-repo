import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const trustPath = 'cloud-web-app/web/app/trust/page.tsx'
const footerPath = 'cloud-web-app/web/components/ui/PublicFooter.tsx'
const navPath = 'cloud-web-app/web/lib/navigation/surfaces.ts'
const sitemapPath = 'cloud-web-app/web/app/sitemap.ts'
const testPath = 'cloud-web-app/web/__tests__/app/trust-center-contract.test.ts'
const docPath = 'docs/master/103_PUBLIC_TRUST_CENTER_GATE_2026-05-04.md'
const triagePath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md'
const checklistPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md'
const rootPackagePath = 'package.json'
const measurePath = 'tools/measure-product-quality.mjs'

for (const path of [trustPath, footerPath, navPath, sitemapPath, testPath, docPath]) {
  assert(existsSync(path), `${path} exists`)
}

const trust = existsSync(trustPath) ? read(trustPath) : ''
const footer = existsSync(footerPath) ? read(footerPath) : ''
const nav = existsSync(navPath) ? read(navPath) : ''
const sitemap = existsSync(sitemapPath) ? read(sitemapPath) : ''
const test = existsSync(testPath) ? read(testPath) : ''
const doc = existsSync(docPath) ? read(docPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const rootPackage = existsSync(rootPackagePath) ? read(rootPackagePath) : ''
const measure = existsSync(measurePath) ? read(measurePath) : ''

for (const href of ['/security', '/security-policy', '/compliance', '/status', '/privacy', '/terms', '/contact-sales']) {
  assert(trust.includes(`href: '${href}'`) || trust.includes(`href="${href}"`), `/trust links to ${href}`)
}

assert(trust.includes('SOC 2 preparation'), '/trust uses SOC 2 preparation language')
assert(trust.includes('responsible disclosure'), '/trust names responsible disclosure')
assert(trust.includes('audit activity'), '/trust names audit activity')
assert(trust.includes('SLO/SLA'), '/trust calls out SLO/SLA limits')
assert(trust.includes('TrustCenterPageShell'), '/trust reuses canonical trust shell')
assert(trust.includes('metadata'), '/trust exports metadata')
assert(!/\bSOC 2 certified\b/i.test(trust), '/trust does not claim SOC 2 certified')
assert(!/\bISO 27001 certified\b/i.test(trust), '/trust does not claim ISO certified')
assert(!/\b99\.9+%/.test(trust), '/trust does not invent uptime percentages')
assert(!/#[0-9a-fA-F]{3,8}/.test(trust), '/trust has no hardcoded hex colors')
assert(!/console\.(log|warn|error|info|debug)\(/.test(trust), '/trust has no console usage')

assert(footer.includes("href: '/trust'") || footer.includes('href="/trust"'), 'public footer links to /trust')
assert(nav.includes("href: '/trust'") && nav.includes("label: 'Trust'"), 'public nav consolidates trust entry')
assert(sitemap.includes('`${baseUrl}/trust`'), 'sitemap includes /trust')
assert(test.includes('SOC 2 preparation') && test.includes('/security-policy'), 'test covers trust center claims and disclosure link')
assert(doc.includes('/trust') && doc.includes('no overclaim'), 'doc captures public trust center contract')
assert(triage.includes('Public Trust Center Gate'), 'triage doc records public trust center gate')
assert(checklist.includes('qa:public-trust-center'), 'execution checklist includes public trust gate')
assert(rootPackage.includes('qa:public-trust-center'), 'root package exposes qa:public-trust-center')
assert(rootPackage.includes('check-public-trust-center-gate.mjs'), 'product quality progress runs public trust center gate')
assert(measure.includes('publicTrustCenterConfigured'), 'product quality measure tracks public trust center gate')

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Public trust center gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Public trust center gate passed (${checks.length} checks).`)

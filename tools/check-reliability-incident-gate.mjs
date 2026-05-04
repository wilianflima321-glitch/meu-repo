import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const reliabilityPath = 'cloud-web-app/web/app/reliability/page.tsx'
const trustPath = 'cloud-web-app/web/app/trust/page.tsx'
const footerPath = 'cloud-web-app/web/components/ui/PublicFooter.tsx'
const sitemapPath = 'cloud-web-app/web/app/sitemap.ts'
const testPath = 'cloud-web-app/web/__tests__/app/reliability-incident-contract.test.ts'
const docPath = 'docs/master/105_RELIABILITY_INCIDENT_RESPONSE_GATE_2026-05-04.md'
const triagePath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md'
const checklistPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md'
const rootPackagePath = 'package.json'
const measurePath = 'tools/measure-product-quality.mjs'

for (const path of [reliabilityPath, trustPath, footerPath, sitemapPath, testPath, docPath]) {
  assert(existsSync(path), `${path} exists`)
}

const reliability = existsSync(reliabilityPath) ? read(reliabilityPath) : ''
const trust = existsSync(trustPath) ? read(trustPath) : ''
const footer = existsSync(footerPath) ? read(footerPath) : ''
const sitemap = existsSync(sitemapPath) ? read(sitemapPath) : ''
const test = existsSync(testPath) ? read(testPath) : ''
const doc = existsSync(docPath) ? read(docPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const rootPackage = existsSync(rootPackagePath) ? read(rootPackagePath) : ''
const measure = existsSync(measurePath) ? read(measurePath) : ''

for (const phrase of [
  'Reliability',
  'incident response',
  'Sev 1',
  'Sev 2',
  'Sev 3',
  'response targets',
  'nao e SLA contratual',
  'No rolling uptime',
  'Public incident history',
]) {
  assert(reliability.includes(phrase), `reliability page includes "${phrase}"`)
}

for (const link of [
  "href: '/status'",
  "href: '/trust'",
  "href: '/security-policy'",
  "href: '/docs/procurement-starter-pack'",
  "href: '/contact-sales'",
]) {
  assert(reliability.includes(link), `reliability page links ${link}`)
}

for (const forbidden of [
  /\b99\.9+%/,
  /five nines/i,
  /SLA guaranteed/i,
  /guaranteed uptime/i,
]) {
  assert(!forbidden.test(reliability), `reliability page avoids overclaim ${forbidden}`)
}

assert(!/#[0-9a-fA-F]{3,8}/.test(reliability), 'reliability page has no hardcoded hex colors')
assert(!/console\.(log|warn|error|info|debug)\(/.test(reliability), 'reliability page has no console usage')
assert(trust.includes("href: '/reliability'"), 'trust center links to /reliability')
assert(footer.includes("href: '/reliability'"), 'public footer links to /reliability')
assert(sitemap.includes('`${baseUrl}/reliability`'), 'sitemap includes /reliability')
assert(test.includes('incident response') && test.includes('nao e SLA contratual'), 'test covers incident response and non-SLA claim')
assert(/Reliability Incident Response Gate/.test(doc) && /no overclaim/i.test(doc), 'doc captures reliability incident contract')
assert(triage.includes('Reliability Incident Response Gate'), 'triage doc records reliability gate')
assert(checklist.includes('qa:reliability-incident'), 'execution checklist includes reliability gate')
assert(rootPackage.includes('qa:reliability-incident'), 'root package exposes qa:reliability-incident')
assert(rootPackage.includes('check-reliability-incident-gate.mjs'), 'product quality progress runs reliability gate')
assert(measure.includes('reliabilityIncidentConfigured'), 'product quality measure tracks reliability gate')

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Reliability incident gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Reliability incident gate passed (${checks.length} checks).`)

import { existsSync, readFileSync } from 'node:fs'

const checks = []

function read(path) {
  return readFileSync(path, 'utf8')
}

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message })
}

const policyPath = 'cloud-web-app/web/app/security-policy/page.tsx'
const acknowledgmentsPath = 'cloud-web-app/web/app/security-acknowledgments/page.tsx'
const trustPath = 'cloud-web-app/web/app/trust/page.tsx'
const sitemapPath = 'cloud-web-app/web/app/sitemap.ts'
const testPath = 'cloud-web-app/web/__tests__/app/security-disclosure-contract.test.ts'
const docPath = 'docs/master/104_SECURITY_DISCLOSURE_SAFE_HARBOR_GATE_2026-05-04.md'
const triagePath = 'docs/master/90_CANONICAL_PRODUCT_QUALITY_TRIAGE_2026-04-30.md'
const checklistPath = 'docs/master/91_PRODUCT_QUALITY_EXECUTION_CHECKLIST_2026-04-30.md'
const rootPackagePath = 'package.json'
const measurePath = 'tools/measure-product-quality.mjs'

for (const path of [policyPath, acknowledgmentsPath, trustPath, sitemapPath, testPath, docPath]) {
  assert(existsSync(path), `${path} exists`)
}

const policy = existsSync(policyPath) ? read(policyPath) : ''
const acknowledgments = existsSync(acknowledgmentsPath) ? read(acknowledgmentsPath) : ''
const trust = existsSync(trustPath) ? read(trustPath) : ''
const sitemap = existsSync(sitemapPath) ? read(sitemapPath) : ''
const test = existsSync(testPath) ? read(testPath) : ''
const doc = existsSync(docPath) ? read(docPath) : ''
const triage = existsSync(triagePath) ? read(triagePath) : ''
const checklist = existsSync(checklistPath) ? read(checklistPath) : ''
const rootPackage = existsSync(rootPackagePath) ? read(rootPackagePath) : ''
const measure = existsSync(measurePath) ? read(measurePath) : ''

for (const phrase of [
  'Responsible disclosure',
  'safe harbor',
  'boa-fe',
  'coordinated disclosure',
  'security@aethel.dev',
  'Fora de escopo',
  'AI / agentes',
  'Response targets, nao SLA juridico',
]) {
  assert(policy.includes(phrase), `security policy includes "${phrase}"`)
}

for (const forbidden of [
  /\bbounty formal\b/i,
  /\bSLA contratual\b/i,
  /\bpromessas ainda nao fazemos\b/i,
]) {
  assert(policy.match(forbidden), `security policy explicitly avoids overclaim: ${forbidden}`)
}

assert(policy.includes("href: '/trust'"), 'security policy links to /trust')
assert(policy.includes("href: '/security-acknowledgments'"), 'security policy links to acknowledgments')
assert(policy.includes('mailto:security@aethel.dev'), 'security policy has mailto contact')
assert(acknowledgments.includes("href: '/trust'"), 'acknowledgments link to /trust')
assert(trust.includes("href: '/security-acknowledgments'"), 'trust center links to security acknowledgments')
assert(sitemap.includes('`${baseUrl}/security-policy`'), 'sitemap includes /security-policy')
assert(sitemap.includes('`${baseUrl}/security-acknowledgments`'), 'sitemap includes /security-acknowledgments')
assert(!/#[0-9a-fA-F]{3,8}/.test(policy), 'security policy has no hardcoded hex colors')
assert(!/console\.(log|warn|error|info|debug)\(/.test(policy), 'security policy has no console usage')
assert(test.includes('safe harbor') && test.includes('Response targets, nao SLA juridico'), 'test covers safe harbor and non-SLA targets')
assert(/safe harbor/i.test(doc) && /no overclaim/i.test(doc), 'doc captures safe harbor contract')
assert(triage.includes('Security Disclosure Safe Harbor Gate'), 'triage doc records disclosure gate')
assert(checklist.includes('qa:security-disclosure'), 'execution checklist includes disclosure gate')
assert(rootPackage.includes('qa:security-disclosure'), 'root package exposes qa:security-disclosure')
assert(rootPackage.includes('check-security-disclosure-gate.mjs'), 'product quality progress runs disclosure gate')
assert(measure.includes('securityDisclosureConfigured'), 'product quality measure tracks disclosure gate')

const failed = checks.filter((check) => !check.ok)
if (failed.length > 0) {
  console.error('Security disclosure gate failed:')
  for (const check of failed) console.error(`- ${check.message}`)
  process.exit(1)
}

console.log(`Security disclosure gate passed (${checks.length} checks).`)

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath))
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
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

requireFile('lib/security/enterprise-identity-readiness.ts', 'SAML/SCIM must have a careful readiness contract')
requirePattern('lib/security/enterprise-identity-readiness.ts', /buildEnterpriseIdentityReadiness/, 'readiness report must be generated centrally')
requirePattern('lib/security/enterprise-identity-readiness.ts', /self-serve-ga/, 'contract must distinguish self-serve GA from readiness')
requirePattern('lib/security/enterprise-identity-readiness.ts', /admin-assisted/, 'contract must support admin-assisted enterprise rollout')
requirePattern('lib/security/enterprise-identity-readiness.ts', /gaBlockers/, 'contract must expose remaining GA blockers')
requirePattern('lib/security/enterprise-identity-readiness.ts', /signed audit proof/, 'enterprise identity needs auditable evidence')
requirePattern('lib/security/enterprise-identity-readiness.ts', /forbiddenClaims/, 'contract must prevent overclaiming')
requirePattern('app/api/security/sso/route.ts', /enterpriseIdentity/, 'SSO readiness API must expose enterprise identity readiness')
requireFile('__tests__/server/enterprise-identity-readiness.test.ts', 'enterprise identity readiness tests must exist')
requirePattern('__tests__/server/enterprise-identity-readiness.test.ts', /readiness\/admin-assisted/, 'tests must verify cautious public claims')
requirePattern('package.json', /qa:enterprise-identity/, 'package scripts must expose enterprise identity gate')
requirePattern('package.json', /qa:enterprise-gate[\s\S]*qa:enterprise-identity/, 'enterprise gate must include identity readiness')

if (failures.length) {
  console.error('[enterprise-identity-readiness] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[enterprise-identity-readiness] PASS')

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const failures = []

function read(relativePath) {
  const full = path.join(ROOT, relativePath)
  if (!fs.existsSync(full)) {
    failures.push(`${relativePath}: missing`)
    return ''
  }
  return fs.readFileSync(full, 'utf8')
}

function requirePattern(relativePath, pattern, reason) {
  const content = read(relativePath)
  if (content && !pattern.test(content)) failures.push(`${relativePath}: missing ${reason}`)
}

requirePattern('lib/i18n/single-source-contract.ts', /buildI18nSingleSourceContract/, 'single source contract builder')
requirePattern('lib/i18n/single-source-contract.ts', /canonicalSystem:\s*'next-i18next'/, 'next-i18next canonical system')
requirePattern('lib/i18n/single-source-contract.ts', /canonicalLocaleRoot:\s*'cloud-web-app\/web\/public\/locales'/, 'public locale root')
requirePattern('lib/i18n/single-source-contract.ts', /defaultLocale:\s*'en'/, 'default EN locale')
requirePattern('lib/i18n/single-source-contract.ts', /'en'[\s\S]*'pt-BR'[\s\S]*'es'[\s\S]*'fr'[\s\S]*'ja'[\s\S]*'zh'/, 'all canonical locales')
requirePattern('lib/i18n/single-source-contract.ts', /allowHardcodedPtBrCopy:\s*false/, 'hardcoded PT-BR copy blocked')
requirePattern('lib/i18n/single-source-contract.ts', /legacyModules/, 'legacy module policy')
requirePattern('lib/i18n/single-source-contract.ts', /allowedImporters:\s*\[\]/, 'legacy import allowlist empty')
requirePattern('lib/i18n/single-source-contract.ts', /evaluateLocaleTokenUse/, 'locale token use evaluator')
requirePattern('lib/i18n/single-source-contract.ts', /Locale codes are allowed only for formatting, speech, or user preference metadata/, 'technical locale token policy')

requirePattern('__tests__/i18n/single-source-contract.test.ts', /validateI18nSingleSourceContract/, 'contract tests')
requirePattern('next-i18next.config.js', /defaultLocale:\s*['"]en['"]/, 'next-i18next default locale')
requirePattern('public/locales/_canonical.md', /Canonical i18n Surface/, 'canonical locale doc')
requirePattern('scripts/check-i18n-canonical.mjs', /legacy-imports=blocked/, 'canonical i18n gate')
requirePattern('scripts/check-i18n-hardcoded-spine.mjs', /BASELINES[\s\S]*total:\s*0/, 'hardcoded PT baseline stays zero')
requirePattern('lib/runtime/v29-forensic-runtime-backlog.ts', /qa:v29-i18n-single-source/, 'forensic backlog gate')
requirePattern('scripts/check-v29-total-spine.mjs', /check-v29-i18n-single-source\.mjs/, 'V29 total gate inclusion')
requirePattern('package.json', /qa:v29-i18n-single-source/, 'package script')
requirePattern('tsconfig.typecheck-runtime-spine.json', /lib\/i18n\/single-source-contract\.ts/, 'runtime typecheck include')

if (failures.length) {
  console.error('[v29-i18n-single-source] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[v29-i18n-single-source] PASS canonical=next-i18next default=en hardcoded-pt=blocked')

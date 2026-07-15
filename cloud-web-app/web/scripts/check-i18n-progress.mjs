#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const LOCALES_DIR = path.join(ROOT, 'public', 'locales')
const REQUIRED_LOCALES = ['en', 'pt-BR', 'es', 'fr', 'ja', 'zh']
const MIN_KEYS = 200
const REQUIRED_KEYS = [
  'studio.projectBrain',
  'studio.missionLedger',
  'studio.repositoryCartography',
  'agents.scopeLock',
  'agents.handoff',
  'ai.inlineChat',
  'ai.browserOperator',
  'game.playtest',
  'film.timeline',
  'viewport.renderQueue',
  'runtime.cloudSandbox',
  'trust.auditLog',
]

const failures = []
const loaded = new Map()

function readLocale(locale) {
  const filePath = path.join(LOCALES_DIR, locale, 'common.json')
  if (!fs.existsSync(filePath)) {
    failures.push(`${locale}/common.json missing`)
    return null
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    loaded.set(locale, parsed)
    return parsed
  } catch (error) {
    failures.push(`${locale}/common.json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

for (const locale of REQUIRED_LOCALES) {
  const messages = readLocale(locale)
  if (!messages) continue

  const keys = Object.keys(messages)
  if (keys.length < MIN_KEYS) {
    failures.push(`${locale}/common.json expected >=${MIN_KEYS} keys, found ${keys.length}`)
  }

  for (const key of REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(messages, key)) {
      failures.push(`${locale}/common.json missing required key ${key}`)
    }
  }
}

const english = loaded.get('en')
if (english) {
  const expectedKeys = Object.keys(english).sort()
  for (const locale of REQUIRED_LOCALES.filter((candidate) => candidate !== 'en')) {
    const messages = loaded.get(locale)
    if (!messages) continue

    const localeKeys = Object.keys(messages).sort()
    const missing = expectedKeys.filter((key) => !localeKeys.includes(key))
    const extra = localeKeys.filter((key) => !expectedKeys.includes(key))

    if (missing.length > 0) {
      failures.push(`${locale}/common.json missing ${missing.length} keys from en: ${missing.slice(0, 8).join(', ')}`)
    }

    if (extra.length > 0) {
      failures.push(`${locale}/common.json has ${extra.length} extra keys not in en: ${extra.slice(0, 8).join(', ')}`)
    }
  }
}

if (!fs.existsSync(path.join(LOCALES_DIR, '_canonical.md'))) {
  failures.push('public/locales/_canonical.md missing')
}

if (failures.length > 0) {
  console.error('[i18n-progress] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `[i18n-progress] PASS locales=${REQUIRED_LOCALES.length}, keys=${Object.keys(english ?? {}).length}`,
)

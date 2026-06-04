#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const files = [
  'components/admin/AdminCommandCenterSections.tsx',
  'app/admin/page.tsx',
]
const required = ['maskAdminEmail', 'data-privacy="masked"', 'Emails masked', 'Privacy', 'masked']
const source = files.map((file) => fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '').join('\n')
const missing = required.filter((token) => !source.includes(token))
const rawEmailInAdminUi = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []

if (missing.length > 0 || rawEmailInAdminUi.length > 0) {
  console.error(`[admin-privacy-screenshot] FAIL missing=${missing.join(', ') || 'none'} rawEmails=${rawEmailInAdminUi.join(', ') || 'none'}`)
  process.exit(1)
}

console.log('[admin-privacy-screenshot] PASS masked admin evidence')

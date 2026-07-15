#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DOCS_DIR = path.join(ROOT, 'docs')
const REPORT_FILE = path.join(DOCS_DIR, 'UX_MARKET_STANDARD_SPINE.md')
import { BACKLOG, COMPETITOR_PLAYBOOK, MARKET_REFERENCES, SUBAREA_MATRIX, SURFACE_MATRIX } from './ux-market-standard.fixtures.mjs'
import { writeUxMarketStandardReport } from './ux-market-standard-report.mjs'

import { CHECKS as BASE_UX_CHECKS } from './ux-market-standard.checks.mjs'
import { WORKSPACE_UX_CHECKS } from './ux-market-standard.workspace-checks.mjs'
function read(file) {
  const abs = path.join(ROOT, file)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf8')
}

const results = []
const CHECKS = [...BASE_UX_CHECKS, ...WORKSPACE_UX_CHECKS]

for (const check of CHECKS) {
  let total = 0
  const fileResults = []
  const contents = []

  for (const file of check.files) {
    const content = read(file)
    if (content === null) {
      total += 1
      fileResults.push({ file, value: 1, note: 'missing' })
      continue
    }

    contents.push(content)

    if (!check.combined) {
      const value = check.test(content, { read })
      total += value
      fileResults.push({ file, value, note: value > 0 ? 'finding' : 'ok' })
    } else {
      fileResults.push({ file, value: 0, note: 'included' })
    }
  }

  if (check.combined) {
    const value = check.test(contents.join('\n'), { read })
    total += value
    fileResults.push({ file: '[combined]', value, note: value > 0 ? 'finding' : 'ok' })
  }

  results.push({ ...check, total, fileResults })
}

fs.mkdirSync(DOCS_DIR, { recursive: true })

const reportPath = writeUxMarketStandardReport({
  root: ROOT,
  reportFile: REPORT_FILE,
  marketReferences: MARKET_REFERENCES,
  competitorPlaybook: COMPETITOR_PLAYBOOK,
  surfaceMatrix: SURFACE_MATRIX,
  backlog: BACKLOG,
  subareaMatrix: SUBAREA_MATRIX,
  results,
})

const failures = results.filter((result) => result.total > result.limit)
if (failures.length > 0) {
  console.error(`[ux-market-standard] FAIL ${failures.map((result) => `${result.id}=${result.total} limit=${result.limit}`).join('; ')} report=${reportPath}`)
  process.exit(1)
}

console.log(`[ux-market-standard] PASS report=${reportPath}`)

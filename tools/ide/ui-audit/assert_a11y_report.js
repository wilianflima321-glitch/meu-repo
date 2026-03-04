// Assert UI audit accessibility thresholds against report output.
// Usage:
// node assert_a11y_report.js --report tools/ide/ui-audit/output/ui-audit-report.json --required home,dashboard,ide,settings,login,register --maxViolations 0

const fs = require('fs')
const path = require('path')
const minimist = require('minimist')

function fail(message) {
  console.error(`[ui-a11y-assert] FAIL ${message}`)
  process.exit(1)
}

function parseRequired(raw) {
  return String(raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function asViolationCount(entry) {
  if (!entry || typeof entry !== 'object') return 0
  if (entry.axeSummary && Number.isFinite(entry.axeSummary.violations)) {
    return Number(entry.axeSummary.violations)
  }
  if (typeof entry.axe === 'string' && fs.existsSync(entry.axe)) {
    try {
      const axePayload = JSON.parse(fs.readFileSync(entry.axe, 'utf8'))
      if (Array.isArray(axePayload.violations)) return axePayload.violations.length
    } catch {
      return 0
    }
  }
  return 0
}

function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['report', 'required'],
    default: {
      report: path.join(__dirname, 'output', 'ui-audit-report.json'),
      required: 'home,dashboard,ide,settings,login,register',
      maxViolations: 20,
    },
  })

  const reportPath = path.resolve(args.report)
  if (!fs.existsSync(reportPath)) {
    fail(`report not found: ${reportPath}`)
  }

  let report
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  } catch (error) {
    fail(`invalid JSON report: ${error instanceof Error ? error.message : 'unknown error'}`)
  }

  if (!Array.isArray(report)) {
    fail('report payload must be an array')
  }

  const requiredNames = parseRequired(args.required)
  const maxViolations = Number(args.maxViolations)
  if (!Number.isFinite(maxViolations) || maxViolations < 0) {
    fail(`invalid maxViolations: ${args.maxViolations}`)
  }

  const byName = new Map(report.map((entry) => [entry.name, entry]))
  const missing = requiredNames.filter((name) => !byName.has(name))
  if (missing.length > 0) {
    fail(`missing required pages in report: ${missing.join(', ')}`)
  }

  const failures = []
  let totalViolations = 0

  for (const name of requiredNames) {
    const entry = byName.get(name)
    if (!entry) continue

    if (entry.error) {
      failures.push(`${name}: page-load error (${entry.error})`)
      continue
    }

    if (entry.axeError) {
      failures.push(`${name}: axe error (${entry.axeError})`)
      continue
    }

    const count = asViolationCount(entry)
    totalViolations += count
    if (count > maxViolations) {
      failures.push(`${name}: ${count} violations (max ${maxViolations})`)
    }
  }

  if (failures.length > 0) {
    console.error('[ui-a11y-assert] FAIL details:')
    for (const detail of failures) {
      console.error(` - ${detail}`)
    }
    process.exit(1)
  }

  console.log(
    `[ui-a11y-assert] PASS pages=${requiredNames.length} totalViolations=${totalViolations} maxPerPage=${maxViolations}`
  )
}

main()

#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnIssues = args.includes('--fail-on-issues')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null

const repoRoot = process.cwd()
const workflowsDir = path.join(repoRoot, '.github', 'workflows')

if (!fs.existsSync(workflowsDir)) {
  console.error('Missing .github/workflows directory')
  process.exit(1)
}

const files = fs
  .readdirSync(workflowsDir)
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort((a, b) => a.localeCompare(b))

const activeAuthority = new Set(['ci.yml', 'cloud-web-app.yml', 'main.yml', 'ui-audit.yml', 'visual-regression-compare.yml'])

function extractWorkflowName(content, fallback) {
  const match = content.match(/^name:\s*(.+)$/m)
  return match ? match[1].trim() : fallback
}

function triggerList(content) {
  const triggers = []
  if (/^\s*workflow_dispatch:/m.test(content)) triggers.push('workflow_dispatch')
  if (/^\s*pull_request:/m.test(content)) triggers.push('pull_request')
  if (/^\s*push:/m.test(content)) triggers.push('push')
  if (/^\s*schedule:/m.test(content)) triggers.push('schedule')
  return triggers.join(', ') || 'unknown'
}

function classify(fileName, content) {
  if (content.includes('No default workflow defined yet.') || content.includes('noop')) return 'PLACEHOLDER'
  if (fileName.includes('merge-unrelated') || content.includes('infra/playwright-ci')) return 'LEGACY_CANDIDATE'
  if (activeAuthority.has(fileName)) return 'ACTIVE_AUTHORITY'
  return 'SUPPORTING'
}

function hasGlobChars(segment) {
  return /[*?[\]{}!]/.test(segment)
}

function extractPathFilters(content) {
  const lines = content.split(/\r?\n/)
  const values = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    const match = line.match(/^(\s*)paths(?:-ignore)?:\s*$/)
    if (!match) {
      index += 1
      continue
    }
    const blockIndent = match[1].length
    index += 1
    while (index < lines.length) {
      const candidate = lines[index]
      if (!candidate.trim()) {
        index += 1
        continue
      }
      const indent = candidate.match(/^(\s*)/)?.[1]?.length ?? 0
      if (indent <= blockIndent) break
      const valueMatch = candidate.match(/^\s*-\s*["']?(.+?)["']?\s*$/)
      if (valueMatch) {
        const value = valueMatch[1].trim()
        if (value) values.push(value)
      }
      index += 1
    }
  }
  return values
}

function hasStablePrefix(globPath) {
  const normalized = globPath.replace(/\\/g, '/').replace(/^!+/, '').trim()
  if (!normalized || normalized.includes('${{')) return true
  const segments = normalized.split('/').filter(Boolean)
  if (!segments.length) return true
  const prefix = []
  for (const segment of segments) {
    if (hasGlobChars(segment)) break
    prefix.push(segment)
  }
  if (!prefix.length) return true
  const stablePath = prefix.join('/')
  return fs.existsSync(path.join(repoRoot, stablePath))
}

const rows = []
const issues = []
const stalePathRows = []

for (const fileName of files) {
  const fullPath = path.join(workflowsDir, fileName)
  const content = fs.readFileSync(fullPath, 'utf8')
  const name = extractWorkflowName(content, fileName)
  const classification = classify(fileName, content)
  const triggers = triggerList(content)
  const hasConnectivityGate =
    content.includes('qa:repo-connectivity') || content.includes('repo-connectivity-scan.mjs')
  const hasEnterpriseGate = content.includes('qa:enterprise-gate')
  const hasContinueOnError = content.includes('continue-on-error: true')
  const hasHighRiskConfirmation =
    content.includes('confirm_high_risk') &&
    content.includes("github.event.inputs.confirm_high_risk == 'true'")
  const triggerPaths = extractPathFilters(content)
  const staleTriggerPaths = triggerPaths.filter((item) => !hasStablePrefix(item))

  rows.push({
    fileName,
    name,
    classification,
    triggers,
    hasConnectivityGate,
    hasEnterpriseGate,
    hasContinueOnError,
    hasHighRiskConfirmation,
    staleTriggerPaths,
  })

  for (const stalePath of staleTriggerPaths) {
    stalePathRows.push({ fileName, stalePath })
  }

  if (classification === 'ACTIVE_AUTHORITY' && !hasConnectivityGate) {
    issues.push(`${fileName}: missing connectivity gate`) 
  }
  if (staleTriggerPaths.length > 0) {
    issues.push(`${fileName}: stale trigger path filter(s): ${staleTriggerPaths.join(', ')}`)
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalWorkflows: rows.length,
  activeAuthority: rows.filter((r) => r.classification === 'ACTIVE_AUTHORITY').length,
  supporting: rows.filter((r) => r.classification === 'SUPPORTING').length,
  legacyCandidate: rows.filter((r) => r.classification === 'LEGACY_CANDIDATE').length,
  placeholder: rows.filter((r) => r.classification === 'PLACEHOLDER').length,
  staleTriggerPaths: stalePathRows.length,
  issues: issues.length,
}

const markdown = [
  '# 26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20',
  'Status: GENERATED WORKFLOW GOVERNANCE SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Total workflows: ${summary.totalWorkflows}`,
  `- Active authority workflows: ${summary.activeAuthority}`,
  `- Supporting workflows: ${summary.supporting}`,
  `- Legacy-candidate workflows: ${summary.legacyCandidate}`,
  `- Placeholder workflows: ${summary.placeholder}`,
  `- Stale trigger path filters: ${summary.staleTriggerPaths}`,
  `- Governance issues: ${summary.issues}`,
  '',
  '## Workflow Matrix',
  '| Workflow file | Name | Class | Triggers | Connectivity gate | Enterprise gate | continue-on-error | high-risk confirmation | stale trigger paths |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | ---: |',
  ...rows.map((row) => `| \`${row.fileName}\` | ${row.name} | ${row.classification} | ${row.triggers} | ${row.hasConnectivityGate ? 'yes' : 'no'} | ${row.hasEnterpriseGate ? 'yes' : 'no'} | ${row.hasContinueOnError ? 'yes' : 'no'} | ${row.hasHighRiskConfirmation ? 'yes' : 'no'} | ${row.staleTriggerPaths.length} |`),
  '',
  '## Stale Trigger Path Filters',
  '| Workflow file | Path filter |',
  '| --- | --- |',
  ...(stalePathRows.length
    ? stalePathRows.map((item) => `| \`${item.fileName}\` | \`${item.stalePath}\` |`)
    : ['| - | none |']),
  '',
  '## Governance Issues',
  ...(issues.length ? issues.map((issue) => `- ${issue}`) : ['- none']),
  '',
  '## Policy',
  '1. `ACTIVE_AUTHORITY` workflows must include connectivity gate.',
  '2. Enterprise gate responsibility can be centralized in CI authority workflows and branch protection.',
  '3. `LEGACY_CANDIDATE` workflows must have owner decision (keep, restrict, archive).',
  '4. If kept, high-risk utility workflows must require explicit dispatch confirmation input.',
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

console.log(JSON.stringify(summary, null, 2))

if (failOnIssues && issues.length > 0) {
  process.exit(1)
}

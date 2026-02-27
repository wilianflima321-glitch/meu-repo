#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const failOnFindings = args.includes('--fail-on-findings')
const reportFlagIndex = args.findIndex((arg) => arg === '--report')
const reportPath = reportFlagIndex >= 0 ? args[reportFlagIndex + 1] : null

const repoRoot = process.cwd()
const includedRoots = [
  '.github',
  'cloud-web-app/web',
  'scripts',
  'shared',
  'src',
  'tools',
  'audit dicas do emergent usar',
  'README.md',
  'package.json',
]

const excludedDirNames = new Set([
  '.git',
  'node_modules',
  '.next',
  '.turbo',
  'playwright-report',
  'test-results',
  'coverage',
  '.nyc_output',
])

const excludedPathFragments = ['cloud-admin-ia/', 'meu-repo/']

const findings = []

const secretPatterns = [
  { id: 'GITHUB_PAT', regex: /\bghp_[A-Za-z0-9]{36}\b/g },
  { id: 'GITHUB_FINE_GRAINED', regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { id: 'OPENAI_KEY', regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
  { id: 'SLACK_TOKEN', regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { id: 'AWS_ACCESS_KEY', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'PRIVATE_KEY_BLOCK', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
]

const placeholderMatchers = [
  /sk-[xX]{6,}/,
  /github_pat_[xX_]{8,}/,
  /ghp_[xX]{8,}/,
  /<YOUR_[A-Z0-9_]+>/,
  /YOUR_[A-Z0-9_]+_HERE/,
]

function shouldSkipPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/')
  return excludedPathFragments.some((fragment) => normalized.includes(fragment))
}

function isProbablyBinary(contentBuffer) {
  const sample = contentBuffer.subarray(0, Math.min(contentBuffer.length, 512))
  for (const value of sample) {
    if (value === 0) return true
  }
  return false
}

function shouldIgnoreToken(token) {
  return placeholderMatchers.some((matcher) => matcher.test(token))
}

function scanFile(absolutePath, relativePath) {
  const buffer = fs.readFileSync(absolutePath)
  if (isProbablyBinary(buffer)) return
  if (buffer.length > 2_000_000) return
  const content = buffer.toString('utf8')
  const lines = content.split(/\r?\n/)

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex]
    for (const pattern of secretPatterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
      let match
      while ((match = regex.exec(line)) !== null) {
        const token = match[0]
        if (shouldIgnoreToken(token)) continue
        findings.push({
          file: relativePath.replace(/\\/g, '/'),
          line: lineIndex + 1,
          rule: pattern.id,
          excerpt: token.slice(0, 4) + '***',
        })
      }
    }
  }
}

function walkAbsolute(absolutePath, relativePath) {
  if (!fs.existsSync(absolutePath)) return
  if (shouldSkipPath(relativePath)) return
  const stat = fs.statSync(absolutePath)
  if (stat.isDirectory()) {
    const dirName = path.basename(absolutePath)
    if (excludedDirNames.has(dirName)) return
    const entries = fs.readdirSync(absolutePath, { withFileTypes: true })
    for (const entry of entries) {
      const childAbsolute = path.join(absolutePath, entry.name)
      const childRelative = path.join(relativePath, entry.name)
      walkAbsolute(childAbsolute, childRelative)
    }
    return
  }
  scanFile(absolutePath, relativePath)
}

for (const root of includedRoots) {
  walkAbsolute(path.resolve(repoRoot, root), root)
}

const summary = {
  generatedAt: new Date().toISOString(),
  findings: findings.length,
  scannedRoots: includedRoots.length,
}

const markdown = [
  '# 27_CRITICAL_SECRET_SCAN_2026-02-20',
  'Status: GENERATED SECRET HYGIENE SWEEP',
  `Generated: ${summary.generatedAt}`,
  '',
  '## Summary',
  `- Findings: ${summary.findings}`,
  `- Scanned roots: ${summary.scannedRoots}`,
  `- Excluded legacy fragments: ${excludedPathFragments.join(', ')}`,
  '',
  '## Findings',
  '| File | Line | Rule | Token preview |',
  '| --- | ---: | --- | --- |',
  ...(findings.length
    ? findings.map((item) => `| \`${item.file}\` | ${item.line} | ${item.rule} | \`${item.excerpt}\` |`)
    : ['| - | - | none | - |']),
  '',
].join('\n')

if (reportPath) {
  const absoluteReportPath = path.resolve(repoRoot, reportPath)
  fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true })
  fs.writeFileSync(absoluteReportPath, markdown, 'utf8')
}

console.log(JSON.stringify(summary, null, 2))

if (failOnFindings && findings.length > 0) {
  process.exit(1)
}
